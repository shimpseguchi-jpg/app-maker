// もんだいの がめん（モーダル）。こたえると きろくして、せつめいを みせる
import { T } from '../../../js/text.js';
import { el, $, $$, makeRng, newSeed } from '../../../js/util.js';
import { sfx } from '../../../js/audio.js';
import { clockSvg, gridSvg, coinsSvg, shapeSvg } from '../../../js/ui/art.js';
import { SUBJECTS, nextQuestion, recordAnswer } from '../engine/learn.js';
import { settings } from '../save.js';
import { fixed, swapOf } from '../data/quiz_bun.js';

const rng = makeRng(newSeed());
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const canSpeak = () => settings.speech !== false && typeof speechSynthesis !== 'undefined';
export function speak(text) {
  if (!canSpeak()) return;
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.85; speechSynthesis.speak(u); } catch (e) { /* */ }
}
function visHtml(vis) {
  if (!vis) return '';
  if (vis.type === 'clock') return `<div class="quiz-vis" style="width:190px;height:190px">${clockSvg(vis.h, vis.m)}</div>`;
  if (vis.type === 'grid') return `<div class="quiz-vis" style="width:${vis.W * 56}px;max-width:340px">${gridSvg(vis)}</div>`;
  if (vis.type === 'coins') return `<div class="quiz-vis" style="height:80px">${coinsSvg(vis.c10, vis.c1)}</div>`;
  if (vis.type === 'shape') return `<div class="quiz-vis" style="width:120px;height:120px">${shapeSvg(vis.shape)}</div>`;
  if (vis.type === 'emoji') return `<div class="quiz-vis emoji" style="font-size:${vis.small ? 48 : vis.rows.length === 1 && vis.rows[0][1] === 1 ? 100 : 42}px">${vis.rows.map(([e, n]) => `<div>${e.repeat(n)}</div>`).join('')}</div>`;
  // まるを ならべる（10こで 1れつ）。a こは あか、b こは あお
  if (vis.type === 'dots') return `<div class="quiz-vis dots10">${Array.from({ length: vis.a + vis.b }, (_, i) => `<i class="${i < vis.a ? 'a' : 'b'}"></i>`).join('')}</div>`;
  return '';
}

// ── かんがえかたを 1てずつ いれる もんだい（steps）。まちがえた ところで おわり、ただしい かんがえかたを みせる
const padHtml = () => `<div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 'del', 0, 'ok'].map((k) => (k === 'del' ? '<button class="del" data-k="del">⌫</button>' : k === 'ok' ? `<button class="ok" data-k="ok">${T('けってい')}</button>` : `<button data-k="${k}">${k}</button>`)).join('')}</div>`;
function stepsHtml(q) {
  return `<div class="steps">${q.steps.map((s, i) => `<div class="step" data-step="${i}" ${i ? 'hidden' : ''}><span class="no">${i + 1}</span><span class="tx">${T(s.text).replace('□', '<b class="blank">？</b>')}</span>${s.choices ? `<span class="ops">${s.choices.map((c) => `<button class="op" data-op="${c}">${T(c)}</button>`).join('')}</span>` : ''}</div>`).join('')}</div>${padHtml()}`;
}
function wireSteps(back, q, finish) {
  let cur = 0, buf = '';
  const pad = $('.keypad', back);
  const show = () => {
    const el2 = $(`[data-step="${cur}"]`, back); el2.hidden = false; el2.classList.add('cur');
    pad.classList.toggle('off', !!q.steps[cur].choices); buf = '';
  };
  const answer = (v, btn) => {
    const s = q.steps[cur], row = $(`[data-step="${cur}"]`, back), ok = String(v) === String(s.answer);
    row.classList.remove('cur'); row.classList.add(ok ? 'right' : 'wrong');
    const blank = $('.blank', row); if (blank) blank.textContent = ok ? v : `${v} → ${s.answer}`;
    if (btn) { btn.classList.add(ok ? 'right' : 'wrong'); $$('.op', row).forEach((b) => { b.disabled = true; if (String(b.dataset.op) === String(s.answer)) b.classList.add('right'); }); }
    if (!ok) { finish(false); return; }
    if (++cur >= q.steps.length) { finish(true); return; }
    sfx('place'); show();
  };
  $$('.op', back).forEach((b) => b.addEventListener('click', () => { if (+b.closest('.step').dataset.step === cur) answer(b.dataset.op, b); }));
  $$('button', pad).forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.k, blank = $(`[data-step="${cur}"] .blank`, back); if (!blank || q.steps[cur].choices) return;
    sfx('tap');
    if (k === 'del') buf = buf.slice(0, -1);
    else if (k === 'ok') { if (buf) answer(Number(buf)); return; }
    else if (buf.length < 3) buf += k;
    blank.textContent = buf || '？';
  }));
  show();
}

