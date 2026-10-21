'use strict';
const { readMath: RM } = require('../skills');
const { fmt, q, ans, mcPool, sind, cosd, tand, asind, atand, G } = require('../helpers');
const S = require('../svg');

function solve3(M, b) {
  const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det(M);
  return [0, 1, 2].map((c) => det(M.map((row, i) => row.map((v, j) => (j === c ? b[i] : v)))) / D);
}

// Ring hanging from two cables at angles a (left) and b (right) above horizontal.
function twoCableSvg(a, b, labels = ['A', 'C'], wlabel = 'W') {
  const cx = 150, cy = 120, top = 30, H = cy - top;
  const xl = Math.max(15, cx - H / tand(a)), xr = Math.min(285, cx + H / tand(b));
  const yl = cy - (cx - xl) * tand(a), yr = cy - (xr - cx) * tand(b);
  return S.svg(300, 200,
    S.line(10, top, 290, top, 'dg-g') + S.line(xl, yl, cx, cy, 'dg-m') + S.line(cx, cy, xr, yr, 'dg-m') +
    S.node(xl, yl) + S.node(xr, yr) + S.text(xl, yl - 10, labels[0]) + S.text(xr, yr - 10, labels[1]) +
    S.line(cx, cy, cx, cy + 30, 'dg-m') + S.rect(cx - 18, cy + 30, 36, 30) + S.text(cx, cy + 45, wlabel) + S.node(cx, cy) + S.text(cx + 14, cy - 2, 'B', { anchor: 'start' }) +
    S.arc(cx, cy, 30, 180 - a, 180, a + '°') + S.arc(cx, cy, 30, 0, b, b + '°') + S.line(cx - 40, cy, cx + 40, cy, 'dg-d'), 'two-cable support');
}

