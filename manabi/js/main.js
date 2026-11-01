// まなびサクセス（仮）：はじまり と がめんの ながれ
import { setTextMode, T } from '../../js/text.js';
import { el, $, $$, newSeed, makeRng } from '../../js/util.js';
import { unlockAudio, sfx, playBgm, stopBgm, setVolumes } from '../../js/audio.js';
import { settings, saveSettings, meta, saveMeta, loadRun, saveRun, clearRun, resetAll, markCard, logUnit, logMistakeDetail } from './save.js';
import * as R from './engine/run.js';
import { makeQuestion, adaptLevel, examLevel, recordMistake, clearMistake, mistakesFor, levelRange } from './engine/quiz.js';
import { buildStage } from './data/stages.js';
import { createWorld } from './engine/stage.js';
import { HEROES, heroById, TEACHERS, SUBJ, SUBJECTS, rankOf, MOODS } from './data/characters.js';
import { CARDS, offerCards, passiveSum, DECK_MAX } from './data/cards.js';
import { eventsOf } from './data/events.js';
import { initCommon, openModal, alertBox, confirmBox, cardHtml, pickCard, pickReplace, hudHtml, statsHtml, deckHtml, wireCards, speak, setSpeech, screen, wait } from './ui/common.js';
import { askQuestion } from './ui/quiz.js';
import { MINIGAMES, playMinigame } from './ui/minigame.js';
import { runStage } from './ui/stage.js';

const VERSION = '0.1.0';
const stage = $('#stage');
initCommon(stage);
setTextMode(settings.text || 'hira');
setVolumes(settings.bgm, settings.sfx);
setSpeech(settings.speech);
stage.classList.toggle('fs-l', settings.fontSize === 'l'); stage.classList.toggle('fs-s', settings.fontSize === 's');

// ───── がめんの おおきさ（iPad よこむき きじゅん）─────
const DW = 1180, MIN_H = 700, MAX_H = 900;
function fit() {
  const vw = window.innerWidth, vh = window.innerHeight;
  let s = vw / DW, w = DW, h = vh / s;
  if (h < MIN_H) { s = vh / MIN_H; h = MIN_H; w = Math.min(vw / s, 1500); } else if (h > MAX_H) h = MAX_H;
  stage.style.width = w + 'px'; stage.style.height = h + 'px'; stage.classList.toggle('short', h < 790);
  stage.style.transform = `scale(${s})`; stage.style.left = Math.max(0, (vw - w * s) / 2) + 'px'; stage.style.top = Math.max(0, (vh - h * s) / 2) + 'px';
}
window.addEventListener('resize', fit); window.addEventListener('orientationchange', () => setTimeout(fit, 200)); fit();
document.addEventListener('gesturestart', (e) => e.preventDefault()); document.addEventListener('dblclick', (e) => e.preventDefault()); document.addEventListener('contextmenu', (e) => e.preventDefault());
let audioReady = false, pendingBgm = null;
document.addEventListener('pointerdown', () => { if (!audioReady) { unlockAudio(); audioReady = true; if (pendingBgm) playBgm(pendingBgm); } }, { capture: true });
function bgm(name) { pendingBgm = name; if (audioReady) { if (name) playBgm(name); else stopBgm(); } }
$('[data-portrait]')?.addEventListener('click', () => document.body.classList.add('allow-portrait'));
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});

// ───── アプリ ─────
let run = null; let playStart = Date.now();
function mount(node) { $$('.screen', stage).forEach((s) => s.remove()); $$('.modal-back', stage).forEach((s) => s.remove()); stage.prepend(node); return node; }
function persist() { if (run) { run.playMs += Date.now() - playStart; playStart = Date.now(); saveRun(run); } }
function rngOf() { const r = R.runRng(run); return { rng: r.rng, done: () => { r.save(); persist(); } }; }
function wireSettings(root) { $('[data-settings]', root)?.addEventListener('click', () => { sfx('tap'); openSettings(); }); }

