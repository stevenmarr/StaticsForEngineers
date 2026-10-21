'use strict';
// Small drawing helpers shared by the math-toolkit lessons and problems.
const S = require('../svg');
const { cosd, sind } = require('../helpers');

// Right triangle: angle θ at bottom-left, right angle at bottom-right.
// labels: { adj, opp, hyp, ang } (any may be '' to hide); w,h = leg lengths in px.
function rightTri(labels = {}, w = 200, h = 120, opts = {}) {
  const x0 = 40, y0 = 30 + h, x1 = x0 + w, y1 = 30;
  let o = S.poly([[x0, y0], [x1, y0], [x1, y1]], 'dg-area');
  o += S.pline([[x1 - 12, y0], [x1 - 12, y0 - 12], [x1, y0 - 12]], 'dg-d');
  const ang = Math.atan2(h, w) * 180 / Math.PI;
  if (labels.ang) o += S.arc(x0, y0, 30, 0, ang, labels.ang);
  if (labels.adj) o += S.text((x0 + x1) / 2, y0 + 16, labels.adj, { cls: opts.hl === 'adj' ? 'dg-tf' : 'dg-t' });
  if (labels.opp) o += S.text(x1 + 10, (y0 + y1) / 2, labels.opp, { cls: opts.hl === 'opp' ? 'dg-tf' : 'dg-t', anchor: 'start' });
  if (labels.hyp) o += S.text((x0 + x1) / 2 - 14, (y0 + y1) / 2 - 12, labels.hyp, { cls: opts.hl === 'hyp' ? 'dg-tf' : 'dg-t', anchor: 'end' });
  return S.svg(w + 110, h + 70, o, opts.aria || 'right triangle');
}

// x-y plane with optional vectors [{x,y,label,cls}] in data units; scale px per unit.
function plane(vectors, scale = 20, R = 110, opts = {}) {
  const c = R + 20;
  let o = S.line(c - R, c, c + R, c, 'dg-ax') + S.line(c, c + R, c, c - R, 'dg-ax');
  o += S.text(c + R + 8, c, 'x', { cls: 'dg-td' }) + S.text(c, c - R - 10, 'y', { cls: 'dg-td' });
  if (opts.quadrants) {
    o += S.text(c + R / 2, c - R / 2, 'I', { cls: 'dg-td' }) + S.text(c - R / 2, c - R / 2, 'II', { cls: 'dg-td' });
    o += S.text(c - R / 2, c + R / 2, 'III', { cls: 'dg-td' }) + S.text(c + R / 2, c + R / 2, 'IV', { cls: 'dg-td' });
  }
  for (const v of vectors) {
    const x2 = c + v.x * scale, y2 = c - v.y * scale;
    const L = Math.hypot(v.x, v.y) || 1;
    o += S.arrow(v.ox !== undefined ? c + v.ox * scale : c, v.oy !== undefined ? c - v.oy * scale : c, x2, y2, { cls: v.cls || 'dg-f', label: v.label, lx: x2 + (v.x / L) * 14, ly: y2 - (v.y / L) * 14 });
    if (v.dash) o += S.line(x2, y2, x2, c, 'dg-d') + S.line(x2, y2, c, y2, 'dg-d');
  }
  if (opts.angle !== undefined) o += S.arc(c, c, 26, 0, opts.angle, opts.angleLabel || 'θ');
  return S.svg(2 * c, 2 * c, o, opts.aria || 'x-y plane');
}

// Area under a straight line from (0,y1) to (L,y2), drawn as a load/area diagram.
function areaUnder(y1, y2, opts = {}) {
  const W = 260, H = 120, x0 = 40, base = 150, k = H / Math.max(y1, y2, 1e-9);
  let o = S.poly([[x0, base], [x0, base - y1 * k], [x0 + W, base - y2 * k], [x0 + W, base]], 'dg-area');
  o += S.line(x0 - 10, base, x0 + W + 16, base, 'dg-ax') + S.line(x0, base + 10, x0, base - H - 16, 'dg-ax');
  if (opts.strips) {
    const n = opts.strips;
    for (let i = 1; i < n; i++) { const x = x0 + (W * i) / n; o += S.line(x, base, x, base - (y1 + (y2 - y1) * i / n) * k, 'dg-d'); }
  }
  if (opts.l1) o += S.text(x0 - 6, base - y1 * k, opts.l1, { cls: 'dg-td', anchor: 'end' });
  if (opts.l2) o += S.text(x0 + W + 6, base - y2 * k - 8, opts.l2, { cls: 'dg-td', anchor: 'start' });
  if (opts.L) o += S.dim(x0, x0 + W, base + 18, opts.L);
  return S.svg(W + 110, 200, o, opts.aria || 'area under a line');
}

module.exports = { rightTri, plane, areaUnder, cosd, sind };
