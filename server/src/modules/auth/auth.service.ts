import argon2 from 'argon2';
import { Prisma } from '@prisma/client';
import type { LoginInput, RegisterInput } from '@wishlist/shared';
import { prisma } from '../../core/db/prisma';
import { HttpError } from '../../core/http/errors';
import { toSessionUser } from '../users/user.dto';
import { createSession } from './session.service';

let dummyHash: Promise<string> | undefined;

export async function register(input: RegisterInput) {
  const passwordHash = await argon2.hash(input.password);
  try {
    const user = await prisma.user.create({
      data: {
        username: input.username,
        firstName: input.firstName,
        lastName: input.lastName,
        fullName: `${input.firstName} ${input.lastName}`,
        passwordHash,
        lastLoginAt: new Date(),
      },
    });
    return { user: toSessionUser(user), token: await createSession(user.id) };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new HttpError(409, 'USERNAME_TAKEN', 'Этот ник уже занят', {
        username: 'Этот ник уже занят',
      });
    }
    throw e;
  }
}

export async function isUsernameAvailable(username: string) {
  const count = await prisma.user.count({ where: { username } });
  return count === 0;
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { username: input.username } });

  // Хэш считается всегда, чтобы время ответа не выдавало существование ника.
  dummyHash ??= argon2.hash('dummy-password');
  const ok = await argon2.verify(user?.passwordHash ?? (await dummyHash), input.password);

  if (!user || !user.passwordHash || !ok) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Неверный ник или пароль');
  }
  if (user.status === 'blocked') {
    throw new HttpError(403, 'ACCOUNT_BLOCKED', 'Аккаунт заблокирован');
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  return { user: toSessionUser(updated), token: await createSession(user.id) };
}
