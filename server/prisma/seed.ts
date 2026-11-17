import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await argon2.hash('password123');
  const alice = await prisma.user.upsert({
    where: { nickname: 'alice' },
    update: {},
    create: { nickname: 'alice', fullName: 'Алиса Тестова', passwordHash },
  });
  await prisma.user.upsert({
    where: { nickname: 'bob' },
    update: {},
    create: { nickname: 'bob', fullName: 'Боб Тестов', passwordHash },
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
