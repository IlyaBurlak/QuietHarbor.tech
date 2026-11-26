import { Button, Card, Result, Skeleton, Tag, Typography } from 'antd';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatBudget, formatDate, useGroups } from '@/entities/group';
import { EmptyState, PageHeader } from '@/shared/ui';

export function SantaListPage() {
  const { data, isPending, isError, refetch } = useGroups();
  return (
    <>
      <PageHeader
        title="Тайный Санта"
        count={data?.length || undefined}
        description="Ваши игры. Каждый видит только того, кому дарит подарок."
        actions={
          <Link to="/santa/new">
            <Button type="primary" icon={<Plus size={16} aria-hidden />}>
              Создать игру
            </Button>
          </Link>
        }
      />
      {isPending && <Skeleton active paragraph={{ rows: 4 }} />}
      {isError && (
        <Result
          status="error"
          title="Не удалось загрузить игры"
          extra={<Button onClick={() => void refetch()}>Повторить</Button>}
        />
      )}
      {data && data.length === 0 && (
        <EmptyState text="Вы пока не участвуете ни в одной игре. Создайте свою или откройте ссылку-приглашение.">
          <Link to="/santa/new">
            <Button type="primary">Создать игру</Button>
          </Link>
        </EmptyState>
      )}
      {data && data.length > 0 && (
        <div className="wishlist-grid">
          {data.map((g) => (
            <Card key={g.id} className="wishlist-card" hoverable>
              <div className="wishlist-card__head">
                <Link to={`/santa/${g.id}`} className="wishlist-card__title">
                  {g.title}
                </Link>
                <Tag color={g.status === 'drawn' ? 'green' : 'blue'} bordered={false}>
                  {g.status === 'drawn' ? 'Жеребьёвка проведена' : 'Набор участников'}
                </Tag>
              </div>
              <div className="wishlist-card__meta">
                <Typography.Text type="secondary">{g.membersCount} участн.</Typography.Text>
                {formatBudget(g.budget, g.currency) && (
                  <Typography.Text type="secondary">
                    Бюджет {formatBudget(g.budget, g.currency)}
                  </Typography.Text>
                )}
                {g.exchangeDate && (
                  <Typography.Text type="secondary">
                    Обмен {formatDate(g.exchangeDate)}
                  </Typography.Text>
                )}
                {g.isOwner && <Tag bordered={false}>Организатор</Tag>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
