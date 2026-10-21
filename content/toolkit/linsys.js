'use strict';
const { fmt, q, ans, mcPool, sind, cosd } = require('../helpers');
const { readMath } = require('../skills');

const term = (c, v, first) => { if (c === 0) return ''; const s = c < 0 ? '-' : first ? '' : '+'; const m = Math.abs(c) === 1 ? '' : Math.abs(c); return `${first ? s : ' ' + s + ' '}${m}${v}`; };
const eq = (cs, vs, rhs) => { let s = ''; cs.forEach((c, i) => { const t = term(c, vs[i], s === ''); s += t; }); return `${s} = ${rhs}`; };
function det3(M) { return M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]); }

const lesson = String.raw`
<p class="lead">Each free-body diagram gives you equations, and those equations usually share unknowns. Solving two or three equations together is the algebra engine of statics. You learned it in Algebra II. This lesson sharpens it for the kinds of systems statics produces.</p>

<h2>1. What a system is</h2>
<p>Two unknowns need two independent equations; three unknowns need three. In 2D statics you get exactly three equations per body: $\sum F_x = 0$, $\sum F_y = 0$ and $\sum M = 0$. So one 2D body can have at most three unknowns.</p>
${readMath([
  [String.raw`\Rightarrow`, '"which gives" or "so"', 'The result on the right follows from the step on the left.'],
  [String.raw`T_1,\ T_2`, '"T one, T two"', 'Two different unknowns (say, two cable tensions). The subscripts are labels.'],
], ['linsys'])}

<h2>2. Substitution</h2>
<p>Solve one equation for one unknown, then plug it into the other. This is best when one equation is simple, which happens often in statics.</p>
<div class="example"><h3>Worked example 1: two cables (a real Unit 2 system)</h3>
<p>$T_1\cos30^\circ = T_2\cos45^\circ$ and $T_1\sin30^\circ + T_2\sin45^\circ = 100$.</p>
<ol class="steps">
<li>From the first equation: $T_1 = T_2\,\dfrac{\cos45^\circ}{\cos30^\circ} = 0.8165\,T_2$.</li>
<li>Substitute: $0.8165\,T_2(0.5) + 0.7071\,T_2 = 100 \Rightarrow 1.1154\,T_2 = 100 \Rightarrow T_2 = 89.66$.</li>
<li>Back-substitute: $T_1 = 0.8165(89.66) = 73.20$.</li>
</ol>
<p class="check">Check in equation 2: $73.20(0.5) + 89.66(0.7071) = 100.0$ ✓</p></div>

<h2>3. Elimination</h2>
<p>Scale the equations so that adding or subtracting them cancels an unknown. For 3×3 systems, eliminate the same unknown from two different pairs to get a 2×2 system, solve that, then back-substitute.</p>
<div class="example"><h3>Worked example 2: a 3×3 system</h3>
<p>$x + y + z = 6,\quad 2x - y + z = 3,\quad x + 2y - z = 2$</p>
<ol class="steps">
<li>Add equations 1 and 3 (the $z$'s cancel): $2x + 3y = 8$.</li>
<li>Add equations 2 and 3: $3x + y = 5$.</li>
<li>From the second: $y = 5 - 3x$. Then $2x + 3(5 - 3x) = 8 \Rightarrow -7x = -7 \Rightarrow x = 1$, $y = 2$.</li>
<li>Back into equation 1: $z = 6 - 1 - 2 = 3$.</li>
</ol></div>

<h2>4. The statics shortcut: pick equations with one unknown</h2>
<p>In statics you choose <em>where</em> to take moments. Summing moments about a point where two unknown forces act removes both from that equation, leaving an equation with a single unknown. Good engineers set up systems so they barely need elimination at all. You will practice this from Unit 5 on.</p>
<div class="tip"><strong>Always check:</strong> plug your answers back into an equation you didn't use last. It takes 20 seconds and catches most algebra slips.</div>
<h2>Key takeaways</h2>
<ul class="takeaways"><li>n unknowns need n independent equations.</li><li>Substitution if one equation is simple, elimination otherwise.</li><li>Reduce 3×3 to 2×2 by eliminating one unknown twice.</li><li>Check by back-substituting.</li></ul>
`;

