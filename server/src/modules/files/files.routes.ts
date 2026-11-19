import { Router } from 'express';
import { notFound } from '../../core/http/errors';
import { FILE_KEY_PATTERN } from './files.service';
import { storage } from './storage';

export const filesRouter = Router();

/**
 * Раздача файлов по ключу. Имена случайные и неугадываемые (128 бит), поэтому ссылка на аватар
 * работает без входа: так её видят гости на публичных страницах. Ключ строго проверяется по шаблону.
 */
filesRouter.get('/:key', async (req, res) => {
  const key = String(req.params.key);
  if (!FILE_KEY_PATTERN.test(key)) throw notFound('Файл не найден');
  const data = await storage.read(key);
  if (!data) throw notFound('Файл не найден');
  res.set({
    'Content-Type': 'image/webp',
    // Имя содержит случайный ключ и не переиспользуется, поэтому содержимое неизменно
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'Cross-Origin-Resource-Policy': 'same-site',
  });
  res.send(data);
});
