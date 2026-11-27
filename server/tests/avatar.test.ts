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

const png = (w = 800, h = 400) =>
  sharp({ create: { width: w, height: h, channels: 3, background: '#1f5f7a' } })
    .png()
    .toBuffer();

describe('аватар', () => {
  it('требует вход', async () => {
    expect((await request(app).post('/api/users/me/avatar')).status).toBe(401);
    expect((await request(app).delete('/api/users/me/avatar')).status).toBe(401);
  });

  it('загружает, обрезает до квадрата и отдаёт по ключу', async () => {
    const agent = await signedInAgent(app);
    const res = await agent.post('/api/users/me/avatar').attach('file', await png(), 'a.png');
    expect(res.status).toBe(200);
    const key = res.body.profile.avatarKey as string;
    expect(key).toMatch(/^[a-f0-9]{32}\.webp$/);
    expect(res.body.user.avatarKey).toBe(key);

    const file = await request(app).get(`/api/files/${key}`);
    expect(file.status).toBe(200);
    expect(file.headers['content-type']).toBe('image/webp');
    expect(file.headers['cache-control']).toContain('immutable');
    const meta = await sharp(file.body).metadata();
    expect([meta.width, meta.height]).toEqual([512, 512]);
  });

  it('при замене удаляет старый файл', async () => {
    const agent = await signedInAgent(app);
    const first = await agent.post('/api/users/me/avatar').attach('file', await png(), 'a.png');
    const second = await agent.post('/api/users/me/avatar').attach('file', await png(), 'b.png');
    expect(await storage.read(first.body.profile.avatarKey)).toBeNull();
    expect(await storage.read(second.body.profile.avatarKey)).not.toBeNull();
  });

  it('отклоняет не картинку, даже с расширением .png', async () => {
    const agent = await signedInAgent(app);
    const res = await agent
      .post('/api/users/me/avatar')
      .attach('file', Buffer.from('<script>alert(1)</script>'), 'a.png');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_IMAGE');
  });

  it('отклоняет файл больше 5 МБ', async () => {
    const agent = await signedInAgent(app);
    const res = await agent
      .post('/api/users/me/avatar')
      .attach('file', Buffer.alloc(5 * 1024 * 1024 + 1), 'big.png');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('FILE_TOO_LARGE');
  });

  it('требует файл', async () => {
    const agent = await signedInAgent(app);
    const res = await agent.post('/api/users/me/avatar');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('FILE_REQUIRED');
  });

  it('удаляет аватар', async () => {
    const agent = await signedInAgent(app);
    const up = await agent.post('/api/users/me/avatar').attach('file', await png(), 'a.png');
    const res = await agent.delete('/api/users/me/avatar');
    expect(res.status).toBe(200);
    expect(res.body.profile.avatarKey).toBeNull();
    expect(await storage.read(up.body.profile.avatarKey)).toBeNull();
  });

  it('файл удаляется вместе с аккаунтом', async () => {
    const agent = await signedInAgent(app);
    const up = await agent.post('/api/users/me/avatar').attach('file', await png(), 'a.png');
    await agent.delete('/api/users/me').send({ password: 'password123' });
    expect(await storage.read(up.body.profile.avatarKey)).toBeNull();
  });

  it('не отдаёт файлы по произвольному пути', async () => {
    expect((await request(app).get('/api/files/..%2F..%2Fpackage.json')).status).toBe(404);
    expect((await request(app).get('/api/files/nothing.webp')).status).toBe(404);
  });
});
