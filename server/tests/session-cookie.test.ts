import { expect, it, vi } from 'vitest';
import { env } from '../src/config/env';
import { secureSessionCookie } from '../src/core/http/session-cookie';

vi.mock('../src/config/env', () => ({
  env: { NODE_ENV: 'production', CLIENT_URL: 'http://localhost:18080' },
}));

it('даёт браузеру сохранить сессию на локальном HTTP', () => {
  expect(secureSessionCookie({ hostname: 'localhost', secure: false })).toBe(false);
});

it('сохраняет Secure для HTTPS, публичного адреса и запросов с другого имени', () => {
  expect(secureSessionCookie({ hostname: 'localhost', secure: true })).toBe(true);
  expect(secureSessionCookie({ hostname: 'example.com', secure: false })).toBe(true);
  env.CLIENT_URL = 'https://example.com';
  try {
    expect(secureSessionCookie({ hostname: 'localhost', secure: false })).toBe(true);
    expect(secureSessionCookie({ hostname: 'example.com', secure: true })).toBe(true);
  } finally {
    env.CLIENT_URL = 'http://localhost:18080';
  }
});
