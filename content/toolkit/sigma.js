'use strict';
const { fmt, q, ans, mcPool } = require('../helpers');
const { readMath } = require('../skills');

const lesson = String.raw`
<p class="lead">The Greek letter $\Sigma$ shows up in the very first equilibrium equation and never leaves. It is not a new kind of math, just shorthand for "add these up". Once you can read it aloud, every statics equation gets less scary.</p>

<h2>1. Reading Σ symbol by symbol</h2>
$$\gl{sumi}{\sum_{i=1}^{4}} \gl{idx}{F_i} \;=\; F_1 + F_2 + F_3 + F_4$$
${readMath([
  [String.raw`\Sigma`, '"sigma" or "the sum of"', 'Capital Greek S (for Sum). Add up whatever follows.'],
  [String.raw`i`, '"i" (the index)', 'A counter. It is not the imaginary number and not î! It just numbers the items: 1, 2, 3, …'],
  [String.raw`i=1 \text{ (below)},\ 4 \text{ (above)}`, '"from i equals 1 to 4"', 'Where the counter starts and stops.'],
  [String.raw`F_i`, '"F sub i"', 'The term to add: "force number i". With i = 2 it is $F_2$.'],
], ['sigma'])}
<p>Say the whole thing aloud: <em>"the sum, from i equals 1 to 4, of F sub i."</em> It means: plug in i = 1, 2, 3, 4 one at a time, then add the results.</p>
<p>The expression after Σ can use $i$ in arithmetic too:</p>
$$\sum_{i=1}^{3} (2i + 1) = (2\cdot1+1) + (2\cdot2+1) + (2\cdot3+1) = 3 + 5 + 7 = 15$$

<h2>2. Subscripts are labels, not math</h2>
<p>In $F_x$ the "x" is not a variable you multiply by. It is a name tag meaning "the x-component of F". Engineers stack labels too: $F_{2x}$ is "the x-component of force 2" and $M_A$ is "the moment about point A".</p>

<h2>3. Σ without limits: "every one of them"</h2>
<p>Statics usually drops the limits because they are obvious: "all the forces on this free-body diagram".</p>
$$\gl{sigma}{\sum} \gl{sub}{F_x} = 0$$
${readMath([
  [String.raw`\sum F_x = 0`, '"the sum of the x-forces equals zero"', 'Take every force on the body, find its x-component (with its sign) and add them. Equilibrium says the total must be zero.'],
  [String.raw`\sum M_A = 0`, '"the sum of moments about A equals zero"', 'Same idea for turning effects about point A.'],
], ['sigma', 'signs'])}
<p>This is an <strong>equation you write out</strong>, not something to compute in one step. Write one term per force, with its sign:</p>
<div class="example"><h3>Worked example: writing out ΣF_x = 0</h3>
<p>A ring is pulled by $F_1 = 200$ N to the right, $F_2 = 150$ N at 60° above the left horizontal (pointing up-left), and an unknown horizontal force $P$. Find $P$.</p>
<ol class="steps">
<li>List each force's x-component: $F_{1x} = +200$, $F_{2x} = -150\cos60^\circ = -75$, $P_x = P$.</li>
<li>$\sum F_x = 0:\quad 200 - 75 + P = 0$</li>
<li>$P = -125$ N. The minus sign means $P$ actually points <em>left</em>, at 125 N.</li>
</ol></div>

<h2>4. Weighted sums and averages (centroids!)</h2>
<p>Many statics formulas are "sum of (weight × position) ÷ sum of weights":</p>
$$\gl{bar}{\bar x} = \frac{\sum x_i A_i}{\sum A_i}$$
<p>Read: "x-bar equals the sum of x-i times A-i, divided by the sum of A-i." It is the average position, where bigger pieces count more. It works exactly like a weighted grade average.</p>
<div class="example"><h3>Worked example: where is the resultant?</h3>
<p>Downward loads 2 kN at x = 1 m, 3 kN at x = 4 m and 5 kN at x = 6 m. The single equivalent load is $\sum F_i = 10$ kN, located at</p>
$$\bar x = \frac{\sum x_iF_i}{\sum F_i} = \frac{1(2) + 4(3) + 6(5)}{10} = \frac{44}{10} = 4.4\ \text{m}$$</div>
<h2>5. Two handy rules</h2>
<ul><li>Constants factor out: $\sum c\,a_i = c\sum a_i$.</li><li>Sums split: $\sum (a_i + b_i) = \sum a_i + \sum b_i$.</li></ul>
<h2>Key takeaways</h2>
<ul class="takeaways"><li>Σ = "add up"; i is just a counter.</li><li>Subscripts are labels.</li><li>ΣF_x = 0: write one signed term per force, then solve.</li><li>x̄ = Σx_iA_i / ΣA_i is a weighted average.</li></ul>
`;

