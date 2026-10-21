'use strict';
// Problem player used by the practice, review and quiz pages.
(function () {
  const root = document.getElementById('player');
  if (!root) return;
  const mode = root.dataset.mode;
  const unit = parseInt(root.dataset.unit || '0', 10);
  const skill = root.dataset.skill || '';
  let gaps = {}; try { gaps = JSON.parse(root.dataset.gaps || '{}'); } catch (e) { gaps = {}; }
  let pinnedType = root.dataset.type || '';
  let current = null; // { problem, hintsShown, attempted, solved, solution }
  let quiz = null;    // { id, problems, i, correct }

  const h = (tag, attrs = {}, html = '') => { const el = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') el.className = v; else el.setAttribute(k, v); } if (html) el.innerHTML = html; return el; };
  const pct = (x) => Math.round(x * 100);

  function setMastery(m) {
    const box = document.getElementById('unit-mastery');
    if (!box) return;
    const bar = box.querySelector('.bar span');
    if (bar) bar.style.width = Math.min(100, pct(m)) + '%';
    const p = document.getElementById('mastery-pct');
    if (p) p.textContent = pct(m);
  }
  function markType(id, ok, score) {
    document.querySelectorAll(`.types li[data-type="${CSS.escape(id)}"]`).forEach((li) => {
      const d = li.querySelector('.dot');
      if (d) { d.classList.remove('good', 'bad', 'mid'); d.classList.add(typeof score === 'number' && score >= 0.8 ? 'good' : ok ? 'mid' : 'bad'); }
      const t = li.querySelector('.tpct');
      if (t && typeof score === 'number') t.textContent = Math.round(score * 100) + '%';
    });
  }
  function highlightType(id) {
    document.querySelectorAll('.types li').forEach((li) => li.classList.toggle('current', li.dataset.type === id));
  }

  function render(problem, opts = {}) {
    current = { problem, hintsShown: 0, attempted: false, solved: false, solution: '' };
    highlightType(problem.id);
    root.innerHTML = '';
    const head = h('div', { class: 'p-head' });
    const where = problem.skill ? 'Math toolkit · ' + problem.skillTitle : 'Unit ' + problem.unit;
    head.appendChild(h('p', { class: 'kicker' }, `${opts.kicker || where} · ${problem.kind === 'mc' ? 'Concept check' : 'Numeric'}`));
    head.appendChild(h('h2', {}, problem.title));
    root.appendChild(head);
    // Adaptive nudge: this problem type relies on a math skill the readiness check flagged.
    const flagged = (problem.needs || []).filter((k) => gaps[k]);
    if (flagged.length && mode !== 'quiz') {
      root.appendChild(h('p', { class: 'p-needs small' }, 'Uses ' + flagged.map((k) => `<a href="${SFE.url('/toolkit/' + gaps[k].slug)}">${gaps[k].short}</a>`).join(' and ') + '. Your math check marked ' + (flagged.length > 1 ? 'these' : 'this') + ' “' + gaps[flagged[0]].label.toLowerCase() + '”, so a quick toolkit refresher may help.'));
    }
    root.appendChild(h('div', { class: 'p-prompt' }, problem.prompt));
    if (problem.svg) root.appendChild(h('div', { class: 'p-figure' }, problem.svg));

    const form = h('form', { class: 'p-form', novalidate: '' });
    if (problem.kind === 'mc') {
      const list = h('div', { class: 'choices', role: 'radiogroup' });
      problem.choices.forEach((c) => {
        const lab = h('label', { class: 'choice' });
        const inp = h('input', { type: 'radio', name: 'choice', value: String(c.i) });
        lab.appendChild(inp); lab.appendChild(h('span', {}, c.html));
        list.appendChild(lab);
      });
      form.appendChild(list);
    } else {
      const grid = h('div', { class: 'fields' });
      problem.fields.forEach((f) => {
        const row = h('label', { class: 'field', 'data-key': f.key });
        row.appendChild(h('span', { class: 'flabel' }, f.label + ' ='));
        row.appendChild(h('input', { type: 'text', inputmode: 'decimal', name: f.key, autocomplete: 'off', spellcheck: 'false', 'aria-label': f.key }));
        row.appendChild(h('span', { class: 'funit' }, f.unit || ''));
        row.appendChild(h('span', { class: 'fmark', 'aria-hidden': 'true' }));
        grid.appendChild(row);
      });
      form.appendChild(grid);
    }
    const actions = h('div', { class: 'p-actions' });
    actions.appendChild(h('button', { class: 'btn primary', type: 'submit' }, 'Check answer'));
    if (mode !== 'quiz' && problem.hints.length) actions.appendChild(h('button', { class: 'btn ghost', type: 'button', 'data-act': 'hint' }, `Hint (${problem.hints.length})`));
    actions.appendChild(h('button', { class: 'btn ghost', type: 'button', 'data-act': 'solution', disabled: '' }, 'Show worked solution'));
    actions.appendChild(h('button', { class: 'btn', type: 'button', 'data-act': 'next' }, mode === 'quiz' ? 'Next question →' : mode === 'review' ? 'Next review →' : 'New problem →'));
    form.appendChild(actions);
    form.appendChild(h('div', { class: 'p-feedback', role: 'status' }));
    form.appendChild(h('div', { class: 'p-hints' }));
    form.appendChild(h('div', { class: 'p-solution', hidden: '' }));
    root.appendChild(form);
    if (mode === 'practice') {
      const more = h('p', { class: 'small muted p-more' }, `<a href="#" data-act="same">New numbers, same type</a>`);
      root.appendChild(more);
    }
    form.addEventListener('submit', (e) => { e.preventDefault(); submit(form); });
    root.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); act(b.dataset.act, form); }));
    const first = form.querySelector('input'); if (first && !opts.noFocus) first.focus({ preventScroll: true });
  }

  function feedback(form, cls, html) { const fb = form.querySelector('.p-feedback'); fb.className = 'p-feedback ' + cls; fb.innerHTML = html; }

  async function submit(form) {
    const p = current.problem;
    const body = { id: p.id, seed: p.seed, hints: current.hintsShown, mode };
    if (quiz) body.quizId = quiz.id;
    if (p.kind === 'mc') {
      const sel = form.querySelector('input[name="choice"]:checked');
      if (!sel) return feedback(form, 'warn', 'Pick an answer first.');
      body.choice = parseInt(sel.value, 10);
    } else {
      body.answers = {};
      let empty = false;
      p.fields.forEach((f) => { const v = form.querySelector(`input[name="${CSS.escape(f.key)}"]`).value.trim(); if (!v) empty = true; body.answers[f.key] = v; });
      if (empty) return feedback(form, 'warn', 'Fill in every answer box. Use a minus sign where the convention calls for it.');
    }
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const r = await SFE.api('/api/check', { method: 'POST', body });
      current.attempted = true;
      current.solution = r.solution;
      form.querySelector('[data-act="solution"]').disabled = false;
      if (p.kind === 'mc') {
        form.querySelectorAll('.choice').forEach((lab) => {
          const v = parseInt(lab.querySelector('input').value, 10);
          lab.classList.toggle('right', r.correct && v === body.choice);
          lab.classList.toggle('wrong', !r.correct && v === body.choice);
        });
      } else {
        r.results.forEach((res) => {
          const row = form.querySelector(`.field[data-key="${CSS.escape(res.key)}"]`);
          if (!row) return;
          row.classList.toggle('right', res.ok); row.classList.toggle('wrong', !res.ok);
          row.querySelector('.fmark').textContent = res.ok ? '✓' : res.parsed === null ? '?' : '✗';
        });
      }
      let msg;
      if (r.correct) {
        current.solved = true;
        msg = `<strong>Correct!</strong> ${r.firstAttempt ? (r.scoreAwarded < 1 ? `Counted at ${pct(r.scoreAwarded)}% credit (hints used).` : 'Full credit.') : '(Retry, so it isn\'t counted toward mastery.)'}`;
        if (r.review === 'advanced') msg += ' This review item moves to a longer interval.';
        if (r.review === 'graduated') msg += ' 🎓 This item graduated from your review queue.';
        showSolution(form, true);
      } else {
        msg = `<strong>Not quite.</strong> ${r.results.some((x) => x.parsed === null) ? 'One entry isn\'t a number I can read (use digits, a decimal point and an optional minus sign). ' : ''}${mode === 'quiz' ? 'Check the worked solution below.' : 'Check your signs and units, try a hint, or open the worked solution.'}`;
        if (r.firstAttempt && r.review === 'queued') msg += ' This problem type has been added to your review queue.';
        if (mode === 'quiz') showSolution(form, true);
        if (p.kind === 'mc' && mode === 'quiz') form.querySelectorAll('.choice').forEach((lab) => { if (parseInt(lab.querySelector('input').value, 10) === r.correctChoice) lab.classList.add('right'); });
      }
      if (r.newlyUnlocked && r.newlyUnlocked.length) msg += `<div class="unlock">🔓 Unit ${r.newlyUnlocked.join(', ')} unlocked! <a href="${SFE.url('/units/' + r.newlyUnlocked[0])}">Go to the lesson →</a></div>`;
      feedback(form, r.correct ? 'ok' : 'err', msg);
      if (mode === 'practice' && !skill && r.unit === unit) { setMastery(r.unitMastery); if (r.firstAttempt) markType(p.id, r.correct, r.typeScore); }
      if (mode === 'practice' && skill && r.skill === skill) { setMastery(r.skillMastery); if (r.firstAttempt) markType(p.id, r.correct, r.typeScore); }
      if (quiz && r.firstAttempt) { quiz.answered++; if (r.correct) quiz.correct++; updateQuizBar(); }
      if (quiz) { form.querySelector('button[type="submit"]').disabled = true; form.querySelectorAll('input').forEach((i) => (i.disabled = true)); return; }
    } catch (e) {
      feedback(form, 'err', e.message);
    }
    btn.disabled = false;
  }

  function showSolution(form, auto) {
    const box = form.querySelector('.p-solution');
    box.innerHTML = `<p class="kicker">Worked solution</p>${current.solution}`;
    box.hidden = false;
    if (!auto) box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function act(what, form) {
    if (what === 'hint') {
      const hints = current.problem.hints;
      if (current.hintsShown >= hints.length) return;
      const list = form.querySelector('.p-hints');
      list.appendChild(h('div', { class: 'hint' }, `<span class="kicker">Hint ${current.hintsShown + 1}</span> ${hints[current.hintsShown]}`));
      current.hintsShown++;
      const b = form.querySelector('[data-act="hint"]');
      const left = hints.length - current.hintsShown;
      b.textContent = left ? `Another hint (${left})` : 'No more hints';
      if (!left) b.disabled = true;
    } else if (what === 'solution') {
      if (!current.attempted) return;
      showSolution(form, false);
    } else if (what === 'next') {
      next();
    } else if (what === 'same') {
      loadPractice(current.problem.id);
    }
  }

  async function loadPractice(id) {
    try {
      const ex = `exclude=${encodeURIComponent(current ? current.problem.id : '')}`;
      const q = id ? `id=${encodeURIComponent(id)}` : skill ? `skill=${encodeURIComponent(skill)}&${ex}` : `unit=${unit}&${ex}`;
      render(await SFE.api('/api/problem?' + q));
    } catch (e) { root.innerHTML = `<p class="flash err">${e.message}</p>`; }
  }

  async function loadReview() {
    try {
      const r = await SFE.api('/api/review/next' + (current ? `?exclude=${encodeURIComponent(current.problem.id)}` : ''));
      if (r.done) {
        const when = r.nextReviewAt ? new Date(r.nextReviewAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
        root.innerHTML = `<div class="empty"><h2>All caught up 🎉</h2><p class="muted">${r.queued ? `${r.queued} item(s) are scheduled for later${when ? `; the next one comes due ${when}` : ''}.` : 'Nothing is waiting in your review queue. Problems you miss will show up here.'}</p><p><a class="btn" href="${SFE.url('/')}">Back to the dashboard</a></p></div>`;
        current = null;
        return;
      }
      render(r.problem, { kicker: `Review · ${r.remaining} due · ${r.problem.skill ? 'Math toolkit: ' + r.problem.skillTitle : 'Unit ' + r.problem.unit}` });
    } catch (e) { root.innerHTML = `<p class="flash err">${e.message}</p>`; }
  }

  function updateQuizBar() {
    const el = document.getElementById('quiz-progress');
    if (el) el.textContent = `Question ${Math.min(quiz.i + 1, quiz.problems.length)} of ${quiz.problems.length} · ${quiz.correct} correct so far`;
  }

  function quizIntro() {
    root.innerHTML = `<div class="empty"><h2>Ready for a mixed quiz?</h2><p class="muted">10 questions, no hints. Each answer is checked right away.</p><button class="btn primary" type="button" id="quiz-start">Start quiz</button></div>`;
    document.getElementById('quiz-start').addEventListener('click', startQuiz);
  }
  async function startQuiz() {
    try {
      const r = await SFE.api('/api/quiz/start', { method: 'POST', body: {} });
      quiz = { id: r.quizId, problems: r.problems, i: 0, correct: 0, answered: 0 };
      const bar = h('p', { class: 'small muted', id: 'quiz-progress' });
      root.before(bar);
      if (r.note) root.before(h('p', { class: 'flash warn' }, r.note));
      updateQuizBar();
      render(quiz.problems[0], { kicker: `Quiz · Unit ${quiz.problems[0].unit}` });
    } catch (e) { root.innerHTML = `<p class="flash err">${e.message}</p><p><a class="btn" href="${SFE.url('/')}">Dashboard</a></p>`; }
  }
  async function quizNext() {
    if (current && !current.attempted) {
      if (!confirm('Skip this question? It will count as unanswered.')) return;
    }
    quiz.i++;
    if (quiz.i < quiz.problems.length) { updateQuizBar(); render(quiz.problems[quiz.i], { kicker: `Quiz · Unit ${quiz.problems[quiz.i].unit}` }); return; }
    const r = await SFE.api(`/api/quiz/${quiz.id}/finish`, { method: 'POST', body: {} });
    const bar = document.getElementById('quiz-progress'); if (bar) bar.remove();
    const pctScore = Math.round((100 * r.correct) / r.total);
    root.innerHTML = `<div class="empty"><p class="kicker">Quiz complete</p><h2>${r.correct} / ${r.total} correct (${pctScore}%)</h2><p class="muted">${pctScore >= 80 ? 'Excellent retention. These units are sticking.' : 'Missed problem types have been added to your review queue.'}</p>
      ${r.history.length > 1 ? `<p class="small muted">Recent quizzes: ${r.history.map((x) => `${x.score}/${x.total}`).join(' · ')}</p>` : ''}
      <div class="row"><button class="btn primary" type="button" id="quiz-again">New quiz</button><a class="btn ghost" href="${SFE.url('/review')}">Go to review</a><a class="btn ghost" href="${SFE.url('/')}">Dashboard</a></div></div>`;
    document.getElementById('quiz-again').addEventListener('click', () => { quiz = null; startQuiz(); });
    current = null;
  }

  function next() {
    if (mode === 'practice') loadPractice(pinnedType || null), (pinnedType = '');
    else if (mode === 'review') loadReview();
    else if (mode === 'quiz') quizNext();
  }

  // Problem-type list clicks load that type in place.
  if (mode === 'practice') {
    document.querySelectorAll('.types a[data-type]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      history.replaceState(null, '', a.href);
      loadPractice(a.dataset.type);
    }));
  }

  if (mode === 'practice') { const t = pinnedType; pinnedType = ''; loadPractice(t || null); }
  else if (mode === 'review') loadReview();
  else if (mode === 'quiz') quizIntro();
})();
