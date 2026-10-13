// ぼうけんの スコア はっぴょう と ハイスコア
import { T } from '../text.js';
import { $, $$, sleep } from '../util.js';
import { sfx } from '../audio.js';
import { meta, saveMeta } from '../save.js';
import { HEROES } from '../data/heroes.js';
import { MODS } from '../data/mods.js';
import { runScore } from '../engine/runscore.js';
import * as FX from './fx.js';
import { pct } from './modsui.js';

export const MODE_NAME = { normal: 'ぼうけん', random: 'きょうの ちょうせん' };
const KEEP = 10;

// ハイスコアに のせる：じゅんい（1〜10）か 0
export function recordScore(run, sc, win) {
  const mode = run.mode === 'random' ? 'random' : 'normal';
  meta.scores = meta.scores || { normal: [], random: [] };
  const list = meta.scores[mode] = meta.scores[mode] || [];
  const entry = { s: sc.total, h: run.hero, w: win ? 1 : 0, a: run.act, g: run.grade, d: run.diff, m: run.mods || [], t: Date.now() };
  list.push(entry);
  list.sort((a, b) => b.s - a.s || a.t - b.t);
  const rank = list.indexOf(entry) + 1;
  meta.scores[mode] = list.slice(0, KEEP);
  saveMeta();
  return rank <= KEEP ? rank : 0;
}
export function bestScore(mode) { const l = (meta.scores && meta.scores[mode]) || []; return l.length ? l[0].s : 0; }

function dateStr(t) { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()}`; }
export function highScoresHtml(mode) {
  const list = (meta.scores && meta.scores[mode]) || [];
  const rows = list.map((e, i) => `<tr class="${i === 0 ? 'top' : ''}"><td class="rk">${['🥇', '🥈', '🥉'][i] || i + 1}</td><td class="sv num">${e.s}</td><td>${HEROES[e.h]?.art || ''}</td>
    <td>${e.w ? '🏆' : `${e.a}${T('しょう')}`}</td><td class="mm">${(e.m || []).map((id) => MODS[id]?.icon || '').join('')}</td><td class="dt">${dateStr(e.t)}</td></tr>`).join('');
  return `<div class="hs-box"><h3>${mode === 'random' ? '🏆' : '🗺️'} ${T(MODE_NAME[mode])}</h3>${rows ? `<table class="hs">${rows}</table>` : `<div class="sub">${T('まだ きろくが ないよ')}</div>`}</div>`;
}

// スコアを 1つずつ かぞえる
export async function playScore(root, run, win) {
  const sc = runScore(run, win);
  const rank = recordScore(run, sc, win);
  const list = $('[data-items]', root), totalEl = $('[data-total]', root), subEl = $('[data-sub]', root), multEl = $('[data-mult]', root), rankEl = $('[data-rank]', root);
  let skip = false;
  root.addEventListener('pointerdown', () => { skip = true; }, { once: true });
  const wait = (ms) => (skip ? Promise.resolve() : sleep(ms));
  let sub = 0;
  for (const it of sc.items) {
    const row = document.createElement('div');
    row.className = 'sc-item';
    row.innerHTML = `<span class="si-i">${it.icon}</span><span class="si-n"><span>${T(it.name)}</span><small>${T(it.desc)}</small></span><span class="si-p num">+${it.pts}</span>`;
    list.appendChild(row);
    sub += it.pts; subEl.textContent = sub;
    if (!skip) sfx('chip', Math.min(24, list.children.length * 2));
    await wait(230);
  }
  await wait(300);
  multEl.innerHTML = sc.mults.length
    ? `${sc.mults.map((m) => `<span class="mchip">${m.icon} ${T(m.name)} ${pct(m.v)}</span>`).join('')}<div class="mx num">× ${sc.mult}</div>`
    : '<div class="mx num">× 1</div>';
  if (!skip) sfx('xmult');
  await wait(500);
  // ごうけいを カウントアップ
  const steps = skip ? 1 : 24;
  for (let i = 1; i <= steps; i++) { totalEl.textContent = Math.round(sc.total * i / steps); await wait(28); }
  totalEl.textContent = sc.total;
  sfx('total');
  FX.retrigger(totalEl, 'bump', 400);
  if (run.daily) return sc; // ランキングは あとで サーバーの けっかを だす
  if (rank === 1) { rankEl.innerHTML = `🎉 ${T('ハイスコア こうしん！')}`; rankEl.classList.add('best'); FX.confetti(); }
  else if (rank) rankEl.innerHTML = T(`${MODE_NAME[run.mode === 'random' ? 'random' : 'normal']}の ランキング ${rank}い！`);
  else rankEl.innerHTML = T(`ベスト：${bestScore(run.mode === 'random' ? 'random' : 'normal')}`);
  return sc;
}
