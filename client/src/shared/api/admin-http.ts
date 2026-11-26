import axios, { AxiosError } from 'axios';
import type { ApiError } from '@wishlist/shared';
import { toApiError } from './http';

/** Экземпляр Axios для админки: свой cookie, 401 не трогает обычную сессию пользователя. */
export const adminHttp = axios.create({ baseURL: '/api/admin', withCredentials: true });

adminHttp.interceptors.response.use(
  (r) => r,
  (error: AxiosError<ApiError>) => Promise.reject(toApiError(error)),
);
