'use strict';
const { readMath: RM } = require('../skills');
const { fmt, q, ans, mcPool } = require('../helpers');
const S = require('../svg');

function strutSvg(L, b, h) {
  const ox = 50, oy = 60, sc = 230 / L;
  const Bx = ox + b * sc, Cx = ox + L * sc, Dy = oy + h * sc;
  return S.svg(320, Math.max(150, Dy + 30), S.wall(ox, oy - 25, Dy + 15, -1) + S.beam(ox, Cx, oy, 10) + S.line(ox, Dy, Bx, oy, 'dg-mem') + S.node(ox, oy) + S.node(Bx, oy) + S.node(ox, Dy) +
    S.text(ox + 10, oy - 14, 'A') + S.text(Bx, oy - 14, 'B') + S.text(Cx - 6, oy - 14, 'C') + S.text(ox + 14, Dy + 4, 'D', { anchor: 'start' }) +
    S.arrow(Cx - 4, oy - 60, Cx - 4, oy - 7, { label: 'P', lx: Cx - 16, ly: oy - 52, anchor: 'end' }) + S.vdim(ox - 30, oy, Dy, 'h', -1), 'bar and strut frame');
}

const lesson = String.raw`
<h2>Frames and machines vs. trusses</h2>
<p>In a truss every member is a two-force member. <strong>Frames</strong> (structures that stay put, like a shelf bracket or an A-frame) and <strong>machines</strong> (devices with moving parts that transmit force, like pliers, scissors or a car jack) contain at least one <strong>multi-force member</strong>: a member loaded at three or more points, or loaded along its length. Those members can bend, so their pin forces are <em>not</em> along the member, and each pin force has two unknown components.</p>

<h2>The method</h2>
<ol><li><strong>Look for two-force members first.</strong> Their force direction is known (along the line between their two pins), so each has just one unknown.</li>
<li><strong>Whole-structure FBD</strong> (if useful): find whatever support reactions you can.</li>
<li><strong>Take it apart.</strong> Draw an FBD of each multi-force member. Where two members share a pin, the forces on them are <strong>equal and opposite</strong> (Newton's third law). Use the same symbols with opposite arrows.</li>
<li>Write $\gl{sigma}{\sum} F_x$, $\sum F_y$, $\sum \gl{moment}{M}$ for each member and solve. Moments about a pin are your best friend.</li></ol>
${RM([["D\\to B", "“from D to B”", "The direction from point D toward point B."], ["(1.2,\\ 0.9)/1.5 = (0.8,\\ 0.6)", "“1.2, 0.9, over 1.5”", "Divide a displacement by its length to get a unit vector: the force's direction with length 1."], ["F_{BD}(0.6)(1.2)", "“F-B-D times 0.6 times 1.2”", "The vertical part of the strut force ($0.6F_{BD}$) times its moment arm about A (1.2 m)."]], ["vectors", "linsys", "signs"])}
<p>Frames often give several equations in several unknowns (three equations per member). Write them all down, then find one with a single unknown (usually a moment equation about a pin), solve it, and work outward. It's back-substitution, the same strategy as solving a linear system.</p>
<div class="tip">If a load is applied right at a pin, put it on just one of the members' FBDs (or on the pin by itself), never on both.</div>

<div class="example"><h3>Worked example 1: bar supported by a strut</h3>
<p>A horizontal bar $AC$ ($2\ \text{m}$ long) is pinned to a wall at $A$. Strut $BD$ connects the bar at $B$ ($1.2\ \text{m}$ from $A$) to the wall at $D$, $0.9\ \text{m}$ below $A$. A $3\ \text{kN}$ load hangs at $C$. Find the strut force and the pin reaction at $A$.</p>
${strutSvg(2, 1.2, 0.9)}
<ol class="steps">
<li>$BD$ is pinned at both ends with no load in between, so it's a <strong>two-force member</strong>. Length $\sqrt{1.2^2 + 0.9^2} = 1.5\ \text{m}$. Assume it's in compression and pushes up on the bar at $B$ along $D\to B$: direction $(1.2, 0.9)/1.5 = (0.8, 0.6)$.</li>
<li>FBD of bar $AC$, $\sum M_A = 0$: $\ F_{BD}(0.6)(1.2) - 3(2) = 0 \gl{implies}{\Rightarrow} F_{BD} = 8.33\ \text{kN}$ (compression ✓).</li>
<li>$\sum F_x = 0$: $\ A_x + 8.33(0.8) = 0 \Rightarrow A_x = -6.67\ \text{kN}$ (the wall pulls the bar left).</li>
<li>$\sum F_y = 0$: $\ A_y + 8.33(0.6) - 3 = 0 \Rightarrow A_y = -2.0\ \text{kN}$ (down).</li></ol>
<p class="check">The bar acts like a lever pivoting at B: the load at C tries to lift end A, so the pin at A has to hold it down.</p></div>

<div class="example"><h3>Worked example 2: pliers (a machine)</h3>
<p>You squeeze pliers handles with $F = 100\ \text{N}$, $90\ \text{mm}$ from the pivot. The jaws grip a wire $20\ \text{mm}$ from the pivot. Find the gripping force $Q$ and the pin force.</p>
${S.svg(320, 140, S.line(30, 50, 290, 90, 'dg-mem') + S.line(30, 90, 290, 50, 'dg-mem') + S.node(160, 70, 5) + S.text(160, 92, 'pin') + S.arrow(60, 12, 60, 50, { label: 'F', lx: 72, ly: 18, anchor: 'start' }) + S.arrow(60, 128, 60, 92, { label: 'F', lx: 72, ly: 122, anchor: 'start' }) + S.circle(250, 70, 7, 'dg-sup') + S.text(250, 104, 'wire') + S.dim(60, 160, 136, '90 mm') + S.dim(160, 250, 20, '20 mm'), 'pliers')}
<ol class="steps">
<li>One handle-and-jaw piece is a multi-force member: hand force $F$, jaw force $Q$ from the wire, and the pin force.</li>
<li>$\sum M_{\text{pin}} = 0$: $\ F(90) = Q(20) \Rightarrow Q = 100(90/20) = 450\ \text{N}$.</li>
<li>$F$ and $Q$ act in the same direction on that piece (on opposite sides of the pin), so the pin supplies $F + Q = 550\ \text{N}$ the other way.</li></ol>
<p class="check">Mechanical advantage $= 90/20 = 4.5$. You trade a big handle swing for a small, powerful jaw motion.</p></div>

<h2>Key takeaways</h2>
<ul class="takeaways"><li>Find two-force members first: one unknown each, with a known direction.</li><li>Multi-force members: two unknown components at each pin.</li><li>Shared pins: equal and opposite forces on the two members.</li><li>Machine mechanical advantage = output force / input force = ratio of lever arms.</li></ul>
`;

