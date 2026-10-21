'use strict';
const { fmt, q, ans } = require('../helpers');
const { readMath } = require('../skills');
const { vecTex } = require('./vectors');
const { det3 } = require('./linsys');

const crossP = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nz = (r, a, b) => r.sign() * r.int(a, b);
const mat = (M) => String.raw`\begin{vmatrix} ${M.map((row) => row.join(' & ')).join(' \\\\ ')} \end{vmatrix}`;

const lesson = String.raw`
<p class="lead">In 3D, the moment of a force is written $\gl{moment}{M_O} = \mathbf r \gl{cross}{\times} \mathbf F$. That "×" is the cross product, and the cleanest way to compute it is with a determinant. Both are explained here from scratch. You don't need linear algebra.</p>

<h2>1. Determinants</h2>
${readMath([
  [String.raw`\begin{vmatrix} a & b \\ c & d \end{vmatrix}`, '"the determinant of a, b, c, d"', 'Straight bars (not brackets) around a grid mean "compute this one number". For 2×2: $ad - bc$.'],
], ['cross'])}
$$\begin{vmatrix} a & b \\ c & d \end{vmatrix} = ad - bc \qquad\text{e.g.}\quad \begin{vmatrix} 3 & -2 \\ 4 & 5 \end{vmatrix} = 3(5) - (-2)(4) = 23$$
<p>A 3×3 determinant expands along the top row into three 2×2 determinants. Signs alternate $+,\ -,\ +$, and each 2×2 is what's left after crossing out that entry's row and column:</p>
$$\begin{vmatrix} a_1 & a_2 & a_3 \\ b_1 & b_2 & b_3 \\ c_1 & c_2 & c_3 \end{vmatrix} = a_1\begin{vmatrix} b_2 & b_3 \\ c_2 & c_3 \end{vmatrix} - a_2\begin{vmatrix} b_1 & b_3 \\ c_1 & c_3 \end{vmatrix} + a_3\begin{vmatrix} b_1 & b_2 \\ c_1 & c_2 \end{vmatrix}$$

<h2>2. The cross product</h2>
$$\mathbf A \times \mathbf B = \begin{vmatrix} \hat\imath & \hat\jmath & \hat k \\ A_x & A_y & A_z \\ B_x & B_y & B_z \end{vmatrix} = (A_yB_z - A_zB_y)\hat\imath - (A_xB_z - A_zB_x)\hat\jmath + (A_xB_y - A_yB_x)\hat k$$
${readMath([
  [String.raw`\mathbf A\times\mathbf B`, '"A cross B"', 'A new <em>vector</em>, perpendicular to both A and B. Compare A·B, which is a number.'],
  [String.raw`\hat\imath,\ \hat\jmath,\ \hat k \text{ in row 1}`, '"i-hat, j-hat, k-hat"', 'A memory trick: put the unit vectors in the top row and expand as usual. Each 2×2 becomes one component.'],
], ['cross', 'vectors'])}
<ul>
<li><strong>Order matters:</strong> $\mathbf B\times\mathbf A = -(\mathbf A\times\mathbf B)$. In statics it is always $\mathbf r \times \mathbf F$ (position first).</li>
<li><strong>Right-hand rule:</strong> point your fingers along $\mathbf A$ and curl them toward $\mathbf B$. Your thumb points along $\mathbf A\times\mathbf B$.</li>
<li><strong>Unit vectors:</strong> $\hat\imath\times\hat\jmath = \hat k$, $\hat\jmath\times\hat k = \hat\imath$, $\hat k\times\hat\imath = \hat\jmath$ (going around the cycle i→j→k), and the reverse order gives a minus sign. Any vector crossed with itself is $\mathbf 0$.</li>
</ul>
<div class="example"><h3>Worked example: a 3D moment</h3>
<p>$\mathbf r = 2\hat\imath + 1\hat\jmath + 0\hat k$ m and $\mathbf F = 0\hat\imath + 30\hat\jmath + 40\hat k$ N. Find $\mathbf M_O = \mathbf r\times\mathbf F$.</p>
<ol class="steps">
<li>$\hat\imath$: $(1)(40) - (0)(30) = 40$</li>
<li>$\hat\jmath$: $-\big[(2)(40) - (0)(0)\big] = -80$ (don't forget the minus)</li>
<li>$\hat k$: $(2)(30) - (1)(0) = 60$</li>
<li>$\mathbf M_O = 40\hat\imath - 80\hat\jmath + 60\hat k\ \text{N·m}$</li>
</ol>
<p class="check">Check: $\mathbf M_O\cdot\mathbf r = 80 - 80 + 0 = 0$, so it is perpendicular to $\mathbf r$ as it must be ✓</p></div>

<h2>3. The 2D shortcut</h2>
<p>When everything lies in the x-y plane, only the $\hat k$ part survives:</p>
$$M_O = x F_y - y F_x \qquad (\text{positive} = \text{counterclockwise})$$
<p>This one line replaces "force times perpendicular distance" whenever the geometry is awkward.</p>
<h2>Key takeaways</h2>
<ul class="takeaways"><li>2×2 determinant: ad − bc.</li><li>A × B: î, ĵ, k̂ row on top; expand with + − +.</li><li>Order matters; r × F for moments.</li><li>2D: M = xF_y − yF_x.</li></ul>
`;

