// Normalización del plan JSON de un usuario (rutina + alimentación).
//
// Asegura que tanto el formato "semanas 1-4 con días A/B" (p.ej. el plan de
// dake) como un formato simple "bloques/dias_semana" terminen en un único
// modelo interno que las pantallas (TV rutina guiada, móvil alimentación)
// pueden consumir sin preocuparse del formato de origen.
//
// También normaliza la alimentación y resuelve cada ejercicio de la rutina
// contra el catálogo (por nombre o id) para habilitar el modo guiado de la TV.

const CATALOG = require('./catalog');

// Orden de semana compatible con Date.getDay() (0 = Domingo).
const JS_WEEK = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function dayIndex(name) {
  const lower = String(name || '').trim().toLowerCase();
  const i = JS_WEEK.findIndex(w => w.toLowerCase() === lower);
  return i; // -1 si no se reconoce
}

function pick(obj, keys, fallback) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return fallback;
}

function toExerciseName(ref) {
  if (ref == null) return '';
  if (typeof ref === 'number') {
    const e = CATALOG.byId(ref);
    return e ? e.name : String(ref);
  }
  const s = String(ref).trim();
  if (s === '') return '';
  const n = Number(s);
  if (Number.isInteger(n)) {
    const e = CATALOG.byId(n);
    return e ? e.name : s;
  }
  return s;
}

// Convierte un ítem de rutina (cualquier formato) a { ejercicio, icon, sets, reps, descanso_s }.
function normalizeItem(item, idx) {
  const ejercicio = toExerciseName(pick(item, ['ejercicio', 'name', 'nombre', 'id'], ''));
  const sets = Number(pick(item, ['sets', 'series', 'set_count'], 0)) || 0;
  const reps = pick(item, ['reps', 'repeticiones', 'duracion', 'duration'], '') || '';
  const descanso_s = Number(pick(item, ['descanso_s', 'descanso_segundos', 'rest_s', 'rest'], 0)) || 0;
  const ex = CATALOG.byName(ejercicio);
  return {
    idx: idx + 1,
    ejercicio,
    icon: (ex && ex.icon) || (item.icon) || '🏋️',
    sets,
    reps: String(reps),
    descanso_s,
    guide: ex ? ex.guide : null,
  };
}

// Normaliza el bloque "rutina" del JSON.
function normalizeRutina(raw) {
  const out = {
    _raw: raw || null,
    dias_semana: [],
    bloques: {},
    semanas: [],
    config: {},
  };
  if (!raw) return out;

  const diasRaw = pick(raw, ['dias_semana'], null) || pick(raw, ['dias'], null);
  if (Array.isArray(diasRaw)) {
    out.dias_semana = diasRaw.map(d => {
      if (typeof d === 'string') return { dia: d, bloque: '' };
      return {
        dia: pick(d, ['dia', 'day', 'nombre'], ''),
        bloque: pick(d, ['bloque', 'tipo', 'block'], ''),
      };
    });
  }

  // Caso A: formato simple con bloques { A: [...], B: [...] }.
  if (raw.bloques && typeof raw.bloques === 'object') {
    for (const key of Object.keys(raw.bloques)) {
      const list = raw.bloques[key];
      if (Array.isArray(list)) {
        out.bloques[key.toUpperCase()] = list.map(normalizeItem);
      }
    }
  }

  // Caso B: formato "semanas" (semana 1..N con A y B).
  const semanas = Array.isArray(raw.semanas) ? raw.semanas : null;
  if (semanas && semanas.length) {
    out.semanas = semanas.map(week => ({
      semana: pick(week, ['semana', 'week'], 0),
      objetivo: pick(week, ['objetivo', 'goal'], ''),
      intensidad: pick(week, ['intensidad', 'intensity'], ''),
      cambios: pick(week, ['cambios', 'changes'], []),
      tempo_recomendado: pick(week, ['tempo_recomendado', 'tempo'], ''),
      nota: pick(week, ['nota', 'note'], ''),
      A: (pick(week, ['A'], []) || []).map(normalizeItem),
      B: (pick(week, ['B'], []) || []).map(normalizeItem),
    }));
    // Usar la semana 1 como base de bloques A/B.
    const base = out.semanas[0];
    if (base) {
      if (base.A && !out.bloques.A) out.bloques.A = base.A;
      if (base.B && !out.bloques.B) out.bloques.B = base.B;
      out.config.intensidad = base.intensidad || '';
      out.config.objetivo = base.objetivo || '';
    }
  }

  out.config = {
    ...out.config,
    frecuencia: pick(raw, ['frecuencia', 'frequency'], ''),
    distribucion: pick(raw, ['distribucion', 'distribution'], ''),
    duracion_aproximada_minutos: pick(raw, ['duracion_aproximada_minutos', 'duracion_min'], ''),
    intensidad: pick(raw, ['intensidad', 'intensity'], out.config.intensidad || ''),
    calentamiento: pick(raw, ['calentamiento', 'warmup'], ''),
    actividad_diaria: pick(raw, ['actividad_diaria', 'daily_activity'], null),
    progresion: pick(raw, ['progresion', 'progression'], null),
  };

  return out;
}

