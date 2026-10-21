'use strict';
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const config = require('./src/config');
const db = require('./src/db');
const SqliteStore = require('./src/sessionStore');
const users = require('./src/users');
const progress = require('./src/progress');
const readiness = require('./src/readiness');
const V = require('./src/views');
const C = require('./content');

const B = config.basePath;
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', /^\d+$/.test(String(config.trustProxy)) ? parseInt(config.trustProxy, 10) : config.trustProxy);

// Seed the default user on first run (only if no users exist yet).
users.seedDefaultUser(config.defaultUser, config.defaultPass);

// --- security headers ---------------------------------------------------------
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'same-origin',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; script-src 'self'; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'",
  });
  next();
});

const router = express.Router();

// --- static assets (public, no login needed so the login page can be styled) ---
const staticOpts = { maxAge: '7d', index: false };
router.use('/static/vendor/katex', express.static(path.join(__dirname, 'node_modules/katex/dist'), staticOpts));
router.use('/static/vendor/montserrat/files', express.static(path.join(__dirname, 'node_modules/@fontsource/montserrat/files'), staticOpts));
router.use('/static', express.static(path.join(__dirname, 'public'), { maxAge: '1h', index: false }));
router.get('/healthz', (req, res) => res.type('text').send('ok'));

// --- sessions -----------------------------------------------------------------
router.use(session({
  name: 'sfe.sid',
  secret: config.sessionSecret,
  store: new SqliteStore(db),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { path: B || '/', httpOnly: true, sameSite: 'lax', secure: config.cookieSecure, maxAge: 30 * 24 * 3600 * 1000 },
}));
router.use(express.urlencoded({ extended: false, limit: '20kb' }));
router.use(express.json({ limit: '20kb' }));

function csrfToken(req) {
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(24).toString('hex');
  return req.session.csrf;
}
function checkCsrf(req, res, next) {
  const sent = req.get('x-csrf-token') || (req.body && req.body._csrf);
  const ok = sent && req.session.csrf && sent.length === req.session.csrf.length && crypto.timingSafeEqual(Buffer.from(sent), Buffer.from(req.session.csrf));
  if (!ok) {
    if (req.path.startsWith('/api/')) return res.status(403).json({ error: 'Bad or missing CSRF token. Reload the page.' });
    return res.status(403).send(V.errorPage({ status: 403, message: 'Your form expired. Go back, reload the page, and try again.' }));
  }
  next();
}

// --- login rate limiting (per IP, in memory) ------------------------------------
const fails = new Map();
const WINDOW = 15 * 60 * 1000, MAX_FAILS = 10;
function tooMany(ip) { const f = fails.get(ip); return f && Date.now() - f.first < WINDOW && f.n >= MAX_FAILS; }
function noteFail(ip) { const f = fails.get(ip); if (!f || Date.now() - f.first > WINDOW) fails.set(ip, { n: 1, first: Date.now() }); else f.n++; }

// --- auth ---------------------------------------------------------------------
router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect(B + '/');
  res.send(V.loginPage({ csrf: csrfToken(req) }));
});
router.post('/login', checkCsrf, (req, res) => {
  const ip = req.ip;
  const username = String(req.body.username || '').trim();
  if (tooMany(ip)) return res.status(429).send(V.loginPage({ csrf: csrfToken(req), error: 'Too many failed attempts. Wait 15 minutes and try again.', username }));
  const u = users.verify(username, req.body.password);
  if (!u) {
    noteFail(ip);
    return res.status(401).send(V.loginPage({ csrf: csrfToken(req), error: 'Incorrect username or password.', username }));
  }
  fails.delete(ip);
  const returnTo = req.session.returnTo;
  req.session.regenerate((err) => {
    if (err) return res.status(500).send('Session error');
    req.session.userId = u.id;
    csrfToken(req);
    const dest = typeof returnTo === 'string' && returnTo.startsWith(B + '/') && !returnTo.includes('//', 1) ? returnTo : B + '/';
    req.session.save(() => res.redirect(dest));
  });
});
router.post('/logout', checkCsrf, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('sfe.sid', { path: B || '/' });
    res.redirect(B + '/login');
  });
});

