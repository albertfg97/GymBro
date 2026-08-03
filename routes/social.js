const { Router } = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'gymbro-dev-secret';

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.user = jwt.verify(header.replace('Bearer ', ''), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

function isFriend(a, b) {
  return !!db.prepare(`
    SELECT id FROM friendships
    WHERE status = 'accepted'
      AND ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))
  `).get(a, b, b, a);
}

/* ---------- search + public profile ---------- */
router.get('/users/search', auth, (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 1) return res.json([]);
  const rows = db.prepare(
    "SELECT id, name, points, level FROM users WHERE name LIKE ? AND id != ? ORDER BY name LIMIT 25"
  ).all(`%${q}%`, req.user.id);
  res.json(rows);
});

router.get('/users/:id', auth, (req, res) => {
  const user = db.prepare('SELECT id, name, points, level, sex, goal, created_at, current_streak, max_streak FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (req.params.id == req.user.id || isFriend(req.user.id, user.id)) {
    const stats = db.prepare(`
      SELECT COUNT(*) AS total_workouts,
             COALESCE(SUM(duration), 0) AS total_minutes,
             COALESCE(SUM(points), 0) AS total_xp
      FROM workout_sessions WHERE user_id = ?
    `).get(user.id);
    const recent = db.prepare(`
      SELECT ws.points, ws.completed_at, e.name, e.icon
      FROM workout_sessions ws
      JOIN exercises e ON e.id = ws.exercise_id
      WHERE ws.user_id = ?
      ORDER BY ws.completed_at DESC LIMIT 5
    `).all(user.id);
    res.json({ ...user, total_workouts: stats.total_workouts, total_minutes: stats.total_minutes, total_xp: stats.total_xp, recent });
  } else {
    res.json({ id: user.id, name: user.name, points: user.points, level: user.level });
  }
});

/* ---------- friendships ---------- */
router.post('/friends/:userId', auth, (req, res) => {
  const them = parseInt(req.params.userId, 10);
  const me = req.user.id;
  if (!them || them === me) return res.status(400).json({ error: 'Usuario inválido' });
  const exists = db.prepare('SELECT id FROM users WHERE id = ?').get(them);
  if (!exists) return res.status(404).json({ error: 'Usuario no encontrado' });
  if (isFriend(me, them)) return res.status(409).json({ error: 'Ya son amigos' });

  const pendingFromMe = db.prepare("SELECT id FROM friendships WHERE requester_id = ? AND addressee_id = ? AND status IN ('pending','accepted')").get(me, them);
  if (pendingFromMe) return res.status(409).json({ error: 'Solicitud ya enviada' });

  const pendingToMe = db.prepare("SELECT id FROM friendships WHERE requester_id = ? AND addressee_id = ? AND status = 'pending'").get(them, me);
  if (pendingToMe) {
    db.prepare("UPDATE friendships SET status = 'accepted' WHERE id = ?").run(pendingToMe.id);
    return res.json({ mutual: true, message: 'Amistad aceptada mutuamente' });
  }

  db.prepare("DELETE FROM friendships WHERE requester_id = ? AND addressee_id = ? AND status = 'declined'").run(me, them);
  db.prepare("INSERT INTO friendships (requester_id, addressee_id, status) VALUES (?, ?, 'pending')").run(me, them);
  res.status(201).json({ mutual: false, message: 'Solicitud enviada' });
});

router.get('/friends', auth, (req, res) => {
  const rows = db.prepare(`
    SELECT f.id, f.status, u.id AS friend_id, u.name, u.points, u.level, f.created_at
    FROM friendships f
    JOIN users u ON u.id = CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END
    WHERE f.status = 'accepted' AND (f.requester_id = ? OR f.addressee_id = ?)
    ORDER BY u.name
  `).all(req.user.id, req.user.id, req.user.id);
  res.json(rows);
});

router.get('/friends/requests', auth, (req, res) => {
  const rows = db.prepare(`
    SELECT f.id AS request_id, f.created_at, u.id AS requester_id, u.name, u.points, u.level
    FROM friendships f
    JOIN users u ON u.id = f.requester_id
    WHERE f.addressee_id = ? AND f.status = 'pending'
    ORDER BY f.created_at
  `).all(req.user.id);
  res.json(rows);
});

router.post('/friends/requests/:id/respond', auth, (req, res) => {
  const { action } = req.body;
  if (!['accept', 'decline'].includes(action)) return res.status(400).json({ error: 'Acción inválida' });

  const row = db.prepare("SELECT * FROM friendships WHERE id = ? AND addressee_id = ? AND status = 'pending'").get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Solicitud no encontrada' });

  db.prepare('UPDATE friendships SET status = ? WHERE id = ?').run(action === 'accept' ? 'accepted' : 'declined', row.id);
  res.json({ ok: true, status: action === 'accept' ? 'accepted' : 'declined' });
});

router.delete('/friends/:userId', auth, (req, res) => {
  const target = parseInt(req.params.userId, 10);
  db.prepare('DELETE FROM friendships WHERE status = ? AND ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))')
    .run('accepted', req.user.id, target, target, req.user.id);
  res.json({ ok: true });
});

/* ---------- challenges ---------- */
function windowDates(userId, from, to) {
  return db.prepare(`
    SELECT DISTINCT substr(completed_at, 1, 10) AS d
    FROM workout_sessions
    WHERE user_id = ? AND completed_at >= ? AND completed_at <= ?
    ORDER BY substr(completed_at, 1, 10)
  `).all(userId, from, to).map(r => r.d);
}

