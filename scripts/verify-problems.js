#!/usr/bin/env node
'use strict';
// Proofreads every problem generator:
//  1) generic sanity over many seeds (finite answers, rendering, MC integrity, self-grading)
//  2) independent physics checks (different method than the generator) for key problem types
// Scratch database for the assessment-logic checks (set before anything loads src/config).
const os = require('os'), fs = require('fs'), path = require('path');
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'sfe-verify-'));
const C = require('../content');
const { checkNumeric } = require('../content/helpers');
const SEEDS = parseInt(process.env.SEEDS || '300', 10);
const DEG = Math.PI / 180, sd = (d) => Math.sin(d * DEG), cd = (d) => Math.cos(d * DEG);
let problemsFound = 0, checks = 0;
const issues = [];
const bad = (id, seed, msg) => { if (issues.length < 60) issues.push(`${id} seed=${seed}: ${msg}`); };
const close = (a, b, rel = 1e-6) => Math.abs(a - b) <= rel * Math.max(1, Math.abs(a), Math.abs(b));

// ---------- independent solvers ----------
function solve(A, b) { // Gaussian elimination with partial pivoting
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((r, i) => r[n] / r[i]);
}
// Method of joints as one linear system. nodes {name:[x,y]}, members [[a,b]], supports {node:['x','y']} unknown reaction dirs, loads {node:[Fx,Fy]}
function truss(nodes, members, supports, loads) {
  const names = Object.keys(nodes), unk = [];
  members.forEach((m, i) => unk.push({ t: 'm', i }));
  for (const [n, dirs] of Object.entries(supports)) for (const d of dirs) unk.push({ t: 'r', n, d });
  const rows = [], rhs = [];
  for (const n of names) for (const axis of [0, 1]) {
    const row = unk.map((u) => {
      if (u.t === 'm') { const [a, b] = members[u.i]; if (a !== n && b !== n) return 0; const o = a === n ? b : a; const dx = nodes[o][0] - nodes[n][0], dy = nodes[o][1] - nodes[n][1], L = Math.hypot(dx, dy); return (axis ? dy : dx) / L; }
      return u.n === n && ((u.d === 'x' && axis === 0) || (u.d === 'y' && axis === 1)) ? 1 : 0;
    });
    rows.push(row); rhs.push(-((loads[n] || [0, 0])[axis]));
  }
  const x = solve(rows, rhs);
  const out = {}; members.forEach((m, i) => (out[m.join('')] = x[i])); return out;
}
// 1D strip integration (very accurate for piecewise shapes). width(y) = total width of the area at height y.
function strips(width, y0, y1, N = 200000) {
  let A = 0, Sy = 0, Iy0 = 0; const dy = (y1 - y0) / N;
  for (let i = 0; i < N; i++) { const y = y0 + (i + 0.5) * dy, w = width(y) * dy; A += w; Sy += y * w; Iy0 += y * y * w; }
  return { A, cb: Sy / A, I0: Iy0, Ic: Iy0 - A * (Sy / A) ** 2 };
}
function centroidGrid(inside, x0, x1, y0, y1, N = 1400) { // numerical area integration
  let A = 0, Sx = 0, Sy = 0, Ix = 0; const dx = (x1 - x0) / N, dy = (y1 - y0) / N;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const x = x0 + (i + 0.5) * dx, y = y0 + (j + 0.5) * dy; if (inside(x, y)) { A++; Sx += x; Sy += y; Ix += y * y; } }
  const dA = dx * dy; return { A: A * dA, xb: Sx / A, yb: Sy / A, Ix0: Ix * dA };
}

