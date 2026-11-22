import { Button, Card, Result, Skeleton, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { UserAvatar } from '@/entities/user';
import { ItemCover, formatPrice, useMyReservations } from '@/entities/wishlist';
import { EmptyState, PageHeader } from '@/shared/ui';

export function GiftsPage() {
  const { data, isPending, isError, refetch } = useMyReservations();
  return (
    <>
      <PageHeader
        title="Забронировано мной"
        description="Подарки, которые вы выбрали. Владелец списка об этом не знает."
      />
      {isPending && <Skeleton active paragraph={{ rows: 5 }} />}
      {isError && (
        <Result
          status="error"
          title="Не удалось загрузить подарки"
          extra={<Button onClick={() => void refetch()}>Повторить</Button>}
        />
      )}
      {data && data.groups.length === 0 && (
        <EmptyState text="Вы пока ничего не бронировали. Откройте вишлист друга и выберите подарок." />
      )}
      {data?.groups.map((g) => (
        <section key={g.wishlist.id} className="calendar-group" aria-labelledby={`g-${g.wishlist.id}`}>
          <div className="gift-group__head">
            <UserAvatar fullName={g.owner.fullName} avatarKey={g.owner.avatarKey} size={36} />
            <h2 id={`g-${g.wishlist.id}`} className="section-title" style={{ margin: 0 }}>
              <Link to={`/w/${g.wishlist.shareSlug}`}>{g.owner.fullName}: {g.wishlist.title}</Link>
            </h2>
          </div>
          <ul className="item-grid">
            {g.items.map((item) => (
              <li key={item.id} className="item-grid__cell">
                <Card size="small" className="item-card" cover={<ItemCover images={item.images} alt={item.title} />}>
                  <Typography.Text strong>{item.title}</Typography.Text>
                  <div className="item-card__meta">
                    <Typography.Text>{formatPrice(item.price, item.currency)}</Typography.Text>
                    <Tag color={item.status === 'bought' ? 'green' : 'blue'} bordered={false}>
                      {item.status === 'bought' ? 'Куплено' : 'Забронировано'}
                    </Tag>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
