// きょうつうの パーツ（はいけい・うえの バー）
import { T } from '../text.js';
import { RELICS } from '../data/relics.js';
import { FLOORS } from '../engine/run.js';

export const HEROES = ['🧙‍♀️', '🧙‍♂️', '🧝‍♀️', '🧝‍♂️'];

export function bgHtml(theme) {
  const decos = {
    forest: [['☁️', 8, 6, 70], ['☁️', 62, 10, 56], ['🌳', 2, 44, 120], ['🌲', 14, 40, 96], ['🌳', 86, 42, 130], ['🌲', 76, 46, 90], ['🍄', 30, 62, 40], ['🌼', 58, 66, 34], ['🌷', 46, 70, 30]],
    town: [['☁️', 20, 8, 60], ['🏠', 3, 40, 100], ['🏘️', 80, 38, 120], ['⚙️', 66, 14, 50], ['🏭', 90, 30, 80], ['⚙️', 30, 20, 34], ['🌻', 50, 64, 36]],
    castle: [['🌙', 84, 6, 80], ['🏰', 4, 34, 140], ['🏰', 84, 38, 110], ['⭐', 30, 8, 30], ['⭐', 56, 14, 24], ['✨', 70, 22, 30]],
    rest: [['🌙', 80, 8, 70], ['🌲', 4, 46, 120], ['🌲', 86, 50, 110], ['⭐', 30, 10, 26], ['⭐', 60, 6, 22]],
    shop: [['🏮', 6, 4, 60], ['🏮', 88, 4, 60]],
    event: [['☁️', 10, 10, 70], ['☁️', 74, 16, 60], ['✨', 50, 6, 30]],
    title: [],
  };
  const list = decos[theme] || [];
  let tw = '';
  if (theme === 'castle' || theme === 'title' || theme === 'rest') {
    for (let i = 0; i < 40; i++) tw += `<div class="twinkle" style="left:${(i * 37) % 100}%;top:${(i * 53) % 55}%;animation-delay:${(i % 7) * 0.35}s"></div>`;
  }
  const ground = ['forest', 'town', 'castle'].includes(theme) ? '<div class="ground"></div>' : '';
  return `<div class="bg bg-${theme}">${tw}${ground}${list.map(([e, x, y, s]) => `<div class="deco" style="left:${x}%;top:${y}%;font-size:${s}px">${e}</div>`).join('')}</div>`;
}

export function floatingSymbols() {
  const syms = ['+', '−', '×', '÷', '=', '1', '2', '3', '5', '7', '9', '△', '□', '○'];
  let h = '';
  for (let i = 0; i < 26; i++) {
    h += `<div class="float-sym" style="left:${(i * 41) % 100}%;top:${100 + (i * 29) % 60}%;font-size:${30 + (i * 13) % 50}px;animation-duration:${14 + (i * 7) % 16}s;animation-delay:-${(i * 3) % 14}s">${syms[i % syms.length]}</div>`;
  }
  return h;
}

export function topbarHtml(run) {
  const f = FLOORS[run.floor];
  return `<div class="topbar">
    <div class="pill hp">❤️ <span class="num" data-hp>${run.hp}</span><span style="opacity:.8">/${run.maxHp}</span></div>
    <div class="pill coin">🪙 <span class="num" data-coins>${run.coins}</span></div>
    <div class="pill floor">${f.icon} ${run.floor}${T('かい')}</div>
    <div class="relic-strip">${run.relics.map((id) => `<div class="relic" data-relic="${id}">${RELICS[id].icon}</div>`).join('')}</div>
    <button class="icon-btn" data-deck title="デッキ">🎴</button>
    <button class="icon-btn" data-settings title="せってい">⚙️</button>
  </div>`;
}
export function updateTopbar(root, run) {
  const hp = root.querySelector('[data-hp]'); if (hp) { hp.textContent = run.hp; hp.nextElementSibling.textContent = '/' + run.maxHp; }
  const co = root.querySelector('[data-coins]'); if (co) co.textContent = run.coins;
}
export function flashRelic(root, id) {
  const n = root.querySelector(`[data-relic="${id}"]`);
  if (n) { n.classList.remove('flash'); void n.offsetWidth; n.classList.add('flash'); }
}
