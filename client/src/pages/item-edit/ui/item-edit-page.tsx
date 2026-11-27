import { Button, Card, Result, Skeleton } from 'antd';
import { Link, useParams } from 'react-router-dom';
import { useWishlist } from '@/entities/wishlist';
import { ItemForm } from '@/features/item-form';
import { PageHeader } from '@/shared/ui';

/** /lists/:id/items/new — добавить желание, /lists/:id/items/:itemId/edit — изменить. */
export function ItemEditPage() {
  const { id = '', itemId } = useParams();
  const { data, isPending, isError } = useWishlist(id);
  const item = data?.items.find((i) => i.id === itemId);
  const missing = isError || (!!data && !!itemId && !item);

  return (
    <>
      <PageHeader title={itemId ? 'Изменить желание' : 'Новое желание'} />
      <Card className="form-card">
        {isPending && <Skeleton active />}
        {missing && (
          <Result
            status="404"
            title="Не найдено"
            extra={
              <Link to="/lists">
                <Button>К моим вишлистам</Button>
              </Link>
            }
          />
        )}
        {data && !missing && <ItemForm key={itemId ?? 'new'} wishlistId={id} item={item} />}
      </Card>
    </>
  );
}
