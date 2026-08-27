const { Router } = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const PLAN = require('../plan');

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

function withDetails(e) {
  if (!e || !e.guide) return e;
  try { e.guide = JSON.parse(e.guide); } catch { e.guide = null; }
  return e;
}

// El plan personalizado se vincula únicamente al usuario 'dake'.
router.get('/', auth, (req, res) => {
  const user = db.prepare('SELECT id, name FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (user.name !== PLAN.usuario) {
    return res.status(200).json({ owned: false, plan: null });
  }

  // Enriquecer cada ejercicio de la rutina con sus datos del catálogo.
  const enriched = PLAN.rutina.semanas.map(week => ({
    ...week,
    A: week.A.map(line => enrichExercise(line)),
    B: week.B.map(line => enrichExercise(line)),
  }));

  const plan = {
    ...PLAN,
    rutina: { ...PLAN.rutina, semanas: enriched },
  };

  res.json({ owned: true, plan });
});

function enrichExercise(line) {
  const row = db.prepare(
    'SELECT id, name, description, icon, difficulty, category, unit, duration, points, guide FROM exercises WHERE id = ?'
  ).get(line.id);
  return row ? { ...line, exercise: withDetails(row) } : line;
}

module.exports = router;
