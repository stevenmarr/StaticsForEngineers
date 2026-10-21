'use strict';
const { readMath: RM } = require('../skills');
const { fmt, q, ans, mcPool, sind, cosd, atan2d, acosd, G } = require('../helpers');
const S = require('../svg');

// Draw a force arrow from the origin at angle th (deg, CCW from +x).
function forceAt(cx, cy, len, th, label) {
  const x2 = cx + len * cosd(th), y2 = cy - len * sind(th);
  return S.arrow(cx, cy, x2, y2, { label, lx: cx + (len + 16) * cosd(th), ly: cy - (len + 16) * sind(th) });
}
function axesBig(cx, cy, L) {
  return S.line(cx - L, cy, cx + L, cy, 'dg-ax') + S.line(cx, cy + L, cx, cy - L, 'dg-ax') + S.text(cx + L + 8, cy, 'x', { cls: 'dg-td' }) + S.text(cx, cy - L - 8, 'y', { cls: 'dg-td' });
}

const lesson = String.raw`
<h2>Why this unit matters</h2>
<p>Statics is the study of things that <em>don't move</em>: bridges, cranes, bike frames, the bracket holding up a TV. To design them you need to know every force acting on them, and forces are <strong>vectors</strong>, so they have a size (magnitude) <em>and</em> a direction. This unit gives you the toolkit you will use in every other unit: units, breaking forces into components, and adding forces together.</p>

<h2>1. Units: SI and US customary</h2>
<p>Engineering numbers mean nothing without units. The two systems you will see:</p>
<table class="tbl"><thead><tr><th>Quantity</th><th>SI</th><th>US customary</th></tr></thead><tbody>
<tr><td>Length</td><td>meter (m)</td><td>foot (ft), inch (in)</td></tr>
<tr><td>Mass</td><td>kilogram (kg)</td><td>slug</td></tr>
<tr><td>Force</td><td>newton (N) = kg·m/s²</td><td>pound (lb); 1 kip = 1000 lb</td></tr>
<tr><td>Moment</td><td>N·m</td><td>lb·ft, lb·in</td></tr></tbody></table>
<p><strong>Mass is not weight.</strong> Mass (kg) is how much stuff there is. Weight is the <em>force</em> gravity puts on that mass:</p>
$$W = m g, \qquad g = 9.81\ \text{m/s}^2$$
<p>So a 10 kg backpack weighs $10 \times 9.81 = 98.1\ \text{N}$. Useful conversions: $1\ \text{lb} = 4.448\ \text{N}$, $1\ \text{kN} = 1000\ \text{N}$, $1\ \text{ft} = 0.3048\ \text{m}$.</p>
<div class="tip"><strong>Habit to build now:</strong> write the unit next to every number in every line of work. Most wrong answers in statics are unit mistakes, not physics mistakes.</div>

<h2>2. Breaking a force into components</h2>
<p>Any 2D force can be replaced by two perpendicular pieces, one along $x$ and one along $y$. If the force has magnitude $F$ and makes angle $\theta$ measured <strong>counterclockwise from the +x axis</strong>:</p>
$$\gl{sub}{F_x} = F\cos\gl{theta}{\theta}, \qquad F_y = F\sin\theta$$
<p><strong>Why cosine for x and sine for y?</strong> Picture the force as the hypotenuse of a right triangle whose legs run along the axes. The x-leg is <em>adjacent</em> to $\theta$, so adjacent = hypotenuse × cos θ (the CAH in SOH-CAH-TOA). The y-leg is <em>opposite</em> $\theta$, so opposite = hypotenuse × sin θ (SOH).</p>
${RM([["F_x", "“F sub x”", "The x-component of the force $F$. The small x is a label (a <em>subscript</em>), not multiplication."], ["\\theta", "“theta”", "The force's angle, measured counterclockwise from the +x axis."], ["F\\cos\\theta", "“F cosine theta”", "$F$ times $\\cos\\theta$. A trig function applies to the angle right after it."]], ["trig", "signs"])}
<p>Going the other way (components to magnitude and direction):</p>
$$F = \sqrt{F_x^2 + F_y^2}, \qquad \theta = \operatorname{atan2}(F_y, F_x)$$
${RM([["\\sqrt{F_x^2 + F_y^2}", "“the square root of F-x squared plus F-y squared”", "Pythagoras: the components are the legs of the triangle and $F$ is the hypotenuse."], ["\\operatorname{atan2}(F_y, F_x)", "“a-tan-two of F-y, F-x”", "The angle whose tangent is $F_y/F_x$, placed in the correct quadrant using the signs of <em>both</em> components. Note the order: y first."]], ["invtrig"])}
<p><strong>Doing atan2 by hand.</strong> Your calculator's $\tan^{-1}$ only returns angles between −90° and 90°, so it can't tell a force pointing up-right from one pointing down-left. Do it in two steps: (1) find the reference angle $\alpha = \tan^{-1}|F_y/F_x|$, which is between 0° and 90°; (2) use the signs of $(F_x, F_y)$ to pick the quadrant: $(+,+)$ gives $\theta = \alpha$, $(-,+)$ gives $180^\circ - \alpha$, $(-,-)$ gives $180^\circ + \alpha$, and $(+,-)$ gives $360^\circ - \alpha$.</p>
<p>Measuring $\theta$ from +x, counterclockwise, makes the signs come out automatically: a force at $150^\circ$ has a negative $F_x$ and positive $F_y$. If a problem gives the angle some other way (say "30° below the horizontal, pointing left"), either convert it to the standard angle ($180^\circ + 30^\circ = 210^\circ$) or find the magnitudes with right-triangle trig and assign the signs by looking at the sketch.</p>
${S.svg(300, 200, axesBig(150, 110, 90) + forceAt(150, 110, 80, 35, 'F') + S.line(150 + 80 * cosd(35), 110 - 80 * sind(35), 150 + 80 * cosd(35), 110, 'dg-d') + S.arc(150, 110, 28, 0, 35, 'θ') + S.text(150 + 40 * cosd(35) * 2 / 2, 124, 'Fx = F cos θ', { cls: 'dg-td' }) + S.text(150 + 80 * cosd(35) + 8, 110 - 40 * sind(35), 'Fy = F sin θ', { cls: 'dg-td', anchor: 'start' }), 'force components')}
<p><strong>Slopes instead of angles.</strong> Drawings often show a little slope triangle (like 3-4-5) instead of an angle. If the force runs along a slope with horizontal leg $a$, vertical leg $b$ and hypotenuse $c=\sqrt{a^2+b^2}$, then $|F_x| = F\,a/c$ and $|F_y| = F\,b/c$. No calculator trig needed.</p>

<h2>3. Adding forces: the resultant</h2>
<p>The <strong>resultant</strong> $\mathbf R$ of several forces acting at one point is their vector sum. Do it with components, never by adding magnitudes:</p>
$$R_x = \gl{sigma}{\sum} F_x, \qquad R_y = \sum F_y, \qquad R = \sqrt{R_x^2 + R_y^2}$$
${RM([["\\sum F_x", "“the sum of F-x”", "Add up the x-component of every force, each with its sign. Σ is the capital Greek letter sigma (S for “sum”). With nothing written under it, it means “over all the forces in the problem”."], ["\\mathbf R", "“vector R”", "Bold letters are vectors (size <em>and</em> direction). Plain $R$ is just the size, a positive number."]], ["sigma", "vectors"])}
<p>Written out for two forces, $\sum F_x = F_{1x} + F_{2x}$. With three forces you add three terms, and so on. A force pointing left has a negative $F_x$, so it subtracts automatically.</p>

<div class="example"><h3>Worked example 1: resultant of two forces</h3>
<p>Two cables pull on an eye-bolt. $F_1 = 300\ \text{N}$ at $30^\circ$ and $F_2 = 500\ \text{N}$ at $135^\circ$ (both measured CCW from +x). Find the resultant.</p>
${S.svg(300, 190, axesBig(150, 120, 80) + forceAt(150, 120, 70, 30, 'F₁ = 300 N') + forceAt(150, 120, 90, 135, 'F₂ = 500 N'), 'two forces on an eye bolt')}
<ol class="steps">
<li>Components of $F_1$: $F_{1x} = 300\cos30^\circ = 259.8\ \text{N}$, $F_{1y} = 300\sin30^\circ = 150.0\ \text{N}$.</li>
<li>Components of $F_2$: $F_{2x} = 500\cos135^\circ = -353.6\ \text{N}$, $F_{2y} = 500\sin135^\circ = 353.6\ \text{N}$.</li>
<li>Add: $R_x = 259.8 - 353.6 = -93.7\ \text{N}$, $R_y = 150.0 + 353.6 = 503.6\ \text{N}$.</li>
<li>Magnitude: $R = \sqrt{(-93.7)^2 + 503.6^2} = 512.2\ \text{N}$.</li>
<li>Direction: $R_x<0$, $R_y>0$, so $\mathbf R$ is in the second quadrant: $\theta = \operatorname{atan2}(503.6, -93.7) = 100.5^\circ$.</li>
</ol>
<p class="check">Sanity check: $F_2$ is bigger and points up-left, so the resultant should lean up and slightly left. It does.</p></div>

<h2>4. Forces in 3D</h2>
<p>In 3D a force has three components, $\gl{bold}{\mathbf F} = F_x\mathbf i + F_y\mathbf j + F_z\mathbf k$, with magnitude $F = \sqrt{F_x^2+F_y^2+F_z^2}$. The angles the force makes with the axes are its <em>direction angles</em> $\alpha,\beta,\gamma$:</p>
$$\cos\alpha = \frac{F_x}{F},\quad \cos\beta = \frac{F_y}{F},\quad \cos\gamma = \frac{F_z}{F}, \qquad \cos^2\alpha+\cos^2\beta+\cos^2\gamma = 1$$
<p>Most 3D forces come from cables, where you know two points on the line of action. The recipe:</p>
<ol><li>Position vector from tail point $A$ to head point $B$: $\mathbf r_{AB} = (x_B-x_A)\mathbf i + (y_B-y_A)\mathbf j + (z_B-z_A)\mathbf k$.</li>
<li>Unit vector: $\mathbf u_{AB} = \mathbf r_{AB} / |\mathbf r_{AB}|$.</li>
<li>Force: $\mathbf F = F\,\mathbf u_{AB}$.</li></ol>
${RM([["\\mathbf i,\\ \\mathbf j,\\ \\mathbf k", "“i, j, k” (bold)", "Unit vectors: arrows of length 1 along +x, +y and +z. $3\\mathbf i - 2\\mathbf j$ means “3 along x and 2 in the −y direction”. Many books write them with hats: î, ĵ, k̂."], ["\\mathbf r_{AB}", "“r sub A-B”, the position vector from A to B", "Head minus tail: B's coordinates minus A's coordinates."], ["|\\mathbf r_{AB}|", "“the magnitude of r-A-B”", "Its length: $\\sqrt{x^2+y^2+z^2}$ of its components."], ["\\mathbf u_{AB}", "“unit vector u-A-B”", "Direction only (length 1): divide the vector by its own length."], ["\\alpha,\\ \\beta,\\ \\gamma", "“alpha, beta, gamma”", "The angles the force makes with the +x, +y and +z axes."]], ["vectors"])}

<div class="example"><h3>Worked example 2: cable force in 3D</h3>
<p>A cable runs from anchor $A(0, 0, 6)\ \text{m}$ to point $B(3, -2, 0)\ \text{m}$ and pulls on $A$ toward $B$ with tension $700\ \text{N}$. Write the force as a vector.</p>
<ol class="steps">
<li>$\mathbf r_{AB} = (3-0)\mathbf i + (-2-0)\mathbf j + (0-6)\mathbf k = 3\mathbf i - 2\mathbf j - 6\mathbf k\ \text{m}$.</li>
<li>$|\mathbf r_{AB}| = \sqrt{9+4+36} = 7\ \text{m}$, so $\mathbf u_{AB} = \tfrac{3}{7}\mathbf i - \tfrac{2}{7}\mathbf j - \tfrac{6}{7}\mathbf k$.</li>
<li>$\mathbf F = 700\,\mathbf u_{AB} = 300\mathbf i - 200\mathbf j - 600\mathbf k\ \text{N}$.</li>
</ol>
<p class="check">Check: $\sqrt{300^2+200^2+600^2} = 700\ \text{N}$. The magnitude matches.</p></div>

<h2>5. The dot product: angles and projections</h2>
<p>$\mathbf A\gl{dot}{\cdot}\mathbf B = A_xB_x + A_yB_y + A_zB_z = AB\cos\theta$. Two uses you will need later:</p>
<ul><li><strong>Angle between two lines:</strong> $\theta = \cos^{-1}\!\big(\mathbf A\cdot\mathbf B/(AB)\big)$.</li>
<li><strong>Component of a force along a line</strong> with unit vector $\mathbf u$: $F_{\parallel} = \mathbf F\cdot\mathbf u$.</li></ul>
${RM([["\\mathbf A\\cdot\\mathbf B", "“A dot B”", "Multiply matching components and add. The result is a plain number (a scalar), not a vector."], ["\\cos^{-1}", "“inverse cosine” or “arc-cos”", "The angle whose cosine is this number. The −1 is <em>not</em> an exponent."], ["F_{\\parallel}", "“F parallel”", "The part of $\\mathbf F$ that lies along the line."]], ["dot", "invtrig"])}
<p><strong>Quick example.</strong> $\mathbf A = (3, 4, 0)$ and $\mathbf B = (4, 0, 3)$. Then $\mathbf A\cdot\mathbf B = 3\cdot4 + 4\cdot0 + 0\cdot3 = 12$. Both vectors have length 5, so $\cos\theta = 12/(5\cdot5) = 0.48$ and $\theta = \cos^{-1}0.48 = 61.3^\circ$.</p>

<h2>Key takeaways</h2>
<ul class="takeaways"><li>Weight $W = mg$. Mass in kg, weight in N.</li><li>Components: $F_x = F\cos\theta$, $F_y=F\sin\theta$ with $\theta$ CCW from +x.</li><li>Add forces by adding components, never magnitudes.</li><li>3D cable force: $\mathbf F = F\,\mathbf r/|\mathbf r|$.</li></ul>
`;

