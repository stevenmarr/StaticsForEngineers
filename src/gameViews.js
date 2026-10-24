'use strict';
const C = require('../content');
const { layout, esc, url } = require('./views');
const { pic, avatar } = require('./photos');

const SCRIPTS = ['game/physics.js', 'game/levels.js', 'game/game.js'];
const starRow = (n, max = 3) => `<span class="stars" aria-label="${n} of ${max} stars">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}">★</i>`).join('')}</span>`;

function playerCard(g) {
  const xp = g.xp;
  return `<div class="card player">
    <div class="pl-lvl"><span class="ring" style="--p:${xp.pct}"><b>${xp.level}</b></span><div><p class="kicker">Player level</p><p class="big">${esc(xp.title)}</p><p class="small muted">${xp.xp} XP · ${xp.to - xp.xp} to level ${xp.level + 1}</p></div></div>
    <div class="pl-stats"><div><b>${g.starsTotal}</b><span>of ${g.starsMax} stars</span></div><div><b>${g.streak.current}</b><span>day streak</span></div><div><b>${g.rush.best}</b><span>Goat Rush best</span></div></div>
    <p class="small muted xp-how">XP comes from new stars (50 each), first clears, prediction bonuses, Goat Rush, first-try practice answers (10) and mastered units (150).</p>
  </div>`;
}

function gameMap({ user, csrf, s, g }) {
  const nodes = g.levels.map((l, i) => `<li class="lvl-node ${l.completed ? 'done' : ''} ${l.next ? 'next' : ''} ${l.ready ? '' : 'soft'} ${i % 2 ? 'right' : 'left'}">
      <a href="${url('/game/' + l.id)}" class="lvl-card ${l.flagship ? 'flagship' : ''}">
        ${avatar(l.character.img, 72)}
        <div class="lv-body">
          <p class="kicker">Level ${l.num} · Unit ${l.unit}${l.flagship ? ' · Flagship' : ''}</p>
          <h3>${esc(l.title)}</h3>
          <p class="small muted">${esc(l.tagline)}</p>
          <div class="lv-foot">${starRow(l.stars)}${l.next ? '<span class="tag new">Up next</span>' : ''}${!l.ready ? `<span class="tag">After Unit ${l.unit}</span>` : ''}</div>
        </div>
      </a></li>`).join('');
  const badges = g.badges.map((b) => `<li class="bdg ${b.earned ? 'earned' : ''}" title="${esc(b.desc)}">${avatar(b.img, 44)}<div><b>${esc(b.name)}</b><span class="small muted">${esc(b.desc)}</span></div></li>`).join('');
  return layout({
    title: 'Farm Engineering', user, csrf, active: 'game', reviewDue: s.reviewDue,
    body: `<section class="map-hero">
        ${pic('banner-twins', { cls: 'mh-bg', sizes: '(max-width: 760px) 800px, 1180px', fallback: 1600, alt: '', eager: true })}
        <div class="mh-inner"><p class="kicker">Sandy Boots Farm · game mode</p><h1>Farm Engineering</h1>
        <p class="deck">Real farm problems. You design the fix, predict what the statics will say, then run it and watch it hold or fail.</p></div>
      </section>
      ${playerCard(g)}
      <div class="map-layout">
        <section><h2 class="section-title">Level map</h2>
          <p class="muted small">Levels follow the units. A level marked “After Unit N” is still playable; the unit lesson just makes it much easier.</p>
          <ol class="lvl-path">${nodes}</ol></section>
        <aside class="map-side">
          <a class="card side-mode" href="${url('/game/rush')}">${avatar('avatar-pepper', 56)}<div><p class="kicker">Timed · 60 s</p><p class="big">Goat Rush</p><p class="small muted">Rapid-fire concept and math checks. Streaks build a combo up to ×5.</p></div></a>
          <a class="card side-mode" href="${url('/game/sandbox')}">${avatar('avatar-captain', 56)}<div><p class="kicker">Free build</p><p class="big">Truss Sandbox</p><p class="small muted">Build any truss on the creek and see every member force live.</p></div></a>
          <section class="card badges"><h2>Badges <span class="muted small">${g.badges.filter((b) => b.earned).length}/${g.badges.length}</span></h2><ul>${badges}</ul></section>
        </aside>
      </div>`,
  });
}

function levelPage({ user, csrf, s, g, level, def }) {
  const unit = C.units[def.unit - 1];
  const soft = !level.ready ? `<div class="card soft-gate"><p><strong>Heads up:</strong> this level uses Unit ${def.unit} (${esc(unit.title)}), which you haven't unlocked yet. You can play anyway; the <a href="${url('/units/' + def.unit)}">Unit ${def.unit} lesson</a> explains the idea.</p></div>` : '';
  const data = { level: def.id, seed: level.seed || 1, design: level.lastDesign, stars: level.stars, starMask: level.starMask, unit: def.unit, unitTitle: unit.title, character: level.character, next: (g.levels[def.num] || null) && { id: g.levels[def.num].id, title: g.levels[def.num].title } };
  return layout({
    title: `${def.title} · Farm Engineering`, user, csrf, active: 'game', reviewDue: s.reviewDue, scripts: SCRIPTS, bodyClass: 'game-body',
    body: `<p class="crumbs"><a href="${url('/game')}">Farm Engineering</a> / Level ${def.num}</p>
      <header class="lvl-head">${avatar(level.character.img, 76)}
        <div><p class="kicker">Level ${def.num} · Unit ${def.unit}: ${esc(unit.title)}</p><h1>${esc(def.title)}</h1></div>
        <div class="lh-stars">${starRow(level.stars)}<span class="small muted">best</span></div></header>
      ${soft}
      <details class="card story" open><summary><span class="kicker">The job</span></summary><p>${esc(def.story)}</p><p class="objective"><strong>Goal:</strong> ${esc(def.objective)}</p>
        <ul class="star-key small muted"><li>★ It works</li><li>★ ${def.id === 'seesaw' ? 'Precision' : def.id === 'shade' ? 'Fewest blocks' : def.id === 'bridge' ? 'Under budget' : 'Cheapest that works'}</li><li>★ Your prediction was close</li></ul></details>
      <div id="game" class="game" data-mode="level" data-cfg="${esc(JSON.stringify(data))}"><noscript>This game needs JavaScript.</noscript></div>`,
  });
}

