import { Router } from 'express';
import { env } from '../../config/env';
import { optionalAuth } from '../../core/middleware/auth';
import { getPublicWishlist } from './public.service';

export const publicRouter = Router();

/** Публичные настройки для фронта (без секретов). */
publicRouter.get('/config', (_req, res) => {
  res.json({ supportContactUrl: env.SUPPORT_CONTACT_URL ?? null });
});

/** Вишлист по ссылке: для гостя, для вошедшего и для владельца (без броней). */
publicRouter.get('/w/:slug', optionalAuth, async (req, res) => {
  res.json(await getPublicWishlist(req.user?.id, String(req.params.slug)));
});
