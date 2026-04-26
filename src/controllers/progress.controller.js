const db = require('../db');

const VALID_GAMES = new Set(['cache', 'spell']);

const insertSession = db.prepare(
  `INSERT INTO play_sessions (user_id, game_id, score, accuracy, xp_earned)
   VALUES (?, ?, ?, ?, ?)`
);
const getTotalXp = db.prepare(
  `SELECT COALESCE(SUM(xp_earned), 0) AS total_xp
   FROM play_sessions WHERE user_id = ?`
);
const getPerGame = db.prepare(
  `SELECT game_id,
          COALESCE(MAX(score), 0)    AS best_score,
          COUNT(*)                   AS plays,
          COALESCE(AVG(accuracy), 0) AS accuracy
   FROM play_sessions
   WHERE user_id = ?
   GROUP BY game_id`
);

function emptyGameStats() {
  return { bestScore: 0, plays: 0, accuracy: 0 };
}

function record(req, res) {
  const { gameId, score, accuracy, xpEarned } = req.body || {};

  if (!VALID_GAMES.has(gameId)) {
    return res.status(400).json({ error: "gameId must be 'cache' or 'spell'" });
  }
  if (!Number.isFinite(score) || score < 0 || score > 100000) {
    return res.status(400).json({ error: 'score must be 0–100000' });
  }
  if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 1) {
    return res.status(400).json({ error: 'accuracy must be between 0 and 1' });
  }
  if (!Number.isFinite(xpEarned) || xpEarned < 0 || xpEarned > 100000) {
    return res.status(400).json({ error: 'xpEarned must be 0–100000' });
  }

  const result = insertSession.run(
    req.user.id,
    gameId,
    Math.round(score),
    accuracy,
    Math.round(xpEarned)
  );
  return res.status(201).json({ ok: true, sessionId: result.lastInsertRowid });
}

function summary(req, res) {
  const { total_xp } = getTotalXp.get(req.user.id);
  const rows = getPerGame.all(req.user.id);

  const perGame = { cache: emptyGameStats(), spell: emptyGameStats() };
  for (const r of rows) {
    perGame[r.game_id] = {
      bestScore: r.best_score,
      plays: r.plays,
      accuracy: Number(r.accuracy.toFixed(4)),
    };
  }
  return res.json({ totalXp: total_xp, perGame });
}

module.exports = { record, summary };
