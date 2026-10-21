'use strict';
const { fmt, q, ans, sind, cosd, tand, atand, asind } = require('../helpers');
const { readMath } = require('../skills');
const { rightTri } = require('./common');

const lesson = String.raw`
<p class="lead">Almost every statics problem starts by splitting a slanted force into a horizontal piece and a vertical piece. That is right-triangle trigonometry, and it is the single most-used math skill in this course.</p>

<h2>1. Name the sides relative to the angle</h2>
<p>In a right triangle, pick the angle you care about and call it $\gl{theta}{\theta}$. The three sides get names <em>relative to that angle</em>:</p>
${rightTri({ adj: 'adjacent', opp: 'opposite', hyp: 'hypotenuse', ang: 'θ' }, 200, 120)}
<ul>
<li><strong>Hypotenuse</strong>: the longest side, across from the right angle. It never changes.</li>
<li><strong>Opposite</strong>: the side across from $\theta$ (it doesn't touch $\theta$).</li>
<li><strong>Adjacent</strong>: the side next to $\theta$ that isn't the hypotenuse.</li>
</ul>
<p>If you switch to the <em>other</em> acute angle, "opposite" and "adjacent" swap. This is the source of many component mistakes, so always ask "opposite to <em>which</em> angle?"</p>

<h2>2. SOH-CAH-TOA</h2>
$$\sin\theta = \frac{\text{opp}}{\text{hyp}}\qquad \cos\theta = \frac{\text{adj}}{\text{hyp}}\qquad \tan\theta = \frac{\text{opp}}{\text{adj}}$$
${readMath([
  [String.raw`\sin\theta`, '"sine of theta"', 'A ratio, a plain number between −1 and 1. It is not "sin times θ".'],
  [String.raw`\theta`, '"theta"', 'The Greek letter used as the name of an angle, measured in degrees in this course.'],
  [String.raw`\frac{\text{opp}}{\text{hyp}}`, '"opposite over hypotenuse"', 'Divide the length of the opposite side by the length of the hypotenuse.'],
], ['trig'])}
<p>Rearranged, these give the two lines you will write hundreds of times:</p>
$$\text{opp} = \text{hyp}\,\sin\theta, \qquad \text{adj} = \text{hyp}\,\cos\theta$$
<p>For a force $F$ at angle $\theta$ above the horizontal, the force is the hypotenuse, so its horizontal part is $F\cos\theta$ and its vertical part is $F\sin\theta$.</p>
<div class="tip"><strong>Calculator check:</strong> make sure it is in <strong>degree</strong> mode. $\sin 30^\circ$ should give exactly 0.5. If you get −0.988, you are in radians.</div>

<div class="example"><h3>Worked example 1: a ramp</h3>
<p>A ramp is 4.0 m long and rises at $25^\circ$. How high and how far horizontally does it go?</p>
<ol class="steps">
<li>The ramp is the hypotenuse; the height is opposite the $25^\circ$ angle; the horizontal run is adjacent.</li>
<li>Height: $\text{opp} = 4.0\sin 25^\circ = 4.0(0.4226) = 1.690\ \text{m}$.</li>
<li>Run: $\text{adj} = 4.0\cos 25^\circ = 4.0(0.9063) = 3.625\ \text{m}$.</li>
</ol>
<p class="check">Check with Pythagoras: $\sqrt{1.690^2 + 3.625^2} = 4.00\ \text{m}$ ✓</p></div>

<h2>3. Going backwards: finding the angle</h2>
<p>If you know two sides, the inverse functions give the angle: $\theta = \tan^{-1}(\text{opp}/\text{adj})$, $\theta = \sin^{-1}(\text{opp}/\text{hyp})$ or $\theta = \cos^{-1}(\text{adj}/\text{hyp})$. And Pythagoras gives the missing side: $\text{hyp} = \sqrt{\text{opp}^2 + \text{adj}^2}$.</p>
<div class="example"><h3>Worked example 2: from legs to angle</h3>
<p>A force has a horizontal part of 400 N and a vertical part of 300 N. Find its size and angle.</p>
<ol class="steps">
<li>Size (hypotenuse): $F = \sqrt{400^2 + 300^2} = \sqrt{250\,000} = 500\ \text{N}$.</li>
<li>Angle above horizontal: $\theta = \tan^{-1}(300/400) = \tan^{-1}(0.75) = 36.87^\circ$.</li>
</ol></div>
<p>Inverse trig has some traps when angles go past $90^\circ$. That is the next toolkit lesson.</p>

<h2>Key takeaways</h2>
<ul class="takeaways"><li>Label opposite/adjacent relative to the angle you are using.</li><li>opp = hyp·sin θ, adj = hyp·cos θ.</li><li>θ = tan⁻¹(opp/adj); hyp = √(opp² + adj²).</li><li>Degree mode!</li></ul>
`;

