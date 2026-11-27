import type { PasswordResetRequestInput } from '@wishlist/shared';
import { http } from '@/shared/api';

export const requestPasswordReset = (input: PasswordResetRequestInput) =>
  http
    .post<{ requestCode: string }>('/auth/password-reset-requests', input)
    .then((r) => r.data.requestCode);
