import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ItemInput, UpdateItemInput } from '@wishlist/shared';
import {
  createItemRequest,
  deleteImageRequest,
  deleteItemRequest,
  fetchMyReservations,
  fetchPublicWishlist,
  setMainImageRequest,
  updateItemRequest,
  uploadImageRequest,
} from '../api/wishlist-api';
import { WISHLISTS_KEY } from './use-wishlists';

export const publicWishlistKey = (slug: string) => ['public-wishlist', slug] as const;
export const MY_RESERVATIONS_KEY = ['my-reservations'] as const;

export const usePublicWishlist = (slug: string) =>
  useQuery({
    queryKey: publicWishlistKey(slug),
    queryFn: () => fetchPublicWishlist(slug),
    retry: false,
  });

export const useMyReservations = () =>
  useQuery({ queryKey: MY_RESERVATIONS_KEY, queryFn: fetchMyReservations });

/** Любое изменение товара обновляет вишлисты (счётчик, сетка) и публичную страницу. */
function useRefresh() {
  const qc = useQueryClient();
  return () => Promise.all([qc.invalidateQueries({ queryKey: WISHLISTS_KEY })]);
}

export function useCreateItem(wishlistId: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: ItemInput) => createItemRequest(wishlistId, input),
    onSuccess: refresh,
  });
}

export function useUpdateItem(itemId: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: UpdateItemInput) => updateItemRequest(itemId, input),
    onSuccess: refresh,
  });
}

export function useDeleteItem() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: deleteItemRequest, onSuccess: refresh });
}

export function useItemImages(itemId: string) {
  const refresh = useRefresh();
  return {
    upload: useMutation({
      mutationFn: (file: File) => uploadImageRequest(itemId, file),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (imageId: string) => deleteImageRequest(itemId, imageId),
      onSuccess: refresh,
    }),
    setMain: useMutation({
      mutationFn: (imageId: string) => setMainImageRequest(itemId, imageId),
      onSuccess: refresh,
    }),
  };
}
