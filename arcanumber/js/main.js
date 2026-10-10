// アルカナンバー：はじまり
import { setTextMode, T } from './text.js';
import { el, $, $$, newSeed } from './util.js';
import { unlockAudio, sfx, playBgm, stopBgm, setVolumes } from './audio.js';
import { settings, saveSettings, meta, saveMeta, loadRun, saveRun, clearRun, resetAll, mark } from './save.js';
import * as R from './engine/run.js';
import { CARDS, ELEMENTS } from './data/cards.js';
import { ARCANA } from './data/arcana.js';
import { HANDS, HAND_ORDER } from './data/hands.js';
import { ENEMIES } from './data/enemies.js';
import { HEROES } from './data/heroes.js';
import { initFx, confetti } from './ui/fx.js';
import { initModal, openModal, confirmBox, deckView, handsTable, arcanaDetail, cardDetail } from './ui/modal.js';
import { bgHtml, updateTopbar } from './ui/common.js';
import { cardHtml } from './ui/cardview.js';
import { enemyArt } from './ui/art.js';
import { swirl } from './ui/bg.js';
import { battleScreen } from './ui/battle.js';
import { mapScreen, rewardScreen, treasureScreen, restScreen, shopScreen, eventScreen, useScrollOutside } from './ui/screens.js';

const VERSION = '1.0.0';
const stage = $('#stage');
initFx(stage); initModal(stage);
setTextMode(settings.text || 'hira');
setVolumes(settings.bgm, settings.sfx);

// ───── がめんの おおきさ ─────
const DW = 1180, MIN_H = 700, MAX_H = 900;
function fit() {
  const vw = window.innerWidth, vh = window.innerHeight;
  let s = vw / DW, w = DW, h = vh / s;
  if (h < MIN_H) { s = vh / MIN_H; h = MIN_H; w = Math.min(vw / s, 1500); } else if (h > MAX_H) h = MAX_H;
  stage.style.width = w + 'px'; stage.style.height = h + 'px'; stage.style.transform = `scale(${s})`;
  stage.style.left = Math.max(0, (vw - w * s) / 2) + 'px'; stage.style.top = Math.max(0, (vh - h * s) / 2) + 'px';
  stage.classList.toggle('short', h < 790);
}
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', () => setTimeout(fit, 200));
fit();
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('contextmenu', (e) => e.preventDefault());
let audioReady = false, pendingBgm = null;
document.addEventListener('pointerdown', () => { if (!audioReady) { unlockAudio(); audioReady = true; if (pendingBgm) playBgm(pendingBgm); } }, { capture: true });
function bgm(name) { pendingBgm = name; if (audioReady) playBgm(name); }
$('[data-portrait]')?.addEventListener('click', () => document.body.classList.add('allow-portrait'));

const app = {
  stage, run: null,
  mount(node) {
    $$('.screen', stage).forEach((s) => s.remove());
    $$('.modal-back, .guide-tip, .guide-dim, .toast, .card-ghost, .flash-screen', stage).forEach((s) => s.remove());
    $$('.fx-layer', stage).forEach((s) => { s.innerHTML = ''; });
    stage.prepend(node);
  },
  rng() { const r = R.runRng(app.run); return { rng: r.rng, save: () => { r.save(); persist(); } }; },
  wireTopbar(root, { refresh, onScroll } = {}) {
    const run = app.run;
    updateTopbar(root, run);
    $$('[data-si]', root).forEach((n) => n.addEventListener('click', async () => {
      sfx('tap');
      const i = Number(n.dataset.si);
      if (!run.scrolls[i]) return;
      if (onScroll) await onScroll(i); else await useScrollOutside(app, i, root);
      persist(); updateTopbar(root, run); app.wireTopbar(root, { refresh, onScroll });
    }));
    const d = $('[data-deck]', root); if (d && !d._w) { d._w = 1; d.addEventListener('click', () => { sfx('tap'); deckView(run.deck, { title: 'デッキ' }); }); }
    const h = $('[data-hands]', root); if (h && !h._w) { h._w = 1; h.addEventListener('click', () => { sfx('tap'); handsTable(run.handLv); }); }
    const s = $('[data-settings]', root); if (s && !s._w) { s._w = 1; s.addEventListener('click', () => { sfx('tap'); openSettings({ inRun: true, refresh }); }); }
  },
};
window.AN = app;
function persist() { if (app.run) saveRun(app.run); }

