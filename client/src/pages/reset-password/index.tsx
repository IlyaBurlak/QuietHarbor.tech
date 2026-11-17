import { useParams } from 'react-router-dom';
import { AuthShell } from '@/widgets/auth-shell';
import { ResetPasswordForm } from '@/features/password-reset';

export function ResetPasswordPage() {
  const { token = '' } = useParams();
  return (
    <AuthShell title="Новый пароль">
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
