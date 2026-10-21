'use strict';
const { readMath: RM } = require('../skills');
const { fmt, q, ans, mcPool, sind, cosd, tand, atand, G } = require('../helpers');
const S = require('../svg');

function inclineSvg(th, labels = {}) {
  const x0 = 30, y0 = 175, L = 250;
  const x1 = x0 + L, y1 = Math.max(15, y0 - L * tand(th));
  const ang = Math.atan2(y0 - y1, x1 - x0);
  const u = [Math.cos(ang), -Math.sin(ang)], n = [-Math.sin(ang), -Math.cos(ang)];
  const c = [x0 + 0.55 * (x1 - x0), y0 + 0.55 * (y1 - y0)];
  const p = (s, t) => [c[0] + u[0] * s + n[0] * t, c[1] + u[1] * s + n[1] * t];
  let out = S.poly([[x0, y0], [x1, y0], [x1, y1]], 'dg-ground') + S.poly([p(-22, 0), p(22, 0), p(22, 30), p(-22, 30)], 'dg-body') + S.arc(x0, y0, 45, 0, (ang * 180) / Math.PI, th + '°');
  if (labels.mass) { const [tx, ty] = p(0, 15); out += S.text(tx, ty, labels.mass, { cls: 'dg-td' }); }
  return S.svg(310, 190, out, 'block on incline');
}

