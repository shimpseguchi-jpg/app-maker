// もんだいの がめん：レッスン（5もん）と テストの もんだいフェーズ（6もん）で つかう
import { el, $, $$ } from '../../../js/util.js';
import { T } from '../../../js/text.js';
import { sfx } from '../../../js/audio.js';
import { clockSvg, gridSvg, coinsSvg, shapeSvg } from '../../../js/ui/art.js';
import { SUBJ, TEACHERS } from '../data/characters.js';
import { CARDS } from '../data/cards.js';
import { speak, canSpeak } from './common.js';

function visHtml(vis) {
  if (!vis) return '';
  if (vis.type === 'clock') return `<div class="quiz-vis" style="width:200px;height:200px">${clockSvg(vis.h, vis.m)}</div>`;
  if (vis.type === 'grid') return `<div class="quiz-vis" style="width:${vis.W * 60}px;max-width:360px">${gridSvg(vis)}</div>`;
  if (vis.type === 'coins') return `<div class="quiz-vis" style="height:80px">${coinsSvg(vis.c10, vis.c1)}</div>`;
  if (vis.type === 'shape') return `<div class="quiz-vis" style="width:120px;height:120px">${shapeSvg(vis.shape)}</div>`;
  if (vis.type === 'emoji') return `<div class="quiz-vis" style="flex-direction:column;align-items:center;font-size:${vis.rows.length === 1 && vis.rows[0][1] === 1 ? 110 : 44}px;gap:4px;line-height:1.1">${vis.rows.map(([e, n]) => `<div>${e.repeat(n)}</div>`).join('')}</div>`;
  return '';
}
const keypadHtml = () => `<div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 'del', 0, 'ok'].map((k) => k === 'del' ? '<button class="del" data-k="del">⌫</button>' : k === 'ok' ? `<button class="ok" data-k="ok">${T('けってい')}</button>` : `<button data-k="${k}">${k}</button>`).join('')}</div>`;

