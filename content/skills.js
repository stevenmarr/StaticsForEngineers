'use strict';
// Math-readiness skills: the registry, which statics units/problem types rely on each skill,
// and the symbol glossary used for hover/tap tooltips and "Reading the math" boxes.

const skills = [
  { key: 'trig', slug: 'right-triangle-trig', title: 'Right-triangle trig (SOH-CAH-TOA)', short: 'Right-triangle trig', blurb: 'Sine, cosine and tangent as side ratios; finding missing sides and angles.' },
  { key: 'invtrig', slug: 'inverse-trig-quadrants', title: 'Inverse trig & angle quadrants', short: 'Inverse trig & quadrants', blurb: 'What sin⁻¹, cos⁻¹, tan⁻¹ return, why the calculator can lie, and atan2-style reasoning.' },
  { key: 'lawsc', slug: 'law-of-sines-cosines', title: 'Law of sines & law of cosines', short: 'Law of sines & cosines', blurb: 'Solving triangles that have no right angle, such as force triangles.' },
  { key: 'vectors', slug: 'vectors', title: 'Vectors: components, magnitude, unit vectors', short: 'Vectors', blurb: 'Arrows as number lists: î ĵ k̂ notation, length, direction and adding vectors.' },
  { key: 'sigma', slug: 'summation-notation', title: 'Summation (Σ) & index notation', short: 'Summation (Σ) notation', blurb: 'Reading ΣF_x = 0, sums over i, subscripts, and weighted averages.' },
  { key: 'linsys', slug: 'linear-systems', title: 'Solving 2×2 and 3×3 linear systems', short: 'Linear systems', blurb: 'Substitution and elimination for the equations every free-body diagram produces.' },
  { key: 'dot', slug: 'dot-product', title: 'The dot product', short: 'Dot product', blurb: 'A·B: angles between lines and the part of a force along a direction.' },
  { key: 'cross', slug: 'cross-product', title: 'The cross product & determinants', short: 'Cross product & determinants', blurb: 'A×B, 2×2 and 3×3 determinants and the right-hand rule, used for moments in 3D.' },
  { key: 'signs', slug: 'sign-conventions', title: 'Sign conventions & coordinate systems', short: 'Sign conventions', blurb: 'Choosing axes, + and − directions, CCW-positive moments and what a negative answer means.' },
  { key: 'integral', slug: 'integrals-as-sums', title: 'Integrals as continuous sums (no calculus needed)', short: 'Integrals as sums', blurb: 'Areas under lines and triangles, strips, and reading ∫ as "add up infinitely many tiny pieces".' },
];
skills.forEach((s, i) => { s.num = i + 1; });
const byKey = new Map(skills.map((s) => [s.key, s]));
const bySlug = new Map(skills.map((s) => [s.slug, s]));

// Skills each statics unit relies on, most important first.
const unitSkills = {
  1: ['trig', 'invtrig', 'vectors', 'lawsc', 'dot'],
  2: ['sigma', 'linsys', 'trig', 'vectors'],
  3: ['signs', 'cross', 'sigma', 'dot'],
  4: ['integral', 'sigma', 'signs'],
  5: ['sigma', 'linsys', 'signs'],
  6: ['linsys', 'sigma', 'signs', 'trig'],
  7: ['linsys', 'signs', 'sigma'],
  8: ['trig', 'signs', 'linsys'],
  9: ['sigma', 'integral'],
  10: ['integral', 'sigma'],
};

