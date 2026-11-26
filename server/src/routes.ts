import { Router } from 'express';
import { adminRouter } from './modules/admin/admin.routes';
import { authRouter } from './modules/auth/auth.routes';
import { calendarRouter } from './modules/calendar/calendar.routes';
import { filesRouter } from './modules/files/files.routes';
import { friendsRouter } from './modules/friends/friends.routes';
import { groupsRouter } from './modules/groups/groups.routes';
import { healthRouter } from './modules/health/health.routes';
import { itemsRouter } from './modules/items/items.routes';
import { notificationsRouter } from './modules/notifications/notifications.routes';
import { publicRouter } from './modules/public/public.routes';
import { reservationsRouter } from './modules/reservations/reservations.routes';
import { usersRouter } from './modules/users/users.routes';
import { wishlistsRouter } from './modules/wishlists/wishlists.routes';

/**
 * Все модули API и адреса, куда они подключены. Список вынесен в массив, чтобы тест доступа
 * мог обойти каждый маршрут и убедиться, что новый эндпоинт не остался открытым по ошибке.
 */
export const MOUNTS: readonly [prefix: string, router: Router][] = [
  ['/health', healthRouter],
  ['/auth', authRouter],
  ['/users', usersRouter],
  ['/public', publicRouter],
  ['/files', filesRouter],
  ['/calendar', calendarRouter],
  ['/wishlists', wishlistsRouter],
  ['/', reservationsRouter],
  ['/items', itemsRouter],
  ['/friends', friendsRouter],
  ['/groups', groupsRouter],
  ['/notifications', notificationsRouter],
  ['/admin', adminRouter],
];

/** Корневой роутер API. */
export const apiRouter = Router();
for (const [prefix, router] of MOUNTS) apiRouter.use(prefix, router);