// 1もん だす。opts: { head（なんの ための もんだいか）, keypad, subj, reviewOnly, dots:[true/false/null…] }
// かえり：{ ok, q, combo }
export function askQuiz(stage, P, opts = {}) {
  return new Promise((res) => {
    const L = P.learn;
    const q = nextQuestion(L, rng, { keypad: !!opts.keypad, subj: opts.subj || null, reviewOnly: !!opts.reviewOnly, group: opts.group || null });
    window.__q = q; // つうしテスト用
    const sj = SUBJECTS[q.subj];
    const dots = opts.dots ? `<span class="dots">${opts.dots.map((d) => `<i class="${d === true ? 'ok' : d === false ? 'ng' : ''}"></i>`).join('')}</span>` : '';
    const back = el(`<div class="modal-back quiz-back"><div class="modal quiz">
      <div class="quiz-head">${opts.head ? `<span class="why">${T(opts.head)}</span>` : ''}<span class="sp"></span>${dots}${q.review ? `<span class="tag review">🔁 ${T('ふくしゅう')}</span>` : ''}<span class="tag subj" style="--c:${sj.color}">${sj.emo} ${T(sj.name)}</span>${L.combo >= 2 ? `<span class="tag combo">🔥 ${L.combo}${T('れんぞく')}</span>` : ''}</div>
      <div class="quiz-q ${q.long ? 'long' : ''}">${T(q.q)}</div>
      ${q.audio && canSpeak() ? `<button class="btn small gray" data-speak>🔊 ${T('きく')}</button>` : ''}
      <div class="quiz-body">
        ${visHtml(q.vis)}
        ${q.type === 'steps' ? stepsHtml(q) : q.type ? `<div class="bun">${bunHtml(q)}</div>` : q.choices ? `<div class="choices ${q.big ? 'big' : ''} ${q.row ? 'row' : ''} n${q.choices.length}">${q.choices.map((c, i) => `<button class="choice" data-c="${i}">${T(String(c))}</button>`).join('')}</div>`
          : `<div class="answer-box empty" data-box>？</div><div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 'del', 0, 'ok'].map((k) => (k === 'del' ? '<button class="del" data-k="del">⌫</button>' : k === 'ok' ? `<button class="ok" data-k="ok">${T('けってい')}</button>` : `<button data-k="${k}">${k}</button>`)).join('')}</div>`}
      </div>
      <div class="explain" hidden></div>
      <div class="quiz-foot"><button class="btn small gray" data-giveup>🤔 ${T('わからない')}</button><button class="btn" data-next hidden>${T('わかった！')}</button></div>
    </div></div>`);
    stage.append(back);
    if (q.autoSpeak && q.audio) setTimeout(() => speak(q.audio), 300);
    $('[data-speak]', back)?.addEventListener('click', () => { sfx('tap'); speak(q.audio); });
    let answered = false;
    const finish = (ok) => {
      if (answered) return; answered = true;
      sfx(ok ? 'correct' : 'wrong');
      const r = recordAnswer(L, q, ok, today());
      $$('.keypad button, .choice, [data-giveup], .bun button', back).forEach((b) => { b.disabled = true; });
      $$('.choice', back).forEach((b) => { if (String(q.choices[+b.dataset.c]) === String(q.answer)) b.classList.add('right'); });
      if (q.type && q.type !== 'steps' && !ok) $('.bun', back).insertAdjacentHTML('beforeend', `<div class="bun-right">${T(q.answer)}</div>`);
      $('[data-giveup]', back).hidden = true;
      const ex = $('.explain', back);
      ex.hidden = false; ex.classList.add(ok ? 'ok' : 'ng');
      ex.innerHTML = (ok ? `⭕ <b>${T('せいかい！')}</b>` : `💡 ${T('こたえは')} <b class="ans">${T(String(q.answer))}</b>`) + `<br>${T(q.explain || '')}`;
      const done = () => { back.remove(); res({ ok, q, combo: r.combo, levelUp: r.levelUp }); };
      const nb = $('[data-next]', back);
      nb.hidden = false; nb.textContent = T(ok ? 'つぎへ' : 'わかった！');
      nb.addEventListener('click', () => { sfx('tap'); done(); });
      if (ok && !window.__robot) setTimeout(() => { if (back.isConnected) done(); }, 1100); // せいかいは すぐ つぎへ。まちがいは せつめいを よんでから
    };
    $$('.choice', back).forEach((b) => b.addEventListener('click', () => {
      const ok = String(q.choices[+b.dataset.c]) === String(q.answer);
      b.classList.add(ok ? 'right' : 'wrong'); finish(ok);
    }));
    const box = $('[data-box]', back);
    if (box) {
      let buf = '';
      $$('.keypad button', back).forEach((b) => b.addEventListener('click', () => {
        const k = b.dataset.k; sfx('tap');
        if (k === 'del') buf = buf.slice(0, -1);
        else if (k === 'ok') { if (!buf) return; const ok = String(Number(buf)) === String(q.answer); box.classList.add(ok ? 'ok' : 'ng'); finish(ok); return; }
        else if (buf.length < 5) buf += k;
        box.textContent = buf || '？'; box.classList.toggle('empty', !buf);
      }));
    }
    if (q.type === 'steps') wireSteps(back, q, finish); else if (q.type) wireBun(back, q, finish);
    window.__quizSolve = (right) => finish(!!right); // つうしテスト用
    $('[data-giveup]', back).addEventListener('click', () => { sfx('tap'); finish(false); });
  });
}