// ───── せってい ─────
function seg(name, options, cur) { return `<div class="seg" data-seg="${name}">${options.map(([v, l]) => `<button data-v="${v}" class="${String(v) === String(cur) ? 'on' : ''}">${T(l)}</button>`).join('')}</div>`; }
function openSettings({ inRun = false, refresh } = {}) {
  const vol = (v) => (v <= 0 ? 0 : v < 0.4 ? 0.3 : v < 0.7 ? 0.6 : 1);
  const { m, close } = openModal(`<h2>${T('せってい')}</h2><div style="width:720px;display:flex;flex-direction:column;gap:4px">
    <div class="set-row"><span class="s-name">${T('もじ')}</span>${seg('text', [['hira', 'ひらがな'], ['ruby', '漢字（ふりがな）'], ['kanji', '漢字']], settings.text || 'hira')}</div>
    <div class="set-row"><span class="s-name">🎵 ${T('おんがく')}</span>${seg('bgm', [[0, 'なし'], [0.3, 'しょう'], [0.6, 'ちゅう'], [1, 'だい']], vol(settings.bgm))}</div>
    <div class="set-row"><span class="s-name">🔊 ${T('こうかおん')}</span>${seg('sfx', [[0, 'なし'], [0.3, 'しょう'], [0.6, 'ちゅう'], [1, 'だい']], vol(settings.sfx))}</div>
    <div class="set-row"><span class="s-name">🔮 ${T('けいさん チャレンジ')}</span>${seg('challenge', [['true', 'する'], ['false', 'しない']], String(settings.challenge))}</div>
    <div class="sub" style="text-align:left;font-size:14px">${T('「する」：はなつ まえは ダメージが かくれる。{力|ちから}×{倍率|ばいりつ}の こたえを あてると 1.5{倍|ばい}。「しない」：ダメージが いつも みえる')}</div>
    <div class="set-row"><span class="s-name">⏩ ${T('はやさ')}</span>${seg('speed', [['normal', 'ふつう'], ['fast', 'はやい']], settings.speed)}</div></div>
    <div class="row">${inRun ? `<button class="btn dark small" data-quit>${T('セーブして タイトルへ')}</button>` : `<button class="btn dark small" data-reset>${T('データを ぜんぶ けす')}</button>`}<button class="btn green" data-ok>OK</button></div>`, { onClose: () => refresh && refresh() });
  $$('[data-seg]', m).forEach((g) => $$('button', g).forEach((b) => b.addEventListener('click', () => {
    sfx('tap'); $$('button', g).forEach((x) => x.classList.remove('on')); b.classList.add('on');
    const k = g.dataset.seg, v = b.dataset.v;
    if (k === 'text') { settings.text = v; setTextMode(v); }
    if (k === 'bgm') { settings.bgm = Number(v); setVolumes(settings.bgm, settings.sfx); }
    if (k === 'sfx') { settings.sfx = Number(v); setVolumes(settings.bgm, settings.sfx); sfx('coin'); }
    if (k === 'challenge') settings.challenge = v === 'true';
    if (k === 'speed') settings.speed = v;
    saveSettings();
  })));
  $('[data-ok]', m).addEventListener('click', () => { sfx('tap'); close(); refresh && refresh(); });
  $('[data-quit]', m)?.addEventListener('click', async () => { close(); if (await confirmBox('タイトルに もどる？', 'ぼうけんは セーブ されるよ。「つづきから」で また あそべる。', 'もどる', 'やめる')) { persist(); titleScreen(); } });
  $('[data-reset]', m)?.addEventListener('click', async () => { close(); if (await confirmBox('ほんとうに けす？', 'セーブ・ずかん・きろくが ぜんぶ きえるよ。', 'けす', 'やめる')) { resetAll(); location.reload(); } });
}

