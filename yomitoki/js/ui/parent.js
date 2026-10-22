// おうちの かたへ：きろくと せってい（こどもが かえないように かけざんの もんだいで まもる）
import { el, $, $$ } from '../util.js';
import { prog, settings, saveSettings, resetAll, today } from '../save.js';
import { kindReport, level, streakDays, ERROR_NAME, READ_ERRORS } from '../engine/coach.js';
import { MAX_LEVEL } from '../data/problems.js';
import { setVolume } from '../audio.js';
import { openModal, keypad, confirmBox } from './common.js';

export function parentGate(app) {
  const a = 6 + Math.floor(Math.random() * 4), b = 6 + Math.floor(Math.random() * 4);
  let v = '';
  const m = openModal(`<div class="gate"><h2>おうちの方へ</h2><p>保護者の方は、答えを入力してください。</p><div class="q">${a} × ${b} = <span data-v>?</span></div><div data-kp></div>
    <div class="acts"><button class="btn white" data-x>もどる</button><button class="btn" data-ok>OK</button></div></div>`);
  $('[data-kp]', m.node).appendChild(keypad((k) => { if (k === 'del') v = v.slice(0, -1); else if (v.length < 3) v += k; $('[data-v]', m.node).textContent = v || '?'; }));
  $('[data-x]', m.node).onclick = m.close;
  $('[data-ok]', m.node).onclick = () => { if (+v === a * b) { m.close(); parentScreen(app); } else { v = ''; $('[data-v]', m.node).textContent = '?'; } };
}

function pct(n, d) { return d ? Math.round((n / d) * 100) : 0; }

