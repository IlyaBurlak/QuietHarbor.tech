import { useQuery } from '@tanstack/react-query';
import { http } from './http';

export interface PublicConfig {
  supportContactUrl: string | null;
}

export function usePublicConfig() {
  return useQuery({
    queryKey: ['public-config'],
    queryFn: () => http.get<PublicConfig>('/public/config').then((r) => r.data),
    staleTime: Infinity,
  });
}
