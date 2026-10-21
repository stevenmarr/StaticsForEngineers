'use strict';
const { readMath: RM } = require('../skills');
const { fmt, q, ans, mcPool, atand } = require('../helpers');
const S = require('../svg');
const TC = (F) => (Math.abs(F) < 1e-9 ? 'zero-force' : F > 0 ? 'tension (T)' : 'compression (C)');

function pratt(a, h, P1, P2, extra = {}) {
  return S.trussDiagram({
    nodes: { L0: [0, 0], L1: [a, 0], L2: [2 * a, 0], L3: [3 * a, 0], U1: [a, h], U2: [2 * a, h] },
    members: [['L0', 'L1'], ['L1', 'L2'], ['L2', 'L3'], ['U1', 'U2'], ['L0', 'U1'], ['U2', 'L3'], ['L1', 'U1'], ['L2', 'U2'], ['U1', 'L2']],
    pin: 'L0', roller: 'L3',
    loads: [{ node: 'L1', dir: [0, 1], label: P1 }, { node: 'L2', dir: [0, 1], label: P2 }].map((l) => ({ ...l, dir: [0, -1] })),
    dims: [{ a: 'L0', b: 'L1', label: `${extra.a ?? a} m` }, { a: 'L3', b: 'U2', label: `${extra.h ?? h} m`, side: 'right' }],
  });
}
function prattSolve(a, h, P1, P2) {
  const R3 = (P1 + 2 * P2) / 3, R0 = (2 * P1 + P2) / 3, d = Math.hypot(a, h);
  return { R0, R3, d, top: (a * (P1 - 2 * R0)) / h, bot: (a * R0) / h, diag: ((R0 - P1) * d) / h, endDiag: (-R0 * d) / h, L0L1: (R0 * a) / h, vert1: P1 };
}

