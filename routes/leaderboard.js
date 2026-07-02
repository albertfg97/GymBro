const { Router } = require('express');
const db = require('../db');

const router = Router();

router.get('/', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);

  const rows = db.prepare(
    'SELECT name, points, level FROM users ORDER BY points DESC LIMIT ?'
  ).all(limit);

  res.json(rows);
});

module.exports = router;
