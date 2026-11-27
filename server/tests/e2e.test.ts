import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import sharp from 'sharp';
import { createApp } from '../src/app';
import { prisma } from '../src/core/db/prisma';
import { cleanDb, signedInAgent } from './helpers';

const app = createApp();
beforeEach(cleanDb);
afterAll(() => prisma.$disconnect());

describe('сквозной сценарий: желание → бронь', () => {
  it('регистрация → вишлист → товар с фото → друг бронирует → владелец не видит бронь', async () => {
    const owner = await signedInAgent(app, { username: 'owner' });
    const friend = await signedInAgent(app, { username: 'friend' });

    const list = (await owner.post('/api/wishlists').send({ title: 'ДР', visibility: 'friends' })).body.wishlist;
    const item = (
      await owner.post(`/api/wishlists/${list.id}/items`).send({ title: 'Часы', price: 9990, priority: 5, url: 'https://shop.example/w' })
    ).body.item;
    const photo = await sharp({ create: { width: 1600, height: 1200, channels: 3, background: '#aa8844' } }).jpeg().toBuffer();
    const withPhoto = (await owner.post(`/api/items/${item.id}/images`).attach('file', photo, 'w.jpg')).body.item;
    expect((await request(app).get(`/api/files/${withPhoto.images[0].fileKey}`)).status).toBe(200);

    // пока не друзья — вишлист «для друзей» недоступен
    expect((await friend.get(`/api/public/w/${list.shareSlug}`)).status).toBe(404);
    await friend.post('/api/friends/requests').send({ username: 'owner' });
    const reqId = (await owner.get('/api/friends')).body.incoming[0].id;
    await owner.post(`/api/friends/requests/${reqId}/accept`);

    const seen = await friend.get(`/api/public/w/${list.shareSlug}`);
    expect(seen.body.items[0].reservation).toEqual({ status: 'free', mine: false });
    expect((await friend.post(`/api/items/${item.id}/reserve`)).status).toBe(201);
    expect((await friend.get(`/api/public/w/${list.shareSlug}`)).body.items[0].reservation).toEqual({ status: 'reserved', mine: true });
    expect((await friend.get('/api/me/reservations')).body.groups[0].items[0].title).toBe('Часы');

    // владелец ни в одном ответе не видит бронь и не получает уведомления о ней
    for (const url of [`/api/wishlists/${list.id}`, '/api/wishlists', `/api/public/w/${list.shareSlug}`, '/api/notifications', '/api/notifications/summary']) {
      const res = await owner.get(url);
      expect(res.status).toBe(200);
      expect(res.text.toLowerCase(), url).not.toContain('reserv');
    }
    // заявку владелец сам принял, а о брони уведомлений нет
    expect((await owner.get('/api/notifications/summary')).body.unread).toBe(0);
  });

  it('группа → жеребьёвка → каждый видит только своего получателя', async () => {
    const names = ['org', 'anna', 'boris', 'vera'];
    const agents: Record<string, request.Agent> = {};
    for (const n of names) agents[n] = await signedInAgent(app, { username: n });
    const group = (await agents.org!.post('/api/groups').send({ title: 'Санта', budget: 1000 })).body.group;
    const code = (await agents.org!.get(`/api/groups/${group.id}`)).body.group.inviteCode;
    for (const n of names.slice(1)) expect((await agents[n]!.post(`/api/groups/join/${code}`)).status).toBe(200);
    expect((await agents.org!.post(`/api/groups/${group.id}/draw`)).status).toBe(204);

    const ids = Object.fromEntries((await prisma.user.findMany()).map((u) => [u.username, u.id]));
    const receivers = new Set<string>();
    for (const n of names) {
      const r = (await agents[n]!.get(`/api/groups/${group.id}/my-recipient`)).body.recipient.id as string;
      expect(r).not.toBe(ids[n]);
      receivers.add(r);
    }
    expect(receivers.size).toBe(names.length); // каждый получает ровно от одного
  });
});
