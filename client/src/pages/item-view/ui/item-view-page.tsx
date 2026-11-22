import { useState } from 'react';
import { Button, Result, Skeleton, Tag, Typography } from 'antd';
import { ExternalLink, Pencil } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { PRIORITY_LABEL, formatPrice, ItemCover, useWishlist } from '@/entities/wishlist';
import { fileUrl } from '@/shared/lib';
import { PageHeader } from '@/shared/ui';

/** Подробная страница товара владельца: галерея, описание, кнопка «в магазин». */
export function ItemViewPage() {
  const { id = '', itemId = '' } = useParams();
  const { data, isPending } = useWishlist(id);
  const item = data?.items.find((i) => i.id === itemId);
  const [active, setActive] = useState<string | null>(null);

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
  const current = item.images.find((i) => i.id === active) ?? item.images[0];
  const price = formatPrice(item.price, item.currency);

  return (
    <>
      <PageHeader
        title={item.title}
        description={<Link to={`/lists/${id}`}>← {data?.wishlist.title}</Link>}
        actions={
          <Link to={`/lists/${id}/items/${item.id}/edit`}>
            <Button icon={<Pencil size={16} aria-hidden />}>Изменить</Button>
          </Link>
        }
      />
      <div className="item-detail">
        <div>
          {current ? (
            <img className="item-detail__main" src={fileUrl(current.fileKey)} alt={item.title} />
          ) : (
            <ItemCover images={[]} alt={item.title} />
          )}
          {item.images.length > 1 && (
            <ul className="photo-list">
              {item.images.map((i) => (
                <li key={i.id}>
                  <button
                    type="button"
                    className={`thumb${i.id === current?.id ? ' is-active' : ''}`}
                    onClick={() => setActive(i.id)}
                    aria-label="Показать фото"
                  >
                    <img src={fileUrl(i.fileKey)} alt="" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="item-detail__info">
          {price && <Typography.Title level={3}>{price}</Typography.Title>}
          <Tag bordered={false}>{PRIORITY_LABEL[item.priority]}</Tag>
          {item.description && <Typography.Paragraph>{item.description}</Typography.Paragraph>}
          {item.note && <Typography.Paragraph type="secondary">Заметка: {item.note}</Typography.Paragraph>}
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer nofollow">
              <Button type="primary" icon={<ExternalLink size={16} aria-hidden />}>
                Перейти в магазин
              </Button>
            </a>
          )}
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
