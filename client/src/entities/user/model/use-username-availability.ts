import { useQuery } from '@tanstack/react-query';
import { usernameSchema } from '@wishlist/shared';
import { useDebouncedValue } from '@/shared/lib';
import { checkUsernameAvailable } from '../api/auth-api';

export type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken';

/** Проверка занятости: только для корректного имени, с задержкой после ввода. */
export function useUsernameAvailability(username: string): UsernameStatus {
  const debounced = useDebouncedValue(username, 400);
  const valid = usernameSchema.safeParse(username).success;
  const enabled = valid && debounced === username;

  const q = useQuery({
    queryKey: ['username-available', username],
    queryFn: () => checkUsernameAvailable(username),
    enabled,
    staleTime: 30_000,
    retry: false,
  });

  if (!valid) return 'idle';
  if (!enabled || q.isFetching) return 'checking';
  if (q.data === true) return 'available';
  if (q.data === false) return 'taken';
  return 'idle';
}
