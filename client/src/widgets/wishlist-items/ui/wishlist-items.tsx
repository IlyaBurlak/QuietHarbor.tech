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
import { App, Dropdown } from 'antd';
import { GripVertical, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { WishlistItemDto } from '@wishlist/shared';
import {
  ItemTile,
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

  const tools = (
    <>
      {draggable && (
        <button
          type="button"
          className="tile__btn"
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
        <button type="button" className="tile__btn" aria-label={`Действия с «${item.title}»`}>
          <MoreHorizontal size={16} aria-hidden />
        </button>
      </Dropdown>
    </>
  );

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
      <ItemTile item={item} href={`/lists/${wishlistId}/items/${item.id}`} tools={tools} />
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