export function parentScreen(app) {
  const rep = kindReport();
  const days = Object.entries(prog.days).sort((x, y) => (x[0] < y[0] ? 1 : -1));
  const week = days.filter(([d]) => d >= today(-6));
  const wn = week.reduce((s, [, x]) => s + x.n, 0), wp = week.reduce((s, [, x]) => s + x.perfect, 0);
  const total = Object.values(prog.days).reduce((s, x) => s + x.n, 0);
  const errs = Object.entries(prog.errors).filter(([k]) => k !== 'hint').sort((x, y) => y[1] - x[1]);
  const emax = Math.max(1, ...errs.map((e) => e[1]));
  const readErr = errs.filter(([k]) => READ_ERRORS.includes(k)).reduce((s, e) => s + e[1], 0);
  const calcErr = prog.errors.calc || 0;
  const qrate = pct(prog.quizOk, prog.quizTry);
  // かんたんな みたて
  const tips = [];
  if (total < 10) tips.push('まだ記録が少ないので、まずは毎日「きょうの とっくん」（8問・10分ほど）を続けてみてください。');
  if (readErr > calcErr * 1.5 && total >= 10) tips.push('計算よりも「読みちがい」のほうが多いようです。問題文を声に出して読み、最後の「？」の文を指でなぞる習慣をつけると効果的です。');
  if (prog.quizTry >= 5 && qrate < 70) tips.push(`「のりました→ふえる」「おりました→へる」の判断の正答率が ${qrate}% です。ことばの意味そのものがあいまいな可能性があります。「ことば しわけ」で語彙を固めましょう。`);
  if (prog.quizTry >= 5 && qrate >= 85 && (prog.errors.op || 0) >= 3) tips.push('ことばの意味は分かっているのに、式の＋−を間違えることがあります。読み飛ばし・あわてが原因かもしれません。「あわてんぼう ロック」をオンのままにしておくのがおすすめです。');
  if ((prog.errors.extra || 0) >= 3) tips.push('問題に出てくる数を全部使ってしまう傾向があります（「数が出たら全部たす」）。「つかわない かずが ある」問題で、何を聞かれているかを先に確かめる練習をしています。');
  if ((prog.errors.rush || 0) >= 5) tips.push('読む前に答えるケースが目立ちます。「よんだよ！」を押すまでの時間を、隣で一緒に読んであげるのも効果的です。');
  if (calcErr > readErr && total >= 10) tips.push('文章の理解はできていて、計算でつまずいています。「けいさん れっしゃ」の「10の まとまり」「くりあがり」がおすすめです。');
  const seg = (key, opts) => `<span class="seg" data-key="${key}">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(settings[key]) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</span>`;

  const node = el(`<div class="screen parent fade-in">
    <div class="topbar"><button class="icon-btn" data-back>✕</button><div style="font-size:26px;font-weight:900">おうちの方へ</div></div>
    <div class="parent-body">
      <div class="callout"><p style="margin:0">このアプリは、文章題を<b>「読む → 何を聞かれているか選ぶ → 文の中の数を選んで式をつくる → 計算して単位をつける」</b>の4段階に分けて練習します。
      間違えると⭐が減り、<b>答えではなく「どの文を読み直すか」</b>だけを示します。2回間違えると図で説明しますが、その後も必ず自分で式をつくり直します。
      読みちがいをした問題は「とっくんノート」に入り、<b>別の日に2回、ノーミスで解けるまで</b>くり返し出題されます。</p></div>

      <h3>📊 ようす</h3>
      <p>レベル <b>${level()}</b> / ${MAX_LEVEL}（${settings.levelMode === 'auto' ? '自動' : '固定'}）・これまで <b>${total}</b> 問・この7日で <b>${wn}</b> 問（ノーミス ${pct(wp, wn)}%）・連続 <b>${streakDays()}</b> 日・ノートに残っている問題 <b>${prog.note.length}</b> 件</p>
      <p>「ふえる？へる？」の判断：${prog.quizTry ? `${prog.quizOk} / ${prog.quizTry}（${qrate}%）` : 'まだありません'}</p>
      ${tips.length ? `<ul>${tips.map((t) => `<li>${t}</li>`).join('')}</ul>` : ''}

      <h3>🧩 問題の種類ごと</h3>
      <table class="ptable"><tr><th>種類</th><th>内容</th><th>Lv</th><th>回数</th><th>直近10回のノーミス率</th><th>習熟</th><th>ノート</th></tr>
      ${rep.map((r) => `<tr class="${r.unlocked ? '' : 'locked'}"><td>${r.icon} ${r.name}</td><td style="font-size:13px">${r.memo}</td><td class="num">${r.level}</td><td class="num">${r.tries}</td>
        <td class="num">${r.recent == null ? '−' : r.recent + '%'}</td><td><span class="boxmeter">${[1, 2, 3, 4, 5].map((i) => `<i class="${r.box >= i ? 'on' : ''}"></i>`).join('')}</span></td><td class="num">${r.inNote || ''}</td></tr>`).join('')}
      </table>

      <h3>❌ 間違いの種類</h3>
      ${errs.length ? `<div class="bars">${errs.map(([k, n]) => `<div class="bar"><span>${ERROR_NAME[k] || k}</span><span class="track2"><span class="fill ${READ_ERRORS.includes(k) ? '' : 'calc'}" style="width:${(n / emax) * 100}%;display:block"></span></span><span class="num">${n}</span></div>`).join('')}</div>
        <p style="font-size:13px;color:#6b7b78">オレンジ＝読みちがい（ノートに入る） / 青＝計算・あわて</p>` : '<p>まだありません。</p>'}

      <h3>📅 最近の記録</h3>
      <p>${days.slice(0, 14).map(([d, x]) => `${d.slice(5)}：${x.n}問（ノーミス${x.perfect}）`).join('　') || 'まだありません。'}</p>

      <h3>⚙️ 設定</h3>
      <div class="pset">
        <span>レベル</span><span>${seg('levelMode', [['auto', '自動'], ['1', '1'], ['2', '2'], ['3', '3']])}<br><small>1：たす・ひく・あわせる（10まで） / 2：ちがい・3つの数（20まで） / 3：いらない数・途中の数を聞く問題</small></span>
        <span>よみあげ</span><span>${seg('read', [['hint', 'ヒント扱い（⭐−1）'], ['free', 'いつでも'], ['off', 'なし']])}<br><small>文字を読むこと自体が難しい場合は「いつでも」に。</small></span>
        <span>あわてんぼう ロック</span><span>${seg('rush', [[true, 'オン'], [false, 'オフ']])}<br><small>問題を読む時間を確保し、すぐに間違えたときは4秒待たせます。</small></span>
        <span>文字の大きさ</span><span>${seg('big', [[false, 'ふつう'], [true, '大きく']])}</span>
        <span>音</span><span>${seg('sfx', [[0.7, 'あり'], [0, 'なし']])}</span>
        <span>記録</span><span><button class="btn white small" data-reset>すべての記録を消す</button></span>
      </div>
    </div></div>`);
  app.mount(node);
  $('[data-back]', node).onclick = () => app.home();
  $$('.seg', node).forEach((s) => s.addEventListener('click', (e) => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    const key = s.dataset.key; let v = b.dataset.v;
    if (v === 'true' || v === 'false') v = v === 'true'; else if (key === 'sfx') v = +v;
    settings[key] = v; saveSettings();
    if (key === 'sfx') setVolume(v);
    parentScreen(app);
  }));
  $('[data-reset]', node).onclick = async () => {
    if (await confirmBox('すべての記録（ノート・⭐・なかま）を消しますか？', '消す', 'やめる')) { resetAll(); parentScreen(app); }
  };
}