const lesson = String.raw`
<h2>Friction: the force that keeps things put</h2>
<p>Up to now, surfaces have been "smooth" and could only push straight out (normal force). Real surfaces also resist sliding with a <strong>friction force</strong> $F$ acting <em>along</em> the surface, opposite to the motion (or to the motion that <em>would</em> happen).</p>

<h2>Dry (Coulomb) friction</h2>
<p>Push a heavy box gently and it doesn't move. Static friction matches your push exactly. Push harder and at some point it breaks loose. That maximum is</p>
$$F_{\max} = \gl{mu}{\mu_s} N$$
<ul><li>$\mu_s$ is the <strong>coefficient of static friction</strong> (roughly 0.1 for ice, 0.3 to 0.6 for wood or metal, 0.7 to 1.0 for rubber on concrete). It has no units.</li>
<li>$N$ is the normal force, which is <strong>not always</strong> equal to the weight. Find it from equilibrium.</li>
<li>Once sliding, friction drops to $F_k = \mu_k N$, with $\mu_k$ slightly smaller than $\mu_s$.</li></ul>
${RM([["\\mu_s,\\ \\mu_k", "“mu sub s, mu sub k”", "Greek letter mu: the coefficients of static and kinetic friction. Pure numbers, with no units."], ["F_{\\max}", "“F max”", "The largest friction force the surface can supply right now."], ["F \\le \\mu_s N", "“F is less than or equal to mu-s N”", "Friction is whatever equilibrium needs, up to that limit."]], ["signs"])}
<div class="tip"><strong>The most common mistake:</strong> writing $F = \mu_s N$ when the body is <em>not</em> about to slip. $F = \mu_s N$ only holds at <strong>impending motion</strong>. Otherwise $F$ is whatever equilibrium needs, as long as $F \le \mu_s N$.</div>
<p><strong>Three kinds of problem:</strong> (1) Is it in equilibrium? Assume it is, solve for $F$ and $N$, then check $F \le \mu_s N$. (2) It's about to slip: set $F = \mu_s N$ and solve for the unknown force or angle. (3) It might slip <em>or</em> tip: check both and see which happens first.</p>

<div class="tip"><strong>Why $W\cos\theta$ into the ramp and $W\sin\theta$ down it?</strong> Tilt your axes so x runs along the ramp. The weight points straight down, and the angle between it and the ramp's normal equals the ramp angle $\theta$ (two angles whose sides are perpendicular are equal). So the part pushing into the ramp is adjacent: $W\cos\theta$. The part pulling down the slope is opposite: $W\sin\theta$. Sanity check: on a flat floor ($\theta = 0$) the whole weight pushes in and none pulls along the surface.</div>
<div class="example"><h3>Worked example 1: block on a ramp</h3>
<p>A 200 N crate sits on a 25° ramp with $\mu_s = 0.40$. (a) Does it stay put by itself? (b) What force $P$ parallel to the ramp prevents sliding? (c) What force $P$ up the ramp starts it moving up?</p>
${inclineSvg(25, { mass: '200 N' })}
<ol class="steps">
<li>Axes along and perpendicular to the ramp: $N = W\cos25^\circ = 181.3\ \text{N}$; the weight component down the slope is $W\sin25^\circ = 84.5\ \text{N}$.</li>
<li>(a) Friction available: $\mu_s N = 0.40(181.3) = 72.5\ \text{N} < 84.5\ \text{N}$. Not enough, so <strong>it slides</strong>. (Quick test: it slides if $\tan\theta > \mu_s$; here $\tan25^\circ = 0.466 > 0.40$.)</li>
<li>(b) About to slide <em>down</em>: friction acts up the slope. $P + 0.40N - W\sin25^\circ = 0 \Rightarrow P = 84.5 - 72.5 = 12.0\ \text{N}$.</li>
<li>(c) About to slide <em>up</em>: friction now acts down the slope. $P - W\sin25^\circ - 0.40N = 0 \Rightarrow P = 84.5 + 72.5 = 157.0\ \text{N}$.</li></ol>
<p class="check">Any $P$ between 12 N and 157 N holds the crate still. Friction adjusts itself anywhere within that range.</p></div>

<h2>Angle of friction and angle of repose</h2>
<p>A block on a ramp is about to slide when $\tan\theta = \mu_s$. The <strong>angle of repose</strong> $\theta = \tan^{-1}\mu_s$ is the steepest slope it can rest on. The same angle, $\phi_s = \tan^{-1}\mu_s$, is the angle between the total contact force and the normal.</p>
${RM([["\\tan^{-1}\\mu_s", "“inverse tangent of mu-s”", "The angle whose tangent is $\\mu_s$. For example, $\\tan^{-1}0.40 = 21.8^\\circ$."], ["\\phi_s", "“phi sub s”", "Greek letter phi: the angle of friction."]], ["invtrig"])}

<h2>Slipping vs. tipping</h2>
<p>Push a tall box near the top and it may tip over before it slides. Compute the force needed for each and take the smaller one:</p>
<ul><li>Slip: $P = \mu_s W$ (horizontal push on level ground).</li><li>Tip: at impending tip the whole normal force moves to the front edge. Moments about that edge: $P\,h_P = W\,(b/2)$.</li></ul>

<h2>Wedges</h2>
<p>A wedge turns a small push into a large lifting or splitting force. Analyze it like any friction problem: an FBD for the wedge and one for the load, with friction at <em>every</em> sliding surface at impending motion, directed against the relative slip. For a wedge of angle $\alpha$ driven horizontally under a block that can only move vertically (with friction $\mu$ on the floor and on the sloped face), the result is</p>
$$P = W\left[\mu + \tan(\alpha + \phi)\right], \qquad \phi = \tan^{-1}\mu$$

<h2>Belt friction</h2>
<p>A rope wrapped around a post can hold a huge load with a small pull. If the rope is about to slip, the tensions on the two sides are related by</p>
$$T_2 = T_1\,e^{\mu\beta}$$
<p>where $T_2 > T_1$, $\mu$ is the friction coefficient, and $\beta$ is the wrap angle <strong>in radians</strong> (one full turn is $2\pi$).</p>
${RM([["e^{\\mu\\beta}", "“e to the mu beta”", "$e \\approx 2.718$ raised to the power $\\mu\\beta$ (use the $e^x$ key). It grows very fast as the wrap angle increases."], ["\\beta", "“beta”", "The wrap angle in radians: degrees × π/180. Half a turn is π ≈ 3.14 and a full turn is 2π."]], [])}
<div class="example"><h3>Worked example 2: rope around a post</h3>
<p>A sailor holds a $500\ \text{N}$ load with a rope wrapped halfway around a post ($\beta = \pi$), $\mu = 0.30$. What pull is needed?</p>
<ol class="steps"><li>$e^{\mu\beta} = e^{0.30\pi} = 2.566$.</li><li>$T_1 = T_2 / e^{\mu\beta} = 500/2.566 = 194.8\ \text{N}$.</li><li>With 1.5 turns ($\beta = 3\pi$): $e^{0.9\pi} = 16.9$, so only $29.6\ \text{N}$. Extra wraps help enormously.</li></ol></div>

<h2>Key takeaways</h2>
<ul class="takeaways"><li>$F \le \mu_s N$ always. $F = \mu_s N$ only at impending motion.</li><li>Friction opposes the (impending) relative sliding.</li><li>Find $N$ from equilibrium. Don't assume it equals the weight.</li><li>Check tipping vs. slipping for tall objects.</li><li>Belt friction: $T_2 = T_1 e^{\mu\beta}$, with $\beta$ in radians.</li></ul>
`;

