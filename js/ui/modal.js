// モーダル（よそう・クイズ・カードの せつめい・せってい など）
import { el, $ } from '../util.js';
import { T, P } from '../text.js';
import { sfx } from '../audio.js';
import { CARDS, CATS, RARITY_NAME } from '../data/cards.js';
import { RELICS } from '../data/relics.js';
import { meta, tipSeen, markTip } from '../save.js';
import { cardHtml } from './cardview.js';
import { clockSvg, gridSvg, coinsSvg, shapeSvg } from './art.js';
import { deckSorted } from '../engine/run.js';

let stage = null;
export function initModal(st) { stage = st; }

export function openModal(html, { closable = true, onClose, cls = '' } = {}) {
  const back = el(`<div class="modal-back"><div class="modal ${cls}">${closable ? '<button class="icon-btn close-x" data-close>✖</button>' : ''}${html}</div></div>`);
  stage.appendChild(back);
  const m = back.firstElementChild;
  let closed = false;
  // えらんで とじる ときは onClose を よばない（えらんだ あたいを かえす ため）
  const close = () => { if (closed) return; closed = true; back.remove(); };
  const dismiss = () => { if (closed) return; close(); onClose && onClose(null); };
  if (closable) {
    back.addEventListener('pointerdown', (e) => { if (e.target === back) { sfx('tap'); dismiss(); } });
    m.querySelector('[data-close]').addEventListener('click', () => { sfx('tap'); dismiss(); });
  }
  return { back, m, close };
}

export function alertBox(title, body, btn = 'OK') {
  return new Promise((res) => {
    const { m, close } = openModal(`<h2>${T(title)}</h2><div class="sub">${T(body)}</div><button class="btn" data-ok>${T(btn)}</button>`, { closable: false });
    m.querySelector('[data-ok]').addEventListener('click', () => { sfx('tap'); close(); res(); });
  });
}
export function confirmBox(title, body, yes = 'はい', no = 'いいえ') {
  return new Promise((res) => {
    const { m, close } = openModal(`<h2>${T(title)}</h2><div class="sub">${T(body)}</div><div class="row"><button class="btn gray" data-no>${T(no)}</button><button class="btn" data-yes>${T(yes)}</button></div>`, { closable: false });
    m.querySelector('[data-yes]').addEventListener('click', () => { sfx('tap'); close(); res(true); });
    m.querySelector('[data-no]').addEventListener('click', () => { sfx('tap'); close(); res(false); });
  });
}

// すうじを いれる（よそう・クイズ）
function keypadHtml() {
  return `<div class="keypad">${[7, 8, 9, 4, 5, 6, 1, 2, 3].map((n) => `<button data-k="${n}">${n}</button>`).join('')}
    <button class="del" data-k="del">⌫</button><button data-k="0">0</button><button class="ok" data-k="ok">OK</button></div>`;
}
function wireKeypad(m, onSubmit, maxLen = 4) {
  let val = '';
  const box = m.querySelector('.answer-box');
  const render = () => { box.textContent = val || '？'; box.classList.toggle('empty', !val); };
  const press = (k) => {
    if (k === 'del') { val = val.slice(0, -1); sfx('tap'); }
    else if (k === 'ok') { if (val) onSubmit(Number(val), box); return; }
    else if (val.length < maxLen) { val = (val === '0' ? '' : val) + k; sfx('tap'); }
    render();
  };
  m.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => press(b.dataset.k)));
  const onKey = (e) => {
    if (!m.isConnected) { document.removeEventListener('keydown', onKey); return; }
    if (/^[0-9]$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('del'); else if (e.key === 'Enter') press('ok');
  };
  document.addEventListener('keydown', onKey);
  render();
  return { reset: () => { val = ''; render(); } };
}

export function chainMiniHtml(slots, startV) {
  const parts = [`<span class="start">${startV}</span>`];
  for (const inst of slots) {
    if (!inst) continue;
    const c = CARDS[inst.id];
    let label = c.face;
    if (label === 'dice') label = '🎲' + (inst.roll ? inst.roll.join('+') : '');
    else if (label.startsWith('shape:')) label = '';
    const face = c.face.startsWith('shape:') ? shapeSvg(c.face.slice(6)).replace('<svg', '<svg style="width:26px;height:26px"') : '';
    parts.push('<span class="arr">→</span>');
    parts.push(`<span class="chip" style="background:${CATS[c.cat].color}">${face}${label ? `<span>${label}</span>` : ''}<span style="font-family:var(--font);font-size:15px">${T(c.name)}${inst.up ? '＋' : ''}</span></span>`);
  }
  parts.push('<span class="arr">→</span><span class="chip" style="background:#ff6a3d">⚔️ ？</span>');
  return `<div class="chain-mini">${parts.join('')}</div>`;
}

