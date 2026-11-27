import { useState } from 'react';
import { Badge, Button, Popover, Skeleton, Typography } from 'antd';
import { Bell, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  describeNotification,
  useMarkRead,
  useNotifications,
  useNotificationSummary,
} from '@/entities/notification';
import { UserAvatar } from '@/entities/user';

const when = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

function NoticeList({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { data, isPending, isError, refetch } = useNotifications();
  const { data: summary } = useNotificationSummary();
  const mark = useMarkRead();

  return (
    <div className="notice-pop">
      <div className="notice-pop__head">
        <strong>Уведомления</strong>
        {!!summary?.unread && (
          <Button
            type="text"
            size="small"
            icon={<CheckCheck size={14} aria-hidden />}
            loading={mark.all.isPending}
            onClick={() => mark.all.mutate()}
          >
            Прочитать все
          </Button>
        )}
      </div>
      {isPending && <Skeleton active paragraph={{ rows: 3 }} title={false} />}
      {isError && (
        <p role="alert">
          Не удалось загрузить.{' '}
          <Button type="link" size="small" onClick={() => void refetch()}>
            Повторить
          </Button>
        </p>
      )}
      {data && data.length === 0 && <p className="muted notice-pop__empty">Пока ничего нового.</p>}
      {data && data.length > 0 && (
        <ul className="notice-list">
          {data.slice(0, 15).map((n) => {
            const { text, to } = describeNotification(n);
            return (
              <li key={n.id}>
                <button
                  type="button"
                  className={`notice${n.read ? '' : ' is-unread'}`}
                  onClick={() => {
                    if (!n.read) mark.one.mutate(n.id);
                    onClose();
                    navigate(to);
                  }}
                >
                  {n.actor ? (
                    <UserAvatar fullName={n.actor.fullName} avatarKey={n.actor.avatarKey} size={36} />
                  ) : (
                    <span className="notice__icon" aria-hidden>
                      <Bell size={18} />
                    </span>
                  )}
                  <span className="notice__text">
                    <Typography.Text strong={!n.read}>{text}</Typography.Text>
                    <Typography.Text type="secondary">{when(n.createdAt)}</Typography.Text>
                  </span>
                  {!n.read && <span className="notice__dot" aria-label="Не прочитано" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="muted notice-pop__foot">О бронях подарков здесь ничего нет: это сюрприз.</p>
    </div>
  );
}

/** Колокольчик с числом непрочитанных; по нажатию рядом открывается небольшое окно со списком. */
export function NotificationsPopover() {
  const [open, setOpen] = useState(false);
  const { data: summary } = useNotificationSummary();
  const unread = summary?.unread ?? 0;

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomRight"
      arrow={false}
      destroyOnHidden
      overlayClassName="notice-popover"
      content={<NoticeList onClose={() => setOpen(false)} />}
    >
      <button
        type="button"
        className="circle-btn"
        aria-label={unread > 0 ? `Уведомления, непрочитанных: ${unread}` : 'Уведомления'}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Badge count={unread} size="small" offset={[2, -2]}>
          <Bell size={22} aria-hidden />
        </Badge>
      </button>
    </Popover>
  );
}
