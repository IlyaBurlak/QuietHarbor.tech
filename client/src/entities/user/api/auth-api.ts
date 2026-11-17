import type { AuthResponse, LoginInput, RegisterInput, SessionUser } from '@wishlist/shared';
import { http } from '@/shared/api';

/** Текущий пользователь; null, если не вошёл. */
export async function fetchMe(): Promise<SessionUser | null> {
  try {
    const { data } = await http.get<AuthResponse>('/auth/me');
    return data.user;
  } catch (e) {
    if ((e as { code?: string }).code === 'UNAUTHORIZED') return null;
    throw e;
  }
}

export const loginRequest = (input: LoginInput) =>
  http.post<AuthResponse>('/auth/login', input).then((r) => r.data.user);

export const registerRequest = (input: RegisterInput) =>
  http.post<AuthResponse>('/auth/register', input).then((r) => r.data.user);

export const logoutRequest = () => http.post('/auth/logout').then(() => undefined);

export const checkUsernameAvailable = (username: string) =>
  http
    .get<{ available: boolean }>('/auth/username-available', { params: { username } })
    .then((r) => r.data.available);
