import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Form, Input } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { loginSchema, type LoginInput } from '@wishlist/shared';
import { loginRequest, useSetCurrentUser } from '@/entities/user';
import { applyApiError } from '@/shared/lib';

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const setUser = useSetCurrentUser();
  const [formError, setFormError] = useState<string | null>(null);
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const user = await loginRequest(values);
      setUser(user);
      navigate(from, { replace: true });
    } catch (e) {
      setFormError(applyApiError(e, setError, ['username', 'password']));
    }
  });

  return (
    <Form layout="vertical" onFinish={onSubmit} requiredMark={false} noValidate>
      {formError && (
        <Alert
          type="error"
          showIcon
          message={formError}
          style={{ marginBottom: 16 }}
          role="alert"
        />
      )}
      <Controller
        name="username"
        control={control}
        render={({ field, fieldState }) => (
          <Form.Item
            label="Имя пользователя"
            validateStatus={fieldState.error ? 'error' : undefined}
            help={fieldState.error?.message}
          >
            <Input {...field} autoComplete="username" autoCapitalize="none" spellCheck={false} />
          </Form.Item>
        )}
      />
      <Controller
        name="password"
        control={control}
        render={({ field, fieldState }) => (
          <Form.Item
            label="Пароль"
            validateStatus={fieldState.error ? 'error' : undefined}
            help={fieldState.error?.message}
          >
            <Input.Password {...field} autoComplete="current-password" />
          </Form.Item>
        )}
      />
      <Button type="primary" htmlType="submit" block loading={isSubmitting}>
        Войти
      </Button>
      <p style={{ marginTop: 16, marginBottom: 8 }}>
        <Link to="/forgot-password">Забыли пароль?</Link>
      </p>
      <p style={{ marginBottom: 0 }}>
        Нет аккаунта?{' '}
        <Link to="/register" state={location.state}>
          Зарегистрироваться
        </Link>
      </p>
    </Form>
  );
}