// Finer-grained map for individual problem types (anything not listed inherits its unit's first two skills).
const typeSkills = {
  // Concept checks test physical ideas, not a math skill: no brush-up nudge on them.
  'u1-mc-concepts': [], 'u2-mc-concepts': [], 'u3-mc-concepts': [], 'u4-mc-concepts': [], 'u5-mc-concepts': [], 'u6-mc-zero': [], 'u6-mc-concepts': [], 'u7-mc-twoforce': [], 'u7-mc-concepts': [], 'u8-mc-concepts': [], 'u9-mc-concepts': [], 'u10-mc-concepts': [],
  'u1-weight': ['signs'], 'u1-components': ['trig', 'signs'], 'u1-slope': ['trig', 'signs'], 'u1-resultant2': ['trig', 'invtrig', 'sigma'],
  'u1-resultant3': ['trig', 'invtrig', 'sigma'], 'u1-3d-cable': ['vectors'], 'u1-dir-angles': ['vectors', 'invtrig'], 'u1-dot': ['dot', 'vectors'],
  'u2-two-cables': ['sigma', 'linsys', 'trig'], 'u2-pull-aside': ['sigma', 'trig'], 'u2-incline': ['signs', 'trig'], 'u2-spring': ['sigma', 'trig'],
  'u2-pulley': ['sigma', 'trig'], 'u2-min-angle': ['trig', 'invtrig'], 'u2-3d-three': ['vectors', 'linsys'], 'u2-3d-missing': ['vectors', 'sigma'],
  'u3-perp': ['signs'], 'u3-wrench': ['trig'], 'u3-varignon': ['signs', 'trig'], 'u3-about-point': ['signs', 'cross'], 'u3-cross': ['cross', 'vectors'],
  'u3-axis': ['cross', 'dot'], 'u3-couple': ['signs'], 'u3-balance': ['sigma', 'signs'], 'u3-net': ['sigma', 'signs'],
  'u4-parallel': ['sigma', 'signs'], 'u4-force-couple': ['sigma', 'signs'], 'u4-uniform': ['integral'], 'u4-triangle': ['integral'],
  'u4-trapezoid': ['integral', 'sigma'], 'u4-combo': ['integral', 'sigma'], 'u4-single': ['sigma', 'signs'], 'u4-move': ['signs'],
  'u5-ss-point': ['sigma', 'signs'], 'u5-ss-two': ['sigma', 'signs'], 'u5-ss-udl': ['integral', 'sigma'], 'u5-overhang': ['sigma', 'signs'],
  'u5-cantilever': ['integral', 'sigma'], 'u5-angled': ['trig', 'sigma'], 'u5-boom': ['trig', 'sigma', 'linsys'], 'u5-couple-beam': ['sigma', 'signs'],
  'u6-roof': ['trig', 'linsys'], 'u6-right': ['trig', 'linsys'], 'u6-wall-bracket': ['trig', 'linsys'], 'u6-pratt-reactions': ['sigma', 'signs'],
  'u6-pratt-joint': ['linsys', 'trig', 'signs'], 'u6-sections': ['sigma', 'signs'],
  'u7-pliers': ['sigma', 'signs'], 'u7-strut': ['linsys', 'trig'], 'u7-nutcracker': ['sigma', 'signs'], 'u7-aframe': ['linsys', 'sigma'],
  'u7-tackle': ['sigma'], 'u7-gerber': ['linsys', 'sigma'],
  'u8-push-floor': ['trig', 'signs'], 'u8-hold': ['trig', 'signs'], 'u8-incline-up': ['trig', 'signs'], 'u8-incline-hold': ['trig', 'signs'],
  'u8-repose': ['invtrig'], 'u8-tip': ['sigma', 'signs'], 'u8-ladder': ['linsys', 'invtrig'], 'u8-wedge': ['linsys', 'trig'], 'u8-belt': ['signs'],
  'u9-L': ['sigma'], 'u9-T': ['sigma'], 'u9-hole': ['sigma', 'signs'], 'u9-rect-tri': ['sigma', 'integral'], 'u9-semi': ['sigma'],
  'u9-masses': ['sigma', 'vectors'], 'u9-quarter': ['sigma', 'integral'], 'u9-integral': ['integral'],
  'u10-rect': ['integral'], 'u10-base': ['integral'], 'u10-parallel': ['sigma'], 'u10-tube': ['sigma'], 'u10-T': ['sigma'],
  'u10-Ibeam': ['sigma'], 'u10-gyration': ['integral'], 'u10-triangle': ['integral'],
};
function skillsForType(id, unit) { return typeSkills[id] || (unitSkills[unit] || []).slice(0, 2); }

