<div align="center">

# Wishlist

**Списки желаний, тайная бронь подарков и Тайный Санта — для друзей и семьи.**

![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A520-339933?logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![Ant Design](https://img.shields.io/badge/Ant%20Design-5-1677FF?logo=antdesign&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![Status](https://img.shields.io/badge/status-MVP%20in%20development-orange)

[Документация фронтенда](client/README.md) ·
[Документация бэкенда](server/README.md) ·
[План MVP](docs/MVP-plan.md) ·
[Дизайн и UX](docs/DESIGN.md)

</div>

---

## О проекте

Wishlist решает простую проблему: люди не знают, что подарить, а подарки получаются одинаковыми или ненужными. В приложении:

1. вы заводите **вишлисты** («День рождения», «Новый год») и добавляете желания: название, цена, фото, ссылка на магазин;
2. **делитесь ссылкой** — друзьям не нужно регистрироваться, чтобы посмотреть список;
3. друзья **бронируют подарки втайне от вас**, и никто не дарит одно и то же дважды;
4. компании играют в **Тайного Санту** с честной жеребьёвкой на сервере.

### Главные принципы

- **Секретность.** Владелец вишлиста не видит брони на свои подарки — данных о них нет даже в ответах API. Организатор Санты не видит чужие пары.
- **Приватность.** Каждый вишлист: «только я», «по ссылке» или «для друзей». Права проверяются только на сервере.
- **Доступность и адаптив.** Интерфейс рассчитан на телефон, планшет и ноутбук, соответствует WCAG 2.2 AA и не навязывает анимации.
- **Минимум личных данных.** Вход по нику и паролю или через Telegram, Google, GitHub; почта и телефон не нужны.

## Возможности MVP

| Раздел | Что входит |
| --- | --- |
| Аккаунт | регистрация и вход по нику, профиль, дата рождения с гибкой видимостью, аватар |
| Вишлисты | несколько списков, приватность, публичная ссылка с перевыпуском, сортировка и drag-and-drop |
| Товары | ручной ввод, до 5 фото, похожие товары, приоритет |
| Бронь | бронь и «куплено» втайне от владельца, страница «Мои подарки» |
| Друзья | поиск по нику, заявки, календарь дней рождения |
| Тайный Санта | группы, приглашения, исключения, жеребьёвка на сервере |
| Администратор | статистика базы, сброс паролей по заявкам, блокировка аккаунтов, журнал действий |

Статус задач по эпикам — в [плане MVP](docs/MVP-plan.md).

## Технологии

| Слой | Стек |
| --- | --- |
| Фронтенд | React, TypeScript, Vite, React Router, Ant Design, TanStack Query, Axios, react-hook-form, Zod; архитектура FSD |
| Бэкенд | Node.js, Express, TypeScript, Prisma, PostgreSQL, Zod, argon2, multer, sharp; модульная архитектура |
| Общий код | `shared/` — Zod-схемы и типы для клиента и сервера |
| Тесты | Vitest, Supertest |
| Окружение | Docker Compose (PostgreSQL), npm workspaces |

## Структура репозитория

```
├── client/   фронтенд (FSD)            → client/README.md
├── server/   бэкенд (API, Prisma)      → server/README.md
├── shared/   общие схемы и типы
├── docs/     план MVP и дизайн-документ
└── compose.dev.yml   PostgreSQL для разработки
```

## Быстрый старт

Нужны Node.js ≥ 20 и Docker.

```bash
git clone <адрес-репозитория>
cd QuietHarbor.tech
cp .env.example .env     # значения для разработки уже подходят
npm install
npm run dev              # база в Docker + миграции + API :3000 + фронт :5173
```

Откройте <http://localhost:5173>. Дополнительно:

```bash
npm run db:seed          # тестовые пользователи alice / bob, пароль password123
npm run create-admin     # администратор из ADMIN_USERNAME / ADMIN_PASSWORD
npm run db:studio        # просмотр базы в браузере
```

## Команды

| Команда | Что делает |
| --- | --- |
| `npm run dev` | вся среда разработки одной командой |
| `npm run dev:db` / `dev:down` | поднять / остановить базу |
| `npm run dev:reset` | пересоздать локальную базу с тестовыми данными |
| `npm run db:migrate` | создать и применить миграцию |
| `npm test` | тесты (используют отдельную базу `wishlist_test`) |
| `npm run lint` / `typecheck` / `build` | линтер, типы, сборка |

Команды прод-стека (`prod:*`) появятся в эпике 9.

## Документация

| Документ | О чём | Статус |
| --- | --- | --- |
| [Фронтенд](client/README.md) | устройство клиента, FSD, компоненты, работа с API | 🚧 заполняется |
| [Бэкенд](server/README.md) | модули, эндпоинты, модель данных, права | 🚧 заполняется |
| [План MVP](docs/MVP-plan.md) | задачи по эпикам, модель данных, порядок работ | ✅ |
| [Дизайн и UX](docs/DESIGN.md) | палитра, адаптив, макеты экранов, анимации, футер | ✅ |
| [CLAUDE.md](CLAUDE.md) | правила проекта для ИИ-ассистента | ✅ |

## Дорожная карта

Работа идёт в пять этапов: фундамент → вишлисты и товары → шаринг и бронь → друзья и Санта → админка, качество, релиз. Подробности и сроки — в [плане MVP](docs/MVP-plan.md#порядок-работ).

После релиза рассматриваются: автоподстановка данных по ссылке, каталог товаров, расширение для браузера, уведомления и напоминания о датах.

## Участие в разработке

1. Выберите задачу из [плана MVP](docs/MVP-plan.md) и создайте ветку `feature/<номер-задачи>-<кратко>`.
2. Следуйте архитектуре: [FSD на фронте](client/CLAUDE.md), [модули на бэке](server/CLAUDE.md).
3. Перед пул-реквестом: `npm run lint && npm run typecheck && npm test`.
4. В названии коммита — номер задачи, например `2.1: регистрация`.

## Автор

Разработка и поддержка: **@Ilya_Burlak**.

## Лицензия

Лицензия пока не выбрана.
