// かずまほ：はじまり
import { setTextMode, T } from './text.js';
import { el, $, $$, newSeed } from './util.js';
import { unlockAudio, sfx, playBgm, stopBgm, setVolumes } from './audio.js';
import { settings, saveSettings, meta, saveMeta, loadRun, saveRun, clearRun, resetAll } from './save.js';
import * as R from './engine/run.js';
import { CARDS, CATS, COMBOS } from './data/cards.js';
import { ENEMIES } from './data/enemies.js';
import { RELICS } from './data/relics.js';
import { initFx, toast, confetti, wait } from './ui/fx.js';
import { initModal, openModal, confirmBox, deckView, relicDetail, alertBox, owl } from './ui/modal.js';
import { bgHtml, floatingSymbols, HEROES } from './ui/common.js';
import { cardHtml } from './ui/cardview.js';
import { enemyArt, shapeSvg } from './ui/art.js';
import { battleScreen } from './ui/battle.js';
import { mapScreen, rewardScreen, treasureScreen, restScreen, shopScreen, eventScreen } from './ui/screens.js';

const VERSION = '1.0.0';
const stage = $('#stage');
initFx(stage); initModal(stage);
setTextMode(settings.text || 'hira');
setVolumes(settings.bgm, settings.sfx);

// ───── がめんの おおきさ（iPad よこむき きじゅん） ─────
const DW = 1180, MIN_H = 700, MAX_H = 900;
function fit() {
  const vw = window.innerWidth, vh = window.innerHeight;
  let s = vw / DW, w = DW, h = vh / s;
  if (h < MIN_H) { s = vh / MIN_H; h = MIN_H; w = Math.min(vw / s, 1500); }
  else if (h > MAX_H) { h = MAX_H; }
  stage.style.width = w + 'px'; stage.style.height = h + 'px';
  stage.classList.toggle('short', h < 790);
  stage.style.transform = `scale(${s})`;
  stage.style.left = Math.max(0, (vw - w * s) / 2) + 'px';
  stage.style.top = Math.max(0, (vh - h * s) / 2) + 'px';
}
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', () => setTimeout(fit, 200));
fit();
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
document.addEventListener('contextmenu', (e) => e.preventDefault());
let audioReady = false;
document.addEventListener('pointerdown', () => { if (!audioReady) { unlockAudio(); audioReady = true; if (pendingBgm) playBgm(pendingBgm); } }, { capture: true });
let pendingBgm = null;
function bgm(name) { pendingBgm = name; if (audioReady) playBgm(name); }
$('[data-portrait]')?.addEventListener('click', () => { document.body.classList.add('allow-portrait'); });

// ───── アプリ ─────
const app = {
  stage, run: null,
  mount(node) {
    $$('.screen', stage).forEach((s) => s.remove());
    $$('.modal-back, .owl-tip, .owl-dim, .toast, .card-ghost, .flash-screen', stage).forEach((s) => s.remove());
    $$('.fx-layer', stage).forEach((s) => { s.innerHTML = ''; });
    stage.prepend(node);
  },
  rng() {
    const run = app.run;
    const r = R.runRng(run);
    return { rng: r.rng, save: () => { r.save(); persist(); } };
  },
  wireTopbar(root, { refresh } = {}) {
    const run = app.run;
    const strip = $('.relic-strip', root);
    if (strip) {
      strip.innerHTML = run.relics.map((id) => `<div class="relic" data-relic="${id}">${RELICS[id].icon}</div>`).join('');
      $$('[data-relic]', strip).forEach((n) => n.addEventListener('click', () => { sfx('tap'); relicDetail(n.dataset.relic); }));
    }
    const d = $('[data-deck]', root);
    if (d && !d._w) { d._w = 1; d.addEventListener('click', () => { sfx('tap'); deckView(run.deck, { title: 'わたしの デッキ' }); }); }
    const s = $('[data-settings]', root);
    if (s && !s._w) { s._w = 1; s.addEventListener('click', () => { sfx('tap'); openSettings({ inRun: true, refresh }); }); }
  },
};
window.KZ = app;
function persist() { if (app.run) saveRun(app.run); }

