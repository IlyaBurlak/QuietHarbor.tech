import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { HttpError } from '../http/errors';

type Source = 'body' | 'query' | 'params';

/** Валидирует часть запроса Zod-схемой и подменяет её разобранным значением. */
export const validate =
  (schema: ZodType, source: Source = 'body'): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const fields: Record<string, string> = {};
      for (const issue of result.error.issues) {
        fields[issue.path.join('.') || '_'] = issue.message;
      }
      return next(new HttpError(400, 'VALIDATION_ERROR', 'Проверьте введённые данные', fields));
    }
    Object.defineProperty(req, source, { value: result.data, writable: true });
    next();
  };