const ind = {
  'u2-two-cables': (g, v) => { const [TA, TC] = v; return [close(-TA * cd(g.a) + TC * cd(g.b), 0, 1e-9 * g.W) || Math.abs(-TA * cd(g.a) + TC * cd(g.b)) < 1e-6, Math.abs(TA * sd(g.a) + TC * sd(g.b) - g.W) < 1e-6]; },
  'u2-3d-three': (g, v) => { const us = [g.A, g.B, g.C].map((p) => { const L = Math.hypot(...p); return p.map((c) => c / L); }); return [0, 1, 2].map((k) => Math.abs(us[0][k] * v[0] + us[1][k] * v[1] + us[2][k] * v[2] - (k === 2 ? g.W : 0)) < 1e-6 * g.W).concat(v.map((t) => t > 0)); },
  'u2-spring': (g, v) => { const [smm, T] = v; const Fs = (smm / 1000) * g.k; return [Math.abs(T * sd(g.th) - g.W) < 1e-6, Math.abs(Fs - T * cd(g.th)) < 1e-6]; },
  'u2-pulley': (g, v) => { const [T] = v; const s = g.h / Math.hypot(g.L / 2, g.h); return [Math.abs(2 * T * s - g.W) < 1e-6]; },
  'u3-cross': (g, v) => { const [r, F] = [g.r, g.F]; // M = r x F via determinant expansion along first row; also check M·r = 0 and M·F = 0
    return [Math.abs(v[0] * r[0] + v[1] * r[1] + v[2] * r[2]) < 1e-9, Math.abs(v[0] * F[0] + v[1] * F[1] + v[2] * F[2]) < 1e-9, Math.abs(Math.hypot(...v) - Math.sqrt(Math.max(0, (r[0] ** 2 + r[1] ** 2 + r[2] ** 2) * (F[0] ** 2 + F[1] ** 2 + F[2] ** 2) - (r[0] * F[0] + r[1] * F[1] + r[2] * F[2]) ** 2))) < 1e-6]; },
  'u3-varignon': (g, v) => { // perpendicular distance method: M = ±F d
    const ux = cd(g.th), uy = sd(g.th); const d = Math.abs(g.x * uy - g.y * ux); const sign = Math.sign(g.x * uy - g.y * ux); return [Math.abs(v[0] - sign * g.F * d) < 1e-6]; },
  'u4-trapezoid': (g, v) => { const N = 20000; let F = 0, M = 0; for (let i = 0; i < N; i++) { const x = (i + 0.5) * g.L / N, w = g.w1 + (g.w2 - g.w1) * x / g.L; F += w * g.L / N; M += x * w * g.L / N; } return [close(v[0], F, 1e-6), close(v[1], M / F, 1e-6)]; },
  'u4-force-couple': (g, v) => { // moment via r x F computed as cross of 3D vectors
    const m = (f) => { const r = [f.x, f.y, 0], F = [f.F * cd(f.t), f.F * sd(f.t), 0]; return r[0] * F[1] - r[1] * F[0]; }; return [Math.abs(v[2] - (m(g.f1) + m(g.f2) + g.C)) < 1e-6]; },
  'u5-angled': (g, v) => { const [Ax, Ay, By] = v; const Px = g.P * cd(g.th), Py = -g.P * sd(g.th); return [Math.abs(Ax + Px) < 1e-9, Math.abs(Ay + By + Py) < 1e-9, Math.abs(By * g.L + g.a * Py) < 1e-9, /* moments about B */ Math.abs(-Ay * g.L + (g.a - g.L) * Py) < 1e-9]; },
  'u5-overhang': (g, v) => { const [Ay, By] = v; return [Math.abs(Ay + By - g.P) < 1e-9, Math.abs(-Ay * g.L - g.P * g.c) < 1e-9 /* about B */]; },
  'u5-boom': (g, v) => { const [T, Ax] = v; const d = Math.hypot(g.L, g.h); const Tx = -T * g.L / d, Ty = T * g.h / d; const Ay = g.W + g.Wb - Ty; // moments about B (x=L): A's vertical reaction and boom weight
    return [Math.abs(Ax + Tx) < 1e-9, Math.abs(-Ay * g.L + g.Wb * g.L / 2) < 1e-6 /* ΣM_B = -Ay L + Wb L/2 (Ax passes through B's line) */]; },
  'u5-cantilever': (g, v) => { const [Ay, MA] = v; const N = 20000; let M = 0; for (let i = 0; i < N; i++) { const x = (i + 0.5) * g.L / N; M += x * g.w * g.L / N; } return [close(Ay, g.w * g.L + g.P), close(MA, M + g.P * g.L, 1e-6)]; },
  'u5-ss-udl': (g, v) => { const [Ay, By] = v; const F = g.w * (g.b - g.a); return [close(Ay + By, F), Math.abs(-Ay * g.L + F * (g.L - (g.a + g.b) / 2)) < 1e-6]; },
  'u6-roof': (g, v) => { const f = truss({ A: [0, 0], B: [g.L / 2, g.h], C: [g.L, 0] }, [['A', 'B'], ['B', 'C'], ['A', 'C']], { A: ['x', 'y'], C: ['y'] }, { B: [0, -g.P] }); return [close(v[0], f.AB), close(v[1], f.AC)]; },
  'u6-right': (g, v) => { const f = truss({ A: [0, 0], B: [g.L, 0], C: [g.L, g.h] }, [['A', 'B'], ['B', 'C'], ['A', 'C']], { A: ['x', 'y'], B: ['y'] }, { C: [g.P, 0] }); return [close(v[0], f.AC), close(v[1], f.BC)]; },
  'u6-wall-bracket': (g, v) => { const f = truss({ A: [0, 0], B: [0, -g.h], C: [g.b, 0] }, [['A', 'C'], ['B', 'C']], { A: ['x', 'y'], B: ['x', 'y'] }, { C: [0, -g.P] }); return [close(v[0], f.AC), close(v[1], f.BC)]; },
};
function pratt(g) {
  const { a, h, P1, P2 } = g;
  return truss({ L0: [0, 0], L1: [a, 0], L2: [2 * a, 0], L3: [3 * a, 0], U1: [a, h], U2: [2 * a, h] },
    [['L0', 'L1'], ['L1', 'L2'], ['L2', 'L3'], ['U1', 'U2'], ['L0', 'U1'], ['U2', 'L3'], ['L1', 'U1'], ['L2', 'U2'], ['U1', 'L2']],
    { L0: ['x', 'y'], L3: ['y'] }, { L1: [0, -P1], L2: [0, -P2] });
}
Object.assign(ind, {
  'u6-pratt-joint': (g, v) => { const f = pratt(g); return [close(v[0], f.L0U1), close(v[1], f.L0L1), close(v[2], f.L1U1)]; },
  'u6-sections': (g, v) => { const f = pratt(g); return [close(v[0], f.U1U2), close(v[1], f.U1L2), close(v[2], f.L1L2)]; },
  'u6-pratt-reactions': (g, v) => { const [R0, R3] = v; return [close(R0 + R3, g.P1 + g.P2), Math.abs(R3 * 3 * g.a - g.P1 * g.a - g.P2 * 2 * g.a) < 1e-9]; },
  'u7-strut': (g, v) => { // solve bar AC as a 3x3 system: unknowns Ax, Ay, F (strut compression along D->B)
    const s = Math.hypot(g.b, g.h), ux = g.b / s, uy = g.h / s;
    const x = solve([[1, 0, ux], [0, 1, uy], [0, 0, g.b * uy]], [0, g.P, g.P * g.L]); return [close(v[0], x[2]), close(v[1], x[0]), close(v[2], x[1])]; },
  'u7-aframe': (g, v) => { // full 2-member solve: left leg unknowns Cx, Cy at apex (from right leg), T, N
    const { b, H, yt, P } = g; const xt = b * yt / H;
    // left leg: N up at (0,0); T at (xt, yt) pointing +x; apex force (Cx, Cy) at (b, H) incl. half the load by symmetry -> Cy + N = 0? solve 3 eqs with unknowns Cx, Cy, T given N = P/2
    const N = P / 2; const x = solve([[1, 0, 1], [0, 1, 0], [-H, b, -yt]], [0, -N, -(0 * N)]);
    // eq3: moments about foot: apex force (Cx,Cy) at (b,H): b*Cy - H*Cx ; T at (xt,yt): -yt*T ; N at foot: 0
    return [close(v[0], N), close(v[1], x[2], 1e-6)]; },
  'u7-gerber': (g, v) => { const [By, Ay, MA] = v; // whole beam: ΣFy, ΣM about A; hinge: moment of CB about C = 0
    return [close(Ay + By, g.P), Math.abs(MA + By * (g.a + g.c) - g.P * (g.a + g.e)) < 1e-6, Math.abs(By * g.c - g.P * g.e) < 1e-9]; },
  'u8-wedge': (g, v) => { // solve the 2-body system as a linear system in N1, Nw, N2, P
    const al = g.al * DEG, mu = g.mu, W = g.W;
    // block: x: Nw + N1(sin a + mu cos a) = 0 ; y: N1(cos a - mu sin a) - W = 0
    // wedge: y: N2 - N1(cos a - mu sin a) = 0 ; x: P - mu N2 - N1(sin a + mu cos a) = 0
    const x = solve([[Math.sin(al) + mu * Math.cos(al), 1, 0, 0], [Math.cos(al) - mu * Math.sin(al), 0, 0, 0], [-(Math.cos(al) - mu * Math.sin(al)), 0, 1, 0], [-(Math.sin(al) + mu * Math.cos(al)), 0, -mu, 1]], [0, W, 0, 0]);
    return [close(v[0], x[3])]; },
  'u8-ladder': (g, v) => { const th = v[0]; const L = 1, W = 1; const Nw = W * (L / 2) * cd(th) / (L * sd(th)); return [Math.abs(Nw - g.mu * W) < 1e-9]; },
  'u8-tip': (g, v) => { const P = v[0]; const slipOK = P <= g.mu * g.W + 1e-9, tipOK = P * g.hP <= g.W * g.b / 2 + 1e-9; return [slipOK && tipOK, Math.abs(P - g.mu * g.W) < 1e-9 || Math.abs(P * g.hP - g.W * g.b / 2) < 1e-9]; },
  'u8-incline-up': (g, v) => { const N = g.W * cd(g.th); return [Math.abs(v[0] - g.W * sd(g.th) - g.mu * N) < 1e-9]; },
  'u8-incline-hold': (g, v) => { const N = g.W * cd(g.th); return [Math.abs(v[0] + g.mu * N - g.W * sd(g.th)) < 1e-9, v[0] > 0]; },
  'u9-L': (g, v) => { const ry = strips((y) => (y < g.t ? g.B : g.t), 0, g.H), rx = strips((x) => (x < g.t ? g.H : g.t), 0, g.B); return [close(v[0], rx.cb, 1e-5), close(v[1], ry.cb, 1e-5)]; },
  'u9-T': (g, v) => { const r = strips((y) => (y < g.hw ? g.tw : g.bf), 0, g.hw + g.tf); return [close(v[0], r.cb, 1e-5)]; },
  'u9-hole': (g, v) => { const r = centroidGrid((x, y) => Math.hypot(x - g.xc, y - g.yc) > g.rad, 0, g.b, 0, g.h, 900); return [close(v[0], r.xb, 3e-3), close(v[1], r.yb, 3e-3)]; },
  'u9-rect-tri': (g, v) => { const ry = strips((y) => (y <= g.h ? g.b : g.b * (1 - (y - g.h) / g.ht)), 0, g.h + g.ht), rx = strips((x) => g.h + g.ht * (1 - x / g.b), 0, g.b); return [close(v[0], rx.cb, 1e-5), close(v[1], ry.cb, 1e-5)]; },
  'u9-semi': (g, v) => { const R = g.b / 2; const r = strips((y) => (y <= g.h ? g.b : 2 * Math.sqrt(Math.max(0, R * R - (y - g.h) ** 2))), 0, g.h + R); return [close(v[0], r.cb, 1e-5)]; },
  'u9-integral': (g, v) => { const rx = strips((x) => g.h * Math.pow(x / g.a, g.n), 0, g.a), ry = strips((y) => g.a * (1 - Math.pow(y / g.h, 1 / g.n)), 0, g.h); return [close(v[0], rx.cb, 1e-4), close(v[1], ry.cb, 1e-4)]; },
  'u10-T': (g, v) => { const r = strips((y) => (y < g.hw ? g.tw : g.bf), 0, g.hw + g.tf); return [close(v[0], r.cb, 1e-5), close(v[1] * 1e6, r.Ic, 1e-4)]; },
  'u10-Ibeam': (g, v) => { const r = strips((y) => (y < g.tf || y > g.tf + g.hw ? g.bf : g.tw), 0, g.hw + 2 * g.tf); return [close(v[0] * 1e6, r.Ic, 1e-4)]; },
  'u10-triangle': (g, v) => { const r = strips((y) => g.b * (1 - y / g.h), 0, g.h); return [close(v[0] * 1e6, r.Ic, 1e-4), close(v[1] * 1e6, r.I0, 1e-4)]; },
  'u10-tube': (g, v) => { const ro = g.Do / 2, ri = ro - g.t; const chord = (R, y) => 2 * Math.sqrt(Math.max(0, R * R - y * y)); const r = strips((y) => chord(ro, y) - chord(ri, y), -ro, ro, 400000); return [close(v[0] * 1e6, r.I0, 2e-4)]; },
});

