import { Router } from 'express';
import {
  copyItemSchema,
  createWishlistSchema,
  itemInputSchema,
  reorderWishlistSchema,
  updateWishlistSchema,
} from '@wishlist/shared';
import { requireAuth } from '../../core/middleware/auth';
import { validate } from '../../core/middleware/validate';
import { createItem } from '../items/items.service';
import * as service from './wishlists.service';

export const wishlistsRouter = Router();
wishlistsRouter.use(requireAuth);

const id = (req: { params: Record<string, string | string[] | undefined> }) =>
  String(req.params.id);

wishlistsRouter.get('/', async (req, res) => {
  res.json({ wishlists: await service.listWishlists(req.user!.id) });
});

wishlistsRouter.post('/', validate(createWishlistSchema), async (req, res) => {
  res.status(201).json({ wishlist: await service.createWishlist(req.user!.id, req.body) });
});

wishlistsRouter.get('/:id', async (req, res) => {
  res.json(await service.getWishlist(req.user!.id, id(req)));
});

wishlistsRouter.patch('/:id', validate(updateWishlistSchema), async (req, res) => {
  res.json({ wishlist: await service.updateWishlist(req.user!.id, id(req), req.body) });
});

wishlistsRouter.delete('/:id', async (req, res) => {
  await service.deleteWishlist(req.user!.id, id(req));
  res.status(204).end();
});

wishlistsRouter.post('/:id/regenerate-link', async (req, res) => {
  res.json({ wishlist: await service.regenerateLink(req.user!.id, id(req)) });
});

wishlistsRouter.patch('/:id/reorder', validate(reorderWishlistSchema), async (req, res) => {
  res.json(await service.reorder(req.user!.id, id(req), req.body.itemIds));
});

wishlistsRouter.post('/:id/duplicate', async (req, res) => {
  res.status(201).json({ wishlist: await service.duplicateWishlist(req.user!.id, id(req)) });
});

wishlistsRouter.post('/:id/items/copy', validate(copyItemSchema), async (req, res) => {
  res.status(201).json({ item: await service.copyItem(req.user!.id, id(req), req.body.itemId) });
});

wishlistsRouter.post('/:id/items', validate(itemInputSchema), async (req, res) => {
  res.status(201).json({ item: await createItem(req.user!.id, id(req), req.body) });
});
