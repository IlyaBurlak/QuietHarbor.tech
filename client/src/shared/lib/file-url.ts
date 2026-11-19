/** Адрес файла по ключу из базы (`fileKey`). Сегодня раздаёт бэкенд, позже можно перенести на CDN. */
export const fileUrl = (key: string) => `/api/files/${key}`;
