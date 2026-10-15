// けいさん れっしゃ：10もん。まちがえた もんだいは、にた もんだいが うしろに ついて くる
import { el, $, sleep, makeRng, newSeed } from '../util.js';
import { CALC_SETS, calcSet, value, similar } from '../engine/calc.js';
import { prog, saveProg } from '../save.js';
import { sfx } from '../audio.js';
import { openModal, keypad, onKeys, confetti } from './common.js';

export function calcMenu(app) {
  const m = openModal(`<h2>🧮 けいさん れっしゃ</h2><p>どれに する？ まちがえると、にた もんだいが ふえるよ。</p>
    <div class="set-grid">${Object.entries(CALC_SETS).map(([k, v]) => `<button data-set="${k}">${v.icon} ${v.name}<small>${prog.calcBest[k] ? `ベスト ${(prog.calcBest[k] / 1000).toFixed(1)}びょう` : 'まだ きろく なし'}</small></button>`).join('')}
    <button data-set="any">🎲 ぜんぶ まぜる<small>${prog.calcBest.any ? `ベスト ${(prog.calcBest.any / 1000).toFixed(1)}びょう` : 'まだ きろく なし'}</small></button></div>
    <div class="acts"><button class="btn white" data-x>もどる</button></div>`);
  $('[data-x]', m.node).onclick = m.close;
  m.node.querySelectorAll('[data-set]').forEach((b) => (b.onclick = () => { m.close(); calcScreen(app, b.dataset.set); }));
}

export function calcScreen(app, set) {
  const rng = makeRng(newSeed());
  const queue = calcSet(set, newSeed(), 10).map((q) => ({ q }));
  let i = 0, ans = '', tries = 0, missN = 0, busy = false;
  const t0 = performance.now();
  const node = el(`<div class="screen calc fade-in">
    <div class="topbar"><button class="icon-btn" data-back>✕</button><div style="font-size:26px;font-weight:900">🧮 ${set === 'any' ? 'ぜんぶ まぜる' : CALC_SETS[set].name}</div>
      <div style="flex:1"></div><div class="timer" data-time>0.0</div></div>
    <div class="calc-body">
      <div class="calc-q"><div class="mini-train" data-train></div><div class="eq" data-eq></div><div data-scaf></div></div>
      <div class="calc-side"><div data-kp></div><button class="btn big" data-ok>こたえる</button></div>
    </div></div>`);
  app.mount(node);
  const kp = keypad(key, { cols: 3 });
  $('[data-kp]', node).appendChild(kp);
  const off = onKeys((k) => (k === 'ok' ? check() : key(k)));
  const timer = setInterval(() => { if (!node.isConnected) { clearInterval(timer); off(); return; } $('[data-time]', node).textContent = ((performance.now() - t0) / 1000).toFixed(1); }, 100);
  $('[data-back]', node).onclick = () => { clearInterval(timer); off(); app.home(); };
  $('[data-ok]', node).onclick = check;
  draw();

  function draw() {
    const { q } = queue[i];
    $('[data-train]', node).innerHTML = '<i class="head">🐭</i>' + queue.map((_, k) => `<i class="${k < i ? 'on' : ''}">${k < i ? '🐭' : ''}</i>`).join('');
    $('[data-eq]', node).innerHTML = `${q.map((x, k) => (k % 2 ? `<span>${x > 0 ? '＋' : '−'}</span>` : `<span>${x}</span>`)).join('')}<span>＝</span><span class="ans-box n ${ans ? '' : 'empty'}">${ans}</span>`;
  }
  function key(k) {
    if (busy) return;
    if (k === 'del') ans = ans.slice(0, -1);
    else if (/^\d$/.test(k) && ans.length < 2) ans = (ans === '0' ? '' : ans) + k;
    draw();
  }
  async function check() {
    if (busy || !ans) return;
    const { q } = queue[i];
    const sc = $('[data-scaf]', node);
    if (+ans === value(q)) {
      sfx('ok'); busy = true; sc.innerHTML = '';
      await sleep(250);
      i++; ans = ''; tries = 0; busy = false;
      if (i >= queue.length) { finish(); return; }
      draw(); return;
    }
    sfx('ng'); tries++; missN++; ans = '';
    if (tries === 1) {
      // まちがえたら にた もんだいが うしろに ふえる（1もんに つき 1つ）
      if (!queue[i].extra) { queue[i].extra = true; queue.push({ q: similar(q, rng), extra: true }); }
      sc.innerHTML = q.length >= 5
        ? `<div class="scaffold">まず <span class="n u">${q[0]} ${q[1] > 0 ? '＋' : '−'} ${q[2]}</span> を けいさん。<br>その こたえに ${q[4]} を ${q[3] > 0 ? 'たす' : 'ひく'}よ。</div>`
        : '<div class="scaffold">もういちど。10の まとまりを かんがえて みよう。</div>';
    } else {
      sc.innerHTML = `<div class="scaffold">こたえは <span class="n">${value(q)}</span>。じぶんで いれてね。</div>`;
    }
    draw();
  }
  function finish() {
    clearInterval(timer); off();
    const ms = performance.now() - t0;
    const best = prog.calcBest[set];
    const isBest = !missN && (!best || ms < best);
    if (isBest) { prog.calcBest[set] = Math.round(ms); saveProg(); }
    sfx('clear'); if (!missN) confetti();
    const m = openModal(`<h2 style="text-align:center">🚉 とうちゃく！</h2>
      <p style="text-align:center;font-size:30px"><b class="n">${(ms / 1000).toFixed(1)}</b> びょう　まちがい <b class="n">${missN}</b></p>
      ${isBest ? '<p style="text-align:center;font-size:24px">🏆 じこベスト！</p>' : missN ? '<p style="text-align:center">まちがい 0 で ゴールすると、きろくに のこるよ。</p>' : `<p style="text-align:center">じこベスト ${(best / 1000).toFixed(1)} びょう</p>`}
      <div class="acts"><button class="btn white" data-again>もういちど</button><button class="btn" data-home>おわる</button></div>`);
    $('[data-again]', m.node).onclick = () => { m.close(); calcScreen(app, set); };
    $('[data-home]', m.node).onclick = () => { m.close(); app.home(); };
  }
}
