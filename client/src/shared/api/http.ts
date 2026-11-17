import axios, { AxiosError } from 'axios';
import type { ApiError } from '@wishlist/shared';

/** Единый экземпляр Axios: cookie-сессия и разбор ошибок API. */
export const http = axios.create({ baseURL: '/api', withCredentials: true });

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};

http.interceptors.response.use(
  (r) => r,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) onUnauthorized?.();
    return Promise.reject(toApiError(error));
  },
);

export function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError<ApiError>(error) && error.response?.data?.code) return error.response.data;
  return { code: 'NETWORK_ERROR', message: 'Не удалось связаться с сервером' };
}
