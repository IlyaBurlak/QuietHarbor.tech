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

export const itemImageDtoSchema = z.object({
  id: z.string(),
  fileKey: z.string(),
  isMain: z.boolean(),
});
export type ItemImageDto = z.infer<typeof itemImageDtoSchema>;

export const itemLinkDtoSchema = z.object({
  id: z.string(),
  url: z.string(),
  label: z.string().nullable(),
});
export type ItemLinkDto = z.infer<typeof itemLinkDtoSchema>;

/** Товар в вишлисте владельца (без броней). */
export const wishlistItemDtoSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  note: z.string().nullable(),
  price: z.string().nullable(),
  currency: z.string().nullable(),
  url: z.string().nullable(),
  priority: z.number().int(),
  position: z.number().int(),
  images: z.array(itemImageDtoSchema),
  links: z.array(itemLinkDtoSchema),
});
export type WishlistItemDto = z.infer<typeof wishlistItemDtoSchema>;

export const wishlistDetailSchema = z.object({
  wishlist: wishlistDtoSchema,
  items: z.array(wishlistItemDtoSchema),
});
export type WishlistDetail = z.infer<typeof wishlistDetailSchema>;

/** Товар в публичном просмотре. Поле `reservation` есть только у НЕ владельца. */
export const publicItemDtoSchema = wishlistItemDtoSchema.extend({
  reservation: z
    .object({ status: z.enum(['free', 'reserved', 'bought']), mine: z.boolean() })
    .optional(),
});
export type PublicItemDto = z.infer<typeof publicItemDtoSchema>;

export const publicWishlistSchema = z.object({
  wishlist: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    eventDate: z.string().nullable(),
    sortMode: wishlistSortSchema,
  }),
  owner: z.object({
    id: z.string(),
    username: z.string().nullable(),
    fullName: z.string(),
    avatarKey: z.string().nullable(),
  }),
  isOwner: z.boolean(),
  items: z.array(publicItemDtoSchema),
});
export type PublicWishlist = z.infer<typeof publicWishlistSchema>;

/** Мои подарки: что я забронировал, по вишлистам. */
export const myReservationsSchema = z.object({
  groups: z.array(
    z.object({
      wishlist: z.object({ id: z.string(), title: z.string(), shareSlug: z.string() }),
      owner: z.object({
        id: z.string(),
        username: z.string().nullable(),
        fullName: z.string(),
        avatarKey: z.string().nullable(),
      }),
      items: z.array(wishlistItemDtoSchema.extend({ status: z.enum(['reserved', 'bought']) })),
    }),
  ),
});
export type MyReservations = z.infer<typeof myReservationsSchema>;
