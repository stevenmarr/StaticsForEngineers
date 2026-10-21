'use strict';
const { fmt, q, ans, mcPool } = require('../helpers');
const { readMath } = require('../skills');
const { areaUnder } = require('./common');
const S = require('../svg');

const lesson = String.raw`
<p class="lead">Two statics topics, distributed loads (Unit 4) and centroids (Unit 9), are written with integrals. You do <strong>not</strong> need calculus for this course. You need one idea: <em>an integral is a sum of infinitely many tiny pieces</em>, and for the shapes we use, that sum is just an area you already know how to find.</p>

<h2>1. Area under a line = total load</h2>
<p>A distributed load $w$ is measured in force per length (N/m or kN/m), so it is like snow piled on a beam. The total force is the <strong>area of the load diagram</strong>, and the force acts through the <strong>centroid</strong> (balance point) of that area.</p>
<table class="tbl"><thead><tr><th>Load shape</th><th>Total force (area)</th><th>Acts at</th></tr></thead><tbody>
<tr><td>Uniform $w$ over length $L$ (rectangle)</td><td>$wL$</td><td>the middle, $L/2$</td></tr>
<tr><td>0 rising to $w_0$ over $L$ (triangle)</td><td>$\tfrac12 w_0 L$</td><td>$\tfrac{2}{3}L$ from the zero end ($\tfrac13 L$ from the tall end)</td></tr>
<tr><td>$w_1$ to $w_2$ (trapezoid)</td><td>$\tfrac12(w_1 + w_2)L$</td><td>split it into a rectangle and a triangle</td></tr>
</tbody></table>
${areaUnder(1, 3, { l1: 'w₁', l2: 'w₂', L: 'L', aria: 'trapezoid load' })}

<h2>2. Why "sum of strips" is the real idea</h2>
<p>Slice the area into $n$ thin strips of width $\Delta x$ ("delta x", a small change in x). Each strip is almost a rectangle with height $w(x_i)$, so</p>
$$\text{area} \approx \sum_{i=1}^{n} w(x_i)\,\Delta x$$
${areaUnder(1, 3, { strips: 8, aria: 'strips under a line' })}
<p>Make the strips thinner and thinner. The approximation gets better, and in the limit the Σ becomes a stretched S, $\int$, and $\Delta x$ becomes $dx$:</p>
$$\gl{int}{\int_{0}^{L}} w(x)\,\gl{dA}{dx}\;=\;\text{"add up } w\,dx \text{ for every sliver from } x=0 \text{ to } x=L\text{"}$$
${readMath([
  [String.raw`\int_0^L`, '"the integral from 0 to L"', 'A continuous Σ: add up the slivers between the start (bottom number) and the end (top number).'],
  [String.raw`w(x)`, '"w of x"', 'The height of the load diagram at position x. A function, not w times x.'],
  [String.raw`dx`, '"d x"', 'The width of one infinitely thin sliver. It also says which variable you are slicing along.'],
  [String.raw`dA`, '"d A"', 'One tiny piece of area. $\\int dA$ (adding every piece) is simply the total area A.'],
  [String.raw`\approx`, '"approximately equals"', 'Close, but not exact yet.'],
], ['integral', 'sigma'])}
<div class="example"><h3>Worked example: strips approaching an exact answer</h3>
<p>Area under $y = x^2$ from 0 to 2, using midpoint strips (the height of each strip is taken at its middle):</p>
<ol class="steps">
<li>4 strips, $\Delta x = 0.5$, midpoints $0.25, 0.75, 1.25, 1.75$: $\ (0.0625 + 0.5625 + 1.5625 + 3.0625)(0.5) = 2.625$</li>
<li>8 strips: $2.656$; 100 strips: $2.6666$. The values close in on $8/3 = 2.667$, which is what $\int_0^2 x^2\,dx$ means.</li>
</ol>
<p>For straight-line shapes (rectangles, triangles), even the sum of strips is exact, so geometry gives the integral directly.</p></div>

<h2>3. Centroids are weighted averages</h2>
<p>The centroid formula from Unit 9,</p>
$$\gl{bar}{\bar x} = \frac{\int x\,dA}{\int dA},$$
<p>is the continuous version of $\bar x = \sum x_iA_i / \sum A_i$ from the Σ lesson: <em>(each tiny area × its position), all added up, divided by the total area</em>. For composite shapes you will use the Σ version with rectangles and triangles. The ∫ version is the same idea with infinitely thin pieces.</p>
<h2>Key takeaways</h2>
<ul class="takeaways"><li>Total distributed load = area under w(x); it acts at the area's centroid.</li><li>∫ is a sum of infinitely thin slivers; dx or dA is one sliver.</li><li>Rectangles and triangles: use geometry, no calculus.</li><li>x̄ = ∫x dA / ∫dA is a weighted average.</li></ul>
`;

