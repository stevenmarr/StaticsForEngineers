'use strict';
// Tiny inline-SVG drawing kit for free-body diagrams, beams and trusses.
// Screen coordinates (y grows downward). Styling comes from CSS classes in app.css.

const f = (n) => Math.round(n * 10) / 10;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function svg(w, h, body, label = 'diagram') {
  return `<svg class="dg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}
function line(x1, y1, x2, y2, cls = 'dg-m') {
  return `<line class="${cls}" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`;
}
function poly(pts, cls = 'dg-m') {
  return `<polygon class="${cls}" points="${pts.map((p) => f(p[0]) + ',' + f(p[1])).join(' ')}"/>`;
}
function pline(pts, cls = 'dg-m') {
  return `<polyline class="${cls}" fill="none" points="${pts.map((p) => f(p[0]) + ',' + f(p[1])).join(' ')}"/>`;
}
function text(x, y, s, opts = {}) {
  const a = opts.anchor || 'middle';
  return `<text class="${opts.cls || 'dg-t'}" x="${f(x)}" y="${f(y)}" text-anchor="${a}" dominant-baseline="middle">${esc(s)}</text>`;
}
function head(x1, y1, x2, y2, cls, size = 9) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const a1 = ang + Math.PI * 0.85, a2 = ang - Math.PI * 0.85;
  return poly([[x2, y2], [x2 + size * Math.cos(a1), y2 + size * Math.sin(a1)], [x2 + size * Math.cos(a2), y2 + size * Math.sin(a2)]], cls + '-h');
}
// Arrow from (x1,y1) to (x2,y2); head at (x2,y2).
function arrow(x1, y1, x2, y2, opts = {}) {
  const cls = opts.cls || 'dg-f';
  const len = Math.hypot(x2 - x1, y2 - y1);
  const s = opts.size || 9;
  const ex = x2 - ((x2 - x1) / len) * s * 0.6, ey = y2 - ((y2 - y1) / len) * s * 0.6;
  let out = line(x1, y1, ex, ey, cls) + head(x1, y1, x2, y2, cls, s);
  if (opts.label) out += text(opts.lx ?? x1, opts.ly ?? y1, opts.label, { cls: opts.tcls || 'dg-tf', anchor: opts.anchor });
  return out;
}
function node(x, y, r = 4) { return `<circle class="dg-node" cx="${f(x)}" cy="${f(y)}" r="${r}"/>`; }
function hatch(x1, x2, y) {
  let out = line(x1, y, x2, y, 'dg-g');
  for (let x = x1 + 4; x <= x2; x += 7) out += line(x, y, x - 6, y + 7, 'dg-gh');
  return out;
}
function vhatch(x, y1, y2, side = -1) {
  let out = line(x, y1, x, y2, 'dg-g');
  for (let y = y1 + 4; y <= y2; y += 7) out += line(x, y, x + side * 7, y + 6, 'dg-gh');
  return out;
}
// Pin support with its apex at (x,y)
function pin(x, y) {
  return poly([[x, y], [x - 11, y + 16], [x + 11, y + 16]], 'dg-sup') + node(x, y, 3.5) + hatch(x - 16, x + 16, y + 16);
}
function roller(x, y) {
  return poly([[x, y], [x - 11, y + 13], [x + 11, y + 13]], 'dg-sup') +
    `<circle class="dg-sup" cx="${f(x - 6)}" cy="${f(y + 17)}" r="3.5"/><circle class="dg-sup" cx="${f(x + 6)}" cy="${f(y + 17)}" r="3.5"/>` + hatch(x - 16, x + 16, y + 21);
}
function wall(x, y1, y2, side = -1) { return vhatch(x, y1, y2, side); }
function beam(x1, x2, y, h = 10) {
  return `<rect class="dg-beam" x="${f(x1)}" y="${f(y - h / 2)}" width="${f(x2 - x1)}" height="${h}"/>`;
}
// Downward distributed load drawn above a beam top at yTop, between x1 and x2.
// h1,h2 = arrow heights at each end (equal for uniform loads).
function dload(x1, x2, yTop, h1, h2, label) {
  let out = '';
  const n = Math.max(3, Math.round((x2 - x1) / 22));
  for (let i = 0; i <= n; i++) {
    const x = x1 + ((x2 - x1) * i) / n;
    const h = h1 + ((h2 - h1) * i) / n;
    if (h > 3) out += arrow(x, yTop - h, x, yTop, { cls: 'dg-w', size: 6 });
  }
  out += line(x1, yTop - h1, x2, yTop - h2, 'dg-w');
  if (label) out += text((x1 + x2) / 2, yTop - Math.max(h1, h2) - 10, label, { cls: 'dg-tf' });
  return out;
}
// Horizontal dimension line with label below/above.
function dim(x1, x2, y, label) {
  return line(x1, y, x2, y, 'dg-d') + line(x1, y - 5, x1, y + 5, 'dg-d') + line(x2, y - 5, x2, y + 5, 'dg-d') + text((x1 + x2) / 2, y + 11, label, { cls: 'dg-td' });
}
function vdim(x, y1, y2, label, side = 1) {
  return line(x, y1, x, y2, 'dg-d') + line(x - 5, y1, x + 5, y1, 'dg-d') + line(x - 5, y2, x + 5, y2, 'dg-d') + text(x + side * 8, (y1 + y2) / 2, label, { cls: 'dg-td', anchor: side > 0 ? 'start' : 'end' });
}
// Angle arc at (cx,cy) from math-angle a1 to a2 (degrees, CCW, y-up convention).
function arc(cx, cy, r, a1, a2, label) {
  const p = (a) => [cx + r * Math.cos((a * Math.PI) / 180), cy - r * Math.sin((a * Math.PI) / 180)];
  const [sx, sy] = p(a1), [ex, ey] = p(a2);
  const large = Math.abs(a2 - a1) > 180 ? 1 : 0;
  const sweep = a2 > a1 ? 0 : 1;
  let out = `<path class="dg-d" fill="none" d="M ${f(sx)} ${f(sy)} A ${r} ${r} 0 ${large} ${sweep} ${f(ex)} ${f(ey)}"/>`;
  if (label) { const [lx, ly] = p((a1 + a2) / 2); out += text(lx + (lx - cx) * 0.45, ly + (ly - cy) * 0.45, label, { cls: 'dg-td' }); }
  return out;
}
// Curved moment arrow around (cx,cy). ccw=true for counterclockwise.
function moment(cx, cy, r, ccw, label) {
  const a1 = ccw ? -60 : 240, a2 = ccw ? 200 : -20;
  const p = (a) => [cx + r * Math.cos((a * Math.PI) / 180), cy - r * Math.sin((a * Math.PI) / 180)];
  const [sx, sy] = p(a1), [ex, ey] = p(a2);
  const [bx, by] = p(ccw ? a2 - 12 : a2 + 12);
  let out = `<path class="dg-f" fill="none" d="M ${f(sx)} ${f(sy)} A ${r} ${r} 0 1 ${ccw ? 0 : 1} ${f(ex)} ${f(ey)}"/>`;
  out += head(bx, by, ex, ey, 'dg-f', 8);
  if (label) out += text(cx, cy - r - 10, label, { cls: 'dg-tf' });
  return out;
}
function rect(x, y, w, h, cls = 'dg-body') { return `<rect class="${cls}" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"/>`; }
function circle(cx, cy, r, cls = 'dg-body') { return `<circle class="${cls}" cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}"/>`; }
function path(d, cls = 'dg-body') { return `<path class="${cls}" d="${d}"/>`; }
// Simple x-y axes glyph
function axes(x, y, len = 34, labels = ['x', 'y']) {
  return arrow(x, y, x + len, y, { cls: 'dg-ax', size: 6 }) + arrow(x, y, x, y - len, { cls: 'dg-ax', size: 6 }) +
    text(x + len + 8, y, labels[0], { cls: 'dg-td' }) + text(x, y - len - 8, labels[1], { cls: 'dg-td' });
}

module.exports = { svg, line, poly, pline, text, arrow, node, hatch, vhatch, pin, roller, wall, beam, dload, dim, vdim, arc, moment, rect, circle, path, axes };

// Beam diagram: spec = { L, supports:[{type:'pin'|'roller'|'fixed', x}], loads:[...], marks:[x...], unit:'m' }
// loads: {type:'point', x, label, angle?(deg from +x; default -90 = down)}, {type:'dist', x1, x2, w1, w2, label}, {type:'moment', x, ccw, label}
function beamDiagram(spec) {
  const W = 340, x0 = 35, span = 270, by = 110;
  const X = (x) => x0 + (span * x) / spec.L;
  let out = '';
  for (const s of spec.supports || []) {
    if (s.type === 'pin') out += module.exports.pin(X(s.x), by + 6);
    else if (s.type === 'roller') out += module.exports.roller(X(s.x), by + 6);
    else if (s.type === 'fixed') out += module.exports.wall(X(s.x), by - 35, by + 35, s.x === 0 ? -1 : 1);
  }
  out += module.exports.beam(X(0), X(spec.L), by, 12);
  const wmax = Math.max(1e-9, ...(spec.loads || []).filter((l) => l.type === 'dist').map((l) => Math.max(l.w1, l.w2)));
  for (const l of spec.loads || []) {
    if (l.type === 'point') {
      const a = l.angle ?? -90;
      const len = 55, tx = X(l.x), ty = by - 7;
      const sx = tx - len * Math.cos((a * Math.PI) / 180), sy = ty + len * Math.sin((a * Math.PI) / 180);
      // if force points up, start below beam
      if (Math.sin((a * Math.PI) / 180) > 0.1) out += module.exports.arrow(tx - len * Math.cos((a * Math.PI) / 180), by + 7 + len * Math.sin((a * Math.PI) / 180), tx, by + 7, { label: l.label, lx: tx + 6, ly: by + 7 + len + 8, anchor: 'start' });
      else out += module.exports.arrow(sx, sy, tx, ty, { label: l.label, lx: sx + (Math.cos((a * Math.PI) / 180) > 0.2 ? -6 : 6), ly: sy - 10 });
    } else if (l.type === 'dist') {
      out += module.exports.dload(X(l.x1), X(l.x2), by - 7, 8 + (40 * l.w1) / wmax, 8 + (40 * l.w2) / wmax, l.label);
    } else if (l.type === 'moment') {
      out += module.exports.moment(X(l.x), by, 20, l.ccw, l.label);
    }
  }
  const marks = [...new Set([0, spec.L, ...(spec.marks || [])])].sort((a, b) => a - b);
  for (let i = 0; i < marks.length - 1; i++) {
    out += module.exports.dim(X(marks[i]), X(marks[i + 1]), by + 52, `${+marks[i + 1].toFixed(3) - +marks[i].toFixed(3) > 0 ? +(marks[i + 1] - marks[i]).toFixed(3) : ''} ${spec.unit || 'm'}`);
  }
  for (const lab of spec.labels || []) out += module.exports.text(X(lab.x), by + 32, lab.text, { cls: 'dg-t' });
  return module.exports.svg(W, 180, out, spec.aria || 'beam diagram');
}
module.exports.beamDiagram = beamDiagram;

// Truss/frame diagram in model coordinates (y up). spec = { nodes:{A:[x,y],...}, members:[['A','B'],...],
//   pin:'A', roller:'C', loads:[{node:'B', dir:[0,-1], label:'P'}], dims:[{a:'A',b:'C',label:'4 m', side:'below'|'right'}] }
function trussDiagram(spec) {
  const pts = Object.values(spec.nodes);
  const minx = Math.min(...pts.map((p) => p[0])), maxx = Math.max(...pts.map((p) => p[0]));
  const miny = Math.min(...pts.map((p) => p[1])), maxy = Math.max(...pts.map((p) => p[1]));
  const W = 340, H = 220, pad = 48;
  const sc = Math.min((W - 2 * pad) / Math.max(1e-9, maxx - minx), (H - 2 * pad - 20) / Math.max(1e-9, maxy - miny));
  const ox = (W - (maxx - minx) * sc) / 2, oy = H - pad - 10;
  const P = (n) => [ox + (spec.nodes[n][0] - minx) * sc, oy - (spec.nodes[n][1] - miny) * sc];
  const M = module.exports;
  let out = '';
  for (const [a, b] of spec.members) { const [x1, y1] = P(a), [x2, y2] = P(b); out += M.line(x1, y1, x2, y2, 'dg-mem'); }
  if (spec.pin) { const [x, y] = P(spec.pin); out += M.pin(x, y + 4); }
  if (spec.roller) { const [x, y] = P(spec.roller); out += M.roller(x, y + 4); }
  for (const w of spec.walls || []) { const [x, y] = P(w); out += M.wall(x, y - 14, y + 14, -1); }
  for (const n of Object.keys(spec.nodes)) { const [x, y] = P(n); out += M.node(x, y, 4) + M.text(x - 12, y - 12, n, { cls: 'dg-t' }); }
  // Downward loads on bottom-chord nodes hang below the node (textbook style) so they never sit on top of a vertical member.
  const isHang = (l) => l.dir[0] === 0 && l.dir[1] < 0 && spec.nodes[l.node][1] === miny && l.node !== spec.pin && l.node !== spec.roller;
  const anyHang = (spec.loads || []).some(isHang);
  for (const l of spec.loads || []) {
    const [x, y] = P(l.node), len = 42, [dx, dy] = l.dir;
    if (isHang(l)) { out += M.arrow(x, y + 6, x, y + 36, { label: l.label, lx: x + 6, ly: y + 34, anchor: 'start' }); continue; }
    out += M.arrow(x - dx * len, y + dy * len, x - dx * 5, y + dy * 5, { label: l.label, lx: x - dx * (len + 12) + (dy ? 14 : 0), ly: y + dy * (len + 10), anchor: dy ? 'start' : 'middle' });
  }
  for (const d of spec.dims || []) {
    const [x1, y1] = P(d.a), [x2, y2] = P(d.b);
    if (d.side === 'right') out += M.vdim(Math.max(x1, x2) + 26, Math.min(y1, y2), Math.max(y1, y2), d.label, 1);
    else out += M.dim(Math.min(x1, x2), Math.max(x1, x2), Math.max(y1, y2) + (anyHang ? 52 : 34), d.label);
  }
  return M.svg(W, anyHang ? H + 22 : H, out, spec.aria || 'truss diagram');
}
module.exports.trussDiagram = trussDiagram;
