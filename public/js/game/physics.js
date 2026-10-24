/* StaticsForEngineers game physics (shared by the browser and the server).
 * 2D pin-jointed truss solver by the direct stiffness method, plus small helpers.
 * Units: lengths in m, forces in kN (any consistent set works). Tension is positive.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFEPhysics = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const G = 9.81;

  // Gaussian elimination with partial pivoting on a copy. Returns null if singular (mechanism).
  function solveLinear(A, b, relTol = 1e-9) {
    const n = b.length;
    const M = A.map((row, i) => row.slice().concat([b[i]]));
    let scale = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) scale = Math.max(scale, Math.abs(A[i][j]));
    if (n && scale === 0) return null;
    const tol = relTol * scale;
    for (let c = 0; c < n; c++) {
      let p = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      if (Math.abs(M[p][c]) <= tol) return null;
      if (p !== c) { const t = M[p]; M[p] = M[c]; M[c] = t; }
      for (let r = c + 1; r < n; r++) {
        const f = M[r][c] / M[c][c];
        if (f === 0) continue;
        for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
      }
    }
    const x = new Array(n).fill(0);
    for (let r = n - 1; r >= 0; r--) {
      let s = M[r][n];
      for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
      x[r] = s / M[r][r];
    }
    return x;
  }

  /**
   * Solve a 2D truss.
   * nodes:    [[x, y], ...]
   * members:  [[a, b], ...] or [{ a, b, EA }]  (node indices)
   * supports: { nodeIndex: 'pin' | 'roller' | 'rollerX' }  pin fixes x and y; roller fixes y; rollerX fixes x
   * loads:    { nodeIndex: [Fx, Fy] }
   * Returns { stable, forces[], reactions{}, disp[], m, r, j, determinacy } (forces null if unstable).
   */
  function solveTruss({ nodes, members, supports = {}, loads = {}, EA = 1e5 }) {
    const j = nodes.length, n = 2 * j;
    const mem = members.map((m) => (Array.isArray(m) ? { a: m[0], b: m[1], EA } : { EA, ...m }));
    const fixed = new Array(n).fill(false);
    let r = 0;
    for (const [k, type] of Object.entries(supports)) {
      const i = Number(k);
      if (type === 'pin') { fixed[2 * i] = fixed[2 * i + 1] = true; r += 2; }
      else if (type === 'roller') { fixed[2 * i + 1] = true; r += 1; }
      else if (type === 'rollerX') { fixed[2 * i] = true; r += 1; }
    }
    const m = mem.length;
    const determinacy = m + r < n ? 'unstable' : m + r === n ? 'determinate' : 'indeterminate';
    const K = Array.from({ length: n }, () => new Array(n).fill(0));
    const geo = mem.map(({ a, b, EA: ea }) => {
      const dx = nodes[b][0] - nodes[a][0], dy = nodes[b][1] - nodes[a][1];
      const L = Math.hypot(dx, dy);
      const c = dx / L, s = dy / L, k = ea / L;
      const d = [2 * a, 2 * a + 1, 2 * b, 2 * b + 1];
      const v = [-c, -s, c, s];
      for (let p = 0; p < 4; p++) for (let q = 0; q < 4; q++) K[d[p]][d[q]] += k * v[p] * v[q];
      return { L, c, s, k, d, v };
    });
    const F = new Array(n).fill(0);
    for (const [k, f] of Object.entries(loads)) { const i = Number(k); F[2 * i] += f[0]; F[2 * i + 1] += f[1]; }
    const free = []; for (let i = 0; i < n; i++) if (!fixed[i]) free.push(i);
    const Kff = free.map((p) => free.map((q) => K[p][q]));
    const uf = free.length ? solveLinear(Kff, free.map((p) => F[p])) : [];
    const base = { m, r, j, determinacy };
    if (!uf) return { ...base, stable: false, forces: null, reactions: null, disp: null };
    const u = new Array(n).fill(0); free.forEach((p, i) => { u[p] = uf[i]; });
    const forces = geo.map((g) => g.k * g.v.reduce((s, vi, p) => s + vi * u[g.d[p]], 0));
    const reactions = {};
    for (const [k] of Object.entries(supports)) {
      const i = Number(k);
      const R = [0, 1].map((t) => { const p = 2 * i + t; return fixed[p] ? K[p].reduce((s, kv, q) => s + kv * u[q], 0) - F[p] : 0; });
      reactions[i] = R;
    }
    return { ...base, stable: true, forces, reactions, disp: nodes.map((_, i) => [u[2 * i], u[2 * i + 1]]), lengths: geo.map((g) => g.L) };
  }

  // Largest out-of-balance force over all joints (should be ~0 for a correct solution).
  function jointResidual({ nodes, members, loads = {} }, sol) {
    const res = nodes.map(() => [0, 0]);
    members.forEach((mm, k) => {
      const a = Array.isArray(mm) ? mm[0] : mm.a, b = Array.isArray(mm) ? mm[1] : mm.b;
      const dx = nodes[b][0] - nodes[a][0], dy = nodes[b][1] - nodes[a][1], L = Math.hypot(dx, dy);
      const N = sol.forces[k];
      res[a][0] += N * dx / L; res[a][1] += N * dy / L; // tension pulls joint a toward b
      res[b][0] -= N * dx / L; res[b][1] -= N * dy / L;
    });
    for (const [k, f] of Object.entries(loads)) { res[k][0] += f[0]; res[k][1] += f[1]; }
    for (const [k, R] of Object.entries(sol.reactions)) { res[k][0] += R[0]; res[k][1] += R[1]; }
    return Math.max(0, ...res.map((v) => Math.hypot(v[0], v[1])));
  }

  // Small seeded RNG so scenarios are reproducible on the server.
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const deg = (r) => (r * 180) / Math.PI, rad = (d) => (d * Math.PI) / 180;
  const round = (x, d = 3) => Math.round(x * 10 ** d) / 10 ** d;
  const within = (pred, actual, tol) => Number.isFinite(pred) && Math.abs(pred - actual) <= Math.max(tol.abs || 0, (tol.rel || 0) * Math.abs(actual));

  return { G, solveLinear, solveTruss, jointResidual, rng, deg, rad, round, within };
});
