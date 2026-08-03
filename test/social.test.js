const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { useTempDb, api, register, resetDb } = require('./helpers');

useTempDb();
const app = require('../server');
beforeEach(resetDb);

async function setupFriends(app) {
  const a = await register(app, { name: 'alice' });
  const b = await register(app, { name: 'bob' });
  return { a, b };
}

async function makeFriends(app, a, b) {
  await api(app).post(`/api/social/friends/${b.user.id}`).set('Authorization', `Bearer ${a.token}`).expect(201);
  const reqs = await api(app).get('/api/social/friends/requests').set('Authorization', `Bearer ${b.token}`);
  await api(app).post(`/api/social/friends/requests/${reqs.body[0].request_id}/respond`)
    .set('Authorization', `Bearer ${b.token}`).send({ action: 'accept' }).expect(200);
}

test('friends: send, accept and list', async () => {
  const { a, b } = await setupFriends(app);
  const sent = await api(app).post(`/api/social/friends/${b.user.id}`).set('Authorization', `Bearer ${a.token}`);
  assert.equal(sent.status, 201);

  const reqs = await api(app).get('/api/social/friends/requests').set('Authorization', `Bearer ${b.token}`);
  assert.equal(reqs.body.length, 1);
  assert.equal(reqs.body[0].name, 'alice');

  await api(app).post(`/api/social/friends/requests/${reqs.body[0].request_id}/respond`)
    .set('Authorization', `Bearer ${b.token}`).send({ action: 'accept' }).expect(200);

  const friendsA = await api(app).get('/api/social/friends').set('Authorization', `Bearer ${a.token}`);
  const friendsB = await api(app).get('/api/social/friends').set('Authorization', `Bearer ${b.token}`);
  assert.equal(friendsA.body.length, 1);
  assert.equal(friendsB.body.length, 1);
  assert.equal(friendsA.body[0].name, 'bob');
});

test('friends: cannot add yourself', async () => {
  const { a } = await setupFriends(app);
  const res = await api(app).post(`/api/social/friends/${a.user.id}`).set('Authorization', `Bearer ${a.token}`);
  assert.equal(res.status, 400);
});

test('friends: decline removes from requests', async () => {
  const { a, b } = await setupFriends(app);
  await api(app).post(`/api/social/friends/${b.user.id}`).set('Authorization', `Bearer ${a.token}`).expect(201);
  const reqs = await api(app).get('/api/social/friends/requests').set('Authorization', `Bearer ${b.token}`);
  await api(app).post(`/api/social/friends/requests/${reqs.body[0].request_id}/respond`)
    .set('Authorization', `Bearer ${b.token}`).send({ action: 'decline' }).expect(200);
  const after = await api(app).get('/api/social/friends').set('Authorization', `Bearer ${a.token}`);
  assert.equal(after.body.length, 0);
});

test('friends: unfriend removes', async () => {
  const { a, b } = await setupFriends(app);
  await makeFriends(app, a, b);
  await api(app).delete(`/api/social/friends/${b.user.id}`).set('Authorization', `Bearer ${a.token}`).expect(200);
  const friends = await api(app).get('/api/social/friends').set('Authorization', `Bearer ${a.token}`);
  assert.equal(friends.body.length, 0);
});

test('public profile: restricted when not friends, full when friends', async () => {
  const { a, b } = await setupFriends(app);

  const notFriend = await api(app).get(`/api/social/users/${b.user.id}`).set('Authorization', `Bearer ${a.token}`);
  assert.equal(notFriend.body.total_workouts, undefined);
  assert.equal(notFriend.body.name, 'bob');

  await makeFriends(app, a, b);
  const friend = await api(app).get(`/api/social/users/${b.user.id}`).set('Authorization', `Bearer ${a.token}`);
  assert.equal(typeof friend.body.total_workouts, 'number');
  assert.ok(Array.isArray(friend.body.recent));
});

test('search: finds matching users', async () => {
  const { a } = await setupFriends(app);
  const res = await api(app).get('/api/social/users/search?q=bo').set('Authorization', `Bearer ${a.token}`);
  assert.equal(res.status, 200);
  assert.ok(res.body.some(u => u.name === 'bob'));
});

test('challenges: cannot challenge a non-friend', async () => {
  const { a, b } = await setupFriends(app);
  const res = await api(app).post('/api/social/challenges')
    .set('Authorization', `Bearer ${a.token}`)
    .send({ opponentId: b.user.id, metric: 'total_workouts', durationDays: 7 });
  assert.equal(res.status, 403);
});

test('challenges: first_to_xp requires a target', async () => {
  const { a, b } = await setupFriends(app);
  await makeFriends(app, a, b);
  const res = await api(app).post('/api/social/challenges')
    .set('Authorization', `Bearer ${a.token}`)
    .send({ opponentId: b.user.id, metric: 'first_to_xp', durationDays: 7 });
  assert.equal(res.status, 400);
});

test('challenges: send, accept and becomes active', async () => {
  const { a, b } = await setupFriends(app);
  await makeFriends(app, a, b);
  const created = await api(app).post('/api/social/challenges')
    .set('Authorization', `Bearer ${a.token}`)
    .send({ opponentId: b.user.id, metric: 'total_workouts', durationDays: 7 });
  assert.equal(created.status, 201);

  const list = await api(app).get('/api/social/challenges').set('Authorization', `Bearer ${a.token}`);
  const ch = list.body.find(c => c.status === 'pending');
  assert.ok(ch);

  await api(app).post(`/api/social/challenges/${ch.id}/respond`)
    .set('Authorization', `Bearer ${b.token}`).send({ action: 'accept' }).expect(200);

  const after = await api(app).get('/api/social/challenges').set('Authorization', `Bearer ${a.token}`);
  assert.equal(after.body.find(c => c.id === ch.id).status, 'active');
});

test('challenges: total_workouts progress reflects workouts after accept', async () => {
  const { a, b } = await setupFriends(app);
  await makeFriends(app, a, b);
  const created = await api(app).post('/api/social/challenges')
    .set('Authorization', `Bearer ${a.token}`)
    .send({ opponentId: b.user.id, metric: 'total_workouts', durationDays: 7 });
  const list = await api(app).get('/api/social/challenges').set('Authorization', `Bearer ${a.token}`);
  const ch = list.body.find(c => c.id === created.body.id);
  await api(app).post(`/api/social/challenges/${ch.id}/respond`)
    .set('Authorization', `Bearer ${b.token}`).send({ action: 'accept' }).expect(200);

  const ex = (await api(app).get('/api/exercises')).body[0];
  await api(app).post('/api/workouts/complete')
    .set('Authorization', `Bearer ${a.token}`).send({ exerciseId: ex.id, duration: 10 }).expect(200);

  const res = await api(app).get('/api/social/challenges').set('Authorization', `Bearer ${a.token}`);
  const active = res.body.find(c => c.id === ch.id);
  assert.equal(active.status, 'active');
  assert.equal(active.progress[a.user.id].value, 1);
  assert.equal(active.progress[b.user.id].value, 0);
});