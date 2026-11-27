import type { Request } from 'express';
import { env } from '../../config/env';

const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

export function secureSessionCookie(req: Pick<Request, 'secure' | 'hostname'>): boolean {
  if (env.NODE_ENV !== 'production') return false;

  const client = new URL(env.CLIENT_URL);
  // Safari требует HTTPS для Secure-cookie даже на localhost.
  const localHttp =
    client.protocol === 'http:' &&
    loopbackHosts.has(client.hostname) &&
    req.hostname === client.hostname;
  return req.secure || !localHttp;
}
