'use strict';
const { readMath: RM } = require('../skills');
const { fmt, q, ans, mcPool, sind, cosd } = require('../helpers');
const S = require('../svg');
const par = (x) => (x < 0 ? `(${fmt(x)})` : fmt(x));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const vec = (v) => `(${v.map((x) => fmt(x)).join(',\\ ')})`;
const dir = (M) => (M > 0 ? 'counterclockwise' : 'clockwise');

const lesson = String.raw`
<h2>Forces can make things turn</h2>
<p>Push on a door near the hinge and it barely moves. Push near the handle and it swings easily. A force's turning effect is its <strong>moment</strong> (also called torque). From here on, bodies are no longer points, so we have to keep track of turning as well as pushing.</p>

<h2>1. Scalar moment: force × perpendicular distance</h2>
$$\gl{moment}{M_O} = F\,d$$
<p>Here $d$ is the <strong>perpendicular</strong> distance from point $O$ to the force's <em>line of action</em> (the infinite line the force lies on). It is <em>not</em> just the distance to where the force is applied. Units are N·m (or lb·ft).</p>
${RM([["M_O", "“M sub O” or “the moment about O”", "The turning effect about point O. The subscript names the pivot point; choose a different point and the moment changes."], ["d", "“d”, the moment arm", "The <em>perpendicular</em> (shortest) distance from O to the force's line of action."], ["\\text{N·m}", "“newton-meters”", "Force times distance. The dot means multiply."]], ["signs"])}
<p><strong>Sign convention (2D):</strong> counterclockwise (CCW) is positive, clockwise (CW) is negative. This matches the right-hand rule with $+z$ out of the page.</p>
${S.svg(300, 160, S.beam(40, 260, 90, 12) + S.node(60, 90, 5) + S.text(60, 112, 'O') + S.arrow(240, 30, 240, 84, { label: 'F', lx: 252, ly: 40, anchor: 'start' }) + S.dim(60, 240, 135, 'd') + S.moment(60, 90, 22, false, 'M = −Fd (CW)'), 'moment of a force')}

<h2>2. Varignon's theorem: use components</h2>
<p>Finding the perpendicular distance can be awkward. Instead, split the force into components and add the moment of each one. For a force applied at $(x, y)$ relative to $O$:</p>
$$M_O = x\,F_y - y\,F_x$$
<p>This one formula takes care of the signs for you. It is the 2D version of the cross product below.</p>
<p><strong>Where it comes from.</strong> Treat the two components separately. $F_y$ acts at a horizontal distance $x$ from O; when both are positive it turns the body counterclockwise, so it contributes $+xF_y$. $F_x$ acts at height $y$; pushing right at a point above O turns the body clockwise, so it contributes $-yF_x$. Add the two and you have the formula. Plug in the coordinates and components <em>with their signs</em>, and it gets every quadrant right with no picture-checking.</p>

<div class="example"><h3>Worked example 1: moment using components</h3>
<p>A $400\ \text{N}$ force acts at point $A(2, 3)\ \text{m}$, directed $30^\circ$ above the +x axis. Find its moment about the origin $O$.</p>
${S.svg(300, 200, S.axes(40, 170, 220) + S.node(40, 170) + S.text(30, 182, 'O') + S.node(110, 65) + S.text(98, 56, 'A(2,3)') + S.arrow(110, 65, 110 + 80 * cosd(30), 65 - 80 * sind(30), { label: '400 N', lx: 200, ly: 20 }) + S.arc(110, 65, 26, 0, 30, '30°') + S.line(110, 65, 150, 65, 'dg-d'), 'Varignon example')}
<ol class="steps">
<li>Components: $F_x = 400\cos30^\circ = 346.4\ \text{N}$, $F_y = 400\sin30^\circ = 200\ \text{N}$.</li>
<li>$M_O = xF_y - yF_x = (2)(200) - (3)(346.4) = 400 - 1039.2 = -639.2\ \text{N·m}$.</li>
<li>Negative means clockwise: $M_O = 639\ \text{N·m}$ CW.</li></ol>
<p class="check">Picture it: $F_x$ acts high up (y = 3) pushing right, which tends to turn the body clockwise about O. It beats the counterclockwise effect of $F_y$.</p></div>

<h2>3. The vector moment: $\mathbf M_O = \mathbf r \times \mathbf F$</h2>
<p>In 3D, the moment is a vector. $\mathbf r$ goes from $O$ to <em>any</em> point on the line of action of $\mathbf F$:</p>
$$\mathbf M_O = \mathbf r\gl{cross}{\times}\mathbf F = \begin{vmatrix}\mathbf i & \mathbf j & \mathbf k\\ r_x & r_y & r_z\\ F_x & F_y & F_z\end{vmatrix} = (r_yF_z - r_zF_y)\,\mathbf i + (r_zF_x - r_xF_z)\,\mathbf j + (r_xF_y - r_yF_x)\,\mathbf k$$
<p>The direction of $\mathbf M_O$ is the axis the force tries to turn the body about (right-hand rule). Order matters: $\mathbf r\times\mathbf F = -\mathbf F\times\mathbf r$.</p>
${RM([["\\mathbf r\\times\\mathbf F", "“r cross F”", "The cross product: a new vector perpendicular to both $\\mathbf r$ and $\\mathbf F$. Its size is $rF\\sin\\theta$, which is exactly force × perpendicular distance."], ["\\begin{vmatrix} \\cdots \\end{vmatrix}", "“the determinant of …”", "Straight bars around a grid mean “compute the determinant”. Here it is a bookkeeping pattern for the cross product, not an absolute value."], ["r_x,\\ F_z", "“r sub x, F sub z”", "The components of $\\mathbf r$ and $\\mathbf F$."]], ["cross"])}
<p><strong>Expanding the determinant, one component at a time.</strong> For each unit vector in the top row, cover its column and take the 2×2 determinant of what's left (top-left × bottom-right minus top-right × bottom-left). For $\mathbf i$, cover column 1: $\begin{vmatrix} r_y & r_z\\ F_y & F_z\end{vmatrix} = r_yF_z - r_zF_y$. For $\mathbf j$, cover column 2 and <strong>flip the sign</strong>; that's why the formula shows $r_zF_x - r_xF_z$. For $\mathbf k$, cover column 3: $r_xF_y - r_yF_x$, the same as the 2D formula in Section 2. Memory aid: the subscripts cycle x → y → z → x. For the direction, curl the fingers of your right hand from $\mathbf r$ toward $\mathbf F$; your thumb points along $\mathbf M_O$.</p>

<h2>4. Moment about an axis</h2>
<p>A wrench turning a bolt, or a door on its hinges, can only rotate about one axis. The part of the moment that matters is its component along that axis, with unit vector $\mathbf u_a$:</p>
$$M_a = \mathbf u_a\gl{dot}{\cdot}(\mathbf r\times\mathbf F)$$
${RM([["\\mathbf u_a\\cdot(\\mathbf r\\times\\mathbf F)", "“u-a dot, r cross F”", "Do the bracket first (the cross product, a vector), then dot it with the axis direction (which gives a number): the part of the moment that turns the body about axis $a$."]], ["dot", "cross"])}

<div class="example"><h3>Worked example 2: cross product and moment about an axis</h3>
<p>$\mathbf F = (30, -20, 50)\ \text{N}$ acts at $\mathbf r = (1, 2, 0)\ \text{m}$ from $O$. Find $\mathbf M_O$, then the moment about an axis through $O$ along $\mathbf u = (0.6, 0.8, 0)$.</p>
<ol class="steps">
<li>$M_x = r_yF_z - r_zF_y = (2)(50) - (0)(-20) = 100\ \text{N·m}$</li>
<li>$M_y = r_zF_x - r_xF_z = (0)(30) - (1)(50) = -50\ \text{N·m}$</li>
<li>$M_z = r_xF_y - r_yF_x = (1)(-20) - (2)(30) = -80\ \text{N·m}$</li>
<li>$\mathbf M_O = (100, -50, -80)\ \text{N·m}$</li>
<li>$M_a = \mathbf u\cdot\mathbf M_O = 0.6(100) + 0.8(-50) + 0 = 20\ \text{N·m}$</li></ol></div>

<h2>5. Couples</h2>
<p>A <strong>couple</strong> is two forces that are equal in size, opposite in direction, and not on the same line. Their net force is zero, but they still produce a turning effect:</p>
$$M = F\,d \quad (d = \text{perpendicular distance between the two lines of action})$$
<p>A couple moment is the <strong>same about every point</strong>. It is a "free vector": you can slide it anywhere on the body without changing its effect. Turning a steering wheel with both hands is a couple.</p>

<h2>Key takeaways</h2>
<ul class="takeaways"><li>$M = Fd$ with $d$ measured perpendicular to the line of action. CCW is +.</li><li>Components are usually easiest: $M_O = xF_y - yF_x$.</li><li>3D: $\mathbf M_O = \mathbf r\times\mathbf F$; about an axis, $M_a = \mathbf u_a\cdot(\mathbf r\times\mathbf F)$.</li><li>A couple has zero net force and the same moment about every point.</li></ul>
`;