// ───── タイトル ─────
function titleScreen() {
  app.run = null;
  bgm('title');
  const saved = loadRun();
  const deco = [[['fire', 7], 6, 18, -14], [['water', 3], 82, 14, 12], [['thunder', 5], 10, 60, 8], [['shadow', 9], 84, 58, -10], [['wood', 2], 18, 36, 18]];
  const root = el(`<div class="screen fade-in">${bgHtml()}
    <div class="title-cards">${deco.map(([[e, v], x, y, r]) => `<div style="position:absolute;left:${x}%;top:${y}%;transform:rotate(${r}deg) scale(1.1)">${cardHtml({ id: 'rune', el: e, v })}</div>`).join('')}</div>
    <div class="title-wrap">
      <div class="logo"><div class="en">ARCANUMBER</div><div class="jp">アルカ<b>ナンバー</b></div><div class="tag">${T('ルーンを くみあわせ、{数|かず}の まほうで たたかえ')}</div></div>
      <div class="menu"><button class="btn big" data-new>${T('はじめから')}</button>${saved ? `<button class="btn big blue" data-cont>${T('つづきから')}</button>` : ''}</div>
      <div class="menu" style="margin-top:4px"><button class="btn dark" data-zukan>📚 ${T('ずかん')}</button><button class="btn dark" data-howto>❓ ${T('あそびかた')}</button><button class="btn dark" data-settings>⚙️ ${T('せってい')}</button></div>
    </div><div class="version">v${VERSION}</div></div>`);
  app.mount(root);
  swirl($('canvas.swirl', root), 'title');
  $('[data-new]', root).addEventListener('click', async () => { sfx('tap'); if (saved && !(await confirmBox('あたらしく はじめる？', 'いまの ぼうけんの セーブは きえるよ。', 'はじめる', 'やめる'))) return; setupScreen(); });
  $('[data-cont]', root)?.addEventListener('click', () => { sfx('tap'); app.run = saved; runLoop(); });
  $('[data-zukan]', root).addEventListener('click', () => { sfx('tap'); zukanScreen(); });
  $('[data-howto]', root).addEventListener('click', () => { sfx('tap'); howTo(); });
  $('[data-settings]', root).addEventListener('click', () => { sfx('tap'); openSettings({ refresh: titleScreen }); });
  if (!settings.text) {
    const { m, close } = openModal(`<h2>ようこそ！</h2><div class="sub">もじの ひょうじを えらんでね<br><span style="font-size:14px">（あとで「せってい」で かえられるよ）</span></div><div class="row"><button class="btn big" data-v="hira">ひらがな</button><button class="btn big blue" data-v="ruby"><ruby>漢字<rt>かんじ</rt></ruby></button></div>`, { closable: false });
    $$('[data-v]', m).forEach((b) => b.addEventListener('click', () => { sfx('tap'); settings.text = b.dataset.v; setTextMode(b.dataset.v); saveSettings(); close(); titleScreen(); }));
  }
}

function howTo() {
  const pages = [
    ['🃏', 'ルーンで {役|やく}を つくる', '{手札|てふだ}の ルーンを じゅもんの わく（5{枚|まい}まで）に いれよう。<br>おなじ {数|かず}なら「ペア」、たして 10なら「じゅうの わ」、<br>2・3・6 なら「くくの わ」（2×3=6）！ {役|やく}が つよいほど {力|ちから}と {倍率|ばいりつ}が ふえる。'],
    ['💥', 'ダメージ ＝ {力|ちから} × {倍率|ばいりつ}', 'ルーンの {数|かず}は <b style="color:var(--power)">{力|ちから}</b>に たされる。<br>スペルや アルカナで <b style="color:var(--mult)">{倍率|ばいりつ}</b>が ふえる。<br>さいごに かけ{算|ざん}！ 20 × 8 ＝ 160 ダメージ！'],
    ['➡️', 'じゅんばんが だいじ', 'カードは ひだりから じゅんばんに はたらく。<br>「+2{倍率|ばいりつ}」→「×2」なら (2+2)×2＝8、<br>「×2」→「+2{倍率|ばいりつ}」なら 2×2+2＝6。<br>×は みぎに おこう！ ドラッグで ならびかえ できる。'],
    ['💠', 'マナ と いれかえ', 'スペル・インスタント・けっかいは マナを つかう（まいターン 3）。<br>ルーンは マナ なしで いれられる。<br>🔄いれかえ で いらない カードを すてて ひきなおせる。'],
    ['🔮', 'アルカナ', 'アルカナは ずっと はたらく おまもり（5つまで）。<br>ひだりから じゅんばんに こうかが でる。<br>くみあわせ しだいで ダメージが なんばいにも！'],
    ['💀', 'のろい と ボス', 'つよい てきは「のろい」を もっている。<br>（{力|ちから}が はんぶん、ペアが できない など）<br>のろいに あわせて じゅもんを くふう しよう。'],
    ['🧮', 'けいさん チャレンジ', 'はなった あと、{力|ちから} × {倍率|ばいりつ} の こたえを えらぶ。<br>あたると ダメージ 1.5{倍|ばい}！<br>🔍みとおし を つかうと さきに ダメージが みえる（ボーナスは なし）。'],
    ['🗺️', 'デッキを そだてる', 'かつと カードや アルカナが もらえる。<br>おみせで かったり、いらない カードを わすれたり。<br>じぶんだけの さいきょう デッキで 3しょうの ボスを たおそう！'],
  ];
  let i = 0;
  const { m, close } = openModal('<div data-page style="width:740px;display:flex;flex-direction:column;align-items:center;gap:12px;min-height:280px"></div><div class="row"><button class="btn dark" data-prev>◀</button><span data-no class="num" style="font-size:20px"></span><button class="btn green" data-nextp>▶</button></div>');
  const render = () => { const [ic, t, b] = pages[i]; $('[data-page]', m).innerHTML = `<div style="font-size:80px">${ic}</div><h2>${T(t)}</h2><div class="sub" style="font-size:20px;color:var(--ink)">${T(b)}</div>`; $('[data-no]', m).textContent = `${i + 1} / ${pages.length}`; $('[data-prev]', m).disabled = i === 0; $('[data-nextp]', m).textContent = i === pages.length - 1 ? 'OK' : '▶'; };
  $('[data-prev]', m).addEventListener('click', () => { if (i > 0) { i--; sfx('page'); render(); } });
  $('[data-nextp]', m).addEventListener('click', () => { if (i < pages.length - 1) { i++; sfx('page'); render(); } else { sfx('tap'); close(); } });
  render();
}

