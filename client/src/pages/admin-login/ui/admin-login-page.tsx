import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Card, Form, Input } from 'antd';
import { Navigate, useNavigate } from 'react-router-dom';
import { loginSchema, type LoginInput } from '@wishlist/shared';
import { useAdminLogin, useAdminMe } from '@/entities/admin';
import { toApiError } from '@/shared/api';

/** Отдельная страница входа администратора. Ссылок на неё из обычного интерфейса нет. */
export function AdminLoginPage() {
  const navigate = useNavigate();
  const { data: admin } = useAdminMe();
  const login = useAdminLogin();
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  if (admin) return <Navigate to="/admin" replace />;

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      await login.mutateAsync(v);
      navigate('/admin', { replace: true });
    } catch (e) {
      setError(toApiError(e).message);
    }
  });

  return (
    <div className="admin-login">
      <Card title="Вход в админку" className="admin-login__card">
        <Form layout="vertical" onFinish={onSubmit} requiredMark={false} noValidate>
          {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} role="alert" />}
          <Controller
            name="username"
            control={control}
            render={({ field, fieldState }) => (
              <Form.Item label="Ник" validateStatus={fieldState.error ? 'error' : undefined} help={fieldState.error?.message}>
                <Input {...field} autoComplete="username" autoCapitalize="none" />
              </Form.Item>
            )}
          />
          <Controller
            name="password"
            control={control}
            render={({ field, fieldState }) => (
              <Form.Item label="Пароль" validateStatus={fieldState.error ? 'error' : undefined} help={fieldState.error?.message}>
                <Input.Password {...field} autoComplete="current-password" />
              </Form.Item>
            )}
          />
          <Button type="primary" htmlType="submit" block loading={login.isPending}>
            Войти
          </Button>
        </Form>
      </Card>
    </div>
  );
}
