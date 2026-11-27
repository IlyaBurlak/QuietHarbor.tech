import { Prisma } from '@prisma/client';
import type { MyReservations } from '@wishlist/shared';
import { prisma } from '../../core/db/prisma';
import { forbidden, HttpError, notFound } from '../../core/http/errors';
import { canViewWishlist } from '../wishlists/wishlists.access';
import { toItemDto } from '../wishlists/wishlists.dto';
import { ITEM_INCLUDE } from '../wishlists/wishlists.service';

async function getViewableItem(userId: string, itemId: string) {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: { wishlist: true },
  });
  if (!item || !(await canViewWishlist(userId, item.wishlist))) throw notFound('Товар не найден');
  return item;
}

/** Бронь одним INSERT: уникальный индекс на itemId не даёт двум людям занять один товар. */
export async function reserve(userId: string, itemId: string) {
  const item = await getViewableItem(userId, itemId);
  if (item.wishlist.ownerId === userId) throw forbidden('Свой подарок забронировать нельзя');
  try {
    await prisma.reservation.create({ data: { itemId, reservedById: userId } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new HttpError(409, 'ALREADY_RESERVED', 'Этот подарок уже забронировал кто-то другой');
    }
    throw e;
  }
}

async function getOwnReservation(userId: string, itemId: string) {
  await getViewableItem(userId, itemId);
  const r = await prisma.reservation.findUnique({ where: { itemId } });
  if (!r || r.reservedById !== userId) throw forbidden('Это не ваша бронь');
  return r;
}

export async function release(userId: string, itemId: string) {
  await getOwnReservation(userId, itemId);
  await prisma.reservation.delete({ where: { itemId } });
}

export async function markBought(userId: string, itemId: string) {
  await getOwnReservation(userId, itemId);
  await prisma.reservation.update({ where: { itemId }, data: { status: 'bought' } });
}

export async function myReservations(userId: string): Promise<MyReservations> {
  const rows = await prisma.reservation.findMany({
    where: { reservedById: userId },
    orderBy: { createdAt: 'desc' },
    include: {
      item: {
        include: {
          ...ITEM_INCLUDE,
          wishlist: {
            include: {
              owner: { select: { id: true, username: true, fullName: true, avatarKey: true } },
            },
          },
        },
      },
    },
  });
  const groups = new Map<string, MyReservations['groups'][number]>();
  for (const r of rows) {
    const w = r.item.wishlist;
    const group = groups.get(w.id) ?? {
      wishlist: { id: w.id, title: w.title, shareSlug: w.shareSlug },
      owner: w.owner,
      items: [],
    };
    group.items.push({ ...toItemDto(r.item), status: r.status });
    groups.set(w.id, group);
  }
  return { groups: [...groups.values()] };
}
