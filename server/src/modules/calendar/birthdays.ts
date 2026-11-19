import type { BirthdayEntry } from '@wishlist/shared';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const isLeap = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
const pad = (n: number) => String(n).padStart(2, '0');

export interface BirthdaySource {
  userId: string;
  username: string | null;
  fullName: string;
  avatarKey: string | null;
  birthDate: Date;
  hideBirthYear: boolean;
}

/** Месяц и день в году `year`; 29 февраля в невисокосный год — 28 февраля. */
function occurrence(birth: Date, year: number) {
  const month = birth.getUTCMonth() + 1;
  let day = birth.getUTCDate();
  if (month === 2 && day === 29 && !isLeap(year)) day = 28;
  return { month, day, time: Date.UTC(year, month - 1, day) };
}

/**
 * Ближайшие дни рождения от `today` (включая сегодня), по возрастанию даты.
 * Чистая функция: список источников уже отфильтрован по дружбе, блокировке и настройкам видимости.
 */
export function upcomingBirthdays(sources: BirthdaySource[], today: Date): BirthdayEntry[] {
  const year = today.getUTCFullYear();
  const todayTime = Date.UTC(year, today.getUTCMonth(), today.getUTCDate());

  return sources
    .map((s) => {
      let occ = occurrence(s.birthDate, year);
      let occYear = year;
      if (occ.time < todayTime) {
        occYear = year + 1;
        occ = occurrence(s.birthDate, occYear);
      }
      return {
        userId: s.userId,
        username: s.username,
        fullName: s.fullName,
        avatarKey: s.avatarKey,
        date: `${occYear}-${pad(occ.month)}-${pad(occ.day)}`,
        month: occ.month,
        day: occ.day,
        daysUntil: Math.round((occ.time - todayTime) / MS_PER_DAY),
        turns: s.hideBirthYear ? null : occYear - s.birthDate.getUTCFullYear(),
      };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil || a.fullName.localeCompare(b.fullName, 'ru'));
}
