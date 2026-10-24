'use strict';
// Responsive farm photos: <picture> with WebP + JPG srcsets, intrinsic size, lazy by default.
const fs = require('fs');
const path = require('path');
const config = require('./config');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'img', 'farm', 'manifest.json'), 'utf8'));
const B = config.basePath;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ALT = {
  'goat-talk': 'A teenager leans in nose-to-nose with a baby Nubian goat in the pasture. Caption: “Leave me alone, I’m only talking to my goat today.”',
  'nubian-brown': 'A brown Nubian goat with curved horns and long floppy ears standing on sandy ground, pine trees behind.',
  'white-grazing': 'A white Nubian goat with black spots grazing in tall green grass.',
  'black-kid': 'A black Nubian kid with a white blaze looking straight at the camera.',
  'two-kids': 'Two Nubian kids, one white and one black-and-white, meeting nose to nose in their pen.',
  'white-profile': 'A white Nubian with brown markings and swept-back horns, in profile.',
  'banner-grazing': '', // decorative background
  'banner-twins': 'Two Nubian kids in their pen at Sandy Boots Farm.',
  'avatar-clove': 'Clove, a brown Nubian doe', 'avatar-pepper': 'Pepper, a black Nubian kid', 'avatar-twins': 'The Twins, two Nubian kids',
  'avatar-captain': 'Captain, a horned white Nubian', 'avatar-juniper': 'Juniper, a white Nubian grazing',
};

function src(name, w, ext) { return `${B}/static/img/farm/${name}-${w}.${ext}`; }
function largestUnder(name, px) { const ws = manifest[name].w.slice().sort((a, b) => a - b); return ws.find((w) => w >= px) || ws[ws.length - 1]; }

/**
 * pic('two-kids', { sizes: '(max-width: 760px) 100vw, 480px', cls: 'x', eager: false, alt })
 */
function pic(name, opts = {}) {
  const m = manifest[name];
  if (!m) return '';
  const ws = m.w.slice().sort((a, b) => a - b);
  const set = (ext) => ws.map((w) => `${src(name, w, ext)} ${w}w`).join(', ');
  const fw = opts.fallback || largestUnder(name, opts.fallbackWidth || 800);
  const h = Math.round(fw / m.ratio);
  const alt = opts.alt !== undefined ? opts.alt : ALT[name] || '';
  const sizes = opts.sizes || '100vw';
  return `<picture class="${esc(opts.cls || '')}"><source type="image/webp" srcset="${set('webp')}" sizes="${esc(sizes)}"><img src="${src(name, fw, 'jpg')}" srcset="${set('jpg')}" sizes="${esc(sizes)}" width="${fw}" height="${h}" alt="${esc(alt)}" ${opts.eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async"${alt ? '' : ' aria-hidden="true"'}></picture>`;
}
// Small round character portrait.
function avatar(name, px = 64, cls = '') {
  return pic(name, { sizes: `${px}px`, cls: `avatar ${cls}`, fallback: px > 160 ? 320 : 160, alt: ALT[name] });
}

module.exports = { pic, avatar, ALT, manifest };
