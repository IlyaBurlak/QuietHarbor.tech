import { Router } from 'express';
import { healthRouter } from './modules/health/health.routes';

/** Корневой роутер API. Каждый модуль подключается здесь: router.use('/wishlists', wishlistsRouter). */
export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
