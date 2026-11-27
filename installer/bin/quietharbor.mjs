#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { backupSchedule } from '../../deploy/backup/schedule.mjs';
import { banner, Cancelled, confirm, fail, input, ok, select } from '../src/tui.mjs';

const envFile = resolve('.env.production');
const backupEnvFile = resolve('.env.backup');
const backupKeyFile = resolve('.env.backup-key');
const composeFile = fileURLToPath(new URL('../../compose.prod.yml', import.meta.url));

function docker(args, options) {
  const result = spawnSync('docker', args, { stdio: 'inherit', ...options });
  if (result.error?.code === 'ENOENT') throw new Error('Команда docker не найдена.');
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error('Команда Docker завершилась с ошибкой. Подробности выше.');
  return result.stdout;
}

function compose(args, env = {}) {
  const backupOptions = existsSync(backupEnvFile)
    ? ['--env-file', backupEnvFile, '--profile', 'backup']
    : [];
  docker(['compose', '--env-file', envFile, ...backupOptions, '-f', composeFile, ...args], {
    env: { ...process.env, ...env },
  });
}

async function ask(options) {
  const value = await input(options);
  if (value === null) throw new Cancelled();
  return value;
}

const portError = (value) =>
  /^\d{1,5}$/.test(value) && Number(value) >= 1 && Number(value) <= 65535
    ? null
    : 'Введите порт от 1 до 65535.';

const postgresNameError = (value) =>
  /^[a-z_][a-z0-9_]{0,62}$/.test(value)
    ? null
    : 'Используйте строчные латинские буквы, цифры и подчёркивания.';

function supportUrlError(value) {
  if (!value) return null;
  if (!URL.canParse(value)) return 'Введите ссылку с http:// или https://.';
  const url = new URL(value);
  return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
    ? null
    : 'Введите ссылку с http:// или https://.';
}

// Compose: одинарные кавычки сохраняют значения буквально, включая $ и #.
const envLine = ([key, value]) => `${key}='${String(value).replaceAll("'", "\\'")}'`;

