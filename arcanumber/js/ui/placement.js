// まほうの うでだめし（がくねん・むずかしさを きめる 5もん）
import { T } from '../text.js';
import { el, $, $$, makeRng, newSeed } from '../util.js';
import { sfx } from '../audio.js';
import { meta, saveMeta } from '../save.js';
import { bgHtml } from './common.js';
import { swirl } from './bg.js';
import * as FX from './fx.js';
import { TEST_N, TEST_START, LV_INFO, placementQuestion, nextLevel, judgePlacement } from '../data/placement.js';

export const GRADE_INFO = {
  1: { icon: '🌱', name: '1ねんせい コース', desc: 'たし{算|ざん}・ひき{算|ざん}' },
  2: { icon: '🌿', name: '2ねんせい コース', desc: 'かけ{算|ざん}（{九九|くく}）' },
  3: { icon: '🌳', name: '3ねんせい コース', desc: 'おおきな {数|かず}・わり{算|ざん}' },
};
export const DIFF_INFO = {
  easy: { icon: '🐣', name: 'かんたん', desc: '{敵|てき}が よわめ。HPと コインが おおめ' },
  normal: { icon: '🔥', name: 'ふつう', desc: 'ほんきの ぼうけん。スコア +20%' },
};
export const levelLabel = (g, d) => `${GRADE_INFO[g].icon} ${GRADE_INFO[g].name}・${DIFF_INFO[d].icon} ${DIFF_INFO[d].name}`;

// ぼうけんの まえの ステップ：{ grade, diff } か null（もどる）
export function levelStep(app) {
  return new Promise((resolve) => {
    const last = meta.test;
    const root = el(`<div class="screen fade-in">${bgHtml()}<div class="panel-screen"><div class="event-box">
      <div class="ev-art">🐈‍⬛</div><div class="ev-title">${T('まほうの うでだめし')}</div>
      <div class="ev-text">${T('ぼうけんの まえに、けいさんを 5もん といて みよう。\nきみに ぴったりの むずかしさを ノクスが えらぶよ。あせらなくて だいじょうぶ！')}</div>
      <div class="choice-list">
        <button class="btn big" data-start>🔮 ${T('うでだめし スタート！')}</button>
        ${last ? `<button class="btn blue" data-last style="flex-direction:column;gap:2px;padding:8px 20px">${T('まえと おなじで はじめる')}<span style="font-size:15px">${T(levelLabel(last.grade, last.diff))}</span></button>` : ''}
        <button class="btn dark small" data-back>◀ ${T('もどる')}</button>
      </div></div></div></div>`);
    app.mount(root);
    swirl($('canvas.swirl', root), 'title');
    $('[data-back]', root).addEventListener('click', () => { sfx('tap'); resolve(null); });
    $('[data-last]', root)?.addEventListener('click', () => { sfx('tap'); resolve({ grade: last.grade, diff: last.diff }); });
    $('[data-start]', root).addEventListener('click', async () => { sfx('tap'); resolve(await placementTest(app)); });
  });
}

function keypad() {
  return `<div class="keypad">${[7, 8, 9, 4, 5, 6, 1, 2, 3].map((n) => `<button data-k="${n}">${n}</button>`).join('')}<button class="del" data-k="del">⌫</button><button data-k="0">0</button><button class="ok" data-k="ok">OK</button></div>`;
}