// ───── せってい ─────
function seg(name, options, cur) {
  return `<div class="seg" data-seg="${name}">${options.map(([v, l]) => `<button data-v="${v}" class="${String(v) === String(cur) ? 'on' : ''}">${T(l)}</button>`).join('')}</div>`;
}
function openSettings({ inRun = false, refresh } = {}) {
  const vol = (v) => (v <= 0 ? 0 : v < 0.4 ? 0.3 : v < 0.7 ? 0.6 : 1);
  const { m, close } = openModal(`<h2>⚙️ ${T('せってい')}</h2>
    <div style="width:720px;display:flex;flex-direction:column;gap:6px">
      <div class="set-row"><span class="s-name">${T('もじ')}</span>${seg('text', [['hira', 'ひらがな'], ['ruby', '漢字（ふりがな）'], ['kanji', '漢字']], settings.text || 'hira')}</div>
      <div class="set-row"><span class="s-name">🎵 ${T('おんがく')}</span>${seg('bgm', [[0, 'なし'], [0.3, 'しょう'], [0.6, 'ちゅう'], [1, 'だい']], vol(settings.bgm))}</div>
      <div class="set-row"><span class="s-name">🔊 ${T('こうかおん')}</span>${seg('sfx', [[0, 'なし'], [0.3, 'しょう'], [0.6, 'ちゅう'], [1, 'だい']], vol(settings.sfx))}</div>
      <div class="set-row"><span class="s-name">🔮 ${T('よそう チャレンジ')}</span>${seg('predict', [['true', 'する'], ['false', 'しない']], String(settings.predict))}</div>
      <div class="sub" style="text-align:left;font-size:15px;margin-top:-4px">${T('「する」：とちゅうの {数|かず}は かくれる。こたえを よそうして あたると ダメージ 1.5{倍|ばい}。<br>「しない」：とちゅうの {数|かず}が いつも みえる。')}</div>
      <div class="set-row"><span class="s-name">⏩ ${T('はやさ')}</span>${seg('speed', [['normal', 'ふつう'], ['fast', 'はやい']], settings.speed)}</div>
    </div>
    <div class="row">${inRun ? `<button class="btn gray small" data-quit>${T('タイトルに もどる')}</button>` : `<button class="btn gray small" data-reset>${T('データを ぜんぶ けす')}</button>`}
    <button class="btn green" data-ok>OK</button></div>`, { onClose: () => refresh && refresh() });
  $$('[data-seg]', m).forEach((g) => $$('button', g).forEach((b) => b.addEventListener('click', () => {
    sfx('tap');
    $$('button', g).forEach((x) => x.classList.remove('on')); b.classList.add('on');
    const k = g.dataset.seg, v = b.dataset.v;
    if (k === 'text') { settings.text = v; setTextMode(v); }
    if (k === 'bgm') { settings.bgm = Number(v); setVolumes(settings.bgm, settings.sfx); }
    if (k === 'sfx') { settings.sfx = Number(v); setVolumes(settings.bgm, settings.sfx); sfx('coin'); }
    if (k === 'predict') settings.predict = v === 'true';
    if (k === 'speed') settings.speed = v;
    saveSettings();
  })));
  $('[data-ok]', m).addEventListener('click', () => { sfx('tap'); close(); });
  const q = $('[data-quit]', m);
  if (q) q.addEventListener('click', async () => { close(); if (await confirmBox('タイトルに もどる？', 'ぼうけんは セーブ されるよ。「つづきから」で また あそべる。', 'もどる', 'やめる')) { persist(); titleScreen(); } });
  const r = $('[data-reset]', m);
  if (r) r.addEventListener('click', async () => { close(); if (await confirmBox('ほんとうに けす？', 'セーブ・ずかん・きろくが ぜんぶ きえるよ。', 'けす', 'やめる')) { resetAll(); location.reload(); } });
}

