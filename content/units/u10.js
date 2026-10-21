'use strict';
const { readMath: RM } = require('../skills');
const { fmt, ans, mcPool } = require('../helpers');
const S = require('../svg');
const PI = Math.PI;
const E6 = String.raw`\times10^6\ \text{mm}^4`;
const U6 = '×10⁶ mm⁴';
const m6 = (v) => fmt(v / 1e6);

function secSvg(rects, W, H, opts = {}) {
  const sc = Math.min(200 / W, 160 / H), ox = 160 - (W * sc) / 2, oy = 185;
  let out = '';
  for (const [x, y, w, h, hole] of rects) out += S.rect(ox + x * sc, oy - (y + h) * sc, w * sc, h * sc, hole ? 'dg-hole' : 'dg-area');
  if (opts.yc !== undefined) out += S.line(ox - 25, oy - opts.yc * sc, ox + W * sc + 25, oy - opts.yc * sc, 'dg-d') + S.text(ox + W * sc + 30, oy - opts.yc * sc, opts.label || 'x̄ (centroidal)', { cls: 'dg-td', anchor: 'start' });
  return S.svg(320, 200, out, 'cross-section');
}

const lesson = String.raw`
<h2>Why a plank is stiffer on edge</h2>
<p>Lay a 2×8 board flat across two bricks and stand on it: it sags a lot. Turn it on edge and it barely bends. Same material, same area. What changed is <em>how far the material sits from the bending axis</em>. That property is the <strong>area moment of inertia</strong> (or second moment of area), $I$. In mechanics of materials you'll see it in the beam-bending formulas $\sigma = My/I$ and deflection $\propto 1/(EI)$. Bigger $I$ means a stiffer, stronger beam.</p>

<h2>Definition</h2>
$$I_x = \gl{int}{\int} y^2\,\gl{dA}{dA}, \qquad I_y = \int x^2\,dA$$
<p>Each bit of area counts in proportion to the <em>square</em> of its distance from the axis, so material far from the axis counts for much more. Units are length<sup>4</sup> (mm⁴, m⁴, in⁴), and $I$ is always positive.</p>
${RM([["I_x = \\int y^2\\,dA", "“I sub x equals the integral of y squared d-A”", "Cut the area into tiny pieces, multiply each by the <em>square</em> of its distance from the x-axis, and add. $I_x$ uses $y$ because $y$ is the distance <em>from</em> the x-axis."], ["\\bar I", "“I-bar”", "The moment of inertia about an axis through the shape's own centroid."], ["\\propto", "“is proportional to”", "Deflection ∝ 1/(EI): double EI and the deflection halves."], ["\\sigma", "lowercase “sigma”", "In $\\sigma = My/I$ it means <em>stress</em>, not “sum”. The summation sign is the capital Σ."]], ["integral", "sigma"])}

<h2>Standard results</h2>
<table class="tbl"><thead><tr><th>Shape</th><th>About centroidal axis</th><th>About base</th></tr></thead><tbody>
<tr><td>Rectangle, width $b$, height $h$</td><td>$\bar I_x = \dfrac{bh^3}{12}$</td><td>$I_{base} = \dfrac{bh^3}{3}$</td></tr>
<tr><td>Triangle, base $b$, height $h$</td><td>$\bar I_x = \dfrac{bh^3}{36}$</td><td>$I_{base} = \dfrac{bh^3}{12}$</td></tr>
<tr><td>Circle, radius $r$</td><td>$\bar I = \dfrac{\pi r^4}{4}$</td><td></td></tr>
<tr><td>Hollow circle (tube)</td><td>$\bar I = \dfrac{\pi(r_o^4 - r_i^4)}{4}$</td><td></td></tr></tbody></table>
<p>Notice the $h^3$: doubling a beam's depth makes it 8 times stiffer. That's the whole story of the plank on edge.</p>

<div class="example"><h3>Worked example 1: the plank both ways</h3>
<p>A board is $50 \times 200$ mm. Compare $\bar I$ about a horizontal centroidal axis when it is (a) on edge (h = 200) and (b) flat (h = 50).</p>
<ol class="steps">
<li>(a) $\bar I = \dfrac{50(200)^3}{12} = 33.3\times10^6\ \text{mm}^4$</li>
<li>(b) $\bar I = \dfrac{200(50)^3}{12} = 2.08\times10^6\ \text{mm}^4$</li>
<li>Ratio: $33.3/2.08 = 16$. On edge it's 16 times stiffer.</li></ol></div>

<h2>The parallel-axis theorem</h2>
<p>To find $I$ about an axis that doesn't pass through the centroid, use</p>
$$I = \bar I + A d^2$$
<p>where $\bar I$ is about the parallel axis through the piece's own centroid, $A$ is its area, and $d$ is the distance between the two axes. Since $Ad^2 \ge 0$, the centroidal axis always gives the <em>smallest</em> $I$. Reading it aloud: “I equals I-bar plus A d squared.” In words, the I about the new axis is the piece's own I plus its area times the square of how far it was moved.</p>

<h2>Composite sections</h2>
<ol><li>Find the centroid of the whole section (Unit 9).</li><li>For each piece: its own $\bar I_i$, plus $A_i d_i^2$ where $d_i$ is the distance from the piece's centroid to the section's centroid.</li><li>Add them up (subtract holes).</li></ol>

<div class="example"><h3>Worked example 2: T-section</h3>
<p>A T-section has a $150\times20$ mm flange on top of a $20\times130$ mm web (total height 150 mm). Find $\bar I_x$ about its horizontal centroidal axis.</p>
${secSvg([[65, 0, 20, 130], [0, 130, 150, 20]], 150, 150, { yc: 105.18 })}
<ol class="steps">
<li>Centroid: web $A = 2600$ at $y = 65$; flange $A = 3000$ at $y = 140$. $\ \bar y = \dfrac{2600(65) + 3000(140)}{5600} = 105.2\ \text{mm}$.</li>
<li>Web: $\dfrac{20(130)^3}{12} + 2600(105.2 - 65)^2 = 3.662\times10^6 + 4.197\times10^6 = 7.859\times10^6\ \text{mm}^4$.</li>
<li>Flange: $\dfrac{150(20)^3}{12} + 3000(140 - 105.2)^2 = 0.100\times10^6 + 3.638\times10^6 = 3.738\times10^6\ \text{mm}^4$.</li>
<li>$\bar I_x = 7.859 + 3.738 = 11.60\times10^6\ \text{mm}^4$.</li></ol>
<p class="check">The $Ad^2$ terms dominate. Moving area away from the centroid is what makes I-beams and T-beams efficient.</p></div>

<h2>Radius of gyration</h2>
<p>$k = \sqrt{I/A}$ is the distance at which you could concentrate all the area and get the same $I$. It shows up in column buckling: a column with a small $k$ buckles easily.</p>

<h2>Key takeaways</h2>
<ul class="takeaways"><li>$I = \int y^2 dA$, in units of length<sup>4</sup>.</li><li>Rectangle: $bh^3/12$ about its centroid. Depth matters most.</li><li>Parallel axis: $I = \bar I + Ad^2$.</li><li>Composite: find the centroid first, then sum $\bar I_i + A_id_i^2$.</li></ul>
`;

