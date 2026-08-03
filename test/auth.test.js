const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { useTempDb, api, resetDb } = require('./helpers');

useTempDb();
const app = require('../server');
beforeEach(resetDb);

test('register: creates user and returns token', async () => {
  const res = await api(app).post('/api/auth/register').send({
    name: 'dani',
    password: 'secret123',
    sex: 'male',
    height: 175,
    weight: 70,
    goal: 'gain_muscle',
  });
  assert.equal(res.status, 201);
  assert.ok(res.body.token);
  assert.equal(res.body.user.name, 'dani');
  assert.equal(res.body.user.points, 0);
  assert.equal(res.body.user.level, 1);
});

test('register: rejects short password', async () => {
  const res = await api(app).post('/api/auth/register').send({
    name: 'dani', password: '123', sex: 'male', height: 175, weight: 70, goal: 'gain_muscle',
  });
  assert.equal(res.status, 400);
  assert.ok(res.body.error);
});

test('register: rejects out-of-range height', async () => {
  const res = await api(app).post('/api/auth/register').send({
    name: 'dani', password: 'secret123', sex: 'male', height: 999, weight: 70, goal: 'gain_muscle',
  });
  assert.equal(res.status, 400);
  assert.ok(/altura/i.test(res.body.error));
});

test('register: rejects duplicate name', async () => {
  const body = {
    name: 'dani', password: 'secret123', sex: 'male', height: 175, weight: 70, goal: 'gain_muscle',
  };
  await api(app).post('/api/auth/register').send(body).expect(201);
  const res = await api(app).post('/api/auth/register').send(body);
  assert.equal(res.status, 409);
});

test('login: works with valid credentials', async () => {
  const body = {
    name: 'dani', password: 'secret123', sex: 'male', height: 175, weight: 70, goal: 'gain_muscle',
  };
  await api(app).post('/api/auth/register').send(body).expect(201);
  const res = await api(app).post('/api/auth/login').send({ name: 'dani', password: 'secret123' });
  assert.equal(res.status, 200);
  assert.ok(res.body.token);
  assert.equal(res.body.user.name, 'dani');
});

test('login: rejects wrong password', async () => {
  await api(app).post('/api/auth/register').send({
    name: 'dani', password: 'secret123', sex: 'male', height: 175, weight: 70, goal: 'gain_muscle',
  }).expect(201);
  const res = await api(app).post('/api/auth/login').send({ name: 'dani', password: 'wrong' });
  assert.equal(res.status, 401);
});