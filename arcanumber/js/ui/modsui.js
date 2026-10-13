// スコアアタック（ランダムモード）：とくしゅルールの がめん
import { T } from '../text.js';
import { el, $, $$, makeRng, newSeed } from '../util.js';
import { sfx } from '../audio.js';
import { MODS, pickMods, modScore } from '../data/mods.js';
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

// 3つ ひいて きめる：mods か null（もどる）
export function modsScreen(app, { grade, diff }) {
  return new Promise((resolve) => {
    const rng = makeRng(newSeed());
    let mods = window.__forceMods || pickMods(rng); // __forceMods：テストよう
    let rerolls = 1;
    const root = el(`<div class="screen fade-in">${bgHtml()}<div class="panel-screen">
      <h1>🏆 ${T('スコアアタック')}</h1>
      <div class="lead">${T('こんかいの とくしゅルールは… この 3つ！')}</div>
      <div class="mod-row" data-mods></div>
      <div class="mod-total" data-total></div>
      <div class="row"><button class="btn dark small" data-back>◀ ${T('もどる')}</button><button class="btn blue" data-reroll></button><button class="btn big" data-go>${T('この ルールで ちょうせん！')}</button></div>
    </div></div>`);
    app.mount(root);
    swirl($('canvas.swirl', root), 'tower');
    const render = () => {
      $('[data-mods]', root).innerHTML = mods.map((id, i) => modCardHtml(id, i)).join('');
      $('[data-total]', root).innerHTML = T(`スコア ばいりつ <b>×${modsMult(mods, diff)}</b>　<span>（${levelLabel(grade, diff)}）</span>`);
      const rb = $('[data-reroll]', root);
      rb.innerHTML = T(`🎲 ひきなおす（のこり ${rerolls}かい）`);
      rb.disabled = rerolls <= 0;
      mods.forEach((_, i) => setTimeout(() => sfx('page'), i * 180));
    };
    render();
    $('[data-reroll]', root).addEventListener('click', () => { if (rerolls <= 0) return; rerolls--; sfx('shuffle'); mods = window.__forceMods || pickMods(rng); render(); });
    $('[data-back]', root).addEventListener('click', () => { sfx('tap'); resolve(null); });
    $('[data-go]', root).addEventListener('click', () => { sfx('upgrade'); FX.confetti(); resolve(mods); });
  });
}

export function modsModal(run) {
  openModal(`<h2>🏆 ${T('とくしゅルール')}</h2><div class="mod-row small">${(run.mods || []).map((id, i) => modCardHtml(id, i)).join('')}</div>
    <div class="mod-total">${T(`スコア ばいりつ <b>×${modsMult(run.mods, run.diff)}</b>`)}</div>`);
}
