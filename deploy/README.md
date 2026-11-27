# Резервные копии QuietHarbor

При первом запуске согласитесь включить копирование. Для уже настроенного сайта запустите установщик из того же каталога и выберите **«Настроить резервное копирование»**. Введите `03:00` для ежедневной копии, укажите часовой пояс или введите интервал от `1h` до `168h` (например, `6h`). Выберите абсолютный путь к каталогу на VPS. По умолчанию копии сохраняются в `backups/` рядом с конфигом. Сервис создаёт первый снимок при пустом хранилище и продолжает работу после закрытия установщика. Результат можно посмотреть через **«Показать журнал резервного копирования»**.

Каждый подтверждённый снимок включает сжатый дамп PostgreSQL, том фотографий и файлы `.env.production` и `.env.backup`. Снимки шифруются, неизменившиеся блоки хранятся один раз. Restic сохраняет все снимки за последние 24 часа, 7 дневных и 4 недельных точки. Сохраните `.env.backup-key` отдельно от VPS. Для защиты от потери сервера храните копию репозитория restic и ключа за пределами VPS.

### Восстановление из копии

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