// ───── タイトル ─────
function titleScreen() {
  app.run = null;
  bgm('title');
  const saved = loadRun();
  const root = el(`<div class="screen fade-in">
    <div class="bg bg-title">${floatingSymbols()}</div>
    ${bgHtml('title').replace('bg bg-title', 'bg')}
    <div class="title-wrap">
      <div class="logo"><div class="main"><span>か</span><span>ず</span><span>ま</span><span>ほ</span></div>
      <div class="subt">${T('〜 カードで のぼる まほうの とう 〜')}</div></div>
      <div class="title-menu">
        <button class="btn big" data-new>✨ ${T('はじめから')}</button>
        ${saved ? `<button class="btn big blue" data-cont>📖 ${T('つづきから')}</button>` : ''}
      </div>
      <div class="title-menu" style="margin-top:6px">
        <button class="btn white" data-zukan>📚 ${T('ずかん')}</button>
        <button class="btn white" data-howto>❓ ${T('あそびかた')}</button>
        <button class="btn white" data-settings>⚙️ ${T('せってい')}</button>
      </div>
    </div>
    <div class="title-chars">🧙‍♀️</div><div class="title-owl">🦉</div>
    <div class="version">v${VERSION}</div>
  </div>`);
  app.mount(root);
  $('[data-new]', root).addEventListener('click', async () => {
    sfx('tap');
    if (saved && !(await confirmBox('あたらしく はじめる？', 'いまの ぼうけんの セーブは きえちゃうよ。', 'はじめる', 'やめる'))) return;
    setupScreen();
  });
  $('[data-cont]', root)?.addEventListener('click', () => { sfx('tap'); app.run = saved; runLoop(); });
  $('[data-zukan]', root).addEventListener('click', () => { sfx('tap'); zukanScreen(); });
  $('[data-howto]', root).addEventListener('click', () => { sfx('tap'); howTo(); });
  $('[data-settings]', root).addEventListener('click', () => { sfx('tap'); openSettings({ refresh: titleScreen }); });
  if (!settings.text) firstLaunch();
}

function firstLaunch() {
  const { m, close } = openModal(`<h2>👋 ${'ようこそ！'}</h2><div class="sub">もじの ひょうじを えらんでね<br><span style="font-size:15px">（あとで「せってい」で かえられるよ）</span></div>
    <div class="row">
      <button class="btn big" data-v="hira">ひらがな</button>
      <button class="btn big blue" data-v="ruby"><ruby>漢字<rt>かんじ</rt></ruby></button>
    </div>`, { closable: false });
  $$('[data-v]', m).forEach((b) => b.addEventListener('click', () => {
    sfx('tap'); settings.text = b.dataset.v; setTextMode(b.dataset.v); saveSettings(); close(); titleScreen();
  }));
}

function howTo() {
  const pages = [
    ['🃏', 'カードを ならべよう', 'カードを タップして「じゅもんの わく」に ならべよう。<br>{数|かず}は <b>0</b>から はじまって、<b>ひだりから じゅんばんに</b> {計算|けいさん}されるよ。'],
    ['⚔️', 'できた {数|かず}で {攻撃|こうげき}', '「+3 → ×2」なら 0+3=3、3×2=<b>6</b>。<br>「×2 → +3」なら 0×2=0、0+3=<b>3</b>。<br><b>じゅんばんで こたえが かわる！</b>'],
    ['🔮', 'よそうで ひらめき', '「じっこう」の まえに こたえを よそう しよう。<br>あたると ダメージが <b>1.5{倍|ばい}</b>！'],
    ['🎯', 'ぴったり と じゃくてん', '🎯の {数|かず}と ぴったり おなじ {数|かず}で {攻撃|こうげき}すると <b>2{倍|ばい}</b>。<br>💥「3のだん」なら 3, 6, 9 … で <b>2{倍|ばい}</b>！'],
    ['🔺', 'ちしきが ちからに なる', 'さんかくの かどは いくつ？ くもの {足|あし}は なんぼん？<br>しっていると カードの つよさが わかるよ。<br>さんかく＋さんかく＝しかく！ かたちは「がったい」する！'],
    ['🛡️', '{守|まも}りも だいじ', '{敵|てき}の ふきだしを みて、{攻撃|こうげき}が くる ときは 🛡️{守|まも}りの カードを つかおう。'],
    ['🗺️', 'とうを のぼろう', 'マップで みちを えらんで すすもう。<br>かつと カードが ふえて、デッキが つよく なる。3かいの ボスを たおせば クリア！'],
  ];
  let i = 0;
  const { m, close } = openModal('<div data-page style="width:720px;display:flex;flex-direction:column;align-items:center;gap:14px"></div><div class="row"><button class="btn gray" data-prev>◀</button><span data-no class="num" style="font-size:22px"></span><button class="btn green" data-nextp>▶</button></div>');
  const render = () => {
    const [ic, t, b] = pages[i];
    $('[data-page]', m).innerHTML = `<div style="font-size:90px">${ic}</div><h2>${T(t)}</h2><div class="sub" style="font-size:23px;color:var(--ink)">${T(b)}</div>`;
    $('[data-no]', m).textContent = `${i + 1} / ${pages.length}`;
    $('[data-prev]', m).disabled = i === 0;
    $('[data-nextp]', m).textContent = i === pages.length - 1 ? 'OK' : '▶';
  };
  $('[data-prev]', m).addEventListener('click', () => { if (i > 0) { i--; sfx('page'); render(); } });
  $('[data-nextp]', m).addEventListener('click', () => { if (i < pages.length - 1) { i++; sfx('page'); render(); } else { sfx('tap'); close(); } });
  render();
}

