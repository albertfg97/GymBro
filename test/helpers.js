const path = require('path');
const os = require('os');
const fs = require('fs');

function useTempDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gymbro-test-'));
  process.env.GYMBRO_DB_PATH = path.join(dir, 'test.db');
  return dir;
}

function api(app) {
  const supertest = require('supertest');
  return supertest(app);
}

function resetDb() {
  const db = require('../db');
  db.prepare('DELETE FROM workout_sessions').run();
  db.prepare('DELETE FROM user_achievements').run();
  db.prepare('DELETE FROM friendships').run();
  db.prepare('DELETE FROM challenges').run();
  db.prepare('DELETE FROM users').run();
}

async function register(app, overrides = {}) {
  const body = {
    name: 'user_' + Math.random().toString(36).slice(2, 8),
    password: 'secret123',
    sex: 'male',
    height: 175,
    weight: 70,
    goal: 'gain_muscle',
    ...overrides,
  };
  const res = await api(app).post('/api/auth/register').send(body).expect(201);
  return { token: res.body.token, user: res.body.user, name: body.name };
}

module.exports = { useTempDb, api, resetDb, register };