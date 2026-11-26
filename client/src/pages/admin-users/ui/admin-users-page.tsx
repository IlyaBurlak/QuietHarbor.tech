import { useState } from 'react';
import { Alert, Descriptions, Drawer, Input, Segmented, Skeleton, Table, Tag } from 'antd';
import type { AdminUserRow } from '@wishlist/shared';
import {
  fmtDate,
  fmtDateTime,
  PROVIDER_LABEL,
  useAdminUser,
  useAdminUsers,
  type UsersParams,
} from '@/entities/admin';
import { BlockUserButton } from '@/features/admin-block-user';
import { useDebouncedValue } from '@/shared/lib';
import { PageHeader } from '@/shared/ui';

const providers = (list: string[]) => list.map((p) => PROVIDER_LABEL[p] ?? p).join(', ') || '—';
const StatusTag = ({ status }: { status: 'active' | 'blocked' }) =>
  status === 'blocked' ? <Tag color="red">Заблокирован</Tag> : <Tag color="green">Активен</Tag>;

function UserCard({ id }: { id: string }) {
  const { data: u, isPending, isError } = useAdminUser(id);
  if (isPending) return <Skeleton active />;
  if (isError || !u) return <Alert type="error" message="Не удалось загрузить карточку" />;
  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <BlockUserButton user={u} />
      </div>
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="Ник">{u.username ? `@${u.username}` : '—'}</Descriptions.Item>
        <Descriptions.Item label="ФИО">{u.fullName}</Descriptions.Item>
        <Descriptions.Item label="Роль">{u.role === 'admin' ? 'Администратор' : 'Пользователь'}</Descriptions.Item>
        <Descriptions.Item label="Статус"><StatusTag status={u.status} /></Descriptions.Item>
        <Descriptions.Item label="Регистрация">{fmtDate(u.createdAt)}</Descriptions.Item>
        <Descriptions.Item label="Последний вход">{fmtDateTime(u.lastLoginAt)}</Descriptions.Item>
        <Descriptions.Item label="Способы входа">{providers(u.providers)}</Descriptions.Item>
        <Descriptions.Item label="Вишлистов">{u.wishlistsCount}</Descriptions.Item>
        <Descriptions.Item label="Товаров">{u.itemsCount}</Descriptions.Item>
        <Descriptions.Item label="Броней">{u.reservationsCount}</Descriptions.Item>
        <Descriptions.Item label="Групп">{u.groupsCount}</Descriptions.Item>
        <Descriptions.Item label="Заявок на сброс">{u.resetRequestsCount}</Descriptions.Item>
      </Descriptions>
      {u.blocked && (
        <Alert
          style={{ marginTop: 16 }}
          type="warning"
          showIcon
          message={`Заблокирован ${fmtDate(u.blocked.at)}${u.blocked.by ? `, админ @${u.blocked.by}` : ''}`}
          description={u.blocked.reason ?? 'Причина не указана'}
        />
      )}
    </>
  );
}

export function AdminUsersPage({ initialUserId }: { initialUserId?: string }) {
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim().toLowerCase().replace(/^@/, ''), 300);
  const [params, setParams] = useState<Omit<UsersParams, 'q'>>({
    status: 'all',
    sort: 'createdAt',
    dir: 'desc',
    page: 1,
    pageSize: 20,
  });
  const [openId, setOpenId] = useState<string | null>(initialUserId ?? null);
  const { data, isFetching } = useAdminUsers({ ...params, q: q || undefined });

  return (
    <>
      <PageHeader title="Пользователи" count={data?.total} />
      <div className="admin-filters">
        <Input.Search
          placeholder="Поиск по нику"
          allowClear
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setParams((p) => ({ ...p, page: 1 }));
          }}
          aria-label="Поиск по нику"
          style={{ maxWidth: 280 }}
        />
        <Segmented<UsersParams['status']>
          value={params.status}
          onChange={(status) => setParams((p) => ({ ...p, status, page: 1 }))}
          options={[
            { value: 'all', label: 'Все' },
            { value: 'active', label: 'Активные' },
            { value: 'blocked', label: 'Заблокированные' },
          ]}
          aria-label="Фильтр по статусу"
        />
      </div>
      <Table<AdminUserRow>
        rowKey="id"
        size="middle"
        loading={isFetching}
        dataSource={data?.users}
        scroll={{ x: 900 }}
        onRow={(r) => ({ onClick: () => setOpenId(r.id), style: { cursor: 'pointer' } })}
        onChange={(_p, _f, sorter) => {
          const s = Array.isArray(sorter) ? sorter[0] : sorter;
          if (s?.field && s.order) {
            setParams((p) => ({
              ...p,
              sort: s.field as UsersParams['sort'],
              dir: s.order === 'ascend' ? 'asc' : 'desc',
              page: 1,
            }));
          }
        }}
        pagination={{
          current: params.page,
          pageSize: params.pageSize,
          total: data?.total,
          showSizeChanger: false,
          onChange: (page) => setParams((p) => ({ ...p, page })),
        }}
        columns={[
          { title: 'Ник', dataIndex: 'username', render: (v: string | null) => (v ? `@${v}` : '—') },
          { title: 'ФИО', dataIndex: 'fullName' },
          { title: 'Роль', dataIndex: 'role', render: (v: string) => (v === 'admin' ? 'Админ' : 'Пользователь') },
          { title: 'Статус', dataIndex: 'status', render: (v: 'active' | 'blocked') => <StatusTag status={v} /> },
          {
            title: 'Регистрация',
            dataIndex: 'createdAt',
            sorter: true,
            sortOrder: params.sort === 'createdAt' ? (params.dir === 'asc' ? 'ascend' : 'descend') : null,
            render: fmtDate,
          },
          {
            title: 'Последний вход',
            dataIndex: 'lastLoginAt',
            sorter: true,
            sortOrder: params.sort === 'lastLoginAt' ? (params.dir === 'asc' ? 'ascend' : 'descend') : null,
            render: fmtDateTime,
          },
          { title: 'Вход', dataIndex: 'providers', render: providers },
          { title: 'Вишлистов', dataIndex: 'wishlistsCount', align: 'right' },
          {
            title: '',
            key: 'act',
            render: (_: unknown, r) => (
              <span onClick={(e) => e.stopPropagation()}>
                <BlockUserButton user={r} size="small" />
              </span>
            ),
          },
        ]}
      />
      <Drawer
        open={!!openId}
        onClose={() => setOpenId(null)}
        width={420}
        title="Карточка пользователя"
        destroyOnHidden
      >
        {openId && <UserCard id={openId} />}
      </Drawer>
    </>
  );
}
