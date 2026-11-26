import { useState, type KeyboardEvent, type TouchEvent } from 'react';
import { App, Button, Dropdown, Result, Skeleton, Typography } from 'antd';
import { ArrowLeft, ChevronLeft, ChevronRight, ExternalLink, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ItemCover,
  PRIORITY_LABEL,
  PriorityStars,
  formatPrice,
  useDeleteItem,
  useWishlist,
} from '@/entities/wishlist';
import { fileUrl } from '@/shared/lib';

/** Подробная страница товара владельца: крупное фото слева, описание, цена и «в магазин» справа. */
export function ItemViewPage() {
  const { id = '', itemId = '' } = useParams();
  const { modal, message } = App.useApp();
  const navigate = useNavigate();
  const { data, isPending } = useWishlist(id);
  const remove = useDeleteItem();
  const item = data?.items.find((i) => i.id === itemId);
  const [index, setIndex] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);

  if (isPending) return <Skeleton active paragraph={{ rows: 6 }} />;
  if (!item) {
    return (
      <Result
        status="404"
        title="Желание не найдено"
        extra={
          <Link to={`/lists/${id}`}>
            <Button>К вишлисту</Button>
          </Link>
        }
      />
    );
  }
  const count = item.images.length;
  const at = Math.min(index, Math.max(count - 1, 0));
  const current = item.images[at];
  const go = (delta: number) => setIndex((at + delta + count) % count);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') go(-1);
    if (e.key === 'ArrowRight') go(1);
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0]!.clientX - touchX;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    setTouchX(null);
  };
  const price = formatPrice(item.price, item.currency);

  const confirmDelete = () =>
    modal.confirm({
      title: `Удалить «${item.title}»?`,
      content: 'Желание и его фото будут удалены безвозвратно.',
      okText: 'Удалить',
      okButtonProps: { danger: true },
      cancelText: 'Отмена',
      onOk: async () => {
        await remove.mutateAsync(item.id);
        void message.success('Желание удалено');
        navigate(`/lists/${id}`, { replace: true });
      },
    });

  return (
    <>
      <Link to={`/lists/${id}`} className="back-link">
        <ArrowLeft size={16} aria-hidden /> {data?.wishlist.title}
      </Link>
      <div className="item-detail">
        <div>
          {current ? (
            <div
              className="gallery"
              role="group"
              aria-roledescription="галерея"
              aria-label={`Фото ${at + 1} из ${count}`}
              tabIndex={0}
              onKeyDown={onKey}
              onTouchStart={(e) => setTouchX(e.touches[0]!.clientX)}
              onTouchEnd={onTouchEnd}
            >
              <img className="item-detail__main" src={fileUrl(current.fileKey)} alt={item.title} />
              {count > 1 && (
                <>
                  <button type="button" className="gallery__nav gallery__nav--prev" aria-label="Предыдущее фото" onClick={() => go(-1)}>
                    <ChevronLeft size={22} aria-hidden />
                  </button>
                  <button type="button" className="gallery__nav gallery__nav--next" aria-label="Следующее фото" onClick={() => go(1)}>
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
                    <img src={fileUrl(i.fileKey)} alt="" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="item-detail__info">
          <div className="item-detail__top">
            <h1 className="item-detail__title">{item.title}</h1>
            <Dropdown
              trigger={['click']}
              menu={{
                items: [
                  { key: 'edit', icon: <Pencil size={14} />, label: 'Изменить' },
                  { key: 'delete', icon: <Trash2 size={14} />, label: 'Удалить', danger: true },
                ],
                onClick: ({ key }) => {
                  if (key === 'edit') navigate(`/lists/${id}/items/${item.id}/edit`);
                  if (key === 'delete') confirmDelete();
                },
              }}
            >
              <button type="button" className="tile__btn tile__btn--static" aria-label="Действия">
                <MoreHorizontal size={18} aria-hidden />
              </button>
            </Dropdown>
          </div>

          {item.description && <p className="item-detail__desc">{item.description}</p>}

          <div className="buy-panel">
            <span className="buy-panel__price">{price ?? 'Цена не указана'}</span>
            {item.url && (
              <a href={item.url} target="_blank" rel="noopener noreferrer nofollow" className="buy-panel__btn">
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
    </>
  );
}
