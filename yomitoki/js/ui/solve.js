// ぶんしょうだいを とく がめん
// 1 よむ → 2 きかれて いる ことを えらぶ → 3 しきを つくる（ぶんの なかの かずを タッチ） → 4 けいさんと たんい
// ・あまやかさない：まちがえると ★が へり、どこを よみなおすか だけ おしえる（こたえは すぐには みせない）
// ・2かい まちがえると せつめいを みせるが、そのあと じぶんで もういちど つくる
import { el, $, $$, sleep } from '../util.js';
import { KINDS, checkExpr, exprText, gen } from '../data/problems.js';
import { settings } from '../save.js';
import { sfx } from '../audio.js';
import { speak, stopSpeak, canSpeak } from '../speech.js';
import { level, record, checkLevelUp, ERROR_NAME } from '../engine/coach.js';
import { openModal, confirmBox, keypad, onKeys, sentenceHtml, sentencePlain, markWord, clearMarks, starsHtml, confetti } from './common.js';
import { diagramHtml } from './diagram.js';

const STEP_NAMES = ['よむ', 'きかれて いる', 'しき', 'こたえ'];
const RUSH_MS = 2200;   // これより はやく まちがえたら「あわてんぼう」
const LOCK_S = 4;

// せっしょん：plan = [{ kind, note? }]
export async function runSession(app, plan, { title = 'きょうの とっくん' } = {}) {
  const queue = plan.map((x) => ({ ...x }));
  const results = [];
  const rng = Math.random;
  let newPassenger = null;
  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    const p = gen(item.kind, Math.floor(rng() * 2 ** 31), { level: Math.max(level(), KINDS[item.kind].level) });
    const r = await solveProblem(app, p, { item, index: i, queue, results, title });
    if (r.quit) break;
    const rec = record(p, { ...r, fromNote: item.note });
    if (rec.newPassenger) newPassenger = rec.newPassenger;
    results.push({ ...r, kind: p.kind, twin: item.twin });
    // よみまちがいを した ときは、2もん あとに にた もんだいを もういちど（1かい だけ）
    if (r.readMiss && !item.twin && !item.twinAdded) {
      item.twinAdded = true;
      queue.splice(Math.min(queue.length, i + 3), 0, { kind: p.kind, twin: true, note: item.note });
    }
    await resultModal(r);
  }
  stopSpeak();
  if (!results.length) { app.home(); return; }
  const lvUp = checkLevelUp();
  await summaryModal(results, { newPassenger, lvUp, title });
  app.home();
}

