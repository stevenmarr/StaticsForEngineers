'use strict';
// Shared client helpers for StaticsForEngineers.
(function () {
  const meta = (n) => (document.querySelector(`meta[name="${n}"]`) || {}).content || '';
  const BASE = meta('base-path');
  const CSRF = meta('csrf-token');
  window.SFE = {
    base: BASE,
    url: (p) => BASE + p,
    async api(path, opts = {}) {
      const res = await fetch(BASE + path, {
        method: opts.method || 'GET',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': CSRF, Accept: 'application/json' },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
      });
      if (res.status === 401) { window.location.href = BASE + '/login'; throw new Error('Not logged in'); }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      return data;
    },
  };
  // Glossary tooltips: hover, keyboard focus or tap on any [data-tip] symbol.
  let tip = null, owner = null, shownAt = 0;
  function show(el) {
    if (!tip) { tip = document.createElement('div'); tip.className = 'gl-tip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); }
    if (owner !== el) shownAt = Date.now();
    owner = el; tip.textContent = el.getAttribute('data-tip'); tip.style.display = 'block';
    const r = el.getBoundingClientRect(), w = Math.min(320, window.innerWidth - 24);
    tip.style.maxWidth = w + 'px';
    const left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left + r.width / 2 - w / 2));
    tip.style.left = left + window.scrollX + 'px';
    const below = r.bottom + 10 + tip.offsetHeight < window.innerHeight;
    tip.style.top = (below ? r.bottom + 10 : r.top - tip.offsetHeight - 10) + window.scrollY + 'px';
    document.querySelectorAll('.gl.open').forEach((g) => g.classList.remove('open')); el.classList.add('open');
  }
  function hide() { if (tip) tip.style.display = 'none'; if (owner) owner.classList.remove('open'); owner = null; }
  document.addEventListener('mouseover', (e) => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el) show(el); });
  document.addEventListener('mouseout', (e) => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el && !el.contains(e.relatedTarget)) hide(); });
  document.addEventListener('focusin', (e) => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el) show(el); });
  document.addEventListener('focusout', (e) => { if (e.target.closest && e.target.closest('[data-tip]')) hide(); });
  document.addEventListener('click', (e) => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el) { if (owner === el && Date.now() - shownAt > 500) hide(); else show(el); } else hide(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });

  const btn = document.querySelector('.menu-btn');
  if (btn) btn.addEventListener('click', () => {
    const open = document.body.classList.toggle('nav-open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
})();
