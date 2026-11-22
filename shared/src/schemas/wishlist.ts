import { z } from 'zod';

export const wishlistVisibilitySchema = z.enum(['private', 'link', 'friends']);
export type WishlistVisibility = z.infer<typeof wishlistVisibilitySchema>;

export const wishlistSortSchema = z.enum(['manual', 'priority', 'price']);
export type WishlistSort = z.infer<typeof wishlistSortSchema>;

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата в формате ГГГГ-ММ-ДД');

export const createWishlistSchema = z.object({
  title: z.string().trim().min(1, 'Укажите название').max(100, 'Не длиннее 100 символов'),
  description: z.string().trim().max(1000, 'Не длиннее 1000 символов').optional(),
  visibility: wishlistVisibilitySchema.default('private'),
  eventDate: dateOnly.nullable().optional(),
  sortMode: wishlistSortSchema.default('manual'),
});
export type CreateWishlistInput = z.infer<typeof createWishlistSchema>;

export const updateWishlistSchema = z
  .object({
    title: createWishlistSchema.shape.title,
    description: z.string().trim().max(1000, 'Не длиннее 1000 символов').nullable(),
    visibility: wishlistVisibilitySchema,
    eventDate: dateOnly.nullable(),
    sortMode: wishlistSortSchema,
  })
  .partial();
export type UpdateWishlistInput = z.infer<typeof updateWishlistSchema>;

export const reorderWishlistSchema = z.object({
  itemIds: z.array(z.string().min(1)).max(1000),
});
export type ReorderWishlistInput = z.infer<typeof reorderWishlistSchema>;

export const copyItemSchema = z.object({ itemId: z.string().min(1) });
export type CopyItemInput = z.infer<typeof copyItemSchema>;

/** Вишлист в списке и на странице владельца. Броней здесь нет и быть не может. */
export const wishlistDtoSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  visibility: wishlistVisibilitySchema,
  sortMode: wishlistSortSchema,
  eventDate: z.string().nullable(),
  shareSlug: z.string(),
  itemsCount: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type WishlistDto = z.infer<typeof wishlistDtoSchema>;

/** Товар в вишлисте владельца (без броней). */
export const wishlistItemDtoSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  price: z.string().nullable(),
  currency: z.string().nullable(),
  url: z.string().nullable(),
  priority: z.number().int(),
  position: z.number().int(),
});
export type WishlistItemDto = z.infer<typeof wishlistItemDtoSchema>;

export const wishlistDetailSchema = z.object({
  wishlist: wishlistDtoSchema,
  items: z.array(wishlistItemDtoSchema),
});
export type WishlistDetail = z.infer<typeof wishlistDetailSchema>;
