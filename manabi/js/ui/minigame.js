// ミニゲーム：タイミングジャンプ・はやおし けいさん・きいて キャッチ。かえりは { grade: 0..2, score }
import { el, $, $$ } from '../../../js/util.js';
import { T } from '../../../js/text.js';
import { sfx } from '../../../js/audio.js';
import { makeQuestion } from '../engine/quiz.js';
import { speak, canSpeak } from './common.js';

export const MINIGAMES = [
  { id: 'timing', name: 'タイミング ジャンプ', icon: '🎯', desc: 'うごく バーを みどりの ところで とめよう（3かい）', pools: ['jumper', 'startdash', 'fast'] },
  { id: 'calc', name: 'はやおし けいさん', icon: '🔢', desc: '30びょうで できるだけ たくさん こたえよう', pools: ['hint', 'retry', 'hero_math'].filter((x) => x !== 'hero_math').concat(['startdash']) },
  { id: 'listen', name: 'きいて キャッチ', icon: '👂', desc: 'きこえた えいごの えを タップ！ 30びょう', pools: ['barrier', 'tough', 'swap'] },
];

const medal = (g) => ['🥉', '🥈', '🥇'][g];

export function playMinigame(root, id, { grade, rng }) {
  if (id === 'timing') return timingGame(root);
  if (id === 'calc') return quickQuiz(root, { subj: 'math', grade, rng, title: 'はやおし けいさん', secs: 30, big: false });
  return quickQuiz(root, { subj: 'en', grade, rng, title: 'きいて キャッチ', secs: 30, big: true, listen: true });
}

function timingGame(root) {
  return new Promise((res) => {
    const wrap = el(`<div class="center"><div class="mg-big">${T('タイミング ジャンプ')}</div><div class="sub-text">${T('バーが みどりの ところに きたら タップ！ きいろなら パーフェクト')}</div>
      <div class="mg-area" data-area><div class="timing-track" data-track><div class="timing-target" data-target></div><div class="timing-target perfect" data-perfect></div><div class="timing-marker" data-marker></div></div>
      <div class="mg-big" data-msg style="position:absolute;left:0;right:0;top:40px">1 / 3</div><div class="mg-big num" data-score style="position:absolute;left:0;right:0;bottom:30px;font-size:34px"></div></div></div>`);
    root.querySelector('.center')?.remove(); root.appendChild(wrap);
    const track = $('[data-track]', wrap), marker = $('[data-marker]', wrap), target = $('[data-target]', wrap), perfect = $('[data-perfect]', wrap);
    let tries = 0, total = 0, t = 0, pos = 0, running = true, speed = 1.3, raf = 0, last = performance.now();
    const W = () => track.clientWidth - 16;
    let tc = 0.5, tw = 0.16;
    const place = () => { tc = 0.3 + Math.random() * 0.4; target.style.left = `${(tc - tw / 2) * 100}%`; target.style.width = `${tw * 100}%`; perfect.style.left = `${(tc - 0.03) * 100}%`; perfect.style.width = '6%'; };
    place();
    const loop = (now) => { if (!running) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt * speed; pos = (Math.sin(t * Math.PI) + 1) / 2; marker.style.left = `${pos * W()}px`; raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    const tap = () => {
      if (!running) return;
      const d = Math.abs(pos - tc); let pts = 0, msg = 'ざんねん…';
      if (d < 0.03) { pts = 100; msg = 'パーフェクト！'; sfx('win'); } else if (d < tw / 2) { pts = 60; msg = 'いいね！'; sfx('correct'); } else { sfx('wrong'); }
      total += pts; tries++; $('[data-score]', wrap).textContent = `${total} てん`;
      $('[data-msg]', wrap).textContent = T(msg);
      running = false; cancelAnimationFrame(raf);
      setTimeout(() => {
        if (tries >= 3) { const g = total >= 260 ? 2 : total >= 160 ? 1 : 0; finishMg(wrap, g, total).then(() => res({ grade: g, score: total })); return; }
        $('[data-msg]', wrap).textContent = `${tries + 1} / 3`; place(); speed += 0.25; running = true; last = performance.now(); raf = requestAnimationFrame(loop);
      }, 700);
    };
    $('[data-area]', wrap).addEventListener('pointerdown', tap);
  });
}

// じかんせいの クイズ（3たく）。listen なら えいごを きいて えを えらぶ
function quickQuiz(root, { subj, grade, rng, title, secs, big, listen }) {
  return new Promise((res) => {
    const wrap = el(`<div class="center"><div class="row" style="width:900px;justify-content:space-between"><div class="mg-big">${T(title)}</div><div class="mg-timer" data-timer>${secs}</div><div class="mg-big num" data-score>0</div></div>
      <div class="quiz-card" style="max-width:900px;min-height:330px"><div class="quiz-q" data-q></div><div class="row" style="width:100%"><div data-vis></div><div class="choice-grid ${big ? 'big' : ''}" data-choices></div></div></div></div>`);
    root.querySelector('.center')?.remove(); root.appendChild(wrap);
    let score = 0, left = secs, done = false, q = null; const recent = [];
    const timer = setInterval(() => { left--; $('[data-timer]', wrap).textContent = left; if (left <= 0) end(); }, 1000);
    const end = () => { if (done) return; done = true; clearInterval(timer); const g = score >= (listen ? 8 : 10) ? 2 : score >= (listen ? 5 : 6) ? 1 : 0; finishMg(wrap, g, score).then(() => res({ grade: g, score })); };
    const next = () => {
      q = makeQuestion(subj, grade, listen ? 2 : 3, rng, { recent, topic: listen ? 'hearPick' : 'arith', keypad: false });
      recent.push(q.q + '|' + q.answer); if (recent.length > 8) recent.shift();
      $('[data-q]', wrap).innerHTML = T(q.q);
      $('[data-vis]', wrap).innerHTML = q.vis?.type === 'emoji' ? `<div style="font-size:90px">${q.vis.rows.map(([e, n]) => e.repeat(n)).join('')}</div>` : '';
      $('[data-choices]', wrap).innerHTML = q.choices.map((c, i) => `<button class="btn white" data-c="${i}">${T(String(c))}</button>`).join('');
      if (listen && canSpeak()) speak(q.audio);
      $$('[data-c]', wrap).forEach((b) => b.addEventListener('click', () => {
        if (done) return;
        const ok = String(q.choices[Number(b.dataset.c)]) === String(q.answer);
        if (ok) { score++; sfx('correct'); $('[data-score]', wrap).textContent = score; next(); } else { sfx('wrong'); b.classList.add('gray'); b.disabled = true; }
      }));
    };
    next();
  });
}
function finishMg(wrap, g, score) {
  return new Promise((res) => {
    const box = el(`<div class="card-box col" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:5;min-width:380px"><div style="font-size:90px">${medal(g)}</div><div class="mg-big">${T(['がんばった！', 'いいね！', 'すごい！'][g])}</div><div class="sub-text num">${score} てん</div><button class="btn green big" data-ok>${T('カードを もらう')}</button></div>`);
    wrap.appendChild(box); sfx(g === 2 ? 'win' : 'correct');
    box.querySelector('[data-ok]').addEventListener('click', () => { sfx('tap'); box.remove(); res(); });
  });
}
