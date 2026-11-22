import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/core/db/prisma';
import { canViewWishlist } from '../src/modules/wishlists/wishlists.access';
import { cleanDb, signedInAgent } from './helpers';

const app = createApp();
beforeEach(cleanDb);
afterAll(() => prisma.$disconnect());

const make = (agent: request.Agent, body: object = {}) =>
  agent.post('/api/wishlists').send({ title: 'День рождения', ...body });

describe('CRUD вишлистов', () => {
  it('требует вход', async () => {
    expect((await request(app).get('/api/wishlists')).status).toBe(401);
  });

  it('создаёт, читает, правит и удаляет', async () => {
    const agent = await signedInAgent(app);
    const created = await make(agent, { eventDate: '2027-05-01' });
    expect(created.status).toBe(201);
    const { id, shareSlug, visibility } = created.body.wishlist;
    expect(visibility).toBe('private');
    expect(shareSlug.length).toBeGreaterThanOrEqual(20);

    expect((await agent.get('/api/wishlists')).body.wishlists).toHaveLength(1);
    const patched = await agent.patch(`/api/wishlists/${id}`).send({ title: 'Новый год', visibility: 'link' });
    expect(patched.body.wishlist).toMatchObject({ title: 'Новый год', visibility: 'link' });
    expect((await agent.delete(`/api/wishlists/${id}`)).status).toBe(204);
    expect((await agent.get(`/api/wishlists/${id}`)).status).toBe(404);
  });

  it('валидирует название', async () => {
    const agent = await signedInAgent(app);
    const res = await make(agent, { title: '  ' });
    expect(res.status).toBe(400);
    expect(res.body.fields.title).toBeDefined();
  });

  it('чужой приватный вишлист не виден и не меняется', async () => {
    const owner = await signedInAgent(app);
    const other = await signedInAgent(app, { username: 'other' });
    const { id } = (await make(owner)).body.wishlist;
    expect((await other.get(`/api/wishlists/${id}`)).status).toBe(404);
    expect((await other.patch(`/api/wishlists/${id}`).send({ title: 'x' })).status).toBe(404);
    expect((await other.delete(`/api/wishlists/${id}`)).status).toBe(404);
  });

  it('вишлист по ссылке виден другим, но менять его нельзя', async () => {
    const owner = await signedInAgent(app);
    const other = await signedInAgent(app, { username: 'other' });
    const { id } = (await make(owner, { visibility: 'link' })).body.wishlist;
    expect((await other.get(`/api/wishlists/${id}`)).status).toBe(200);
    expect((await other.patch(`/api/wishlists/${id}`).send({ title: 'x' })).status).toBe(403);
    expect((await other.delete(`/api/wishlists/${id}`)).status).toBe(403);
  });

  it('перевыпускает ссылку', async () => {
    const agent = await signedInAgent(app);
    const { id, shareSlug } = (await make(agent)).body.wishlist;
    const res = await agent.post(`/api/wishlists/${id}/regenerate-link`);
    expect(res.body.wishlist.shareSlug).not.toBe(shareSlug);
  });
});

describe('canViewWishlist', () => {
  it('учитывает все три режима приватности', async () => {
    const owner = await signedInAgent(app);
    const friend = await signedInAgent(app, { username: 'friend' });
    const stranger = await signedInAgent(app, { username: 'stranger' });
    void owner; void friend; void stranger;
    const [o, f, s] = await Promise.all(
      ['tester', 'friend', 'stranger'].map((username) =>
        prisma.user.findUniqueOrThrow({ where: { username } }),
      ),
    );
    await prisma.friendship.create({
      data: { requesterId: f!.id, addresseeId: o!.id, status: 'accepted' },
    });
    const w = (visibility: 'private' | 'link' | 'friends') => ({ ownerId: o!.id, visibility });

    expect(await canViewWishlist(o!.id, w('private'))).toBe(true);
    expect(await canViewWishlist(f!.id, w('private'))).toBe(false);
    expect(await canViewWishlist(null, w('private'))).toBe(false);

    expect(await canViewWishlist(null, w('link'))).toBe(true);
    expect(await canViewWishlist(s!.id, w('link'))).toBe(true);

    expect(await canViewWishlist(f!.id, w('friends'))).toBe(true);
    expect(await canViewWishlist(s!.id, w('friends'))).toBe(false);
    expect(await canViewWishlist(null, w('friends'))).toBe(false);
  });

  it('непринятая заявка в друзья не открывает доступ', async () => {
    await signedInAgent(app);
    await signedInAgent(app, { username: 'friend' });
    const [o, f] = await Promise.all(
      ['tester', 'friend'].map((username) => prisma.user.findUniqueOrThrow({ where: { username } })),
    );
    await prisma.friendship.create({ data: { requesterId: f!.id, addresseeId: o!.id } });
    expect(await canViewWishlist(f!.id, { ownerId: o!.id, visibility: 'friends' })).toBe(false);
  });
});

