import { Button, Card, Result, Skeleton, Typography } from 'antd';
import { Gift } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { GroupDetail } from '@wishlist/shared';
import { PersonRow } from '@/entities/friend';
import { useMyRecipient } from '@/entities/group';
import { ItemTile } from '@/entities/wishlist';
import { MyWishlistSelect } from '@/features/group-my-wishlist';

/** Страница группы после жеребьёвки: «Вы дарите …» и вишлист получателя. */
export function GroupResult({ group }: { group: GroupDetail }) {
  const { data, isPending, isError, refetch } = useMyRecipient(group.id, true);

  return (
    <div className="group-sections">
      {isPending && <Skeleton active paragraph={{ rows: 3 }} />}
      {isError && (
        <Result
          status="error"
          title="Не удалось узнать, кому вы дарите"
          extra={<Button onClick={() => void refetch()}>Повторить</Button>}
        />
      )}
      {data && (
        <Card className="recipient-card">
          <Typography.Text type="secondary">
            <Gift size={14} aria-hidden style={{ verticalAlign: -2 }} /> Вы дарите подарок
          </Typography.Text>
          <ul className="person-list recipient-card__person">
            <PersonRow user={data.recipient} />
          </ul>
          <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
            Никому не рассказывайте, кому вы дарите: это тайна. Даже организатор не знает ваших пар.
          </Typography.Paragraph>
        </Card>
      )}

      {data && (
        <section aria-labelledby="recipient-wishlist">
          <h2 id="recipient-wishlist" className="section-title">
            {data.wishlist ? `Вишлист: ${data.wishlist.title}` : 'Вишлист получателя'}
          </h2>
          {!data.wishlist && (
            <p className="muted">
              Получатель не прикрепил вишлист. Можно подсказать ему сделать это или посмотреть его
              профиль{' '}
              {data.recipient.username && (
                <Link to={`/u/${data.recipient.username}`}>@{data.recipient.username}</Link>
              )}
              .
            </p>
          )}
          {data.wishlist && data.wishlist.items.length === 0 && (
            <p className="muted">В вишлисте пока нет желаний.</p>
          )}
          {data.wishlist && data.wishlist.items.length > 0 && (
            <ul className="item-grid">
              {data.wishlist.items.map((item) => (
                <li key={item.id} className="item-grid__cell">
                  <ItemTile
                    item={item}
                    footer={
                      item.url ? (
                        <a href={item.url} target="_blank" rel="noopener noreferrer nofollow">
                          В магазин
                        </a>
                      ) : undefined
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <Card title="Мой вишлист для моего Санты">
        <MyWishlistSelect groupId={group.id} value={group.myWishlistId} />
      </Card>
    </div>
  );
}
