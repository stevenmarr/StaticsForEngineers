'use strict';
const { fmt, q, ans, mcPool, acosd } = require('../helpers');
const { readMath } = require('../skills');
const { vecTex } = require('./vectors');

const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const mag = (a) => Math.hypot(...a);
const nz = (r, a, b) => r.sign() * r.int(a, b);

const lesson = String.raw`
<p class="lead">The dot product multiplies two vectors and returns a <strong>plain number</strong>. Statics uses it for two jobs: the angle between two lines, and how much of a force acts along a particular direction.</p>

<h2>1. Definition, symbol by symbol</h2>
$$\mathbf A \gl{dot}{\cdot} \mathbf B = A_xB_x + A_yB_y + A_zB_z = |\mathbf A|\,|\mathbf B|\cos\theta$$
${readMath([
  [String.raw`\mathbf A\cdot\mathbf B`, '"A dot B"', 'The dot product. The centered dot is essential: it is not the same as A × B.'],
  [String.raw`A_xB_x + \dots`, '"A-x B-x plus A-y B-y plus A-z B-z"', 'Multiply matching components and add. The answer is a scalar (one number), not a vector.'],
  [String.raw`\theta`, '"theta"', 'The angle between the two arrows when they are placed tail to tail (0° to 180°).'],
], ['dot'])}
<p>The two formulas are equal, which is what makes the dot product useful: the left side is easy arithmetic, and the right side contains the angle.</p>

<h2>2. Angle between two lines</h2>
$$\theta = \cos^{-1}\!\left(\frac{\mathbf A\cdot\mathbf B}{|\mathbf A|\,|\mathbf B|}\right)$$
<div class="example"><h3>Worked example 1</h3>
<p>$\mathbf A = 3\hat\imath + 4\hat\jmath$ and $\mathbf B = 4\hat\imath - 3\hat\jmath + 5\hat k$.</p>
<ol class="steps">
<li>$\mathbf A\cdot\mathbf B = 3(4) + 4(-3) + 0(5) = 0$</li>
<li>So $\cos\theta = 0$ and $\theta = 90^\circ$: the vectors are <strong>perpendicular</strong>.</li>
</ol></div>
<p>The sign tells you something too: positive means the angle is under 90°, zero means exactly 90°, negative means over 90°.</p>

<h2>3. Component of a force along a line (projection)</h2>
<p>If $\mathbf u$ is a <em>unit</em> vector along some line, then</p>
$$F_\parallel = \mathbf F\cdot\mathbf u$$
<p>is "how much of $\mathbf F$ pushes along that line". If your direction vector $\mathbf d$ isn't a unit vector, divide by its length: $F_\parallel = \mathbf F\cdot\mathbf d/|\mathbf d|$. Unit 3 uses this to find the moment about an axis.</p>
<div class="example"><h3>Worked example 2</h3>
<p>$\mathbf F = 100\hat\imath + 200\hat\jmath - 50\hat k$ N. How much of it acts along $\mathbf d = 2\hat\imath + \hat\jmath + 2\hat k$?</p>
<ol class="steps"><li>$|\mathbf d| = \sqrt{4+1+4} = 3$, $\mathbf F\cdot\mathbf d = 200 + 200 - 100 = 300$</li><li>$F_\parallel = 300/3 = 100$ N</li></ol></div>
<h2>Key takeaways</h2>
<ul class="takeaways"><li>A·B = AxBx + AyBy + AzBz, a number.</li><li>A·B = 0 means perpendicular.</li><li>θ = cos⁻¹(A·B / (|A||B|)).</li><li>The part of F along a line is F·u.</li></ul>
`;

