const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { DB_PATH } = require('./config');

const absPath = path.resolve(DB_PATH);
fs.mkdirSync(path.dirname(absPath), { recursive: true });

const db = new Database(absPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS play_sessions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id    TEXT    NOT NULL CHECK (game_id IN ('cache','spell')),
    score      INTEGER NOT NULL,
    accuracy   REAL    NOT NULL,
    xp_earned  INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user      ON play_sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_user_game ON play_sessions(user_id, game_id);
`);

module.exports = db;
