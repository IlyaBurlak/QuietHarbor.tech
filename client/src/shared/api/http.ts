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

function isApiError(value: unknown): value is ApiError {
  const v = value as Partial<ApiError> | null;
  return typeof v === 'object' && v !== null && typeof v.code === 'string' && typeof v.message === 'string';
}

export function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError<ApiError>(error)) {
    return error.response?.data?.code
      ? error.response.data
      : { code: 'NETWORK_ERROR', message: 'Не удалось связаться с сервером' };
  }
  // Перехватчик уже превращает ошибки Axios в ApiError, поэтому повторный вызов должен их узнавать
  if (isApiError(error)) return error;
  return { code: 'NETWORK_ERROR', message: 'Не удалось связаться с сервером' };
}
