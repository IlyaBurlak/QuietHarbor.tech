# Фронтенд + Caddy: собирает статику Vite и кладёт её в образ Caddy. Контекст — корень репозитория.
FROM --platform=linux/amd64 node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci -w shared -w client --include-workspace-root --ignore-scripts
COPY tsconfig.base.json ./
COPY shared shared
COPY client client
RUN npm run build -w client

FROM --platform=linux/amd64 caddy:2-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/client/dist /srv/www
