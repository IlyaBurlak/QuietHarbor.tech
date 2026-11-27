import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/core/db/prisma';
import { cleanDb, signedInAgent } from './helpers';

const app = createApp();
beforeEach(cleanDb);
afterAll(() => prisma.$disconnect());

const NAMES = ['org', 'anna', 'boris', 'vera', 'gleb'];

async function room(n = 4) {
  const agents: Record<string, request.Agent> = {};
  for (const name of NAMES.slice(0, n)) {
    agents[name] = await signedInAgent(app, { username: name, firstName: name });
  }
  const org = agents.org!;
  const group = (await org.post('/api/groups').send({ title: 'Санта', budget: 1500 })).body.group;
  const detail = (await org.get(`/api/groups/${group.id}`)).body.group;
  for (const name of NAMES.slice(1, n)) {
    await agents[name]!.post(`/api/groups/join/${detail.inviteCode}`);
  }
  const ids: Record<string, string> = {};
  for (const u of await prisma.user.findMany()) ids[u.username!] = u.id;
  return { agents, org, id: group.id as string, code: detail.inviteCode as string, ids };
}

describe('группы', () => {
  it('создаёт, показывает только участникам, правит и удаляет только организатор', async () => {
    const { agents, org, id } = await room(3);
    const outsider = await signedInAgent(app, { username: 'zed' });
    expect((await org.get('/api/groups')).body.groups).toHaveLength(1);
    expect((await outsider.get('/api/groups')).body.groups).toEqual([]);
    expect((await outsider.get(`/api/groups/${id}`)).status).toBe(404);
    expect((await agents.anna!.patch(`/api/groups/${id}`).send({ title: 'x' })).status).toBe(403);
    expect((await agents.anna!.delete(`/api/groups/${id}`)).status).toBe(403);
    expect((await org.patch(`/api/groups/${id}`).send({ title: 'Новое' })).body.group.title).toBe('Новое');
    expect((await org.post('/api/groups').send({ title: ' ' })).status).toBe(400);
    expect((await org.delete(`/api/groups/${id}`)).status).toBe(204);
  });

  it('приглашение: предпросмотр без входа, вступление, перевыпуск кода', async () => {
    const { org, id, code } = await room(2);
    const preview = await request(app).get(`/api/groups/join/${code}`);
    expect(preview.status).toBe(200);
    expect(preview.body.group).toMatchObject({ title: 'Санта', membersCount: 2 });
    expect(JSON.stringify(preview.body)).not.toContain('inviteCode');
    expect((await request(app).post(`/api/groups/join/${code}`)).status).toBe(401);

    const newCode = (await org.post(`/api/groups/${id}/regenerate-invite`)).body.inviteCode;
    expect(newCode).not.toBe(code);
    expect((await request(app).get(`/api/groups/join/${code}`)).status).toBe(404);
  });

  it('участники: организатор убирает, сам не выйдет, участник выходит', async () => {
    const { agents, org, id, ids } = await room(3);
    expect((await org.post(`/api/groups/${id}/leave`)).body.code).toBe('OWNER_CANNOT_LEAVE');
    expect((await agents.anna!.delete(`/api/groups/${id}/members/${ids.boris}`)).status).toBe(403);
    expect((await org.delete(`/api/groups/${id}/members/${ids.boris}`)).status).toBe(204);
    expect((await agents.anna!.post(`/api/groups/${id}/leave`)).status).toBe(204);
    expect((await org.get(`/api/groups/${id}`)).body.group.members).toHaveLength(1);
  });

  it('прикрепляет только свой вишлист', async () => {
    const { agents, org, id } = await room(3);
    const mine = (await agents.anna!.post('/api/wishlists').send({ title: 'A' })).body.wishlist.id;
    expect((await org.put(`/api/groups/${id}/my-wishlist`).send({ wishlistId: mine })).status).toBe(404);
    expect((await agents.anna!.put(`/api/groups/${id}/my-wishlist`).send({ wishlistId: mine })).status).toBe(204);
    expect((await agents.anna!.get(`/api/groups/${id}`)).body.group.myWishlistId).toBe(mine);
    expect((await agents.anna!.put(`/api/groups/${id}/my-wishlist`).send({ wishlistId: null })).status).toBe(204);
  });
});

describe('исключения', () => {
  it('только организатору; нельзя создать невыполнимые правила', async () => {
    const { agents, org, id, ids } = await room(4);
    const body = { userAId: ids.anna, userBId: ids.boris };
    expect((await agents.anna!.post(`/api/groups/${id}/exclusions`).send(body)).status).toBe(403);
    const ok = await org.post(`/api/groups/${id}/exclusions`).send(body);
    expect(ok.status).toBe(201);
    expect((await org.post(`/api/groups/${id}/exclusions`).send(body)).status).toBe(409);
    expect((await org.post(`/api/groups/${id}/exclusions`).send({ userAId: ids.anna, userBId: ids.anna })).status).toBe(400);
    // После anna–boris у anna остаются соседи org и vera; отсечём org — у anna будет один сосед, круг невозможен
    const bad = await org.post(`/api/groups/${id}/exclusions`).send({ userAId: ids.org, userBId: ids.anna });
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe('EXCLUSIONS_TOO_STRICT');
    const exId = ok.body.exclusion.id;
    expect((await org.delete(`/api/groups/${id}/exclusions/${exId}`)).status).toBe(204);
  });
});

