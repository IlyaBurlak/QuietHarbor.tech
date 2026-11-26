import { useState } from 'react';
import { App, Button, Card, Input, Modal, Popconfirm, Segmented, Skeleton, Tag, Typography } from 'antd';
import { Copy } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AdminResetRequest } from '@wishlist/shared';
import {
  fmtDate,
  fmtDateTime,
  PROVIDER_LABEL,
  useResetActions,
  useResetRequests,
} from '@/entities/admin';
import { toApiError } from '@/shared/api';
import { EmptyState, PageHeader } from '@/shared/ui';

const STATUS: Record<AdminResetRequest['status'], { label: string; color: string }> = {
  new: { label: 'Новая', color: 'blue' },
  done: { label: 'Выполнена', color: 'green' },
  rejected: { label: 'Отклонена', color: 'default' },
};

function RequestCard({ r, onLink }: { r: AdminResetRequest; onLink: (url: string) => void }) {
  const { message } = App.useApp();
  const actions = useResetActions();
  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      void message.error(toApiError(e).message);
    }
  };
  return (
    <Card size="small" className="request-card">
      <div className="request-card__head">
        <Typography.Text strong code>{r.code}</Typography.Text>
        <Tag color={STATUS[r.status].color} bordered={false}>{STATUS[r.status].label}</Tag>
        <Typography.Text type="secondary">{fmtDateTime(r.createdAt)}</Typography.Text>
      </div>
      <div className="request-card__cols">
        <section aria-label="Заявка">
          <h3 className="request-card__title">Заявка</h3>
          <dl className="request-card__facts">
            <dt>Ник</dt>
            <dd>
              <strong>@{r.username}</strong>
              {r.user ? (
                <Link to={`/admin/users?open=${r.user.id}`} className="request-card__link">
                  Открыть карточку
                </Link>
              ) : (
                <Tag>такого ника нет</Tag>
              )}
            </dd>
            <dt>Контакт</dt>
            <dd>{r.contact}</dd>
            {r.comment && (
              <>
                <dt>Комментарий</dt>
                <dd>{r.comment}</dd>
              </>
            )}
          </dl>
        </section>
        {r.user && (
          <section aria-label="Аккаунт">
            <h3 className="request-card__title">Аккаунт</h3>
            <dl className="request-card__facts">
              <dt>Регистрация</dt>
              <dd>{fmtDate(r.user.registeredAt)}</dd>
              <dt>Последний вход</dt>
              <dd>{fmtDateTime(r.user.lastLoginAt)}</dd>
              <dt>Способы входа</dt>
              <dd>{r.user.providers.map((p) => PROVIDER_LABEL[p] ?? p).join(', ') || '—'}</dd>
              <dt>Вишлистов</dt>
              <dd>
                {r.user.wishlistsCount}
                {r.user.blocked && (
                  <Tag color="red" style={{ marginLeft: 8 }}>
                    Заблокирован
                  </Tag>
                )}
              </dd>
            </dl>
          </section>
        )}
      </div>
      {r.status === 'new' && (
        <div className="request-card__actions">
          <Button
            type="primary"
            disabled={!r.user}
            loading={actions.link.isPending}
            onClick={() =>
              run(async () => {
                const { url } = await actions.link.mutateAsync(r.id);
                onLink(url);
              })
            }
          >
            Создать ссылку
          </Button>
          <Popconfirm
            title="Отклонить заявку?"
            description="Выданная ссылка, если она есть, перестанет работать."
            okText="Отклонить"
            cancelText="Отмена"
            onConfirm={() => run(() => actions.reject.mutateAsync(r.id))}
          >
            <Button loading={actions.reject.isPending}>Отклонить</Button>
          </Popconfirm>
        </div>
      )}
    </Card>
  );
}

export function AdminRequestsPage() {
  const { message } = App.useApp();
  const [status, setStatus] = useState<'new' | 'done' | 'rejected'>('new');
  const { data, isPending } = useResetRequests(status);
  const [link, setLink] = useState<string | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link!);
      void message.success('Ссылка скопирована');
    } catch {
      void message.error('Не удалось скопировать — выделите ссылку вручную');
    }
  };

  return (
    <>
      <PageHeader title="Заявки" description="Заявки на сброс пароля. Ссылку отправьте человеку в соцсети: она живёт 24 часа и работает один раз." />
      <Segmented
        value={status}
        onChange={setStatus}
        options={[
          { value: 'new', label: 'Новые' },
          { value: 'done', label: 'Выполненные' },
          { value: 'rejected', label: 'Отклонённые' },
        ]}
        style={{ marginBottom: 16 }}
        aria-label="Статус заявок"
      />
      {isPending && <Skeleton active paragraph={{ rows: 4 }} />}
      {data && data.length === 0 && <EmptyState text="Заявок нет." />}
      <div className="request-list">
        {data?.map((r) => <RequestCard key={r.id} r={r} onLink={setLink} />)}
      </div>
      <Modal
        open={!!link}
        title="Ссылка для сброса пароля"
        footer={null}
        onCancel={() => setLink(null)}
        destroyOnHidden
      >
        <p>Действует 24 часа, один раз. Отправьте её человеку в соцсети. Эта ссылка больше не будет показана.</p>
        <div className="copy-row">
          <Input readOnly value={link ?? ''} aria-label="Ссылка сброса" onFocus={(e) => e.target.select()} />
          <Button icon={<Copy size={16} aria-hidden />} onClick={() => void copy()} aria-label="Скопировать ссылку" />
        </div>
      </Modal>
    </>
  );
}
