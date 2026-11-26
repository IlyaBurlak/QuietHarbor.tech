import { z } from 'zod';

export const CURRENCIES = ['RUB', 'USD', 'EUR'] as const;
export const MAX_ITEM_IMAGES = 5;
export const MAX_ITEM_LINKS = 5;

/** Приоритет желания от 1 (низкий) до 5 (очень высокий). */
export const MAX_PRIORITY = 5;

/** Только http и https: javascript: и прочие схемы отвергаются. */
export const httpUrlSchema = z
  .string()
  .trim()
  .max(2000, 'Слишком длинная ссылка')
  .refine((v) => {
    try {
      return ['http:', 'https:'].includes(new URL(v).protocol);
    } catch {
      return false;
    }
  }, 'Ссылка должна начинаться с http:// или https://');

export const itemLinkInputSchema = z.object({
  url: httpUrlSchema,
  label: z.string().trim().max(100, 'Не длиннее 100 символов').optional(),
});
export type ItemLinkInput = z.infer<typeof itemLinkInputSchema>;

const price = z
  .number({ error: 'Укажите число' })
  .min(0, 'Цена не может быть отрицательной')
  .max(1_000_000_000, 'Слишком большая цена')
  .nullable();

export const itemInputSchema = z.object({
  title: z.string().trim().min(1, 'Укажите название').max(150, 'Не длиннее 150 символов'),
  description: z.string().trim().max(2000, 'Не длиннее 2000 символов').nullable().optional(),
  note: z.string().trim().max(300, 'Не длиннее 300 символов').nullable().optional(),
  price: price.optional(),
  currency: z.enum(CURRENCIES).optional(),
  url: httpUrlSchema.nullable().optional(),
  priority: z.number().int().min(1).max(MAX_PRIORITY).optional(),
  links: z
    .array(itemLinkInputSchema)
    .max(MAX_ITEM_LINKS, `Не больше ${MAX_ITEM_LINKS} ссылок`)
    .optional(),
});
export type ItemInput = z.infer<typeof itemInputSchema>;

export const updateItemSchema = itemInputSchema.partial();
export type UpdateItemInput = z.infer<typeof updateItemSchema>;

/** Бронь глазами гостя или другого пользователя. Владельцу это поле не отдаётся никогда. */
export const reservationViewSchema = z.object({
  status: z.enum(['free', 'reserved', 'bought']),
  /** true, если бронь сделал сам смотрящий. Имя забронировавшего никому не показывается. */
  mine: z.boolean(),
});
export type ReservationView = z.infer<typeof reservationViewSchema>;
