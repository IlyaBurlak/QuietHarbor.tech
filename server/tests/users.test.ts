import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/core/db/prisma';
import { cleanDb, creds, signedInAgent } from './helpers';

const app = createApp();
beforeEach(cleanDb);
afterAll(() => prisma.$disconnect());

describe('профиль', () => {
  it('требует вход', async () => {
    expect((await request(app).get('/api/users/me')).status).toBe(401);
    expect((await request(app).patch('/api/users/me').send({})).status).toBe(401);
    expect((await request(app).delete('/api/users/me').send({})).status).toBe(401);
  });

  it('отдаёт профиль без хэша пароля', async () => {
    const agent = await signedInAgent(app);
    const res = await agent.get('/api/users/me');
    expect(res.status).toBe(200);
    expect(res.body.profile).toMatchObject({
      username: 'tester',
      firstName: 'Тест',
      hasPassword: true,
    });
    expect(res.text).not.toContain('passwordHash');
  });

  it('обновляет имя, био и дату рождения', async () => {
    const agent = await signedInAgent(app);
    const res = await agent.patch('/api/users/me').send({
      firstName: 'Илья',
      bio: '  Люблю книги ',
      birthDate: '1995-02-28',
      hideBirthYear: true,
      birthdayVisibility: 'friends',
    });
    expect(res.status).toBe(200);
    expect(res.body.profile).toMatchObject({
      firstName: 'Илья',
      lastName: 'Тестов',
      bio: 'Люблю книги',
      birthDate: '1995-02-28',
      hideBirthYear: true,
    });
    expect(res.body.user.fullName).toBe('Илья Тестов');
  });

  it.each<Record<string, unknown>>([
    { birthDate: '2999-01-01' },
    { birthDate: '2023-02-30' },
    { birthdayVisibility: 'everyone' },
    { bio: 'x'.repeat(501) },
  ])('отклоняет некорректные данные %j', async (body) => {
    const agent = await signedInAgent(app);
    expect((await agent.patch('/api/users/me').send(body)).status).toBe(400);
  });

  it('не даёт поменять роль и статус через PATCH', async () => {
    const agent = await signedInAgent(app);
    await agent.patch('/api/users/me').send({ role: 'admin', status: 'blocked' });
    const user = await prisma.user.findFirstOrThrow();
    expect(user.role).toBe('user');
    expect(user.status).toBe('active');
  });

  it('меняет имя пользователя не чаще раза в 30 дней и не на занятое', async () => {
    await signedInAgent(app, { username: 'other' });
    const agent = await signedInAgent(app);
    const taken = await agent.patch('/api/users/me').send({ username: 'other' });
    expect(taken.status).toBe(409);

    const ok = await agent.patch('/api/users/me').send({ username: 'New_Name' });
    expect(ok.status).toBe(200);
    expect(ok.body.user.username).toBe('new_name');

    const again = await agent.patch('/api/users/me').send({ username: 'third.name' });
    expect(again.status).toBe(400);
    expect(again.body.code).toBe('USERNAME_CHANGE_TOO_SOON');
  });
});

describe('смена пароля', () => {
  it('требует текущий пароль; ошибка — 400, не 401', async () => {
    const agent = await signedInAgent(app);
    const res = await agent
      .post('/api/users/me/password')
      .send({ currentPassword: 'wrong-password', newPassword: 'new-password-1' });
    expect(res.status).toBe(400);
    expect(res.body.fields.currentPassword).toBeDefined();
  });

  it('меняет пароль, закрывает другие сессии, текущая остаётся', async () => {
    const agent = await signedInAgent(app);
    const other = request.agent(app);
    await other.post('/api/auth/login').send({ username: 'tester', password: creds.password });
    expect((await other.get('/api/auth/me')).status).toBe(200);

    const res = await agent
      .post('/api/users/me/password')
      .send({ currentPassword: creds.password, newPassword: 'new-password-1' });
    expect(res.status).toBe(204);

    expect((await other.get('/api/auth/me')).status).toBe(401);
    expect((await agent.get('/api/auth/me')).status).toBe(200);

    const old = await request(app)
      .post('/api/auth/login')
      .send({ username: 'tester', password: creds.password });
    const fresh = await request(app)
      .post('/api/auth/login')
      .send({ username: 'tester', password: 'new-password-1' });
    expect(old.status).toBe(401);
    expect(fresh.status).toBe(200);
  });

  it('позволяет задать пароль, если его ещё нет', async () => {
    const agent = await signedInAgent(app);
    await prisma.user.updateMany({ data: { passwordHash: null } });
    const res = await agent.post('/api/users/me/password').send({ newPassword: 'brand-new-pass' });
    expect(res.status).toBe(204);
  });
});

