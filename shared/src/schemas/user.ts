import { z } from 'zod';

/** Пользователь в ответах авторизации: только то, что нужно клиенту. */
export const sessionUserSchema = z.object({
  id: z.string(),
  username: z.string().nullable(),
  fullName: z.string(),
  role: z.enum(['user', 'admin']),
  avatarKey: z.string().nullable(),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;

export const authResponseSchema = z.object({ user: sessionUserSchema });
export type AuthResponse = z.infer<typeof authResponseSchema>;
