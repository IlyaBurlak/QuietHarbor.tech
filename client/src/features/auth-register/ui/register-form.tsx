import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Col, Form, Input, Row } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  registerRequest,
  useSetCurrentUser,
  useUsernameAvailability,
  UsernameStatusIcon,
  usernameFieldState,
} from '@/entities/user';
import { applyApiError, celebrate } from '@/shared/lib';
import { NewPasswordFields } from '@/shared/ui';
import { registerFormSchema, type RegisterFormValues } from '../model/register-schema';

const FIELDS = ['firstName', 'lastName', 'username', 'password'] as const;

export function RegisterForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const setUser = useSetCurrentUser();
  const [formError, setFormError] = useState<string | null>(null);
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const {
    control,
    handleSubmit,
    setError,
    trigger,
    watch,
    formState: { isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    mode: 'onChange',
    defaultValues: { firstName: '', lastName: '', username: '', password: '', confirmPassword: '' },
  });

  const usernameStatus = useUsernameAvailability(watch('username'));

  const onSubmit = handleSubmit(async ({ confirmPassword: _c, ...values }) => {
    setFormError(null);
    if (usernameStatus === 'taken') {
      setError('username', { type: 'server', message: 'Это имя уже занято' });
      return;
    }
    try {
      const user = await registerRequest(values);
      setUser(user);
      celebrate();
      navigate(from, { replace: true });
    } catch (e) {
      setFormError(applyApiError(e, setError, FIELDS));
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

      <Row gutter={12}>
        <Col xs={24} sm={12}>
          <Controller
            name="firstName"
            control={control}
            render={({ field, fieldState }) => (
              <Form.Item
                label="Имя"
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <Input {...field} autoComplete="given-name" />
              </Form.Item>
            )}
          />
        </Col>
        <Col xs={24} sm={12}>
          <Controller
            name="lastName"
            control={control}
            render={({ field, fieldState }) => (
              <Form.Item
                label="Фамилия"
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <Input {...field} autoComplete="family-name" />
              </Form.Item>
            )}
          />
        </Col>
      </Row>

      <Controller
        name="username"
        control={control}
        render={({ field, fieldState }) => {
          const s = usernameFieldState(fieldState.error?.message, usernameStatus);
          return (
            <Form.Item
              label="Имя пользователя"
              validateStatus={s.validateStatus}
              help={s.message ? <span className={s.hintClass}>{s.message}</span> : undefined}
            >
              <Input
                {...field}
                placeholder="a–z, 0–9, _ и точка, 3–20 символов"
                onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                aria-invalid={s.bad}
                suffix={<UsernameStatusIcon status={s.status} />}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={40}
              />
            </Form.Item>
          );
        }}
      />

      <NewPasswordFields
        control={control}
        trigger={trigger}
        name="password"
        confirmName="confirmPassword"
      />

      <Button type="primary" htmlType="submit" block loading={isSubmitting}>
        Зарегистрироваться
      </Button>
      <p style={{ marginTop: 16, marginBottom: 0 }}>
        Уже есть аккаунт?{' '}
        <Link to="/login" state={location.state}>
          Войти
        </Link>
      </p>
    </Form>
  );
}
