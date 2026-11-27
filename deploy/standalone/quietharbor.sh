#!/usr/bin/env bash
set -euo pipefail

state_dir=/data/state
export NODE_ENV=production UPLOADS_DIR=/data/uploads TRUST_PROXY=1
export SERVER_HOST=127.0.0.1 SERVER_PORT=3000
export SITE_ADDRESS="${SITE_ADDRESS:-http://localhost}"
if [[ -z "${CLIENT_URL:-}" ]]; then
  case "$SITE_ADDRESS" in
    http://localhost) CLIENT_URL=http://localhost:8080 ;;
    http://*|https://*) CLIENT_URL=$SITE_ADDRESS ;;
    *) CLIENT_URL="https://$SITE_ADDRESS" ;;
  esac
fi
export CLIENT_URL

persist_secret() {
  local path="$state_dir/$1"
  if [[ ! -s "$path" ]]; then
    (umask 077; openssl rand -hex 32 > "$path.tmp")
    mv -f "$path.tmp" "$path"
  fi
}

load_credentials() {
  session_secret=$(<"$state_dir/session-secret")
  db_password=$(<"$state_dir/database-password")
  database_url="postgresql://wishlist:$db_password@127.0.0.1:5432/wishlist?schema=public"
}

run_app() {
  export SESSION_SECRET="$session_secret" DATABASE_URL="$database_url"
  exec gosu quietharbor env HOME=/home/quietharbor node "$@"
}

start_database() {
  POSTGRES_USER=postgres POSTGRES_DB=postgres POSTGRES_HOST_AUTH_METHOD=scram-sha-256 \
    POSTGRES_INITDB_ARGS='--auth-local=peer --auth-host=scram-sha-256' \
    POSTGRES_PASSWORD="$(openssl rand -hex 32)" \
    docker-entrypoint.sh postgres -c listen_addresses=127.0.0.1 &
  postgres_pid=$!

  local attempt=0
  until pg_isready -q -h 127.0.0.1 -U postgres -d postgres; do
    if ((attempt >= 60)) || ! kill -0 "$postgres_pid"; then
      echo 'PostgreSQL не запустился.' >&2
      return 1
    fi
    attempt=$((attempt + 1))
    sleep 1
  done

  QH_DB_PASSWORD="$db_password" gosu postgres psql -X -v ON_ERROR_STOP=1 \
    -h /var/run/postgresql -U postgres -d postgres <<'SQL'
\getenv app_password QH_DB_PASSWORD
SELECT format('CREATE ROLE wishlist LOGIN PASSWORD %L', :'app_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'wishlist') \gexec
SELECT 'CREATE DATABASE wishlist OWNER wishlist'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'wishlist') \gexec
SQL
}

prepare_volume() {
  install -d -m 0700 "$state_dir"
  exec 9>"$state_dir/lock"
  if ! flock -n 9; then
    echo 'Этот том уже используется другим контейнером QuietHarbor.' >&2
    exit 1
  fi

  persist_secret database-password
  persist_secret session-secret
  load_credentials
  install -d -m 0755 -o quietharbor -g quietharbor "$UPLOADS_DIR"
}

postgres_pid='' api_pid='' web_pid='' backup_pid=''
stop() {
  local pid
  for pid in "$web_pid" "$api_pid" "$backup_pid"; do
    if [[ -n "$pid" ]]; then
      kill -TERM "$pid" 2>/dev/null || true
    fi
  done
  if [[ -n "$postgres_pid" ]]; then
    kill -INT "$postgres_pid" 2>/dev/null || true
  fi
  wait || true
}
trap stop EXIT
trap 'exit 0' TERM INT

serve() {
  prepare_volume
  if [[ -e "$state_dir/restore-incomplete" ]]; then
    echo 'В этом томе осталось незавершённое восстановление. Используйте новый том.' >&2
    exit 1
  fi
  start_database
  DATABASE_URL="$database_url" gosu quietharbor env HOME=/home/quietharbor node /app/node_modules/prisma/build/index.js \
    migrate deploy --schema /app/server/prisma/schema.prisma

  run_app /app/server/dist/index.js &
  api_pid=$!
  install -d -m 0700 -o www-data -g www-data /data/caddy-data /data/caddy-config
  XDG_DATA_HOME=/data/caddy-data XDG_CONFIG_HOME=/data/caddy-config \
    gosu www-data caddy run --config /etc/caddy/Caddyfile --adapter caddyfile &
  web_pid=$!

  if [[ -n "${BACKUP_SCHEDULE:-}" ]]; then
    persist_secret backup-password
    mkdir -p /data/backups/repository
    QH_BACKUP_STATE_DIR="$state_dir" RESTIC_REPOSITORY=/data/backups/repository \
      RESTIC_PASSWORD_FILE="$state_dir/backup-password" BACKUP_TIME_ZONE="${BACKUP_TIME_ZONE:-Europe/Moscow}" \
      PGHOST=127.0.0.1 PGUSER=wishlist PGDATABASE=wishlist PGPASSWORD="$db_password" \
      PGCONNECT_TIMEOUT=10 node /app/backup/backup.mjs &
    backup_pid=$!
  fi

  wait -n || true
  echo 'Один из сервисов QuietHarbor завершился.' >&2
  exit 1
}

restore() {
  local source="$1"
  if [[ ! -s "$source/work/database.dump" ]]; then
    echo 'В каталоге снимка нет файла work/database.dump.' >&2
    exit 1
  fi
  prepare_volume
  if [[ -e "$PGDATA/PG_VERSION" || -e "$state_dir/restore-incomplete" ]]; then
    echo 'Для восстановления нужен новый том QuietHarbor.' >&2
    exit 1
  fi

  touch "$state_dir/restore-incomplete"
  start_database
  PGPASSWORD="$db_password" pg_restore --exit-on-error --single-transaction --no-owner \
    --no-privileges --host 127.0.0.1 --username wishlist --dbname wishlist "$source/work/database.dump"
  if [[ -d "$source/data/uploads" ]]; then
    cp -a --no-preserve=ownership "$source/data/uploads/." "$UPLOADS_DIR/"
    chown -R quietharbor:quietharbor "$UPLOADS_DIR"
  fi
  if [[ -s "$source/data/state/session-secret" ]]; then
    install -m 0600 "$source/data/state/session-secret" "$state_dir/session-secret"
  fi
  rm "$state_dir/restore-incomplete"
  echo 'Данные восстановлены. Теперь запустите QuietHarbor с этим томом.'
}

case "${1:-serve}" in
  serve) serve ;;
  restore) restore "${2:-/restore}" ;;
  create-admin)
    load_credentials
    read -r -p 'Ник администратора: ' ADMIN_USERNAME
    read -r -s -p 'Пароль администратора: ' ADMIN_PASSWORD
    printf '\n'
    export ADMIN_USERNAME ADMIN_PASSWORD
    run_app /app/server/dist/scripts/create-admin.js
    ;;
  reset-link)
    load_credentials
    run_app /app/server/dist/scripts/create-reset-link.js "${2:-}"
    ;;
  *)
    echo 'Допустимые команды: serve, restore, create-admin, reset-link.' >&2
    exit 1
    ;;
esac