function sandboxPage({ user, csrf, s }) {
  return layout({
    title: 'Truss Sandbox', user, csrf, active: 'game', reviewDue: s.reviewDue, scripts: SCRIPTS, bodyClass: 'game-body',
    body: `<p class="crumbs"><a href="${url('/game')}">Farm Engineering</a> / Sandbox</p>
      <header class="lvl-head">${avatar('avatar-captain', 76)}<div><p class="kicker">Free build · Unit 6: Trusses</p><h1>Truss Sandbox</h1></div></header>
      <p class="muted">Build anything on the creek grid. Forces update live: <span class="t-ten">blue pulls (tension)</span>, <span class="t-com">amber pushes (compression)</span>, red is over capacity. Try deleting one member at a time to find the zero-force members.</p>
      <div id="game" class="game" data-mode="sandbox" data-cfg="${esc(JSON.stringify({ level: 'bridge', seed: 1 }))}"></div>`,
  });
}

function rushPage({ user, csrf, s, g }) {
  return layout({
    title: 'Goat Rush', user, csrf, active: 'game', reviewDue: s.reviewDue, scripts: ['rush.js'], bodyClass: 'game-body',
    body: `<p class="crumbs"><a href="${url('/game')}">Farm Engineering</a> / Goat Rush</p>
      <div id="rush" class="rush" data-best="${g.rush.best}">
        <section class="card rush-intro">
          ${pic('black-kid', { cls: 'rush-photo', sizes: '(max-width: 760px) 100vw, 420px', fallback: 480 })}
          <div><p class="kicker">Timed round · 60 seconds</p><h1>Goat Rush</h1>
            <p class="deck">Quick concept checks and toolkit math. Every 3 in a row adds to your combo, up to ×5. A miss resets it. Skipping is free but also resets the combo.</p>
            <p class="muted">Your best: <strong>${g.rush.best}</strong>. Rush rounds give XP but don't change your mastery or review queue.</p>
            <button class="btn primary" type="button" data-act="start">Start the rush</button></div>
        </section>
      </div>`,
  });
}

module.exports = { gameMap, levelPage, sandboxPage, rushPage };