const nz = (r, a, b) => r.sign() * r.int(a, b);

const problems = [
  {
    id: 'm-lin-2x2', title: 'Solve a 2×2 system', kind: 'numeric',
    gen(r) {
      let a, b, c, d;
      do { a = nz(r, 1, 6); b = nz(r, 1, 6); c = nz(r, 1, 6); d = nz(r, 1, 6); } while (a * d - b * c === 0);
      const x = nz(r, 1, 9), y = nz(r, 1, 9);
      const e = a * x + b * y, f = c * x + d * y;
      return {
        prompt: String.raw`Solve for $x$ and $y$: $\quad ${eq([a, b], ['x', 'y'], e)}, \qquad ${eq([c, d], ['x', 'y'], f)}$`,
        answers: [ans('x', 'x', x, '', { abs: 0.01 }), ans('y', 'y', y, '', { abs: 0.01 })],
        given: { M: [[a, b], [c, d]], rhs: [e, f] },
        hints: ['Elimination: multiply the equations so that one unknown has matching (or opposite) coefficients, then subtract (or add).', 'After finding one unknown, substitute it back into either equation.'],
        solution: String.raw`<ol class="steps"><li>Multiply eq. 1 by ${c} and eq. 2 by ${a}, then subtract to remove $x$: $(${b}\cdot${c} - ${d}\cdot${a})\,y = ${e}\cdot${c} - ${f}\cdot${a}$</li><li>$${b * c - d * a}\,y = ${e * c - f * a} \Rightarrow y = ${y}$</li><li>Back-substitute: $${a}x = ${e} - (${b})(${y}) \Rightarrow x = ${x}$</li></ol>`,
      };
    },
  },
  {
    id: 'm-lin-3x3', title: 'Solve a 3×3 system', kind: 'numeric',
    gen(r) {
      let M;
      do { M = [0, 1, 2].map(() => [r.int(-3, 3), r.int(-3, 3), r.int(-3, 3)]); } while (Math.abs(det3(M)) < 2 || M.some((row) => row.every((v) => v === 0)));
      const sol = [nz(r, 1, 6), nz(r, 1, 6), nz(r, 1, 6)];
      const rhs = M.map((row) => row[0] * sol[0] + row[1] * sol[1] + row[2] * sol[2]);
      return {
        prompt: String.raw`Solve for $x$, $y$ and $z$: $$\begin{aligned} ${M.map((row, i) => eq(row, ['x', 'y', 'z'], rhs[i]).replace('=', '&=')).join('\\\\ ')} \end{aligned}$$`,
        answers: [ans('x', 'x', sol[0], '', { abs: 0.01 }), ans('y', 'y', sol[1], '', { abs: 0.01 }), ans('z', 'z', sol[2], '', { abs: 0.01 })],
        given: { M, rhs },
        hints: ['Pick one unknown and eliminate it from two different pairs of equations. That leaves a 2×2 system.', 'Solve the 2×2, then substitute back to get the third unknown. Check in the equation you used least.'],
        solution: String.raw`<p>Eliminating one unknown from two pairs of equations and solving the resulting 2×2 system gives:</p><ol class="steps"><li>$x = ${sol[0]},\ y = ${sol[1]},\ z = ${sol[2]}$</li><li>Check, equation 1: $${M[0][0]}(${sol[0]}) + ${M[0][1]}(${sol[1]}) + ${M[0][2]}(${sol[2]}) = ${rhs[0]}$ ✓</li></ol>`,
      };
    },
  },
  {
    id: 'm-lin-lever', title: 'Two unknown supports (moment trick)', kind: 'numeric',
    gen(r) {
      const L = r.step(2, 10, 0.5), W = r.step(1, 30, 0.5), a = +(L * r.int(1, 9) / 10).toFixed(2);
      const B = (W * a) / L, A = W - B;
      return {
        prompt: String.raw`A plank of length $${q(L, 'm')}$ rests on supports at its two ends, A (at $x = 0$) and B (at $x = ${fmt(L)}$ m). A load $W = ${q(W, 'kN')}$ sits at $x = ${fmt(a)}$ m. The upward support forces satisfy $A + B = W$ and (moments about A) $B\cdot${fmt(L)} = W\cdot${fmt(a)}$. Find $A$ and $B$.`,
        answers: [ans('A', 'A', A, 'kN'), ans('B', 'B', B, 'kN')],
        given: { L, W, a },
        hints: ['The moment equation has only one unknown. Solve it first.', 'Then the force equation gives the other one.'],
        solution: String.raw`<ol class="steps"><li>$B = \dfrac{W a}{L} = \dfrac{${fmt(W)}(${fmt(a)})}{${fmt(L)}} = ${q(B, 'kN')}$</li><li>$A = W - B = ${q(A, 'kN')}$</li></ol>`,
      };
    },
  },
  {
    id: 'm-lin-cables', title: 'Decimal system (two tensions)', kind: 'numeric',
    gen(r) {
      const al = r.int(15, 70), be = r.int(15, 70), W = r.step(50, 1500, 10);
      const det = cosd(al) * sind(be) + sind(al) * cosd(be);
      const T1 = (W * cosd(be)) / det, T2 = (W * cosd(al)) / det;
      const c1 = cosd(al).toFixed(4), s1 = sind(al).toFixed(4), c2 = cosd(be).toFixed(4), s2 = sind(be).toFixed(4);
      return {
        prompt: String.raw`Solve for $T_1$ and $T_2$ (in N): $$${c1}\,T_1 - ${c2}\,T_2 = 0, \qquad ${s1}\,T_1 + ${s2}\,T_2 = ${fmt(W)}$$`,
        answers: [ans('T1', 'T_1', T1, 'N'), ans('T2', 'T_2', T2, 'N')],
        given: { al, be, W },
        hints: [String.raw`The first equation gives $T_1$ in terms of $T_2$: $T_1 = (${c2}/${c1})\,T_2$.`, 'Substitute into the second equation, solve for T₂, then back-substitute.'],
        solution: String.raw`<ol class="steps"><li>$T_1 = ${fmt(+c2 / +c1)}\,T_2$</li><li>$${s1}(${fmt(+c2 / +c1)})\,T_2 + ${s2}\,T_2 = ${fmt(W)} \Rightarrow ${fmt((+s1 * +c2) / +c1 + +s2)}\,T_2 = ${fmt(W)} \Rightarrow T_2 = ${q(T2, 'N')}$</li><li>$T_1 = ${q(T1, 'N')}$</li></ol>`,
      };
    },
  },
  {
    id: 'm-lin-mc', title: 'Systems of equations (concept)', kind: 'mc',
    gen: mcPool([
      { q: 'A 2D free-body diagram of one rigid body has 4 unknown forces. What can you conclude?', correct: 'You cannot find all four from that body alone. It gives only 3 independent equations.', wrong: ['You can find them with ΣF_x, ΣF_y, ΣM and ΣF_total', 'Two of them must be zero', 'Any 4 equations will do, such as moments about 4 points'], why: 'Extra moment equations are not independent of the first three. You need another body or another relation.' },
      { q: String.raw`What happens with $2x + 4y = 6$ and $x + 2y = 3$?`, correct: 'Infinitely many solutions: they are the same equation', wrong: ['Exactly one solution', 'No solution', 'x = 1, y = 1 is the only answer'], why: 'The first equation is twice the second, so there is really only one equation in two unknowns.' },
      { q: 'You have three equilibrium equations and three unknowns. Which equation is usually best to solve first?', correct: 'One that contains only one unknown (often a moment equation about a clever point)', wrong: ['Always ΣF_x first', 'The longest equation', 'It never matters; always use elimination on all three'], why: 'An equation with one unknown solves immediately, and the rest then simplify.' },
      { q: String.raw`You solve and get $T_1 = 73.2$ N and $T_2 = 89.7$ N. What is the best way to check?`, correct: 'Plug both values back into the original equations', wrong: ['Check that T₁ + T₂ equals the weight', 'Re-solve with the same steps', 'Make sure both are less than 100'], why: 'Back-substitution into the original equations is the only check that catches every algebra mistake.' },
    ]),
  },
];

module.exports = { key: 'linsys', lesson, problems, det3 };