const problems = [
  {
    id: 'u8-push-floor', title: 'Force to start a crate sliding', kind: 'numeric',
    gen(r) {
      const m = r.step(10, 300, 5), mu = r.step(0.2, 0.8, 0.05), W = m * G;
      if (r.next() < 0.5) {
        const P = mu * W;
        return {
          prompt: String.raw`A $${q(m, 'kg')}$ crate rests on a level floor ($\mu_s = ${fmt(mu)}$). What horizontal push will just start it sliding?`,
          answers: [ans('P', 'P', P, 'N')],
          hints: [String.raw`On level ground with a horizontal push, $N = W = mg$.`, String.raw`At impending motion, $P = F = \mu_s N$.`],
          solution: String.raw`<ol class="steps"><li>$N = W = ${fmt(m)}(9.81) = ${fmt(W)}\ \text{N}$</li><li>$P = \mu_s N = ${fmt(mu)}(${fmt(W)}) = ${q(P, 'N')}$</li></ol>`,
        };
      }
      const th = r.step(15, 40, 5);
      const P = (mu * W) / (cosd(th) + mu * sind(th));
      return {
        prompt: String.raw`A $${q(m, 'kg')}$ crate rests on a level floor ($\mu_s = ${fmt(mu)}$). You pull it with a rope angled $${th}^\circ$ above the horizontal. What rope tension will just start it sliding?`,
        answers: [ans('P', 'P', P, 'N')],
        hints: [String.raw`Pulling upward reduces the normal force: $N = W - P\sin${th}^\circ$.`, String.raw`At impending slip: $P\cos${th}^\circ = \mu_s N = \mu_s(W - P\sin${th}^\circ)$.`],
        solution: String.raw`<ol class="steps"><li>$\sum F_y = 0:\ N = ${fmt(W)} - P\sin${th}^\circ$</li><li>$\sum F_x = 0$ (impending): $P\cos${th}^\circ = ${fmt(mu)}N$</li><li>$P = \dfrac{\mu_s W}{\cos${th}^\circ + \mu_s\sin${th}^\circ} = ${q(P, 'N')}$</li></ol><p class="check">Slightly less than $\mu_s W = ${fmt(mu * W)}\ \text{N}$, because lifting a little reduces N.</p>`,
      };
    },
  },
  {
    id: 'u8-hold', title: 'Friction on a block that does NOT slip', kind: 'numeric',
    gen(r) {
      let th, mu;
      do { th = r.step(10, 35, 5); mu = r.step(0.3, 0.9, 0.05); } while (tand(th) >= mu * 0.95);
      const W = r.step(50, 800, 10), F = W * sind(th), N = W * cosd(th);
      return {
        prompt: String.raw`A $${q(W, 'N')}$ block rests on a ${th}° ramp with $\mu_s = ${fmt(mu)}$, and nothing else touches it. Find the friction force and the normal force acting on it.`,
        svg: inclineSvg(th, { mass: fmt(W) + ' N' }),
        answers: [ans('F', 'F', F, 'N'), ans('N', 'N', N, 'N')],
        hints: [String.raw`First check whether it slips: compare $\tan${th}^\circ$ with $\mu_s$.`, String.raw`It doesn't slip, so friction is whatever equilibrium needs, <strong>not</strong> $\mu_s N$.`, String.raw`Along the ramp: $F = W\sin\theta$. Perpendicular: $N = W\cos\theta$.`],
        solution: String.raw`<ol class="steps"><li>$\tan${th}^\circ = ${fmt(tand(th))} < \mu_s = ${fmt(mu)}$, so the block stays put.</li><li>$N = W\cos${th}^\circ = ${q(N, 'N')}$</li><li>$F = W\sin${th}^\circ = ${q(F, 'N')}$ (up the slope)</li><li>Check: $F_{\max} = \mu_s N = ${fmt(mu * N)}\ \text{N} > ${fmt(F)}$ ✓</li></ol>`,
      };
    },
  },
  {
    id: 'u8-incline-up', title: 'Push a block up a rough ramp', kind: 'numeric',
    gen(r) {
      const W = r.step(50, 1000, 10), th = r.step(10, 45, 5), mu = r.step(0.15, 0.6, 0.05);
      const P = W * (sind(th) + mu * cosd(th));
      return {
        prompt: String.raw`What force $P$, parallel to a ${th}° ramp, is needed to start a $${q(W, 'N')}$ box moving <strong>up</strong> the ramp? ($\mu_s = ${fmt(mu)}$)`,
        svg: inclineSvg(th, { mass: fmt(W) + ' N' }),
        given: { W, th, mu },
        answers: [ans('P', 'P', P, 'N')],
        hints: ['If the box is about to move up, which way does friction point?', String.raw`Friction points down the slope with $F = \mu_s N$, and $N = W\cos\theta$.`, String.raw`Along the slope: $P = W\sin\theta + \mu_s W\cos\theta$.`],
        solution: String.raw`<ol class="steps"><li>$N = ${fmt(W)}\cos${th}^\circ = ${fmt(W * cosd(th))}\ \text{N}$</li><li>Impending motion up, so friction points down the slope: $F = ${fmt(mu)}N = ${fmt(mu * W * cosd(th))}\ \text{N}$</li><li>$P = W\sin${th}^\circ + F = ${fmt(W * sind(th))} + ${fmt(mu * W * cosd(th))} = ${q(P, 'N')}$</li></ol>`,
      };
    },
  },
  {
    id: 'u8-incline-hold', title: 'Keep a block from sliding down', kind: 'numeric',
    gen(r) {
      let th, mu;
      do { th = r.step(25, 55, 5); mu = r.step(0.1, 0.5, 0.05); } while (tand(th) <= mu * 1.1);
      const W = r.step(50, 1000, 10), P = W * (sind(th) - mu * cosd(th));
      return {
        prompt: String.raw`A $${q(W, 'N')}$ box is on a ${th}° ramp with $\mu_s = ${fmt(mu)}$. It would slide down on its own. What is the minimum force $P$, parallel to the ramp and pushing up the slope, that keeps it from sliding?`,
        svg: inclineSvg(th, { mass: fmt(W) + ' N' }),
        given: { W, th, mu },
        answers: [ans('P', 'P', P, 'N')],
        hints: ['At the minimum P, the box is on the verge of sliding DOWN.', String.raw`So friction points UP the slope with $F = \mu_s N$, helping P.`, String.raw`$P = W\sin\theta - \mu_s W\cos\theta$.`],
        solution: String.raw`<ol class="steps"><li>$N = W\cos${th}^\circ = ${fmt(W * cosd(th))}\ \text{N}$</li><li>Impending slide down, so friction points up the slope: $F = ${fmt(mu * W * cosd(th))}\ \text{N}$</li><li>$P = W\sin${th}^\circ - F = ${fmt(W * sind(th))} - ${fmt(mu * W * cosd(th))} = ${q(P, 'N')}$</li></ol>`,
      };
    },
  },
  {
    id: 'u8-repose', title: 'Angle of repose / measuring μ', kind: 'numeric',
    gen(r) {
      if (r.next() < 0.5) {
        const mu = r.step(0.15, 1.0, 0.05), th = atand(mu);
        return {
          prompt: String.raw`Gravel has an effective coefficient of static friction $\mu_s = ${fmt(mu)}$ against itself. What is the steepest slope angle (angle of repose) a gravel pile can hold?`,
          answers: [ans('th', String.raw`\theta`, th, '°', { rel: 0, abs: 0.5 })],
          hints: [String.raw`At impending slip on a slope: $W\sin\theta = \mu_s W\cos\theta$.`, String.raw`So $\tan\theta = \mu_s$.`],
          solution: String.raw`<ol class="steps"><li>$\tan\theta = \mu_s \Rightarrow \theta = \tan^{-1}(${fmt(mu)}) = ${fmt(th)}^\circ$</li></ol>`,
        };
      }
      const th = r.step(8, 40, 1), mu = tand(th);
      return {
        prompt: String.raw`To measure friction, you slowly tilt a board with a phone resting on it. The phone starts to slide when the board reaches $${th}^\circ$. What is $\mu_s$ between the phone and the board?`,
        answers: [ans('mu', String.raw`\mu_s`, mu, '')],
        hints: [String.raw`Just before sliding, friction is at its maximum: $\mu_s N = W\sin\theta$, with $N = W\cos\theta$.`],
        solution: String.raw`<ol class="steps"><li>$\mu_s = \tan\theta = \tan${th}^\circ = ${fmt(mu)}$</li></ol>`,
      };
    },
  },
  {
    id: 'u8-tip', title: 'Slip or tip?', kind: 'numeric',
    gen(r) {
      const W = r.step(100, 1500, 50), b = r.step(0.3, 1.2, 0.1), hP = r.step(0.4, 2, 0.1), mu = r.step(0.2, 0.8, 0.05);
      const Pslip = mu * W, Ptip = (W * b) / (2 * hP), P = Math.min(Pslip, Ptip);
      const slips = Pslip < Ptip;
      return {
        prompt: String.raw`A uniform cabinet weighing $${q(W, 'N')}$ is $${q(b, 'm')}$ wide. You push it horizontally at a height of $${q(hP, 'm')}$ above the floor ($\mu_s = ${fmt(mu)}$). What push makes it start to move (slide or tip, whichever comes first)? Give that force.`,
        svg: (() => { const sc = 130 / Math.max(hP * 1.15, 1.2), Hc = Math.max(hP * 1.15, 1.2) * sc, py = 170 - hP * sc, wpx = Math.min(120, b * sc); return S.svg(260, 200, S.hatch(20, 240, 170) + S.rect(100, 170 - Hc, wpx, Hc) + S.arrow(30, py, 98, py, { label: 'P', lx: 30, ly: py - 12 }) + S.vdim(80, py, 170, 'h', -1) + S.dim(100, 100 + wpx, 184, 'b') + S.text(100 + wpx / 2, 170 - Hc / 2, 'W', { cls: 'dg-td' })); })(),
        given: { W, b, hP, mu },
        answers: [ans('P', 'P', P, 'N')],
        hints: [String.raw`Slip needs $P = \mu_s W$.`, String.raw`Tipping about the far bottom edge needs $P\,h = W\,(b/2)$.`, 'Whichever needs the smaller force happens first.'],
        solution: String.raw`<ol class="steps"><li>Slip: $P_{slip} = ${fmt(mu)}(${fmt(W)}) = ${fmt(Pslip)}\ \text{N}$</li><li>Tip: $P_{tip} = \dfrac{W b}{2h} = \dfrac{${fmt(W)}(${fmt(b)})}{2(${fmt(hP)})} = ${fmt(Ptip)}\ \text{N}$</li><li>The smaller one wins: the cabinet <strong>${slips ? 'slides' : 'tips'}</strong> first, at $P = ${q(P, 'N')}$.</li></ol>`,
      };
    },
  },
  {
    id: 'u8-ladder', title: 'Ladder against a smooth wall', kind: 'numeric',
    gen(r) {
      const mu = r.step(0.2, 0.7, 0.05), th = atand(1 / (2 * mu));
      return {
        prompt: String.raw`A uniform ladder leans against a smooth (frictionless) wall. The floor has $\mu_s = ${fmt(mu)}$. What is the smallest angle $\theta$ between the ladder and the floor at which the ladder will not slip?`,
        svg: S.svg(240, 200, S.hatch(20, 220, 180) + S.wall(200, 20, 180, 1) + S.line(80, 180, 200, 40, 'dg-mem') + S.arc(80, 180, 30, 0, atand(140 / 120), 'θ') + S.node(140, 110) + S.text(150, 115, 'W', { anchor: 'start', cls: 'dg-td' }), 'ladder'),
        given: { mu },
        answers: [ans('th', String.raw`\theta_{\min}`, th, '°', { rel: 0, abs: 0.5 })],
        hints: [String.raw`Smooth wall: only a horizontal force $N_w$ there. Floor: $N_f$ up and friction $F$ toward the wall.`, String.raw`$\sum F_y$: $N_f = W$. $\ \sum F_x$: $F = N_w$. Moments about the foot: $N_w L\sin\theta = W\tfrac{L}{2}\cos\theta$.`, String.raw`At impending slip $F = \mu_s W$, which leads to $\tan\theta = 1/(2\mu_s)$.`],
        solution: String.raw`<ol class="steps"><li>$\sum F_y = 0:\ N_f = W$; $\ \sum F_x = 0:\ F = N_w$</li><li>$\sum M_{\text{foot}} = 0:\ N_w L\sin\theta = W\tfrac L2\cos\theta \Rightarrow N_w = \dfrac{W}{2\tan\theta}$</li><li>Impending slip: $F = \mu_s W \Rightarrow \dfrac{1}{2\tan\theta} = \mu_s \Rightarrow \tan\theta = \dfrac{1}{2(${fmt(mu)})} = ${fmt(1 / (2 * mu))}$</li><li>$\theta_{\min} = ${fmt(th)}^\circ$. Any steeper and the ladder is safe.</li></ol>`,
      };
    },
  },
  {
    id: 'u8-wedge', title: 'Lifting with a wedge', kind: 'numeric',
    gen(r) {
      const W = r.step(1, 20, 0.5), al = r.step(5, 20, 1), mu = r.step(0.1, 0.4, 0.05);
      const phi = atand(mu), P = W * (mu + tand(al + phi));
      return {
        prompt: String.raw`A ${al}° wedge is driven horizontally under a machine base to lift it. The base carries $${q(W, 'kN')}$ and is guided so it can only move vertically (smooth guides). The coefficient of friction is $\mu = ${fmt(mu)}$ on both the floor and the sloped face. Neglecting the wedge's weight, what horizontal force $P$ starts the lift?`,
        svg: (() => { const t = tand(al), top = 130 - 180 * t, yb = 130 - 90 * t; return S.svg(300, 150, S.hatch(20, 280, 130) + S.poly([[60, 130], [240, 130], [60, top]], 'dg-body') + S.rect(150, 25, 80, yb - 25, 'dg-body') + S.line(146, 10, 146, yb - 4, 'dg-g') + S.line(234, 10, 234, yb - 4, 'dg-g') + S.arrow(10, 120, 56, 120, { label: 'P', lx: 20, ly: 106 }) + S.text(190, 18, 'W', { cls: 'dg-td' }) + S.arc(240, 130, 60, 180 - al, 180, al + '°'), 'wedge'); })(),
        given: { W, al, mu },
        answers: [ans('P', 'P', P, 'kN')],
        hints: ['Two FBDs: the block (W, the guide force, and N₁ plus friction from the wedge) and the wedge (P, the reaction from the block, and N₂ plus friction from the floor).', String.raw`The block moves up relative to the wedge, so friction on the block points down along the sloped face. Block vertical: $N_1(\cos\alpha - \mu\sin\alpha) = W$.`, String.raw`Wedge: $N_2 = W$ and $P = \mu N_2 + N_1(\sin\alpha + \mu\cos\alpha)$. This simplifies to $P = W[\mu + \tan(\alpha+\phi)]$.`],
        solution: String.raw`<ol class="steps"><li>Block, $\sum F_y$: $N_1\cos\alpha - \mu N_1\sin\alpha = W \Rightarrow N_1 = \dfrac{${fmt(W)}}{\cos${al}^\circ - ${fmt(mu)}\sin${al}^\circ} = ${fmt(W / (cosd(al) - mu * sind(al)))}\ \text{kN}$</li><li>Wedge, $\sum F_y$: $N_2 = N_1(\cos\alpha - \mu\sin\alpha) = W = ${fmt(W)}\ \text{kN}$</li><li>Wedge, $\sum F_x$: $P = \mu N_2 + N_1(\sin\alpha + \mu\cos\alpha) = ${fmt(mu * W)} + ${fmt((W / (cosd(al) - mu * sind(al))) * (sind(al) + mu * cosd(al)))}$</li><li>$P = ${q(P, 'kN')}$ (same as $W[\mu + \tan(\alpha + \phi)]$ with $\phi = ${fmt(phi)}^\circ$)</li></ol>`,
      };
    },
  },
  {
    id: 'u8-belt', title: 'Rope wrapped around a post', kind: 'numeric',
    gen(r) {
      const T2 = r.step(200, 5000, 50), mu = r.step(0.15, 0.5, 0.05), turns = r.pick([0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3]);
      const beta = 2 * Math.PI * turns, T1 = T2 / Math.exp(mu * beta);
      return {
        prompt: String.raw`A rope is wrapped ${turns} turn${turns === 1 ? '' : 's'} around a fixed post ($\mu = ${fmt(mu)}$). One end holds a $${q(T2, 'N')}$ load. What is the smallest pull on the other end that keeps the load from slipping?`,
        answers: [ans('T1', 'T_1', T1, 'N')],
        hints: [String.raw`$T_2 = T_1 e^{\mu\beta}$, where $T_2$ is the larger tension (the load side).`, String.raw`$\beta$ must be in radians: $\beta = 2\pi\times(\text{turns})$.`],
        solution: String.raw`<ol class="steps"><li>$\beta = 2\pi(${turns}) = ${fmt(beta)}\ \text{rad}$</li><li>$e^{\mu\beta} = e^{${fmt(mu)}\times${fmt(beta)}} = ${fmt(Math.exp(mu * beta))}$</li><li>$T_1 = ${fmt(T2)}/${fmt(Math.exp(mu * beta))} = ${q(T1, 'N')}$</li></ol>`,
      };
    },
  },
  {
    id: 'u8-mc-concepts', title: 'Concept check: friction', kind: 'mc',
    gen: mcPool([
      { q: 'A 100 N box sits on a level floor with μs = 0.5. You push it horizontally with 20 N and it doesn\'t move. The friction force is…', correct: '20 N', wrong: ['50 N', '0 N', '70 N'], why: 'Friction only supplies what equilibrium needs, up to the limit μsN = 50 N. Here that\'s 20 N.' },
      { q: 'For dry (Coulomb) friction, the maximum friction force depends on…', correct: 'the normal force and the coefficient of friction, not on contact area', wrong: ['the contact area', 'the speed you push with', 'the weight only, even on a slope'], why: String.raw`$F_{\max} = \mu_s N$. Surprisingly, a box on its narrow side needs the same push as on its wide side.` },
      { q: 'Which way does friction act on a block that is about to slide down a ramp?', correct: 'Up the ramp', wrong: ['Down the ramp', 'Perpendicular to the ramp', 'Straight up'], why: 'Friction opposes the impending relative motion, which here is down the slope.' },
      { q: 'Wrapping a rope one more full turn around a post (μ = 0.3) multiplies the holding ratio T₂/T₁ by about…', correct: '6.6', wrong: ['2', '1.3', '0.3'], why: String.raw`An extra $2\pi$ radians multiplies the ratio by $e^{0.3\times2\pi} = e^{1.885} \approx 6.6$.` },
      { q: 'A tall, narrow box is pushed horizontally near its top. Compared with pushing near the bottom, it is more likely to…', correct: 'tip over before it slides', wrong: ['slide more easily', 'need more force to slide', 'behave exactly the same'], why: String.raw`The tipping force is $P = Wb/(2h)$, which gets smaller as the push height $h$ increases. The slip force $\mu_s W$ stays the same.` },
      { q: 'You pull a sled with a rope angled upward instead of horizontally. The normal force from the snow…', correct: 'decreases', wrong: ['increases', 'stays equal to the weight', 'becomes zero'], why: 'The rope\'s upward component carries some of the weight, so the ground pushes up less, and there\'s less friction to overcome.' },
    ]),
  },
];

module.exports = {
  num: 8, slug: 'friction', title: 'Friction: Dry, Wedges & Belts',
  blurb: 'Static vs. impending friction, ramps, slip vs. tip, ladders, wedges and rope-on-post (belt) friction.',
  lesson, problems,
};