function solveProblem(app, p, ctx) {
  return new Promise((resolve) => {
    const st = { stars: 3, errs: [], quiz: [], step: 0, stepErr: 0, stepT: performance.now(), t0: performance.now(), expr: [], ans: '', unit: null,
      explained: false, hint: { read: false, pic: false }, locked: false, chosenExpr: null };
    const tag = ctx.item.note || ctx.item.twin ? `<span class="kind-tag note">📒 とっくん：${KINDS[p.kind].name}</span>` : `<span class="kind-tag">${KINDS[p.kind].icon} ${KINDS[p.kind].name}</span>`;
    const node = el(`<div class="screen solve fade-in${settings.big ? ' big-text' : ''}">
      <div class="topbar">
        <button class="icon-btn" data-quit aria-label="やめる">✕</button>
        <div class="track"><div class="stations">${ctx.queue.map((q, i) => {
          const r = ctx.results[i];
          const cls = i === ctx.index ? 'now' : r ? (r.stars === 3 ? 'done' : 'miss') : '';
          return `<span class="st ${cls}${q.twin ? ' twin' : ''}">${i === ctx.index ? '🚃' : r ? (r.stars === 3 ? '✓' : '') : ''}</span>`;
        }).join('')}</div></div>
        <div class="stars" data-stars></div>
      </div>
      <div class="solve-body">
        <div class="paper">${tag}
          <div class="sents">${p.sentences.map((s, i) => sentenceHtml(p, s, i)).join('')}</div>
          <div class="paper-foot">
            <div class="paper-tools">
              ${settings.read !== 'off' && canSpeak() ? `<button class="btn white small" data-read>🔊 よみあげ${settings.read === 'hint' ? '（⭐−1）' : ''}</button>` : ''}
              <button class="btn white small" data-pic disabled>🖼 えで みる（⭐−1）</button>
            </div>
            <div class="coach"><div class="bubble" data-bubble></div><div class="face">🐭</div></div>
          </div>
        </div>
        <div class="work" data-work></div>
      </div>
    </div>`);
    node.__p = p; // テスト よう
    app.mount(node);
    const paper = $('.paper', node), work = $('[data-work]', node), bubble = $('[data-bubble]', node);
    const sentNode = (i) => $(`.sent[data-s="${i}"]`, paper);
    const qIdx = p.sentences.length - 1;
    let offKeys = null;

    const drawStars = () => { $('[data-stars]', node).innerHTML = starsHtml(st.stars); };
    drawStars();
    const say = (msg, cls = '') => { bubble.className = 'bubble ' + cls; bubble.innerHTML = msg; };
    const hl = (si, word) => { const s = sentNode(si); if (!s) return; s.classList.add('hl'); if (word) markWord(s, word); };
    const flagChip = (t) => { const c = $(`.chip[data-t="${t}"]`, paper); if (c) c.classList.add('flag'); };
    const lose = () => { st.stars = Math.max(0, st.stars - 1); drawStars(); };

    // まちがい：★を へらして、あわてて いたら すこし まつ
    async function miss(cat) {
      st.errs.push(cat); st.stepErr++; lose(); sfx('ng');
      if (settings.rush && performance.now() - st.stepT < RUSH_MS) {
        st.errs.push('rush');
        await rushLock();
      }
      st.stepT = performance.now();
    }
    async function rushLock() {
      sfx('lock');
      const lock = el(`<div class="lock"><div class="big">🐢</div><div>あわてないで！<br>もんだいを もういちど よもう。</div><div class="cnt">${LOCK_S}</div></div>`);
      work.appendChild(lock); st.locked = true;
      for (let s = LOCK_S; s > 0; s--) { $('.cnt', lock).textContent = s; await sleep(1000); }
      lock.remove(); st.locked = false;
    }
    function steps() { return `<div class="steps">${STEP_NAMES.map((n, i) => `<span class="${i === st.step ? 'now' : i < st.step ? 'done' : ''}">${i + 1} ${n}</span>`).join('')}</div>`; }
    function setStep(n) { st.step = n; st.stepErr = 0; st.stepT = performance.now(); $('[data-pic]', node).disabled = n < 2; }

    // ───── よみあげ・え ─────
    $('[data-read]', node)?.addEventListener('click', async () => {
      if (settings.read === 'hint' && !st.hint.read) {
        st.hint.read = true; st.errs.push('hint'); lose();
      }
      $$('.sent', paper).forEach((s) => s.classList.remove('reading'));
      const lines = p.sentences.map((s) => sentencePlain(p, s));
      for (let i = 0; i < lines.length; i++) {
        sentNode(i).classList.add('reading');
        await new Promise((r) => speak(lines[i], { onend: r }));
        sentNode(i)?.classList.remove('reading');
        if (!node.isConnected) return;
      }
    });
    $('[data-pic]', node).addEventListener('click', () => {
      if (!st.hint.pic) { st.hint.pic = true; st.errs.push('hint'); lose(); }
      const m = openModal(`<h2>🖼 えで みてみよう</h2>${diagramHtml(p, 'hint')}<p>〇が どう かわって いるかな？ ふえて いる？ へって いる？</p><div class="acts"><button class="btn" data-x>とじる</button></div>`);
      $('[data-x]', m.node).onclick = m.close;
    });
    $('[data-quit]', node).addEventListener('click', async () => {
      if (await confirmBox('とっくんを やめる？<br><small>ここまでの きろくは のこるよ。</small>', 'やめる', 'つづける')) { cleanup(); resolve({ quit: true }); }
    });
    function cleanup() { stopSpeak(); offKeys && offKeys(); offKeys = null; }

    // ───── 1 よむ ─────
    function stepRead() {
      setStep(0);
      const chars = p.sentences.reduce((n, s) => n + sentencePlain(p, s).length, 0);
      const wait = settings.rush ? Math.min(7000, Math.max(2500, chars * 80)) : 0;
      work.innerHTML = `${steps()}<h2>まず もんだいを よもう</h2><div class="sub">ゆびで なぞりながら、こえに だして よもう。<br>えは ないよ。ことばから ばめんを おもいうかべてね。</div><div class="spacer"></div>
        <button class="btn big green" data-done ${wait ? 'disabled' : ''}>よんだよ！</button>`;
      say(ctx.item.twin ? 'さっきと にた もんだいだよ。こんどは まちがえないように よもう。' : ctx.item.note ? 'とっくんノートの もんだいだよ。ゆっくり よもう。' : 'さいごの「？」の ぶんまで よんでね。');
      const b = $('[data-done]', work);
      if (wait) setTimeout(() => { b.disabled = false; }, wait);
      b.onclick = () => { sfx('tap'); stepAsk(); };
    }

    // ───── 2 きかれて いる こと ─────
    function stepAsk() {
      setStep(1); clearMarks(paper);
      work.innerHTML = `${steps()}<h2>この もんだいで<br>きかれて いるのは どれ？</h2><div class="opts">${p.ask.options.map((o, i) => `<button class="opt" data-i="${i}">${o}</button>`).join('')}</div>`;
      say('「なんびき」「なんこ」の ある ぶんを よく みてね。');
      work.querySelector('.opts').addEventListener('click', async (e) => {
        const b = e.target.closest('[data-i]'); if (!b || st.locked) return;
        const i = +b.dataset.i;
        if (i === p.ask.correct) {
          sfx('ok'); b.classList.add('right'); clearMarks(paper);
          say('そう！ それを もとめるんだね。', 'ok');
          await sleep(700); stepExpr(); return;
        }
        b.classList.add('wrong');
        hl(qIdx);
        say('ちがうよ。きいて いるのは さいごの ぶん。きいろの ぶんを もういちど よもう。', 'ng');
        await miss('ask');
        if (st.stepErr >= 2) {
          const r = $(`[data-i="${p.ask.correct}"]`, work); r.classList.add('right');
          say(`きかれて いるのは「${p.ask.options[p.ask.correct]}」だよ。さいごの ぶんと くらべて みよう。`, 'ng');
          work.insertAdjacentHTML('beforeend', '<div class="spacer"></div><button class="btn green" data-go>わかった</button>');
          $('[data-go]', work).onclick = () => stepExpr();
        }
      });
    }

    // ───── 3 しき ─────
    function stepExpr(keep = false) {
      if (!keep) { setStep(2); st.expr = []; }
      clearMarks(paper);
      paper.classList.add('chips-on');
      work.innerHTML = `${steps()}<h2>しきを つくろう</h2><div class="sub">ぶんの なかの <b>かず</b> を タッチ。<br>＋か −を えらんで、つなげよう。</div>
        <div class="expr" data-expr></div>
        <div class="ops"><button class="btn plus" data-op="1">＋</button><button class="btn minus" data-op="-1">−</button><button class="btn white" data-del style="font-size:22px">けす</button></div>
        <div class="spacer"></div><button class="btn big" data-check>できた！</button>`;
      if (!keep) say(st.explained ? 'こんどは じぶんで しきを つくろう。' : 'どの かずを つかう？ つかわない かずも あるかも。');
      drawExpr();
      $$('[data-op]', work).forEach((b) => (b.onclick = () => {
        sfx('tap');
        const sign = +b.dataset.op;
        const last = st.expr[st.expr.length - 1];
        if (!last) { say('さいしょは かずから だよ。ぶんの なかの かずを タッチしよう。'); return; }
        if (last.op) last.sign = sign; else st.expr.push({ op: true, sign });
        drawExpr();
      }));
      $('[data-del]', work).onclick = () => { sfx('tap'); st.expr.pop(); drawExpr(); };
      $('[data-check]', work).onclick = checkNow;
    }
    paper.addEventListener('click', (e) => {
      const c = e.target.closest('.chip'); if (!c || st.step !== 2 || st.locked || !paper.classList.contains('chips-on')) return;
      const t = +c.dataset.t;
      const last = st.expr[st.expr.length - 1];
      if (last && !last.op) { say('つぎは ＋か −を えらんでね。'); return; }
      sfx('chip');
      st.expr.push({ t });
      drawExpr();
    });
    function drawExpr() {
      const box = $('[data-expr]', work); if (!box) return;
      box.innerHTML = st.expr.length ? st.expr.map((x) => (x.op ? `<span class="op ${x.sign > 0 ? 'p' : 'm'}">${x.sign > 0 ? '＋' : '−'}</span>` : `<span class="tk">${p.tokens[x.t].v}</span>`)).join('') : '<span class="ph">ここに しきが できるよ</span>';
      $$('.chip', paper).forEach((c) => c.classList.toggle('used', st.expr.some((x) => !x.op && x.t === +c.dataset.t)));
    }
    function childExpr() {
      const out = []; let sign = 1;
      st.expr.forEach((x) => { if (x.op) sign = x.sign; else { out.push({ t: x.t, sign }); sign = 1; } });
      return out;
    }
    async function checkNow() {
      if (st.locked) return;
      clearMarks(paper);
      const last = st.expr[st.expr.length - 1];
      if (last && last.op) { say('しきの さいごが ＋か −で おわって いるよ。'); return; }
      const child = childExpr();
      const r = checkExpr(p, child);
      if (r.ok) {
        sfx('ok'); st.chosenExpr = child; paper.classList.remove('chips-on');
        say('しきが できた！', 'ok'); await sleep(600); stepAnswer(); return;
      }
      if (r.cat === 'short') { say(r.msg); return; }
      // どこを よみなおすか しめす
      const tok = p.tokens[r.tok];
      hl(tok.s); flagChip(r.tok);
      say(r.msg, 'ng');
      if (st.explained) { sfx('ng'); showExplain(true); return; }
      await miss(r.cat);
      if (st.stepErr >= 2) { showExplain(false); return; }
      if (r.cat === 'op' && p.quiz[r.tok]) miniQuiz(p.quiz[r.tok], r.tok);
    }
    // 「ふえる？ へる？」の ミニクイズ
    function miniQuiz(q, tokId) {
      clearMarks(paper);
      hl(q.s, q.word); flagChip(tokId);
      work.innerHTML = `${steps()}<h2>かんがえよう</h2><div class="sub">きいろの ぶんを よもう。</div><h2 style="font-size:28px">${q.q}</h2>
        <div class="opt-row">${q.choices.map((c, i) => `<button class="opt mini" data-c="${i}">${c}</button>`).join('')}</div>`;
      say('せんを ひいた ことばに ちゅうもく！');
      work.querySelector('.opt-row').addEventListener('click', async (e) => {
        const b = e.target.closest('[data-c]'); if (!b) return;
        const ok = +b.dataset.c === q.correct;
        st.quiz.push(ok);
        const ans = q.choices[q.correct];
        const rule = ans === 'ふえる' ? 'ふえる ときは たしざん（＋）' : ans === 'へる' ? 'へる ときは ひきざん（−）' : `${ans}だよ`;
        if (ok) { sfx('ok'); b.classList.add('right'); say(`そうだね！ ${rule}。<br>しきを なおそう。`, 'ok'); }
        else { sfx('ng'); b.classList.add('wrong'); $(`[data-c="${q.correct}"]`, work).classList.add('right'); say(`「${q.word || ''}」は「${ans}」。${rule}。<br>しきを なおそう。`, 'ng'); }
        await sleep(1500);
        stepExpr(true);
      });
    }
    // せつめい（2かい まちがえた とき）
    function showExplain(again) {
      st.explained = true;
      paper.classList.remove('chips-on');
      work.innerHTML = `${steps()}<h2>${again ? 'もういちど みてみよう' : 'いっしょに たしかめよう'}</h2>
        ${diagramHtml(p, 'explain')}
        <div class="why"><ul>${p.why.map((w) => `<li>${w}</li>`).join('')}</ul>しきは <span class="ans">${exprText(p)}</span></div>
        <div class="spacer"></div><button class="btn green" data-again>じぶんで しきを つくる</button>`;
      say('〇の えと ぶんを くらべてね。', 'ng');
      $('[data-again]', work).onclick = () => stepExpr();
    }

    // ───── 4 こたえ ─────
    function stepAnswer() {
      setStep(3); clearMarks(paper);
      st.ans = ''; st.unit = null;
      const ex = exprText(p, st.chosenExpr);
      work.innerHTML = `${steps()}<h2>けいさんして、こたえを かこう</h2>
        <div class="answer-line"><span class="lbl">しき</span><span class="n">${ex} ＝</span><span class="ans-box n empty" data-ans></span></div>
        <div class="answer-line"><span class="lbl">こたえ</span><span class="n" data-ans2>□</span><span class="unit-slot" data-uslot>？</span></div>
        <div class="units">${p.units.map((u) => `<button data-u="${u}">${u}</button>`).join('')}</div>
        <div data-scaf></div>
        ${keypad(() => {}).outerHTML}
        <button class="btn big" data-check>こたえあわせ</button>`;
      say('こたえの「たんい」も わすれずに。なにの かずかな？');
      const kp = $('.keypad', work);
      kp.addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) { sfx('tap'); key(b.dataset.k); } });
      offKeys && offKeys();
      offKeys = onKeys((k) => (k === 'ok' ? check() : key(k)));
      $('.units', work).addEventListener('click', (e) => {
        const b = e.target.closest('[data-u]'); if (!b) return;
        sfx('tap'); st.unit = b.dataset.u;
        $$('.units button', work).forEach((x) => x.classList.toggle('sel', x === b));
        const s = $('[data-uslot]', work); s.textContent = st.unit; s.classList.add('filled');
      });
      $('[data-check]', work).onclick = check;
      function key(k) {
        if (st.locked) return;
        if (k === 'del') st.ans = st.ans.slice(0, -1);
        else if (/^\d$/.test(k) && st.ans.length < 2) st.ans = (st.ans === '0' ? '' : st.ans) + k;
        const a = $('[data-ans]', work); a.textContent = st.ans; a.classList.toggle('empty', !st.ans);
        $('[data-ans2]', work).textContent = st.ans || '□';
      }
      async function check() {
        if (st.locked) return;
        if (!st.ans) { say('しきの こたえを かいてね。'); return; }
        if (!st.unit) { say('たんいも えらんでね（ひき・こ・ほん など）。'); return; }
        clearMarks(paper);
        if (+st.ans !== p.answer) {
          say('けいさんを たしかめよう。', 'ng');
          await miss('calc');
          const sc = $('[data-scaf]', work);
          const ce = st.chosenExpr;
          if (st.stepErr >= 2) {
            sc.innerHTML = `<div class="scaffold">こたえは <span class="n">${p.answer}</span>。〇を かぞえて たしかめて、じぶんで いれてね。</div>`;
            const m = openModal(`<h2>〇で たしかめよう</h2>${diagramHtml(p, 'explain')}<div class="acts"><button class="btn" data-x>とじる</button></div>`);
            $('[data-x]', m.node).onclick = m.close;
          } else if (ce.length >= 3) {
            const a = p.tokens[ce[0].t].v, b = p.tokens[ce[1].t].v;
            sc.innerHTML = `<div class="scaffold">まず まえの 2つ。<span class="n">${a} ${ce[1].sign > 0 ? '＋' : '−'} ${b}</span> は いくつ？<br>その こたえに、のこりの かずを ${ce[2].sign > 0 ? 'たす' : 'ひく'}よ。</div>`;
          } else {
            sc.innerHTML = '<div class="scaffold">ゆびや 〇を かいて、かぞえて みよう。</div>';
          }
          st.ans = ''; key('');
          return;
        }
        if (st.unit !== p.unit) {
          hl(qIdx);
          $(`[data-u="${st.unit}"]`, work)?.classList.add('wrong');
          st.unit = null; const s = $('[data-uslot]', work); s.textContent = '？'; s.classList.remove('filled');
          say('かずは あって いるよ。でも たんいが ちがう。<br>なにの かずを きかれて いる？ きいろの ぶんを よもう。', 'ng');
          await miss('unit');
          return;
        }
        // せいかい！
        cleanup();
        sfx('ok');
        const errs = st.errs;
        resolve({ stars: st.stars, errs, quiz: st.quiz, ms: performance.now() - st.t0, readMiss: errs.some((e) => ['ask', 'extra', 'missing', 'dup', 'op', 'order', 'unit'].includes(e)) });
      }
    }

    stepRead();
  });
}

