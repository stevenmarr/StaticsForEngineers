'use strict';
const { readMath: RM } = require('../skills');
const { fmt, q, ans, mcPool, sind, cosd } = require('../helpers');
const S = require('../svg');
const dir = (M) => (M > 0 ? 'counterclockwise' : 'clockwise');

const lesson = String.raw`
<h2>Simplifying a messy set of loads</h2>
<p>Real structures carry many loads: people, snow, machinery, wind. To analyze them we often swap the whole set for a simpler <strong>equivalent system</strong>, one that has exactly the same external effect (the same net push and the same net turning) on a rigid body.</p>
<p>Two systems are equivalent when they have the same <strong>resultant force</strong> and the same <strong>resultant moment about any one point</strong>:</p>
$$\mathbf F_R = \gl{sigma}{\sum}\mathbf F, \qquad M_{R_O} = \sum M_O \ (\text{including any couples})$$
${RM([["\\mathbf F_R", "“F sub R”", "The resultant force: the vector sum of all the forces."], ["M_{R_O}", "“M sub R-O”", "A subscript with its own subscript. Read it from the outside in: the resultant moment, taken about point O."], ["\\equiv", "“is equivalent to”", "Not equal as numbers, but has exactly the same effect on the body (used in the next section)."]], ["sigma", "signs"])}

<h2>1. Moving a force: the force-couple system</h2>
<p>You can't just slide a force sideways. That changes its turning effect. You <em>can</em> move it to a new point $O$ if you add a couple equal to the moment the force had about $O$:</p>
$$\text{Force } \mathbf F \text{ at } A \ \equiv\ \text{Force } \mathbf F \text{ at } O \ +\ \text{couple } \mathbf M = \mathbf r_{OA}\times\mathbf F$$
<p>(Sliding a force <em>along</em> its own line of action is always fine. That's the principle of transmissibility.)</p>

<h2>2. Reducing to a single force</h2>
<p>For coplanar loads, you can usually go further: put the resultant $F_R$ at the spot where its moment matches $M_{R_O}$. For a set of parallel vertical forces on a beam, the resultant sits at</p>
$$\gl{bar}{\bar x} = \frac{\gl{sigma}{\sum} \gl{idx}{x_i} F_i}{\sum F_i}$$
<p>This is a weighted average of positions, the same idea as the centroid in Unit 9.</p>
${RM([["\\bar x", "“x-bar”", "Where the resultant acts: an average position."], ["x_i,\\ F_i", "“x sub i, F sub i”", "Index notation: $i$ is a counter. $F_1$ is the first load and $x_1$ its position, $F_2$ the second load, and so on."], ["\\sum x_i F_i", "“the sum of x-i times F-i”", "Multiply each load by its own position, then add: $x_1F_1 + x_2F_2 + x_3F_3$."]], ["sigma"])}
<p><strong>Read it as a recipe.</strong> Top: each load times its distance from the reference point, all added together (the total moment). Bottom: the loads added together (the total force). Dividing gives the single distance at which the total force produces that same total moment. It's the same arithmetic as a weighted grade average, with forces as the weights.</p>

<div class="example"><h3>Worked example 1: three loads on a beam</h3>
<p>A beam carries downward loads of $200\ \text{N}$ at $x = 1\ \text{m}$, $500\ \text{N}$ at $x = 3\ \text{m}$ and $300\ \text{N}$ at $x = 6\ \text{m}$. Replace them with one equivalent force.</p>
${S.beamDiagram({ L: 6, supports: [], loads: [{ type: 'point', x: 1, label: '200 N' }, { type: 'point', x: 3, label: '500 N' }, { type: 'point', x: 6, label: '300 N' }], marks: [1, 3] })}
<ol class="steps">
<li>$F_R = 200 + 500 + 300 = 1000\ \text{N}$ (downward).</li>
<li>Moments about the left end (taking each magnitude times its distance): $\sum xF = 1(200) + 3(500) + 6(300) = 3500\ \text{N·m}$.</li>
<li>$\bar x = 3500/1000 = 3.5\ \text{m}$ from the left end.</li></ol>
<p class="check">The resultant lands between the two biggest loads, a little toward the 500 N one. Reasonable.</p></div>

<h2>3. Distributed loads</h2>
<p>Many loads are spread out: the weight of a floor slab, snow on a roof, water pressure. A distributed load is described by its intensity $w(x)$ in N/m (force per length). Two facts let you replace it with a single force:</p>
<ul><li><strong>Magnitude</strong> of the resultant = <strong>area</strong> under the load diagram: $F_R = \gl{int}{\int} w\,\gl{dA}{dx}$.</li>
<li><strong>Location</strong> = the <strong>centroid</strong> of that area: $\bar x = \int x\,w\,dx / \int w\,dx$.</li></ul>
${RM([["w(x)", "“w of x”", "Load intensity (N/m) at position $x$. Function notation, as in Algebra II."], ["\\int w\\,dx", "“the integral of w, d-x”", "Slice the load into very thin strips of width $dx$. Each strip carries force $w\\,dx$ (height × width, a thin rectangle). The ∫ (a stretched S, for “sum”) adds up every strip, so the total is the area under the load diagram. No calculus is needed here: rectangle and triangle area formulas give the answer."], ["\\int x\\,w\\,dx \\Big/ \\int w\\,dx", "“the integral of x w d-x, over the integral of w d-x”", "The continuous version of $\\sum x_iF_i / \\sum F_i$: each strip's force times its position, added up, then divided by the total force."]], ["integral", "sigma"])}
<table class="tbl"><thead><tr><th>Load shape (length L)</th><th>Resultant</th><th>Acts at</th></tr></thead><tbody>
<tr><td>Uniform $w$</td><td>$wL$</td><td>$L/2$ (middle)</td></tr>
<tr><td>Triangle, 0 to $w_0$</td><td>$\tfrac12 w_0 L$</td><td>$\tfrac{2}{3}L$ from the zero end ($\tfrac13 L$ from the big end)</td></tr>
<tr><td>Trapezoid $w_1$ to $w_2$</td><td>$\tfrac12(w_1+w_2)L$</td><td>Split it into a rectangle plus a triangle</td></tr></tbody></table>

<div class="example"><h3>Worked example 2: triangular load</h3>
<p>Water pressure puts a load on a 4.5 m wall panel that grows linearly from 0 at one end to $6\ \text{kN/m}$ at the other. Find the resultant and where it acts.</p>
${S.beamDiagram({ L: 4.5, supports: [], loads: [{ type: 'dist', x1: 0, x2: 4.5, w1: 0, w2: 6, label: '0 → 6 kN/m' }], marks: [] })}
<ol class="steps">
<li>Area of the triangle: $F_R = \tfrac12(6)(4.5) = 13.5\ \text{kN}$.</li>
<li>Centroid of a triangle: $\tfrac23$ of the length from the pointed (zero) end, so $\bar x = \tfrac23(4.5) = 3.0\ \text{m}$ from the zero end, or $1.5\ \text{m}$ from the $6\ \text{kN/m}$ end.</li></ol>
<p class="check">The resultant sits toward the heavy end, where most of the load is.</p></div>

<div class="example"><h3>Mini example: trapezoid = rectangle + triangle</h3>
<p>A load runs from $2\ \text{kN/m}$ to $5\ \text{kN/m}$ over $3\ \text{m}$. Rectangle: $2(3) = 6\ \text{kN}$ at $1.5\ \text{m}$. Triangle: $\tfrac12(3)(3) = 4.5\ \text{kN}$ at $2\ \text{m}$. Total $10.5\ \text{kN}$ at $\bar x = (6\cdot1.5 + 4.5\cdot2)/10.5 = 1.714\ \text{m}$.</p></div>

<h2>Key takeaways</h2>
<ul class="takeaways"><li>Equivalent = same $\sum\mathbf F$ and same $\sum M$ about a point.</li><li>Moving a force off its line of action costs a couple $M = \mathbf r\times\mathbf F$.</li><li>Distributed load: resultant = area, located at the area's centroid.</li><li>Uniform load: middle. Triangle: 1/3 of the length from the big end.</li></ul>
`;

