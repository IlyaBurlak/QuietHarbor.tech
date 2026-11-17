import { Router } from 'express';
import { changePasswordSchema, deleteAccountSchema, updateProfileSchema } from '@wishlist/shared';
import { requireAuth } from '../../core/middleware/auth';
import { authLimiter } from '../../core/middleware/rate-limits';
import { validate } from '../../core/middleware/validate';
import { SESSION_COOKIE } from '../auth/session.service';
import * as usersService from './users.service';

export const usersRouter = Router();
usersRouter.use(requireAuth);

usersRouter.get('/me', async (req, res) => {
  res.json({ profile: await usersService.getProfile(req.user!.id) });
});

usersRouter.patch('/me', validate(updateProfileSchema), async (req, res) => {
  res.json(await usersService.updateProfile(req.user!.id, req.body));
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
