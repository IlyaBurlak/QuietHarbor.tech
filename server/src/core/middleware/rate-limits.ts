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
/** Вход в админку: очень мало попыток, админ входит редко. */
export const adminLoginLimiter = make(15 * 60_000, 8, 'Слишком много попыток входа. Попробуйте позже');
/** Поиск людей: не даёт перебирать ники. */
export const searchLimiter = make(60_000, 30, 'Слишком много поисковых запросов. Подождите минуту');
/** Заявки в друзья: защита от спама. */
export const friendRequestLimiter = make(60 * 60_000, 30, 'Слишком много заявок. Попробуйте позже');
/** Загрузка фото: самая дорогая операция сервера. */
export const uploadLimiter = make(60_000, 20, 'Слишком много загрузок. Подождите минуту');
/** Заявки на сброс пароля — реже, чтобы не заспамить администратора. */
export const resetRequestLimiter = make(
  60 * 60_000,
  5,
  'Слишком много заявок. Попробуйте через час',
);
