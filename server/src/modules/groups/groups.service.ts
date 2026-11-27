import { randomBytes } from 'node:crypto';
import { Prisma, type Group } from '@prisma/client';
import {
  MIN_GROUP_MEMBERS,
  type CreateGroupInput,
  type ExclusionInput,
  type GroupDetail,
  type GroupPreview,
  type GroupSummary,
  type MyRecipient,
  type UpdateGroupInput,
} from '@wishlist/shared';
import { prisma } from '../../core/db/prisma';
import { forbidden, HttpError, notFound } from '../../core/http/errors';
import { CARD_SELECT } from '../friends/friends.service';
import { notify } from '../notifications/notifications.service';
import { toItemDto } from '../wishlists/wishlists.dto';
import { ITEM_INCLUDE } from '../wishlists/wishlists.service';
import { drawSecretSanta } from './draw';

const generateInviteCode = () => randomBytes(12).toString('base64url');
const toDate = (v: string | null | undefined) => (v ? new Date(`${v}T00:00:00.000Z`) : null);
const dateOnly = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
const money = (d: Prisma.Decimal | null) => (d ? d.toString() : null);

const tooStrict = () =>
  new HttpError(
    400,
    'EXCLUSIONS_TOO_STRICT',
    'Правила слишком строгие: при них жеребьёвка невозможна. Уберите часть исключений',
  );
const drawn = () => new HttpError(409, 'GROUP_DRAWN', 'Жеребьёвка уже проведена, состав закрыт');

/** Группа, в которой я участник. Для всех остальных — 404, чтобы не выдавать существование. */
async function getMemberGroup(userId: string, groupId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: { include: { user: { select: CARD_SELECT } } } },
  });
  if (!group || !group.members.some((m) => m.userId === userId)) {
    throw notFound('Группа не найдена');
  }
  return group;
}

async function getOwnedGroup(userId: string, groupId: string) {
  const group = await getMemberGroup(userId, groupId);
  if (group.ownerId !== userId) throw forbidden('Это может делать только организатор');
  return group;
}

function summary(g: Group, membersCount: number, userId: string): GroupSummary {
  return {
    id: g.id,
    title: g.title,
    budget: money(g.budget),
    currency: g.currency,
    drawDate: dateOnly(g.drawDate),
    exchangeDate: dateOnly(g.exchangeDate),
    status: g.status,
    membersCount,
    isOwner: g.ownerId === userId,
  };
}

export async function createGroup(userId: string, input: CreateGroupInput) {
  const g = await prisma.group.create({
    data: {
      ownerId: userId,
      title: input.title,
      description: input.description || null,
      budget: input.budget ?? null,
      currency: input.currency ?? 'RUB',
      drawDate: toDate(input.drawDate),
      exchangeDate: toDate(input.exchangeDate),
      inviteCode: generateInviteCode(),
      members: { create: { userId } },
    },
  });
  return summary(g, 1, userId);
}

export async function listGroups(userId: string): Promise<GroupSummary[]> {
  const groups = await prisma.group.findMany({
    where: { members: { some: { userId } } },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { members: true } } },
  });
  return groups.map((g) => summary(g, g._count.members, userId));
}

export async function getGroup(userId: string, groupId: string): Promise<GroupDetail> {
  const g = await getMemberGroup(userId, groupId);
  const isOwner = g.ownerId === userId;
  const exclusions =
    isOwner && g.status === 'open'
      ? await prisma.groupExclusion.findMany({ where: { groupId } })
      : [];
  const owner = g.members.find((m) => m.userId === g.ownerId)!.user;
  const mine = g.members.find((m) => m.userId === userId)!;
  return {
    ...summary(g, g.members.length, userId),
    description: g.description,
    inviteCode: g.inviteCode,
    owner,
    members: g.members
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((m) => ({ ...m.user, isOwner: m.userId === g.ownerId, hasWishlist: !!m.wishlistId })),
    exclusions: exclusions.map((e) => ({ id: e.id, userAId: e.userAId, userBId: e.userBId })),
    myWishlistId: mine.wishlistId,
  };
}

