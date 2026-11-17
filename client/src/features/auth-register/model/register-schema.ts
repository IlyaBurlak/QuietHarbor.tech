import { z } from 'zod';
import { registerSchema } from '@wishlist/shared';

/** Схема формы: общая схема регистрации + повтор пароля (на сервер он не уходит). */
export const registerFormSchema = registerSchema
  .extend({ confirmPassword: z.string().min(1, 'Повторите пароль') })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Пароли не совпадают',
  });

export type RegisterFormValues = z.infer<typeof registerFormSchema>;
