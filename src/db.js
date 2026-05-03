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

  CREATE TABLE IF NOT EXISTS questions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id    TEXT    NOT NULL CHECK (game_id IN ('cache','spell')),
    type       TEXT    NOT NULL,
    payload    TEXT    NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );

  CREATE INDEX IF NOT EXISTS idx_questions_game_type ON questions(game_id, type, sort_order);
`);

function loadSeed() {
  const seedPath = path.join(path.dirname(absPath), 'questions.seed.json');
  if (!fs.existsSync(seedPath)) return [];
  const raw = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const rows = [];
  for (const gameId of Object.keys(raw)) {
    for (const type of Object.keys(raw[gameId])) {
      raw[gameId][type].forEach((entry, i) => {
        rows.push({ gameId, type, payload: JSON.stringify(entry), sortOrder: i });
      });
    }
  }
  return rows;
}

function seedQuestions({ truncate = false } = {}) {
  const rows = loadSeed();
  if (rows.length === 0) return { inserted: 0, skipped: true };

  const insert = db.prepare(
    'INSERT INTO questions (game_id, type, payload, sort_order) VALUES (?, ?, ?, ?)'
  );
  const tx = db.transaction((items) => {
    if (truncate) db.prepare('DELETE FROM questions').run();
    for (const r of items) insert.run(r.gameId, r.type, r.payload, r.sortOrder);
  });
  tx(rows);
  return { inserted: rows.length, skipped: false };
}

function seedQuestionsIfEmpty() {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM questions').get();
  if (count > 0) return { inserted: 0, skipped: true };
  return seedQuestions({ truncate: false });
}

seedQuestionsIfEmpty();

module.exports = db;
module.exports.seedQuestions = seedQuestions;
module.exports.seedQuestionsIfEmpty = seedQuestionsIfEmpty;