// ───── せってい ─────
function seg(name, options, cur) { return `<div class="seg" data-seg="${name}">${options.map(([v, l]) => `<button data-v="${v}" class="${String(v) === String(cur) ? 'on' : ''}">${T(l)}</button>`).join('')}</div>`; }
function openSettings() {
  const { m, close } = openModal(`<h2>⚙️ ${T('せってい')}</h2>
    <div class="row"><span class="sub">もじ</span>${seg('text', [['hira', 'ひらがな'], ['ruby', '{漢字|かんじ}（ふりがな）'], ['kanji', '{漢字|かんじ}']], settings.text || 'hira')}</div>
    <div class="row"><span class="sub">もじの おおきさ</span>${seg('fontSize', [['s', 'ちいさい'], ['m', 'ふつう'], ['l', 'おおきい']], settings.fontSize)}</div>
    <div class="row"><span class="sub">BGM</span>${seg('bgm', [[0, 'なし'], [0.5, 'ふつう'], [1, 'おおきい']], settings.bgm)}<span class="sub">こうかおん</span>${seg('sfx', [[0, 'なし'], [0.8, 'あり']], settings.sfx)}</div>
    <div class="row"><span class="sub">よみあげ</span>${seg('speech', [[true, 'あり'], [false, 'なし']], settings.speech)}<span class="sub">ステージの そうさ</span>${seg('autorun', [[false, '4ボタン'], [true, 'オートラン']], settings.autorun)}</div>
    <div class="row"><button class="btn gray small" data-parents>👨‍👩‍👧 ${T('おうちのひとへ')}</button><button class="btn gray small" data-reset>🗑 ${T('さいしょから やりなおす')}</button></div>
    <div class="sub" style="font-size:14px">まなびサクセス（仮） v${VERSION} ・ しさくばん</div>`, { onClose: () => {} });
  $$('[data-seg] button', m).forEach((b) => b.addEventListener('click', () => {
    sfx('tap'); const name = b.closest('[data-seg]').dataset.seg; let v = b.dataset.v; if (v === 'true') v = true; else if (v === 'false') v = false; else if (!isNaN(Number(v)) && name !== 'fontSize') v = Number(v);
    settings[name] = v; saveSettings(); $$('button', b.parentElement).forEach((x) => x.classList.toggle('on', x === b));
    if (name === 'text') setTextMode(v); if (name === 'bgm' || name === 'sfx') setVolumes(settings.bgm, settings.sfx); if (name === 'speech') setSpeech(v);
    if (name === 'fontSize') { stage.classList.toggle('fs-l', v === 'l'); stage.classList.toggle('fs-s', v === 's'); }
  }));
  $('[data-parents]', m).addEventListener('click', () => { sfx('tap'); close(); openParents(); });
  $('[data-reset]', m).addEventListener('click', async () => { sfx('tap'); if (await confirmBox('ほんとうに けす？', 'きろく・カード・せいせきひょうが すべて きえます', 'けす', 'やめる')) { if (await confirmBox('さいごの かくにん', 'もとに もどせません。けしますか？', 'けす', 'やめる')) { resetAll(); location.reload(); } } });
}
function openParents() {
  const units = Object.entries(meta.units).sort();
  const rows = units.map(([k, [ok, n]]) => { const [s, u] = k.split(':'); return `<tr><td>${SUBJ[s]?.short || s}</td><td>${u}</td><td>${n}</td><td>${Math.round(ok / n * 100)}%</td></tr>`; }).join('');
  const logs = (meta.playLog || []).slice(0, 12).map((l) => `<div class="item" style="font-size:15px;display:block"><b>${SUBJ[l.subj]?.short}</b> ${l.q.replace(/<[^>]+>/g, '')} → <b>${l.a}</b><br><span style="color:#5a4f73">${l.ex || ''}</span></div>`).join('');
  const mins = Math.round(((meta.album || []).reduce((s, a) => s + (a.playMs || 0), 0) + (run?.playMs || 0)) / 60000);
  openModal(`<h2>👨‍👩‍👧 おうちのひとへ</h2><div class="sub" style="font-size:16px">プレイ回数 ${meta.runs} ・ クリア ${meta.clears} ・ 合計プレイ時間 約${mins}分</div>
    <div class="row" style="align-items:flex-start;max-height:460px;overflow:auto">
      <div><div class="sub">単元ごとの正答率</div>${units.length ? `<table class="tbl"><tr><th>教科</th><th>単元</th><th>回数</th><th>正答率</th></tr>${rows}</table>` : '<div class="sub">まだ記録がありません</div>'}</div>
      <div style="width:460px"><div class="sub">最近まちがえた問題</div><div class="list" style="max-height:380px">${logs || '<div class="sub">まだありません</div>'}</div></div>
    </div>`, { cls: 'wide' });
}

// ───── タイトル ─────
function showTitle() {
  run = null; bgm('title');
  const saved = loadRun();
  const node = mount(screen(`<div class="center">
    <div class="title-logo">まなびサクセス<small>（かりの なまえ）・ しさくばん</small></div>
    <div class="sub-text" style="color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.4)">さんすう・こくご・えいごで ちからを つけて、<br>ライバルと いっしょに ステージを はしろう！</div>
    <div class="row">
      ${saved && !saved.ended ? `<button class="btn green big" data-continue>▶ ${T('つづきから')}</button>` : ''}
      <button class="btn big" data-new>✨ ${T('はじめから')}</button>
    </div>
    <div class="row"><button class="btn white small" data-album>📒 ${T('アルバム')}</button><button class="btn white small" data-zukan>🃏 ${T('カードずかん')}</button><button class="btn white small" data-settings>⚙️ ${T('せってい')}</button></div>
    ${meta.carry ? `<div class="sub-text" style="color:#fff">ひきつぎ ポイント <b class="num" style="font-size:28px;color:#ffc21a">${meta.carry}</b> が あるよ</div>` : ''}
  </div>`, 'dark'));
  $('[data-continue]', node)?.addEventListener('click', () => { sfx('tap'); run = saved; playStart = Date.now(); resume(); });
  $('[data-new]', node).addEventListener('click', async () => { sfx('tap'); if (saved && !saved.ended && !(await confirmBox('とちゅうの きろくが あるよ', 'はじめから やると、とちゅうの きろくは きえます。いい？'))) return; showSetup(); });
  $('[data-album]', node).addEventListener('click', () => { sfx('tap'); showAlbum(); });
  $$('[data-zukan]', node).forEach((b) => b.addEventListener('click', () => { sfx('tap'); showZukan(); }));
  wireSettings(node);
}
function resume() {
  if (!run) return showTitle();
  if (run.exam) { if (run.exam.phase === 'quiz') return examQuiz(); if (run.exam.phase === 'stage') return examStage(); }
  showHome();
}

