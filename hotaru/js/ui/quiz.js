// もんだいの がめん（モーダル）。こたえると きろくして、せつめいを みせる
import { T } from '../../../js/text.js';
import { el, $, $$, makeRng, newSeed } from '../../../js/util.js';
import { sfx } from '../../../js/audio.js';
import { clockSvg, gridSvg, coinsSvg, shapeSvg } from '../../../js/ui/art.js';
import { SUBJECTS, nextQuestion, recordAnswer } from '../engine/learn.js';
import { settings } from '../save.js';

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
  if (vis.type === 'emoji') return `<div class="quiz-vis emoji" style="font-size:${vis.rows.length === 1 && vis.rows[0][1] === 1 ? 100 : 42}px">${vis.rows.map(([e, n]) => `<div>${e.repeat(n)}</div>`).join('')}</div>`;
  return '';
}

// 1もん だす。opts: { head（なんの ための もんだいか）, keypad, subj, reviewOnly, dots:[true/false/null…] }
// かえり：{ ok, q, combo }
export function askQuiz(stage, P, opts = {}) {
  return new Promise((res) => {
    const L = P.learn;
    const q = nextQuestion(L, rng, { keypad: !!opts.keypad, subj: opts.subj || null, reviewOnly: !!opts.reviewOnly });
    window.__q = q; // つうしテスト用
    const sj = SUBJECTS[q.subj];
    const dots = opts.dots ? `<span class="dots">${opts.dots.map((d) => `<i class="${d === true ? 'ok' : d === false ? 'ng' : ''}"></i>`).join('')}</span>` : '';
    const back = el(`<div class="modal-back quiz-back"><div class="modal quiz">
      <div class="quiz-head">${opts.head ? `<span class="why">${T(opts.head)}</span>` : ''}<span class="sp"></span>${dots}${q.review ? `<span class="tag review">🔁 ${T('ふくしゅう')}</span>` : ''}<span class="tag subj" style="--c:${sj.color}">${sj.emo} ${T(sj.name)}</span>${L.combo >= 2 ? `<span class="tag combo">🔥 ${L.combo}${T('れんぞく')}</span>` : ''}</div>
      <div class="quiz-q">${T(q.q)}</div>
      ${q.audio && canSpeak() ? `<button class="btn small gray" data-speak>🔊 ${T('きく')}</button>` : ''}
      <div class="quiz-body">
        ${visHtml(q.vis)}
        ${q.choices ? `<div class="choices ${q.big ? 'big' : ''} n${q.choices.length}">${q.choices.map((c, i) => `<button class="choice" data-c="${i}">${T(String(c))}</button>`).join('')}</div>`
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
      $$('.keypad button, .choice, [data-giveup]', back).forEach((b) => { b.disabled = true; });
      $$('.choice', back).forEach((b) => { if (String(q.choices[+b.dataset.c]) === String(q.answer)) b.classList.add('right'); });
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
    $('[data-giveup]', back).addEventListener('click', () => { sfx('tap'); finish(false); });
  });
}
