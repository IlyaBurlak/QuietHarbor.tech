// Временная замена админ-панели (задача 8.7): выдаёт одноразовую ссылку сброса по коду заявки.
// Запуск: npm run reset-link -- WL-XXXXXX
import { env } from '../config/env';
import { prisma } from '../core/db/prisma';
import { randomToken, sha256 } from '../core/http/crypto';

const code = process.argv[2]?.trim().toUpperCase();
if (!code) {
  console.error('Укажите код заявки: npm run reset-link -- WL-XXXXXX');
  process.exit(1);
}

const request = await prisma.passwordResetRequest.findUnique({ where: { requestCode: code } });
if (!request) {
  console.error('Заявка не найдена');
  process.exit(1);
}
if (!request.userId) {
  console.error(`Пользователь «${request.username}» не найден — ссылку создать нельзя`);
  process.exit(1);
}
if (request.status !== 'new') {
  console.error(`Заявка уже обработана (статус: ${request.status})`);
  process.exit(1);
}

const token = randomToken();
await prisma.passwordResetRequest.update({
  where: { id: request.id },
  data: {
    tokenHash: sha256(token),
    tokenExpiresAt: new Date(Date.now() + 24 * 3600 * 1000),
    tokenUsedAt: null,
  },
});
console.log(`Ссылка для «${request.username}» (24 часа, одноразовая):`);
console.log(`${env.CLIENT_URL}/reset/${token}`);
await prisma.$disconnect();
