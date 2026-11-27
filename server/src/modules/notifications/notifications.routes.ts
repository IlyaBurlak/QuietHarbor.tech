import { Router } from 'express';
import { requireAuth } from '../../core/middleware/auth';
import * as service from './notifications.service';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get('/', async (req, res) => {
  res.json({ notifications: await service.list(req.user!.id) });
});

notificationsRouter.get('/summary', async (req, res) => {
  res.json(await service.summary(req.user!.id));
});

notificationsRouter.post('/read', async (req, res) => {
  await service.markAllRead(req.user!.id);
  res.status(204).end();
});

notificationsRouter.post('/:id/read', async (req, res) => {
  await service.markRead(req.user!.id, String(req.params.id));
  res.status(204).end();
});
