import { z } from 'zod';

export const RESERVED_USERNAMES = ['admin', 'api', 'root', 'support', 'me', 'wishlist'];

/** Имя пользователя: латиница, цифры, _ и точка. Приводится к нижнему регистру. */
export const usernameSchema = z
  .string()
  .toLowerCase()
  .refine((v) => !/\s/.test(v), 'Без пробелов')
  .refine((v) => [...v].every((ch) => ch.charCodeAt(0) < 128), 'Только английские буквы (латиница)')
  .refine((v) => /^[a-z0-9_.]*$/.test(v), 'Допустимы буквы a–z, цифры, _ и точка')
  .refine(
    (v) => v === '' || (/^[a-z0-9]/.test(v) && /[a-z0-9]$/.test(v)),
    'Начинайте и заканчивайте буквой или цифрой',
  )
  .refine((v) => !/[_.]{2}/.test(v), 'Нельзя ставить подряд _ и точки')
  .refine((v) => v === '' || /[a-z]/.test(v), 'Нужна хотя бы одна буква')
  .min(3, 'Не короче 3 символов')
  .max(20, 'Не длиннее 20 символов')
  .refine((v) => !RESERVED_USERNAMES.includes(v), 'Это имя недоступно');

export const passwordSchema = z
  .string()
  .min(8, 'Не короче 8 символов')
  .max(128, 'Не длиннее 128 символов');

const nameSchema = (label: string) =>
  z.string().trim().min(1, `Укажите ${label}`).max(50, 'Не длиннее 50 символов');

export const registerSchema = z.object({
  firstName: nameSchema('имя'),
  lastName: nameSchema('фамилию'),
  username: usernameSchema,
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const usernameAvailabilitySchema = z.object({ username: usernameSchema });

export const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, 'Введите имя пользователя'),
  password: z.string().min(1, 'Введите пароль'),
});
export type LoginInput = z.infer<typeof loginSchema>;