// ---------- independent checks for the math-toolkit problems ----------
const atan2d = (y, x) => { const t = Math.atan2(y, x) / DEG; return t < 0 ? t + 360 : t; };
const dot3 = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const norm = (a) => Math.sqrt(dot3(a, a));
const angClose = (a, b, tol = 1e-6) => Math.abs(((a - b + 540) % 360) - 180) < tol;
Object.assign(ind, {
  // trig: rebuild the triangle and check it with Pythagoras + the defining ratio, not with the generator's formula
  'm-trig-sides': (g, v) => [close(v[0] ** 2 + v[1] ** 2, g.H ** 2), close(Math.atan2(v[0], v[1]) / DEG, g.th)],
  'm-trig-legs': (g, v) => [close(v[0] * cd(v[1]), g.a), close(v[0] * sd(v[1]), g.b)],
  'm-trig-cable': (g, v) => [close(v[1] ** 2, v[0] ** 2 + g.d ** 2), close(v[0] / g.d, Math.tan(g.th * DEG))],
  // inverse trig: the angle must reproduce the point's direction (unit-circle test), in [0, 360)
  'm-inv-atan2': (g, v) => { const r = Math.hypot(g.x, g.y); return [Math.abs(r * cd(v[0]) - g.x) < 1e-6 * r, Math.abs(r * sd(v[0]) - g.y) < 1e-6 * r, v[0] >= 0 && v[0] < 360]; },
  'm-inv-ref': (g, v) => { const r = Math.hypot(g.x, g.y); return [Math.abs(r * cd(v[1]) - g.x) < 1e-6 * r, Math.abs(r * sd(v[1]) - g.y) < 1e-6 * r, v[0] >= 0 && v[0] <= 90, close(Math.tan(v[0] * DEG), Math.abs(g.y / g.x))]; },
  'm-inv-obtuse': (g, v) => [v[0] > 90 && v[0] < 180, g.kind === 'sin' ? Math.abs(sd(v[0]) - g.s) < 1e-9 : Math.abs(cd(v[0]) - g.c) < 1e-9],
  // law of sines/cosines: place the triangle in coordinates and measure it
  'm-lsc-cos-side': (g, v) => { const B = [g.a, 0], A = [g.b * cd(g.C), g.b * sd(g.C)]; return [close(v[0], Math.hypot(A[0] - B[0], A[1] - B[1]))]; },
  'm-lsc-cos-angle': (g, v) => { // C opposite c: put C at origin, B on x-axis, A at angle v[0]; check |AB| = c
    const A = [g.b * cd(v[0]), g.b * sd(v[0])]; return [close(Math.hypot(A[0] - g.a, A[1]), g.c)]; },
  'm-lsc-sin': (g, v) => { const C = 180 - g.A - g.B; // coordinates: A at origin, side c along x; angle at A is g.A
    const Pc = [v[0] * cd(g.A), v[0] * sd(g.A)] /* vertex C */, Pb = [v[1], 0] /* vertex B */; return [close(Math.hypot(Pc[0] - Pb[0], Pc[1] - Pb[1]), g.a), close(Math.atan2(Pc[1], Pb[0] - Pc[0]) / DEG, g.B), C > 0]; },
  'm-lsc-resultant': (g, v) => { const R = [g.F1 + g.F2 * cd(g.phi), g.F2 * sd(g.phi)]; return [close(v[0], Math.hypot(...R)), angClose(v[1], atan2d(R[1], R[0]))]; },
  // vectors
  'm-vec-mag': (g, v) => [close(v[0] ** 2, dot3(g.v, g.v))],
  'm-vec-unit': (g, v) => { const d = g.B.map((b, i) => b - g.A[i]); return [close(norm(v), 1), close(dot3(v, d), norm(d)) /* parallel, same sense */]; },
  'm-vec-add': (g, v) => { const R = g.V.reduce((s, f) => [s[0] + f[0], s[1] + f[1]], [0, 0]); return [Math.abs(v[0] - R[0]) < 1e-9, Math.abs(v[1] - R[1]) < 1e-9, close(v[2], Math.hypot(...R))]; },
  'm-vec-force': (g, v) => [close(norm(v), g.F), close(dot3(v, g.d), g.F * norm(g.d))],
  // sigma: closed forms instead of loops
  'm-sig-eval': (g, v) => [close(v[0], g.a * g.n * (g.n + 1) / 2 + g.b * g.n)],
  'm-sig-balance': (g, v) => { const sx = g.f.reduce((s, f) => s + f[0], 0) + v[0], sy = g.f.reduce((s, f) => s + f[1], 0) + v[1]; return [Math.abs(sx) < 1e-9, Math.abs(sy) < 1e-9]; },
  'm-sig-weighted': (g, v) => { // the resultant must reproduce the total moment about any point (check two points)
    const M = (p) => g.xs.reduce((s, x, i) => s + (x - p) * g.Fs[i], 0); return [close(v[0], g.Fs.reduce((a, b) => a + b, 0)), Math.abs(M(0) - v[0] * v[1]) < 1e-6, Math.abs(M(10) - v[0] * (v[1] - 10)) < 1e-6]; },
  // linear systems: substitute back
  'm-lin-2x2': (g, v) => g.M.map((row, i) => Math.abs(row[0] * v[0] + row[1] * v[1] - g.rhs[i]) < 1e-9),
  'm-lin-3x3': (g, v) => g.M.map((row, i) => Math.abs(dot3(row, v) - g.rhs[i]) < 1e-9),
  'm-lin-lever': (g, v) => [close(v[0] + v[1], g.W), Math.abs(v[1] * g.L - g.W * g.a) < 1e-6],
  'm-lin-cables': (g, v) => [Math.abs(-v[0] * cd(g.al) + v[1] * cd(g.be)) < 1e-6, Math.abs(v[0] * sd(g.al) + v[1] * sd(g.be) - g.W) < 1e-6],
  // dot product: law-of-cosines route
  'm-dot-compute': (g, v) => { const d = g.A.map((a, i) => a - g.B[i]); return [close(v[0], (dot3(g.A, g.A) + dot3(g.B, g.B) - dot3(d, d)) / 2)]; },
  'm-dot-angle': (g, v) => { const d = g.A.map((a, i) => a - g.B[i]); const a = norm(g.A), b = norm(g.B); return [close(dot3(d, d), a * a + b * b - 2 * a * b * cd(v[0]), 1e-6)]; },
  'm-dot-proj': (g, v) => { const u = g.d.map((x) => x / norm(g.d)); const perp = g.F.map((f, i) => f - v[0] * u[i]); return [Math.abs(dot3(perp, u)) < 1e-6 * norm(g.F)]; },
  // cross product: Lagrange identity + orthogonality; determinants by cofactor expansion along a column
  'm-cr-det2': (g, v) => [Math.abs(v[0] - (g.M[0][0] * g.M[1][1] - g.M[1][0] * g.M[0][1])) < 1e-9],
  'm-cr-det3': (g, v) => { const m = g.M; const d = m[0][0] * (m[1][1] * m[2][2] - m[2][1] * m[1][2]) - m[1][0] * (m[0][1] * m[2][2] - m[2][1] * m[0][2]) + m[2][0] * (m[0][1] * m[1][2] - m[1][1] * m[0][2]); return [Math.abs(v[0] - d) < 1e-9]; },
  'm-cr-3d': (g, v) => [Math.abs(dot3(v, g.A)) < 1e-9, Math.abs(dot3(v, g.B)) < 1e-9, close(dot3(v, v), dot3(g.A, g.A) * dot3(g.B, g.B) - dot3(g.A, g.B) ** 2)],
  'm-cr-2d': (g, v) => { const F = Math.hypot(g.Fx, g.Fy), ux = g.Fx / F, uy = g.Fy / F; const d = g.x * uy - g.y * ux; return [close(v[0], F * d)]; },
  // sign conventions
  'm-sgn-comp': (g, v) => [close(Math.hypot(v[0], v[1]), g.F), (v[0] < 0) === !!g.left, (v[1] < 0) === !!g.down,
    close(g.fromVert ? Math.atan2(Math.abs(v[0]), Math.abs(v[1])) / DEG : Math.atan2(Math.abs(v[1]), Math.abs(v[0])) / DEG, g.a)],
  'm-sgn-moment': (g, v) => { const M = g.fs.reduce((s, f) => { const r = [f.x, 0, 0], F = [0, f.up ? f.F : -f.F, 0]; return s + (r[0] * F[1] - r[1] * F[0]); }, 0); return [Math.abs(v[0] - M) < 1e-9]; },
  'm-sgn-incline': (g, v) => { const W = [0, -g.W], ex = g.upSlope ? [cd(g.th), sd(g.th)] : [-cd(g.th), -sd(g.th)], ey = [-sd(g.th), cd(g.th)];
    return [Math.abs(v[0] - (W[0] * ex[0] + W[1] * ex[1])) < 1e-6, Math.abs(v[1] - (W[0] * ey[0] + W[1] * ey[1])) < 1e-6]; },
  // integrals as sums: brute-force strip sums
  'm-int-rect': (g, v) => { const N = 20000, dx = (g.b - g.a) / N; let F = 0, M = 0; for (let i = 0; i < N; i++) { const x = g.a + (i + 0.5) * dx; F += g.w * dx; M += x * g.w * dx; } return [close(v[0], F, 1e-6), close(v[1], M / F, 1e-6)]; },
  'm-int-tri': (g, v) => { const N = 20000, dx = g.L / N; let F = 0, M = 0; for (let i = 0; i < N; i++) { const x = (i + 0.5) * dx, w = g.tallRight ? g.w0 * x / g.L : g.w0 * (1 - x / g.L); F += w * dx; M += x * w * dx; } return [close(v[0], F, 1e-6), close(v[1], M / F, 1e-6)]; },
  'm-int-trap': (g, v) => { const N = 20000, dx = g.L / N; let A = 0; for (let i = 0; i < N; i++) A += (g.y1 + (g.y2 - g.y1) * (i + 0.5) / N) * dx; return [close(v[0], A, 1e-6)]; },
  'm-int-strips': (g, v) => { const dx = g.L / g.n; let S = 0; for (let i = 0; i < g.n; i++) S += g.c * ((i + 0.5) * dx) ** 2 * dx; const N = 200000; let A = 0; for (let i = 0; i < N; i++) A += g.c * ((i + 0.5) * g.L / N) ** 2 * g.L / N; return [close(v[0], S), close(v[1], A, 1e-6), v[0] < v[1]]; },
});