// Everything below requires a logged-in user.
router.use((req, res, next) => {
  const u = req.session.userId && users.findById(req.session.userId);
  if (!u) {
    if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Not logged in' });
    if (req.method === 'GET') req.session.returnTo = B + req.originalUrl.slice(B.length);
    return res.redirect(B + '/login');
  }
  req.user = u;
  res.locals.csrf = csrfToken(req);
  next();
});

const ctx = (req, extra = {}) => ({ user: req.user, csrf: res_csrf(req), s: progress.summary(req.user.id), ...extra });
function res_csrf(req) { return req.session.csrf; }
function unitParam(req) { const n = parseInt(req.params.n, 10); return n >= 1 && n <= C.units.length ? C.units[n - 1] : null; }

router.get('/', (req, res) => {
  // First visit after login: offer the math readiness check once (it stays recommended until taken).
  const info = readiness.assessmentInfo(req.user.id);
  if (!info.taken && !info.prompted) { readiness.setPref(req.user.id, 'assess_prompted', 1); return res.redirect(B + '/assessment'); }
  res.send(V.dashboard(ctx(req)));
});
router.get('/units', (req, res) => res.send(V.unitsIndex(ctx(req))));
router.get('/units/:n', (req, res, next) => {
  const unit = unitParam(req); if (!unit) return next();
  progress.markLessonViewed(req.user.id, unit.num);
  res.send(V.lessonPage(ctx(req, { unit })));
});
router.get('/units/:n/practice', (req, res, next) => {
  const unit = unitParam(req); if (!unit) return next();
  const c = ctx(req, { unit, type: C.byId.has(req.query.type) && C.byId.get(req.query.type).unit === unit.num ? req.query.type : '' });
  if (!c.s.units[unit.num - 1].unlocked) return res.redirect(B + '/units/' + unit.num);
  res.send(V.practicePage(c));
});
router.get('/review', (req, res) => res.send(V.reviewPage(ctx(req))));

// --- math readiness assessment & toolkit -------------------------------------------
router.get('/assessment', (req, res) => res.send(V.assessmentPage(ctx(req, { results: readiness.results(req.user.id) }))));
router.get('/assessment/results', (req, res) => res.send(V.assessmentResultsPage(ctx(req, { results: readiness.results(req.user.id) }))));
router.post('/assessment/later', checkCsrf, (req, res) => { readiness.setPref(req.user.id, 'assess_prompted', 1); res.redirect(B + '/?later=1'); });
function skillParam(req) { return C.toolkitBySlug.get(String(req.params.slug || '')) || null; }
router.get('/toolkit', (req, res) => res.send(V.toolkitIndex(ctx(req))));
router.get('/toolkit/:slug', (req, res, next) => {
  const t = skillParam(req); if (!t) return next();
  readiness.markViewed(req.user.id, t.key);
  res.send(V.toolkitLessonPage(ctx(req, { t })));
});
router.get('/toolkit/:slug/practice', (req, res, next) => {
  const t = skillParam(req); if (!t) return next();
  const type = C.byId.has(req.query.type) && C.byId.get(req.query.type).skill === t.key ? req.query.type : '';
  res.send(V.toolkitPracticePage(ctx(req, { t, type })));
});
router.get('/quiz', (req, res) => res.send(V.quizPage(ctx(req))));
router.get('/settings', (req, res) => res.send(V.settingsPage(ctx(req, { msg: req.query.ok ? 'Saved.' : '' }))));
router.post('/settings/password', checkCsrf, (req, res) => {
  const { current, next: nw, confirm } = req.body;
  const full = users.findByName(req.user.username);
  let err = '';
  if (!users.verify(req.user.username, current)) err = 'Your current password is incorrect.';
  else if (!nw || nw.length < 8) err = 'The new password must be at least 8 characters.';
  else if (nw !== confirm) err = 'The new passwords do not match.';
  if (err) return res.status(400).send(V.settingsPage(ctx(req, { err })));
  users.setPassword(full.id, nw);
  res.send(V.settingsPage(ctx(req, { msg: 'Password updated.' })));
});
router.post('/settings/unlock', checkCsrf, (req, res) => {
  db.prepare('UPDATE users SET unlock_all = ? WHERE id = ?').run(req.body.unlock_all ? 1 : 0, req.user.id);
  res.redirect(B + '/settings?ok=1');
});