const problems = [
  {
    id: 'm-dot-compute', title: 'Compute a dot product', kind: 'numeric',
    gen(r) {
      const A = [nz(r, 1, 9), nz(r, 1, 9), nz(r, 1, 9)], B = [nz(r, 1, 9), nz(r, 1, 9), nz(r, 1, 9)];
      return {
        prompt: String.raw`Find $\mathbf A\cdot\mathbf B$ for $\mathbf A = ${vecTex(A)}$ and $\mathbf B = ${vecTex(B)}$.`,
        answers: [ans('d', '\\mathbf A\\cdot\\mathbf B', dot(A, B), '', { abs: 0.01 })],
        given: { A, B },
        hints: ['Multiply the î numbers together, the ĵ numbers together and the k̂ numbers together.', 'Add the three products. The answer is one number.'],
        solution: String.raw`<ol class="steps"><li>$\mathbf A\cdot\mathbf B = (${A[0]})(${B[0]}) + (${A[1]})(${B[1]}) + (${A[2]})(${B[2]})$</li><li>$= ${A[0] * B[0]} + ${A[1] * B[1]} + ${A[2] * B[2]} = ${dot(A, B)}$</li></ol>`,
      };
    },
  },
  {
    id: 'm-dot-angle', title: 'Angle between two vectors', kind: 'numeric',
    gen(r) {
      let A, B;
      do { A = [nz(r, 1, 8), nz(r, 1, 8), r.int(-6, 6)]; B = [nz(r, 1, 8), r.int(-6, 6), nz(r, 1, 8)]; } while (Math.abs(dot(A, B)) < 1);
      const th = acosd(dot(A, B) / (mag(A) * mag(B)));
      return {
        prompt: String.raw`Find the angle $\theta$ between $\mathbf A = ${vecTex(A)}$ and $\mathbf B = ${vecTex(B)}$.`,
        answers: [ans('th', '\\theta', th, '°', { abs: 0.5 })],
        given: { A, B },
        hints: [String.raw`Compute $\mathbf A\cdot\mathbf B$, $|\mathbf A|$ and $|\mathbf B|$ separately.`, String.raw`$\theta = \cos^{-1}\big(\mathbf A\cdot\mathbf B/(|\mathbf A||\mathbf B|)\big)$. A negative dot product gives an angle over 90°.`],
        solution: String.raw`<ol class="steps"><li>$\mathbf A\cdot\mathbf B = ${dot(A, B)}$, $|\mathbf A| = ${fmt(mag(A))}$, $|\mathbf B| = ${fmt(mag(B))}$</li><li>$\cos\theta = \dfrac{${dot(A, B)}}{(${fmt(mag(A))})(${fmt(mag(B))})} = ${fmt(dot(A, B) / (mag(A) * mag(B)))}$</li><li>$\theta = ${fmt(th)}^\circ$</li></ol>`,
      };
    },
  },
  {
    id: 'm-dot-proj', title: 'Part of a force along a line', kind: 'numeric',
    gen(r) {
      const F = [nz(r, 1, 30) * 10, nz(r, 1, 30) * 10, nz(r, 1, 30) * 10];
      const d = r.pick([[1, 2, 2], [2, 3, 6], [3, 4, 12], [2, 6, 9], [4, 4, 7], [1, 4, 8]]).map((c) => c * r.sign());
      const L = mag(d), Fp = dot(F, d) / L;
      return {
        prompt: String.raw`$\mathbf F = ${vecTex(F, 'N')}$. Find the component of $\mathbf F$ along the line with direction $\mathbf d = ${vecTex(d)}$ (positive if it points the same way as $\mathbf d$).`,
        answers: [ans('Fp', 'F_\\parallel', Fp, 'N')],
        given: { F, d },
        hints: [String.raw`$\mathbf d$ is not a unit vector. Find $|\mathbf d|$ first (it is a whole number here).`, String.raw`$F_\parallel = \mathbf F\cdot\mathbf d/|\mathbf d|$`],
        solution: String.raw`<ol class="steps"><li>$|\mathbf d| = \sqrt{${d.map((c) => c * c).join(' + ')}} = ${fmt(L)}$</li><li>$\mathbf F\cdot\mathbf d = ${F.map((c, i) => `(${c})(${d[i]})`).join(' + ')} = ${dot(F, d)}$</li><li>$F_\parallel = ${dot(F, d)}/${fmt(L)} = ${q(Fp, 'N')}$</li></ol>`,
      };
    },
  },
  {
    id: 'm-dot-perp', title: 'Spot the perpendicular pair', kind: 'mc',
    gen(r) {
      // Build one perpendicular pair and three that are not.
      const pairs = [];
      const a = [nz(r, 1, 5), nz(r, 1, 5), nz(r, 1, 5)];
      const b = [a[1], -a[0], 0]; // a·b = 0
      pairs.push({ A: a, B: b, correct: true });
      while (pairs.length < 4) {
        const A = [nz(r, 1, 5), nz(r, 1, 5), r.int(-4, 4)], B = [nz(r, 1, 5), r.int(-4, 4), nz(r, 1, 5)];
        if (dot(A, B) !== 0 && !pairs.some((p) => p.A.join() === A.join() && p.B.join() === B.join())) pairs.push({ A, B, correct: false });
      }
      const choices = r.shuffle(pairs).map((p) => ({ text: String.raw`$${vecTex(p.A)}$ and $${vecTex(p.B)}$`, correct: p.correct }));
      return {
        prompt: 'Which pair of vectors is perpendicular?',
        choices,
        hints: ['Perpendicular means the dot product is exactly zero. Compute A·B for each pair.'],
        solution: String.raw`<p><strong>Answer:</strong> $${vecTex(a)}$ and $${vecTex(b)}$.</p><p>Their dot product is $(${a[0]})(${b[0]}) + (${a[1]})(${b[1]}) + (${a[2]})(0) = 0$. The other pairs give non-zero dot products.</p>`,
      };
    },
  },
];

module.exports = { key: 'dot', lesson, problems };
