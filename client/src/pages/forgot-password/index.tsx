import { AuthShell } from '@/widgets/auth-shell';
import { ResetRequestForm } from '@/features/password-reset-request';

export function ForgotPasswordPage() {
  return (
    <AuthShell title="Восстановление доступа">
      <ResetRequestForm />
    </AuthShell>
  );
}
