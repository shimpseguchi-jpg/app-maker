// ほたるの めいきゅう：はじまり と がめんの ながれ（タイトル → キャンプ → めいきゅう）
import { setTextMode, T } from '../../js/text.js';
import { el, $, $$, newSeed } from '../../js/util.js';
import { unlockAudio, sfx, playBgm, stopBgm, setVolumes } from '../../js/audio.js';
import { settings, saveSettings, loadProfile, saveProfile, loadRun, saveRun, resetAll } from './save.js';
import * as g from './engine/game.js';
import { newProfile, heroStats, expNeed } from './engine/hero.js';
import { buyItem, buyEquip, nextEquip, sellItem } from './engine/camp.js';
import { MOBS, AREAS, LAST_FLOOR } from './data/enemies.js';
import { ITEMS, SHOP_ITEMS, WEAPONS, SHIELDS, BAG_MAX } from './data/items.js';
import { FIREFLIES, FIREFLY_LIST, FIREFLY_HP, colorOf } from './data/fireflies.js';
import { initCommon, openModal, alertBox, confirmBox, toast } from './ui/common.js';
import { runDungeon, howtoHtml } from './ui/dungeon.js';
import { askQuiz } from './ui/quiz.js';
import { SUBJECTS, UNIT_NAMES, newLearn, subjectLevel, accuracy } from './engine/learn.js';

const VERSION = '0.6.0';
const stage = $('#stage');
initCommon(stage);
setTextMode(settings.text);
setVolumes(settings.bgm, settings.sfx);

// ───── がめんの おおきさ（iPad よこむき きじゅん。スマホの よこむきも おなじ わりあいで ちぢめる）─────
const DW = 1180, MIN_H = 700, MAX_H = 900;
function fit() {
  const vw = window.innerWidth, vh = window.innerHeight;
  let s = vw / DW, w = DW, h = vh / s;
  if (h < MIN_H) { s = vh / MIN_H; h = MIN_H; w = Math.min(vw / s, 1500); } else if (h > MAX_H) h = MAX_H;
  stage.style.width = w + 'px'; stage.style.height = h + 'px';
  stage.style.transform = `scale(${s})`; stage.style.left = Math.max(0, (vw - w * s) / 2) + 'px'; stage.style.top = Math.max(0, (vh - h * s) / 2) + 'px';
}
window.addEventListener('resize', fit); window.addEventListener('orientationchange', () => setTimeout(fit, 200)); fit();
document.addEventListener('gesturestart', (e) => e.preventDefault()); document.addEventListener('dblclick', (e) => e.preventDefault()); document.addEventListener('contextmenu', (e) => e.preventDefault());
let audioReady = false, pendingBgm = null;
document.addEventListener('pointerdown', () => { if (!audioReady) { unlockAudio(); audioReady = true; if (pendingBgm) playBgm(pendingBgm); } }, { capture: true });
function bgm(name) { pendingBgm = name; if (audioReady) { if (name) playBgm(name); else stopBgm(); } }
$('[data-portrait]')?.addEventListener('click', () => document.body.classList.add('allow-portrait'));
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});

let P = loadProfile();
if (P && !P.learn) P.learn = newLearn();
if (P && P.bag) P.bag = P.bag.filter((id) => ITEMS[id]);
const persist = () => saveProfile(P);
function mount(node) { $$('.screen, .toast', stage).forEach((s) => s.remove()); $$('.modal-back', stage).forEach((s) => s.remove()); stage.prepend(node); return node; }
const stars = (n) => Array.from({ length: n }, (_, i) => `<i class="star" style="left:${(i * 37 + 11) % 100}%;top:${(i * 53 + 7) % 60}%;animation-delay:${(i % 7) * 0.4}s"></i>`).join('');

