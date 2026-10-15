// ことば しわけ：みじかい ことばを「たしざん」「ひきざん」に わける
// まちがえた カードは うしろに もどって、もういちど でる。まちがい 1つで 3びょう たされる
import { el, $, sleep, makeRng, newSeed } from '../util.js';
import { PHRASES } from '../data/problems.js';
import { prog, saveProg } from '../save.js';
import { level } from '../engine/coach.js';
import { sfx } from '../audio.js';
import { openModal, confetti } from './common.js';

const N = 12, PENALTY = 3000;

export function sortScreen(app) {
  const rng = makeRng(newSeed());
  const lv = level();
  const pool = PHRASES.filter((x) => x.level <= lv);
  // むずかしい ことばを かならず いれる
  const hard = rng.shuffle(pool.filter((x) => x.level === lv)).slice(0, 5);
  const rest = rng.shuffle(pool.filter((x) => !hard.includes(x))).slice(0, N - hard.length);
  const deck = rng.shuffle([...hard, ...rest]);
  let missN = 0, busy = false;
  const t0 = performance.now();
  const node = el(`<div class="screen sort fade-in">
    <div class="topbar"><button class="icon-btn" data-back>✕</button><div style="flex:1;font-size:26px;font-weight:900">🔤 ことば しわけ</div>
      <div class="timer" data-time>0.0</div><div class="badge">のこり <b data-left>${deck.length}</b></div></div>
    <div class="sort-body">
      <button class="bin p" data-s="1"><span class="sym">＋</span>たしざん<small>ふえる・あわせる</small></button>
      <div class="sort-center"><div class="phrase" data-card></div><div class="sort-info" data-info>この ことばは たしざん？ ひきざん？</div></div>
      <button class="bin m" data-s="-1"><span class="sym">−</span>ひきざん<small>へる・のこり・ちがい</small></button>
    </div></div>`);
  app.mount(node);
  const card = $('[data-card]', node), info = $('[data-info]', node);
  const timer = setInterval(() => { if (!node.isConnected) { clearInterval(timer); return; } $('[data-time]', node).textContent = ((performance.now() - t0 + missN * PENALTY) / 1000).toFixed(1); }, 100);
  const show = () => { card.className = 'phrase'; card.textContent = deck[0].text; $('[data-left]', node).textContent = deck.length; };
  show();
  $('[data-back]', node).onclick = () => { clearInterval(timer); app.home(); };
  node.querySelectorAll('[data-s]').forEach((b) => b.addEventListener('click', async () => {
    if (busy || !deck.length) return;
    busy = true;
    const c = deck[0], sign = +b.dataset.s;
    if (sign === c.sign) {
      sfx('ok'); card.classList.add(sign > 0 ? 'fly-p' : 'fly-m');
      info.className = 'sort-info'; info.textContent = c.why;
      deck.shift();
      await sleep(380);
    } else {
      sfx('ng'); missN++;
      card.classList.add('shake');
      info.className = 'sort-info ng'; info.innerHTML = `ちがうよ（＋3びょう）<br>${c.why}`;
      await sleep(1600);
      deck.push(deck.shift());
    }
    busy = false;
    if (!deck.length) { clearInterval(timer); finish(); return; }
    show();
  }));
  function finish() {
    const ms = performance.now() - t0 + missN * PENALTY;
    const key = 'lv' + lv;
    const best = prog.sortBest[key];
    const isBest = !best || ms < best;
    if (isBest) { prog.sortBest[key] = Math.round(ms); saveProg(); }
    sfx('clear'); if (!missN) confetti();
    const m = openModal(`<h2 style="text-align:center">🔤 しわけ おわり！</h2>
      <p style="text-align:center;font-size:30px"><b class="n">${(ms / 1000).toFixed(1)}</b> びょう　まちがい <b class="n">${missN}</b></p>
      ${isBest ? '<p style="text-align:center;font-size:24px">🏆 じこベスト！</p>' : `<p style="text-align:center">じこベスト ${(best / 1000).toFixed(1)} びょう</p>`}
      ${missN ? '<div class="result-note">まちがえた ことばは、もういちど ゆっくり よんで みよう。<br>「ことばで きめず、なにを きかれて いるか」が だいじ。</div>' : ''}
      <div class="acts"><button class="btn white" data-again>もういちど</button><button class="btn" data-home>おわる</button></div>`);
    $('[data-again]', m.node).onclick = () => { m.close(); sortScreen(app); };
    $('[data-home]', m.node).onclick = () => { m.close(); app.home(); };
  }
}