const problems = [
  {
    id: 'u7-pliers', title: 'Pliers: grip force & pin force', kind: 'numeric',
    gen(r) {
      const F = r.step(20, 300, 10), a = r.step(60, 200, 5), b = r.step(10, 45, 5);
      const Q = (F * a) / b, Pin = F + Q;
      return {
        prompt: String.raw`Pliers are squeezed with $${q(F, 'N')}$ on each handle at $${q(a, 'mm')}$ from the pivot pin. The jaws grip a bolt $${q(b, 'mm')}$ from the pin. Find the force $Q$ on the bolt and the magnitude of the pin force on one half of the pliers.`,
        answers: [ans('Q', 'Q', Q, 'N'), ans('P', 'F_{pin}', Pin, 'N')],
        hints: ['FBD of one half: hand force, bolt force on the jaw, and the pin force.', String.raw`$\sum M_{\text{pin}} = 0$: $F a = Q b$.`, String.raw`The hand force and jaw force point the same way on that piece (they're on opposite sides of the pin), so the pin balances their sum.`],
        solution: String.raw`<ol class="steps"><li>$Q = F\dfrac{a}{b} = ${fmt(F)}\dfrac{${fmt(a)}}{${fmt(b)}} = ${q(Q, 'N')}$</li><li>$\sum F = 0:\ F_{pin} = F + Q = ${q(Pin, 'N')}$</li></ol>`,
      };
    },
  },
  {
    id: 'u7-strut', title: 'Bar supported by a strut', kind: 'numeric',
    gen(r) {
      const L = r.step(1.5, 4, 0.25), b = +(L * r.step(0.4, 0.8, 0.05)).toFixed(2), h = r.step(0.5, 2, 0.25), P = r.step(1, 20, 1);
      const s = Math.hypot(b, h), C = (P * L * s) / (b * h), Ax = (-C * b) / s, Ay = P - (C * h) / s;
      return {
        prompt: String.raw`Horizontal bar $AC$ ($${q(L, 'm')}$ long) is pinned to a wall at $A$. Strut $BD$ joins the bar at $B$ ($${q(b, 'm')}$ from $A$) to the wall at $D$, $${q(h, 'm')}$ below $A$. A $${q(P, 'kN')}$ load hangs at $C$. Find the compressive force in the strut and the components $A_x$, $A_y$ of the pin reaction on the bar (+x away from the wall, +y up).`,
        svg: strutSvg(L, b, h),
        given: { L, b, h, P },
        answers: [ans('C', 'F_{BD}', C, 'kN'), ans('Ax', 'A_x', Ax, 'kN'), ans('Ay', 'A_y', Ay, 'kN')],
        hints: [String.raw`Strut BD is a two-force member, so its force on the bar acts along D→B, direction $(${fmt(b)}, ${fmt(h)})/${fmt(s)}$.`, String.raw`$\sum M_A = 0$ on the bar: (vertical part of strut force)$\times b = P\times L$.`, 'Then sum the x and y forces on the bar.'],
        solution: String.raw`<ol class="steps"><li>$|BD| = ${fmt(s)}\ \text{m}$</li><li>$\sum M_A = 0:\ F_{BD}\tfrac{${fmt(h)}}{${fmt(s)}}(${fmt(b)}) - ${fmt(P)}(${fmt(L)}) = 0 \Rightarrow F_{BD} = ${q(C, 'kN')}$ (C)</li><li>$\sum F_x = 0:\ A_x + F_{BD}\tfrac{${fmt(b)}}{${fmt(s)}} = 0 \Rightarrow A_x = ${q(Ax, 'kN')}$</li><li>$\sum F_y = 0:\ A_y + F_{BD}\tfrac{${fmt(h)}}{${fmt(s)}} - ${fmt(P)} = 0 \Rightarrow A_y = ${q(Ay, 'kN')}$</li></ol>`,
      };
    },
  },
  {
    id: 'u7-nutcracker', title: 'Nutcracker (second-class lever)', kind: 'numeric',
    gen(r) {
      const F = r.step(10, 80, 5), L = r.step(120, 220, 10), d = r.step(20, 60, 5);
      const N = (F * L) / d, H = N - F;
      return {
        prompt: String.raw`A nutcracker's two arms are hinged together at one end. A nut sits $${q(d, 'mm')}$ from the hinge, and you squeeze each arm with $${q(F, 'N')}$ at $${q(L, 'mm')}$ from the hinge. What force is applied to the nut, and how large is the hinge force on one arm?`,
        svg: S.svg(320, 120, S.line(30, 60, 290, 30, 'dg-mem') + S.line(30, 60, 290, 90, 'dg-mem') + S.node(30, 60, 5) + S.circle(30 + 260 * d / L * 0.9, 60, 9, 'dg-sup') + S.arrow(275, 0, 275, 30, { label: 'F', lx: 287, ly: 8, anchor: 'start' }) + S.arrow(275, 120, 275, 92, { label: 'F', lx: 287, ly: 114, anchor: 'start' }) + S.text(30, 82, 'hinge'), 'nutcracker'),
        answers: [ans('N', 'N', N, 'N'), ans('H', 'F_{hinge}', H, 'N')],
        hints: ['FBD of one arm: your hand force at the end, the nut pushing back between, and the hinge force.', String.raw`$\sum M_{\text{hinge}} = 0$: $F L = N d$.`, 'Here the hand force and nut force point in opposite directions on the arm, so the hinge carries their difference.'],
        solution: String.raw`<ol class="steps"><li>$N = F\dfrac{L}{d} = ${fmt(F)}\dfrac{${fmt(L)}}{${fmt(d)}} = ${q(N, 'N')}$</li><li>$\sum F = 0$ on the arm: $F_{hinge} = N - F = ${q(H, 'N')}$</li></ol>`,
      };
    },
  },
  {
    id: 'u7-aframe', title: 'A-frame with a tie', kind: 'numeric',
    gen(r) {
      const b = r.step(0.5, 2, 0.25), H = r.step(1.5, 4, 0.25), yt = +(H * r.step(0.2, 0.6, 0.1)).toFixed(3), P = r.step(0.5, 10, 0.5);
      const T = (b * P) / (2 * (H - yt)), N = P / 2;
      const ox = 160, base = 180, sc = 140 / Math.max(H, b);
      const lx = ox - b * sc, rx = ox + b * sc, ay = base - H * sc, ty = base - yt * sc, tx = b * sc * (yt / H);
      return {
        prompt: String.raw`An A-frame stands on a smooth floor. Its two legs are pinned together at the apex, ${fmt(H)} m above the floor, and the feet are ${fmt(2 * b)} m apart. A horizontal tie connects the legs ${fmt(yt)} m above the floor. A $${q(P, 'kN')}$ load hangs from the apex. Find the floor reaction under each foot and the tension in the tie.`,
        svg: S.svg(320, 200, S.hatch(lx - 20, rx + 20, base) + S.line(lx, base, ox, ay, 'dg-mem') + S.line(rx, base, ox, ay, 'dg-mem') + S.line(lx + tx, ty, rx - tx, ty, 'dg-mem') + S.node(ox, ay) + S.arrow(ox, ay + 8, ox, ay + 50, { label: 'P', lx: ox + 12, ly: ay + 40, anchor: 'start' }) + S.text(ox, ty - 10, 'tie', { cls: 'dg-td' }) + S.vdim(rx + 30, ay, base, fmt(H) + ' m') + S.dim(lx, rx, base + 14, fmt(2 * b) + ' m'), 'A-frame'),
        given: { b, H, yt, P },
        answers: [ans('N', 'N', N, 'kN'), ans('T', 'T', T, 'kN')],
        hints: ['Whole frame: the floor is smooth, so each foot gets only a vertical reaction, and symmetry splits P equally.', String.raw`Then draw ONE leg. Take moments about the apex pin so the unknown pin forces there drop out.`, String.raw`On the left leg: the foot is $b$ left of and $H$ below the apex; the tie force acts $(H - y_t)$ below the apex.`],
        solution: String.raw`<ol class="steps"><li>Whole frame, symmetric: $N = P/2 = ${q(N, 'kN')}$ at each foot</li><li>Left leg, $\sum M_{\text{apex}} = 0$: the foot reaction makes $-N b$ (CW) and the tie (pulling the leg inward) makes $+T(H - y_t)$</li><li>$T(${fmt(H - yt)}) = ${fmt(N)}(${fmt(b)}) \Rightarrow T = ${q(T, 'kN')}$</li></ol><p class="check">A lower tie (smaller $y_t$) has a longer lever arm about the apex, so it needs less tension.</p>`,
      };
    },
  },
  {
    id: 'u7-tackle', title: 'Block and tackle', kind: 'numeric',
    gen(r) {
      const W = r.step(200, 3000, 50), n = r.pick([2, 3, 4, 5, 6]), dz = r.step(0.2, 2, 0.1);
      const F = W / n, rope = n * dz;
      return {
        prompt: String.raw`An ideal (frictionless) block and tackle has $${n}$ rope segments supporting the moving block. To lift a $${q(W, 'N')}$ engine slowly, what pull $F$ is needed on the free end, and how much rope must you pull through to raise the engine $${q(dz, 'm')}$?`,
        answers: [ans('F', 'F', F, 'N'), ans('L', String.raw`\Delta L`, rope, 'm')],
        hints: ['It\'s one continuous rope over ideal pulleys, so every segment has the same tension F.', String.raw`FBD of the moving block: $nF = W$.`, 'Each of the n segments must shorten by the lift height.'],
        solution: String.raw`<ol class="steps"><li>$${n}F = ${fmt(W)} \Rightarrow F = ${q(F, 'N')}$</li><li>$\Delta L = ${n}\times${fmt(dz)} = ${q(rope, 'm')}$</li></ol><p class="check">Force is reduced by ${n}, distance increased by ${n}: work in = work out.</p>`,
      };
    },
  },
  {
    id: 'u7-gerber', title: 'Compound beam with an internal hinge', kind: 'numeric',
    gen(r) {
      const a = r.step(1, 4, 0.5), c = r.step(2, 6, 0.5), e = r.step(0.5, c - 0.5, 0.5), P = r.step(2, 30, 1);
      const By = (P * e) / c, Vc = P - By, Ay = Vc, MA = Vc * a;
      return {
        prompt: String.raw`Beam $AC$ ($${q(a, 'm')}$ long) is fixed into a wall at $A$. At $C$ it is joined by a frictionless hinge to beam $CB$ ($${q(c, 'm')}$ long), which rests on a roller at $B$. A $${q(P, 'kN')}$ load acts down on $CB$ at $${q(e, 'm')}$ from $C$. Find the roller reaction $B_y$, the wall reaction $A_y$, and the wall moment $M_A$ (CCW +).`,
        svg: S.beamDiagram({ L: a + c, supports: [{ type: 'fixed', x: 0 }, { type: 'roller', x: a + c }], loads: [{ type: 'point', x: a + e, label: fmt(P) + ' kN' }], marks: [a, a + e], labels: [{ x: a, text: 'C (hinge)' }, { x: a + c, text: 'B' }] }).replace('</svg>', `${S.circle(35 + (270 * a) / (a + c), 110, 5, 'dg-hinge')}</svg>`),
        given: { a, c, e, P },
        answers: [ans('By', 'B_y', By, 'kN'), ans('Ay', 'A_y', Ay, 'kN'), ans('MA', 'M_A', MA, 'kN·m')],
        hints: ['A hinge can\'t carry a moment. Split the beam at C and start with the simpler piece, CB.', String.raw`On CB: take moments about C to get $B_y$, then $\sum F_y$ gives the hinge force $C_y$.`, String.raw`On AC: the hinge pushes down with $C_y$ at distance $a$ from the wall.`],
        solution: String.raw`<ol class="steps"><li>Piece CB, $\sum M_C = 0$: $B_y(${fmt(c)}) - ${fmt(P)}(${fmt(e)}) = 0 \Rightarrow B_y = ${q(By, 'kN')}$</li><li>Piece CB, $\sum F_y = 0$: $C_y = ${fmt(P)} - ${fmt(By)} = ${fmt(Vc)}\ \text{kN}$ (up on CB, so <em>down</em> on AC)</li><li>Piece AC, $\sum F_y = 0$: $A_y = ${q(Ay, 'kN')}$</li><li>Piece AC, $\sum M_A = 0$: $M_A - ${fmt(Vc)}(${fmt(a)}) = 0 \Rightarrow M_A = ${q(MA, 'kN·m')}$</li></ol>`,
      };
    },
  },
  {
    id: 'u7-mc-twoforce', title: 'Identify the two-force member', kind: 'mc',
    gen: mcPool([
      { q: 'A shelf bracket: a horizontal arm is pinned to the wall at A, a diagonal brace is pinned between the wall at D and the arm\'s midpoint B, and books sit on the arm. Which member is a two-force member?', correct: 'The diagonal brace BD', wrong: ['The horizontal arm', 'Both members', 'Neither member'], why: 'The brace has forces only at its two pins (B and D). The arm has forces at A, at B, and from the books, so it is a multi-force member.' },
      { q: 'A member is pinned at both ends and carries its own weight at its midpoint. Is it a two-force member?', correct: 'No: forces act at three points (two pins plus the weight)', wrong: ['Yes, it is pinned at both ends', 'Yes, as long as it is straight', 'Only if it is horizontal'], why: 'A two-force member has forces at exactly two points. If its weight is not negligible, there\'s a third force.' },
      { q: 'The handle of a pair of scissors is…', correct: 'a multi-force member (hand force, cutting force, pin force)', wrong: ['a two-force member', 'a truss member', 'a zero-force member'], why: 'Forces act at three locations, so the pin force isn\'t along any special line. It has two unknown components.' },
    ]),
  },
  {
    id: 'u7-mc-concepts', title: 'Concept check: frames & machines', kind: 'mc',
    gen: mcPool([
      { q: 'Members AB and BC are pinned together at B. On AB the pin force is (3 kN, −2 kN). On BC it is…', correct: '(−3 kN, +2 kN)', wrong: ['(3 kN, −2 kN)', '(3 kN, 2 kN)', 'Cannot be determined'], why: 'Newton\'s third law: the forces two members exert on each other at a shared pin are equal and opposite.' },
      { q: 'What is the main difference between a frame and a truss?', correct: 'A frame has at least one multi-force member', wrong: ['A frame has no pins', 'A truss can\'t carry loads', 'A frame is always 3D'], why: 'In a truss every member is a two-force member. Frames and machines include members loaded at three or more points.' },
      { q: 'A machine has a mechanical advantage of 5. If you apply 40 N, the output force is (ideally)…', correct: '200 N', wrong: ['8 N', '45 N', '40 N'], why: 'Mechanical advantage = output/input, so output = 5 × 40 = 200 N.' },
      { q: 'A load is applied directly at a pin that joins two members. When you draw separate FBDs, you should…', correct: 'put the load on just one member\'s FBD (or on the pin alone)', wrong: ['put the full load on both FBDs', 'split the load in half between them', 'ignore the load'], why: 'Putting it on both counts it twice. Assign it to exactly one body. The pin forces will sort out how it is shared.' },
    ]),
  },
];

module.exports = {
  num: 7, slug: 'frames-machines', title: 'Frames & Machines',
  blurb: 'Multi-force members, taking structures apart, Newton\'s third law at pins, and mechanical advantage.',
  lesson, problems,
};
