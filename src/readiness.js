'use strict';
// Math readiness: placement assessment, per-skill status, and the gaps that gate (softly) each unit.
const db = require('./db');
const C = require('../content');

const SK = C.skills;
const RANK = { unknown: 0, notyet: 1, partial: 2, mastered: 3 };
const LABEL = { unknown: 'Not checked', notyet: 'Not yet', partial: 'Partial', mastered: 'Mastered' };
const PER_SKILL = 3;          // items reserved per skill (2 are enough when they agree)
const PRACTICE_MASTERED = 0.8;
const PRACTICE_PARTIAL = 0.4;

const q = {
  assessIns: db.prepare('INSERT INTO assessments (user_id, items, created_at) VALUES (?, ?, ?)'),
  assessGet: db.prepare('SELECT * FROM assessments WHERE id = ? AND user_id = ?'),
  assessOpen: db.prepare('SELECT * FROM assessments WHERE user_id = ? AND finished_at IS NULL ORDER BY id DESC LIMIT 1'),
  assessLast: db.prepare('SELECT * FROM assessments WHERE user_id = ? AND finished_at IS NOT NULL ORDER BY id DESC LIMIT 1'),
  assessCount: db.prepare('SELECT COUNT(*) n FROM assessments WHERE user_id = ? AND finished_at IS NOT NULL'),
  assessUpd: db.prepare('UPDATE assessments SET items = ? WHERE id = ?'),
  assessFin: db.prepare('UPDATE assessments SET items = ?, finished_at = ? WHERE id = ?'),
  assessDropOpen: db.prepare('DELETE FROM assessments WHERE user_id = ? AND finished_at IS NULL'),
  statusAll: db.prepare('SELECT * FROM skill_status WHERE user_id = ?'),
  statusUpsert: db.prepare(`INSERT INTO skill_status (user_id, skill, status, correct, total, source, updated_at) VALUES (?,?,?,?,?,?,?)
    ON CONFLICT(user_id, skill) DO UPDATE SET status = excluded.status, correct = excluded.correct, total = excluded.total, source = excluded.source, updated_at = excluded.updated_at`),
  viewIns: db.prepare('INSERT INTO toolkit_views (user_id, skill, viewed_at) VALUES (?, ?, ?) ON CONFLICT(user_id, skill) DO UPDATE SET viewed_at = excluded.viewed_at'),
  views: db.prepare('SELECT skill FROM toolkit_views WHERE user_id = ?'),
  prefGet: db.prepare('SELECT value FROM user_prefs WHERE user_id = ? AND key = ?'),
  prefSet: db.prepare('INSERT INTO user_prefs (user_id, key, value) VALUES (?, ?, ?) ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value'),
};

const getPref = (uid, key) => { const r = q.prefGet.get(uid, key); return r ? r.value : null; };
const setPref = (uid, key, value) => q.prefSet.run(uid, key, String(value));

