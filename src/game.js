'use strict';
// Farm Engineering game: authoritative scoring, XP, badges and Goat Rush rounds.
const crypto = require('crypto');
const db = require('./db');
const C = require('../content');
const progress = require('./progress');
const GL = require('../public/js/game/levels.js');

const STAR_XP = 50, FIRST_CLEAR_XP = 50, PRED_XP = 20, NEW_SCENARIO_XP = 10, PRACTICE_XP = 10, MASTERY_XP = 150;
const RUSH_MS = 60000, RUSH_GRACE_MS = 2500;
const CHARACTERS = {
  clove: { name: 'Clove', who: 'brown Nubian doe', img: 'avatar-clove' },
  pepper: { name: 'Pepper', who: 'black Nubian kid', img: 'avatar-pepper' },
  twins: { name: 'The Twins', who: 'two Nubian kids', img: 'avatar-twins' },
  captain: { name: 'Captain', who: 'horned white Nubian', img: 'avatar-captain' },
  juniper: { name: 'Juniper', who: 'white Nubian, loves junipers', img: 'avatar-juniper' },
};
const TITLES = ['Barn Hand', 'Fence Fixer', 'Hay Hauler', 'Goat Wrangler', 'Gate Builder', 'Bridge Builder', 'Barn Raiser', 'Farm Engineer', 'Chief Engineer', 'Master of Statics'];
const BADGES = [
  { id: 'first-build', name: 'First Build', desc: 'Complete any Farm Engineering level.', img: 'avatar-pepper' },
  { id: 'drawing-board', name: 'Back to the Drawing Board', desc: 'Pass a level after it failed on you. Engineers learn from failure.', img: 'avatar-clove' },
  { id: 'blue-ribbon', name: 'Blue Ribbon', desc: 'Earn all three stars on a level.', img: 'avatar-captain' },
  { id: 'sharp-pencil', name: 'Sharp Pencil', desc: 'Make 3 predictions within tolerance.', img: 'avatar-juniper' },
  { id: 'bullseye', name: 'Bullseye', desc: 'Predict within 1% of the real answer.', img: 'avatar-twins' },
  { id: 'creek-crosser', name: 'Creek Crosser', desc: 'Build a truss bridge that holds.', img: 'avatar-captain' },
  { id: 'penny-pincher', name: 'Penny Pincher', desc: 'Build the creek bridge under budget.', img: 'avatar-clove' },
  { id: 'whole-farm', name: 'Whole Farm', desc: 'Complete all seven levels.', img: 'avatar-twins' },
  { id: 'grand-champion', name: 'Grand Champion', desc: 'Three stars on every level.', img: 'avatar-captain' },
  { id: 'combo-5', name: 'Herd Stampede', desc: 'Reach the ×5 combo in Goat Rush.', img: 'avatar-pepper' },
  { id: 'rush-1500', name: 'Goat Rush 1500', desc: 'Score 1500 in one Goat Rush round.', img: 'avatar-juniper' },
  { id: 'streak-3', name: 'Three-Day Streak', desc: 'Study three days in a row.', img: 'avatar-pepper' },
  { id: 'streak-7', name: 'Week of Statics', desc: 'Study seven days in a row.', img: 'avatar-clove' },
  { id: 'unit-master', name: 'Unit Master', desc: 'Master any statics unit.', img: 'avatar-twins' },
];
const badgeById = new Map(BADGES.map((b) => [b.id, b]));

