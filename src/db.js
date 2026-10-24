'use strict';
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('./config');

fs.mkdirSync(config.dataDir, { recursive: true });
const db = new Database(path.join(config.dataDir, 'statics.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pass_hash TEXT NOT NULL,
  unlock_all INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  sid TEXT PRIMARY KEY,
  sess TEXT NOT NULL,
  expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires);
CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_id TEXT NOT NULL,
  unit INTEGER NOT NULL,
  seed INTEGER NOT NULL,
  first INTEGER NOT NULL,
  correct INTEGER NOT NULL,
  score REAL NOT NULL,
  hints INTEGER NOT NULL DEFAULT 0,
  mode TEXT NOT NULL DEFAULT 'practice',
  quiz_id INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id, problem_id, first);
CREATE TABLE IF NOT EXISTS review (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_id TEXT NOT NULL,
  unit INTEGER NOT NULL,
  box INTEGER NOT NULL DEFAULT 0,
  due INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, problem_id)
);
CREATE TABLE IF NOT EXISTS activity (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
CREATE TABLE IF NOT EXISTS lesson_views (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unit INTEGER NOT NULL,
  viewed_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, unit)
);
CREATE TABLE IF NOT EXISTS quizzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  items TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  finished_at INTEGER,
  score REAL,
  total INTEGER
);
`);

module.exports = db;
db.exec(`CREATE TABLE IF NOT EXISTS unlocks (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unit INTEGER NOT NULL,
  unlocked_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, unit)
);`);

// --- v2: math readiness (additive migration; safe on an existing database) ---
db.exec(`
CREATE TABLE IF NOT EXISTS assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  items TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  finished_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_assess_user ON assessments(user_id, id);
CREATE TABLE IF NOT EXISTS skill_status (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  status TEXT NOT NULL,
  correct INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'assessment',
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, skill)
);
CREATE TABLE IF NOT EXISTS toolkit_views (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  viewed_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, skill)
);
CREATE TABLE IF NOT EXISTS user_prefs (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  PRIMARY KEY (user_id, key)
);
`);

// --- v3: Farm Engineering game (additive migration; new tables only, existing data untouched) ---
db.exec(`
CREATE TABLE IF NOT EXISTS game_levels (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level TEXT NOT NULL,
  best_stars INTEGER NOT NULL DEFAULT 0,
  star_mask INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  fails INTEGER NOT NULL DEFAULT 0,
  completed_at INTEGER,
  best_cost REAL,
  last_design TEXT,
  seed INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, level)
);
CREATE TABLE IF NOT EXISTS game_xp (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  ref TEXT,
  xp INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_xp_once ON game_xp(user_id, source, ref);
CREATE TABLE IF NOT EXISTS game_badges (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge TEXT NOT NULL,
  earned_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, badge)
);
CREATE TABLE IF NOT EXISTS rush_rounds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  combo INTEGER NOT NULL DEFAULT 0,
  best_combo INTEGER NOT NULL DEFAULT 0,
  answered INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  current TEXT,
  finished_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_rush_user ON rush_rounds(user_id, score);
`);
db.pragma('user_version = 3');
