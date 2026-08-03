const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { validateRegister } = require('./validation');

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'gymbro-dev-secret';

router.post('/register', (req, res) => {
  const { password, sex, height, weight, goal } = req.body;

  const errors = validateRegister(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: Object.values(errors)[0] });
  }

  const name = req.body.name.trim();

  const exists = db.prepare('SELECT id FROM users WHERE name = ?').get(name);
  if (exists) {
    return res.status(409).json({ error: 'El nombre de usuario ya existe' });
  }

  const hash = bcrypt.hashSync(password, 10);

  const stmt = db.prepare(
    'INSERT INTO users (name, password, sex, height, weight, goal) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const result = stmt.run(name, hash, sex, height, weight, goal);

  const token = jwt.sign({ id: result.lastInsertRowid, name }, JWT_SECRET, { expiresIn: '30d' });

  res.status(201).json({
    token,
    user: { id: result.lastInsertRowid, name, sex, height, weight, goal, points: 0, level: 1 }
  });
});

router.post('/login', (req, res) => {
  const { name, password } = req.body;

  if (!name || !password) {
    return res.status(400).json({ error: 'Nombre y contraseña requeridos' });
  }

  const user = db.prepare('SELECT * FROM users WHERE name = ?').get(name);
  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, { expiresIn: '30d' });

  const { password: _, ...safe } = user;
  res.json({ token, user: safe });
});

module.exports = router;