// ───── はじめる まえ ─────
function setupScreen() {
  let grade = meta.lastGrade || null, hero = meta.lastHero ?? 0, diff = meta.lastDiff || 'normal';
  const root = el(`<div class="screen fade-in"><div class="bg bg-title">${floatingSymbols()}</div>
    <div class="setup" data-step1>
      <h1>${T('なんねんせい かな？')}</h1>
      <div class="pick-row">
        <div class="pick" data-g="1"><div class="p-icon">🌱</div><div class="p-title">${T('1ねんせい')}</div><div class="p-desc">${T('{足|た}し{算|ざん}・{引|ひ}き{算|ざん}<br>かたち・10の まとまり')}</div></div>
        <div class="pick" data-g="2"><div class="p-icon">🌿</div><div class="p-title">${T('2ねんせい')}</div><div class="p-desc">${T('かけ{算|ざん}（{九九|くく}）も<br>{時計|とけい}・はこの かたち')}</div></div>
        <div class="pick" data-g="3"><div class="p-icon">🌳</div><div class="p-title">${T('3ねんせい')}</div><div class="p-desc">${T('わり{算|ざん}・あまり も<br>{円|えん}・おおきな {数|かず}')}</div></div>
      </div>
      <div class="sub" style="color:#fff;font-size:17px">${T('むずかしければ、1つ したの がくねんでも OK！')}</div>
      <div class="row"><button class="btn gray" data-back>◀ ${T('もどる')}</button></div>
    </div>
    <div class="setup" data-step2 style="display:none">
      <h1>${T('しゅじんこうを えらぼう')}</h1>
      <div class="pick-row">${HEROES.map((h, i) => `<div class="pick smallp" data-h="${i}"><div class="p-icon">${h}</div></div>`).join('')}</div>
      <div class="pick-row">
        <div class="pick" data-d="easy" style="width:300px;padding:14px"><div class="p-title" style="font-size:24px">🐣 ${T('かんたん')}</div><div class="p-desc">${T('{敵|てき}が よわめ。はじめての ひとに')}</div></div>
        <div class="pick" data-d="normal" style="width:300px;padding:14px"><div class="p-title" style="font-size:24px">🦁 ${T('ふつう')}</div><div class="p-desc">${T('ちょうせん しがいの ある つよさ')}</div></div>
      </div>
      <div class="row"><button class="btn gray" data-back2>◀ ${T('もどる')}</button><button class="btn big green" data-go>🚀 ${T('ぼうけんへ！')}</button></div>
    </div></div>`);
  app.mount(root);
  const s1 = $('[data-step1]', root), s2 = $('[data-step2]', root);
  const mark = () => {
    $$('[data-h]', root).forEach((n) => n.classList.toggle('on', Number(n.dataset.h) === hero));
    $$('[data-d]', root).forEach((n) => n.classList.toggle('on', n.dataset.d === diff));
  };
  $$('[data-g]', root).forEach((n) => n.addEventListener('click', () => { sfx('select'); grade = Number(n.dataset.g); s1.style.display = 'none'; s2.style.display = ''; mark(); }));
  $$('[data-h]', root).forEach((n) => n.addEventListener('click', () => { sfx('tap'); hero = Number(n.dataset.h); mark(); }));
  $$('[data-d]', root).forEach((n) => n.addEventListener('click', () => { sfx('tap'); diff = n.dataset.d; mark(); }));
  $('[data-back]', root).addEventListener('click', () => { sfx('tap'); titleScreen(); });
  $('[data-back2]', root).addEventListener('click', () => { sfx('tap'); s2.style.display = 'none'; s1.style.display = ''; });
  $('[data-go]', root).addEventListener('click', async () => {
    sfx('upgrade');
    meta.lastGrade = grade; meta.lastHero = hero; meta.lastDiff = diff; meta.records.runs++; saveMeta();
    app.run = R.newRun({ grade, hero, seed: newSeed(), diff });
    persist();
    await story();
    runLoop();
  });
}

