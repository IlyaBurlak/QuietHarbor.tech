import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { WishlistItemDto } from '@wishlist/shared';
import { formatPrice } from '../lib/format';
import { ItemCover } from './item-cover';
import { PriorityStars } from './priority-stars';

interface Props {
  item: WishlistItemDto;
  /** Если задан, вся карточка — ссылка. */
  href?: string;
  /** Кнопки поверх фото (меню, перетаскивание). */
  tools?: ReactNode;
  /** Блок под карточкой (например, бронь). */
  footer?: ReactNode;
  dimmed?: boolean;
}

/** Карточка товара: крупное фото, ниже название, цена и приоритет. */
export function ItemTile({ item, href, tools, footer, dimmed }: Props) {
  const price = formatPrice(item.price, item.currency);
  const title = href ? (
    <Link to={href} className="tile__link">
      {item.title}
    </Link>
  ) : (
    item.title
  );
  return (
    <article className={`tile${dimmed ? ' is-dimmed' : ''}`}>
      <div className="tile__media">
        <ItemCover images={item.images} alt={item.title} />
        {tools && <div className="tile__tools">{tools}</div>}
      </div>
      <h3 className="tile__title">{title}</h3>
      <div className="tile__meta">
        {price && <span className="tile__price">{price}</span>}
        <PriorityStars value={item.priority} />
      </div>
      {footer && <div className="tile__footer">{footer}</div>}
    </article>
  );
}