function setupScreen() {
  let hero = meta.lastHero ?? 0, grade = meta.lastGrade || 2, diff = meta.lastDiff || 'normal';
  const root = el(`<div class="screen fade-in">${bgHtml()}
    <div class="setup" data-s1><h1>${T('しゅじんこうを えらぼう')}</h1>
      <div class="pick-row">${HEROES.map((h, i) => `<div class="pick" data-h="${i}"><div class="p-icon">${h.art}</div><div class="p-title">${h.name}</div><div class="p-sub">${T(h.title)}</div><div class="p-els">${h.els.map((e) => ELEMENTS[e].icon).join(' ')}</div><div class="p-desc">${T(h.desc)}<br>❤️ ${h.hp}　🔮 ${T(ARCANA[h.arcana].name)}</div></div>`).join('')}</div>
      <div class="row"><button class="btn dark" data-back>◀ ${T('もどる')}</button><button class="btn green big" data-next>${T('つぎへ ▶')}</button></div></div>
    <div class="setup" data-s2 style="display:none"><h1>${T('なんねんせい？')}</h1>
      <div class="pick-row">${[[1, '🌱', 'たし{算|ざん}・ひき{算|ざん}'], [2, '🌿', 'かけ{算|ざん}（{九九|くく}）'], [3, '🌳', 'おおきな {数|かず}・わり{算|ざん}']].map(([g, ic, d]) => `<div class="pick mini" data-g="${g}"><div class="p-icon" style="font-size:52px">${ic}</div><div class="p-title">${T(`${g}ねんせい`)}</div><div class="p-desc">${T(d)}</div></div>`).join('')}</div>
      <div class="sub" style="color:var(--ink-dim);font-size:15px">${T('けいさん チャレンジ と なぞときの むずかしさが かわるよ')}</div>
      <h1 style="font-size:28px">${T('むずかしさ')}</h1>
      <div class="pick-row"><div class="pick mini" data-d="easy" style="width:280px"><div class="p-title">🐣 ${T('かんたん')}</div><div class="p-desc">${T('{敵|てき}が よわめ。はじめての ひとに')}</div></div><div class="pick mini" data-d="normal" style="width:280px"><div class="p-title">🔥 ${T('ふつう')}</div><div class="p-desc">${T('ほんきの ぼうけん')}</div></div></div>
      <div class="row"><button class="btn dark" data-back2>◀ ${T('もどる')}</button><button class="btn big" data-go>${T('ぼうけんへ！')}</button></div></div></div>`);
  app.mount(root);
  swirl($('canvas.swirl', root), 'title');
  const markSel = () => { $$('[data-h]', root).forEach((n) => n.classList.toggle('on', Number(n.dataset.h) === hero)); $$('[data-g]', root).forEach((n) => n.classList.toggle('on', Number(n.dataset.g) === grade)); $$('[data-d]', root).forEach((n) => n.classList.toggle('on', n.dataset.d === diff)); };
  markSel();
  $$('[data-h]', root).forEach((n) => n.addEventListener('click', () => { sfx('select'); hero = Number(n.dataset.h); markSel(); }));
  $$('[data-g]', root).forEach((n) => n.addEventListener('click', () => { sfx('tap'); grade = Number(n.dataset.g); markSel(); }));
  $$('[data-d]', root).forEach((n) => n.addEventListener('click', () => { sfx('tap'); diff = n.dataset.d; markSel(); }));
  $('[data-back]', root).addEventListener('click', () => { sfx('tap'); titleScreen(); });
  $('[data-next]', root).addEventListener('click', () => { sfx('tap'); $('[data-s1]', root).style.display = 'none'; $('[data-s2]', root).style.display = ''; });
  $('[data-back2]', root).addEventListener('click', () => { sfx('tap'); $('[data-s2]', root).style.display = 'none'; $('[data-s1]', root).style.display = ''; });
  $('[data-go]', root).addEventListener('click', async () => {
    sfx('upgrade');
    meta.lastHero = hero; meta.lastGrade = grade; meta.lastDiff = diff; meta.records.runs++; saveMeta();
    app.run = R.newRun({ hero, grade, diff, seed: newSeed() });
    mark('arcana', HEROES[hero].arcana);
    persist();
    await story();
    runLoop();
  });
}

