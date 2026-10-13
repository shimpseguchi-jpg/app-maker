// きょうの ちょうせん（日替わりスコアアタック）：とくしゅルールの がめん
import { T } from '../text.js';
import { el, $ } from '../util.js';
import { sfx } from '../audio.js';
import { MODS, modScore } from '../data/mods.js';
import { dailyMods, dateLabel } from '../engine/daily.js';
import { HEROES } from '../data/heroes.js';
import { PACKS } from '../data/packs.js';
import { boardModal } from './board.js';
import { DIFF_BONUS } from '../engine/runscore.js';
import { bgHtml } from './common.js';
import { swirl } from './bg.js';
import { openModal } from './modal.js';
import * as FX from './fx.js';
import { levelLabel } from './placement.js';

const KIND = { good: ['いいこと', 'good'], bad: ['たいへん', 'bad'], mix: ['いいことも たいへんも', 'mix'] };
export function pct(v) { const p = Math.round(v * 100); return `${p >= 0 ? '+' : '−'}${Math.abs(p)}%`; }
export function modCardHtml(id, i = 0) {
  const M = MODS[id];
  const [kl, kc] = KIND[M.kind];
  return `<div class="modc k-${kc}" style="animation-delay:${i * 0.18}s"><div class="mc-icon">${M.icon}</div><div class="mc-name">${T(M.name)}</div>
    <div class="mc-kind">${T(kl)}</div><div class="mc-text">${T(M.text)}</div><div class="mc-score ${M.score > 0 ? 'up' : M.score < 0 ? 'down' : ''}">${T('スコア')} ${M.score ? pct(M.score) : '±0%'}</div></div>`;
}
export function modsMult(mods, diff) { return Math.max(0.5, Math.round((1 + (DIFF_BONUS[diff] || 0) + modScore(mods)) * 100) / 100); }

// きょうの ちょうせん：その ひの ルールを みせる → 'go' か null（もどる）
export function dailyScreen(app, { grade, diff, date, hero, packs = [] }) {
  return new Promise((resolve) => {
    const mods = window.__forceMods || dailyMods(date); // __forceMods：テストよう
    const root = el(`<div class="screen fade-in">${bgHtml()}<div class="panel-screen">
      <h1>🏆 ${T('きょうの ちょうせん')}</h1>
      <div class="lead">${T(`${dateLabel(date)}は みんな おなじ しゅじんこう・パック・ルール・マップで ちょうせん！`)}</div>
      <div class="daily-info">
        <div class="di"><span class="di-l">${T('きょうの しゅじんこう')}</span><span class="di-v">${HEROES[hero].art} ${HEROES[hero].name}<small>${T(HEROES[hero].title)}</small></span></div>
        <div class="di"><span class="di-l">${T('きょうの パック')}</span><span class="di-v">${packs.map((t) => `${PACKS[t].icon}<small>${T(PACKS[t].name)}</small>`).join('　')}</span></div>
      </div>
      <div class="mod-row" data-mods>${mods.map((id, i) => modCardHtml(id, i)).join('')}</div>
      <div class="mod-total">${T(`スコア ばいりつ <b>×${modsMult(mods, diff)}</b>　<span>（${levelLabel(grade, diff)}）</span>`)}</div>
      <div class="row"><button class="btn dark small" data-back>◀ ${T('もどる')}</button><button class="btn blue" data-board>🏅 ${T('ランキング')}</button><button class="btn big" data-go>${T('ちょうせん する！')}</button></div>
    </div></div>`);
    app.mount(root);
    swirl($('canvas.swirl', root), 'tower');
    mods.forEach((_, i) => setTimeout(() => sfx('page'), i * 180));
    $('[data-board]', root).addEventListener('click', () => { sfx('tap'); boardModal(date); });
    $('[data-back]', root).addEventListener('click', () => { sfx('tap'); resolve(null); });
    $('[data-go]', root).addEventListener('click', () => { sfx('upgrade'); FX.confetti(); resolve(mods); });
  });
}

export function modsModal(run) {
  openModal(`<h2>🏆 ${T('とくしゅルール')}</h2><div class="mod-row small">${(run.mods || []).map((id, i) => modCardHtml(id, i)).join('')}</div>
    <div class="mod-total">${T(`スコア ばいりつ <b>×${modsMult(run.mods, run.diff)}</b>`)}</div>`);
}
