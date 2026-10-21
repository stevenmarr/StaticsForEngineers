'use strict';
const config = require('./config');
const C = require('../content');
const readiness = require('./readiness');

const B = config.basePath;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const url = (p = '/') => B + p;
const pct = (x) => Math.round(x * 100);

const logo = `<svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="6" fill="#111"/><path d="M6 23 L16 9 L26 23 Z M16 9 L16 23 M11 16 L16 23 L21 16" fill="none" stroke="#f6f4ef" stroke-width="1.6" stroke-linejoin="round"/><circle cx="6" cy="23" r="1.6" fill="#f6f4ef"/><circle cx="26" cy="23" r="1.6" fill="#f6f4ef"/><circle cx="16" cy="9" r="1.6" fill="#f6f4ef"/></svg>`;

function layout({ title, body, user, csrf, active = '', scripts = [], reviewDue = 0, bodyClass = '' }) {
  const nav = user ? `
    <nav class="nav" aria-label="Main">
      <a href="${url('/')}" class="${active === 'dash' ? 'on' : ''}">Dashboard</a>
      <a href="${url('/units')}" class="${active === 'units' ? 'on' : ''}">Units</a>
      <a href="${url('/toolkit')}" class="${active === 'toolkit' ? 'on' : ''}">Math toolkit</a>
      <a href="${url('/review')}" class="${active === 'review' ? 'on' : ''}">Review${reviewDue ? ` <span class="badge">${reviewDue}</span>` : ''}</a>
      <a href="${url('/quiz')}" class="${active === 'quiz' ? 'on' : ''}">Quiz</a>
      <a href="${url('/settings')}" class="${active === 'settings' ? 'on' : ''}">Settings</a>
      <form method="post" action="${url('/logout')}" class="inline"><input type="hidden" name="_csrf" value="${esc(csrf)}"><button class="linkbtn" type="submit">Log out</button></form>
    </nav>` : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title ? title + ' · ' : '')}StaticsForEngineers</title>
<meta name="base-path" content="${esc(B)}">
<meta name="csrf-token" content="${esc(csrf || '')}">
<link rel="icon" href="${url('/static/img/favicon.svg')}">
<link rel="stylesheet" href="${url('/static/vendor/montserrat/montserrat.css')}">
<link rel="stylesheet" href="${url('/static/vendor/katex/katex.min.css')}">
<link rel="stylesheet" href="${url('/static/css/app.css')}">
</head>
<body class="${bodyClass}">
<header class="top">
  <a class="brand" href="${url('/')}">${logo}<span class="word"><b>Statics</b>ForEngineers</span></a>
  ${user ? `<button class="menu-btn" type="button" aria-label="Menu" aria-expanded="false">☰</button>` : ''}
  ${nav}
</header>
<main class="wrap">
${body}
</main>
<footer class="foot"><span>StaticsForEngineers</span><span>·</span><a href="https://performance-video.com/">performance-video.com</a></footer>
<script src="${url('/static/js/app.js')}"></script>
${scripts.map((s) => `<script src="${url('/static/js/' + s)}"></script>`).join('\n')}
</body>
</html>`;
}

function loginPage({ csrf, error, username }) {
  return layout({
    title: 'Log in', csrf, bodyClass: 'login-body',
    body: `<section class="login">
      <p class="kicker">Engineering statics · self-paced</p>
      <h1>Build the foundation<br>for mechanical engineering.</h1>
      <p class="deck">Ten units from vectors to moments of inertia, with worked examples, endless practice problems and mastery tracking.</p>
      <form method="post" action="${url('/login')}" class="card form" autocomplete="on">
        <input type="hidden" name="_csrf" value="${esc(csrf)}">
        ${error ? `<p class="flash err" role="alert">${esc(error)}</p>` : ''}
        <label>Username <input name="username" autocomplete="username" required value="${esc(username || '')}" autofocus></label>
        <label>Password <input name="password" type="password" autocomplete="current-password" required></label>
        <button class="btn primary" type="submit">Log in</button>
      </form>
    </section>`,
  });
}

function bar(x, label) {
  return `<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct(x)}" aria-label="${esc(label || 'mastery')}"><span style="width:${Math.min(100, pct(x))}%"></span><i class="thr" style="left:${pct(config.masteryThreshold)}%"></i></div>`;
}

