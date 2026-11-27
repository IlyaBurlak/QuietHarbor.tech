import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, rmSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { setTimeout } from 'node:timers/promises';
import { backupSchedule } from './schedule.mjs';

const dumpFile = '/work/database.dump';
const completeTag = 'quietharbor-complete';
const pendingTag = 'quietharbor-pending';
const stateDir = process.env.QH_BACKUP_STATE_DIR;
const configFiles = stateDir
  ? [`${stateDir}/session-secret`]
  : ['/config/.env.production', '/config/.env.backup'];

function restic(args) {
  return execFileSync('restic', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
}

async function dumpDatabase() {
  const snapshot = spawn('psql', ['-XqAt', '-v', 'ON_ERROR_STOP=1'], {
    stdio: ['pipe', 'pipe', 'inherit'],
  });
  // Await the process even when PostgreSQL closes the connection before the dump starts.
  const closed = once(snapshot, 'close').catch(() => [1]);
  const lines = createInterface({ input: snapshot.stdout, crlfDelay: Infinity });
  snapshot.stdin.on('error', () => {});
  snapshot.stdin.write(`
    BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
    SELECT pg_export_snapshot();
    SELECT "avatarKey" FROM public."User" WHERE "avatarKey" IS NOT NULL
    UNION SELECT "fileKey" FROM public."ItemImage";
    \\echo qh-files-end
  `);

  try {
    const rows = lines[Symbol.asyncIterator]();
    const { value: id } = await rows.next();
    if (!id || !/^[a-fA-F0-9]{8}-[a-fA-F0-9]{8}-\d+$/.test(id)) {
      throw new Error('PostgreSQL не вернул идентификатор снимка.');
    }
    const photos = [];
    for (;;) {
      const { value: key } = await rows.next();
      if (key === 'qh-files-end') break;
      if (!key || !/^[a-f0-9]{32}\.webp$/.test(key)) {
        throw new Error('Не удалось получить список фотографий из PostgreSQL.');
      }
      photos.push(`/data/uploads/${key}`);
    }
    execFileSync('pg_dump', ['-Fc', '--snapshot', id, '--file', dumpFile], { stdio: 'inherit' });
    return photos;
  } finally {
    lines.close();
    snapshot.stdin.end('ROLLBACK;\n');
    await closed;
  }
}

function snapshots(tag) {
  return JSON.parse(restic(['snapshots', '--tag', tag, '--json']));
}

async function verifyFiles(candidate, paths) {
  const listing = spawn('restic', ['ls', '--json', candidate], {
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const closed = once(listing, 'close').catch(() => [1]);
  const remaining = new Set(paths);
  const lines = createInterface({ input: listing.stdout, crlfDelay: Infinity });
  for await (const line of lines) {
    const entry = JSON.parse(line);
    if (entry.type === 'file') remaining.delete(entry.path);
  }
  const [status] = await closed;
  if (status !== 0 || remaining.size) {
    throw new Error(
      'В копии отсутствует один или несколько файлов, указанных в дампе или конфигурации.',
    );
  }
}

async function backup() {
  try {
    const photos = await dumpDatabase();
    // Даже если restic создаст неполный снимок, он останется с меткой pending.
    const output = restic([
      'backup',
      '--quiet',
      '--json',
      '--compression',
      'auto',
      '--host',
      'quietharbor',
      '--tag',
      pendingTag,
      dumpFile,
      ...configFiles,
      '/data/uploads',
    ]);
    const summary = JSON.parse(output.trim().split('\n').at(-1));
    const candidate = summary.snapshot_id;
    if (!candidate) throw new Error('Restic не вернул идентификатор снимка.');
    await verifyFiles(candidate, [dumpFile, ...configFiles, ...photos]);
    restic(['tag', '--set', completeTag, candidate]);
    console.log(`Копия QuietHarbor сохранена (${photos.length} фото).`);
  } finally {
    rmSync(dumpFile, { force: true });
  }
}

function rotate() {
  restic([
    'forget',
    '--tag',
    completeTag,
    '--group-by',
    '',
    '--keep-within',
    '24h',
    '--keep-daily',
    '7',
    '--keep-weekly',
    '4',
    '--prune',
  ]);
}

function prepareRepository() {
  if (!existsSync(`${process.env.RESTIC_REPOSITORY}/config`)) {
    restic(['init', '--repository-version', '2']);
  }

  const dates = snapshots(completeTag).map(({ time }) => Date.parse(time));
  return dates.length ? new Date(Math.max(...dates)) : null;
}

process.umask(0o077);
const due = backupSchedule(process.env.BACKUP_SCHEDULE, process.env.BACKUP_TIME_ZONE);
let last;
for (;;) {
  try {
    if (last === undefined) last = prepareRepository();
    if (due(new Date(), last)) {
      // Удаляем неудачную копию от предыдущей попытки до создания новой.
      const incomplete = snapshots(pendingTag);
      if (incomplete.length) restic(['forget', ...incomplete.map(({ id }) => id)]);
      await backup();
      last = new Date();
      rotate();
    }
    await setTimeout(30_000);
  } catch (error) {
    console.error(`Ошибка резервного копирования: ${error.message}`);
    await setTimeout(5 * 60_000);
  }
}
