import { describe, expect, it } from 'vitest';
import { drawSecretSanta } from '../src/modules/groups/draw';

const people = (n: number) => Array.from({ length: n }, (_, i) => `u${i}`);

/** Каждый дарит ровно одному, получает от ровно одного, себе — никогда. */
function assertValid(ids: string[], pairs: { giverId: string; receiverId: string }[] | null) {
  expect(pairs).not.toBeNull();
  const p = pairs!;
  expect(p).toHaveLength(ids.length);
  expect(new Set(p.map((x) => x.giverId))).toEqual(new Set(ids));
  expect(new Set(p.map((x) => x.receiverId))).toEqual(new Set(ids));
  for (const x of p) expect(x.giverId).not.toBe(x.receiverId);
}

describe('drawSecretSanta', () => {
  it.each([3, 4, 20])('работает для %i участников', (n) => {
    const ids = people(n);
    assertValid(ids, drawSecretSanta(ids));
  });

  it('никто не дарит себе на тысяче запусков', () => {
    const ids = people(5);
    for (let i = 0; i < 1000; i++) assertValid(ids, drawSecretSanta(ids));
  });

  it('соблюдает исключения в обе стороны', () => {
    const ids = people(6);
    const ex: [string, string][] = [['u0', 'u1'], ['u2', 'u3']];
    for (let i = 0; i < 300; i++) {
      const pairs = drawSecretSanta(ids, ex)!;
      assertValid(ids, pairs);
      for (const [a, b] of ex) {
        expect(pairs.some((p) => p.giverId === a && p.receiverId === b)).toBe(false);
        expect(pairs.some((p) => p.giverId === b && p.receiverId === a)).toBe(false);
      }
    }
  });

  it('невыполнимый случай даёт null, а не зависание', () => {
    // Втроём любые двое соседи по кругу, поэтому одно исключение уже ломает жеребьёвку
    expect(drawSecretSanta(['a', 'b', 'c'], [['a', 'b']])).toBeNull();
    expect(drawSecretSanta(['a'])).toBeNull();
  });

  it('результат зависит от генератора и случайно меняется', () => {
    const ids = people(8);
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      seen.add(drawSecretSanta(ids)!.map((p) => p.receiverId).join());
    }
    expect(seen.size).toBeGreaterThan(10);
  });
});
