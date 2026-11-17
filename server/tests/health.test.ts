import { describe, it, expect } from 'vitest';
import request from 'supertest';

process.env.DATABASE_URL ??= 'postgresql://x:x@localhost:5432/x';
process.env.CLIENT_URL ??= 'http://localhost:5173';
process.env.SESSION_SECRET ??= 'x'.repeat(32);

describe('API', () => {
  it('возвращает 404 в едином формате для неизвестного маршрута', async () => {
    const { createApp } = await import('../src/app');
    const res = await request(createApp()).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});
