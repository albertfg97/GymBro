const { Router } = require('express');
const db = require('../db');
const { auth } = require('./middleware');

const router = Router();
router.use(auth);

function getPlan(userId) {
  const row = db.prepare('SELECT plan FROM users WHERE id = ?').get(userId);
  if (!row || !row.plan) return null;
  try { return JSON.parse(row.plan); } catch { return null; }
}

// Plan de alimentación del perfil actual (objetivos, dieta 7 días, compra, preparación).
router.get('/', (req, res) => {
  const plan = getPlan(req.user.id);
  if (!plan || !plan.alimentacion) return res.status(200).json({ alimentacion: null });
  res.json({ alimentacion: plan.alimentacion });
});

module.exports = router;
