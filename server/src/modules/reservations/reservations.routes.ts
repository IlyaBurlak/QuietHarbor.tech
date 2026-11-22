import { Router } from 'express';
import { requireAuth } from '../../core/middleware/auth';
import * as service from './reservations.service';

/** Бронь подарков: /items/:id/reserve, /items/:id/bought и /me/reservations. */
export const reservationsRouter = Router();
const id = (req: { params: Record<string, string | string[] | undefined> }) => String(req.params.id);

reservationsRouter.post('/items/:id/reserve', requireAuth, async (req, res) => {
  await service.reserve(req.user!.id, id(req));
  res.status(201).end();
});

reservationsRouter.delete('/items/:id/reserve', requireAuth, async (req, res) => {
  await service.release(req.user!.id, id(req));
  res.status(204).end();
});

reservationsRouter.post('/items/:id/bought', requireAuth, async (req, res) => {
  await service.markBought(req.user!.id, id(req));
  res.status(204).end();
});

reservationsRouter.get('/me/reservations', requireAuth, async (req, res) => {
  res.json(await service.myReservations(req.user!.id));
});
