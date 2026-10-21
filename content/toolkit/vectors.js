'use strict';
const { fmt, q, ans, mcPool } = require('../helpers');
const { readMath } = require('../skills');
const { plane } = require('./common');

const vecTex = (v, unit = '') => {
  const names = ['\\hat\\imath', '\\hat\\jmath', '\\hat k'];
  let s = '';
  v.forEach((c, i) => { if (c === 0) return; const m = fmt(Math.abs(c)); s += (s ? (c < 0 ? ' - ' : ' + ') : (c < 0 ? '-' : '')) + m + '\\,' + names[i]; });
  return (s || '0') + (unit ? `\\ \\text{${unit}}` : '');
};

const lesson = String.raw`
<p class="lead">A vector is an arrow, which has a size and a direction. Written out, it is just a short list of numbers. Statics turns every force into a vector so that adding forces becomes ordinary arithmetic.</p>

<h2>1. Notation, symbol by symbol</h2>
${readMath([
  [String.raw`\mathbf F`, '"vector F"', 'Bold (or an arrow on top, $\\vec F$, in handwriting) means a vector. Plain $F$ means its size only.'],
  [String.raw`\hat\imath,\ \hat\jmath,\ \hat k`, '"i-hat, j-hat, k-hat"', 'Unit vectors: arrows of length 1 along +x, +y and +z. The hat ^ always means "length 1". (Many textbooks print them as bold i, j, k.)'],
  [String.raw`\mathbf F = 3\hat\imath - 4\hat\jmath`, '"F equals 3 i-hat minus 4 j-hat"', 'Go 3 units along +x and 4 units along −y. The numbers 3 and −4 are the components $F_x$ and $F_y$.'],
  [String.raw`|\mathbf F|`, '"the magnitude of F"', 'The length of the arrow. Also written $F$ or $\\lVert\\mathbf F\\rVert$.'],
  [String.raw`\mathbf u`, '"unit vector u"', 'A direction with length 1.'],
], ['vectors'])}

<h2>2. Magnitude (length)</h2>
<p>Pythagoras, in 2D or 3D:</p>
$$|\mathbf F| = \sqrt{F_x^2 + F_y^2} \qquad |\mathbf F| = \sqrt{F_x^2 + F_y^2 + F_z^2}$$
<p>Squaring removes the signs, so a magnitude is never negative.</p>

<h2>3. Adding and scaling vectors</h2>
${plane([{ x: 3, y: 1, label: 'A' }, { x: 1, y: 3, ox: 3, oy: 1, label: 'B', cls: 'dg-w' }, { x: 4, y: 4, label: 'A + B', cls: 'dg-m' }], 22, 110, { aria: 'tip-to-tail addition' })}
<p>Geometrically, place vectors tip-to-tail. Algebraically, just <strong>add matching components</strong>:</p>
$$\mathbf A + \mathbf B = (A_x + B_x)\hat\imath + (A_y + B_y)\hat\jmath + (A_z + B_z)\hat k$$
<p>Multiplying by a number scales every component: $2(3\hat\imath - \hat\jmath) = 6\hat\imath - 2\hat\jmath$. A negative number flips the direction.</p>

<h2>4. Position vectors and unit vectors</h2>
<p>The vector from point $A$ to point $B$ is "head minus tail":</p>
$$\mathbf r_{AB} = (x_B - x_A)\hat\imath + (y_B - y_A)\hat\jmath + (z_B - z_A)\hat k$$
<p>Dividing any vector by its own length keeps the direction but makes the length 1. That is the <strong>unit vector</strong>:</p>
$$\mathbf u_{AB} = \frac{\mathbf r_{AB}}{|\mathbf r_{AB}|}$$
<p>This is how statics builds a force along a cable: <em>(size) × (unit vector along the cable)</em>, so $\mathbf F = F\,\mathbf u_{AB}$.</p>
<div class="example"><h3>Worked example: force along a cable</h3>
<p>A 650 N cable force pulls from $A(0,0,0)$ toward $B(4,-3,12)$ m. Write it as a vector.</p>
<ol class="steps">
<li>$\mathbf r_{AB} = 4\hat\imath - 3\hat\jmath + 12\hat k$ m and $|\mathbf r_{AB}| = \sqrt{16+9+144} = 13$ m.</li>
<li>$\mathbf u_{AB} = \tfrac{4}{13}\hat\imath - \tfrac{3}{13}\hat\jmath + \tfrac{12}{13}\hat k$. Check: $(4^2+3^2+12^2)/13^2 = 1$ ✓</li>
<li>$\mathbf F = 650\,\mathbf u_{AB} = 200\hat\imath - 150\hat\jmath + 600\hat k\ \text{N}$.</li>
</ol></div>
<h2>Key takeaways</h2>
<ul class="takeaways"><li>Components are the numbers in front of î, ĵ, k̂.</li><li>Add vectors component by component.</li><li>Unit vector = vector ÷ its length; force = magnitude × unit vector.</li></ul>
`;

