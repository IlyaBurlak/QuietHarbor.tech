FROM postgres:16-alpine
RUN apk add --no-cache nodejs restic tzdata
WORKDIR /work
COPY deploy/backup/ /app/
ENTRYPOINT ["node", "/app/backup.mjs"]