describe('жеребьёвка и права', () => {
  it('нужно минимум 3 участника, провести может только организатор, один раз', async () => {
    const two = await room(2);
    expect((await two.org.post(`/api/groups/${two.id}/draw`)).body.code).toBe('NOT_ENOUGH_MEMBERS');
    await cleanDb();
    const { agents, org, id } = await room(4);
    expect((await agents.anna!.post(`/api/groups/${id}/draw`)).status).toBe(403);
    expect((await org.post(`/api/groups/${id}/draw`)).status).toBe(204);
    expect((await org.post(`/api/groups/${id}/draw`)).status).toBe(409);
    expect(await prisma.assignment.count()).toBe(4);
  });

  it('после жеребьёвки состав закрыт, название менять можно', async () => {
    const { agents, org, id, code, ids } = await room(3);
    await org.post(`/api/groups/${id}/draw`);
    const late = await signedInAgent(app, { username: 'late' });
    expect((await late.post(`/api/groups/join/${code}`)).body.code).toBe('GROUP_DRAWN');
    expect((await agents.anna!.post(`/api/groups/${id}/leave`)).status).toBe(409);
    expect((await org.delete(`/api/groups/${id}/members/${ids.boris}`)).status).toBe(409);
    expect((await org.patch(`/api/groups/${id}`).send({ title: 'Переименовали', budget: 2000 })).status).toBe(200);
  });

  it('каждый видит только своего получателя, до жеребьёвки — отказ', async () => {
    const { agents, org, id, ids } = await room(4);
    expect((await org.get(`/api/groups/${id}/my-recipient`)).status).toBe(409);
    await org.post(`/api/groups/${id}/draw`);

    const assignments = await prisma.assignment.findMany();
    for (const [name, agent] of Object.entries(agents)) {
      const res = await agent.get(`/api/groups/${id}/my-recipient`);
      const expected = assignments.find((a) => a.giverId === ids[name])!.receiverId;
      expect(res.status).toBe(200);
      expect(res.body.recipient.id).toBe(expected);
      expect(res.body.recipient.id).not.toBe(ids[name]);
    }
  });

  it('организатор и участники не получают пар ни в одном ответе; не участник не видит группу', async () => {
    const { agents, org, id } = await room(4);
    await org.post(`/api/groups/${id}/draw`);
    const outsider = await signedInAgent(app, { username: 'zed' });
    const responses = [
      await org.get(`/api/groups/${id}`),
      await org.get('/api/groups'),
      await agents.anna!.get(`/api/groups/${id}`),
    ];
    for (const r of responses) {
      expect(r.status).toBe(200);
      const text = r.text.toLowerCase();
      for (const word of ['assignment', 'giver', 'receiver', 'recipient']) {
        expect(text).not.toContain(word);
      }
    }
    expect((await outsider.get(`/api/groups/${id}/my-recipient`)).status).toBe(404);
    expect((await outsider.post(`/api/groups/${id}/draw`)).status).toBe(404);
    expect((await request(app).get(`/api/groups/${id}/my-recipient`)).status).toBe(401);
  });

  it('получатель: закреплённый вишлист виден дарителю, незакреплённый — нет', async () => {
    const { agents, org, id, ids } = await room(3);
    const names = ['org', 'anna', 'boris'] as const;
    for (const n of names) {
      const w = (await agents[n]!.post('/api/wishlists').send({ title: `Список ${n}`, visibility: 'private' }))
        .body.wishlist.id;
      await prisma.item.create({ data: { wishlistId: w, title: `Подарок ${n}` } });
      if (n !== 'boris') await agents[n]!.put(`/api/groups/${id}/my-wishlist`).send({ wishlistId: w });
    }
    await org.post(`/api/groups/${id}/draw`);
    const assignments = await prisma.assignment.findMany();
    for (const n of names) {
      const res = await agents[n]!.get(`/api/groups/${id}/my-recipient`);
      const recipientId = assignments.find((a) => a.giverId === ids[n])!.receiverId;
      const recipient = Object.entries(ids).find(([, v]) => v === recipientId)![0];
      if (recipient === 'boris') expect(res.body.wishlist).toBeNull();
      else expect(res.body.wishlist.items[0].title).toBe(`Подарок ${recipient}`);
      expect(res.text).not.toContain('reserv');
    }
  });

  it('две одновременные жеребьёвки: проходит одна', async () => {
    const { org, id } = await room(4);
    const results = await Promise.all([
      org.post(`/api/groups/${id}/draw`),
      org.post(`/api/groups/${id}/draw`),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([204, 409]);
    expect(await prisma.assignment.count()).toBe(4);
  });
});
