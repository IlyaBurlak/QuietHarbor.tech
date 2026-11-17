import type { ResetPasswordInput } from '@wishlist/shared';
import { http } from '@/shared/api';

export const resetPasswordRequest = (input: ResetPasswordInput) =>
  http.post('/auth/reset-password', input).then(() => undefined);
