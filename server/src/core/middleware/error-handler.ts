import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { ApiError } from '@wishlist/shared';
import { HttpError } from '../http/errors';
import { logger } from '../http/logger';

export const notFoundHandler: RequestHandler = (_req, res) => {
  const body: ApiError = { code: 'NOT_FOUND', message: 'Маршрут не найден' };
  res.status(404).json(body);
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    const body: ApiError = { code: err.code, message: err.message, fields: err.fields };
    res.status(err.status).json(body);
    return;
  }
  logger.error(err);
  const body: ApiError = { code: 'INTERNAL_ERROR', message: 'Внутренняя ошибка сервера' };
  res.status(500).json(body);
};
