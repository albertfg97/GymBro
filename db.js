// GymBro v2 — conexión SQLite, esquema y datos base.
// Diseño: cada perfil de usuario (login) guarda su propio plan (rutina +
// alimentación) como JSON, importado desde el servidor. El catálogo de
// ejercicios y las guías viven en catalog.js / guides.js (no en la BD).

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.GYMBRO_DB_PATH || path.join(__dirname, 'data', 'gymbro.db');

const db = new Database(DB_PATH, { verbose: null });
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    UNIQUE NOT NULL,
    password      TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
    sex           TEXT    NOT NULL DEFAULT 'other' CHECK(sex IN ('male','female','other')),
    birth_year    INTEGER,
    height_cm     REAL,
    weight_kg     REAL,
    goal          TEXT    NOT NULL DEFAULT 'maintain' CHECK(goal IN ('lose','maintain','gain')),
    activity_level TEXT   NOT NULL DEFAULT 'light' CHECK(activity_level IN ('sedentary','light','active','very_active')),
    equipment     TEXT    NOT NULL DEFAULT '{}',
    allergies     TEXT    NOT NULL DEFAULT '[]',
    plan          TEXT,                    -- plan JSON normalizado { rutina, alimentacion }
    created_at    TEXT    DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS weight_log (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date      TEXT    NOT NULL,
    weight_kg REAL    NOT NULL,
    UNIQUE(user_id, date)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS workout_log (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date         TEXT    NOT NULL,
    ejercicio    TEXT    NOT NULL,
    sets         INTEGER,
    reps         TEXT,
    peso_kg      REAL,
    completed_at TEXT    DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS nutrition_log (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date      TEXT    NOT NULL,
    comida    TEXT    NOT NULL,   -- desayuno | comida | snack | cena
    done      INTEGER NOT NULL DEFAULT 0,
    UNIQUE(user_id, date, comida)
  )
`);

module.exports = db;
