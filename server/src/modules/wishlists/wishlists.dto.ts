import type { Item, Wishlist } from '@prisma/client';
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
export const toItemDto = (i: Item): WishlistItemDto => ({
  id: i.id,
  title: i.title,
  description: i.description,
  price: i.price ? i.price.toString() : null,
  currency: i.currency,
  url: i.url,
  priority: i.priority,
  position: i.position,
});
