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

module.exports = db;
