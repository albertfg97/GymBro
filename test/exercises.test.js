const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { useTempDb, api, resetDb } = require('./helpers');

useTempDb();
const app = require('../server');
beforeEach(resetDb);

test('lists all with unit field', async () => {
  const res = await api(app).get('/api/exercises');
  assert.equal(res.status, 200);
  assert.ok(res.body.length >= 30);
  assert.ok(['duration', 'reps'].includes(res.body[0].unit));
  assert.ok(res.body.some(e => e.unit === 'reps'), 'debe haber ejercicios de reps');
});

test('filter by category', async () => {
  const res = await api(app).get('/api/exercises?category=cardio');
  assert.equal(res.status, 200);
  assert.ok(res.body.every(e => e.category === 'cardio'));
});

test('get single', async () => {
  const list = await api(app).get('/api/exercises');
  const res = await api(app).get(`/api/exercises/${list.body[0].id}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.id, list.body[0].id);
});