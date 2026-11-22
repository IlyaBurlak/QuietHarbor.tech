import { Button, Result, Segmented, Skeleton } from 'antd';
import { Pencil, Plus } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { SORT_OPTIONS, VISIBILITY_LABEL, useUpdateWishlist, useWishlist } from '@/entities/wishlist';
import { ShareWishlistButton } from '@/features/share-wishlist';
import { EmptyState, PageHeader } from '@/shared/ui';
import { WishlistItems } from '@/widgets/wishlist-items';
import type { WishlistSort } from '@wishlist/shared';

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
        <Segmented<WishlistSort>
          className="sort-switch"
          value={wishlist.sortMode}
          options={SORT_OPTIONS}
          onChange={(sortMode) => update.mutate({ sortMode })}
          aria-label="Сортировка желаний"
        />
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
