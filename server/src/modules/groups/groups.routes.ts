import { Router } from 'express';
import {
  createGroupSchema,
  exclusionInputSchema,
  setMyWishlistSchema,
  updateGroupSchema,
} from '@wishlist/shared';
import { optionalAuth, requireAuth } from '../../core/middleware/auth';
import { validate } from '../../core/middleware/validate';
import * as service from './groups.service';

export const groupsRouter = Router();

const p = (v: string | string[] | undefined) => String(v);

// Предпросмотр приглашения открыт и гостю: после него человека просят войти
groupsRouter.get('/join/:code', optionalAuth, async (req, res) => {
  res.json({ group: await service.previewInvite(req.user?.id, p(req.params.code)) });
});

groupsRouter.use(requireAuth);

groupsRouter.post('/join/:code', async (req, res) => {
  res.json(await service.joinGroup(req.user!.id, p(req.params.code)));
});

groupsRouter.get('/', async (req, res) => {
  res.json({ groups: await service.listGroups(req.user!.id) });
});

groupsRouter.post('/', validate(createGroupSchema), async (req, res) => {
  res.status(201).json({ group: await service.createGroup(req.user!.id, req.body) });
});

groupsRouter.get('/:id', async (req, res) => {
  res.json({ group: await service.getGroup(req.user!.id, p(req.params.id)) });
});

groupsRouter.patch('/:id', validate(updateGroupSchema), async (req, res) => {
  res.json({ group: await service.updateGroup(req.user!.id, p(req.params.id), req.body) });
});

groupsRouter.delete('/:id', async (req, res) => {
  await service.deleteGroup(req.user!.id, p(req.params.id));
  res.status(204).end();
});

groupsRouter.post('/:id/regenerate-invite', async (req, res) => {
  res.json(await service.regenerateInvite(req.user!.id, p(req.params.id)));
});

groupsRouter.delete('/:id/members/:userId', async (req, res) => {
  await service.kickMember(req.user!.id, p(req.params.id), p(req.params.userId));
  res.status(204).end();
});

groupsRouter.post('/:id/leave', async (req, res) => {
  await service.leaveGroup(req.user!.id, p(req.params.id));
  res.status(204).end();
});

groupsRouter.put('/:id/my-wishlist', validate(setMyWishlistSchema), async (req, res) => {
  await service.setMyWishlist(req.user!.id, p(req.params.id), req.body.wishlistId);
  res.status(204).end();
});

groupsRouter.post('/:id/exclusions', validate(exclusionInputSchema), async (req, res) => {
  res.status(201).json({
    exclusion: await service.addExclusion(req.user!.id, p(req.params.id), req.body),
  });
});

groupsRouter.delete('/:id/exclusions/:exclusionId', async (req, res) => {
  await service.removeExclusion(req.user!.id, p(req.params.id), p(req.params.exclusionId));
  res.status(204).end();
});

groupsRouter.post('/:id/draw', async (req, res) => {
  await service.draw(req.user!.id, p(req.params.id));
  res.status(204).end();
});

groupsRouter.get('/:id/my-recipient', async (req, res) => {
  res.json(await service.myRecipient(req.user!.id, p(req.params.id)));
});
