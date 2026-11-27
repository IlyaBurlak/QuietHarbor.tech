#!/usr/bin/env bash
set -euo pipefail

image="${1:?Укажите Docker-образ.}"
container="qh-smoke-$$"
data="$container-data"
snapshot="$container-snapshot"
restored="$container-restored"
network="$container-net"
scratch=$(mktemp -d)

cleanup() {
  if [[ "$?" != 0 ]]; then
    docker logs "$container" 2>&1 | tail -50 || true
  fi
  docker rm -f "$container" >/dev/null 2>&1 || true
  docker volume rm "$data" "$snapshot" "$restored" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
  rm -rf "$scratch"
}
trap cleanup EXIT

start() {
  docker run -d --name "$container" --network "$network" -p 127.0.0.1::80 \
    -v "$1:/var/lib/postgresql/data" -v "$snapshot:/restore" "${@:2}" "$image" >/dev/null
  url="http://localhost:$(docker port "$container" 80/tcp | cut -d: -f2)"
  curl --disable --silent --show-error --fail --retry-all-errors --retry 40 --retry-delay 2 \
    "$url/api/health" >/dev/null
  curl --disable --silent --show-error --fail "$url/" | grep -q 'id="root"'
}

post() {
  curl --disable --silent --show-error --fail --json "$2" "$url/api/$1" >/dev/null
}

restic_in_container() {
  docker exec "$container" restic --repo /data/backups/repository \
    --password-file /data/state/backup-password "$@"
}

user='{"username":"smoketest","password":"K3sZ#7Jx8nTx"}'
docker image inspect "$image" --format '{{json .Config.ExposedPorts}}' \
  | python3 -c 'import json, sys; assert set(json.load(sys.stdin)) == {"80/tcp", "443/tcp"}'
docker network create "$network" >/dev/null
start "$data"
docker run --rm -i --network "$network" --entrypoint node "$image" - "$container" <<'JS'
const net = require('node:net');
const host = process.argv[2];
function reachable(port) {
  return new Promise(resolve => {
    const socket = net.connect({ host, port, timeout: 2000 });
    const done = result => { socket.destroy(); resolve(result); };
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
    socket.once('timeout', () => done(false));
  });
}
(async () => {
  if (!await reachable(80)) throw new Error('Caddy недоступен по HTTP');
  for (const port of [443, 2019, 3000, 5432]) {
    if (await reachable(port)) throw new Error(`Лишний слушающий порт ${port}`);
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
JS
docker exec "$container" sh -ec '
  test "$(stat -c %a /data/state)" = 700
  test "$(stat -c %a /data/state/database-password)" = 600
  test "$(stat -c %a /data/state/session-secret)" = 600
  test ! -S /var/run/docker.sock
'
docker exec --user www-data "$container" sh -ec 'test ! -r /data/state/database-password'
if docker exec "$container" psql -w -h 127.0.0.1 -U wishlist -d wishlist -c 'SELECT 1' 2>/dev/null; then
  echo 'PostgreSQL принял подключение без пароля.' >&2
  exit 1
fi
curl --disable --silent --show-error --fail --cookie-jar "$scratch/cookies" \
  --json '{"username":"smoketest","password":"K3sZ#7Jx8nTx","firstName":"Smoke","lastName":"Test"}' \
  "$url/api/auth/register" >/dev/null
docker exec "$container" node -e \
  'require("sharp")({create:{width:16,height:16,channels:3,background:"white"}}).png().pipe(process.stdout)' \
  > "$scratch/avatar.png"
avatar=$(curl --disable --silent --show-error --fail --cookie "$scratch/cookies" \
  -F "file=@$scratch/avatar.png" "$url/api/users/me/avatar" \
  | python3 -c 'import json, sys; print(json.load(sys.stdin)["profile"]["avatarKey"])')
curl --disable --silent --show-error --fail "$url/api/files/$avatar" > "$scratch/avatar.webp"
printf '%s\n' 'smokeadmin' 'J9fW!7Xy2HtP' | docker exec -i "$container" quietharbor create-admin
post admin/auth/login '{"username":"smokeadmin","password":"J9fW!7Xy2HtP"}'
docker stop "$container" >/dev/null
docker rm "$container" >/dev/null

start "$data" -e BACKUP_SCHEDULE=03:00 -e BACKUP_TIME_ZONE=UTC
post auth/login "$user"
for ((attempt = 0; attempt < 60; attempt++)); do
  if restic_in_container snapshots --tag quietharbor-complete --json 2>/dev/null | grep -q '"id"'; then
    break
  fi
  sleep 2
done
restic_in_container restore latest --tag quietharbor-complete --target /restore
docker stop "$container" >/dev/null
docker rm "$container" >/dev/null

docker run --rm -v "$restored:/var/lib/postgresql/data" \
  -v "$snapshot:/restore:ro" "$image" restore
start "$restored"
post auth/login "$user"
curl --disable --silent --show-error --fail "$url/api/files/$avatar" > "$scratch/restored.webp"
cmp "$scratch/avatar.webp" "$scratch/restored.webp"
docker stop "$container" >/dev/null
docker rm "$container" >/dev/null

docker run -d --name "$container" -p 127.0.0.1::443 -e SITE_ADDRESS=https://localhost \
  -v "$restored:/var/lib/postgresql/data" "$image" >/dev/null
for ((attempt = 0; attempt < 30; attempt++)); do
  if docker cp "$container:/data/caddy-data/caddy/pki/authorities/local/root.crt" \
    "$scratch/root.crt" 2>/dev/null; then
    break
  fi
  sleep 1
done
port=$(docker port "$container" 443/tcp | cut -d: -f2)
curl --disable --silent --show-error --fail --retry-all-errors --retry 10 --retry-delay 1 \
  --cacert "$scratch/root.crt" "https://localhost:$port/api/health" >/dev/null
docker exec "$container" node -e '
  const fs = require("node:fs");
  for (const table of ["/proc/net/udp", "/proc/net/udp6"]) {
    const sockets = fs.readFileSync(table, "utf8").trim().split("\n").slice(1);
    if (sockets.some(row => row.trim().split(/\s+/)[1].endsWith(":01BB"))) {
      throw new Error("HTTPS открыл UDP-порт 443");
    }
  }
'
echo 'Порты, права, HTTPS, админка и восстановление фотографий проверены.'
