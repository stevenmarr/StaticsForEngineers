'use strict';
// Math toolkit: one lesson + practice problem set per readiness skill (order follows content/skills.js).
const { skills } = require('../skills');
const mods = { trig: require('./trig'), invtrig: require('./invtrig'), lawsc: require('./lawsc'), vectors: require('./vectors'), sigma: require('./sigma'), linsys: require('./linsys'), dot: require('./dot'), cross: require('./cross'), signs: require('./signs'), integral: require('./integral') };
const toolkit = skills.map((s) => {
  const m = mods[s.key];
  if (!m) throw new Error('missing toolkit module for ' + s.key);
  return { ...s, lesson: m.lesson, problems: m.problems };
});
module.exports = { toolkit };
