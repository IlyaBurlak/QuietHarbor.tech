import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import argon2 from 'argon2';
import { createApp } from '../src/app';
import { prisma } from '../src/core/db/prisma';
import { cleanDb, signedInAgent } from './helpers';

const app = createApp();
beforeEach(cleanDb);
afterAll(() => prisma.$disconnect());

const ADMIN = { username: 'boss', password: 'AdminPass-12345' };

async function makeAdmin(username = ADMIN.username) {
  return prisma.user.create({
    data: {
      username,
      passwordHash: await argon2.hash(ADMIN.password),
      firstName: 'Админ',
      lastName: '',
      fullName: 'Админ',
      role: 'admin',
    },
  });
}

async function adminAgent() {
  await makeAdmin();
  const agent = request.agent(app);
  const res = await agent.post('/api/admin/auth/login').send(ADMIN);
  if (res.status !== 200) throw new Error(`admin login ${res.status}`);
  return agent;
}

const userId = async (username: string) =>
  (await prisma.user.findUniqueOrThrow({ where: { username } })).id;

describe('вход и доступ', () => {
  it('гость — 401, обычный пользователь — 403, админ — 200', async () => {
    const admin = await adminAgent();
    const user = await signedInAgent(app);
    expect((await request(app).get('/api/admin/stats')).status).toBe(401);
    expect((await user.get('/api/admin/stats')).status).toBe(403);
    expect((await admin.get('/api/admin/stats')).status).toBe(200);
    expect((await user.get('/api/admin/users')).status).toBe(403);
  });

  it('обычный пользователь и админ с неверным паролем получают одинаковый отказ', async () => {
    await makeAdmin();
    await signedInAgent(app);
    const asUser = await request(app).post('/api/admin/auth/login').send({ username: 'tester', password: 'password123' });
    const wrong = await request(app).post('/api/admin/auth/login').send({ username: 'boss', password: 'nope-nope-nope' });
    const nobody = await request(app).post('/api/admin/auth/login').send({ username: 'ghost', password: 'whatever12' });
    for (const r of [asUser, wrong, nobody]) {
      expect(r.status).toBe(401);
      expect(r.body.message).toBe('Неверный ник или пароль');
    }
  });

  it('админская сессия живёт 2 часа и не заменяет обычную', async () => {
    const admin = await adminAgent();
    const session = await prisma.session.findFirstOrThrow({ where: { kind: 'admin' } });
    const ttl = session.expiresAt.getTime() - session.createdAt.getTime();
    expect(ttl).toBeLessThanOrEqual(2 * 60 * 60 * 1000 + 1000);
    expect((await admin.get('/api/users/me')).status).toBe(401); // админский cookie не даёт обычного входа
    await prisma.session.update({ where: { id: session.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await admin.get('/api/admin/stats')).status).toBe(401);
  });

  it('роль читается из базы на каждый запрос', async () => {
    const admin = await adminAgent();
    expect((await admin.get('/api/admin/auth/me')).status).toBe(200);
    await prisma.user.update({ where: { username: 'boss' }, data: { role: 'user' } });
    expect((await admin.get('/api/admin/stats')).status).toBe(401);
  });

  it('обычный cookie не годится для админки, выход закрывает сессию', async () => {
    const admin = await adminAgent();
    expect((await admin.post('/api/admin/auth/logout')).status).toBe(204);
    expect((await admin.get('/api/admin/stats')).status).toBe(401);
    expect(await prisma.session.count({ where: { kind: 'admin' } })).toBe(0);
  });

  it('создание админа через регистрацию невозможно', async () => {
    const res = await request(app).post('/api/auth/register').send({
      firstName: 'Х', lastName: 'Х', username: 'sneaky', password: 'password123', role: 'admin',
    });
    expect(res.status).toBe(201);
    expect((await prisma.user.findUniqueOrThrow({ where: { username: 'sneaky' } })).role).toBe('user');
  });
});

describe('статистика и пользователи', () => {
  it('статистика: таблицы, размер файлов, 30 дней регистраций', async () => {
    const admin = await adminAgent();
    await signedInAgent(app);
    const { body } = await admin.get('/api/admin/stats');
    expect(body.tables.find((t: { name: string }) => t.name === 'User').rows).toBe(2);
    expect(body.tables.every((t: { bytes: number }) => t.bytes >= 0)).toBe(true);
    expect(typeof body.filesBytes).toBe('number');
    expect(body.registrations).toHaveLength(30);
    expect(body.registrations.at(-1).count).toBe(2);
  });

  it('список: поиск по нику, фильтр, сортировка, пагинация, только нужные поля', async () => {
    const admin = await adminAgent();
    for (const n of ['anna', 'andrey', 'boris']) await signedInAgent(app, { username: n });
    await prisma.user.update({ where: { username: 'boris' }, data: { status: 'blocked' } });

    const search = await admin.get('/api/admin/users?q=an');
    expect(search.body.users.map((u: { username: string }) => u.username).sort()).toEqual(['andrey', 'anna']);
    expect(Object.keys(search.body.users[0]).sort()).toEqual(
      ['createdAt', 'fullName', 'id', 'lastLoginAt', 'providers', 'role', 'status', 'username', 'wishlistsCount'].sort(),
    );
    const blocked = await admin.get('/api/admin/users?status=blocked');
    expect(blocked.body.users.map((u: { username: string }) => u.username)).toEqual(['boris']);
    const page = await admin.get('/api/admin/users?pageSize=2&page=2&sort=createdAt&dir=asc');
    expect(page.body.total).toBe(4);
    expect(page.body.users).toHaveLength(2);
    expect((await admin.get('/api/admin/users?pageSize=1000')).status).toBe(400);
  });

  it('в ответах админки нет вишлистов, броней, пар Санты, дат рождения и «о себе»', async () => {
    const admin = await adminAgent();
    const owner = await signedInAgent(app, { username: 'owner' });
    const friend = await signedInAgent(app, { username: 'friend' });
    const third = await signedInAgent(app, { username: 'third' });
    await prisma.user.update({
      where: { username: 'owner' },
      data: { bio: 'СЕКРЕТНОЕ-ОБО-МНЕ', birthDate: new Date('1990-05-05') },
    });
    const w = (await owner.post('/api/wishlists').send({ title: 'СЕКРЕТНЫЙ-СПИСОК', visibility: 'link' })).body.wishlist;
    const item = (await owner.post(`/api/wishlists/${w.id}/items`).send({ title: 'СЕКРЕТНЫЙ-ТОВАР' })).body.item;
    await friend.post(`/api/items/${item.id}/reserve`);
    const g = (await owner.post('/api/groups').send({ title: 'СЕКРЕТНАЯ-ГРУППА' })).body.group;
    const code = (await owner.get(`/api/groups/${g.id}`)).body.group.inviteCode;
    await friend.post(`/api/groups/join/${code}`);
    await third.post(`/api/groups/join/${code}`);
    await owner.post(`/api/groups/${g.id}/draw`);
    await request(app).post('/api/auth/password-reset-requests').send({ username: 'owner', contact: '@owner' });
    const id = await userId('owner');

    const responses = [
      await admin.get('/api/admin/stats'),
      await admin.get('/api/admin/users'),
      await admin.get(`/api/admin/users/${id}`),
      await admin.get('/api/admin/reset-requests'),
      await admin.get('/api/admin/audit'),
    ];
    for (const r of responses) {
      expect(r.status).toBe(200);
      // «число броней» в карточке разрешено планом; сами брони — нет
      const text = r.text.replace(/reservationsCount/g, '');
      for (const secret of ['СЕКРЕТН', '1990', 'reservation', 'assignment', 'receiver', 'giver', 'shareSlug', 'inviteCode']) {
        expect(text).not.toContain(secret);
      }
    }
    const card = responses[2]!.body.user;
    expect(card).toMatchObject({ wishlistsCount: 1, itemsCount: 1, groupsCount: 1, resetRequestsCount: 1 });
    expect(Object.keys(card)).not.toContain('bio');
  });
});

describe('блокировка', () => {
  it('причина обязательна; себя и других админов блокировать нельзя', async () => {
    const admin = await adminAgent();
    const other = await makeAdmin('boss2');
    await signedInAgent(app, { username: 'victim' });
    const victim = await userId('victim');
    expect((await admin.post(`/api/admin/users/${victim}/block`).send({})).status).toBe(400);
    expect((await admin.post(`/api/admin/users/${victim}/block`).send({ reason: 'x' })).status).toBe(400);
    expect((await admin.post(`/api/admin/users/${other.id}/block`).send({ reason: 'нельзя' })).status).toBe(403);
    expect((await admin.post(`/api/admin/users/${await userId('boss')}/block`).send({ reason: 'себя' })).status).toBe(403);
  });

  it('блокировка закрывает сессии, запрещает вход, скрывает данные; разблокировка возвращает всё', async () => {
    const admin = await adminAgent();
    const victim = await signedInAgent(app, { username: 'victim' });
    const viewer = await signedInAgent(app, { username: 'viewer' });
    const w = (await victim.post('/api/wishlists').send({ title: 'Список', visibility: 'link' })).body.wishlist;
    const item = (await victim.post(`/api/wishlists/${w.id}/items`).send({ title: 'Часы' })).body.item;
    await viewer.post(`/api/items/${item.id}/reserve`);
    await prisma.user.update({ where: { username: 'victim' }, data: { birthDate: new Date('1990-05-05') } });
    const id = await userId('victim');

    expect((await viewer.get(`/api/public/w/${w.shareSlug}`)).status).toBe(200);
    expect((await viewer.get('/api/users/search?nick=vic')).body.users).toHaveLength(1);

    expect((await admin.post(`/api/admin/users/${id}/block`).send({ reason: 'спам' })).status).toBe(204);

    // действующая сессия перестала работать сразу
    expect((await victim.get('/api/users/me')).status).toBe(401);
    const login = await request(app).post('/api/auth/login').send({ username: 'victim', password: 'password123' });
    expect(login.status).toBe(403);
    expect(login.body.code).toBe('ACCOUNT_BLOCKED');
    // скрыт отовсюду
    expect((await viewer.get(`/api/public/w/${w.shareSlug}`)).status).toBe(404);
    expect((await request(app).get(`/api/public/w/${w.shareSlug}`)).status).toBe(404);
    expect((await viewer.get('/api/users/search?nick=vic')).body.users).toEqual([]);
    expect((await viewer.get('/api/users/victim')).status).toBe(404);
    // данные на месте, бронь осталась
    expect(await prisma.wishlist.count({ where: { ownerId: id } })).toBe(1);
    expect(await prisma.reservation.count()).toBe(1);

    const card = (await admin.get(`/api/admin/users/${id}`)).body.user;
    expect(card.status).toBe('blocked');
    expect(card.blocked).toMatchObject({ by: 'boss', reason: 'спам' });

    expect((await admin.post(`/api/admin/users/${id}/unblock`)).status).toBe(204);
    expect((await viewer.get(`/api/public/w/${w.shareSlug}`)).status).toBe(200);
    expect((await request(app).post('/api/auth/login').send({ username: 'victim', password: 'password123' })).status).toBe(200);
    expect((await admin.post(`/api/admin/users/${id}/unblock`)).status).toBe(409);
  });

  it('блокировка не меняет пары Санты и пишется в журнал', async () => {
    const admin = await adminAgent();
    const org = await signedInAgent(app, { username: 'org' });
    const a = await signedInAgent(app, { username: 'anna' });
    const b = await signedInAgent(app, { username: 'boris' });
    const g = (await org.post('/api/groups').send({ title: 'Санта' })).body.group;
    const code = (await org.get(`/api/groups/${g.id}`)).body.group.inviteCode;
    await a.post(`/api/groups/join/${code}`);
    await b.post(`/api/groups/join/${code}`);
    await org.post(`/api/groups/${g.id}/draw`);
    const before = await prisma.assignment.findMany({ orderBy: { giverId: 'asc' } });
    await admin.post(`/api/admin/users/${await userId('anna')}/block`).send({ reason: 'проверка' });
    expect(await prisma.assignment.findMany({ orderBy: { giverId: 'asc' } })).toEqual(before);

    const log = (await admin.get('/api/admin/audit')).body.entries.map((e: { action: string }) => e.action);
    expect(log).toEqual(expect.arrayContaining(['admin.login', 'user.block']));
  });
});

describe('заявки на сброс пароля', () => {
  const ask = (username: string) =>
    request(app).post('/api/auth/password-reset-requests').send({ username, contact: '@me_tg' });

  it('админ создаёт одноразовую ссылку; повторное использование и старая ссылка не работают', async () => {
    const admin = await adminAgent();
    await signedInAgent(app);
    await ask('tester');
    const list = (await admin.get('/api/admin/reset-requests')).body.requests;
    expect(list).toHaveLength(1);
    expect(list[0].user).toMatchObject({ wishlistsCount: 0, blocked: false });
    const id = list[0].id;

    const first = (await admin.post(`/api/admin/reset-requests/${id}/link`)).body.url as string;
    const second = (await admin.post(`/api/admin/reset-requests/${id}/link`)).body.url as string;
    const t1 = first.split('/reset/')[1]!;
    const t2 = second.split('/reset/')[1]!;
    expect(t1).not.toBe(t2);

    const old = await request(app).post('/api/auth/reset-password').send({ token: t1, password: 'newpass1' });
    expect(old.status).toBe(400); // прежняя ссылка погашена
    const ok = await request(app).post('/api/auth/reset-password').send({ token: t2, password: 'newpass1' });
    expect(ok.status).toBe(204);
    const again = await request(app).post('/api/auth/reset-password').send({ token: t2, password: 'newpass2' });
    expect(again.body.code).toBe('RESET_TOKEN_USED');
    expect((await request(app).post('/api/auth/login').send({ username: 'tester', password: 'newpass1' })).status).toBe(200);
    expect((await admin.get('/api/admin/reset-requests?status=done')).body.requests).toHaveLength(1);
    expect((await admin.post(`/api/admin/reset-requests/${id}/link`)).status).toBe(409);
  });

  it('ссылка после срока не работает; сброс не снимает блокировку', async () => {
    const admin = await adminAgent();
    await signedInAgent(app);
    await ask('tester');
    const id = (await admin.get('/api/admin/reset-requests')).body.requests[0].id;
    const url = (await admin.post(`/api/admin/reset-requests/${id}/link`)).body.url as string;
    const token = url.split('/reset/')[1]!;
    await prisma.passwordResetRequest.update({ where: { id }, data: { tokenExpiresAt: new Date(Date.now() - 1000) } });
    expect((await request(app).post('/api/auth/reset-password').send({ token, password: 'newpass1' })).body.code).toBe('RESET_TOKEN_EXPIRED');

    await prisma.passwordResetRequest.update({ where: { id }, data: { tokenExpiresAt: new Date(Date.now() + 60_000) } });
    await admin.post(`/api/admin/users/${await userId('tester')}/block`).send({ reason: 'проверка' });
    expect((await request(app).post('/api/auth/reset-password').send({ token, password: 'newpass1' })).status).toBe(204);
    const login = await request(app).post('/api/auth/login').send({ username: 'tester', password: 'newpass1' });
    expect(login.body.code).toBe('ACCOUNT_BLOCKED');
  });

  it('отклонение гасит ссылку; заявки на админа не создаются; без пользователя ссылку не выдать', async () => {
    const admin = await adminAgent();
    await signedInAgent(app);
    await ask('tester');
    await ask('boss');
    await ask('ghost');
    const list = (await admin.get('/api/admin/reset-requests?status=all')).body.requests;
    expect(list.map((r: { username: string }) => r.username).sort()).toEqual(['ghost', 'tester']);

    const tester = list.find((r: { username: string }) => r.username === 'tester');
    const ghost = list.find((r: { username: string }) => r.username === 'ghost');
    expect((await admin.post(`/api/admin/reset-requests/${ghost.id}/link`)).status).toBe(400);
    const url = (await admin.post(`/api/admin/reset-requests/${tester.id}/link`)).body.url as string;
    expect((await admin.post(`/api/admin/reset-requests/${tester.id}/reject`)).status).toBe(204);
    const res = await request(app).post('/api/auth/reset-password').send({ token: url.split('/reset/')[1], password: 'newpass1' });
    expect(res.status).toBe(400);
    const log = (await admin.get('/api/admin/audit')).body.entries.map((e: { action: string }) => e.action);
    expect(log).toEqual(expect.arrayContaining(['reset.link', 'reset.reject']));
  });

  it('обычный пользователь не видит заявки', async () => {
    const user = await signedInAgent(app);
    expect((await user.get('/api/admin/reset-requests')).status).toBe(403);
    expect((await user.post('/api/admin/reset-requests/x/link')).status).toBe(403);
  });
});