async function story() {
  const lines = [['🌌', 'せかいの {数|かず}は、ルーンと よばれる いしに やどっている。'], ['⚫', 'ある よる「ゼロの おう」が あらわれ、すべての {数|かず}を 0に しようと しはじめた。'], ['🐈‍⬛', '「ぼくは ノクス。ルーンを くみあわせる「アルカナ つかい」の きみなら、おうを とめられる。いっしょに いこう！」']];
  const root = el(`<div class="screen fade-in">${bgHtml()}<div class="panel-screen"><div class="event-box"><div class="ev-art"></div><div class="ev-text" style="font-size:24px"></div><button class="btn green" data-n>${T('つぎへ ▶')}</button></div></div></div>`);
  app.mount(root); swirl($('canvas.swirl', root), 'title');
  for (const [ic, t] of lines) { $('.ev-art', root).textContent = ic; $('.ev-text', root).innerHTML = T(t); sfx('page'); await new Promise((r) => $('[data-n]', root).addEventListener('click', () => { sfx('tap'); r(); }, { once: true })); }
}

async function runLoop() {
  const run = app.run;
  while (true) {
    let nodeId = run.pending;
    if (!nodeId) {
      nodeId = await mapScreen(app);
      run.pos = nodeId; if (!run.map.visited.includes(nodeId)) run.map.visited.push(nodeId);
      run.pending = nodeId; persist();
    }
    const node = run.map.nodes[nodeId];
    if (['battle', 'elite', 'boss'].includes(node.type)) {
      if (!node.enc) { const { rng, save } = app.rng(); node.enc = R.pickEncounter(run, node.type, rng); save(); }
      const res = await battleScreen(app, node.enc, node.type);
      if (res === 'lose') { clearRun(); await endScreen(false); return; }
      await rewardScreen(app, node.type);
    } else if (node.type === 'rest') await restScreen(app);
    else if (node.type === 'shop') await shopScreen(app);
    else if (node.type === 'treasure') await treasureScreen(app);
    else if (node.type === 'event') await eventScreen(app);
    run.pending = null; persist();
    meta.records.bestAct = Math.max(meta.records.bestAct, run.act); saveMeta();
    if (node.type === 'boss') {
      if (run.act >= 3) { clearRun(); await endScreen(true); return; }
      await actUp();
    }
  }
}
async function actUp() {
  const run = app.run;
  run.act++;
  const healed = R.heal(run, Math.round((run.maxHp - run.hp) * 0.7));
  const { rng, save } = app.rng(); run.map = R.genMap(rng); run.pos = null; save();
  const A = R.ACTS[run.act];
  const root = el(`<div class="screen fade-in">${bgHtml()}<div class="panel-screen"><div class="event-box"><div class="ev-art">${A.icon}</div><div class="ev-title">${run.act}${T('しょう')}　${T(A.name)}</div><div class="ev-text">${T(`HPが ${healed} かいふく した。\n{敵|てき}は どんどん つよく なる。アルカナと {役|やく}を そだてよう！`)}</div><button class="btn green big" data-n>${T('すすむ ▶')}</button></div></div></div>`);
  app.mount(root); swirl($('canvas.swirl', root), A.theme); sfx('upgrade');
  await new Promise((r) => $('[data-n]', root).addEventListener('click', () => { sfx('tap'); r(); }, { once: true }));
}