// ───── はじめかた ─────
function showSetup() {
  let grade = meta.lastGrade || 1, heroId = null, hard = false;
  const carry = meta.carry || 0; const alloc = { math: 0, ja: 0, en: 0 }; let bring = null;
  const owned = Object.keys(meta.cards).filter((id) => CARDS[id] && !CARDS[id].fixed);
  const node = mount(screen(`<div class="center" style="gap:12px">
    <div class="row" style="width:100%;justify-content:space-between"><button class="btn gray small" data-back>← ${T('もどる')}</button><div class="mg-big">${T('はじめかた')}</div><span style="width:120px"></span></div>
    <div class="row"><span class="sub-text">がくねん</span>${seg('grade', [[1, '1ねん'], [2, '2ねん'], [3, '3ねん']], grade)}${meta.hardUnlocked ? `<span class="sub-text" style="margin-left:20px">むずかしさ</span>${seg('hard', [[false, 'ふつう'], [true, 'むずかしい']], false)}` : ''}</div>
    <div class="sub-text">しゅじんこうを えらぼう（えらばなかった 3にんが ライバルに なる）</div>
    <div class="row">${HEROES.map((h) => `<div class="hero-card" data-hero="${h.id}"><div class="emo">${h.emoji}</div><div class="nm">${T(h.name)}</div><div class="ds">${T(h.desc)}</div><div class="chip">${CARDS[h.card].icon} ${T(CARDS[h.card].name)}</div></div>`).join('')}</div>
    ${carry ? `<div class="panel col"><div class="sub-text">ひきつぎ ポイント <b class="num" style="font-size:26px;color:#e09a00" data-left>${carry}</b> を きょうかに わけよう（10ずつ）</div>
      <div class="alloc">${SUBJECTS.map((s) => `<span>${SUBJ[s].icon} ${T(SUBJ[s].name)}</span><button class="btn gray" data-minus="${s}">−</button><b class="num" data-val="${s}">0</b><button class="btn green" data-plus="${s}">＋</button>`).join('')}</div></div>` : ''}
    ${owned.length ? `<div class="panel col"><div class="sub-text">もちこむ カードを 1まい えらべる（なくてもいい）</div><div class="row" data-bring>${owned.map((id) => cardHtml(id, { small: true })).join('')}</div></div>` : ''}
    <button class="btn green big" data-start disabled>🏫 ${T('がっこうへ いく')}</button>
  </div>`));
  $('[data-back]', node).addEventListener('click', () => { sfx('tap'); showTitle(); });
  $$('[data-seg="grade"] button', node).forEach((b) => b.addEventListener('click', () => { sfx('tap'); grade = Number(b.dataset.v); $$('[data-seg="grade"] button', node).forEach((x) => x.classList.toggle('on', x === b)); }));
  $$('[data-seg="hard"] button', node).forEach((b) => b.addEventListener('click', () => { sfx('tap'); hard = b.dataset.v === 'true'; $$('[data-seg="hard"] button', node).forEach((x) => x.classList.toggle('on', x === b)); }));
  $$('[data-hero]', node).forEach((c) => c.addEventListener('click', () => { sfx('select'); heroId = c.dataset.hero; $$('[data-hero]', node).forEach((x) => x.classList.toggle('sel', x === c)); $('[data-start]', node).disabled = false; }));
  const left = () => carry - SUBJECTS.reduce((s, k) => s + alloc[k], 0);
  const refreshAlloc = () => { $('[data-left]', node).textContent = left(); for (const s of SUBJECTS) $(`[data-val="${s}"]`, node).textContent = alloc[s]; };
  $$('[data-plus]', node).forEach((b) => b.addEventListener('click', () => { if (left() >= 10) { alloc[b.dataset.plus] += 10; sfx('tap'); refreshAlloc(); } }));
  $$('[data-minus]', node).forEach((b) => b.addEventListener('click', () => { if (alloc[b.dataset.minus] >= 10) { alloc[b.dataset.minus] -= 10; sfx('tap'); refreshAlloc(); } }));
  $$('[data-bring] [data-card]', node).forEach((c) => c.addEventListener('click', () => { sfx('select'); bring = bring === c.dataset.card ? null : c.dataset.card; $$('[data-bring] [data-card]', node).forEach((x) => x.classList.toggle('sel', x.dataset.card === bring)); }));
  $('[data-start]', node).addEventListener('click', async () => {
    sfx('select'); if (!heroId) return;
    if (carry && left() > 0 && !(await confirmBox('ポイントが のこっているよ', `${left()} ポイント つかわずに はじめる？（のこりは きえます）`))) return;
    meta.lastGrade = grade; meta.carry = 0; meta.runs++; saveMeta();
    run = R.newRun({ grade, heroId, seed: newSeed(), carry: alloc, bringCard: bring, hard, autorun: settings.autorun });
    playStart = Date.now(); persist();
    const h = heroById(heroId);
    await storyBox(h.emoji, `${h.name}「${h.line}」`, 'ぜんきが はじまる！ 4しゅうかん がんばって、テストに ちょうせん しよう');
    showHome();
  });
}
function storyBox(emoji, text, sub = '') {
  return new Promise((res) => {
    const { m, close } = openModal(`<div class="row" style="align-items:center"><div class="speaker">${emoji}</div><div class="bubble say">${T(text)}${sub ? `<div class="sub" style="margin-top:8px">${T(sub)}</div>` : ''}</div></div><button class="btn green" data-ok>${T('つぎへ')}</button>`, { closable: false });
    $('[data-ok]', m).addEventListener('click', () => { sfx('tap'); close(); res(); });
  });
}

