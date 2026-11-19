import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes';
import { publicRouter } from './modules/public/public.routes';
import { usersRouter } from './modules/users/users.routes';
import { calendarRouter } from './modules/calendar/calendar.routes';
import { filesRouter } from './modules/files/files.routes';
import { healthRouter } from './modules/health/health.routes';

/** Корневой роутер API. Каждый модуль подключается здесь: router.use('/wishlists', wishlistsRouter). */
export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/public', publicRouter);
apiRouter.use('/files', filesRouter);
apiRouter.use('/calendar', calendarRouter);
