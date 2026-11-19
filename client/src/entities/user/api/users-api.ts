import type {
  ChangePasswordInput,
  DeleteAccountInput,
  Profile,
  SessionUser,
  UpdateProfileInput,
} from '@wishlist/shared';
import { http } from '@/shared/api';

export const fetchProfile = () =>
  http.get<{ profile: Profile }>('/users/me').then((r) => r.data.profile);

export const updateProfileRequest = (input: UpdateProfileInput) =>
  http.patch<{ user: SessionUser; profile: Profile }>('/users/me', input).then((r) => r.data);

export const changePasswordRequest = (input: ChangePasswordInput) =>
  http.post('/users/me/password', input).then(() => undefined);

export const deleteAccountRequest = (input: DeleteAccountInput) =>
  http.delete('/users/me', { data: input }).then(() => undefined);

export const uploadAvatarRequest = (file: File) => {
  const body = new FormData();
  body.append('file', file);
  return http
    .post<{ user: SessionUser; profile: Profile }>('/users/me/avatar', body)
    .then((r) => r.data);
};

export const deleteAvatarRequest = () =>
  http.delete<{ user: SessionUser; profile: Profile }>('/users/me/avatar').then((r) => r.data);
