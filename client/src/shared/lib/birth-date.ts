/** Ввод даты рождения маской ДД.ММ.ГГГГ: форматирование и проверка на лету. */

const MIN_YEAR = 1900;

/** Форматирует ввод: оставляет цифры, расставляет точки, дописывает ведущий ноль (5 → 05.). */
export function formatDateInput(next: string, prev = ''): string {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(next.trim());
  if (iso) return `${iso[3]}.${iso[2]}.${iso[1]}`; // вставка 1990-05-17

  let digits = next.replace(/\D/g, '').slice(0, 8);
  const growing = next.length > prev.length;

  if (growing) {
    if (digits.length === 1 && Number(digits) > 3) digits = `0${digits}`;
    if (digits.length === 3 && Number(digits[2]) > 1) digits = `${digits.slice(0, 2)}0${digits[2]}`;
  }

  let out = digits.slice(0, 2);
  if (digits.length > 2) out += `.${digits.slice(2, 4)}`;
  if (digits.length > 4) out += `.${digits.slice(4)}`;
  if (growing && (digits.length === 2 || digits.length === 4)) out += '.';
  return out;
}

export type BirthDateCheck =
  { ok: true; iso: string | null } | { ok: false; kind: 'incomplete' | 'invalid'; message: string };

export const INCOMPLETE_MESSAGE = 'Введите дату полностью: ДД.ММ.ГГГГ';

const daysIn = (month: number, year: number | null) => {
  if (month === 2) {
    if (year === null) return 29;
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
};

/** Проверяет текст маски; пустая строка — допустимо (дата не указана). */
export function checkBirthDate(text: string, today = new Date()): BirthDateCheck {
  const digits = text.replace(/\D/g, '');
  if (!digits) return { ok: true, iso: null };

  const bad = (message: string): BirthDateCheck => ({ ok: false, kind: 'invalid', message });

  const day = digits.length >= 2 ? Number(digits.slice(0, 2)) : null;
  const month = digits.length >= 4 ? Number(digits.slice(2, 4)) : null;

  if (day !== null && (day < 1 || day > 31)) return bad('День: от 01 до 31');
  if (month !== null && (month < 1 || month > 12)) return bad('Месяц: от 01 до 12');
  if (day !== null && month !== null && day > daysIn(month, null)) {
    return bad('В этом месяце нет такого дня');
  }

  if (digits.length < 8) return { ok: false, kind: 'incomplete', message: INCOMPLETE_MESSAGE };

  const year = Number(digits.slice(4, 8));
  if (year < MIN_YEAR) return bad(`Год не раньше ${MIN_YEAR}`);
  if (day! > daysIn(month!, year)) return bad('Такой даты не существует');

  const iso = `${String(year).padStart(4, '0')}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
  if (iso > today.toISOString().slice(0, 10)) return bad('Дата не может быть в будущем');
  return { ok: true, iso };
}

export const isoToDateText = (iso: string | null) =>
  iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : '';