// ───── ホーム（しゅう）─────
function teacherLine() {
  const low = SUBJECTS.reduce((a, b) => (run.stats[a] <= run.stats[b] ? a : b));
  const t = TEACHERS[low];
  const lines = run.week === R.WEEKS ? [`${t.emoji}|こんしゅうが おわると テスト！ じゅんびは いい？`]
    : run.stamina < 20 ? ['👩‍🏫|つかれて いるね。きゅうけいも だいじだよ'] : [`${t.emoji}|${SUBJ[low].short}が ちょっと しんぱいだな。レッスン してみる？`, `${t.emoji}|ミニゲームで カードを あつめると、ステージが らくに なるよ`, '👩‍🏫|まちがえた もんだいは ふくしゅうで とくに なるよ'];
  const [emo, text] = lines[(run.week + run.term) % lines.length].split('|');
  return `<div class="teacher-say"><span class="emo">${emo}</span><span>${T(text)}</span></div>`;
}
function showHome() {
  bgm('map'); persist();
  const p = passiveSum(run.deck);
  const mistakes = (meta.mistakes || []).length;
  const lessonCost = Math.max(5, R.COST.lesson - p.staminaSave);
  const canLesson = run.stamina > 0;
  const node = mount(screen(`${hudHtml(run)}
    <div class="home">
      <div class="col" style="align-items:stretch;gap:12px;min-height:0">
        ${teacherLine()}
        ${statsHtml(run)}
        <div class="panel"><div class="sub" style="font-size:15px;text-align:left;margin-bottom:6px">🃏 デッキ（タップで せつめい）</div>${deckHtml(run)}</div>
      </div>
      <div class="cmds">
        ${SUBJECTS.map((s) => `<button class="cmd ${s}" data-cmd="lesson" data-subj="${s}" ${canLesson ? '' : 'disabled'}><span class="ic">${SUBJ[s].icon}</span><span class="nm">${T(SUBJ[s].name)}の レッスン</span><span class="ef">もんだい 5もん ・ たいりょく −${lessonCost}</span></button>`).join('')}
        <button class="cmd" data-cmd="minigame" ${run.stamina > 0 ? '' : 'disabled'}><span class="ic">🎮</span><span class="nm">${T('ミニゲーム')}</span><span class="ef">カードを もらう ・ やるき＋ ・ たいりょく −${R.COST.minigame}</span></button>
        <button class="cmd" data-cmd="rest"><span class="ic">🛏️</span><span class="nm">${T('きゅうけい')}</span><span class="ef">たいりょく ＋${R.COST.restGain}</span></button>
        <button class="cmd" data-cmd="outing" ${run.stamina > 0 ? '' : 'disabled'}><span class="ic">🚶</span><span class="nm">${T('おでかけ')}</span><span class="ef">なにかが おこる ・ たいりょく −${R.COST.outing}</span></button>
        <button class="cmd" data-cmd="review" style="grid-column: span 3; flex-direction:row; gap:14px" ${run.stamina > 0 ? '' : 'disabled'}><span class="ic">📝</span><span class="nm">${T('ふくしゅう')}</span><span class="ef">まちがえた もんだい ${mistakes}こ ・ もらえる りょう 1.5ばい ・ たいりょく −${R.COST.review}</span></button>
      </div>
    </div>`));
  wireSettings(node); wireCards(node);
  $$('[data-cmd]', node).forEach((b) => b.addEventListener('click', () => { sfx('select'); doCommand(b.dataset.cmd, b.dataset.subj); }));
}
async function doCommand(cmd, subj) {
  if (cmd === 'lesson') return lesson(subj, false);
  if (cmd === 'review') return lesson(null, true);
  if (cmd === 'rest') { R.applyRest(run); const { rng, done } = rngOf(); const ev = rng() < 0.3 ? pickEvent('rest', rng) : null; done(); await resultToast('🛏️', `たいりょくが ${R.COST.restGain} もどった`); if (ev) await playEvent(ev); return afterWeek(); }
  if (cmd === 'outing') { R.applyOuting(run); const { rng, done } = rngOf(); const ev = pickEvent('outing', rng) || pickEvent('rival', rng); done(); if (ev) await playEvent(ev); return afterWeek(); }
  if (cmd === 'minigame') return minigame();
}
function pickEvent(kind, rng) {
  let pool = eventsOf(kind).filter((e) => !run.seenEvents.includes(e.id) && (!e.who || e.who !== run.hero));
  if (!pool.length) pool = eventsOf(kind).filter((e) => !e.who || e.who !== run.hero);
  if (!pool.length) return null;
  // ライバルの できごとも たまに まぜる
  if (kind === 'outing' && rng() < 0.3) { const rv = eventsOf('rival').filter((e) => e.who !== run.hero && !run.seenEvents.includes(e.id)); if (rv.length) pool = rv; }
  return pool[Math.floor(rng() * pool.length)];
}
function resultToast(icon, text) { return storyBox(icon, text); }
async function afterWeek() {
  persist();
  const r = R.nextWeek(run); persist();
  if (r === 'exam') { await storyBox('🏫', run.term === 1 ? 'ぜんきの テストの ひが きた！' : 'こうきの テストの ひが きた！ これで 1いなら クリア！', 'まず もんだいを 6もん。そのあと ステージを はしる'); return examStart(); }
  showHome();
}

