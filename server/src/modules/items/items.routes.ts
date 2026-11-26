import { Router } from 'express';
import { updateItemSchema } from '@wishlist/shared';
import { requireAuth } from '../../core/middleware/auth';
import { uploadLimiter } from '../../core/middleware/rate-limits';
import { validate } from '../../core/middleware/validate';
import { uploadSingle } from '../files/upload';
import * as service from './items.service';

export const itemsRouter = Router();
itemsRouter.use(requireAuth);

const p = (v: string | string[] | undefined) => String(v);

itemsRouter.patch('/:id', validate(updateItemSchema), async (req, res) => {
  res.json({ item: await service.updateItem(req.user!.id, p(req.params.id), req.body) });
});

itemsRouter.delete('/:id', async (req, res) => {
  await service.deleteItem(req.user!.id, p(req.params.id));
  res.status(204).end();
});

itemsRouter.post('/:id/images', uploadLimiter, uploadSingle, async (req, res) => {
  res.status(201).json({ item: await service.addImage(req.user!.id, p(req.params.id), req.file) });
});

itemsRouter.delete('/:id/images/:imageId', async (req, res) => {
  const item = await service.deleteImage(req.user!.id, p(req.params.id), p(req.params.imageId));
  res.json({ item });
});

itemsRouter.patch('/:id/images/:imageId/main', async (req, res) => {
  const item = await service.setMainImage(req.user!.id, p(req.params.id), p(req.params.imageId));
  res.json({ item });
});
