// きょうの ちょうせんの ランキング
// GAS 版では google.script.run で みんなの スコアを サーバーに あつめる。それ いがいは この たんまつの きろくだけ
import { T } from '../text.js';
import { el, $, $$, makeRng, newSeed } from '../util.js';
import { sfx } from '../audio.js';
import { meta, saveMeta } from '../save.js';
import { HEROES } from '../data/heroes.js';
import { MODS } from '../data/mods.js';
import { openModal } from './modal.js';
import { todayJST, shiftDate, dateLabel, dateShort, dailyMods, nameCandidates, newTag } from '../engine/daily.js';

export const hasServer = () => !!(window.google && window.google.script && window.google.script.run);
function gasCall(fn, ...args) {
  return new Promise((res, rej) => {
    if (!hasServer()) { rej(new Error('no server')); return; }
    const timer = setTimeout(() => rej(new Error('timeout')), 15000);
    window.google.script.run
      .withSuccessHandler((v) => { clearTimeout(timer); res(v); })
      .withFailureHandler((e) => { clearTimeout(timer); rej(e); })[fn](...args);
  });
}

// ── なまえ ──
export function playerOf() { return meta.player || null; }
export function pickName({ force = false } = {}) {
  if (meta.player && !force) return Promise.resolve(meta.player);
  return new Promise((resolve) => {
    const rng = makeRng(newSeed());
    let cands = nameCandidates(rng), sel = meta.player ? meta.player.name : cands[0];
    const { m, close } = openModal(`<h2>🏅 ${T('ランキングに でる なまえを えらぼう')}</h2>
      <div class="sub">${T('ほんとうの なまえは つかわないよ。あとで かえられる')}</div>
      <div class="name-list" data-names></div>
      <div class="row"><button class="btn dark" data-more>🎲 ${T('ほかの なまえ')}</button><button class="btn green" data-ok>${T('これに する')}</button></div>`, { closable: false });
    const render = () => {
      $('[data-names]', m).innerHTML = cands.map((c, i) => `<button class="name-btn ${c === sel ? 'on' : ''}" data-i="${i}">${T(c)}</button>`).join('');
      $$('[data-i]', m).forEach((b) => b.addEventListener('click', () => { sfx('tap'); sel = cands[Number(b.dataset.i)]; render(); }));
    };
    render();
    $('[data-more]', m).addEventListener('click', () => { sfx('shuffle'); cands = nameCandidates(rng); sel = cands[0]; render(); });
    $('[data-ok]', m).addEventListener('click', () => {
      sfx('upgrade');
      meta.player = { name: sel, tag: (meta.player && meta.player.tag) || newTag(rng) };
      saveMeta(); close(); resolve(meta.player);
    });
  });
}

// ── この たんまつの きろく（サーバーが ない とき） ──
function localBoard(date) {
  const list = ((meta.daily || {})[date] || []).slice().sort((a, b) => b.s - a.s || a.t - b.t);
  return { list, total: list.length ? 1 : 0, online: false };
}
function saveLocal(entry) {
  meta.daily = meta.daily || {};
  const l = meta.daily[entry.d] = meta.daily[entry.d] || [];
  l.push(entry); l.sort((a, b) => b.s - a.s || a.t - b.t);
  meta.daily[entry.d] = l.slice(0, 10);
  // ふるい ひの きろくは けす
  for (const k of Object.keys(meta.daily)) if (k < shiftDate(todayJST(), -14)) delete meta.daily[k];
  saveMeta();
}

// スコアを おくる → { rank, total, list, online, error }
export async function submitDaily(run, total, win) {
  const p = meta.player || (await pickName());
  const entry = { d: run.daily, n: p.name, g: p.tag, h: run.hero, s: total, w: win ? 1 : 0, a: run.act, df: run.diff, t: Date.now() };
  saveLocal(entry);
  if (!hasServer()) { const b = localBoard(run.daily); return { ...b, rank: 0 }; }
  try {
    const r = await gasCall('submitDaily', entry);
    return { ...r, online: true };
  } catch (e) {
    return { ...localBoard(run.daily), rank: 0, error: String((e && e.message) || e) };
  }
}
export async function fetchBoard(date) {
  if (!hasServer()) return localBoard(date);
  try { return { ...(await gasCall('getDaily', date)), online: true }; } catch (e) { return { ...localBoard(date), error: String((e && e.message) || e) }; }
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function boardRows(list, myTag) {
  if (!list.length) return `<div class="sub">${T('まだ だれも ちょうせん していないよ。いちばんのりを めざそう！')}</div>`;
  return `<table class="hs board">${list.map((e, i) => `<tr class="${e.g === myTag ? 'me' : ''}"><td class="rk">${['🥇', '🥈', '🥉'][i] || i + 1}</td>
    <td class="bn">${esc(e.n)}<small>#${esc(e.g || '')}</small></td><td>${HEROES[e.h]?.art || ''}</td><td>${e.df === 'easy' ? '🐣' : '🔥'}</td>
    <td>${e.w ? '🏆' : `${e.a}${T('しょう')}`}</td><td class="sv num">${e.s}</td></tr>`).join('')}</table>`;
}

// ランキングの がめん
export function boardModal(date = todayJST()) {
  const today = todayJST();
  let cur = date;
  const { m } = openModal(`<h2>🏅 ${T('きょうの ちょうせん ランキング')}</h2>
    <div class="row" style="gap:8px"><button class="btn small" data-day="${today}">${T('きょう')}</button><button class="btn small" data-day="${shiftDate(today, -1)}">${T('きのう')}</button></div>
    <div class="board-mods" data-mods></div>
    <div class="board-body scroll" data-body></div>
    <div class="sub" data-note style="font-size:14px"></div>
    <div class="row"><button class="btn dark small" data-rename>✏️ ${T('なまえを かえる')}</button></div>`, { cls: 'board-modal' });
  const load = async () => {
    $$('[data-day]', m).forEach((b) => { b.classList.toggle('gold', b.dataset.day === cur); b.classList.toggle('dark', b.dataset.day !== cur); });
    $('[data-mods]', m).innerHTML = `${T(dateLabel(cur))}　${dailyMods(cur).map((id) => `${MODS[id].icon} ${T(MODS[id].name)}`).join('　')}`;
    $('[data-body]', m).innerHTML = `<div class="sub">${T('よみこみちゅう…')}</div>`;
    const b = await fetchBoard(cur);
    if (!m.isConnected) return;
    const me = meta.player;
    $('[data-body]', m).innerHTML = boardRows(b.list || [], me && me.tag);
    $('[data-note]', m).innerHTML = T(b.online
      ? `📶 みんなの ランキング（${b.total || 0}にんが ちょうせん）${me ? `　きみは「${esc(me.name)}」` : ''}`
      : `📱 この たんまつの きろく だけ だよ（みんなの ランキングは GAS で ひらいた ときに みられる）${b.error ? `<br>${esc(b.error)}` : ''}`);
  };
  $$('[data-day]', m).forEach((b) => b.addEventListener('click', () => { sfx('tap'); cur = b.dataset.day; load(); }));
  $('[data-rename]', m).addEventListener('click', async () => { sfx('tap'); await pickName({ force: true }); load(); });
  load();
}

export { todayJST, dateShort };
