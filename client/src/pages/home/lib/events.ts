import type { BirthdayEntry, GroupSummary, WishlistDto } from '@wishlist/shared';

export interface UpcomingEvent {
  key: string;
  kind: 'birthday' | 'wishlist' | 'draw' | 'exchange';
  title: string;
  subtitle: string;
  date: string;
  daysUntil: number;
  to: string;
}

/** Дни до даты ГГГГ-ММ-ДД от начала сегодняшнего дня по местному времени. */
export function daysUntil(iso: string, today = new Date()): number {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(y!, m! - 1, d!);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

/**
 * Единая лента ближайших событий: дни рождения друзей, даты ваших вишлистов и игр «Тайный Санта».
 * Прошедшие даты не показываются.
 */
export function buildEvents(
  birthdays: BirthdayEntry[],
  wishlists: WishlistDto[],
  groups: GroupSummary[],
): UpcomingEvent[] {
  const events: UpcomingEvent[] = [];
  for (const b of birthdays) {
    events.push({
      key: `b-${b.userId}`,
      kind: 'birthday',
      title: b.fullName,
      subtitle: b.turns ? `День рождения, исполнится ${b.turns}` : 'День рождения',
      date: b.date,
      daysUntil: b.daysUntil,
      to: b.username ? `/u/${b.username}` : '/calendar',
    });
  }
  for (const w of wishlists) {
    if (!w.eventDate) continue;
    events.push({
      key: `w-${w.id}`,
      kind: 'wishlist',
      title: w.title,
      subtitle: 'Дата вашего вишлиста',
      date: w.eventDate,
      daysUntil: daysUntil(w.eventDate),
      to: `/lists/${w.id}`,
    });
  }
  for (const g of groups) {
    if (g.status === 'open' && g.drawDate) {
      events.push({
        key: `d-${g.id}`,
        kind: 'draw',
        title: g.title,
        subtitle: 'Жеребьёвка Тайного Санты',
        date: g.drawDate,
        daysUntil: daysUntil(g.drawDate),
        to: `/santa/${g.id}`,
      });
    }
    if (g.exchangeDate) {
      events.push({
        key: `x-${g.id}`,
        kind: 'exchange',
        title: g.title,
        subtitle: 'Обмен подарками',
        date: g.exchangeDate,
        daysUntil: daysUntil(g.exchangeDate),
        to: `/santa/${g.id}`,
      });
    }
  }
  return events.filter((e) => e.daysUntil >= 0).sort((a, b) => a.daysUntil - b.daysUntil);
}

export const whenLabel = (days: number) =>
  days === 0 ? 'Сегодня' : days === 1 ? 'Завтра' : `Через ${days} дн.`;