function resultModal(r) {
  return new Promise((res) => {
    const title = r.stars === 3 ? 'パーフェクト！' : r.stars === 2 ? 'よく できました' : r.stars === 1 ? 'クリア！' : 'さいごまで がんばったね';
    sfx(r.stars === 3 ? 'star' : 'ok');
    const errs = [...new Set(r.errs.filter((e) => e !== 'rush'))].map((e) => ERROR_NAME[e]).join('、');
    const m = openModal(`<div class="result-stars">${starsHtml(r.stars)}</div><div class="result-title">${title}</div>
      ${errs ? `<p style="text-align:center;font-size:18px;color:#6b7b78">きを つける ところ：${errs}</p>` : ''}
      ${r.readMiss ? '<div class="result-note">📒 この かたちの もんだいは「とっくんノート」に いれたよ。<br>ちがう ひに 2かい、まちがえずに とけたら ノートから きえるよ。</div>' : ''}
      <div class="acts"><button class="btn green big" data-next>つぎへ 🚃</button></div>`);
    $('[data-next]', m.node).onclick = () => { sfx('tap'); m.close(); res(); };
  });
}

function summaryModal(results, { newPassenger, lvUp, title }) {
  return new Promise((res) => {
    const stars = results.reduce((a, r) => a + r.stars, 0);
    const perfect = results.filter((r) => r.stars === 3).length;
    sfx('clear'); confetti();
    const m = openModal(`<h2 style="text-align:center">🚉 ${title} しゅうてん！</h2>
      <p style="text-align:center;font-size:26px">⭐ <b class="n">${stars}</b>　パーフェクト <b class="n">${perfect}</b> / ${results.length}もん</p>
      <div class="summary-list">${results.map((r, i) => `<div>${i + 1}. ${KINDS[r.kind].icon} ${KINDS[r.kind].name}<br><b>${'⭐'.repeat(r.stars) || '−'}</b>${r.twin ? ' 📒' : ''}</div>`).join('')}</div>
      ${newPassenger ? `<div class="result-note" style="text-align:center;font-size:24px">あたらしい なかまが でんしゃに のったよ！ <span style="font-size:44px">${newPassenger}</span></div>` : ''}
      ${lvUp ? `<div class="result-note" style="text-align:center;font-size:24px">🎉 レベルアップ！ あたらしい もんだいが でるように なったよ。</div>` : ''}
      <div class="acts"><button class="btn big" data-home>おわる</button></div>`);
    $('[data-home]', m.node).onclick = () => { m.close(); res(); };
  });
}
