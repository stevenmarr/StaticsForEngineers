'use strict';
/* Farm Engineering: interactive level player (design → predict → run → debrief) and the truss sandbox. */
(function () {
  const root = document.getElementById('game');
  if (!root || !window.SFELevels) return;
  const P = window.SFEPhysics, GL = window.SFELevels;
  const cfg = JSON.parse(root.dataset.cfg || '{}');
  const MODE = root.dataset.mode; // 'level' | 'sandbox'
  const L = GL.byId[cfg.level];
  const R = (x, d = 2) => P.round(x, d);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const IMG = (name, px = 160) => SFE.url(`/static/img/farm/${name}-${px}.webp`);
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const easeIn = (t) => t * t;
  const bounce = (t) => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375; return n * (t -= 2.625 / d) * t + 0.984375; };
  const C_INK = '#f4f1ea', C_MUTED = '#a39e94', C_LINE = '#3a3a3a', C_ACC = '#e0b25a', C_OK = '#8fc79a', C_ERR = '#e58c7d', C_TEN = '#7fb2e5', C_COM = '#e0b25a';
  let uid = 0, FS = 1; // FS: label/handle scale for small screens
  // Round avatar photo inside the SVG.
  function face(name, cx, cy, r, extra = '') {
    const id = `cl${++uid}`;
    return `<g ${extra}><clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath><image href="${IMG(name, r > 40 ? 320 : 160)}" x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" clip-path="url(#${id})" preserveAspectRatio="xMidYMid slice"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C_INK}" stroke-width="2"/></g>`;
  }
  const arrow = (x1, y1, x2, y2, col = C_ACC, w = 3) => {
    const a = Math.atan2(y2 - y1, x2 - x1), h = 10;
    return `<g stroke="${col}" fill="${col}" stroke-width="${w}" stroke-linecap="round"><line x1="${x1}" y1="${y1}" x2="${x2 - Math.cos(a) * h * 0.6}" y2="${y2 - Math.sin(a) * h * 0.6}"/><path stroke="none" d="M${x2},${y2} L${x2 - h * Math.cos(a - 0.45)},${y2 - h * Math.sin(a - 0.45)} L${x2 - h * Math.cos(a + 0.45)},${y2 - h * Math.sin(a + 0.45)} Z"/></g>`;
  };
  const label = (x, y, text, col = C_INK, anchor = 'middle', size = 14) => `<text x="${x}" y="${y}" fill="${col}" font-size="${Math.round(size * FS)}" font-weight="600" text-anchor="${anchor}" paint-order="stroke" stroke="#0c0c0c" stroke-width="4" stroke-linejoin="round">${esc(text)}</text>`;
  const bubble = (x, y, text) => `<g class="bubble">${label(x, y, text, C_INK, 'middle', 15)}</g>`;
  const ground = (y, x1 = 0, x2 = 800) => `<rect x="${x1}" y="${y}" width="${x2 - x1}" height="${460 - y}" fill="#16130e"/><line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#5a4a32" stroke-width="2"/>`;

  /* ======================= Scenes ======================= */
  const SCENES = {};

  SCENES.hoist = {
    brief: (p) => `Bale: ${p.mass} kg (W = ${R(p.W, 1)} N). Ring hangs ${p.H} m below the beam.`,
    live: (p, d) => { const t = L.tensions(p, d); return [['Left rope angle', `${R(t.angA, 1)}°`], ['Right rope angle', `${R(t.angB, 1)}°`], ['Rope rating', `${GL.ROPES.find((r) => r.id === d.rope).cap} N`]]; },
    draw(p, d, c) {
      const S = 150, cx = 400, by = 70, ax = cx - d.xA * S, bx = cx + d.xB * S, ry = by + p.H * S;
      const t = c.t, run = c.phase !== 'design' && c.phase !== 'predict' && c.res;
      const failSide = run ? c.res.fail : null, snapT = 0.45;
      let drop = 0, ropeCol = C_INK, snapped = false;
      if (run && failSide && t > snapT) { snapped = true; drop = easeIn(clamp((t - snapT) / 0.4, 0, 1)) * 150; }
      if (run && !failSide && t > 0.4) ropeCol = C_OK;
      let out = `<rect x="0" y="0" width="800" height="460" fill="#0f0e0c"/>${ground(420)}`;
      out += `<rect x="20" y="${by - 16}" width="760" height="16" rx="3" fill="#6b4f2e"/><text x="30" y="${by - 24}" fill="${C_MUTED}" font-size="12">barn door beam</text>`;
      const ropeLine = (x, side) => {
        if (snapped && failSide === side) { // snapped: two short ends
          const k = 0.35;
          return `<line x1="${x}" y1="${by}" x2="${x + (cx - x) * k}" y2="${by + (ry - by) * k}" stroke="${C_ERR}" stroke-width="4"/><line x1="${cx}" y1="${ry + drop}" x2="${cx + (x - cx) * 0.25}" y2="${ry + drop - (ry - by) * 0.18}" stroke="${C_ERR}" stroke-width="4"/>`;
        }
        if (snapped) return `<line x1="${x}" y1="${by}" x2="${cx + (x - cx) * 0.1}" y2="${ry + drop * 0.6}" stroke="${C_MUTED}" stroke-width="3" stroke-dasharray="4 4"/>`;
        return `<line x1="${x}" y1="${by}" x2="${cx}" y2="${ry}" stroke="${failSide && t > snapT - 0.1 && failSide === side ? C_ERR : ropeCol}" stroke-width="4" stroke-linecap="round"/>`;
      };
      out += ropeLine(ax, 'left') + ropeLine(bx, 'right');
      const ringY = ry + drop;
      out += `<circle cx="${cx}" cy="${ringY}" r="7" fill="none" stroke="${C_ACC}" stroke-width="3"/>`;
      out += `<line x1="${cx}" y1="${ringY + 7}" x2="${cx}" y2="${ringY + 40}" stroke="${C_INK}" stroke-width="2"/>`;
      const baleY = Math.min(ringY + 40, 360);
      out += `<g><rect x="${cx - 50}" y="${baleY}" width="100" height="60" rx="6" fill="#c9a36a" stroke="#8a6a3a" stroke-width="2"/><path d="M${cx - 50} ${baleY + 20} h100 M${cx - 50} ${baleY + 40} h100" stroke="#8a6a3a" stroke-width="2"/>${label(cx, baleY + 36, `${p.mass} kg`, '#111', 'middle', 14).replace('stroke="#0c0c0c"', 'stroke="none"')}</g>`;
      // Clove eyes the hay
      const cloveX = snapped ? 150 + 180 * clamp((t - 0.75) / 0.25, 0, 1) : 150;
      out += face('avatar-clove', cloveX, 380, 34);
      if (run && t > 0.6) out += bubble(cloveX + (snapped ? 0 : 20), 330, snapped ? 'Snack time!' : 'Out of reach…');
      // angle arcs + handles
      if (!run || t < 0.2) {
        out += `<circle data-h="xA" cx="${ax}" cy="${by}" r="16" class="handle"/><circle data-h="xB" cx="${bx}" cy="${by}" r="16" class="handle"/>`;
        out += label(ax, by + 36, `${R(d.xA, 2)} m`, C_MUTED) + label(bx, by + 36, `${R(d.xB, 2)} m`, C_MUTED);
      }
      if (run && t > 0.4 && !snapped) {
        const tt = L.tensions(p, d);
        out += label((ax + cx) / 2 - 30, (by + ry) / 2, `T_A = ${R(tt.TA, 0)} N`, C_OK, 'end') + label((bx + cx) / 2 + 30, (by + ry) / 2, `T_B = ${R(tt.TB, 0)} N`, C_OK, 'start');
      }
      if (run && snapped) out += label(failSide === 'left' ? ax + 10 : bx - 10, by + 60, 'SNAP!', C_ERR, 'middle', 22);
      return out;
    },
    drag: { xA: (pt, p) => ({ xA: (400 - pt.x) / 150 }), xB: (pt, p) => ({ xB: (pt.x - 400) / 150 }) },
    dur: 2200,
  };

  SCENES.seesaw = {
    brief: (p) => `Plank ${p.L} m, ${p.mPlank} kg. ${p.goats.map((g) => `${g.name} ${g.m} kg at ${g.x} m`).join(', ')}.`,
    live: (p, d) => p.goats.map((g) => [g.name, `${R(Math.abs(g.x - d.xf), 2)} m ${g.x < d.xf ? 'left of' : 'right of'} the stump`]).concat([['Plank centre', `${R(Math.abs(p.L / 2 - d.xf), 2)} m ${p.L / 2 < d.xf ? 'left' : 'right'}`]]),
    draw(p, d, c) {
      const S = 160, x0 = 80, py = 320, fx = x0 + d.xf * S, pivY = 327, gy = 400;
      const run = c.phase === 'running' || c.phase === 'done';
      let ang = 0;
      if (run && c.res) {
        if (c.res.ok) ang = 4 * Math.sin(6 * Math.PI * c.t) * (1 - c.t);
        else {
          const right = c.res.fail === 'right', dist = (right ? p.L - d.xf : d.xf) * S;
          const amax = (Math.asin(clamp((gy - pivY) / dist, 0, 1)) * 180) / Math.PI;
          ang = (right ? 1 : -1) * amax * bounce(clamp(c.t * 1.3, 0, 1));
        }
      }
      let out = `<rect width="800" height="460" fill="#0f0e0c"/>${ground(gy)}`;
      out += `<g transform="rotate(${ang} ${fx} ${pivY})"><rect x="${x0}" y="${py}" width="${p.L * S}" height="14" rx="4" fill="#9c6b3c"/>`;
      for (let m = 0; m <= p.L; m++) out += `<line x1="${x0 + m * S}" y1="${py + 14}" x2="${x0 + m * S}" y2="${py + 22}" stroke="${C_MUTED}"/><text x="${x0 + m * S}" y="${py + 34}" fill="${C_MUTED}" font-size="11" text-anchor="middle">${m} m</text>`;
      const icons = { Clove: 'avatar-clove', Pepper: 'avatar-pepper', Twin: 'avatar-twins' };
      for (const g of p.goats) { const r = 14 + g.m * 0.4, gx = x0 + g.x * S; out += face(icons[g.name] || 'avatar-pepper', gx, py - r - 2, r) + label(gx, py - 2 * r - 10, `${g.m} kg`, C_INK, 'middle', 12); }
      out += `</g>`;
      out += `<path d="M${fx} ${pivY + 2} L${fx - 36} ${gy} L${fx + 36} ${gy} Z" fill="#6b5a44" stroke="#8a7658" stroke-width="2"/>`;
      if (c.phase === 'design' || c.phase === 'predict') out += `<circle data-h="xf" cx="${fx}" cy="${gy - 30}" r="18" class="handle"/>` + label(fx, gy + 26, `stump at ${R(d.xf, 2)} m`, C_MUTED);
      if (run && c.t > 0.7) {
        out += label(400, 180, c.res.ok ? 'Balanced! The kids can teeter.' : c.res.fail === 'right' ? 'Kids’ end hits the dirt' : 'Clove’s end slams down', c.res.ok ? C_OK : C_ERR, 'middle', 20);
        const bx = x0 + c.res.xStar * S;
        out += `<line x1="${bx}" y1="250" x2="${bx}" y2="${gy}" stroke="${C_ACC}" stroke-dasharray="5 5"/>` + label(bx, 240, `balance point ${R(c.res.xStar, 3)} m`, C_ACC);
      }
      return out;
    },
    drag: { xf: (pt) => ({ xf: (pt.x - 80) / 160 }) },
    vb: '0 150 800 300',
    dur: 2400,
  };

  SCENES.trough = {
    brief: (p) => `Log ${p.L} m (${p.wb} kN/m), trough ${p.w} kN/m from ${p.a} to ${p.b} m, bale ${p.P} kN at ${p.xP} m.`,
    live: (p, d) => [['Post spacing', `${R(Math.abs(d.xB - d.xA), 2)} m`], ['Posts', `${d.postA} + ${d.postB}`], ['Cost', `$${GL.POSTS.find((x) => x.id === d.postA).cost + GL.POSTS.find((x) => x.id === d.postB).cost}`]],
    draw(p, d0, c) {
      const d = L.clean(p, d0);
      const S = 140, x0 = 50, by = 200, gy = 400, X = (x) => x0 + x * S;
      const run = (c.phase === 'running' || c.phase === 'done') && c.res;
      const res = c.res, fail = run ? res.fail : null, k = run ? ease(clamp(c.t / 0.6, 0, 1)) : 0;
      let ang = 0, piv = [X(d.xA), by + 18], sinkA = 0, sinkB = 0;
      if (fail === 'upliftA') { piv = [X(d.xB), by + 18]; ang = 9 * k; }
      if (fail === 'upliftB') { piv = [X(d.xA), by + 18]; ang = -9 * k; }
      if (fail === 'crushA') { sinkA = 40 * k; piv = [X(d.xB), by + 18]; ang = (-Math.atan2(sinkA, X(d.xB) - X(d.xA)) * 180) / Math.PI; }
      if (fail === 'crushB') { sinkB = 40 * k; piv = [X(d.xA), by + 18]; ang = (Math.atan2(sinkB, X(d.xB) - X(d.xA)) * 180) / Math.PI; }
      let out = `<rect width="800" height="460" fill="#0f0e0c"/>${ground(gy)}`;
      const post = (x, mat, sink, h) => `<rect ${h ? `data-h="${h}"` : ''} x="${X(x) - 11}" y="${by + 18 + sink}" width="22" height="${gy - by - 18}" fill="${mat === 'cedar' ? '#b07a4a' : '#6d7f5a'}" stroke="#2a2a2a" class="${h ? 'post' : ''}"/>`;
      out += post(d.xA, d.postA, sinkA, c.phase === 'design' || c.phase === 'predict' ? 'xA' : '') + post(d.xB, d.postB, sinkB, c.phase === 'design' || c.phase === 'predict' ? 'xB' : '');
      out += `<g transform="rotate(${ang} ${piv[0]} ${piv[1]})">`;
      out += `<rect x="${X(0)}" y="${by}" width="${p.L * S}" height="18" rx="6" fill="#8a5a32"/>`;
      out += `<rect x="${X(p.a)}" y="${by - 30}" width="${(p.b - p.a) * S}" height="30" fill="#5d6a73" stroke="#2c3338"/><rect x="${X(p.a) + 6}" y="${by - 26}" width="${(p.b - p.a) * S - 12}" height="8" fill="#c9a36a"/>`;
      for (let x = p.a; x <= p.b + 1e-9; x += 0.25) out += arrow(X(x), by - 70, X(x), by - 34, C_ACC, 2);
      out += label(X((p.a + p.b) / 2), by - 78, `w = ${p.w} kN/m`, C_ACC);
      out += `<rect x="${X(p.xP) - 34}" y="${by - 44}" width="68" height="44" rx="5" fill="#c9a36a" stroke="#8a6a3a"/>` + arrow(X(p.xP), by - 100, X(p.xP), by - 48, C_ACC, 3) + label(X(p.xP), by - 106, `${p.P} kN`, C_ACC);
      out += `</g>`;
      out += face('avatar-twins', X(2.1), 352, 30);
      if (c.phase === 'design' || c.phase === 'predict') out += label(X(d.xA), gy + 22, `A ${d.xA} m`, C_MUTED) + label(X(d.xB), gy + 22, `B ${d.xB} m`, C_MUTED);
      if (run && c.t > 0.5) {
        const RA = res.R.RA, RB = res.R.RB;
        if (fail === 'spacing') out += label(400, 70, 'Posts must be at least 1 m apart', C_ERR, 'middle', 20);
        else {
          const ar = (x, Rv, ok) => (Rv > 0 ? arrow(X(x) + 26, gy - 4, X(x) + 26, gy - 4 - Math.min(120, Rv * 25), ok ? C_OK : C_ERR, 4) : arrow(X(x) + 26, gy - 120, X(x) + 26, gy - 120 - Math.min(80, -Rv * 25), C_ERR, 4)) + label(X(x) + 34, gy - 40, `${R(Rv, 2)} kN`, ok ? C_OK : C_ERR, 'start');
          out += ar(d.xA, RA, !(fail === 'upliftA' || fail === 'crushA')) + ar(d.xB, RB, !(fail === 'upliftB' || fail === 'crushB'));
          out += label(400, 60, res.ok ? 'Solid. Both posts share the load.' : fail.startsWith('uplift') ? 'The log tips: one post would have to pull down' : 'A post sinks: over its rating', res.ok ? C_OK : C_ERR, 'middle', 19);
        }
      }
      return out;
    },
    drag: { xA: (pt) => ({ xA: (pt.x - 50) / 140 }), xB: (pt) => ({ xB: (pt.x - 50) / 140 }) },
    vb: '0 30 800 430',
    dur: 2000,
  };

  SCENES.aframe = {
    brief: (p) => `Legs ${p.H} m tall, hinged at the top. Herd needs ${p.Preq} kN of hay. Kids need ${p.clear} m clearance under the tie.`,
    live: (p, d) => [['Spread (foot to foot)', `${R(2 * d.b, 2)} m`], ['Hay capacity', `${R(2 * d.b * p.perWidth, 2)} kN`], ['Tie height', `${d.yt} m`]],
    draw(p, d, c) {
      const S = 140, ax = 400, gy = 350, H = p.H * S;
      const run = (c.phase === 'running' || c.phase === 'done') && c.res, fail = run ? c.res.fail : null;
      const ell = Math.hypot(d.b * S, H);
      let half = d.b * S;
      if (fail === 'snap' && c.t > 0.4) half = Math.min(ell - 30, d.b * S + 120 * ease(clamp((c.t - 0.4) / 0.5, 0, 1)));
      const ay = gy - Math.sqrt(ell * ell - half * half);
      const tieY = (yt) => gy - (yt / p.H) * (gy - ay), tieX = (yt) => half * (1 - yt / p.H);
      let out = `<rect width="800" height="460" fill="#0f0e0c"/>${ground(gy)}`;
      out += `<line x1="150" y1="${gy - p.clear * S}" x2="650" y2="${gy - p.clear * S}" stroke="${C_MUTED}" stroke-dasharray="6 6"/>` + label(655, gy - p.clear * S + 4, `${p.clear} m kid clearance`, C_MUTED, 'start', 12);
      const fill = run ? ease(clamp(c.t / 0.4, 0, 1)) : 0.35;
      const hw = Math.min(half * 0.9, 50 + 60 * d.b), hh = 40 + 50 * fill;
      out += `<line x1="${ax}" y1="${ay}" x2="${ax}" y2="${ay + 26}" stroke="${C_INK}" stroke-width="2"/><path d="M${ax - hw} ${ay + 26} Q${ax} ${ay + 26 + hh * 1.6} ${ax + hw} ${ay + 26} Z" fill="#c9a36a" opacity="0.9" stroke="#8a6a3a"/>`;
      out += `<line x1="${ax - half}" y1="${gy}" x2="${ax}" y2="${ay}" stroke="#9c6b3c" stroke-width="12" stroke-linecap="round"/><line x1="${ax + half}" y1="${gy}" x2="${ax}" y2="${ay}" stroke="#9c6b3c" stroke-width="12" stroke-linecap="round"/><circle cx="${ax}" cy="${ay}" r="8" fill="${C_ACC}"/>`;
      const ty = tieY(d.yt), tx = tieX(d.yt), tieCol = !run ? C_INK : fail === 'snap' && c.t > 0.35 ? C_ERR : !fail && c.t > 0.4 ? C_OK : C_INK;
      if (fail === 'snap' && c.t > 0.4) out += `<line x1="${ax - tx}" y1="${ty}" x2="${ax - tx + 30}" y2="${ty + 14}" stroke="${C_ERR}" stroke-width="4"/><line x1="${ax + tx}" y1="${ty}" x2="${ax + tx - 30}" y2="${ty + 14}" stroke="${C_ERR}" stroke-width="4"/>` + label(ax, ty - 14, 'SNAP!', C_ERR, 'middle', 22);
      else out += `<line x1="${ax - tx}" y1="${ty}" x2="${ax + tx}" y2="${ty}" stroke="${tieCol}" stroke-width="4"/>`;
      if (c.phase === 'design' || c.phase === 'predict') {
        out += `<circle data-h="b" cx="${ax + half}" cy="${gy}" r="18" class="handle"/><circle data-h="yt" cx="${ax + tx}" cy="${ty}" r="16" class="handle"/>`;
        out += label(ax + half, gy + 28, `b = ${d.b} m`, C_MUTED) + label(ax + tx + 22, ty + 5, `tie ${d.yt} m`, C_MUTED, 'start');
      }
      const jx = fail === 'clearance' && run ? ax - 40 : ax - 150;
      out += face('avatar-juniper', jx, gy - 34, 34);
      if (run && c.t > 0.5) {
        const msg = { small: 'Too narrow: not enough hay for the herd', clearance: 'Bonk! The kids can’t get under the tie', snap: 'The tie snapped and the legs did the splits' }[fail] || `Holds! Tie tension ${R(c.res.T, 3)} kN`;
        out += label(ax, 40, msg, fail ? C_ERR : C_OK, 'middle', 19);
        if (!fail) out += arrow(ax - half, gy + 2, ax - half, gy - 70, C_OK, 3) + arrow(ax + half, gy + 2, ax + half, gy - 70, C_OK, 3) + label(ax + half + 10, gy - 60, `${R(p.Preq / 2, 2)} kN`, C_OK, 'start');
      }
      return out;
    },
    drag: { b: (pt) => ({ b: (pt.x - 400) / 140 }), yt: (pt, p) => ({ yt: (350 - pt.y) / 140 }) },
    dur: 2200,
  };

  SCENES.ramp = {
    brief: (p) => `Trailer floor ${p.h} m up. Clove weighs ${p.m} kg. Board max ${p.Lmax} m; goats balk above ${p.thMax}°.`,
    live: (p, d) => { const Lr = p.h / Math.sin((d.th * Math.PI) / 180); return [['Ramp angle', `${d.th}°`], ['Board needed', `${R(Lr, 2)} m`], ['Cost', `$${L.costOf(p, d.th, GL.SURFACES.find((s) => s.id === d.surface))}`]]; },
    draw(p, d, c) {
      const S = 150, gy = 400, tx = 560, ty = gy - p.h * S, th = (d.th * Math.PI) / 180;
      const Lr = p.h / Math.sin(th), Lb = Math.min(Lr, p.Lmax), cos = Math.cos(th), sin = Math.sin(th);
      const run = (c.phase === 'running' || c.phase === 'done') && c.res, fail = run ? c.res.fail : null;
      const at = (s) => [tx - (Lr - s) * cos * S, gy - s * sin * S]; // s = distance up the ramp from its foot
      let out = `<rect width="800" height="460" fill="#0f0e0c"/>${ground(gy)}`;
      out += `<rect x="${tx}" y="${ty}" width="230" height="${p.h * S - 30}" fill="#3a3f45" stroke="#555"/><circle cx="${tx + 60}" cy="${gy - 22}" r="22" fill="#222" stroke="#666" stroke-width="4"/><circle cx="${tx + 170}" cy="${gy - 22}" r="22" fill="#222" stroke="#666" stroke-width="4"/>` + label(tx + 115, ty + 30, 'trailer', C_MUTED, 'middle', 12);
      const sx1 = tx - Lb * cos * S, sy1 = ty + Lb * sin * S;
      const surf = { plywood: '#c9a36a', rubber: '#2b2b2b', cleats: '#b98a55' }[d.surface];
      out += `<line x1="${sx1}" y1="${sy1}" x2="${tx}" y2="${ty}" stroke="${surf}" stroke-width="12" stroke-linecap="round"/><line x1="${sx1}" y1="${sy1 + 7}" x2="${tx}" y2="${ty + 7}" stroke="#6b4f2e" stroke-width="4"/>`;
      if (d.surface === 'cleats') for (let s = 0.2; s < Lb; s += 0.25) { const x = tx - s * cos * S, y = ty + s * sin * S; out += `<line x1="${x - 6 * sin}" y1="${y - 6 * cos}" x2="${x + 6 * sin}" y2="${y + 6 * cos}" stroke="#6b4f2e" stroke-width="4"/>`; }
      if (d.surface === 'rubber') out += `<line x1="${sx1}" y1="${sy1}" x2="${tx}" y2="${ty}" stroke="#555" stroke-width="3" stroke-dasharray="2 6"/>`;
      if (Lr > p.Lmax + 1e-9) out += `<line x1="${sx1}" y1="${sy1}" x2="${sx1}" y2="${gy}" stroke="${C_ERR}" stroke-dasharray="4 4" stroke-width="2"/>` + label(sx1, (sy1 + gy) / 2, 'gap', C_ERR, 'end');
      const handle = c.phase === 'design' || c.phase === 'predict';
      if (handle) out += `<circle data-h="th" cx="${Lr > p.Lmax ? sx1 : at(0)[0]}" cy="${Lr > p.Lmax ? sy1 : gy}" r="18" class="handle"/>` + label(tx - 70, ty - 20, `${d.th}°`, C_MUTED);
      // Clove's position along the ramp
      let s = 0, jitter = 0, inTrailer = 0;
      if (run) {
        const t = c.t;
        if (!fail) { s = Lr * ease(clamp(t / 0.75, 0, 1)); if (t > 0.75) inTrailer = ease(clamp((t - 0.75) / 0.25, 0, 1)); }
        else if (fail === 'slip') s = t < 0.45 ? Lr * 0.45 * ease(t / 0.45) : Lr * 0.45 * (1 - easeIn(clamp((t - 0.45) / 0.35, 0, 1)));
        else if (fail === 'steep') jitter = Math.sin(t * 40) * 6 * (t < 0.8 ? 1 : 0);
      }
      const r = 26;
      let [gx, gyy] = Lr > p.Lmax && !run ? [sx1 - 80, gy] : at(Math.min(s, Lr));
      if (fail === 'short' || (Lr > p.Lmax && !run)) { gx = sx1 - 70; gyy = gy; }
      if (inTrailer) { gx = tx + 70 * inTrailer; gyy = ty; }
      out += face('avatar-clove', gx - r * sin * (inTrailer ? 0 : 1) + jitter, gyy - r * (inTrailer ? 1 : cos), r);
      if (fail === 'slip' && c.t > 0.5) { const [x1, y1] = at(Lr * 0.45), [x2, y2] = at(Math.max(0, s)); out += `<line x1="${x1}" y1="${y1 - 4}" x2="${x2}" y2="${y2 - 4}" stroke="${C_ERR}" stroke-width="2" stroke-dasharray="3 5"/>`; }
      if (run && c.t > 0.5) {
        const msg = { slip: 'Hooves slipped: tan θ > μs', steep: 'Clove refuses: too steep', short: 'The board doesn’t reach the ground' }[fail] || 'Clove is in the trailer!';
        out += label(330, 50, msg, fail ? C_ERR : C_OK, 'middle', 20);
        if (!fail || fail === 'slip') { // free-body arrows at the mid-ramp point
          const [mx, my] = at(Lr * 0.5), sc = 0.12;
          const W = p.m * 9.81;
          out += arrow(mx, my - 30, mx, my - 30 + W * sc, C_INK, 3) + label(mx + 8, my - 30 + W * sc, 'W', C_INK, 'start');
          out += arrow(mx, my - 30, mx - W * cos * sc * sin, my - 30 - W * cos * sc * cos, C_TEN, 3) + label(mx - W * cos * sc * sin - 8, my - 30 - W * cos * sc * cos, 'N', C_TEN, 'end');
          out += arrow(mx, my - 30, mx + c.res.need * sc * cos, my - 30 - c.res.need * sc * sin, fail ? C_ERR : C_OK, 3) + label(mx + c.res.need * sc * cos + 6, my - 36 - c.res.need * sc * sin, 'F', fail ? C_ERR : C_OK, 'start');
        }
      }
      return out;
    },
    drag: { th: (pt, p) => { const ty = 400 - p.h * 150; const dx = Math.max(5, 560 - pt.x); return { th: Math.round(((Math.atan2(400 - ty, dx) * 180) / Math.PI) * 2) / 2 }; } },
    dur: 2600,
  };

  SCENES.shade = {
    brief: (p) => `Frame 40 kg + roof 30 kg, centred at x = 1 m on a 2 m skid. Gust ${p.F} kN at ${p.hw} m height.`,
    live: (p, d) => [['Blocks', `${d.n} × 25 kg`], ['Block position', `${d.xb} m from the windward end`], ['Cost', `$${d.n * 6}`]],
    draw(p, d, c) {
      const S = 140, x0 = 230, gy = 400, X = (x) => x0 + x * S, Y = (y) => gy - y * S;
      const run = (c.phase === 'running' || c.phase === 'done') && c.res, ok = run && c.res.ok;
      let ang = 0;
      if (run) ang = ok ? 3 * Math.sin(Math.PI * clamp(c.t / 0.6, 0, 1)) : 90 * easeIn(clamp((c.t - 0.2) / 0.6, 0, 1));
      let out = `<rect width="800" height="460" fill="#0f0e0c"/>${ground(gy)}`;
      const flow = run ? (c.t * 400) % 40 : 0;
      for (let i = 0; i < 3; i++) out += `<line x1="${X(-1.5)}" y1="${Y(2.3) + i * 18 - 18}" x2="${X(-0.4)}" y2="${Y(2.3) + i * 18 - 18}" stroke="${C_TEN}" stroke-width="2" stroke-dasharray="14 8" stroke-dashoffset="${-flow}"/>`;
      out += arrow(X(-0.9), Y(p.hw), X(-0.35), Y(p.hw), C_ACC, 4) + label(X(-0.9), Y(p.hw) - 30, `wind ${p.F} kN`, C_ACC, 'start');
      // the twins scamper out when it tips
      const kidX = !ok && run ? X(1) - 260 * ease(clamp(c.t / 0.4, 0, 1)) : X(1);
      out += face('avatar-twins', kidX, gy - 36, 32);
      out += `<g transform="rotate(${ang} ${X(p.B)} ${gy})">`;
      out += `<rect x="${X(0)}" y="${gy - 14}" width="${p.B * S}" height="14" fill="#7a6a55"/>`;
      out += `<rect x="${X(0.08)}" y="${Y(2.2)}" width="10" height="${2.2 * S - 14}" fill="#9c6b3c"/><rect x="${X(1.92) - 10}" y="${Y(2.2)}" width="10" height="${2.2 * S - 14}" fill="#9c6b3c"/>`;
      out += `<rect x="${X(-0.3)}" y="${Y(2.3)}" width="${2.6 * S}" height="16" rx="3" fill="#5d6a73"/>`;
      for (let i = 0; i < d.n; i++) out += `<rect ${c.phase === 'design' || c.phase === 'predict' ? 'data-h="xb"' : ''} class="block" x="${X(d.xb) - 21}" y="${gy - 14 - (i + 1) * 22}" width="42" height="20" rx="2" fill="#9a9a94" stroke="#555"/>`;
      out += `</g>`;
      if ((c.phase === 'design' || c.phase === 'predict') && d.n > 0) out += `<circle data-h="xb" cx="${X(d.xb)}" cy="${gy + 22}" r="16" class="handle"/>` + label(X(d.xb), gy + 52, `${d.xb} m`, C_MUTED);
      out += `<circle cx="${X(p.B)}" cy="${gy}" r="5" fill="${C_ERR}"/>` + label(X(p.B) + 10, gy + 20, 'tipping edge', C_MUTED, 'start', 12);
      if (run && c.t > 0.55) {
        const m = c.res.m;
        out += label(400, 40, ok ? `Stands firm: ${R(m.restoring, 2)} ≥ ${R(m.overturning, 2)} kN·m` : `Over she goes: ${R(m.restoring, 2)} < ${R(m.overturning, 2)} kN·m`, ok ? C_OK : C_ERR, 'middle', 19);
        if (ok) out += `<line x1="${X(m.xbar)}" y1="${Y(1.6)}" x2="${X(m.xbar)}" y2="${gy}" stroke="${C_ACC}" stroke-dasharray="5 5"/>` + arrow(X(m.xbar), Y(1.3), X(m.xbar), Y(0.6), C_ACC, 4) + label(X(m.xbar) - 8, Y(1.4), `x̄ = ${R(m.xbar, 2)} m`, C_ACC, 'end');
      }
      return out;
    },
    drag: { xb: (pt) => ({ xb: Math.round(((pt.x - 230) / 140) * 20) / 20 }) },
    dur: 2600,
  };

  /* ---------------- Creek Truss Bridge ---------------- */
  const BX = (x) => 100 + x * 100, BY = (y) => 330 - y * 100;
  const MATCOL = Object.fromEntries(GL.MATERIALS.map((m) => [m.id, m.color]));
  function memberCol(N, u) { return u > 1 ? C_ERR : N >= 0 ? C_TEN : C_COM; }
  SCENES.bridge = {
    brief: (p) => `Span 6 m over the creek. Dead load ${p.D} kN at each deck joint; hay cart ${p.Pl} kN rolls across.`,
    live: (p, d) => {
      const model = GL.bridgeModel(d), pr = P.solveTruss({ nodes: model.nodes, members: model.members, supports: model.supports });
      const cost = R(model.mem.reduce((s, m) => s + (m.deck ? 0 : GL.MATERIALS.find((x) => x.id === m.mat).cost * Math.hypot(m.x2 - m.x1, m.y2 - m.y1)), 0), 2);
      return [['Members you added', String(d.members.length)], ['m + r vs 2j', `${pr.m} + ${pr.r} = ${pr.m + pr.r} vs ${2 * pr.j}`], ['Cost', `$${cost}${MODE === 'level' ? ` (budget $${L.budgetFor(p)})` : ''}`]];
    },
    draw(p, d, c) {
      const model = GL.bridgeModel(d);
      const run = c.phase === 'running' || c.phase === 'done';
      let out = `<rect width="800" height="460" fill="#0f0e0c"/>`;
      out += `<path d="M0 345 L${BX(0) + 30} 345 L${BX(0) + 70} 460 L0 460 Z" fill="#16130e" stroke="#5a4a32"/><path d="M800 345 L${BX(6) - 30} 345 L${BX(6) - 70} 460 L800 460 Z" fill="#16130e" stroke="#5a4a32"/>`;
      out += `<path d="M${BX(0) + 60} 430 Q 400 ${420 + Math.sin((c.clock || 0) / 400) * 4} ${BX(6) - 60} 430 L${BX(6) - 70} 460 L${BX(0) + 70} 460 Z" fill="#1d3443" opacity="0.9"/>`;
      // supports
      out += `<path d="M${BX(0)} ${BY(0) + 8} l-16 26 h32 Z" fill="#555" stroke="#888"/><circle cx="${BX(6)}" cy="${BY(0) + 20}" r="11" fill="#555" stroke="#888"/>`;
      const st = c.sim; // { forces, util, disp, broken:Set, fallen }
      let ds = 0;
      if (st && st.disp && st.scale) ds = st.scale;
      const fall = st && st.fall ? st.fall : 0;
      const pos = model.nodes.map(([x, y], i) => {
        let px = BX(x), py = BY(y);
        if (st && st.disp) { px += st.disp[i][0] * ds; py -= st.disp[i][1] * ds; }
        const sup = Object.prototype.hasOwnProperty.call(model.supports, i);
        if (fall && !sup) py += fall * (60 + 140 * Math.sin((x / 6) * Math.PI));
        return [px, py];
      });
      // members
      model.mem.forEach((m, i) => {
        const a = pos[model.members[i].a], b = pos[model.members[i].b];
        let col = MATCOL[m.mat], w = m.deck ? 9 : 7, cls = '';
        if (st && st.forces) { col = memberCol(st.forces[i], st.util[i]); w = (m.deck ? 5 : 4) + 5 * Math.min(1, st.util[i]); if (st.util[i] > 1) cls = 'glow'; }
        const broken = st && st.broken && st.broken.has(i);
        if (broken) {
          const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, g = 10 + 30 * fall;
          out += `<line x1="${a[0]}" y1="${a[1]}" x2="${mx - g * 0.3}" y2="${my + g}" stroke="${C_ERR}" stroke-width="${w}" stroke-linecap="round" class="glow"/><line x1="${b[0]}" y1="${b[1]}" x2="${mx + g * 0.3}" y2="${my + g}" stroke="${C_ERR}" stroke-width="${w}" stroke-linecap="round" class="glow"/>`;
        } else out += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${col}" stroke-width="${w}" stroke-linecap="round" class="${cls}"/>`;
        if (!m.deck && !run && MODE !== 'sandbox' || (!m.deck && MODE === 'sandbox' && !c.animating)) out += `<line data-m="${i - (model.mem.length - d.members.length)}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="transparent" stroke-width="22" class="hit"/>`;
        if (c.showForces && st && st.forces && !broken) {
          const N = st.forces[i];
          if (Math.abs(N) > 1e-6) out += label((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 4, `${N > 0 ? '+' : ''}${R(N, 2)}`, memberCol(N, st.util[i]), 'middle', 12);
        }
      });
      // prediction target
      if (MODE === 'level' && (c.phase === 'design' || c.phase === 'predict')) out += `<rect x="${BX(2) + 4}" y="${BY(0) - 12}" width="92" height="24" rx="6" fill="none" stroke="${C_ACC}" stroke-dasharray="4 3"/>` + label(BX(2.5), BY(0) + 34, 'predict me', C_ACC, 'middle', 11);
      // joints
      const editable = MODE === 'sandbox' ? !c.animating : !run;
      for (let x = 0; x < 7; x++) for (let y = 0; y < 3; y++) {
        const used = model.nodes.findIndex((n) => n[0] === x && n[1] === y);
        const [px, py] = used >= 0 ? pos[used] : [BX(x), BY(y)];
        const sel = c.sel && c.sel[0] === x && c.sel[1] === y;
        if (used >= 0 || editable) out += `<circle cx="${px}" cy="${py}" r="${sel ? 9 : used >= 0 ? 6 : 4}" fill="${sel ? C_ACC : used >= 0 ? C_INK : '#555'}"/>`;
        if (editable) out += `<circle data-j="${x},${y}" cx="${BX(x)}" cy="${BY(y)}" r="20" fill="transparent" class="joint"/>`;
      }
      if (c.rubber) out += `<line x1="${BX(c.rubber[0])}" y1="${BY(c.rubber[1])}" x2="${c.rubber[2]}" y2="${c.rubber[3]}" stroke="${C_ACC}" stroke-width="3" stroke-dasharray="6 4"/>`;
      // the hay cart, led by Captain
      if (st && st.cartX !== undefined && st.cartX !== null) {
        const cx = BX(st.cartX), deckY = st.cartY !== undefined ? st.cartY : BY(0);
        out += `<g><rect x="${cx - 34}" y="${deckY - 48}" width="68" height="34" rx="5" fill="#c9a36a" stroke="#8a6a3a" stroke-width="2"/><circle cx="${cx - 20}" cy="${deckY - 10}" r="8" fill="#333" stroke="#888"/><circle cx="${cx + 20}" cy="${deckY - 10}" r="8" fill="#333" stroke="#888"/></g>`;
        out += face('avatar-captain', cx + 56, deckY - 32, 22);
        if (st.splash) out += label(cx, 420, 'SPLASH!', C_TEN, 'middle', 22);
      }
      if (st && st.msg) out += label(400, 128, st.msg, st.msgCol || C_INK, 'middle', 19);
      return out;
    },
    vb: '0 100 800 360',
    dur: 5200,
  };
  const bridgeCaseAt = (p, model, x) => GL.bridgeCase(p, model, x);
  function bridgeSim(p, d, xLoad) {
    const model = GL.bridgeModel(d);
    const sol = P.solveTruss({ nodes: model.nodes, members: model.members, supports: model.supports, loads: bridgeCaseAt(p, model, xLoad) });
    if (!sol.stable) return { stable: false, model, sol };
    const lens = model.mem.map((m) => Math.hypot(m.x2 - m.x1, m.y2 - m.y1));
    const util = sol.forces.map((N, i) => { const mt = GL.MATERIALS.find((x) => x.id === model.mem[i].mat); return N >= 0 ? N / mt.T : -N / GL.capC(mt, lens[i]); });
    return { stable: true, model, sol, util };
  }

  /* ======================= Engine ======================= */
  const scene = SCENES[L.id];
  let seed = cfg.seed || 1, params = L.scenario(seed);
  let design = cfg.design ? (L.id === 'bridge' ? GL.cleanBridge(cfg.design) : L.clean(params, cfg.design)) : L.defaults(params);
  if (MODE === 'sandbox') { design = { members: [] }; params = { ...params, Pl: 2.5, D: 0.6 }; }
  let phase = 'design', result = null, prediction = null, server = null, t = 0, raf = 0, sel = null, rubber = null;
  let tool = 'pine', history = [], showForces = MODE === 'sandbox', sandboxX = 3, sim = null, animating = false;

  root.innerHTML = `<div class="g-wrap">
    <div class="g-stage-col"><div class="g-stage"><svg viewBox="${scene.vb || '0 0 800 460'}" role="img" aria-label="${esc(L.title)} scene" class="g-svg"></svg></div>
      ${L.id === 'bridge' ? `<div class="g-tools" role="toolbar" aria-label="Bridge tools">${GL.MATERIALS.map((m) => `<button type="button" class="tool" data-tool="${m.id}"><i style="background:${m.color}"></i>${m.name} <small>$${m.cost}/m</small></button>`).join('')}<button type="button" class="tool" data-tool="erase">✕ Erase</button><button type="button" class="tool" data-act="undo">↶ Undo</button><button type="button" class="tool" data-act="clear">Clear</button></div>
        <p class="small muted g-help">Tap a joint, then another joint, to add a member (or drag between them). Tap a member to change its material, or erase it.</p>
        <details class="small muted g-mat"><summary>Material ratings</summary><table><tr><th></th><th>Tension</th><th>Compression (length L)</th><th>Cost</th></tr>${GL.MATERIALS.map((m) => `<tr><td>${m.name}</td><td>${m.T} kN</td><td>min(${m.C0}, ${m.Ce}/L²) kN</td><td>$${m.cost}/m</td></tr>`).join('')}</table><p>Long members in compression buckle, so their capacity falls with 1/L².</p></details>` : ''}
    </div>
    <div class="g-side"><div class="g-panel"></div></div>
  </div>
  <div class="g-modal" hidden role="dialog" aria-modal="true" aria-label="Level complete"></div>`;
  const svg = root.querySelector('svg'), panel = root.querySelector('.g-panel'), modal = root.querySelector('.g-modal');

  function simFrame() {
    if (L.id !== 'bridge') return null;
    if (MODE === 'sandbox' && !animating) {
      const s = bridgeSim(params, design, sandboxX);
      if (!s.stable) return { msg: design.members.length ? 'Mechanism: it folds. Triangulate every panel.' : 'Add members to build a truss', msgCol: C_ERR };
      const mx = Math.max(1e-9, ...s.sol.disp.map((u) => Math.hypot(u[0], u[1])));
      return { forces: s.sol.forces, util: s.util, disp: s.sol.disp, scale: 10 / mx, cartX: sandboxX };
    }
    return sim;
  }
  function draw() {
    const w = svg.clientWidth || 800;
    FS = clamp((800 / w) * 0.75, 1, 1.9);
    svg.innerHTML = scene.draw(params, design, { phase, t, res: result && result.result, sel, rubber, sim: simFrame(), showForces: showForces && (MODE === 'sandbox' || phase === 'done'), clock: performance.now(), animating });
    if (FS > 1.05) svg.querySelectorAll('.handle, .joint').forEach((c) => c.setAttribute('r', String(Math.round(Number(c.getAttribute('r')) * FS))));
  }
  window.addEventListener('resize', () => { if (!raf) draw(); });

  // ----- controls panel -----
  function controlHtml(c) {
    const v = design[c.key];
    if (c.type === 'select') return `<label class="g-ctl">${esc(c.label)}<select data-k="${c.key}">${c.options.map((o) => `<option value="${o.value}" ${o.value === v ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label>`;
    return `<label class="g-ctl">${esc(c.label)} <output data-o="${c.key}">${v}${c.unit ? ' ' + c.unit : ''}</output><input type="range" data-k="${c.key}" min="${c.min}" max="${c.max}" step="${c.step}" value="${v}"></label>`;
  }
  function liveHtml() { return `<dl class="g-live">${scene.live(params, design).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`; }
  function designPanel() {
    if (MODE === 'sandbox') return sandboxPanel();
    panel.innerHTML = `<p class="kicker">Scenario #${seed}</p><p class="g-brief">${esc(scene.brief(params))}</p>
      ${L.controls(params).map(controlHtml).join('')}
      <div class="g-livewrap">${liveHtml()}</div>
      <div class="row"><button type="button" class="btn primary" data-act="predict">Run it ▶</button><button type="button" class="btn ghost" data-act="newseed">New scenario</button></div>
      <p class="small muted">Drag the round handles in the picture${L.controls(params).length ? ' or use the sliders' : ''}. Nothing is solved for you until you run it.</p>`;
  }
  function predictPanel() {
    panel.innerHTML = `<p class="kicker">Predict first · bonus star</p><p class="big">${esc(L.predict.label)}</p>
      <p class="small muted">Work it out on paper for your design, then lock it in. Within ${L.predict.tol.rel ? Math.round(L.predict.tol.rel * 100) + '%' : ''}${L.predict.tol.rel && L.predict.tol.abs ? ' or ' : ''}${L.predict.tol.abs ? L.predict.tol.abs + ' ' + L.predict.unit : ''} earns the third star.</p>
      <details class="small"><summary>Hint</summary><p class="muted">${esc(L.predict.hint)}</p></details>
      <label class="g-ctl">Your prediction <span class="g-pred"><input type="text" inputmode="decimal" autocomplete="off" data-pred placeholder="e.g. 3.2"> <span>${esc(L.predict.unit)}</span></span></label>
      <div class="row"><button type="button" class="btn primary" data-act="run">Lock in &amp; run ▶</button><button type="button" class="btn ghost" data-act="runskip">Skip, just run</button><button type="button" class="btn ghost" data-act="back">← Back</button></div>`;
    const inp = panel.querySelector('[data-pred]');
    inp.focus({ preventScroll: true });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go('run'); } });
  }
  const FAILTEXT = {
    hoist: { left: 'The left rope snapped.', right: 'The right rope snapped.' },
    seesaw: { left: 'Not balanced: the left end drops.', right: 'Not balanced: the right end drops.' },
    trough: { spacing: 'Posts closer than 1 m.', upliftA: 'Post A would have to pull down, so the log tips off it.', upliftB: 'Post B would have to pull down, so the log tips off it.', crushA: 'Post A is overloaded and sinks.', crushB: 'Post B is overloaded and sinks.' },
    bridge: { mechanism: 'It folds: the truss is a mechanism.', overload: 'A member failed under the cart.' },
    aframe: { small: 'Too narrow to hold the hay.', clearance: 'The tie is too low for the kids.', snap: 'The tie snapped.' },
    ramp: { short: 'The board is too short for that angle.', steep: 'Too steep: goats balk above 35°.', slip: 'Clove slipped: friction can’t hold her.' },
    shade: { tip: 'The gust tipped the shelter.' },
  };
  function resultPanel() {
    const sc = result, res = sc.result, stars = server ? server.stars : sc.stars;
    const starLbl = ['It works', L.id === 'seesaw' ? 'Precision' : L.id === 'shade' ? 'Fewest blocks' : L.id === 'bridge' ? 'Under budget' : 'Cheapest', 'Prediction'];
    const fmt = (x) => (Number.isFinite(x) ? R(x, Math.abs(x) >= 100 ? 1 : 3) : '—');
    const predLine = sc.predGiven ? `<p class="g-predres ${sc.predOk ? 'ok' : 'err'}">You predicted <b>${esc(prediction)} ${esc(L.predict.unit)}</b>; actual <b>${fmt(res.actual)} ${esc(L.predict.unit)}</b>. ${sc.predOk ? 'Within tolerance!' : res.ok ? 'Outside the tolerance.' : ''}</p>` : `<p class="small muted">No prediction this time. Actual: ${fmt(res.actual)} ${esc(L.predict.unit)}.</p>`;
    const gains = server && server.gains && server.gains.length ? `<ul class="g-gains">${server.gains.map((g) => `<li>+${g.xp} XP · ${esc(g.label)}</li>`).join('')}</ul>` : '';
    panel.innerHTML = `<p class="kicker">${res.ok ? 'Success' : 'Failure'}</p><p class="big ${res.ok ? 'ok' : 'err'}">${res.ok ? 'It works!' : esc((FAILTEXT[L.id] || {})[res.fail] || 'It failed.')}</p>
      <ul class="g-stars">${stars.map((s, i) => `<li class="${s ? 'on' : ''}"><i>★</i>${starLbl[i]}</li>`).join('')}</ul>
      ${predLine}
      <dl class="g-live">${Object.entries(res.values || {}).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      ${!stars[1] && res.ok ? `<p class="small muted">${esc(res.effNote)}</p>` : ''}
      ${gains}
      <details class="g-debrief" ${res.ok ? '' : 'open'}><summary>What the statics says</summary><ul>${L.debrief(params, res).map((x) => `<li>${esc(x)}</li>`).join('')}</ul><p class="small"><a href="${SFE.url('/units/' + cfg.unit)}">Unit ${cfg.unit} lesson: ${esc(cfg.unitTitle)} →</a></p></details>
      ${L.id === 'bridge' ? `<label class="check small"><input type="checkbox" data-act="forces" ${showForces ? 'checked' : ''}> Show member forces (cart at mid-span)</label>` : ''}
      <div class="row"><button type="button" class="btn ${res.ok ? 'ghost' : 'primary'}" data-act="adjust">${res.ok ? 'Improve design' : 'Fix the design'}</button><button type="button" class="btn ghost" data-act="newseed">New scenario</button>${res.ok && cfg.next ? `<a class="btn primary" href="${SFE.url('/game/' + cfg.next.id)}">Next: ${esc(cfg.next.title)} →</a>` : ''}<a class="btn ghost" href="${SFE.url('/game')}">Map</a></div>`;
  }
  function sandboxNums() {
    const s = bridgeSim(params, design, sandboxX);
    const u = s.stable ? Math.max(...s.util) : 0;
    return liveHtml() + `<dl class="g-live"><div><dt>Status</dt><dd class="${!s.stable || u > 1 ? 'err' : 'ok'}">${s.stable ? (u > 1 ? 'Over capacity (red)' : 'Holding') : 'Mechanism / not a truss yet'}</dd></div>${s.stable ? `<div><dt>Worst member use</dt><dd>${Math.round(u * 100)}%</dd></div><div><dt>Support reactions</dt><dd>${Object.values(s.sol.reactions).map((r) => R(r[1], 2) + ' kN').join(' / ')}</dd></div>` : ''}</dl>`;
  }
  function sandboxPanel() {
    panel.innerHTML = `<p class="kicker">Live loads</p>
      <label class="g-ctl">Cart load <output data-o="Pl">${params.Pl} kN</output><input type="range" data-sb="Pl" min="0" max="8" step="0.1" value="${params.Pl}"></label>
      <label class="g-ctl">Cart position <output data-o="x">${sandboxX} m</output><input type="range" data-sb="x" min="0" max="6" step="0.05" value="${sandboxX}"></label>
      <label class="g-ctl">Dead load per deck joint <output data-o="D">${params.D} kN</output><input type="range" data-sb="D" min="0" max="1.5" step="0.05" value="${params.D}"></label>
      <div class="g-livewrap">${sandboxNums()}</div>
      <label class="check small"><input type="checkbox" data-act="forces" ${showForces ? 'checked' : ''}> Show member force labels (kN, + tension)</label>
      <div class="row"><button type="button" class="btn primary" data-act="cross">Run the crossing ▶</button><button type="button" class="btn ghost" data-act="loadref">Load a Pratt truss</button></div>`;
  }
  function refreshLive() { const w = panel.querySelector('.g-livewrap'); if (w) w.innerHTML = MODE === 'sandbox' ? sandboxNums() : liveHtml(); }

  // ----- design edits -----
  function setDesign(patch, fromSlider) {
    design = L.id === 'bridge' ? GL.cleanBridge({ ...design, ...patch }) : L.clean(params, { ...design, ...patch });
    if (L.id !== 'bridge') for (const c of L.controls(params)) {
      const inp = panel.querySelector(`[data-k="${c.key}"]`), o = panel.querySelector(`[data-o="${c.key}"]`);
      if (inp && !fromSlider) inp.value = design[c.key];
      if (o) o.textContent = `${design[c.key]}${c.unit ? ' ' + c.unit : ''}`;
    }
    if (phase === 'design' || MODE === 'sandbox') refreshLive();
    draw();
  }
  panel.addEventListener('input', (e) => {
    const k = e.target.dataset.k, sb = e.target.dataset.sb;
    if (k) setDesign({ [k]: e.target.tagName === 'SELECT' ? e.target.value : Number(e.target.value) }, true);
    if (sb) {
      if (sb === 'x') sandboxX = Number(e.target.value); else params = { ...params, [sb]: Number(e.target.value) };
      const o = panel.querySelector(`[data-o="${sb}"]`); if (o) o.textContent = `${e.target.value} ${sb === 'x' ? 'm' : 'kN'}`;
      refreshLive(); draw();
    }
  });
  panel.addEventListener('change', (e) => { if (e.target.dataset.act === 'forces') { showForces = e.target.checked; draw(); } });

  // bridge editing
  function addMember(a, b) {
    if (a[0] === b[0] && a[1] === b[1]) return;
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) > GL.byId.bridge.grid.maxLen) { toast('Too long: members can span at most 2 grid squares.'); return; }
    if (a[1] === 0 && b[1] === 0 && Math.abs(a[0] - b[0]) === 1) { toast('The deck is already there.'); return; }
    const same = (m) => (m.x1 === a[0] && m.y1 === a[1] && m.x2 === b[0] && m.y2 === b[1]) || (m.x1 === b[0] && m.y1 === b[1] && m.x2 === a[0] && m.y2 === a[1]);
    const existing = design.members.findIndex(same);
    if (existing >= 0) { tapMember(existing); return; } // re-drawing a member applies the current tool to it
    const before = design.members.length;
    history.push(JSON.stringify(design));
    setDesign({ members: design.members.concat([{ x1: a[0], y1: a[1], x2: b[0], y2: b[1], mat: tool === 'erase' ? 'pine' : tool }]) });
    if (design.members.length === before) history.pop();
  }
  function tapMember(i) {
    history.push(JSON.stringify(design));
    const ms = design.members.slice();
    if (tool === 'erase') ms.splice(i, 1); else ms[i] = { ...ms[i], mat: tool };
    setDesign({ members: ms });
  }
  let toastTimer = 0;
  function toast(msg) {
    let el = root.querySelector('.g-toast');
    if (!el) { el = document.createElement('div'); el.className = 'g-toast'; root.querySelector('.g-stage').appendChild(el); }
    el.textContent = msg; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
  }
  const tools = root.querySelector('.g-tools');
  function markTool() { if (tools) tools.querySelectorAll('[data-tool]').forEach((b) => b.classList.toggle('on', b.dataset.tool === tool)); }
  if (tools) {
    markTool();
    tools.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.tool) { tool = b.dataset.tool; markTool(); sel = null; draw(); }
      if (b.dataset.act === 'undo' && history.length) { design = JSON.parse(history.pop()); setDesign({}); }
      if (b.dataset.act === 'clear' && design.members.length) { history.push(JSON.stringify(design)); setDesign({ members: [] }); }
    });
  }

  // ----- pointer handling (mouse + touch) -----
  function svgPt(e) { const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const m = svg.getScreenCTM(); return m ? pt.matrixTransform(m.inverse()) : { x: 0, y: 0 }; }
  const canEdit = () => (MODE === 'sandbox' ? !animating : phase === 'design' || phase === 'predict');
  let drag = null;
  svg.addEventListener('pointerdown', (e) => {
    if (!canEdit()) return;
    const h = e.target.closest('[data-h]'), j = e.target.closest('[data-j]'), m = e.target.closest('[data-m]');
    if (h && scene.drag && scene.drag[h.dataset.h]) { drag = { kind: 'h', key: h.dataset.h }; svg.setPointerCapture(e.pointerId); e.preventDefault(); return; }
    if (j) { const xy = j.dataset.j.split(',').map(Number); drag = { kind: 'j', from: xy, moved: false }; svg.setPointerCapture(e.pointerId); e.preventDefault(); return; }
    if (m) { tapMember(Number(m.dataset.m)); e.preventDefault(); }
  });
  svg.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const pt = svgPt(e);
    if (drag.kind === 'h') setDesign(scene.drag[drag.key](pt, params, design));
    if (drag.kind === 'j') {
      if (Math.hypot(pt.x - BX(drag.from[0]), pt.y - BY(drag.from[1])) > 24) drag.moved = true;
      if (drag.moved) { rubber = [drag.from[0], drag.from[1], pt.x, pt.y]; draw(); }
    }
  });
  function nearestJoint(pt) {
    const x = Math.round((pt.x - 100) / 100), y = Math.round((330 - pt.y) / 100);
    if (x < 0 || x > 6 || y < 0 || y > 2) return null;
    return Math.hypot(pt.x - BX(x), pt.y - BY(y)) < 34 ? [x, y] : null;
  }
  svg.addEventListener('pointerup', (e) => {
    if (!drag) return;
    const d0 = drag; drag = null; rubber = null;
    if (d0.kind === 'j') {
      const end = nearestJoint(svgPt(e));
      if (d0.moved && end && (end[0] !== d0.from[0] || end[1] !== d0.from[1])) { addMember(d0.from, end); sel = null; }
      else if (!d0.moved) {
        if (sel && (sel[0] !== d0.from[0] || sel[1] !== d0.from[1])) { addMember(sel, d0.from); sel = d0.from; }
        else sel = sel ? null : d0.from;
      }
      draw();
    }
  });
  svg.addEventListener('pointercancel', () => { drag = null; rubber = null; draw(); });

  // ----- phases -----
  function stop() { cancelAnimationFrame(raf); raf = 0; }
  function animate(dur, frame, done) {
    stop(); const t0 = performance.now();
    const step = (now) => { t = Math.min(1, (now - t0) / dur); frame(t); draw(); if (t < 1) raf = requestAnimationFrame(step); else { raf = 0; done(); } };
    raf = requestAnimationFrame(step);
  }
  function bridgeRunFrames(p, d, res, onDone) {
    const a = res.analysis || {};
    animating = true;
    if (!a.stable) { // fold the bridge
      sim = { msg: 'It folds: a mechanism', msgCol: C_ERR, fall: 0 };
      animate(1800, (tt) => { sim.fall = ease(tt) * 0.9; }, () => { animating = false; onDone(); });
      return;
    }
    const failX = a.firstFail ? a.firstFail.x : null;
    let broken = null, collapseT0 = null;
    const midSol = bridgeSim(p, d, 3), mx = Math.max(1e-9, ...midSol.sol.disp.map((u) => Math.hypot(u[0], u[1])));
    const scale = 12 / mx;
    animate(failX !== null ? 2600 + 1800 * (failX / 6) : 4600, (tt) => {
      const travel = failX !== null ? Math.min(1, tt / 0.6) : tt;
      let xc = -0.8 + travel * (failX !== null ? failX + 0.8 : 7.6);
      if (failX !== null && travel >= 1) {
        if (!broken) broken = new Set(a.firstFail.members);
        collapseT0 = collapseT0 ?? tt;
        const f = clamp((tt - collapseT0) / (1 - collapseT0 + 1e-9), 0, 1);
        const s = bridgeSim(p, d, failX);
        sim = { forces: s.sol.forces, util: s.util, disp: s.sol.disp, scale, broken, fall: easeIn(f), cartX: failX, cartY: BY(0) + easeIn(f) * 150, splash: f > 0.8, msg: 'Snap! Overloaded member', msgCol: C_ERR };
        return;
      }
      const onDeck = xc >= 0 && xc <= 6;
      const s = bridgeSim(p, d, onDeck ? xc : null);
      sim = { forces: s.sol.forces, util: s.util, disp: s.sol.disp, scale, cartX: xc };
      if (failX === null && tt > 0.95) sim.msg = 'Across! The bridge held.', sim.msgCol = C_OK;
    }, () => {
      animating = false;
      if (!failX && failX !== 0) { const s = bridgeSim(p, d, 3); sim = { forces: s.sol.forces, util: s.util, disp: s.sol.disp, scale, cartX: null, msg: res.ok ? 'Across! Forces shown with the cart at mid-span' : '', msgCol: C_OK }; }
      onDone();
    });
  }
  async function go(act) {
    if (act === 'predict') { phase = 'predict'; predictPanel(); draw(); return; }
    if (act === 'back') { phase = 'design'; designPanel(); draw(); return; }
    if (act === 'run' || act === 'runskip') {
      const raw = act === 'run' ? (panel.querySelector('[data-pred]') || {}).value : '';
      const val = raw && raw.trim() !== '' ? Number(String(raw).replace(/[,\s]/g, '').replace('−', '-')) : null;
      if (act === 'run' && (val === null || !Number.isFinite(val))) { const i = panel.querySelector('[data-pred]'); i.classList.add('bad'); i.focus(); return; }
      prediction = val;
      result = GL.score(L.id, seed, design, prediction);
      server = null;
      phase = 'running';
      panel.innerHTML = `<p class="kicker">Running</p><p class="big">Let’s see if it holds…</p>`;
      const post = SFE.api('/api/game/attempt', { method: 'POST', body: { level: L.id, seed, design, prediction } }).then((r) => { server = r; }).catch(() => { server = null; });
      const finish = async () => { await post; phase = 'done'; resultPanel(); draw(); celebrate(); };
      if (L.id === 'bridge') bridgeRunFrames(params, design, result.result, finish);
      else animate(scene.dur, () => {}, finish);
      return;
    }
    if (act === 'adjust') { stop(); phase = 'design'; sim = null; result = null; designPanel(); draw(); return; }
    if (act === 'newseed') {
      stop(); seed = 1 + Math.floor(Math.random() * 99999); params = L.scenario(seed); phase = 'design'; sim = null; result = null;
      if (L.id !== 'bridge') design = L.clean(params, design);
      designPanel(); draw(); return;
    }
    if (act === 'cross') {
      const res = GL.byId.bridge.evaluate({ ...params }, design);
      panel.querySelectorAll('button').forEach((b) => (b.disabled = true));
      bridgeRunFrames(params, design, res, () => { setTimeout(() => { sim = null; sandboxPanel(); draw(); }, 1600); });
      return;
    }
    if (act === 'loadref') { history.push(JSON.stringify(design)); design = GL.cleanBridge(GL.byId.bridge.referenceDesign()); sandboxPanel(); draw(); }
  }
  panel.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b && b.tagName === 'BUTTON') go(b.dataset.act); });

  // ----- celebrations -----
  function celebrate() {
    if (!server || !server.ok) { if (server && server.badges && server.badges.length) showModal(false); return; }
    showModal(true);
  }
  function showModal(win) {
    const s = server, three = s.starCount === 3;
    const ch = cfg.character || { img: 'avatar-clove', name: 'Clove' };
    modal.innerHTML = `<div class="g-modal-card ${three ? 'gold' : ''}">
      <img src="${IMG(ch.img, 320)}" width="160" height="160" alt="${esc(ch.name)}" class="g-modal-photo">
      <p class="kicker">${win ? (three ? 'Blue ribbon!' : s.firstClear ? 'Level cleared' : 'It works') : 'Badge earned'}</p>
      ${win ? `<p class="g-modal-stars">${s.stars.map((x) => `<i class="${x ? 'on' : ''}">★</i>`).join('')}</p>` : ''}
      <p class="big">${win ? esc(`${ch.name} approves.`) : ''}</p>
      ${s.gains && s.gains.length ? `<p class="g-xpgain">+${s.gains.reduce((t, g) => t + g.xp, 0)} XP</p>` : ''}
      ${s.levelUp ? `<p class="g-levelup">Level up! You’re now a <b>${esc(s.xp.title)}</b> (Lv ${s.xp.level}).</p>` : ''}
      ${s.badges && s.badges.length ? `<ul class="g-badges-new">${s.badges.map((b) => `<li><img src="${IMG(b.img, 160)}" width="40" height="40" alt=""><span><b>${esc(b.name)}</b><br><small>${esc(b.desc)}</small></span></li>`).join('')}</ul>` : ''}
      <div class="row"><button type="button" class="btn primary" data-close>Keep going</button></div></div>`;
    modal.hidden = false;
    modal.querySelector('[data-close]').focus();
  }
  modal.addEventListener('click', (e) => { if (e.target === modal || e.target.closest('[data-close]')) modal.hidden = true; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal.hidden = true; });

  designPanel();
  draw();
})();