const lesson = String.raw`
<h2>The big idea</h2>
<p>A body is in <strong>equilibrium</strong> when it is at rest (or moving at constant velocity). Newton's first law says the net force on it must then be zero. In this unit we treat the object as a <strong>particle</strong>: every force passes through a single point, so nothing can make it rotate and we only have to balance forces.</p>
$$\gl{sigma}{\sum} \gl{bold}{\mathbf F} = \mathbf 0 \quad\Longleftrightarrow\quad \sum F_x = 0,\ \ \sum F_y = 0\ \ (\text{and } \sum F_z = 0 \text{ in 3D})$$
<p>In 2D that gives two equations, so you can solve for <strong>two unknowns</strong>. In 3D you get three equations and can solve for three unknowns.</p>
${RM([["\\sum \\mathbf F = \\mathbf 0", "“the sum of the forces equals the zero vector”", "Add every force on the body as vectors. The total has no size and no direction."], ["\\Longleftrightarrow", "“is equivalent to” or “if and only if”", "Each side implies the other: a vector is zero exactly when each of its components is zero."], ["\\sum F_x = 0", "“the sum of F-x equals zero”", "All the x-components, added with their signs (right +, left −), cancel out."]], ["sigma", "signs", "linsys"])}
<p><strong>Writing $\sum F_x = 0$ from a sketch, step by step:</strong> go through the forces one at a time, write each one's x-component with its sign (right is +, left is −), put plus signs between the terms, and set the total equal to zero. A force pointing straight up or down adds 0 to this sum. Then do the same for y. You end up with two equations in two unknowns, a 2×2 linear system you can solve by substitution or elimination, just as in Algebra II.</p>

<h2>The free-body diagram (FBD)</h2>
<p>The FBD is the single most important habit in statics. Every problem in the rest of this course starts with one.</p>
<ol><li><strong>Isolate</strong> the particle: draw it alone, cut free from everything around it.</li>
<li><strong>Show every force</strong> acting <em>on</em> it: weight, cable tensions, contact (normal) forces, spring forces, applied loads. Wherever you cut a cable or a contact, a force appears.</li>
<li><strong>Label</strong> known magnitudes and angles, give unknowns symbols, and draw your x-y axes.</li></ol>
<p>Rules for common connections:</p>
<ul><li><strong>Cable or rope:</strong> it can only <em>pull</em> along its own length. The tension $T$ acts away from the particle, along the cable.</li>
<li><strong>Ideal pulley</strong> (frictionless, massless): the tension is the same on both sides.</li>
<li><strong>Linear spring:</strong> force $F_s = k\,s$, where $s$ is the stretch (or compression) from the unstretched length and $k$ is the stiffness in N/m.</li>
<li><strong>Smooth surface:</strong> pushes perpendicular to the surface with a normal force $N$.</li></ul>

<div class="example"><h3>Worked example 1: a sign hanging from two cables</h3>
<p>A 50 kg sign hangs from ring $B$, which is held by cable $BA$ at $30^\circ$ above the horizontal (to the left) and cable $BC$ at $45^\circ$ above the horizontal (to the right). Find both tensions.</p>
${twoCableSvg(30, 45, ['A', 'C'], '50 kg')}
<ol class="steps">
<li>Weight: $W = mg = 50(9.81) = 490.5\ \text{N}$.</li>
<li>FBD of ring $B$: $T_{BA}$ pulls up-left at $30^\circ$, $T_{BC}$ pulls up-right at $45^\circ$, and $W$ pulls straight down.</li>
<li>$\sum F_x = 0$: $\ -T_{BA}\cos30^\circ + T_{BC}\cos45^\circ = 0$</li>
<li>$\sum F_y = 0$: $\ \ \ T_{BA}\sin30^\circ + T_{BC}\sin45^\circ - 490.5 = 0$</li>
<li>Solve the first equation for $T_{BC}$ (move the negative term across, then divide by $\cos45^\circ$): $T_{BC} = T_{BA}\cos30^\circ/\cos45^\circ = 1.2247\,T_{BA}$. Substitute into the second: $T_{BA}(0.5 + 1.2247\times0.7071) = 490.5$, so $T_{BA} = 359.1\ \text{N}$.</li>
<li>$T_{BC} = 1.2247(359.1) = 439.8\ \text{N}$.</li></ol>
<p class="check">The steeper cable (45°) carries more load. That makes sense: it points more nearly straight up, the direction the weight has to be held.</p>
<p>A general formula is handy to know: with angles $\alpha$ and $\beta$ above the horizontal, $T_{\alpha} = \dfrac{W\cos\beta}{\sin(\alpha+\beta)}$ and $T_{\beta} = \dfrac{W\cos\alpha}{\sin(\alpha+\beta)}$. Notice what happens as both angles shrink toward 0: the tensions blow up. You can never pull a loaded clothesline perfectly straight.</p></div>

<h2>Three-dimensional particle equilibrium</h2>
<p>The method is the same, with one extra equation. Write each cable force as a vector (magnitude times unit vector, from Unit 1), add them up, and set each of the $\mathbf i$, $\mathbf j$, $\mathbf k$ sums to zero.</p>
${RM([["\\Rightarrow", "“so” or “which gives”", "The next result follows from the step before it."], ["\\mathbf u_A = (0.8,\\ 0,\\ 0.6)", "“unit vector u-A is 0.8, 0, 0.6”", "Shorthand for $0.8\\mathbf i + 0\\mathbf j + 0.6\\mathbf k$. Listing the components in parentheses describes the same vector."], ["\\tfrac37 T_B", "“three-sevenths T-B”", "The y-part of cable B's pull: its unit-vector component times the tension."]], ["vectors", "linsys"])}
<p>In 3D there are three equations and three unknowns. Start with the equation that has the fewest unknowns, solve it, and substitute into the others. That's the same elimination you used for 3×3 systems in Algebra II.</p>
<div class="example"><h3>Worked example 2: a load held by three cables</h3>
<p>A 900 N load hangs from point $D$ at the origin. Three cables run from $D$ to anchors $A(4, 0, 3)$, $B(-2, 3, 6)$ and $C(-2, -3, 6)$ m (z is up). Find the tensions.</p>
<ol class="steps">
<li>Unit vectors: $|DA| = 5$, so $\mathbf u_A = (0.8, 0, 0.6)$. $|DB| = |DC| = 7$, so $\mathbf u_B = (-\tfrac27, \tfrac37, \tfrac67)$ and $\mathbf u_C = (-\tfrac27, -\tfrac37, \tfrac67)$.</li>
<li>$\sum F_y = 0$: $\ \tfrac37 T_B - \tfrac37 T_C = 0 \Rightarrow T_B = T_C$ (as the symmetry suggests).</li>
<li>$\sum F_x = 0$: $\ 0.8\,T_A - \tfrac27 T_B - \tfrac27 T_C = 0 \Rightarrow 0.8\,T_A = \tfrac47 T_B \Rightarrow T_B = 1.4\,T_A$.</li>
<li>$\sum F_z = 0$: $\ 0.6\,T_A + \tfrac67(T_B + T_C) - 900 = 0 \Rightarrow 0.6T_A + \tfrac{12}{7}(1.4T_A) = 3T_A = 900$.</li>
<li>$T_A = 300\ \text{N}$, $T_B = T_C = 420\ \text{N}$.</li></ol></div>

<h2>Problem-solving checklist</h2>
<ul class="takeaways"><li>Draw the FBD first, every time.</li><li>Assume unknown tensions pull away from the particle. A negative answer means a cable would have to push, which a cable can't do. Recheck the setup.</li><li>Choose axes that line up with as many forces as possible (on an incline, tilt them).</li><li>Count unknowns against equations: 2 in 2D, 3 in 3D.</li></ul>
`;

