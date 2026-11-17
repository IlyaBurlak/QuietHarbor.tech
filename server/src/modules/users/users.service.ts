import argon2 from 'argon2';
import { Prisma } from '@prisma/client';
import type { ChangePasswordInput, DeleteAccountInput, UpdateProfileInput } from '@wishlist/shared';
import { prisma } from '../../core/db/prisma';
import { HttpError, forbidden } from '../../core/http/errors';
import { destroyUserSessions } from '../auth/session.service';
import { toProfile, toSessionUser, usernameChangeAvailableAt } from './user.dto';

const getUser = (id: string) => prisma.user.findUniqueOrThrow({ where: { id } });

export async function getProfile(userId: string) {
  return toProfile(await getUser(userId));
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const user = await getUser(userId);
  const data: Prisma.UserUpdateInput = {};

  if (input.firstName !== undefined || input.lastName !== undefined) {
    const firstName = input.firstName ?? user.firstName;
    const lastName = input.lastName ?? user.lastName;
    Object.assign(data, { firstName, lastName, fullName: `${firstName} ${lastName}`.trim() });
  }

  if (input.username !== undefined && input.username !== user.username) {
    const availableAt = usernameChangeAvailableAt(user);
    if (availableAt) {
      const message = `Имя можно менять раз в 30 дней. Следующая смена — ${availableAt.toLocaleDateString('ru-RU')}`;
      throw new HttpError(400, 'USERNAME_CHANGE_TOO_SOON', message, { username: message });
    }
    data.username = input.username;
    data.usernameChangedAt = new Date();
  }

  if (input.bio !== undefined) data.bio = input.bio || null;
  if (input.birthDate !== undefined) {
    data.birthDate = input.birthDate ? new Date(`${input.birthDate}T00:00:00.000Z`) : null;
  }
  if (input.hideBirthYear !== undefined) data.hideBirthYear = input.hideBirthYear;
  if (input.birthdayVisibility !== undefined) data.birthdayVisibility = input.birthdayVisibility;

  try {
    const updated = await prisma.user.update({ where: { id: userId }, data });
    return { user: toSessionUser(updated), profile: toProfile(updated) };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new HttpError(409, 'USERNAME_TAKEN', 'Это имя уже занято', {
        username: 'Это имя уже занято',
      });
    }
    throw e;
  }
}

/** Неверный пароль — 400, а не 401: 401 означает «сессия недействительна» и выбросил бы пользователя. */
async function assertPassword(passwordHash: string, password: string | undefined, field: string) {
  if (!password || !(await argon2.verify(passwordHash, password))) {
    const message = 'Неверный пароль';
    throw new HttpError(400, 'INVALID_PASSWORD', message, { [field]: message });
  }
}

export async function changePassword(
  userId: string,
  currentToken: string | undefined,
  input: ChangePasswordInput,
) {
  const user = await getUser(userId);
  if (user.passwordHash) {
    await assertPassword(user.passwordHash, input.currentPassword, 'currentPassword');
  }
  const passwordHash = await argon2.hash(input.newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  // Остальные устройства выходят, текущая сессия остаётся
  await destroyUserSessions(userId, currentToken);
}

export async function deleteAccount(userId: string, input: DeleteAccountInput) {
  const user = await getUser(userId);
  if (user.role === 'admin') throw forbidden('Администратора нельзя удалить');
  if (user.passwordHash) await assertPassword(user.passwordHash, input.password, 'password');

  const drawn = await prisma.group.count({ where: { ownerId: userId, status: 'drawn' } });
  if (drawn > 0) {
    throw new HttpError(
      409,
      'CANNOT_DELETE_ORGANIZER',
      'Вы организатор группы «Тайный Санта» с проведённой жеребьёвкой. Удалить аккаунт сейчас нельзя',
    );
  }

  // TODO(эпик 4): удалять файлы аватара и фото товаров вместе с записями
  await prisma.$transaction([
    prisma.group.deleteMany({ where: { ownerId: userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);
}