for (const [id, def] of C.byId) {
  problemsFound++;
  const seen = new Set();
  for (let s = 1; s <= SEEDS; s++) {
    const inst = C.instance(id, s * 7919);
    const d = inst.data;
    const pv = C.publicView(inst);
    const text = [pv.prompt, ...pv.hints, C.solutionHtml(inst), ...(pv.choices || []).map((c) => c.html)].join(' ');
    if (/katex-error/.test(text)) bad(id, s, 'KaTeX error');
    if (/NaN|undefined|Infinity/.test(text.replace(/<[^>]+>/g, ''))) bad(id, s, 'NaN/undefined in text');
    if (text.replace(/<[^>]+>/g, '').includes('$')) bad(id, s, 'unrendered $ in text');
    if (d.svg && /NaN|undefined/.test(d.svg)) bad(id, s, 'NaN in SVG');
    if (def.kind === 'mc') {
      const n = d.choices.filter((c) => c.correct).length;
      if (n !== 1) bad(id, s, `MC has ${n} correct choices`);
      if (new Set(d.choices.map((c) => c.text)).size !== d.choices.length) bad(id, s, 'duplicate MC choices');
      const idx = d.choices.findIndex((c) => c.correct);
      if (!C.grade(inst, { choice: idx }).correct) bad(id, s, 'MC self-grade failed');
      seen.add(d.prompt + '|' + d.choices.map((c) => c.text).sort().join('|'));
    } else {
      for (const a of d.answers) if (!Number.isFinite(a.value)) bad(id, s, `non-finite answer ${a.key}`);
      const sub = Object.fromEntries(d.answers.map((a) => [a.key, String(+a.value.toPrecision(4))]));
      if (!C.grade(inst, { answers: sub }).correct) bad(id, s, 'self-grade (4 s.f.) failed');
      const sub3 = Object.fromEntries(d.answers.map((a) => [a.key, String(+a.value.toPrecision(3))]));
      if (!C.grade(inst, { answers: sub3 }).correct && d.answers.every((a) => a.unit !== '°')) bad(id, s, 'answer rounded to 3 s.f. rejected');
      if (d.answers.some((a) => a.abs === undefined && checkNumeric(a, String(a.value * 1.05 + (a.value === 0 ? 1 : 0))).ok && Math.abs(a.value) > 1e-6)) bad(id, s, '5% error accepted');
      seen.add(JSON.stringify(d.answers.map((a) => a.value)));
      if (ind[id]) {
        if (!d.given) bad(id, s, 'missing given for independent check');
        else { const res = ind[id](d.given, d.answers.map((a) => a.value)); checks += res.length; res.forEach((ok, k) => { if (!ok) bad(id, s, `independent check #${k} failed (given=${JSON.stringify(d.given)}, answers=${d.answers.map((a) => a.value).join(',')})`); }); }
      }
    }
  }
  if (seen.size < Math.min(4, def.kind === 'mc' ? 3 : 20)) bad(id, '-', `low variety: only ${seen.size} distinct instances`);
}
const indepTypes = Object.keys(ind).filter((k) => C.byId.has(k));