// --- JSON API -----------------------------------------------------------------
const newSeed = () => crypto.randomBytes(4).readUInt32LE(0);

router.get('/api/progress', (req, res) => res.json(progress.summary(req.user.id)));

router.get('/api/problem', (req, res) => {
  const s = progress.summary(req.user.id);
  let id = String(req.query.id || '');
  if (id && !C.byId.has(id)) return res.status(404).json({ error: 'Unknown problem type' });
  if (!id && req.query.skill) {
    const key = String(req.query.skill);
    if (!C.toolkitByKey.has(key)) return res.status(404).json({ error: 'Unknown skill' });
    id = progress.pickProblem(req.user.id, 0, String(req.query.exclude || ''), key);
  }
  if (!id) {
    const n = parseInt(req.query.unit, 10);
    if (!(n >= 1 && n <= C.units.length)) return res.status(400).json({ error: 'unit, skill or id required' });
    id = progress.pickProblem(req.user.id, n, String(req.query.exclude || ''));
  }
  const def = C.byId.get(id);
  if (def.unit && !s.units[def.unit - 1].unlocked) return res.status(403).json({ error: 'That unit is locked' });
  res.json(C.publicView(C.instance(id, newSeed())));
});

router.get('/api/review/next', (req, res) => {
  const due = progress.dueItems(req.user.id);
  const s = progress.summary(req.user.id);
  if (!due.length) return res.json({ done: true, queued: s.reviewQueued, nextReviewAt: s.nextReviewAt });
  const skip = String(req.query.exclude || '');
  const pick = due.find((d) => d.problem_id !== skip) || due[0];
  res.json({ done: false, remaining: due.length, problem: C.publicView(C.instance(pick.problem_id, newSeed())) });
});

router.post('/api/check', checkCsrf, (req, res) => {
  const { id, seed, answers, choice, hints, mode, quizId } = req.body || {};
  if (!C.byId.has(id) || !Number.isFinite(Number(seed))) return res.status(400).json({ error: 'Bad problem reference' });
  const inst = C.instance(id, Number(seed));
  const md = ['practice', 'review', 'quiz'].includes(mode) ? mode : 'practice';
  let qid = null;
  if (md === 'quiz') {
    const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND user_id = ?').get(Number(quizId), req.user.id);
    if (!quiz || quiz.finished_at) return res.status(400).json({ error: 'Quiz not found or already finished' });
    const items = JSON.parse(quiz.items);
    if (!items.some((it) => it.id === id && it.seed === inst.seed)) return res.status(400).json({ error: 'Problem is not part of this quiz' });
    qid = quiz.id;
  }
  const g = C.grade(inst, { answers, choice });
  const hintCount = md === 'quiz' ? 0 : Math.max(0, Math.min(5, parseInt(hints, 10) || 0));
  const rec = progress.recordAttempt(req.user.id, inst, g.correct, hintCount, md, qid);
  res.json({
    correct: g.correct,
    results: g.results.map((r) => ({ key: r.key, ok: r.ok, parsed: r.parsed })),
    correctChoice: g.correctChoice,
    solution: C.solutionHtml(inst),
    firstAttempt: rec.first,
    scoreAwarded: rec.score,
    review: rec.review.action,
    unit: inst.def.unit,
    unitMastery: rec.unitMastery,
    skill: rec.skill || null,
    skillMastery: rec.skillMastery ?? null,
    typeScore: rec.typeScore,
    newlyUnlocked: rec.newlyUnlocked,
  });
});

