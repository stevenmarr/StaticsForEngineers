'use strict';
// Math readiness check: one question at a time, server-graded, adaptive (stops a skill once 2 answers agree).
(function () {
  const root = document.getElementById('assess');
  if (!root) return;
  const h = (tag, attrs = {}, html = '') => { const el = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') el.className = v; else el.setAttribute(k, v); } if (html) el.innerHTML = html; return el; };
  let state = null; // { id, item, progress }

  function progressBar(p) {
    const pctDone = Math.round((100 * p.answered) / Math.max(p.expected, 1));
    return `<div class="assess-progress"><div class="bar"><span style="width:${pctDone}%"></span></div><p class="small muted">Question ${p.answered + 1} · ${p.skillsDone} of ${p.skills} skills checked</p></div>`;
  }

  function render() {
    const { item, progress } = state;
    const p = item.problem;
    root.innerHTML = progressBar(progress);
    const card = h('div', { class: 'player card' });
    card.appendChild(h('p', { class: 'kicker' }, `Skill ${item.skillNum} of 10 · ${item.skillTitle}`));
    card.appendChild(h('h2', {}, p.title));
    card.appendChild(h('div', { class: 'p-prompt' }, p.prompt));
    if (p.svg) card.appendChild(h('div', { class: 'p-figure' }, p.svg));
    const form = h('form', { class: 'p-form', novalidate: '' });
    if (p.kind === 'mc') {
      const list = h('div', { class: 'choices', role: 'radiogroup' });
      p.choices.forEach((c) => { const lab = h('label', { class: 'choice' }); lab.appendChild(h('input', { type: 'radio', name: 'choice', value: String(c.i) })); lab.appendChild(h('span', {}, c.html)); list.appendChild(lab); });
      form.appendChild(list);
    } else {
      const grid = h('div', { class: 'fields' });
      p.fields.forEach((f) => {
        const row = h('label', { class: 'field', 'data-key': f.key });
        row.appendChild(h('span', { class: 'flabel' }, f.label + ' ='));
        row.appendChild(h('input', { type: 'text', inputmode: 'decimal', name: f.key, autocomplete: 'off', spellcheck: 'false', 'aria-label': f.key }));
        row.appendChild(h('span', { class: 'funit' }, f.unit || ''));
        row.appendChild(h('span', { class: 'fmark' }));
        grid.appendChild(row);
      });
      form.appendChild(grid);
    }
    const actions = h('div', { class: 'p-actions' });
    actions.appendChild(h('button', { class: 'btn primary', type: 'submit' }, 'Submit answer'));
    actions.appendChild(h('button', { class: 'btn ghost', type: 'button', 'data-act': 'skip' }, "I haven't learned this yet"));
    form.appendChild(actions);
    form.appendChild(h('div', { class: 'p-feedback', role: 'status' }));
    card.appendChild(form);
    root.appendChild(card);
    root.appendChild(h('p', { class: 'small muted' }, 'Answers are recorded but not shown during the check. You will see your results per skill at the end.'));
    form.addEventListener('submit', (e) => { e.preventDefault(); submit(form, false); });
    form.querySelector('[data-act="skip"]').addEventListener('click', () => submit(form, true));
    const first = form.querySelector('input'); if (first) first.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }

  async function submit(form, skip) {
    const p = state.item.problem;
    const body = { id: state.id, index: state.item.index, skip };
    if (!skip) {
      if (p.kind === 'mc') {
        const sel = form.querySelector('input[name="choice"]:checked');
        if (!sel) return fb(form, 'Pick an answer, or press "I haven\'t learned this yet".');
        body.choice = parseInt(sel.value, 10);
      } else {
        body.answers = {};
        let empty = false;
        p.fields.forEach((f) => { const v = form.querySelector(`input[name="${CSS.escape(f.key)}"]`).value.trim(); if (!v) empty = true; body.answers[f.key] = v; });
        if (empty) return fb(form, 'Fill in every box, or press "I haven\'t learned this yet".');
      }
    }
    form.querySelectorAll('button').forEach((b) => (b.disabled = true));
    try {
      const r = await SFE.api('/api/assess/answer', { method: 'POST', body });
      if (r.done) { window.location.href = SFE.url('/assessment/results'); return; }
      state = { id: state.id, item: r.item, progress: r.progress };
      render();
    } catch (e) {
      fb(form, e.message);
      form.querySelectorAll('button').forEach((b) => (b.disabled = false));
    }
  }
  function fb(form, msg) { const el = form.querySelector('.p-feedback'); el.className = 'p-feedback warn'; el.textContent = msg; }

  async function begin(fresh) {
    try {
      let r = fresh ? null : await SFE.api('/api/assess/current');
      if (!r || r.none || !r.item) r = await SFE.api('/api/assess/start', { method: 'POST', body: {} });
      state = r;
      render();
    } catch (e) { root.insertAdjacentHTML('afterbegin', `<p class="flash err">${e.message}</p>`); }
  }
  const start = document.getElementById('assess-start');
  if (start) start.addEventListener('click', () => begin(root.dataset.open !== '1'));
  const restart = document.getElementById('assess-restart');
  if (restart) restart.addEventListener('click', () => { if (confirm('Discard your answers so far and start a new check?')) begin(true); });
})();
