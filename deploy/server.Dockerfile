# Бэкенд: три цели из одного файла. Контекст сборки — корень репозитория.
#   build   — зависимости + сборка (tsup) + prisma generate
#   migrate — одноразовый контейнер: prisma migrate deploy
#   runtime — итоговый образ API (только прод-зависимости)
FROM --platform=linux/amd64 node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS build
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
# postinstall вызывает prisma generate, а схемы ещё нет: ставим без скриптов и генерируем ниже
RUN npm ci -w shared -w server --include-workspace-root --ignore-scripts
COPY tsconfig.base.json ./
COPY shared shared
COPY server server
RUN npx prisma generate --schema server/prisma/schema.prisma && npm run build -w server

FROM build AS migrate
WORKDIR /app/server
CMD ["npx", "prisma", "migrate", "deploy"]

FROM base AS runtime
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
# Скрипты пропускаем: prisma generate нужен CLI из devDependencies, готовый клиент берём из build
RUN npm ci -w shared -w server --include-workspace-root --omit=dev --ignore-scripts \
  && npm cache clean --force
COPY --from=build /app/node_modules/.prisma node_modules/.prisma
COPY --from=build /app/server/dist server/dist
# Папка для фото. Владелец — пользователь node: именованный том унаследует права при первом создании
RUN mkdir -p /data/uploads && chown -R node:node /data
ENV UPLOADS_DIR=/data/uploads
USER node
WORKDIR /app/server
EXPOSE 3000
CMD ["node", "dist/index.js"]
