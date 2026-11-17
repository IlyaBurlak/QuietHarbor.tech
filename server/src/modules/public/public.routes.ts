import { Router } from 'express';
import { env } from '../../config/env';

export const publicRouter = Router();

/** Публичные настройки для фронта (без секретов). */
publicRouter.get('/config', (_req, res) => {
  res.json({ supportContactUrl: env.SUPPORT_CONTACT_URL ?? null });
});
