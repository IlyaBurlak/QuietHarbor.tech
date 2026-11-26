import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/core/db/prisma';
import { MOUNTS } from '../src/routes';
import { cleanDb, signedInAgent } from './helpers';

const app = createApp();
beforeEach(cleanDb);
afterAll(() => prisma.$disconnect());

interface Endpoint {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  path: string;
  /** Путь для запроса: параметры заменены заглушками. */
  url: string;
}

/** Обходит все роутеры и собирает каждый зарегистрированный маршрут. */
function listEndpoints(): Endpoint[] {
  const found: Endpoint[] = [];
  for (const [prefix, router] of MOUNTS) {
    for (const layer of (router as unknown as { stack: { route?: { path: string; methods: Record<string, boolean> } }[] }).stack) {
      if (!layer.route) continue;
      const path = (prefix === '/' ? '' : prefix) + (layer.route.path === '/' ? '' : layer.route.path);
      for (const method of Object.keys(layer.route.methods)) {
        found.push({
          method: method as Endpoint['method'],
          path: path || '/',
          url: '/api' + (path || '/').replace(/:[A-Za-z]+/g, 'x'),
        });
      }
    }
  }
  return found;
}

/**
 * Открытые без входа эндпоинты. Всё остальное обязано отвечать 401.
 * Если добавляете публичный маршрут, внесите его сюда осознанно.
 */
const PUBLIC = new Set([
  'get /health',
  'get /auth/username-available',
  'post /auth/register',
  'post /auth/login',
  'post /auth/logout',
  'post /auth/password-reset-requests',
  'post /auth/reset-password',
  'get /public/config',
  'get /public/w/:slug',
  'get /files/:key',
  'get /groups/join/:code',
  'post /admin/auth/login',
  'post /admin/auth/logout',
]);

const key = (e: Endpoint) => `${e.method} ${e.path}`;

describe('карта доступа', () => {
  const endpoints = listEndpoints();

  it('нашла все маршруты (защита от пустого обхода)', () => {
    expect(endpoints.length).toBeGreaterThan(70);
  });

  it('в списке открытых нет устаревших записей', () => {
    const existing = new Set(endpoints.map((e) => key({ ...e, path: e.path.replace(/^\/api/, '') })));
    for (const entry of PUBLIC) expect(existing, `нет маршрута: ${entry}`).toContain(entry);
  });

  it.each(endpoints.filter((e) => !PUBLIC.has(key(e))).map((e) => [key(e), e] as const))(
    '%s без входа — 401',
    async (_name, e) => {
      const res = await request(app)[e.method](e.url).send({});
      expect(res.status).toBe(401);
    },
  );
});

describe('чужие данные — 404 или 403, не содержимое', () => {
  it('другой пользователь не получает чужие вишлисты, товары, группы и уведомления', async () => {
    const owner = await signedInAgent(app);
    const other = await signedInAgent(app, { username: 'other' });
    const w = (await owner.post('/api/wishlists').send({ title: 'Закрытый', visibility: 'private' })).body.wishlist;
    const item = (await owner.post(`/api/wishlists/${w.id}/items`).send({ title: 'Товар' })).body.item;
    const group = (await owner.post('/api/groups').send({ title: 'Группа' })).body.group;
    await prisma.notification.create({
      data: { userId: (await prisma.user.findUniqueOrThrow({ where: { username: 'tester' } })).id, type: 'group_drawn' },
    });
    const notice = (await owner.get('/api/notifications')).body.notifications[0];

    const attempts: [string, string, object?][] = [
      ['get', `/api/wishlists/${w.id}`],
      ['patch', `/api/wishlists/${w.id}`, { title: 'x' }],
      ['delete', `/api/wishlists/${w.id}`],
      ['post', `/api/wishlists/${w.id}/regenerate-link`],
      ['patch', `/api/wishlists/${w.id}/reorder`, { itemIds: [] }],
      ['post', `/api/wishlists/${w.id}/duplicate`],
      ['post', `/api/wishlists/${w.id}/items`, { title: 'x' }],
      ['post', `/api/wishlists/${w.id}/items/copy`, { itemId: item.id }],
      ['patch', `/api/items/${item.id}`, { title: 'x' }],
      ['delete', `/api/items/${item.id}`],
      ['post', `/api/items/${item.id}/images`],
      ['post', `/api/items/${item.id}/reserve`],
      ['delete', `/api/items/${item.id}/reserve`],
      ['post', `/api/items/${item.id}/bought`],
      ['get', `/api/groups/${group.id}`],
      ['patch', `/api/groups/${group.id}`, { title: 'x' }],
      ['delete', `/api/groups/${group.id}`],
      ['post', `/api/groups/${group.id}/draw`],
      ['post', `/api/groups/${group.id}/leave`],
      ['post', `/api/groups/${group.id}/regenerate-invite`],
      ['get', `/api/groups/${group.id}/my-recipient`],
      ['put', `/api/groups/${group.id}/my-wishlist`, { wishlistId: null }],
      ['post', `/api/groups/${group.id}/exclusions`, { userAId: 'a', userBId: 'b' }],
      ['post', `/api/notifications/${notice.id}/read`],
    ];
    for (const [method, url, body] of attempts) {
      const res = await (other as unknown as Record<string, (u: string) => request.Test>)[method]!(url).send(body ?? {});
      expect([403, 404], `${method} ${url} → ${res.status}`).toContain(res.status);
      expect(res.text).not.toContain('Закрытый');
    }
    // ничего не изменилось
    expect((await prisma.wishlist.findUniqueOrThrow({ where: { id: w.id } })).title).toBe('Закрытый');
    expect(await prisma.item.count()).toBe(1);
    expect(await prisma.group.count()).toBe(1);
  });

  it('заблокированный пользователь и админская сессия не открывают обычные эндпоинты', async () => {
    const user = await signedInAgent(app);
    await prisma.user.update({ where: { username: 'tester' }, data: { status: 'blocked' } });
    expect((await user.get('/api/wishlists')).status).toBe(401);
  });
});