// ───── せってい ─────
function seg(name, options, cur) { return `<div class="seg" data-seg="${name}">${options.map(([v, l]) => `<button data-v="${v}" class="${String(v) === String(cur) ? 'on' : ''}">${T(l)}</button>`).join('')}</div>`; }
function openSettings(onChange) {
  const { m, close } = openModal(`<h2>⚙️ ${T('せってい')}</h2>
    <div class="set-row"><span>もじ</span>${seg('text', [['hira', 'ひらがな'], ['ruby', '{漢字|かんじ}（ふりがな）'], ['kanji', '{漢字|かんじ}']], settings.text)}</div>
    ${P ? `<div class="set-row"><span>${T('がくねん')}</span>${seg('grade', [[1, '1ねんせい'], [2, '2ねんせい'], [3, '3ねんせい']], P.learn.grade)}</div>
    <div class="set-row"><span>${T('きょうか')}</span><div class="seg multi">${Object.values(SUBJECTS).map((x) => `<button data-subj="${x.id}" class="${P.learn.subjects.includes(x.id) ? 'on' : ''}">${x.emo} ${T(x.name)}</button>`).join('')}</div></div>` : ''}
    <div class="set-row"><span>${T('えいごの よみあげ')}</span>${seg('speech', [[true, 'あり'], [false, 'なし']], settings.speech !== false)}</div>
    <div class="set-row"><span>BGM</span>${seg('bgm', [[0, 'なし'], [0.5, 'ふつう'], [1, 'おおきい']], settings.bgm)}</div>
    <div class="set-row"><span>${T('こうかおん')}</span>${seg('sfx', [[0, 'なし'], [0.8, 'あり']], settings.sfx)}</div>
    <div class="set-row"><span>${T('めいきゅうの みため')}</span>${seg('view', [['3d', '3D（りったい）'], ['2d', '2D（うえから）']], settings.view)}</div>
    <div class="set-row"><span>${T('やじるし ボタン')}</span>${seg('pad', [[true, 'だす'], [false, 'かくす']], settings.pad)}</div>
    <div class="set-row"><button class="btn gray small" data-reset>🗑 ${T('さいしょから やりなおす')}</button></div>
    <div class="sub">${T('ほたるの めいきゅう')} v${VERSION}</div>`);
  $$('[data-seg] button', m).forEach((b) => b.addEventListener('click', () => {
    const k = b.parentElement.dataset.seg, v = b.dataset.v;
    if (k === 'grade') { P.learn.grade = Number(v); P.learn.level = {}; P.learn.streak = {}; persist(); }
    else settings[k] = k === 'text' || k === 'view' ? v : k === 'pad' || k === 'speech' ? v === 'true' : Number(v);
    saveSettings(); setTextMode(settings.text); setVolumes(settings.bgm, settings.sfx); sfx('tap');
    close(); onChange && onChange(); openSettings(onChange);
  }));
  $$('[data-subj]', m).forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.subj, list = P.learn.subjects;
    if (list.includes(id)) { if (list.length === 1) { sfx('blocked'); return; } list.splice(list.indexOf(id), 1); } else list.push(id);
    persist(); sfx('tap'); close(); onChange && onChange(); openSettings(onChange);
  }));
  $('[data-reset]', m).addEventListener('click', async () => {
    close();
    if (await confirmBox(`<h2>${T('さいしょから やりなおす？')}</h2><p>${T('レベルも ほたるも ぜんぶ きえる。')}</p>`, 'けす', 'やめる')) { resetAll(); location.reload(); }
  });
}

// ───── タイトル ─────
function title() {
  bgm('title');
  const run = P && loadRun();
  const s = mount(el(`<div class="screen title">${stars(40)}
    <div class="title-box"><div class="title-lantern">🏮</div>
      <h1>${T('ほたるの めいきゅう')}</h1>
      <p class="lead">${T('ランタンを もって、まいごの ほたるを たすけに いこう')}</p>
      <div class="col">
        ${P ? `<button class="btn big" data-go>${T(run && !run.over ? 'つづきから（めいきゅうの なか）' : 'つづきから')}</button>` : `<button class="btn big" data-new>${T('はじめる')}</button>`}
        <button class="btn gray" data-settings>⚙️ ${T('せってい')}</button>
      </div></div></div>`));
  $('[data-settings]', s).addEventListener('click', () => { sfx('tap'); openSettings(title); });
  $('[data-new]', s)?.addEventListener('click', async () => {
    sfx('select');
    await alertBox(`<div class="big-emo">🌲🏮🌲</div><h2>${T('ものがたり')}</h2><p class="story">${T('もりの ほたるたちが、ふしぎな どうくつに まよいこんで しまった。<br>どうくつの いちばん おくには、ひかりを のみこむ「やみの ぬし」が いる らしい。<br>ランタンを もって、ほたるたちを たすけに いこう！')}</p>`, 'しゅっぱつ！', 'wide');
    const setup = await pickGrade();
    P = newProfile(setup.grade, setup.subjects); persist(); camp();
  });
  $('[data-go]', s)?.addEventListener('click', () => { sfx('select'); if (run && !run.over) dungeon(run); else camp(); });
}