const problems = [
  {
    id: 'm-cr-det2', title: '2×2 determinant', kind: 'numeric',
    gen(r) {
      const M = [[nz(r, 1, 12), nz(r, 1, 12)], [nz(r, 1, 12), nz(r, 1, 12)]];
      const d = M[0][0] * M[1][1] - M[0][1] * M[1][0];
      return {
        prompt: String.raw`Evaluate $${mat(M)}$.`,
        answers: [ans('d', '\\det', d, '', { abs: 0.01 })],
        given: { M },
        hints: ['Main diagonal product minus the other diagonal product: ad − bc.', 'Watch the signs: subtracting a negative product adds.'],
        solution: String.raw`<ol class="steps"><li>$(${M[0][0]})(${M[1][1]}) - (${M[0][1]})(${M[1][0]}) = ${M[0][0] * M[1][1]} - (${M[0][1] * M[1][0]}) = ${d}$</li></ol>`,
      };
    },
  },
  {
    id: 'm-cr-det3', title: '3×3 determinant', kind: 'numeric',
    gen(r) {
      const M = [0, 1, 2].map(() => [r.int(-5, 5), r.int(-5, 5), r.int(-5, 5)]);
      const m = (i, j) => { const rows = [1, 2], cols = [0, 1, 2].filter((c) => c !== j); return M[rows[0]][cols[0]] * M[rows[1]][cols[1]] - M[rows[0]][cols[1]] * M[rows[1]][cols[0]]; };
      const d = det3(M);
      return {
        prompt: String.raw`Evaluate $${mat(M)}$.`,
        answers: [ans('d', '\\det', d, '', { abs: 0.01 })],
        given: { M },
        hints: ['Expand along the top row with signs + − +.', 'For each top-row entry, cross out its row and column and take the 2×2 determinant of what is left.'],
        solution: String.raw`<ol class="steps"><li>$= ${M[0][0]}(${m(0, 0)}) - (${M[0][1]})(${m(0, 1)}) + (${M[0][2]})(${m(0, 2)})$</li><li>$= ${d}$</li></ol>`,
      };
    },
  },
  {
    id: 'm-cr-3d', title: 'Cross product components', kind: 'numeric',
    gen(r) {
      const A = [r.int(-6, 6), r.int(-6, 6), r.int(-6, 6)], B = [nz(r, 1, 6), r.int(-6, 6), nz(r, 1, 6)];
      if (A.every((v) => v === 0)) A[0] = 2;
      const C = crossP(A, B);
      return {
        prompt: String.raw`Find $\mathbf A\times\mathbf B$ for $\mathbf A = ${vecTex(A)}$ and $\mathbf B = ${vecTex(B)}$. Give the three components.`,
        answers: [ans('cx', '(\\mathbf A\\times\\mathbf B)_x', C[0], '', { abs: 0.01 }), ans('cy', '(\\mathbf A\\times\\mathbf B)_y', C[1], '', { abs: 0.01 }), ans('cz', '(\\mathbf A\\times\\mathbf B)_z', C[2], '', { abs: 0.01 })],
        given: { A, B },
        hints: [String.raw`Set up the determinant with $\hat\imath\ \hat\jmath\ \hat k$ on top, then A's components, then B's.`, String.raw`x: $A_yB_z - A_zB_y$; y: $-(A_xB_z - A_zB_x)$; z: $A_xB_y - A_yB_x$.`],
        solution: String.raw`<ol class="steps"><li>$x$: $(${A[1]})(${B[2]}) - (${A[2]})(${B[1]}) = ${C[0]}$</li><li>$y$: $-\big[(${A[0]})(${B[2]}) - (${A[2]})(${B[0]})\big] = ${C[1]}$</li><li>$z$: $(${A[0]})(${B[1]}) - (${A[1]})(${B[0]}) = ${C[2]}$</li><li>$\mathbf A\times\mathbf B = ${vecTex(C)}$</li></ol>`,
      };
    },
  },
  {
    id: 'm-cr-2d', title: '2D moment: M = xF_y − yF_x', kind: 'numeric',
    gen(r) {
      const x = r.sign() * r.step(0.5, 4, 0.5), y = r.sign() * r.step(0.5, 4, 0.5);
      let Fx = nz(r, 1, 40) * 10; const Fy = nz(r, 1, 40) * 10;
      if (Math.abs(x * Fy - y * Fx) < 1) Fx += 10;
      const M = x * Fy - y * Fx;
      return {
        prompt: String.raw`A force $\mathbf F = ${vecTex([Fx, Fy, 0], 'N')}$ acts at the point $(${fmt(x)}, ${fmt(y)})$ m. Find its moment about the origin, $M_O$ (counterclockwise positive).`,
        answers: [ans('M', 'M_O', M, 'N·m')],
        given: { x, y, Fx, Fy },
        hints: [String.raw`In 2D, $\mathbf r\times\mathbf F$ has only a $\hat k$ part: $M_O = xF_y - yF_x$.`, 'Keep every sign: x, y, Fx and Fy can all be negative.'],
        solution: String.raw`<ol class="steps"><li>$M_O = xF_y - yF_x = (${fmt(x)})(${Fy}) - (${fmt(y)})(${Fx})$</li><li>$= ${fmt(x * Fy)} - (${fmt(y * Fx)}) = ${q(M, 'N·m')}$ (${M > 0 ? 'counterclockwise' : 'clockwise'})</li></ol>`,
      };
    },
  },
  {
    id: 'm-cr-unit', title: 'Unit-vector cross products', kind: 'mc',
    gen(r) {
      const u = ['\\hat\\imath', '\\hat\\jmath', '\\hat k'];
      const a = r.int(0, 2), b = r.int(0, 2);
      let res;
      if (a === b) res = '\\mathbf 0';
      else { const third = 3 - a - b; const cyc = (b - a + 3) % 3 === 1; res = (cyc ? '' : '-') + u[third]; }
      const opts = ['\\hat\\imath', '-\\hat\\imath', '\\hat\\jmath', '-\\hat\\jmath', '\\hat k', '-\\hat k', '\\mathbf 0'];
      const picks = r.shuffle([res, ...r.shuffle(opts.filter((o) => o !== res)).slice(0, 3)]);
      return {
        prompt: String.raw`What is $${u[a]}\times${u[b]}$?`,
        choices: picks.map((t) => ({ text: `$${t}$`, correct: t === res })),
        hints: ['Going forward around the cycle i → j → k → i gives a plus sign; going backward gives a minus. A vector crossed with itself is zero.'],
        solution: String.raw`<p><strong>Answer:</strong> $${u[a]}\times${u[b]} = ${res}$.</p><p>${a === b ? 'Parallel vectors (here identical) have zero cross product.' : (b - a + 3) % 3 === 1 ? 'This order follows the cycle i → j → k, so the sign is +.' : 'This order goes against the cycle i → j → k, so the sign is −.'}</p>`,
      };
    },
  },
];

module.exports = { key: 'cross', lesson, problems, crossP };
