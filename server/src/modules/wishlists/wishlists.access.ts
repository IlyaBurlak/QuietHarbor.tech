import type { Wishlist } from '@prisma/client';
import { prisma } from '../../core/db/prisma';

type AccessTarget = Pick<Wishlist, 'ownerId' | 'visibility'>;

/** Приняты ли дружба между двумя пользователями (в любом направлении). */
export async function areFriends(a: string, b: string): Promise<boolean> {
  const row = await prisma.friendship.findFirst({
    where: {
      status: 'accepted',
      OR: [
        { requesterId: a, addresseeId: b },
        { requesterId: b, addresseeId: a },
      ],
    },
    select: { id: true },
  });
  return !!row;
}

/**
 * Единое правило доступа к вишлисту:
 * владелец — всегда; «по ссылке» — любой; «для друзей» — принятые друзья; «только я» — никто другой.
 */
export async function canViewWishlist(
  userId: string | null | undefined,
  wishlist: AccessTarget,
): Promise<boolean> {
  if (userId && userId === wishlist.ownerId) return true;
  switch (wishlist.visibility) {
    case 'link':
      return true;
    case 'friends':
      return !!userId && (await areFriends(userId, wishlist.ownerId));
    default:
      return false;
  }
}
