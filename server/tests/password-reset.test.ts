import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/core/db/prisma';
import { randomToken, sha256 } from '../src/core/http/crypto';
import { cleanDb, creds, signedInAgent } from './helpers';

const app = createApp();
beforeEach(cleanDb);
afterAll(() => prisma.$disconnect());

const body = { username: 'tester', contact: '@tester_tg', comment: 'забыл пароль' };

describe('заявка на сброс пароля', () => {
  it('одинаково отвечает для существующего и несуществующего имени', async () => {
    await signedInAgent(app);
    const a = await request(app).post('/api/auth/password-reset-requests').send(body);
    const b = await request(app)
      .post('/api/auth/password-reset-requests')
      .send({ ...body, username: 'nobody' });
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(Object.keys(a.body)).toEqual(Object.keys(b.body));
    expect(a.body.requestCode).toMatch(/^WL-[A-Z2-9]{6}$/);
  });

  it('привязывает заявку к пользователю и не дублирует за сутки', async () => {
    await signedInAgent(app);
    const a = await request(app).post('/api/auth/password-reset-requests').send(body);
    const b = await request(app).post('/api/auth/password-reset-requests').send(body);
    expect(b.body.requestCode).toBe(a.body.requestCode);
    const rows = await prisma.passwordResetRequest.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.userId).not.toBeNull();
  });

  it('не создаёт заявку для администратора, ответ выглядит так же', async () => {
    await signedInAgent(app);
    await prisma.user.updateMany({ data: { role: 'admin' } });
    const res = await request(app).post('/api/auth/password-reset-requests').send(body);
    expect(res.status).toBe(201);
    expect(res.body.requestCode).toMatch(/^WL-/);
    expect(await prisma.passwordResetRequest.count()).toBe(0);
  });

  it('валидирует поля', async () => {
    const res = await request(app)
      .post('/api/auth/password-reset-requests')
      .send({ username: '', contact: '' });
    expect(res.status).toBe(400);
  });
});

async function issueToken(offsetMs = 24 * 3600 * 1000) {
  const user = await prisma.user.findFirstOrThrow();
  const token = randomToken();
  await prisma.passwordResetRequest.create({
    data: {
      username: user.username!,
      userId: user.id,
      contact: 'x',
      requestCode: 'WL-TEST22',
      tokenHash: sha256(token),
      tokenExpiresAt: new Date(Date.now() + offsetMs),
    },
  });
  return token;
}

describe('сброс по ссылке', () => {
  it('меняет пароль, закрывает все сессии и сжигает токен', async () => {
    const agent = await signedInAgent(app);
    const token = await issueToken();

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'brand-new-pass' });
    expect(res.status).toBe(204);

    expect((await agent.get('/api/auth/me')).status).toBe(401);
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: 'tester', password: 'brand-new-pass' });
    expect(login.status).toBe(200);

    const again = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'another-pass-1' });
    expect(again.status).toBe(400);
    expect(again.body.code).toBe('RESET_TOKEN_USED');
    const old = await request(app)
      .post('/api/auth/login')
      .send({ username: 'tester', password: creds.password });
    expect(old.status).toBe(401);
  });

  it('отклоняет просроченный и неизвестный токены', async () => {
    await signedInAgent(app);
    const expired = await issueToken(-1000);
    const a = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: expired, password: 'brand-new-pass' });
    expect(a.body.code).toBe('RESET_TOKEN_EXPIRED');
    const b = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: randomToken(), password: 'brand-new-pass' });
    expect(b.body.code).toBe('RESET_TOKEN_INVALID');
  });

  it('при двух одновременных запросах срабатывает только один', async () => {
    await signedInAgent(app);
    const token = await issueToken();
    const results = await Promise.all(
      ['pass-number-one', 'pass-number-two'].map((password) =>
        request(app).post('/api/auth/reset-password').send({ token, password }),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([204, 400]);
  });

  it('не снимает блокировку', async () => {
    await signedInAgent(app);
    const token = await issueToken();
    await prisma.user.updateMany({ data: { status: 'blocked' } });
    await request(app).post('/api/auth/reset-password').send({ token, password: 'brand-new-pass' });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: 'tester', password: 'brand-new-pass' });
    expect(login.status).toBe(403);
  });
});
