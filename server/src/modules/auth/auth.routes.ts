import { Router, type Response } from 'express';
import {
  loginSchema,
  passwordResetRequestSchema,
  registerSchema,
  resetPasswordSchema,
  usernameAvailabilitySchema,
} from '@wishlist/shared';
import { env } from '../../config/env';
import {
  authLimiter,
  availabilityLimiter,
  resetRequestLimiter,
} from '../../core/middleware/rate-limits';
import { requireAuth } from '../../core/middleware/auth';
import { validate } from '../../core/middleware/validate';
import * as authService from './auth.service';
import * as resetService from './password-reset.service';
import { destroySession, SESSION_COOKIE, SESSION_TTL_MS } from './session.service';

export const authRouter = Router();

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.NODE_ENV === 'production',
  path: '/',
} as const;

const setSessionCookie = (res: Response, token: string) =>
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: SESSION_TTL_MS });

authRouter.get(
  '/username-available',
  availabilityLimiter,
  validate(usernameAvailabilitySchema, 'query'),
  async (req, res) => {
    const { username } = req.query as { username: string };
    res.json({ available: await authService.isUsernameAvailable(username) });
  },
);

authRouter.post('/register', authLimiter, validate(registerSchema), async (req, res) => {
  const { user, token } = await authService.register(req.body);
  setSessionCookie(res, token);
  res.status(201).json({ user });
});

authRouter.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
  const { user, token } = await authService.login(req.body);
  setSessionCookie(res, token);
  res.json({ user });
});

authRouter.post('/logout', async (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token === 'string' && token) await destroySession(token);
  res.clearCookie(SESSION_COOKIE, cookieOptions);
  res.status(204).end();
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

authRouter.post(
  '/password-reset-requests',
  resetRequestLimiter,
  validate(passwordResetRequestSchema),
  async (req, res) => {
    res.status(201).json(await resetService.createResetRequest(req.body));
  },
);

authRouter.post('/reset-password', authLimiter, validate(resetPasswordSchema), async (req, res) => {
  await resetService.resetPassword(req.body.token, req.body.password);
  res.status(204).end();
});