const nonAxis = () => [10, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80];

const problems = [
  {
    id: 'u1-weight', title: 'Mass, weight & unit conversion', kind: 'numeric',
    gen(r) {
      if (r.next() < 0.5) {
        const m = r.step(2, 250, 0.5);
        const W = m * G;
        return {
          prompt: String.raw`A crate has a mass of $${q(m, 'kg')}$. What is its weight in newtons? (Use $g = 9.81\ \text{m/s}^2$.)`,
          answers: [ans('W', 'W', W, 'N')],
          hints: ['Mass is not force. Gravity turns mass into a force.', String.raw`Use $W = mg$.`],
          solution: String.raw`<ol class="steps"><li>$W = mg = (${fmt(m)}\ \text{kg})(9.81\ \text{m/s}^2)$</li><li>$W = ${q(W, 'N')}$</li></ol>`,
        };
      }
      const lb = r.int(20, 400);
      const N = lb * 4.448;
      return {
        prompt: String.raw`A spec sheet lists a load of $${q(lb, 'lb')}$. Convert it to newtons. (Use $1\ \text{lb} = 4.448\ \text{N}$.)`,
        answers: [ans('F', 'F', N, 'N')],
        hints: ['Multiply by the conversion factor so the "lb" units cancel.', String.raw`$F = (\text{lb}) \times 4.448\ \text{N/lb}$`],
        solution: String.raw`<ol class="steps"><li>$F = ${lb}\ \text{lb} \times 4.448\ \tfrac{\text{N}}{\text{lb}} = ${q(N, 'N')}$</li></ol>`,
      };
    },
  },
  {
    id: 'u1-components', title: 'Components from magnitude & angle', kind: 'numeric',
    gen(r) {
      const F = r.step(50, 900, 10);
      const th = r.pick([0, 90, 180, 270]) + r.pick(nonAxis());
      const Fx = F * cosd(th), Fy = F * sind(th);
      return {
        prompt: String.raw`A force of $${q(F, 'N')}$ acts at $\theta = ${th}^\circ$, measured counterclockwise from the +x axis. Find its $x$ and $y$ components (include signs).`,
        svg: S.svg(260, 200, axesBig(130, 100, 85) + forceAt(130, 100, 70, th, 'F') + S.arc(130, 100, 22, 0, th, th + '°'), 'force at angle'),
        answers: [ans('Fx', 'F_x', Fx, 'N'), ans('Fy', 'F_y', Fy, 'N')],
        hints: [String.raw`With $\theta$ measured CCW from +x, use $F_x = F\cos\theta$ and $F_y = F\sin\theta$ directly. The signs take care of themselves.`, `Which quadrant is ${th}° in? That tells you the sign of each component, so you can check your calculator.`],
        solution: String.raw`<ol class="steps"><li>$F_x = F\cos\theta = ${fmt(F)}\cos ${th}^\circ = ${q(Fx, 'N')}$</li><li>$F_y = F\sin\theta = ${fmt(F)}\sin ${th}^\circ = ${q(Fy, 'N')}$</li></ol><p class="check">Check: $\sqrt{F_x^2+F_y^2} = ${fmt(Math.hypot(Fx, Fy))}\ \text{N}$ ✓</p>`,
      };
    },
  },
  {
    id: 'u1-slope', title: 'Components from a slope triangle', kind: 'numeric',
    gen(r) {
      const [a, b, c] = r.pick([[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [8, 15, 17], [24, 7, 25]]);
      const F = r.step(100, 2000, 25);
      const sx = r.sign(), sy = r.sign();
      const Fx = sx * F * a / c, Fy = sy * F * b / c;
      const dir = `${sy > 0 ? 'up' : 'down'} and to the ${sx > 0 ? 'right' : 'left'}`;
      const ox = 130, oy = 105, L = 75;
      const ex = ox + sx * L * a / c, ey = oy - sy * L * b / c;
      // slope triangle drawn on the force itself: legs are proportional to a and b
      const glyph = S.pline([[ox, oy], [ex, oy], [ex, ey]], 'dg-d') +
        S.text((ox + ex) / 2, oy + sy * 12, String(a), { cls: 'dg-td' }) +
        S.text(ex + sx * 10, (oy + ey) / 2, String(b), { cls: 'dg-td' }) +
        S.text((ox + ex) / 2 - sx * 10, (oy + ey) / 2 - sy * 10, String(c), { cls: 'dg-td' });
      const svg = S.svg(260, 210, axesBig(ox, oy, 90) + glyph + S.arrow(ox, oy, ex, ey, { label: 'F', lx: ex + sx * 12, ly: ey - sy * 14 }), 'force along slope');
      return {
        prompt: String.raw`A force of $${q(F, 'N')}$ points ${dir} along a line whose slope triangle has horizontal leg ${a}, vertical leg ${b} and hypotenuse ${c}. Find $F_x$ and $F_y$ (with signs; +x right, +y up).`,
        svg,
        answers: [ans('Fx', 'F_x', Fx, 'N'), ans('Fy', 'F_y', Fy, 'N')],
        hints: [String.raw`The slope triangle is similar to the force triangle: $|F_x|/F = a/c$ and $|F_y|/F = b/c$.`, `Get the magnitudes first, then use the direction (${dir}) to choose signs.`],
        solution: String.raw`<ol class="steps"><li>$|F_x| = F\cdot\tfrac{${a}}{${c}} = ${fmt(F)}\cdot\tfrac{${a}}{${c}} = ${fmt(Math.abs(Fx))}\ \text{N}$</li><li>$|F_y| = F\cdot\tfrac{${b}}{${c}} = ${fmt(Math.abs(Fy))}\ \text{N}$</li><li>The force points ${dir}, so $F_x = ${q(Fx, 'N')}$ and $F_y = ${q(Fy, 'N')}$.</li></ol>`,
      };
    },
  },
  {
    id: 'u1-resultant2', title: 'Resultant of two forces', kind: 'numeric',
    gen(r) {
      let F1, F2, t1, t2, Rx, Ry, R, th;
      do {
        F1 = r.step(100, 800, 10); F2 = r.step(100, 800, 10);
        t1 = r.step(0, 350, 5); t2 = r.step(0, 350, 5);
        Rx = F1 * cosd(t1) + F2 * cosd(t2); Ry = F1 * sind(t1) + F2 * sind(t2);
        R = Math.hypot(Rx, Ry); th = (atan2d(Ry, Rx) + 360) % 360;
      } while (R < 60 || th < 4 || th > 356 || Math.abs(((t1 - t2) % 180 + 180) % 180) < 15);
      return {
        prompt: String.raw`Two forces act on a bracket: $F_1 = ${q(F1, 'N')}$ at $${t1}^\circ$ and $F_2 = ${q(F2, 'N')}$ at $${t2}^\circ$ (angles CCW from +x). Find the magnitude of the resultant and its direction $\theta_R$ measured CCW from +x (between 0° and 360°).`,
        svg: S.svg(260, 200, axesBig(130, 100, 85) + forceAt(130, 100, 50 + 30 * F1 / 800, t1, 'F₁') + forceAt(130, 100, 50 + 30 * F2 / 800, t2, 'F₂'), 'two forces'),
        answers: [ans('R', 'R', R, 'N'), ans('th', String.raw`\theta_R`, th, '°', { rel: 0, abs: 1 })],
        hints: ['Find x and y components of each force, then add them.', String.raw`$R = \sqrt{R_x^2 + R_y^2}$. For the angle, look at the signs of $R_x$ and $R_y$ to place it in the right quadrant (or use atan2).`, String.raw`If $\tan^{-1}(R_y/R_x)$ gives a negative angle or the wrong quadrant, add $180^\circ$ or $360^\circ$.`],
        solution: String.raw`<ol class="steps"><li>$R_x = ${fmt(F1)}\cos${t1}^\circ + ${fmt(F2)}\cos${t2}^\circ = ${q(Rx, 'N')}$</li><li>$R_y = ${fmt(F1)}\sin${t1}^\circ + ${fmt(F2)}\sin${t2}^\circ = ${q(Ry, 'N')}$</li><li>$R = \sqrt{(${fmt(Rx)})^2 + (${fmt(Ry)})^2} = ${q(R, 'N')}$</li><li>$\theta_R = \operatorname{atan2}(R_y, R_x) = ${fmt(th)}^\circ$ (quadrant ${th < 90 ? 'I' : th < 180 ? 'II' : th < 270 ? 'III' : 'IV'})</li></ol>`,
      };
    },
  },
  {
    id: 'u1-resultant3', title: 'Resultant components of three forces', kind: 'numeric',
    gen(r) {
      const Fs = [0, 1, 2].map(() => ({ F: r.step(50, 600, 10), t: r.step(0, 345, 15) }));
      const Rx = Fs.reduce((s, f) => s + f.F * cosd(f.t), 0), Ry = Fs.reduce((s, f) => s + f.F * sind(f.t), 0);
      return {
        prompt: String.raw`Three forces act at a point: ${Fs.map((f, i) => String.raw`$F_${i + 1} = ${q(f.F, 'N')}$ at $${f.t}^\circ$`).join(', ')} (CCW from +x). Find the components $R_x$ and $R_y$ of their resultant.`,
        svg: S.svg(260, 200, axesBig(130, 100, 85) + Fs.map((f, i) => forceAt(130, 100, 45 + 35 * f.F / 600, f.t, 'F' + '₁₂₃'[i])).join(''), 'three forces'),
        answers: [ans('Rx', 'R_x', Rx, 'N'), ans('Ry', 'R_y', Ry, 'N')],
        hints: ['Make a table: one row per force, columns for F cos θ and F sin θ.', 'Add each column, keeping the signs.'],
        solution: String.raw`<table class="tbl"><tr><th>Force</th><th>$F\cos\theta$ (N)</th><th>$F\sin\theta$ (N)</th></tr>${Fs.map((f, i) => `<tr><td>$F_${i + 1}$</td><td>${fmt(f.F * cosd(f.t))}</td><td>${fmt(f.F * sind(f.t))}</td></tr>`).join('')}<tr><td><strong>Sum</strong></td><td><strong>${fmt(Rx)}</strong></td><td><strong>${fmt(Ry)}</strong></td></tr></table><p>$R_x = ${q(Rx, 'N')}$, $R_y = ${q(Ry, 'N')}$</p>`,
      };
    },
  },
  {
    id: 'u1-3d-cable', title: 'Cable force as a 3D vector', kind: 'numeric',
    gen(r) {
      let A, B, d;
      do {
        A = [r.int(-4, 4), r.int(-4, 4), r.int(3, 8)];
        B = [r.int(-6, 6), r.int(-6, 6), r.int(0, 2)];
        d = B.map((b, i) => b - A[i]);
      } while (Math.hypot(...d) < 3 || d.filter((v) => v !== 0).length < 3);
      const L = Math.hypot(...d);
      const F = r.step(200, 1500, 50);
      const Fv = d.map((v) => (F * v) / L);
      return {
        prompt: String.raw`A cable runs from $A(${A.join(', ')})\ \text{m}$ to $B(${B.join(', ')})\ \text{m}$. Its tension is $${q(F, 'N')}$, and it pulls on point $A$ toward $B$. Find the components of that force on $A$.`,
        answers: [ans('Fx', 'F_x', Fv[0], 'N'), ans('Fy', 'F_y', Fv[1], 'N'), ans('Fz', 'F_z', Fv[2], 'N')],
        hints: [String.raw`Build the position vector $\mathbf r_{AB} = B - A$ (head minus tail).`, String.raw`Divide by its length to get the unit vector $\mathbf u_{AB}$.`, String.raw`$\mathbf F = F\,\mathbf u_{AB}$.`],
        solution: String.raw`<ol class="steps"><li>$\mathbf r_{AB} = (${d.join(', ')})\ \text{m}$</li><li>$|\mathbf r_{AB}| = \sqrt{${d.map((v) => v * v).join(' + ')}} = ${fmt(L)}\ \text{m}$</li><li>$\mathbf u_{AB} = (${d.map((v) => fmt(v / L)).join(', ')})$</li><li>$\mathbf F = ${fmt(F)}\,\mathbf u_{AB} = (${Fv.map((v) => fmt(v)).join(', ')})\ \text{N}$</li></ol>`,
      };
    },
  },
  {
    id: 'u1-dir-angles', title: '3D magnitude & direction angle', kind: 'numeric',
    gen(r) {
      const c = [r.step(-500, 500, 10), r.step(-500, 500, 10), r.step(-500, 500, 10)].map((v) => (v === 0 ? 40 : v));
      const F = Math.hypot(...c);
      const alpha = acosd(c[0] / F), gamma = acosd(c[2] / F);
      return {
        prompt: String.raw`$\mathbf F = ${fmt(c[0])}\mathbf i ${c[1] < 0 ? '-' : '+'} ${fmt(Math.abs(c[1]))}\mathbf j ${c[2] < 0 ? '-' : '+'} ${fmt(Math.abs(c[2]))}\mathbf k\ \text{N}$. Find its magnitude, the angle $\alpha$ it makes with the +x axis, and the angle $\gamma$ it makes with the +z axis.`,
        answers: [ans('F', 'F', F, 'N'), ans('a', String.raw`\alpha`, alpha, '°', { rel: 0, abs: 0.6 }), ans('g', String.raw`\gamma`, gamma, '°', { rel: 0, abs: 0.6 })],
        hints: [String.raw`$F = \sqrt{F_x^2+F_y^2+F_z^2}$`, String.raw`$\cos\alpha = F_x/F$ and $\cos\gamma = F_z/F$. Direction angles are always between 0° and 180°.`],
        solution: String.raw`<ol class="steps"><li>$F = \sqrt{${c.map((v) => par(v)).join('^2+')}^2} = ${q(F, 'N')}$</li><li>$\alpha = \cos^{-1}(${fmt(c[0])}/${fmt(F)}) = ${fmt(alpha)}^\circ$</li><li>$\gamma = \cos^{-1}(${fmt(c[2])}/${fmt(F)}) = ${fmt(gamma)}^\circ$</li></ol>`,
      };
    },
  },
  {
    id: 'u1-dot', title: 'Angle between two lines (dot product)', kind: 'numeric',
    gen(r) {
      let A, B, th;
      do {
        A = [r.int(-5, 5), r.int(-5, 5), r.int(-5, 5)];
        B = [r.int(-5, 5), r.int(-5, 5), r.int(-5, 5)];
        const la = Math.hypot(...A), lb = Math.hypot(...B);
        th = la && lb ? acosd((A[0] * B[0] + A[1] * B[1] + A[2] * B[2]) / (la * lb)) : 0;
      } while (!(th > 10 && th < 170));
      const dot = A[0] * B[0] + A[1] * B[1] + A[2] * B[2];
      const la = Math.hypot(...A), lb = Math.hypot(...B);
      return {
        prompt: String.raw`Two rods leave the origin $O$. Rod 1 ends at $A(${A.join(', ')})\ \text{m}$ and rod 2 ends at $B(${B.join(', ')})\ \text{m}$. What is the angle between the rods?`,
        answers: [ans('th', String.raw`\theta`, th, '°', { rel: 0, abs: 0.6 })],
        hints: [String.raw`Use $\mathbf A\cdot\mathbf B = AB\cos\theta$.`, String.raw`$\mathbf A\cdot\mathbf B = A_xB_x + A_yB_y + A_zB_z$; then divide by both lengths.`],
        solution: String.raw`<ol class="steps"><li>$\mathbf A\cdot\mathbf B = ${A.map((a, i) => `(${a})(${B[i]})`).join(' + ')} = ${dot}\ \text{m}^2$</li><li>$|\mathbf A| = ${fmt(la)}\ \text{m}$, $|\mathbf B| = ${fmt(lb)}\ \text{m}$</li><li>$\theta = \cos^{-1}\!\left(\dfrac{${dot}}{(${fmt(la)})(${fmt(lb)})}\right) = ${fmt(th)}^\circ$</li></ol>`,
      };
    },
  },
  {
    id: 'u1-mc-concepts', title: 'Concept check: vectors & units', kind: 'mc',
    gen: mcPool([
      { q: 'Which of these is a vector quantity?', correct: 'The force a cable exerts on a hook', wrong: ['The mass of a steel beam', 'The length of a bridge span', 'The temperature of a bolt'], why: 'A force has both magnitude and direction. Mass, length and temperature only have magnitude, so they are scalars.' },
      { q: 'An astronaut takes a 2 kg tool to the Moon. What changes?', correct: 'Its weight decreases; its mass stays 2 kg', wrong: ['Its mass decreases; its weight stays the same', 'Both mass and weight stay the same', 'Both mass and weight decrease'], why: String.raw`Mass is the amount of matter and doesn't depend on location. Weight $W = mg$ depends on the local $g$, which is smaller on the Moon.` },
      { q: 'Two forces of 30 N and 40 N act on the same point. Which value is IMPOSSIBLE for the magnitude of their resultant?', correct: '80 N', wrong: ['10 N', '50 N', '70 N'], why: 'The resultant ranges from |40 − 30| = 10 N (opposite directions) to 40 + 30 = 70 N (same direction). 80 N is outside that range.' },
      { q: String.raw`A force acts at $\theta = 210^\circ$ (CCW from +x). What are the signs of its components?`, correct: String.raw`$F_x < 0,\ F_y < 0$`, wrong: [String.raw`$F_x > 0,\ F_y < 0$`, String.raw`$F_x < 0,\ F_y > 0$`, String.raw`$F_x > 0,\ F_y > 0$`], why: '210° is in the third quadrant (between 180° and 270°), where both cosine and sine are negative.' },
      { q: 'What is the SI unit of force, written in base units?', correct: 'kg·m/s²', wrong: ['kg·m/s', 'kg/m²', 'kg·m²/s²'], why: String.raw`From $F = ma$: kilograms times meters per second squared. That combination is called the newton. (kg·m²/s² is a joule, which is energy.)` },
      { q: String.raw`For any 3D force, what does $\cos^2\alpha + \cos^2\beta + \cos^2\gamma$ equal?`, correct: '1', wrong: ['0', 'F', 'It depends on the force'], why: 'The direction cosines are the components of a unit vector, and a unit vector has length 1.' },
    ]),
  },
];

// local helper (avoid circular import ordering issues)
function par(x) { return x < 0 ? `(${fmt(x)})` : fmt(x); }

module.exports = {
  num: 1, slug: 'vectors', title: 'Units, Vectors & Force Components',
  blurb: 'SI units, weight vs. mass, breaking forces into components, adding forces, and 3D cable forces.',
  lesson, problems,
};
