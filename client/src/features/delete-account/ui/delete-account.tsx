import { useState } from 'react';
import { Alert, Button, Form, Input, Modal, Typography } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ME_KEY, deleteAccountRequest } from '@/entities/user';
import { toApiError } from '@/shared/api';

export function DeleteAccount({ hasPassword }: { hasPassword: boolean }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const close = () => {
    setOpen(false);
    setPassword('');
    setError(null);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteAccountRequest(hasPassword ? { password } : {});
      qc.clear();
      qc.setQueryData(ME_KEY, null);
      navigate('/login', { replace: true });
    } catch (e) {
      const api = toApiError(e);
      setError(api.fields?.password ?? api.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Typography.Paragraph>
        Будут удалены ваши вишлисты, товары, брони и фото. Это нельзя отменить.
      </Typography.Paragraph>
      <Button danger onClick={() => setOpen(true)}>
        Удалить аккаунт
      </Button>
      <Modal
        open={open}
        onCancel={close}
        title="Удалить аккаунт?"
        okText="Удалить навсегда"
        cancelText="Отмена"
        okButtonProps={{ danger: true, loading: busy, disabled: hasPassword && !password }}
        onOk={submit}
        destroyOnHidden
      >
        <Typography.Paragraph>
          Все данные аккаунта будут удалены безвозвратно.
          {hasPassword && ' Для подтверждения введите пароль.'}
        </Typography.Paragraph>
        {error && (
          <Alert type="error" showIcon message={error} role="alert" style={{ marginBottom: 12 }} />
        )}
        {hasPassword && (
          <Form layout="vertical" onFinish={submit}>
            <Form.Item label="Пароль">
              <Input.Password
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                onPressEnter={submit}
              />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </>
  );
}
