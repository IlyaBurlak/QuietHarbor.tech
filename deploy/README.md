# Эксплуатация QuietHarbor

## Обновление единого контейнера

Загрузите образ новой версии. Остановите и удалите старый контейнер через `docker stop quietharbor` и `docker rm quietharbor`. Запустите новую версию по той же команде из [README](../README.md), сохранив имя тома и параметры запуска. На старте применятся миграции PostgreSQL.

## Резервные копии в едином контейнере

Добавьте к команде запуска `-e BACKUP_SCHEDULE=03:00 -e BACKUP_TIME_ZONE=Europe/Moscow`. Также можно задать интервал от `1h` до `168h`. Сервис создаёт первый снимок сразу и хранит шифрованные копии в `/data/backups/repository`. Чтобы вынести копии за пределы тома, подключите отдельный каталог сервера параметром `--mount type=bind,source=/srv/quietharbor-backups,target=/data/backups`.

Сохраните ключ отдельно от репозитория копий:

```bash
(umask 077; docker exec quietharbor cat /data/state/backup-password > quietharbor-backup-key)
```

## Восстановление в единый контейнер

Извлеките подтверждённый снимок Restic в пустой каталог. Для снимков из Compose v0.2.0 можно использовать команду из следующего раздела. Для единого контейнера выполните:

```bash
mkdir -p restore
docker run --rm --entrypoint restic -v quietharbor:/var/lib/postgresql/data \
  --mount "type=bind,source=$PWD/restore,target=/restore" \
  ghcr.io/ilyaburlak/quietharbor:0.2.1 \
  -r /data/backups/repository --password-file /data/state/backup-password \
  restore latest --tag quietharbor-complete --target /restore
```

Если копии вынесены в отдельный каталог, подключите его к `/data/backups` и при необходимости подключите сохранённый ключ отдельным файлом. Передайте извлечённый снимок целиком и укажите новый том:

```bash
docker run --rm -v quietharbor-restored:/var/lib/postgresql/data \
  --mount "type=bind,source=$PWD/restore,target=/restore,readonly" \
  ghcr.io/ilyaburlak/quietharbor:0.2.1 restore
```

Запустите приложение с томом `quietharbor-restored`. Для перехода с Compose v0.2.0 используйте подтверждённый снимок старой установки и перенесите настройки домена и портов в команду запуска нового контейнера.

## Установки v0.2.0 через Docker Compose

При первом запуске согласитесь включить копирование. Для уже настроенного сайта запустите установщик из того же каталога и выберите **«Настроить резервное копирование»**. Введите `03:00` для ежедневной копии, укажите часовой пояс или введите интервал от `1h` до `168h` (например, `6h`). Выберите абсолютный путь к каталогу на VPS. По умолчанию копии сохраняются в `backups/` рядом с конфигом. Сервис создаёт первый снимок при пустом хранилище и продолжает работу после закрытия установщика. Результат можно посмотреть через **«Показать журнал резервного копирования»**.

Каждый подтверждённый снимок включает сжатый дамп PostgreSQL, том фотографий и файлы `.env.production` и `.env.backup`. Снимки шифруются, неизменившиеся блоки хранятся один раз. Restic сохраняет все снимки за последние 24 часа, 7 дневных и 4 недельных точки. Сохраните `.env.backup-key` отдельно от VPS. Для защиты от потери сервера храните копию репозитория restic и ключа за пределами VPS.

#### Восстановление из копии

Извлеките последний подтверждённый снимок в пустой каталог. Укажите путь к каталогу бэкапов на хосте, путь к отдельно сохранённому ключу и тот же образ `backup`, которым установлен стек. На Linux выполняйте команды под пользователем с доступом к репозиторию и конфигу, например из root-терминала, если файлы принадлежат root.

```bash
QH_BACKUPS=/srv/quietharbor/backups
QH_BACKUP_KEY=/absolute/path/to/.env.backup-key
QH_BACKUP_IMAGE=ghcr.io/ilyaburlak/quietharbor/backup:0.2.0
QH_RESTORE_DIR=$(mktemp -d)
docker run --rm --entrypoint restic \
  --mount "type=bind,source=$QH_BACKUPS,target=/backup" \
  --mount "type=bind,source=$QH_BACKUP_KEY,target=/key,readonly" \
  --mount "type=bind,source=$QH_RESTORE_DIR,target=/restore" \
  "$QH_BACKUP_IMAGE" -r /backup/repository --password-file /key \
  restore latest --tag quietharbor-complete --target /restore
```

Из корня репозитория поднимите **отдельный** проект с новым именем и пустыми томами. В восстановленном `.env.production` задайте тестовый `CLIENT_URL`, свободные порты, `SITE_ADDRESS=http://localhost` и `PUBLISH_HOST=127.0.0.1`. Используйте версию приложения, с которой сделана копия. Для опубликованных образов укажите `QH_IMAGE_PREFIX=ghcr.io/ilyaburlak/quietharbor` и `QH_IMAGE_TAG=0.2.0`. Для локальных образов оставьте префикс `quietharbor`.

```bash
qh_restore() {
  docker compose -p quietharbor-restore-test \
    --env-file "$QH_RESTORE_DIR/config/.env.production" -f compose.prod.yml "$@"
}
qh_restore up -d --wait db
qh_restore exec -T db sh -ec 'pg_restore --exit-on-error -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < "$QH_RESTORE_DIR/work/database.dump"
qh_restore run --rm --no-deps --user root \
  -v "$QH_RESTORE_DIR/data/uploads:/restore-uploads:ro" --entrypoint sh server \
  -ec 'cp -a /restore-uploads/. /data/uploads/; chown -R node:node /data/uploads'
qh_restore up -d --no-build --pull missing --wait caddy
```

Войдите под существующим аккаунтом и проверьте вишлисты, брони и фотографии. Для запуска восстановленного боевого стека сначала проверьте его адрес и параметры бэкапа. Восстановленный `.env.backup` содержит пути исходного сервера. Установщик предлагает обновить их через **«Настроить резервное копирование»**.