// ───── レッスン・ふくしゅう ─────
async function lesson(subj, review) {
  const { rng, done } = rngOf();
  let subjs;
  if (review) {
    const ms = meta.mistakes || [];
    if (ms.length) subjs = Array.from({ length: 5 }, (_, i) => ms[i % ms.length]);
    else { const low = SUBJECTS.reduce((a, b) => (run.stats[a] <= run.stats[b] ? a : b)); subjs = Array.from({ length: 5 }, () => ({ subj: low })); }
  } else subjs = Array.from({ length: 5 }, () => ({ subj }));
  const node = mount(screen(`${hudHtml(run)}`));
  wireSettings(node);
  const dots = Array(5).fill(null); let correct = 0; const recent = [];
  for (let i = 0; i < 5; i++) {
    const s = subjs[i].subj;
    const [lo] = levelRange(run.grade);
    const level = run.level[s] ?? lo + 1;
    const q = makeQuestion(s, run.grade, level, rng, { recent, topic: subjs[i].topic || null, keypad: s === 'math' && rng() < 0.5 });
    recent.push(q.q + '|' + q.answer);
    const r = await askQuestion(node, q, { index: i, total: 5, dots });
    dots[i] = r.ok; if (r.ok) correct++;
    adaptLevel(run, s, r.ok, run.grade);
    logUnit(s, q.topic, r.ok); logMistakeDetail(q, r.ok);
    if (r.ok) clearMistake(meta, q); else recordMistake(meta, q);
    saveMeta();
  }
  done();
  const mainSubj = review ? subjs[0].subj : subj;
  // ふくしゅうは きょうかが まざるので、いちばん おおい きょうかに はいる
  const target = review ? subjs.map((x) => x.subj).sort((a, b) => subjs.filter((x) => x.subj === b).length - subjs.filter((x) => x.subj === a).length)[0] : subj;
  const res = R.applyLesson(run, target, correct, { review });
  persist();
  const label = res.grade === 'perfect' ? 'だいせいこう！' : res.grade === 'good' ? 'せいこう！' : 'いまいち…';
  sfx(res.grade === 'perfect' ? 'win' : res.grade === 'good' ? 'correct' : 'wrong');
  await new Promise((ok) => {
    const { m, close } = openModal(`<div class="result-badge" style="color:${res.grade === 'perfect' ? '#ffc21a' : res.grade === 'good' ? '#2fbf71' : '#8f88a6'}">${T(label)}</div>
      <div class="sub">${correct} / 5 せいかい${res.tired ? '<br>つかれていて、もらえる りょうが はんぶん…' : ''}</div>
      <div class="row"><span style="font-size:40px">${SUBJ[target].icon}</span><span class="gain-num">+${res.gain}</span></div>
      <div class="sub">${T(SUBJ[target].name)} ${run.stats[target] - res.gain} → <b>${run.stats[target]}</b>（${rankOf(run.stats[target])}）${res.grade === 'perfect' ? '<br>やるき ＋1' : res.grade === 'poor' ? '<br>やるき −1' : ''}</div>
      <button class="btn green big" data-ok>${T('つぎへ')}</button>`, { closable: false });
    $('[data-ok]', m).addEventListener('click', () => { sfx('tap'); close(); ok(); });
  });
  afterWeek();
}

