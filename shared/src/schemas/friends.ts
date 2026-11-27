import { z } from 'zod';

/** Краткая карточка человека: ровно то, что можно показать другому пользователю. */
export const userCardSchema = z.object({
  id: z.string(),
  username: z.string().nullable(),
  fullName: z.string(),
  avatarKey: z.string().nullable(),
});
export type UserCard = z.infer<typeof userCardSchema>;

/** Связь «я — он»: none, friend, outgoing (я отправил заявку), incoming (он отправил мне), self. */
export const relationSchema = z.enum(['none', 'friend', 'outgoing', 'incoming', 'self']);
export type Relation = z.infer<typeof relationSchema>;

export const searchQuerySchema = z.object({
  nick: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, 'Введите хотя бы 2 символа')
    .max(20, 'Не длиннее 20 символов'),
});

export const searchResultSchema = userCardSchema.extend({
  relation: relationSchema,
  /** Есть только у входящей заявки: по нему её принимают. */
  requestId: z.string().nullable(),
});
export type SearchResult = z.infer<typeof searchResultSchema>;

export const sendRequestSchema = z.object({ username: z.string().trim().toLowerCase().min(1) });
export type SendRequestInput = z.infer<typeof sendRequestSchema>;

export const friendRequestSchema = z.object({ id: z.string(), user: userCardSchema });
export type FriendRequest = z.infer<typeof friendRequestSchema>;

export const friendsResponseSchema = z.object({
  friends: z.array(userCardSchema),
  incoming: z.array(friendRequestSchema),
  outgoing: z.array(friendRequestSchema),
});
export type FriendsResponse = z.infer<typeof friendsResponseSchema>;

/** Профиль человека: дата рождения только если он её показывает этому смотрящему. */
export const publicProfileSchema = userCardSchema.extend({
  bio: z.string().nullable(),
  relation: relationSchema,
  requestId: z.string().nullable(),
  birthday: z
    .object({
      month: z.number().int(),
      day: z.number().int(),
      year: z.number().int().nullable(),
    })
    .nullable(),
});
export type PublicProfile = z.infer<typeof publicProfileSchema>;

export const profileWishlistSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  eventDate: z.string().nullable(),
  shareSlug: z.string(),
  itemsCount: z.number().int(),
});
export type ProfileWishlist = z.infer<typeof profileWishlistSchema>;
