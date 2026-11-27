FROM docker:29-cli AS docker-cli
FROM node:22-alpine

COPY --from=docker-cli /usr/local/bin/docker /usr/local/bin/docker
COPY --from=docker-cli /usr/local/libexec/docker/cli-plugins/docker-compose /usr/local/libexec/docker/cli-plugins/docker-compose

ARG QH_IMAGE_PREFIX=ghcr.io/ilyaburlak/quietharbor
ARG QH_IMAGE_TAG=0.2.0
ENV QH_IMAGE_PREFIX=${QH_IMAGE_PREFIX} QH_IMAGE_TAG=${QH_IMAGE_TAG}
ENV QH_INSTALLER_CONTAINER=1

COPY compose.prod.yml /app/compose.prod.yml
COPY installer/bin /app/installer/bin
COPY installer/src /app/installer/src
COPY deploy/backup/schedule.mjs /app/deploy/backup/schedule.mjs

WORKDIR /config
ENTRYPOINT ["node", "/app/installer/bin/quietharbor.mjs"]
