'use strict';
const { fmt, q, ans, sind, cosd, asind, acosd } = require('../helpers');
const { readMath } = require('../skills');
const S = require('../svg');

// General triangle sketch with vertices A (bottom-left), B (bottom-right), C (top); sides a = BC, b = CA, c = AB.
function triSketch(lbl = {}) {
  const A = [40, 160], B = [280, 160], Cp = [190, 40];
  let o = S.poly([A, B, Cp], 'dg-area');
  o += S.text(A[0] - 10, A[1] + 6, 'A', { cls: 'dg-t', anchor: 'end' }) + S.text(B[0] + 10, B[1] + 6, 'B', { cls: 'dg-t', anchor: 'start' }) + S.text(Cp[0], Cp[1] - 12, 'C', { cls: 'dg-t' });
  o += S.text((B[0] + Cp[0]) / 2 + 14, (B[1] + Cp[1]) / 2, lbl.a || 'a', { cls: lbl.ha ? 'dg-tf' : 'dg-td', anchor: 'start' });
  o += S.text((A[0] + Cp[0]) / 2 - 12, (A[1] + Cp[1]) / 2 - 6, lbl.b || 'b', { cls: lbl.hb ? 'dg-tf' : 'dg-td', anchor: 'end' });
  o += S.text((A[0] + B[0]) / 2, A[1] + 16, lbl.c || 'c', { cls: lbl.hc ? 'dg-tf' : 'dg-td' });
  if (lbl.A) o += S.text(A[0] + 34, A[1] - 10, lbl.A, { cls: 'dg-td' });
  if (lbl.B) o += S.text(B[0] - 30, B[1] - 10, lbl.B, { cls: 'dg-td' });
  if (lbl.C) o += S.text(Cp[0], Cp[1] + 24, lbl.C, { cls: 'dg-td' });
  return S.svg(330, 190, o, 'general triangle');
}

const lesson = String.raw`
<p class="lead">Force triangles are often <em>not</em> right triangles. When two forces meet at 70° or 110°, SOH-CAH-TOA alone won't do it. You need two formulas that work for any triangle.</p>

<h2>1. Naming convention</h2>
${triSketch({ A: 'A', B: 'B', C: 'C' })}
<p>Capital letters $A, B, C$ are the <strong>angles</strong> at the three corners. Lowercase letters are the <strong>sides</strong>, and each side is named after the angle <em>across</em> from it: side $a$ is opposite angle $A$, and so on.</p>

<h2>2. Law of cosines</h2>
$$c^2 = a^2 + b^2 - 2ab\cos C$$
${readMath([
  ['c^2', '"c squared"', 'The side you want, squared. Take the square root at the end.'],
  ['2ab\\cos C', '"two a b cosine C"', 'A correction term. If C = 90°, cos C = 0 and this is just Pythagoras.'],
], ['lawsc'])}
<p>Use it when you know <strong>two sides and the angle between them</strong> (to find the third side), or <strong>all three sides</strong> (to find an angle):</p>
$$\cos C = \frac{a^2 + b^2 - c^2}{2ab}$$
<p>Because $\cos^{-1}$ returns angles from 0° to 180°, this version finds obtuse angles correctly.</p>

<h2>3. Law of sines</h2>
$$\frac{a}{\sin A} = \frac{b}{\sin B} = \frac{c}{\sin C}$$
<p>Read it as "each side divided by the sine of its opposite angle gives the same number". Use it when you know <strong>a side and its opposite angle</strong> plus one more piece. Remember that the three angles add to $180^\circ$.</p>
<div class="tip">If you use the law of sines to find an <em>angle</em>, watch for the obtuse trap from the inverse-trig lesson. When in doubt, find angles with the law of cosines.</div>

<h2>4. The statics use: adding two forces</h2>
<p>Two forces $F_1$ and $F_2$ act at the same point with angle $\varphi$ between them. Placing them tip-to-tail makes a triangle whose interior angle is $180^\circ - \varphi$. Since $\cos(180^\circ - \varphi) = -\cos\varphi$:</p>
$$R^2 = F_1^2 + F_2^2 + 2F_1F_2\cos\varphi$$
<div class="example"><h3>Worked example: resultant of 300 N and 500 N at 60°</h3>
<ol class="steps">
<li>$R^2 = 300^2 + 500^2 + 2(300)(500)\cos 60^\circ = 90\,000 + 250\,000 + 150\,000 = 490\,000$, so $R = 700\ \text{N}$.</li>
<li>Angle $\beta$ between $R$ and $F_1$ (law of sines in the force triangle, where the angle opposite $R$ is $120^\circ$): $\dfrac{\sin\beta}{500} = \dfrac{\sin 120^\circ}{700}$, so $\beta = \sin^{-1}(0.6186) = 38.2^\circ$.</li>
</ol>
<p class="check">Check: $\beta$ is less than 60°, so $R$ lies between the two forces, closer to the larger one. ✓</p></div>
<h2>Key takeaways</h2>
<ul class="takeaways"><li>Two sides + included angle, or three sides: law of cosines.</li><li>A side with its opposite angle: law of sines.</li><li>Resultant of two forces φ apart: R² = F₁² + F₂² + 2F₁F₂cos φ.</li></ul>
`;