async function story() {
  const lines = [
    ['🏰', 'ここは すうじの せかい。まほうの とうの てっぺんには、すうじの ひかりが かがやいて いました。'],
    ['🌑', 'ところが ある ひ、「ゼロの まおう」が あらわれて、ひかりを うばって しまったのです。'],
    ['🦉', '「みならい まほうつかいの きみ！ カードの じゅもんで {数|かず}を あやつり、とうを のぼって まおうを たおすのじゃ！」'],
  ];
  const root = el(`<div class="screen fade-in"><div class="bg bg-title">${floatingSymbols()}</div><div class="panel-screen"><div class="event-box"><div class="ev-art"></div><div class="ev-text" style="font-size:26px"></div><button class="btn green" data-n>${T('つぎへ ▶')}</button></div></div></div>`);
  app.mount(root);
  for (const [ic, t] of lines) {
    $('.ev-art', root).textContent = ic; $('.ev-text', root).innerHTML = T(t); sfx('page');
    await new Promise((r) => $('[data-n]', root).addEventListener('click', () => { sfx('tap'); r(); }, { once: true }));
  }
}

// ───── ぼうけんの ながれ ─────
async function runLoop() {
  const run = app.run;
  while (true) {
    let nodeId = run.pending;
    if (!nodeId) {
      nodeId = await mapScreen(app);
      run.pos = nodeId;
      if (!run.map.visited.includes(nodeId)) run.map.visited.push(nodeId);
      run.pending = nodeId;
      persist();
    }
    const node = run.map.nodes[nodeId];
    let res = 'ok';
    if (['battle', 'elite', 'boss'].includes(node.type)) {
      if (!node.enc) { const { rng, save } = app.rng(); node.enc = R.pickEncounter(run, node.type, rng); save(); }
      res = await battleScreen(app, node.enc, node.type);
      if (res === 'lose') {
        clearRun();
        await endScreen(false);
        return;
      }
      await rewardScreen(app, node.type);
    } else if (node.type === 'rest') await restScreen(app);
    else if (node.type === 'shop') await shopScreen(app);
    else if (node.type === 'treasure') await treasureScreen(app);
    else if (node.type === 'event') await eventScreen(app);
    run.pending = null;
    persist();
    meta.records.bestFloor = Math.max(meta.records.bestFloor, run.floor); saveMeta();
    if (node.type === 'boss') {
      if (run.floor >= 3) { clearRun(); await endScreen(true); return; }
      await floorUp();
    }
  }
}

async function floorUp() {
  const run = app.run;
  run.floor++;
  run.slots++;
  const healed = R.heal(run, Math.round((run.maxHp - run.hp) * 0.6));
  const { rng, save } = app.rng();
  run.map = R.genMap(rng, run.floor);
  run.pos = null;
  save();
  const f = R.FLOORS[run.floor];
  const root = el(`<div class="screen fade-in">${bgHtml(f.theme)}<div class="panel-screen">
    <div class="event-box"><div class="ev-art">${f.icon}</div><div class="ev-title">${run.floor}${T('かい')}　${T(f.name)}</div>
    <div class="ev-text">${T(`じゅもんの わくが 1つ ふえて ${run.floor + 2}つに なった！\nHPが ${healed} かいふく した。`)}</div>
    <div class="row" style="gap:8px">${Array.from({ length: run.slots }, (_, i) => `<div class="slot" style="border-color:#8a5cff;color:#8a5cff;width:70px;height:96px;${i === run.slots - 1 ? 'background:#fff3a8;animation:pulse 1s infinite' : ''}"><span class="slot-no">${i + 1}</span></div>`).join('')}</div>
    <button class="btn green big" data-n>${T('すすむ ▶')}</button></div></div></div>`);
  app.mount(root);
  sfx('upgrade');
  await new Promise((r) => $('[data-n]', root).addEventListener('click', () => { sfx('tap'); r(); }, { once: true }));
}

function recordStats(run) {
  const rc = meta.records;
  for (const k of ['predOk', 'predTry', 'calcs', 'pittari', 'quizOk', 'quizTry']) rc[k] = (rc[k] || 0) + (run.stats[k] || 0);
  rc.maxHit = Math.max(rc.maxHit || 0, run.stats.maxHit || 0);
  saveMeta();
}

