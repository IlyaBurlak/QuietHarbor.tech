import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import sharp from 'sharp';
import { createApp } from '../src/app';
import { prisma } from '../src/core/db/prisma';
import { storage } from '../src/modules/files/storage';
import { cleanDb, signedInAgent } from './helpers';

const app = createApp();
beforeEach(cleanDb);
afterAll(() => prisma.$disconnect());

const png = () =>
  sharp({ create: { width: 1600, height: 900, channels: 3, background: '#336699' } })
    .png()
    .toBuffer();

async function listWithItem(agent: request.Agent, extra: object = {}) {
  const { id } = (await agent.post('/api/wishlists').send({ title: 'Список' })).body.wishlist;
  const res = await agent
    .post(`/api/wishlists/${id}/items`)
    .send({ title: 'Книга', price: 1500, currency: 'RUB', priority: 3, ...extra });
  return { listId: id as string, res, itemId: res.body.item?.id as string };
}

describe('товары', () => {
  it('создаёт с ссылками и правит', async () => {
    const agent = await signedInAgent(app);
    const { res, itemId } = await listWithItem(agent, {
      links: [{ url: 'https://shop.example/a', label: 'Аналог' }],
    });
    expect(res.status).toBe(201);
    expect(res.body.item.links).toHaveLength(1);
    const upd = await agent
      .patch(`/api/items/${itemId}`)
      .send({ title: 'Другая книга', price: null, links: [] });
    expect(upd.body.item).toMatchObject({ title: 'Другая книга', price: null, links: [] });
  });

  it('отвергает небезопасные ссылки, пустое название и больше 5 ссылок', async () => {
    const agent = await signedInAgent(app);
    const { listId } = await listWithItem(agent);
    const post = (b: object) => agent.post(`/api/wishlists/${listId}/items`).send(b);
    expect((await post({ title: 'x', url: 'javascript:alert(1)' })).status).toBe(400);
    expect((await post({ title: 'x', links: [{ url: 'ftp://a.b' }] })).status).toBe(400);
    expect((await post({ title: ' ' })).status).toBe(400);
    const six = Array.from({ length: 6 }, (_, i) => ({ url: `https://a.example/${i}` }));
    expect((await post({ title: 'x', links: six })).status).toBe(400);
  });

  it('чужой не может менять, удалять и загружать фото', async () => {
    const owner = await signedInAgent(app);
    const other = await signedInAgent(app, { username: 'other' });
    const { listId, itemId } = await listWithItem(owner);
    expect((await other.post(`/api/wishlists/${listId}/items`).send({ title: 'x' })).status).toBe(404);
    expect((await other.patch(`/api/items/${itemId}`).send({ title: 'x' })).status).toBe(404);
    expect((await other.delete(`/api/items/${itemId}`)).status).toBe(404);
    expect(
      (await other.post(`/api/items/${itemId}/images`).attach('file', await png(), 'a.png')).status,
    ).toBe(404);
  });

  it('фото: загрузка, главное, лимит 5, удаление файлов вместе с товаром', async () => {
    const agent = await signedInAgent(app);
    const { itemId } = await listWithItem(agent);
    const first = await agent.post(`/api/items/${itemId}/images`).attach('file', await png(), 'a.png');
    expect(first.status).toBe(201);
    expect(first.body.item.images[0].isMain).toBe(true);
    const key = first.body.item.images[0].fileKey as string;
    expect(await storage.read(key)).not.toBeNull();

    const second = await agent.post(`/api/items/${itemId}/images`).attach('file', await png(), 'b.png');
    const secondId = second.body.item.images.find((i: { isMain: boolean }) => !i.isMain).id;
    const main = await agent.patch(`/api/items/${itemId}/images/${secondId}/main`);
    expect(main.body.item.images[0].id).toBe(secondId);

    for (let i = 0; i < 3; i++) {
      await agent.post(`/api/items/${itemId}/images`).attach('file', await png(), 'c.png');
    }
    const over = await agent.post(`/api/items/${itemId}/images`).attach('file', await png(), 'd.png');
    expect(over.status).toBe(400);
    expect(over.body.code).toBe('TOO_MANY_IMAGES');

    const keys = (await prisma.itemImage.findMany({ where: { itemId } })).map((i) => i.fileKey);
    expect((await agent.delete(`/api/items/${itemId}`)).status).toBe(204);
    for (const k of keys) expect(await storage.read(k)).toBeNull();
  });

  it('отклоняет не-картинку', async () => {
    const agent = await signedInAgent(app);
    const { itemId } = await listWithItem(agent);
    const res = await agent
      .post(`/api/items/${itemId}/images`)
      .attach('file', Buffer.from('not an image'), 'a.png');
    expect(res.status).toBe(400);
  });
});
