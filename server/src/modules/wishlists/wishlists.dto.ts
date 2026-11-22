import type { Item, ItemImage, ItemLink, Wishlist } from '@prisma/client';
import type { WishlistDto, WishlistItemDto } from '@wishlist/shared';

const dateOnly = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export const toWishlistDto = (w: Wishlist, itemsCount: number): WishlistDto => ({
  id: w.id,
  title: w.title,
  description: w.description,
  visibility: w.visibility,
  sortMode: w.sortMode,
  eventDate: dateOnly(w.eventDate),
  shareSlug: w.shareSlug,
  itemsCount,
  createdAt: w.createdAt.toISOString(),
  updatedAt: w.updatedAt.toISOString(),
});

/** Брони сюда не попадают намеренно: владелец их не видит. */
export type ItemWithMedia = Item & { images: ItemImage[]; links: ItemLink[] };

export const toItemDto = (i: ItemWithMedia): WishlistItemDto => ({
  id: i.id,
  title: i.title,
  description: i.description,
  note: i.note,
  price: i.price ? i.price.toString() : null,
  currency: i.currency,
  url: i.url,
  priority: i.priority,
  position: i.position,
  images: [...i.images]
    .sort((a, b) => Number(b.isMain) - Number(a.isMain) || a.position - b.position)
    .map((m) => ({ id: m.id, fileKey: m.fileKey, isMain: m.isMain })),
  links: i.links.map((l) => ({ id: l.id, url: l.url, label: l.label })),
});
