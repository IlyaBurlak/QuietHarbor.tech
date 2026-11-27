import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/core/db/prisma';
import { upcomingBirthdays } from '../src/modules/calendar/birthdays';
import { cleanDb, signedInAgent } from './helpers';

const app = createApp();
beforeEach(cleanDb);
afterAll(() => prisma.$disconnect());

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const src = (birth: string, over: object = {}) => ({
  userId: birth,
  username: 'u',
  fullName: 'Друг',
  avatarKey: null,
  birthDate: d(birth),
  hideBirthYear: false,
  ...over,
});

describe('upcomingBirthdays', () => {
  it('сегодняшний день рождения — через 0 дней', () => {
    const [e] = upcomingBirthdays([src('1990-06-15')], d('2026-06-15'));
    expect(e).toMatchObject({ date: '2026-06-15', daysUntil: 0, turns: 36 });
  });

  it('прошедший в этом году переносится на следующий', () => {
    const [e] = upcomingBirthdays([src('1990-03-01')], d('2026-06-15'));
    expect(e).toMatchObject({ date: '2027-03-01', turns: 37 });
    expect(e!.daysUntil).toBe(259);
  });

  it('сортирует по ближайшей дате, через конец года', () => {
    const list = upcomingBirthdays(
      [src('1990-01-10'), src('1990-12-30'), src('1990-07-01')],
      d('2026-06-15'),
    );
    expect(list.map((e) => e.date)).toEqual(['2026-07-01', '2026-12-30', '2027-01-10']);
  });

  it('скрытый год: возраст не отдаётся', () => {
    const [e] = upcomingBirthdays([src('1990-06-20', { hideBirthYear: true })], d('2026-06-15'));
    expect(e!.turns).toBeNull();
  });

  it('29 февраля в невисокосный год — 28 февраля, в високосный — 29', () => {
    const born = src('2000-02-29');
    expect(upcomingBirthdays([born], d('2026-01-10'))[0]).toMatchObject({
      date: '2026-02-28',
      day: 28,
      month: 2,
    });
    expect(upcomingBirthdays([born], d('2028-01-10'))[0]).toMatchObject({
      date: '2028-02-29',
      day: 29,
    });
  });

  it('после 28 февраля невисокосного года ждёт 29 февраля високосного', () => {
    const [e] = upcomingBirthdays([src('2000-02-29')], d('2027-03-01'));
    expect(e!.date).toBe('2028-02-29');
  });
});

describe('GET /calendar/birthdays', () => {
  it('требует вход', async () => {
    expect((await request(app).get('/api/calendar/birthdays')).status).toBe(401);
  });

  it('показывает только принятых друзей с открытой датой, без скрытых данных', async () => {
    const agent = await signedInAgent(app);
    const me = await prisma.user.findUniqueOrThrow({ where: { username: 'tester' } });
    const mk = (username: string, over: object = {}) =>
      prisma.user.create({
        data: {
          username,
          firstName: username,
          lastName: 'Друг',
          fullName: `${username} Друг`,
          birthDate: d('1990-06-20'),
          birthdayVisibility: 'friends',
          ...over,
        },
      });
    const befriend = (id: string, status: 'accepted' | 'pending' = 'accepted') =>
      prisma.friendship.create({ data: { requesterId: me.id, addresseeId: id, status } });

    const shown = await mk('shown');
    const hiddenYear = await mk('hiddenyear', { hideBirthYear: true });
    const nobody = await mk('nobody', { birthdayVisibility: 'nobody' });
    const blocked = await mk('blocked', { status: 'blocked' });
    const noDate = await mk('nodate', { birthDate: null });
    const pending = await mk('pending');
    await mk('stranger');
    for (const u of [shown, hiddenYear, nobody, blocked, noDate]) await befriend(u.id);
    await befriend(pending.id, 'pending');

    const res = await agent.get('/api/calendar/birthdays');
    expect(res.status).toBe(200);
    const names = res.body.birthdays.map((b: { username: string }) => b.username).sort();
    expect(names).toEqual(['hiddenyear', 'shown']);
    const hidden = res.body.birthdays.find(
      (b: { username: string }) => b.username === 'hiddenyear',
    );
    expect(hidden.turns).toBeNull();
    expect(res.text).not.toContain('1990');
  });
});