// ---------- skills map, glossary, lessons ----------
const SK = C.skills;
let structural = 0;
const sbad = (msg) => { if (issues.length < 60) issues.push(msg); };
for (const id of Object.keys(SK.typeSkills)) { structural++; if (!C.byId.has(id)) sbad(`typeSkills lists unknown problem id ${id}`); }
for (const u of C.units) for (const p of u.problems) {
  structural++;
  if (!SK.typeSkills[p.id]) sbad(`unit problem ${p.id} has no skill mapping`);
  for (const k of p.skills || []) if (!SK.byKey.has(k)) sbad(`${p.id} maps to unknown skill ${k}`);
}
for (let n = 1; n <= C.units.length; n++) { structural++; const ks = SK.unitSkills[n]; if (!ks || !ks.length) sbad(`unit ${n} has no skills`); else for (const k of ks) if (!SK.byKey.has(k)) sbad(`unit ${n} lists unknown skill ${k}`); }
for (const t of C.toolkit) {
  structural++;
  if (t.problems.length < 3) sbad(`skill ${t.key} has only ${t.problems.length} problem types`);
  if (!t.problems.some((p) => p.kind !== 'mc') || t.problems.filter((p) => p.kind !== 'mc').length < 2) sbad(`skill ${t.key} needs ≥2 numeric types for the assessment`);
  if (!Object.values(SK.unitSkills).some((ks) => ks.includes(t.key))) sbad(`skill ${t.key} is not used by any unit`);
  for (const p of t.problems) if (p.unit !== 0 || p.skill !== t.key) sbad(`toolkit problem ${p.id} not tagged unit 0 / skill ${t.key}`);
}
for (const [k, g] of Object.entries(SK.glossary)) { structural++; if (!SK.byKey.has(g.skill)) sbad(`glossary ${k} → unknown skill ${g.skill}`); if (/katex-error/.test(C.tex(g.sym))) sbad(`glossary ${k} symbol fails to render`); }
const lessonStats = [];
const checkLesson = (name, html) => {
  structural++;
  const text = html.replace(/<annotation[\s\S]*?<\/annotation>/g, '').replace(/<[^>]+>/g, '');
  if (/katex-error/.test(html)) sbad(`${name}: KaTeX error`);
  if (/gl-unknown/.test(html)) sbad(`${name}: unknown glossary key`);
  if (/%BASE%/.test(html)) sbad(`${name}: unreplaced %BASE%`);
  if (text.includes('$')) sbad(`${name}: unrendered $`);
  if (/NaN|undefined/.test(text)) sbad(`${name}: NaN/undefined`);
  for (const m of html.matchAll(/href="[^"]*\/toolkit\/([a-z-]+)"/g)) if (!SK.bySlug.has(m[1])) sbad(`${name}: link to unknown toolkit slug ${m[1]}`);
  return { boxes: (html.match(/class="readmath"/g) || []).length, tips: (html.match(/data-gl=/g) || []).length };
};
for (let n = 1; n <= C.units.length; n++) { const st = checkLesson(`unit ${n} lesson`, C.lessonHtml(n)); lessonStats.push(st); if (!st.boxes) sbad(`unit ${n} lesson has no "Reading the math" box`); if (!st.tips) sbad(`unit ${n} lesson has no glossary tooltips`); }
for (const t of C.toolkit) { const st = checkLesson(`toolkit ${t.key} lesson`, C.toolkitLessonHtml(t.key)); if (!st.boxes) sbad(`toolkit ${t.key} has no "Reading the math" box`); if (!/class="example"/.test(C.toolkitLessonHtml(t.key))) sbad(`toolkit ${t.key} has no worked example`); }

// ---------- readiness assessment logic (pure functions; scratch DB) ----------
const RD = require('../src/readiness');
let logic = 0;
const lbad = (m) => { logic++; sbad('assessment logic: ' + m); };
const eq = (o, decided, status) => { logic++; if (o.decided !== decided || o.status !== status) lbad(`skillOutcome gave ${JSON.stringify(o)}, expected ${decided}/${status}`); };
eq(RD.skillOutcome([null, null, null]), false, null);
eq(RD.skillOutcome([1, null, null]), false, null);
eq(RD.skillOutcome([1, 1, null]), true, 'mastered');
eq(RD.skillOutcome([0, 0, null]), true, 'notyet');
eq(RD.skillOutcome([1, 0, null]), false, null);
eq(RD.skillOutcome([1, 0, 1]), true, 'partial');
eq(RD.skillOutcome([0, 1, 1]), true, 'partial');
eq(RD.skillOutcome([0, 1, 0]), true, 'notyet');
let rs = 7; const rand = () => ((rs = (rs * 1103515245 + 12345) % 2147483648) / 2147483648);
for (let trial = 0; trial < 300; trial++) {
  const items = RD.buildItems(rand);
  logic++;
  if (items.length !== C.toolkit.length * RD.PER_SKILL) lbad(`buildItems made ${items.length} items`);
  for (const t of C.toolkit) {
    const mine = items.filter((it) => it.skill === t.key);
    const kinds = mine.map((it) => C.byId.get(it.id).kind);
    if (new Set(mine.map((it) => it.id)).size !== mine.length) lbad(`duplicate type for ${t.key}`);
    if (kinds[0] === 'mc' || kinds[1] === 'mc' || kinds.filter((k) => k === 'mc').length > 1) lbad(`MC placement for ${t.key}: ${kinds}`);
    if (mine.some((it) => C.byId.get(it.id).skill !== t.key)) lbad(`item for ${t.key} from another skill`);
  }
  // simulate a random answer pattern; the walk must end with 20..30 answers and every skill decided
  let n = 0, idx;
  while ((idx = RD.nextIndex(items)) >= 0) { items[idx].result = rand() < 0.5 ? 1 : 0; n++; if (n > 40) break; }
  if (n < 20 || n > 30) lbad(`assessment took ${n} questions`);
  const pr = RD.progressOf(items);
  if (pr.skillsDone !== C.toolkit.length || pr.answered !== n || pr.expected !== n) lbad(`progress at end ${JSON.stringify(pr)}`);
}
// every assessment item's public view must not leak answers or hints
for (const it of RD.buildItems(rand)) { logic++; const pv = C.publicView(C.instance(it.id, it.seed)); if ('answers' in pv || (pv.choices || []).some((c) => 'correct' in c)) lbad(`${it.id} public view leaks answers`); }
fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true });

const tk = C.toolkit.reduce((s, t) => s + t.problems.length, 0);
console.log(`Problem types: ${problemsFound} total = ${problemsFound - tk} statics across ${C.units.length} units (${C.units.map((u) => u.problems.length).join(', ')}) + ${tk} math-toolkit across ${C.toolkit.length} skills (${C.toolkit.map((t) => t.problems.length).join(', ')})`);
console.log(`Seeds per type: ${SEEDS}; independent checks: ${checks} on ${indepTypes.length} types`);
console.log(`Structure checks: ${structural} (skill map, glossary, ${C.units.length + C.toolkit.length} lessons; unit lessons carry ${lessonStats.reduce((s, x) => s + x.boxes, 0)} "Reading the math" boxes, ${lessonStats.reduce((s, x) => s + x.tips, 0)} symbol tooltips)`);
console.log(`Assessment logic checks: ${logic}`);
if (issues.length) { console.log(`\n${issues.length} issue(s):`); issues.forEach((i) => console.log('  - ' + i)); process.exit(1); }
console.log('All problem generators passed.');
