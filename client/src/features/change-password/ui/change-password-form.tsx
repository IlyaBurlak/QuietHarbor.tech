import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, App, Button, Form, Input } from 'antd';
import { z } from 'zod';
import { passwordSchema } from '@wishlist/shared';
import { changePasswordRequest } from '@/entities/user';
import { applyApiError } from '@/shared/lib';
import { NewPasswordFields } from '@/shared/ui';

export function ChangePasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const { message } = App.useApp();
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z
        .object({
          currentPassword: hasPassword
            ? z.string().min(1, 'Введите текущий пароль')
            : z.string().optional(),
          newPassword: passwordSchema,
          confirmPassword: z.string().min(1, 'Повторите пароль'),
        })
        .refine((v) => v.newPassword === v.confirmPassword, {
          path: ['confirmPassword'],
          message: 'Пароли не совпадают',
        }),
    [hasPassword],
  );
  type Values = z.infer<typeof schema>;

  const {
    control,
    handleSubmit,
    setError,
    trigger,
    reset,
    formState: { isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async ({ currentPassword, newPassword }) => {
    setFormError(null);
    try {
      await changePasswordRequest({
        newPassword,
        ...(hasPassword ? { currentPassword } : {}),
      });
      reset();
      void message.success('Пароль изменён. На других устройствах нужно войти заново');
    } catch (e) {
      setFormError(applyApiError(e, setError, ['currentPassword', 'newPassword']));
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
      {hasPassword && (
        <Controller
          name="currentPassword"
          control={control}
          render={({ field, fieldState }) => (
            <Form.Item
              label="Текущий пароль"
              validateStatus={fieldState.error ? 'error' : undefined}
              help={fieldState.error?.message}
            >
              <Input.Password
                {...field}
                value={field.value ?? ''}
                autoComplete="current-password"
              />
            </Form.Item>
          )}
        />
      )}
      <NewPasswordFields
        control={control}
        trigger={trigger}
        name="newPassword"
        confirmName="confirmPassword"
        passwordLabel={hasPassword ? 'Новый пароль' : 'Пароль'}
      />
      <Button type="primary" htmlType="submit" loading={isSubmitting}>
        {hasPassword ? 'Сменить пароль' : 'Задать пароль'}
      </Button>
    </Form>
  );
}
