'use strict';
const { fmt, q, ans, sind, cosd, atand, asind, acosd } = require('../helpers');
const { readMath } = require('../skills');
const { plane } = require('./common');

const norm360 = (a) => ((a % 360) + 360) % 360;
const trueAngle = (x, y) => norm360(Math.atan2(y, x) * 180 / Math.PI);

const lesson = String.raw`
<p class="lead">Your calculator's $\tan^{-1}$ button is right only half the time when forces point left. This lesson shows why, and gives you a four-line routine that always finds the true direction of a vector.</p>

<h2>1. What the inverse functions mean</h2>
${readMath([
  [String.raw`\sin^{-1} x`, '"inverse sine of x" or "arc-sine of x"', 'The angle whose sine is x. The −1 means "inverse", not a power: sin⁻¹x is <em>not</em> 1/sin x.'],
  [String.raw`\tan^{-1}(y/x)`, '"inverse tangent of y over x"', 'The angle whose tangent is y/x.'],
  [String.raw`\operatorname{atan2}(y, x)`, '"a-tan-two of y, x"', 'The inverse tangent with the quadrant fixed, using the signs of x and y separately.'],
], ['invtrig'])}
<p>Each inverse function can only give back <em>one</em> answer, so calculators return an angle from a fixed range:</p>
<table class="tbl"><thead><tr><th>Button</th><th>Always returns an angle between</th></tr></thead><tbody>
<tr><td>$\sin^{-1}$</td><td>$-90^\circ$ and $90^\circ$</td></tr>
<tr><td>$\cos^{-1}$</td><td>$0^\circ$ and $180^\circ$</td></tr>
<tr><td>$\tan^{-1}$</td><td>$-90^\circ$ and $90^\circ$</td></tr></tbody></table>
<p>The trouble: $\tan^{-1}(4/(-3))$ and $\tan^{-1}((-4)/3)$ are the same calculator input ($-1.333$), but the vectors $(-3, 4)$ and $(3, -4)$ point in opposite directions. Dividing $y$ by $x$ throws away the sign information.</p>

<h2>2. Quadrants</h2>
${plane([{ x: 3, y: 2, label: 'I: +x, +y' }, { x: -3, y: 2, label: 'II: −x, +y' }, { x: -3, y: -2, label: 'III' }, { x: 3, y: -2, label: 'IV' }], 22, 110, { aria: 'four quadrants' })}
<p>Angles are measured <strong>counterclockwise (CCW) from the +x axis</strong>. Quadrant I covers 0°–90°, II covers 90°–180°, III covers 180°–270° and IV covers 270°–360°. The signs of the two components tell you the quadrant before you do any math.</p>

<h2>3. The reference-angle routine (atan2 by hand)</h2>
<ol class="steps">
<li>Sketch the vector, or just note the signs of $x$ and $y$, to find its quadrant.</li>
<li>Find the acute <strong>reference angle</strong> with positive numbers: $\alpha = \tan^{-1}\!\big(|y|/|x|\big)$, between 0° and 90°.</li>
<li>Convert: I: $\theta = \alpha$; II: $\theta = 180^\circ - \alpha$; III: $\theta = 180^\circ + \alpha$; IV: $\theta = 360^\circ - \alpha$.</li>
<li>Sanity check: does $\theta$ land in the quadrant from step 1?</li>
</ol>
<div class="example"><h3>Worked example: a force pointing up and to the left</h3>
<p>$\mathbf F = -300\,\hat\imath + 400\,\hat\jmath\ \text{N}$. Find its direction.</p>
<ol class="steps">
<li>$x < 0$, $y > 0$, so it is in quadrant II (between 90° and 180°).</li>
<li>The calculator gives $\tan^{-1}(400/-300) = -53.13^\circ$. That is quadrant IV, so it is <strong>wrong</strong>.</li>
<li>Reference angle: $\alpha = \tan^{-1}(400/300) = 53.13^\circ$.</li>
<li>Quadrant II: $\theta = 180^\circ - 53.13^\circ = 126.87^\circ$ ✓</li>
</ol></div>
<p>The $\operatorname{atan2}(y, x)$ function in spreadsheets and programming languages does exactly this routine for you. The lessons use it as shorthand for "the true angle".</p>

<h2>4. Two more traps</h2>
<ul>
<li><strong>sin⁻¹ can't see obtuse angles.</strong> $\sin 30^\circ = \sin 150^\circ = 0.5$, but $\sin^{-1}(0.5)$ only returns 30°. If the geometry says the angle is obtuse, use $\theta = 180^\circ - \sin^{-1}(\cdot)$.</li>
<li><strong>cos⁻¹ handles 0°–180° correctly.</strong> A negative cosine gives an obtuse angle automatically. That's why the law of cosines (next lesson) is safer than the law of sines for finding angles.</li>
</ul>
<h2>Key takeaways</h2>
<ul class="takeaways"><li>Find the quadrant from the signs first.</li><li>Use the reference angle α = tan⁻¹(|y|/|x|), then convert for the quadrant.</li><li>Be suspicious of a sin⁻¹ answer when the angle could be obtuse.</li></ul>
`;

