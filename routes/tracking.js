const { Router } = require('express');
const db = require('../db');
const { auth } = require('./middleware');

const router = Router();
router.use(auth);

const DAY = 'YYYY-MM-DD';
function today() {
  return new Date().toISOString().slice(0, 10);
}

// Registrar una sesión de entrenamiento (ejercicio completado).
router.post('/workout', (req, res) => {
  const b = req.body || {};
  const ejercicio = String(b.ejercicio || '').trim();
  if (!ejercicio) return res.status(400).json({ error: 'Falta el ejercicio' });
  const sets = b.sets != null ? Number(b.sets) || null : null;
  const reps = b.reps != null ? String(b.reps) : null;
  const peso = b.peso_kg != null ? Number(b.peso_kg) || null : null;
  db.prepare(
    'INSERT INTO workout_log (user_id, date, ejercicio, sets, reps, peso_kg) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(req.user.id, today(), ejercicio, sets, reps, peso);
  res.status(201).json({ ok: true });
});

// Registrar peso.
router.post('/weight', (req, res) => {
  const w = Number((req.body || {}).weight_kg);
  if (!(w > 0)) return res.status(400).json({ error: 'Peso inválido' });
  db.prepare(
    'INSERT INTO weight_log (user_id, date, weight_kg) VALUES (?, ?, ?) ON CONFLICT(user_id, date) DO UPDATE SET weight_kg = excluded.weight_kg'
  ).run(req.user.id, today(), w);
  res.status(201).json({ ok: true });
});

// Marcar una comida como hecha / no hecha.
router.post('/nutrition', (req, res) => {
  const b = req.body || {};
  const comida = String(b.comida || '').trim();
  if (!['desayuno', 'comida', 'snack', 'cena'].includes(comida)) {
    return res.status(400).json({ error: 'Comida inválida' });
  }
  const done = b.done !== undefined ? (b.done ? 1 : 0) : 1;
  db.prepare(
    'INSERT INTO nutrition_log (user_id, date, comida, done) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, date, comida) DO UPDATE SET done = excluded.done'
  ).run(req.user.id, today(), comida, done);
  res.status(201).json({ ok: true });
});

function streak(u) {
  const rows = db.prepare('SELECT DISTINCT date FROM workout_log WHERE user_id = ? ORDER BY date DESC').all(u);
  const days = new Set(rows.map(r => r.date));
  let count = 0;
  const d = new Date();
  while (true) {
    const key = d.toISOString().slice(0, 10);
    if (days.has(key)) { count++; d.setDate(d.getDate() - 1); } else break;
  }
  return count;
}

// Resumen de seguimiento (hoy + últimas semanas + peso reciente).
router.get('/summary', (req, res) => {
  const uid = req.user.id;
  const workouts = db.prepare(
    'SELECT date, ejercicio, sets, reps, peso_kg FROM workout_log WHERE user_id = ? ORDER BY date DESC, completed_at DESC LIMIT 30'
  ).all(uid);
  const weigths = db.prepare(
    'SELECT date, weight_kg FROM weight_log WHERE user_id = ? ORDER BY date DESC LIMIT 14'
  ).all(uid);
  const nutritionToday = db.prepare(
    'SELECT comida, done FROM nutrition_log WHERE user_id = ? AND date = ?'
  ).all(uid, today());
  const todayCount = db.prepare(
    'SELECT COUNT(*) AS n FROM workout_log WHERE user_id = ? AND date = ?'
  ).get(uid, today());

  const weeks = db.prepare(
    `SELECT strftime('%W', date) AS week, COUNT(*) AS n FROM workout_log
     WHERE user_id = ? AND date >= date('now', '-5 weeks')
     GROUP BY week ORDER BY week`
  ).all(uid);

  res.json({
    today_workouts: todayCount ? todayCount.n : 0,
    streak: streak(uid),
    workouts,
    weight: weigths,
    nutrition_today: nutritionToday,
    last_7d_counts: weeks,
  });
});

module.exports = router;
