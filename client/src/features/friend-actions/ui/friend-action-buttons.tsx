import { App, Button, Popconfirm, Space } from 'antd';
import type { Relation } from '@wishlist/shared';
import { useFriendActions } from '@/entities/friend';
import { toApiError } from '@/shared/api';

interface Props {
  relation: Relation;
  username: string;
  userId: string;
  /** Id заявки для входящей и исходящей связи. */
  requestId: string | null;
  size?: 'small' | 'middle';
}

/** Кнопки по состоянию связи: добавить, отозвать, принять/отклонить, удалить из друзей. */
export function FriendActionButtons({ relation, username, userId, requestId, size }: Props) {
  const { message } = App.useApp();
  const a = useFriendActions();

  const run = async (action: () => Promise<unknown>, ok: string) => {
    try {
      await action();
      void message.success(ok);
    } catch (e) {
      void message.error(toApiError(e).message);
    }
  };

  switch (relation) {
    case 'self':
      return null;
    case 'friend':
      return (
        <Popconfirm
          title="Удалить из друзей?"
          description="Человек перестанет видеть ваши вишлисты «для друзей»."
          okText="Удалить"
          cancelText="Отмена"
          onConfirm={() => run(() => a.remove.mutateAsync(userId), 'Удалён из друзей')}
        >
          <Button size={size} loading={a.remove.isPending}>
            Удалить из друзей
          </Button>
        </Popconfirm>
      );
    case 'outgoing':
      return (
        <Button
          size={size}
          loading={a.cancel.isPending}
          onClick={() => run(() => a.cancel.mutateAsync(requestId!), 'Заявка отозвана')}
        >
          Отозвать заявку
        </Button>
      );
    case 'incoming':
      return (
        <Space wrap>
          <Button
            type="primary"
            size={size}
            loading={a.accept.isPending}
            onClick={() => run(() => a.accept.mutateAsync(requestId!), 'Теперь вы друзья')}
          >
            Принять
          </Button>
          <Button
            size={size}
            loading={a.decline.isPending}
            onClick={() => run(() => a.decline.mutateAsync(requestId!), 'Заявка отклонена')}
          >
            Отклонить
          </Button>
        </Space>
      );
    default:
      return (
        <Button
          type="primary"
          size={size}
          loading={a.send.isPending}
          onClick={() => run(() => a.send.mutateAsync(username), 'Заявка отправлена')}
        >
          Добавить в друзья
        </Button>
      );
  }
}
