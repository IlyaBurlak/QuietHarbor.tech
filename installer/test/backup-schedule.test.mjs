import assert from 'node:assert/strict';
import test from 'node:test';
import { backupSchedule } from '../../deploy/backup/schedule.mjs';

test('первая копия делается сразу, интервал считается от последнего снимка', () => {
  const due = backupSchedule('6h', 'UTC');
  const last = new Date('2026-11-26T08:00:00Z');
  assert.equal(due(last, null), true);
  assert.equal(due(new Date('2026-11-26T13:59:59Z'), last), false);
  assert.equal(due(new Date('2026-11-26T14:00:00Z'), last), true);
});

test('ежедневное время учитывает часовой пояс и пропускает повтор в этот день', () => {
  const due = backupSchedule('03:00', 'Europe/Moscow');
  const last = new Date('2026-11-26T00:00:00Z');
  const next = new Date('2026-11-27T00:00:00Z');
  assert.equal(due(new Date('2026-11-26T23:59:59Z'), last), false);
  assert.equal(due(next, last), true);
  assert.equal(due(new Date('2026-11-27T09:00:00Z'), next), false);
});

test('после простоя пропущенная копия запускается при возвращении сервиса', () => {
  const due = backupSchedule('03:00', 'UTC');
  const now = new Date('2026-11-27T02:00:00Z');
  assert.equal(due(now, new Date('2026-11-25T03:00:00Z')), true);
  assert.equal(due(now, new Date('2026-11-26T03:00:00Z')), false);
});

test('некорректное расписание отклоняется', () => {
  assert.throws(() => backupSchedule('24:00', 'UTC'));
  assert.throws(() => backupSchedule('169h', 'UTC'));
  assert.throws(() => backupSchedule('03:00', 'Invalid/Zone'));
});
