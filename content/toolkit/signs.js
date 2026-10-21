'use strict';
const { fmt, q, ans, mcPool, sind, cosd } = require('../helpers');
const { readMath } = require('../skills');
const S = require('../svg');

const lesson = String.raw`
<p class="lead">Statics answers are full of minus signs, and each one means something. Get the conventions straight once, and a negative answer becomes useful information instead of a mystery.</p>

<h2>1. Pick axes, then never argue with them</h2>
<p>The default is <strong>+x to the right and +y up</strong> (and +z out of the page, toward you). Any component pointing the opposite way gets a minus sign, whatever the problem calls the force.</p>
${readMath([
  [String.raw`F_x = -F\cos\theta`, '"F-x equals minus F cosine theta"', 'The size is F cos θ; the minus says it points in −x (left).'],
  [String.raw`+\curvearrowleft`, '"counterclockwise positive"', 'For moments, counterclockwise (CCW) turning counts as positive and clockwise (CW) as negative.'],
], ['signs'])}
<div class="example"><h3>Worked example 1: components with signs from a sketch</h3>
<p>A 500 N force points down and to the left, 30° below the horizontal.</p>
<ol class="steps">
<li>Sizes from trig: horizontal part $500\cos30^\circ = 433.0$ N, vertical part $500\sin30^\circ = 250.0$ N.</li>
<li>Signs from the picture: left means $-x$, down means $-y$.</li>
<li>$F_x = -433.0$ N, $F_y = -250.0$ N. (Same answer as $F\cos210^\circ$, $F\sin210^\circ$ with the standard angle.)</li>
</ol></div>

<h2>2. Moments: counterclockwise is positive</h2>
${S.svg(300, 140, S.beam(40, 260, 80) + S.node(150, 80, 5) + S.text(150, 104, 'O', { cls: 'dg-t' }) + S.arrow(230, 30, 230, 74, { label: 'F (down, right of O) → CW, −', lx: 230, ly: 18 }) + S.arrow(70, 30, 70, 74, { label: 'down, left of O → CCW, +', lx: 70, ly: 18, cls: 'dg-w', tcls: 'dg-td' }), 'moment signs')}
<p>To find the sign of a force's moment about a point O, imagine O is a pin and ask which way the force would spin the body. A downward force to the <em>right</em> of O turns it clockwise (negative). The same force to the <em>left</em> of O turns it counterclockwise (positive). The formula $M_O = xF_y - yF_x$ (cross-product lesson) produces these signs automatically.</p>

<h2>3. Tilted axes</h2>
<p>On a ramp it is often smarter to tilt the axes: $x$ along the slope and $y$ perpendicular to it. Then the normal force and friction each lie on one axis, and only the weight has to be split. For a ramp at angle $\theta$, weight $W$ has a part $W\sin\theta$ along the slope (pointing downhill) and a part $W\cos\theta$ into the slope.</p>
<div class="example"><h3>Worked example 2</h3>
<p>A 200 N box sits on a 25° ramp. Take +x <em>up</em> the slope and +y perpendicular, out of the surface.</p>
<ol class="steps"><li>$W_x = -200\sin25^\circ = -84.52$ N (gravity pulls downhill, which is −x)</li><li>$W_y = -200\cos25^\circ = -181.3$ N (into the ramp, which is −y)</li></ol></div>

<h2>4. A negative answer means "the other way"</h2>
<p>When you don't know which way a support force points, <strong>guess</strong>, draw it that way and solve. If the answer comes out negative, the force is the same size but points opposite to your guess. You don't need to redraw anything. For truss members the convention is to assume tension; a negative member force then means <strong>compression</strong>.</p>
<h2>Key takeaways</h2>
<ul class="takeaways"><li>Size from trig, sign from the picture and your axes.</li><li>CCW moments are +, CW are −.</li><li>Tilted axes: W sin θ along the slope, W cos θ into it.</li><li>Negative result = opposite to the assumed direction.</li></ul>
`;

