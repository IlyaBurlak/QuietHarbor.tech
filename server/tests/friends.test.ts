import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/core/db/prisma';
import { cleanDb, signedInAgent } from './helpers';

const app = createApp();
beforeEach(cleanDb);
afterAll(() => prisma.$disconnect());

async function trio() {
  const me = await signedInAgent(app);
  const anna = await signedInAgent(app, { username: 'anna', firstName: 'Анна' });
  const boris = await signedInAgent(app, { username: 'boris', firstName: 'Борис' });
  return { me, anna, boris };
}

async function befriend(a: request.Agent, b: request.Agent, bName: string) {
  await a.post('/api/friends/requests').send({ username: bName });
  const id = (await b.get('/api/friends')).body.incoming[0].id;
  await b.post(`/api/friends/requests/${id}/accept`);
}

describe('поиск', () => {
  it('требует вход и минимум 2 символа', async () => {
    expect((await request(app).get('/api/users/search?nick=ann')).status).toBe(401);
    const { me } = await trio();
    expect((await me.get('/api/users/search?nick=a')).status).toBe(400);
  });

  it('ищет по началу ника, без себя, отдаёт только карточку', async () => {
    const { me } = await trio();
    const res = await me.get('/api/users/search?nick=ann');
    expect(res.body.users).toHaveLength(1);
    expect(Object.keys(res.body.users[0]).sort()).toEqual(
      ['avatarKey', 'fullName', 'id', 'relation', 'requestId', 'username'].sort(),
    );
    expect(res.body.users[0].relation).toBe('none');
    expect((await me.get('/api/users/search?nick=tes')).body.users).toEqual([]);
    expect(res.text).not.toContain('passwordHash');
  });

  it('не находит заблокированных', async () => {
    const { me } = await trio();
    await prisma.user.update({ where: { username: 'anna' }, data: { status: 'blocked' } });
    expect((await me.get('/api/users/search?nick=ann')).body.users).toEqual([]);
  });
});

describe('заявки', () => {
  it('нельзя отправить себе и повторно', async () => {
    const { me } = await trio();
    expect((await me.post('/api/friends/requests').send({ username: 'tester' })).status).toBe(400);
    expect((await me.post('/api/friends/requests').send({ username: 'anna' })).status).toBe(201);
    const again = await me.post('/api/friends/requests').send({ username: 'anna' });
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('REQUEST_EXISTS');
    expect((await me.post('/api/friends/requests').send({ username: 'nobody' })).status).toBe(404);
  });

  it('принять может только адресат; встречная заявка сразу делает друзьями', async () => {
    const { me, anna, boris } = await trio();
    await me.post('/api/friends/requests').send({ username: 'anna' });
    const id = (await anna.get('/api/friends')).body.incoming[0].id;
    expect((await boris.post(`/api/friends/requests/${id}/accept`)).status).toBe(404);
    expect((await me.post(`/api/friends/requests/${id}/accept`)).status).toBe(404);
    expect((await anna.post(`/api/friends/requests/${id}/accept`)).status).toBe(204);
    expect((await me.get('/api/friends')).body.friends[0].username).toBe('anna');

    await boris.post('/api/friends/requests').send({ username: 'tester' });
    const cross = await me.post('/api/friends/requests').send({ username: 'boris' });
    expect(cross.body.status).toBe('accepted');
    expect((await me.get('/api/friends')).body.friends).toHaveLength(2);
  });

  it('отклоняет и отзывает заявку', async () => {
    const { me, anna } = await trio();
    await me.post('/api/friends/requests').send({ username: 'anna' });
    const outId = (await me.get('/api/friends')).body.outgoing[0].id;
    expect((await anna.delete(`/api/friends/requests/${outId}`)).status).toBe(404);
    expect((await me.delete(`/api/friends/requests/${outId}`)).status).toBe(204);
    await me.post('/api/friends/requests').send({ username: 'anna' });
    const id = (await anna.get('/api/friends')).body.incoming[0].id;
    expect((await anna.post(`/api/friends/requests/${id}/decline`)).status).toBe(204);
    expect((await anna.get('/api/friends')).body.incoming).toEqual([]);
  });
});

describe('вишлисты друга', () => {
  async function setup() {
    const t = await trio();
    const mk = async (visibility: string, title: string) =>
      t.anna.post('/api/wishlists').send({ title, visibility });
    await mk('private', 'Секрет');
    await mk('friends', 'Для друзей');
    await mk('link', 'По ссылке');
    await befriend(t.me, t.anna, 'anna');
    return t;
  }

  it('друг видит всё, кроме приватных; чужой — ничего', async () => {
    const { me, boris } = await setup();
    const mine = await me.get('/api/users/anna/wishlists');
    expect(mine.body.wishlists.map((w: { title: string }) => w.title).sort()).toEqual([
      'Для друзей',
      'По ссылке',
    ]);
    expect((await boris.get('/api/users/anna/wishlists')).body.wishlists).toEqual([]);
  });

  it('вишлист «для друзей» открывается по ссылке только другу и пропадает после удаления из друзей', async () => {
    const { me, anna, boris } = await setup();
    const slug = (await anna.get('/api/wishlists')).body.wishlists.find(
      (w: { title: string }) => w.title === 'Для друзей',
    ).shareSlug;
    expect((await me.get(`/api/public/w/${slug}`)).status).toBe(200);
    expect((await boris.get(`/api/public/w/${slug}`)).status).toBe(404);
    expect((await request(app).get(`/api/public/w/${slug}`)).status).toBe(404);

    const annaId = (await prisma.user.findUniqueOrThrow({ where: { username: 'anna' } })).id;
    expect((await me.delete(`/api/friends/${annaId}`)).status).toBe(204);
    expect((await me.get(`/api/public/w/${slug}`)).status).toBe(404);
    expect((await me.get('/api/users/anna/wishlists')).body.wishlists).toEqual([]);
    expect((await me.delete(`/api/friends/${annaId}`)).status).toBe(404);
  });
});

describe('профиль по нику', () => {
  it('день рождения виден по настройке; год можно скрыть', async () => {
    const { me, boris } = await trio();
    await prisma.user.update({
      where: { username: 'anna' },
      data: { birthDate: new Date('1995-03-07'), birthdayVisibility: 'friends', hideBirthYear: true },
    });
    expect((await me.get('/api/users/anna')).body.profile.birthday).toBeNull();
    await befriend(me, await loginAs('anna'), 'anna');
    const profile = (await me.get('/api/users/anna')).body.profile;
    expect(profile.relation).toBe('friend');
    expect(profile.birthday).toEqual({ month: 3, day: 7, year: null });
    expect((await boris.get('/api/users/anna')).body.profile.birthday).toBeNull();
    expect((await me.get('/api/users/nobody')).status).toBe(404);
  });
});

async function loginAs(username: string) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ username, password: 'password123' });
  if (res.status !== 200) throw new Error(`login failed ${res.status}`);
  return agent;
}
