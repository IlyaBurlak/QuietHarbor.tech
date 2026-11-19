import { AuthShell } from '@/widgets/auth-shell';
import { RegisterForm } from '@/features/auth-register';

export function RegisterPage() {
  return (
    <AuthShell title="Регистрация">
      <RegisterForm />
    </AuthShell>
  );
}
