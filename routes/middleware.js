const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'gymbro-v2-dev-secret';

function sign(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.user = jwt.verify(header.replace('Bearer ', ''), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

module.exports = { auth, sign, JWT_SECRET };