const problems = [
  {
    id: 'm-sig-eval', title: 'Evaluate a sum', kind: 'numeric',
    gen(r) {
      const n = r.int(3, 7), a = r.int(-4, 6) || 2, b = r.int(-9, 9);
      const terms = Array.from({ length: n }, (_, k) => a * (k + 1) + b);
      const total = terms.reduce((s, t) => s + t, 0);
      const expr = `${a === 1 ? '' : a === -1 ? '-' : a}i ${b < 0 ? '-' : '+'} ${Math.abs(b)}`;
      return {
        prompt: String.raw`Evaluate $\displaystyle\sum_{i=1}^{${n}} (${expr})$.`,
        answers: [ans('S', 'S', total, '', { abs: 0.01 })],
        given: { n, a, b },
        hints: ['Plug in i = 1, then i = 2, and so on up to the top number. Write each term down.', 'Then add all the terms together (watch negative ones).'],
        solution: String.raw`<ol class="steps"><li>Terms for $i = 1, \dots, ${n}$: $${terms.join(',\\ ')}$</li><li>Sum $= ${terms.map((t, k) => (k && t >= 0 ? '+' : '') + t).join(' ')} = ${total}$</li></ol>`,
      };
    },
  },
  {
    id: 'm-sig-balance', title: 'Make ΣF_x = 0 and ΣF_y = 0', kind: 'numeric',
    gen(r) {
      const f = [0, 1, 2].map(() => [r.sign() * r.int(1, 40) * 5, r.sign() * r.int(1, 40) * 5]);
      const F4 = [-(f[0][0] + f[1][0] + f[2][0]), -(f[0][1] + f[1][1] + f[2][1])];
      const rows = f.map((v, i) => `<tr><td>$F_${i + 1}$</td><td>$${v[0]}$</td><td>$${v[1]}$</td></tr>`).join('');
      return {
        prompt: String.raw`A particle is in equilibrium under four forces. The components of three of them (in N) are in the table. Find $F_{4x}$ and $F_{4y}$ so that $\sum F_x = 0$ and $\sum F_y = 0$.<table class="tbl"><thead><tr><th>Force</th><th>$F_x$</th><th>$F_y$</th></tr></thead><tbody>${rows}<tr><td>$F_4$</td><td>?</td><td>?</td></tr></tbody></table>`,
        answers: [ans('F4x', 'F_{4x}', F4[0], 'N', { abs: 0.5 }), ans('F4y', 'F_{4y}', F4[1], 'N', { abs: 0.5 })],
        given: { f },
        hints: [String.raw`Write $\sum F_x = F_{1x} + F_{2x} + F_{3x} + F_{4x} = 0$ with the numbers filled in.`, 'Solve for the one unknown. The fourth force cancels the total of the other three.'],
        solution: String.raw`<ol class="steps"><li>$\sum F_x = 0:\ ${f.map((v) => `(${v[0]})`).join(' + ')} + F_{4x} = 0 \Rightarrow F_{4x} = ${F4[0]}\ \text{N}$</li><li>$\sum F_y = 0:\ ${f.map((v) => `(${v[1]})`).join(' + ')} + F_{4y} = 0 \Rightarrow F_{4y} = ${F4[1]}\ \text{N}$</li></ol>`,
      };
    },
  },
  {
    id: 'm-sig-weighted', title: 'Weighted sum: total & location', kind: 'numeric',
    gen(r) {
      const n = r.int(3, 4);
      const xs = r.shuffle([0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 7]).slice(0, n).sort((a, b) => a - b);
      const Fs = xs.map(() => r.int(1, 12));
      const sumF = Fs.reduce((s, v) => s + v, 0), sumxF = xs.reduce((s, x, i) => s + x * Fs[i], 0);
      return {
        prompt: String.raw`Downward loads act on a beam: ${xs.map((x, i) => `$F_${i + 1} = ${Fs[i]}$ kN at $x_${i + 1} = ${x}$ m`).join(', ')}. Find $\sum F_i$ and the location $\bar x = \dfrac{\sum x_iF_i}{\sum F_i}$ of the single equivalent load.`,
        answers: [ans('F', '\\textstyle\\sum F_i', sumF, 'kN', { abs: 0.01 }), ans('xb', '\\bar x', sumxF / sumF, 'm')],
        given: { xs, Fs },
        hints: ['Add the forces for the bottom of the fraction.', String.raw`For the top, multiply each force by its own position, then add: $x_1F_1 + x_2F_2 + \dots$`],
        solution: String.raw`<ol class="steps"><li>$\sum F_i = ${Fs.join(' + ')} = ${sumF}\ \text{kN}$</li><li>$\sum x_iF_i = ${xs.map((x, i) => `${x}(${Fs[i]})`).join(' + ')} = ${fmt(sumxF)}\ \text{kN·m}$</li><li>$\bar x = ${fmt(sumxF)}/${sumF} = ${q(sumxF / sumF, 'm')}$</li></ol>`,
      };
    },
  },
  {
    id: 'm-sig-mc', title: 'Reading Σ notation (concept)', kind: 'mc',
    gen: mcPool([
      { q: String.raw`Which is $\displaystyle\sum_{i=1}^{3} x_i^2$ written out?`, correct: String.raw`$x_1^2 + x_2^2 + x_3^2$`, wrong: [String.raw`$(x_1 + x_2 + x_3)^2$`, String.raw`$3x^2$`, String.raw`$x_1 \cdot x_2 \cdot x_3$`], why: 'Square each term first, then add. Squaring the total is a different (and usually larger) number.' },
      { q: String.raw`In statics, what does $\sum F_y = 0$ tell you to do?`, correct: 'Add the y-components of every force on the free body (with signs) and set the total equal to zero', wrong: ['Multiply all the forces together', 'Set each individual force equal to zero', 'Add the magnitudes of all the forces'], why: 'Σ means add. Equilibrium means the signed y-parts cancel. Individual forces are not zero.' },
      { q: String.raw`What is the $i$ in $\sum_{i=1}^{n} F_i$?`, correct: 'A counter that numbers the forces 1, 2, …, n', wrong: [String.raw`The unit vector $\hat\imath$`, String.raw`The imaginary number $\sqrt{-1}$`, 'A force in the x-direction'], why: 'The index is just a label that steps through the items being added.' },
      { q: String.raw`$F_{3x}$ is best read as…`, correct: '"the x-component of force number 3"', wrong: ['"F times 3 times x"', '"F to the power 3x"', '"the third derivative of F"'], why: 'Subscripts are name tags: which force (3), which component (x).' },
      { q: String.raw`If $\sum_{i=1}^{4} a_i = 10$, what is $\sum_{i=1}^{4} 3a_i$?`, correct: '30', wrong: ['13', '10', '120'], why: 'A constant factor comes out of the sum: Σ 3aᵢ = 3 Σ aᵢ = 30.' },
    ]),
  },
];

module.exports = { key: 'sigma', lesson, problems };
