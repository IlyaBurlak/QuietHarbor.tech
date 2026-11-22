import type {
  CreateWishlistInput,
  UpdateWishlistInput,
  WishlistDetail,
  WishlistDto,
} from '@wishlist/shared';
import { http } from '@/shared/api';

export const fetchWishlists = () =>
  http.get<{ wishlists: WishlistDto[] }>('/wishlists').then((r) => r.data.wishlists);

export const fetchWishlist = (id: string) =>
  http.get<WishlistDetail>(`/wishlists/${id}`).then((r) => r.data);

export const createWishlistRequest = (input: CreateWishlistInput) =>
  http.post<{ wishlist: WishlistDto }>('/wishlists', input).then((r) => r.data.wishlist);

export const updateWishlistRequest = (id: string, input: UpdateWishlistInput) =>
  http.patch<{ wishlist: WishlistDto }>(`/wishlists/${id}`, input).then((r) => r.data.wishlist);

export const deleteWishlistRequest = (id: string) =>
  http.delete(`/wishlists/${id}`).then(() => undefined);

export const regenerateLinkRequest = (id: string) =>
  http.post<{ wishlist: WishlistDto }>(`/wishlists/${id}/regenerate-link`).then((r) => r.data.wishlist);

export const reorderRequest = (id: string, itemIds: string[]) =>
  http.patch<WishlistDetail>(`/wishlists/${id}/reorder`, { itemIds }).then((r) => r.data);

export const duplicateWishlistRequest = (id: string) =>
  http.post<{ wishlist: WishlistDto }>(`/wishlists/${id}/duplicate`).then((r) => r.data.wishlist);