// ───── はじめの せってい：がくねんと きょうか ─────
function pickGrade() {
  return new Promise((res) => {
    let grade = 1; const subjects = ['math', 'ja', 'en'];
    const { m, close } = openModal('', { cls: 'center wide', closable: false });
    const draw = () => {
      m.innerHTML = `<div class="big-emo">🎒</div><h2>${T('なんねんせい？')}</h2>
        <div class="row">${[1, 2, 3].map((g) => `<button class="pick ${grade === g ? 'on' : ''}" data-g="${g}"><b>${g}</b>${T('ねんせい')}</button>`).join('')}</div>
        <h2>${T('どの べんきょうを する？')}</h2><p class="sub">${T('めいきゅうの なかで {出|で}る もんだいの きょうか。あとで「せってい」で かえられる。')}</p>
        <div class="row">${Object.values(SUBJECTS).map((x) => `<button class="pick ${subjects.includes(x.id) ? 'on' : ''}" data-s="${x.id}"><b>${x.emo}</b>${T(x.name)}</button>`).join('')}</div>
        <div class="row"><button class="btn big" data-ok>${T('これで はじめる')}</button></div>`;
      $$('[data-g]', m).forEach((b) => b.addEventListener('click', () => { grade = +b.dataset.g; sfx('tap'); draw(); }));
      $$('[data-s]', m).forEach((b) => b.addEventListener('click', () => {
        const id = b.dataset.s; if (subjects.includes(id)) { if (subjects.length > 1) subjects.splice(subjects.indexOf(id), 1); } else subjects.push(id);
        sfx('tap'); draw();
      }));
      $('[data-ok]', m).addEventListener('click', () => { sfx('select'); close(); res({ grade, subjects }); });
    };
    draw();
  });
}

// ───── キャンプ ─────
function camp() {
  bgm('title'); saveRun(null);
  const S = heroStats(P), floors = g.startFloors(P);
  const s = mount(el(`<div class="screen camp">${stars(30)}
    <div class="camp-top"><h2>⛺ ${T('キャンプ')}</h2><span class="sp"></span>${P.clears ? `<span class="pill">🏆 ${T('クリア')} ${P.clears}</span>` : ''}<span class="pill">🎒 ${P.learn.grade}${T('ねんせい')}</span><span class="pill">💰 <b>${P.gold}</b></span><button class="icon-btn" data-settings>⚙️</button></div>
    <div class="camp-body">
      <div class="panel me">
        <div class="me-emo">🧒<span>🏮</span></div>
        <div class="me-lv">Lv <b>${P.level}</b> <small>${T('つぎの レベルまで')} ${expNeed(P.level) - P.exp}</small></div>
        <div class="me-stats"><span>❤️ HP <b>${S.maxHp}</b></span><span>🏮 ${T('ほたる')} <b>${P.fireflies.length}</b></span><span>${WEAPONS[P.weapon].emo} ${T('こうげき')} <b>${S.atk}</b></span><span>${SHIELDS[P.shield].emo} ${T('ぼうぎょ')} <b>${S.def}</b></span></div>
        <div class="me-eq">${T(WEAPONS[P.weapon].name)}　${T(SHIELDS[P.shield].name)}</div>
        <div class="me-lantern">${P.fireflies.map((id) => `<i class="ff-dot" style="--c:${colorOf(id)}"></i>`).join('')}</div>
        <div class="sub">${T('いちばん ふかく まで いった かい')}：${P.deepest ? P.deepest + T('かい') : '-'}</div>
      </div>
      <div class="cmds">
        <button class="cmd go" data-cmd="go"><span class="ic">🔦</span><span class="nm">${T('たんけんに {行|い}く')}</span><span class="ef">${T(AREAS[floors.length - 1].name)}${floors.length > 1 ? T(' から えらべる') : ''}</span></button>
        <button class="cmd" data-cmd="shop"><span class="ic">🛒</span><span class="nm">${T('おみせ')}</span><span class="ef">${T('どうぐ・そうび')}</span></button>
        <button class="cmd" data-cmd="bag"><span class="ic">🎒</span><span class="nm">${T('もちもの')}</span><span class="ef">${P.bag.length}/${BAG_MAX}</span></button>
        <button class="cmd" data-cmd="book"><span class="ic">📖</span><span class="nm">${T('ずかん')}</span><span class="ef">${T('まもの')} ${Object.keys(P.seen).length}/${Object.keys(MOBS).length}・${T('ほたる')} ${P.fireflies.length}/${FIREFLY_LIST.length}</span></button>
        <button class="cmd study" data-cmd="study"><span class="ic">🏫</span><span class="nm">${T('まなびの こや')}</span><span class="ef">${T('5もん とくと おかねが もらえる')}${P.learn.mistakes.length ? `　🔁 ${P.learn.mistakes.length}` : ''}</span></button>
        <button class="cmd" data-cmd="record"><span class="ic">📊</span><span class="nm">${T('まなびの きろく')}</span><span class="ef">${P.learn.total ? `${P.learn.total}${T('もん')}・${T('せいかい')} ${accuracy(P.learn)}%` : T('おうちの ひとも {見|み}てね')}</span></button>
        <button class="cmd" data-cmd="how"><span class="ic">❓</span><span class="nm">${T('あそびかた')}</span><span class="ef"></span></button>
      </div>
    </div></div>`));
  $('[data-settings]', s).addEventListener('click', () => { sfx('tap'); openSettings(camp); });
  const cmds = { go, shop: openShop, bag: openBag, book: openBook, study: openStudy, record: openRecord, how: () => openModal(howtoHtml()) };
  $$('[data-cmd]', s).forEach((b) => b.addEventListener('click', () => { sfx('tap'); cmds[b.dataset.cmd](); }));
}

