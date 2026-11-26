import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/core/db/prisma';
import { cleanDb, signedInAgent } from './helpers';

const app = createApp();
beforeEach(cleanDb);
afterAll(() => prisma.$disconnect());

const types = async (agent: request.Agent) =>
  (await agent.get('/api/notifications')).body.notifications.map((n: { type: string }) => n.type);

describe('уведомления', () => {
  it('требуют вход', async () => {
    expect((await request(app).get('/api/notifications')).status).toBe(401);
    expect((await request(app).get('/api/notifications/summary')).status).toBe(401);
  });

  it('заявка в друзья: уведомление и счётчик, после принятия — ответ автору', async () => {
    const me = await signedInAgent(app);
    const anna = await signedInAgent(app, { username: 'anna' });
    await me.post('/api/friends/requests').send({ username: 'anna' });

    expect(await types(anna)).toEqual(['friend_request']);
    expect((await anna.get('/api/notifications/summary')).body).toEqual({ unread: 1, friendRequests: 1 });
    expect((await me.get('/api/notifications/summary')).body).toEqual({ unread: 0, friendRequests: 0 });

    const reqId = (await anna.get('/api/friends')).body.incoming[0].id;
    await anna.post(`/api/friends/requests/${reqId}/accept`);
    expect(await types(anna)).toEqual([]);
    expect(await types(me)).toEqual(['friend_accepted']);
    expect((await anna.get('/api/notifications/summary')).body.friendRequests).toBe(0);
  });

  it('отклонённая или отозванная заявка убирает уведомление', async () => {
    const me = await signedInAgent(app);
    const anna = await signedInAgent(app, { username: 'anna' });
    await me.post('/api/friends/requests').send({ username: 'anna' });
    const outId = (await me.get('/api/friends')).body.outgoing[0].id;
    await me.delete(`/api/friends/requests/${outId}`);
    expect(await types(anna)).toEqual([]);

    await me.post('/api/friends/requests').send({ username: 'anna' });
    const inId = (await anna.get('/api/friends')).body.incoming[0].id;
    await anna.post(`/api/friends/requests/${inId}/decline`);
    expect(await types(anna)).toEqual([]);
  });

  it('прочтение: одно, все, чужое нельзя', async () => {
    const me = await signedInAgent(app);
    const anna = await signedInAgent(app, { username: 'anna' });
    await me.post('/api/friends/requests').send({ username: 'anna' });
    await prisma.notification.create({
      data: { userId: (await prisma.user.findUniqueOrThrow({ where: { username: 'anna' } })).id, type: 'friend_accepted' },
    });
    const list = (await anna.get('/api/notifications')).body.notifications;
    expect((await me.post(`/api/notifications/${list[0].id}/read`)).status).toBe(404);
    expect((await anna.post(`/api/notifications/${list[0].id}/read`)).status).toBe(204);
    expect((await anna.get('/api/notifications/summary')).body.unread).toBe(1);
    expect((await anna.post('/api/notifications/read')).status).toBe(204);
    expect((await anna.get('/api/notifications/summary')).body.unread).toBe(0);
  });

  it('группа: организатору — о вступлении, всем — о жеребьёвке, без пар', async () => {
    const org = await signedInAgent(app, { username: 'org' });
    const a = await signedInAgent(app, { username: 'anna' });
    const b = await signedInAgent(app, { username: 'boris' });
    const group = (await org.post('/api/groups').send({ title: 'Санта' })).body.group;
    const code = (await org.get(`/api/groups/${group.id}`)).body.group.inviteCode;
    await a.post(`/api/groups/join/${code}`);
    await b.post(`/api/groups/join/${code}`);
    await a.post(`/api/groups/join/${code}`); // повторное вступление не шумит
    expect(await types(org)).toEqual(['group_joined', 'group_joined']);

    await org.post(`/api/groups/${group.id}/draw`);
    for (const agent of [org, a, b]) expect(await types(agent)).toContain('group_drawn');
    const text = (await a.get('/api/notifications')).text.toLowerCase();
    for (const w of ['receiver', 'giver', 'recipient']) expect(text).not.toContain(w);
  });

  it('о брони подарка владелец не получает ничего', async () => {
    const owner = await signedInAgent(app);
    const guest = await signedInAgent(app, { username: 'guest' });
    const w = (await owner.post('/api/wishlists').send({ title: 'ДР', visibility: 'link' })).body.wishlist;
    const item = (await owner.post(`/api/wishlists/${w.id}/items`).send({ title: 'Часы' })).body.item;
    await guest.post(`/api/items/${item.id}/reserve`);
    expect((await owner.get('/api/notifications')).body.notifications).toEqual([]);
    expect((await owner.get('/api/notifications/summary')).body).toEqual({ unread: 0, friendRequests: 0 });
  });
});