const lesson = String.raw`
<h2>What is a truss?</h2>
<p>A truss is a structure made of straight, slender members joined at their ends to form triangles. Bridges, roof rafters, cranes and transmission towers are all trusses. Triangles are used because a triangle can't change shape without a member changing length, which is what makes a truss rigid and light.</p>
<p>We analyze trusses with three idealizations:</p>
<ol><li>Members are joined by frictionless <strong>pins</strong>.</li><li>Loads are applied only <strong>at the joints</strong>.</li><li>Member weights are ignored (or split between the two end joints).</li></ol>
<p>With these, every member is a <strong>two-force member</strong> (Unit 5). It is either pulled (<strong>tension, T</strong>) or squeezed (<strong>compression, C</strong>) along its own axis.</p>
<div class="tip"><strong>Sign convention used here:</strong> assume every unknown member force is <em>tension</em>, so it pulls <em>away</em> from the joint on your FBD. A positive answer is tension; a negative answer is compression. Using this every time avoids sign confusion.</div>

<h2>Method of joints</h2>
<p>Each joint is a particle in equilibrium (Unit 2), so $\gl{sigma}{\sum} \gl{sub}{F_x} = 0$ and $\sum F_y = 0$ there: two equations per joint.</p>
<ol><li>Find the support reactions using the whole truss as one rigid body.</li><li>Start at a joint with <strong>no more than two unknown</strong> member forces.</li><li>Solve, then move to a neighboring joint that now has at most two unknowns.</li></ol>
${RM([["F_{AB}", "“F sub A-B”", "The force in member AB (the bar from joint A to joint B). Positive means tension."], ["U_1,\\ L_2", "“U-one, L-two”", "Joint names: U for the upper chord, L for the lower chord, numbered from the left. $F_{U_1L_2}$ is the diagonal from $U_1$ to $L_2$."], ["\\cos\\alpha = 0.8", "“cosine alpha equals 0.8”", "A member's direction comes from geometry (run ÷ length). No protractor angle is needed."]], ["trig", "signs", "linsys"])}
<p><strong>Member components without an angle.</strong> If a member rises 1.5 m over a run of 2 m, its length is $\sqrt{2^2+1.5^2} = 2.5$ m. A force $F$ along it has a horizontal part $F\cdot\tfrac{2}{2.5} = 0.8F$ and a vertical part $F\cdot\tfrac{1.5}{2.5} = 0.6F$. That's the slope-triangle trick from Unit 1, and it's how every truss equation below is built.</p>

<div class="example"><h3>Worked example 1: a simple roof truss</h3>
<p>Truss $ABC$: pin at $A(0,0)$, roller at $C(4,0)$, apex $B(2, 1.5)$ m. A $12\ \text{kN}$ load acts down at $B$. Find all member forces.</p>
${S.trussDiagram({ nodes: { A: [0, 0], B: [2, 1.5], C: [4, 0] }, members: [['A', 'B'], ['B', 'C'], ['A', 'C']], pin: 'A', roller: 'C', loads: [{ node: 'B', dir: [0, -1], label: '12 kN' }], dims: [{ a: 'A', b: 'C', label: '4 m' }, { a: 'C', b: 'B', label: '1.5 m', side: 'right' }] })}
<ol class="steps">
<li>Reactions: by symmetry $A_y = C_y = 6\ \text{kN}$, $A_x = 0$.</li>
<li>Geometry: $AB$ is $\sqrt{2^2 + 1.5^2} = 2.5\ \text{m}$ long, so along $AB$: $\cos\alpha = 0.8$, $\sin\alpha = 0.6$.</li>
<li>Joint $A$, $\sum F_y = 0$: $\ 6 + F_{AB}(0.6) = 0 \Rightarrow F_{AB} = -10\ \text{kN}$ → <strong>10 kN (C)</strong>.</li>
<li>Joint $A$, $\sum F_x = 0$: $\ F_{AC} + F_{AB}(0.8) = 0 \Rightarrow F_{AC} = +8\ \text{kN}$ → <strong>8 kN (T)</strong>.</li>
<li>By symmetry $F_{BC} = 10\ \text{kN}$ (C).</li></ol>
<p class="check">Makes sense: the load pushes the apex down, squeezing the rafters, while the bottom tie keeps the feet from spreading apart, so it's in tension.</p></div>

<h2>Zero-force members</h2>
<p>Spotting these saves time:</p>
<ul><li>If a joint has <strong>only two non-collinear members</strong> and no external load or support, <strong>both</strong> members are zero-force.</li>
<li>If a joint has <strong>three members, two of them collinear</strong>, and no external load, the third (non-collinear) member is zero-force.</li></ul>
<p>Zero-force members aren't useless: they brace the truss, keep long compression members from buckling, and carry load when the loading changes.</p>

<h2>Method of sections</h2>
<p>To find the force in one member in the middle of a big truss, don't march through every joint. <strong>Cut</strong> the truss through that member (and no more than three members in total), and apply all three rigid-body equations to one side:</p>
<ul><li>Take moments about the point where the <em>other two</em> cut members intersect. They drop out, leaving one unknown.</li><li>Use $\sum F_y = 0$ for a diagonal when the other two cut members are horizontal.</li></ul>

<div class="example"><h3>Worked example 2: method of sections</h3>
<p>The Pratt-style truss below has 3 m panels and is 4 m tall. Loads: $6\ \text{kN}$ at $L_1$, $12\ \text{kN}$ at $L_2$. Find the forces in $U_1U_2$, $U_1L_2$ and $L_1L_2$.</p>
${pratt(3, 4, '6 kN', '12 kN')}
<ol class="steps">
<li>Reactions: $\sum \gl{moment}{M_{L_0}} = 0$: $R_3(9) = 6(3) + 12(6) \Rightarrow R_3 = 10\ \text{kN}$; then $R_0 = 18 - 10 = 8\ \text{kN}$.</li>
<li>Cut through $U_1U_2$, $U_1L_2$ and $L_1L_2$, and keep the left piece ($L_0$, $L_1$, $U_1$).</li>
<li>$\sum M_{L_2} = 0$ ($U_1L_2$ and $L_1L_2$ pass through $L_2$): $\ -8(6) + 6(3) - F_{U_1U_2}(4) = 0 \Rightarrow F_{U_1U_2} = -7.5\ \text{kN}$ → <strong>7.5 kN (C)</strong>. Signs, term by term: the 8 kN reaction pushes up 6 m to the left of $L_2$ (clockwise, $-8(6)$); the 6 kN load pushes down 3 m to the left (counterclockwise, $+6(3)$); the assumed-tension force in $U_1U_2$ pulls right, 4 m above $L_2$ (clockwise, $-F(4)$).</li>
<li>$\sum M_{U_1} = 0$: $\ -8(3) + F_{L_1L_2}(4) = 0 \Rightarrow F_{L_1L_2} = 6\ \text{kN}$ → <strong>6 kN (T)</strong>.</li>
<li>$\sum F_y = 0$: $\ 8 - 6 - F_{U_1L_2}(\tfrac45) = 0 \Rightarrow F_{U_1L_2} = 2.5\ \text{kN}$ → <strong>2.5 kN (T)</strong>.</li></ol>
<p class="check">Check $\sum F_x$: $-7.5 + 2.5(\tfrac35) + 6 = 0$ ✓. Top chords of a simply supported truss are in compression and bottom chords in tension, just like the top and bottom of a bending beam.</p></div>

<h2>Key takeaways</h2>
<ul class="takeaways"><li>Truss members are two-force members: tension or compression.</li><li>Assume tension; negative means compression.</li><li>Joints: 2 equations per joint. Start where there are only 2 unknowns.</li><li>Sections: cut at most 3 members, then take moments where two of them meet.</li></ul>
`;

