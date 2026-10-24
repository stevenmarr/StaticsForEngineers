'use strict';
/* Goat Rush: 60-second rapid-fire round with combo multiplier. The server keeps the clock and the score. */
(function () {
  const root = document.getElementById('rush');
  if (!root) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const IMG = (n, px = 160) => SFE.url(`/static/img/farm/${n}-${px}.webp`);
  const HERD = ['avatar-pepper', 'avatar-twins', 'avatar-clove', 'avatar-juniper', 'avatar-captain'];
  let round = null, endAt = 0, timer = 0, busy = false, problem = null;

  function hud(st) {
    return `<div class="rush-hud">
      <div class="rh-score"><span class="kicker">Score</span><b data-score>${st.score}</b></div>
      <div class="rh-combo"><span class="kicker">Combo ×<b data-mult>${st.mult}</b></span><span class="herd" data-herd>${HERD.map((h, i) => `<img src="${IMG(h)}" width="34" height="34" alt="" class="${i < st.mult ? 'on' : ''}">`).join('')}</span><small class="muted" data-streak>${st.combo} in a row</small></div>
      <div class="rh-time"><span class="kicker">Time</span><b data-time>60</b></div>
      <div class="rh-bar"><span data-bar style="width:100%"></span></div>
    </div><div class="card rush-q" data-q></div><div class="rush-flash" data-flash aria-live="polite"></div>`;
  }
  function renderProblem(p) {
    problem = p;
    const q = root.querySelector('[data-q]');
    const body = p.kind === 'mc'
      ? `<div class="rush-choices">${p.choices.map((c) => `<button type="button" class="choice-btn" data-choice="${c.i}">${c.html}</button>`).join('')}</div>`
      : `<form class="rush-num" data-num>${p.fields.map((f) => `<label class="g-ctl"><span>${f.label}</span><span class="g-pred"><input type="text" inputmode="decimal" autocomplete="off" name="${esc(f.key)}" required> ${esc(f.unit || '')}</span></label>`).join('')}<button class="btn primary" type="submit">Answer ↵</button></form>`;
    q.innerHTML = `<p class="kicker">${p.skill ? 'Math toolkit · ' + esc(p.skillTitle) : 'Unit ' + p.unit} · ${esc(p.title)}</p><div class="p-prompt">${p.prompt}</div>${p.svg ? `<div class="p-fig">${p.svg}</div>` : ''}${body}<div class="row"><button type="button" class="btn ghost" data-skip>Skip (resets combo)</button></div>`;
    const first = q.querySelector('input'); if (first) first.focus({ preventScroll: true });
  }
  function flash(ok, text) {
    const f = root.querySelector('[data-flash]');
    f.className = 'rush-flash show ' + (ok ? 'ok' : 'err'); f.innerHTML = text;
    clearTimeout(f._t); f._t = setTimeout(() => { f.className = 'rush-flash'; }, 1100);
  }
  function update(st) {
    root.querySelector('[data-score]').textContent = st.score;
    root.querySelector('[data-mult]').textContent = st.mult;
    root.querySelector('[data-streak]').textContent = `${st.combo} in a row`;
    root.querySelectorAll('[data-herd] img').forEach((im, i) => im.classList.toggle('on', i < st.mult));
  }
  function tick() {
    const left = Math.max(0, endAt - Date.now());
    const t = root.querySelector('[data-time]'), b = root.querySelector('[data-bar]');
    if (t) t.textContent = Math.ceil(left / 1000);
    if (b) { b.style.width = (left / round.duration) * 100 + '%'; b.classList.toggle('low', left < 10000); }
    if (left <= 0) { clearInterval(timer); finish(); }
  }
  async function start() {
    try {
      round = await SFE.api('/api/game/rush/start', { method: 'POST' });
      endAt = Date.now() + round.msLeft;
      root.innerHTML = hud(round);
      renderProblem(round.problem);
      timer = setInterval(tick, 200); tick();
    } catch (e) { root.insertAdjacentHTML('beforeend', `<p class="flash err">${esc(e.message)}</p>`); }
  }
  async function answer(body) {
    if (busy || !round) return; busy = true;
    try {
      const r = await SFE.api('/api/game/rush/answer', { method: 'POST', body: { id: round.id, problemId: problem.id, ...body } });
      if (r.skipped) flash(false, 'Skipped');
      else if (r.correct) flash(true, `+${r.points}${r.mult > 1 ? ` <small>×${r.mult}</small>` : ''}`);
      else {
        let ans = '';
        if (r.correctChoice !== null && problem.kind === 'mc') { const c = problem.choices.find((x) => x.i === r.correctChoice); ans = c ? `Answer: ${c.html}` : ''; }
        if (r.expected) ans = 'Answer: ' + r.expected.map((x) => `${x.value} ${esc(x.unit || '')}`).join(', ');
        flash(false, `Miss · combo reset<br><small>${ans}</small>`);
      }
      update(r);
      if (r.msLeft !== undefined) endAt = Date.now() + r.msLeft;
      if (r.over) { clearInterval(timer); return showEnd(r); }
      renderProblem(r.problem);
    } catch (e) { flash(false, esc(e.message)); }
    finally { busy = false; }
  }
  async function finish() {
    if (!round || round.done) return; round.done = true;
    try { const r = await SFE.api('/api/game/rush/finish', { method: 'POST', body: { id: round.id } }); showEnd(r); } catch (e) { flash(false, esc(e.message)); }
  }
  function showEnd(r) {
    round.done = true;
    const f = r.final || {};
    root.innerHTML = `<section class="card rush-end">
      <img src="${IMG('avatar-twins', 320)}" width="140" height="140" alt="The Twins" class="g-modal-photo">
      <p class="kicker">${f.newBest ? 'New personal best!' : 'Time!'}</p><h1>${f.score} points</h1>
      <p class="muted">${f.correct} correct of ${f.answered} answered · best combo ${f.bestCombo} · personal best ${f.best}</p>
      ${f.xpGained ? `<p class="g-xpgain">+${f.xpGained} XP</p>` : ''}
      ${r.badges && r.badges.length ? `<ul class="g-badges-new">${r.badges.map((b) => `<li><img src="${IMG(b.img)}" width="40" height="40" alt=""><span><b>${esc(b.name)}</b><br><small>${esc(b.desc)}</small></span></li>`).join('')}</ul>` : ''}
      <div class="row center"><button class="btn primary" type="button" data-act="start">Play again</button><a class="btn ghost" href="${SFE.url('/game')}">Level map</a></div></section>`;
  }
  root.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.act === 'start') start();
    else if (b.dataset.choice !== undefined) answer({ choice: Number(b.dataset.choice) });
    else if (b.hasAttribute('data-skip')) answer({ skip: true });
  });
  root.addEventListener('submit', (e) => {
    if (!e.target.matches('[data-num]')) return;
    e.preventDefault();
    const answers = {}; new FormData(e.target).forEach((v, k) => { answers[k] = v; });
    answer({ answers });
  });
})();
