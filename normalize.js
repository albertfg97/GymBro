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

// Quita acentos y pasa a minúsculas (para comparar nombres de día sin tildes).
function deaccent(s) {
  return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Devuelve, en orden, los nombres de día de la semana presentes en un texto
// (p.ej. "Lunes, miércoles y viernes" -> ['Lunes','Miércoles','Viernes']).
function weekdaysFromText(text) {
  const out = [];
  const t = deaccent(text);
  for (const w of JS_WEEK) {
    if (t.includes(deaccent(w)) && !out.includes(w)) out.push(w);
  }
  return out;
}

// Extrae la letra de bloque (A/B) de una clave de día como "dia_1_A" -> "A".
// Devuelve '' si la clave no termina en A/B.
function dayKeyToBlock(key) {
  const m = String(key == null ? '' : key).match(/([AaBb])$/);
  return m ? m[1].toUpperCase() : '';
}

// Asigna un bloque A/B por orden de aparición de los días (1º=A, 2º=B, 3º=A...).
function ordinalBlock(i) {
  return (i % 2 === 0) ? 'A' : 'B';
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
  const peso_por_mancuerna = Number(pick(item, ['peso_kg_por_mancuerna', 'peso_por_mancuerna'], 0)) || 0;
  const peso_total = Number(pick(item, ['peso_kg_total', 'peso_total'], 0)) || 0;
  const ex = CATALOG.byName(ejercicio);
  return {
    idx: idx + 1,
    ejercicio,
    icon: (ex && ex.icon) || (item.icon) || '🏋️',
    sets,
    reps: String(reps),
    descanso_s,
    peso_kg_por_mancuerna: peso_por_mancuerna,
    peso_kg_total: peso_total,
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

// ============================================================================
// FORMATO CANÓNICO (documento completo rico que el usuario importa):
//
// {
//   "objetivo": { ... },
//   "perfil": { ... },
//   "nutricion": {
//     "calorias_objetivo_diarias_kcal": 2200,
//     "proteina_objetivo_diaria_g": "135-150",
//     "deficit_estimado_kcal": "200-300",
//     "ritmo_objetivo_perdida_peso_kg_semana": "0.2-0.4",
//     "principios": [ ... ]
//   },
//   "entrenamiento": {
//     "frecuencia": "3 días por semana",
//     "distribucion": "Lunes, miércoles y viernes",
//     "duracion_aproximada_minutos": "45-60",
//     "intensidad": "Normalmente 1-3 RIR",
//     "calentamiento": "...",
//     "progresion": { ... },
//     "semanas": {
//       "semana_1": {
//         "objetivo": "...", "intensidad": "...",
//         "dias": {
//           "dia_1_A": [ { "ejercicio": "...", "series": 3, "repeticiones": "8-12", "descanso_segundos": 120 }, ... ],
//           "dia_2_B": [ ... ],
//           "dia_3": "A"
//         }
//       },
//       "semana_2": { ... }
//     }
//   },
//   "actividad_diaria": { ... },
//   "dieta_7_dias": {
//     "objetivo_diario": { ... },
//     "nota_pesos": "...",
//     "dias": {
//       "dia_1": { "desayuno": "...", "comida": "...", "snack": "...", "cena": "...", "calorias_aprox": 2200, "proteina_aprox_g": 145 },
//       ... "dia_7"
//     }
//   },
//   "lista_compra_semanal": { "proteinas": [], "carbohidratos": [], "verduras": [], "grasas": [] },
//   "preparacion_comidas": { ... },
//   "seguimiento": { ... },
//   "suplementos": { ... }
// }
// ============================================================================

// Normaliza la rutina del formato canónico (a partir de `entrenamiento`).
function canonicalRutina(data) {
  const e = pick(data, ['entrenamiento', 'rutina'], {}) || {};
  const out = {
    _raw: data,
    dias_semana: [],
    bloques: {},
    semanas: [],
    config: {},
  };

  const semanasRaw = (e.semanas && typeof e.semanas === 'object') ? e.semanas : {};
  const semanaKeys = Object.keys(semanasRaw);

  // Base de bloques A/B desde la primera semana.
  const first = semanaKeys.length ? semanasRaw[semanaKeys[0]] : null;
  const dayLabels = []; // secuencia ordenada de bloques por día de la semana base
  if (first && first.dias && typeof first.dias === 'object') {
    let arrIdx = 0;
    for (const dk of Object.keys(first.dias)) {
      const v = first.dias[dk];
      if (Array.isArray(v)) {
        const label = dayKeyToBlock(dk) || ordinalBlock(arrIdx);
        if (!out.bloques[label]) out.bloques[label] = v.map(normalizeItem);
        dayLabels.push(label);
        arrIdx++;
      } else if (typeof v === 'string' && /^[AaBb]$/.test(v.trim())) {
        dayLabels.push(v.trim().toUpperCase());
      }
    }
  }

  // Mapear días reales (distribución) a bloques.
  const distro = weekdaysFromText(e.distribucion);
  const nDays = Math.max(distro.length, dayLabels.length);
  for (let i = 0; i < nDays; i++) {
    const bloque = dayLabels[i] != null ? dayLabels[i] : (i < distro.length ? 'A' : '');
    if (bloque !== '') out.dias_semana.push({ dia: distro[i] || '', bloque });
  }

  // Semanas completas (metadatos + días normalizados o notas).
  let sequence = 0;
  for (const sk of semanaKeys) {
    const w = semanasRaw[sk] || {};
    sequence++;
    const m = String(sk).match(/(\d+)/);
    const semana = {
      semana: m ? parseInt(m[1], 10) : sequence,
      objetivo: pick(w, ['objetivo', 'goal'], ''),
      intensidad: pick(w, ['intensidad', 'intensity'], ''),
      cambios: Array.isArray(w.cambios) ? w.cambios : [],
      tempo_recomendado: pick(w, ['tempo_recomendado', 'tempo'], ''),
      nota: pick(w, ['nota', 'note', 'plan'], ''),
      A: [],
      B: [],
      dias: [],
    };
    if (w.dias && typeof w.dias === 'object') {
      let arrIdx = 0;
      for (const dk of Object.keys(w.dias)) {
        const v = w.dias[dk];
        if (Array.isArray(v)) {
          const items = v.map(normalizeItem);
          const label = dayKeyToBlock(dk) || ordinalBlock(arrIdx);
          arrIdx++;
          semana.dias.push({ etiqueta: dk, bloque: label, ejercicios: items });
          if (!semana.A.length && label === 'A') semana.A = items;
          if (!semana.B.length && label === 'B') semana.B = items;
        } else if (typeof v === 'string') {
          semana.dias.push({ etiqueta: dk, nota: String(v) });
        }
      }
    }
    out.semanas.push(semana);
  }

  out.config = {
    frecuencia: pick(e, ['frecuencia', 'frequency'], ''),
    distribucion: pick(e, ['distribucion', 'distribution'], ''),
    duracion_aproximada_minutos: pick(e, ['duracion_aproximada_minutos', 'duracion_min'], ''),
    intensidad: pick(e, ['intensidad', 'intensity'], ''),
    calentamiento: pick(e, ['calentamiento', 'warmup'], ''),
    actividad_diaria: pick(data, ['actividad_diaria', 'daily_activity'], null),
    progresion: pick(e, ['progresion', 'progression'], null),
  };

  return out;
}

// Normaliza la alimentación del formato canónico.
function canonicalAlimentacion(data) {
  const nut = pick(data, ['nutricion', 'alimentacion'], {}) || {};
  const out = {
    _raw: data,
    objetivos: {},
    principios: [],
    dieta_7_dias: [],
    lista_compra: {},
    preparacion: null,
    seguimiento: null,
    suplementos: null,
  };

  out.objetivos = {
    kcal_dia: Number(pick(nut, ['calorias_objetivo_diarias_kcal', 'kcal_dia', 'calorias', 'kcal'], 0)) || 0,
    proteina_g: pick(nut, ['proteina_objetivo_diaria_g', 'proteina_g', 'proteina'], ''),
    deficit_kcal: pick(nut, ['deficit_estimado_kcal', 'deficit_kcal'], ''),
    ritmo_perdida_kg_sem: pick(nut, ['ritmo_objetivo_perdida_peso_kg_semana', 'ritmo_perdida_kg_sem'], ''),
  };
  out.principios = Array.isArray(nut.principios) ? nut.principios : [];

  const diet = pick(data, ['dieta_7_dias', 'dieta'], {}) || {};
  const diasRaw = (diet.dias && typeof diet.dias === 'object') ? diet.dias : {};
  let i = 0;
  for (const dk of Object.keys(diasRaw)) {
    const d = diasRaw[dk] || {};
    i++;
    const nm = String(dk).match(/(\d+)/);
    out.dieta_7_dias.push({
      dia: nm ? parseInt(nm[1], 10) : i,
      etiqueta: pick(d, ['etiqueta', 'label'], ''),
      desayuno: pick(d, ['desayuno', 'breakfast'], ''),
      comida: pick(d, ['comida', 'almuerzo', 'lunch'], ''),
      snack: pick(d, ['snack'], ''),
      cena: pick(d, ['cena', 'dinner'], ''),
      kcal: Number(pick(d, ['calorias_aprox', 'kcal'], 0)) || 0,
      proteina: Number(pick(d, ['proteina_aprox_g', 'proteina', 'protein'], 0)) || 0,
    });
  }

  out.lista_compra = pick(data, ['lista_compra_semanal', 'lista_compra'], {}) || {};
  if (diet.nota_pesos) out.nota_pesos = diet.nota_pesos;
  out.preparacion = pick(data, ['preparacion_comidas', 'preparacion'], null);
  out.seguimiento = pick(data, ['seguimiento', 'tracking'], null);
  out.suplementos = pick(data, ['suplementos', 'supplements'], null);

  return out;
}

// Normaliza el documento completo { rutina?, alimentacion? }.
// Acepta 'alimentacion' o su antiguo alias 'nutricion' como clave de alimentación.
function normalizePlan(plan) {
  const data = (plan && typeof plan === 'object') ? plan : {};
  const hasOld = !!(data.rutina || data.alimentacion);
  const hasCanonical = !!(data.entrenamiento || data.dieta_7_dias || data.lista_compra_semanal);
  if (hasCanonical && !hasOld) {
    return {
      rutina: canonicalRutina(data),
      alimentacion: canonicalAlimentacion(data),
    };
  }
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
