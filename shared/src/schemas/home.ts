import { z } from 'zod';

/** Блоки главной страницы, которые пользователь может включать и выключать. */
export const HOME_WIDGETS = [
  { id: 'stats', label: 'Сводка', hint: 'Плитки: вишлисты, желания, друзья, брони' },
  { id: 'friendRequests', label: 'Заявки в друзья', hint: 'Полоса с новыми заявками' },
  { id: 'wishlists', label: 'Мои вишлисты', hint: 'Последние вишлисты' },
  { id: 'groups', label: 'Мои игры Тайный Санта', hint: 'Ваши игры и их статус' },
  { id: 'events', label: 'Ближайшие праздники', hint: 'Дни рождения, даты вишлистов и игр' },
  { id: 'quickActions', label: 'Быстрые действия', hint: 'Кнопки создания и поиска' },
] as const;

export type HomeWidgetId = (typeof HOME_WIDGETS)[number]['id'];
const IDS = HOME_WIDGETS.map((w) => w.id) as [HomeWidgetId, ...HomeWidgetId[]];

/** Хранятся скрытые блоки: новые блоки, появившиеся позже, у всех включены по умолчанию. */
export const homeSettingsSchema = z.object({
  hidden: z.array(z.enum(IDS)).max(IDS.length),
});
export type HomeSettings = z.infer<typeof homeSettingsSchema>;