export async function updateGroup(userId: string, groupId: string, input: UpdateGroupInput) {
  const g = await getOwnedGroup(userId, groupId);
  const updated = await prisma.group.update({
    where: { id: groupId },
    data: {
      title: input.title,
      description: input.description === undefined ? undefined : input.description || null,
      budget: input.budget,
      currency: input.currency,
      drawDate: input.drawDate === undefined ? undefined : toDate(input.drawDate),
      exchangeDate: input.exchangeDate === undefined ? undefined : toDate(input.exchangeDate),
    },
  });
  return summary(updated, g.members.length, userId);
}

export async function deleteGroup(userId: string, groupId: string) {
  await getOwnedGroup(userId, groupId);
  await prisma.group.delete({ where: { id: groupId } });
}

// ---- приглашения ----

async function getByCode(code: string) {
  const g = await prisma.group.findUnique({
    where: { inviteCode: code },
    include: {
      owner: { select: CARD_SELECT },
      _count: { select: { members: true } },
    },
  });
  if (!g) throw notFound('Приглашение не найдено или устарело');
  return g;
}

export async function previewInvite(userId: string | undefined, code: string): Promise<GroupPreview> {
  const g = await getByCode(code);
  const member = userId
    ? await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId: g.id, userId } } })
    : null;
  return {
    title: g.title,
    description: g.description,
    budget: money(g.budget),
    currency: g.currency,
    exchangeDate: dateOnly(g.exchangeDate),
    membersCount: g._count.members,
    status: g.status,
    owner: g.owner,
    joinedGroupId: member ? g.id : null,
  };
}

export async function joinGroup(userId: string, code: string) {
  const g = await getByCode(code);
  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: g.id, userId } },
  });
  if (existing) return { groupId: g.id };
  if (g.status !== 'open') throw drawn();
  try {
    await prisma.groupMember.create({ data: { groupId: g.id, userId } });
    await notify({ userId: g.ownerId, type: 'group_joined', actorId: userId, groupId: g.id });
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
  }
  return { groupId: g.id };
}

export async function regenerateInvite(userId: string, groupId: string) {
  await getOwnedGroup(userId, groupId);
  const g = await prisma.group.update({
    where: { id: groupId },
    data: { inviteCode: generateInviteCode() },
  });
  return { inviteCode: g.inviteCode };
}

// ---- участники ----

async function removeMember(groupId: string, userId: string) {
  await prisma.$transaction([
    prisma.groupMember.delete({ where: { groupId_userId: { groupId, userId } } }),
    prisma.groupExclusion.deleteMany({
      where: { groupId, OR: [{ userAId: userId }, { userBId: userId }] },
    }),
  ]);
}

export async function kickMember(userId: string, groupId: string, memberId: string) {
  const g = await getOwnedGroup(userId, groupId);
  if (g.status !== 'open') throw drawn();
  if (memberId === userId) {
    throw new HttpError(400, 'OWNER_CANNOT_LEAVE', 'Организатор не может выйти. Удалите группу');
  }
  if (!g.members.some((m) => m.userId === memberId)) throw notFound('Участник не найден');
  await removeMember(groupId, memberId);
}

export async function leaveGroup(userId: string, groupId: string) {
  const g = await getMemberGroup(userId, groupId);
  if (g.ownerId === userId) {
    throw new HttpError(
      400,
      'OWNER_CANNOT_LEAVE',
      'Организатор не может выйти из группы. Удалите её, если она больше не нужна',
    );
  }
  if (g.status !== 'open') throw drawn();
  await removeMember(groupId, userId);
}

export async function setMyWishlist(userId: string, groupId: string, wishlistId: string | null) {
  await getMemberGroup(userId, groupId);
  if (wishlistId) {
    const w = await prisma.wishlist.findUnique({ where: { id: wishlistId } });
    if (!w || w.ownerId !== userId) throw notFound('Вишлист не найден');
  }
  await prisma.groupMember.update({
    where: { groupId_userId: { groupId, userId } },
    data: { wishlistId },
  });
}

// ---- исключения ----

const sortedPair = (a: string, b: string): [string, string] => (a < b ? [a, b] : [b, a]);

