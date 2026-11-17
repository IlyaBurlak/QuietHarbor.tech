import argon2 from 'argon2';
import { env } from '../config/env';
import { prisma } from '../core/db/prisma';

const nickname = env.ADMIN_NICKNAME?.toLowerCase();
const password = env.ADMIN_PASSWORD;
if (!nickname || !password) {
  console.error('Задайте ADMIN_NICKNAME и ADMIN_PASSWORD в .env');
  process.exit(1);
}

const passwordHash = await argon2.hash(password);
await prisma.user.upsert({
  where: { nickname },
  update: { passwordHash, role: 'admin' },
  create: { nickname, passwordHash, fullName: 'Администратор', role: 'admin' },
});
console.log(`Администратор «${nickname}» создан/обновлён`);
await prisma.$disconnect();
