import { useState } from 'react';
import { Table, Typography } from 'antd';
import type { AdminAuditEntry } from '@wishlist/shared';
import { AUDIT_LABEL, fmtDateTime, useAudit } from '@/entities/admin';
import { PageHeader } from '@/shared/ui';

const meta = (m: AdminAuditEntry['meta']) =>
  m ? Object.entries(m).map(([k, v]) => `${k === 'reason' ? 'причина' : k === 'code' ? 'код' : k}: ${String(v)}`).join('; ') : '';

export function AdminAuditPage() {
  const [page, setPage] = useState(1);
  const { data, isFetching } = useAudit(page, 30);
  return (
    <>
      <PageHeader title="Журнал действий" count={data?.total} description="Входы, блокировки и работа с заявками." />
      <Table<AdminAuditEntry>
        rowKey="id"
        loading={isFetching}
        dataSource={data?.entries}
        scroll={{ x: 700 }}
        pagination={{ current: page, pageSize: 30, total: data?.total, showSizeChanger: false, onChange: setPage }}
        columns={[
          { title: 'Время', dataIndex: 'createdAt', render: fmtDateTime, width: 190 },
          { title: 'Админ', dataIndex: 'admin', render: (v: string | null) => (v ? `@${v}` : '—') },
          { title: 'Действие', dataIndex: 'action', render: (v: string) => AUDIT_LABEL[v] ?? v },
          { title: 'Пользователь', dataIndex: 'target', render: (v: string | null) => (v ? `@${v}` : '—') },
          { title: 'Детали', dataIndex: 'meta', render: (m: AdminAuditEntry['meta']) => <Typography.Text type="secondary">{meta(m)}</Typography.Text> },
        ]}
      />
    </>
  );
}
