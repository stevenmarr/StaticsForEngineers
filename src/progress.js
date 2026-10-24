'use strict';
const db = require('./db');
const config = require('./config');
const C = require('../content');

const REVIEW_INTERVALS_DAYS = [0, 1, 3, 7, 14]; // box -> days until next review
const RETRY_DELAY_MS = 10 * 60 * 1000;          // a missed item comes back after 10 minutes
const GRADUATE_BOX = 4;
const DAY = 24 * 3600 * 1000;

function dayKey(ts = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: config.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ts));
}

const q = {
  prior: db.prepare('SELECT COUNT(*) n FROM attempts WHERE user_id = ? AND problem_id = ? AND seed = ?'),
  insert: db.prepare('INSERT INTO attempts (user_id, problem_id, unit, seed, first, correct, score, hints, mode, quiz_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)'),
  activity: db.prepare('INSERT INTO activity (user_id, day, count) VALUES (?, ?, 1) ON CONFLICT(user_id, day) DO UPDATE SET count = count + 1'),
  reviewGet: db.prepare('SELECT * FROM review WHERE user_id = ? AND problem_id = ?'),
  reviewUpsert: db.prepare('INSERT INTO review (user_id, problem_id, unit, box, due, updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(user_id, problem_id) DO UPDATE SET box = excluded.box, due = excluded.due, updated_at = excluded.updated_at'),
  reviewDel: db.prepare('DELETE FROM review WHERE user_id = ? AND problem_id = ?'),
  firsts: db.prepare('SELECT problem_id, score FROM attempts WHERE user_id = ? AND first = 1 ORDER BY id DESC'),
  unlockIns: db.prepare('INSERT OR IGNORE INTO unlocks (user_id, unit, unlocked_at) VALUES (?, ?, ?)'),
  unlocks: db.prepare('SELECT unit FROM unlocks WHERE user_id = ?'),
  days: db.prepare('SELECT day FROM activity WHERE user_id = ? ORDER BY day DESC LIMIT 400'),
  totals: db.prepare('SELECT COUNT(*) attempts, SUM(correct) correct FROM attempts WHERE user_id = ? AND first = 1'),
  due: db.prepare('SELECT * FROM review WHERE user_id = ? AND due <= ? ORDER BY due ASC'),
  allReview: db.prepare('SELECT * FROM review WHERE user_id = ? ORDER BY due ASC'),
  lessonView: db.prepare('INSERT INTO lesson_views (user_id, unit, viewed_at) VALUES (?, ?, ?) ON CONFLICT(user_id, unit) DO UPDATE SET viewed_at = excluded.viewed_at'),
  lessonViews: db.prepare('SELECT unit FROM lesson_views WHERE user_id = ?'),
  user: db.prepare('SELECT unlock_all FROM users WHERE id = ?'),
};

// Score for one problem type: mean of the last 3 first-try scores, but at least 2 are
// needed for full credit (one lucky success = 50%).
function typeScores(userId) {
  const rows = q.firsts.all(userId);
  const by = new Map();
  for (const r of rows) {
    const arr = by.get(r.problem_id) || [];
    if (arr.length < 3) arr.push(r.score);
    by.set(r.problem_id, arr);
  }
  const out = {};
  for (const [id, arr] of by) out[id] = { score: arr.reduce((a, b) => a + b, 0) / Math.max(arr.length, 2), n: arr.length, last: arr[0] };
  return out;
}

function unitMastery(userId, ts = typeScores(userId)) {
  return C.units.map((u) => {
    const types = u.problems.map((p) => ts[p.id] ? ts[p.id].score : 0);
    const attempted = u.problems.filter((p) => ts[p.id]).length;
    return { unit: u.num, mastery: types.reduce((a, b) => a + b, 0) / types.length, attempted, total: u.problems.length };
  });
}

function unlockedSet(userId, mastery = unitMastery(userId)) {
  const user = q.user.get(userId);
  const set = new Set([1]);
  if (user && user.unlock_all) C.units.forEach((u) => set.add(u.num));
  for (const r of q.unlocks.all(userId)) set.add(r.unit);
  // Mastery-based unlock (persisted so it never re-locks if a later miss dips the score)
  for (const m of mastery) {
    if (m.mastery >= config.masteryThreshold && m.unit < C.units.length && !set.has(m.unit + 1)) {
      q.unlockIns.run(userId, m.unit + 1, Date.now());
      set.add(m.unit + 1);
    }
  }
  return set;
}

function streak(userId) {
  const days = new Set(q.days.all(userId).map((r) => r.day));
  let n = 0;
  let t = Date.now();
  if (!days.has(dayKey(t))) t -= DAY; // streak still alive if he practiced yesterday
  while (days.has(dayKey(t))) { n++; t -= DAY; }
  const week = [];
  for (let i = 6; i >= 0; i--) { const k = dayKey(Date.now() - i * DAY); week.push({ day: k, active: days.has(k) }); }
  return { current: n, activeToday: days.has(dayKey()), week };
}

function updateReview(userId, def, correct, now) {
  const item = q.reviewGet.get(userId, def.id);
  if (!correct) {
    q.reviewUpsert.run(userId, def.id, def.unit, 0, now + RETRY_DELAY_MS, now);
    return { action: 'queued' };
  }
  if (!item) return { action: 'none' };
  if (item.due > now) return { action: 'not-due' };
  const box = item.box + 1;
  if (box >= GRADUATE_BOX) { q.reviewDel.run(userId, def.id); return { action: 'graduated' }; }
  q.reviewUpsert.run(userId, def.id, def.unit, box, now + REVIEW_INTERVALS_DAYS[box] * DAY, now);
  return { action: 'advanced', box };
}

