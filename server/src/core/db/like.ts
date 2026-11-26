/**
 * Экранирует служебные символы LIKE (`%`, `_`, `\`) в пользовательской строке для startsWith/contains.
 * Prisma их не экранирует: без этого запрос «%%» или «__» совпал бы с любым ником.
 */
export const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');
