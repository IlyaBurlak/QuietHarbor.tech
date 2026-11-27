import type { ReactNode } from 'react';
import { Card, Tag, Typography } from 'antd';
import { CalendarDays, EyeOff, Link2, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { WishlistDto, WishlistVisibility } from '@wishlist/shared';
import { VISIBILITY_LABEL } from '../config/labels';

const ICONS: Record<WishlistVisibility, ReactNode> = {
  private: <EyeOff size={14} aria-hidden />,
  link: <Link2 size={14} aria-hidden />,
  friends: <Users size={14} aria-hidden />,
};

const plural = (n: number) =>
  n % 10 === 1 && n % 100 !== 11
    ? 'желание'
    : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)
      ? 'желания'
      : 'желаний';

/** Карточка вишлиста: название, число товаров, приватность и действия справа. */
export function WishlistCard({
  wishlist,
  actions,
  href = `/lists/${wishlist.id}`,
}: {
  wishlist: Pick<WishlistDto, 'id' | 'title' | 'description' | 'eventDate' | 'itemsCount'> &
    Partial<Pick<WishlistDto, 'visibility'>>;
  actions?: ReactNode;
  href?: string;
}) {
  return (
    <Card className="wishlist-card" hoverable>
      <div className="wishlist-card__head">
        <Link to={href} className="wishlist-card__title">
          {wishlist.title}
        </Link>
        {actions}
      </div>
      {wishlist.description && (
        <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ marginBottom: 8 }}>
          {wishlist.description}
        </Typography.Paragraph>
      )}
      <div className="wishlist-card__meta">
        {wishlist.visibility && (
          <Tag bordered={false} icon={ICONS[wishlist.visibility]}>
            {VISIBILITY_LABEL[wishlist.visibility]}
          </Tag>
        )}
        <Typography.Text type="secondary">
          {wishlist.itemsCount} {plural(wishlist.itemsCount)}
        </Typography.Text>
        {wishlist.eventDate && (
          <Typography.Text type="secondary">
            <CalendarDays size={14} aria-hidden style={{ verticalAlign: -2 }} />{' '}
            {new Date(wishlist.eventDate).toLocaleDateString('ru-RU')}
          </Typography.Text>
        )}
      </div>
    </Card>
  );
}
