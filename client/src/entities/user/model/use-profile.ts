import { useQuery } from '@tanstack/react-query';
import { fetchProfile } from '../api/users-api';

export const PROFILE_KEY = ['profile'] as const;

export function useProfile() {
  return useQuery({ queryKey: PROFILE_KEY, queryFn: fetchProfile });
}
