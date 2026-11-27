import type { RequestHandler } from 'express';
import { unauthorized } from '../http/errors';
import { resolveSession, SESSION_COOKIE } from '../../modules/auth/session.service';

async function attachUser(req: Parameters<RequestHandler>[0]) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== 'string' || !token) return;
  const user = await resolveSession(token);
  if (user) {
    req.user = user;
    req.sessionToken = token;
  }
}

/** Для публичных страниц, где вход необязателен. */
export const optionalAuth: RequestHandler = async (req, _res, next) => {
  await attachUser(req);
  next();
};

/** Закрывает маршрут для гостей: 401. */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  await attachUser(req);
  if (!req.user) throw unauthorized();
  next();
};
