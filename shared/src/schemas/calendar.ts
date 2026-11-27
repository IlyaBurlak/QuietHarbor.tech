import { z } from 'zod';

/** Ближайший день рождения друга. Год рождения и возраст — только если друг их не скрыл. */
export const birthdayEntrySchema = z.object({
  userId: z.string(),
  username: z.string().nullable(),
  fullName: z.string(),
  avatarKey: z.string().nullable(),
  /** Ближайшая дата, ГГГГ-ММ-ДД (29 февраля в невисокосный год — 28 февраля). */
  date: z.string(),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  /** Сколько дней осталось; 0 — сегодня. */
  daysUntil: z.number().int().min(0),
  /** Сколько исполнится; null, если друг скрыл год. */
  turns: z.number().int().nullable(),
});
export type BirthdayEntry = z.infer<typeof birthdayEntrySchema>;

export const birthdaysResponseSchema = z.object({ birthdays: z.array(birthdayEntrySchema) });
export type BirthdaysResponse = z.infer<typeof birthdaysResponseSchema>;
