const { Router } = require('express');
const db = require('../db');

const router = Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM routines ORDER BY difficulty, name').all();
  const withStats = rows.map(r => {
    const ex = db.prepare(`
      SELECT COUNT(*) AS count, COALESCE(SUM(e.duration), 0) AS total_duration
      FROM routine_exercises re
      JOIN exercises e ON e.id = re.exercise_id
      WHERE re.routine_id = ?
    `).get(r.id);
    return { ...r, exerciseCount: ex.count, totalDuration: ex.total_duration };
  });
  res.json(withStats);
});

router.get('/:id', (req, res) => {
  const routine = db.prepare('SELECT * FROM routines WHERE id = ?').get(req.params.id);
  if (!routine) return res.status(404).json({ error: 'Rutina no encontrada' });

  const exercises = db.prepare(`
    SELECT e.*, re.sort_order, re.duration_override
    FROM routine_exercises re
    JOIN exercises e ON e.id = re.exercise_id
    WHERE re.routine_id = ?
    ORDER BY re.sort_order
  `).all(req.params.id);

  res.json({ ...routine, exercises });
});

module.exports = router;
