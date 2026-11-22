import { App, Button, Tag } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import type { PublicItemDto } from '@wishlist/shared';
import { useCurrentUser } from '@/entities/user';
import {
  MY_RESERVATIONS_KEY,
  boughtRequest,
  publicWishlistKey,
  releaseRequest,
  reserveRequest,
} from '@/entities/wishlist';
import { toApiError } from '@/shared/api';

/** Кнопки брони на публичной странице. Для гостя «Забронировать» ведёт на вход и возвращает сюда же. */
export function ReserveControls({ item, slug }: { item: PublicItemDto; slug: string }) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: user } = useCurrentUser();
  const status = item.reservation?.status ?? 'free';
  const mine = item.reservation?.mine ?? false;

  const run = async (action: () => Promise<void>) => {
    try {
      await action();
      void message.success('Готово');
    } catch (e) {
      // Например, подарок успел забронировать другой: показываем причину и обновляем список
      void message.error(toApiError(e).message);
    } finally {
      void qc.invalidateQueries({ queryKey: publicWishlistKey(slug) });
      void qc.invalidateQueries({ queryKey: MY_RESERVATIONS_KEY });
    }
  };

  if (status === 'free') {
    return (
      <Button
        type="primary"
        block
        onClick={() => {
          if (!user) {
            navigate('/login', { state: { from: location.pathname } });
            return;
          }
          void run(() => reserveRequest(item.id));
        }}
      >
        Забронировать
      </Button>
    );
  }

  if (!mine) {
    return (
      <Tag bordered={false} className="status-tag">
        {status === 'bought' ? 'Уже куплено' : 'Уже забронировано'}
      </Tag>
    );
  }

  return (
    <div className="reserve-actions">
      {status === 'reserved' ? (
        <>
          <Button type="primary" onClick={() => void run(() => boughtRequest(item.id))}>
            Куплено
          </Button>
          <Button onClick={() => void run(() => releaseRequest(item.id))}>Снять бронь</Button>
        </>
      ) : (
        <Tag color="green" bordered={false}>
          Вы купили этот подарок
        </Tag>
      )}
    </div>
  );
}