// Normaliza el bloque "alimentacion" del JSON.
function normalizeAlimentacion(raw) {
  const out = {
    _raw: raw || null,
    objetivos: {},
    principios: [],
    dieta_7_dias: [],
    lista_compra: {},
    preparacion: null,
    seguimiento: null,
    suplementos: null,
  };
  if (!raw) return out;

  out.objetivos = {
    kcal_dia: Number(pick(raw, ['calorias_objetivo_diarias_kcal', 'kcal_dia', 'calorias', 'kcal'], 0)) || 0,
    proteina_g: pick(raw, ['proteina_objetivo_diaria_g', 'proteina_g', 'proteina'], ''),
    deficit_kcal: pick(raw, ['deficit_estimado_kcal', 'deficit_kcal'], ''),
    ritmo_perdida_kg_sem: pick(raw, ['ritmo_objetivo_perdida_peso_kg_semana', 'ritmo_perdida_kg_sem'], ''),
  };
  out.principios = Array.isArray(raw.principios)
    ? raw.principios
    : (typeof pick(raw, ['principios'], null) === 'string' ? [raw.principios] : []);

  const dieta = pick(raw, ['dieta_7_dias', 'dieta'], []);
  if (Array.isArray(dieta)) {
    out.dieta_7_dias = dieta.map((d, i) => ({
      dia: Number(pick(d, ['dia', 'day'], i + 1)),
      etiqueta: pick(d, ['etiqueta', 'label'], ''),
      desayuno: pick(d, ['desayuno', 'breakfast'], ''),
      comida: pick(d, ['comida', 'almuerzo', 'lunch'], ''),
      snack: pick(d, ['snack'], ''),
      cena: pick(d, ['cena', 'dinner'], ''),
      kcal: Number(pick(d, ['kcal'], 0)) || 0,
      proteina: Number(pick(d, ['proteina', 'protein'], 0)) || 0,
    }));
  }

  out.lista_compra = pick(raw, ['lista_compra_semanal', 'lista_compra'], {}) || {};
  if (raw.nota_pesos) out.nota_pesos = raw.nota_pesos;
  out.preparacion = pick(raw, ['preparacion_comidas', 'preparacion'], null);
  out.seguimiento = pick(raw, ['seguimiento', 'tracking'], null);
  out.suplementos = pick(raw, ['suplementos', 'supplements'], null);

  return out;
}

// Normaliza el documento completo { rutina?, alimentacion? }.
// Acepta 'alimentacion' o su antiguo alias 'nutricion' como clave de alimentación.
function normalizePlan(plan) {
  const data = (plan && typeof plan === 'object') ? plan : {};
  return {
    rutina: normalizeRutina(data.rutina),
    alimentacion: normalizeAlimentacion(data.alimentacion || data.nutricion),
  };
}

// Resuelve el día de hoy a un bloque según dias_semana (devuelve '' si no toca entrenar).
function todayBlock(rutina) {
  const weekday = new Date().getDay(); // 0 = Domingo
  const entry = (rutina.dias_semana || []).find(d => dayIndex(d.dia) === weekday);
  return entry ? entry.bloque : '';
}

module.exports = { normalizePlan, todayBlock, dayIndex, JS_WEEK };
