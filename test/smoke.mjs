// End-to-end smoke test. Starts its own server on a scratch DB, logs in as the
// .env default user, exercises pages + API, restarts, and checks persistence.
// Usage: node test/smoke.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
process.chdir(root);
require('dotenv').config({ path: path.join(root, '.env') });

const PORT = 3999, BASE = process.env.BASE_PATH ?? '/StaticsForEngineers';
const ORIGIN = `http://127.0.0.1:${PORT}`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sfe-test-'));
const USER = process.env.DEFAULT_USER, PASS = process.env.DEFAULT_PASS;
const C = require('../content');
let server, pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('  ✓', msg); } else { fail++; console.log('  ✗', msg); } };

function start() {
  return new Promise((resolve, reject) => {
    server = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, COOKIE_SECURE: 'false' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    server.stdout.on('data', (d) => { out += d; if (out.includes('listening')) resolve(); });
    server.stderr.on('data', (d) => process.stderr.write(d));
    setTimeout(() => reject(new Error('server start timeout: ' + out)), 8000);
  });
}
const stop = () => new Promise((r) => { server.on('exit', r); server.kill('SIGTERM'); });

let cookie = '';
async function req(p, opts = {}) {
  const res = await fetch(ORIGIN + p, { redirect: 'manual', ...opts, headers: { ...(opts.headers || {}), ...(cookie ? { cookie } : {}) } });
  const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const c of sc) if (c.startsWith('sfe.sid=')) { cookie = c.split(';')[0]; req.lastSetCookie = c; }
  return res;
}
const csrfFrom = (html) => (html.match(/name="csrf-token" content="([^"]+)"/) || [])[1];
async function login(u, p) {
  const page = await (await req(BASE + '/login')).text();
  const token = (page.match(/name="_csrf" value="([^"]+)"/) || [])[1];
  return req(BASE + '/login', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ _csrf: token, username: u, password: p }) });
}
async function api(p, csrf, body) {
  const res = await req(BASE + p, body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json', 'x-csrf-token': csrf }, body: JSON.stringify(body) });
  return { status: res.status, json: await res.json().catch(() => null) };
}
function correctBody(prob) {
  const inst = C.instance(prob.id, prob.seed);
  if (inst.def.kind === 'mc') return { choice: inst.data.choices.findIndex((c) => c.correct) };
  return { answers: Object.fromEntries(inst.data.answers.map((a) => [a.key, String(+a.value.toPrecision(4))])) };
}

try {
  console.log(`Data dir: ${dataDir}`);
  await start();
  console.log('Routing & login');
  let r = await req('/'); ok(r.status === 302 && r.headers.get('location').endsWith(BASE + '/'), `/ redirects into ${BASE}/`);
  r = await req(BASE); ok(r.status === 301 && r.headers.get('location') === BASE + '/', `${BASE} -> ${BASE}/`);
  r = await req(BASE + '/'); ok(r.status === 302 && r.headers.get('location') === BASE + '/login', 'dashboard requires login');
  r = await req(BASE + '/units/3'); ok(r.status === 302, 'lesson page requires login');
  r = await req(BASE + '/api/progress'); ok(r.status === 401, 'API requires login (401)');
  r = await req(BASE + '/login'); const lp = await r.text();
  ok(r.status === 200 && lp.includes('Log in') && lp.includes(`action="${BASE}/login"`) && lp.includes(`${BASE}/static/css/app.css`), 'login page loads with base-path-aware form action and assets');
  r = await login(USER, 'definitely-wrong'); ok(r.status === 401 && (await r.text()).includes('Incorrect username or password'), 'wrong password is rejected');
  r = await login('nobody', PASS); ok(r.status === 401, 'unknown user is rejected');
  r = await req(BASE + '/'); ok(r.status === 302, 'still logged out after failed logins');
  r = await req(BASE + '/login', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ username: USER, password: PASS }) });
  ok(r.status === 403, 'login without CSRF token is refused');
  r = await login(USER, PASS); ok(r.status === 302 && r.headers.get('location') === BASE + '/', 'login as default user succeeds');
  ok(/Path=\/StaticsForEngineers/i.test(req.lastSetCookie || '') && /HttpOnly/i.test(req.lastSetCookie || ''), 'session cookie scoped to base path, HttpOnly');

  console.log('Pages');
  r = await req(BASE + '/'); ok(r.status === 302 && r.headers.get('location') === BASE + '/assessment', 'first dashboard visit offers the math readiness check');
  r = await req(BASE + '/assessment'); let html = await r.text();
  ok(r.status === 200 && html.includes('Math readiness check') && html.includes('id="assess-start"') && html.includes('Maybe later') && html.includes(`${BASE}/static/js/assess.js`), 'assessment intro page loads');
  r = await req(BASE + '/'); html = await r.text(); const csrf = csrfFrom(html);
  ok(r.status === 200 && html.includes('Your statics dashboard') && html.includes('Recommended next'), 'dashboard loads');
  ok(!/(href|src|action)="\/(?!\/)(?!StaticsForEngineers)/.test(html.replace(/href="https?:[^"]+"/g, '')), 'dashboard has no root-relative links outside the base path');
  for (const u of C.units) {
    r = await req(`${BASE}/units/${u.num}`); html = await r.text();
    ok(r.status === 200 && html.includes(u.title.replace(/&/g, '&amp;')) && html.includes('class="katex"') && html.includes('example'), `unit ${u.num} lesson loads (KaTeX rendered, worked examples)`);
  }
  r = await req(`${BASE}/units/1/practice`); ok(r.status === 200 && (await r.text()).includes('id="player"'), 'unit 1 practice page loads');
  r = await req(`${BASE}/units/2/practice`); ok(r.status === 302, 'unit 2 practice is locked at first');
  for (const p of ['/review', '/quiz', '/settings', '/units']) { r = await req(BASE + p); ok(r.status === 200, `${p} loads`); }
  r = await req(BASE + '/units/99'); ok(r.status === 404, 'unknown unit -> 404');

  console.log('Problem & answer-check API');
  let pr = await api('/api/problem?unit=1'); ok(pr.status === 200 && pr.json.id.startsWith('u1-'), `GET /api/problem?unit=1 -> ${pr.json && pr.json.id}`);
  ok(!JSON.stringify(pr.json).includes('"value"') && !JSON.stringify(pr.json).includes('"correct"'), 'problem payload does not leak answers');
  r = await api('/api/check', 'bad-token', { id: pr.json.id, seed: pr.json.seed, answers: {} }); ok(r.status === 403, 'check without valid CSRF -> 403');
  const wrong = pr.json.kind === 'mc' ? { choice: (C.instance(pr.json.id, pr.json.seed).data.choices.findIndex((c) => c.correct) + 1) % pr.json.choices.length } : { answers: Object.fromEntries(pr.json.fields.map((f) => [f.key, '123456'])) };
  r = await api('/api/check', csrf, { id: pr.json.id, seed: pr.json.seed, mode: 'practice', ...wrong });
  ok(r.status === 200 && r.json.correct === false && r.json.firstAttempt === true && r.json.review === 'queued', 'wrong answer graded incorrect and queued for review');
  ok(typeof r.json.solution === 'string' && r.json.solution.length > 50, 'worked solution returned after attempt');
  r = await api('/api/check', csrf, { id: pr.json.id, seed: pr.json.seed, mode: 'practice', ...correctBody(pr.json) });
  ok(r.json.correct === true && r.json.firstAttempt === false, 'retry on same numbers is correct but not counted');
  // tolerance check (1.5% off should pass, 3% off should fail) on a numeric type
  const np = (await api('/api/problem?id=u1-components')).json;
  const inst = C.instance(np.id, np.seed);
  const off = (f) => ({ answers: Object.fromEntries(inst.data.answers.map((a) => [a.key, String(a.value * f)])) });
  r = await api('/api/check', csrf, { id: np.id, seed: np.seed, ...off(1.015) }); ok(r.json.correct === true, 'answer 1.5% off accepted (tolerance)');
  r = await api('/api/check', csrf, { id: np.id, seed: np.seed, ...off(1.03) }); ok(r.json.correct === false, 'answer 3% off rejected');
  r = await api('/api/review/next'); ok(r.status === 200 && r.json.done === true && r.json.queued >= 1, 'missed item scheduled in review queue (due in 10 min)');

  console.log('Mastery & unlock');
  let unlocked = [];
  for (const p of C.units[0].problems) {
    for (let k = 0; k < 2; k++) {
      const prob = (await api('/api/problem?id=' + p.id)).json;
      const res = await api('/api/check', csrf, { id: prob.id, seed: prob.seed, mode: 'practice', ...correctBody(prob) });
      if (!res.json.correct) console.log('    unexpected wrong for', p.id, JSON.stringify(res.json.results));
      unlocked = unlocked.concat(res.json.newlyUnlocked || []);
    }
  }
  let prog = (await api('/api/progress')).json;
  ok(prog.units[0].mastery >= 0.8 && prog.units[0].mastered, `unit 1 mastery = ${Math.round(prog.units[0].mastery * 100)}%`);
  ok(unlocked.includes(2) && prog.units[1].unlocked, 'unit 2 unlocked after reaching 80%');
  ok(prog.recommended.kind === 'assess', `recommended next before the math check: ${prog.recommended.kind} (${prog.recommended.text})`);
  ok(prog.assessment && prog.assessment.taken === false && Object.keys(prog.skills).length === 10, 'progress reports 10 skills, check not taken');
  ok(prog.streak.current === 1 && prog.streak.activeToday, 'streak = 1 day');
  r = await req(`${BASE}/units/2/practice`); ok(r.status === 200, 'unit 2 practice now opens');

  console.log('Mixed quiz');
  r = await api('/api/quiz/start', csrf, {}); ok(r.status === 200 && r.json.problems.length === 10 && r.json.problems.every((p) => p.unit === 1), 'quiz of 10 drawn from completed unit(s)');
  const qz = r.json;
  for (const [i, p] of qz.problems.entries()) await api('/api/check', csrf, { id: p.id, seed: p.seed, mode: 'quiz', quizId: qz.quizId, ...(i < 7 ? correctBody(p) : { answers: {}, choice: -1 }) });
  r = await api(`/api/quiz/${qz.quizId}/finish`, csrf, {}); ok(r.json.correct === 7 && r.json.total === 10, `quiz scored ${r.json.correct}/${r.json.total}`);
  r = await api('/api/check', csrf, { id: 'u1-weight', seed: 1, mode: 'quiz', quizId: qz.quizId, answers: {} }); ok(r.status === 400, 'cannot submit to a finished quiz');

  console.log('Settings');
  r = await req(BASE + '/settings'); html = await r.text();
  r = await req(BASE + '/settings/password', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ _csrf: csrf, current: 'wrong', next: 'abcdefgh1', confirm: 'abcdefgh1' }) });
  ok(r.status === 400 && (await r.text()).includes('current password is incorrect'), 'password change rejects a wrong current password');

  const before = (await api('/api/progress')).json;
  console.log('Restart, migration of a pre-toolkit database & persistence');
  await stop();
  { // Turn the DB back into the pre-toolkit (live) schema, then let the new server migrate it.
    const Database = require('better-sqlite3');
    const db = new Database(path.join(dataDir, 'statics.db'));
    for (const t of ['assessments', 'skill_status', 'toolkit_views', 'user_prefs']) db.exec(`DROP TABLE IF EXISTS ${t}`);
    db.pragma('user_version = 0'); db.close();
  }
  await start();
  {
    const Database = require('better-sqlite3');
    const db = new Database(path.join(dataDir, 'statics.db'), { readonly: true });
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((x) => x.name);
    ok(['assessments', 'skill_status', 'toolkit_views', 'user_prefs'].every((t) => tables.includes(t)) && db.pragma('user_version', { simple: true }) === 2, 'old-schema DB migrated in place (new tables, user_version 2)');
    db.close();
  }
  r = await req(BASE + '/settings'); ok(r.status === 200, 'session survives server restart (persistent store)');
  const after = (await api('/api/progress')).json;
  ok(after.totals.attempts === before.totals.attempts && after.totals.attempts > 0, `attempt count persisted (${after.totals.attempts})`);
  ok(Math.abs(after.units[0].mastery - before.units[0].mastery) < 1e-9 && after.units[1].unlocked, 'mastery and unlocks persisted');
  ok(after.reviewQueued === before.reviewQueued && after.reviewQueued >= 1, 'review queue persisted');
  r = await req(BASE + '/'); ok(r.status === 302 && r.headers.get('location') === BASE + '/assessment', 'migrated user (prefs table new) is offered the check once');
  r = await req(BASE + '/'); html = await r.text(); ok(r.status === 200 && html.includes('Math readiness') && html.includes('Start the check'), 'dashboard shows the readiness call-to-action');

  console.log('Math readiness assessment');
  const csrf2 = csrfFrom(html);
  r = await api('/api/assess/current'); ok(r.status === 200 && r.json.none === true, 'no open assessment yet');
  r = await api('/api/assess/start', csrf2, {});
  ok(r.status === 200 && r.json.item && r.json.item.index === 0 && r.json.progress.answered === 0, 'assessment started');
  let a = r.json; const aid = a.id;
  ok(!JSON.stringify(a.item).includes('"value"') && !JSON.stringify(a.item).includes('"correct"') && a.item.problem.hints.length === 0, 'assessment item leaks no answers and shows no hints');
  r = await api('/api/assess/answer', csrf2, { id: aid, index: a.item.index + 1, skip: true }); ok(r.status === 409, 'out-of-order answer refused (409)');
  r = await api('/api/assess/answer', 'bad', { id: aid, index: 0, skip: true }); ok(r.status === 403, 'assessment answer needs CSRF');
  r = await api('/api/assess/current'); ok(r.json.id === aid && r.json.item.index === 0, 'assessment can be resumed');
  // Plan: Σ notation -> skip everything (not yet); linear systems -> right, wrong, right (partial); others -> right.
  const plan = { sigma: [0, 0, 0], linsys: [1, 0, 1] }; const seenBy = {}; let steps = 0; const queuedBefore = (await api('/api/progress')).json.reviewQueued;
  while (a && a.item) {
    const it = a.item; const k = (seenBy[it.skill] = (seenBy[it.skill] || 0) + 1) - 1;
    const right = plan[it.skill] ? plan[it.skill][k] === 1 : true;
    const body = { id: aid, index: it.index, ...(right ? correctBody(it.problem) : it.skill === 'sigma' ? { skip: true } : (it.problem.kind === 'mc' ? { choice: (C.instance(it.problem.id, it.problem.seed).data.choices.findIndex((c) => c.correct) + 1) % it.problem.choices.length } : { answers: Object.fromEntries(it.problem.fields.map((f) => [f.key, '99999'])) })) };
    r = await api('/api/assess/answer', csrf2, body); steps++;
    if (r.status !== 200) { ok(false, 'answer accepted: ' + JSON.stringify(r.json)); break; }
    a = r.json.done ? null : r.json;
    if (r.json.done) var final = r.json;
    if (steps > 40) break;
  }
  ok(final && final.done && steps >= 20 && steps <= 30, `adaptive check finished after ${steps} questions`);
  const st = Object.fromEntries((final ? final.results : []).map((x) => [x.key, x.status]));
  ok(st.sigma === 'notyet' && st.linsys === 'partial' && st.trig === 'mastered' && st.cross === 'mastered', `per-skill results stored: sigma=${st.sigma}, linsys=${st.linsys}, trig=${st.trig}`);
  ok(seenBy.sigma === 2 && seenBy.linsys === 3 && seenBy.trig === 2, 'stops after 2 agreeing answers, asks a 3rd on a split');
  prog = (await api('/api/progress')).json;
  ok(prog.reviewQueued === queuedBefore && prog.assessment.taken, 'assessment answers do not flood the review queue');
  r = await req(BASE + '/assessment/results'); html = await r.text();
  ok(r.status === 200 && html.includes('Your results') && html.includes('Suggested order') && html.includes('/toolkit/summation-notation'), 'results page lists gaps with toolkit links');

  console.log('Gating & recommendations');
  ok(prog.recommended.kind === 'skill' && prog.recommended.skill === 'sigma' && prog.recommended.unit === 2 && prog.recommended.lesson === true, `recommended next = toolkit: ${prog.recommended.text}`);
  r = await req(BASE + '/'); html = await r.text();
  ok(html.includes(`href="${BASE}/toolkit/summation-notation"`) && html.includes('skillgrid') && html.includes('Retake the check'), 'dashboard links Recommended next to the toolkit lesson and shows skill chips');
  r = await req(BASE + '/units/2'); html = await r.text();
  ok(html.includes('Before you start') && html.includes('Brush up on') && html.includes(`${BASE}/toolkit/linear-systems`), 'unit 2 page shows the brush-up card (Σ notation, linear systems)');
  ok(html.includes('class="readmath"') && html.includes('data-tip='), 'unit lesson has "Reading the math" boxes and symbol tooltips');
  r = await req(BASE + '/units/1'); html = await r.text(); ok(!html.includes('Before you start'), 'no brush-up card when the unit\'s skills are mastered');
  r = await req(BASE + '/units/2/practice'); html = await r.text(); ok(r.status === 200 && /data-gaps="[^"]*sigma/.test(html), 'unit 2 practice still open (soft gate), player knows the gaps');
  const p2 = (await api('/api/problem?id=u2-two-cables')).json; ok(Array.isArray(p2.needs) && p2.needs.includes('sigma'), 'problem payload lists the math skills it needs');

  console.log('Math toolkit');
  r = await req(BASE + '/toolkit'); html = await r.text(); ok(r.status === 200 && C.toolkit.every((t) => html.includes(`/toolkit/${t.slug}"`)), 'toolkit index lists all 10 skills');
  let allOk = true;
  for (const t of C.toolkit) { r = await req(`${BASE}/toolkit/${t.slug}`); const h = await r.text(); if (!(r.status === 200 && h.includes('class="readmath"') && h.includes('class="katex"') && h.includes('example') && !h.includes('katex-error'))) { allOk = false; console.log('    bad toolkit page', t.slug); } }
  ok(allOk, 'all 10 toolkit lessons load (KaTeX, reading-the-math boxes, worked examples)');
  r = await req(`${BASE}/toolkit/summation-notation/practice`); ok(r.status === 200 && (await r.text()).includes('data-skill="sigma"'), 'toolkit practice page loads in skill mode');
  r = await req(`${BASE}/toolkit/no-such-skill`); ok(r.status === 404, 'unknown toolkit slug -> 404');
  pr = await api('/api/problem?skill=sigma'); ok(pr.status === 200 && pr.json.id.startsWith('m-sig') && pr.json.skill === 'sigma' && pr.json.unit === 0, `GET /api/problem?skill=sigma -> ${pr.json && pr.json.id}`);
  r = await api('/api/problem?skill=nope'); ok(r.status === 404, 'unknown skill -> 404');
  prog = (await api('/api/progress')).json; ok(prog.recommended.kind === 'skill' && prog.recommended.lesson === false, 'after reading the lesson, Recommended next points to toolkit practice');
  let lastSkill = null;
  for (const p of C.toolkitByKey.get('sigma').problems) for (let k = 0; k < 2; k++) {
    const prob = (await api('/api/problem?id=' + p.id)).json;
    const res = await api('/api/check', csrf2, { id: prob.id, seed: prob.seed, mode: 'practice', ...correctBody(prob) });
    if (!res.json.correct) console.log('    unexpected wrong for', p.id);
    lastSkill = res.json;
  }
  ok(lastSkill.skill === 'sigma' && lastSkill.skillMastery >= 0.8 && lastSkill.unitMastery === null, `toolkit practice tracks skill mastery (${Math.round(lastSkill.skillMastery * 100)}%)`);
  r = await api('/api/skills'); const sig = r.json.skills.find((x) => x.key === 'sigma');
  ok(sig.status === 'mastered' && sig.assessed === 'notyet', 'practicing a gap to 80% marks the skill mastered');
  prog = (await api('/api/progress')).json;
  ok(prog.recommended.kind === 'skill' && prog.recommended.skill === 'linsys', `next gap recommended: ${prog.recommended.text}`);
  r = await api('/api/assess/start', csrf2, {}); ok(r.status === 200 && r.json.item.index === 0 && r.json.id !== aid, 'assessment can be retaken');
  r = await req(BASE + '/settings'); ok((await r.text()).includes('Retake the check'), 'settings offers a retake');
  cookie = '';
  r = await login(USER, PASS); ok(r.status === 302, 'fresh login works after restart');
  r = await req(BASE + '/logout', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ _csrf: csrfFrom(await (await req(BASE + '/')).text()) }) });
  ok(r.status === 302, 'logout');
  r = await req(BASE + '/'); ok(r.status === 302, 'logged out after logout');
} catch (e) {
  fail++; console.error(e);
} finally {
  if (server) await stop().catch(() => {});
  fs.rmSync(dataDir, { recursive: true, force: true });
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
