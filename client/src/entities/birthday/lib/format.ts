import type { BirthdayEntry } from '@wishlist/shared';

const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

/** «12 декабря» */
export const formatDayMonth = (iso: string) =>
  utc(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' });

/** «Декабрь 2026» для заголовков групп */
export function formatMonthHeading(iso: string) {
  const text = utc(iso).toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return text.charAt(0).toUpperCase() + text.slice(1).replace(/\s*г\.$/, '');
}

export function pluralDays(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'день';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'дня';
  return 'дней';
}

export function pluralYears(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'год';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'года';
  return 'лет';
}

export function whenText(daysUntil: number) {
  if (daysUntil === 0) return 'Сегодня';
  if (daysUntil === 1) return 'Завтра';
  return `Через ${daysUntil} ${pluralDays(daysUntil)}`;
}

export const turnsText = (e: BirthdayEntry) =>
  e.turns === null ? null : `исполнится ${e.turns} ${pluralYears(e.turns)}`;

/** Группирует по месяцу ближайшей даты, сохраняя порядок (список уже отсортирован сервером). */
export function groupByMonth(list: BirthdayEntry[]) {
  const groups: { key: string; title: string; items: BirthdayEntry[] }[] = [];
  for (const entry of list) {
    const key = entry.date.slice(0, 7);
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      group = { key, title: formatMonthHeading(entry.date), items: [] };
      groups.push(group);
    }
    group.items.push(entry);
  }
  return groups;
}