function configDirectoryOnHost() {
  if (!process.env.QH_INSTALLER_CONTAINER) return process.cwd();

  const mounts = docker(['inspect', '--format', '{{json .Mounts}}', process.env.HOSTNAME], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const directory = JSON.parse(mounts).find(
    ({ Type, Destination }) => Type === 'bind' && Destination === '/config',
  );
  if (!directory) throw new Error('Подключите каталог настроек VPS к /config через bind mount.');
  return directory.Source;
}

async function configureBackup() {
  const configured = existsSync(backupEnvFile);
  const current = configured ? parseEnv(readFileSync(backupEnvFile, 'utf8')) : {};
  const configDir = configDirectoryOnHost();
  if (configured && !existsSync(backupKeyFile)) {
    throw new Error('Файл .env.backup-key отсутствует. Верните сохранённый ключ бэкапов.');
  }

  const schedule = await ask({
    message: 'Расписание резервного копирования',
    default: current.BACKUP_SCHEDULE ?? '03:00',
    help: 'Введите ЧЧ:ММ для ежедневной копии или интервал, например 6h.',
    validate: (value) => {
      try {
        backupSchedule(value, 'UTC');
        return null;
      } catch (error) {
        return error.message;
      }
    },
  });
  const timeZone = await ask({
    message: 'Часовой пояс',
    default: current.BACKUP_TIME_ZONE ?? 'Europe/Moscow',
    validate: (value) => {
      try {
        new Intl.DateTimeFormat('ru', { timeZone: value });
        return null;
      } catch {
        return 'Введите часовой пояс, например Europe/Moscow или UTC.';
      }
    },
  });
  const directory = await ask({
    message: 'Каталог для копий на сервере',
    default: current.BACKUP_DIRECTORY ?? posix.join(configDir, 'backups'),
    validate: (value) =>
      posix.isAbsolute(value) && posix.normalize(value) !== '/' && !/[\\\\'\r\n\0]/.test(value)
        ? null
        : 'Введите абсолютный путь к каталогу на VPS, например /srv/quietharbor/backups.',
  });

  if (!existsSync(backupKeyFile)) {
    writeFileSync(backupKeyFile, randomBytes(32).toString('hex') + '\n', {
      mode: 0o600,
      flag: 'wx',
    });
    ok('Ключ сохранён в .env.backup-key. Сохраните этот файл отдельно от VPS.');
  }

  const settings = {
    BACKUP_DIRECTORY: posix.normalize(directory),
    BACKUP_CONFIG_DIR: configDir,
    BACKUP_SCHEDULE: schedule,
    BACKUP_TIME_ZONE: timeZone,
  };
  const temporary = `${backupEnvFile}.${randomBytes(8).toString('hex')}`;
  try {
    writeFileSync(temporary, Object.entries(settings).map(envLine).join('\n') + '\n', {
      mode: 0o600,
      flag: 'wx',
    });
    renameSync(temporary, backupEnvFile);
  } finally {
    rmSync(temporary, { force: true });
  }
  ok('Настройки бэкапа сохранены в .env.backup.');
}

async function configure() {
  const mode = await select({
    message: 'Где будет работать QuietHarbor?',
    choices: [
      { label: 'На этом компьютере', value: 'local', hint: 'http://localhost' },
      { label: 'На сервере с доменом', value: 'domain', hint: 'HTTPS через Caddy' },
    ],
  });
  if (!mode) throw new Cancelled();

  const project = await ask({
    message: 'Имя проекта Docker Compose',
    default: 'wishlist-prod',
    validate: (value) =>
      /^[a-z0-9][a-z0-9_-]{0,62}$/.test(value)
        ? null
        : 'Используйте строчные латинские буквы, цифры, _ и -.',
  });
  const projectFilter = ['--filter', `label=com.docker.compose.project=${project}`];
  const capture = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] };
  const containers = docker(['ps', '-aq', ...projectFilter], capture);
  const volumes = docker(['volume', 'ls', '-q', ...projectFilter], capture);
  if (containers.trim() || volumes.trim()) {
    throw new Error(
      `У проекта «${project}» уже есть контейнеры или тома. Откройте установщик в каталоге с его .env.production или выберите другое имя.`,
    );
  }

  const local = mode === 'local';
  const site = local
    ? 'http://localhost'
    : await ask({
        message: 'Домен',
        help: 'DNS домена должен указывать на сервер. Caddy использует порты 80 и 443.',
        validate: (value) =>
          value.length <= 253 &&
          /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(
            value,
          )
            ? null
            : 'Введите домен без схемы и порта, например wishlist.example.com.',
      });
  const http = local
    ? Number(await ask({ message: 'Порт HTTP', default: '8080', validate: portError }))
    : 80;
  const https = local
    ? Number(
        await ask({
          message: 'Порт HTTPS',
          default: http === 8443 ? '8444' : '8443',
          validate: (value) =>
            portError(value) ?? (Number(value) === http ? 'Выберите другой порт.' : null),
        }),
      )
    : 443;
  const clientUrl = local
    ? `${site}${http === 80 ? '' : `:${http}`}`
    : `https://${site.toLowerCase()}`;
  const postgresUser = await ask({
    message: 'Пользователь PostgreSQL',
    default: 'wishlist',
    validate: postgresNameError,
  });
  const postgresDb = await ask({
    message: 'Имя базы PostgreSQL',
    default: 'wishlist',
    validate: postgresNameError,
  });
  const supportUrl = await ask({
    message: 'Ссылка для связи с поддержкой (необязательно)',
    validate: supportUrlError,
  });

  const settings = {
    COMPOSE_PROJECT_NAME: project,
    SITE_ADDRESS: site.toLowerCase(),
    CLIENT_URL: clientUrl,
    PUBLISH_HOST: local ? '127.0.0.1' : '0.0.0.0',
    HTTP_PORT: http,
    HTTPS_PORT: https,
    POSTGRES_USER: postgresUser,
    POSTGRES_DB: postgresDb,
    POSTGRES_PASSWORD: randomBytes(32).toString('hex'),
    SESSION_SECRET: randomBytes(32).toString('hex'),
    SUPPORT_CONTACT_URL: supportUrl ? new URL(supportUrl).href.replaceAll('\\', '%5C') : '',
  };

  if (
    !(await confirm({ message: `Сохранить настройки и запустить ${clientUrl}?`, default: true }))
  ) {
    throw new Cancelled();
  }
  writeFileSync(envFile, Object.entries(settings).map(envLine).join('\n') + '\n', {
    flag: 'wx',
    mode: 0o600,
  });
  ok('Настройки сохранены в .env.production.');
  if (await confirm({ message: 'Включить резервное копирование?' })) await configureBackup();
  return clientUrl;
}

