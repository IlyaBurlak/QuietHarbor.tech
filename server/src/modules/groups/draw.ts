import { randomInt } from 'node:crypto';

export interface DrawPair {
  giverId: string;
  receiverId: string;
}

export const MAX_DRAW_ATTEMPTS = 1000;

/** Равномерное перемешивание (Фишер — Йейтс) на криптостойком генераторе. */
function shuffle<T>(items: readonly T[], rand: (max: number) => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/**
 * Жеребьёвка «Тайный Санта»: перемешиваем участников, каждый дарит следующему по кругу
 * (последний — первому). Исключения симметричны: если A и B в исключениях, ни один не дарит другому.
 * Нарушение — перемешиваем заново, до 1000 попыток. Не вышло — null, ничего не меняется.
 * Чистая функция: без базы и побочных эффектов. `rand` можно подменить в тестах.
 */
export function drawSecretSanta(
  memberIds: readonly string[],
  exclusions: readonly (readonly [string, string])[] = [],
  rand: (max: number) => number = (max) => randomInt(max),
  maxAttempts = MAX_DRAW_ATTEMPTS,
): DrawPair[] | null {
  const ids = [...new Set(memberIds)];
  if (ids.length < 2) return null;
  const banned = new Set(exclusions.map(([a, b]) => pairKey(a, b)));

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const order = shuffle(ids, rand);
    const pairs: DrawPair[] = order.map((giverId, i) => ({
      giverId,
      receiverId: order[(i + 1) % order.length]!,
    }));
    if (pairs.every((p) => !banned.has(pairKey(p.giverId, p.receiverId)))) return pairs;
  }
  return null;
}
