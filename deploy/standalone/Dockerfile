FROM node:22-bookworm-slim AS npm-base
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/

FROM npm-base AS build
RUN npm ci --ignore-scripts
COPY tsconfig.base.json ./
COPY shared shared
COPY server server
COPY client client
RUN npm run build

FROM npm-base AS server-runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY server/prisma server/prisma
RUN npm ci --omit=dev -w server -w shared --ignore-scripts \
  && node node_modules/prisma/build/index.js generate --schema server/prisma/schema.prisma

FROM caddy:2-alpine AS web

FROM postgres:16-bookworm AS database

# Keep the PostgreSQL filesystem without inheriting its public port metadata.
FROM scratch
COPY --from=database / /
ENV PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/lib/postgresql/16/bin \
    LANG=en_US.utf8 \
    PGDATA=/data/postgres
RUN apt-get update && apt-get install -y --no-install-recommends libcap2-bin openssl restic tini \
  && rm -rf /var/lib/apt/lists/* \
  && useradd --create-home --system --user-group --shell /usr/sbin/nologin quietharbor \
  && ln -s /var/lib/postgresql/data /data \
  && mkdir -p /work /etc/caddy
COPY --from=server-runtime /usr/local/bin/node /usr/local/bin/node
COPY --from=server-runtime /app/node_modules /app/node_modules
COPY --from=build /app/server/package.json /app/server/package.json
COPY --from=build /app/server/dist /app/server/dist
COPY --from=server-runtime /app/server/prisma /app/server/prisma
COPY --from=build /app/client/dist /srv/www
COPY --from=web /usr/bin/caddy /usr/bin/caddy
COPY deploy/Caddyfile /etc/caddy/Caddyfile
RUN setcap cap_net_bind_service=+ep /usr/bin/caddy \
  && sed -i '1i\{\n\tadmin off\n\tservers {\n\t\tprotocols h1 h2\n\t}\n}\n' /etc/caddy/Caddyfile \
  && sed -i 's/reverse_proxy server:3000/reverse_proxy 127.0.0.1:3000/' /etc/caddy/Caddyfile
COPY deploy/backup /app/backup
COPY --chmod=0755 deploy/standalone/quietharbor.sh /usr/local/bin/quietharbor

WORKDIR /app/server
VOLUME ["/var/lib/postgresql/data"]
EXPOSE 80 443
HEALTHCHECK --interval=10s --timeout=5s --start-period=60s \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
STOPSIGNAL SIGTERM
ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/quietharbor"]
CMD ["serve"]
