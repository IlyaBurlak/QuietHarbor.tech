import { env } from './config/env';
import { createApp } from './app';
import { logger } from './core/http/logger';

createApp().listen(env.SERVER_PORT, () => {
  logger.info(`API запущен: http://localhost:${env.SERVER_PORT}/api`);
});
