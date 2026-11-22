import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateWishlistInput, UpdateWishlistInput, WishlistDetail } from '@wishlist/shared';
import {
  createWishlistRequest,
  deleteWishlistRequest,
  duplicateWishlistRequest,
  fetchWishlist,
  fetchWishlists,
  regenerateLinkRequest,
  reorderRequest,
  updateWishlistRequest,
} from '../api/wishlist-api';

export const WISHLISTS_KEY = ['wishlists'] as const;
export const wishlistKey = (id: string) => ['wishlists', id] as const;

export const useWishlists = () => useQuery({ queryKey: WISHLISTS_KEY, queryFn: fetchWishlists });

export const useWishlist = (id: string) =>
  useQuery({ queryKey: wishlistKey(id), queryFn: () => fetchWishlist(id) });

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: WISHLISTS_KEY });
}

export function useCreateWishlist() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CreateWishlistInput) => createWishlistRequest(input),
    onSuccess: invalidate,
  });
}

export function useUpdateWishlist(id: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: UpdateWishlistInput) => updateWishlistRequest(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteWishlist() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: deleteWishlistRequest, onSuccess: invalidate });
}

export function useDuplicateWishlist() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: duplicateWishlistRequest, onSuccess: invalidate });
}

export function useRegenerateLink(id: string) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: () => regenerateLinkRequest(id), onSuccess: invalidate });
}

/** Перестановка с мгновенным откликом: порядок меняется сразу, при ошибке откатывается. */
export function useReorder(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemIds: string[]) => reorderRequest(id, itemIds),
    onMutate: async (itemIds) => {
      await qc.cancelQueries({ queryKey: wishlistKey(id) });
      const prev = qc.getQueryData<WishlistDetail>(wishlistKey(id));
      if (prev) {
        const byId = new Map(prev.items.map((i) => [i.id, i]));
        qc.setQueryData<WishlistDetail>(wishlistKey(id), {
          wishlist: { ...prev.wishlist, sortMode: 'manual' },
          items: itemIds.map((x) => byId.get(x)!).filter(Boolean),
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(wishlistKey(id), ctx.prev);
    },
    onSuccess: (data) => {
      qc.setQueryData(wishlistKey(id), data);
      void qc.invalidateQueries({ queryKey: WISHLISTS_KEY, exact: true });
    },
  });
}