async function go() {
  const floors = g.startFloors(P);
  let floor = 1;
  if (floors.length > 1) {
    floor = await new Promise((res) => {
      const { m, close } = openModal(`<h2>🔦 ${T('どこから はじめる？')}</h2><div class="col">${floors.map((f) => `<button class="btn big" data-f="${f}">${T(AREAS[(f - 1) / 3].name)} <small>${f}${T('かい から')}</small></button>`).join('')}</div>`, { cls: 'center', onClose: () => res(0) });
      $$('[data-f]', m).forEach((b) => b.addEventListener('click', () => { res(+b.dataset.f); close(); }));
    });
    if (!floor) return;
  }
  sfx('select');
  dungeon(g.enterFloor(P, floor, newSeed()));
}

async function dungeon(G) {
  const r = await runDungeon({ stage, P, G, bgm, openSettings, save: (G2) => { saveRun(G2); persist(); } });
  const { lost } = g.finishRun(r.G, P);
  saveRun(null); persist();
  if (r.end === 'dead' && lost > 0) await review(lost);
  if (r.end === 'clear') await ending();
  camp();
}
// やられた あとの ふくしゅう：3もん。せいかい する たびに、おとした おかねが 3ぶんの1 ずつ もどる
async function review(lost) {
  mount(el(`<div class="screen title">${stars(30)}</div>`));
  await alertBox(`<div class="big-emo">🔁</div><h2>${T('ふくしゅう チャンス！')}</h2><p>${T('3もんに ちょうせん。せいかい する たびに、<br>ほたるが おとした おかねを ひろって きて くれる。')}</p>`, 'やってみる');
  const dots = [null, null, null]; let back = 0;
  for (let i = 0; i < 3; i++) {
    const r = await askQuiz(stage, P, { head: '🔁 ふくしゅう チャンス：せいかいで おかねが もどる', keypad: true, dots: dots.slice() });
    dots[i] = r.ok; g.learnReward(null, P, r.ok, r.combo);
    if (r.ok) back += Math.round(lost / 3);
  }
  back = Math.min(lost, back); P.gold += back; persist();
  await alertBox(`<div class="big-emo">${back ? '💰' : '🌙'}</div><h2>${dots.filter(Boolean).length} / 3 ${T('もん せいかい')}</h2><p>${back ? `${back} ${T('ゴールド もどって きた！')}` : T('つぎは きっと だいじょうぶ。')}</p>`);
}
// ───── まなびの こや：5もん といて おかねと けいけんちを もらう ─────
function openStudy() {
  const L = P.learn;
  const { m, close } = openModal(`<h2>🏫 ${T('まなびの こや')}</h2><p class="sub">${T('5もん とくと、せいかいの かずだけ おかねが もらえる。ぜんぶ せいかいで ボーナス！')}</p>
    <div class="col">
      <button class="btn big" data-st="any">✨ ${T('おまかせ')}</button>
      ${L.subjects.map((id) => `<button class="btn big gray" data-st="${id}">${SUBJECTS[id].emo} ${T(SUBJECTS[id].name)} <small>${T('レベル')} ${subjectLevel(L, id)}</small></button>`).join('')}
      ${L.subjects.includes('math') ? `<button class="btn big gray" data-st="san">🧮 ${T('けいさんの しかた')} <small>${T('10の まとまり・ぶんしょうだい')}</small></button>` : ''}
      ${L.subjects.includes('ja') ? `<button class="btn big gray" data-st="hyoki">🔡 ${T('かなの きまり')} <small>${T('゛゜・っ・のばす おん・ゃゅょ')}</small></button>` : ''}
      ${L.subjects.includes('ja') ? `<button class="btn big gray" data-st="bun">✏️ ${T('ぶんづくり')} <small>${T('は・を・へ')}</small></button>` : ''}
      <button class="btn big gray" data-st="review" ${L.mistakes.length ? '' : 'disabled'}>🔁 ${T('にがてを ふくしゅう')} <small>${L.mistakes.length ? L.mistakes.length + T('しゅるい') : T('いまは ない')}</small></button>
    </div>`, { cls: 'center' });
  $$('[data-st]', m).forEach((b) => b.addEventListener('click', async () => {
    const mode = b.dataset.st; close(); sfx('select');
    const dots = [null, null, null, null, null]; let lvUp = false;
    for (let i = 0; i < 5; i++) {
      const r = await askQuiz(stage, P, { head: `🏫 まなびの こや　${i + 1} / 5`, keypad: true, dots: dots.slice(), subj: SUBJECTS[mode] ? mode : null, reviewOnly: mode === 'review' && P.learn.mistakes.length > 0, group: ['bun', 'hyoki', 'san'].includes(mode) ? mode : null });
      dots[i] = r.ok; if (g.learnReward(null, P, r.ok, r.combo).some((e) => e.t === 'levelup')) lvUp = true;
    }
    const n = dots.filter(Boolean).length, gold = n * (6 + 2 * P.learn.grade) + (n === 5 ? 20 : 0);
    P.gold += gold; persist(); sfx(n >= 3 ? 'win' : 'coin');
    await alertBox(`<div class="big-emo">${n === 5 ? '💯' : n >= 3 ? '😊' : '💪'}</div><h2>${n} / 5 ${T('もん せいかい')}</h2><p>💰 ${gold} ${T('ゴールド もらった！')}${n === 5 ? `<br>${T('ぜんぶ せいかいの ボーナスつき！')}` : ''}${lvUp ? `<br>⭐ ${T('レベルが')} ${P.level}${T('に あがった！')}` : ''}</p>`);
    camp();
  }));
}
// ───── まなびの きろく（おうちの ひとへ）─────
function openRecord() {
  const L = P.learn;
  const bar = (ok, n) => `<div class="rbar"><i style="width:${n ? Math.round(ok / n * 100) : 0}%"></i></div><b>${n ? Math.round(ok / n * 100) : 0}%</b><small>${ok}/${n}</small>`;
  const bySubj = Object.values(SUBJECTS).map((sj) => {
    const units = Object.entries(L.units).filter(([k]) => k.startsWith(sj.id + ':'));
    if (!units.length) return '';
    const tot = units.reduce((a, [, u]) => [a[0] + u[0], a[1] + u[1]], [0, 0]);
    return `<div class="rec-subj"><h3 style="--c:${sj.color}">${sj.emo} ${T(sj.name)} <small>${T('いまの レベル')} ${subjectLevel(L, sj.id)} / 8</small></h3>
      <div class="rec-row total"><span>${T('ぜんたい')}</span>${bar(tot[0], tot[1])}</div>
      ${units.sort((a, b) => a[1][0] / a[1][1] - b[1][0] / b[1][1]).map(([k, u]) => `<div class="rec-row ${u[1] >= 3 && u[0] / u[1] < 0.6 ? 'weak' : ''}"><span>${T(UNIT_NAMES[k] || k)}</span>${bar(u[0], u[1])}</div>`).join('')}</div>`;
  }).join('');
  const days = Object.entries(L.days).slice(-7);
  openModal(`<h2>📊 ${T('まなびの きろく')} <small>${L.grade}${T('ねんせい')}</small></h2>
    <div class="rec-top"><div><b>${L.total}</b><small>${T('といた もんだい')}</small></div><div><b>${accuracy(L)}%</b><small>${T('せいかいりつ')}</small></div><div><b>${L.best}</b><small>${T('さいこう れんぞく せいかい')}</small></div><div><b>${L.mistakes.length}</b><small>${T('ふくしゅうちゅうの にがて')}</small></div></div>
    ${days.length ? `<h3>${T('さいきんの がくしゅう')}</h3><div class="rec-days">${days.map(([d, v]) => `<div><b>${v[1]}</b><small>${T('もん')}</small><i style="height:${Math.min(60, 6 + v[1] * 1.5)}px"></i><small>${d.slice(5).replace('-', '/')}</small></div>`).join('')}</div>` : ''}
    ${bySubj || `<p class="sub">${T('まだ きろくが ない。めいきゅうや まなびの こやで もんだいを とくと、ここに たまって いく。')}</p>`}
    ${L.wrong.length ? `<h3>${T('さいきん まちがえた もんだい')}</h3><div class="rec-wrong">${L.wrong.slice(0, 8).map((w) => `<div><span class="tag subj" style="--c:${SUBJECTS[w.subj].color}">${SUBJECTS[w.subj].emo}</span><span>${T(w.q)}</span><b>${T(w.answer)}</b></div>`).join('')}</div>` : ''}
    <div class="parents"><b>👨‍👩‍👧 ${T('おうちの {方|かた}へ')}</b><br>問題は学年に合わせて出題され、正解が続くと少しずつ難しく、間違えるとやさしくなります。間違えた単元は「にがて」として記録され、復習で2回正解するまで繰り返し出題されます。赤く表示された単元は正答率が6割未満です。学年と教科は「せってい」で変えられます。</div>`, { cls: 'wide' });
}
async function ending() {
  bgm('victory');
  mount(el(`<div class="screen title ending">${stars(60)}</div>`));
  await alertBox(`<div class="big-emo">🌝✨</div><h2>${T('やみの ぬしを やっつけた！')}</h2><p class="story">${T('やみが はれて、どうくつの なかに ほたるの ひかりが もどって きた。<br>ほたるたちは うれしそうに ランタンの まわりを とびまわって いる。<br><b>たんけん だいせいこう！</b>')}</p>`, 'やったー！', 'wide');
  await alertBox(`<div class="big-emo">🏆</div><h2>${T('クリア おめでとう！')}</h2><p>${T('レベル')} ${P.level}　${T('ほたる')} ${P.fireflies.length}/${FIREFLY_LIST.length}　${T('といた もんだい')} ${P.learn.total}<br>${T('めいきゅうは {入|はい}る たびに かたちが かわる。<br>また ちょうせん してね。')}</p>`, 'キャンプへ', 'wide');
}

