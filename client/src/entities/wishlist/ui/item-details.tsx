import { useRef, useState, type KeyboardEvent, type ReactNode, type TouchEvent } from 'react';
import { Typography } from 'antd';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import type { WishlistItemDto } from '@wishlist/shared';
import { fileUrl } from '@/shared/lib';
import { PRIORITY_LABEL } from '../config/labels';
import { formatPrice } from '../lib/format';
import { ItemCover } from './item-cover';
import { PriorityStars } from './priority-stars';

export function ItemDetails({ item, header }: { item: WishlistItemDto; header?: ReactNode }) {
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);
  const count = item.images.length;
  const at = Math.min(index, Math.max(count - 1, 0));
  const current = item.images[at];
  const go = (delta: number) => {
    if (count > 1) setIndex((at + delta + count) % count);
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft') go(-1);
    if (event.key === 'ArrowRight') go(1);
  };
  const onTouchEnd = (event: TouchEvent) => {
    const start = touchX.current;
    const end = event.changedTouches[0]?.clientX;
    touchX.current = null;
    if (start !== null && end !== undefined && Math.abs(end - start) > 40) {
      go(end < start ? 1 : -1);
    }
  };
  const price = formatPrice(item.price, item.currency);

  return (
    <div className="item-detail">
      <div>
        {current ? (
          <div
            className="gallery"
            role="group"
            aria-roledescription="галерея"
            aria-label={`Фото ${at + 1} из ${count}`}
            tabIndex={count > 1 ? 0 : undefined}
            onKeyDown={onKey}
            onTouchStart={(e) => {
              touchX.current = e.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={onTouchEnd}
          >
            <img
              className="item-detail__main"
              src={fileUrl(current.fileKey)}
              width={640}
              height={800}
              alt={item.title}
            />
            {count > 1 && (
              <>
                <button
                  type="button"
                  className="gallery__nav gallery__nav--prev"
                  aria-label="Предыдущее фото"
                  onClick={() => go(-1)}
                >
                  <ChevronLeft size={22} aria-hidden />
                </button>
                <button
                  type="button"
                  className="gallery__nav gallery__nav--next"
                  aria-label="Следующее фото"
                  onClick={() => go(1)}
                >
                  <ChevronRight size={22} aria-hidden />
                </button>
                <span className="gallery__count" aria-hidden>
                  {at + 1} / {count}
                </span>
              </>
            )}
          </div>
        ) : (
          <ItemCover images={[]} alt={item.title} />
        )}
        {count > 1 && (
          <ul className="photo-list">
            {item.images.map((i, n) => (
              <li key={i.id}>
                <button
                  type="button"
                  className={`thumb${n === at ? ' is-active' : ''}`}
                  onClick={() => setIndex(n)}
                  aria-label={`Показать фото ${n + 1}`}
                  aria-current={n === at}
                >
                  <img src={fileUrl(i.fileKey)} width={64} height={64} alt="" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="item-detail__info">
        {header}

        {item.description && <p className="item-detail__desc">{item.description}</p>}

        <div className="buy-panel">
          <span className="buy-panel__price">{price ?? 'Цена не указана'}</span>
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="buy-panel__btn"
            >
              Перейти в магазин <ExternalLink size={16} aria-hidden />
            </a>
          )}
        </div>

        <div className="item-detail__facts">
          <span>Приоритет</span>
          <span>
            <PriorityStars value={item.priority} /> {PRIORITY_LABEL[item.priority]}
          </span>
          {item.note && (
            <>
              <span>Заметка</span>
              <span>{item.note}</span>
            </>
          )}
        </div>

        {item.links.length > 0 && (
          <>
            <Typography.Title level={5}>Похожие товары</Typography.Title>
            <ul className="similar-links">
              {item.links.map((l) => (
                <li key={l.id}>
                  <a href={l.url} target="_blank" rel="noopener noreferrer nofollow">
                    {l.label || l.url}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
