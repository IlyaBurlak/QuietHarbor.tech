import { Router, type Request, type Response } from 'express';
import {
  adminPageSchema,
  adminResetQuerySchema,
  adminUsersQuerySchema,
  blockUserSchema,
  loginSchema,
} from '@wishlist/shared';
import { secureSessionCookie } from '../../core/http/session-cookie';
import { requireAdmin } from '../../core/middleware/admin';
import { adminLoginLimiter } from '../../core/middleware/rate-limits';
import { validate } from '../../core/middleware/validate';
import { ADMIN_SESSION_COOKIE } from '../auth/session.service';
import * as service from './admin.service';

export const adminRouter = Router();

const cookieOptions = (req: Request) => ({
  httpOnly: true,
  sameSite: 'strict',
  secure: secureSessionCookie(req),
  path: '/api/admin',
}) as const;

const setCookie = (req: Request, res: Response, token: string) =>
  res.cookie(ADMIN_SESSION_COOKIE, token, { ...cookieOptions(req), maxAge: service.ADMIN_SESSION_TTL_MS });

const p = (v: string | string[] | undefined) => String(v);

adminRouter.post('/auth/login', adminLoginLimiter, validate(loginSchema), async (req, res) => {
  const { user, token } = await service.login(req.body.username, req.body.password);
  setCookie(req, res, token);
  res.json({ user });
});

adminRouter.post('/auth/logout', async (req, res) => {
  const token = req.cookies?.[ADMIN_SESSION_COOKIE];
  if (typeof token === 'string' && token) await service.logout(token);
  res.clearCookie(ADMIN_SESSION_COOKIE, cookieOptions(req));
  res.status(204).end();
});

adminRouter.use(requireAdmin);

adminRouter.get('/auth/me', (req, res) => {
  res.json({ user: req.admin });
});

adminRouter.get('/stats', async (_req, res) => {
  res.json(await service.getStats());
});

adminRouter.get('/users', validate(adminUsersQuerySchema, 'query'), async (req, res) => {
  res.json(await service.listUsers(req.query as never));
});

adminRouter.get('/users/:id', async (req, res) => {
  res.json({ user: await service.getUserCard(p(req.params.id)) });
});

adminRouter.post('/users/:id/block', validate(blockUserSchema), async (req, res) => {
  await service.blockUser(req.admin!.id, p(req.params.id), req.body.reason);
  res.status(204).end();
});

adminRouter.post('/users/:id/unblock', async (req, res) => {
  await service.unblockUser(req.admin!.id, p(req.params.id));
  res.status(204).end();
});

adminRouter.get('/reset-requests', validate(adminResetQuerySchema, 'query'), async (req, res) => {
  const { status } = req.query as { status: 'new' | 'done' | 'rejected' | 'all' };
  res.json({ requests: await service.listResetRequests(status) });
});

adminRouter.post('/reset-requests/:id/link', async (req, res) => {
  res.json(await service.createResetLink(req.admin!.id, p(req.params.id)));
});

adminRouter.post('/reset-requests/:id/reject', async (req, res) => {
  await service.rejectResetRequest(req.admin!.id, p(req.params.id));
  res.status(204).end();
});

adminRouter.get('/audit', validate(adminPageSchema, 'query'), async (req, res) => {
  const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
  res.json(await service.listAudit(page, pageSize));
});