const problems = [
  {
    id: 'm-sgn-comp', title: 'Signed components from a description', kind: 'numeric',
    gen(r) {
      const F = r.step(50, 1200, 10), a = r.int(10, 80);
      const left = r.next() < 0.5, down = r.next() < 0.5, fromVert = r.next() < 0.3;
      const hx = fromVert ? F * sind(a) : F * cosd(a), hy = fromVert ? F * cosd(a) : F * sind(a);
      const Fx = left ? -hx : hx, Fy = down ? -hy : hy;
      const fh = fromVert ? '\\sin' : '\\cos', fv = fromVert ? '\\cos' : '\\sin';
      const desc = fromVert ? `${a}° from the vertical, pointing ${down ? 'down' : 'up'} and to the ${left ? 'left' : 'right'}` : `${a}° ${down ? 'below' : 'above'} the horizontal, pointing to the ${left ? 'left' : 'right'}`;
      return {
        prompt: String.raw`A force of $${q(F, 'N')}$ acts ${desc}. With +x to the right and +y up, find $F_x$ and $F_y$ (include signs).`,
        answers: [ans('Fx', 'F_x', Fx, 'N'), ans('Fy', 'F_y', Fy, 'N')],
        given: { F, a, left, down, fromVert },
        hints: [fromVert ? 'The angle is measured from the vertical, so the vertical part uses cosine and the horizontal part uses sine.' : 'The angle is measured from the horizontal, so the horizontal part uses cosine.', 'Find the two sizes, then attach the signs from the direction words (left = −x, down = −y).'],
        solution: String.raw`<ol class="steps"><li>Horizontal size: $${fmt(F)}${fh} ${a}^\circ = ${fmt(hx)}$ N; vertical size: $${fmt(F)}${fv} ${a}^\circ = ${fmt(hy)}$ N</li><li>Signs (${left ? 'left' : 'right'}, ${down ? 'down' : 'up'}): $F_x = ${q(Fx, 'N')}$, $F_y = ${q(Fy, 'N')}$</li></ol>`,
      };
    },
  },
  {
    id: 'm-sgn-moment', title: 'Net moment with CCW positive', kind: 'numeric',
    gen(r) {
      const fs = [0, 1, 2].map(() => ({ F: r.step(10, 200, 5), x: r.sign() * r.step(0.5, 3, 0.5), up: r.next() < 0.5 }));
      const terms = fs.map((f) => (f.up ? 1 : -1) * f.F * f.x);
      const M = terms.reduce((s, t) => s + t, 0);
      if (Math.abs(M) < 1) fs[0].F += 5;
      const M2 = fs.reduce((s, f) => s + (f.up ? 1 : -1) * f.F * f.x, 0);
      const svgBody = S.beam(30, 330, 90) + S.node(180, 90, 5) + S.text(180, 114, 'O', { cls: 'dg-t' }) +
        fs.map((f) => { const px = 180 + f.x * 45; return f.up ? S.arrow(px, 140, px, 96, { label: `${f.F} N`, lx: px, ly: 152 }) : S.arrow(px, 40, px, 84, { label: `${f.F} N`, lx: px, ly: 28 }); }).join('');
      return {
        prompt: String.raw`Three vertical forces act on a bar. Positions are measured from point O (+ to the right): ${fs.map((f) => `$${f.F}$ N ${f.up ? 'up' : 'down'} at $x = ${fmt(f.x)}$ m`).join('; ')}. Find the net moment about O (counterclockwise positive).`,
        svg: S.svg(360, 170, svgBody, 'forces on a bar'),
        answers: [ans('M', 'M_O', M2, 'N·m')],
        given: { fs },
        hints: ['For a vertical force, the moment arm is just |x|. Decide CW or CCW for each force, one at a time.', String.raw`Or use $M = xF_y$ with signs: up is $+F_y$, and left of O is negative $x$.`],
        solution: String.raw`<ol class="steps">${fs.map((f) => `<li>$${fmt(f.x)}\\times(${f.up ? '+' : '-'}${f.F}) = ${fmt((f.up ? 1 : -1) * f.F * f.x)}$ N·m (${(f.up ? 1 : -1) * f.x > 0 ? 'CCW' : 'CW'})</li>`).join('')}<li>$M_O = ${q(M2, 'N·m')}$</li></ol>`,
      };
    },
  },
  {
    id: 'm-sgn-incline', title: 'Weight components on tilted axes', kind: 'numeric',
    gen(r) {
      const W = r.step(20, 2000, 10), th = r.int(8, 60), upSlope = r.next() < 0.5;
      const Wx = (upSlope ? -1 : 1) * W * sind(th), Wy = -W * cosd(th);
      return {
        prompt: String.raw`A crate weighing $${q(W, 'N')}$ rests on a ramp inclined at $${th}^\circ$. Take +x pointing ${upSlope ? 'up' : 'down'} the slope and +y perpendicular to the ramp, away from its surface. Find the weight's components $W_x$ and $W_y$.`,
        answers: [ans('Wx', 'W_x', Wx, 'N'), ans('Wy', 'W_y', Wy, 'N')],
        given: { W, th, upSlope },
        hints: ['The part along the slope is W sin θ, pointing downhill. The part perpendicular to the slope is W cos θ, pointing into the ramp.', `Now attach signs: +x points ${upSlope ? 'uphill' : 'downhill'}, and +y points out of the surface.`],
        solution: String.raw`<ol class="steps"><li>Along the slope: $W\sin${th}^\circ = ${fmt(W * sind(th))}$ N downhill, so $W_x = ${q(Wx, 'N')}$</li><li>Into the ramp: $W\cos${th}^\circ = ${fmt(W * cosd(th))}$ N, opposite to +y, so $W_y = ${q(Wy, 'N')}$</li></ol>`,
      };
    },
  },
  {
    id: 'm-sgn-mc', title: 'What does the sign mean? (concept)', kind: 'mc',
    gen: mcPool([
      { q: 'You drew the reaction at support A pointing left, solved, and got $A_x = -250$ N. What does that mean?', correct: 'A pushes to the right with 250 N; your guess was backwards', wrong: ['You made an algebra mistake and must start over', 'The support is pulling left with 250 N', 'The reaction is zero'], why: 'A negative result keeps its size and reverses the assumed direction. No redrawing is needed.' },
      { q: 'With the "assume tension" convention, a truss member force comes out as −18 kN. The member is…', correct: 'In compression, 18 kN', wrong: ['In tension, 18 kN', 'A zero-force member', 'Overloaded and failing'], why: 'Tension is positive by convention, so a negative value means the member pushes: compression.' },
      { q: 'A clockwise moment of 40 N·m, with counterclockwise taken as positive, is written as…', correct: String.raw`$M = -40$ N·m`, wrong: [String.raw`$M = +40$ N·m`, String.raw`$M = 40^\circ$`, 'It depends on the units'], why: 'CW is the negative direction under the CCW-positive convention.' },
      { q: 'You redo a problem with +y pointing down instead of up. What happens to the answers?', correct: 'The physical forces are the same; only the signs of y-components flip', wrong: ['All the magnitudes change', 'The problem becomes unsolvable', 'Nothing changes, not even signs'], why: 'Axes are a bookkeeping choice. Reality stays the same; the signs follow your axes.' },
    ]),
  },
];

module.exports = { key: 'signs', lesson, problems };
