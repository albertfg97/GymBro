// Catálogo de ejercicios de GymBro v2.
// Cada ejercicio expone su nombre, grupo muscular, equipamiento e icono,
// y enlaza a su guía pedagógica (pasos + voz) definida en guides.js.
//
// Las guías y las animaciones GIF siguen la política de guides.js:
// texto con instrucciones MIT (exercises-dataset/ExerciseDB), GIF © Gym visual
// referenciado por URL upstream (no se redistribuyen).

const GUIDES = require('./guides');

// [id, name, icon, muscle, equipment]
const RAW = [
  [1, 'Caminata rápida', '🚶', 'cardio', 'ninguno'],
  [2, 'Trotar en sitio', '🏃', 'cardio', 'ninguno'],
  [3, 'Saltos de tijera', '🤸', 'cardio', 'ninguno'],
  [4, 'Burpees', '💥', 'cuerpo completo', 'ninguno'],
  [5, 'Cuerda invisible', '🏋️', 'cardio', 'ninguno'],
  [6, 'Flexiones', '💪', 'pecho', 'ninguno'],
  [7, 'Sentadillas', '🦵', 'piernas', 'ninguno'],
  [8, 'Plancha', '🧱', 'core', 'ninguno'],
  [9, 'Zancadas', '🚶', 'piernas', 'ninguno'],
  [10, 'Fondos de tríceps', '🪑', 'tríceps', 'ninguno'],
  [11, 'Postura del niño', '🧘', 'espalda', 'ninguno'],
  [12, 'Perro boca abajo', '🐕', 'cuerpo completo', 'ninguno'],
  [13, 'Guerrero I', '⚔️', 'piernas', 'ninguno'],
  [14, 'Saludo al sol', '🌅', 'cuerpo completo', 'ninguno'],
  [15, 'Árbol', '🌳', 'equilibrio', 'ninguno'],
  [16, 'High knees', '🦵', 'cardio', 'ninguno'],
  [17, 'Mountain climbers', '⛰️', 'core', 'ninguno'],
  [18, 'Jump squats', '💣', 'piernas', 'ninguno'],
  [19, 'Skater jumps', '⛸️', 'piernas', 'ninguno'],
  [20, 'Descanso activo', '😮‍💨', 'recuperación', 'ninguno'],
  [21, 'Salsa básica', '💃', 'danza', 'ninguno'],
  [22, 'Reggaetón', '🕺', 'danza', 'ninguno'],
  [23, 'Zumba express', '🎶', 'danza', 'ninguno'],
  [24, 'Body roll', '🌀', 'danza', 'ninguno'],
  [25, 'Free style', '🎧', 'danza', 'ninguno'],
  [26, 'Respiración 4-7-8', '🌬️', 'respiración', 'ninguno'],
  [27, 'Body scan', '🔍', 'relajación', 'ninguno'],
  [28, 'Visualización', '🌊', 'relajación', 'ninguno'],
  [29, 'Gratitud', '🙏', 'relajación', 'ninguno'],
  [30, 'Respiración fuego', '🔥', 'respiración', 'ninguno'],
  [31, 'Sentadilla búlgara', '🦵', 'piernas', 'mancuernas'],
  [32, 'Press de suelo', '🏋️', 'pecho', 'mancuernas'],
  [33, 'Remo unilateral', '💪', 'espalda', 'mancuernas'],
  [34, 'Peso muerto rumano', '🏋️', 'isquiotibiales', 'mancuernas'],
  [35, 'Elevaciones laterales', '💪', 'hombro', 'mancuernas'],
  [36, 'Curl de bíceps', '💪', 'bíceps', 'mancuernas'],
  [37, 'Extensión de tríceps', '💪', 'tríceps', 'mancuernas'],
  [38, 'Sentadilla goblet', '🦵', 'piernas', 'mancuernas'],
  [39, 'Press militar', '🏋️', 'hombro', 'mancuernas'],
  [40, 'Remo con 2 mancuernas', '💪', 'espalda', 'mancuernas'],
  [41, 'Hip thrust', '🍑', 'glúteos', 'mancuernas'],
  [42, 'Curl martillo', '💪', 'bíceps', 'mancuernas'],
];

const EXERCISES = RAW.map(([id, name, icon, muscle, equipment]) => ({
  id,
  name,
  icon,
  muscle,
  equipment,
  guide: GUIDES[id] || null,
}));

const BY_ID = new Map(EXERCISES.map(e => [e.id, e]));
const BY_NAME = new Map(EXERCISES.map(e => [e.name.trim().toLowerCase(), e]));

function byId(id) {
  return BY_ID.get(id) || null;
}

function byName(name) {
  if (!name) return null;
  const key = String(name).trim().toLowerCase();
  return BY_NAME.get(key) || null;
}

// Devuelve el ejercicio y su guía a partir de un nombre o id (útil para resolver
// los ítems de la rutina JSON).
function resolve(ref) {
  if (ref == null) return null;
  if (typeof ref === 'number') return byId(ref);
  const s = String(ref).trim();
  const n = Number(s);
  if (s !== '' && Number.isInteger(n)) return byId(n);
  return byName(ref);
}

module.exports = { EXERCISES, GUIDES, byId, byName, resolve };
