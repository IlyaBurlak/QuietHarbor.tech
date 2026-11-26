import request from 'supertest';
import type { Express } from 'express';
import { prisma } from '../src/core/db/prisma';

export const creds = {
  firstName: 'Тест',
  lastName: 'Тестов',
  username: 'tester',
  password: 'password123',
};

export async function cleanDb() {
  await prisma.adminAuditLog.deleteMany();
  await prisma.passwordResetRequest.deleteMany();
  await prisma.friendship.deleteMany();
  await prisma.group.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
}

/** Регистрирует пользователя и возвращает агент с cookie сессии. */
export async function signedInAgent(app: Express, overrides: Partial<typeof creds> = {}) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send({ ...creds, ...overrides });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${res.text}`);
  return agent;
}