const problems = [
  {
    id: 'u2-two-cables', title: 'Weight held by two cables', kind: 'numeric',
    gen(r) {
      let a, b;
      do { a = r.step(15, 70, 5); b = r.step(15, 70, 5); } while (a === b);
      const m = r.step(10, 200, 5), W = m * G;
      const s = sind(a + b);
      const TA = (W * cosd(b)) / s, TC = (W * cosd(a)) / s;
      return {
        prompt: String.raw`A $${q(m, 'kg')}$ mass hangs from ring $B$. Cable $BA$ pulls up-left at $${a}^\circ$ above the horizontal; cable $BC$ pulls up-right at $${b}^\circ$ above the horizontal. Find $T_{BA}$ and $T_{BC}$.`,
        svg: twoCableSvg(a, b, ['A', 'C'], fmt(m) + ' kg'),
        given: { a, b, W },
        answers: [ans('TA', 'T_{BA}', TA, 'N'), ans('TC', 'T_{BC}', TC, 'N')],
        hints: [String.raw`Draw the FBD of ring B: two tensions plus $W = mg$.`, String.raw`$\sum F_x = 0$: $-T_{BA}\cos${a}^\circ + T_{BC}\cos${b}^\circ = 0$. $\ \sum F_y=0$: $T_{BA}\sin${a}^\circ + T_{BC}\sin${b}^\circ = W$.`, 'Solve the x-equation for one tension and substitute it into the y-equation.'],
        solution: String.raw`<ol class="steps"><li>$W = ${fmt(m)}(9.81) = ${q(W, 'N')}$</li><li>$\sum F_x=0:\ T_{BC} = T_{BA}\dfrac{\cos${a}^\circ}{\cos${b}^\circ} = ${fmt(cosd(a) / cosd(b))}\,T_{BA}$</li><li>$\sum F_y=0:\ T_{BA}\left(\sin${a}^\circ + ${fmt(cosd(a) / cosd(b))}\sin${b}^\circ\right) = ${fmt(W)}$</li><li>$T_{BA} = ${q(TA, 'N')}$, $\ T_{BC} = ${q(TC, 'N')}$</li></ol><p class="check">Shortcut: $T_{BA} = W\cos\beta/\sin(\alpha+\beta)$, $\ T_{BC} = W\cos\alpha/\sin(\alpha+\beta)$.</p>`,
      };
    },
  },
  {
    id: 'u2-pull-aside', title: 'Pulling a hanging load sideways', kind: 'numeric',
    gen(r) {
      const W = r.step(100, 1500, 25), th = r.step(10, 60, 5);
      const T = W / cosd(th), P = W * tand(th);
      const L = 110, cx = 120, top = 25, bx = cx + L * sind(th), by = top + L * cosd(th);
      return {
        prompt: String.raw`A $${q(W, 'N')}$ bucket hangs from a rope. A worker pulls the bucket with a <em>horizontal</em> force $P$ until the rope makes $${th}^\circ$ with the vertical, and holds it there. Find $P$ and the rope tension $T$.`,
        svg: S.svg(280, 200, S.hatch(60, 180, top) + S.line(cx, top, bx, by) + S.line(cx, top, cx, top + L + 10, 'dg-d') + S.arc(cx, top, 40, -90, -90 + th, th + '°') + S.rect(bx - 14, by, 28, 24) + S.arrow(bx + 14, by + 12, bx + 70, by + 12, { label: 'P', lx: bx + 80, ly: by + 12, anchor: 'start' }) + S.text(bx, by + 38, 'W'), 'bucket pulled aside'),
        answers: [ans('P', 'P', P, 'N'), ans('T', 'T', T, 'N')],
        hints: ['Three forces act on the bucket: W (down), P (horizontal), and T (along the rope, up and back toward the support).', String.raw`Vertical: $T\cos${th}^\circ = W$. Horizontal: $T\sin${th}^\circ = P$.`],
        solution: String.raw`<ol class="steps"><li>$\sum F_y = 0:\ T\cos${th}^\circ - ${fmt(W)} = 0 \Rightarrow T = ${q(T, 'N')}$</li><li>$\sum F_x = 0:\ P - T\sin${th}^\circ = 0 \Rightarrow P = ${q(P, 'N')}$</li></ol><p class="check">Equivalently $P = W\tan\theta$: the farther you pull it aside, the harder it gets, without limit.</p>`,
      };
    },
  },
  {
    id: 'u2-incline', title: 'Block on a smooth incline', kind: 'numeric',
    gen(r) {
      const m = r.step(5, 120, 1), th = r.step(10, 60, 5), W = m * G;
      const T = W * sind(th), N = W * cosd(th);
      const x0 = 30, y0 = 175, L = 220, x1 = x0 + L * cosd(th), y1 = y0 - L * sind(th);
      const mx = x0 + 0.55 * L * cosd(th), my = y0 - 0.55 * L * sind(th);
      const n = [-sind(th), -cosd(th)];
      const bc = [mx + n[0] * 14, my + n[1] * 14];
      const block = S.poly([[mx - 18 * cosd(th), my + 18 * sind(th)], [mx + 18 * cosd(th), my - 18 * sind(th)], [mx + 18 * cosd(th) + 28 * n[0], my - 18 * sind(th) + 28 * n[1]], [mx - 18 * cosd(th) + 28 * n[0], my + 18 * sind(th) + 28 * n[1]]], 'dg-body');
      return {
        prompt: String.raw`A $${q(m, 'kg')}$ block rests on a smooth (frictionless) ramp inclined at $${th}^\circ$. A cord parallel to the ramp holds it in place. Find the cord tension $T$ and the normal force $N$.`,
        svg: S.svg(280, 200, S.line(x0, y0, x0 + L * cosd(th) + 10, y0, 'dg-g') + S.line(x0, y0, x1, y1, 'dg-g') + S.line(x1, y1, x1, y0, 'dg-g') + block + S.line(bc[0] + 18 * cosd(th), bc[1] - 18 * sind(th), x1 - 6 * cosd(th), y1 + 6 * sind(th) + n[1] * 14 + 14 * cosd(th) * 0, 'dg-m') + S.arc(x0, y0, 40, 0, th, th + '°') + S.text(bc[0], bc[1], fmt(m) + ' kg', { cls: 'dg-td' }), 'block on incline'),
        answers: [ans('T', 'T', T, 'N'), ans('N', 'N', N, 'N')],
        hints: ['Tilt your axes: x along the ramp, y perpendicular to it. Then only the weight needs breaking into components.', String.raw`Along the ramp the weight component is $W\sin\theta$; perpendicular to it, $W\cos\theta$.`],
        solution: String.raw`<ol class="steps"><li>$W = ${fmt(m)}(9.81) = ${q(W, 'N')}$</li><li>Along the ramp: $T - W\sin${th}^\circ = 0 \Rightarrow T = ${q(T, 'N')}$</li><li>Perpendicular: $N - W\cos${th}^\circ = 0 \Rightarrow N = ${q(N, 'N')}$</li></ol>`,
      };
    },
  },
  {
    id: 'u2-spring', title: 'Spring and cable holding a weight', kind: 'numeric',
    gen(r) {
      const W = r.step(50, 600, 10), th = r.step(20, 70, 5), k = r.step(500, 5000, 100);
      const T = W / sind(th), Fs = W / tand(th), d = (Fs / k) * 1000;
      const cx = 170, cy = 120;
      const cable = [cx + 80 * cosd(th), cy - 80 * sind(th)];
      let spring = '', x = 40; const pts = [[30, cy]];
      for (let i = 0; i < 10; i++) { x += 12; pts.push([x, cy + (i % 2 ? 8 : -8)]); }
      pts.push([cx, cy]);
      spring = S.pline(pts, 'dg-m');
      return {
        prompt: String.raw`Ring $O$ supports a $${q(W, 'N')}$ weight. A horizontal spring ($k = ${q(k, 'N/m')}$) attached to a wall pulls the ring to the left, and a cable pulls it up and to the right at $${th}^\circ$ above the horizontal. How much is the spring stretched (in mm), and what is the cable tension?`,
        svg: S.svg(300, 200, S.wall(30, cy - 30, cy + 30, -1) + spring + S.line(cx, cy, cable[0], cable[1]) + S.hatch(cable[0] - 20, cable[0] + 20, cable[1]) + S.arc(cx, cy, 30, 0, th, th + '°') + S.line(cx, cy, cx, cy + 30) + S.rect(cx - 15, cy + 30, 30, 24) + S.text(cx, cy + 42, 'W', { cls: 'dg-td' }) + S.node(cx, cy) + S.text(100, cy - 22, 'k', { cls: 'dg-td' }), 'spring and cable'),
        given: { W, th, k },
        answers: [ans('d', 's', d, 'mm'), ans('T', 'T', T, 'N')],
        hints: [String.raw`Vertical equilibrium involves only the cable and the weight: $T\sin${th}^\circ = W$.`, String.raw`Horizontal: spring force $F_s = T\cos${th}^\circ$. Then the stretch is $s = F_s/k$; convert m to mm.`],
        solution: String.raw`<ol class="steps"><li>$\sum F_y = 0:\ T\sin${th}^\circ = ${fmt(W)} \Rightarrow T = ${q(T, 'N')}$</li><li>$\sum F_x = 0:\ F_s = T\cos${th}^\circ = ${q(Fs, 'N')}$</li><li>$s = F_s/k = ${fmt(Fs)}/${fmt(k)} = ${fmt(Fs / k)}\ \text{m} = ${q(d, 'mm')}$</li></ol>`,
      };
    },
  },
  {
    id: 'u2-pulley', title: 'Load on a pulley riding a sagging cable', kind: 'numeric',
    gen(r) {
      const L = r.step(4, 20, 1), h = r.step(0.3, 3, 0.1), W = r.step(200, 3000, 50);
      const th = atand(h / (L / 2)), T = W / (2 * sind(th));
      return {
        prompt: String.raw`A cable is strung between two supports at the same height, $${q(L, 'm')}$ apart. A small frictionless pulley carrying a $${q(W, 'N')}$ load rolls to the middle and sags the cable $${q(h, 'm')}$ below the supports. Find the cable tension $T$.`,
        svg: S.svg(300, 170, S.hatch(20, 40, 30) + S.hatch(260, 280, 30) + S.line(30, 30, 150, 30 + 60 * Math.min(1, h / 2)) + S.line(150, 30 + 60 * Math.min(1, h / 2), 270, 30) + S.circle(150, 30 + 60 * Math.min(1, h / 2), 8, 'dg-sup') + S.line(150, 38 + 60 * Math.min(1, h / 2), 150, 70 + 60 * Math.min(1, h / 2)) + S.rect(134, 70 + 60 * Math.min(1, h / 2), 32, 22) + S.text(150, 81 + 60 * Math.min(1, h / 2), 'W', { cls: 'dg-td' }) + S.dim(30, 270, 158, 'L = ' + fmt(L) + ' m'), 'pulley on cable'),
        given: { L, h, W },
        answers: [ans('T', 'T', T, 'N')],
        hints: ['An ideal pulley means the tension is the same on both sides of it.', String.raw`Find the cable angle from the geometry: $\tan\theta = h/(L/2)$.`, String.raw`Vertical equilibrium of the pulley: $2T\sin\theta = W$.`],
        solution: String.raw`<ol class="steps"><li>Geometry: $\theta = \tan^{-1}\!\big(${fmt(h)}/${fmt(L / 2)}\big) = ${fmt(th)}^\circ$ below horizontal on each side.</li><li>Same tension both sides (ideal pulley). $\sum F_y=0:\ 2T\sin\theta - W = 0$</li><li>$T = \dfrac{${fmt(W)}}{2\sin${fmt(th)}^\circ} = ${q(T, 'N')}$</li></ol><p class="check">A small sag means a small angle and a huge tension. That's why power lines are left to sag.</p>`,
      };
    },
  },
  {
    id: 'u2-min-angle', title: 'Design: minimum sling angle', kind: 'numeric',
    gen(r) {
      const W = r.step(2, 30, 0.5), Tmax = +(W * r.step(0.6, 2.5, 0.1)).toFixed(2);
      const th = asind(W / (2 * Tmax));
      return {
        prompt: String.raw`A crane lifts a $${q(W, 'kN')}$ machine with a symmetric two-leg sling (both legs at the same angle $\theta$ above the horizontal). Each leg is rated for at most $${q(Tmax, 'kN')}$. What is the smallest angle $\theta$ that keeps both legs within their rating?`,
        answers: [ans('th', String.raw`\theta_{\min}`, th, '°', { rel: 0, abs: 0.5 })],
        hints: [String.raw`By symmetry both legs have the same tension $T$. Vertical balance: $2T\sin\theta = W$.`, String.raw`Set $T = T_{\max}$ and solve for $\theta$. A smaller angle would raise $T$ above the rating.`],
        solution: String.raw`<ol class="steps"><li>$\sum F_y = 0:\ 2T\sin\theta = W \Rightarrow T = \dfrac{W}{2\sin\theta}$</li><li>Require $T \le ${fmt(Tmax)}$: $\ \sin\theta \ge \dfrac{${fmt(W)}}{2(${fmt(Tmax)})} = ${fmt(W / (2 * Tmax))}$</li><li>$\theta_{\min} = ${fmt(th)}^\circ$</li></ol>`,
      };
    },
  },
  {
    id: 'u2-3d-three', title: '3D: load held by three cables', kind: 'numeric',
    gen(r) {
      let A, B, C, T;
      do {
        A = [r.int(2, 5), r.int(-1, 1), r.int(3, 7)];
        B = [r.int(-5, -1), r.int(2, 5), r.int(3, 7)];
        C = [r.int(-5, -1), r.int(-5, -2), r.int(3, 7)];
        const us = [A, B, C].map((p) => { const L = Math.hypot(...p); return p.map((v) => v / L); });
        const W = 1;
        T = solve3([[us[0][0], us[1][0], us[2][0]], [us[0][1], us[1][1], us[2][1]], [us[0][2], us[1][2], us[2][2]]], [0, 0, W]);
      } while (!T.every((t) => t > 0.08 && isFinite(t)));
      const W = r.step(200, 3000, 50);
      const Ts = T.map((t) => t * W);
      const L = [A, B, C].map((p) => Math.hypot(...p));
      return {
        prompt: String.raw`A $${q(W, 'N')}$ load hangs from point $D$ at the origin. Three cables run from $D$ up to anchors $A(${A.join(', ')})$, $B(${B.join(', ')})$ and $C(${C.join(', ')})$, all in meters, with $z$ vertical (up). Find the three cable tensions.`,
        given: { A, B, C, W },
        answers: [ans('TA', 'T_{A}', Ts[0], 'N'), ans('TB', 'T_{B}', Ts[1], 'N'), ans('TC', 'T_{C}', Ts[2], 'N')],
        hints: [String.raw`Find the unit vector from D toward each anchor: $\mathbf u = \mathbf r / |\mathbf r|$.`, String.raw`Write $T_A\mathbf u_A + T_B\mathbf u_B + T_C\mathbf u_C + (0,0,-W) = \mathbf 0$. That's three scalar equations.`, 'Solve the 3×3 system by substitution, or use the matrix solver on your calculator.'],
        solution: String.raw`<ol class="steps"><li>Lengths: $|DA| = ${fmt(L[0])}$, $|DB| = ${fmt(L[1])}$, $|DC| = ${fmt(L[2])}$ m</li><li>$\mathbf u_A = (${A.map((v) => fmt(v / L[0])).join(', ')})$, $\mathbf u_B = (${B.map((v) => fmt(v / L[1])).join(', ')})$, $\mathbf u_C = (${C.map((v) => fmt(v / L[2])).join(', ')})$</li><li>$\sum F_x$: $${fmt(A[0] / L[0])}T_A + ${par(B[0] / L[1])}T_B + ${par(C[0] / L[2])}T_C = 0$</li><li>$\sum F_y$: $${fmt(A[1] / L[0])}T_A + ${par(B[1] / L[1])}T_B + ${par(C[1] / L[2])}T_C = 0$</li><li>$\sum F_z$: $${fmt(A[2] / L[0])}T_A + ${par(B[2] / L[1])}T_B + ${par(C[2] / L[2])}T_C = ${fmt(W)}$</li><li>Solving: $T_A = ${q(Ts[0], 'N')}$, $T_B = ${q(Ts[1], 'N')}$, $T_C = ${q(Ts[2], 'N')}$</li></ol>`,
      };
    },
  },
  {
    id: 'u2-3d-missing', title: '3D: find the balancing force', kind: 'numeric',
    gen(r) {
      const F1 = [r.step(-400, 400, 10), r.step(-400, 400, 10), r.step(-400, 400, 10)];
      const F2 = [r.step(-400, 400, 10), r.step(-400, 400, 10), r.step(-400, 400, 10)];
      const F3 = F1.map((v, i) => -(v + F2[i]));
      const mag = Math.hypot(...F3);
      const vec = (v) => `(${v.map((x) => fmt(x)).join(',\\ ')})`;
      return {
        prompt: String.raw`A particle is in equilibrium under three forces. $\mathbf F_1 = ${vec(F1)}\ \text{N}$ and $\mathbf F_2 = ${vec(F2)}\ \text{N}$. Find the components of $\mathbf F_3$ and its magnitude.`,
        answers: [ans('x', 'F_{3x}', F3[0], 'N'), ans('y', 'F_{3y}', F3[1], 'N'), ans('z', 'F_{3z}', F3[2], 'N'), ans('m', 'F_3', mag, 'N')],
        hints: [String.raw`Equilibrium means $\mathbf F_1 + \mathbf F_2 + \mathbf F_3 = \mathbf 0$.`, String.raw`So $\mathbf F_3 = -(\mathbf F_1 + \mathbf F_2)$, component by component.`],
        solution: String.raw`<ol class="steps"><li>$\mathbf F_1 + \mathbf F_2 = ${vec(F1.map((v, i) => v + F2[i]))}\ \text{N}$</li><li>$\mathbf F_3 = -(\mathbf F_1+\mathbf F_2) = ${vec(F3)}\ \text{N}$</li><li>$|\mathbf F_3| = ${q(mag, 'N')}$</li></ol>`,
      };
    },
  },
  {
    id: 'u2-mc-concepts', title: 'Concept check: equilibrium & FBDs', kind: 'mc',
    gen: mcPool([
      { q: 'On a free-body diagram of a hanging ring, which force should NOT appear?', correct: 'The force the ring exerts on the cable', wrong: ['The tension of each cable pulling on the ring', 'The weight of the load hanging from the ring', 'Any applied force pushing on the ring'], why: 'An FBD shows only forces acting ON the isolated body. The ring pulling on the cable is a force on the cable, so it belongs on the cable\'s FBD.' },
      { q: 'You solve for a cable tension and get T = −250 N. What does that mean?', correct: 'The setup is wrong somewhere: a cable cannot push, so recheck the FBD and angles', wrong: ['The cable carries 250 N of compression', 'The answer is fine; signs don\'t matter for tension', 'The cable is 250 N below its rating'], why: 'Cables can only pull (tension). If the math says one must push, an angle, direction or sign was set up wrong, or that cable would go slack in reality.' },
      { q: 'A frictionless pulley has a rope wrapped over it. How do the rope tensions on the two sides compare?', correct: 'They are equal', wrong: ['The side going down is larger', 'They depend on the wrap angle', 'The side going up is larger'], why: 'With no friction (and no pulley mass or acceleration), nothing can create a difference in tension, so it is the same on both sides.' },
      { q: 'How many unknown force magnitudes can you solve for with 2D particle equilibrium alone?', correct: 'Two', wrong: ['One', 'Three', 'Six'], why: String.raw`2D particle equilibrium gives exactly two independent equations, $\sum F_x = 0$ and $\sum F_y = 0$.` },
      { q: 'A weight hangs from the middle of a rope tied between two posts. As you pull the rope tighter (less sag), the tension…', correct: 'increases without limit as the rope approaches straight', wrong: ['decreases toward zero', 'stays the same, equal to W/2', 'decreases toward W/2'], why: String.raw`$2T\sin\theta = W$, so $T = W/(2\sin\theta)$. As $\theta \to 0$, $T\to\infty$.` },
      { q: 'A block sits on a frictionless incline. Why is it convenient to put the x-axis along the incline?', correct: 'The normal force and cord force line up with the axes, so only the weight needs components', wrong: ['It makes the weight disappear from the equations', 'Equilibrium equations only hold in tilted axes', 'It changes the magnitude of the normal force'], why: 'Any orthogonal axes work, but picking them along the unknown forces keeps the algebra simple. Each equation then contains only one unknown.' },
    ]),
  },
];
function par(x) { return x < 0 ? `(${fmt(x)})` : fmt(x); }

module.exports = {
  num: 2, slug: 'particle-equilibrium', title: 'Particle Equilibrium (2D & 3D)',
  blurb: 'Free-body diagrams, ΣF = 0, cables, springs, pulleys, and three-cable supports in 3D.',
  lesson, problems,
};
