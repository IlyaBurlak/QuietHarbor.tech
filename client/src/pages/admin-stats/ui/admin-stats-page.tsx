import { Alert, Button, Card, Col, Row, Skeleton, Statistic, Table } from 'antd';
import { fmtBytes, useAdminStats } from '@/entities/admin';
import { PageHeader } from '@/shared/ui';
import { RegistrationsChart } from './registrations-chart';

export function AdminStatsPage() {
  const { data, isPending, isError, refetch } = useAdminStats();
  return (
    <>
      <PageHeader title="Статистика" description="Состояние базы и загруженных файлов." />
      {isPending && <Skeleton active paragraph={{ rows: 8 }} />}
      {isError && (
        <Alert type="error" showIcon message="Не удалось загрузить статистику" action={<Button onClick={() => void refetch()}>Повторить</Button>} />
      )}
      {data && (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={12} md={6}>
              <Card><Statistic title="Пользователей" value={data.totals.users} /></Card>
            </Col>
            <Col xs={12} md={6}>
              <Card><Statistic title="Заблокировано" value={data.totals.blocked} /></Card>
            </Col>
            <Col xs={12} md={6}>
              <Card><Statistic title="База данных" value={fmtBytes(data.tables.reduce((s, t) => s + t.bytes, 0))} /></Card>
            </Col>
            <Col xs={12} md={6}>
              <Card><Statistic title="Файлы" value={fmtBytes(data.filesBytes)} /></Card>
            </Col>
          </Row>
          <Card title="Регистрации за 30 дней" style={{ marginTop: 16 }}>
            <RegistrationsChart data={data.registrations} />
          </Card>
          <Card title="Таблицы" style={{ marginTop: 16 }}>
            <Table
              size="small"
              pagination={false}
              rowKey="name"
              dataSource={data.tables}
              scroll={{ x: true }}
              columns={[
                { title: 'Таблица', dataIndex: 'name' },
                { title: 'Записей', dataIndex: 'rows', align: 'right', sorter: (a, b) => a.rows - b.rows },
                { title: 'Размер', dataIndex: 'bytes', align: 'right', sorter: (a, b) => a.bytes - b.bytes, render: fmtBytes },
              ]}
            />
          </Card>
        </>
      )}
    </>
  );
}
