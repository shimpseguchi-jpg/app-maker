// がめんの こまごま：モーダル・カードの え・HUD
import { el, $, $$ } from '../../../js/util.js';
import { T } from '../../../js/text.js';
import { sfx } from '../../../js/audio.js';
import { CARDS, RARITY_STARS } from '../data/cards.js';
import { SUBJ, SUBJECTS, rankOf, MOODS, heroById } from '../data/characters.js';

let stage = null;
export function initCommon(st) { stage = st; }

export function openModal(html, { closable = true, onClose, cls = '' } = {}) {
  const back = el(`<div class="modal-back"><div class="modal ${cls}">${closable ? '<button class="icon-btn close-x" data-close>✖</button>' : ''}${html}</div></div>`);
  stage.appendChild(back);
  const m = back.firstElementChild; let closed = false;
  const close = () => { if (closed) return; closed = true; back.remove(); };
  const dismiss = () => { if (closed) return; close(); onClose && onClose(null); };
  if (closable) { back.addEventListener('pointerdown', (e) => { if (e.target === back) { sfx('tap'); dismiss(); } }); m.querySelector('[data-close]').addEventListener('click', () => { sfx('tap'); dismiss(); }); }
  return { back, m, close };
}
export function alertBox(title, body, btn = 'OK') {
  return new Promise((res) => {
    const { m, close } = openModal(`<h2>${T(title)}</h2><div class="sub">${T(body)}</div><button class="btn green" data-ok>${T(btn)}</button>`, { closable: false });
    m.querySelector('[data-ok]').addEventListener('click', () => { sfx('tap'); close(); res(true); });
  });
}
export function confirmBox(title, body, yes = 'はい', no = 'いいえ') {
  return new Promise((res) => {
    const { m, close } = openModal(`<h2>${T(title)}</h2><div class="sub">${T(body)}</div><div class="row"><button class="btn gray" data-no>${T(no)}</button><button class="btn green" data-yes>${T(yes)}</button></div>`, { closable: false });
    m.querySelector('[data-yes]').addEventListener('click', () => { sfx('tap'); close(); res(true); });
    m.querySelector('[data-no]').addEventListener('click', () => { sfx('tap'); close(); res(false); });
  });
}
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function cardHtml(id, { small = false, sel = false, owned = true } = {}) {
  const c = CARDS[id]; if (!c) return '';
  const phase = c.type === 'active' ? (c.phase === 'quiz' ? 'もんだいで つかう' : 'ステージで つかう') : 'もっているだけで きく';
  return `<div class="skill-card ${small ? 'small' : ''} ${sel ? 'sel' : ''} ${owned ? '' : 'owned-no'}" data-card="${id}">
    <div class="rr">${RARITY_STARS(c.rarity)}</div><div class="ic">${c.icon}</div><div class="nm">${T(c.name)}</div>
    <div class="tp ${c.type}">${phase}</div><div class="ds">${T(c.desc)}</div></div>`;
}
export function cardDetail(id) {
  const c = CARDS[id];
  return alertBox(`${c.icon} ${c.name}`, `${c.type === 'active' ? (c.phase === 'quiz' ? 'もんだいで つかう カード' : 'ステージで つかう カード') : 'もっているだけで きく カード'}<br>${c.desc}`);
}
// 3まいから 1まい えらぶ（スキップも できる）。かえり：id | null
export function pickCard(ids, { title = 'カードを 1まい えらぼう', skip = 'いらない' } = {}) {
  return new Promise((res) => {
    const { m, close } = openModal(`<h2>${T(title)}</h2><div class="row">${ids.map((id) => cardHtml(id)).join('')}</div><button class="btn gray small" data-skip>${T(skip)}</button>`, { closable: false });
    $$('[data-card]', m).forEach((n) => n.addEventListener('click', () => { sfx('select'); close(); res(n.dataset.card); }));
    m.querySelector('[data-skip]').addEventListener('click', () => { sfx('tap'); close(); res(null); });
  });
}
// デッキが いっぱい：いれかえる カードを えらぶ
export function pickReplace(deck, newId) {
  const cands = deck.filter((id) => !CARDS[id].fixed);
  return new Promise((res) => {
    const { m, close } = openModal(`<h2>${T('デッキが いっぱい！')}</h2><div class="sub">${T('どの カードと いれかえる？')}</div><div class="row">${cands.map((id) => cardHtml(id, { small: true })).join('')}</div><div class="row">${cardHtml(newId, { small: true, sel: true })}<span class="sub">← あたらしい カード</span></div><button class="btn gray small" data-skip>${T('いれかえない')}</button>`, { closable: false });
    $$('[data-card]', m).forEach((n) => { if (n.dataset.card !== newId || cands.includes(newId)) n.addEventListener('click', () => { if (n.closest('.row') && n.dataset.card !== newId) { sfx('select'); close(); res(n.dataset.card); } }); });
    m.querySelector('[data-skip]').addEventListener('click', () => { sfx('tap'); close(); res(null); });
  });
}

export function hudHtml(run, { right = '' } = {}) {
  const h = heroById(run.hero);
  return `<div class="hud">
    <div class="who"><span class="emo">${h.emoji}</span>${T(h.name)}</div>
    <div class="pill">${run.term === 1 ? 'ぜんき' : 'こうき'} ・ ${run.week > 4 ? 'テスト' : run.week + 'しゅうめ'}</div>
    <div class="pill">たいりょく <div class="bar ${run.stamina < 20 ? 'low' : ''}"><i style="width:${run.stamina}%"></i></div> <span class="num">${run.stamina}</span></div>
    <div class="pill">やるき <span style="font-size:26px">${MOODS[run.mood]}</span></div>
    <div class="sp"></div>${right}
    <button class="icon-btn" data-settings title="せってい">⚙️</button>
  </div>`;
}
export function statsHtml(run) {
  return `<div class="stats">${SUBJECTS.map((s) => { const v = run.stats[s]; const r = rankOf(v); return `<div class="stat"><div class="ic">${SUBJ[s].icon}</div><div><div class="nm">${T(SUBJ[s].name)}</div><div class="bar"><i style="width:${Math.min(100, v / 10)}%;background:${SUBJ[s].color}"></i></div></div><div><div class="rk rk-${r}">${r}</div><div class="val">${v}</div></div></div>`; }).join('')}</div>`;
}
export function deckHtml(run, max = 5) {
  const fixed = run.deck.filter((id) => CARDS[id].fixed), rest = run.deck.filter((id) => !CARDS[id].fixed);
  return `<div class="deck-strip">${[...fixed, ...rest].map((id) => `<span class="chip" data-card="${id}">${CARDS[id].icon} ${T(CARDS[id].name)}</span>`).join('')}${Array.from({ length: Math.max(0, max - rest.length) }, () => '<span class="chip empty">＋</span>').join('')}</div>`;
}
export function wireCards(root) { $$('[data-card]', root).forEach((n) => n.addEventListener('click', () => { sfx('tap'); cardDetail(n.dataset.card); })); }

// よみあげ
let speechOn = true;
export function setSpeech(on) { speechOn = on; }
export function canSpeak() { return speechOn && typeof speechSynthesis !== 'undefined'; }
export function speak(text, lang = 'en-US') {
  if (!canSpeak()) return;
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = lang; u.rate = lang === 'en-US' ? 0.85 : 1; speechSynthesis.speak(u); } catch (e) { /* */ }
}
export function screen(html, cls = '') { return el(`<div class="screen fade-in ${cls}">${html}</div>`); }
export { el, $, $$, T };
