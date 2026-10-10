// モーダル
import { el, $, $$ } from '../util.js';
import { T } from '../text.js';
import { sfx } from '../audio.js';
import { CARDS, ELEMENTS, TYPE_NAME, TYPE_HELP, EL_LIST } from '../data/cards.js';
import { ARCANA, arcanaPrice } from '../data/arcana.js';
import { HANDS, HAND_ORDER, handStats } from '../data/hands.js';
import { SCROLLS, scrollName } from '../data/scrolls.js';
import { tipSeen, markTip } from '../save.js';
import { cardHtml, runeText } from './cardview.js';
import { deckSorted } from '../engine/run.js';

let stage = null;
export function initModal(st) { stage = st; }

export function openModal(html, { closable = true, onClose, cls = '' } = {}) {
  const back = el(`<div class="modal-back"><div class="modal ${cls}">${closable ? '<button class="icon-btn close-x" data-close aria-label="とじる">✕</button>' : ''}${html}</div></div>`);
  stage.appendChild(back);
  const m = back.firstElementChild;
  let closed = false;
  // えらんで とじる ときは onClose を よばない（えらんだ あたいを かえす ため）
  const close = () => { if (closed) return; closed = true; back.remove(); };
  const dismiss = () => { if (closed) return; close(); onClose && onClose(null); };
  if (closable) {
    back.addEventListener('pointerdown', (e) => { if (e.target === back) { sfx('tap'); dismiss(); } });
    $('[data-close]', m).addEventListener('click', () => { sfx('tap'); dismiss(); });
  }
  return { back, m, close };
}
export function alertBox(title, body, btn = 'OK') {
  return new Promise((res) => {
    const { m, close } = openModal(`<h2>${T(title)}</h2><div class="sub">${T(body)}</div><button class="btn" data-ok>${T(btn)}</button>`, { closable: false });
    $('[data-ok]', m).addEventListener('click', () => { sfx('tap'); close(); res(); });
  });
}
export function confirmBox(title, body, yes = 'はい', no = 'いいえ') {
  return new Promise((res) => {
    const { m, close } = openModal(`<h2>${T(title)}</h2><div class="sub">${T(body)}</div><div class="row"><button class="btn dark" data-no>${T(no)}</button><button class="btn" data-yes>${T(yes)}</button></div>`, { closable: false });
    $('[data-yes]', m).addEventListener('click', () => { sfx('tap'); close(); res(true); });
    $('[data-no]', m).addEventListener('click', () => { sfx('tap'); close(); res(false); });
  });
}
export function chooseBox(title, body, options) {
  return new Promise((res) => {
    const { m, close } = openModal(`<h2>${T(title)}</h2>${body ? `<div class="sub">${T(body)}</div>` : ''}<div class="row">${options.map((o, i) => `<button class="btn ${o.cls || 'dark'}" data-i="${i}">${T(o.label)}</button>`).join('')}</div>`, { onClose: () => res(null) });
    $$('[data-i]', m).forEach((b) => b.addEventListener('click', () => { sfx('tap'); const v = options[Number(b.dataset.i)].value; close(); res(v); }));
  });
}

export function cardDetail(inst) {
  const c = CARDS[inst.id];
  const isRune = c.type === 'rune';
  const text = isRune ? runeText(inst) : c.text(!!inst.up);
  const upText = !isRune && !inst.up && c.rar !== 'x' ? `<div class="sub" style="text-align:left;font-size:15px">${T('きたえると：')}${T(c.text(true))}</div>` : '';
  const elName = isRune ? ELEMENTS[inst.el].icon + ' ' + ELEMENTS[inst.el].name : ELEMENTS[c.el].icon + ' ' + ELEMENTS[c.el].name;
  return new Promise((res) => {
    openModal(`<div class="row" style="gap:40px;flex-wrap:nowrap;align-items:center">
      <div style="transform:scale(1.55);margin:56px 40px">${cardHtml(inst)}</div>
      <div style="display:flex;flex-direction:column;gap:10px;max-width:440px">
        <h2 style="text-align:left">${isRune ? T(`${ELEMENTS[inst.el].name}の ルーン ${inst.v}`) : T(c.name + (inst.up ? '＋' : ''))}</h2>
        <div class="sub" style="text-align:left">${T(TYPE_NAME[c.type])}　${T(elName)}${isRune ? '' : `　${T('マナ')} ${c.type === 'curse' ? '-' : (inst.up && c.costUp !== undefined ? c.costUp : c.cost)}`}</div>
        <div style="font-size:21px;line-height:1.6">${T(text)}</div>
        <div class="sub" style="text-align:left;font-size:14px">${T(TYPE_HELP[c.type])}</div>
        ${upText}
        ${c.fact ? `<div class="explain">📖 ${T(c.fact)}</div>` : ''}
      </div></div>`, { onClose: res });
  });
}

