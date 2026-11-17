import rateLimit from 'express-rate-limit';
import { env } from '../../config/env';

const make = (windowMs: number, limit: number, message: string) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => env.NODE_ENV === 'test',
    message: { code: 'TOO_MANY_REQUESTS', message },
  });

/** Вход, регистрация и другие действия с паролем. */
export const authLimiter = make(15 * 60_000, 20, 'Слишком много попыток. Попробуйте позже');
/** Проверка занятости имени. */
export const availabilityLimiter = make(60_000, 60, 'Слишком много запросов. Попробуйте позже');
/** Заявки на сброс пароля — реже, чтобы не заспамить администратора. */
export const resetRequestLimiter = make(
  60 * 60_000,
  5,
  'Слишком много заявок. Попробуйте через час',
);