// ---------- assessment construction ----------
function buildItems(rand = Math.random, newSeed = () => Math.floor(rand() * 2 ** 32)) {
  const items = [];
  for (const t of C.toolkit) {
    // Prefer numeric items; allow at most one concept (MC) question per skill, and never as the first item.
    const shuffle = (a) => a.map((x) => [rand(), x]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
    const num = shuffle(t.problems.filter((p) => p.kind !== 'mc'));
    const mc = shuffle(t.problems.filter((p) => p.kind === 'mc'));
    const picked = num.slice(0, 2);
    picked.push(mc.length && rand() < 0.5 ? mc[0] : (num[2] || mc[0]));
    for (const p of picked.slice(0, PER_SKILL)) items.push({ id: p.id, seed: newSeed() >>> 0, skill: t.key, result: null });
  }
  return items;
}

// Skill outcome from its answered items. Returns { decided, status, correct, answered }.
function skillOutcome(results) {
  const ans = results.filter((r) => r !== null);
  const c = ans.filter((r) => r === 1).length;
  if (ans.length >= 2 && ans[0] === ans[1]) return { decided: true, status: ans[0] === 1 ? 'mastered' : 'notyet', correct: c, answered: ans.length };
  if (ans.length >= 3) return { decided: true, status: c >= 2 ? 'partial' : 'notyet', correct: c, answered: ans.length };
  return { decided: false, status: null, correct: c, answered: ans.length };
}

function groups(items) {
  const g = new Map();
  items.forEach((it, i) => { if (!g.has(it.skill)) g.set(it.skill, []); g.get(it.skill).push({ ...it, index: i }); });
  return g;
}

function nextIndex(items) {
  for (const [, arr] of groups(items)) {
    if (skillOutcome(arr.map((a) => a.result)).decided) continue;
    const nxt = arr.find((a) => a.result === null);
    if (nxt) return nxt.index;
  }
  return -1;
}

function progressOf(items) {
  let answered = 0, expected = 0, skillsDone = 0;
  for (const [, arr] of groups(items)) {
    const o = skillOutcome(arr.map((a) => a.result));
    answered += o.answered;
    expected += o.decided ? o.answered : Math.max(2, o.answered + 1);
    if (o.decided) skillsDone++;
  }
  return { answered, expected, skillsDone, skills: C.toolkit.length };
}

function itemView(a, idx) {
  const it = a.items[idx];
  const pv = C.publicView(C.instance(it.id, it.seed));
  pv.hints = []; // no hints during placement
  const sk = SK.byKey.get(it.skill);
  return { index: idx, skill: it.skill, skillTitle: sk.title, skillNum: sk.num, problem: pv };
}

function start(userId) {
  q.assessDropOpen.run(userId);
  const crypto = require('crypto');
  const items = buildItems(Math.random, () => crypto.randomBytes(4).readUInt32LE(0));
  const info = q.assessIns.run(userId, JSON.stringify(items), Date.now());
  setPref(userId, 'assess_prompted', 1);
  return current(userId, info.lastInsertRowid);
}

function current(userId, id) {
  const row = id ? q.assessGet.get(id, userId) : q.assessOpen.get(userId);
  if (!row || row.finished_at) return null;
  const a = { id: row.id, items: JSON.parse(row.items) };
  const idx = nextIndex(a.items);
  return { id: a.id, progress: progressOf(a.items), item: idx >= 0 ? itemView(a, idx) : null };
}

// Grade one answer (or a skip) for the item the server expects next.
function answer(userId, id, index, submission) {
  const row = q.assessGet.get(id, userId);
  if (!row || row.finished_at) return { error: 'No open assessment', status: 400 };
  const items = JSON.parse(row.items);
  const expected = nextIndex(items);
  if (index !== expected) return { error: 'Out-of-order answer', status: 409 };
  const it = items[index];
  let correct = false;
  if (!submission.skip) correct = C.grade(C.instance(it.id, it.seed), submission).correct;
  it.result = correct ? 1 : 0;
  if (submission.skip) it.skipped = true;
  const nxt = nextIndex(items);
  if (nxt >= 0) {
    q.assessUpd.run(JSON.stringify(items), id);
    return { done: false, progress: progressOf(items), item: itemView({ id, items }, nxt) };
  }
  finish(userId, id, items);
  return { done: true, results: results(userId) };
}

function finish(userId, id, items) {
  const now = Date.now();
  q.assessFin.run(JSON.stringify(items), now, id);
  for (const [skill, arr] of groups(items)) {
    const o = skillOutcome(arr.map((a) => a.result));
    q.statusUpsert.run(userId, skill, o.status || 'notyet', o.correct, o.answered, 'assessment', now);
  }
}

// ---------- status ----------
function practiceMastery(typeScores) {
  const out = {};
  for (const t of C.toolkit) {
    const sc = t.problems.map((p) => (typeScores[p.id] ? typeScores[p.id].score : 0));
    out[t.key] = { mastery: sc.reduce((a, b) => a + b, 0) / sc.length, attempted: t.problems.filter((p) => typeScores[p.id]).length, total: t.problems.length };
  }
  return out;
}

// Effective status per skill = best of (assessment result, toolkit practice mastery).
function skillStates(userId, typeScores) {
  const rows = new Map(q.statusAll.all(userId).map((r) => [r.skill, r]));
  const pm = practiceMastery(typeScores);
  const viewed = new Set(q.views.all(userId).map((r) => r.skill));
  const out = {};
  for (const s of SK.skills) {
    const row = rows.get(s.key);
    const assessed = row ? row.status : 'unknown';
    const p = pm[s.key];
    const fromPractice = p.mastery >= PRACTICE_MASTERED ? 'mastered' : p.mastery >= PRACTICE_PARTIAL ? 'partial' : 'unknown';
    const status = RANK[fromPractice] > RANK[assessed] ? fromPractice : assessed;
    out[s.key] = { key: s.key, slug: s.slug, title: s.title, short: s.short, num: s.num, status, label: LABEL[status], assessed, assessCorrect: row ? row.correct : 0, assessTotal: row ? row.total : 0, practice: p.mastery, attempted: p.attempted, total: p.total, viewed: viewed.has(s.key) };
  }
  return out;
}

function assessmentInfo(userId) {
  const last = q.assessLast.get(userId);
  const open = q.assessOpen.get(userId);
  return { taken: !!last, lastAt: last ? last.finished_at : null, count: q.assessCount.get(userId).n, open: !!open, prompted: getPref(userId, 'assess_prompted') === '1' };
}

// Skills a unit needs that the student has not yet shown (assessed or practiced) as mastered.
function unitGaps(unitNum, states) {
  const needs = SK.unitSkills[unitNum] || [];
  return needs.map((k) => states[k]).filter((s) => s.status === 'notyet' || s.status === 'partial')
    .sort((a, b) => RANK[a.status] - RANK[b.status]);
}

function results(userId) {
  const progress = require('./progress');
  const states = skillStates(userId, progress.typeScores(userId));
  return SK.skills.map((s) => states[s.key]);
}

function markViewed(userId, skill) { q.viewIns.run(userId, skill, Date.now()); }

module.exports = { buildItems, skillOutcome, nextIndex, progressOf, start, current, answer, skillStates, assessmentInfo, unitGaps, results, markViewed, getPref, setPref, practiceMastery, RANK, LABEL, PER_SKILL };
