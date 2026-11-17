import { z } from 'zod';
import { passwordSchema, usernameSchema } from './auth';

const nameField = (label: string) =>
  z.string().trim().min(1, `Укажите ${label}`).max(50, 'Не длиннее 50 символов');

export const birthDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата в формате ГГГГ-ММ-ДД')
  .refine((v) => {
    const d = new Date(`${v}T00:00:00.000Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, 'Такой даты не существует')
  .refine((v) => v >= '1900-01-01', 'Слишком давняя дата')
  .refine((v) => v <= new Date().toISOString().slice(0, 10), 'Дата не может быть в будущем');

export const BIRTHDAY_VISIBILITY = ['all', 'friends', 'nobody'] as const;
export type BirthdayVisibility = (typeof BIRTHDAY_VISIBILITY)[number];

export const USERNAME_CHANGE_DAYS = 30;

export const updateProfileSchema = z.object({
  firstName: nameField('имя').optional(),
  lastName: nameField('фамилию').optional(),
  username: usernameSchema.optional(),
  bio: z.string().trim().max(500, 'Не длиннее 500 символов').nullable().optional(),
  birthDate: birthDateSchema.nullable().optional(),
  hideBirthYear: z.boolean().optional(),
  birthdayVisibility: z.enum(BIRTHDAY_VISIBILITY).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const profileSchema = z.object({
  id: z.string(),
  username: z.string().nullable(),
  firstName: z.string(),
  lastName: z.string(),
  bio: z.string().nullable(),
  birthDate: z.string().nullable(),
  hideBirthYear: z.boolean(),
  birthdayVisibility: z.enum(BIRTHDAY_VISIBILITY),
  avatarKey: z.string().nullable(),
  hasPassword: z.boolean(),
  createdAt: z.string(),
  /** Когда можно снова сменить имя пользователя; null — можно сейчас. */
  usernameChangeAvailableAt: z.string().nullable(),
});
export type Profile = z.infer<typeof profileSchema>;

export const changePasswordSchema = z.object({
  /** Не нужен, если пароля ещё нет (вход только через соцсеть). */
  currentPassword: z.string().max(128).optional(),
  newPassword: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const deleteAccountSchema = z.object({ password: z.string().max(128).optional() });
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

export const passwordResetRequestSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, 'Введите имя пользователя').max(50),
  contact: z
    .string()
    .trim()
    .min(3, 'Укажите, как с вами связаться')
    .max(200, 'Не длиннее 200 символов'),
  comment: z.string().trim().max(500, 'Не длиннее 500 символов').optional(),
});
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
