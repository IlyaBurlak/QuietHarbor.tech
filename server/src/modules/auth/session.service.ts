import type { SessionUser } from '@wishlist/shared';
import { randomToken, sha256 as hash } from '../../core/http/crypto';
import { prisma } from '../../core/db/prisma';
import { toSessionUser } from '../users/user.dto';

export const SESSION_COOKIE = 'sid';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Создаёт сессию и возвращает сырой токен (в базе хранится только хэш). */
export async function createSession(userId: string): Promise<string> {
  const token = randomToken();
  await prisma.session.create({
    data: { userId, tokenHash: hash(token), expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });
  return token;
}

/** Пользователь по токену; заблокированный и просроченная сессия — null. */
export async function resolveSession(token: string): Promise<SessionUser | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hash(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date() || session.user.status === 'blocked') return null;
  return toSessionUser(session.user);
}

export async function destroySession(token: string) {
  await prisma.session.deleteMany({ where: { tokenHash: hash(token) } });
}

/** Закрывает все сессии пользователя (смена пароля, блокировка). */
export async function destroyUserSessions(userId: string, exceptToken?: string) {
  await prisma.session.deleteMany({
    where: { userId, ...(exceptToken ? { tokenHash: { not: hash(exceptToken) } } : {}) },
  });
}
