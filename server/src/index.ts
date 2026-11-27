import { env } from './config/env';
import { createApp } from './app';
import { prisma } from './core/db/prisma';
import { logger } from './core/http/logger';

createApp().listen(env.SERVER_PORT, () => {
  logger.info(`API запущен: http://localhost:${env.SERVER_PORT}/api`);
});

// Чистка просроченных сессий: при старте и раз в час
const cleanSessions = () =>
  prisma.session
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch((e) => logger.error(e));
void cleanSessions();
setInterval(cleanSessions, 60 * 60 * 1000).unref();
