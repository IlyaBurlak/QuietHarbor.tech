import { Button, Card, Result, Skeleton } from 'antd';
import { Link, useParams } from 'react-router-dom';
import { useWishlist } from '@/entities/wishlist';
import { WishlistForm } from '@/features/wishlist-form';
import { PageHeader } from '@/shared/ui';

/** Маршрут /lists/new (без id) создаёт, /lists/:id/edit — редактирует. */
export function WishlistEditPage() {
  const { id } = useParams();
  const { data, isPending, isError } = useWishlist(id ?? '');
  const editing = !!id;

  return (
    <>
      <PageHeader title={editing ? 'Изменить вишлист' : 'Создать вишлист'} />
      <Card className="form-card">
        {editing && isPending && <Skeleton active />}
        {editing && isError && (
          <Result
            status="404"
            title="Вишлист не найден"
            extra={
              <Link to="/lists">
                <Button>К моим вишлистам</Button>
              </Link>
            }
          />
        )}
        {!editing && <WishlistForm />}
        {editing && data && <WishlistForm wishlist={data.wishlist} />}
      </Card>
    </>
  );
}