const nz = (r, a, b) => r.sign() * r.int(a, b);

const problems = [
  {
    id: 'm-inv-atan2', title: 'True angle of a vector', kind: 'numeric',
    gen(r) {
      const x = nz(r, 1, 12) * 10, y = nz(r, 1, 12) * 10;
      const th = trueAngle(x, y);
      return {
        prompt: String.raw`A force has components $F_x = ${q(x, 'N')}$ and $F_y = ${q(y, 'N')}$. Find its direction $\theta$, measured counterclockwise from the +x axis (give a value from 0° to 360°).`,
        svg: plane([{ x: x / 10, y: y / 10, label: 'F', dash: true }], 8, 110),
        answers: [ans('th', '\\theta', th, '°', { abs: 0.5 })],
        given: { x, y },
        hints: ['Look at the signs of the two components first. Which quadrant is the force in?', String.raw`Reference angle $\alpha = \tan^{-1}(|F_y|/|F_x|)$. Then I: $\alpha$, II: $180^\circ-\alpha$, III: $180^\circ+\alpha$, IV: $360^\circ-\alpha$.`],
        solution: (() => {
          const a = atand(Math.abs(y) / Math.abs(x)); const Qd = x > 0 ? (y > 0 ? 'I' : 'IV') : (y > 0 ? 'II' : 'III');
          const conv = { I: String.raw`\theta = \alpha`, II: String.raw`\theta = 180^\circ - \alpha`, III: String.raw`\theta = 180^\circ + \alpha`, IV: String.raw`\theta = 360^\circ - \alpha` }[Qd];
          return String.raw`<ol class="steps"><li>Signs: $F_x ${x > 0 ? '>' : '<'} 0$, $F_y ${y > 0 ? '>' : '<'} 0$, so quadrant ${Qd}.</li><li>$\alpha = \tan^{-1}(${Math.abs(y)}/${Math.abs(x)}) = ${fmt(a)}^\circ$</li><li>$${conv} = ${fmt(th)}^\circ$</li></ol>`;
        })(),
      };
    },
  },
  {
    id: 'm-inv-ref', title: 'Fixing the calculator answer', kind: 'numeric',
    gen(r) {
      const x = -r.int(1, 15) * 20 * (r.next() < 0.75 ? 1 : -1), y = nz(r, 1, 15) * 20;
      const calc = atand(y / x), a = atand(Math.abs(y / x)), th = trueAngle(x, y);
      return {
        prompt: String.raw`For the vector $${fmt(x)}\,\hat\imath ${y < 0 ? '-' : '+'} ${fmt(Math.abs(y))}\,\hat\jmath$, a calculator gives $\tan^{-1}\!\big(\tfrac{${fmt(y)}}{${fmt(x)}}\big) = ${fmt(calc)}^\circ$. Find the acute reference angle $\alpha$ and the true direction $\theta$ (CCW from +x, 0° to 360°).`,
        answers: [ans('a', '\\alpha', a, '°', { abs: 0.5 }), ans('th', '\\theta', th, '°', { abs: 0.5 })],
        given: { x, y },
        hints: ['The reference angle uses positive numbers: α = tan⁻¹(|y|/|x|). It is always between 0° and 90°.', 'Use the signs of x and y to choose the quadrant, then convert α to θ.'],
        solution: String.raw`<ol class="steps"><li>$\alpha = \tan^{-1}(${fmt(Math.abs(y))}/${fmt(Math.abs(x))}) = ${fmt(a)}^\circ$</li><li>Quadrant ${x > 0 ? (y > 0 ? 'I' : 'IV') : (y > 0 ? 'II' : 'III')} (from the signs), so $\theta = ${fmt(th)}^\circ$. The calculator's $${fmt(calc)}^\circ$ ${Math.abs(norm360(calc) - th) < 1e-6 ? 'happens to be right here, since $x > 0$' : 'points the opposite way'}.</li></ol>`,
      };
    },
  },
  {
    id: 'm-inv-quadrant', title: 'Which quadrant? (concept)', kind: 'mc',
    gen(r) {
      const sx = r.sign(), sy = r.sign();
      const Qn = sx > 0 ? (sy > 0 ? 1 : 4) : (sy > 0 ? 2 : 3);
      if (r.next() < 0.5) {
        const ranges = ['between 0° and 90°', 'between 90° and 180°', 'between 180° and 270°', 'between 270° and 360°'];
        return {
          prompt: String.raw`A force has $F_x ${sx > 0 ? '>' : '<'} 0$ and $F_y ${sy > 0 ? '>' : '<'} 0$. Its direction, measured CCW from +x, is…`,
          choices: ranges.map((t, i) => ({ text: t, correct: i === Qn - 1 })),
          hints: ['Sketch it: positive x is right, positive y is up.'],
          solution: String.raw`<p><strong>Answer:</strong> ${ranges[Qn - 1]} (quadrant ${['I', 'II', 'III', 'IV'][Qn - 1]}).</p><p>${sx > 0 ? 'Right' : 'Left'} and ${sy > 0 ? 'up' : 'down'} is quadrant ${['I', 'II', 'III', 'IV'][Qn - 1]}.</p>`,
        };
      }
      const a = r.int(10, 80);
      const calcShown = sx * sy > 0 ? a : -a;
      const opts = [a, 180 - a, 180 + a, 360 - a];
      return {
        prompt: String.raw`A vector has $x ${sx > 0 ? '>' : '<'} 0$ and $y ${sy > 0 ? '>' : '<'} 0$. Your calculator says $\tan^{-1}(y/x) = ${calcShown}^\circ$. What is the true direction, CCW from +x?`,
        choices: opts.map((t, i) => ({ text: `$${t}^\\circ$`, correct: i === Qn - 1 })),
        hints: ['The reference angle is the size of the calculator answer. The signs pick the quadrant.'],
        solution: String.raw`<p><strong>Answer:</strong> $${opts[Qn - 1]}^\circ$.</p><p>Reference angle $\alpha = ${a}^\circ$; quadrant ${['I', 'II', 'III', 'IV'][Qn - 1]} gives $${['\\alpha', '180^\\circ-\\alpha', '180^\\circ+\\alpha', '360^\\circ-\\alpha'][Qn - 1]} = ${opts[Qn - 1]}^\circ$.</p>`,
      };
    },
  },
  {
    id: 'm-inv-obtuse', title: 'Obtuse angles from sin⁻¹ and cos⁻¹', kind: 'numeric',
    gen(r) {
      const th = r.int(95, 170);
      if (r.next() < 0.5) {
        const s = +sind(th).toFixed(4);
        const ans1 = 180 - asind(s);
        return {
          prompt: String.raw`An angle $\theta$ in a triangle is known to be obtuse (more than 90°), and $\sin\theta = ${s}$. Find $\theta$.`,
          answers: [ans('th', '\\theta', ans1, '°', { abs: 0.5 })],
          given: { s, kind: 'sin' },
          hints: [String.raw`$\sin^{-1}$ only returns angles up to 90°.`, String.raw`$\sin\theta = \sin(180^\circ - \theta)$, so the obtuse answer is $180^\circ - \sin^{-1}(${s})$.`],
          solution: String.raw`<ol class="steps"><li>$\sin^{-1}(${s}) = ${fmt(asind(s))}^\circ$ (acute; the calculator's only answer)</li><li>Obtuse partner: $\theta = 180^\circ - ${fmt(asind(s))}^\circ = ${fmt(ans1)}^\circ$</li></ol>`,
        };
      }
      const c = +cosd(th).toFixed(4);
      const t2 = acosd(c);
      return {
        prompt: String.raw`In a triangle, $\cos\theta = ${c}$. Find $\theta$.`,
        answers: [ans('th', '\\theta', t2, '°', { abs: 0.5 })],
        given: { c, kind: 'cos' },
        hints: [String.raw`A negative cosine means the angle is between 90° and 180°.`, String.raw`$\cos^{-1}$ returns 0° to 180°, so it gives the right answer directly here.`],
        solution: String.raw`<ol class="steps"><li>$\theta = \cos^{-1}(${c}) = ${fmt(t2)}^\circ$. The negative cosine already tells you it is obtuse.</li></ol>`,
      };
    },
  },
];

module.exports = { key: 'invtrig', lesson, problems, trueAngle };