const problems = [
  {
    id: 'm-int-rect', title: 'Uniform load: area & location', kind: 'numeric',
    gen(r) {
      const a = r.step(0, 4, 0.5), len = r.step(1, 6, 0.5), w = r.step(0.5, 20, 0.5);
      const b = a + len, F = w * len, xb = (a + b) / 2;
      const svg = S.svg(340, 150, S.beam(20, 320, 110) + S.dload(20 + (a / (b + 1)) * 300, 20 + (b / (b + 1)) * 300, 104, 36, 36, `w = ${fmt(w)} kN/m`) + S.dim(20 + (a / (b + 1)) * 300, 20 + (b / (b + 1)) * 300, 128, `${fmt(a)} m to ${fmt(b)} m`), 'uniform load');
      return {
        prompt: String.raw`A uniform load $w = ${q(w, 'kN/m')}$ acts on a beam from $x = ${fmt(a)}$ m to $x = ${fmt(b)}$ m. Find the total force $F = \int w\,dx$ and its location $\bar x$.`,
        svg,
        answers: [ans('F', 'F', F, 'kN'), ans('xb', '\\bar x', xb, 'm')],
        given: { a, b, w },
        hints: ['The load diagram is a rectangle. Its area is height × width.', 'A rectangle balances at its middle.'],
        solution: String.raw`<ol class="steps"><li>$F = w(b - a) = ${fmt(w)}(${fmt(len)}) = ${q(F, 'kN')}$</li><li>$\bar x = \tfrac{a + b}{2} = ${q(xb, 'm')}$</li></ol>`,
      };
    },
  },
  {
    id: 'm-int-tri', title: 'Triangular load: area & location', kind: 'numeric',
    gen(r) {
      const L = r.step(1, 9, 0.5), w0 = r.step(1, 30, 1), tallRight = r.next() < 0.5;
      const F = 0.5 * w0 * L, xb = tallRight ? (2 * L) / 3 : L / 3;
      const svg = S.svg(340, 150, S.beam(20, 320, 110) + S.dload(20, 320, 104, tallRight ? 0 : 50, tallRight ? 50 : 0, `w₀ = ${w0} kN/m`) + S.dim(20, 320, 128, `L = ${fmt(L)} m`), 'triangular load');
      return {
        prompt: String.raw`A triangular load grows from $0$ at the ${tallRight ? 'left' : 'right'} end to $w_0 = ${q(w0, 'kN/m')}$ at the ${tallRight ? 'right' : 'left'} end of a beam of length $${q(L, 'm')}$. Find the total force and its location $\bar x$ measured from the <strong>left</strong> end.`,
        svg,
        answers: [ans('F', 'F', F, 'kN'), ans('xb', '\\bar x', xb, 'm')],
        given: { L, w0, tallRight },
        hints: ['Area of a triangle = ½ × base × height.', 'A triangle\'s centroid is one third of the way from its tall side (two thirds from the pointed end).'],
        solution: String.raw`<ol class="steps"><li>$F = \tfrac12 w_0 L = \tfrac12(${w0})(${fmt(L)}) = ${q(F, 'kN')}$</li><li>The tall end is on the ${tallRight ? 'right' : 'left'}, so $\bar x = ${tallRight ? '\\tfrac23 L' : '\\tfrac13 L'} = ${q(xb, 'm')}$ from the left end.</li></ol>`,
      };
    },
  },
  {
    id: 'm-int-trap', title: 'Area under a sloped line', kind: 'numeric',
    gen(r) {
      const L = r.step(1, 10, 0.5), y1 = r.step(1, 20, 0.5), y2 = r.step(1, 20, 0.5);
      const A = 0.5 * (y1 + y2) * L;
      return {
        prompt: String.raw`Find $\displaystyle\int_0^{${fmt(L)}} y(x)\,dx$, where $y(x)$ is the straight line from $y = ${fmt(y1)}$ at $x = 0$ to $y = ${fmt(y2)}$ at $x = ${fmt(L)}$.`,
        svg: areaUnder(y1, y2, { l1: fmt(y1), l2: fmt(y2), L: fmt(L) }),
        answers: [ans('A', '\\int y\\,dx', A, '')],
        given: { L, y1, y2 },
        hints: ['The integral of a straight line is just the area underneath it: a trapezoid.', String.raw`Trapezoid area $= \tfrac12(y_1 + y_2)L$, or a rectangle plus a triangle.`],
        solution: String.raw`<ol class="steps"><li>The area under the line is a trapezoid.</li><li>$\tfrac12(${fmt(y1)} + ${fmt(y2)})(${fmt(L)}) = ${fmt(A)}$</li></ol>`,
      };
    },
  },
  {
    id: 'm-int-strips', title: 'Approximating with strips', kind: 'numeric',
    gen(r) {
      const c = r.step(0.5, 5, 0.5), L = r.pick([2, 3, 4, 6, 8]), n = 4;
      const dx = L / n, mids = [0, 1, 2, 3].map((i) => (i + 0.5) * dx);
      const S4 = mids.reduce((s, m) => s + c * m * m * dx, 0);
      return {
        prompt: String.raw`Approximate the area under $y = ${fmt(c)}x^2$ from $x = 0$ to $x = ${L}$ using ${n} strips of equal width, taking each strip's height at its <strong>midpoint</strong>. Also give the exact area $\int_0^{${L}} ${fmt(c)}x^2\,dx = ${fmt(c)}\cdot\tfrac{${L}^3}{3}$ so you can compare.`,
        answers: [ans('S', '\\text{strip sum}', S4, ''), ans('A', '\\text{exact}', (c * L ** 3) / 3, '')],
        given: { c, L, n },
        hints: [String.raw`Strip width $\Delta x = ${L}/${n} = ${fmt(dx)}$. The midpoints are $${mids.map((v) => fmt(v)).join(',\\ ')}$.`, String.raw`Sum $= \sum y(\text{midpoint})\,\Delta x$. The exact value just needs the formula given.`],
        solution: String.raw`<ol class="steps"><li>Heights: $${mids.map((m) => fmt(c * m * m)).join(',\\ ')}$</li><li>Strip sum $= (${mids.map((m) => fmt(c * m * m)).join(' + ')})(${fmt(dx)}) = ${fmt(S4)}$</li><li>Exact: $${fmt(c)}\cdot ${L}^3/3 = ${fmt((c * L ** 3) / 3)}$. Four strips already get within ${fmt(100 * Math.abs(1 - S4 / ((c * L ** 3) / 3)), 2)}%.</li></ol>`,
      };
    },
  },
  {
    id: 'm-int-mc', title: 'Reading ∫ notation (concept)', kind: 'mc',
    gen: mcPool([
      { q: String.raw`A beam carries a distributed load $w(x)$ in N/m. What does $\int_0^L w(x)\,dx$ represent?`, correct: 'The total force of the load (the area under the load diagram)', wrong: ['The load at the midpoint', 'The bending moment at x = L', 'The average slope of the load'], why: 'Adding w·dx (force per length × tiny length) for every sliver gives the total force.' },
      { q: String.raw`What is $\int dA$ over a shape?`, correct: 'The total area of the shape', wrong: ['Zero', 'The centroid location', 'The perimeter'], why: 'Adding up every tiny piece of area gives the whole area.' },
      { q: String.raw`Read $\bar x = \dfrac{\int x\,dA}{\int dA}$ in words.`, correct: 'The area-weighted average x position (the centroid)', wrong: ['The x-coordinate where the shape is widest', 'The total area divided by x', 'The slope of the shape\'s edge'], why: 'Each tiny area is weighted by its x, everything is added up, and dividing by the total area gives the average position.' },
      { q: 'Why do thinner strips give a better estimate of the area under a curve?', correct: 'Each strip is closer to a true rectangle, so the error per strip shrinks', wrong: ['There are fewer strips to add', 'Thin strips are taller', 'They don\'t; the strip count never matters'], why: 'As Δx → 0 the strips fit the curve exactly. That limit is the integral.' },
      { q: String.raw`A triangular load rises from 0 to 6 kN/m over 3 m. What single force replaces it?`, correct: '9 kN, 2 m from the zero end', wrong: ['18 kN at the middle', '9 kN at the middle', '6 kN at the tall end'], why: 'Area = ½(6)(3) = 9 kN. The centroid of a triangle is ⅔ of the base from the pointed (zero) end.' },
    ]),
  },
];

module.exports = { key: 'integral', lesson, problems };