const nz = (r, a, b) => r.sign() * r.int(a, b);

const problems = [
  {
    id: 'm-vec-mag', title: 'Magnitude of a 3D vector', kind: 'numeric',
    gen(r) {
      const v = [nz(r, 1, 15), nz(r, 1, 15), nz(r, 1, 15)].map((c) => c * 10);
      return {
        prompt: String.raw`Find the magnitude of $\mathbf F = ${vecTex(v, 'N')}$.`,
        answers: [ans('F', '|\\mathbf F|', Math.hypot(...v), 'N')],
        given: { v },
        hints: ['Square each component (signs disappear), add, then take the square root.'],
        solution: String.raw`<ol class="steps"><li>$|\mathbf F| = \sqrt{${v.map((c) => `(${c})^2`).join(' + ')}} = \sqrt{${v.reduce((s, c) => s + c * c, 0)}} = ${q(Math.hypot(...v), 'N')}$</li></ol>`,
      };
    },
  },
  {
    id: 'm-vec-unit', title: 'Unit vector between two points', kind: 'numeric',
    gen(r) {
      const A = [r.int(-5, 5), r.int(-5, 5), r.int(-5, 5)];
      const d = [nz(r, 1, 8), nz(r, 1, 8), nz(r, 1, 8)];
      const B = A.map((a, i) => a + d[i]);
      const L = Math.hypot(...d), u = d.map((c) => c / L);
      return {
        prompt: String.raw`Find the unit vector $\mathbf u_{AB}$ pointing from $A(${A.join(', ')})$ to $B(${B.join(', ')})$ (coordinates in m). Give its three components.`,
        answers: [ans('ux', 'u_x', u[0], ''), ans('uy', 'u_y', u[1], ''), ans('uz', 'u_z', u[2], '')],
        given: { A, B },
        hints: [String.raw`First $\mathbf r_{AB} = B - A$ (head minus tail), coordinate by coordinate.`, String.raw`Then divide each component by $|\mathbf r_{AB}|$. The result has no units.`],
        solution: String.raw`<ol class="steps"><li>$\mathbf r_{AB} = ${vecTex(d, 'm')}$</li><li>$|\mathbf r_{AB}| = \sqrt{${d.map((c) => c * c).join(' + ')}} = ${fmt(L)}\ \text{m}$</li><li>$\mathbf u_{AB} = ${vecTex(u)}$, so $(u_x, u_y, u_z) = (${u.map((v) => fmt(v)).join(',\ ')})$</li></ol><p class="check">Check: $u_x^2+u_y^2+u_z^2 = 1$ ✓</p>`,
      };
    },
  },
  {
    id: 'm-vec-add', title: 'Adding three vectors', kind: 'numeric',
    gen(r) {
      const V = [0, 1, 2].map(() => [nz(r, 1, 12) * 10, nz(r, 1, 12) * 10]);
      const R = [V.reduce((s, v) => s + v[0], 0), V.reduce((s, v) => s + v[1], 0)];
      if (R[0] === 0 && R[1] === 0) V[0][0] += 10, R[0] += 10;
      return {
        prompt: String.raw`$\mathbf A = ${vecTex(V[0])}$, $\mathbf B = ${vecTex(V[1])}$, $\mathbf C = ${vecTex(V[2])}$ (all in N). Find the components of $\mathbf R = \mathbf A + \mathbf B + \mathbf C$ and its magnitude.`,
        answers: [ans('Rx', 'R_x', R[0], 'N', { abs: 0.5 }), ans('Ry', 'R_y', R[1], 'N', { abs: 0.5 }), ans('R', '|\\mathbf R|', Math.hypot(...R), 'N')],
        given: { V },
        hints: ['Add all the î numbers together, then all the ĵ numbers. Keep the signs.', String.raw`$|\mathbf R| = \sqrt{R_x^2 + R_y^2}$`],
        solution: String.raw`<ol class="steps"><li>$R_x = ${V.map((v) => `(${v[0]})`).join(' + ')} = ${R[0]}\ \text{N}$</li><li>$R_y = ${V.map((v) => `(${v[1]})`).join(' + ')} = ${R[1]}\ \text{N}$</li><li>$|\mathbf R| = \sqrt{${R[0]}^2 + ${R[1]}^2} = ${q(Math.hypot(...R), 'N')}$</li></ol>`,
      };
    },
  },
  {
    id: 'm-vec-force', title: 'Force = magnitude × unit vector', kind: 'numeric',
    gen(r) {
      const d = r.pick([[2, 3, 6], [3, 4, 12], [2, 6, 9], [1, 4, 8], [6, 6, 7], [4, 4, 7], [2, 10, 11]]).map((c) => c * r.sign());
      const sh = r.shuffle([0, 1, 2]); const dd = sh.map((i) => d[i]);
      const L = Math.hypot(...dd), F = r.step(100, 2000, 50);
      const Fv = dd.map((c) => (F * c) / L);
      return {
        prompt: String.raw`A cable from the origin $O$ to point $B(${dd.join(', ')})$ m pulls on $O$ with tension $${q(F, 'N')}$. Write the force as components $F_x, F_y, F_z$.`,
        answers: [ans('Fx', 'F_x', Fv[0], 'N'), ans('Fy', 'F_y', Fv[1], 'N'), ans('Fz', 'F_z', Fv[2], 'N')],
        given: { d: dd, F },
        hints: [String.raw`$\mathbf r_{OB}$ is just the coordinates of $B$. Its length is a whole number here.`, String.raw`$\mathbf F = F\,\dfrac{\mathbf r_{OB}}{|\mathbf r_{OB}|}$, so multiply each component by $F/|\mathbf r|$.`],
        solution: String.raw`<ol class="steps"><li>$|\mathbf r_{OB}| = \sqrt{${dd.map((c) => c * c).join(' + ')}} = ${fmt(L)}\ \text{m}$</li><li>$F/|\mathbf r| = ${fmt(F)}/${fmt(L)} = ${fmt(F / L)}\ \text{N/m}$</li><li>$\mathbf F = ${vecTex(Fv, 'N')}$</li></ol>`,
      };
    },
  },
  {
    id: 'm-vec-mc', title: 'Vector ideas (concept)', kind: 'mc',
    gen: mcPool([
      { q: String.raw`What is the length of any unit vector, such as $\hat\imath$ or $\mathbf u_{AB}$?`, correct: 'Exactly 1 (and it has no units)', wrong: ['It depends on the coordinates', 'The same as the force it describes', 'Zero'], why: 'Dividing a vector by its own length always leaves length 1. Units cancel too.' },
      { q: String.raw`Two forces of 30 N and 40 N act on a point. Which resultant magnitude is impossible?`, correct: '80 N', wrong: ['10 N', '50 N', '70 N'], why: 'The resultant ranges from |40 − 30| = 10 N (opposite directions) to 40 + 30 = 70 N (same direction). 80 N is too big.' },
      { q: String.raw`What does $-2\mathbf A$ look like compared with $\mathbf A$?`, correct: 'Twice as long, pointing the opposite way', wrong: ['Twice as long, same direction', 'Half as long, opposite way', 'Perpendicular to A'], why: 'Scaling multiplies every component by −2: the length doubles and every sign flips.' },
      { q: String.raw`In $\mathbf F = 5\hat\imath - 12\hat\jmath$ N, what are $F_y$ and $|\mathbf F|$?`, correct: String.raw`$F_y = -12$ N, $|\mathbf F| = 13$ N`, wrong: [String.raw`$F_y = 12$ N, $|\mathbf F| = 7$ N`, String.raw`$F_y = -12$ N, $|\mathbf F| = -7$ N`, String.raw`$F_y = 5$ N, $|\mathbf F| = 17$ N`], why: 'The number in front of ĵ is the y-component, sign included. The magnitude is √(25 + 144) = 13 N and is never negative.' },
    ]),
  },
];

module.exports = { key: 'vectors', lesson, problems, vecTex };
