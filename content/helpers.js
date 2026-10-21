'use strict';
// Shared helpers for lesson content and problem generators.

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRng(seed) {
  const next = mulberry32(seed >>> 0);
  const r = {
    next,
    int(a, b) { return a + Math.floor(next() * (b - a + 1)); },
    // random multiple of s between a and b inclusive
    step(a, b, s) { const n = Math.round((b - a) / s); return +(a + s * Math.floor(next() * (n + 1))).toFixed(10); },
    pick(arr) { return arr[Math.floor(next() * arr.length)]; },
    shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
    sign() { return next() < 0.5 ? -1 : 1; },
  };
  return r;
}

const DEG = Math.PI / 180;
const sind = (d) => Math.sin(d * DEG);
const cosd = (d) => Math.cos(d * DEG);
const tand = (d) => Math.tan(d * DEG);
const atan2d = (y, x) => Math.atan2(y, x) / DEG;
const atand = (x) => Math.atan(x) / DEG;
const acosd = (x) => Math.acos(x) / DEG;
const asind = (x) => Math.asin(x) / DEG;
const G = 9.81;

// Format a number to `sig` significant figures without exponent noise.
function fmt(x, sig = 4) {
  if (!isFinite(x)) return String(x);
  if (Math.abs(x) < 1e-9) return '0';
  let s = Number(x.toPrecision(sig));
  // avoid "-0"
  if (Object.is(s, -0)) s = 0;
  const abs = Math.abs(s);
  if (abs >= 1e7 || abs < 1e-4) return s.toExponential(sig - 1);
  return String(s);
}
// Format with sign always (useful in sums): "+ 12.3" / "- 12.3"
function sgn(x, sig = 4) { return x < 0 ? `- ${fmt(-x, sig)}` : `+ ${fmt(x, sig)}`; }
// Wrap a negative number in parentheses for substitution: (-12.3)
function par(x, sig = 4) { return x < 0 ? `(${fmt(x, sig)})` : fmt(x, sig); }

// A numeric answer field.
function ans(key, label, value, unit, opts = {}) {
  return { key, label, value, unit: unit || '', rel: opts.rel ?? 0.02, abs: opts.abs, note: opts.note || '' };
}

// Check one numeric answer. Relative tolerance with a small absolute floor.
function checkNumeric(spec, raw) {
  const v = parseNumber(raw);
  if (v === null) return { ok: false, parsed: null };
  const target = spec.value;
  const absFloor = spec.abs !== undefined ? spec.abs
    : (Math.abs(target) < 1e-9 ? 0.01 : 0.5 * Math.pow(10, Math.floor(Math.log10(Math.abs(target))) - 2));
  const tol = Math.max(spec.rel * Math.abs(target), absFloor);
  return { ok: Math.abs(v - target) <= tol, parsed: v };
}

function parseNumber(raw) {
  if (raw === undefined || raw === null) return null;
  let s = String(raw).trim().replace(/,/g, '').replace(/\s+/g, '').replace(/[\u2212\u2013]/g, '-');
  if (s === '') return null;
  // allow forms like 1.2x10^3 or 1.2*10^3
  const m = s.match(/^([-+]?\d*\.?\d+)(?:[x*]10\^([-+]?\d+))$/i);
  if (m) return parseFloat(m[1]) * Math.pow(10, parseInt(m[2], 10));
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return null;
  const v = parseFloat(s);
  return isFinite(v) ? v : null;
}

// Multiple-choice problem built from a pool of variants. Each variant:
// { q, correct, wrong: [..], why }
function mcPool(variants) {
  return function (r) {
    const v = r.pick(variants);
    const choices = r.shuffle([{ text: v.correct, correct: true }, ...v.wrong.map((t) => ({ text: t, correct: false }))]);
    return {
      prompt: v.q,
      svg: v.svg || '',
      choices,
      hints: v.hints || ['Re-read the key idea in this unit\'s lesson, then eliminate choices that break it.'],
      solution: `<p><strong>Answer:</strong> ${v.correct}</p><p>${v.why}</p>`,
    };
  };
}

module.exports = { makeRng, DEG, sind, cosd, tand, atan2d, atand, acosd, asind, G, fmt, sgn, par, ans, checkNumeric, parseNumber, mcPool };

// Quantity for use inside KaTeX math: q(12.5,'N') -> "12.5\,\text{N}"
function q(v, unit, sig = 4) { return unit ? `${fmt(v, sig)}\\,\\text{${unit}}` : fmt(v, sig); }
module.exports.q = q;