async function endScreen(win) {
  const run = app.run;
  recordStats(run);
  if (win) { meta.records.wins++; saveMeta(); }
  stopBgm();
  if (win) bgm('victory');
  const s = run.stats;
  const stars = win ? 3 : run.floor >= 3 ? 2 : run.floor >= 2 ? 1 : 0;
  const statHtml = [
    ['🔮', 'よそう せいかい', `${s.predOk || 0} / ${s.predTry || 0}`],
    ['🧮', 'けいさんした かず', s.calcs || 0],
    ['🎯', 'ぴったり', s.pittari || 0],
    ['⚔️', 'たおした たたかい', s.battles || 0],
    ['📝', 'クイズ せいかい', `${s.quizOk || 0} / ${s.quizTry || 0}`],
    ['💥', 'さいだい ダメージ', s.maxHit || 0],
  ].map(([i, l, v]) => `<div class="stat"><div class="s-val">${v}</div><div class="s-lbl">${i} ${T(l)}</div></div>`).join('');
  const root = el(`<div class="screen fade-in"><div class="bg ${win ? 'bg-title' : 'bg-castle'}">${floatingSymbols()}</div>
    <div class="panel-screen">
      <h1 style="font-size:60px">${win ? '🏆 ' + T('クリア！ おめでとう！') : T('まけちゃった…')}</h1>
      <div class="lead">${win ? T('ゼロの まおうを たおして、すうじの ひかりが もどった！ きみは りっぱな まほうつかいだ！') : T(`${run.floor}かいまで のぼったよ。カードの ならべかたを くふうして、また ちょうせん しよう！`)}</div>
      <div style="font-size:60px;letter-spacing:10px">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
      <div class="stat-grid" style="max-width:820px">${statHtml}</div>
      <button class="btn big" data-t>${T('タイトルへ')}</button>
    </div></div>`);
  app.mount(root);
  if (win) { confetti(); setTimeout(confetti, 1500); }
  else sfx('lose');
  app.run = null;
  await new Promise((r) => $('[data-t]', root).addEventListener('click', () => { sfx('tap'); r(); }, { once: true }));
  titleScreen();
}