export function arcanaHtml(a, extra = '') {
  const d = ARCANA[a.id];
  return `<div class="arc r-${d.rar}" data-auid="${a.uid || ''}" data-aid="${a.id}">${extra}<div class="ai">${d.icon}</div><div class="an">${T(d.name)}</div>${d.grows && a.n ? `<div class="acount">${a.n}</div>` : ''}</div>`;
}
export function arcanaDetail(a, { sell, move } = {}) {
  const d = ARCANA[a.id];
  return new Promise((res) => {
    const { m, close } = openModal(`<div style="font-size:84px">${d.icon}</div><h2>${T(d.name)}</h2>
      <div class="sub" style="font-size:20px;color:var(--ink)">${T(d.text)}</div>
      ${d.grows ? `<div class="sub">${T(`いま たまっている：${a.n || 0}`)}</div>` : ''}
      <div class="sub" style="font-size:14px">${T('アルカナは ひだりから じゅんばんに はたらく。×の アルカナは みぎに おくと つよい！')}</div>
      <div class="row">
        ${move ? `<button class="btn dark small" data-mv="-1">◀ ${T('ひだりへ')}</button><button class="btn dark small" data-mv="1">${T('みぎへ')} ▶</button>` : ''}
        ${sell ? `<button class="btn gold small" data-sell>${T(`うる（🪙 ${sell}）`)}</button>` : ''}
      </div>`, { onClose: () => res(null) });
    $$('[data-mv]', m).forEach((b) => b.addEventListener('click', () => { sfx('tap'); close(); res({ move: Number(b.dataset.mv) }); }));
    $('[data-sell]', m)?.addEventListener('click', () => { sfx('coin'); close(); res({ sell: true }); });
  });
}

export function deckView(cards, { title = 'デッキ', pick = false, filter, sub } = {}) {
  return new Promise((res) => {
    const list = deckSorted(cards).filter((c) => !filter || filter(c));
    const { m, close } = openModal(`<h2>${T(title)}（${list.length}{枚|まい}）</h2>${sub ? `<div class="sub">${T(sub)}</div>` : ''}
      <div class="scroll" style="max-height:560px;width:1040px;max-width:100%"><div class="card-grid">${list.map((c) => cardHtml(c)).join('') || `<div class="sub">${T('カードが ないよ')}</div>`}</div></div>`, { onClose: () => res(null) });
    $$('.card-grid .card', m).forEach((n) => n.addEventListener('click', () => {
      const inst = list.find((c) => c.uid === n.dataset.uid);
      sfx('tap');
      if (pick) { close(); res(inst); } else cardDetail(inst);
    }));
  });
}

export function handsTable(handLv = {}, highlight) {
  const rows = HAND_ORDER.filter((h) => h !== 'none').map((id) => {
    const H = HANDS[id];
    const lv = handLv[id] || 1;
    const s = handStats(id, lv);
    return `<tr style="${id === highlight ? 'background:rgba(227,181,91,.15)' : ''}"><td class="hn2">${T(H.name)}${H.math ? ' 🔢' : ''}</td>
      <td><div class="mini-runes">${H.ex.map((v) => `<i>${v}</i>`).join('')}</div></td>
      <td style="font-size:14px;color:var(--ink-dim)">${T(H.desc)}</td>
      <td class="hv"><span class="p">${s.power}</span> × <span class="m">${s.mult}</span></td>
      <td style="font-size:12px;color:var(--gold)">Lv${lv}</td></tr>`;
  }).join('');
  return new Promise((res) => openModal(`<h2>${T('{役|やく}の いちらん')}</h2>
    <div class="sub">${T('じゅもんに いれた ルーンの くみあわせで {役|やく}が きまる。うえほど つよい！ 🔢は さんすうの {役|やく}')}</div>
    <div class="scroll" style="max-height:560px;width:900px;max-width:100%"><table class="hands-table">${rows}</table></div>`, { onClose: res }));
}

