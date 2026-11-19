import { AuthShell } from '@/widgets/auth-shell';
import { LoginForm } from '@/features/auth-login';

export function LoginPage() {
  return (
    <AuthShell title="Вход">
      <LoginForm />
    </AuthShell>
  );
}
