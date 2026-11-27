import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('API', () => {
  it('возвращает 404 в едином формате для неизвестного маршрута', async () => {
    const res = await request(createApp()).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});
