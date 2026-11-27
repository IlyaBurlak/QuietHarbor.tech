const SYMBOLS: Record<string, string> = { RUB: '₽', USD: '$', EUR: '€' };

/** «1 500 ₽»; цена без значения — null. */
export function formatPrice(price: string | null, currency: string | null): string | null {
  if (price === null) return null;
  const n = Number(price);
  if (!Number.isFinite(n)) return null;
  return `${n.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ${SYMBOLS[currency ?? 'RUB'] ?? currency}`;
}