async function endScreen(win) {
  const run = app.run, s = run.stats, rc = meta.records;
  rc.best = Math.max(rc.best, s.best); rc.challengeOk += s.challengeOk; rc.challengeTry += s.challengeTry; rc.quizOk += s.quizOk; rc.quizTry += s.quizTry;
  if (win) { rc.wins++; rc.heroWins[run.hero] = (rc.heroWins[run.hero] || 0) + 1; }
  saveMeta();
  stopBgm(); if (win) bgm('victory');
  const fav = Object.entries(s.hands).sort((a, b) => b[1] - a[1])[0];
  const stats = [['💥', 'さいだい ダメージ', s.best], ['🔮', 'けいさん せいかい', `${s.challengeOk} / ${s.challengeTry}`], ['⚔️', 'かった たたかい', s.battles], ['🃏', 'よく つかった {役|やく}', fav ? T(HANDS[fav[0]].name) : '-'], ['📜', 'なぞとき せいかい', `${s.quizOk} / ${s.quizTry}`], ['🔮', 'アルカナ', run.arcana.map((a) => ARCANA[a.id].icon).join('') || '-']];
  const root = el(`<div class="screen fade-in">${bgHtml()}<div class="panel-screen">
    <h1 style="font-size:54px">${win ? T('ゼロの おうを たおした！') : T('ちからつきた…')}</h1>
    <div class="lead">${win ? T('{数|かず}の ひかりが せかいに もどった。きみは いちにんまえの アルカナ つかいだ！') : T(`${run.act}しょうまで すすんだ。デッキと アルカナの くみあわせを かえて、また ちょうせん しよう！`)}</div>
    <div class="stat-grid">${stats.map(([i, l, v]) => `<div class="stat"><div class="s-val">${v}</div><div class="s-lbl">${i} ${T(l)}</div></div>`).join('')}</div>
    <button class="btn big" data-t>${T('タイトルへ')}</button></div></div>`);
  app.mount(root); swirl($('canvas.swirl', root), win ? 'title' : 'tower');
  if (win) { confetti(); setTimeout(confetti, 1500); } else sfx('lose');
  app.run = null;
  await new Promise((r) => $('[data-t]', root).addEventListener('click', () => { sfx('tap'); r(); }, { once: true }));
  titleScreen();
}

