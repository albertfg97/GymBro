const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { useTempDb, api, register, resetDb } = require('./helpers');

useTempDb();
const app = require('../server');
beforeEach(resetDb);

test('complete: adds points and sets streak to 1', async () => {
  const { token, user } = await register(app);
  const exList = await api(app).get('/api/exercises');
  const first = exList.body[0];

  const res = await api(app).post('/api/workouts/complete')
    .set('Authorization', `Bearer ${token}`)
    .send({ exerciseId: first.id, duration: 15 });
  assert.equal(res.status, 200);
  assert.equal(res.body.points, first.points);
  assert.equal(res.body.totalPoints, user.points + first.points);
  assert.equal(res.body.currentStreak, 1);
});

test('complete: requires auth', async () => {
  const res = await api(app).post('/api/workouts/complete').send({ exerciseId: 1, duration: 10 });
  assert.equal(res.status, 401);
});

test('complete: saves sets/reps/weight for reps exercises', async () => {
  const { token } = await register(app);
  const exList = await api(app).get('/api/exercises');
  const strength = exList.body.filter(e => e.unit === 'reps');
  assert.ok(strength.length > 0, 'se espera al menos un ejercicio de reps');

  await api(app).post('/api/workouts/complete')
    .set('Authorization', `Bearer ${token}`)
    .send({ exerciseId: strength[0].id, duration: 5, setCount: 3, repCount: 12, weightKg: 50 })
    .expect(200);

  const history = await api(app).get('/api/profile/history').set('Authorization', `Bearer ${token}`);
  const last = history.body[0];
  assert.equal(last.sets, 3);
  assert.equal(last.reps, 12);
  assert.equal(last.weight_kg, 50);
  assert.equal(last.name, strength[0].name);
});

test('streak: resets when a day is skipped', async () => {
  const { token } = await register(app);
  const ex = (await api(app).get('/api/exercises')).body[0];

  const db = require('../db');
  await api(app).post('/api/workouts/complete')
    .set('Authorization', `Bearer ${token}`)
    .send({ exerciseId: ex.id, duration: 10 })
    .expect(200);
  db.prepare('UPDATE workout_sessions SET completed_at = ? WHERE id = (SELECT id FROM workout_sessions ORDER BY id DESC LIMIT 1)')
    .run('2024-01-01 10:00:00');

  const res = await api(app).post('/api/workouts/complete')
    .set('Authorization', `Bearer ${token}`)
    .send({ exerciseId: ex.id, duration: 10 });
  assert.equal(res.body.currentStreak, 1);
});