const problems = [
  {
    id: 'u10-rect', title: 'Rectangle about its centroid', kind: 'numeric',
    gen(r) {
      const b = r.step(20, 150, 10), h = r.step(50, 400, 10);
      const Ix = (b * h ** 3) / 12, Iy = (h * b ** 3) / 12;
      return {
        prompt: String.raw`A rectangular beam section is ${b} mm wide and ${h} mm deep. Find $\bar I_x$ (horizontal centroidal axis) and $\bar I_y$ (vertical centroidal axis), in units of $10^6\ \text{mm}^4$.`,
        svg: secSvg([[0, 0, b, h]], b, h, { yc: h / 2 }),
        answers: [ans('Ix', String.raw`\bar I_x`, Ix / 1e6, U6), ans('Iy', String.raw`\bar I_y`, Iy / 1e6, U6)],
        hints: [String.raw`$\bar I_x = bh^3/12$, where $h$ is the dimension perpendicular to the axis.`, String.raw`For $\bar I_y$ swap the roles: $hb^3/12$.`],
        solution: String.raw`<ol class="steps"><li>$\bar I_x = \dfrac{${b}(${h})^3}{12} = ${m6(Ix)}${E6}$</li><li>$\bar I_y = \dfrac{${h}(${b})^3}{12} = ${m6(Iy)}${E6}$</li></ol>`,
      };
    },
  },
  {
    id: 'u10-base', title: 'Rectangle about its base', kind: 'numeric',
    gen(r) {
      const b = r.step(20, 200, 10), h = r.step(20, 300, 10);
      const I = (b * h ** 3) / 3;
      return {
        prompt: String.raw`Find the moment of inertia of a ${b} mm wide × ${h} mm tall rectangle about its <strong>bottom edge</strong>, in $10^6\ \text{mm}^4$.`,
        answers: [ans('I', 'I_{base}', I / 1e6, U6)],
        hints: [String.raw`Either use $bh^3/3$ directly, or use the parallel-axis theorem: $\bar I + A(h/2)^2$.`],
        solution: String.raw`<ol class="steps"><li>$\bar I = bh^3/12 = ${m6((b * h ** 3) / 12)}${E6}$</li><li>$A d^2 = (${b}\cdot${h})(${fmt(h / 2)})^2 = ${m6(b * h * (h / 2) ** 2)}${E6}$</li><li>$I_{base} = ${m6(I)}${E6}$ $\ (= bh^3/3)$</li></ol>`,
      };
    },
  },
  {
    id: 'u10-parallel', title: 'Parallel-axis theorem', kind: 'numeric',
    gen(r) {
      const Ib = r.step(0.5, 50, 0.5), A = r.step(1000, 10000, 100), d = r.step(20, 200, 5);
      const I = Ib + (A * d * d) / 1e6;
      return {
        prompt: String.raw`A steel shape has area $A = ${A}\ \text{mm}^2$ and $\bar I = ${fmt(Ib)}\times10^6\ \text{mm}^4$ about its own centroidal axis. What is its moment of inertia about a parallel axis ${d} mm away? (Answer in $10^6\ \text{mm}^4$.)`,
        answers: [ans('I', 'I', I, U6)],
        hints: [String.raw`$I = \bar I + Ad^2$.`, String.raw`Watch the units: $Ad^2$ comes out in mm⁴, so divide by $10^6$ before adding.`],
        solution: String.raw`<ol class="steps"><li>$Ad^2 = ${A}(${d})^2 = ${fmt(A * d * d)}\ \text{mm}^4 = ${fmt((A * d * d) / 1e6)}${E6}$</li><li>$I = ${fmt(Ib)} + ${fmt((A * d * d) / 1e6)} = ${fmt(I)}${E6}$</li></ol>`,
      };
    },
  },
  {
    id: 'u10-tube', title: 'Solid shaft vs. tube', kind: 'numeric',
    gen(r) {
      const Do = r.step(40, 200, 10), t = r.step(3, Math.min(20, Do / 4), 1);
      const ro = Do / 2, ri = ro - t;
      const It = (PI * (ro ** 4 - ri ** 4)) / 4, Is = (PI * ro ** 4) / 4;
      return {
        prompt: String.raw`A round tube has outside diameter ${Do} mm and wall thickness ${t} mm. Find its $\bar I$ and that of a solid bar with the same outside diameter (both in $10^6\ \text{mm}^4$).`,
        svg: S.svg(320, 170, S.circle(110, 85, 70, 'dg-area') + S.circle(110, 85, 70 * (ri / ro), 'dg-hole') + S.circle(250, 85, 50, 'dg-area') + S.text(110, 165, 'tube', { cls: 'dg-td' }) + S.text(250, 150, 'solid', { cls: 'dg-td' }), 'tube and bar'),
        given: { Do, t },
        answers: [ans('It', String.raw`\bar I_{tube}`, It / 1e6, U6), ans('Is', String.raw`\bar I_{solid}`, Is / 1e6, U6)],
        hints: [String.raw`Circle: $\pi r^4/4$. A tube is a big circle minus a small one.`, String.raw`$r_o = D/2$, $r_i = r_o - t$.`],
        solution: String.raw`<ol class="steps"><li>$r_o = ${fmt(ro)}$, $r_i = ${fmt(ri)}\ \text{mm}$</li><li>$\bar I_{tube} = \tfrac{\pi}{4}(${fmt(ro)}^4 - ${fmt(ri)}^4) = ${m6(It)}${E6}$</li><li>$\bar I_{solid} = \tfrac{\pi}{4}(${fmt(ro)})^4 = ${m6(Is)}${E6}$</li><li>The tube keeps ${fmt((100 * It) / Is, 3)}% of the stiffness with only ${fmt((100 * (ro ** 2 - ri ** 2)) / ro ** 2, 3)}% of the material.</li></ol>`,
      };
    },
  },
  {
    id: 'u10-T', title: 'T-section: centroid and Ī', kind: 'numeric',
    gen(r) {
      const bf = r.step(80, 200, 10), tf = r.step(10, 30, 5), tw = r.step(10, 30, 5), hw = r.step(80, 250, 10);
      const Aw = tw * hw, Af = bf * tf, yw = hw / 2, yf = hw + tf / 2, A = Aw + Af, yb = (Aw * yw + Af * yf) / A;
      const Iw = (tw * hw ** 3) / 12 + Aw * (yb - yw) ** 2, If = (bf * tf ** 3) / 12 + Af * (yf - yb) ** 2, I = Iw + If;
      return {
        prompt: String.raw`A T-section has a ${bf} × ${tf} mm flange centered on top of a ${tw} × ${hw} mm web. Find the centroid height $\bar y$ (from the bottom) and $\bar I_x$ about the horizontal centroidal axis (in $10^6\ \text{mm}^4$).`,
        svg: secSvg([[(bf - tw) / 2, 0, tw, hw], [0, hw, bf, tf]], bf, hw + tf),
        given: { bf, tf, tw, hw },
        answers: [ans('y', String.raw`\bar y`, yb, 'mm'), ans('I', String.raw`\bar I_x`, I / 1e6, U6)],
        hints: ['Step 1: find ȳ with the composite-area method.', String.raw`Step 2: for each rectangle, $\bar I_i = bh^3/12$ and $d_i = |\bar y_i - \bar y|$.`, String.raw`$\bar I_x = \sum(\bar I_i + A_id_i^2)$.`],
        solution: String.raw`<ol class="steps"><li>$\bar y = \dfrac{${Aw}(${fmt(yw)}) + ${Af}(${fmt(yf)})}{${A}} = ${fmt(yb)}\ \text{mm}$</li><li>Web: $\tfrac{${tw}(${hw})^3}{12} + ${Aw}(${fmt(yb - yw)})^2 = ${m6(Iw)}${E6}$</li><li>Flange: $\tfrac{${bf}(${tf})^3}{12} + ${Af}(${fmt(yf - yb)})^2 = ${m6(If)}${E6}$</li><li>$\bar I_x = ${m6(I)}${E6}$</li></ol>`,
      };
    },
  },
  {
    id: 'u10-Ibeam', title: 'Symmetric I-beam', kind: 'numeric',
    gen(r) {
      const bf = r.step(80, 250, 10), tf = r.step(8, 25, 1), tw = r.step(6, 16, 1), hw = r.step(100, 400, 10);
      const H = hw + 2 * tf, I = (bf * H ** 3 - (bf - tw) * hw ** 3) / 12;
      return {
        prompt: String.raw`A symmetric I-beam has flanges ${bf} mm wide × ${tf} mm thick and a web ${tw} mm thick × ${hw} mm tall (between the flanges). Find $\bar I_x$ about the horizontal centroidal axis, in $10^6\ \text{mm}^4$.`,
        svg: secSvg([[0, 0, bf, tf], [(bf - tw) / 2, tf, tw, hw], [0, tf + hw, bf, tf]], bf, H, { yc: H / 2 }),
        given: { bf, tf, tw, hw },
        answers: [ans('I', String.raw`\bar I_x`, I / 1e6, U6)],
        hints: ['By symmetry the centroid is at mid-height.', String.raw`Shortcut: the outer rectangle $b_f\times H$ minus the two empty side rectangles, which combine into $(b_f - t_w)\times h_w$, both centered on the same axis.`, String.raw`$\bar I = \dfrac{b_fH^3 - (b_f - t_w)h_w^3}{12}$ with $H = h_w + 2t_f$.`],
        solution: String.raw`<ol class="steps"><li>$H = ${hw} + 2(${tf}) = ${H}\ \text{mm}$</li><li>$\bar I_x = \dfrac{${bf}(${H})^3 - ${bf - tw}(${hw})^3}{12} = ${m6(I)}${E6}$</li></ol><p class="check">Same answer as adding the flanges with $\bar I + Ad^2$ to the web, just faster.</p>`,
      };
    },
  },
  {
    id: 'u10-gyration', title: 'Radius of gyration', kind: 'numeric',
    gen(r) {
      if (r.next() < 0.5) {
        const b = r.step(20, 200, 10), h = r.step(20, 300, 10), k = h / Math.sqrt(12);
        return {
          prompt: String.raw`Find the radius of gyration $k_x$ of a ${b} × ${h} mm rectangle (${h} mm is the height) about its horizontal centroidal axis.`,
          answers: [ans('k', 'k_x', k, 'mm')],
          hints: [String.raw`$k = \sqrt{I/A}$.`, String.raw`$\bar I_x = bh^3/12$, $A = bh$, so $k = h/\sqrt{12}$.`],
          solution: String.raw`<ol class="steps"><li>$k_x = \sqrt{\dfrac{bh^3/12}{bh}} = \dfrac{h}{\sqrt{12}} = \dfrac{${h}}{3.464} = ${fmt(k)}\ \text{mm}$</li></ol>`,
        };
      }
      const I = r.step(1, 200, 1), A = r.step(500, 15000, 100), k = Math.sqrt((I * 1e6) / A);
      return {
        prompt: String.raw`A column section has $I = ${I}\times10^6\ \text{mm}^4$ and $A = ${A}\ \text{mm}^2$. What is its radius of gyration?`,
        answers: [ans('k', 'k', k, 'mm')],
        hints: [String.raw`$k = \sqrt{I/A}$. Convert $I$ to plain mm⁴ first.`],
        solution: String.raw`<ol class="steps"><li>$k = \sqrt{${I}\times10^6/${A}} = ${fmt(k)}\ \text{mm}$</li></ol>`,
      };
    },
  },
  {
    id: 'u10-triangle', title: 'Triangle moments of inertia', kind: 'numeric',
    gen(r) {
      const b = r.step(30, 300, 10), h = r.step(30, 300, 10);
      const Ic = (b * h ** 3) / 36, Ib = (b * h ** 3) / 12;
      return {
        prompt: String.raw`A triangular gusset plate has base ${b} mm and height ${h} mm. Find its moment of inertia about (a) the horizontal centroidal axis and (b) the base, both in $10^6\ \text{mm}^4$.`,
        svg: S.svg(320, 180, S.poly([[60, 160], [260, 160], [120, 30]], 'dg-area') + S.line(40, 160 - 130 / 3, 280, 160 - 130 / 3, 'dg-d') + S.text(284, 160 - 130 / 3, 'x̄', { cls: 'dg-td', anchor: 'start' }), 'triangle'),
        given: { b, h },
        answers: [ans('Ic', String.raw`\bar I_x`, Ic / 1e6, U6), ans('Ib', 'I_{base}', Ib / 1e6, U6)],
        hints: [String.raw`About the centroid: $bh^3/36$.`, String.raw`About the base: $bh^3/12$. Check it: $\bar I + A(h/3)^2$.`],
        solution: String.raw`<ol class="steps"><li>$\bar I_x = \dfrac{${b}(${h})^3}{36} = ${m6(Ic)}${E6}$</li><li>$I_{base} = \bar I_x + \tfrac12(${b})(${h})\left(\tfrac{${h}}{3}\right)^2 = ${m6(Ib)}${E6}$ $\ (= bh^3/12)$</li></ol>`,
      };
    },
  },
  {
    id: 'u10-mc-concepts', title: 'Concept check: moments of inertia', kind: 'mc',
    gen: mcPool([
      { q: 'A 2×8 joist resists bending best when…', correct: 'it stands on edge (the 8-inch side vertical)', wrong: ['it lies flat', 'it doesn\'t matter: same area, same stiffness', 'it is rotated 45°'], why: String.raw`$I = bh^3/12$. Putting the larger dimension as $h$ (perpendicular to the bending axis) makes $I$ much larger.` },
      { q: 'What are the units of area moment of inertia?', correct: 'length⁴ (e.g., mm⁴)', wrong: ['length² (mm²)', 'mass·length² (kg·m²)', 'N·m'], why: String.raw`$I = \int y^2\,dA$: length² × area = length⁴. (kg·m² is the <em>mass</em> moment of inertia used in dynamics.)` },
      { q: 'Of all parallel axes, the moment of inertia of an area is smallest about…', correct: 'the axis through its centroid', wrong: ['an axis along its edge', 'an axis far away', 'all parallel axes give the same value'], why: String.raw`$I = \bar I + Ad^2$ and $Ad^2 \ge 0$, so it's smallest when $d = 0$.` },
      { q: 'If you double the depth h of a rectangular beam (same width), its I about the bending axis becomes…', correct: '8 times larger', wrong: ['2 times larger', '4 times larger', '16 times larger'], why: String.raw`$I \propto h^3$, and $2^3 = 8$.` },
      { q: 'Why do I-beams put most of their material in the flanges?', correct: 'Material far from the centroidal axis contributes most to I', wrong: ['Flanges are easier to weld', 'It moves the centroid to the top', 'It reduces the area moment of inertia'], why: String.raw`Each bit of area counts as $y^2\,dA$, so area far from the axis is far more effective.` },
    ]),
  },
];

module.exports = {
  num: 10, slug: 'moments-of-inertia', title: 'Area Moments of Inertia (Intro)',
  blurb: 'Second moment of area, standard shapes, the parallel-axis theorem, composite sections and radius of gyration.',
  lesson, problems,
};
