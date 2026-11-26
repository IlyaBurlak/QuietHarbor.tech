import { Router } from 'express';
import { sendRequestSchema } from '@wishlist/shared';
import { requireAuth } from '../../core/middleware/auth';
import { friendRequestLimiter } from '../../core/middleware/rate-limits';
import { validate } from '../../core/middleware/validate';
import * as service from './friends.service';

export const friendsRouter = Router();
friendsRouter.use(requireAuth);

const p = (v: string | string[] | undefined) => String(v);

friendsRouter.get('/', async (req, res) => {
  res.json(await service.listFriends(req.user!.id));
});

friendsRouter.post('/requests', friendRequestLimiter, validate(sendRequestSchema), async (req, res) => {
  res.status(201).json(await service.sendRequest(req.user!.id, req.body.username));
});

friendsRouter.post('/requests/:id/accept', async (req, res) => {
  await service.acceptRequest(req.user!.id, p(req.params.id));
  res.status(204).end();
});

friendsRouter.post('/requests/:id/decline', async (req, res) => {
  await service.declineRequest(req.user!.id, p(req.params.id));
  res.status(204).end();
});

friendsRouter.delete('/requests/:id', async (req, res) => {
  await service.cancelRequest(req.user!.id, p(req.params.id));
  res.status(204).end();
});

friendsRouter.delete('/:userId', async (req, res) => {
  await service.removeFriend(req.user!.id, p(req.params.userId));
  res.status(204).end();
});
