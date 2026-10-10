// きょうつうの パーツ
import { T } from '../text.js';
import { $, $$ } from '../util.js';
import { ACTS, MAX_SCROLLS } from '../engine/run.js';
import { SCROLLS } from '../data/scrolls.js';
import { HEROES } from '../data/heroes.js';

export function bgHtml() { return '<canvas class="swirl"></canvas><div class="vignette"></div>'; }
export function heroArt(run) { return HEROES[run.hero].art; }

export function topbarHtml(run) {
  const A = ACTS[run.act];
  return `<div class="topbar">
    <div class="chip hp">❤️ <span class="num" data-hp>${run.hp}</span><span style="color:var(--ink-dim)">/<span data-maxhp>${run.maxHp}</span></span><span class="bar"><i data-hpbar style="width:${run.hp / run.maxHp * 100}%"></i></span></div>
    <div class="chip coin">🪙 <span class="num" data-coins>${run.coins}</span></div>
    <div class="chip act">${A.icon} ${run.act}${T('しょう')} ${T(A.name)}</div>
    <div class="scroll-slots" data-scrolls></div>
    <div class="spacer"></div>
    <button class="icon-btn" data-hands title="やく">🃏</button>
    <button class="icon-btn" data-deck title="デッキ">🎴</button>
    <button class="icon-btn" data-settings title="せってい">⚙️</button>
  </div>`;
}
export function updateTopbar(root, run, hpOverride) {
  const hp = hpOverride ?? run.hp;
  const n = $('[data-hp]', root); if (n) n.textContent = hp;
  const mx = $('[data-maxhp]', root); if (mx) mx.textContent = run.maxHp;
  const b = $('[data-hpbar]', root); if (b) b.style.width = Math.max(0, hp / run.maxHp * 100) + '%';
  const c = $('[data-coins]', root); if (c) c.textContent = run.coins;
  const s = $('[data-scrolls]', root);
  if (s) {
    s.innerHTML = '';
    for (let i = 0; i < MAX_SCROLLS; i++) {
      const sc = run.scrolls[i];
      s.insertAdjacentHTML('beforeend', `<div class="scroll-slot ${sc ? 'full' : ''}" data-si="${i}">${sc ? SCROLLS[sc.id].icon : ''}</div>`);
    }
  }
}
