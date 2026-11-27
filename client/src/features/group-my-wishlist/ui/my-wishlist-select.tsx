import { App, Select } from 'antd';
import { useGroupActions } from '@/entities/group';
import { useWishlists } from '@/entities/wishlist';
import { toApiError } from '@/shared/api';

/** Выбор вишлиста, который увидит тот, кто вам дарит. Закрепление — ваше согласие показать его. */
export function MyWishlistSelect({
  groupId,
  value,
}: {
  groupId: string;
  value: string | null;
}) {
  const { message } = App.useApp();
  const { data: lists, isPending } = useWishlists();
  const { setWishlist } = useGroupActions(groupId);

  return (
    <Select
      style={{ width: '100%', maxWidth: 420 }}
      loading={isPending || setWishlist.isPending}
      value={value}
      allowClear
      placeholder="Не выбран"
      aria-label="Мой вишлист для игры"
      notFoundContent="У вас пока нет вишлистов"
      options={(lists ?? []).map((w) => ({ value: w.id, label: w.title }))}
      onChange={async (id) => {
        try {
          await setWishlist.mutateAsync(id ?? null);
          void message.success(id ? 'Вишлист прикреплён' : 'Вишлист откреплён');
        } catch (e) {
          void message.error(toApiError(e).message);
        }
      }}
    />
  );
}
