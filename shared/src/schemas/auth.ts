import { z } from 'zod';

export const RESERVED_NICKNAMES = ['admin', 'api', 'root', 'support', 'me', 'wishlist'];

export const nicknameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(20)
  .regex(/^[a-z0-9_.]+$/, 'Только латиница, цифры, _ и .')
  .refine((v) => !RESERVED_NICKNAMES.includes(v), 'Этот ник недоступен');

export const passwordSchema = z.string().min(8).max(128);

export const registerSchema = z.object({
  fullName: z.string().trim().min(1).max(100),
  nickname: nicknameSchema,
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  nickname: z.string().trim().toLowerCase().min(1),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;
