const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { useTempDb, api, resetDb } = require('./helpers');

useTempDb();
const app = require('../server');
beforeEach(resetDb);

test('routines: lists routines with counts', async () => {
  const res = await api(app).get('/api/routines');
  assert.equal(res.status, 200);
  assert.ok(res.body.length >= 6);
  assert.ok(res.body[0].exerciseCount > 0);
  assert.equal(typeof res.body[0].totalDuration, 'number');
});

test('routines: get detail includes ordered exercises', async () => {
  const list = await api(app).get('/api/routines');
  const res = await api(app).get(`/api/routines/${list.body[0].id}`);
  assert.equal(res.status, 200);
  assert.ok(res.body.exercises.length > 0);
  assert.equal(res.body.exercises[0].sort_order, 0);
});

test('leaderboard: returns users sorted by points', async () => {
  const res = await api(app).get('/api/leaderboard');
  assert.equal(res.status, 200);
  const points = res.body.map(u => u.points);
  const sorted = [...points].sort((a, b) => b - a);
  assert.deepEqual(points, sorted);
});