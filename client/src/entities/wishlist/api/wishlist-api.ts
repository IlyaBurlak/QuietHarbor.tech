import type {
  CreateWishlistInput,
  ItemInput,
  MyReservations,
  PublicWishlist,
  UpdateItemInput,
  WishlistItemDto,
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

export const fetchPublicWishlist = (slug: string) =>
  http.get<PublicWishlist>(`/public/w/${slug}`).then((r) => r.data);

export const fetchMyReservations = () =>
  http.get<MyReservations>('/me/reservations').then((r) => r.data);

export const reserveRequest = (itemId: string) =>
  http.post(`/items/${itemId}/reserve`).then(() => undefined);
export const releaseRequest = (itemId: string) =>
  http.delete(`/items/${itemId}/reserve`).then(() => undefined);
export const boughtRequest = (itemId: string) =>
  http.post(`/items/${itemId}/bought`).then(() => undefined);

export const createItemRequest = (wishlistId: string, input: ItemInput) =>
  http.post<{ item: WishlistItemDto }>(`/wishlists/${wishlistId}/items`, input).then((r) => r.data.item);

export const updateItemRequest = (itemId: string, input: UpdateItemInput) =>
  http.patch<{ item: WishlistItemDto }>(`/items/${itemId}`, input).then((r) => r.data.item);

export const deleteItemRequest = (itemId: string) =>
  http.delete(`/items/${itemId}`).then(() => undefined);

export const uploadImageRequest = (itemId: string, file: File) => {
  const body = new FormData();
  body.append('file', file);
  return http
    .post<{ item: WishlistItemDto }>(`/items/${itemId}/images`, body)
    .then((r) => r.data.item);
};

export const deleteImageRequest = (itemId: string, imageId: string) =>
  http.delete<{ item: WishlistItemDto }>(`/items/${itemId}/images/${imageId}`).then((r) => r.data.item);

export const setMainImageRequest = (itemId: string, imageId: string) =>
  http
    .patch<{ item: WishlistItemDto }>(`/items/${itemId}/images/${imageId}/main`)
    .then((r) => r.data.item);
