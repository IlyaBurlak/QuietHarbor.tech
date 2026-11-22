import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/core/db/prisma';
import { cleanDb, signedInAgent } from './helpers';

const app = createApp();
beforeEach(cleanDb);
afterAll(() => prisma.$disconnect());

async function setup(visibility = 'link') {
  const owner = await signedInAgent(app);
  const alice = await signedInAgent(app, { username: 'alice' });
  const bob = await signedInAgent(app, { username: 'bob' });
  const { id, shareSlug } = (
    await owner.post('/api/wishlists').send({ title: 'ДР', visibility })
  ).body.wishlist;
  const itemId = (await owner.post(`/api/wishlists/${id}/items`).send({ title: 'Часы' })).body.item
    .id as string;
  return { owner, alice, bob, id: id as string, slug: shareSlug as string, itemId };
}

describe('публичный просмотр', () => {
  it('гость видит товары и статусы; недоступный вишлист — 404', async () => {
    const { slug, alice, itemId } = await setup();
    await alice.post(`/api/items/${itemId}/reserve`);
    const guest = await request(app).get(`/api/public/w/${slug}`);
    expect(guest.status).toBe(200);
    expect(guest.body.isOwner).toBe(false);
    expect(guest.body.items[0].reservation).toEqual({ status: 'reserved', mine: false });

    const mine = await alice.get(`/api/public/w/${slug}`);
    expect(mine.body.items[0].reservation).toEqual({ status: 'reserved', mine: true });

    expect((await request(app).get('/api/public/w/nope')).status).toBe(404);
  });

  it('«только я» и «для друзей» скрыты от посторонних и гостей', async () => {
    const priv = await setup('private');
    expect((await request(app).get(`/api/public/w/${priv.slug}`)).status).toBe(404);
    expect((await priv.alice.get(`/api/public/w/${priv.slug}`)).status).toBe(404);
    expect((await priv.owner.get(`/api/public/w/${priv.slug}`)).status).toBe(200);
  });

  it('владелец не получает данных о брони ни в одном ответе', async () => {
    const { owner, alice, id, slug, itemId } = await setup();
    await alice.post(`/api/items/${itemId}/reserve`);
    await alice.post(`/api/items/${itemId}/bought`);
    const responses = [
      await owner.get(`/api/public/w/${slug}`),
      await owner.get(`/api/wishlists/${id}`),
      await owner.get('/api/wishlists'),
      await owner.patch(`/api/items/${itemId}`).send({ title: 'Часы 2' }),
      await owner.post(`/api/wishlists/${id}/duplicate`),
    ];
    for (const res of responses) {
      expect(res.status).toBeLessThan(300);
      expect(res.text.toLowerCase()).not.toContain('reserv');
      expect(res.text.toLowerCase()).not.toContain('bought');
    }
    expect(responses[0]!.body.isOwner).toBe(true);
  });
});

describe('бронь', () => {
  it('требует вход, свой товар бронировать нельзя', async () => {
    const { owner, itemId } = await setup();
    expect((await request(app).post(`/api/items/${itemId}/reserve`)).status).toBe(401);
    expect((await owner.post(`/api/items/${itemId}/reserve`)).status).toBe(403);
  });

  it('второй не забронирует занятое; снять может только автор', async () => {
    const { alice, bob, itemId } = await setup();
    expect((await alice.post(`/api/items/${itemId}/reserve`)).status).toBe(201);
    const second = await bob.post(`/api/items/${itemId}/reserve`);
    expect(second.status).toBe(409);
    expect(second.body.code).toBe('ALREADY_RESERVED');
    expect((await bob.delete(`/api/items/${itemId}/reserve`)).status).toBe(403);
    expect((await bob.post(`/api/items/${itemId}/bought`)).status).toBe(403);
    expect((await alice.delete(`/api/items/${itemId}/reserve`)).status).toBe(204);
    expect((await bob.post(`/api/items/${itemId}/reserve`)).status).toBe(201);
  });

  it('две одновременные брони: ровно одна успешна', async () => {
    const { alice, bob, itemId } = await setup();
    const results = await Promise.all([
      alice.post(`/api/items/${itemId}/reserve`),
      bob.post(`/api/items/${itemId}/reserve`),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await prisma.reservation.count()).toBe(1);
  });

  it('нельзя бронировать в недоступном вишлисте', async () => {
    const { alice, itemId } = await setup('private');
    expect((await alice.post(`/api/items/${itemId}/reserve`)).status).toBe(404);
  });

  it('«куплено» и список «Мои подарки»', async () => {
    const { alice, bob, itemId } = await setup();
    await alice.post(`/api/items/${itemId}/reserve`);
    await alice.post(`/api/items/${itemId}/bought`);
    const mine = await alice.get('/api/me/reservations');
    expect(mine.body.groups).toHaveLength(1);
    expect(mine.body.groups[0].items[0]).toMatchObject({ title: 'Часы', status: 'bought' });
    expect((await bob.get('/api/me/reservations')).body.groups).toEqual([]);
  });
});
