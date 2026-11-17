import type { ApiError } from '@wishlist/shared';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: ApiError['fields'],
  ) {
    super(message);
  }
}

export const notFound = (message = 'Не найдено') => new HttpError(404, 'NOT_FOUND', message);
export const forbidden = (message = 'Нет доступа') => new HttpError(403, 'FORBIDDEN', message);
export const unauthorized = (message = 'Требуется вход') =>
  new HttpError(401, 'UNAUTHORIZED', message);