const q = {
  levels: db.prepare('SELECT * FROM game_levels WHERE user_id = ?'),
  level: db.prepare('SELECT * FROM game_levels WHERE user_id = ? AND level = ?'),
  levelUpsert: db.prepare(`INSERT INTO game_levels (user_id, level, best_stars, star_mask, attempts, fails, completed_at, best_cost, last_design, seed, updated_at)
    VALUES (@user_id, @level, @best_stars, @star_mask, @attempts, @fails, @completed_at, @best_cost, @last_design, @seed, @updated_at)
    ON CONFLICT(user_id, level) DO UPDATE SET best_stars = @best_stars, star_mask = @star_mask, attempts = @attempts, fails = @fails, completed_at = @completed_at,
    best_cost = @best_cost, last_design = @last_design, seed = @seed, updated_at = @updated_at`),
  xpIns: db.prepare('INSERT OR IGNORE INTO game_xp (user_id, source, ref, xp, created_at) VALUES (?, ?, ?, ?, ?)'),
  xpSum: db.prepare('SELECT COALESCE(SUM(xp), 0) AS xp FROM game_xp WHERE user_id = ?'),
  predHits: db.prepare("SELECT COUNT(*) AS n FROM game_xp WHERE user_id = ? AND source = 'predict'"),
  practiceCorrect: db.prepare('SELECT COUNT(*) AS n FROM attempts WHERE user_id = ? AND first = 1 AND correct = 1'),
  badges: db.prepare('SELECT badge, earned_at FROM game_badges WHERE user_id = ? ORDER BY earned_at'),
  badgeIns: db.prepare('INSERT OR IGNORE INTO game_badges (user_id, badge, earned_at) VALUES (?, ?, ?)'),
  activity: db.prepare('INSERT INTO activity (user_id, day, count) VALUES (?, ?, 1) ON CONFLICT(user_id, day) DO UPDATE SET count = count + 1'),
  rushIns: db.prepare('INSERT INTO rush_rounds (user_id, started_at, ends_at, current) VALUES (?, ?, ?, ?)'),
  rushGet: db.prepare('SELECT * FROM rush_rounds WHERE id = ? AND user_id = ?'),
  rushUpd: db.prepare('UPDATE rush_rounds SET score = ?, combo = ?, best_combo = ?, answered = ?, correct = ?, current = ? WHERE id = ?'),
  rushFinish: db.prepare('UPDATE rush_rounds SET finished_at = ?, current = NULL WHERE id = ? AND finished_at IS NULL'),
  rushBest: db.prepare('SELECT MAX(score) AS best, COUNT(*) AS n FROM rush_rounds WHERE user_id = ? AND finished_at IS NOT NULL'),
};

// Level n needs 50·n·(n−1) XP: 0, 100, 300, 600, 1000, 1500, ...
function playerLevel(xp) {
  let n = 1; while (50 * (n + 1) * n <= xp) n++;
  const lo = 50 * n * (n - 1), hi = 50 * (n + 1) * n;
  return { level: n, title: TITLES[Math.min(n, TITLES.length) - 1], xp, from: lo, to: hi, pct: Math.round(((xp - lo) / (hi - lo)) * 100) };
}

function xpInfo(userId, summary) {
  const s = summary || progress.summary(userId);
  const game = q.xpSum.get(userId).xp;
  const practice = q.practiceCorrect.get(userId).n * PRACTICE_XP;
  const mastery = s.units.filter((u) => u.mastered).length * MASTERY_XP;
  return { ...playerLevel(game + practice + mastery), parts: { game, practice, mastery } };
}

function awardBadges(userId, s) {
  const have = new Set(q.badges.all(userId).map((b) => b.badge));
  const rows = q.levels.all(userId);
  const done = rows.filter((r) => r.completed_at);
  const rb = q.rushBest.get(userId);
  const checks = {
    'first-build': done.length > 0,
    'blue-ribbon': rows.some((r) => r.best_stars >= 3),
    'sharp-pencil': q.predHits.get(userId).n >= 3,
    'creek-crosser': done.some((r) => r.level === 'bridge'),
    'penny-pincher': rows.some((r) => r.level === 'bridge' && (r.star_mask & 2)),
    'whole-farm': GL.LEVELS.every((l) => done.some((r) => r.level === l.id)),
    'grand-champion': GL.LEVELS.every((l) => rows.some((r) => r.level === l.id && r.best_stars >= 3)),
    'rush-1500': (rb.best || 0) >= 1500,
    'streak-3': s.streak.current >= 3,
    'streak-7': s.streak.current >= 7,
    'unit-master': s.units.some((u) => u.mastered),
  };
  const now = Date.now(), fresh = [];
  for (const [id, ok] of Object.entries(checks)) if (ok && !have.has(id)) { q.badgeIns.run(userId, id, now); fresh.push(id); have.add(id); }
  return fresh;
}
function grant(userId, id) {
  const r = q.badgeIns.run(userId, id, Date.now());
  return r.changes ? [id] : [];
}

function levelCards(userId, s) {
  const rows = new Map(q.levels.all(userId).map((r) => [r.level, r]));
  let nextSet = false;
  return GL.LEVELS.map((l) => {
    const r = rows.get(l.id);
    const unit = s.units[l.unit - 1];
    const card = {
      id: l.id, num: l.num, title: l.title, tagline: l.tagline, unit: l.unit, unitTitle: unit.title, flagship: !!l.flagship,
      character: { key: l.character, ...CHARACTERS[l.character] }, ready: unit.unlocked,
      stars: r ? r.best_stars : 0, starMask: r ? r.star_mask : 0, completed: !!(r && r.completed_at), attempts: r ? r.attempts : 0,
      seed: r ? r.seed : 1, lastDesign: r && r.last_design ? JSON.parse(r.last_design) : null,
    };
    if (!nextSet && card.ready && card.stars < 3) { card.next = true; nextSet = true; }
    return card;
  });
}

