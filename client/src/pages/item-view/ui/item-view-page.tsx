import { App, Button, Dropdown, Result, Skeleton } from 'antd';
import { ArrowLeft, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ItemDetails, useDeleteItem, useWishlist } from '@/entities/wishlist';

/** Подробная страница товара владельца: крупное фото слева, описание, цена и «в магазин» справа. */
export function ItemViewPage() {
  const { id = '', itemId = '' } = useParams();
  const { modal, message } = App.useApp();
  const navigate = useNavigate();
  const { data, isPending } = useWishlist(id);
  const remove = useDeleteItem();
  const item = data?.items.find((i) => i.id === itemId);

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
      <ItemDetails
        key={item.id}
        item={item}
        header={
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
        }
      />
    </>
  );
}
