import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/core/db/prisma';
import { cleanDb } from './helpers';

const app = createApp();
const creds = {
  firstName: 'Тест',
  lastName: 'Тестов',
  username: 'tester',
  password: 'password123',
};

beforeEach(cleanDb);
afterAll(() => prisma.$disconnect());

describe('auth', () => {
  it('регистрирует, ставит httpOnly cookie и не отдаёт хэш пароля', async () => {
    const res = await request(app).post('/api/auth/register').send(creds);
    expect(res.status).toBe(201);
    expect(res.body.user.username).toBe('tester');
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    expect(res.headers['set-cookie']?.[0]).toMatch(/sid=.*HttpOnly/);
  });

  it('приводит ник к нижнему регистру и запрещает дубликаты', async () => {
    await request(app).post('/api/auth/register').send(creds);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...creds, username: 'TESTER' });
    expect(res.status).toBe(409);
    expect(res.body.fields.username).toBeDefined();
  });

  it('валидирует входные данные', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ firstName: '', lastName: '', username: 'a', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(res.body.fields)).toEqual(
      expect.arrayContaining(['firstName', 'lastName', 'username', 'password']),
    );
  });

  it('запрещает зарезервированные ники', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...creds, username: 'admin' });
    expect(res.status).toBe(400);
  });

  it.each([
    ['привет', 'Только английские буквы'],
    ['my name', 'Без пробелов'],
    ['us!er', 'Допустимы буквы'],
    ['_user', 'Начинайте'],
    ['user.', 'Начинайте'],
    ['us..er', 'подряд'],
    ['12345', 'хотя бы одна буква'],
    ['ab', 'Не короче 3'],
    ['a'.repeat(21), 'Не длиннее 20'],
  ])('отклоняет имя пользователя %s', async (username, text) => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...creds, username });
    expect(res.status).toBe(400);
    expect(res.body.fields.username).toContain(text);
  });

  it('проверяет занятость имени пользователя', async () => {
    await request(app).post('/api/auth/register').send(creds);
    const taken = await request(app).get('/api/auth/username-available?username=Tester');
    const free = await request(app).get('/api/auth/username-available?username=free.name');
    const bad = await request(app).get('/api/auth/username-available?username=привет');
    expect(taken.body).toEqual({ available: false });
    expect(free.body).toEqual({ available: true });
    expect(bad.status).toBe(400);
  });

  it('входит, отдаёт /me и выходит', async () => {
    await request(app).post('/api/auth/register').send(creds);
    const agent = request.agent(app);
    const login = await agent
      .post('/api/auth/login')
      .send({ username: 'Tester', password: creds.password });
    expect(login.status).toBe(200);
    expect((await agent.get('/api/auth/me')).body.user.username).toBe('tester');
    expect((await agent.post('/api/auth/logout')).status).toBe(204);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });

  it('одинаково отвечает на неверный пароль и несуществующий ник', async () => {
    await request(app).post('/api/auth/register').send(creds);
    const wrongPass = await request(app)
      .post('/api/auth/login')
      .send({ username: 'tester', password: 'wrong-password' });
    const noUser = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nobody', password: 'wrong-password' });
    expect(wrongPass.status).toBe(401);
    expect(noUser.status).toBe(401);
    expect(wrongPass.body).toEqual(noUser.body);
  });

  it('не пускает заблокированного, в том числе с действующей сессией', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send(creds);
    await prisma.user.updateMany({ data: { status: 'blocked' } });
    expect((await agent.get('/api/auth/me')).status).toBe(401);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'tester', password: creds.password });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ACCOUNT_BLOCKED');
  });

  it('битый JSON — 400 в едином формате, а не 500', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('content-type', 'application/json')
      .send('{"username":');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('BAD_REQUEST');
  });

  it('слишком большое тело — 413', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'x', password: 'y'.repeat(2_000_000) });
    expect(res.status).toBe(413);
  });

  it('пароль и хэш не попадают в ответы', async () => {
    const reg = await request(app).post('/api/auth/register').send(creds);
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: 'tester', password: creds.password });
    for (const body of [reg.text, login.text]) {
      expect(body).not.toContain(creds.password);
      expect(body).not.toContain('passwordHash');
      expect(body).not.toContain('argon2');
    }
  });

  it('куки сессии: httpOnly, SameSite=Lax, Path=/', async () => {
    const res = await request(app).post('/api/auth/register').send(creds);
    const cookie = String(res.headers['set-cookie']?.[0]);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).toMatch(/Path=\//);
  });

  it('в базе хранится только хэш токена сессии', async () => {
    const res = await request(app).post('/api/auth/register').send(creds);
    const token = /sid=([^;]+)/.exec(String(res.headers['set-cookie']?.[0]))![1]!;
    const sessions = await prisma.session.findMany();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.tokenHash).not.toBe(token);
  });

  it('/me без входа — 401', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
  });
});