// けいさん チャレンジ（かけ算の こたえを えらぶ）
export function challengePrompt(p, m, grade) {
  const ans = p * m;
  const n = grade === 3 ? 4 : 3;
  const pool = grade === 1
    ? [p + m, ans + p, ans - p, p * (m + 2), ans * 2]
    : grade === 2 ? [p * (m + 1), p * (m - 1), (p + 10) * m, ans + 10, ans - 10, p + m]
      : [p * (m + 1), p * (m - 1), ans + 10, ans - 10, (p + 1) * m, (p - 1) * m, ans + 100];
  const cand = [...new Set(pool.filter((c) => c > 0 && c !== ans))].sort(() => Math.random() - 0.5);
  const set = new Set([ans, ...cand.slice(0, n - 1)]);
  let k = 2; while (set.size < n) set.add(ans + 7 * k++);
  const opts = [...set].sort((a, b) => a - b);
  let tip;
  if (m >= 10 && m % 10) tip = `${p} × ${m} は ${p} × ${m - (m % 10)} と ${p} × ${m % 10} を たした {数|かず}`;
  else if (p >= 10 && p % 10) tip = `${p} × ${m} は ${p - (p % 10)} × ${m} と ${p % 10} × ${m} を たした {数|かず}`;
  else if (p % 10 === 0 && p >= 10) tip = `${p} × ${m} は ${p / 10} × ${m} の 10{倍|ばい}`;
  else if (m % 10 === 0 && m >= 10) tip = `${p} × ${m} は ${p} × ${m / 10} の 10{倍|ばい}`;
  else tip = `${p} × ${m} は {九九|くく}で わかるよ`;
  const hint = grade === 1 ? `<div class="sub">${T(`${p} が ${m}こ ぶん。${m <= 4 ? Array(m).fill(p).join(' + ') : ''}`)}</div>`
    : grade === 2 ? `<div class="sub">${T('ヒント：' + tip)}</div>`
      : `<div class="sub">${T('だいたい いくつに なるか かんがえて みよう')}</div>`;
  return new Promise((res) => {
    const { m: md, close } = openModal(`<h2>🔮 ${T('けいさん チャレンジ')}</h2>
      <div class="sub">${T('あたると「ひらめき」で ダメージが 1.5{倍|ばい}！')}</div>
      <div class="eq-big"><span class="p">${p}</span><span>×</span><span class="m">${m}</span><span>=</span><span>？</span></div>
      ${hint}
      <div class="ans-btns">${opts.map((o) => `<button class="btn blue" data-v="${o}">${o}</button>`).join('')}</div>
      <button class="btn dark small" data-skip>${T('パス')}</button>`, { closable: false });
    $$('[data-v]', md).forEach((b) => b.addEventListener('click', () => {
      const ok = Number(b.dataset.v) === ans;
      b.classList.remove('blue'); b.classList.add(ok ? 'green' : 'dark');
      if (!ok) $$('[data-v]', md).forEach((x) => { if (Number(x.dataset.v) === ans) { x.classList.remove('blue'); x.classList.add('green'); } });
      sfx(ok ? 'correct' : 'wrong');
      $$('button', md).forEach((x) => (x.disabled = true));
      setTimeout(() => { close(); res({ ok, tried: true }); }, ok ? 650 : 1200);
    }));
    $('[data-skip]', md).addEventListener('click', () => { sfx('tap'); close(); res({ ok: false, tried: false }); });
  });
}

