const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { useTempDb, api, register, resetDb } = require('./helpers');

useTempDb();
const app = require('../server');
beforeEach(resetDb);

test('GET requires token', async () => {
  const res = await api(app).get('/api/profile');
  assert.equal(res.status, 401);
});

test('GET returns user without password', async () => {
  const { token } = await register(app);
  const res = await api(app).get('/api/profile').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.ok(res.body.name);
  assert.equal(res.body.password, undefined);
});

test('PUT validates height range', async () => {
  const { token } = await register(app);
  const res = await api(app).put('/api/profile').set('Authorization', `Bearer ${token}`).send({
    sex: 'female', height: 10, weight: 60, goal: 'maintain',
  });
  assert.equal(res.status, 400);
  assert.ok(/altura/i.test(res.body.error));
});

test('PUT updates fields', async () => {
  const { token } = await register(app);
  const res = await api(app).put('/api/profile').set('Authorization', `Bearer ${token}`).send({
    sex: 'female', height: 160, weight: 55, goal: 'maintain',
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.sex, 'female');
  assert.equal(res.body.height, 160);
  assert.equal(res.body.goal, 'maintain');
});

test('vulnerable /points endpoint no longer exists', async () => {
  const { token } = await register(app);
  const res = await api(app).post('/api/profile/points').set('Authorization', `Bearer ${token}`).send({ points: 100000 });
  assert.notEqual(res.status, 200);
});