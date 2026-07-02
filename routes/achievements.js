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

router.get('/', (req, res) => {
  const all = db.prepare('SELECT * FROM achievements ORDER BY criteria_type, criteria_value').all();
  res.json(all);
});

router.get('/mine', auth, (req, res) => {
  const earned = db.prepare(`
    SELECT a.*, ua.earned_at
    FROM user_achievements ua
    JOIN achievements a ON a.id = ua.achievement_id
    WHERE ua.user_id = ?
    ORDER BY ua.earned_at
  `).all(req.user.id);
  res.json(earned);
});

module.exports = router;
