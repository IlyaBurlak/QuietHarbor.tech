import pino from 'pino';
import { env } from '../../config/env';

export const logger = pino({
  // Токены сессии не должны попадать в логи
  redact: {
    paths: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'],
    censor: '[redacted]',
  },
  level: env.NODE_ENV === 'test' ? 'silent' : 'info',
  transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
});