function start(clientUrl) {
  compose([
    'up',
    '-d',
    '--no-build',
    '--pull',
    'missing',
    '--wait',
    '--wait-timeout',
    '180',
    'caddy',
  ]);
  ok(
    clientUrl
      ? `QuietHarbor запущен. Откройте ${clientUrl}`
      : 'QuietHarbor запущен. Адрес сайта указан в CLIENT_URL.',
  );
  if (existsSync(backupEnvFile)) {
    compose(['up', '-d', '--no-build', '--pull', 'missing', '--no-deps', 'backup']);
    ok('Сервис бэкапа запущен. Результаты доступны в журналах резервного копирования.');
  }
}

async function createAdmin() {
  const username = await ask({
    message: 'Ник администратора',
    validate: (value) =>
      /^[a-z0-9_.]{3,20}$/i.test(value) ? null : 'Введите 3–20 символов: a–z, 0–9, _ и точка.',
  });
  const password = await ask({
    message: 'Пароль администратора',
    secret: true,
    help: 'От 12 символов. Используйте строчные и заглавные буквы, цифры или знаки.',
    validate: (value) => (value.length >= 12 ? null : 'Пароль должен быть не короче 12 символов.'),
  });
  const repeated = await ask({ message: 'Повторите пароль', secret: true });
  if (password !== repeated) throw new Error('Пароли не совпали.');

  compose(['run', '--rm', '--no-deps', '--pull', 'missing', '-T', 'create-admin'], {
    ADMIN_USERNAME: username,
    ADMIN_PASSWORD: password,
  });
}

async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Для меню нужен терминал. При запуске контейнера укажите docker run --rm -it.');
  }

  console.log(banner('Настройка и запуск'));

  if (!existsSync(envFile)) {
    start(await configure());
    if (await confirm({ message: 'Создать администратора?' })) await createAdmin();
    return;
  }

  const action = await select({
    message: 'Найден .env.production. Выберите действие',
    choices: [
      { label: 'Запустить приложение', value: 'start' },
      { label: 'Создать или обновить администратора', value: 'admin' },
      { label: 'Показать состояние контейнеров', value: 'status' },
      { label: 'Остановить приложение', value: 'stop' },
      { label: 'Настроить резервное копирование', value: 'backup' },
      {
        label: 'Показать журнал резервного копирования',
        value: 'backup-logs',
        disabled: !existsSync(backupEnvFile),
      },
      { label: 'Выйти', value: 'quit' },
    ],
  });

  if (action === 'start') start();
  if (action === 'admin') await createAdmin();
  if (action === 'status') compose(['ps', '-a']);
  if (action === 'stop') compose(['stop']);
  if (action === 'backup') {
    await configureBackup();
    start();
  }
  if (action === 'backup-logs') compose(['logs', '--tail', '50', 'backup']);
}

try {
  await main();
} catch (error) {
  if (!(error instanceof Cancelled)) {
    fail(error.message);
    process.exitCode = 1;
  }
}
