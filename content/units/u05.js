'use strict';
const { readMath: RM } = require('../skills');
const { fmt, q, ans, mcPool, sind, cosd } = require('../helpers');
const S = require('../svg');

const supportsTable = (() => {
  const icon = (body) => S.svg(90, 60, body, 'support');
  return String.raw`<table class="tbl supports"><thead><tr><th>Support</th><th>Symbol</th><th>Reactions (2D)</th><th>Unknowns</th></tr></thead><tbody>
<tr><td>Roller / smooth surface</td><td>${icon(S.beam(10, 80, 15, 8) + S.roller(45, 19))}</td><td>One force, perpendicular to the surface</td><td>1</td></tr>
<tr><td>Cable / link</td><td>${icon(S.hatch(30, 60, 6) + S.line(45, 6, 45, 40) + S.node(45, 40))}</td><td>One force along the cable (pull only)</td><td>1</td></tr>
<tr><td>Pin (hinge)</td><td>${icon(S.beam(10, 80, 15, 8) + S.pin(45, 19))}</td><td>Two force components $A_x$, $A_y$</td><td>2</td></tr>
<tr><td>Fixed (built-in)</td><td>${icon(S.wall(20, 0, 50, -1) + S.beam(20, 85, 25, 8))}</td><td>$A_x$, $A_y$ <em>and</em> a moment $M_A$</td><td>3</td></tr></tbody></table>`;
})();

const lesson = String.raw`
<h2>From particles to rigid bodies</h2>
<p>A real beam or bracket can rotate as well as slide, so equilibrium now needs both conditions:</p>
$$\gl{sigma}{\sum} F_x = 0, \qquad \sum F_y = 0, \qquad \sum \gl{moment}{M_{\text{any point}}} = 0$$
<p>Three equations in 2D means up to <strong>three unknowns</strong>. (In 3D there are six: three force sums and three moment sums.)</p>
${RM([["\\sum M_{\\text{any point}} = 0", "“the sum of moments about any point equals zero”", "Pick a point, find the moment of every force (and couple) about it using the CCW-positive rule, and add them. For a body at rest the total is zero about <em>every</em> point, so choose the one that makes the algebra easiest."], ["\\sum M_A = 0", "“the sum of moments about A equals zero”", "The same equation with point A chosen."], ["A_x,\\ A_y", "“A sub x, A sub y”", "The horizontal and vertical reaction components at support A: the unknowns we solve for."]], ["sigma", "signs", "linsys"])}

<h2>Supports and their reactions</h2>
<p>A support stops certain motions, and for each motion it stops it supplies one reaction. Memorize this table. It drives every free-body diagram you draw from now on.</p>
${supportsTable}
<p>If the supports provide <strong>exactly</strong> the three reactions that equilibrium can find, and they are arranged so the body can't move, the body is <strong>statically determinate</strong>. More reactions than equations means <strong>statically indeterminate</strong>: you need material deformation to solve it, which comes in a later course (mechanics of materials).</p>

<h2>Drawing the FBD of a rigid body</h2>
<ol><li>Sketch the body alone and remove every support.</li><li>Replace each support with its reactions from the table. Guess their directions; a negative answer just means the reaction points the other way.</li><li>Add every applied load, including the body's own weight at its center of gravity, and replace distributed loads by their resultants (Unit 4).</li><li>Add dimensions.</li></ol>
<div class="tip"><strong>Strategy:</strong> take moments about the point where the <em>most unknown forces meet</em> (usually a pin). Those unknowns then drop out, and you can often solve for one reaction in a single equation.</div>

<div class="example"><h3>Worked example 1: simply supported beam</h3>
<p>A 6 m beam has a pin at $A$ (left end) and a roller at $B$ (right end). A $12\ \text{kN}$ load acts downward 2 m from $A$. Find the reactions.</p>
${S.beamDiagram({ L: 6, supports: [{ type: 'pin', x: 0 }, { type: 'roller', x: 6 }], loads: [{ type: 'point', x: 2, label: '12 kN' }], marks: [2], labels: [{ x: 0, text: 'A' }, { x: 6, text: 'B' }] })}
<ol class="steps">
<li>FBD: $A_x$ and $A_y$ at the pin, $B_y$ (vertical) at the roller, 12 kN down at $x = 2$.</li>
<li>$\sum M_A = 0$: $\ B_y(6) - 12(2) = 0 \Rightarrow B_y = 4\ \text{kN}$ (up). Term by term: $B_y$ pushes up 6 m to the right of $A$, which turns the beam counterclockwise, so $+B_y(6)$. The load pushes down 2 m to the right of $A$, which is clockwise, so $-12(2)$. $A_x$ and $A_y$ act at $A$ itself (zero moment arm), so they drop out.</li>
<li>$\sum F_y = 0$: $\ A_y + 4 - 12 = 0 \Rightarrow A_y = 8\ \text{kN}$ (up).</li>
<li>$\sum F_x = 0$: $\ A_x = 0$ (there are no horizontal loads).</li></ol>
<p class="check">Check with $\sum M_B = 0$: $-A_y(6) + 12(4) = -48 + 48 = 0$ ✓. The support nearer the load carries more of it.</p></div>

<div class="example"><h3>Worked example 2: cantilever with a fixed support</h3>
<p>A 3 m cantilever is built into a wall at $A$. It carries a uniform load of $2\ \text{kN/m}$ along its whole length and a $5\ \text{kN}$ point load at the free end. Find the reactions at the wall.</p>
${S.beamDiagram({ L: 3, supports: [{ type: 'fixed', x: 0 }], loads: [{ type: 'dist', x1: 0, x2: 3, w1: 2, w2: 2, label: '2 kN/m' }, { type: 'point', x: 3, label: '5 kN' }], labels: [{ x: 0.15, text: 'A' }] })}
<ol class="steps">
<li>Replace the uniform load: $2(3) = 6\ \text{kN}$ at $1.5\ \text{m}$ from $A$.</li>
<li>$\sum F_y = 0$: $\ A_y - 6 - 5 = 0 \Rightarrow A_y = 11\ \text{kN}$ (up).</li>
<li>$\sum M_A = 0$ (CCW +): $\ M_A - 6(1.5) - 5(3) = 0 \Rightarrow M_A = 24\ \text{kN·m}$ CCW.</li>
<li>$A_x = 0$.</li></ol>
<p class="check">The loads try to rotate the beam clockwise (droop), so the wall has to push back counterclockwise. A positive $M_A$ in CCW-positive terms confirms it.</p></div>

<h2>Two-force members</h2>
<p>If a body has forces applied at only <strong>two points</strong> (and no moments), then for equilibrium those two forces must be equal, opposite, and <strong>along the line joining the two points</strong>. Struts, links and truss members are two-force members. Spotting them early cuts the number of unknowns. You will use this constantly in Units 6 and 7.</p>

<h2>Key takeaways</h2>
<ul class="takeaways"><li>Three equations in 2D: $\sum F_x$, $\sum F_y$, $\sum M$.</li><li>Roller: 1 unknown. Pin: 2. Fixed: 3 (including a moment).</li><li>Take moments about a point where unknowns meet.</li><li>Always check your answers with an equation you didn't use.</li></ul>
`;

