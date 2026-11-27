import type { BirthdayEntry } from '@wishlist/shared';
import { http } from '@/shared/api';

export const fetchBirthdays = () =>
  http.get<{ birthdays: BirthdayEntry[] }>('/calendar/birthdays').then((r) => r.data.birthdays);