// ───── ミニゲーム ─────
async function minigame() {
  const node = mount(screen(`${hudHtml(run)}<div class="center"><div class="mg-big">${T('ミニゲームを えらぼう')}</div><div class="row">${MINIGAMES.map((m) => `<button class="cmd" data-mg="${m.id}" style="width:280px;height:200px"><span class="ic">${m.icon}</span><span class="nm">${T(m.name)}</span><span class="ef">${T(m.desc)}</span></button>`).join('')}</div><button class="btn gray small" data-back>← ${T('もどる')}</button></div>`));
  wireSettings(node);
  $('[data-back]', node).addEventListener('click', () => { sfx('tap'); showHome(); });
  $$('[data-mg]', node).forEach((b) => b.addEventListener('click', async () => {
    sfx('select'); const mg = MINIGAMES.find((m) => m.id === b.dataset.mg);
    const { rng, done } = rngOf();
    const result = await playMinigame(node, mg.id, { grade: run.grade, rng });
    R.applyMinigame(run);
    const p = passiveSum(run.deck);
    const offers = offerCards(rng, result.grade + 1, run.deck, 3 + p.cardOffers, mg.pools);
    done();
    await giveCardChoice(offers);
    afterWeek();
  }));
}
async function giveCardChoice(offers) {
  if (!offers.length) return;
  const id = await pickCard(offers);
  if (!id) return;
  if (R.deckFull(run)) { const rep = await pickReplace(run.deck, id); if (!rep) return; R.removeCard(run, rep); }
  R.addCard(run, id); markCard(id); persist();
  sfx('upgrade'); await storyBox(CARDS[id].icon, `「${CARDS[id].name}」を デッキに いれた！`);
}

// ───── できごと ─────
async function playEvent(ev) {
  run.seenEvents.push(ev.id); persist();
  const who = ev.who ? heroById(ev.who) : null;
  const emoji = who ? who.emoji : ev.kind === 'rest' ? '🛏️' : '🚶';
  for (const t of ev.text.slice(0, -1)) await storyBox(emoji, t);
  const last = ev.text[ev.text.length - 1];
  const choice = await new Promise((res) => {
    const { m, close } = openModal(`<div class="row" style="align-items:center"><div class="speaker">${emoji}</div><div class="bubble say">${T(last)}</div></div><div class="col">${ev.choices.map((c, i) => `<button class="btn white" data-ch="${i}" style="min-width:420px">${T(c.label)}</button>`).join('')}</div>`, { closable: false });
    $$('[data-ch]', m).forEach((b) => b.addEventListener('click', () => { sfx('select'); close(); res(ev.choices[Number(b.dataset.ch)]); }));
  });
  R.applyEffect(run, choice.eff);
  const effText = SUBJECTS.filter((s) => choice.eff[s]).map((s) => `${SUBJ[s].icon} ${choice.eff[s] > 0 ? '+' : ''}${choice.eff[s]}`).concat(choice.eff.stamina ? [`たいりょく ${choice.eff.stamina > 0 ? '+' : ''}${choice.eff.stamina}`] : [], choice.eff.mood ? [`やるき ${choice.eff.mood > 0 ? '+' : ''}${choice.eff.mood}`] : []).join('　');
  await storyBox(emoji, choice.say, effText);
  if (choice.eff.card) { const { rng, done } = rngOf(); const offers = offerCards(rng, 2, run.deck, 1); done(); if (offers.length) { if (R.deckFull(run)) { const rep = await pickReplace(run.deck, offers[0]); if (rep) R.removeCard(run, rep); else return; } R.addCard(run, offers[0]); markCard(offers[0]); await storyBox(CARDS[offers[0]].icon, `「${CARDS[offers[0]].name}」を もらった！`); } }
  persist();
}