// ───── ずかん ─────
function zukanScreen(tab = 'cards') {
  bgm('map');
  const root = el(`<div class="screen fade-in"><div class="bg bg-event"></div>
    <div class="panel-screen" style="justify-content:flex-start;padding-top:20px;gap:12px">
      <div class="row" style="width:100%;justify-content:space-between;padding:0 20px">
        <button class="btn gray small" data-back>◀ ${T('もどる')}</button>
        <h1 style="font-size:38px">📚 ${T('ずかん')}</h1>
        <div style="width:120px"></div>
      </div>
      <div class="zukan-tabs">
        <button class="btn small ${tab === 'cards' ? 'on' : 'white'}" data-tab="cards">🎴 ${T('カード')}</button>
        <button class="btn small ${tab === 'enemies' ? 'on' : 'white'}" data-tab="enemies">👾 ${T('モンスター')}</button>
        <button class="btn small ${tab === 'facts' ? 'on' : 'white'}" data-tab="facts">📖 ${T('ちしき')}</button>
        <button class="btn small ${tab === 'records' ? 'on' : 'white'}" data-tab="records">🏅 ${T('きろく')}</button>
      </div>
      <div class="scroll" data-body style="flex:1;width:100%;max-width:1100px;padding:0 10px 20px"></div>
    </div></div>`);
  app.mount(root);
  $('[data-back]', root).addEventListener('click', () => { sfx('tap'); titleScreen(); });
  $$('[data-tab]', root).forEach((b) => b.addEventListener('click', () => { sfx('tap'); zukanScreen(b.dataset.tab); }));
  const body = $('[data-body]', root);
  if (tab === 'cards') {
    const list = Object.values(CARDS).filter((c) => c.rar !== 'x');
    const n = list.filter((c) => meta.cards[c.id]).length;
    body.innerHTML = `<div class="sub" style="color:#fff;font-size:20px">${T(`みつけた カード ${n} / ${list.length}`)}</div><div class="card-grid">${list.map((c) => meta.cards[c.id] ? cardHtml({ id: c.id, up: false, uid: 'z' + c.id }) : cardHtml({ id: c.id, up: false }, { cls: 'unknown' })).join('')}</div>`;
    $$('.card', body).forEach((c) => c.addEventListener('click', () => {
      if (c.classList.contains('unknown')) { sfx('wrong'); return; }
      sfx('tap'); import('./ui/modal.js').then((M) => M.cardDetail({ id: c.dataset.id, up: false }));
    }));
  } else if (tab === 'enemies') {
    const list = Object.values(ENEMIES);
    body.innerHTML = `<div class="sub" style="color:#fff;font-size:20px">${T(`あった モンスター ${list.filter((e) => meta.enemies[e.id]).length} / ${list.length}`)}</div>
      <div class="card-grid">${list.map((e) => `<div class="zk-enemy ${meta.enemies[e.id] ? '' : 'unknown'}" data-e="${e.id}"><div class="ze-art">${enemyArt(e.art)}</div><div class="ze-name">${meta.enemies[e.id] ? T(e.name) : '？？？'}</div></div>`).join('')}</div>`;
    $$('[data-e]', body).forEach((n) => n.addEventListener('click', () => {
      const e = ENEMIES[n.dataset.e];
      if (!meta.enemies[e.id]) { sfx('wrong'); return; }
      sfx('tap');
      openModal(`<div style="font-size:120px;height:160px;display:flex;align-items:center">${enemyArt(e.art).replace('<svg', '<svg style="width:170px;height:150px"')}</div><h2>${T(e.name)}</h2><div class="sub" style="font-size:21px;max-width:560px">${T(e.desc)}</div>`);
    }));
  } else if (tab === 'facts') {
    const facts = [
      ...Object.values(CARDS).filter((c) => c.fact).map((c) => ({ key: 'card:' + c.id, icon: c.face.startsWith('shape:') ? shapeSvg(c.face.slice(6)) : c.face === 'dice' ? '🎲' : c.face, text: c.fact, name: c.name })),
      ...COMBOS.map((c) => ({ key: 'combo:' + [c.a, c.b].sort().join('+'), icon: c.icon.startsWith('shape:') ? shapeSvg(c.icon.slice(6)) : c.icon, text: c.fact, name: 'がったい：' + c.name })),
    ];
    facts.sort((a, b) => (meta.facts[b.key] ? 1 : 0) - (meta.facts[a.key] ? 1 : 0));
    const n = facts.filter((f) => meta.facts[f.key]).length;
    body.innerHTML = `<div class="sub" style="color:#fff;font-size:20px">${T(`あつめた ちしき ${n} / ${facts.length}`)}</div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">${facts.map((f) => meta.facts[f.key]
        ? `<div class="fact-row"><div class="f-icon">${f.icon}</div><div class="f-text"><b>${T(f.name)}</b><br>${T(f.text)}</div></div>`
        : `<div class="fact-row unknown"><div class="f-icon">❔</div><div class="f-text">${T('まだ しらない ちしき。カードを つかって みよう！')}</div></div>`).join('')}</div>`;
  } else {
    const r = meta.records;
    const rate = r.predTry ? Math.round(r.predOk / r.predTry * 100) : 0;
    body.innerHTML = `<div class="stat-grid" style="margin-top:10px">${[
      ['🚀', 'ぼうけんした かいすう', r.runs], ['🏆', 'クリアした かいすう', r.wins], ['🏰', 'いちばん たかい かい', r.bestFloor ? r.bestFloor + 'かい' : '-'],
      ['🔮', 'よそう せいかい', r.predOk], ['📈', 'よそうの せいかいりつ', rate + '%'], ['🧮', 'けいさんした かず', r.calcs],
      ['🎯', 'ぴったり', r.pittari], ['📝', 'クイズ せいかい', `${r.quizOk} / ${r.quizTry}`], ['💥', 'さいだい ダメージ', r.maxHit],
    ].map(([i, l, v]) => `<div class="stat"><div class="s-val">${v}</div><div class="s-lbl">${i} ${T(l)}</div></div>`).join('')}</div>`;
  }
}

// エラーが おきても とまらない ように
window.addEventListener('error', (e) => { console.error(e.error || e.message); });
window.addEventListener('unhandledrejection', (e) => { console.error(e.reason); });

titleScreen();
let topLevel = false;
try { topLevel = window.top === window; } catch (e) { topLevel = false; }
if ('serviceWorker' in navigator && location.protocol === 'https:' && topLevel) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
