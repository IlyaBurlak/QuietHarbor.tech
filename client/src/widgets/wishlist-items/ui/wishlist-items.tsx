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
import { Card, Tag, Typography } from 'antd';
import { GripVertical } from 'lucide-react';
import type { WishlistItemDto } from '@wishlist/shared';
import { PRIORITY_LABEL, useReorder } from '@/entities/wishlist';

function ItemCard({ item, draggable }: { item: WishlistItemDto; draggable: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !draggable,
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
      <Card size="small" className="item-card">
        <div className="item-card__head">
          <Typography.Text strong>{item.title}</Typography.Text>
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
        </div>
        {item.description && (
          <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ marginBottom: 8 }}>
            {item.description}
          </Typography.Paragraph>
        )}
        <div className="item-card__meta">
          {item.price && (
            <Typography.Text>
              {Number(item.price).toLocaleString('ru-RU')} {item.currency === 'RUB' ? '₽' : item.currency}
            </Typography.Text>
          )}
          <Tag bordered={false}>{PRIORITY_LABEL[item.priority] ?? 'Обычный'}</Tag>
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
            <ItemCard key={item.id} item={item} draggable={manual} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
