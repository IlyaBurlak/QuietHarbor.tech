import { Prisma, type User } from '@prisma/client';
import type {
  AdminAuditEntry,
  AdminResetRequest,
  AdminStats,
  AdminUserCard,
  AdminUserRow,
  AdminUsersPage,
  AdminUsersQuery,
} from '@wishlist/shared';
import argon2 from 'argon2';
import { env } from '../../config/env';
import { prisma } from '../../core/db/prisma';
import { escapeLike } from '../../core/db/like';
import { randomToken, sha256 } from '../../core/http/crypto';
import { forbidden, HttpError, notFound } from '../../core/http/errors';
import {
  ADMIN_SESSION_TTL_MS,
  createSession,
  destroySession,
  destroyUserSessions,
} from '../auth/session.service';
import { toSessionUser } from '../users/user.dto';
import { storage } from '../files/storage';

// ---- журнал ----

export async function audit(
  adminId: string,
  action: string,
  targetUserId?: string | null,
  meta?: Prisma.InputJsonValue,
) {
  await prisma.adminAuditLog.create({
    data: { adminId, action, targetUserId: targetUserId ?? null, meta },
  });
}

export async function listAudit(page: number, pageSize: number) {
  const [rows, total] = await Promise.all([
    prisma.adminAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        admin: { select: { username: true } },
        target: { select: { username: true } },
      },
    }),
    prisma.adminAuditLog.count(),
  ]);
  const entries: AdminAuditEntry[] = rows.map((r) => ({
    id: r.id,
    action: r.action,
    admin: r.admin.username,
    target: r.target?.username ?? null,
    meta: (r.meta as Record<string, unknown> | null) ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
  return { entries, total, page, pageSize };
}

// ---- вход ----

let dummyHash: Promise<string> | undefined;

/** Вход администратора. Причина отказа не раскрывается: «не админ» выглядит как «неверный пароль». */
export async function login(username: string, password: string) {
  const user = await prisma.user.findUnique({ where: { username } });
  dummyHash ??= argon2.hash('dummy-password');
  const ok = await argon2.verify(user?.passwordHash ?? (await dummyHash), password);
  if (!user || !user.passwordHash || !ok || user.role !== 'admin' || user.status !== 'active') {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Неверный ник или пароль');
  }
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  const token = await createSession(user.id, 'admin');
  await audit(user.id, 'admin.login');
  return { user: toSessionUser(updated), token };
}

export const logout = (token: string) => destroySession(token);
export { ADMIN_SESSION_TTL_MS };

// ---- статистика ----

const TABLES = [
  ['User', () => prisma.user.count()],
  ['Session', () => prisma.session.count()],
  ['AuthIdentity', () => prisma.authIdentity.count()],
  ['PasswordResetRequest', () => prisma.passwordResetRequest.count()],
  ['AdminAuditLog', () => prisma.adminAuditLog.count()],
  ['Wishlist', () => prisma.wishlist.count()],
  ['Item', () => prisma.item.count()],
  ['ItemImage', () => prisma.itemImage.count()],
  ['ItemLink', () => prisma.itemLink.count()],
  ['Reservation', () => prisma.reservation.count()],
  ['Friendship', () => prisma.friendship.count()],
  ['Group', () => prisma.group.count()],
  ['GroupMember', () => prisma.groupMember.count()],
  ['GroupExclusion', () => prisma.groupExclusion.count()],
  ['Assignment', () => prisma.assignment.count()],
  ['Notification', () => prisma.notification.count()],
] as const;

export async function getStats(): Promise<AdminStats> {
  const [counts, sizes, filesBytes, days, blocked] = await Promise.all([
    Promise.all(TABLES.map(([, count]) => count())),
    prisma.$queryRaw<{ name: string; bytes: bigint }[]>`
      SELECT c.relname AS name, pg_total_relation_size(c.oid) AS bytes
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'`,
    storage.totalSize(),
    prisma.$queryRaw<{ day: Date; count: number }[]>`
      SELECT date_trunc('day', "createdAt")::date AS day, count(*)::int AS count
      FROM "User" WHERE "createdAt" >= now() - interval '29 days' GROUP BY 1`,
    prisma.user.count({ where: { status: 'blocked' } }),
  ]);
  const bytesByName = new Map(sizes.map((s) => [s.name, Number(s.bytes)]));

  // 30 дней подряд, дни без регистраций — нули
  const byDay = new Map(days.map((d) => [d.day.toISOString().slice(0, 10), d.count]));
  const registrations = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - (29 - i));
    const date = d.toISOString().slice(0, 10);
    return { date, count: byDay.get(date) ?? 0 };
  });

  return {
    tables: TABLES.map(([name], i) => ({
      name,
      rows: counts[i]!,
      bytes: bytesByName.get(name) ?? 0,
    })),
    filesBytes,
    registrations,
    totals: { users: counts[0]!, blocked },
  };
}

// ---- пользователи ----

type UserWithMeta = User & {
  identities: { provider: string }[];
  _count: { wishlists: number };
};

/** Способы входа: «password» и привязанные соцсети. Только названия. */
const providersOf = (u: UserWithMeta): string[] => [
  ...(u.passwordHash !== null ? ['password'] : []),
  ...u.identities.map((i) => i.provider),
];

const toRow = (u: UserWithMeta): AdminUserRow => ({
  id: u.id,
  username: u.username,
  fullName: u.fullName,
  role: u.role,
  status: u.status,
  createdAt: u.createdAt.toISOString(),
  lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
  providers: providersOf(u),
  wishlistsCount: u._count.wishlists,
});

