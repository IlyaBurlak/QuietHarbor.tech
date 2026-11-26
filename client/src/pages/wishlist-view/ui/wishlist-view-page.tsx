import { Button, Result, Segmented, Select, Skeleton } from 'antd';
import { ArrowDownUp, Pencil, Plus } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { SORT_OPTIONS, VISIBILITY_LABEL, useUpdateWishlist, useWishlist } from '@/entities/wishlist';
import { ShareWishlistButton } from '@/features/share-wishlist';
import { EmptyState, PageHeader } from '@/shared/ui';
import { WishlistItems } from '@/widgets/wishlist-items';
import type { SortDir, WishlistSort } from '@wishlist/shared';

const DIR_HINT: Record<WishlistSort, Record<SortDir, string>> = {
  manual: { desc: '', asc: '' },
  priority: { desc: 'сначала самые желанные', asc: 'сначала менее желанные' },
  price: { desc: 'сначала дорогие', asc: 'сначала дешёвые' },
};

export function WishlistViewPage() {
  const { id = '' } = useParams();
  const { data, isPending, isError } = useWishlist(id);
  const update = useUpdateWishlist(id);

  if (isPending) return <Skeleton active paragraph={{ rows: 6 }} />;
  if (isError || !data) {
    return (
      <Result
        status="404"
        title="Вишлист не найден"
        extra={
          <Link to="/lists">
            <Button>К моим вишлистам</Button>
          </Link>
        }
      />
    );
  }
  const { wishlist, items } = data;

  return (
    <>
      <PageHeader
        title={wishlist.title}
        count={items.length}
        description={
          <>
            {VISIBILITY_LABEL[wishlist.visibility]}
            {wishlist.description ? ` · ${wishlist.description}` : ''}
          </>
        }
        actions={
          <>
            <Link to={`/lists/${wishlist.id}/items/new`}>
              <Button type="primary" icon={<Plus size={16} aria-hidden />}>
                Добавить желание
              </Button>
            </Link>
            <ShareWishlistButton wishlist={wishlist} />
            <Link to={`/lists/${wishlist.id}/edit`}>
              <Button icon={<Pencil size={16} aria-hidden />}>Изменить</Button>
            </Link>
          </>
        }
      />
      {items.length > 0 && (
        <div className="sort-bar">
          <Segmented<WishlistSort>
            value={wishlist.sortMode}
            options={SORT_OPTIONS}
            onChange={(sortMode) =>
              // По приоритету сначала важные, по цене сначала дешёвые
              update.mutate({ sortMode, sortDir: sortMode === 'price' ? 'asc' : 'desc' })
            }
            aria-label="Сортировка желаний"
          />
          {wishlist.sortMode !== 'manual' && (
            <Select<SortDir>
              className="sort-dir"
              value={wishlist.sortDir}
              onChange={(sortDir) => update.mutate({ sortDir })}
              aria-label="Порядок сортировки"
              suffixIcon={<ArrowDownUp size={16} aria-hidden />}
              options={(['desc', 'asc'] as const).map((value) => ({
                value,
                label: `${value === 'desc' ? 'По убыванию' : 'По возрастанию'} — ${DIR_HINT[wishlist.sortMode][value]}`,
              }))}
            />
          )}
        </div>
      )}
      {items.length === 0 ? (
        <EmptyState text="Добавьте первое желание — друзья увидят, что вам подарить.">
          <Link to={`/lists/${wishlist.id}/items/new`}>
            <Button type="primary">Добавить желание</Button>
          </Link>
        </EmptyState>
      ) : (
        <WishlistItems
          wishlistId={wishlist.id}
          items={items}
          manual={wishlist.sortMode === 'manual'}
        />
      )}
    </>
  );
}
