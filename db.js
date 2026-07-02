const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'gymbro.db');

const db = new Database(DB_PATH, { verbose: null });
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    UNIQUE NOT NULL,
    password    TEXT    NOT NULL,
    sex         TEXT    NOT NULL CHECK(sex IN ('male','female','other')),
    height      REAL    NOT NULL CHECK(height > 0),
    weight      REAL    NOT NULL CHECK(weight > 0),
    goal        TEXT    NOT NULL CHECK(goal IN ('lose_weight','gain_muscle','endurance','maintain')),
    points      INTEGER DEFAULT 0,
    level       INTEGER DEFAULT 1,
    created_at  TEXT    DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS exercises (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    icon        TEXT    NOT NULL DEFAULT '🏋️',
    duration    INTEGER NOT NULL DEFAULT 15,
    difficulty  TEXT    NOT NULL DEFAULT 'beginner' CHECK(difficulty IN ('beginner','intermediate','advanced')),
    category    TEXT    NOT NULL,
    points      INTEGER NOT NULL DEFAULT 50,
    created_at  TEXT    DEFAULT (datetime('now'))
  )
`);

const count = db.prepare('SELECT COUNT(*) AS n FROM exercises').get();
if (count.n === 0) {
  const insert = db.prepare(
    'INSERT INTO exercises (name, description, icon, duration, difficulty, category, points) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const seeds = [
    ['Caminata rápida',  'Camina a ritmo ligero manteniendo la espalda recta.',       '🚶', 20, 'beginner',    'cardio',     60],
    ['Trotar en sitio',  'Eleva rodillas alternando piernas a ritmo constante.',      '🏃', 15, 'beginner',    'cardio',     70],
    ['Saltos de tijera', 'Saltos abriendo y cerrando brazos y piernas.',              '🤸', 10, 'beginner',    'cardio',     50],
    ['Burpees',          'De pie al suelo, flexión y salto. Intenso.',                '💥', 10, 'advanced',   'cardio',    120],
    ['Cuerda invisible', 'Simula saltar a la comba sin cuerda.',                      '🏋️', 15, 'intermediate','cardio',    80],

    ['Flexiones',        'Baja el pecho al suelo y empuja hacia arriba.',             '💪', 10, 'intermediate','strength',  90],
    ['Sentadillas',      'Flexiona rodillas como si te sentaras.',                    '🦵', 15, 'beginner',    'strength',  70],
    ['Plancha',          'Mantén el cuerpo recto apoyado en antebrazos y puntas.',    '🧱', 5,  'intermediate','strength',  80],
    ['Zancadas',         'Alterna zancadas hacia delante con cada pierna.',           '🚶', 12, 'beginner',    'strength',  65],
    ['Fondos de tríceps','Apoya manos en el borde de una silla y baja.',              '🪑', 10, 'intermediate','strength',  85],

    ['Postura del niño', 'Arrodíllate y estira brazos hacia delante.',                '🧘', 5,  'beginner',    'yoga',      30],
    ['Perro boca abajo', 'Forma una V invertida con el cuerpo.',                      '🐕', 5,  'beginner',    'yoga',      35],
    ['Guerrero I',       'Zancada frontal con brazos elevados.',                      '⚔️', 8,  'intermediate','yoga',     45],
    ['Saludo al sol',    'Secuencia fluida de 5 posturas.',                           '🌅', 10, 'intermediate','yoga',     60],
    ['Árbol',            'Equilibrio sobre una pierna con brazos arriba.',            '🌳', 5,  'beginner',    'yoga',      30],

    ['High knees',       'Corre en sitio elevando rodillas al pecho.',                '🦵', 15, 'advanced',   'hiit',     110],
    ['Mountain climbers','Plancha dinámica llevando rodillas al pecho alternando.',   '⛰️', 10, 'advanced',   'hiit',     100],
    ['Jump squats',      'Sentadilla con salto explosivo.',                           '💣', 10, 'advanced',   'hiit',     120],
    ['Skater jumps',     'Saltos laterales imitando a un patinador.',                 '⛸️', 10, 'intermediate','hiit',     95],
    ['Descanso activo',  'Marcha lenta + respiración profunda.',                      '😮‍💨', 5, 'beginner',    'hiit',      20],

    ['Salsa básica',     'Pasos laterales y giros sencillos.',                        '💃', 15, 'beginner',    'dance',     70],
    ['Reggaetón',        'Ritmo urbano con pasos de cadera y brazos.',                '🕺', 15, 'beginner',    'dance',     75],
    ['Zumba express',    'Rutina corta de baile latino de alta energía.',             '🎶', 12, 'intermediate','dance',     85],
    ['Body roll',        'Ondulación completa del cuerpo de arriba a abajo.',         '🌀', 5,  'intermediate','dance',     40],
    ['Free style',       'Muévete al ritmo de tu música favorita.',                   '🎧', 10, 'beginner',    'dance',     50],

    ['Respiración 4-7-8','Inhala 4s, retén 7s, exhala 8s.',                          '🌬️', 5,  'beginner',    'meditation',25],
    ['Body scan',        'Recorre mentalmente cada parte del cuerpo.',                '🔍', 10, 'beginner',    'meditation',30],
    ['Visualización',    'Imagina un lugar tranquilo y concéntrate.',                 '🌊', 10, 'intermediate','meditation',35],
    ['Gratitud',         'Reflexiona en silencio sobre 3 cosas que agradeces.',       '🙏', 5,  'beginner',    'meditation',25],
    ['Respiración fuego','Inhalaciones y exhalaciones rápidas y rítmicas.',           '🔥', 3,  'advanced',   'meditation',40],
  ];
  const tx = db.transaction(() => {
    for (const s of seeds) insert.run(...s);
  });
  tx();
}

db.exec(`
  CREATE TABLE IF NOT EXISTS achievements (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL,
    description     TEXT    NOT NULL,
    icon            TEXT    NOT NULL DEFAULT '🏆',
    criteria_type   TEXT    NOT NULL,
    criteria_value  INTEGER NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS user_achievements (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id  INTEGER NOT NULL REFERENCES achievements(id),
    earned_at       TEXT    DEFAULT (datetime('now')),
    UNIQUE(user_id, achievement_id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS workout_sessions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id),
    points      INTEGER NOT NULL,
    duration    INTEGER NOT NULL,
    completed_at TEXT DEFAULT (datetime('now'))
  )
`);

(function () {
  const cols = db.prepare("PRAGMA table_info('users')").all();
  const names = cols.map(c => c.name);
  if (!names.includes('current_streak'))
    db.exec("ALTER TABLE users ADD COLUMN current_streak INTEGER DEFAULT 0");
  if (!names.includes('last_workout_date'))
    db.exec("ALTER TABLE users ADD COLUMN last_workout_date TEXT");
  if (!names.includes('max_streak'))
    db.exec("ALTER TABLE users ADD COLUMN max_streak INTEGER DEFAULT 0");
})();

const achCount = db.prepare('SELECT COUNT(*) AS n FROM achievements').get();
if (achCount.n === 0) {
  const insert = db.prepare(
    'INSERT INTO achievements (name, description, icon, criteria_type, criteria_value) VALUES (?, ?, ?, ?, ?)'
  );
  const seeds = [
    ['Primer paso',       'Completa tu primer ejercicio',                         '🚀', 'total_sessions',    1],
    ['En racha',          'Completa 3 días seguidos',                             '📅', 'streak_days',       3],
    ['Comprometido',      'Completa 7 días seguidos',                             '🔥', 'streak_days',       7],
    ['Imparable',         'Completa 15 días seguidos',                            '💪', 'streak_days',      15],
    ['Dedicado',          'Realiza 10 ejercicios',                                '🎯', 'total_sessions',   10],
    ['Adicto al gym',     'Realiza 50 ejercicios',                                '🏋️', 'total_sessions',   50],
    ['Centenario',        'Alcanza 1000 XP',                                      '⭐', 'total_points',   1000],
    ['Leyenda',           'Alcanza 5000 XP',                                      '👑', 'total_points',   5000],
    ['Cardio maníaco',    'Completa 10 ejercicios de cardio',                     '🏃', 'category_count',   10],
    ['Forzudo',           'Completa 10 ejercicios de fuerza',                     '💪', 'category_count',   10],
  ];
  const tx = db.transaction(() => {
    for (const s of seeds) insert.run(...s);
  });
  tx();
}

db.exec(`
  CREATE TABLE IF NOT EXISTS routines (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    icon        TEXT    NOT NULL DEFAULT '📋',
    difficulty  TEXT    NOT NULL DEFAULT 'beginner',
    created_at  TEXT    DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS routine_exercises (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    routine_id        INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
    exercise_id       INTEGER NOT NULL REFERENCES exercises(id),
    sort_order        INTEGER NOT NULL DEFAULT 0,
    duration_override INTEGER
  )
`);

const routineCount = db.prepare('SELECT COUNT(*) AS n FROM routines').get();
if (routineCount.n === 0) {
  const insR = db.prepare('INSERT INTO routines (name, description, icon, difficulty) VALUES (?, ?, ?, ?)');
  const insE = db.prepare('INSERT INTO routine_exercises (routine_id, exercise_id, sort_order) VALUES (?, ?, ?)');

  const routines = [
    ['Cuerpo Completo', 'Rutina equilibrada que trabaja todo el cuerpo.', '🦵', 'beginner', [1, 7, 11, 6, 27]],
    ['Cardio Express',  'Sesión rápida de cardio para quemar calorías.',  '🏃', 'beginner', [2, 3, 5, 20]],
    ['Fuerza Rápida',   'Ejercicios de fuerza para tonificar músculos.',  '💪', 'intermediate', [6, 7, 9, 10, 8]],
    ['Yoga & Mente',    'Relaja cuerpo y mente con yoga y meditación.',   '🧘', 'beginner', [11, 12, 14, 15, 27]],
    ['HIIT Power',      'Explosivo entrenamiento de alta intensidad.',     '⚡', 'advanced', [4, 16, 17, 18, 19]],
    ['Ritmo y Baile',   'Diviértete mientras te mueves al ritmo.',        '🕺', 'beginner', [21, 22, 23, 25]],
  ];

  const tx = db.transaction(() => {
    for (const [name, desc, icon, diff, exercises] of routines) {
      const r = insR.run(name, desc, icon, diff);
      const rid = r.lastInsertRowid;
      exercises.forEach((eid, idx) => insE.run(rid, eid, idx));
    }
  });
  tx();
}

module.exports = db;
