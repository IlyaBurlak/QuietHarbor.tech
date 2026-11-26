import type { SessionUser } from '@wishlist/shared';
import { randomToken, sha256 as hash } from '../../core/http/crypto';
import { prisma } from '../../core/db/prisma';
import { toSessionUser } from '../users/user.dto';

export const SESSION_COOKIE = 'sid';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const ADMIN_SESSION_COOKIE = 'admin_sid';
export const ADMIN_SESSION_TTL_MS = 2 * 60 * 60 * 1000;

/** Создаёт сессию и возвращает сырой токен (в базе хранится только хэш). */
export async function createSession(userId: string, kind: 'user' | 'admin' = 'user'): Promise<string> {
  const token = randomToken();
  const ttl = kind === 'admin' ? ADMIN_SESSION_TTL_MS : SESSION_TTL_MS;
  await prisma.session.create({
    data: { userId, kind, tokenHash: hash(token), expiresAt: new Date(Date.now() + ttl) },
  });
  return token;
}

/** Пользователь по токену; заблокированный и просроченная сессия — null. */
export async function resolveSession(token: string): Promise<SessionUser | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hash(token) },
    include: { user: true },
  });
  if (!session || session.kind !== 'user') return null;
  if (session.expiresAt < new Date() || session.user.status === 'blocked') return null;
  return toSessionUser(session.user);
}

/** Админ по токену админского cookie. Роль и статус читаются из базы при каждом запросе. */
export async function resolveAdminSession(token: string): Promise<SessionUser | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hash(token) },
    include: { user: true },
  });
  if (!session || session.kind !== 'admin' || session.expiresAt < new Date()) return null;
  if (session.user.role !== 'admin' || session.user.status !== 'active') return null;
  return toSessionUser(session.user);
}

export async function destroySession(token: string) {
  await prisma.session.deleteMany({ where: { tokenHash: hash(token) } });
}

/** Закрывает все сессии пользователя (смена пароля, блокировка). */
export async function destroyUserSessions(userId: string, exceptToken?: string) {
  await prisma.session.deleteMany({
    where: { userId, ...(exceptToken ? { tokenHash: { not: hash(exceptToken) } } : {}) },
  });
}
