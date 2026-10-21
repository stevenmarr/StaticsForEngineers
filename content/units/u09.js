'use strict';
const { readMath: RM } = require('../skills');
const { fmt, q, ans, mcPool } = require('../helpers');
const S = require('../svg');
const PI = Math.PI;

// Draw shapes given in model mm (y up) scaled into a box.
function shapeSvg(parts, bounds, extra = '') {
  const [w, h] = bounds, sc = Math.min(220 / w, 160 / h), ox = 50, oy = 185;
  const X = (x) => ox + x * sc, Y = (y) => oy - y * sc;
  let out = '';
  for (const p of parts) {
    if (p.rect) { const [x, y, ww, hh] = p.rect; out += S.rect(X(x), Y(y + hh), ww * sc, hh * sc, p.hole ? 'dg-hole' : 'dg-area'); }
    if (p.circle) { const [cx, cy, r] = p.circle; out += S.circle(X(cx), Y(cy), r * sc, p.hole ? 'dg-hole' : 'dg-area'); }
    if (p.poly) out += S.poly(p.poly.map(([x, y]) => [X(x), Y(y)]), p.hole ? 'dg-hole' : 'dg-area');
    if (p.path) out += S.path(p.path(X, Y, sc), p.hole ? 'dg-hole' : 'dg-area');
  }
  out += S.arrow(ox, oy, ox + Math.min(250, w * sc + 25), oy, { cls: 'dg-ax', size: 6 }) + S.arrow(ox, oy, ox, Math.max(8, oy - h * sc - 20), { cls: 'dg-ax', size: 6 }) + S.text(ox + Math.min(250, w * sc + 25) + 8, oy, 'x', { cls: 'dg-td' }) + S.text(ox - 10, Math.max(8, oy - h * sc - 20), 'y', { cls: 'dg-td' });
  return S.svg(320, 210, out + (typeof extra === 'function' ? extra(X, Y, sc) : extra), 'composite area');
}
const tbl = (rows) => String.raw`<table class="tbl"><tr><th>Part</th><th>$A_i$ (mm²)</th><th>$\bar x_i$ (mm)</th><th>$\bar y_i$ (mm)</th><th>$\bar x_iA_i$</th><th>$\bar y_iA_i$</th></tr>${rows.map((r) => `<tr><td>${r[0]}</td><td>${fmt(r[1])}</td><td>${r[2] === null ? '-' : fmt(r[2])}</td><td>${r[3] === null ? '-' : fmt(r[3])}</td><td>${r[2] === null ? '-' : fmt(r[1] * r[2])}</td><td>${r[3] === null ? '-' : fmt(r[1] * r[3])}</td></tr>`).join('')}</table>`;

