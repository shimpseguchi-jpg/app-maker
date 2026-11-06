// はじめかた・ホーム・テンプレ・せってい・ほごしゃモード（REQUIREMENTS.md 5.1・5.8・F-101〜F-106・F-801〜F-807）
import { T, $, $$, el, esc, modal, toast, play, longPress, confirmBox, applyVolume, clock, minText } from './common.js';
import { setTextMode } from '../../../js/text.js';
import { THEMES, themeById, fill } from '../data/themes.js';
import { TEMPLATES } from '../data/templates.js';
import { profile, parent, record, saveProfile, saveParent, exportAll, importAll, resetAll, loadDraft } from '../save.js';
import { streak } from './result.js';

const unlockedThemes = () => THEMES.filter((t) => record.totalStars >= t.unlock);
const seg = (name, opts, cur) => `<div class="seg" data-seg="${name}">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(v) === String(cur) ? 'on' : ''}">${T(l)}</button>`).join('')}</div>`;
function wireSeg(root, obj, onChange) {
  $$('[data-seg]', root).forEach((g) => $$('button', g).forEach((b) => b.addEventListener('click', () => {
    play('tap');
    const k = g.dataset.seg; let v = b.dataset.v;
    if (v === 'true') v = true; else if (v === 'false') v = false; else if (v !== '' && !isNaN(Number(v))) v = Number(v);
    obj[k] = v; $$('button', g).forEach((x) => x.classList.toggle('on', x === b)); onChange?.(k, v);
  })));
}
const TEXT_MODES = [['hira', 'ひらがな'], ['ruby', '{漢字|かんじ}（ふりがな）']];   // UI の 漢字には かならず ふりがな

// ───────────── F-101 はじめかた
export function renderSetup(root, app) {
  const st = { grade: profile.grade, text: profile.text, theme: profile.theme };
  const node = el(`<div class="screen setup">
    <div class="setup-in card">
      <div class="logo">🗝️⏱️</div><h1>${T('ミッションタイマー')}</h1>
      <div class="lbl">${T('なんねんせい？')}</div>${seg('grade', [1, 2, 3, 4, 5, 6].map((g) => [g, g + 'ねんせい']), st.grade)}
      <div class="lbl">${T('なまえ')} <small>（${T('ひらがな 6もじ まで。なくても いいよ')}）</small></div><input data-name maxlength="6" value="${esc(profile.name)}" autocomplete="off">
      <div class="lbl">${T('もじ')}</div>${seg('text', TEXT_MODES, st.text)}
      <div class="lbl">${T('テーマ')}</div><div class="themes">${unlockedThemes().map((t) => `<button data-theme="${t.id}" class="${st.theme === t.id ? 'on' : ''}"><span class="em">${t.mascot.emoji}</span>${T(t.name)}</button>`).join('')}</div>
      <div class="warn" data-err></div>
      <button class="btn big" data-start>${T('はじめる')} ▶</button>
    </div></div>`);
  root.innerHTML = ''; root.appendChild(node);
  // えらんだ ものは profile に いれておく（もじを かえて かきなおしても きえない）。ほぞんは「はじめる」で
  wireSeg(node, st, (k, v) => { profile[k] = v; if (k === 'text') { setTextMode(v); renderSetup(root, app); } });
  $$('[data-theme]', node).forEach((b) => b.addEventListener('click', () => { play('tap'); st.theme = profile.theme = b.dataset.theme;$$('[data-theme]', node).forEach((x) => x.classList.toggle('on', x === b)); app.applyTheme(themeById(st.theme)); }));
  $('[data-start]', node).addEventListener('click', () => {
    const name = $('[data-name]', node).value.trim();
    if (name && !/^[ぁ-ゖー]{1,6}$/.test(name)) { $('[data-err]', node).innerHTML = T('なまえは ひらがなで 6もじ までだよ'); return; }
    play('select');
    Object.assign(profile, { grade: st.grade, text: st.text, theme: st.theme, name, setup: true }); saveProfile();
    app.go('home');
  });
}

// ───────────── F-102 ホーム
export function renderHome(root, app) {
  const theme = app.theme();
  const m = app.loadMission();
  const draft = loadDraft();
  const going = m && m.state !== 'finished';
  const hello = theme.announce.hello[new Date().getDate() % theme.announce.hello.length];
  const node = el(`<div class="screen home">
    <header class="bar"><h1>${T('ミッションタイマー')}</h1><span class="stars">⭐ ${record.totalStars}　💮 ${streak()}</span><button class="btn ghost" data-settings aria-label="${T('せってい')}">⚙️</button></header>
    <div class="home-body">
      <div class="greet"><span class="mascot">${theme.mascot.emoji}</span><div class="bubble">${T(fill(hello, { name: profile.name || 'きみ' }))}</div></div>
      <div class="home-btns">
        ${going ? `<button class="btn big go" data-resume>▶ ${T('ミッションの つづき')}</button>` : ''}
        <button class="btn big" data-new>✏️ ${T('あたらしく つくる')}</button>
        ${draft && draft.items?.length && !going ? `<button class="btn" data-draft>📝 ${T('つくりかけの つづき')}</button>` : ''}
        <button class="btn" data-tpl>📋 ${T('テンプレから つくる')}</button>
        <button class="btn gray" data-record>📅 ${T('きろく')}</button>
      </div>
    </div></div>`);
  root.innerHTML = ''; root.appendChild(node);
  $('[data-settings]', node).addEventListener('click', () => { play('tap'); app.go('settings'); });
  $('[data-new]', node).addEventListener('click', async () => {
    play('tap');
    if (going && !(await confirmBox('いまの ミッションを おわる？', 'ここまでの カギと スターは のこるよ', 'おわって つくる', 'やめる'))) return;
    if (going) app.quitMission();
    app.go('maker', { fresh: true });
  });
  $('[data-resume]', node)?.addEventListener('click', () => { play('select'); app.resume(); });
  $('[data-draft]', node)?.addEventListener('click', () => { play('tap'); app.go('maker', { draft }); });
  $('[data-record]', node).addEventListener('click', () => { play('tap'); app.go('record'); });
  $('[data-tpl]', node).addEventListener('click', () => {
    play('tap');
    const { root: r, close } = modal(`<h2>${T('テンプレから つくる')}</h2><div class="tpl">${TEMPLATES.map((tp) => `<button data-tp="${tp.id}"><span class="em">${tp.emoji}</span><b>${T(tp.name)}</b><small>${minText(tp.minutes)}</small></button>`).join('')}</div><button class="btn gray" data-close>${T('やめる')}</button>`, { cls: 'wide' });
    $$('[data-tp]', r).forEach((b) => b.addEventListener('click', () => { play('select'); close(); app.go('maker', { template: TEMPLATES.find((x) => x.id === b.dataset.tp) }); }));
  });
}

// ───────────── F-104 せってい（こども むけ）
export function renderSettings(root, app) {
  const node = el(`<div class="screen settings">
    <header class="bar"><button class="btn ghost" data-home>← ${T('ホーム')}</button><h1>${T('せってい')}</h1></header>
    <div class="set-body card">
      <div class="lbl">${T('テーマ')}</div><div class="themes">${unlockedThemes().map((t) => `<button data-theme="${t.id}" class="${profile.theme === t.id ? 'on' : ''}"><span class="em">${t.mascot.emoji}</span>${T(t.name)}</button>`).join('')}</div>
      <div class="lbl">${T('のこり じかんの みせかた')}</div>${seg('view', [['disc', 'えんばん'], ['bar', 'バー'], ['mascot', 'マスコット'], ['numbers', 'すうじ']], profile.view)}
      <div class="lbl">${T('すうじを みせる')}</div>${seg('showNumbers', [[true, 'みせる'], [false, 'みせない']], profile.showNumbers)}
      <div class="lbl">${T('おと')}</div>${seg('volume', [['off', 'なし'], ['low', 'ちいさい'], ['normal', 'ふつう']], profile.volume)}
      <div class="lbl">${T('よみあげ')}</div>${seg('speech', [[true, 'あり'], [false, 'なし']], profile.speech)}
      <div class="lbl">${T('えんしゅつ')}</div>${seg('drama', [['quiet', 'しずか'], ['normal', 'ふつう'], ['dramatic', 'ドラマチック']], profile.drama)}
      <div class="lbl">${T('もじ')}</div>${seg('text', TEXT_MODES, profile.text)}
      <div class="lbl">${T('がくねん')}</div>${seg('grade', [1, 2, 3, 4, 5, 6].map((g) => [g, g + 'ねん']), profile.grade)}
      <div class="lbl">${T('なまえ')}</div><div class="row"><input data-name maxlength="6" value="${esc(profile.name)}" autocomplete="off"><button class="btn small" data-savename>${T('かえる')}</button></div>
      <button class="btn gray parent-btn" data-parent>🔐 ${T('おうちの ひと')} <small>（${T('3びょう ながおし')}）</small><i class="press" data-press></i></button>
    </div></div>`);
  root.innerHTML = ''; root.appendChild(node);
  wireSeg(node, profile, (k, v) => {
    saveProfile();
    if (k === 'text') { setTextMode(v); renderSettings(root, app); }
    if (k === 'volume' || k === 'drama') applyVolume();
  });
  $$('[data-theme]', node).forEach((b) => b.addEventListener('click', () => { play('tap'); profile.theme = b.dataset.theme; saveProfile(); app.applyTheme(themeById(profile.theme)); renderSettings(root, app); }));
  $('[data-home]', node).addEventListener('click', () => { play('tap'); app.go('home'); });
  $('[data-savename]', node).addEventListener('click', () => {
    const name = $('[data-name]', node).value.trim();
    if (name && !/^[ぁ-ゖー]{1,6}$/.test(name)) { toast(T('なまえは ひらがなで 6もじ までだよ')); return; }
    play('select'); profile.name = name; saveProfile(); toast(T('なまえを かえたよ'));
  });
  const pb = $('[data-parent]', node);
  longPress(pb, 3000, () => parentGate(app), (p) => { $('[data-press]', pb).style.width = (p * 100) + '%'; });   // F-105
}

// F-105 2けたの たしざん で はいる
function parentGate(app) {
  const a = 11 + Math.floor(Math.random() * 60), b = 11 + Math.floor(Math.random() * 30);
  let val = '';
  const { root: r, close } = modal(`<h2>${T('おうちの ひと むけ')}</h2><p class="lead">${a} ＋ ${b} ＝ <b data-v>？</b></p>
    <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'OK'].map((k) => `<button data-k="${k}">${k}</button>`).join('')}</div><button class="btn gray" data-close>${T('やめる')}</button>`);
  $$('[data-k]', r).forEach((btn) => btn.addEventListener('click', () => {
    play('tap');
    const k = btn.dataset.k;
    if (k === 'C') val = ''; else if (k === 'OK') { if (Number(val) === a + b) { close(); app.go('parent'); return; } val = ''; toast(T('ちがうよ')); } else if (val.length < 3) val += k;
    $('[data-v]', r).textContent = val || '？';
  }));
}

// ───────────── 5.8 ほごしゃモード
export function renderParent(root, app) {
  const caps = [[0, 'なし'], [15, '15ふん'], [30, '30ぷん'], [45, '45ふん'], [60, '60ぷん'], [90, '90ぷん']];
  const node = el(`<div class="screen parent">
    <header class="bar"><button class="btn ghost" data-back>← ${T('もどる')}</button><h1>${T('おうちの ひと むけ')}</h1></header>
    <div class="set-body card">
      <div class="lbl">${T('ゲーム・{動画|どうが}の 1{日|にち}の じょうげん')}</div>${seg('rewardCapDay', caps, parent.rewardCapDay)}
      <div class="lbl">${T('1ミッションの じょうげん')}</div>${seg('rewardCapMission', caps, parent.rewardCapMission)}
      <div class="lbl">${T('「もうすこし」の かいすう')}</div>${seg('extendMax', [[0, '0かい'], [1, '1かい'], [2, '2かい']], parent.extendMax)}
      <div class="lbl">${T('ちぢめられない とき おわりを のばして いい')}</div>${seg('allowEndExtend', [[false, 'のばさない'], [true, 'のばして いい']], parent.allowEndExtend)}
      <div class="lbl">${T('「もうすこし」で ちぢめる じゅん')}</div>${seg('shrink', [['others', 'ごほうびは さいごに'], ['reward', 'ごほうびから']], parent.shrink)}
      <div class="lbl">${T('いちじていし')}</div>${seg('pauseLongPress', [[false, 'タップ'], [true, 'ながおし だけ']], parent.pauseLongPress)}
      <div class="lbl">${T('こどもが パネルを つくる')}</div>${seg('kidCustom', [[true, 'できる'], [false, 'できない']], parent.kidCustom)}
      <div class="lbl">${T('お{風呂|ふろ}の じこくの めやす')}</div>${seg('bathAt', [['', 'なし'], ['18:30', '18:30'], ['19:00', '19:00'], ['19:30', '19:30'], ['20:00', '20:00']], parent.bathAt)}
      <div class="row wrap"><button class="btn small" data-export>⬇ ${T('きろくを かきだす')}</button><label class="btn small">⬆ ${T('よみこむ')}<input type="file" accept="application/json" data-import hidden></label><button class="btn small gray" data-reset>🗑 ${T('ぜんぶ けす')}</button></div>
      <div class="guide">
        <h3>${T('おうちの ひとへ')}</h3>
        <p>${T('このアプリは「しっぱい」「ダメ」を {出|だ}しません。じかんぎれでも あつめた カギの かずを ほめます。とりかかれた こと、さいごまで いった ことを いっしょに よろこんで ください。')}</p>
        <p>${T('{集中|しゅうちゅう}の めやすは「{学年|がくねん}×10ぷん（さいてい 15ふん）」。こえると 5ふんの きゅうけいが じどうで はいります。')}</p>
        <p>${T('ごほうびの ルールは ごかていで {決|き}めて ください（れい：スター 50で おでかけ）。ゲームの じょうげんは この がめんで {決|き}められます。')}</p>
        <p>${T('こえかけの れい：「はやく！」の かわりに「つぎは なにかな？」「のこり どのくらい？」')}</p>
      </div>
    </div></div>`);
  root.innerHTML = ''; root.appendChild(node);
  wireSeg(node, parent, () => saveParent());
  $('[data-back]', node).addEventListener('click', () => { play('tap'); app.go('settings'); });
  $('[data-export]', node).addEventListener('click', () => {   // F-806
    const blob = new Blob([JSON.stringify(exportAll(), null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `missiontimer-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
  $('[data-import]', node).addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { importAll(JSON.parse(await f.text())); toast(T('よみこんだよ')); setTimeout(() => location.reload(), 800); } catch (er) { toast(T('よみこめなかったよ')); }
  });
  $('[data-reset]', node).addEventListener('click', async () => {
    if (await confirmBox('ぜんぶ けす？', 'せってい・きろく・スターが すべて きえます', 'けす', 'やめる') && await confirmBox('さいごの かくにん', 'もとに もどせません', 'けす', 'やめる')) { resetAll(); location.reload(); }
  });
}