// よそう：せいかいなら true / わからない なら null
export function predictPrompt(slots, startV, answer) {
  return new Promise((res) => {
    const { m, close } = openModal(`
      <h2>🔮 ${T('こたえを よそう しよう！')}</h2>
      <div class="sub">${T('じゅもんの さいごの {数|かず}は いくつに なるかな？ あたると ひらめきボーナス！')}</div>
      ${chainMiniHtml(slots, startV)}
      <div class="row" style="align-items:flex-start;gap:26px">
        <div style="display:flex;flex-direction:column;align-items:center;gap:14px">
          <div class="answer-box empty">？</div>
          <button class="btn gray small" data-skip>${T('わからない（そのまま うつ）')}</button>
        </div>
        ${keypadHtml()}
      </div>`, { closable: false });
    wireKeypad(m, (v, box) => {
      const ok = v === answer;
      box.classList.add(ok ? 'ok' : 'ng');
      sfx(ok ? 'correct' : 'wrong');
      setTimeout(() => { close(); res({ ok, value: v }); }, ok ? 500 : 650);
    });
    m.querySelector('[data-skip]').addEventListener('click', () => { sfx('tap'); close(); res(null); });
  });
}

function visHtml(vis) {
  if (!vis) return '';
  if (vis.type === 'clock') return `<div class="quiz-vis" style="width:220px;height:220px">${clockSvg(vis.h, vis.m)}</div>`;
  if (vis.type === 'grid') return `<div class="quiz-vis" style="width:${vis.W * 70}px;max-width:380px">${gridSvg(vis)}</div>`;
  if (vis.type === 'coins') return `<div class="quiz-vis" style="height:80px">${coinsSvg(vis.c10, vis.c1)}</div>`;
  if (vis.type === 'shape') return `<div class="quiz-vis" style="width:130px;height:130px">${shapeSvg(vis.shape)}</div>`;
  if (vis.type === 'emoji') return `<div class="quiz-vis" style="flex-direction:column;align-items:center;font-size:46px;gap:4px">${vis.rows.map(([e, n]) => `<div>${e.repeat(n)}</div>`).join('')}</div>`;
  return '';
}

// クイズ：こたえたら true/false
export function quizPrompt(q, { title = 'もんだい' } = {}) {
  window.__quiz = q;
  return new Promise((res) => {
    const choices = q.choices;
    const { m, close } = openModal(`
      <h2>${T(title)}</h2>
      <div class="quiz-q">${T(q.q)}</div>
      <div class="row" style="gap:30px;align-items:center">
        ${visHtml(q.vis)}
        ${choices
          ? `<div class="choice-list" style="max-width:420px">${choices.map((c, i) => `<button class="btn white" data-c="${i}" style="font-family:var(--num)">${T(String(c))}</button>`).join('')}</div>`
          : `<div style="display:flex;flex-direction:column;align-items:center;gap:12px"><div class="answer-box empty">？</div></div>${keypadHtml()}`}
      </div>
      <div class="explain" style="display:none"></div>
      <button class="btn green" data-next style="display:none">${T('つぎへ')}</button>`, { closable: false, cls: 'quiz-modal' });
    const done = (ok) => {
      sfx(ok ? 'correct' : 'wrong');
      const ex = m.querySelector('.explain');
      ex.innerHTML = (ok ? '⭕ ' + T('せいかい！') + '<br>' : '💡 ' + T('こたえは') + ` <b class="num" style="font-size:28px">${q.answer}</b><br>`) + T(q.explain);
      ex.style.display = '';
      const nb = m.querySelector('[data-next]');
      nb.style.display = '';
      m.querySelectorAll('.keypad button, .choice-list button').forEach((b) => (b.disabled = true));
      nb.addEventListener('click', () => { sfx('tap'); close(); res(ok); });
    };
    if (choices) {
      m.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', () => {
        const ok = choices[Number(b.dataset.c)] === q.answer;
        b.classList.remove('white'); b.classList.add(ok ? 'green' : 'gray');
        if (!ok) m.querySelectorAll('[data-c]').forEach((x) => { if (choices[Number(x.dataset.c)] === q.answer) { x.classList.remove('white'); x.classList.add('green'); } });
        done(ok);
      }));
    } else {
      let answered = false;
      wireKeypad(m, (v, box) => { if (answered) return; answered = true; const ok = v === q.answer; box.classList.add(ok ? 'ok' : 'ng'); done(ok); }, 5);
    }
  });
}