function unitCard(u, s) {
  const st = s.units[u.num - 1];
  const status = !st.unlocked ? '<span class="tag lock">Locked</span>' : st.mastered ? '<span class="tag ok">Mastered</span>' : st.attempted ? '<span class="tag">In progress</span>' : '<span class="tag new">New</span>';
  return `<article class="unit ${st.unlocked ? '' : 'locked'}">
    <div class="unit-head"><span class="num">${String(u.num).padStart(2, '0')}</span>${status}</div>
    <h3>${esc(u.title)}</h3>
    <p class="muted">${esc(u.blurb)}</p>
    ${bar(st.mastery, 'Unit ' + u.num + ' mastery')}
    <p class="small muted">${pct(st.mastery)}% mastery · ${st.attempted}/${st.total} problem types tried${st.lessonViewed ? ' · lesson read' : ''}</p>
    ${s.skills && st.unlocked && !st.mastered && gapsFor(u.num, s).length ? `<p class="small brush">Brush up first: ${gapsFor(u.num, s).map((g) => `<a href="${url('/toolkit/' + g.slug)}">${esc(g.short)}</a>`).join(', ')}</p>` : ''}
    <div class="row">
      <a class="btn ghost" href="${url('/units/' + u.num)}">Lesson</a>
      ${st.unlocked ? `<a class="btn" href="${url('/units/' + u.num + '/practice')}">Practice</a>` : `<span class="small muted">Reach ${pct(config.masteryThreshold)}% in Unit ${u.num - 1} to unlock practice</span>`}
    </div>
  </article>`;
}

// ---------- math readiness helpers ----------
function chip(st) { return `<span class="chip ${st.status}">${esc(st.label)}</span>`; }
function gapsFor(unitNum, s) { return readiness.unitGaps(unitNum, s.skills); }
function brushUpCard(unitNum, s, compact = false) {
  const gaps = gapsFor(unitNum, s);
  if (!s.assessment.taken && !compact) {
    const needs = (C.skills.unitSkills[unitNum] || []).map((k) => s.skills[k]);
    return `<div class="card brushup info"><p class="kicker">Math this unit uses</p><p>${needs.map((n) => `<a href="${url('/toolkit/' + n.slug)}">${esc(n.short)}</a>`).join(' · ')}</p><p class="small muted">Not sure you're solid on these? The <a href="${url('/assessment')}">math readiness check</a> takes about 15 minutes and points you to exactly what to review.</p></div>`;
  }
  if (!gaps.length) return '';
  const items = gaps.map((g) => `<li><a href="${url('/toolkit/' + g.slug)}">${esc(g.title)}</a> ${chip(g)}</li>`).join('');
  return `<div class="card brushup"><p class="kicker">Before you start</p><p class="big">Brush up on ${esc(gaps.map((g) => g.short).join(', ').replace(/, ([^,]*)$/, ' and $1'))}</p>
    ${compact ? '' : `<p class="muted">Unit ${unitNum} leans on ${gaps.length === 1 ? 'this skill' : 'these skills'}, and your math check showed ${gaps.length === 1 ? 'it isn\'t' : 'they aren\'t'} solid yet. Each toolkit lesson takes 10–20 minutes. You can also keep going here; this is a suggestion, not a lock.</p>`}
    <ul class="gaplist">${items}</ul></div>`;
}
function gapData(s) {
  const out = {};
  for (const st of Object.values(s.skills)) if (st.status === 'notyet' || st.status === 'partial') out[st.key] = { slug: st.slug, short: st.short, label: st.label };
  return esc(JSON.stringify(out));
}
function readinessSection(s) {
  if (!s.assessment.taken) {
    return `<section class="card readiness cta"><div><p class="kicker">Math readiness</p><p class="big">${s.assessment.open ? 'You have a math check in progress.' : 'Check your math before the hard parts.'}</p><p class="muted">A short placement check on the 10 math skills statics uses (trig, vectors, Σ notation, linear systems, dot and cross products, integrals as sums…). It takes about 15 minutes. Skills you already know are marked done; gaps get a short toolkit lesson.</p></div><a class="btn primary" href="${url('/assessment')}">${s.assessment.open ? 'Resume' : 'Start the check'}</a></section>`;
  }
  const list = Object.values(s.skills).sort((a, b) => a.num - b.num);
  const done = list.filter((x) => x.status === 'mastered').length;
  return `<section><h2 class="section-title">Math readiness</h2><p class="muted">${done} of ${list.length} skills ready. Tap a skill to open its toolkit lesson. Practicing a skill to ${pct(0.8)}% marks it mastered. <a href="${url('/assessment')}">Retake the check</a></p>
    <div class="skillgrid">${list.map((x) => `<a class="skill ${x.status}" href="${url('/toolkit/' + x.slug)}"><span class="sname">${esc(x.short)}</span>${chip(x)}</a>`).join('')}</div></section>`;
}