describe('порядок, дубли, копирование', () => {
  async function withItems(agent: request.Agent) {
    const { id } = (await make(agent)).body.wishlist;
    const items = await Promise.all(
      [
        { title: 'A', priority: 1, price: 300, position: 0 },
        { title: 'B', priority: 3, price: 100, position: 1 },
        { title: 'C', priority: 2, price: null, position: 2 },
      ].map((d) => prisma.item.create({ data: { ...d, wishlistId: id } })),
    );
    return { id: id as string, items };
  }

  it('сортирует по приоритету и цене', async () => {
    const agent = await signedInAgent(app);
    const { id } = await withItems(agent);
    await agent.patch(`/api/wishlists/${id}`).send({ sortMode: 'priority' });
    expect((await agent.get(`/api/wishlists/${id}`)).body.items.map((i: { title: string }) => i.title)).toEqual(['B', 'C', 'A']);
    await agent.patch(`/api/wishlists/${id}`).send({ sortMode: 'price' });
    expect((await agent.get(`/api/wishlists/${id}`)).body.items.map((i: { title: string }) => i.title)).toEqual(['B', 'A', 'C']);
  });

  it('переставляет вручную и отвергает неверный набор id', async () => {
    const agent = await signedInAgent(app);
    const { id, items } = await withItems(agent);
    const [a, b, c] = items.map((i) => i.id);
    const ok = await agent.patch(`/api/wishlists/${id}/reorder`).send({ itemIds: [c, a, b] });
    expect(ok.body.items.map((i: { title: string }) => i.title)).toEqual(['C', 'A', 'B']);
    expect(ok.body.wishlist.sortMode).toBe('manual');
    const bad = await agent.patch(`/api/wishlists/${id}/reorder`).send({ itemIds: [a, b] });
    expect(bad.status).toBe(400);
  });

  it('дублирует вишлист без броней и копирует товар в свой', async () => {
    const owner = await signedInAgent(app);
    const other = await signedInAgent(app, { username: 'other' });
    const { id, items } = await withItems(owner);
    const reserver = await prisma.user.findUniqueOrThrow({ where: { username: 'other' } });
    await prisma.reservation.create({ data: { itemId: items[0]!.id, reservedById: reserver.id } });
    await owner.patch(`/api/wishlists/${id}`).send({ visibility: 'link' });

    const dup = await other.post(`/api/wishlists/${id}/duplicate`);
    expect(dup.status).toBe(201);
    expect(dup.body.wishlist).toMatchObject({ itemsCount: 3, visibility: 'private' });
    expect(await prisma.reservation.count()).toBe(1);

    const mine = (await make(other, { title: 'Мой' })).body.wishlist.id;
    const copy = await other.post(`/api/wishlists/${mine}/items/copy`).send({ itemId: items[1]!.id });
    expect(copy.status).toBe(201);
    expect(copy.body.item.title).toBe('B');
    expect(await prisma.reservation.count()).toBe(1);
  });

  it('не копирует товар из недоступного вишлиста', async () => {
    const owner = await signedInAgent(app);
    const other = await signedInAgent(app, { username: 'other' });
    const { items } = await withItems(owner);
    const mine = (await make(other)).body.wishlist.id;
    expect((await other.post(`/api/wishlists/${mine}/items/copy`).send({ itemId: items[0]!.id })).status).toBe(404);
  });
});