// ───── おみせ ─────
function openShop() {
  const { m } = openModal('', { cls: 'wide', onClose: () => { persist(); camp(); } });
  const draw = () => {
    $$(':scope > :not(.x)', m).forEach((n) => n.remove());
    const eq = (kind, cur, list) => {
      const n = nextEquip(P, kind);
      return `<div class="shop-eq"><span class="emo">${list[cur].emo}</span><span class="nm">${T(list[cur].name)}<small>${T('いまの そうび')}</small></span>
        ${n ? `<button class="btn small" data-eq="${kind}" ${P.gold < n.price ? 'disabled' : ''}>${n.emo} ${T(n.name)} <small>（${kind === 'weapon' ? T('こうげき') + ' +' + (n.atk - list[cur].atk) : T('ぼうぎょ') + ' +' + (n.def - list[cur].def)}）</small> 💰${n.price}</button>` : `<span class="sub">${T(cur >= 3 ? 'これより つよい ものは たからばこ から' : 'ボスを たおすと あたらしい ものが ならぶ')}</span>`}</div>`;
    };
    m.insertAdjacentHTML('beforeend', `<h2>🛒 ${T('おみせ')} <span class="pill">💰 <b>${P.gold}</b></span> <span class="pill">🎒 ${P.bag.length}/${BAG_MAX}</span></h2>
      <h3>${T('そうび')}</h3>${eq('weapon', P.weapon, WEAPONS)}${eq('shield', P.shield, SHIELDS)}
      <h3>${T('どうぐ')}</h3>
      <div class="item-list two">${SHOP_ITEMS.map((id) => `<button class="item" data-buy="${id}" ${P.gold < ITEMS[id].price || P.bag.length >= BAG_MAX ? 'disabled' : ''}><span class="emo">${ITEMS[id].emo}</span><span class="nm">${T(ITEMS[id].name)} <b>×${P.bag.filter((b) => b === id).length}</b><small>${T(ITEMS[id].text)}</small></span><span class="use">💰${ITEMS[id].price}</span></button>`).join('')}</div>`);
    $$('[data-buy]', m).forEach((b) => b.addEventListener('click', () => { if (!buyItem(P, b.dataset.buy)) { sfx('coin'); draw(); } }));
    $$('[data-eq]', m).forEach((b) => b.addEventListener('click', () => { if (!buyEquip(P, b.dataset.eq)) { sfx('upgrade'); draw(); } }));
  };
  draw();
}

