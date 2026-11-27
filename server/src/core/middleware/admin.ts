import type { RequestHandler } from 'express';
import { forbidden, unauthorized } from '../http/errors';
import {
  ADMIN_SESSION_COOKIE,
  resolveAdminSession,
  resolveSession,
  SESSION_COOKIE,
} from '../../modules/auth/session.service';

/**
 * Пускает только администратора с живой админской сессией (отдельный cookie, 2 часа).
 * Роль и статус каждый раз берутся из базы. Обычный вошедший пользователь получает 403, гость — 401.
 */
export const requireAdmin: RequestHandler = async (req, _res, next) => {
  const token = req.cookies?.[ADMIN_SESSION_COOKIE];
  if (typeof token === 'string' && token) {
    const admin = await resolveAdminSession(token);
    if (admin) {
      req.admin = admin;
      req.adminToken = token;
      return next();
    }
  }
  const userToken = req.cookies?.[SESSION_COOKIE];
  if (typeof userToken === 'string' && userToken && (await resolveSession(userToken))) {
    throw forbidden('Нет доступа');
  }
  throw unauthorized();
};