function state(userId, summary) {
  const s = summary || progress.summary(userId);
  const fresh = awardBadges(userId, s);
  const earned = new Map(q.badges.all(userId).map((b) => [b.badge, b.earned_at]));
  const rb = q.rushBest.get(userId);
  const levels = levelCards(userId, s);
  return {
    xp: xpInfo(userId, s), streak: s.streak, levels,
    starsTotal: levels.reduce((t, l) => t + l.stars, 0), starsMax: levels.length * 3,
    badges: BADGES.map((b) => ({ ...b, earned: earned.has(b.id), earnedAt: earned.get(b.id) || null })),
    newBadges: fresh, rush: { best: rb.best || 0, rounds: rb.n },
  };
}

const attemptTx = db.transaction((userId, sc, design, now) => {
  const prev = q.level.get(userId, sc.level);
  const mask = sc.stars.reduce((m, s, i) => (s ? m | (1 << i) : m), 0);
  const oldMask = prev ? prev.star_mask : 0;
  const newMask = oldMask | mask;
  const newBits = [0, 1, 2].filter((i) => (newMask & (1 << i)) && !(oldMask & (1 << i))).length;
  const firstClear = sc.result.ok && !(prev && prev.completed_at);
  const failedBefore = prev && prev.fails > 0;
  const gains = [];
  const give = (source, ref, xp, label) => { if (q.xpIns.run(userId, source, ref, xp, now).changes) gains.push({ label, xp }); };
  if (newBits) give('stars', `${sc.level}:${newMask}`, newBits * STAR_XP, `${newBits} new star${newBits > 1 ? 's' : ''}`);
  if (firstClear) give('clear', sc.level, FIRST_CLEAR_XP, 'First clear');
  if (sc.result.ok) give('scenario', `${sc.level}:${sc.seed}`, NEW_SCENARIO_XP, 'New scenario solved');
  if (sc.stars[2]) give('predict', `${sc.level}:${sc.seed}`, PRED_XP, 'Prediction bonus');
  const cost = Number.isFinite(sc.result.cost) && sc.result.ok ? sc.result.cost : null;
  q.levelUpsert.run({
    user_id: userId, level: sc.level, best_stars: Math.max(prev ? prev.best_stars : 0, sc.starCount), star_mask: newMask,
    attempts: (prev ? prev.attempts : 0) + 1, fails: (prev ? prev.fails : 0) + (sc.result.ok ? 0 : 1),
    completed_at: prev && prev.completed_at ? prev.completed_at : sc.result.ok ? now : null,
    best_cost: cost !== null && (!prev || prev.best_cost === null || cost < prev.best_cost) ? cost : prev ? prev.best_cost : null,
    last_design: JSON.stringify(design).slice(0, 8000), seed: sc.seed, updated_at: now,
  });
  q.activity.run(userId, progress.dayKey(now));
  return { gains, firstClear, failedBefore };
});

function attempt(userId, body) {
  const L = GL.byId[String(body && body.level)];
  if (!L) return { error: 'Unknown level' };
  const before = xpInfo(userId);
  const sc = GL.score(L.id, body.seed, body.design, body.prediction);
  const design = L.clean ? L.clean(sc.params, body.design || {}) : body.design;
  const tx = attemptTx(userId, sc, design, Date.now());
  let badges = [];
  if (sc.result.ok && tx.failedBefore) badges = badges.concat(grant(userId, 'drawing-board'));
  if (sc.stars[2] && sc.predErr !== null && sc.predErr <= 0.01) badges = badges.concat(grant(userId, 'bullseye'));
  const s = progress.summary(userId);
  badges = badges.concat(awardBadges(userId, s));
  const after = xpInfo(userId, s);
  const res = sc.result;
  return {
    level: L.id, seed: sc.seed, ok: !!res.ok, fail: res.fail || null, stars: sc.stars, starCount: sc.starCount,
    predGiven: sc.predGiven, predOk: sc.predOk, actual: Number.isFinite(res.actual) ? res.actual : null, cost: res.cost ?? null,
    gains: tx.gains, xp: after, levelUp: after.level > before.level, firstClear: tx.firstClear,
    badges: badges.map((id) => badgeById.get(id)),
  };
}

