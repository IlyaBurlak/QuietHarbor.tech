import { Router } from 'express';
import {
  changePasswordSchema,
  deleteAccountSchema,
  homeSettingsSchema,
  searchQuerySchema,
  updateProfileSchema,
} from '@wishlist/shared';
import { requireAuth } from '../../core/middleware/auth';
import { authLimiter, searchLimiter, uploadLimiter } from '../../core/middleware/rate-limits';
import { validate } from '../../core/middleware/validate';
import { SESSION_COOKIE } from '../auth/session.service';
import { uploadSingle } from '../files/upload';
import * as friendsService from '../friends/friends.service';
import * as usersService from './users.service';

export const usersRouter = Router();
usersRouter.use(requireAuth);

usersRouter.get('/me', async (req, res) => {
  res.json({ profile: await usersService.getProfile(req.user!.id) });
});

usersRouter.patch('/me', validate(updateProfileSchema), async (req, res) => {
  res.json(await usersService.updateProfile(req.user!.id, req.body));
});

usersRouter.get('/me/home', async (req, res) => {
  res.json(await usersService.getHomeSettings(req.user!.id));
});

usersRouter.put('/me/home', validate(homeSettingsSchema), async (req, res) => {
  res.json(await usersService.setHomeSettings(req.user!.id, req.body));
});

usersRouter.post('/me/avatar', uploadLimiter, uploadSingle, async (req, res) => {
  res.json(await usersService.setAvatar(req.user!.id, req.file));
});

usersRouter.delete('/me/avatar', async (req, res) => {
  res.json(await usersService.removeAvatar(req.user!.id));
});

usersRouter.post('/me/password', authLimiter, validate(changePasswordSchema), async (req, res) => {
  await usersService.changePassword(req.user!.id, req.sessionToken, req.body);
  res.status(204).end();
});

usersRouter.delete('/me', authLimiter, validate(deleteAccountSchema), async (req, res) => {
  await usersService.deleteAccount(req.user!.id, req.body);
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.status(204).end();
});

// Маршруты с :username объявлены после /me/*, чтобы не перехватывать их
usersRouter.get('/search', searchLimiter, validate(searchQuerySchema, 'query'), async (req, res) => {
  res.json({ users: await friendsService.searchUsers(req.user!.id, req.query.nick as string) });
});

usersRouter.get('/:username', async (req, res) => {
  const username = String(req.params.username).toLowerCase();
  res.json({ profile: await friendsService.getPublicProfile(req.user!.id, username) });
});

usersRouter.get('/:username/wishlists', async (req, res) => {
  const username = String(req.params.username).toLowerCase();
  res.json({ wishlists: await friendsService.getProfileWishlists(req.user!.id, username) });
});
