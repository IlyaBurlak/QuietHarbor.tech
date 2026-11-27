const SYMBOLS: Record<string, string> = { RUB: '₽', USD: '$', EUR: '€' };

export function formatBudget(budget: string | null, currency: string | null): string | null {
  if (budget === null) return null;
  const n = Number(budget);
  if (!Number.isFinite(n)) return null;
  return `${n.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ${SYMBOLS[currency ?? 'RUB'] ?? currency}`;
}

export const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('ru-RU') : null;

export const inviteUrl = (code: string) => `${window.location.origin}/join/${code}`;