describe('удаление аккаунта', () => {
  it('требует верный пароль', async () => {
    const agent = await signedInAgent(app);
    const res = await agent.delete('/api/users/me').send({ password: 'wrong' });
    expect(res.status).toBe(400);
    expect(await prisma.user.count()).toBe(1);
  });

  it('удаляет аккаунт вместе с вишлистами и сессиями', async () => {
    const agent = await signedInAgent(app);
    const user = await prisma.user.findFirstOrThrow();
    await prisma.wishlist.create({
      data: {
        ownerId: user.id,
        title: 'Тест',
        shareSlug: 's1',
        items: { create: [{ title: 'Книга' }] },
      },
    });
    const res = await agent.delete('/api/users/me').send({ password: creds.password });
    expect(res.status).toBe(204);
    expect(await prisma.user.count()).toBe(0);
    expect(await prisma.wishlist.count()).toBe(0);
    expect(await prisma.item.count()).toBe(0);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });

  it('блокирует удаление организатора с проведённой жеребьёвкой', async () => {
    const agent = await signedInAgent(app);
    const user = await prisma.user.findFirstOrThrow();
    await prisma.group.create({
      data: { ownerId: user.id, title: 'Санта', inviteCode: 'inv1', status: 'drawn' },
    });
    const res = await agent.delete('/api/users/me').send({ password: creds.password });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CANNOT_DELETE_ORGANIZER');
    expect(await prisma.user.count()).toBe(1);
  });

  it('не удаляет администратора', async () => {
    const agent = await signedInAgent(app);
    await prisma.user.updateMany({ data: { role: 'admin' } });
    const res = await agent.delete('/api/users/me').send({ password: creds.password });
    expect(res.status).toBe(403);
  });
});

describe('публичные настройки', () => {
  it('отдают ссылку на поддержку без секретов', async () => {
    const res = await request(app).get('/api/public/config');
    expect(res.status).toBe(200);
    expect(Object.keys(res.body)).toEqual(['supportContactUrl']);
  });
});

describe('настройка главной страницы', () => {
  it('требует вход', async () => {
    expect((await request(app).get('/api/users/me/home')).status).toBe(401);
    expect((await request(app).put('/api/users/me/home').send({ hidden: [] })).status).toBe(401);
  });

  it('по умолчанию всё включено; скрытые блоки сохраняются и у каждого свои', async () => {
    const agent = await signedInAgent(app);
    const other = await signedInAgent(app, { username: 'other' });
    expect((await agent.get('/api/users/me/home')).body).toEqual({ hidden: [] });
    const saved = await agent.put('/api/users/me/home').send({ hidden: ['stats', 'events', 'stats'] });
    expect(saved.body).toEqual({ hidden: ['stats', 'events'] });
    expect((await agent.get('/api/users/me/home')).body.hidden).toEqual(['stats', 'events']);
    expect((await other.get('/api/users/me/home')).body.hidden).toEqual([]);
  });

  it('отвергает неизвестные блоки', async () => {
    const agent = await signedInAgent(app);
    expect((await agent.put('/api/users/me/home').send({ hidden: ['hack'] })).status).toBe(400);
    expect((await agent.put('/api/users/me/home').send({})).status).toBe(400);
  });
});
