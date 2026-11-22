import type { PublicWishlist } from '@wishlist/shared';
import { prisma } from '../../core/db/prisma';
import { notFound } from '../../core/http/errors';
import { canViewWishlist } from '../wishlists/wishlists.access';
import { toItemDto } from '../wishlists/wishlists.dto';
import { ITEM_INCLUDE, sortItems } from '../wishlists/wishlists.service';

/**
 * Вишлист по ссылке. Владельцу отдаётся отдельный вариант БЕЗ полей брони:
 * данные о брони не должны попасть в ответ, даже если фронт их скроет.
 * Недоступный вишлист даёт 404, чтобы не выдавать его существование.
 */
export async function getPublicWishlist(
  viewerId: string | undefined,
  slug: string,
): Promise<PublicWishlist> {
  const w = await prisma.wishlist.findUnique({
    where: { shareSlug: slug },
    include: {
      owner: { select: { id: true, username: true, fullName: true, avatarKey: true } },
      items: { include: { ...ITEM_INCLUDE, reservation: true } },
    },
  });
  if (!w || !(await canViewWishlist(viewerId, w))) throw notFound('Вишлист не найден');

  const isOwner = viewerId === w.ownerId;
  const items = sortItems(w.items, w.sortMode).map((item) => {
    const dto = toItemDto(item);
    if (isOwner) return dto;
    const r = item.reservation;
    return {
      ...dto,
      reservation: {
        status: r ? r.status : ('free' as const),
        mine: !!r && r.reservedById === viewerId,
      },
    };
  });

  return {
    wishlist: {
      id: w.id,
      title: w.title,
      description: w.description,
      eventDate: w.eventDate ? w.eventDate.toISOString().slice(0, 10) : null,
      sortMode: w.sortMode,
    },
    owner: w.owner,
    isOwner,
    items,
  };
}