const problems = [
  {
    id: 'm-lsc-cos-side', title: 'Third side (law of cosines)', kind: 'numeric',
    gen(r) {
      const a = r.step(2, 20, 0.5), b = r.step(2, 20, 0.5), C = r.int(25, 150);
      const c = Math.sqrt(a * a + b * b - 2 * a * b * cosd(C));
      return {
        prompt: String.raw`In a triangle, $a = ${q(a, 'm')}$, $b = ${q(b, 'm')}$ and the angle between them is $C = ${C}^\circ$. Find side $c$.`,
        svg: triSketch({ a: `a = ${fmt(a)}`, b: `b = ${fmt(b)}`, c: 'c = ?', hc: true, C: `${C}°` }),
        answers: [ans('c', 'c', c, 'm')],
        given: { a, b, C },
        hints: ['You know two sides and the angle between them, so use the law of cosines.', String.raw`$c^2 = a^2 + b^2 - 2ab\cos C$`],
        solution: String.raw`<ol class="steps"><li>$c^2 = ${fmt(a)}^2 + ${fmt(b)}^2 - 2(${fmt(a)})(${fmt(b)})\cos ${C}^\circ = ${fmt(c * c)}$</li><li>$c = ${q(c, 'm')}$</li></ol>`,
      };
    },
  },
  {
    id: 'm-lsc-cos-angle', title: 'Angle from three sides', kind: 'numeric',
    gen(r) {
      let a, b, c;
      do { a = r.int(3, 20); b = r.int(3, 20); c = r.int(3, 20); } while (a + b <= c + 1 || a + c <= b + 1 || b + c <= a + 1);
      const C = acosd((a * a + b * b - c * c) / (2 * a * b));
      return {
        prompt: String.raw`A triangle has sides $a = ${a}$, $b = ${b}$ and $c = ${c}$ (all in m). Find the angle $C$ opposite side $c$.`,
        svg: triSketch({ a: `a = ${a}`, b: `b = ${b}`, c: `c = ${c}`, C: 'C = ?' }),
        answers: [ans('C', 'C', C, '°', { abs: 0.5 })],
        given: { a, b, c },
        hints: ['With all three sides known, rearrange the law of cosines for the angle.', String.raw`$\cos C = \dfrac{a^2 + b^2 - c^2}{2ab}$, then take $\cos^{-1}$.`],
        solution: String.raw`<ol class="steps"><li>$\cos C = \dfrac{${a}^2 + ${b}^2 - ${c}^2}{2(${a})(${b})} = ${fmt((a * a + b * b - c * c) / (2 * a * b))}$</li><li>$C = \cos^{-1}(${fmt((a * a + b * b - c * c) / (2 * a * b))}) = ${fmt(C)}^\circ$${C > 90 ? ' (obtuse, since the cosine is negative)' : ''}</li></ol>`,
      };
    },
  },
  {
    id: 'm-lsc-sin', title: 'Sides from the law of sines', kind: 'numeric',
    gen(r) {
      const A = r.int(25, 80), B = r.int(25, 80), a = r.step(3, 30, 0.5);
      const C = 180 - A - B;
      const k = a / sind(A), b = k * sind(B), c = k * sind(C);
      return {
        prompt: String.raw`A triangle has angles $A = ${A}^\circ$ and $B = ${B}^\circ$, and the side opposite $A$ is $a = ${q(a, 'm')}$. Find sides $b$ and $c$.`,
        svg: triSketch({ a: `a = ${fmt(a)}`, b: 'b = ?', c: 'c = ?', A: `${A}°`, B: `${B}°` }),
        answers: [ans('b', 'b', b, 'm'), ans('c', 'c', c, 'm')],
        given: { A, B, a },
        hints: ['Angles in a triangle add to 180°. Find C first.', String.raw`$\dfrac{a}{\sin A} = \dfrac{b}{\sin B} = \dfrac{c}{\sin C}$, so $b = a\,\dfrac{\sin B}{\sin A}$.`],
        solution: String.raw`<ol class="steps"><li>$C = 180^\circ - ${A}^\circ - ${B}^\circ = ${C}^\circ$</li><li>$\dfrac{a}{\sin A} = \dfrac{${fmt(a)}}{\sin ${A}^\circ} = ${fmt(k)}$</li><li>$b = ${fmt(k)}\sin ${B}^\circ = ${q(b, 'm')}$, $c = ${fmt(k)}\sin ${C}^\circ = ${q(c, 'm')}$</li></ol>`,
      };
    },
  },
  {
    id: 'm-lsc-resultant', title: 'Resultant of two forces (parallelogram)', kind: 'numeric',
    gen(r) {
      const F1 = r.step(100, 900, 25), F2 = r.step(100, 900, 25), phi = r.int(20, 160);
      const R = Math.sqrt(F1 * F1 + F2 * F2 + 2 * F1 * F2 * cosd(phi));
      const beta = Math.atan2(F2 * sind(phi), F1 + F2 * cosd(phi)) * 180 / Math.PI;
      const sc = 90 / Math.max(F1, F2);
      const svg = S.svg(300, 200, S.arrow(70, 150, 70 + F1 * sc, 150, { label: 'F₁', lx: 70 + F1 * sc + 14, ly: 150 }) +
        S.arrow(70, 150, 70 + F2 * sc * cosd(phi), 150 - F2 * sc * sind(phi), { label: 'F₂', lx: 70 + F2 * sc * cosd(phi) * 1.15, ly: 150 - F2 * sc * sind(phi) * 1.15 }) + S.arc(70, 150, 26, 0, phi, 'φ'), 'two forces');
      return {
        prompt: String.raw`Forces $F_1 = ${q(F1, 'N')}$ and $F_2 = ${q(F2, 'N')}$ act at the same point with an angle $\varphi = ${phi}^\circ$ between them. Find the magnitude of the resultant $R$ and the angle $\beta$ between $R$ and $F_1$.`,
        svg,
        answers: [ans('R', 'R', R, 'N'), ans('beta', '\\beta', beta, '°', { abs: 0.5 })],
        given: { F1, F2, phi },
        hints: [String.raw`Tip-to-tail, the interior angle of the force triangle is $180^\circ - \varphi$, which gives $R^2 = F_1^2 + F_2^2 + 2F_1F_2\cos\varphi$.`, String.raw`Then use the law of sines: $\sin\beta / F_2 = \sin(180^\circ-\varphi)/R$. ${beta > 90 ? 'Careful: here β turns out obtuse.' : ''}`],
        solution: String.raw`<ol class="steps"><li>$R^2 = ${fmt(F1)}^2 + ${fmt(F2)}^2 + 2(${fmt(F1)})(${fmt(F2)})\cos ${phi}^\circ$, so $R = ${q(R, 'N')}$</li><li>$\sin\beta = \dfrac{F_2\sin(${180 - phi}^\circ)}{R} = ${fmt(F2 * sind(phi) / R)}$, so $\beta = ${fmt(beta)}^\circ$${beta > 90 ? ' (the obtuse solution; check with components)' : ''}</li></ol>`,
      };
    },
  },
];

module.exports = { key: 'lawsc', lesson, problems };