export async function addExclusion(userId: string, groupId: string, input: ExclusionInput) {
  const g = await getOwnedGroup(userId, groupId);
  if (g.status !== 'open') throw drawn();
  if (input.userAId === input.userBId) {
    throw new HttpError(400, 'INVALID_EXCLUSION', 'Выберите двух разных участников');
  }
  const ids = new Set(g.members.map((m) => m.userId));
  if (!ids.has(input.userAId) || !ids.has(input.userBId)) {
    throw new HttpError(400, 'INVALID_EXCLUSION', 'Оба человека должны быть участниками группы');
  }
  const [userAId, userBId] = sortedPair(input.userAId, input.userBId);
  const existing = await prisma.groupExclusion.findMany({ where: { groupId } });
  const pairs = [...existing.map((e) => [e.userAId, e.userBId] as [string, string]), [userAId, userBId] as [string, string]];
  // Не даём создать правило, после которого жеребьёвка уже невозможна
  if (g.members.length >= MIN_GROUP_MEMBERS && !drawSecretSanta([...ids], pairs)) throw tooStrict();
  try {
    const e = await prisma.groupExclusion.create({ data: { groupId, userAId, userBId } });
    return { id: e.id, userAId, userBId };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new HttpError(409, 'EXCLUSION_EXISTS', 'Такая пара уже в исключениях');
    }
    throw e;
  }
}

export async function removeExclusion(userId: string, groupId: string, exclusionId: string) {
  const g = await getOwnedGroup(userId, groupId);
  if (g.status !== 'open') throw drawn();
  const { count } = await prisma.groupExclusion.deleteMany({ where: { id: exclusionId, groupId } });
  if (count === 0) throw notFound('Исключение не найдено');
}

// ---- жеребьёвка ----

export async function draw(userId: string, groupId: string) {
  const g = await getOwnedGroup(userId, groupId);
  if (g.status !== 'open') throw drawn();
  if (g.members.length < MIN_GROUP_MEMBERS) {
    throw new HttpError(
      400,
      'NOT_ENOUGH_MEMBERS',
      `Для жеребьёвки нужно минимум ${MIN_GROUP_MEMBERS} участника`,
    );
  }
  const exclusions = await prisma.groupExclusion.findMany({ where: { groupId } });
  const pairs = drawSecretSanta(
    g.members.map((m) => m.userId),
    exclusions.map((e) => [e.userAId, e.userBId] as const),
  );
  if (!pairs) throw tooStrict();

  await prisma.$transaction(async (tx) => {
    // Условный переход open → drawn защищает от двух одновременных жеребьёвок
    const { count } = await tx.group.updateMany({
      where: { id: groupId, status: 'open' },
      data: { status: 'drawn' },
    });
    if (count === 0) throw drawn();
    await tx.assignment.createMany({
      data: pairs.map((p) => ({ groupId, giverId: p.giverId, receiverId: p.receiverId })),
    });
  });
  // Уведомление одинаково для всех и не содержит пар
  await notify(g.members.map((m) => ({ userId: m.userId, type: 'group_drawn' as const, groupId })));
}

/** Только получатель текущего пользователя. Эндпоинта со всеми парами не существует. */
export async function myRecipient(userId: string, groupId: string): Promise<MyRecipient> {
  const g = await getMemberGroup(userId, groupId);
  if (g.status !== 'drawn') {
    throw new HttpError(409, 'NOT_DRAWN', 'Жеребьёвка ещё не проведена');
  }
  const a = await prisma.assignment.findUnique({
    where: { groupId_giverId: { groupId, giverId: userId } },
  });
  if (!a) throw notFound('Вам не назначен получатель');
  const recipient = g.members.find((m) => m.userId === a.receiverId)!;
  const wishlistId = recipient.wishlistId;
  // Закрепление вишлиста в группе — согласие участника показать его своему Санте
  const wishlist = wishlistId
    ? await prisma.wishlist.findUnique({
        where: { id: wishlistId },
        include: { items: { include: ITEM_INCLUDE, orderBy: { position: 'asc' } } },
      })
    : null;
  return {
    recipient: recipient.user,
    wishlist: wishlist
      ? {
          id: wishlist.id,
          title: wishlist.title,
          description: wishlist.description,
          items: wishlist.items.map(toItemDto),
        }
      : null,
  };
}
