import { Button, Result, Skeleton, Typography } from 'antd';
import { ExternalLink } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { UserAvatar } from '@/entities/user';
import { ItemTile, usePublicWishlist } from '@/entities/wishlist';
import { ReserveControls } from '@/features/reserve-item';
import { EmptyState } from '@/shared/ui';

export function PublicWishlistPage() {
  const { slug = '' } = useParams();
  const { data, isPending, isError } = usePublicWishlist(slug);

  if (isPending) return <Skeleton active paragraph={{ rows: 6 }} />;
  if (isError || !data) {
    return (
      <Result
        status="404"
        title="Вишлист не найден"
        subTitle="Ссылка устарела, или владелец ограничил доступ."
        extra={
          <Link to="/">
            <Button>На главную</Button>
          </Link>
        }
      />
    );
  }
  const { wishlist, owner, items, isOwner } = data;

  return (
    <>
      <header className="public-head">
        <UserAvatar fullName={owner.fullName} avatarKey={owner.avatarKey} size={56} />
        <div>
          <h1 className="page-title">{wishlist.title}</h1>
          <Typography.Text type="secondary">
            {owner.fullName}
            {owner.username ? ` · @${owner.username}` : ''}
            {wishlist.eventDate
              ? ` · ${new Date(wishlist.eventDate).toLocaleDateString('ru-RU')}`
              : ''}
          </Typography.Text>
          {wishlist.description && <p className="page-header__desc">{wishlist.description}</p>}
        </div>
        {isOwner && (
          <Link to={`/lists/${wishlist.id}`} className="public-head__edit">
            <Button>Открыть как владелец</Button>
          </Link>
        )}
      </header>

      {items.length === 0 ? (
        <EmptyState text="В этом вишлисте пока нет желаний." />
      ) : (
        <ul className="item-grid">
          {items.map((item) => {
            const taken = !!item.reservation && item.reservation.status !== 'free';
            return (
              <li key={item.id} className="item-grid__cell">
                <ItemTile
                  item={item}
                  dimmed={taken}
                  footer={
                    <>
                      {item.note && <Typography.Text type="secondary">{item.note}</Typography.Text>}
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noopener noreferrer nofollow" className="shop-link">
                          В магазин <ExternalLink size={14} aria-hidden />
                        </a>
                      )}
                      {item.links.length > 0 && (
                        <ul className="similar-links">
                          {item.links.map((l) => (
                            <li key={l.id}>
                              <a href={l.url} target="_blank" rel="noopener noreferrer nofollow">
                                {l.label || l.url}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                      {!isOwner && <ReserveControls item={item} slug={slug} />}
                    </>
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
