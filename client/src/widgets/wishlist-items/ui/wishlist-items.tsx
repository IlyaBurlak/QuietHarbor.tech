import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { App, Button, Card, Dropdown, Tag, Typography } from 'antd';
import { GripVertical, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { WishlistItemDto } from '@wishlist/shared';
import {
  ItemCover,
  PRIORITY_LABEL,
  formatPrice,
  useDeleteItem,
  useReorder,
} from '@/entities/wishlist';

function ItemCard({
  item,
  wishlistId,
  draggable,
}: {
  item: WishlistItemDto;
  wishlistId: string;
  draggable: boolean;
}) {
  const { modal, message } = App.useApp();
  const navigate = useNavigate();
  const remove = useDeleteItem();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !draggable,
  });
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
      },
    });

  return (
    <li
      ref={setNodeRef}
      className="item-grid__cell"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
    >
      <Card
        size="small"
        className="item-card"
        cover={<ItemCover images={item.images} alt={item.title} />}
      >
        <div className="item-card__head">
          <Link to={`/lists/${wishlistId}/items/${item.id}`} className="item-card__title">
            {item.title}
          </Link>
          <div className="item-card__tools">
            {draggable && (
              <button
                type="button"
                className="drag-handle"
                aria-label={`Переместить «${item.title}»`}
                {...attributes}
                {...listeners}
              >
                <GripVertical size={16} aria-hidden />
              </button>
            )}
            <Dropdown
              trigger={['click']}
              menu={{
                items: [
                  { key: 'edit', icon: <Pencil size={14} />, label: 'Изменить' },
                  { key: 'delete', icon: <Trash2 size={14} />, label: 'Удалить', danger: true },
                ],
                onClick: ({ key }) => {
                  if (key === 'edit') navigate(`/lists/${wishlistId}/items/${item.id}/edit`);
                  if (key === 'delete') confirmDelete();
                },
              }}
            >
              <Button
                type="text"
                size="small"
                aria-label={`Действия с «${item.title}»`}
                icon={<MoreHorizontal size={16} aria-hidden />}
              />
            </Dropdown>
          </div>
        </div>
        <div className="item-card__meta">
          {price ? <Typography.Text>{price}</Typography.Text> : <span />}
          <Tag bordered={false}>{PRIORITY_LABEL[item.priority] ?? 'Хочу'}</Tag>
        </div>
      </Card>
    </li>
  );
}

interface Props {
  wishlistId: string;
  items: WishlistItemDto[];
  /** Перетаскивание доступно только в ручном режиме сортировки. */
  manual: boolean;
}

/** Сетка товаров владельца; в ручном режиме карточки перетаскиваются мышью и клавиатурой. */
export function WishlistItems({ wishlistId, items, manual }: Props) {
  const reorder = useReorder(wishlistId);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    reorder.mutate(arrayMove(items, from, to).map((i) => i.id));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
        <ul className="item-grid">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} wishlistId={wishlistId} draggable={manual} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