const problems = [
  {
    id: 'm-trig-sides', title: 'Legs from hypotenuse & angle', kind: 'numeric',
    gen(r) {
      const H = r.step(2, 40, 0.5), th = r.int(12, 78);
      const opp = H * sind(th), adj = H * cosd(th);
      return {
        prompt: String.raw`A right triangle has hypotenuse $${q(H, 'm')}$ and an acute angle $\theta = ${th}^\circ$. Find the side opposite $\theta$ and the side adjacent to $\theta$.`,
        svg: rightTri({ adj: 'adj = ?', opp: 'opp = ?', hyp: fmt(H) + ' m', ang: th + '°' }, 200, Math.max(40, Math.min(150, 200 * tand(th)))),
        answers: [ans('opp', '\\text{opp}', opp, 'm'), ans('adj', '\\text{adj}', adj, 'm')],
        given: { H, th },
        hints: ['The hypotenuse is given, so use the two ratios that contain "hyp": sine and cosine.', String.raw`$\text{opp} = \text{hyp}\sin\theta$ and $\text{adj} = \text{hyp}\cos\theta$.`],
        solution: String.raw`<ol class="steps"><li>$\text{opp} = ${fmt(H)}\sin ${th}^\circ = ${q(opp, 'm')}$</li><li>$\text{adj} = ${fmt(H)}\cos ${th}^\circ = ${q(adj, 'm')}$</li></ol><p class="check">Check: $\sqrt{${fmt(opp)}^2 + ${fmt(adj)}^2} = ${fmt(Math.hypot(opp, adj))}$ ✓</p>`,
      };
    },
  },
  {
    id: 'm-trig-legs', title: 'Hypotenuse & angle from two legs', kind: 'numeric',
    gen(r) {
      const a = r.int(2, 30), b = r.int(2, 30);
      const c = Math.hypot(a, b), th = atand(b / a);
      return {
        prompt: String.raw`A force has a horizontal part of $${q(a * 10, 'N')}$ and a vertical part of $${q(b * 10, 'N')}$. Find the size of the force and its angle $\theta$ above the horizontal.`,
        svg: rightTri({ adj: a * 10 + ' N', opp: b * 10 + ' N', hyp: 'F = ?', ang: 'θ = ?' }, 200, Math.max(30, Math.min(150, (200 * b) / a))),
        answers: [ans('F', 'F', c * 10, 'N'), ans('th', '\\theta', th, '°', { abs: 0.5 })],
        given: { a: a * 10, b: b * 10 },
        hints: ['The force is the hypotenuse of the triangle formed by its two parts.', String.raw`$F = \sqrt{\text{adj}^2 + \text{opp}^2}$ and $\theta = \tan^{-1}(\text{opp}/\text{adj})$.`],
        solution: String.raw`<ol class="steps"><li>$F = \sqrt{${a * 10}^2 + ${b * 10}^2} = ${q(c * 10, 'N')}$</li><li>$\theta = \tan^{-1}\!\left(\tfrac{${b * 10}}{${a * 10}}\right) = ${fmt(th)}^\circ$</li></ol>`,
      };
    },
  },
  {
    id: 'm-trig-cable', title: 'Guy wire: height & length', kind: 'numeric',
    gen(r) {
      const d = r.step(2, 20, 0.5), th = r.int(30, 72);
      const h = d * tand(th), L = d / cosd(th);
      return {
        prompt: String.raw`A guy wire is anchored to the ground $${q(d, 'm')}$ from the base of a vertical pole and makes an angle of $${th}^\circ$ with the ground. How high up the pole is it attached, and how long is the wire?`,
        svg: rightTri({ adj: fmt(d) + ' m', opp: 'h = ?', hyp: 'L = ?', ang: th + '°' }, 160, Math.min(150, 160 * tand(th))),
        answers: [ans('h', 'h', h, 'm'), ans('L', 'L', L, 'm')],
        given: { d, th },
        hints: ['The ground distance is adjacent to the angle; the height is opposite; the wire is the hypotenuse.', String.raw`$\tan\theta = h/d$, so $h = d\tan\theta$. And $\cos\theta = d/L$, so $L = d/\cos\theta$.`],
        solution: String.raw`<ol class="steps"><li>$h = d\tan\theta = ${fmt(d)}\tan ${th}^\circ = ${q(h, 'm')}$</li><li>$L = \dfrac{d}{\cos\theta} = \dfrac{${fmt(d)}}{\cos ${th}^\circ} = ${q(L, 'm')}$</li></ol><p class="check">Check: $\sqrt{${fmt(d)}^2 + ${fmt(h)}^2} = ${fmt(Math.hypot(d, h))}$ ✓</p>`,
      };
    },
  },
  {
    id: 'm-trig-mc', title: 'Which ratio is it?', kind: 'mc',
    gen(r) {
      const letters = r.shuffle(['a', 'b', 'c', 'p', 'q', 's']).slice(0, 3);
      const [opp, adj, hyp] = letters;
      const fn = r.pick(['sin', 'cos', 'tan']); const tfn = '\\' + fn;
      const right = { sin: `${opp}/${hyp}`, cos: `${adj}/${hyp}`, tan: `${opp}/${adj}` }[fn];
      const all = [`${opp}/${hyp}`, `${adj}/${hyp}`, `${opp}/${adj}`, `${adj}/${opp}`, `${hyp}/${adj}`];
      const choices = r.shuffle([right, ...r.shuffle(all.filter((x) => x !== right)).slice(0, 3)]).map((t) => ({ text: `$${t.replace('/', '\\,/\\,')}$`, correct: t === right }));
      return {
        prompt: String.raw`In the triangle, side $${opp}$ is across from angle $\theta$, side $${adj}$ touches $\theta$, and $${hyp}$ is the hypotenuse. Which expression equals $${tfn}\theta$?`,
        svg: rightTri({ adj, opp, hyp, ang: 'θ' }, 200, 110),
        choices,
        hints: ['SOH-CAH-TOA: Sine = Opposite/Hypotenuse, Cosine = Adjacent/Hypotenuse, Tangent = Opposite/Adjacent.'],
        solution: String.raw`<p><strong>Answer:</strong> $${tfn}\theta = ${right.replace('/', '\\,/\\,')}$.</p><p>Here $${opp}$ is opposite, $${adj}$ is adjacent and $${hyp}$ is the hypotenuse, so ${fn === 'sin' ? 'sine = opposite/hypotenuse' : fn === 'cos' ? 'cosine = adjacent/hypotenuse' : 'tangent = opposite/adjacent'}.</p>`,
      };
    },
  },
];

module.exports = { key: 'trig', lesson, problems };