export function placementTest(app) {
  return new Promise((resolve) => {
    const rng = makeRng(newSeed());
    const results = [];
    let lv = TEST_START;
    const o = el(`<div class="overlay pt">
      <div class="ov-head"><div><div class="ov-title">🔮 ${T('まほうの うでだめし')}</div><div class="ov-sub">${T('わからない ときは「パス」でも いいよ')}</div></div><div class="pt-dots" data-dots></div></div>
      <div class="ov-body" data-body></div></div>`);
    app.stage.appendChild(o);
    const body = $('[data-body]', o);
    const dots = () => {
      $('[data-dots]', o).innerHTML = Array.from({ length: TEST_N }, (_, i) => {
        const r = results[i];
        return `<span class="pd ${r ? (r.ok ? 'ok' : 'ng') : i === results.length ? 'now' : ''}">${r ? (r.ok ? '⭕' : '✖') : i + 1}</span>`;
      }).join('');
    };
    let onKey = null;
    const ask = () => {
      dots();
      const q = placementQuestion(lv, rng);
      window.__pt = q;
      body.innerHTML = `<div class="pt-no">${T(`だい ${results.length + 1} もん`)}</div>
        <div class="pt-main"><div class="pt-q"><span class="num">${q.q}</span><span>=</span><div class="answer-box" data-ans>？</div></div>${keypad()}</div>
        <button class="btn dark small" data-pass>${T('パス')}</button>`;
      const box = $('[data-ans]', body);
      const t0 = performance.now();
      let val = '', done = false;
      const finish = (ok, passed) => {
        if (done) return; done = true;
        document.removeEventListener('keydown', onKey);
        const sec = Math.round((performance.now() - t0) / 100) / 10;
        results.push({ lv, ok, sec });
        sfx(ok ? 'correct' : 'wrong');
        box.classList.add(ok ? 'ok' : 'ng');
        if (!ok) box.innerHTML = `<span style="font-size:22px;color:var(--ink-dim);margin-right:8px">${T(passed ? 'こたえは' : 'せいかいは')}</span>${q.a}`;
        if (ok) { const p = FX.posOf(box, 0.5, 0.5); FX.burst(p.x, p.y, { n: 12, stars: true, dist: 120 }); }
        $$('button', body).forEach((b) => { b.disabled = true; });
        lv = nextLevel(lv, ok);
        setTimeout(() => { if (results.length >= TEST_N) showResult(); else ask(); }, ok ? 700 : 1500);
      };
      const press = (k) => {
        if (done) return;
        if (k === 'del') val = val.slice(0, -1);
        else if (k === 'ok') { if (!val) return; finish(Number(val) === q.a, false); return; }
        else if (val.length < 4) val = (val === '0' ? '' : val) + k;
        sfx('tap'); box.textContent = val || '？';
      };
      $$('[data-k]', body).forEach((b) => b.addEventListener('click', () => press(b.dataset.k)));
      $('[data-pass]', body).addEventListener('click', () => finish(false, true));
      onKey = (e) => {
        if (/^[0-9]$/.test(e.key)) press(e.key);
        else if (e.key === 'Backspace') press('del');
        else if (e.key === 'Enter') press('ok');
      };
      document.addEventListener('keydown', onKey);
    };
    const showResult = () => {
      dots();
      const J = judgePlacement(results);
      let grade = J.grade, diff = J.diff;
      sfx('upgrade');
      body.innerHTML = `<div class="ov-title" style="font-size:40px">${T('けっか はっぴょう！')}</div>
        <div class="pt-res">${results.map((r, i) => `<div class="pr ${r.ok ? 'ok' : 'ng'}"><div class="pr-n">${i + 1}</div><div class="pr-m">${r.ok ? '⭕' : '✖'}</div><div class="pr-s">${T(`${r.sec}びょう`)}</div></div>`).join('')}</div>
        <div class="sub" style="color:var(--ink-dim)">${T(J.top ? `いちばん むずかしく とけた もんだい：${LV_INFO[J.top].name}` : 'これから いっしょに れんしゅう しよう！')}</div>
        <div class="pt-rec"><div class="pr-lbl">${T('ノクスの おすすめ')}</div><div class="pr-val" data-rec></div><div class="pr-desc" data-recd></div></div>
        <div class="pt-adj" data-adj style="display:none">
          <div class="seg" data-g>${[1, 2, 3].map((g) => `<button data-v="${g}">${T(`${GRADE_INFO[g].icon} ${g}ねんせい`)}</button>`).join('')}</div>
          <div class="seg" data-d>${['easy', 'normal'].map((d) => `<button data-v="${d}">${T(`${DIFF_INFO[d].icon} ${DIFF_INFO[d].name}`)}</button>`).join('')}</div>
        </div>
        <div class="row"><button class="btn dark small" data-adjb>${T('じぶんで かえる')}</button><button class="btn big green" data-go>${T('これで いく！')}</button></div>`;
      const render = () => {
        $('[data-rec]', body).innerHTML = T(levelLabel(grade, diff));
        $('[data-recd]', body).innerHTML = T(`けいさん チャレンジ・なぞときは「${GRADE_INFO[grade].desc}」。${DIFF_INFO[diff].desc}`);
        $$('[data-g] button', body).forEach((b) => b.classList.toggle('on', Number(b.dataset.v) === grade));
        $$('[data-d] button', body).forEach((b) => b.classList.toggle('on', b.dataset.v === diff));
      };
      render();
      $('[data-adjb]', body).addEventListener('click', (e) => { sfx('tap'); $('[data-adj]', body).style.display = ''; e.currentTarget.style.display = 'none'; });
      $$('[data-g] button', body).forEach((b) => b.addEventListener('click', () => { sfx('tap'); grade = Number(b.dataset.v); render(); }));
      $$('[data-d] button', body).forEach((b) => b.addEventListener('click', () => { sfx('tap'); diff = b.dataset.v; render(); }));
      $('[data-go]', body).addEventListener('click', () => {
        sfx('tap');
        meta.test = { grade, diff, rec: { grade: J.grade, diff: J.diff }, correct: J.correct, avgSec: J.avgSec, at: Date.now() };
        saveMeta();
        o.remove();
        resolve({ grade, diff });
      });
    };
    ask();
  });
}
