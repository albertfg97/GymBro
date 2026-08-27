const { Router } = require('express');
const db = require('../db');
const { auth } = require('./middleware');
const { todayBlock, JS_WEEK } = require('../normalize');
const CATALOG = require('../catalog');

const router = Router();
router.use(auth);

function getPlan(userId) {
  const row = db.prepare('SELECT plan FROM users WHERE id = ?').get(userId);
  if (!row || !row.plan) return null;
  try { return JSON.parse(row.plan); } catch { return null; }
}

// Resumen de la rutina (bloques, días, config, semanas).
router.get('/', (req, res) => {
  const plan = getPlan(req.user.id);
  if (!plan || !plan.rutina) return res.status(200).json({ rutina: null });
  res.json({ rutina: plan.rutina });
});

// Qué toca hoy: resuelve el bloque del día de la semana y sus ejercicios con guía.
router.get('/hoy', (req, res) => {
  const plan = getPlan(req.user.id);
  if (!plan || !plan.rutina) {
    return res.status(200).json({ hoy: null, error: 'Sin plan de rutina' });
  }
  const rutina = plan.rutina;
  const weekday = new Date().getDay();
  const bloque = todayBlock(rutina);
  const ejercicios = bloque ? (rutina.bloques[bloque] || []) : [];
  res.json({
    hoy: {
      dia: JS_WEEK[weekday],
      weekday,
      bloque: bloque || '',
      entrena: ejercicios.length > 0,
      ejercicios,
    },
  });
});

// Un bloque concreto (p.ej. GET /rutina/bloque/A) para repasar otro día.
router.get('/bloque/:id', (req, res) => {
  const plan = getPlan(req.user.id);
  const bloque = String(req.params.id || '').toUpperCase();
  if (!plan || !plan.rutina || !plan.rutina.bloques[bloque]) {
    return res.status(404).json({ error: 'Bloque no encontrado' });
  }
  res.json({ bloque, ejercicios: plan.rutina.bloques[bloque] });
});

// Catálogo de ejercicios con sus guías (para referencia y selección manual).
router.get('/catalogo', (req, res) => {
  res.json({ ejercicios: CATALOG.EXERCISES });
});

module.exports = router;