const lesson = String.raw`
<h2>Where is the "middle" of a shape?</h2>
<p>The <strong>center of gravity</strong> (CG) is the point where a body's entire weight can be treated as acting. For a uniform, flat plate it coincides with the <strong>centroid</strong> of its area, the shape's geometric center. You've already used centroids: a distributed load's resultant acts at the centroid of the load diagram (Unit 4). Centroids also decide where beams bend about (Unit 10) and whether things tip over.</p>

<h2>Definitions</h2>
$$\gl{bar}{\bar x} = \frac{\gl{int}{\int} x\,\gl{dA}{dA}}{\int dA}, \qquad \bar y = \frac{\int y\,dA}{\int dA}$$
<p>For a body made of several simple pieces, the integral turns into a weighted average:</p>
$$\bar x = \frac{\sum \bar x_i A_i}{\sum A_i}, \qquad \bar y = \frac{\sum \bar y_i A_i}{\sum A_i}$$
<p>For point masses or weights, use $m_i$ or $W_i$ in place of $A_i$.</p>
${RM([["\\bar x,\\ \\bar y", "“x-bar, y-bar”", "The coordinates of the centroid: the shape's balance point, its average position."], ["dA", "“d-A”", "One tiny piece of area."], ["\\int x\\,dA", "“the integral of x d-A”", "Cut the shape into tiny pieces, multiply each piece's area by its x-position, and add them all up. It's $\\sum x_iA_i$ with infinitely many, infinitely small pieces."], ["\\int dA", "“the integral of d-A”", "Add up all the tiny pieces: the total area $A$."], ["\\bar x_i A_i", "“x-bar-i times A-i”", "For piece $i$ of a composite shape: the x-position of its own centroid times its area."]], ["integral", "sigma"])}
<p><strong>In words:</strong> $\bar x$ = (the sum of position × area) ÷ (total area). It's a weighted average, the same as Unit 4's $\bar x$ for loads, with area in place of force. The integral is the limit of using smaller and smaller pieces. In this course you'll almost always use the composite (Σ) version with the table of standard shapes.</p>
<div class="tip"><strong>Symmetry shortcut:</strong> if a shape has an axis of symmetry, the centroid lies on it. Two axes of symmetry? The centroid is where they cross.</div>

<h2>Centroids of standard shapes</h2>
<table class="tbl"><thead><tr><th>Shape</th><th>Area</th><th>Centroid location</th></tr></thead><tbody>
<tr><td>Rectangle $b\times h$</td><td>$bh$</td><td>$b/2,\ h/2$ (center)</td></tr>
<tr><td>Triangle, base $b$, height $h$</td><td>$\tfrac12 bh$</td><td>$h/3$ above the base</td></tr>
<tr><td>Circle, radius $r$</td><td>$\pi r^2$</td><td>center</td></tr>
<tr><td>Semicircle</td><td>$\tfrac12\pi r^2$</td><td>$\dfrac{4r}{3\pi}$ from the flat edge</td></tr>
<tr><td>Quarter circle</td><td>$\tfrac14\pi r^2$</td><td>$\dfrac{4r}{3\pi}$ from each straight edge</td></tr></tbody></table>

<h2>The composite-area method</h2>
<ol><li>Choose x-y axes (often along the bottom-left edges).</li><li>Break the shape into standard pieces. <strong>Holes and cut-outs count as negative area.</strong></li><li>Make a table: $A_i$, $\bar x_i$, $\bar y_i$, $\bar x_iA_i$, $\bar y_iA_i$.</li><li>Sum the columns and divide.</li></ol>

<div class="example"><h3>Worked example 1: an L-shaped bracket</h3>
<p>An L-shape is made of a vertical leg $20 \times 100$ mm (from $x=0$ to $20$, $y=0$ to $100$) and a horizontal leg $80 \times 20$ mm (from $x=20$ to $100$, $y=0$ to $20$). Find its centroid.</p>
${shapeSvg([{ rect: [0, 0, 20, 100] }, { rect: [20, 0, 80, 20] }], [100, 100])}
${tbl([['1 (vertical)', 2000, 10, 50], ['2 (horizontal)', 1600, 60, 10]])}
<ol class="steps">
<li>$\sum A = 3600\ \text{mm}^2$, $\ \sum\bar xA = 20{,}000 + 96{,}000 = 116{,}000$, $\ \sum\bar yA = 100{,}000 + 16{,}000 = 116{,}000\ \text{mm}^3$.</li>
<li>$\bar x = 116{,}000/3600 = 32.2\ \text{mm}$, $\ \bar y = 32.2\ \text{mm}$.</li></ol>
<p class="check">The two answers match because this L happens to be symmetric about the line $y = x$. Notice the centroid ($32.2, 32.2$) isn't on the material at all. That's normal for an L.</p></div>

<div class="example"><h3>Worked example 2: plate with a hole</h3>
<p>A $200 \times 120$ mm plate has a 30 mm radius hole centered at $(150, 60)$ mm. Find $\bar x$.</p>
${shapeSvg([{ rect: [0, 0, 200, 120] }, { circle: [150, 60, 30], hole: true }], [200, 120])}
<ol class="steps">
<li>Plate: $A_1 = 24{,}000\ \text{mm}^2$ at $\bar x_1 = 100$. Hole: $A_2 = -\pi(30)^2 = -2827\ \text{mm}^2$ at $\bar x_2 = 150$.</li>
<li>$\bar x = \dfrac{24{,}000(100) - 2827(150)}{24{,}000 - 2827} = \dfrac{1{,}975{,}900}{21{,}173} = 93.3\ \text{mm}$.</li>
<li>By symmetry, $\bar y = 60\ \text{mm}$.</li></ol>
<p class="check">Removing material on the right moves the centroid left, from 100 to 93.3 mm.</p></div>

<h2>Finding a centroid by integration</h2>
<p>For a curved boundary, slice the area into thin vertical strips of width $dx$ and height $y(x)$: $dA = y\,dx$. The strip's centroid is at $(x, y/2)$, so $\bar x = \int x\,y\,dx / \int y\,dx$ and $\bar y = \int \tfrac{y}{2}\,y\,dx / \int y\,dx$. For the area under $y = h(x/a)^n$ from $0$ to $a$, this gives $\bar x = \tfrac{n+1}{n+2}a$ and $\bar y = \tfrac{n+1}{2(2n+1)}h$. Check it with $n = 1$, a straight line, so the area is a triangle with its point at the origin: $\bar x = \tfrac23 a$, which matches the triangle rule from Unit 4.</p>

<h2>Key takeaways</h2>
<ul class="takeaways"><li>Centroid = area-weighted average position.</li><li>Use symmetry whenever you can.</li><li>Holes are negative areas.</li><li>Memorize: triangle $h/3$ from the base; semicircle $4r/3\pi$ from the flat edge.</li></ul>
`;

