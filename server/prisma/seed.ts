import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed с известными паролями нельзя запускать в production');
  }
  const passwordHash = await argon2.hash('password123');
  const alice = await prisma.user.upsert({
    where: { username: 'alice' },
    update: {},
    create: {
      username: 'alice',
      firstName: 'Алиса',
      lastName: 'Тестова',
      fullName: 'Алиса Тестова',
      passwordHash,
    },
  });
  await prisma.user.upsert({
    where: { username: 'bob' },
    update: {},
    create: {
      username: 'bob',
      firstName: 'Боб',
      lastName: 'Тестов',
      fullName: 'Боб Тестов',
      passwordHash,
    },
  });
  await prisma.wishlist.upsert({
    where: { shareSlug: 'demo-alice' },
    update: {},
    create: {
      ownerId: alice.id,
      title: 'День рождения',
      visibility: 'link',
      shareSlug: 'demo-alice',
      items: { create: [{ title: 'Книга', price: 1500, position: 0 }] },
    },
  });
}

main().finally(() => prisma.$disconnect());