// 1もん だす。opts: { index, total, dots, actives: Set, usedActives: Set, onActive(id) , regenerate() }
// かえり：{ ok, used: [カード], answer }
export function askQuestion(root, q, opts = {}) {
  return new Promise((res) => {
    window.__q = q; // つうしテスト用
    const subj = q.subj; const te = TEACHERS[subj];
    const dots = (opts.dots || []).map((d, i) => `<i class="${d === true ? 'ok' : d === false ? 'ng' : i === opts.index ? 'cur' : ''}"></i>`).join('');
    const activeIds = [...(opts.actives || [])].filter((id) => CARDS[id]?.phase === 'quiz' && !opts.usedActives?.has(id));
    const wrap = el(`<div class="quiz-wrap">
      <div class="quiz-top"><span style="font-size:34px">${te.emoji}</span><span>${T(te.name)}</span><span class="tag" style="background:${SUBJ[subj].color};color:#fff">${SUBJ[subj].icon} ${T(SUBJ[subj].name)}</span><span class="dots">${dots}</span><span class="sp" style="flex:1"></span><span class="num">${(opts.index ?? 0) + 1} / ${opts.total ?? 1}</span></div>
      <div class="quiz-card">
        <div class="quiz-q">${T(q.q)}</div>
        ${q.audio && canSpeak() ? `<button class="btn blue speak-btn" data-speak>🔊 ${T('きく')}</button>` : ''}
        <div class="row" style="gap:30px;align-items:center;width:100%">
          ${visHtml(q.vis)}
          ${q.choices ? `<div class="choice-grid ${q.big ? 'big' : ''} ${q.choices.length === 2 ? 'two' : ''}">${q.choices.map((c, i) => `<button class="btn white" data-c="${i}">${T(String(c))}</button>`).join('')}</div>`
            : `<div class="col"><div class="answer-box empty" data-box>？</div></div>${keypadHtml()}`}
        </div>
        ${activeIds.length ? `<div class="active-cards">${activeIds.map((id) => `<button class="btn purple" data-active="${id}">${CARDS[id].icon} ${T(CARDS[id].name)}</button>`).join('')}</div>` : ''}
        <div class="explain" style="display:none"></div>
        <div class="row"><button class="btn gray small" data-giveup>🤔 ${T('わからない')}</button><button class="btn green big" data-next style="display:none">${T('つぎへ')}</button></div>
      </div></div>`);
    root.querySelector('.quiz-wrap')?.remove();
    root.appendChild(wrap);
    const used = []; let retry = false, perfectOn = false, answered = false, hinted = false;
    if (q.autoSpeak && q.audio) setTimeout(() => speak(q.audio), 300);
    wrap.querySelector('[data-speak]')?.addEventListener('click', () => { sfx('tap'); speak(q.audio); });
    if (q.audioChoices && canSpeak()) $$('[data-c]', wrap).forEach((b) => { b.addEventListener('pointerenter', () => {}); });
    const finish = (ok, value) => {
      if (answered) return; answered = true;
      sfx(ok ? 'correct' : 'wrong');
      const ex = wrap.querySelector('.explain');
      ex.innerHTML = (ok ? '⭕ ' + T('せいかい！') + '<br>' : '💡 ' + T('こたえは') + ` <b style="font-size:28px">${T(String(q.answer))}</b><br>`) + T(q.explain || '');
      ex.style.display = '';
      $$('.keypad button, .choice-grid button, [data-active], [data-giveup]', wrap).forEach((b) => (b.disabled = true));
      wrap.querySelector('[data-giveup]').style.display = 'none';
      const nb = wrap.querySelector('[data-next]'); nb.style.display = '';
      nb.addEventListener('click', () => { sfx('tap'); res({ ok, used, value }); });
    };
    const judge = (v) => {
      let ok = String(v) === String(q.answer);
      if (!ok && perfectOn) ok = true;
      if (!ok && retry) { retry = false; sfx('wrong'); $$('[data-c]', wrap).forEach((b) => { if (b.textContent.trim() === T(String(v))) { b.classList.remove('white'); b.classList.add('gray'); b.disabled = true; } }); const box = wrap.querySelector('[data-box]'); if (box) { box.classList.add('ng'); setTimeout(() => { box.classList.remove('ng'); box.textContent = '？'; box.classList.add('empty'); }, 500); } return; }
      finish(ok, v);
    };
    $$('[data-c]', wrap).forEach((b) => b.addEventListener('click', () => {
      const v = q.choices[Number(b.dataset.c)];
      const ok = String(v) === String(q.answer) || perfectOn;
      b.classList.remove('white'); b.classList.add(ok ? 'green' : 'gray');
      if (!ok && !retry) $$('[data-c]', wrap).forEach((x) => { if (String(q.choices[Number(x.dataset.c)]) === String(q.answer)) { x.classList.remove('white'); x.classList.add('green'); } });
      judge(v);
    }));
    // キーぱっど
    const box = wrap.querySelector('[data-box]');
    if (box) {
      let buf = '';
      $$('.keypad button', wrap).forEach((b) => b.addEventListener('click', () => {
        const k = b.dataset.k; sfx('tap');
        if (k === 'del') buf = buf.slice(0, -1);
        else if (k === 'ok') { if (!buf) return; const v = Number(buf); box.classList.add(String(v) === String(q.answer) || perfectOn ? 'ok' : 'ng'); judge(v); buf = ''; return; }
        else if (buf.length < 5) buf += k;
        box.textContent = buf || '？'; box.classList.toggle('empty', !buf);
      }));
    }
    wrap.querySelector('[data-giveup]').addEventListener('click', () => { sfx('tap'); if (perfectOn) { finish(true, null); return; } $$('[data-c]', wrap).forEach((x) => { if (String(q.choices?.[Number(x.dataset.c)]) === String(q.answer)) { x.classList.remove('white'); x.classList.add('green'); } }); finish(false, null); });
    // もんだい用カード
    $$('[data-active]', wrap).forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.active; sfx('select'); b.disabled = true; used.push(id); opts.onActive && opts.onActive(id);
      if (id === 'hint') {
        if (q.choices && !hinted) { hinted = true; const wrong = $$('[data-c]', wrap).filter((x) => String(q.choices[Number(x.dataset.c)]) !== String(q.answer) && !x.disabled); if (wrong.length) { const w = wrong[Math.floor(Math.random() * wrong.length)]; w.disabled = true; w.classList.add('gray'); w.style.opacity = '.35'; } }
        else if (box) { box.textContent = '？'.repeat(String(q.answer).length); }
      } else if (id === 'retry') retry = true;
      else if (id === 'perfect') { perfectOn = true; b.textContent = '💯 まんてん ON'; }
      else if (id === 'swap') { res({ swap: true, used }); }
    }));
  });
}