const USER_META = {
  identities: { select: { provider: true } },
  _count: { select: { wishlists: true } },
} as const;

export async function listUsers(q: AdminUsersQuery): Promise<AdminUsersPage> {
  const where: Prisma.UserWhereInput = {
    ...(q.q ? { username: { startsWith: escapeLike(q.q) } } : {}),
    ...(q.status === 'all' ? {} : { status: q.status }),
  };
  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      // Пустой последний вход всегда в конце
      orderBy: { [q.sort]: q.sort === 'lastLoginAt' ? { sort: q.dir, nulls: 'last' } : q.dir },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: USER_META,
    }),
    prisma.user.count({ where }),
  ]);
  return { users: rows.map(toRow), total, page: q.page, pageSize: q.pageSize };
}

export async function getUserCard(id: string): Promise<AdminUserCard> {
  const u = await prisma.user.findUnique({ where: { id }, include: USER_META });
  if (!u) throw notFound('Пользователь не найден');
  const [itemsCount, reservationsCount, groupsCount, resetRequestsCount, blockedBy] =
    await Promise.all([
      prisma.item.count({ where: { wishlist: { ownerId: id } } }),
      prisma.reservation.count({ where: { reservedById: id } }),
      prisma.groupMember.count({ where: { userId: id } }),
      prisma.passwordResetRequest.count({ where: { userId: id } }),
      u.blockedById
        ? prisma.user.findUnique({ where: { id: u.blockedById }, select: { username: true } })
        : null,
    ]);
  return {
    ...toRow(u),
    itemsCount,
    reservationsCount,
    groupsCount,
    resetRequestsCount,
    blocked:
      u.status === 'blocked'
        ? {
            at: (u.blockedAt ?? u.updatedAt).toISOString(),
            by: blockedBy?.username ?? null,
            reason: u.blockedReason,
          }
        : null,
  };
}

export async function blockUser(adminId: string, userId: string, reason: string) {
  if (userId === adminId) throw forbidden('Себя заблокировать нельзя');
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound('Пользователь не найден');
  if (user.role === 'admin') throw forbidden('Администратора заблокировать нельзя');
  if (user.status === 'blocked') throw new HttpError(409, 'ALREADY_BLOCKED', 'Уже заблокирован');
  await prisma.user.update({
    where: { id: userId },
    data: { status: 'blocked', blockedAt: new Date(), blockedById: adminId, blockedReason: reason },
  });
  await destroyUserSessions(userId);
  await audit(adminId, 'user.block', userId, { reason });
}

export async function unblockUser(adminId: string, userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound('Пользователь не найден');
  if (user.status !== 'blocked') throw new HttpError(409, 'NOT_BLOCKED', 'Пользователь не заблокирован');
  await prisma.user.update({
    where: { id: userId },
    data: { status: 'active', blockedAt: null, blockedById: null, blockedReason: null },
  });
  await audit(adminId, 'user.unblock', userId);
}

// ---- заявки на сброс пароля ----

export async function listResetRequests(
  status: 'new' | 'done' | 'rejected' | 'all',
): Promise<AdminResetRequest[]> {
  const rows = await prisma.passwordResetRequest.findMany({
    where: status === 'all' ? {} : { status },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { user: { include: USER_META } },
  });
  return rows.map((r) => ({
    id: r.id,
    code: r.requestCode,
    username: r.username,
    contact: r.contact,
    comment: r.comment,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    handledAt: r.handledAt?.toISOString() ?? null,
    user: r.user
      ? {
          id: r.user.id,
          registeredAt: r.user.createdAt.toISOString(),
          lastLoginAt: r.user.lastLoginAt?.toISOString() ?? null,
          providers: providersOf(r.user),
          wishlistsCount: r.user._count.wishlists,
          blocked: r.user.status === 'blocked',
        }
      : null,
  }));
}

async function getNewRequest(id: string) {
  const r = await prisma.passwordResetRequest.findUnique({ where: { id } });
  if (!r) throw notFound('Заявка не найдена');
  if (r.status !== 'new') throw new HttpError(409, 'REQUEST_HANDLED', 'Заявка уже обработана');
  return r;
}

/** Одноразовая ссылка на 24 часа. Прежняя ссылка гасится: хэш заменяется новым. */
export async function createResetLink(adminId: string, id: string) {
  const r = await getNewRequest(id);
  if (!r.userId) {
    throw new HttpError(400, 'USER_NOT_FOUND', `Пользователя «${r.username}» нет: ссылку создать нельзя`);
  }
  const target = await prisma.user.findUnique({ where: { id: r.userId } });
  if (target?.role === 'admin') throw forbidden('Для администратора ссылка не создаётся');
  const token = randomToken();
  await prisma.passwordResetRequest.update({
    where: { id },
    data: {
      tokenHash: sha256(token),
      tokenExpiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      tokenUsedAt: null,
      handledById: adminId,
    },
  });
  await audit(adminId, 'reset.link', r.userId, { code: r.requestCode });
  return { url: `${env.CLIENT_URL}/reset/${token}`, expiresInHours: 24 };
}

export async function rejectResetRequest(adminId: string, id: string) {
  const r = await getNewRequest(id);
  await prisma.passwordResetRequest.update({
    where: { id },
    data: {
      status: 'rejected',
      handledById: adminId,
      handledAt: new Date(),
      tokenHash: null,
      tokenExpiresAt: null,
    },
  });
  await audit(adminId, 'reset.reject', r.userId, { code: r.requestCode });
}
