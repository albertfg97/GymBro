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

module.exports = db;
