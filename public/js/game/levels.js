/* Farm Engineering levels: scenarios, physics checks, stars and debriefs.
 * Shared by the browser (live sim + animation) and the server (authoritative scoring).
 * Each level: scenario(seed) -> params; defaults(params) -> design; evaluate(params, design) -> result.
 * result: { ok, fail?, efficient, effNote, actual (the predicted quantity), values{}, ... }
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./physics.js'));
  else root.SFELevels = factory(root.SFEPhysics);
})(typeof self !== 'undefined' ? self : this, function (P) {
  'use strict';
  const { G, rng, round, deg, rad } = P;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
  const step = (r, lo, hi, s) => round(lo + s * Math.floor(r() * (Math.round((hi - lo) / s) + 1)), 4);

  /* ---------------- 1. Hay Hoist (Unit 2: particle equilibrium) ---------------- */
  const ROPES = [
    { id: 'twine', name: 'Baling twine', cap: 350, cost: 1 },
    { id: 'sisal', name: 'Sisal rope', cap: 600, cost: 3 },
    { id: 'nylon', name: 'Nylon rope', cap: 1200, cost: 8 },
  ];
  const hoist = {
    id: 'hoist', num: 1, unit: 2, title: 'Hay Hoist', character: 'clove',
    tagline: 'Two ropes, one bale, and a barn door frame.',
    story: 'Clove keeps stealing hay off the barn floor. You will hang a bale from a ring tied to two ropes, anchored to the door beam above. Spread the anchors out and the ropes get gentle angles; keep them close and they share the load more easily. Pick a rope that will not snap.',
    objective: 'Hang the bale so both ropes stay below their rating. Bonus star for the cheapest rope that can work.',
    scenario(seed) {
      const r = rng(seed * 7 + 1);
      const mass = seed === 1 ? 60 : step(r, 45, 70, 5);
      return { mass, W: round(mass * G, 2), H: 0.9, xMin: 0.4, xMax: 2.4, xLimitPair: 0.8 };
    },
    controls: (p) => [
      { key: 'xA', label: 'Left anchor distance', min: p.xMin, max: p.xMax, step: 0.05, unit: 'm' },
      { key: 'xB', label: 'Right anchor distance', min: p.xMin, max: p.xMax, step: 0.05, unit: 'm' },
      { key: 'rope', label: 'Rope', type: 'select', options: ROPES.map((x) => ({ value: x.id, label: `${x.name} (${x.cap} N, $${x.cost})` })) },
    ],
    defaults: () => ({ xA: 1.2, xB: 0.6, rope: 'twine' }),
    predict: { label: 'Tension in the LEFT rope', unit: 'N', tol: { rel: 0.03 }, hint: 'Draw the ring FBD: ΣFx = 0 and ΣFy = 0.' },
    clean(p, d) {
      return { xA: clamp(round(num(d.xA, 1), 2), p.xMin, p.xMax), xB: clamp(round(num(d.xB, 1), 2), p.xMin, p.xMax), rope: ROPES.some((x) => x.id === d.rope) ? d.rope : 'twine' };
    },
    tensions(p, d) {
      const LA = Math.hypot(d.xA, p.H), LB = Math.hypot(d.xB, p.H);
      // Ring at origin, anchors at (-xA, H) and (xB, H).  ΣFx: -TA xA/LA + TB xB/LB = 0;  ΣFy: TA H/LA + TB H/LB = W
      const TA = (p.W * d.xB * LA) / (p.H * (d.xA + d.xB));
      const TB = (p.W * d.xA * LB) / (p.H * (d.xA + d.xB));
      return { TA, TB, LA, LB, angA: deg(Math.atan2(p.H, d.xA)), angB: deg(Math.atan2(p.H, d.xB)) };
    },
    evaluate(p, d0) {
      const d = this.clean(p, d0), rope = ROPES.find((x) => x.id === d.rope);
      const t = this.tensions(p, d);
      const ok = t.TA <= rope.cap && t.TB <= rope.cap;
      const tMin = (p.W * Math.hypot(p.xMin, p.H)) / (2 * p.H); // best case: symmetric, anchors as far in as allowed
      const cheapest = ROPES.filter((x) => x.cap >= tMin).sort((a, b) => a.cost - b.cost)[0];
      const fail = ok ? null : (t.TA > rope.cap ? 'left' : 'right');
      return {
        design: d, ok, fail, actual: t.TA, cost: rope.cost,
        efficient: ok && rope.cost <= cheapest.cost,
        effNote: `Cheapest rope that can work: ${cheapest.name} (best case is symmetric with anchors close in, T = ${round(tMin, 1)} N).`,
        values: { 'Left tension T_A': `${round(t.TA, 1)} N`, 'Right tension T_B': `${round(t.TB, 1)} N`, 'Rope rating': `${rope.cap} N`, 'Left rope angle': `${round(t.angA, 1)}°`, 'Right rope angle': `${round(t.angB, 1)}°` },
        t, rope,
      };
    },
    debrief(p, res) {
      const { t } = res;
      return [
        `The ring is a particle in equilibrium: three forces, W = ${round(p.W, 1)} N down and the two rope tensions along the ropes.`,
        `ΣFx = 0: T_A·cos(${round(t.angA, 1)}°) = T_B·cos(${round(t.angB, 1)}°).  ΣFy = 0: T_A·sin(${round(t.angA, 1)}°) + T_B·sin(${round(t.angB, 1)}°) = W.`,
        `Solving: T_A = ${round(t.TA, 1)} N, T_B = ${round(t.TB, 1)} N. The steeper rope carries more of the bale, and flat ropes need huge tension to hold anything up.`,
      ];
    },
  };

  /* ---------------- 2. Teeter-Goat (Unit 3: moments) ---------------- */
  const seesaw = {
    id: 'seesaw', num: 2, unit: 3, title: 'Teeter-Goat', character: 'pepper',
    tagline: 'Balance a 55 kg doe against two kids.',
    story: 'The kids have discovered the old plank. Clove sits at one end, the kids pile on the other. Slide the stump (the fulcrum) until the plank balances level. The plank itself has weight too.',
    objective: 'Get the net moment about the fulcrum to nearly zero (within 3 cm). Bonus star within 1 cm.',
    scenario(seed) {
      const r = rng(seed * 13 + 2);
      if (seed === 1) return { L: 4, mPlank: 15, goats: [{ name: 'Clove', m: 55, x: 0.3 }, { name: 'Pepper', m: 18, x: 3.5 }, { name: 'Twin', m: 14, x: 3.9 }] };
      return { L: 4, mPlank: step(r, 10, 20, 1), goats: [{ name: 'Clove', m: step(r, 45, 65, 1), x: step(r, 0.1, 0.5, 0.1) }, { name: 'Pepper', m: step(r, 12, 22, 1), x: step(r, 2.8, 3.5, 0.1) }, { name: 'Twin', m: step(r, 10, 18, 1), x: step(r, 3.6, 3.9, 0.1) }] };
    },
    controls: () => [{ key: 'xf', label: 'Fulcrum position', min: 0.5, max: 3.5, step: 0.01, unit: 'm' }],
    defaults: () => ({ xf: 2 }),
    predict: { label: 'Fulcrum position that balances the plank', unit: 'm', tol: { abs: 0.03 }, hint: 'Set ΣM about the fulcrum = 0, or find the combined center of mass.' },
    clean: (p, d) => ({ xf: clamp(round(num(d.xf, 2), 2), 0.5, 3.5) }),
    evaluate(p, d0) {
      const d = this.clean(p, d0);
      const items = [{ m: p.mPlank, x: p.L / 2, name: 'Plank' }].concat(p.goats);
      const M = items.reduce((s, it) => s + it.m * it.x, 0), mt = items.reduce((s, it) => s + it.m, 0);
      const xStar = M / mt;
      const net = items.reduce((s, it) => s + it.m * G * (it.x - d.xf), 0); // + means the right end goes down
      const err = d.xf - xStar;
      return {
        design: d, ok: Math.abs(err) <= 0.03, actual: xStar, efficient: Math.abs(err) <= 0.01,
        effNote: 'Precision star: fulcrum within 1 cm of the balance point.',
        fail: Math.abs(err) <= 0.03 ? null : net > 0 ? 'right' : 'left',
        values: { 'Balance point': `${round(xStar, 3)} m`, 'Your fulcrum': `${round(d.xf, 3)} m`, 'Net moment about fulcrum': `${round(net, 1)} N·m ${net > 0 ? '(clockwise)' : net < 0 ? '(counter-clockwise)' : ''}`, 'Total weight': `${round(mt * G, 1)} N` },
        net, xStar, items, mt,
      };
    },
    debrief(p, res) {
      const terms = res.items.map((it) => `${it.m}·${it.x}`).join(' + ');
      return [
        'At balance the moments about the fulcrum cancel: Σ m·g·(x − x_f) = 0, so x_f = Σm·x / Σm.',
        `x_f = (${terms}) / ${res.mt} = ${round(res.xStar, 3)} m. The plank counts too: its weight acts at its middle (2 m).`,
        `With your fulcrum at ${round(res.design.xf, 3)} m the net moment is ${round(res.net, 1)} N·m. Each centimetre off costs ${round(res.mt * G * 0.01, 1)} N·m.`,
      ];
    },
  };

  /* ---------------- 3. Feed-Trough Beam (Units 4-5: distributed loads, rigid-body reactions) ---------------- */
  const POSTS = [
    { id: 'cedar', name: 'Cedar post', cap: 3.5, cost: 20 },
    { id: 'treated', name: 'Treated post', cap: 6.0, cost: 35 },
  ];
  const trough = {
    id: 'trough', num: 3, unit: 4, title: 'Feed-Trough Beam', character: 'twins',
    tagline: 'Place two posts under a loaded log.',
    story: 'A 5 m cedar log will carry the feed trough along most of its length, and a hay bale hangs near the far end for the herd. Put two posts under it. If a post is overloaded it sinks; if one reaction goes negative the log tips up off it.',
    objective: 'Both reactions positive and within each post rating. Bonus star for the cheapest posts that work.',
    scenario(seed) {
      const r = rng(seed * 17 + 3);
      return { L: 5, wb: 0.2, w: seed === 1 ? 1.2 : step(r, 1.0, 1.3, 0.1), a: 1, b: 4, P: seed === 1 ? 1.5 : step(r, 1.2, 1.7, 0.1), xP: 4.6 };
    },
    controls: (p) => [
      { key: 'xA', label: 'Post A position', min: 0, max: p.L, step: 0.05, unit: 'm' },
      { key: 'xB', label: 'Post B position', min: 0, max: p.L, step: 0.05, unit: 'm' },
      { key: 'postA', label: 'Post A', type: 'select', options: POSTS.map((x) => ({ value: x.id, label: `${x.name} (${x.cap} kN, $${x.cost})` })) },
      { key: 'postB', label: 'Post B', type: 'select', options: POSTS.map((x) => ({ value: x.id, label: `${x.name} (${x.cap} kN, $${x.cost})` })) },
    ],
    defaults: () => ({ xA: 0.5, xB: 2.5, postA: 'cedar', postB: 'cedar' }),
    predict: { label: 'Reaction at post A', unit: 'kN', tol: { rel: 0.03, abs: 0.03 }, hint: 'Replace each distributed load by its resultant at its centroid, then take ΣM about post B.' },
    clean(p, d) {
      let xA = clamp(round(num(d.xA, 0.5), 2), 0, p.L), xB = clamp(round(num(d.xB, 4), 2), 0, p.L);
      if (xA > xB) { const t = xA; xA = xB; xB = t; }
      return { xA, xB, postA: POSTS.some((x) => x.id === d.postA) ? d.postA : 'cedar', postB: POSTS.some((x) => x.id === d.postB) ? d.postB : 'cedar' };
    },
    loads(p) {
      return [
        { name: 'Log self-weight', F: p.wb * p.L, x: p.L / 2, kind: 'dist', from: 0, to: p.L, w: p.wb },
        { name: 'Trough', F: p.w * (p.b - p.a), x: (p.a + p.b) / 2, kind: 'dist', from: p.a, to: p.b, w: p.w },
        { name: 'Hay bale', F: p.P, x: p.xP, kind: 'point' },
      ];
    },
    reactions(p, d) {
      const loads = this.loads(p);
      const F = loads.reduce((s, l) => s + l.F, 0), Mo = loads.reduce((s, l) => s + l.F * l.x, 0);
      const span = d.xB - d.xA;
      if (span < 1e-9) return { F, xbar: Mo / F, RA: NaN, RB: NaN };
      const RB = (Mo - F * d.xA) / span; // ΣM about A
      return { F, xbar: Mo / F, RA: F - RB, RB };
    },
    evaluate(p, d0) {
      const d = this.clean(p, d0);
      const pa = POSTS.find((x) => x.id === d.postA), pb = POSTS.find((x) => x.id === d.postB);
      const R = this.reactions(p, d);
      let fail = null;
      if (d.xB - d.xA < 1) fail = 'spacing';
      else if (R.RA < -1e-9) fail = 'upliftA';
      else if (R.RB < -1e-9) fail = 'upliftB';
      else if (R.RA > pa.cap) fail = 'crushA';
      else if (R.RB > pb.cap) fail = 'crushB';
      const ok = !fail, cost = pa.cost + pb.cost;
      const minCost = this.minCost(p);
      return {
        design: d, ok, fail, actual: R.RA, cost, efficient: ok && cost <= minCost,
        effNote: `Cheapest posts that can work cost $${minCost}.`,
        values: { 'Total load': `${round(R.F, 2)} kN acting at x̄ = ${round(R.xbar, 3)} m`, 'Reaction A': `${round(R.RA, 3)} kN (rating ${pa.cap})`, 'Reaction B': `${round(R.RB, 3)} kN (rating ${pb.cap})`, 'Post spacing': `${round(d.xB - d.xA, 2)} m (min 1 m)`, Cost: `$${cost}` },
        R, pa, pb, loadsList: this.loads(p),
      };
    },
    minCost(p) {
      let best = Infinity;
      for (const a of POSTS) for (const b of POSTS) {
        if (a.cost + b.cost >= best) continue;
        for (let i = 0; i <= 100; i++) for (let k = i + 20; k <= 100; k++) {
          const R = this.reactions(p, { xA: i * 0.05, xB: k * 0.05 });
          if (R.RA >= 0 && R.RB >= 0 && R.RA <= a.cap && R.RB <= b.cap) { best = a.cost + b.cost; i = 101; break; }
        }
      }
      return best;
    },
    debrief(p, res) {
      const L = res.loadsList, R = res.R, d = res.design;
      return [
        `Each distributed load becomes one force at its centroid: log ${round(L[0].F, 2)} kN at ${L[0].x} m, trough ${round(L[1].F, 2)} kN at ${L[1].x} m, plus the bale ${L[2].F} kN at ${L[2].x} m. Total ${round(R.F, 2)} kN at x̄ = ${round(R.xbar, 3)} m.`,
        `ΣM about A: R_B·(${d.xB} − ${d.xA}) = ${round(R.F, 2)}·(${round(R.xbar, 3)} − ${d.xA}), so R_B = ${round(R.RB, 3)} kN. ΣFy: R_A = ${round(R.F, 2)} − R_B = ${round(R.RA, 3)} kN.`,
        'If x̄ falls outside the two posts, one reaction would have to pull down. A post cannot pull, so the log tips. Posts straddling x̄ share the load; the closer post to x̄ carries more.',
      ];
    },
  };

  /* ---------------- 4. Creek Truss Bridge (Unit 6: trusses) ---------------- */
  const MATERIALS = [
    { id: 'pine', name: 'Pine', EA: 8e4, cost: 8, T: 6, C0: 5, Ce: 9, color: '#c9a36a' },
    { id: 'oak', name: 'Oak', EA: 1e5, cost: 15, T: 12, C0: 10, Ce: 20, color: '#9c6b3c' },
    { id: 'steel', name: 'Steel', EA: 2e5, cost: 30, T: 30, C0: 25, Ce: 60, color: '#9fb4c7' },
  ];
  const mat = (id) => MATERIALS.find((m) => m.id === id) || MATERIALS[0];
  // Compression capacity drops with length squared (Euler buckling), capped by crushing strength.
  const capC = (m, L) => Math.min(m.C0, m.Ce / (L * L));
  const BR = { cols: 7, rows: 3, deckY: 0, maxLen: 2.9 };
  function bridgeModel(design, deckMat = 'oak') {
    const key = (x, y) => `${x},${y}`;
    const idx = new Map(), nodes = [];
    const node = (x, y) => { const k = key(x, y); if (!idx.has(k)) { idx.set(k, nodes.length); nodes.push([x, y]); } return idx.get(k); };
    for (let x = 0; x < BR.cols; x++) node(x, 0);
    const mem = [];
    for (let x = 0; x < BR.cols - 1; x++) mem.push({ x1: x, y1: 0, x2: x + 1, y2: 0, mat: deckMat, deck: true });
    for (const m of design.members || []) mem.push({ ...m, deck: false });
    const members = mem.map((m) => ({ a: node(m.x1, m.y1), b: node(m.x2, m.y2), EA: mat(m.mat).EA }));
    return { nodes, mem, members, supports: { [idx.get('0,0')]: 'pin', [idx.get(`${BR.cols - 1},0`)]: 'roller' }, deckNode: (x) => idx.get(key(x, 0)) };
  }
  function cleanBridge(design) {
    const out = [], seen = new Set();
    for (const m of (design && design.members) || []) {
      let x1 = Math.round(num(m.x1, -1)), y1 = Math.round(num(m.y1, -1)), x2 = Math.round(num(m.x2, -1)), y2 = Math.round(num(m.y2, -1));
      const ok = [x1, x2].every((v) => v >= 0 && v < BR.cols) && [y1, y2].every((v) => v >= 0 && v < BR.rows);
      if (!ok || (x1 === x2 && y1 === y2)) continue;
      if (y1 === 0 && y2 === 0 && Math.abs(x1 - x2) === 1) continue; // deck already there
      if (Math.hypot(x2 - x1, y2 - y1) > BR.maxLen) continue;
      if (x1 > x2 || (x1 === x2 && y1 > y2)) { [x1, x2] = [x2, x1]; [y1, y2] = [y2, y1]; }
      const k = `${x1},${y1},${x2},${y2}`; if (seen.has(k)) continue; seen.add(k);
      out.push({ x1, y1, x2, y2, mat: mat(m.mat).id });
      if (out.length >= 40) break;
    }
    return { members: out };
  }
  function bridgeCase(p, model, xLoad) {
    const loads = {};
    const add = (x, fy) => { const i = model.deckNode(x); loads[i] = loads[i] || [0, 0]; loads[i][1] += fy; };
    for (let x = 1; x < BR.cols - 1; x++) add(x, -p.D);
    if (xLoad !== null) {
      const i0 = Math.min(BR.cols - 2, Math.floor(xLoad)), f = xLoad - i0; // split the cart between the two deck joints
      add(i0, -p.Pl * (1 - f)); add(i0 + 1, -p.Pl * f);
    }
    return loads;
  }
  const bridge = {
    id: 'bridge', num: 4, unit: 6, title: 'Creek Truss Bridge', character: 'captain', flagship: true,
    tagline: 'Design a truss that carries the hay cart across the creek.',
    story: 'The creek splits the north pasture from the hay barn. Captain leads the herd across the oak deck while a loaded hay cart rolls over it. The deck alone will sag and snap; build a truss on top of it. Tap a joint, then another, to add a member. Every member is pinned at both ends, so it only pushes or pulls.',
    objective: 'Carry the dead load plus the moving cart at every position. Stars: it holds, it is under budget, and your force prediction is close.',
    scenario(seed) {
      const r = rng(seed * 31 + 4);
      return { D: 0.6, Pl: seed === 1 ? 2.5 : step(r, 2.2, 3.0, 0.1), budget: 0, predMember: null, positions: 25, span: BR.cols - 1 };
    },
    materials: MATERIALS, grid: BR, capC, model: bridgeModel, clean: (p, d) => cleanBridge(d),
    controls: () => [],
    defaults: () => ({ members: [] }),
    predict: { label: 'Force in the deck member from x = 2 m to 3 m (cart at mid-span)', unit: 'kN', tol: { rel: 0.05, abs: 0.1 }, hint: 'Cut a section through that panel and take moments about the joint above it (exact for a statically determinate truss). Tension +, compression −.' },
    // Budget = cost of the teacher's Pratt truss after upgrading only the members that need it, plus 5%, rounded up to $5.
    budgetFor(p) {
      const key = `${p.D}|${p.Pl}`; this._b = this._b || {};
      if (this._b[key]) return this._b[key];
      const d = { members: bridge.referenceDesign().members.map((m) => ({ ...m, mat: 'pine' })) };
      const order = ['pine', 'oak', 'steel'];
      for (let it = 0; it < 60; it++) {
        const a = this.analyze(p, d, { positions: 13 });
        if (!a.firstFail && this.analyze(p, d).firstFail === null) break;
        let w = -1, wu = 1;
        a.util.forEach((u, i) => { if (!a.model.mem[i].deck && u > wu) { wu = u; w = i; } });
        if (w < 0) break;
        const mm = d.members[w - (BR.cols - 1)], k = order.indexOf(mm.mat);
        if (k >= order.length - 1) break;
        mm.mat = order[k + 1];
      }
      const cost = this.analyze(p, d, { positions: 13 }).cost;
      return (this._b[key] = Math.ceil((cost * 1.05) / 5) * 5);
    },
    analyze(p, d0, opts = {}) {
      const d = cleanBridge(d0), model = bridgeModel(d);
      const lens = model.mem.map((m) => Math.hypot(m.x2 - m.x1, m.y2 - m.y1));
      const cost = round(model.mem.reduce((s, m, i) => s + (m.deck ? 0 : mat(m.mat).cost * lens[i]), 0), 2);
      const base = { design: d, model, lens, cost };
      const probe = P.solveTruss({ nodes: model.nodes, members: model.members, supports: model.supports, loads: bridgeCase(p, model, 3) });
      const det = { m: probe.m, r: probe.r, j: probe.j, determinacy: probe.determinacy };
      if (!probe.stable) return { ...base, ...det, stable: false };
      const n = opts.positions || p.positions, cases = [];
      const env = model.mem.map(() => ({ maxT: 0, maxC: 0 }));
      let firstFail = null, maxUtil = 0, util = model.mem.map(() => 0);
      for (let k = 0; k < n; k++) {
        const xl = (k * p.span) / (n - 1);
        const sol = P.solveTruss({ nodes: model.nodes, members: model.members, supports: model.supports, loads: bridgeCase(p, model, xl) });
        const u = sol.forces.map((N, i) => { const m = mat(model.mem[i].mat); return N >= 0 ? N / m.T : -N / capC(m, lens[i]); });
        sol.forces.forEach((N, i) => { env[i].maxT = Math.max(env[i].maxT, N); env[i].maxC = Math.min(env[i].maxC, N); util[i] = Math.max(util[i], u[i]); });
        const worst = Math.max(...u);
        maxUtil = Math.max(maxUtil, worst);
        if (worst > 1 && !firstFail) firstFail = { x: xl, k, members: u.map((v, i) => (v > 1 ? i : -1)).filter((i) => i >= 0), forces: sol.forces };
        if (opts.keepCases) cases.push({ x: xl, forces: sol.forces, util: u, disp: sol.disp });
      }
      const mid = P.solveTruss({ nodes: model.nodes, members: model.members, supports: model.supports, loads: bridgeCase(p, model, 3) });
      return { ...base, ...det, stable: true, env, util, maxUtil, firstFail, cases, mid, sf: maxUtil > 0 ? 1 / maxUtil : Infinity };
    },
    evaluate(p, d0) {
      const a = this.analyze(p, d0);
      const budget = this.budgetFor(p);
      const pm = a.model.mem.findIndex((m) => m.deck && m.x1 === 2); // deck member from x = 2 m to x = 3 m
      if (!a.stable) {
        return { design: a.design, ok: false, fail: 'mechanism', cost: a.cost, efficient: false, actual: NaN, effNote: `Budget $${budget}.`,
          values: { Members: `${a.m} (m)`, 'Support reactions': `${a.r} (r)`, Joints: `${a.j} (j)`, 'm + r vs 2j': `${a.m + a.r} vs ${2 * a.j}`, Cost: `$${a.cost}` }, analysis: a, budget };
      }
      const ok = !a.firstFail;
      return {
        design: a.design, ok, fail: ok ? null : 'overload', cost: a.cost, efficient: ok && a.cost <= budget, budget,
        actual: a.mid.forces[pm], predIndex: pm,
        effNote: `Budget star: cost at most $${budget} (yours $${a.cost}).`,
        values: { 'Safety factor': ok ? `${round(a.sf, 2)}` : `${round(a.sf, 2)} (below 1: fails)`, 'Worst member use': `${Math.round(a.maxUtil * 100)}%`, Cost: `$${a.cost} (budget $${budget})`, 'm + r vs 2j': `${a.m} + ${a.r} = ${a.m + a.r} vs ${2 * a.j} (${a.determinacy})`, 'Deck force x = 2–3 m (cart at mid-span)': `${round(a.mid.forces[pm], 3)} kN` },
        analysis: a,
      };
    },
    debrief(p, res) {
      const a = res.analysis;
      if (!a.stable) return [
        `A truss needs enough members to stop its joints from swinging: count m + r against 2j. Here m + r = ${a.m + a.r} and 2j = ${2 * a.j}.`,
        a.m + a.r < 2 * a.j ? 'Fewer unknowns than joint equations means a mechanism: some panel is a four-sided frame with no diagonal, and it folds.' : 'Even with enough members, they must be arranged in triangles. A rectangle panel without a diagonal folds no matter how many members are elsewhere.',
        'Fix: make every panel a triangle. Start from the pin and add one new joint with two new members at a time.',
      ];
      const lines = [
        'Each joint is a particle: ΣFx = 0, ΣFy = 0. The solver writes those for every joint at once (2j equations) and finds the member forces and support reactions.',
        `With the cart at mid-span the deck member from x = 2 to 3 m carries ${round(res.actual, 3)} kN (${res.actual >= 0 ? 'tension' : 'compression'}). A section cut through that panel shows why: the bending moment there is carried as a couple by the top and bottom chords, so deeper trusses have smaller chord forces.`,
        'Long members in compression buckle (capacity ∝ 1/L²), so put short or stronger members where the force pushes, and cheap pine where it pulls.',
      ];
      if (a.firstFail) lines.push(`It first failed with the cart at x = ${round(a.firstFail.x, 2)} m. Check the red members and either shorten them, switch material, or add depth.`);
      return lines;
    },
  };
  bridge.referenceDesign = () => ({ members: [
    // A 1 m deep Pratt-like truss with oak top chord: the "teacher" design used to sanity-check the budget
    { x1: 0, y1: 0, x2: 1, y2: 1, mat: 'oak' }, { x1: 1, y1: 1, x2: 2, y2: 1, mat: 'oak' }, { x1: 2, y1: 1, x2: 3, y2: 1, mat: 'oak' },
    { x1: 3, y1: 1, x2: 4, y2: 1, mat: 'oak' }, { x1: 4, y1: 1, x2: 5, y2: 1, mat: 'oak' }, { x1: 5, y1: 1, x2: 6, y2: 0, mat: 'oak' },
    { x1: 1, y1: 0, x2: 1, y2: 1, mat: 'pine' }, { x1: 2, y1: 0, x2: 2, y2: 1, mat: 'pine' }, { x1: 3, y1: 0, x2: 3, y2: 1, mat: 'pine' },
    { x1: 4, y1: 0, x2: 4, y2: 1, mat: 'pine' }, { x1: 5, y1: 0, x2: 5, y2: 1, mat: 'pine' },
    { x1: 1, y1: 1, x2: 2, y2: 0, mat: 'pine' }, { x1: 2, y1: 1, x2: 3, y2: 0, mat: 'pine' }, { x1: 3, y1: 0, x2: 4, y2: 1, mat: 'pine' }, { x1: 4, y1: 0, x2: 5, y2: 1, mat: 'pine' },
  ] });

  /* ---------------- 5. A-frame Hay Rack (Unit 7: frames and machines) ---------------- */
  const TIES = [
    { id: 'twine', name: 'Baling twine', cap: 0.5, cost: 1 },
    { id: 'sisal', name: 'Sisal rope', cap: 0.9, cost: 3 },
    { id: 'chain', name: 'Chain', cap: 2.5, cost: 10 },
  ];
  const aframe = {
    id: 'aframe', num: 5, unit: 7, title: 'A-frame Hay Rack', character: 'juniper',
    tagline: 'Two legs, one pin, one tie that must not snap.',
    story: 'Juniper wants hay off the ground. The rack is two 2 m tall legs pinned at the top with the hay net hanging from the pin, on a slick barn floor (no friction at the feet). A tie between the legs stops them from doing the splits. The wider the rack, the more hay it holds; the herd needs at least the target load.',
    objective: 'Hold the required hay with a tie that stays under its rating and at least 0.9 m clearance under it for the kids. Bonus: cheapest tie that can work.',
    scenario(seed) { const r = rng(seed * 41 + 5); return { H: 2, Preq: seed === 1 ? 1.6 : step(r, 1.4, 2.0, 0.1), perWidth: 1.0, clear: 0.9 }; },
    controls: () => [
      { key: 'b', label: 'Half-spread b (foot to centre)', min: 0.4, max: 1.4, step: 0.05, unit: 'm' },
      { key: 'yt', label: 'Tie height', min: 0.3, max: 1.7, step: 0.05, unit: 'm' },
      { key: 'tie', label: 'Tie', type: 'select', options: TIES.map((x) => ({ value: x.id, label: `${x.name} (${x.cap} kN, $${x.cost})` })) },
    ],
    defaults: () => ({ b: 0.6, yt: 1.4, tie: 'twine' }),
    predict: { label: 'Tension in the tie', unit: 'kN', tol: { rel: 0.03, abs: 0.01 }, hint: 'Take moments about the apex pin for one leg. The floor pushes straight up with P/2.' },
    clean: (p, d) => ({ b: clamp(round(num(d.b, 0.8), 2), 0.4, 1.4), yt: clamp(round(num(d.yt, 1), 2), 0.3, 1.7), tie: TIES.some((x) => x.id === d.tie) ? d.tie : 'twine' }),
    tension: (p, b, yt) => (b * p.Preq) / (2 * (p.H - yt)), // ΣM about apex, one leg: (P/2)·b = T·(H − yt)
    evaluate(p, d0) {
      const d = this.clean(p, d0), tie = TIES.find((x) => x.id === d.tie);
      const holds = p.perWidth * 2 * d.b; // hay capacity in kN
      const T = this.tension(p, d.b, d.yt);
      let fail = null;
      if (holds + 1e-9 < p.Preq) fail = 'small';
      else if (d.yt + 1e-9 < p.clear) fail = 'clearance';
      else if (T > tie.cap) fail = 'snap';
      const bMin = p.Preq / (2 * p.perWidth), Tmin = this.tension(p, bMin, p.clear);
      const cheapest = TIES.filter((x) => x.cap >= Tmin).sort((a, c) => a.cost - c.cost)[0];
      return {
        design: d, ok: !fail, fail, actual: T, cost: tie.cost, efficient: !fail && tie.cost <= cheapest.cost,
        effNote: `Cheapest tie that can work: ${cheapest.name} (best case b = ${round(bMin, 2)} m with the tie at ${p.clear} m gives T = ${round(Tmin, 3)} kN).`,
        values: { 'Hay capacity': `${round(holds, 2)} kN (need ${p.Preq})`, 'Tie tension': `${round(T, 3)} kN (rating ${tie.cap})`, 'Floor reaction per foot': `${round(p.Preq / 2, 2)} kN`, 'Clearance under tie': `${d.yt} m (need ${p.clear})` },
        T, tie,
      };
    },
    debrief(p, res) {
      const d = res.design;
      return [
        `Whole rack: the floor has no friction, so each foot pushes straight up with ${round(p.Preq / 2, 2)} kN (half the hay).`,
        `One leg as a free body: the foot force, the tie pulling inward, and the pin force at the apex. ΣM about the apex: (P/2)·b = T·(H − y_t), so T = ${round(p.Preq / 2, 2)}·${d.b} / ${round(p.H - d.yt, 2)} = ${round(res.T, 3)} kN.`,
        'A low tie has a longer lever arm to the apex, so it needs less tension. That is why a ladder’s spreader sits low.',
      ];
    },
  };

  /* ---------------- 6. Loading Ramp (Unit 8: friction) ---------------- */
  const SURFACES = [
    { id: 'plywood', name: 'Bare plywood', mu: 0.35, cost: 0 },
    { id: 'rubber', name: 'Rubber mat', mu: 0.6, cost: 25 },
    { id: 'cleats', name: 'Wooden cleats', mu: 0.85, cost: 40 },
  ];
  const ramp = {
    id: 'ramp', num: 6, unit: 8, title: 'Loading Ramp', character: 'clove',
    tagline: 'Get a goat into the trailer without slipping.',
    story: 'Show day! Clove has to walk up into the trailer. The ramp board is at most 3 m long, goats balk at anything steeper than 35°, and hooves slide on bare plywood. Choose the ramp angle and the surface. Lumber costs $12 per metre.',
    objective: 'Clove walks up without slipping (static friction can hold her). Bonus: within 2% of the cheapest working ramp.',
    scenario(seed) { const r = rng(seed * 53 + 6); return { h: seed === 1 ? 0.9 : step(r, 0.6, 1.0, 0.05), m: seed === 1 ? 45 : step(r, 35, 60, 1), Lmax: 3, thMax: 35, lumber: 12 }; },
    controls: () => [
      { key: 'th', label: 'Ramp angle', min: 10, max: 45, step: 0.5, unit: '°' },
      { key: 'surface', label: 'Surface', type: 'select', options: SURFACES.map((x) => ({ value: x.id, label: `${x.name} (μs ${x.mu}, $${x.cost})` })) },
    ],
    defaults: () => ({ th: 30, surface: 'plywood' }),
    predict: { label: 'Friction force needed to hold Clove still on the ramp', unit: 'N', tol: { rel: 0.03 }, hint: 'Resolve the weight along the slope: F = W sin θ.' },
    clean: (p, d) => ({ th: clamp(round(num(d.th, 25), 2), 10, 45), surface: SURFACES.some((x) => x.id === d.surface) ? d.surface : 'plywood' }),
    costOf(p, th, s) { return round((p.lumber * p.h) / Math.sin(rad(th)) + s.cost, 2); },
    evaluate(p, d0) {
      const d = this.clean(p, d0), s = SURFACES.find((x) => x.id === d.surface);
      const W = p.m * G, th = rad(d.th), L = p.h / Math.sin(th);
      const need = W * Math.sin(th), Nf = W * Math.cos(th), avail = s.mu * Nf;
      let fail = null;
      if (L > p.Lmax + 1e-9) fail = 'short';
      else if (d.th > p.thMax + 1e-9) fail = 'steep';
      else if (need > avail) fail = 'slip';
      const cost = this.costOf(p, d.th, s);
      let best = Infinity;
      for (const sf of SURFACES) {
        const thLo = Math.max(deg(Math.asin(Math.min(1, p.h / p.Lmax))), 10);
        const thHi = Math.min(p.thMax, deg(Math.atan(sf.mu)));
        if (thHi >= thLo) best = Math.min(best, this.costOf(p, thHi, sf)); // steepest allowed angle is cheapest (shortest board)
      }
      return {
        design: d, ok: !fail, fail, actual: need, cost, efficient: !fail && cost <= best * 1.02,
        effNote: `Cheapest working ramp costs about $${round(best, 2)}.`,
        values: { 'Board length': `${round(L, 2)} m (max ${p.Lmax})`, 'Friction needed W·sinθ': `${round(need, 1)} N`, 'Friction available μs·N': `${round(avail, 1)} N`, 'Normal force W·cosθ': `${round(Nf, 1)} N`, 'Slip angle for this surface': `${round(deg(Math.atan(s.mu)), 1)}°`, Cost: `$${cost}` },
        need, avail, Nf, L, s,
      };
    },
    debrief(p, res) {
      const d = res.design;
      return [
        `Tilt your axes along the ramp. Weight W = ${round(p.m * G, 1)} N splits into W·sinθ = ${round(res.need, 1)} N down the slope and W·cosθ = ${round(res.Nf, 1)} N into it.`,
        `Static friction can supply up to μs·N = ${res.s.mu}·${round(res.Nf, 1)} = ${round(res.avail, 1)} N. She holds if W·sinθ ≤ μs·W·cosθ, which simplifies to tanθ ≤ μs. Weight cancels: a heavy goat and a light kid slip at the same angle (${round(deg(Math.atan(res.s.mu)), 1)}° here).`,
        `A steeper ramp is shorter and cheaper (L = h/sinθ = ${round(res.L, 2)} m) but needs a grippier surface. Engineering is the trade-off.`,
      ];
    },
  };

  /* ---------------- 7. Shade Shelter (Unit 9: centroids, tipping) ---------------- */
  const shade = {
    id: 'shade', num: 7, unit: 9, title: 'Shade Shelter', character: 'twins',
    tagline: 'Keep the kids’ shelter from tipping in a Texas gust.',
    story: 'The kids nap under a skid-mounted shade shelter. A gust from the left pushes on the roof and tries to tip it over its right-hand skid. Add concrete blocks (25 kg each, $6) to the skid and slide them along the base to move the centre of gravity.',
    objective: 'The restoring moment about the right skid must beat the wind’s overturning moment. Bonus: the fewest blocks possible.',
    scenario(seed) { const r = rng(seed * 61 + 7); return { B: 2, frame: { m: 40, x: 1, y: 1.1 }, roof: { m: 30, x: 1, y: 2.3 }, block: 25, F: seed === 1 ? 0.45 : step(r, 0.35, 0.6, 0.05), hw: 2.3 }; },
    controls: () => [
      { key: 'n', label: 'Number of blocks', min: 0, max: 4, step: 1, unit: '' },
      { key: 'xb', label: 'Block position', min: 0, max: 2, step: 0.05, unit: 'm' },
    ],
    defaults: () => ({ n: 0, xb: 1 }),
    predict: { label: 'Horizontal position of the combined centre of gravity', unit: 'm', tol: { abs: 0.03 }, hint: 'x̄ = Σ m·x / Σ m over frame, roof and blocks.' },
    clean: (p, d) => ({ n: clamp(Math.round(num(d.n, 0)), 0, 4), xb: clamp(round(num(d.xb, 1), 2), 0, p.B) }),
    moments(p, n, xb) {
      const mt = p.frame.m + p.roof.m + n * p.block;
      const xbar = (p.frame.m * p.frame.x + p.roof.m * p.roof.x + n * p.block * xb) / mt;
      const restoring = mt * G * (p.B - xbar) / 1000; // kN·m about the leeward (right) skid
      const overturning = p.F * p.hw;
      return { mt, xbar, restoring, overturning };
    },
    evaluate(p, d0) {
      const d = this.clean(p, d0), m = this.moments(p, d.n, d.xb);
      const ok = m.restoring >= m.overturning;
      let nMin = null; for (let n = 0; n <= 4 && nMin === null; n++) if (this.moments(p, n, 0).restoring >= m.overturning) nMin = n;
      return {
        design: d, ok, fail: ok ? null : 'tip', actual: m.xbar, cost: d.n * 6, efficient: ok && d.n <= nMin,
        effNote: `Fewest blocks that can work: ${nMin} (placed at the windward end, x = 0).`,
        values: { 'Combined x̄': `${round(m.xbar, 3)} m`, 'Total mass': `${m.mt} kg`, 'Restoring moment': `${round(m.restoring, 3)} kN·m`, 'Overturning moment': `${round(m.overturning, 3)} kN·m`, 'Safety factor': `${round(m.restoring / m.overturning, 2)}` },
        m, nMin,
      };
    },
    debrief(p, res) {
      const d = res.design, m = res.m;
      return [
        `Combined centre of gravity: x̄ = (40·1 + 30·1 + ${d.n}·25·${d.xb}) / ${m.mt} = ${round(m.xbar, 3)} m.`,
        `About the right skid (x = ${p.B} m), gravity restores with W·(${p.B} − x̄) = ${round(m.mt * G / 1000, 3)}·${round(p.B - m.xbar, 3)} = ${round(m.restoring, 3)} kN·m. The gust overturns with F·h = ${p.F}·${p.hw} = ${round(m.overturning, 3)} kN·m.`,
        'Weight far from the tipping edge has the longest lever arm. A block at the windward end is worth more than two blocks in the middle.',
      ];
    },
  };

  const LEVELS = [hoist, seesaw, trough, bridge, aframe, ramp, shade];
  const byId = Object.fromEntries(LEVELS.map((l) => [l.id, l]));

  // Authoritative scoring: stars = [success, efficiency, prediction].
  function score(levelId, seed, design, prediction) {
    const L = byId[levelId]; if (!L) throw new Error('unknown level');
    const s = Math.max(1, Math.min(1e6, Math.floor(num(seed, 1))));
    const p = L.scenario(s);
    const res = L.evaluate(p, design || L.defaults(p));
    const predGiven = prediction !== null && prediction !== undefined && prediction !== '' && Number.isFinite(Number(prediction));
    const predOk = predGiven && Number.isFinite(res.actual) && P.within(Number(prediction), res.actual, L.predict.tol);
    const predErr = predGiven && Number.isFinite(res.actual) && res.actual !== 0 ? Math.abs(Number(prediction) - res.actual) / Math.abs(res.actual) : null;
    const stars = [!!res.ok, !!(res.ok && res.efficient), !!(res.ok && predOk)];
    return { level: L.id, seed: s, params: p, result: res, predGiven, predOk, predErr, stars, starCount: stars.filter(Boolean).length };
  }

  return { LEVELS, byId, score, MATERIALS, ROPES, POSTS, TIES, SURFACES, capC, bridgeModel, cleanBridge, bridgeCase };
});
