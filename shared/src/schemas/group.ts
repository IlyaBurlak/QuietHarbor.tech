import { z } from 'zod';
import { CURRENCIES } from './item';
import { userCardSchema } from './friends';
import { wishlistItemDtoSchema } from './wishlist';

export const MIN_GROUP_MEMBERS = 3;

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата в формате ГГГГ-ММ-ДД');

export const createGroupSchema = z.object({
  title: z.string().trim().min(1, 'Укажите название').max(100, 'Не длиннее 100 символов'),
  description: z.string().trim().max(1000, 'Не длиннее 1000 символов').nullable().optional(),
  budget: z
    .number({ error: 'Укажите число' })
    .min(0, 'Бюджет не может быть отрицательным')
    .max(1_000_000_000, 'Слишком большой бюджет')
    .nullable()
    .optional(),
  currency: z.enum(CURRENCIES).optional(),
  drawDate: dateOnly.nullable().optional(),
  exchangeDate: dateOnly.nullable().optional(),
});
export type CreateGroupInput = z.infer<typeof createGroupSchema>;

export const updateGroupSchema = createGroupSchema.partial();
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;

export const setMyWishlistSchema = z.object({ wishlistId: z.string().min(1).nullable() });
export const exclusionInputSchema = z.object({
  userAId: z.string().min(1),
  userBId: z.string().min(1),
});
export type ExclusionInput = z.infer<typeof exclusionInputSchema>;

export const groupStatusSchema = z.enum(['open', 'drawn']);

export const groupSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  budget: z.string().nullable(),
  currency: z.string().nullable(),
  drawDate: z.string().nullable(),
  exchangeDate: z.string().nullable(),
  status: groupStatusSchema,
  membersCount: z.number().int(),
  isOwner: z.boolean(),
});
export type GroupSummary = z.infer<typeof groupSummarySchema>;

export const groupMemberSchema = userCardSchema.extend({
  isOwner: z.boolean(),
  hasWishlist: z.boolean(),
});
export type GroupMember = z.infer<typeof groupMemberSchema>;

/** Страница группы. Пар «кто кому дарит» здесь нет и быть не может. */
export const groupDetailSchema = groupSummarySchema.extend({
  description: z.string().nullable(),
  inviteCode: z.string(),
  owner: userCardSchema,
  members: z.array(groupMemberSchema),
  /** Только организатору и только до жеребьёвки. */
  exclusions: z.array(z.object({ id: z.string(), userAId: z.string(), userBId: z.string() })),
  myWishlistId: z.string().nullable(),
});
export type GroupDetail = z.infer<typeof groupDetailSchema>;

export const groupPreviewSchema = z.object({
  title: z.string(),
  description: z.string().nullable(),
  budget: z.string().nullable(),
  currency: z.string().nullable(),
  exchangeDate: z.string().nullable(),
  membersCount: z.number().int(),
  status: groupStatusSchema,
  owner: userCardSchema,
  /** id группы, если смотрящий уже участник. */
  joinedGroupId: z.string().nullable(),
});
export type GroupPreview = z.infer<typeof groupPreviewSchema>;

export const myRecipientSchema = z.object({
  recipient: userCardSchema,
  wishlist: z
    .object({
      id: z.string(),
      title: z.string(),
      description: z.string().nullable(),
      items: z.array(wishlistItemDtoSchema),
    })
    .nullable(),
});
export type MyRecipient = z.infer<typeof myRecipientSchema>;