// ───── もちもの（キャンプでは うる ことが できる）─────
function openBag() {
  const { m } = openModal('', { onClose: () => { persist(); camp(); } });
  const draw = () => {
    $$(':scope > :not(.x)', m).forEach((n) => n.remove());
    const ids = [...new Set(P.bag)];
    m.insertAdjacentHTML('beforeend', `<h2>🎒 ${T('もちもの')} <small>${P.bag.length}/${BAG_MAX}</small> <span class="pill">💰 <b>${P.gold}</b></span></h2>
      <p class="sub">${T('どうぐは めいきゅうの なかで つかう。いらない ものは ここで うれる。')}</p>
      <div class="item-list">${ids.map((id) => `<div class="item"><span class="emo">${ITEMS[id].emo}</span><span class="nm">${T(ITEMS[id].name)} <b>×${P.bag.filter((b) => b === id).length}</b><small>${T(ITEMS[id].text)}</small></span><button class="btn small gray" data-sell="${id}">${T('うる')} 💰${Math.max(5, Math.floor(ITEMS[id].price / 2))}</button></div>`).join('') || `<p class="sub">${T('なにも もっていない。')}</p>`}</div>`);
    $$('[data-sell]', m).forEach((b) => b.addEventListener('click', () => { sellItem(P, b.dataset.sell); sfx('coin'); draw(); }));
  };
  draw();
}

