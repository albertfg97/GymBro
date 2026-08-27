const { Router } = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { sign } = require('./middleware');

const router = Router();

const GOALS = ['lose', 'maintain', 'gain'];
const ACTIVITY = ['sedentary', 'light', 'active', 'very_active'];
const SEX = ['male', 'female', 'other'];

function parseJson(str, fallback) {
  if (str == null || str === '') return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

// Serializa un usuario a su forma pública (sin password, con campos parseados).
function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    sex: row.sex,
    birth_year: row.birth_year,
    height_cm: row.height_cm,
    weight_kg: row.weight_kg,
    goal: row.goal,
    activity_level: row.activity_level,
    equipment: parseJson(row.equipment, {}),
    allergies: parseJson(row.allergies, []),
    has_plan: !!row.plan,
    created_at: row.created_at,
  };
}

router.post('/register', (req, res) => {
  const {
    name, password, sex, birth_year, height_cm, weight_kg,
    goal = 'maintain', activity_level = 'light', equipment, allergies,
  } = req.body || {};

  const uname = String(name || '').trim();
  if (uname.length < 2) return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres' });
  if (!password || String(password).length < 4) return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
  if (sex && !SEX.includes(sex)) return res.status(400).json({ error: 'Sexo inválido' });
  if (!GOALS.includes(goal)) return res.status(400).json({ error: 'Objetivo inválido' });
  if (!ACTIVITY.includes(activity_level)) return res.status(400).json({ error: 'Nivel de actividad inválido' });

  const exists = db.prepare('SELECT id FROM users WHERE name = ?').get(uname);
  if (exists) return res.status(409).json({ error: 'Ese nombre de usuario ya existe' });

  const hash = bcrypt.hashSync(String(password), 10);
  const info = db.prepare(
    `INSERT INTO users (name, password, sex, birth_year, height_cm, weight_kg, goal, activity_level, equipment, allergies)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    uname, hash,
    sex || 'other',
    birth_year != null ? Number(birth_year) || null : null,
    height_cm != null ? Number(height_cm) || null : null,
    weight_kg != null ? Number(weight_kg) || null : null,
    goal, activity_level,
    JSON.stringify(equipment != null ? equipment : {}),
    JSON.stringify(allergies != null ? allergies : [])
  );

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ token: sign({ id: user.id, name: user.name }), user: publicUser(user) });
});

router.post('/login', (req, res) => {
  const { name, password } = req.body || {};
  const uname = String(name || '').trim();
  if (!uname || !password) return res.status(400).json({ error: 'Nombre y contraseña requeridos' });

  const user = db.prepare('SELECT * FROM users WHERE name = ?').get(uname);
  if (!user || !bcrypt.compareSync(String(password), user.password)) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  res.json({ token: sign({ id: user.id, name: user.name }), user: publicUser(user) });
});

module.exports = router;
