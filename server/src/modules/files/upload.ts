import type { RequestHandler } from 'express';
import multer from 'multer';
import { HttpError } from '../../core/http/errors';
import { MAX_UPLOAD_BYTES } from './files.service';

const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
}).single('file');

/** multer для одного файла в поле `file` с понятными ошибками в формате API. */
export const uploadSingle: RequestHandler = (req, res, next) => {
  parser(req, res, (err?: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new HttpError(400, 'FILE_TOO_LARGE', 'Файл больше 5 МБ'));
      }
      return next(new HttpError(400, 'BAD_UPLOAD', 'Не удалось загрузить файл'));
    }
    next(err);
  });
};