// ───── ずかん ─────
function openBook() {
  const mobs = Object.values(MOBS);
  openModal(`<h2>📖 ${T('ずかん')}</h2>
    <h3>${T('まもの')} ${Object.keys(P.seen).length}/${mobs.length}</h3>
    <div class="book">${mobs.map((d) => (P.seen[d.id]
      ? `<div class="book-item"><span class="emo">${d.emo}</span><div><b>${T(d.name)}</b>${d.boss ? ' <span class="tag boss">ボス</span>' : ''}<small>HP ${d.hp}　${T('こうげき')} ${d.atk}　${T('ぼうぎょ')} ${d.def}</small><div class="sub">${T(d.text)}</div></div></div>`
      : `<div class="book-item unknown"><span class="emo">❔</span><div><b>？？？</b></div></div>`)).join('')}</div>
    <h3>${T('ほたる')} ${P.fireflies.length}/${FIREFLY_LIST.length} <small>（1ぴき ごとに ${T('さいだい HP')} +${FIREFLY_HP}）</small></h3>
    <div class="book">${FIREFLY_LIST.map((f) => (P.fireflies.includes(f.id)
      ? `<div class="book-item"><span class="emo"><i class="ff-dot" style="--c:${f.hex}"></i></span><div><b>${T(f.name)}</b></div></div>`
      : `<div class="book-item unknown"><span class="emo">❔</span><div><b>？？？</b><div class="sub">${T(f.from === 'boss' ? `${f.floor}かいの ボスが とじこめている` : `${f.floors[0]}〜${f.floors[1]}かいの どこかに いる`)}</div></div></div>`)).join('')}</div>`, { cls: 'wide' });
}

void LAST_FLOOR;
title();