const problems = [
  {
    id: 'u4-parallel', title: 'Resultant of parallel loads', kind: 'numeric',
    gen(r) {
      const L = r.step(4, 10, 1);
      const xs = r.shuffle([...Array(L * 2 - 1)].map((_, i) => (i + 1) / 2)).slice(0, 3).sort((a, b) => a - b);
      const Fs = xs.map(() => r.step(100, 900, 50));
      const FR = Fs.reduce((a, b) => a + b, 0), xb = xs.reduce((s, x, i) => s + x * Fs[i], 0) / FR;
      return {
        prompt: String.raw`A $${q(L, 'm')}$ beam carries downward loads ${xs.map((x, i) => String.raw`$${q(Fs[i], 'N')}$ at $x = ${fmt(x)}\ \text{m}$`).join(', ')} (x measured from the left end). Find the magnitude of the single equivalent force and its location $\bar x$.`,
        svg: S.beamDiagram({ L, supports: [], loads: xs.map((x, i) => ({ type: 'point', x, label: fmt(Fs[i]) + ' N' })), marks: xs }),
        answers: [ans('F', 'F_R', FR, 'N'), ans('x', String.raw`\bar x`, xb, 'm')],
        hints: ['Add the forces to get the resultant (all point the same way).', String.raw`$\bar x = \sum x_iF_i / \sum F_i$. This is the location that gives the same moment about the left end.`],
        solution: String.raw`<ol class="steps"><li>$F_R = ${Fs.join(' + ')} = ${q(FR, 'N')}$ down</li><li>$\sum x_iF_i = ${xs.map((x, i) => `${fmt(x)}(${Fs[i]})`).join(' + ')} = ${fmt(xs.reduce((s, x, i) => s + x * Fs[i], 0))}\ \text{N·m}$</li><li>$\bar x = ${fmt(xs.reduce((s, x, i) => s + x * Fs[i], 0))}/${fmt(FR)} = ${q(xb, 'm')}$</li></ol>`,
      };
    },
  },
  {
    id: 'u4-force-couple', title: 'Equivalent force-couple system at O', kind: 'numeric',
    gen(r) {
      const f1 = { F: r.step(100, 600, 20), t: r.step(0, 345, 15), x: r.step(-2, 2, 0.5), y: r.step(-2, 2, 0.5) };
      const f2 = { F: r.step(100, 600, 20), t: r.step(0, 345, 15), x: r.step(-2, 2, 0.5), y: r.step(-2, 2, 0.5) };
      const C = r.step(-300, 300, 50);
      const comp = (f) => [f.F * cosd(f.t), f.F * sind(f.t)];
      const [a1, b1] = comp(f1), [a2, b2] = comp(f2);
      const FRx = a1 + a2, FRy = b1 + b2;
      const m1 = f1.x * b1 - f1.y * a1, m2 = f2.x * b2 - f2.y * a2, M = m1 + m2 + C;
      return {
        prompt: String.raw`A plate carries $F_1 = ${q(f1.F, 'N')}$ at $${f1.t}^\circ$ applied at $(${fmt(f1.x)}, ${fmt(f1.y)})\ \text{m}$, $F_2 = ${q(f2.F, 'N')}$ at $${f2.t}^\circ$ applied at $(${fmt(f2.x)}, ${fmt(f2.y)})\ \text{m}$, and a couple of $${q(Math.abs(C), 'N·m')}$ ${C >= 0 ? 'CCW' : 'CW'}. Replace everything with an equivalent force-couple system at the origin $O$: find $F_{Rx}$, $F_{Ry}$ and $M_{R_O}$ (CCW +).`,
        given: { f1, f2, C },
        answers: [ans('Fx', 'F_{Rx}', FRx, 'N'), ans('Fy', 'F_{Ry}', FRy, 'N'), ans('M', 'M_{R_O}', M, 'N·m')],
        hints: ['The resultant force is just the vector sum of the two forces. The couple adds no force.', String.raw`For each force, $M_O = xF_y - yF_x$. Then add the couple.`],
        solution: String.raw`<ol class="steps"><li>$F_1$: $(${fmt(a1)}, ${fmt(b1)})\ \text{N}$; $\ F_2$: $(${fmt(a2)}, ${fmt(b2)})\ \text{N}$</li><li>$F_{Rx} = ${q(FRx, 'N')}$, $\ F_{Ry} = ${q(FRy, 'N')}$</li><li>$M_1 = (${fmt(f1.x)})(${fmt(b1)}) - (${fmt(f1.y)})(${fmt(a1)}) = ${fmt(m1)}$; $\ M_2 = (${fmt(f2.x)})(${fmt(b2)}) - (${fmt(f2.y)})(${fmt(a2)}) = ${fmt(m2)}$</li><li>$M_{R_O} = ${fmt(m1)} + (${fmt(m2)}) + (${fmt(C)}) = ${q(M, 'N·m')}$</li></ol>`,
      };
    },
  },
  {
    id: 'u4-uniform', title: 'Uniform load on part of a beam', kind: 'numeric',
    gen(r) {
      const L = r.step(5, 12, 1), a = r.step(0, L - 2, 0.5), b = r.step(a + 1, L, 0.5), w = r.step(1, 10, 0.5);
      const F = w * (b - a), x = (a + b) / 2;
      return {
        prompt: String.raw`A uniform load of $${q(w, 'kN/m')}$ acts from $x = ${fmt(a)}\ \text{m}$ to $x = ${fmt(b)}\ \text{m}$ on a $${q(L, 'm')}$ beam. Find the resultant force and its distance from the left end.`,
        svg: S.beamDiagram({ L, supports: [], loads: [{ type: 'dist', x1: a, x2: b, w1: w, w2: w, label: fmt(w) + ' kN/m' }], marks: [a, b] }),
        answers: [ans('F', 'F_R', F, 'kN'), ans('x', String.raw`\bar x`, x, 'm')],
        hints: ['The resultant equals the area of the load rectangle: intensity × loaded length.', 'It acts at the middle of the loaded length, not the middle of the beam.'],
        solution: String.raw`<ol class="steps"><li>$F_R = w(b-a) = ${fmt(w)}(${fmt(b - a)}) = ${q(F, 'kN')}$</li><li>$\bar x = (a+b)/2 = ${q(x, 'm')}$</li></ol>`,
      };
    },
  },
  {
    id: 'u4-triangle', title: 'Triangular distributed load', kind: 'numeric',
    gen(r) {
      const L = r.step(2, 9, 0.5), w0 = r.step(2, 20, 1), inc = r.next() < 0.5;
      const F = 0.5 * w0 * L, x = inc ? (2 * L) / 3 : L / 3;
      return {
        prompt: String.raw`A beam of length $${q(L, 'm')}$ carries a load that varies linearly from ${inc ? String.raw`$0$ at the left end to $${q(w0, 'kN/m')}$ at the right end` : String.raw`$${q(w0, 'kN/m')}$ at the left end to $0$ at the right end`}. Find the resultant and its distance from the <strong>left</strong> end.`,
        svg: S.beamDiagram({ L, supports: [], loads: [{ type: 'dist', x1: 0, x2: L, w1: inc ? 0 : w0, w2: inc ? w0 : 0, label: fmt(w0) + ' kN/m max' }] }),
        answers: [ans('F', 'F_R', F, 'kN'), ans('x', String.raw`\bar x`, x, 'm')],
        hints: [String.raw`Resultant = area of the triangle $= \tfrac12 w_0 L$.`, 'A triangle\'s centroid is one third of the base length from the tall side (two thirds from the pointed end).'],
        solution: String.raw`<ol class="steps"><li>$F_R = \tfrac12(${fmt(w0)})(${fmt(L)}) = ${q(F, 'kN')}$</li><li>The tall end is on the ${inc ? 'right' : 'left'}, so $\bar x = ${inc ? String.raw`\tfrac23 L` : String.raw`\tfrac13 L`} = ${q(x, 'm')}$ from the left end.</li></ol>`,
      };
    },
  },
  {
    id: 'u4-trapezoid', title: 'Trapezoidal distributed load', kind: 'numeric',
    gen(r) {
      const L = r.step(2, 8, 0.5);
      let w1 = r.step(1, 12, 1), w2 = r.step(1, 12, 1);
      if (w1 === w2) w2 = w1 + 3;
      const F = 0.5 * (w1 + w2) * L, x = (L * (w1 + 2 * w2)) / (3 * (w1 + w2));
      const lo = Math.min(w1, w2), d = Math.abs(w2 - w1);
      const Fr = lo * L, Ft = 0.5 * d * L, xt = w2 > w1 ? (2 * L) / 3 : L / 3;
      return {
        prompt: String.raw`A distributed load varies linearly from $${q(w1, 'kN/m')}$ at the left end to $${q(w2, 'kN/m')}$ at the right end of a $${q(L, 'm')}$ beam. Find the resultant and its location from the left end.`,
        svg: S.beamDiagram({ L, supports: [], loads: [{ type: 'dist', x1: 0, x2: L, w1, w2, label: `${w1} → ${w2} kN/m` }] }),
        given: { L, w1, w2 },
        answers: [ans('F', 'F_R', F, 'kN'), ans('x', String.raw`\bar x`, x, 'm')],
        hints: ['Split the trapezoid into a rectangle (the smaller intensity across the full length) and a triangle on top.', String.raw`Find each piece's force and location, then $\bar x = \sum x_iF_i/\sum F_i$.`],
        solution: String.raw`<ol class="steps"><li>Rectangle: $${fmt(lo)}(${fmt(L)}) = ${fmt(Fr)}\ \text{kN}$ at $${fmt(L / 2)}\ \text{m}$</li><li>Triangle: $\tfrac12(${fmt(d)})(${fmt(L)}) = ${fmt(Ft)}\ \text{kN}$ at $${fmt(xt)}\ \text{m}$ (1/3 of L from its tall end)</li><li>$F_R = ${q(F, 'kN')}$</li><li>$\bar x = \dfrac{${fmt(Fr)}(${fmt(L / 2)}) + ${fmt(Ft)}(${fmt(xt)})}{${fmt(F)}} = ${q(x, 'm')}$</li></ol>`,
      };
    },
  },
  {
    id: 'u4-combo', title: 'Point load plus uniform load', kind: 'numeric',
    gen(r) {
      const L = r.step(4, 10, 1), w = r.step(1, 6, 0.5), P = r.step(2, 20, 1), a = r.step(0.5, L - 0.5, 0.5);
      const F = w * L + P, x = (w * L * (L / 2) + P * a) / F;
      return {
        prompt: String.raw`A $${q(L, 'm')}$ beam carries a uniform load of $${q(w, 'kN/m')}$ over its full length plus a $${q(P, 'kN')}$ point load at $x = ${fmt(a)}\ \text{m}$. Find the single equivalent force and its location from the left end.`,
        svg: S.beamDiagram({ L, supports: [], loads: [{ type: 'dist', x1: 0, x2: L, w1: w, w2: w, label: fmt(w) + ' kN/m' }, { type: 'point', x: a, label: fmt(P) + ' kN' }], marks: [a] }),
        answers: [ans('F', 'F_R', F, 'kN'), ans('x', String.raw`\bar x`, x, 'm')],
        hints: [String.raw`Replace the uniform load with $wL$ at $L/2$ first.`, 'Now you have two point loads. Combine them with the weighted-average formula.'],
        solution: String.raw`<ol class="steps"><li>Uniform load $\to ${fmt(w * L)}\ \text{kN}$ at $${fmt(L / 2)}\ \text{m}$</li><li>$F_R = ${fmt(w * L)} + ${fmt(P)} = ${q(F, 'kN')}$</li><li>$\bar x = \dfrac{${fmt(w * L)}(${fmt(L / 2)}) + ${fmt(P)}(${fmt(a)})}{${fmt(F)}} = ${q(x, 'm')}$</li></ol>`,
      };
    },
  },
  {
    id: 'u4-single', title: 'Force + couple → single force', kind: 'numeric',
    gen(r) {
      const F = r.step(100, 2000, 50), M = r.step(50, 3000, 50);
      const x = M / F;
      return {
        prompt: String.raw`At point $O$ a beam has a downward force of $${q(F, 'N')}$ and a <strong>clockwise</strong> couple of $${q(M, 'N·m')}$. Replace these with a single downward force. How far from $O$, and on which side, must it act? (Give the distance to the right of $O$; use a negative number for left.)`,
        answers: [ans('x', 'x', x, 'm')],
        hints: [String.raw`A downward force $F$ placed a distance $x$ to the right of O has moment $-Fx$ (clockwise) about O.`, String.raw`Match moments: $-Fx = -M$.`],
        solution: String.raw`<ol class="steps"><li>Same resultant force: $F$ down. ✓</li><li>Same moment about O: $-F x = -${fmt(M)} \Rightarrow x = ${fmt(M)}/${fmt(F)} = ${q(x, 'm')}$</li><li>Positive, so it acts to the <strong>right</strong> of O. A downward force on the right turns the beam clockwise, matching the couple.</li></ol>`,
      };
    },
  },
  {
    id: 'u4-move', title: 'Moving a force to a new point', kind: 'numeric',
    gen(r) {
      const xA = r.step(0, 6, 0.5), xB = r.step(0, 6, 0.5), F = r.step(1, 25, 1), up = r.next() < 0.3;
      if (xA === xB) return problems[7].gen(r);
      const Fy = up ? F : -F, M = (xA - xB) * Fy;
      return {
        prompt: String.raw`A ${up ? 'upward' : 'downward'} force of $${q(F, 'kN')}$ acts on a horizontal beam at $x_A = ${fmt(xA)}\ \text{m}$. You want to move it to $x_B = ${fmt(xB)}\ \text{m}$. What couple moment must you add to keep the system equivalent? (CCW +)`,
        answers: [ans('M', 'M', M, 'kN·m')],
        hints: ['The couple you add must equal the moment the original force had about the new point B.', String.raw`$M = (x_A - x_B)F_y$, with $F_y$ positive up.`],
        solution: String.raw`<ol class="steps"><li>Moment of the original force about B: $M_B = (x_A - x_B)F_y = (${fmt(xA - xB)})(${fmt(Fy)})$</li><li>$M = ${q(M, 'kN·m')}$ (${dir(M)})</li></ol>`,
      };
    },
  },
  {
    id: 'u4-mc-concepts', title: 'Concept check: equivalent systems', kind: 'mc',
    gen: mcPool([
      { q: 'The resultant of a triangular distributed load acts…', correct: 'one third of the length from the large end', wrong: ['at the middle of the load', 'at the large end', 'one third of the length from the zero end'], why: 'It acts at the centroid of the triangle, which is L/3 from the tall side (2L/3 from the pointed end).' },
      { q: 'You slide a force sideways, parallel to itself, to a new point. To keep the system equivalent you must…', correct: 'add a couple equal to the force\'s moment about the new point', wrong: ['do nothing; forces are free vectors', 'double the force', 'reverse the force'], why: 'Forces are sliding vectors: they can move along their line of action, but not sideways. Moving one off its line changes its moment, so a couple has to make up the difference.' },
      { q: 'A uniform load of 3 kN/m acts over 4 m. Its resultant is…', correct: '12 kN at the middle of the 4 m', wrong: ['3 kN at the middle', '12 kN at the end', '0.75 kN at the middle'], why: 'Resultant = area = 3 × 4 = 12 kN, located at the centroid of the rectangle (its midpoint).' },
      { q: 'Two load systems are statically equivalent on a rigid body if they have the same…', correct: 'resultant force and resultant moment about any one point', wrong: ['resultant force only', 'number of forces', 'points of application'], why: 'Equivalence means the same external effect: the same net force (translation) and the same net moment (rotation).' },
      { q: 'Which is NOT true of distributed loads?', correct: 'The resultant always acts at the midpoint of the beam', wrong: ['Its magnitude equals the area under the w(x) curve', 'It acts through the centroid of the load area', 'Intensity has units of force per length'], why: 'The resultant acts at the centroid of the load diagram. That is the middle only for a uniform load spanning the whole beam.' },
    ]),
  },
];

module.exports = {
  num: 4, slug: 'equivalent-systems', title: 'Equivalent Systems & Distributed Loads',
  blurb: 'Force-couple systems, resultants of parallel forces, and replacing distributed loads with point loads.',
  lesson, problems,
};