// ───── テスト ─────
function examStart() {
  run.exam = { phase: 'quiz', q: 0, correct: { math: 0, ja: 0, en: 0 }, dots: [], used: [] };
  persist(); examQuiz();
}
async function examQuiz() {
  bgm('battle');
  const node = mount(screen(`${hudHtml(run, { right: `<div class="pill">📝 テスト・もんだい</div>` })}`));
  wireSettings(node);
  const order = ['math', 'math', 'ja', 'ja', 'en', 'en'];
  const level = examLevel(run.grade, run.term);
  const usedActives = new Set(run.exam.used);
  const actives = new Set(run.deck.filter((id) => CARDS[id].type === 'active' && CARDS[id].phase === 'quiz'));
  while (run.exam.q < 6) {
    const i = run.exam.q; const s = order[i];
    const { rng, done } = rngOf();
    // にがてから 1もん
    const ms = mistakesFor(meta, s); const useMistake = (i % 2 === 0) && ms.length;
    let q = makeQuestion(s, run.grade, level, rng, { topic: useMistake ? ms[0].topic : null, keypad: s === 'math' && rng() < 0.4 });
    done();
    let r;
    for (;;) {
      r = await askQuestion(node, q, { index: i, total: 6, dots: Array.from({ length: 6 }, (_, k) => run.exam.dots[k] ?? null), actives, usedActives, onActive: (id) => { usedActives.add(id); run.exam.used.push(id); persist(); } });
      if (r.swap) { const o = rngOf(); q = makeQuestion(s, run.grade, level, o.rng, { keypad: false }); o.done(); continue; }
      break;
    }
    run.exam.dots[i] = r.ok; if (r.ok) run.exam.correct[s]++;
    run.log.examTotal++; if (r.ok) run.log.examCorrect++;
    logUnit(s, q.topic, r.ok); logMistakeDetail(q, r.ok); if (r.ok) clearMistake(meta, q); else recordMistake(meta, q); saveMeta();
    run.exam.q++; persist();
  }
  // ライバルの せいかい
  const { rng, done } = rngOf();
  const rivals = {};
  for (const h of R.rivalsOf(run)) { rivals[h.id] = { math: 0, ja: 0, en: 0 }; for (const s of SUBJECTS) for (let k = 0; k < 2; k++) if (rng() < R.rivalCorrectRate(h, s, run.term, run.hard)) rivals[h.id][s]++; }
  run.exam.rivals = rivals; run.exam.stageSeed = rng.int(1, 1e9); run.exam.phase = 'stage'; done(); persist();
  const total = SUBJECTS.reduce((a, s) => a + run.exam.correct[s], 0);
  await new Promise((ok) => {
    const { m, close } = openModal(`<h2>${T('もんだい おわり！')}</h2>
      <div class="row">${SUBJECTS.map((s) => `<div class="panel col" style="min-width:150px"><div style="font-size:34px">${SUBJ[s].icon}</div><div class="num" style="font-size:36px;color:${SUBJ[s].color}">${run.exam.correct[s]} / 2</div><div class="sub" style="font-size:14px">${T(SUBJ[s].zone)}の<br>ブロック ${run.exam.correct[s]}こに なかみ</div></div>`).join('')}</div>
      <div class="sub">${heroById(run.hero).emoji} ${T(heroById(run.hero).name)} ${total} / 6　${R.rivalsOf(run).map((h) => `${h.emoji} ${T(h.name)} ${SUBJECTS.reduce((a, s) => a + rivals[h.id][s], 0)}`).join('　')}</div>
      <div class="sub">せいかいした かずだけ、ステージの「？」ブロックから アイテムが でるよ！</div>
      <div class="row"><button class="btn gray small" data-later>${T('あとで やる')}</button><button class="btn green big" data-go>🏁 ${T('ステージへ！')}</button></div>`, { closable: false });
    $('[data-go]', m).addEventListener('click', () => { sfx('select'); close(); ok(); });
    $('[data-later]', m).addEventListener('click', () => { sfx('tap'); close(); showTitle(); ok(Symbol.for('later')); });
  }).then((v) => { if (v !== Symbol.for('later')) examStage(); });
}
async function examStage() {
  bgm(null);
  const node = mount(screen('', 'dark'));
  const seed = run.exam.stageSeed || 1;
  const stageData = buildStage(run.term, makeRng(seed));
  const p = passiveSum(run.deck);
  const hero = heroById(run.hero);
  const runners = [
    { id: run.hero, name: hero.name, isPlayer: true, stats: run.stats, correct: run.exam.correct, passive: p, actives: run.deck.filter((id) => CARDS[id].type === 'active' && CARDS[id].phase === 'stage'), autorun: settings.autorun },
    ...R.rivalsOf(run).map((h) => ({ id: h.id, name: h.name, stats: R.rivalStats(h, run.term, run.hard), correct: run.exam.rivals[h.id], skill: R.rivalSkill(h, run.term, run.hard), style: h.style, passive: null })),
  ];
  const world = createWorld(stageData, runners, { rng: makeRng(seed + 7) });
  await storyBox('🏁', `${run.term === 1 ? 'ぜんき' : 'こうき'}の ステージ！ ${run.term === 1 ? '2い いない' : '1い'}で ごうかく`, `${settings.autorun ? 'ジャンプ と アイテムの ボタンで すすむ' : '◀▶で うごいて、⤒で ジャンプ、🎒で アイテム'}。？ブロックを したから たたくと アイテムが でる（せいかいした かずだけ）。HPが 0に なっても チェックポイントから ふっかつ`);
  const result = await runStage(node, world, { autorun: settings.autorun });
  if (result.aborted) { persist(); return showTitle(); }
  const me = result.ranking.find((r) => r.isPlayer); const rank = result.ranking.indexOf(me) + 1;
  run.log.ranks.push(rank); run.log.deaths += me.deaths; if (me.damageTaken === 0 && me.deaths === 0) run.log.noDamage++;
  const pass = R.judge(run, rank);
  sfx(pass ? 'win' : 'lose'); bgm(pass ? 'victory' : null);
  await new Promise((ok) => {
    const { m, close } = openModal(`<h2>${pass ? (run.term === 2 ? '🎉 クリア！' : '🎉 ごうかく！') : '😢 ざんねん…'}</h2>
      <div class="rank-list">${result.ranking.map((r, i) => { const h = heroById(r.id); return `<div class="rank-row ${r.isPlayer ? 'me' : ''}"><span class="no">${i + 1}い</span><span class="emo">${h.emoji}</span><span>${T(h.name)}</span><span class="tm">${r.finish ? r.finish.toFixed(1) + 's' : 'とちゅう'}</span></div>`; }).join('')}</div>
      <div class="sub">${pass ? (run.term === 1 ? 'こうきに すすむ！' : 'こうきの テストで 1い！ そつぎょう だ！') : `${R.passRank(run)}い いないで ごうかく だった…。 でも ちからは つぎに ひきつげる`}</div>
      <button class="btn green big" data-ok>${T('つぎへ')}</button>`, { closable: false });
    $('[data-ok]', m).addEventListener('click', () => { sfx('tap'); close(); ok(); });
  });
  run.exam = null;
  if (pass && run.term === 1) { R.startNextTerm(run); persist(); await storyBox('🏫', 'こうきが はじまる！ ライバルも つよくなる。 4しゅうかん がんばろう'); return showHome(); }
  run.ended = pass ? 'clear' : 'fail'; persist();
  showReport();
}

