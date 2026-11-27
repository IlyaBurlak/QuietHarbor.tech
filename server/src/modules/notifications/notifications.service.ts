import type { NotificationType } from '@prisma/client';
import type { NotificationDto, NotificationSummary } from '@wishlist/shared';
import { prisma } from '../../core/db/prisma';
import { logger } from '../../core/http/logger';
import { notFound } from '../../core/http/errors';
import { CARD_SELECT } from '../friends/friends.service';

interface NotifyInput {
  userId: string;
  type: NotificationType;
  actorId?: string;
  groupId?: string;
}

/**
 * Создаёт уведомления. Сбой уведомления не должен ломать основное действие, поэтому ошибка
 * только пишется в лог. О бронях подарков уведомлений нет: владелец о них не знает.
 */
export async function notify(items: NotifyInput | NotifyInput[]) {
  const list = Array.isArray(items) ? items : [items];
  if (list.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: list.map((i) => ({
        userId: i.userId,
        type: i.type,
        actorId: i.actorId ?? null,
        groupId: i.groupId ?? null,
      })),
    });
  } catch (e) {
    logger.error({ err: e }, 'Не удалось создать уведомление');
  }
}

/** Заявка обработана или отозвана: старое уведомление о ней больше не нужно. */
export async function dropFriendRequestNotice(addresseeId: string, requesterId: string) {
  await prisma.notification.deleteMany({
    where: { userId: addresseeId, actorId: requesterId, type: 'friend_request' },
  });
}

export async function list(userId: string): Promise<NotificationDto[]> {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { actor: { select: CARD_SELECT }, group: { select: { id: true, title: true } } },
  });
  return rows.map((n) => ({
    id: n.id,
    type: n.type,
    actor: n.actor,
    group: n.group,
    read: n.readAt !== null,
    createdAt: n.createdAt.toISOString(),
  }));
}

export async function summary(userId: string): Promise<NotificationSummary> {
  const [unread, friendRequests] = await Promise.all([
    prisma.notification.count({ where: { userId, readAt: null } }),
    prisma.friendship.count({ where: { addresseeId: userId, status: 'pending' } }),
  ]);
  return { unread, friendRequests };
}

export async function markRead(userId: string, id: string) {
  const { count } = await prisma.notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });
  if (count === 0) {
    const exists = await prisma.notification.findFirst({ where: { id, userId } });
    if (!exists) throw notFound('Уведомление не найдено');
  }
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
