import { z } from 'zod';
import { userCardSchema } from './friends';

export const notificationTypeSchema = z.enum([
  'friend_request',
  'friend_accepted',
  'group_joined',
  'group_drawn',
]);
export type NotificationType = z.infer<typeof notificationTypeSchema>;

export const notificationSchema = z.object({
  id: z.string(),
  type: notificationTypeSchema,
  actor: userCardSchema.nullable(),
  group: z.object({ id: z.string(), title: z.string() }).nullable(),
  read: z.boolean(),
  createdAt: z.string(),
});
export type NotificationDto = z.infer<typeof notificationSchema>;

/** Счётчики для значков: непрочитанные уведомления и входящие заявки в друзья. */
export const notificationSummarySchema = z.object({
  unread: z.number().int(),
  friendRequests: z.number().int(),
});
export type NotificationSummary = z.infer<typeof notificationSummarySchema>;
