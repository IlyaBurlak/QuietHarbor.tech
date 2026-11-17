import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import { Prisma } from '@prisma/client';
import type { PasswordResetRequestInput } from '@wishlist/shared';
import { prisma } from '../../core/db/prisma';
import { sha256 } from '../../core/http/crypto';
import { HttpError } from '../../core/http/errors';

// Без похожих символов (0/O, 1/I), чтобы код было легко продиктовать
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function makeRequestCode() {
  const bytes = randomBytes(6);
  return 'WL-' + [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('');
}

/**
 * Заявка на сброс пароля. Ответ всегда одинаковый: не видно, существует ли ник.
 * Для администратора заявка не создаётся, но ответ выглядит так же.
 */
export async function createResetRequest(input: PasswordResetRequestInput) {
  const user = await prisma.user.findUnique({ where: { username: input.username } });
  if (user?.role === 'admin') return { requestCode: makeRequestCode() };

  // Повторная заявка по тому же нику за сутки возвращает прежний код
  const existing = await prisma.passwordResetRequest.findFirst({
    where: {
      username: input.username,
      status: 'new',
      createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
  if (existing) return { requestCode: existing.requestCode };

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const created = await prisma.passwordResetRequest.create({
        data: {
          username: input.username,
          userId: user?.id ?? null,
          contact: input.contact,
          comment: input.comment || null,
          requestCode: makeRequestCode(),
        },
      });
      return { requestCode: created.requestCode };
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
    }
  }
  throw new HttpError(500, 'INTERNAL_ERROR', 'Не удалось создать заявку');
}

/** Сброс пароля по одноразовой ссылке от администратора. */
export async function resetPassword(token: string, password: string) {
  const request = await prisma.passwordResetRequest.findUnique({
    where: { tokenHash: sha256(token) },
  });
  if (!request || !request.userId) {
    throw new HttpError(400, 'RESET_TOKEN_INVALID', 'Ссылка недействительна');
  }
  if (request.tokenUsedAt) {
    throw new HttpError(400, 'RESET_TOKEN_USED', 'Ссылка уже использована');
  }
  if (!request.tokenExpiresAt || request.tokenExpiresAt < new Date()) {
    throw new HttpError(400, 'RESET_TOKEN_EXPIRED', 'Срок действия ссылки истёк');
  }

  const userId = request.userId;
  const passwordHash = await argon2.hash(password);

  await prisma.$transaction(async (tx) => {
    // updateMany с условием защищает от двойного использования при гонке
    const claimed = await tx.passwordResetRequest.updateMany({
      where: { id: request.id, tokenUsedAt: null },
      data: { tokenUsedAt: new Date(), status: 'done', handledAt: request.handledAt ?? new Date() },
    });
    if (claimed.count === 0) {
      throw new HttpError(400, 'RESET_TOKEN_USED', 'Ссылка уже использована');
    }
    await tx.user.update({ where: { id: userId }, data: { passwordHash } });
    await tx.session.deleteMany({ where: { userId } });
  });
}
