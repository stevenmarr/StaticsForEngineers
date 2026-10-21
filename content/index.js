'use strict';
const katex = require('katex');
const { makeRng, checkNumeric } = require('./helpers');

const SK = require('./skills');
const units = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => require(`./units/u${String(n).padStart(2, '0')}.js`));
const { toolkit } = require('./toolkit');
const byId = new Map();
for (const u of units) for (const p of u.problems) { p.unit = u.num; p.skills = SK.skillsForType(p.id, u.num); byId.set(p.id, p); }
// Toolkit problems use unit 0 and carry the skill key they train.
for (const t of toolkit) for (const p of t.problems) {
  if (byId.has(p.id)) throw new Error('duplicate problem id ' + p.id);
  p.unit = 0; p.skill = t.key; p.skills = [t.key]; byId.set(p.id, p);
}

function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

// --- server-side KaTeX rendering -------------------------------------------
// \gl{key}{tex} marks a symbol for a glossary tooltip (see content/skills.js glossary).
const kopts = { throwOnError: false, strict: 'ignore', output: 'html', trust: (c) => c.command === '\\htmlClass', macros: { '\\gl': '\\htmlClass{gl-#1}{#2}' } };
const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function glossaryize(html) {
  return html.replace(/class="enclosing gl-([A-Za-z0-9]+)"/g, (m, key) => {
    const g = SK.glossary[key];
    if (!g) return 'class="enclosing gl-unknown"';
    return `class="enclosing gl" tabindex="0" role="button" data-gl="${key}" data-tip="${escAttr(g.tip + ' Say: ' + g.read + '.')}"`;
  });
}
function tex(s, display = false) { return glossaryize(katex.renderToString(s, { ...kopts, displayMode: display, macros: { ...kopts.macros } })); }
function renderMath(html) {
  if (!html) return '';
  return String(html)
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => `<div class="math-display">${tex(t, true)}</div>`)
    .replace(/\$([^$\n]+?)\$/g, (_, t) => tex(t, false));
}

// Generate a problem instance deterministically from (id, seed).
function instance(id, seed) {
  const def = byId.get(id);
  if (!def) return null;
  const r = makeRng((hashStr(id) ^ (seed >>> 0)) >>> 0);
  const data = def.gen(r);
  return { def, seed: seed >>> 0, data };
}

// What the browser is allowed to see before answering (no answer values).
function publicView(inst) {
  const { def, data, seed } = inst;
  const out = {
    id: def.id, unit: def.unit, skill: def.skill || null, skillTitle: def.skill ? SK.byKey.get(def.skill).short : null, seed, title: def.title, kind: def.kind,
    prompt: renderMath(data.prompt), svg: data.svg || '',
    hints: (data.hints || []).map(renderMath),
    needs: def.unit ? (def.skills || []) : [],
  };
  if (def.kind === 'mc') out.choices = data.choices.map((c, i) => ({ i, html: renderMath(c.text) }));
  else out.fields = data.answers.map((a) => ({ key: a.key, label: tex(a.label), unit: a.unit }));
  return out;
}

function grade(inst, submission) {
  const { def, data } = inst;
  if (def.kind === 'mc') {
    const idx = parseInt(submission && submission.choice, 10);
    const correctIdx = data.choices.findIndex((c) => c.correct);
    return { correct: idx === correctIdx, results: [{ key: 'choice', ok: idx === correctIdx }], correctChoice: correctIdx };
  }
  const vals = (submission && submission.answers) || {};
  const results = data.answers.map((a) => {
    const res = checkNumeric(a, vals[a.key]);
    return { key: a.key, ok: res.ok, parsed: res.parsed, expected: a.value, unit: a.unit };
  });
  return { correct: results.every((x) => x.ok), results };
}

function solutionHtml(inst) {
  const { def, data } = inst;
  let ansLine = '';
  if (def.kind !== 'mc') {
    ansLine = '<p class="answer-line"><strong>Answers:</strong> ' + data.answers.map((a) => `${tex(a.label)} = <strong>${fmtAns(a.value)}</strong> ${a.unit}`).join(' &nbsp;·&nbsp; ') + '</p>';
  }
  return renderMath(data.solution) + ansLine;
}
function fmtAns(v) { const s = Number(v.toPrecision(4)); return Math.abs(s) >= 1e7 || (Math.abs(s) < 1e-4 && s !== 0) ? s.toExponential(3) : String(s); }

const lessonCache = new Map();
const BASE = require('../src/config').basePath;
const fill = (html) => html.replace(/%BASE%/g, BASE);
function lessonHtml(n) {
  if (!lessonCache.has(n)) lessonCache.set(n, fill(renderMath(units[n - 1].lesson)));
  return lessonCache.get(n);
}
function toolkitLessonHtml(key) {
  const k = 'tk:' + key;
  if (!lessonCache.has(k)) lessonCache.set(k, fill(renderMath(toolkit.find((t) => t.key === key).lesson)));
  return lessonCache.get(k);
}
const toolkitByKey = new Map(toolkit.map((t) => [t.key, t]));
const toolkitBySlug = new Map(toolkit.map((t) => [t.slug, t]));

module.exports = { units, toolkit, toolkitByKey, toolkitBySlug, skills: SK, byId, instance, publicView, grade, solutionHtml, lessonHtml, toolkitLessonHtml, renderMath, tex };
