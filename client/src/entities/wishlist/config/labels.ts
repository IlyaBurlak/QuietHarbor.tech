import type { WishlistSort, WishlistVisibility } from '@wishlist/shared';

export const VISIBILITY_OPTIONS: {
  value: WishlistVisibility;
  label: string;
  hint: string;
}[] = [
  { value: 'private', label: 'Только я', hint: 'Вишлист видите только вы.' },
  { value: 'link', label: 'По ссылке', hint: 'Его откроет любой, у кого есть ссылка.' },
  { value: 'friends', label: 'Для друзей', hint: 'Его увидят только ваши друзья.' },
];

export const VISIBILITY_LABEL = Object.fromEntries(
  VISIBILITY_OPTIONS.map((o) => [o.value, o.label]),
) as Record<WishlistVisibility, string>;

export const SORT_OPTIONS: { value: WishlistSort; label: string }[] = [
  { value: 'manual', label: 'Вручную' },
  { value: 'priority', label: 'По приоритету' },
  { value: 'price', label: 'По цене' },
];

export const PRIORITY_LABEL: Record<number, string> = { 1: 'Было бы неплохо', 2: 'Хочу', 3: 'Очень хочу' };

/** Ссылка для шаринга; публичная страница появится в эпике 5. */
export const shareUrl = (slug: string) => `${window.location.origin}/w/${slug}`;