router.get('/api/assess/current', (req, res) => res.json(readiness.current(req.user.id) || { none: true, info: readiness.assessmentInfo(req.user.id) }));
router.post('/api/assess/start', checkCsrf, (req, res) => res.json(readiness.start(req.user.id)));
router.post('/api/assess/answer', checkCsrf, (req, res) => {
  const { id, index, answers, choice, skip } = req.body || {};
  const r = readiness.answer(req.user.id, Number(id), Number(index), { answers, choice, skip: !!skip });
  if (r.error) return res.status(r.status || 400).json({ error: r.error });
  res.json(r);
});
router.get('/api/skills', (req, res) => res.json({ assessment: readiness.assessmentInfo(req.user.id), skills: readiness.results(req.user.id) }));

router.post('/api/quiz/start', checkCsrf, (req, res) => {
  const s = progress.summary(req.user.id);
  let pool = s.units.filter((u) => u.mastered).map((u) => u.unit);
  let note = '';
  if (!pool.length) {
    pool = s.units.filter((u) => u.attempted > 0 && u.unlocked).map((u) => u.unit);
    note = pool.length ? 'You have no mastered units yet, so this quiz draws from the units you have started.' : '';
  }
  if (!pool.length) return res.status(400).json({ error: 'Practice at least one unit before taking a mixed quiz.' });
  const ids = C.units.filter((u) => pool.includes(u.num)).flatMap((u) => u.problems.map((p) => p.id));
  const shuffled = ids.map((id) => ({ id, r: Math.random() })).sort((a, b) => a.r - b.r).map((x) => x.id);
  const chosen = [];
  for (let i = 0; chosen.length < 10; i++) chosen.push(shuffled[i % shuffled.length]); // repeats get fresh numbers
  const items = chosen.map((id) => ({ id, seed: newSeed() }));
  const info = db.prepare('INSERT INTO quizzes (user_id, items, created_at, total) VALUES (?, ?, ?, ?)').run(req.user.id, JSON.stringify(items), Date.now(), items.length);
  res.json({ quizId: info.lastInsertRowid, note, units: pool, problems: items.map((it) => C.publicView(C.instance(it.id, it.seed))) });
});

router.post('/api/quiz/:id/finish', checkCsrf, (req, res) => {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND user_id = ?').get(Number(req.params.id), req.user.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  const rows = db.prepare('SELECT problem_id, seed, MIN(id) first_id FROM attempts WHERE quiz_id = ? GROUP BY problem_id, seed').all(quiz.id);
  const firstRows = rows.map((r) => db.prepare('SELECT correct FROM attempts WHERE id = ?').get(r.first_id));
  const correct = firstRows.filter((r) => r.correct).length;
  if (!quiz.finished_at) db.prepare('UPDATE quizzes SET finished_at = ?, score = ? WHERE id = ?').run(Date.now(), correct, quiz.id);
  const history = db.prepare('SELECT score, total, finished_at FROM quizzes WHERE user_id = ? AND finished_at IS NOT NULL ORDER BY id DESC LIMIT 5').all(req.user.id);
  res.json({ correct, total: quiz.total, history });
});

router.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
router.use((req, res) => res.status(404).send(V.errorPage({ user: req.user, csrf: req.session && req.session.csrf, status: 404, message: 'That page does not exist.' })));
// eslint-disable-next-line no-unused-vars
router.use((err, req, res, next) => {
  console.error(err);
  if (req.path.startsWith('/api/')) return res.status(500).json({ error: 'Server error' });
  res.status(500).send(V.errorPage({ status: 500, message: 'Something went wrong.' }));
});

if (B) {
  // "/StaticsForEngineers" (no trailing slash) -> "/StaticsForEngineers/", and "/" -> the app
  app.use((req, res, next) => {
    if (req.path === B) return res.redirect(301, B + '/' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''));
    if (req.path === '/') return res.redirect(B + '/');
    next();
  });
}
app.use(B || '/', router);

app.listen(config.port, config.host, () => {
  console.log(`StaticsForEngineers listening on http://${config.host}:${config.port}${B}/`);
});