// Symbol glossary. tip = what the tooltip says; read = how to say it aloud.
const glossary = {
  sigma: { sym: '\\Sigma', read: '"the sum of"', tip: 'Σ (capital sigma) = "the sum of". Add up the quantity for every item listed, e.g. every force on the body.', skill: 'sigma' },
  sumi: { sym: '\\sum_{i=1}^{n}', read: '"the sum from i equals 1 to n"', tip: 'Sum over i: let i count 1, 2, …, n and add up one term for each value.', skill: 'sigma' },
  sub: { sym: 'F_x', read: '"F sub x"', tip: 'A subscript is a label, not math: F_x means "the x-part of F". F_1, F_2 are force number 1, number 2.', skill: 'sigma' },
  idx: { sym: 'x_i', read: '"x sub i"', tip: 'Index notation: x_i means "the x of item i". With i = 1, 2, 3 it stands for x₁, x₂, x₃.', skill: 'sigma' },
  hat: { sym: '\\hat{\\imath},\\ \\hat{\\jmath},\\ \\hat{k}', read: '"i-hat, j-hat, k-hat"', tip: 'Hats mark unit vectors: arrows of length 1 along x, y and z. 3î − 2ĵ means "3 along x, −2 along y". (Many books write bold i, j, k.)', skill: 'vectors' },
  uvec: { sym: '\\mathbf u', read: '"unit vector u"', tip: 'A unit vector has length 1 and only carries direction: u = r / |r|.', skill: 'vectors' },
  bold: { sym: '\\mathbf F', read: '"vector F"', tip: 'Bold letters are vectors (magnitude AND direction). A plain F is just the magnitude (a positive number).', skill: 'vectors' },
  mag: { sym: '|\\mathbf r|', read: '"the magnitude of r"', tip: 'Bars around a vector mean its length: |r| = √(x² + y² + z²).', skill: 'vectors' },
  cross: { sym: '\\times', read: '"cross"', tip: 'r × F (r cross F) is the cross product: a new vector perpendicular to both. Order matters: r × F = −(F × r).', skill: 'cross' },
  dot: { sym: '\\cdot', read: '"dot"', tip: 'A · B (A dot B) is the dot product: AxBx + AyBy + AzBz = |A||B|cos θ. The answer is a plain number.', skill: 'dot' },
  int: { sym: '\\int', read: '"the integral of"', tip: '∫ is a stretched S for "sum". It means: cut the thing into infinitely many thin slices and add them all up.', skill: 'integral' },
  dA: { sym: 'dA,\\ dx', read: '"d-A", "d-x"', tip: 'dA is one tiny slice of area (dx is one tiny slice of length). ∫ dA just adds every slice: the total area.', skill: 'integral' },
  bar: { sym: '\\bar x', read: '"x-bar"', tip: 'A bar over a coordinate marks an average position: x̄ is the x of the centroid (the area\'s balance point).', skill: 'sigma' },
  theta: { sym: '\\theta', read: '"theta"', tip: 'θ (theta) is the usual name for an angle. In this course it is measured CCW from +x unless the problem says otherwise.', skill: 'trig' },
  atan2: { sym: '\\operatorname{atan2}(y,x)', read: '"a-tan-two of y, x"', tip: 'atan2(y, x) is tan⁻¹(y/x) corrected for the quadrant, using the signs of x and y. It gives the true angle from +x.', skill: 'invtrig' },
  inv: { sym: '\\cos^{-1}', read: '"inverse cosine" or "arc-cosine"', tip: 'cos⁻¹ means "the angle whose cosine is…". The −1 is NOT a power here.', skill: 'invtrig' },
  moment: { sym: 'M_O', read: '"M sub O" or "moment about O"', tip: 'M_O is the moment (turning effect) about point O. Counterclockwise is positive in this course.', skill: 'signs' },
  det: { sym: '\\begin{vmatrix} a & b\\\\ c & d \\end{vmatrix}', read: '"the determinant of…"', tip: 'Straight bars around a grid of numbers mean its determinant. For 2×2: ad − bc.', skill: 'cross' },
  implies: { sym: '\\Rightarrow', read: '"so" or "which gives"', tip: '⇒ means "therefore": the next result follows from the line before.', skill: 'linsys' },
  mu: { sym: '\\mu_s', read: '"mu sub s"', tip: 'μ (mu) is the coefficient of friction; the s (static) or k (kinetic) subscript says which one.', skill: 'signs' },
  approx: { sym: '\\approx', read: '"approximately equals"', tip: '≈ means the two sides are nearly equal (after rounding or approximating).', skill: 'integral' },
};

// HTML for a "Reading the math" box. rows: [[latexSymbol, readAloud, meaning], ...]; skills: toolkit links.
function readMath(rows, skillKeys = []) {
  const links = skillKeys.map((k) => byKey.get(k)).filter(Boolean)
    .map((s) => `<a href="%BASE%/toolkit/${s.slug}">Math toolkit: ${s.short} →</a>`).join(' ');
  return `<aside class="readmath"><p class="kicker">Reading the math</p><table><tbody>${rows.map(([sym, read, mean]) => `<tr><td class="rm-sym">$${sym}$</td><td class="rm-read">${read}</td><td>${mean}</td></tr>`).join('')}</tbody></table>${links ? `<p class="rm-links">${links}</p>` : ''}</aside>`;
}

module.exports = { skills, byKey, bySlug, unitSkills, typeSkills, skillsForType, glossary, readMath };