const L_A_B = (L) => [{ type: 'pin', x: 0 }, { type: 'roller', x: L }];
const AB = (L) => [{ x: 0, text: 'A' }, { x: L, text: 'B' }];

const problems = [
  {
    id: 'u5-ss-point', title: 'Simply supported beam, one load', kind: 'numeric',
    gen(r) {
      const L = r.step(3, 12, 1), a = r.step(0.5, L - 0.5, 0.5), P = r.step(2, 50, 1);
      const By = (P * a) / L, Ay = P - By;
      return {
        prompt: String.raw`A $${q(L, 'm')}$ beam is pinned at $A$ (left end) and on a roller at $B$ (right end). A $${q(P, 'kN')}$ downward load acts $${q(a, 'm')}$ from $A$. Find the vertical reactions $A_y$ and $B_y$.`,
        svg: S.beamDiagram({ L, supports: L_A_B(L), loads: [{ type: 'point', x: a, label: fmt(P) + ' kN' }], marks: [a], labels: AB(L) }),
        answers: [ans('Ay', 'A_y', Ay, 'kN'), ans('By', 'B_y', By, 'kN')],
        hints: [String.raw`Take moments about A so $A_x$ and $A_y$ drop out: $B_y L - P a = 0$.`, String.raw`Then $\sum F_y = 0$ gives $A_y$.`],
        solution: String.raw`<ol class="steps"><li>$\sum M_A = 0:\ B_y(${fmt(L)}) - ${fmt(P)}(${fmt(a)}) = 0 \Rightarrow B_y = ${q(By, 'kN')}$</li><li>$\sum F_y = 0:\ A_y = ${fmt(P)} - ${fmt(By)} = ${q(Ay, 'kN')}$</li></ol><p class="check">Check: $\sum M_B = -A_y(${fmt(L)}) + ${fmt(P)}(${fmt(L - a)}) = ${fmt(-Ay * L + P * (L - a))}$ ✓</p>`,
      };
    },
  },
  {
    id: 'u5-ss-two', title: 'Simply supported beam, two loads', kind: 'numeric',
    gen(r) {
      const L = r.step(4, 12, 1);
      const a1 = r.step(0.5, L / 2, 0.5), a2 = r.step(L / 2 + 0.5, L - 0.5, 0.5);
      const P1 = r.step(2, 30, 1), P2 = r.step(2, 30, 1);
      const By = (P1 * a1 + P2 * a2) / L, Ay = P1 + P2 - By;
      return {
        prompt: String.raw`A $${q(L, 'm')}$ beam (pin at $A$, roller at $B$) carries $${q(P1, 'kN')}$ at $${q(a1, 'm')}$ and $${q(P2, 'kN')}$ at $${q(a2, 'm')}$ from $A$, both downward. Find $A_y$ and $B_y$.`,
        svg: S.beamDiagram({ L, supports: L_A_B(L), loads: [{ type: 'point', x: a1, label: fmt(P1) + ' kN' }, { type: 'point', x: a2, label: fmt(P2) + ' kN' }], marks: [a1, a2], labels: AB(L) }),
        answers: [ans('Ay', 'A_y', Ay, 'kN'), ans('By', 'B_y', By, 'kN')],
        hints: [String.raw`$\sum M_A = 0$: $B_y L = P_1a_1 + P_2a_2$.`, String.raw`$\sum F_y = 0$ for $A_y$.`],
        solution: String.raw`<ol class="steps"><li>$\sum M_A = 0:\ B_y(${fmt(L)}) = ${fmt(P1)}(${fmt(a1)}) + ${fmt(P2)}(${fmt(a2)}) \Rightarrow B_y = ${q(By, 'kN')}$</li><li>$A_y = ${fmt(P1 + P2)} - ${fmt(By)} = ${q(Ay, 'kN')}$</li></ol>`,
      };
    },
  },
  {
    id: 'u5-ss-udl', title: 'Simply supported beam, partial uniform load', kind: 'numeric',
    gen(r) {
      const L = r.step(4, 12, 1), a = r.step(0, L - 2, 1), b = r.step(a + 1, L, 1), w = r.step(1, 10, 0.5);
      const F = w * (b - a), c = (a + b) / 2, By = (F * c) / L, Ay = F - By;
      return {
        prompt: String.raw`A $${q(L, 'm')}$ beam (pin at $A$, roller at $B$) has a uniform load of $${q(w, 'kN/m')}$ from $x = ${fmt(a)}$ to $x = ${fmt(b)}\ \text{m}$. Find $A_y$ and $B_y$.`,
        svg: S.beamDiagram({ L, supports: L_A_B(L), loads: [{ type: 'dist', x1: a, x2: b, w1: w, w2: w, label: fmt(w) + ' kN/m' }], marks: [a, b], labels: AB(L) }),
        given: { L, a, b, w },
        answers: [ans('Ay', 'A_y', Ay, 'kN'), ans('By', 'B_y', By, 'kN')],
        hints: [String.raw`Replace the distributed load with its resultant: $w(b-a)$ at the middle of the loaded length.`, 'Then solve it like a single point load.'],
        solution: String.raw`<ol class="steps"><li>Resultant: $${fmt(w)}(${fmt(b - a)}) = ${fmt(F)}\ \text{kN}$ at $x = ${fmt(c)}\ \text{m}$</li><li>$\sum M_A = 0:\ B_y(${fmt(L)}) = ${fmt(F)}(${fmt(c)}) \Rightarrow B_y = ${q(By, 'kN')}$</li><li>$A_y = ${fmt(F)} - ${fmt(By)} = ${q(Ay, 'kN')}$</li></ol>`,
      };
    },
  },
  {
    id: 'u5-overhang', title: 'Beam with an overhang', kind: 'numeric',
    gen(r) {
      const L = r.step(3, 8, 0.5), c = r.step(0.5, 3, 0.5), P = r.step(2, 30, 1);
      const By = (P * (L + c)) / L, Ay = -(P * c) / L;
      return {
        prompt: String.raw`A beam is pinned at $A$ ($x = 0$) and rests on a roller at $B$ ($x = ${fmt(L)}\ \text{m}$). It overhangs past $B$ to a free end at $x = ${fmt(L + c)}\ \text{m}$, where a $${q(P, 'kN')}$ downward load hangs. Find $A_y$ and $B_y$ (positive = upward).`,
        svg: S.beamDiagram({ L: L + c, supports: [{ type: 'pin', x: 0 }, { type: 'roller', x: L }], loads: [{ type: 'point', x: L + c, label: fmt(P) + ' kN' }], marks: [L], labels: [{ x: 0, text: 'A' }, { x: L, text: 'B' }] }),
        given: { L, c, P },
        answers: [ans('Ay', 'A_y', Ay, 'kN'), ans('By', 'B_y', By, 'kN')],
        hints: [String.raw`$\sum M_A = 0$: $B_y L - P(L + c) = 0$.`, String.raw`$\sum F_y = 0$. Expect $A_y$ to come out negative: the pin has to hold the beam <em>down</em> as it see-saws over B.`],
        solution: String.raw`<ol class="steps"><li>$\sum M_A = 0:\ B_y(${fmt(L)}) - ${fmt(P)}(${fmt(L + c)}) = 0 \Rightarrow B_y = ${q(By, 'kN')}$</li><li>$\sum F_y = 0:\ A_y = ${fmt(P)} - ${fmt(By)} = ${q(Ay, 'kN')}$</li><li>Negative: $A_y$ actually points <strong>down</strong>. The pin must hold the beam down.</li></ol>`,
      };
    },
  },
  {
    id: 'u5-cantilever', title: 'Cantilever reactions', kind: 'numeric',
    gen(r) {
      const L = r.step(1, 5, 0.5), w = r.step(0.5, 6, 0.5), P = r.step(1, 15, 1);
      const Ay = w * L + P, MA = (w * L * L) / 2 + P * L;
      return {
        prompt: String.raw`A cantilever of length $${q(L, 'm')}$ is fixed into a wall at $A$. It carries a uniform load of $${q(w, 'kN/m')}$ along its full length and a $${q(P, 'kN')}$ downward load at the free end. Find the wall reactions $A_y$ and $M_A$ (CCW positive).`,
        svg: S.beamDiagram({ L, supports: [{ type: 'fixed', x: 0 }], loads: [{ type: 'dist', x1: 0, x2: L, w1: w, w2: w, label: fmt(w) + ' kN/m' }, { type: 'point', x: L, label: fmt(P) + ' kN' }], labels: [{ x: 0.08 * L, text: 'A' }] }),
        given: { L, w, P },
        answers: [ans('Ay', 'A_y', Ay, 'kN'), ans('MA', 'M_A', MA, 'kN·m')],
        hints: ['A fixed support provides two force components and a moment.', String.raw`Uniform load $\to wL$ at $L/2$. Then $\sum M_A = 0$: $M_A - wL(L/2) - PL = 0$.`],
        solution: String.raw`<ol class="steps"><li>$\sum F_y = 0:\ A_y = ${fmt(w)}(${fmt(L)}) + ${fmt(P)} = ${q(Ay, 'kN')}$</li><li>$\sum M_A = 0:\ M_A - ${fmt(w * L)}(${fmt(L / 2)}) - ${fmt(P)}(${fmt(L)}) = 0$</li><li>$M_A = ${q(MA, 'kN·m')}$ (CCW)</li></ol>`,
      };
    },
  },
  {
    id: 'u5-angled', title: 'Beam with an inclined load', kind: 'numeric',
    gen(r) {
      const L = r.step(3, 10, 1), a = r.step(1, L - 1, 0.5), P = r.step(2, 40, 1), th = r.step(20, 70, 5);
      const Px = P * cosd(th), Py = P * sind(th);
      const Ax = -Px, By = (Py * a) / L, Ay = Py - By;
      return {
        prompt: String.raw`A $${q(L, 'm')}$ beam has a pin at $A$ (left end) and a roller at $B$ (right end). At $${q(a, 'm')}$ from $A$, a $${q(P, 'kN')}$ force pushes down and to the <strong>right</strong> at $${th}^\circ$ below the horizontal. Find $A_x$, $A_y$ and $B_y$ (positive = right / up).`,
        svg: S.beamDiagram({ L, supports: L_A_B(L), loads: [{ type: 'point', x: a, angle: -th, label: fmt(P) + ' kN' }], marks: [a], labels: AB(L) }),
        given: { L, a, P, th },
        answers: [ans('Ax', 'A_x', Ax, 'kN'), ans('Ay', 'A_y', Ay, 'kN'), ans('By', 'B_y', By, 'kN')],
        hints: [String.raw`Split the load: horizontal part $P\cos${th}^\circ$ (to the right) and vertical part $P\sin${th}^\circ$ (down).`, 'The roller can only push vertically, so the pin must take all of the horizontal load.', String.raw`$\sum M_A$ involves only the vertical part (the horizontal part acts along the beam's axis and passes through A).`],
        solution: String.raw`<ol class="steps"><li>$P_x = ${fmt(P)}\cos${th}^\circ = ${fmt(Px)}\ \text{kN}$ (→), $\ P_y = ${fmt(P)}\sin${th}^\circ = ${fmt(Py)}\ \text{kN}$ (↓)</li><li>$\sum F_x = 0:\ A_x + ${fmt(Px)} = 0 \Rightarrow A_x = ${q(Ax, 'kN')}$ (points left)</li><li>$\sum M_A = 0:\ B_y(${fmt(L)}) - ${fmt(Py)}(${fmt(a)}) = 0 \Rightarrow B_y = ${q(By, 'kN')}$</li><li>$\sum F_y = 0:\ A_y = ${fmt(Py)} - ${fmt(By)} = ${q(Ay, 'kN')}$</li></ol>`,
      };
    },
  },
  {
    id: 'u5-boom', title: 'Boom held by a cable', kind: 'numeric',
    gen(r) {
      const L = r.step(2, 6, 0.5), h = r.step(1, 4, 0.5), W = r.step(1, 20, 1), Wb = r.step(0.5, 5, 0.5);
      const d = Math.hypot(L, h), s = h / d, c = L / d;
      const T = (W * L + (Wb * L) / 2) / (L * s), Ax = T * c, Ay = W + Wb - T * s;
      const ox = 40, oy = 150, sc = 200 / Math.max(L, h * 1.2);
      const bx = ox + L * sc, cy = oy - h * sc;
      return {
        prompt: String.raw`A horizontal boom $AB$, $${q(L, 'm')}$ long and weighing $${q(Wb, 'kN')}$ (acting at its midpoint), is pinned to a wall at $A$. A cable runs from end $B$ to point $C$ on the wall, $${q(h, 'm')}$ directly above $A$. A $${q(W, 'kN')}$ load hangs from $B$. Find the cable tension $T$ and the horizontal pin reaction $A_x$ (positive = away from the wall).`,
        svg: S.svg(300, 200, S.wall(ox, Math.max(5, cy - 15), oy + 25, -1) + S.beam(ox, bx, oy, 10) + S.node(ox, oy) + S.line(bx, oy, ox, cy) + S.node(ox, cy) + S.text(ox + 12, cy - 6, 'C', { anchor: 'start' }) + S.text(ox + 10, oy + 18, 'A', { anchor: 'start' }) + S.text(bx + 10, oy - 10, 'B') + S.line(bx, oy, bx, oy + 22) + S.rect(bx - 12, oy + 22, 24, 18) + S.text(bx, oy + 31, 'W', { cls: 'dg-td' }), 'boom and cable'),
        given: { L, h, W, Wb },
        answers: [ans('T', 'T', T, 'kN'), ans('Ax', 'A_x', Ax, 'kN')],
        hints: [String.raw`The cable angle: $\tan\phi = h/L$ (measured at B, above the horizontal).`, String.raw`$\sum M_A = 0$ removes both pin components: $T\sin\phi\,L = WL + W_b(L/2)$.`, String.raw`$\sum F_x = 0$: the pin pushes the boom away from the wall with $A_x = T\cos\phi$.`],
        solution: String.raw`<ol class="steps"><li>Cable length $= \sqrt{${fmt(L)}^2 + ${fmt(h)}^2} = ${fmt(d)}\ \text{m}$, so $\sin\phi = ${fmt(s)}$, $\cos\phi = ${fmt(c)}$</li><li>$\sum M_A = 0:\ T(${fmt(s)})(${fmt(L)}) = ${fmt(W)}(${fmt(L)}) + ${fmt(Wb)}(${fmt(L / 2)})$</li><li>$T = ${q(T, 'kN')}$</li><li>$\sum F_x = 0:\ A_x - T\cos\phi = 0 \Rightarrow A_x = ${q(Ax, 'kN')}$</li><li>(Also $A_y = W + W_b - T\sin\phi = ${fmt(Ay)}\ \text{kN}$.)</li></ol>`,
      };
    },
  },
  {
    id: 'u5-couple-beam', title: 'Beam loaded by a couple', kind: 'numeric',
    gen(r) {
      const L = r.step(2, 10, 1), a = r.step(0.5, L - 0.5, 0.5), M0 = r.step(5, 60, 5), ccw = r.next() < 0.5;
      const M = ccw ? M0 : -M0, By = -M / L, Ay = M / L;
      return {
        prompt: String.raw`A $${q(L, 'm')}$ beam (pin at $A$, roller at $B$) has only a $${q(M0, 'kN·m')}$ <strong>${ccw ? 'counterclockwise' : 'clockwise'}</strong> couple applied at $${q(a, 'm')}$ from $A$. Find $A_y$ and $B_y$ (positive = up).`,
        svg: S.beamDiagram({ L, supports: L_A_B(L), loads: [{ type: 'moment', x: a, ccw, label: fmt(M0) + ' kN·m' }], marks: [a], labels: AB(L) }),
        answers: [ans('Ay', 'A_y', Ay, 'kN'), ans('By', 'B_y', By, 'kN')],
        hints: ['A couple adds no force, only moment, and its moment is the same about every point.', String.raw`$\sum M_A = 0$: $B_y L + M = 0$, with $M$ positive if CCW.`],
        solution: String.raw`<ol class="steps"><li>$\sum M_A = 0:\ B_y(${fmt(L)}) + (${fmt(M)}) = 0 \Rightarrow B_y = ${q(By, 'kN')}$</li><li>$\sum F_y = 0:\ A_y = -B_y = ${q(Ay, 'kN')}$</li></ol><p class="check">Notice the answer doesn't depend on where the couple is applied. The two reactions form an equal and opposite couple.</p>`,
      };
    },
  },
  {
    id: 'u5-mc-concepts', title: 'Concept check: supports & FBDs', kind: 'mc',
    gen: mcPool([
      { q: 'How many unknown reactions does a fixed (built-in) support provide in 2D?', correct: 'Three: two forces and a moment', wrong: ['One', 'Two forces only', 'Four'], why: 'A fixed support prevents horizontal motion, vertical motion and rotation, so it supplies one reaction for each.' },
      { q: 'A beam has a pin at one end and rollers at the middle and at the other end. It is…', correct: 'statically indeterminate (4 unknowns, 3 equations)', wrong: ['statically determinate', 'unstable, since it can roll away', 'a two-force member'], why: 'Pin (2) + roller (1) + roller (1) = 4 unknown reactions, but 2D equilibrium gives only 3 equations.' },
      { q: 'A straight strut is pinned at both ends with no loads between the pins. The force in it must act…', correct: 'along the line joining the two pins', wrong: ['perpendicular to the strut', 'vertically', 'in any direction'], why: 'It is a two-force member. Two forces in equilibrium must be collinear, so they lie along the line between the pins.' },
      { q: 'What reaction does a roller on a horizontal surface provide?', correct: 'A single force perpendicular to the surface', wrong: ['A horizontal and a vertical force', 'A force and a moment', 'A force parallel to the surface'], why: 'A roller stops motion into the surface only. It can roll freely along the surface and rotate.' },
      { q: 'You solve for a pin reaction and get a negative value. You should…', correct: 'keep the number; it means the reaction points opposite to your assumed direction', wrong: ['restart, since negative reactions are impossible', 'drop the negative sign and report it as positive', 'add 180° to every angle'], why: 'Unlike cables, pins and rollers (if attached) can push or pull. A negative result means your guessed direction was backwards.' },
      { q: 'Why take moments about the pin first when solving a pinned-and-roller beam?', correct: 'Both unknown pin components pass through it and drop out', wrong: ['Moments are only valid about pins', 'It makes the loads larger', 'Roller reactions don\'t produce moments'], why: 'A force through the moment center makes no moment. That leaves one equation with one unknown (the roller reaction).' },
    ]),
  },
];

module.exports = {
  num: 5, slug: 'rigid-body-equilibrium', title: 'Rigid-Body Equilibrium & FBDs',
  blurb: 'Supports and reactions, free-body diagrams, ΣM = 0, beams, cantilevers and two-force members.',
  lesson, problems,
};
