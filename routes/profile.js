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

router.get('/', auth, (req, res) => {
  const user = db.prepare('SELECT id, name, sex, height, weight, goal, points, level, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(user);
});

router.put('/', auth, (req, res) => {
  const { sex, height, weight, goal } = req.body;

  if (!sex || !height || !weight || !goal) {
    return res.status(400).json({ error: 'Faltan campos' });
  }

  db.prepare('UPDATE users SET sex = ?, height = ?, weight = ?, goal = ? WHERE id = ?')
    .run(sex, height, weight, goal, req.user.id);

  const user = db.prepare('SELECT id, name, sex, height, weight, goal, points, level, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

router.post('/points', auth, (req, res) => {
  const { points } = req.body;
  if (!points || points < 0) return res.status(400).json({ error: 'Puntos inválidos' });

  const user = db.prepare('SELECT points, level FROM users WHERE id = ?').get(req.user.id);
  const newPoints = user.points + points;
  const newLevel = Math.floor(newPoints / 1000) + 1;

  db.prepare('UPDATE users SET points = ?, level = ? WHERE id = ?').run(newPoints, newLevel, req.user.id);

  res.json({ points: newPoints, level: newLevel });
});

module.exports = router;