function computeProgress(userId, c) {
  const now = nowIso();
  const from = c.starts_at || c.created_at;
  const to = c.ends_at && c.ends_at < now ? c.ends_at : now;

  if (c.metric === 'total_workouts') {
    const { n } = db.prepare('SELECT COUNT(*) AS n FROM workout_sessions WHERE user_id = ? AND completed_at >= ? AND completed_at <= ?').get(userId, from, to);
    return { value: n };
  }

  if (c.metric === 'best_streak') {
    const dates = windowDates(userId, from, to);
    let best = 0, run = 0, prev = null;
    for (const d of dates) {
      const cur = new Date(d + 'T00:00:00Z');
      if (prev && (cur - prev) / 86400000 === 1) run += 1;
      else run = 1;
      if (run > best) best = run;
      prev = cur;
    }
    return { value: best };
  }

  if (c.metric === 'first_to_xp') {
    const rows = db.prepare('SELECT points, completed_at FROM workout_sessions WHERE user_id = ? AND completed_at >= ? AND completed_at <= ? ORDER BY completed_at').all(userId, from, to);
    let xp = 0, reachedAt = null;
    for (const r of rows) {
      xp += r.points;
      if (reachedAt === null && c.target && xp >= c.target) reachedAt = r.completed_at;
    }
    return { value: xp, reachedAt };
  }

  return { value: 0 };
}

function determineIds(c) {
  return [c.challenger_id, c.opponent_id];
}

router.post('/challenges', auth, (req, res) => {
  const { opponentId, metric, target, durationDays } = req.body;
  const opponent = parseInt(opponentId, 10);
  if (!opponent || opponent === req.user.id) return res.status(400).json({ error: 'Oponente inválido' });
  if (!['first_to_xp', 'total_workouts', 'best_streak'].includes(metric)) return res.status(400).json({ error: 'Métrica inválida' });
  const days = Math.min(Math.max(parseInt(durationDays, 10) || 7, 1), 90);
  let tgt = null;
  if (metric === 'first_to_xp') {
    tgt = parseInt(target, 10);
    if (!tgt || tgt <= 0) return res.status(400).json({ error: 'Se requiere un target de XP válido' });
  }
  if (!db.prepare('SELECT id FROM users WHERE id = ?').get(opponent)) return res.status(404).json({ error: 'Oponente no encontrado' });
  if (!isFriend(req.user.id, opponent)) return res.status(403).json({ error: 'Solo puedes retar a amigos' });

  const result = db.prepare('INSERT INTO challenges (challenger_id, opponent_id, metric, target, duration_days) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.id, opponent, metric, tgt, days);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Desafío enviado' });
});

router.get('/challenges', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM challenges WHERE challenger_id = ? OR opponent_id = ? ORDER BY created_at DESC').all(req.user.id, req.user.id);
  const out = rows.map(c => finalize(c));
  res.json(out.map(c => decorate(c)));
});

router.get('/challenges/:id', auth, (req, res) => {
  const c = db.prepare('SELECT * FROM challenges WHERE id = ?').get(req.params.id);
  if (!c || (c.challenger_id !== req.user.id && c.opponent_id !== req.user.id)) {
    return res.status(404).json({ error: 'Desafío no encontrado' });
  }
  res.json(decorate(finalize(c)));
});

function nowIso() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function addDays(s, days) {
  const d = new Date(s.replace(' ', 'T') + 'Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function finalize(c) {
  if (c.status === 'active' && c.ends_at && c.ends_at < nowIso()) {
    const [a, b] = determineIds(c);
    const pA = computeProgress(a, c);
    const pB = computeProgress(b, c);
    let winner = null;
    if (c.metric === 'first_to_xp') {
      const rA = pA.reachedAt, rB = pB.reachedAt;
      if (rA && rB) winner = rA < rB ? a : b;
      else if (rA) winner = a;
      else if (rB) winner = b;
    } else {
      if (pA.value > pB.value) winner = a;
      else if (pB.value > pA.value) winner = b;
    }
    return db.prepare('UPDATE challenges SET status = ?, winner_id = ? WHERE id = ? RETURNING *').get('completed', winner, c.id);
  }
  return c;
}

function decorate(c) {
  const users = {};
  for (const uid of [c.challenger_id, c.opponent_id]) {
    const u = db.prepare('SELECT id, name, level, points FROM users WHERE id = ?').get(uid);
    users[uid] = u ? { id: u.id, name: u.name, level: u.level, points: u.points } : null;
  }
  const [a, b] = determineIds(c);
  const pa = computeProgress(a, c);
  const pb = computeProgress(b, c);
  return {
    id: c.id,
    metric: c.metric,
    target: c.target,
    duration_days: c.duration_days,
    status: c.status,
    created_at: c.created_at,
    starts_at: c.starts_at,
    ends_at: c.ends_at,
    winner_id: c.winner_id,
    challenger: users[c.challenger_id],
    opponent: users[c.opponent_id],
    progress: { [a]: pa, [b]: pb },
  };
}

router.post('/challenges/:id/respond', auth, (req, res) => {
  const { action } = req.body;
  if (!['accept', 'decline'].includes(action)) return res.status(400).json({ error: 'Acción inválida' });

  const c = db.prepare('SELECT * FROM challenges WHERE id = ? AND opponent_id = ? AND status = ?').get(req.params.id, req.user.id, 'pending');
  if (!c) return res.status(404).json({ error: 'Desafío pendiente no encontrado' });

  if (action === 'accept') {
    const start = nowIso();
    const end = addDays(start, c.duration_days);
    db.prepare('UPDATE challenges SET status = ?, starts_at = ?, ends_at = ? WHERE id = ?').run('active', start, end, c.id);
    return res.json({ ok: true, status: 'active' });
  }
  db.prepare('UPDATE challenges SET status = ? WHERE id = ?').run('declined', c.id);
  res.json({ ok: true, status: 'declined' });
});

module.exports = router;