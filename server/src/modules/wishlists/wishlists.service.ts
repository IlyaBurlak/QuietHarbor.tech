import { randomBytes } from 'node:crypto';
import type { Item, Wishlist, WishlistSort } from '@prisma/client';
import type { CreateWishlistInput, UpdateWishlistInput } from '@wishlist/shared';
import { prisma } from '../../core/db/prisma';
import { forbidden, HttpError, notFound } from '../../core/http/errors';
import { canViewWishlist } from './wishlists.access';
import { toItemDto, toWishlistDto } from './wishlists.dto';

/** Длинный случайный ключ (144 бита): не подбирается. */
export const generateShareSlug = () => randomBytes(18).toString('base64url');

const toDate = (v: string | null | undefined) => (v ? new Date(`${v}T00:00:00.000Z`) : null);

/** Порядок товаров по режиму сортировки; цены без значения — в конце. */
function sortItems(items: Item[], mode: WishlistSort): Item[] {
  const byPosition = (a: Item, b: Item) =>
    a.position - b.position || a.createdAt.getTime() - b.createdAt.getTime();
  if (mode === 'priority') {
    return [...items].sort((a, b) => b.priority - a.priority || byPosition(a, b));
  }
  if (mode === 'price') {
    return [...items].sort((a, b) => {
      if (!a.price && !b.price) return byPosition(a, b);
      if (!a.price) return 1;
      if (!b.price) return -1;
      return a.price.comparedTo(b.price) || byPosition(a, b);
    });
  }
  return [...items].sort(byPosition);
}

async function getOwned(userId: string, id: string): Promise<Wishlist> {
  const wishlist = await prisma.wishlist.findUnique({ where: { id } });
  if (!wishlist) throw notFound('Вишлист не найден');
  if (wishlist.ownerId !== userId) {
    // Чужой скрытый вишлист не должен выдавать своё существование.
    if (await canViewWishlist(userId, wishlist)) throw forbidden('Менять вишлист может только владелец');
    throw notFound('Вишлист не найден');
  }
  return wishlist;
}

export async function listWishlists(userId: string) {
  const rows = await prisma.wishlist.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { items: true } } },
  });
  return rows.map((w) => toWishlistDto(w, w._count.items));
}

export async function createWishlist(userId: string, input: CreateWishlistInput) {
  const w = await prisma.wishlist.create({
    data: {
      ownerId: userId,
      title: input.title,
      description: input.description || null,
      visibility: input.visibility,
      sortMode: input.sortMode,
      eventDate: toDate(input.eventDate),
      shareSlug: generateShareSlug(),
    },
  });
  return toWishlistDto(w, 0);
}

export async function getWishlist(userId: string, id: string) {
  const w = await prisma.wishlist.findUnique({ where: { id }, include: { items: true } });
  if (!w || !(await canViewWishlist(userId, w))) throw notFound('Вишлист не найден');
  const items = sortItems(w.items, w.sortMode).map(toItemDto);
  return { wishlist: toWishlistDto(w, items.length), items };
}

export async function updateWishlist(userId: string, id: string, input: UpdateWishlistInput) {
  await getOwned(userId, id);
  const w = await prisma.wishlist.update({
    where: { id },
    data: {
      title: input.title,
      description: input.description === undefined ? undefined : input.description || null,
      visibility: input.visibility,
      sortMode: input.sortMode,
      eventDate: input.eventDate === undefined ? undefined : toDate(input.eventDate),
    },
    include: { _count: { select: { items: true } } },
  });
  return toWishlistDto(w, w._count.items);
}

export async function deleteWishlist(userId: string, id: string) {
  await getOwned(userId, id);
  await prisma.wishlist.delete({ where: { id } });
}

export async function regenerateLink(userId: string, id: string) {
  await getOwned(userId, id);
  const w = await prisma.wishlist.update({
    where: { id },
    data: { shareSlug: generateShareSlug() },
    include: { _count: { select: { items: true } } },
  });
  return toWishlistDto(w, w._count.items);
}

/** Ручной порядок: массив id должен в точности совпадать с набором товаров вишлиста. */
export async function reorder(userId: string, id: string, itemIds: string[]) {
  await getOwned(userId, id);
  const items = await prisma.item.findMany({ where: { wishlistId: id }, select: { id: true } });
  const known = new Set(items.map((i) => i.id));
  const valid =
    itemIds.length === known.size &&
    new Set(itemIds).size === itemIds.length &&
    itemIds.every((x) => known.has(x));
  if (!valid) {
    throw new HttpError(400, 'INVALID_ORDER', 'Список товаров не совпадает с вишлистом', {
      itemIds: 'Список товаров не совпадает с вишлистом',
    });
  }
  await prisma.$transaction([
    ...itemIds.map((itemId, position) =>
      prisma.item.update({ where: { id: itemId }, data: { position } }),
    ),
    prisma.wishlist.update({ where: { id }, data: { sortMode: 'manual' } }),
  ]);
  return getWishlist(userId, id);
}

/** Копия вишлиста (свой или доступный) со своими товарами; брони не копируются. */
export async function duplicateWishlist(userId: string, id: string) {
  const src = await prisma.wishlist.findUnique({
    where: { id },
    include: { items: { include: { links: true } } },
  });
  if (!src || !(await canViewWishlist(userId, src))) throw notFound('Вишлист не найден');
  const copy = await prisma.wishlist.create({
    data: {
      ownerId: userId,
      title: src.ownerId === userId ? `${src.title} (копия)`.slice(0, 100) : src.title,
      description: src.description,
      visibility: 'private',
      sortMode: src.sortMode,
      eventDate: src.eventDate,
      shareSlug: generateShareSlug(),
      items: {
        create: src.items.map((i) => ({
          title: i.title,
          description: i.description,
          price: i.price,
          currency: i.currency,
          url: i.url,
          priority: i.priority,
          note: i.note,
          position: i.position,
          links: { create: i.links.map((l) => ({ url: l.url, label: l.label })) },
        })),
      },
    },
  });
  return toWishlistDto(copy, src.items.length);
}

/** Копирует товар из доступного вишлиста в свой; фото и брони не копируются. */
export async function copyItem(userId: string, targetId: string, itemId: string) {
  const target = await getOwned(userId, targetId);
  const src = await prisma.item.findUnique({
    where: { id: itemId },
    include: { wishlist: true, links: true },
  });
  if (!src || !(await canViewWishlist(userId, src.wishlist))) throw notFound('Товар не найден');
  const last = await prisma.item.aggregate({
    where: { wishlistId: target.id },
    _max: { position: true },
  });
  const item = await prisma.item.create({
    data: {
      wishlistId: target.id,
      title: src.title,
      description: src.description,
      price: src.price,
      currency: src.currency,
      url: src.url,
      priority: src.priority,
      note: src.note,
      position: (last._max.position ?? -1) + 1,
      links: { create: src.links.map((l) => ({ url: l.url, label: l.label })) },
    },
  });
  return toItemDto(item);
}