// ───── せいせきひょう・ひきつぎ ─────
function showReport() {
  const rc = R.reportCard(run); const titles = R.earnTitles(run, meta);
  const carry = R.carryPoints(run);
  meta.carry = carry; meta.carryFrom = run.hero; meta.album = meta.album || []; meta.album.unshift(rc); if (meta.album.length > 30) meta.album.length = 30;
  if (run.ended === 'clear') { meta.clears++; meta.hardUnlocked = true; }
  for (const id of run.deck) markCard(id);
  saveMeta(); clearRun();
  const h = heroById(run.hero);
  const node = mount(screen(`<div class="center" style="gap:12px">
    <div class="mg-big">${run.ended === 'clear' ? '🎓 そつぎょう！ せいせきひょう' : '📄 せいせきひょう'}</div>
    <div class="card-box" style="min-width:760px">
      <div class="row" style="justify-content:space-between"><div class="row"><span style="font-size:60px">${h.emoji}</span><div><div style="font-size:26px;font-weight:900">${T(h.name)}</div><div class="sub">${run.grade}ねんせい ・ ${run.hard ? 'むずかしい' : 'ふつう'} ・ ${Math.round(run.playMs / 60000)}ぷん</div></div></div>
        <div class="sub">テストの じゅんい：${rc.ranks.map((r) => `${r}い`).join(' → ') || '—'}<br>もんだい ${rc.examCorrect} / ${rc.examTotal} せいかい</div></div>
      ${statsHtml(run)}
      <div class="row" style="margin-top:10px">${SUBJECTS.map((s) => `<span class="tag">${SUBJ[s].icon} せいとうりつ ${rc.rate[s] == null ? '—' : rc.rate[s] + '%'}</span>`).join('')}</div>
      ${titles.length ? `<div class="row" style="margin-top:10px">${titles.map((id) => `<span class="chip">🏅 ${T(R.TITLES[id].name)}</span>`).join('')}<span class="sub">あたらしい しょうごう！</span></div>` : ''}
    </div>
    <div class="panel"><b class="num" style="font-size:30px;color:#e09a00">${carry}</b> ひきつぎ ポイントを もらった！ つぎの「はじめから」で きょうかに わけられる。カードは ずかんに のこり、1まい もちこめる</div>
    <button class="btn green big" data-ok>${T('タイトルへ')}</button></div>`));
  sfx('win');
  $('[data-ok]', node).addEventListener('click', () => { sfx('tap'); run = null; showTitle(); });
}
function showAlbum() {
  const items = (meta.album || []).map((a) => { const h = heroById(a.hero); return `<div class="item"><span class="emo">${h?.emoji}</span><span>${T(h?.name || '')}</span><span class="tag">${a.grade}ねん</span><span class="tag">${a.ended === 'clear' ? '🎓 クリア' : '😢 とちゅう'}</span><span>${SUBJECTS.map((s) => `${SUBJ[s].icon}${a.stats[s]}(${rankOf(a.stats[s])})`).join(' ')}</span><span style="margin-left:auto;color:#5a4f73;font-size:14px">${new Date(a.at).toLocaleDateString('ja-JP')}</span></div>`; }).join('');
  const ts = Object.keys(meta.titles || {}).map((id) => `<span class="chip">${R.TITLES[id]?.icon} ${T(R.TITLES[id]?.name || id)}</span>`).join('');
  const node = mount(screen(`<div class="center"><div class="mg-big">📒 ${T('アルバム')}</div><div class="row">${ts || '<span class="sub-text">しょうごうは まだ ないよ</span>'}</div><div class="list">${items || '<div class="sub-text">せいせきひょうは まだ ないよ</div>'}</div><button class="btn gray" data-back>← ${T('もどる')}</button></div>`));
  $('[data-back]', node).addEventListener('click', () => { sfx('tap'); showTitle(); });
}
function showZukan() {
  const node = mount(screen(`<div class="center"><div class="mg-big">🃏 ${T('カードずかん')}</div><div class="sub-text">てにいれた カード ${Object.keys(meta.cards).length} / ${Object.keys(CARDS).length}</div><div class="row" style="max-height:560px;overflow:auto;padding:10px">${Object.keys(CARDS).map((id) => cardHtml(id, { small: true, owned: !!meta.cards[id] })).join('')}</div><button class="btn gray" data-back>← ${T('もどる')}</button></div>`));
  $('[data-back]', node).addEventListener('click', () => { sfx('tap'); showTitle(); });
  wireCards(node);
}

window.MANABI = { get run() { return run; }, meta, settings, showHome, showTitle };
showTitle();