const problems = [
  {
    id: 'u6-roof', title: 'Symmetric roof truss (joints)', kind: 'numeric',
    gen(r) {
      const L = r.step(3, 12, 1), h = r.step(1, 4, 0.5), P = r.step(2, 40, 1);
      const al = atand(h / (L / 2)), d = Math.hypot(L / 2, h);
      const FAB = -(P / 2) * (d / h), FAC = (P / 2) * (L / 2) / h;
      return {
        prompt: String.raw`Truss $ABC$ has a pin at $A(0,0)$, a roller at $C(${fmt(L)},0)$, and apex $B(${fmt(L / 2)}, ${fmt(h)})$ m. A $${q(P, 'kN')}$ load acts downward at $B$. Find $F_{AB}$ and $F_{AC}$ (positive = tension, negative = compression).`,
        svg: S.trussDiagram({ nodes: { A: [0, 0], B: [L / 2, h], C: [L, 0] }, members: [['A', 'B'], ['B', 'C'], ['A', 'C']], pin: 'A', roller: 'C', loads: [{ node: 'B', dir: [0, -1], label: fmt(P) + ' kN' }], dims: [{ a: 'A', b: 'C', label: fmt(L) + ' m' }, { a: 'C', b: 'B', label: fmt(h) + ' m', side: 'right' }] }),
        given: { L, h, P },
        answers: [ans('AB', 'F_{AB}', FAB, 'kN'), ans('AC', 'F_{AC}', FAC, 'kN')],
        hints: [String.raw`Reactions first. By symmetry, $A_y = C_y = P/2$.`, String.raw`At joint A, the direction from A toward B is $(${fmt(L / 2)}, ${fmt(h)})/${fmt(d)}$.`, String.raw`Joint A: $\sum F_y$: $A_y + F_{AB}\cdot\tfrac{${fmt(h)}}{${fmt(d)}} = 0$; then $\sum F_x$: $F_{AC} + F_{AB}\cdot\tfrac{${fmt(L / 2)}}{${fmt(d)}} = 0$.`],
        solution: String.raw`<ol class="steps"><li>$A_y = C_y = ${fmt(P / 2)}\ \text{kN}$</li><li>$|AB| = \sqrt{${fmt(L / 2)}^2 + ${fmt(h)}^2} = ${fmt(d)}\ \text{m}$ ($\alpha = ${fmt(al)}^\circ$)</li><li>Joint A, $\sum F_y$: $${fmt(P / 2)} + F_{AB}(${fmt(h / d)}) = 0 \Rightarrow F_{AB} = ${q(FAB, 'kN')}$ (${TC(FAB)})</li><li>Joint A, $\sum F_x$: $F_{AC} + (${fmt(FAB)})(${fmt(L / 2 / d)}) = 0 \Rightarrow F_{AC} = ${q(FAC, 'kN')}$ (${TC(FAC)})</li></ol>`,
      };
    },
  },
  {
    id: 'u6-right', title: 'Right-triangle truss with a side load', kind: 'numeric',
    gen(r) {
      const L = r.step(2, 8, 0.5), h = r.step(1.5, 6, 0.5), P = r.step(2, 30, 1);
      const d = Math.hypot(L, h), FAC = (P * d) / L, FBC = (-P * h) / L;
      return {
        prompt: String.raw`Truss: pin at $A(0,0)$, roller at $B(${fmt(L)}, 0)$, and joint $C(${fmt(L)}, ${fmt(h)})$ m directly above $B$. Members $AB$, $BC$, $AC$. A horizontal $${q(P, 'kN')}$ force pushes joint $C$ to the right. Find $F_{AC}$ and $F_{BC}$ (T +, C −).`,
        svg: S.trussDiagram({ nodes: { A: [0, 0], B: [L, 0], C: [L, h] }, members: [['A', 'B'], ['B', 'C'], ['A', 'C']], pin: 'A', roller: 'B', loads: [{ node: 'C', dir: [1, 0], label: fmt(P) + ' kN' }], dims: [{ a: 'A', b: 'B', label: fmt(L) + ' m' }, { a: 'B', b: 'C', label: fmt(h) + ' m', side: 'right' }] }),
        given: { L, h, P },
        answers: [ans('AC', 'F_{AC}', FAC, 'kN'), ans('BC', 'F_{BC}', FBC, 'kN')],
        hints: ['Joint C has only two members, so you can start there without finding reactions first.', String.raw`At C, member CA points toward A: $(-${fmt(L)}, -${fmt(h)})/${fmt(d)}$; member CB points straight down.`, String.raw`$\sum F_x$ at C involves only $F_{AC}$.`],
        solution: String.raw`<ol class="steps"><li>$|AC| = ${fmt(d)}\ \text{m}$</li><li>Joint C, $\sum F_x$: $${fmt(P)} - F_{AC}\tfrac{${fmt(L)}}{${fmt(d)}} = 0 \Rightarrow F_{AC} = ${q(FAC, 'kN')}$ (${TC(FAC)})</li><li>Joint C, $\sum F_y$: $-F_{BC} - F_{AC}\tfrac{${fmt(h)}}{${fmt(d)}} = 0 \Rightarrow F_{BC} = ${q(FBC, 'kN')}$ (${TC(FBC)})</li><li>(Joint B then shows $F_{AB} = 0$, and the roller reaction is $B_y = ${fmt(P * h / L)}\ \text{kN}$.)</li></ol>`,
      };
    },
  },
  {
    id: 'u6-wall-bracket', title: 'Wall-mounted truss bracket', kind: 'numeric',
    gen(r) {
      const b = r.step(1, 4, 0.25), h = r.step(0.5, 3, 0.25), P = r.step(1, 25, 1);
      const d = Math.hypot(b, h), FBC = (-P * d) / h, FAC = (P * b) / h;
      return {
        prompt: String.raw`A bracket is pinned to a wall at $A(0,0)$ and $B(0, -${fmt(h)})$ m. Member $AC$ is horizontal, running out to $C(${fmt(b)}, 0)$; member $BC$ runs diagonally from $B$ up to $C$. A sign weighing $${q(P, 'kN')}$ hangs from $C$. Find $F_{AC}$ and $F_{BC}$ (T +, C −).`,
        svg: S.trussDiagram({ nodes: { A: [0, h], B: [0, 0], C: [b, h] }, members: [['A', 'C'], ['B', 'C']], walls: ['A', 'B'], loads: [{ node: 'C', dir: [0, -1], label: fmt(P) + ' kN' }], dims: [{ a: 'B', b: 'C', label: fmt(b) + ' m' }] }),
        given: { b, h, P },
        answers: [ans('AC', 'F_{AC}', FAC, 'kN'), ans('BC', 'F_{BC}', FBC, 'kN')],
        hints: ['Joint C has two unknown members and a known load, so start there.', String.raw`Assume tension. At C, AC points toward A $(-1, 0)$ and BC points toward B: $(-${fmt(b)}, -${fmt(h)})/${fmt(d)}$.`, String.raw`$\sum F_y$ at C contains only $F_{BC}$.`],
        solution: String.raw`<ol class="steps"><li>$|BC| = ${fmt(d)}\ \text{m}$</li><li>$\sum F_y$ at C: $-F_{BC}\tfrac{${fmt(h)}}{${fmt(d)}} - ${fmt(P)} = 0 \Rightarrow F_{BC} = ${q(FBC, 'kN')}$ (${TC(FBC)})</li><li>$\sum F_x$ at C: $-F_{AC} - F_{BC}\tfrac{${fmt(b)}}{${fmt(d)}} = 0 \Rightarrow F_{AC} = ${q(FAC, 'kN')}$ (${TC(FAC)})</li></ol><p class="check">The top member is pulled away from the wall (T) and the bottom strut is pushed into it (C).</p>`,
      };
    },
  },
  {
    id: 'u6-pratt-reactions', title: 'Truss support reactions', kind: 'numeric',
    gen(r) {
      const a = r.step(2, 5, 0.5), h = r.step(2, 5, 0.5), P1 = r.step(2, 30, 1), P2 = r.step(2, 30, 1);
      const s = prattSolve(a, h, P1, P2);
      return {
        prompt: String.raw`The truss has three ${fmt(a)} m panels and is ${fmt(h)} m tall, with a pin at $L_0$ and a roller at $L_3$. Loads: $${q(P1, 'kN')}$ down at $L_1$ and $${q(P2, 'kN')}$ down at $L_2$. Find the vertical reactions $R_0$ (at $L_0$) and $R_3$ (at $L_3$).`,
        svg: pratt(a, h, fmt(P1) + ' kN', fmt(P2) + ' kN'),
        given: { a, h, P1, P2 },
        answers: [ans('R0', 'R_0', s.R0, 'kN'), ans('R3', 'R_3', s.R3, 'kN')],
        hints: ['Treat the whole truss as one rigid body. The member forces are internal and cancel.', String.raw`$\sum M_{L_0} = 0$: $R_3(3a) = P_1(a) + P_2(2a)$.`],
        solution: String.raw`<ol class="steps"><li>$\sum M_{L_0} = 0:\ R_3(${fmt(3 * a)}) = ${fmt(P1)}(${fmt(a)}) + ${fmt(P2)}(${fmt(2 * a)}) \Rightarrow R_3 = ${q(s.R3, 'kN')}$</li><li>$\sum F_y = 0:\ R_0 = ${fmt(P1 + P2)} - ${fmt(s.R3)} = ${q(s.R0, 'kN')}$</li></ol>`,
      };
    },
  },
  {
    id: 'u6-pratt-joint', title: 'Method of joints at a support', kind: 'numeric',
    gen(r) {
      const a = r.step(2, 5, 0.5), h = r.step(2, 5, 0.5), P1 = r.step(2, 30, 1), P2 = r.step(2, 30, 1);
      const s = prattSolve(a, h, P1, P2);
      return {
        prompt: String.raw`Same style of truss: panels $${q(a, 'm')}$, height $${q(h, 'm')}$, with $${q(P1, 'kN')}$ at $L_1$ and $${q(P2, 'kN')}$ at $L_2$ (pin at $L_0$, roller at $L_3$). Using joint $L_0$, find $F_{L_0U_1}$ and $F_{L_0L_1}$, and then use joint $L_1$ to find $F_{L_1U_1}$ (T +, C −).`,
        svg: pratt(a, h, fmt(P1) + ' kN', fmt(P2) + ' kN'),
        given: { a, h, P1, P2 },
        answers: [ans('ed', 'F_{L_0U_1}', s.endDiag, 'kN'), ans('b1', 'F_{L_0L_1}', s.L0L1, 'kN'), ans('v1', 'F_{L_1U_1}', s.vert1, 'kN')],
        hints: [String.raw`First get $R_0 = (2P_1 + P_2)/3$ from moments about $L_3$.`, String.raw`Joint $L_0$: $R_0$ up, $F_{L_0U_1}$ along $(${fmt(a)}, ${fmt(h)})/${fmt(s.d)}$, $F_{L_0L_1}$ along +x.`, String.raw`Joint $L_1$: the bottom chords are collinear, so vertical equilibrium involves only the vertical member and the load.`],
        solution: String.raw`<ol class="steps"><li>$R_0 = ${fmt(s.R0)}\ \text{kN}$; $|L_0U_1| = ${fmt(s.d)}\ \text{m}$</li><li>Joint $L_0$, $\sum F_y$: $${fmt(s.R0)} + F_{L_0U_1}\tfrac{${fmt(h)}}{${fmt(s.d)}} = 0 \Rightarrow F_{L_0U_1} = ${q(s.endDiag, 'kN')}$ (C)</li><li>Joint $L_0$, $\sum F_x$: $F_{L_0L_1} + F_{L_0U_1}\tfrac{${fmt(a)}}{${fmt(s.d)}} = 0 \Rightarrow F_{L_0L_1} = ${q(s.L0L1, 'kN')}$ (T)</li><li>Joint $L_1$, $\sum F_y$: $F_{L_1U_1} - ${fmt(P1)} = 0 \Rightarrow F_{L_1U_1} = ${q(s.vert1, 'kN')}$ (T)</li></ol>`,
      };
    },
  },
  {
    id: 'u6-sections', title: 'Method of sections', kind: 'numeric',
    gen(r) {
      const a = r.step(2, 5, 0.5), h = r.step(2, 5, 0.5), P1 = r.step(2, 30, 1), P2 = r.step(2, 30, 1);
      const s = prattSolve(a, h, P1, P2);
      return {
        prompt: String.raw`For the truss shown (panels $${q(a, 'm')}$, height $${q(h, 'm')}$, $${q(P1, 'kN')}$ at $L_1$, $${q(P2, 'kN')}$ at $L_2$, pin at $L_0$, roller at $L_3$), cut through members $U_1U_2$, $U_1L_2$ and $L_1L_2$. Find all three forces (T +, C −).`,
        svg: pratt(a, h, fmt(P1) + ' kN', fmt(P2) + ' kN'),
        given: { a, h, P1, P2 },
        answers: [ans('top', 'F_{U_1U_2}', s.top, 'kN'), ans('diag', 'F_{U_1L_2}', s.diag, 'kN'), ans('bot', 'F_{L_1L_2}', s.bot, 'kN')],
        hints: [String.raw`Reactions first: $R_0 = (2P_1+P_2)/3$.`, String.raw`Keep the left piece. For $F_{U_1U_2}$, take moments about $L_2$, where the other two cut members meet. For $F_{L_1L_2}$, take moments about $U_1$.`, String.raw`For the diagonal, use $\sum F_y = 0$ on the left piece.`],
        solution: String.raw`<ol class="steps"><li>$R_0 = ${fmt(s.R0)}\ \text{kN}$</li><li>$\sum M_{L_2} = 0:\ -${fmt(s.R0)}(${fmt(2 * a)}) + ${fmt(P1)}(${fmt(a)}) - F_{U_1U_2}(${fmt(h)}) = 0 \Rightarrow F_{U_1U_2} = ${q(s.top, 'kN')}$ (${TC(s.top)})</li><li>$\sum M_{U_1} = 0:\ -${fmt(s.R0)}(${fmt(a)}) + F_{L_1L_2}(${fmt(h)}) = 0 \Rightarrow F_{L_1L_2} = ${q(s.bot, 'kN')}$ (${TC(s.bot)})</li><li>$\sum F_y = 0:\ ${fmt(s.R0)} - ${fmt(P1)} - F_{U_1L_2}\tfrac{${fmt(h)}}{${fmt(s.d)}} = 0 \Rightarrow F_{U_1L_2} = ${q(s.diag, 'kN')}$ (${TC(s.diag)})</li></ol>`,
      };
    },
  },
  {
    id: 'u6-mc-zero', title: 'Spot the zero-force member', kind: 'mc',
    gen: mcPool([
      {
        q: 'In this truss, which member is a zero-force member?',
        svg: S.trussDiagram({ nodes: { A: [0, 0], B: [2, 0], C: [4, 0], D: [2, 2] }, members: [['A', 'B'], ['B', 'C'], ['A', 'D'], ['D', 'C'], ['B', 'D']], pin: 'A', roller: 'C', loads: [{ node: 'D', dir: [0, -1], label: 'P' }] }),
        correct: 'BD', wrong: ['AD', 'AB', 'DC'], why: 'Joint B has three members, AB and BC are collinear, and B carries no load. Vertical equilibrium at B then forces F_BD = 0.',
      },
      {
        q: 'Joint E connects only two members, which are not collinear, and has no external load or support. What can you conclude?',
        correct: 'Both members at E are zero-force members', wrong: ['Both members carry equal tension', 'Only the longer member is zero-force', 'Nothing without more information'], why: 'With two non-collinear members and no load, the only way to balance forces in two different directions is for both to be zero.',
      },
      {
        q: 'In this truss, the load P acts at C. Look at joint D. Which members meeting there are zero-force?',
        svg: S.trussDiagram({ nodes: { A: [0, 0], B: [3, 0], C: [3, 3], D: [0, 3] }, members: [['A', 'B'], ['B', 'C'], ['C', 'D'], ['A', 'C'], ['A', 'D']], pin: 'A', roller: 'B', loads: [{ node: 'C', dir: [0, -1], label: 'P' }] }),
        correct: 'Both CD and AD', wrong: ['Only CD', 'Only AD', 'Neither: they share the load P'], why: 'Joint D connects only CD and AD, which are not collinear, and has no load, so both are zero-force.',
      },
      {
        q: 'Why keep zero-force members in a real truss?',
        correct: 'They brace other members against buckling and carry load if the loading changes', wrong: ['They make the truss statically indeterminate', 'They carry the weight of the truss', 'They don\'t matter; designers remove them'], why: 'They are zero only for one particular loading. They also shorten the unbraced length of compression members.',
      },
    ]),
  },
  {
    id: 'u6-mc-concepts', title: 'Concept check: truss analysis', kind: 'mc',
    gen: mcPool([
      { q: 'With the method of sections in a 2D truss, what is the most member forces you can generally solve for from one cut?', correct: 'Three', wrong: ['Two', 'Four', 'As many as you cut'], why: 'Each section is a rigid body with three equilibrium equations, so at most three unknowns.' },
      { q: 'With the "assume tension" convention, you get F = −14 kN for a member. The member is…', correct: 'in compression, 14 kN', wrong: ['in tension, 14 kN', 'a zero-force member', 'failing'], why: 'A negative result means the true force is opposite to the assumed pull, so the member is being pushed (compression).' },
      { q: 'Why does the method of joints start at a joint with no more than two unknowns?', correct: 'A joint is a particle, so it gives only two equations', wrong: ['Joints with more members are always zero-force', 'Moments must be taken at those joints', 'Supports are always at such joints'], why: 'Joint equilibrium is concurrent-force (particle) equilibrium: ΣFx = 0 and ΣFy = 0. That solves for at most two unknowns.' },
      { q: 'In a simply supported truss bridge loaded from above, the top chord is usually in…', correct: 'compression', wrong: ['tension', 'zero force', 'pure bending'], why: 'Like the top fibers of a beam sagging under load, the top chord gets squeezed while the bottom chord is stretched.' },
      { q: 'Truss members are treated as two-force members because…', correct: 'they are pinned at their ends and loaded only at the joints', wrong: ['they are always short', 'they are made of steel', 'the truss is symmetric'], why: 'Forces act only at the two pinned ends and there are no moments, so the member force must lie along the member axis.' },
    ]),
  },
];

module.exports = {
  num: 6, slug: 'trusses', title: 'Trusses: Joints & Sections',
  blurb: 'Two-force members, tension vs. compression, method of joints, zero-force members, method of sections.',
  lesson, problems,
};