const record = db.transaction((userId, inst, correct, hints, mode, quizId) => {
  const now = Date.now();
  const first = q.prior.get(userId, inst.def.id, inst.seed).n === 0;
  const score = correct ? Math.max(0.5, 1 - 0.15 * Math.min(hints, 3)) : 0;
  q.insert.run(userId, inst.def.id, inst.def.unit, inst.seed, first ? 1 : 0, correct ? 1 : 0, first ? score : 0, hints, mode, quizId || null, now);
  let review = { action: 'none' };
  if (first) {
    q.activity.run(userId, dayKey(now));
    review = updateReview(userId, inst.def, correct, now);
  }
  return { first, score: first ? score : 0, review };
});

function recordAttempt(userId, inst, correct, hints, mode, quizId) {
  const before = unlockedSet(userId);
  const res = record(userId, inst, correct, hints, mode, quizId);
  const ts = typeScores(userId);
  const mastery = unitMastery(userId, ts);
  const after = unlockedSet(userId, mastery);
  res.typeScore = ts[inst.def.id] ? ts[inst.def.id].score : 0;
  res.newlyUnlocked = [...after].filter((u) => !before.has(u));
  const um = mastery.find((m) => m.unit === inst.def.unit);
  res.unitMastery = um ? um.mastery : null;
  if (inst.def.skill) {
    const readiness = require('./readiness');
    res.skill = inst.def.skill;
    res.skillMastery = readiness.practiceMastery(ts)[inst.def.skill].mastery;
  }
  return res;
}

function summary(userId) {
  const ts = typeScores(userId);
  const mastery = unitMastery(userId, ts);
  const unlocked = unlockedSet(userId, mastery);
  const tot = q.totals.get(userId);
  const now = Date.now();
  const due = q.due.all(userId, now);
  const queue = q.allReview.all(userId);
  const viewed = new Set(q.lessonViews.all(userId).map((r) => r.unit));
  const rec = mastery.find((m) => unlocked.has(m.unit) && m.mastery < config.masteryThreshold);
  const readiness = require('./readiness');
  const skills = readiness.skillStates(userId, ts);
  const assessment = readiness.assessmentInfo(userId);
  const gaps = rec ? readiness.unitGaps(rec.unit, skills) : [];
  let recommended;
  if (!assessment.taken) recommended = { kind: 'assess', text: assessment.open ? 'Finish your math readiness check' : 'Take the math readiness check (about 15 minutes)' };
  else if (due.length >= 3) recommended = { kind: 'review', text: `Clear your review queue (${due.length} due)` };
  else if (rec && gaps.length) {
    const g = gaps[0];
    recommended = { kind: 'skill', skill: g.key, slug: g.slug, unit: rec.unit, lesson: !g.viewed, text: `${g.viewed ? 'Practice' : 'Brush up on'} ${g.short}: Unit ${rec.unit} uses it` };
  } else if (rec) recommended = { kind: 'unit', unit: rec.unit, text: viewed.has(rec.unit) ? `Keep practicing Unit ${rec.unit}` : `Read the Unit ${rec.unit} lesson`, lesson: !viewed.has(rec.unit) };
  else if (due.length) recommended = { kind: 'review', text: `Clear your review queue (${due.length} due)` };
  else recommended = { kind: 'quiz', text: 'Take a mixed-review quiz' };
  return {
    units: mastery.map((m) => ({ ...m, unlocked: unlocked.has(m.unit), mastered: m.mastery >= config.masteryThreshold, lessonViewed: viewed.has(m.unit) })),
    typeScores: ts,
    totals: { attempts: tot.attempts || 0, correct: tot.correct || 0 },
    streak: streak(userId),
    reviewDue: due.length,
    reviewQueued: queue.length,
    nextReviewAt: queue.length ? queue[0].due : null,
    recommended,
    skills,
    assessment,
    threshold: config.masteryThreshold,
  };
}

function markLessonViewed(userId, unit) { q.lessonView.run(userId, unit, Date.now()); }
function dueItems(userId) { return q.due.all(userId, Date.now()); }

// Pick the next problem type to practice in a unit (or toolkit skill): weakest first, avoid immediate repeats.
function pickProblem(userId, unitNum, excludeId, skillKey) {
  const u = skillKey ? C.toolkitByKey.get(skillKey) : C.units[unitNum - 1];
  const ts = typeScores(userId);
  const scored = u.problems.map((p) => ({ id: p.id, s: ts[p.id] ? ts[p.id].score : -1, r: Math.random() }));
  const pool = scored.filter((x) => x.id !== excludeId);
  pool.sort((a, b) => a.s - b.s || a.r - b.r);
  // a little randomness among the weakest few
  const weakest = pool.filter((x) => x.s <= pool[0].s + 0.25).slice(0, 3);
  return weakest[Math.floor(Math.random() * weakest.length)].id;
}

module.exports = { summary, recordAttempt, typeScores, unitMastery, unlockedSet, markLessonViewed, dueItems, pickProblem, dayKey };
