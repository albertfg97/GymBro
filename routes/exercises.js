const { Router } = require('express');
const db = require('../db');

const router = Router();

function withGuide(e) {
  if (e && e.guide) {
    try { e.guide = JSON.parse(e.guide); } catch { e.guide = null; }
  }
  return e;
}

router.get('/', (req, res) => {
  const { category } = req.query;
  let rows;
  if (category) {
    rows = db.prepare('SELECT * FROM exercises WHERE category = ? ORDER BY difficulty, name').all(category);
  } else {
    rows = db.prepare('SELECT * FROM exercises ORDER BY category, difficulty, name').all();
  }
  res.json(rows.map(withGuide));
});

router.get('/:id', (req, res) => {
  const exercise = db.prepare('SELECT * FROM exercises WHERE id = ?').get(req.params.id);
  if (!exercise) return res.status(404).json({ error: 'Ejercicio no encontrado' });
  res.json(withGuide(exercise));
});

module.exports = router;