function dashboard({ user, csrf, s }) {
  const rec = s.recommended;
  const recHref = rec.kind === 'review' ? url('/review') : rec.kind === 'quiz' ? url('/quiz') : rec.kind === 'assess' ? url('/assessment') : rec.kind === 'skill' ? url(`/toolkit/${rec.slug}${rec.lesson ? '' : '/practice'}`) : url(`/units/${rec.unit}${rec.lesson ? '' : '/practice'}`);
  const mastered = s.units.filter((u) => u.mastered).length;
  const overall = s.units.reduce((a, u) => a + u.mastery, 0) / s.units.length;
  const acc = s.totals.attempts ? Math.round((100 * s.totals.correct) / s.totals.attempts) : 0;
  const next = s.nextReviewAt && !s.reviewDue ? `next item ${new Date(s.nextReviewAt).toLocaleString('en-US', { timeZone: config.timeZone, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : '';
  return layout({
    title: 'Dashboard', user, csrf, active: 'dash', reviewDue: s.reviewDue,
    body: `<section class="hero">
      <p class="kicker">Welcome back, ${esc(user.username)}</p>
      <h1>Your statics dashboard</h1>
      <div class="card next">
        <div><p class="kicker">Recommended next</p><p class="big">${esc(rec.text)}</p></div>
        <a class="btn primary" href="${recHref}">Go</a>
      </div>
    </section>
    <section class="stats">
      <div class="stat"><span class="v">${s.streak.current}</span><span class="l">day streak${s.streak.activeToday ? ' ✓ today' : ''}</span></div>
      <div class="stat"><span class="v">${mastered}<small>/10</small></span><span class="l">units mastered</span></div>
      <div class="stat"><span class="v">${pct(overall)}%</span><span class="l">overall mastery</span></div>
      <div class="stat"><span class="v">${s.totals.attempts}</span><span class="l">problems solved · ${acc}% first-try</span></div>
      <a class="stat link" href="${url('/review')}"><span class="v">${s.reviewDue}</span><span class="l">review due${s.reviewQueued ? ` · ${s.reviewQueued} queued` : ''}${next ? ' · ' + esc(next) : ''}</span></a>
    </section>
    ${readinessSection(s)}
    <section>
      <h2 class="section-title">Curriculum</h2>
      <p class="muted">Each unit unlocks when the one before it reaches ${pct(config.masteryThreshold)}% mastery. Mastery comes from first-try answers on every problem type in the unit; you need two good results per type for full credit.</p>
      <div class="grid">${C.units.map((u) => unitCard(u, s)).join('')}</div>
    </section>`,
  });
}

function unitsIndex({ user, csrf, s }) {
  return layout({ title: 'Units', user, csrf, active: 'units', reviewDue: s.reviewDue, body: `<h1>Units</h1><div class="grid">${C.units.map((u) => unitCard(u, s)).join('')}</div>` });
}

function typeList(u, s, linkPractice) {
  return `<ul class="types">${u.problems.map((p) => {
    const t = s.typeScores[p.id];
    const sc = t ? t.score : 0;
    const cls = !t ? '' : sc >= 0.8 ? 'good' : t.last === 0 ? 'bad' : 'mid';
    const inner = `<span class="dot ${cls}"></span><span class="tname">${esc(p.title)}</span><span class="tpct">${t ? pct(sc) + '%' : ''}</span>`;
    return `<li data-type="${esc(p.id)}">${linkPractice ? `<a href="${url(`/units/${u.num}/practice?type=${encodeURIComponent(p.id)}`)}" data-type="${esc(p.id)}">${inner}</a>` : inner}</li>`;
  }).join('')}</ul>`;
}

function lessonPage({ user, csrf, s, unit }) {
  const st = s.units[unit.num - 1];
  const prev = unit.num > 1 ? `<a class="btn ghost" href="${url('/units/' + (unit.num - 1))}">← Unit ${unit.num - 1}</a>` : '<span></span>';
  const next = unit.num < 10 ? `<a class="btn ghost" href="${url('/units/' + (unit.num + 1))}">Unit ${unit.num + 1} →</a>` : '<span></span>';
  return layout({
    title: `Unit ${unit.num}: ${unit.title}`, user, csrf, active: 'units', reviewDue: s.reviewDue,
    body: `<div class="lesson-layout">
      <article class="lesson">
        <p class="kicker">Unit ${unit.num} · Lesson</p>
        <h1>${esc(unit.title)}</h1>
        ${brushUpCard(unit.num, s)}
        <div class="prose">${C.lessonHtml(unit.num)}</div>
        <div class="card cta">
          <div><p class="kicker">Ready?</p><p class="big">Practice ${unit.problems.length} problem types with fresh numbers every time.</p></div>
          ${st.unlocked ? `<a class="btn primary" href="${url('/units/' + unit.num + '/practice')}">Start practice</a>` : `<p class="muted">Practice unlocks at ${pct(config.masteryThreshold)}% mastery in Unit ${unit.num - 1}. (You can turn on "unlock all units" in Settings.)</p>`}
        </div>
        <div class="row between">${prev}${next}</div>
      </article>
      <aside class="side">
        <div class="card">
          <p class="kicker">Your mastery</p>
          ${bar(st.mastery)}
          <p class="small muted">${pct(st.mastery)}%: ${st.mastered ? 'mastered!' : `reach ${pct(config.masteryThreshold)}% to unlock the next unit`}</p>
          <p class="kicker" style="margin-top:18px">Problem types</p>
          ${typeList(unit, s, st.unlocked)}
        </div>
        ${mathUsed(unit.num, s)}
      </aside>
    </div>`,
  });
}

function mathUsed(unitNum, s) {
  const needs = (C.skills.unitSkills[unitNum] || []).map((k) => s.skills[k]);
  return `<div class="card"><p class="kicker">Math this unit uses</p><ul class="types">${needs.map((n) => `<li><a href="${url('/toolkit/' + n.slug)}"><span class="dot ${n.status === 'mastered' ? 'good' : n.status === 'unknown' ? '' : n.status === 'partial' ? 'mid' : 'bad'}"></span><span class="tname">${esc(n.short)}</span><span class="tpct">${esc(n.label)}</span></a></li>`).join('')}</ul></div>`;
}

function playerShell(extra = '') {
  return `<div id="player" class="player card" ${extra} aria-live="polite"><p class="muted">Loading problem…</p></div>`;
}

function practicePage({ user, csrf, s, unit, type }) {
  const st = s.units[unit.num - 1];
  return layout({
    title: `Practice · Unit ${unit.num}`, user, csrf, active: 'units', reviewDue: s.reviewDue, scripts: ['player.js'],
    body: `<div class="lesson-layout">
      <section>
        <p class="kicker">Unit ${unit.num} · Practice</p>
        <h1>${esc(unit.title)}</h1>
        ${s.assessment.taken ? brushUpCard(unit.num, s, true) : ''}
        ${playerShell(`data-mode="practice" data-unit="${unit.num}" data-type="${esc(type || '')}" data-gaps="${gapData(s)}"`)}
        <p class="small muted">Answers are checked to within about 2%, so round to 3–4 significant figures. Use the sign conventions stated in each problem. Only your first try on each set of numbers counts toward mastery; hints reduce the credit slightly.</p>
      </section>
      <aside class="side">
        <div class="card">
          <p class="kicker">Unit mastery</p>
          <div id="unit-mastery">${bar(st.mastery)}<p class="small muted"><span id="mastery-pct">${pct(st.mastery)}</span>% · goal ${pct(config.masteryThreshold)}%</p></div>
          <p class="kicker" style="margin-top:18px">Pick a problem type</p>
          ${typeList(unit, s, true)}
          <p class="small"><a href="${url('/units/' + unit.num)}">← Back to the lesson</a></p>
        </div>
      </aside>
    </div>`,
  });
}

function reviewPage({ user, csrf, s }) {
  return layout({
    title: 'Review', user, csrf, active: 'review', reviewDue: s.reviewDue, scripts: ['player.js'],
    body: `<p class="kicker">Spaced review</p><h1>Review queue</h1>
      <p class="muted">Problem types you missed come back here with new numbers: after 10 minutes, then after 1, 3 and 7 days as you keep getting them right. Four correct reviews in a row and an item graduates.</p>
      ${playerShell(`data-mode="review" data-gaps="${gapData(s)}"`)}`,
  });
}

function quizPage({ user, csrf, s }) {
  const done = s.units.filter((u) => u.mastered).map((u) => u.unit);
  return layout({
    title: 'Mixed quiz', user, csrf, active: 'quiz', reviewDue: s.reviewDue, scripts: ['player.js'],
    body: `<p class="kicker">Mixed review</p><h1>Mixed-review quiz</h1>
      <p class="muted">Ten problems drawn at random from your completed (mastered) units${done.length ? `: Units ${done.join(', ')}` : ''}. No hints. Each answer is graded on the spot and shows the worked solution.</p>
      ${playerShell('data-mode="quiz"')}`,
  });
}

function settingsPage({ user, csrf, s, msg, err }) {
  return layout({
    title: 'Settings', user, csrf, active: 'settings', reviewDue: s.reviewDue,
    body: `<h1>Settings</h1>
      ${msg ? `<p class="flash ok" role="status">${esc(msg)}</p>` : ''}${err ? `<p class="flash err" role="alert">${esc(err)}</p>` : ''}
      <div class="grid two">
        <form class="card form" method="post" action="${url('/settings/password')}">
          <h2>Change password</h2>
          <input type="hidden" name="_csrf" value="${esc(csrf)}">
          <label>Current password <input type="password" name="current" autocomplete="current-password" required></label>
          <label>New password <input type="password" name="next" autocomplete="new-password" minlength="8" required></label>
          <label>Confirm new password <input type="password" name="confirm" autocomplete="new-password" minlength="8" required></label>
          <button class="btn primary" type="submit">Update password</button>
        </form>
        <form class="card form" method="post" action="${url('/settings/unlock')}">
          <h2>Unit unlocking</h2>
          <input type="hidden" name="_csrf" value="${esc(csrf)}">
          <p class="muted">Normally each unit unlocks once the previous one reaches ${pct(config.masteryThreshold)}% mastery. Turn this on to open every unit right away (for example, to jump ahead to a topic from class).</p>
          <label class="check"><input type="checkbox" name="unlock_all" value="1" ${user.unlock_all ? 'checked' : ''}> Unlock all units</label>
          <button class="btn" type="submit">Save</button>
        </form>
        <div class="card form">
          <h2>Math readiness check</h2>
          <p class="muted">${s.assessment.taken ? `Taken ${s.assessment.count} time${s.assessment.count === 1 ? '' : 's'}. Retake it any time; the newest result replaces the old one (skills you've practiced to mastery stay mastered).` : 'You haven\'t taken it yet. It takes about 15 minutes and tailors the recommendations to you.'}</p>
          <a class="btn" href="${url('/assessment')}">${s.assessment.taken ? 'Retake the check' : 'Take the check'}</a>
        </div>
      </div>
      <p class="small muted">Signed in as <strong>${esc(user.username)}</strong>.</p>`,
  });
}

// ---------- math toolkit ----------
function skillCard(t, s) {
  const st = s.skills[t.key];
  return `<article class="unit skillcard">
    <div class="unit-head"><span class="num">M${t.num}</span>${chip(st)}</div>
    <h3>${esc(t.title)}</h3>
    <p class="muted">${esc(t.blurb)}</p>
    ${bar(st.practice, t.short + ' practice mastery')}
    <p class="small muted">${pct(st.practice)}% practice mastery · ${st.attempted}/${st.total} problem types tried${st.assessTotal ? ` · check: ${st.assessCorrect}/${st.assessTotal}` : ''}</p>
    <p class="small muted">Used in: ${Object.entries(C.skills.unitSkills).filter(([, ks]) => ks.includes(t.key)).map(([n]) => `<a href="${url('/units/' + n)}">Unit ${n}</a>`).join(', ')}</p>
    <div class="row"><a class="btn ghost" href="${url('/toolkit/' + t.slug)}">Lesson</a><a class="btn" href="${url('/toolkit/' + t.slug + '/practice')}">Practice</a></div>
  </article>`;
}
function toolkitIndex({ user, csrf, s }) {
  return layout({
    title: 'Math toolkit', user, csrf, active: 'toolkit', reviewDue: s.reviewDue,
    body: `<p class="kicker">Prerequisites</p><h1>Math toolkit</h1>
      <p class="muted lead-in">Short lessons on the math statics is built from, written for a strong Algebra II student (no calculus assumed). Every symbol is explained and read aloud, and each lesson has practice problems with fresh numbers, hints and full solutions. ${s.assessment.taken ? `<a href="${url('/assessment/results')}">See your check results</a> · <a href="${url('/assessment')}">Retake</a>` : `<a href="${url('/assessment')}">Take the readiness check</a> to see which ones you need.`}</p>
      <div class="grid">${C.toolkit.map((t) => skillCard(t, s)).join('')}</div>`,
  });
}
function toolkitTypeList(t, s) {
  return `<ul class="types">${t.problems.map((p) => {
    const ts = s.typeScores[p.id]; const sc = ts ? ts.score : 0;
    const cls = !ts ? '' : sc >= 0.8 ? 'good' : ts.last === 0 ? 'bad' : 'mid';
    return `<li data-type="${esc(p.id)}"><a href="${url(`/toolkit/${t.slug}/practice?type=${encodeURIComponent(p.id)}`)}" data-type="${esc(p.id)}"><span class="dot ${cls}"></span><span class="tname">${esc(p.title)}</span><span class="tpct">${ts ? pct(sc) + '%' : ''}</span></a></li>`;
  }).join('')}</ul>`;
}
function toolkitSide(t, s, live) {
  const st = s.skills[t.key];
  return `<aside class="side"><div class="card">
    <p class="kicker">Skill status</p><p>${chip(st)}</p>
    <div ${live ? 'id="unit-mastery"' : ''}>${bar(st.practice)}<p class="small muted"><span ${live ? 'id="mastery-pct"' : ''}>${pct(st.practice)}</span>% practice mastery · ${pct(0.8)}% marks it mastered</p></div>
    <p class="kicker" style="margin-top:18px">Practice problem types</p>
    ${toolkitTypeList(t, s)}
    <p class="small">Used in ${Object.entries(C.skills.unitSkills).filter(([, ks]) => ks.includes(t.key)).map(([n]) => `<a href="${url('/units/' + n)}">Unit ${n}</a>`).join(', ')}</p>
    <p class="small"><a href="${url('/toolkit')}">← All toolkit lessons</a></p>
  </div></aside>`;
}
function toolkitLessonPage({ user, csrf, s, t }) {
  const i = C.toolkit.indexOf(t);
  const prev = i > 0 ? `<a class="btn ghost" href="${url('/toolkit/' + C.toolkit[i - 1].slug)}">← ${esc(C.toolkit[i - 1].short)}</a>` : '<span></span>';
  const next = i < C.toolkit.length - 1 ? `<a class="btn ghost" href="${url('/toolkit/' + C.toolkit[i + 1].slug)}">${esc(C.toolkit[i + 1].short)} →</a>` : '<span></span>';
  return layout({
    title: `Math toolkit: ${t.short}`, user, csrf, active: 'toolkit', reviewDue: s.reviewDue,
    body: `<div class="lesson-layout">
      <article class="lesson">
        <p class="kicker">Math toolkit · M${t.num}</p>
        <h1>${esc(t.title)}</h1>
        <div class="prose">${C.toolkitLessonHtml(t.key)}</div>
        <div class="card cta"><div><p class="kicker">Try it</p><p class="big">${t.problems.length} practice problem types with new numbers every time.</p></div><a class="btn primary" href="${url('/toolkit/' + t.slug + '/practice')}">Practice ${esc(t.short)}</a></div>
        <div class="row between">${prev}${next}</div>
      </article>
      ${toolkitSide(t, s, false)}
    </div>`,
  });
}
function toolkitPracticePage({ user, csrf, s, t, type }) {
  return layout({
    title: `Practice · ${t.short}`, user, csrf, active: 'toolkit', reviewDue: s.reviewDue, scripts: ['player.js'],
    body: `<div class="lesson-layout">
      <section>
        <p class="kicker">Math toolkit · Practice</p>
        <h1>${esc(t.title)}</h1>
        ${playerShell(`data-mode="practice" data-skill="${esc(t.key)}" data-type="${esc(type || '')}"`)}
        <p class="small muted">Answers are checked to within about 2% (angles to within half a degree). Missed problem types join your review queue, just like the statics units. <a href="${url('/toolkit/' + t.slug)}">Re-read the lesson</a></p>
      </section>
      ${toolkitSide(t, s, true)}
    </div>`,
  });
}

// ---------- readiness assessment ----------
function resultsTable(results) {
  return `<div class="skillgrid results">${results.map((x) => `<a class="skill ${x.status}" href="${url('/toolkit/' + x.slug)}"><span class="sname">${esc(x.short)}</span>${chip(x)}<span class="small muted">${x.assessTotal ? `${x.assessCorrect}/${x.assessTotal} on the check` : 'not on the check yet'}${x.status !== x.assessed && x.assessed !== 'unknown' ? ' · raised by practice' : ''}</span></a>`).join('')}</div>`;
}
function assessmentPage({ user, csrf, s, results }) {
  const info = s.assessment;
  return layout({
    title: 'Math readiness check', user, csrf, active: 'dash', reviewDue: s.reviewDue, scripts: ['assess.js'],
    body: `<p class="kicker">Placement · about 15 minutes</p><h1>Math readiness check</h1>
      <div id="assess" class="assess" data-open="${info.open ? 1 : 0}">
        <div class="card intro">
          <p class="big">Statics is built on ten math skills. This check finds out which ones you already have, so the course can skip what you know and teach what you don't.</p>
          <ul class="muted">
            <li>Two or three short questions per skill: right-triangle trig, inverse trig and quadrants, the laws of sines and cosines, vectors, Σ notation, linear systems, the dot product, the cross product and determinants, sign conventions, and integrals as sums.</li>
            <li>It assumes solid Algebra II and <strong>no calculus</strong>. Some questions cover things you may not have seen yet. That's the point: press <em>"I haven't learned this yet"</em> and move on. Nothing here affects your statics mastery.</li>
            <li>A calculator is fine (degree mode). There are no hints, and answers are checked to about 2%.</li>
            <li>When two questions in a skill agree, the check moves on, so it adapts and stays short.</li>
          </ul>
          <div class="row">
            <button class="btn primary" type="button" id="assess-start">${info.open ? 'Resume where I left off' : info.taken ? 'Retake the check' : 'Start the check'}</button>
            ${info.open ? '<button class="btn ghost" type="button" id="assess-restart">Start over</button>' : ''}
            ${!info.taken ? `<form method="post" action="${url('/assessment/later')}" class="inline"><input type="hidden" name="_csrf" value="${esc(csrf)}"><button class="btn ghost" type="submit">Maybe later</button></form>` : ''}
          </div>
        </div>
        ${info.taken ? `<h2 class="section-title">Your latest results</h2>${resultsTable(results)}` : ''}
      </div>`,
  });
}
function assessmentResultsPage({ user, csrf, s, results }) {
  const gaps = results.filter((x) => x.status === 'notyet' || x.status === 'partial');
  const firstUnit = (k) => Object.entries(C.skills.unitSkills).find(([, ks]) => ks.includes(k));
  return layout({
    title: 'Math check results', user, csrf, active: 'dash', reviewDue: s.reviewDue,
    body: `<p class="kicker">Math readiness check</p><h1>Your results</h1>
      ${!s.assessment.taken ? `<p class="muted">You haven't finished a check yet. <a href="${url('/assessment')}">Take it now</a>.</p>` : `
      <p class="muted lead-in">${results.length - gaps.length} of ${results.length} skills are ready. ${gaps.length ? 'For the rest, there is a short toolkit lesson. The dashboard will point you to each one just before the unit that needs it, so you do not have to do them all now.' : 'Great work, you are ready for every unit.'}</p>
      ${resultsTable(results)}
      ${gaps.length ? `<div class="card"><p class="kicker">Suggested order</p><ol class="steps">${gaps.sort((a, b) => Number(firstUnit(a.key)[0]) - Number(firstUnit(b.key)[0])).map((g) => `<li><a href="${url('/toolkit/' + g.slug)}">${esc(g.title)}</a> ${chip(g)} <span class="small muted">first needed in Unit ${firstUnit(g.key)[0]}</span></li>`).join('')}</ol></div>` : ''}
      <div class="row"><a class="btn primary" href="${url('/')}">Go to the dashboard</a><a class="btn ghost" href="${url('/toolkit')}">Math toolkit</a></div>`}`,
  });
}

function errorPage({ user, csrf, status, message }) {
  return layout({ title: 'Error', user, csrf, body: `<h1>${status}</h1><p class="muted">${esc(message)}</p><p><a class="btn" href="${url('/')}">Back to the dashboard</a></p>` });
}

module.exports = { layout, loginPage, dashboard, unitsIndex, lessonPage, practicePage, reviewPage, quizPage, settingsPage, errorPage, toolkitIndex, toolkitLessonPage, toolkitPracticePage, assessmentPage, assessmentResultsPage, esc, url };
