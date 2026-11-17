import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Form, Input, Typography } from 'antd';
import { CheckOutlined, CopyOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { passwordResetRequestSchema, type PasswordResetRequestInput } from '@wishlist/shared';
import { usePublicConfig } from '@/shared/api';
import { applyApiError } from '@/shared/lib';
import { StatusMessage } from '@/shared/ui';
import { requestPasswordReset } from '../api/request-reset';

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* буфер недоступен — код можно выделить вручную */
    }
  };
  return (
    <div className="code-block">
      <code aria-label={`Код заявки ${code}`}>{code}</code>
      <Button
        type="text"
        size="small"
        onClick={copy}
        icon={copied ? <CheckOutlined /> : <CopyOutlined />}
      >
        {copied ? 'Скопировано' : 'Скопировать код'}
      </Button>
      <span className="sr-only" aria-live="polite">
        {copied ? 'Код скопирован' : ''}
      </span>
    </div>
  );
}

export function ResetRequestForm() {
  const [code, setCode] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { data: config } = usePublicConfig();

  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<PasswordResetRequestInput>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: { username: '', contact: '', comment: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      setCode(await requestPasswordReset(values));
    } catch (e) {
      setFormError(applyApiError(e, setError, ['username', 'contact', 'comment']));
    }
  });

  if (code) {
    return (
      <StatusMessage
        kind="success"
        title="Заявка отправлена"
        text="Отправьте этот код администратору. Он проверит заявку и пришлёт ссылку для нового пароля, она действует 24 часа."
      >
        <CodeBlock code={code} />
        {config?.supportContactUrl && (
          <Button
            type="primary"
            block
            href={config.supportContactUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Написать администратору
          </Button>
        )}
        <Link to="/login" className="status-message__link">
          Вернуться ко входу
        </Link>
      </StatusMessage>
    );
  }

  return (
    <Form layout="vertical" onFinish={onSubmit} requiredMark={false} noValidate>
      <Typography.Paragraph type="secondary">
        Пароль нельзя восстановить, его сбрасывает администратор. Оставьте заявку, и вы получите
        одноразовую ссылку. Если к аккаунту привязана соцсеть, можно просто войти через неё.
      </Typography.Paragraph>
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
        name="contact"
        control={control}
        render={({ field, fieldState }) => (
          <Form.Item
            label="Как с вами связаться"
            validateStatus={fieldState.error ? 'error' : undefined}
            help={fieldState.error?.message}
          >
            <Input {...field} placeholder="@telegram, ссылка на соцсеть или телефон" />
          </Form.Item>
        )}
      />
      <Controller
        name="comment"
        control={control}
        render={({ field, fieldState }) => (
          <Form.Item
            label="Комментарий (необязательно)"
            validateStatus={fieldState.error ? 'error' : undefined}
            help={fieldState.error?.message}
          >
            <Input.TextArea {...field} rows={3} placeholder="Например, когда регистрировались" />
          </Form.Item>
        )}
      />
      <Button type="primary" htmlType="submit" block loading={isSubmitting}>
        Отправить заявку
      </Button>
      <p style={{ marginTop: 16, marginBottom: 0 }}>
        <Link to="/login">Вернуться ко входу</Link>
      </p>
    </Form>
  );
}
