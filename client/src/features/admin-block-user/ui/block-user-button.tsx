import { useState } from 'react';
import { App, Button, Form, Input, Modal } from 'antd';
import { useBlockActions } from '@/entities/admin';
import { toApiError } from '@/shared/api';

interface Props {
  user: { id: string; username: string | null; role: 'user' | 'admin'; status: 'active' | 'blocked' };
  size?: 'small' | 'middle';
}

/** «Заблокировать» (с обязательной причиной) и «Разблокировать». У админов кнопок нет. */
export function BlockUserButton({ user, size }: Props) {
  const { message } = App.useApp();
  const { block, unblock } = useBlockActions();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (user.role === 'admin') return null;

  if (user.status === 'blocked') {
    return (
      <Button
        size={size}
        loading={unblock.isPending}
        onClick={async () => {
          try {
            await unblock.mutateAsync(user.id);
            void message.success('Разблокирован');
          } catch (e) {
            void message.error(toApiError(e).message);
          }
        }}
      >
        Разблокировать
      </Button>
    );
  }

  const submit = async () => {
    setError(null);
    try {
      await block.mutateAsync({ id: user.id, reason });
      void message.success('Заблокирован');
      setOpen(false);
      setReason('');
    } catch (e) {
      const api = toApiError(e);
      setError(api.fields?.reason ?? api.message);
    }
  };

  return (
    <>
      <Button danger size={size} onClick={() => setOpen(true)}>
        Заблокировать
      </Button>
      <Modal
        open={open}
        title={`Заблокировать @${user.username ?? ''}?`}
        okText="Заблокировать"
        okButtonProps={{ danger: true, disabled: reason.trim().length < 3 }}
        cancelText="Отмена"
        confirmLoading={block.isPending}
        onOk={() => void submit()}
        onCancel={() => setOpen(false)}
      >
        <p>
          Все сессии закроются, вход станет невозможен, вишлисты скроются. Данные не удаляются, при
          разблокировке всё вернётся.
        </p>
        <Form layout="vertical">
          <Form.Item
            label="Причина (обязательно)"
            validateStatus={error ? 'error' : undefined}
            help={error}
          >
            <Input.TextArea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              autoFocus
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
