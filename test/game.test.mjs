// Game physics tests: truss solver against hand-calculated textbook trusses, and every level's pass/fail/star logic.
// Run: node --test test/   (or npm test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const P = require('../public/js/game/physics.js');
const L = require('../public/js/game/levels.js');
const G = 9.81;
const near = (a, b, tol = 1e-6, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} expected ${b}, got ${a}`);

test('lesson triangle: pin A, roller C, 6 kN down at B (2 m up, 1.5 m from A, span 4 m)', () => {
  // Hand calc: by moments R_C = 6·1.5/4 = 2.25, R_A = 3.75. Joint A: F_AB·(2/2.5) + 3.75 = 0 → F_AB = −4.6875; F_AC = 4.6875·1.5/2.5 = 2.8125.
  const t = { nodes: [[0, 0], [1.5, 2], [4, 0]], members: [[0, 1], [1, 2], [0, 2]], supports: { 0: 'pin', 2: 'roller' }, loads: { 1: [0, -6] } };
  const s = P.solveTruss(t);
  assert.equal(s.determinacy, 'determinate');
  near(s.reactions[0][1], 3.75, 1e-9); near(s.reactions[2][1], 2.25, 1e-9); near(s.reactions[0][0], 0, 1e-9);
  near(s.forces[0], -4.6875, 1e-9, 'AB'); near(s.forces[2], 2.8125, 1e-9, 'AC');
  // BC: joint C, F_BC·(2/√(2.5²+2²)) + 2.25 = 0
  near(s.forces[1], -2.25 * Math.hypot(2.5, 2) / 2, 1e-9, 'BC');
  assert.ok(P.jointResidual(t, s) < 1e-9);
});

test('equilateral Warren truss, 2 m panels, 10 kN at L1', () => {
  const h = Math.sqrt(3);
  const t = { nodes: [[0, 0], [2, 0], [4, 0], [1, h], [3, h]], members: [[0, 3], [0, 1], [3, 1], [3, 4], [1, 4], [4, 2], [1, 2]], supports: { 0: 'pin', 2: 'roller' }, loads: { 1: [0, -10] } };
  const s = P.solveTruss(t);
  // R = 5 each; diagonals ±5/sin60 = ±5.7735; L0L1 = 5.7735·cos60 = 2.8868; top chord: −5.7735 (moment about L1: 5·2 = F·√3)
  const exp = [-5.7735, 2.8868, 5.7735, -5.7735, 5.7735, -5.7735, 2.8868];
  exp.forEach((e, i) => near(s.forces[i], e, 1e-4, `member ${i}`));
  near(s.reactions[0][1], 5, 1e-9); near(s.reactions[2][1], 5, 1e-9);
  assert.equal(s.m + s.r, 2 * s.j);
});

test('Pratt truss, four 3 m panels, 4 m deep, 6 kN at L1 and 12 kN at L2', () => {
  const nodes = [[0, 0], [3, 0], [6, 0], [9, 0], [12, 0], [3, 4], [6, 4], [9, 4]];
  const members = [[0, 1], [1, 2], [2, 3], [3, 4], [5, 6], [6, 7], [0, 5], [7, 4], [1, 5], [2, 6], [3, 7], [5, 2], [7, 2]];
  const t = { nodes, members, supports: { 0: 'pin', 4: 'roller' }, loads: { 1: [0, -6], 2: [0, -12] } };
  const s = P.solveTruss(t);
  // Hand calc: R_L0 = (6·9 + 12·6)/12 = 10.5, R_L4 = 7.5.
  near(s.reactions[0][1], 10.5, 1e-9); near(s.reactions[4][1], 7.5, 1e-9);
  // Joint L0: F_L0U1·4/5 = −10.5 → −13.125; F_L0L1 = 13.125·3/5 = 7.875
  near(s.forces[6], -13.125, 1e-9, 'L0U1'); near(s.forces[0], 7.875, 1e-9, 'L0L1');
  // Joint L1: vertical U1L1 carries the 6 kN; L1L2 = L0L1
  near(s.forces[8], 6, 1e-9, 'U1L1'); near(s.forces[1], 7.875, 1e-9, 'L1L2');
  // Section through panel 2, ΣM about L2 (6,0): 10.5·6 − 6·3 + F_U1U2·4 = 0 → −11.25
  near(s.forces[4], -11.25, 1e-9, 'U1U2');
  // Diagonal U1L2: ΣFy on section: 10.5 − 6 − F·(4/5) = 0 → 5.625
  near(s.forces[11], 5.625, 1e-9, 'U1L2');
  // U2L2 is a zero-force member (joint U2 with collinear chords and no load), U3L3 likewise
  near(s.forces[9], 0, 1e-9, 'U2L2'); near(s.forces[10], 0, 1e-9, 'U3L3');
  // Right end: L4U3 vertical comp = −7.5 → −9.375; L3L4 = 9.375·3/5 = 5.625
  near(s.forces[7], -9.375, 1e-9); near(s.forces[3], 5.625, 1e-9);
  assert.ok(P.jointResidual(t, s) < 1e-9);
});

test('square frame without a diagonal is a mechanism; adding the diagonal fixes it', () => {
  const nodes = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const sq = { nodes, members: [[0, 1], [1, 2], [2, 3], [3, 0]], supports: { 0: 'pin', 1: 'roller' }, loads: { 2: [1, 0] } };
  const s = P.solveTruss(sq);
  assert.equal(s.m + s.r, 7); assert.equal(2 * s.j, 8);
  assert.equal(s.determinacy, 'unstable'); assert.equal(s.stable, false); assert.equal(s.forces, null);
  const ok = P.solveTruss({ ...sq, members: sq.members.concat([[0, 2]]) });
  assert.equal(ok.stable, true); assert.equal(ok.determinacy, 'determinate');
  // 1 kN horizontal at the top-right: diagonal 0-2 has −√2 ... check via joint equilibrium instead of memorized values
  assert.ok(P.jointResidual({ ...sq, members: sq.members.concat([[0, 2]]) }, ok) < 1e-9);
});

test('enough members but badly arranged is still a mechanism (m + r = 2j is necessary, not sufficient)', () => {
  // Two squares; one has two diagonals, the other none: m + r = 2j but the bare panel folds.
  const nodes = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]];
  const members = [[0, 1], [1, 2], [3, 4], [4, 5], [0, 3], [1, 4], [2, 5], [0, 4], [1, 3]];
  const s = P.solveTruss({ nodes, members, supports: { 0: 'pin', 2: 'roller' }, loads: { 4: [0, -1] } });
  assert.equal(s.m + s.r, 2 * s.j);
  assert.equal(s.stable, false);
});

test('indeterminate truss (both diagonals): equilibrium holds, reactions are statically correct', () => {
  const nodes = [[0, 0], [2, 0], [2, 2], [0, 2]];
  const t = { nodes, members: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [1, 3]], supports: { 0: 'pin', 1: 'roller' }, loads: { 2: [0, -4], 3: [3, 0] } };
  const s = P.solveTruss(t);
  assert.equal(s.determinacy, 'indeterminate'); assert.equal(s.stable, true);
  assert.ok(P.jointResidual(t, s) < 1e-9);
  // Reactions from rigid-body statics: ΣFx: Rx0 = −3; ΣM about 0: R1·2 − 4·2 − 3·2 = 0 → R1 = 7; R0y = −3
  near(s.reactions[0][0], -3, 1e-9); near(s.reactions[1][1], 7, 1e-9); near(s.reactions[0][1], -3, 1e-9);
});

test('m + r vs 2j classification', () => {
  const tri = P.solveTruss({ nodes: [[0, 0], [1, 0], [0.5, 1]], members: [[0, 1], [1, 2], [2, 0]], supports: { 0: 'pin', 1: 'roller' } });
  assert.deepEqual([tri.m, tri.r, tri.j, tri.determinacy], [3, 3, 3, 'determinate']);
  const two = P.solveTruss({ nodes: [[0, 0], [1, 0], [0.5, 1]], members: [[0, 1], [1, 2], [2, 0]], supports: { 0: 'pin', 1: 'pin' } });
  assert.equal(two.determinacy, 'indeterminate');
  const bar = P.solveTruss({ nodes: [[0, 0], [1, 0], [0.5, 1]], members: [[0, 1], [1, 2]], supports: { 0: 'pin', 1: 'roller' } });
  assert.equal(bar.determinacy, 'unstable');
});

const S = (id, design, pred, seed = 1) => L.score(id, seed, design, pred);

test('Level 1 Hay Hoist: tensions and stars', () => {
  const W = 60 * G; // seed 1 = 60 kg
  // Symmetric at 0.8 m: T = W·√(0.8² + 0.9²)/(2·0.9) = 393.76 N → twine snaps, sisal holds
  const T = (W * Math.hypot(0.8, 0.9)) / 1.8;
  let r = S('hoist', { xA: 0.8, xB: 0.8, rope: 'twine' }, T);
  assert.equal(r.result.ok, false); near(r.result.actual, T, 1e-9);
  r = S('hoist', { xA: 0.8, xB: 0.8, rope: 'sisal' }, T);
  assert.deepEqual(r.stars, [true, false, true]); // twine CAN work with anchors at 0.4 m, so sisal is not the cheapest
  // Closest symmetric anchors: T = W·√(0.4² + 0.9²)/1.8 = 322.06 N < 350 → twine works: three stars with a good prediction
  const T2 = (W * Math.hypot(0.4, 0.9)) / 1.8;
  r = S('hoist', { xA: 0.4, xB: 0.4, rope: 'twine' }, T2 * 1.02);
  assert.deepEqual(r.stars, [true, true, true]);
  // Asymmetric default: T_B = W·xA·L_B/(H(xA + xB)) = 471.6 N → twine fails on the right
  r = S('hoist', { xA: 1.2, xB: 0.6, rope: 'twine' });
  assert.equal(r.result.fail, 'right');
  near(r.result.t.TB, (W * 1.2 * Math.hypot(0.6, 0.9)) / (0.9 * 1.8), 1e-9);
  near(r.result.actual, (W * 0.6 * Math.hypot(1.2, 0.9)) / (0.9 * 1.8), 1e-9);
  // Prediction 4% off is outside the 3% tolerance
  assert.equal(S('hoist', { xA: 0.4, xB: 0.4, rope: 'twine' }, T2 * 1.04).predOk, false);
});

test('Level 2 Teeter-Goat: balance point', () => {
  const xs = (15 * 2 + 55 * 0.3 + 18 * 3.5 + 14 * 3.9) / (15 + 55 + 18 + 14); // 1.60882 m
  let r = S('seesaw', { xf: 1.61 }, 1.6);
  near(r.result.actual, xs, 1e-12);
  assert.deepEqual(r.stars, [true, true, true]);
  r = S('seesaw', { xf: 1.63 }, 1.7);
  assert.deepEqual(r.stars, [true, false, false]);
  r = S('seesaw', { xf: 2.0 });
  assert.equal(r.result.ok, false); assert.equal(r.result.fail, 'left'); // fulcrum too far right, the heavy left end drops
  near(r.result.net, 102 * G * (xs - 2), 1e-9);
});

test('Level 3 Feed-Trough Beam: reactions from resultants', () => {
  // Loads: log 1.0 kN @ 2.5, trough 3.6 kN @ 2.5, bale 1.5 kN @ 4.6 → F = 6.1, ΣFx = 18.4 kN·m
  let r = S('trough', { xA: 2, xB: 4, postA: 'cedar', postB: 'cedar' }, 3.0);
  near(r.result.R.RB, (18.4 - 6.1 * 2) / 2, 1e-9); near(r.result.R.RA, 3.0, 1e-9);
  assert.deepEqual(r.stars, [true, true, true]);
  r = S('trough', { xA: 1, xB: 4, postA: 'cedar', postB: 'cedar' });
  near(r.result.R.RB, (18.4 - 6.1) / 3, 1e-9); // 4.1 kN > 3.5 cedar rating
  assert.equal(r.result.fail, 'crushB');
  r = S('trough', { xA: 1, xB: 4, postA: 'cedar', postB: 'treated' });
  assert.deepEqual(r.stars.slice(0, 2), [true, false]);
  r = S('trough', { xA: 0.5, xB: 2.5, postA: 'treated', postB: 'treated' });
  assert.equal(r.result.fail, 'upliftA'); // x̄ = 3.016 m lies outside the posts
  assert.equal(S('trough', { xA: 2, xB: 2.5 }).result.fail, 'spacing');
});

test('Level 4 Creek Truss Bridge: deck alone folds, reference Pratt holds, all-pine buckles', () => {
  const b = L.byId.bridge, p = b.scenario(1);
  let r = S('bridge', { members: [] });
  assert.equal(r.result.fail, 'mechanism');
  const ref = b.referenceDesign();
  // Hand check of the deck member x = 2–3 with the cart (2.5 kN) at mid-span plus 0.6 kN dead loads:
  // R_left = 1.5 + 1.25 = 2.75; section through panel 2–3, ΣM about top joint (2,1): F·1 = 2.75·2 − 0.6·1 = 4.9 kN tension
  r = S('bridge', ref, 4.9);
  assert.equal(r.result.ok, true); near(r.result.actual, 4.9, 1e-6);
  assert.ok(r.result.cost <= r.result.budget, `cost ${r.result.cost} budget ${r.result.budget}`);
  assert.deepEqual(r.stars, [true, true, true]);
  assert.equal(r.result.analysis.determinacy, 'determinate');
  // End top-chord diagonal: max compression with cart near the support. Pine capacity is min(5, 9/2) = 4.5 kN for L = √2
  const pine = S('bridge', { members: ref.members.map((m) => ({ ...m, mat: 'pine' })) });
  assert.equal(pine.result.ok, false); assert.equal(pine.result.fail, 'overload');
  near(L.capC(L.MATERIALS[0], Math.SQRT2), 4.5, 1e-9);
  // Every load case of the passing design is in equilibrium at every joint
  const a = b.analyze(p, ref, { keepCases: true });
  for (const c of a.cases) {
    const model = a.model;
    const loads = L.bridgeCase(p, model, c.x);
    const totalLoad = Object.values(loads).reduce((t, f) => t + f[1], 0);
    near(totalLoad, -(5 * p.D + p.Pl), 1e-12, 'load split conserves the cart weight');
    const sol = P.solveTruss({ nodes: model.nodes, members: model.members, supports: model.supports, loads });
    assert.ok(P.jointResidual({ nodes: model.nodes, members: model.members, loads }, sol) < 1e-8);
    // total vertical reaction = total load
    near(sol.reactions[model.deckNode(0)][1] + sol.reactions[model.deckNode(6)][1], 5 * p.D + p.Pl, 1e-8);
  }
  // Design cleaning: duplicates, off-grid and over-long members are dropped
  const c = L.cleanBridge({ members: [{ x1: 0, y1: 0, x2: 1, y2: 1 }, { x1: 1, y1: 1, x2: 0, y2: 0 }, { x1: 0, y1: 0, x2: 9, y2: 0 }, { x1: 0, y1: 0, x2: 3, y2: 2 }, { x1: 0, y1: 0, x2: 1, y2: 0 }] });
  assert.equal(c.members.length, 1);
});

test('Level 5 A-frame Hay Rack: tie tension from moments about the apex', () => {
  // seed 1: P = 1.6 kN, H = 2. b = 0.8, y_t = 0.9: T = 0.8·1.6/(2·1.1) = 0.5818 kN → twine (0.5) snaps, sisal holds and is the cheapest
  let r = S('aframe', { b: 0.8, yt: 0.9, tie: 'twine' });
  near(r.result.actual, (0.8 * 1.6) / 2.2, 1e-12); assert.equal(r.result.fail, 'snap');
  r = S('aframe', { b: 0.8, yt: 0.9, tie: 'sisal' }, 0.58);
  assert.deepEqual(r.stars, [true, true, true]);
  r = S('aframe', { b: 0.8, yt: 1.5, tie: 'sisal' }); // T = 1.28 kN
  near(r.result.actual, 1.28, 1e-12); assert.equal(r.result.fail, 'snap');
  assert.equal(S('aframe', { b: 0.6, yt: 1, tie: 'chain' }).result.fail, 'small');
  assert.equal(S('aframe', { b: 1, yt: 0.5, tie: 'chain' }).result.fail, 'clearance');
  assert.deepEqual(S('aframe', { b: 1, yt: 1, tie: 'chain' }).stars, [true, false, false]);
});

test('Level 6 Loading Ramp: tan θ ≤ μs', () => {
  const W = 45 * G;
  let r = S('ramp', { th: 30, surface: 'plywood' });
  assert.equal(r.result.fail, 'slip'); // tan 30° = 0.577 > 0.35
  r = S('ramp', { th: 19, surface: 'plywood' }, W * Math.sin((19 * Math.PI) / 180));
  // L = 0.9/sin 19° = 2.764 m ≤ 3; tan 19° = 0.344 ≤ 0.35; cost 12·2.764 = $33.17 vs cheapest ≈ $32.69 (at 19.29°)
  assert.deepEqual(r.stars, [true, true, true]);
  r = S('ramp', { th: 15, surface: 'plywood' });
  assert.equal(r.result.fail, 'short'); // 0.9/sin 15° = 3.48 m
  r = S('ramp', { th: 40, surface: 'cleats' });
  assert.equal(r.result.fail, 'steep');
  r = S('ramp', { th: 30, surface: 'rubber' });
  assert.deepEqual(r.stars.slice(0, 2), [true, false]); // works but costs $45.60
  near(r.result.actual, W * 0.5, 1e-9);
});

test('Level 7 Shade Shelter: tipping about the leeward skid', () => {
  // seed 1: wind 0.45 kN at 2.3 m → 1.035 kN·m. No blocks: 70·9.81·(2 − 1)/1000 = 0.687 → tips
  let r = S('shade', { n: 0, xb: 1 });
  assert.equal(r.result.fail, 'tip'); near(r.result.m.restoring, 0.6867, 1e-9);
  // One block at the windward end: x̄ = 70/95 = 0.7368 m, restoring = 95·9.81·1.2632/1000 = 1.1772 kN·m
  r = S('shade', { n: 1, xb: 0 }, 0.74);
  near(r.result.actual, 70 / 95, 1e-12); near(r.result.m.restoring, 1.1772, 1e-9);
  assert.deepEqual(r.stars, [true, true, true]);
  // One block at 0.6 m is not enough (1.030 < 1.035)
  assert.equal(S('shade', { n: 1, xb: 0.6 }).result.ok, false);
  assert.deepEqual(S('shade', { n: 3, xb: 1 }).stars, [true, false, false]);
});

test('every level: scenarios are deterministic, defaults evaluate, predictions finite on success', () => {
  for (const lv of L.LEVELS) {
    for (const seed of [1, 2, 3, 17, 999]) {
      const a = L.score(lv.id, seed, null, null), b = L.score(lv.id, seed, null, null);
      assert.deepEqual(a.params, b.params);
      assert.equal(a.stars[2], false);
      assert.ok(Array.isArray(lv.debrief(a.params, a.result)));
    }
    assert.ok(lv.story && lv.objective && lv.predict && lv.predict.label);
  }
  assert.equal(L.LEVELS.length, 7);
});