// クイズ（できごと）
function keypadHtml() {
  return `<div class="keypad">${[7, 8, 9, 4, 5, 6, 1, 2, 3].map((n) => `<button data-k="${n}">${n}</button>`).join('')}<button class="del" data-k="del">⌫</button><button data-k="0">0</button><button class="ok" data-k="ok">OK</button></div>`;
}
export function quizPrompt(q, visHtml = '', title = 'なぞとき') {
  window.__quiz = q;
  return new Promise((res) => {
    const { m, close } = openModal(`<h2>${T(title)}</h2><div class="quiz-q">${T(q.q)}</div>
      <div class="row" style="gap:28px">${visHtml}
        ${q.choices ? `<div class="choice-list" style="max-width:420px">${q.choices.map((c, i) => `<button class="btn dark" data-c="${i}">${T(String(c))}</button>`).join('')}</div>`
          : `<div class="answer-box">？</div>${keypadHtml()}`}</div>
      <div class="explain" style="display:none"></div><button class="btn green" data-next style="display:none">${T('つぎへ')}</button>`, { closable: false, cls: 'quiz-modal' });
    const done = (ok) => {
      sfx(ok ? 'correct' : 'wrong');
      const ex = $('.explain', m);
      ex.innerHTML = (ok ? '⭕ ' + T('せいかい！') : '💡 ' + T('こたえは') + ` <b class="num">${q.answer}</b>`) + '<br>' + T(q.explain);
      ex.style.display = '';
      $$('.keypad button, .choice-list button', m).forEach((b) => (b.disabled = true));
      const nb = $('[data-next]', m); nb.style.display = '';
      nb.addEventListener('click', () => { sfx('tap'); close(); res(ok); });
    };
    if (q.choices) {
      $$('[data-c]', m).forEach((b) => b.addEventListener('click', () => {
        const ok = q.choices[Number(b.dataset.c)] === q.answer;
        b.classList.remove('dark'); b.classList.add(ok ? 'green' : 'blue');
        done(ok);
      }));
    } else {
      let val = '', answered = false;
      const box = $('.answer-box', m);
      $$('[data-k]', m).forEach((b) => b.addEventListener('click', () => {
        if (answered) return;
        const k = b.dataset.k;
        if (k === 'del') val = val.slice(0, -1);
        else if (k === 'ok') { if (!val) return; answered = true; const ok = Number(val) === q.answer; box.classList.add(ok ? 'ok' : 'ng'); done(ok); return; }
        else if (val.length < 5) val = (val === '0' ? '' : val) + k;
        sfx('tap'); box.textContent = val || '？';
      }));
    }
  });
}

export function elementPicker(current) {
  return chooseBox('ぞくせいを えらぼう', '', EL_LIST.filter((e) => e !== current).map((e) => ({ label: `${ELEMENTS[e].icon} ${ELEMENTS[e].name}`, value: e })));
}

export function scrollDetail(s, { canUse = true, sell } = {}) {
  const d = SCROLLS[s.id];
  return new Promise((res) => {
    const { m, close } = openModal(`<div style="font-size:76px">${d.icon}</div><h2>${T(scrollName(s))}</h2>
      <div class="sub" style="font-size:20px;color:var(--ink)">${T(d.text(s))}</div>
      <div class="row">${canUse ? `<button class="btn green" data-use>${T('つかう')}</button>` : `<div class="sub">${T(d.where === 'battle' ? 'たたかいの ときに つかえる' : 'いまは つかえない')}</div>`}
      ${sell ? `<button class="btn gold small" data-sell>${T(`すてる`)}</button>` : ''}</div>`, { onClose: () => res(null) });
    $('[data-use]', m)?.addEventListener('click', () => { sfx('tap'); close(); res('use'); });
    $('[data-sell]', m)?.addEventListener('click', () => { sfx('tap'); close(); res('drop'); });
  });
}

// ガイド（くろねこの ノクス）
let q = Promise.resolve();
export function guide(id, text, { force = false, spot } = {}) {
  if (!force && id && tipSeen(id)) return Promise.resolve();
  if (id) markTip(id);
  q = q.then(() => new Promise((res) => {
    const dim = el('<div class="guide-dim"></div>');
    const tip = el(`<div class="guide-tip"><div class="gface">🐈‍⬛</div><div class="bubble"><span class="who">${T('ノクス')}</span>${T(text)}<span class="next">${T('タップで つぎへ ▶')}</span></div></div>`);
    stage.appendChild(dim); stage.appendChild(tip);
    if (spot) spot.classList.add('spotlight');
    sfx('page');
    const done = () => { dim.remove(); tip.remove(); if (spot) spot.classList.remove('spotlight'); res(); };
    setTimeout(() => { dim.addEventListener('pointerdown', done, { once: true }); tip.addEventListener('pointerdown', done, { once: true }); }, 350);
  }));
  return q;
}