const problems = [
  {
    id: 'u3-perp', title: 'Moment of a perpendicular force', kind: 'numeric',
    gen(r) {
      const F = r.step(20, 800, 10), d = r.step(0.1, 3, 0.05);
      const up = r.next() < 0.5, right = r.next() < 0.5;
      // force vertical at horizontal distance d: M = x*Fy
      const x = right ? d : -d, Fy = up ? F : -F, M = x * Fy;
      const ox = 150, px = ox + (right ? 100 : -100);
      return {
        prompt: String.raw`A ${up ? 'vertical upward' : 'vertical downward'} force of $${q(F, 'N')}$ acts on a horizontal bar at a point $${q(d, 'm')}$ to the ${right ? 'right' : 'left'} of pivot $O$. Find the moment about $O$ (CCW positive).`,
        svg: S.svg(300, 150, S.beam(30, 270, 80, 10) + S.node(ox, 80, 5) + S.text(ox, 100, 'O') + (up ? S.arrow(px, 136, px, 86, { label: 'F', lx: px + 12, ly: 125, anchor: 'start' }) : S.arrow(px, 24, px, 74, { label: 'F', lx: px + 12, ly: 30, anchor: 'start' })) + S.dim(Math.min(ox, px), Math.max(ox, px), 118, 'd'), 'bar with force'),
        answers: [ans('M', 'M_O', M, 'N·m')],
        hints: [String.raw`Magnitude: $M = Fd$, since the force is already perpendicular to the bar.`, 'For the sign, imagine the force pushing the bar. Does the bar turn counterclockwise (+) or clockwise (−) about O?'],
        solution: String.raw`<ol class="steps"><li>$|M_O| = Fd = ${fmt(F)}(${fmt(d)}) = ${fmt(Math.abs(M))}\ \text{N·m}$</li><li>A ${up ? 'upward' : 'downward'} force to the ${right ? 'right' : 'left'} of O turns the bar ${dir(M)}, so $M_O = ${q(M, 'N·m')}$.</li></ol><p class="check">Check with $M_O = xF_y$: $(${fmt(x)})(${fmt(Fy)}) = ${fmt(M)}$ ✓</p>`,
      };
    },
  },
  {
    id: 'u3-wrench', title: 'Wrench with an angled push', kind: 'numeric',
    gen(r) {
      const F = r.step(50, 400, 10), L = r.step(0.15, 0.6, 0.05), th = r.step(20, 85, 5);
      const M = F * L * sind(th);
      return {
        prompt: String.raw`You pull on the end of a wrench handle $${q(L, 'm')}$ long with $${q(F, 'N')}$. The force makes $${th}^\circ$ with the handle. What torque (moment magnitude) do you apply to the bolt?`,
        svg: S.svg(300, 160, S.circle(50, 110, 14, 'dg-sup') + S.beam(50, 250, 110, 12) + S.arrow(250, 110, 250 - 70 * cosd(th), 110 - 70 * sind(th), { label: 'F', lx: 250 - 82 * cosd(th), ly: 110 - 82 * sind(th) }) + S.arc(250, 110, 24, 180 - th, 180, th + '°') + S.dim(50, 250, 145, 'L'), 'wrench'),
        answers: [ans('M', 'M', M, 'N·m')],
        hints: ['Only the part of the force perpendicular to the handle turns the bolt.', String.raw`Perpendicular component $= F\sin\theta$, so $M = F L\sin\theta$. Same result as $F$ times the perpendicular distance $L\sin\theta$.`],
        solution: String.raw`<ol class="steps"><li>$F_\perp = F\sin${th}^\circ = ${fmt(F * sind(th))}\ \text{N}$</li><li>$M = F_\perp L = ${fmt(F * sind(th))}(${fmt(L)}) = ${q(M, 'N·m')}$</li></ol>`,
      };
    },
  },
  {
    id: 'u3-varignon', title: "Moment by components (Varignon)", kind: 'numeric',
    gen(r) {
      const x = r.step(-4, 4, 0.5), y = r.step(-4, 4, 0.5), F = r.step(100, 900, 10), th = r.step(0, 345, 15);
      const Fx = F * cosd(th), Fy = F * sind(th), M = x * Fy - y * Fx;
      if (Math.abs(M) < 20 || (x === 0 && y === 0)) return problems[2].gen(r);
      return {
        prompt: String.raw`A force $F = ${q(F, 'N')}$ directed at $${th}^\circ$ (CCW from +x) acts at point $A(${fmt(x)}, ${fmt(y)})\ \text{m}$. Find its moment about the origin (CCW positive).`,
        given: { x, y, F, th },
        answers: [ans('M', 'M_O', M, 'N·m')],
        hints: [String.raw`Split $F$ into $F_x = F\cos\theta$ and $F_y = F\sin\theta$.`, String.raw`$M_O = xF_y - yF_x$. Keep every sign.`],
        solution: String.raw`<ol class="steps"><li>$F_x = ${fmt(F)}\cos${th}^\circ = ${fmt(Fx)}\ \text{N}$, $\ F_y = ${fmt(F)}\sin${th}^\circ = ${fmt(Fy)}\ \text{N}$</li><li>$M_O = xF_y - yF_x = (${fmt(x)})(${fmt(Fy)}) - (${fmt(y)})(${fmt(Fx)})$</li><li>$M_O = ${q(M, 'N·m')}$ (${dir(M)})</li></ol>`,
      };
    },
  },
  {
    id: 'u3-about-point', title: 'Moment about a point other than the origin', kind: 'numeric',
    gen(r) {
      const A = [r.step(-3, 3, 0.5), r.step(-3, 3, 0.5)], B = [r.step(-3, 3, 0.5), r.step(-3, 3, 0.5)];
      const Fx = r.step(-500, 500, 25), Fy = r.step(-500, 500, 25);
      const rx = A[0] - B[0], ry = A[1] - B[1], M = rx * Fy - ry * Fx;
      if (Math.abs(M) < 20) return problems[3].gen(r);
      return {
        prompt: String.raw`A force $\mathbf F = (${fmt(Fx)},\ ${fmt(Fy)})\ \text{N}$ acts at $A(${fmt(A[0])}, ${fmt(A[1])})\ \text{m}$. Find its moment about point $B(${fmt(B[0])}, ${fmt(B[1])})\ \text{m}$ (CCW positive).`,
        answers: [ans('M', 'M_B', M, 'N·m')],
        hints: [String.raw`Use the position of A <em>relative to B</em>: $\mathbf r_{BA} = A - B$.`, String.raw`$M_B = r_xF_y - r_yF_x$ with $\mathbf r = \mathbf r_{BA}$.`],
        solution: String.raw`<ol class="steps"><li>$\mathbf r_{BA} = (${fmt(A[0])} - ${par(B[0])},\ ${fmt(A[1])} - ${par(B[1])}) = (${fmt(rx)}, ${fmt(ry)})\ \text{m}$</li><li>$M_B = (${fmt(rx)})(${fmt(Fy)}) - (${fmt(ry)})(${fmt(Fx)}) = ${q(M, 'N·m')}$</li></ol>`,
      };
    },
  },
  {
    id: 'u3-cross', title: '3D moment: r × F', kind: 'numeric',
    gen(r) {
      const rv = [r.int(-4, 4), r.int(-4, 4), r.int(-4, 4)], F = [r.step(-60, 60, 5), r.step(-60, 60, 5), r.step(-60, 60, 5)];
      const M = cross(rv, F);
      if (M.every((m) => m === 0)) return problems[4].gen(r);
      return {
        prompt: String.raw`$\mathbf F = ${vec(F)}\ \text{N}$ acts at a point with position $\mathbf r = ${vec(rv)}\ \text{m}$ relative to $O$. Compute $\mathbf M_O = \mathbf r\times\mathbf F$.`,
        given: { r: rv, F },
        answers: [ans('Mx', 'M_x', M[0], 'N·m'), ans('My', 'M_y', M[1], 'N·m'), ans('Mz', 'M_z', M[2], 'N·m')],
        hints: [String.raw`Set up the determinant with rows $\mathbf i\ \mathbf j\ \mathbf k$, then $\mathbf r$, then $\mathbf F$.`, String.raw`$M_x = r_yF_z - r_zF_y$, $\ M_y = r_zF_x - r_xF_z$, $\ M_z = r_xF_y - r_yF_x$.`, 'Watch the middle (j) term. Students most often get its sign wrong.'],
        solution: String.raw`<ol class="steps"><li>$M_x = (${rv[1]})(${fmt(F[2])}) - (${rv[2]})(${fmt(F[1])}) = ${fmt(M[0])}$</li><li>$M_y = (${rv[2]})(${fmt(F[0])}) - (${rv[0]})(${fmt(F[2])}) = ${fmt(M[1])}$</li><li>$M_z = (${rv[0]})(${fmt(F[1])}) - (${rv[1]})(${fmt(F[0])}) = ${fmt(M[2])}$</li><li>$\mathbf M_O = ${vec(M)}\ \text{N·m}$</li></ol>`,
      };
    },
  },
  {
    id: 'u3-axis', title: 'Moment about an axis', kind: 'numeric',
    gen(r) {
      const rv = [r.int(-3, 3), r.int(-3, 3), r.int(-3, 3)], F = [r.step(-80, 80, 10), r.step(-80, 80, 10), r.step(-80, 80, 10)];
      const axes = [{ u: [1, 0, 0], name: 'the x-axis' }, { u: [0, 1, 0], name: 'the y-axis' }, { u: [0, 0, 1], name: 'the z-axis' }, { u: [0.6, 0.8, 0], name: String.raw`the axis through $O$ along $\mathbf u = (0.6, 0.8, 0)$` }, { u: [0, 0.6, 0.8], name: String.raw`the axis through $O$ along $\mathbf u = (0, 0.6, 0.8)$` }, { u: [0.8, 0, -0.6], name: String.raw`the axis through $O$ along $\mathbf u = (0.8, 0, -0.6)$` }];
      const ax = r.pick(axes);
      const M = cross(rv, F), Ma = M[0] * ax.u[0] + M[1] * ax.u[1] + M[2] * ax.u[2];
      if (Math.abs(Ma) < 5) return problems[5].gen(r);
      return {
        prompt: String.raw`$\mathbf F = ${vec(F)}\ \text{N}$ acts at $\mathbf r = ${vec(rv)}\ \text{m}$ from $O$. Find the moment of $\mathbf F$ about ${ax.name}.`,
        answers: [ans('Ma', 'M_a', Ma, 'N·m')],
        hints: [String.raw`First find $\mathbf M_O = \mathbf r\times\mathbf F$.`, String.raw`Then project onto the axis: $M_a = \mathbf u\cdot\mathbf M_O$.`],
        solution: String.raw`<ol class="steps"><li>$\mathbf M_O = \mathbf r\times\mathbf F = ${vec(M)}\ \text{N·m}$</li><li>$M_a = \mathbf u\cdot\mathbf M_O = ${ax.u.map((u, i) => `(${fmt(u)})(${fmt(M[i])})`).join(' + ')} = ${q(Ma, 'N·m')}$</li></ol>`,
      };
    },
  },
  {
    id: 'u3-couple', title: 'Couple moment', kind: 'numeric',
    gen(r) {
      const F = r.step(10, 500, 5), d = r.step(0.1, 1.5, 0.05), ccw = r.next() < 0.5;
      const M = (ccw ? 1 : -1) * F * d;
      return {
        prompt: String.raw`Two hands turn a steering wheel of diameter $${q(d, 'm')}$. One pushes ${ccw ? 'up' : 'down'} on the right side of the rim, the other pushes ${ccw ? 'down' : 'up'} on the left side, each with $${q(F, 'N')}$. What couple moment do they apply (CCW positive, viewed from the driver's seat)?`,
        svg: S.svg(260, 180, S.circle(130, 90, 60, 'dg-body') + S.node(130, 90) + (ccw ? S.arrow(190, 120, 190, 60, { label: 'F', lx: 205, ly: 70, anchor: 'start' }) + S.arrow(70, 60, 70, 120, { label: 'F', lx: 55, ly: 110, anchor: 'end' }) : S.arrow(190, 60, 190, 120, { label: 'F', lx: 205, ly: 110, anchor: 'start' }) + S.arrow(70, 120, 70, 60, { label: 'F', lx: 55, ly: 70, anchor: 'end' })) + S.dim(70, 190, 165, 'd'), 'steering wheel couple'),
        answers: [ans('M', 'M', M, 'N·m')],
        hints: [String.raw`Two equal and opposite parallel forces make a couple: $M = Fd$, with $d$ the distance between their lines of action.`, 'The sign comes from the turning direction those forces produce.'],
        solution: String.raw`<ol class="steps"><li>$|M| = Fd = ${fmt(F)}(${fmt(d)}) = ${fmt(Math.abs(M))}\ \text{N·m}$</li><li>${ccw ? 'Up on the right and down on the left turn the wheel counterclockwise' : 'Down on the right and up on the left turn the wheel clockwise'}, so $M = ${q(M, 'N·m')}$.</li></ol><p class="check">The net force is zero, but the turning effect isn't. That's exactly what a couple is.</p>`,
      };
    },
  },
  {
    id: 'u3-balance', title: 'Balancing moments on a lever', kind: 'numeric',
    gen(r) {
      const W = r.step(100, 2000, 50), a = r.step(0.2, 1.2, 0.1), b = r.step(1, 3, 0.1);
      const P = (W * a) / b;
      return {
        prompt: String.raw`A crowbar pivots on a rock. A $${q(W, 'N')}$ load presses down on the short end, $${q(a, 'm')}$ from the pivot. How large a downward force $P$ at the long end, $${q(b, 'm')}$ from the pivot, is needed to hold the bar level?`,
        svg: S.svg(300, 150, S.beam(30, 280, 70, 10) + S.poly([[100, 76], [88, 100], [112, 100]], 'dg-sup') + S.hatch(70, 130, 100) + S.arrow(40, 15, 40, 64, { label: 'W', lx: 52, ly: 20, anchor: 'start' }) + S.arrow(270, 15, 270, 64, { label: 'P', lx: 258, ly: 20, anchor: 'end' }) + S.dim(40, 100, 122, 'a') + S.dim(100, 270, 122, 'b'), 'lever'),
        answers: [ans('P', 'P', P, 'N')],
        hints: ['Take moments about the pivot. The pivot force then drops out of the equation.', String.raw`$W a$ (one direction) must equal $P b$ (the other).`],
        solution: String.raw`<ol class="steps"><li>$\sum M_{\text{pivot}} = 0:\ W a - P b = 0$</li><li>$P = \dfrac{W a}{b} = \dfrac{${fmt(W)}(${fmt(a)})}{${fmt(b)}} = ${q(P, 'N')}$</li></ol><p class="check">Mechanical advantage $= b/a = ${fmt(b / a)}$.</p>`,
      };
    },
  },
  {
    id: 'u3-net', title: 'Net moment of several loads', kind: 'numeric',
    gen(r) {
      const n = 3;
      const fs = Array.from({ length: n }, () => ({ x: r.step(-3, 3, 0.5), F: r.step(50, 600, 25) * r.sign() }));
      const C = r.step(-400, 400, 25);
      const M = fs.reduce((s, f) => s + f.x * f.F, 0) + C;
      return {
        prompt: String.raw`A horizontal beam is pinned at $O$ (x = 0). Vertical forces act on it: ${fs.map((f) => String.raw`$${q(Math.abs(f.F), 'N')}$ ${f.F > 0 ? 'up' : 'down'} at $x = ${fmt(f.x)}\ \text{m}$`).join('; ')}. A couple of $${q(Math.abs(C), 'N·m')}$ ${C >= 0 ? 'counterclockwise' : 'clockwise'} also acts. Find the net moment about $O$ (CCW positive).`,
        answers: [ans('M', String.raw`\sum M_O`, M, 'N·m')],
        hints: [String.raw`For each vertical force, $M = xF_y$ (with $F_y$ positive when the force is up and $x$ negative to the left).`, 'Add the couple as-is. A couple has the same moment about every point.'],
        solution: String.raw`<ol class="steps">${fs.map((f) => `<li>$(${fmt(f.x)})(${fmt(f.F)}) = ${fmt(f.x * f.F)}\\ \\text{N·m}$</li>`).join('')}<li>Couple: $${fmt(C)}\ \text{N·m}$</li><li>$\sum M_O = ${q(M, 'N·m')}$</li></ol>`,
      };
    },
  },
  {
    id: 'u3-mc-concepts', title: 'Concept check: moments & couples', kind: 'mc',
    gen: mcPool([
      { q: 'A couple moment of 50 N·m acts on a plate. What is its moment about a point 2 m away from it?', correct: '50 N·m, the same as about any other point', wrong: ['100 N·m', '25 N·m', 'Zero'], why: 'A couple is a free vector. Its two forces cancel, so moving the reference point adds and subtracts the same amount, leaving the moment unchanged.' },
      { q: 'To get the largest moment about a bolt from a given force at the end of a wrench, the force should be…', correct: 'perpendicular to the wrench handle', wrong: ['parallel to the handle, pulling outward', 'at 45° to the handle', 'pointed at the bolt'], why: String.raw`$M = FL\sin\theta$ is largest at $\theta = 90^\circ$. A force along the handle, or pointed at the bolt, passes through the axis and makes zero moment.` },
      { q: String.raw`Which is equal to $\mathbf r\times\mathbf F$?`, correct: String.raw`$-\mathbf F\times\mathbf r$`, wrong: [String.raw`$\mathbf F\times\mathbf r$`, String.raw`$\mathbf r\cdot\mathbf F$`, String.raw`$|\mathbf r||\mathbf F|$`], why: 'The cross product is anti-commutative: swapping the order flips the sign.' },
      { q: 'A force\'s line of action passes directly through point O. Its moment about O is…', correct: 'zero', wrong: ['F times the distance to where it is applied', 'equal to F', 'impossible to determine'], why: 'The perpendicular distance from O to the line of action is zero, so M = F·0 = 0.' },
      { q: 'In the standard 2D convention, a negative moment means…', correct: 'clockwise rotation tendency', wrong: ['counterclockwise rotation tendency', 'the force is pointing left', 'the body is not in equilibrium'], why: 'With +z out of the page, the right-hand rule makes counterclockwise positive and clockwise negative.' },
      { q: 'What are the SI units of moment?', correct: 'N·m', wrong: ['N/m', 'N', 'kg·m'], why: 'Moment = force × distance, so newtons times meters.' },
    ]),
  },
];

module.exports = {
  num: 3, slug: 'moments', title: 'Moments & Couples',
  blurb: 'Moment of a force, Varignon\'s theorem, r × F in 3D, moment about an axis, and couples.',
  lesson, problems,
};