// カードの せつめい
export function cardDetail(inst) {
  const c = CARDS[inst.id];
  const known = c.fact && meta.facts['card:' + c.id];
  const factHtml = c.fact ? (known
    ? `<div class="explain">📖 ${T(c.fact)}</div>`
    : `<div class="explain" style="background:#fff6d6;color:#7a5600">❔ ${T(c.hidden ? 'この カードの {数|かず}は いくつ かな？ しっていると つよいよ！ つかうと ずかんに のるよ' : 'つかうと ちしきが ずかんに のるよ')}</div>`) : '';
  const tags = [];
  if (c.tags.insect) tags.push('🐞 ' + (known ? 'こんちゅう' : '？'));
  return new Promise((res) => {
    openModal(`<div class="row" style="gap:36px;align-items:center;flex-wrap:nowrap">
      <div style="transform:scale(1.5);margin:60px 40px">${cardHtml(inst)}</div>
      <div style="display:flex;flex-direction:column;gap:12px;max-width:440px">
        <h2 style="text-align:left">${T(c.name)}${inst.up ? '＋' : ''}</h2>
        <div class="sub" style="text-align:left"><span class="badge" style="background:${CATS[c.cat].color};color:#fff">${T(CATS[c.cat].name)}</span>　${T(RARITY_NAME[c.rar])}</div>
        <div style="font-size:22px;font-weight:800;line-height:1.6">${T(c.text(!!inst.up))}</div>
        ${c.exhaust && c.exhaust(!!inst.up) ? `<div class="sub" style="text-align:left;font-size:17px;color:#c2410c">🔥 ${T('この カードは たたかいで 1{回|かい}だけ つかえる')}</div>` : ''}
        ${c.id === 'dice' ? `<div class="sub" style="text-align:left;font-size:17px">🎲 ${T('さいころは カードを ひいた ときに ふられるよ')}</div>` : ''}
        ${c.id === 'memoSet' ? `<div class="sub" style="text-align:left;font-size:17px">📝 ${T('メモは たたかいが おわるまで のこるよ')}</div>` : ''}
        ${!inst.up && c.rar !== 'x' ? `<div class="sub" style="text-align:left;font-size:16px">${T('きたえると：')}${T(c.text(true))}</div>` : ''}
        ${factHtml}
      </div></div>`, { onClose: res });
  });
}

export function relicDetail(id) {
  const r = RELICS[id];
  return new Promise((res) => openModal(`<div style="font-size:90px">${r.icon}</div><h2>${T(r.name)}</h2><div class="sub" style="font-size:22px">${T(r.text)}</div>`, { onClose: res }));
}

// デッキを みる / カードを えらぶ
export function deckView(cards, { title = 'デッキ', pick = false, filter, sub } = {}) {
  return new Promise((res) => {
    const list = deckSorted(cards).filter((c) => !filter || filter(c));
    const { m, close } = openModal(`<h2>${T(title)}（${list.length}{枚|まい}）</h2>${sub ? `<div class="sub">${T(sub)}</div>` : ''}
      <div class="scroll" style="max-height:560px;width:1000px;max-width:100%"><div class="card-grid">${list.map((c) => cardHtml(c)).join('') || `<div class="sub">${T('カードが ないよ')}</div>`}</div></div>`,
      { onClose: () => res(null) });
    m.querySelectorAll('.card-grid .card').forEach((n) => {
      n.addEventListener('click', () => {
        const inst = list.find((c) => c.uid === n.dataset.uid);
        sfx('tap');
        if (pick) { close(); res(inst); } else cardDetail(inst);
      });
    });
  });
}

// ふくろう せんせいの ヒント（いちど だけ）
let owlQueue = Promise.resolve();
export function owl(id, text, { force = false, spot } = {}) {
  if (!force && id && tipSeen(id)) return Promise.resolve();
  if (id) markTip(id);
  owlQueue = owlQueue.then(() => new Promise((res) => {
    const dim = el('<div class="owl-dim"></div>');
    const tip = el(`<div class="owl-tip"><div class="owl">🦉</div><div class="bubble"><span class="who">${T('ホーせんせい')}</span>${T(text)}<span class="next">${T('タップで つぎへ ▶')}</span></div></div>`);
    stage.appendChild(dim); stage.appendChild(tip);
    if (spot) spot.classList.add('spotlight');
    sfx('page');
    const done = () => { dim.remove(); tip.remove(); if (spot) spot.classList.remove('spotlight'); res(); };
    setTimeout(() => { dim.addEventListener('pointerdown', done, { once: true }); tip.addEventListener('pointerdown', done, { once: true }); }, 350);
  }));
  return owlQueue;
}