function zukanScreen(tab = 'hands') {
  bgm('map');
  const tabs = [['hands', '🃏 {役|やく}'], ['cards', '🎴 カード'], ['arcana', '🔮 アルカナ'], ['enemies', '👾 モンスター'], ['records', '🏅 きろく']];
  const root = el(`<div class="screen fade-in">${bgHtml()}<div class="panel-screen" style="justify-content:flex-start;gap:10px">
    <div class="row" style="width:100%;justify-content:space-between;padding:0 10px"><button class="btn dark small" data-back>◀ ${T('もどる')}</button><h1 style="font-size:34px">${T('ずかん')}</h1><div style="width:100px"></div></div>
    <div class="row">${tabs.map(([k, l]) => `<button class="btn small ${k === tab ? 'gold' : 'dark'}" data-tab="${k}">${T(l)}</button>`).join('')}</div>
    <div class="scroll" data-body style="flex:1;width:100%;max-width:1100px;padding:0 8px 16px"></div></div></div>`);
  app.mount(root); swirl($('canvas.swirl', root), 'title');
  $('[data-back]', root).addEventListener('click', () => { sfx('tap'); titleScreen(); });
  $$('[data-tab]', root).forEach((b) => b.addEventListener('click', () => { sfx('tap'); zukanScreen(b.dataset.tab); }));
  const body = $('[data-body]', root);
  if (tab === 'hands') {
    body.innerHTML = `<table class="hands-table">${HAND_ORDER.filter((h) => h !== 'none').map((id) => { const H = HANDS[id]; const seen = meta.hands[id]; return `<tr><td class="hn2">${seen ? '✅' : '⬜'} ${T(H.name)}${H.math ? ' 🔢' : ''}</td><td><div class="mini-runes">${H.ex.map((v) => `<i>${v}</i>`).join('')}</div></td><td style="font-size:14px;color:var(--ink-dim)">${T(H.desc)}</td><td class="hv"><span class="p">${H.power}</span> × <span class="m">${H.mult}</span></td></tr>`; }).join('')}</table>`;
  } else if (tab === 'cards') {
    const list = Object.values(CARDS).filter((c) => c.type !== 'rune' && c.type !== 'curse');
    body.innerHTML = `<div class="sub">${T(`みつけた カード ${list.filter((c) => meta.cards[c.id]).length} / ${list.length}`)}</div><div class="card-grid">${list.map((c) => cardHtml({ id: c.id, up: false, uid: 'z' + c.id }, { cls: meta.cards[c.id] ? '' : 'dim' })).join('')}</div>`;
    $$('.card', body).forEach((n) => n.addEventListener('click', () => { sfx('tap'); cardDetail({ id: n.dataset.id, up: false }); }));
  } else if (tab === 'arcana') {
    const list = Object.values(ARCANA);
    body.innerHTML = `<div class="sub">${T(`あつめた アルカナ ${list.filter((a) => meta.arcana[a.id]).length} / ${list.length}`)}</div><div class="card-grid">${list.map((a) => `<div class="zk-tile ${meta.arcana[a.id] ? '' : 'unknown'}" data-a="${a.id}"><div class="zi">${a.icon}</div><div class="zn">${meta.arcana[a.id] ? T(a.name) : '？？？'}</div></div>`).join('')}</div>`;
    $$('[data-a]', body).forEach((n) => n.addEventListener('click', () => { if (!meta.arcana[n.dataset.a]) { sfx('wrong'); return; } sfx('tap'); arcanaDetail({ id: n.dataset.a, n: 0 }); }));
  } else if (tab === 'enemies') {
    const list = Object.values(ENEMIES);
    body.innerHTML = `<div class="card-grid">${list.map((e) => `<div class="zk-tile ${meta.enemies[e.id] ? '' : 'unknown'}" data-e="${e.id}"><div class="zi">${enemyArt(e.art)}</div><div class="zn">${meta.enemies[e.id] ? T(e.name) : '？？？'}</div></div>`).join('')}</div>`;
    $$('[data-e]', body).forEach((n) => n.addEventListener('click', () => { const e = ENEMIES[n.dataset.e]; if (!meta.enemies[e.id]) { sfx('wrong'); return; } sfx('tap'); openModal(`<div style="font-size:110px;height:150px;display:flex;align-items:center">${enemyArt(e.art).replace('<svg', '<svg style="width:160px;height:150px"')}</div><h2>${T(e.name)}</h2><div class="sub">HP ${e.hp}${e.rule ? `　💀 ${T('のろいを もつ')}` : ''}</div>${e.desc ? `<div class="sub" style="color:var(--ink)">${T(e.desc)}</div>` : ''}`); }));
  } else {
    const r = meta.records;
    body.innerHTML = `<div class="stat-grid" style="margin:10px auto">${[['🚀', 'ぼうけん した かいすう', r.runs], ['🏆', 'クリア した かいすう', r.wins], ['🗺️', 'いちばん すすんだ しょう', r.bestAct || '-'], ['💥', 'さいだい ダメージ', r.best], ['🔮', 'けいさん せいかい', `${r.challengeOk} / ${r.challengeTry}`], ['📜', 'なぞとき せいかい', `${r.quizOk} / ${r.quizTry}`]].map(([i, l, v]) => `<div class="stat"><div class="s-val">${v}</div><div class="s-lbl">${i} ${T(l)}</div></div>`).join('')}</div>`;
  }
}

window.addEventListener('error', (e) => console.error(e.error || e.message));
window.addEventListener('unhandledrejection', (e) => console.error(e.reason));
titleScreen();