const problems = [
  {
    id: 'u9-L', title: 'Centroid of an L-shape', kind: 'numeric',
    gen(r) {
      const t = r.step(10, 30, 5), H = r.step(60, 160, 10), B = r.step(60, 160, 10);
      const A1 = t * H, A2 = (B - t) * t, x1 = t / 2, y1 = H / 2, x2 = t + (B - t) / 2, y2 = t / 2;
      const A = A1 + A2, xb = (A1 * x1 + A2 * x2) / A, yb = (A1 * y1 + A2 * y2) / A;
      return {
        prompt: String.raw`An L-shaped plate has a vertical leg ${t} mm wide and ${H} mm tall (from $x = 0$ to ${t}, $y = 0$ to ${H}), plus a horizontal leg from $x = ${t}$ to ${B} mm and $y = 0$ to ${t} mm. Find the centroid $(\bar x, \bar y)$.`,
        svg: shapeSvg([{ rect: [0, 0, t, H] }, { rect: [t, 0, B - t, t] }], [B, H]),
        given: { t, H, B },
        answers: [ans('x', String.raw`\bar x`, xb, 'mm'), ans('y', String.raw`\bar y`, yb, 'mm')],
        hints: ['Split it into two rectangles that don\'t overlap.', 'Find each rectangle\'s area and center, then take the area-weighted average.'],
        solution: tbl([['Vertical leg', A1, x1, y1], ['Horizontal leg', A2, x2, y2]]) + String.raw`<ol class="steps"><li>$\sum A = ${fmt(A)}\ \text{mm}^2$</li><li>$\bar x = ${fmt(A1 * x1 + A2 * x2)}/${fmt(A)} = ${q(xb, 'mm')}$</li><li>$\bar y = ${fmt(A1 * y1 + A2 * y2)}/${fmt(A)} = ${q(yb, 'mm')}$</li></ol>`,
      };
    },
  },
  {
    id: 'u9-T', title: 'Centroid of a T-section', kind: 'numeric',
    gen(r) {
      const bf = r.step(80, 200, 10), tf = r.step(10, 30, 5), tw = r.step(10, 30, 5), hw = r.step(60, 200, 10);
      const Aw = tw * hw, Af = bf * tf, yw = hw / 2, yf = hw + tf / 2, A = Aw + Af, yb = (Aw * yw + Af * yf) / A;
      return {
        prompt: String.raw`A T-beam has a ${bf} × ${tf} mm flange sitting centered on top of a ${tw} mm wide, ${hw} mm tall web. How far above the bottom of the web is the centroid?`,
        svg: shapeSvg([{ rect: [(bf - tw) / 2, 0, tw, hw] }, { rect: [0, hw, bf, tf] }], [bf, hw + tf]),
        given: { bf, tf, tw, hw },
        answers: [ans('y', String.raw`\bar y`, yb, 'mm')],
        hints: ['The T is symmetric about its vertical centerline, so only ȳ needs work.', 'Web center: hw/2 above the bottom. Flange center: hw + tf/2.'],
        solution: tbl([['Web', Aw, null, yw], ['Flange', Af, null, yf]]) + String.raw`<ol class="steps"><li>$\bar y = \dfrac{${fmt(Aw)}(${fmt(yw)}) + ${fmt(Af)}(${fmt(yf)})}{${fmt(A)}} = ${q(yb, 'mm')}$</li></ol>`,
      };
    },
  },
  {
    id: 'u9-hole', title: 'Plate with a circular hole', kind: 'numeric',
    gen(r) {
      const b = r.step(100, 300, 10), h = r.step(80, 200, 10), rad = r.step(10, Math.min(b, h) / 4, 5);
      const xc = r.step(rad + 10, b - rad - 10, 5), yc = r.step(rad + 10, h - rad - 10, 5);
      const A1 = b * h, A2 = -PI * rad * rad, A = A1 + A2;
      const xb = (A1 * b / 2 + A2 * xc) / A, yb = (A1 * h / 2 + A2 * yc) / A;
      return {
        prompt: String.raw`A ${b} × ${h} mm rectangular plate (corner at the origin) has a hole of radius ${rad} mm centered at $(${xc}, ${yc})$ mm. Find $\bar x$ and $\bar y$ of the remaining area.`,
        svg: shapeSvg([{ rect: [0, 0, b, h] }, { circle: [xc, yc, rad], hole: true }], [b, h]),
        given: { b, h, rad, xc, yc },
        answers: [ans('x', String.raw`\bar x`, xb, 'mm'), ans('y', String.raw`\bar y`, yb, 'mm')],
        hints: ['Treat the hole as a negative area.', String.raw`$A_{hole} = -\pi r^2$, located at the hole's center.`],
        solution: tbl([['Plate', A1, b / 2, h / 2], ['Hole', A2, xc, yc]]) + String.raw`<ol class="steps"><li>$\sum A = ${fmt(A)}\ \text{mm}^2$</li><li>$\bar x = ${fmt(A1 * b / 2 + A2 * xc)}/${fmt(A)} = ${q(xb, 'mm')}$</li><li>$\bar y = ${fmt(A1 * h / 2 + A2 * yc)}/${fmt(A)} = ${q(yb, 'mm')}$</li></ol>`,
      };
    },
  },
  {
    id: 'u9-rect-tri', title: 'Rectangle with a triangle on top', kind: 'numeric',
    gen(r) {
      const b = r.step(60, 200, 10), h = r.step(40, 150, 10), ht = r.step(30, 150, 10);
      const A1 = b * h, A2 = 0.5 * b * ht, x1 = b / 2, y1 = h / 2, x2 = b / 3, y2 = h + ht / 3, A = A1 + A2;
      const xb = (A1 * x1 + A2 * x2) / A, yb = (A1 * y1 + A2 * y2) / A;
      return {
        prompt: String.raw`A plate is a ${b} × ${h} mm rectangle (corner at the origin) topped by a right triangle with the same ${b} mm base. The triangle's right angle is at the top-left corner of the rectangle, and its peak is ${ht} mm above the rectangle at $x = 0$. Find $\bar x$ and $\bar y$.`,
        svg: shapeSvg([{ rect: [0, 0, b, h] }, { poly: [[0, h], [b, h], [0, h + ht]] }], [b, h + ht]),
        given: { b, h, ht },
        answers: [ans('x', String.raw`\bar x`, xb, 'mm'), ans('y', String.raw`\bar y`, yb, 'mm')],
        hints: ['A triangle\'s centroid is one third of the way in from its right-angle sides.', String.raw`Triangle: $\bar x = b/3$ from the vertical edge, $\bar y = h + h_t/3$.`],
        solution: tbl([['Rectangle', A1, x1, y1], ['Triangle', A2, x2, y2]]) + String.raw`<ol class="steps"><li>$\bar x = ${fmt(A1 * x1 + A2 * x2)}/${fmt(A)} = ${q(xb, 'mm')}$</li><li>$\bar y = ${fmt(A1 * y1 + A2 * y2)}/${fmt(A)} = ${q(yb, 'mm')}$</li></ol>`,
      };
    },
  },
  {
    id: 'u9-semi', title: 'Rectangle with a semicircular top', kind: 'numeric',
    gen(r) {
      const b = r.step(40, 200, 10), h = r.step(30, 150, 10), R = b / 2;
      const A1 = b * h, A2 = (PI * R * R) / 2, y1 = h / 2, y2 = h + (4 * R) / (3 * PI), A = A1 + A2;
      const yb = (A1 * y1 + A2 * y2) / A;
      return {
        prompt: String.raw`An arch-shaped window is a ${b} mm wide, ${h} mm tall rectangle with a semicircle (diameter ${b} mm) on top. How high above the bottom edge is its centroid?`,
        svg: shapeSvg([{ rect: [0, 0, b, h] }, { path: (X, Y, sc) => `M ${X(0)} ${Y(h)} A ${R * sc} ${R * sc} 0 0 1 ${X(b)} ${Y(h)} Z` }], [b, h + R]),
        given: { b, h },
        answers: [ans('y', String.raw`\bar y`, yb, 'mm')],
        hints: ['The window is symmetric left-to-right, so you only need ȳ.', String.raw`Semicircle centroid: $4R/(3\pi)$ above its flat edge, with $R = b/2$.`],
        solution: tbl([['Rectangle', A1, null, y1], ['Semicircle', A2, null, y2]]) + String.raw`<ol class="steps"><li>$4R/(3\pi) = 4(${fmt(R)})/(3\pi) = ${fmt((4 * R) / (3 * PI))}\ \text{mm}$</li><li>$\bar y = ${fmt(A1 * y1 + A2 * y2)}/${fmt(A)} = ${q(yb, 'mm')}$</li></ol>`,
      };
    },
  },
  {
    id: 'u9-masses', title: 'Center of gravity of parts on a frame', kind: 'numeric',
    gen(r) {
      const parts = [0, 1, 2].map(() => ({ m: r.step(2, 60, 1), x: r.step(-1.5, 1.5, 0.1), y: r.step(0, 1.2, 0.1) }));
      const M = parts.reduce((s, p) => s + p.m, 0), xb = parts.reduce((s, p) => s + p.m * p.x, 0) / M, yb = parts.reduce((s, p) => s + p.m * p.y, 0) / M;
      return {
        prompt: String.raw`A robot chassis carries three components: ${parts.map((p, i) => String.raw`${['battery', 'motor', 'controller'][i]} $${fmt(p.m)}\ \text{kg}$ at $(${fmt(p.x)}, ${fmt(p.y)})\ \text{m}$`).join('; ')}. Find the center of gravity $(\bar x, \bar y)$ of these components.`,
        answers: [ans('x', String.raw`\bar x`, xb, 'm', { abs: 0.003 }), ans('y', String.raw`\bar y`, yb, 'm', { abs: 0.003 })],
        hints: ['Same formula as for areas, with masses as the weights.', String.raw`$\bar x = \sum m_ix_i/\sum m_i$.`],
        solution: String.raw`<ol class="steps"><li>$\sum m = ${fmt(M)}\ \text{kg}$</li><li>$\sum m x = ${parts.map((p) => `${fmt(p.m)}(${fmt(p.x)})`).join(' + ')} = ${fmt(xb * M)}$, so $\bar x = ${q(xb, 'm')}$</li><li>$\sum m y = ${parts.map((p) => `${fmt(p.m)}(${fmt(p.y)})`).join(' + ')} = ${fmt(yb * M)}$, so $\bar y = ${q(yb, 'm')}$</li></ol>`,
      };
    },
  },
  {
    id: 'u9-quarter', title: 'Quarter circle & spandrel', kind: 'numeric',
    gen(r) {
      const R = r.step(30, 200, 10);
      if (r.next() < 0.5) {
        const c = (4 * R) / (3 * PI);
        return {
          prompt: String.raw`A quarter-circle plate of radius ${R} mm has its square corner at the origin, with straight edges along the +x and +y axes. Find its centroid coordinate $\bar x$ (which equals $\bar y$).`,
          svg: shapeSvg([{ path: (X, Y, sc) => `M ${X(0)} ${Y(0)} L ${X(R)} ${Y(0)} A ${R * sc} ${R * sc} 0 0 0 ${X(0)} ${Y(R)} Z` }], [R, R]),
          answers: [ans('x', String.raw`\bar x`, c, 'mm')],
          hints: [String.raw`Standard result: $4r/(3\pi)$ from each straight edge.`],
          solution: String.raw`<ol class="steps"><li>$\bar x = \bar y = \dfrac{4r}{3\pi} = \dfrac{4(${R})}{3\pi} = ${q(c, 'mm')}$</li></ol>`,
        };
      }
      const xb = R / 6 / (1 - PI / 4);
      return {
        prompt: String.raw`A ${R} × ${R} mm square plate (corner at the origin) has a quarter-circle of radius ${R} mm, centered at the origin, cut away. What's left is a curved corner piece called a spandrel. Find its $\bar x$ (equal to $\bar y$ by symmetry).`,
        svg: shapeSvg([{ rect: [0, 0, R, R] }, { path: (X, Y, sc) => `M ${X(0)} ${Y(0)} L ${X(R)} ${Y(0)} A ${R * sc} ${R * sc} 0 0 0 ${X(0)} ${Y(R)} Z`, hole: true }], [R, R]),
        answers: [ans('x', String.raw`\bar x`, xb, 'mm')],
        hints: ['Square (positive) minus quarter circle (negative).', String.raw`Quarter circle: area $\pi r^2/4$, centroid at $4r/(3\pi)$.`],
        solution: String.raw`<ol class="steps"><li>Square: $A = ${fmt(R * R)}$ at $${fmt(R / 2)}$; quarter circle: $A = -${fmt(PI * R * R / 4)}$ at $${fmt(4 * R / (3 * PI))}$</li><li>$\bar x = \dfrac{${fmt(R * R)}(${fmt(R / 2)}) - ${fmt(PI * R * R / 4)}(${fmt(4 * R / (3 * PI))})}{${fmt(R * R)} - ${fmt(PI * R * R / 4)}} = ${q(xb, 'mm')}$</li><li>(In general $\bar x = 0.7766\,r$.)</li></ol>`,
      };
    },
  },
  {
    id: 'u9-integral', title: 'Centroid by integration', kind: 'numeric',
    gen(r) {
      const n = r.pick([0.5, 1, 2, 3, 4]), a = r.step(1, 6, 0.5), h = r.step(1, 6, 0.5);
      const xb = (a * (n + 1)) / (n + 2), yb = (h * (n + 1)) / (2 * (2 * n + 1));
      const curve = n === 0.5 ? String.raw`y = ${fmt(h)}\sqrt{x/${fmt(a)}}` : String.raw`y = ${fmt(h)}\,(x/${fmt(a)})^{${n}}`;
      return {
        prompt: String.raw`Find the centroid of the area bounded by the curve $${curve}$, the x-axis, and the line $x = ${fmt(a)}$ (lengths in m).`,
        given: { n, a, h },
        answers: [ans('x', String.raw`\bar x`, xb, 'm'), ans('y', String.raw`\bar y`, yb, 'm')],
        hints: [String.raw`Use vertical strips: $dA = y\,dx$, with the strip's centroid at $(x, y/2)$.`, String.raw`$A = \int_0^a y\,dx$, $\ \bar x = \frac1A\int_0^a x\,y\,dx$, $\ \bar y = \frac1A\int_0^a \frac{y^2}{2}dx$.`, String.raw`For $y = h(x/a)^n$ these give $\bar x = \tfrac{n+1}{n+2}a$ and $\bar y = \tfrac{n+1}{2(2n+1)}h$.`],
        solution: String.raw`<ol class="steps"><li>$A = \int_0^{a} h(x/a)^n dx = \dfrac{ha}{n+1} = ${fmt((h * a) / (n + 1))}\ \text{m}^2$</li><li>$\int x\,dA = \dfrac{ha^2}{n+2} \Rightarrow \bar x = \dfrac{n+1}{n+2}a = ${q(xb, 'm')}$</li><li>$\int \tfrac{y}{2}dA = \dfrac{h^2a}{2(2n+1)} \Rightarrow \bar y = \dfrac{n+1}{2(2n+1)}h = ${q(yb, 'm')}$</li></ol>`,
      };
    },
  },
  {
    id: 'u9-mc-concepts', title: 'Concept check: centroids', kind: 'mc',
    gen: mcPool([
      { q: 'A shape has a vertical axis of symmetry. Its centroid…', correct: 'lies somewhere on that axis', wrong: ['is at its lowest point', 'is always at the geometric middle of its height', 'lies outside the shape'], why: 'Every piece on one side of the axis has a mirror piece on the other, so their x-moments cancel.' },
      { q: 'How far above its base is a triangle\'s centroid?', correct: 'One third of its height', wrong: ['Half its height', 'Two thirds of its height', 'It depends on the base width'], why: 'There\'s more area near the base, so the centroid sits at h/3, low in the triangle.' },
      { q: 'When computing a centroid by the composite method, a hole is treated as…', correct: 'a negative area at the hole\'s centroid', wrong: ['zero area', 'a positive area', 'a point mass'], why: 'Subtracting the hole\'s area and its first moment removes exactly the missing material.' },
      { q: 'Can a body\'s center of gravity lie outside the material itself?', correct: 'Yes, e.g., a ring or an L-shape', wrong: ['No, never', 'Only for 3D bodies', 'Only if the body is not uniform'], why: 'The centroid is an average position. For a ring it\'s at the empty center.' },
      { q: 'For a uniform plate of constant thickness, the center of gravity coincides with…', correct: 'the centroid of its area', wrong: ['its heaviest corner', 'the point of support', 'the centroid only if the plate is square'], why: 'With uniform density and thickness, weight is proportional to area, so the weighted averages are identical.' },
    ]),
  },
];

module.exports = {
  num: 9, slug: 'centroids', title: 'Centroids & Center of Gravity',
  blurb: 'Composite areas, holes as negative areas, standard shapes, point masses and centroids by integration.',
  lesson, problems,
};
