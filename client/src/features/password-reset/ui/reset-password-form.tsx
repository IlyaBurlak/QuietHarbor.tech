import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Form } from 'antd';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { passwordSchema } from '@wishlist/shared';
import { toApiError } from '@/shared/api';
import { NewPasswordFields, StatusMessage } from '@/shared/ui';
import { resetPasswordRequest } from '../api/reset-password';

const schema = z
  .object({ password: passwordSchema, confirmPassword: z.string().min(1, 'Повторите пароль') })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Пароли не совпадают',
  });
type Values = z.infer<typeof schema>;

const LINK_PROBLEMS: Record<string, { title: string; text: string }> = {
  RESET_TOKEN_EXPIRED: {
    title: 'Ссылка устарела',
    text: 'Ссылка действует 24 часа. Оставьте новую заявку.',
  },
  RESET_TOKEN_USED: {
    title: 'Ссылка уже использована',
    text: 'Одноразовая ссылка сработала раньше. Если это были не вы, оставьте новую заявку.',
  },
  RESET_TOKEN_INVALID: {
    title: 'Ссылка недействительна',
    text: 'Проверьте, что скопировали ссылку целиком, или оставьте новую заявку.',
  },
};

export function ResetPasswordForm({ token }: { token: string }) {
  const [problem, setProblem] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    control,
    handleSubmit,
    trigger,
    formState: { isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async ({ password }) => {
    setFormError(null);
    try {
      await resetPasswordRequest({ token, password });
      setDone(true);
    } catch (e) {
      const api = toApiError(e);
      if (api.code in LINK_PROBLEMS) setProblem(api.code);
      else setFormError(api.fields?.password ?? api.message);
    }
  });

  if (done) {
    return (
      <StatusMessage
        kind="success"
        title="Пароль изменён"
        text="Все прежние сессии закрыты. Войдите с новым паролем."
      >
        <Link to="/login">
          <Button type="primary" block>
            Войти
          </Button>
        </Link>
      </StatusMessage>
    );
  }

  if (problem) {
    const p = LINK_PROBLEMS[problem]!;
    return (
      <StatusMessage kind="warning" title={p.title} text={p.text}>
        <Link to="/forgot-password">
          <Button type="primary" block>
            Оставить новую заявку
          </Button>
        </Link>
      </StatusMessage>
    );
  }

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
      <NewPasswordFields
        control={control}
        trigger={trigger}
        name="password"
        confirmName="confirmPassword"
        passwordLabel="Новый пароль"
      />
      <Button type="primary" htmlType="submit" block loading={isSubmitting}>
        Сохранить пароль
      </Button>
    </Form>
  );
}
