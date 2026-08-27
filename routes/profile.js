const { Router } = require('express');
const db = require('../db');
const { auth } = require('./middleware');
const { normalizePlan } = require('../normalize');

const router = Router();
router.use(auth);

const GOALS = ['lose', 'maintain', 'gain'];
const ACTIVITY = ['sedentary', 'light', 'active', 'very_active'];
const SEX = ['male', 'female', 'other'];

function parseJson(str, fallback) {
  if (str == null || str === '') return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

function publicUser(row) {
  return {
    id: row.id, name: row.name, role: row.role, sex: row.sex,
    birth_year: row.birth_year, height_cm: row.height_cm, weight_kg: row.weight_kg,
    goal: row.goal, activity_level: row.activity_level,
    equipment: parseJson(row.equipment, {}), allergies: parseJson(row.allergies, []),
    has_plan: !!row.plan, created_at: row.created_at,
  };
}

router.get('/', (req, res) => {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!row) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(publicUser(row));
});

router.put('/', (req, res) => {
  const b = req.body || {};
  const goal = b.goal || 'maintain';
  const activity_level = b.activity_level || 'light';
  if (!GOALS.includes(goal)) return res.status(400).json({ error: 'Objetivo inválido' });
  if (!ACTIVITY.includes(activity_level)) return res.status(400).json({ error: 'Nivel de actividad inválido' });
  if (b.sex && !SEX.includes(b.sex)) return res.status(400).json({ error: 'Sexo inválido' });

  db.prepare(
    `UPDATE users SET sex = ?, birth_year = ?, height_cm = ?, weight_kg = ?, goal = ?, activity_level = ?, equipment = ?, allergies = ? WHERE id = ?`
  ).run(
    b.sex || 'other',
    b.birth_year != null ? Number(b.birth_year) || null : null,
    b.height_cm != null ? Number(b.height_cm) || null : null,
    b.weight_kg != null ? Number(b.weight_kg) || null : null,
    goal,
    activity_level,
    JSON.stringify(b.equipment != null ? b.equipment : {}),
    JSON.stringify(b.allergies != null ? b.allergies : []),
    req.user.id
  );

  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json(publicUser(row));
});

// GET /plan — devuelve el plan normalizado del perfil actual.
router.get('/plan', (req, res) => {
  const row = db.prepare('SELECT plan FROM users WHERE id = ?').get(req.user.id);
  if (!row) return res.status(404).json({ error: 'Usuario no encontrado' });
  const plan = row.plan ? JSON.parse(row.plan) : null;
  res.json(plan ? plan : { rutina: null, alimentacion: null });
});

// PUT /plan — importar el plan JSON (rutina + alimentación). Se normaliza.
router.put('/plan', (req, res) => {
  const raw = req.body;
  if (!raw || typeof raw !== 'object') {
    return res.status(400).json({ error: 'El cuerpo debe ser un objeto JSON de plan' });
  }
  const normalized = normalizePlan(raw);
  db.prepare('UPDATE users SET plan = ? WHERE id = ?').run(JSON.stringify(normalized), req.user.id);
  res.json({ ok: true, plan: normalized });
});

module.exports = router;