// ── ぶんづくり：カードを ならべる（build）・□に じを いれる（fill）・まちがいを タップで なおす（fix）
function bunHtml(q) {
  const ok = `<button class="btn" data-bunok disabled>${T('できた！')}</button>`;
  if (q.type === 'build') return `<div class="bun-line" data-line></div><div class="bun-pool">${q.cards.map((c, i) => `<button class="card" data-i="${i}">${c}</button>`).join('')}</div>${ok}`;
  if (q.type === 'fill') {
    let k = 0;
    return `<div class="bun-line">${q.parts.map((p) => (p === null ? `<button class="slot" data-slot="${k++}">　</button>` : `<span class="word">${p}</span>`)).join('')}</div>
      <div class="bun-pool">${q.pool.map((c) => `<button class="card" data-p="${c}">${c}</button>`).join('')}</div>${ok}`;
  }
  return `<div class="bun-line fix">${q.chars.map((c, i) => (c === ' ' ? '<span class="gap"></span>' : `<button class="ch" data-i="${i}">${c}</button>`)).join('')}</div>${ok}`;
}
function wireBun(back, q, finish) {
  const okBtn = $('[data-bunok]', back);
  if (q.type === 'build') {
    // したの カードを タップすると うえに ならぶ。うえの カードを タップすると もどる
    const line = $('[data-line]', back), placed = [];
    const draw = () => {
      line.innerHTML = placed.map((i) => `<button class="card on" data-back="${i}">${q.cards[i]}</button>`).join('') || `<span class="ph">${T('したの カードを じゅんに タップ')}</span>`;
      $$('.bun-pool .card', back).forEach((b) => { b.classList.toggle('used', placed.includes(+b.dataset.i)); });
      okBtn.disabled = placed.length !== q.cards.length;
    };
    $('.bun', back).addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      if (b.dataset.back !== undefined) { placed.splice(placed.indexOf(+b.dataset.back), 1); sfx('unplace'); draw(); }
      else if (b.dataset.i !== undefined && !placed.includes(+b.dataset.i)) { placed.push(+b.dataset.i); sfx('place'); draw(); }
    });
    okBtn.addEventListener('click', () => finish(placed.join() === q.order.join()));
    draw();
  } else if (q.type === 'fill') {
    // ひかっている □ に、したの じを タップして いれる。□を タップすると けせる
    const vals = q.slots.map(() => null); let cur = 0;
    const slots = $$('.slot', back);
    const draw = () => { slots.forEach((b, i) => { b.textContent = vals[i] || '　'; b.classList.toggle('cur', i === cur); b.classList.toggle('filled', !!vals[i]); }); okBtn.disabled = vals.includes(null); };
    slots.forEach((b, i) => b.addEventListener('click', () => { vals[i] = null; cur = i; sfx('unplace'); draw(); }));
    $$('.bun-pool .card', back).forEach((b) => b.addEventListener('click', () => {
      if (cur < 0) return;
      vals[cur] = b.dataset.p; sfx('place');
      cur = vals.indexOf(null); draw();
    }));
    okBtn.addEventListener('click', () => { slots.forEach((b, i) => b.classList.add(vals[i] === q.slots[i] ? 'right' : 'wrong')); finish(vals.join() === q.slots.join()); });
    draw();
  } else {
    // じを タップすると「わ⇔は」「つ⇔っ」「か⇔が」などが いれかわる
    const flips = new Set(), FIX_SWAP = swapOf(q);
    okBtn.disabled = false;
    $$('.ch', back).forEach((b) => b.addEventListener('click', () => {
      const i = +b.dataset.i, c = q.chars[i];
      if (!FIX_SWAP[c]) { sfx('blocked'); return; }
      if (flips.has(i)) flips.delete(i); else flips.add(i);
      b.textContent = flips.has(i) ? FIX_SWAP[c] : c; b.classList.toggle('on', flips.has(i)); sfx('tap');
    }));
    okBtn.addEventListener('click', () => finish(fixed(q, flips) === q.answer));
  }
}