/* ---------------- Goat Rush ---------------- */
const QUICK_NUMERIC = ['m-sig-eval', 'm-dot-compute', 'm-cr-det2', 'm-cr-2d', 'm-vec-mag', 'm-int-trap', 'm-sgn-moment'];
function rushPool(s) {
  const pool = [];
  for (const [id, d] of C.byId) {
    if (d.kind === 'mc' && (d.unit === 0 || s.units[d.unit - 1].unlocked)) pool.push(id);
  }
  return pool.concat(QUICK_NUMERIC.filter((id) => C.byId.has(id)));
}
const rseed = () => crypto.randomInt(1, 2 ** 31 - 1);
function nextProblem(pool, lastId) {
  const choices = pool.filter((id) => id !== lastId);
  const id = choices[crypto.randomInt(0, choices.length)];
  return { id, seed: rseed() };
}
const mult = (combo) => Math.min(5, 1 + Math.floor(combo / 3));

function rushStart(userId) {
  const s = progress.summary(userId);
  const now = Date.now(), cur = nextProblem(rushPool(s));
  const id = q.rushIns.run(userId, now, now + RUSH_MS, JSON.stringify(cur)).lastInsertRowid;
  return { id: Number(id), msLeft: RUSH_MS, duration: RUSH_MS, problem: C.publicView(C.instance(cur.id, cur.seed)), mult: 1, combo: 0, score: 0 };
}

function rushAnswer(userId, body) {
  const r = q.rushGet.get(Number(body && body.id), userId);
  if (!r) return { error: 'Round not found' };
  if (r.finished_at || !r.current) return { over: true, ...rushFinish(userId, r.id) };
  const now = Date.now();
  if (now > r.ends_at + RUSH_GRACE_MS) return { over: true, ...rushFinish(userId, r.id) };
  const cur = JSON.parse(r.current);
  if (body.problemId && body.problemId !== cur.id) return { error: 'Out of sync', resync: true };
  const inst = C.instance(cur.id, cur.seed);
  let correct = false, points = 0, combo = r.combo, g = null;
  if (!body.skip) {
    g = C.grade(inst, { answers: body.answers, choice: body.choice });
    correct = g.correct;
  }
  if (correct) { combo += 1; points = 100 * mult(combo); } else combo = 0;
  const score = r.score + points, best = Math.max(r.best_combo, combo);
  const s = progress.summary(userId);
  const nxt = nextProblem(rushPool(s), cur.id);
  const timeUp = now >= r.ends_at;
  q.rushUpd.run(score, combo, best, r.answered + (body.skip ? 0 : 1), r.correct + (correct ? 1 : 0), timeUp ? null : JSON.stringify(nxt), r.id);
  const out = {
    correct, skipped: !!body.skip, points, score, combo, mult: mult(combo), msLeft: Math.max(0, r.ends_at - now),
    correctChoice: g && g.correctChoice !== undefined ? g.correctChoice : null,
    expected: inst.def.kind === 'mc' ? null : inst.data.answers.map((a) => ({ key: a.key, value: Number(a.value.toPrecision(4)), unit: a.unit })),
  };
  if (timeUp) return { ...out, over: true, ...rushFinish(userId, r.id) };
  out.problem = C.publicView(C.instance(nxt.id, nxt.seed));
  return out;
}

function rushFinish(userId, id) {
  const r = q.rushGet.get(Number(id), userId);
  if (!r) return { error: 'Round not found' };
  const now = Date.now();
  if (!r.finished_at) q.rushFinish.run(now, r.id);
  const xp = Math.floor(r.score / 25);
  let gained = 0;
  if (xp > 0 && q.xpIns.run(userId, 'rush', String(r.id), xp, now).changes) gained = xp;
  if (r.answered > 0) q.activity.run(userId, progress.dayKey(now));
  let badges = [];
  if (r.best_combo >= 12) badges = badges.concat(grant(userId, 'combo-5'));
  const s = progress.summary(userId);
  badges = badges.concat(awardBadges(userId, s));
  const rb = q.rushBest.get(userId);
  return { final: { score: r.score, correct: r.correct, answered: r.answered, bestCombo: r.best_combo, xpGained: gained, best: rb.best || 0, newBest: r.score > 0 && r.score >= (rb.best || 0) }, xp: xpInfo(userId, s), badges: badges.map((b) => badgeById.get(b)) };
}

module.exports = { state, attempt, rushStart, rushAnswer, rushFinish, xpInfo, playerLevel, CHARACTERS, BADGES, TITLES, LEVELS: GL.LEVELS, mult, RUSH_MS };
