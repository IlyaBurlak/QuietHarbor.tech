# Бэкенд

> 🚧 Документация заполняется по мере разработки. Пока актуальны правила архитектуры в [`CLAUDE.md`](CLAUDE.md) и модель данных в [`../docs/MVP-plan.md`](../docs/MVP-plan.md#модель-данных).

[← К корневому README](../README.md)

## Содержание (план)

- [ ] Запуск, переменные окружения, миграции
- [ ] Структура модулей (route → service → prisma)
- [ ] Справочник API: авторизация, вишлисты, товары, бронь, друзья, группы, админка
- [ ] Модель данных и схема Prisma
- [ ] Сессии, права доступа, формат ошибок
- [ ] Загрузка и хранение файлов
- [ ] Тесты и тестовая база

## Кратко

- Стек: Node.js, Express 5, TypeScript, Prisma 6, PostgreSQL 16.
- Запуск: `npm run dev:server` из корня (порт 3000, префикс `/api`).
- Реализовано: `POST /auth/register`, `/auth/login`, `/auth/logout`, `GET /auth/me`, `GET /auth/username-available`, `POST /auth/password-reset-requests`, `POST /auth/reset-password`, `GET/PATCH/DELETE /users/me`, `POST /users/me/password`, `GET /public/config`, `GET /health`.
- Сброс пароля до появления админ-панели: `npm run reset-link -- WL-XXXXXX` выдаёт одноразовую ссылку по коду заявки.
