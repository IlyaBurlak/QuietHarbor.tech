import { useQuery } from '@tanstack/react-query';
import { fetchBirthdays } from '../api/birthday-api';

export const BIRTHDAYS_KEY = ['calendar', 'birthdays'] as const;

export function useBirthdays() {
  return useQuery({ queryKey: BIRTHDAYS_KEY, queryFn: fetchBirthdays });
}
