import argon2 from 'argon2';
import { env } from '../config/env';
import { prisma } from '../core/db/prisma';

const username = env.ADMIN_USERNAME?.trim().toLowerCase();
const password = env.ADMIN_PASSWORD;
const KNOWN_WEAK = ['change-me-12345', 'password123', 'admin123456'];

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

if (!username || !password) fail('Задайте ADMIN_USERNAME и ADMIN_PASSWORD в .env');
if (!/^[a-z0-9_.]{3,20}$/.test(username)) {
  fail('ADMIN_USERNAME: 3–20 символов, латиница, цифры, _ и точка');
}
if (password.length < 12) fail('ADMIN_PASSWORD должен быть не короче 12 символов');
if (KNOWN_WEAK.includes(password))
  fail('ADMIN_PASSWORD похож на пример из .env.example, задайте свой');

// Не повышаем обычного пользователя до админа молча
const existing = await prisma.user.findUnique({ where: { username } });
if (existing && existing.role !== 'admin') {
  fail(
    `Пользователь «${username}» уже существует и не администратор. Выберите другой ADMIN_USERNAME`,
  );
}

const passwordHash = await argon2.hash(password);
await prisma.user.upsert({
  where: { username },
  update: { passwordHash, status: 'active' },
  create: {
    username,
    passwordHash,
    firstName: 'Администратор',
    lastName: '',
    fullName: 'Администратор',
    role: 'admin',
  },
});
console.log(`Администратор «${username}» создан/обновлён`);
await prisma.$disconnect();
