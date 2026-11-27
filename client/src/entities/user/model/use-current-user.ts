import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { SessionUser } from '@wishlist/shared';
import { fetchMe } from '../api/auth-api';

export const ME_KEY = ['me'] as const;

export function useCurrentUser() {
  return useQuery({ queryKey: ME_KEY, queryFn: fetchMe, staleTime: Infinity, retry: false });
}

export function useSetCurrentUser() {
  const qc = useQueryClient();
  return (user: SessionUser | null) => qc.setQueryData(ME_KEY, user);
}
