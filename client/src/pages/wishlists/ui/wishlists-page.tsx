import { App, Button, Dropdown, Result, Skeleton } from 'antd';
import { Copy, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  WishlistCard,
  useDeleteWishlist,
  useDuplicateWishlist,
  useWishlists,
} from '@/entities/wishlist';
import { ShareWishlistButton } from '@/features/share-wishlist';
import { EmptyState, PageHeader } from '@/shared/ui';

export function WishlistsPage() {
  const { modal, message } = App.useApp();
  const navigate = useNavigate();
  const { data, isPending, isError, refetch } = useWishlists();
  const remove = useDeleteWishlist();
  const duplicate = useDuplicateWishlist();

  const confirmDelete = (id: string, title: string) =>
    modal.confirm({
      title: `Удалить «${title}»?`,
      content: 'Вместе с вишлистом удалятся все его желания. Это нельзя отменить.',
      okText: 'Удалить',
      okButtonProps: { danger: true },
      cancelText: 'Отмена',
      onOk: async () => {
        await remove.mutateAsync(id);
        void message.success('Вишлист удалён');
      },
    });

  return (
    <>
      <PageHeader
        title="Мои желания"
        count={data?.length || undefined}
        description="Ваши вишлисты. Делитесь ссылкой, а брони друзей останутся для вас сюрпризом."
        actions={
          <Link to="/lists/new">
            <Button type="primary" icon={<Plus size={16} aria-hidden />}>
              Создать вишлист
            </Button>
          </Link>
        }
      />
      {isPending && <Skeleton active paragraph={{ rows: 5 }} />}
      {isError && (
        <Result
          status="error"
          title="Не удалось загрузить вишлисты"
          extra={<Button onClick={() => void refetch()}>Повторить</Button>}
        />
      )}
      {data && data.length === 0 && (
        <EmptyState text="Здесь пока пусто. Создайте первый вишлист и добавьте в него желания.">
          <Link to="/lists/new">
            <Button type="primary">Создать вишлист</Button>
          </Link>
        </EmptyState>
      )}
      {data && data.length > 0 && (
        <div className="wishlist-grid">
          {data.map((w) => (
            <WishlistCard
              key={w.id}
              wishlist={w}
              actions={
                <div className="wishlist-card__actions">
                  <ShareWishlistButton wishlist={w} />
                  <Dropdown
                    trigger={['click']}
                    menu={{
                      items: [
                        { key: 'edit', icon: <Pencil size={14} />, label: 'Изменить' },
                        { key: 'copy', icon: <Copy size={14} />, label: 'Дублировать' },
                        { key: 'delete', icon: <Trash2 size={14} />, label: 'Удалить', danger: true },
                      ],
                      onClick: ({ key }) => {
                        if (key === 'edit') navigate(`/lists/${w.id}/edit`);
                        if (key === 'copy') {
                          void duplicate
                            .mutateAsync(w.id)
                            .then(() => message.success('Копия создана'));
                        }
                        if (key === 'delete') confirmDelete(w.id, w.title);
                      },
                    }}
                  >
                    <Button
                      type="text"
                      aria-label={`Действия с вишлистом «${w.title}»`}
                      icon={<MoreHorizontal size={18} aria-hidden />}
                    />
                  </Dropdown>
                </div>
              }
            />
          ))}
        </div>
      )}
    </>
  );
}
