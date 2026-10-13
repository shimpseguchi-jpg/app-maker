// せかいの どこかに うまれたら
// いま うまれる あかちゃんの ひとりに なって、その くにの くらしを おとなに なるまで たいけんし、
// その あとの しんがく・しごと・じんせいを みじかく よんで おわる。
import { COUNTRIES, AREA, WORLD, WORLD_BIRTHS, FETCHED, JAPAN, DREAMS, PLAYS, JOBS_FARM, JOBS_TOWN, nameFor } from './data.js';
import { sfx, setMuted, isMuted } from './audio.js';

const app = document.getElementById('app');
const SAVE_KEY = 'sekai-v1';

// ───── セーブ（ずかん） ─────
function load() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch (e) { return {}; }
}
function store(d) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(d)); } catch (e) { /* ほぞん できなくても あそべる */ }
}
const save = Object.assign({ met: {}, lives: 0, muted: false, mura: {}, past: [], auto: false, speed: 1 }, load());
setMuted(save.muted);

// ───── てつだい ─────
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rnd(a.length)];
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const of10 = (pct) => Math.round(pct / 10);
// 10にんの うちの にんずう（まるめて 0 に なる ときは「1にんも いない」）
const n10 = (pct) => (of10(pct) === 0 && pct > 0 ? '<b class="num">1</b>にんも いない' : `<b class="num">${of10(pct)}</b>にん`);
const per100 = (c) => (c.births / WORLD_BIRTHS) * 100;

function pickCountry() {
  const total = COUNTRIES.reduce((s, c) => s + c.births, 0);
  let r = Math.random() * total;
  for (const c of COUNTRIES) { r -= c.births; if (r < 0) return c; }
  return COUNTRIES[0];
}
function poisson(mean) {
  const L = Math.exp(-mean); let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}
// 「100にんの うち やく ○にん」（1にんに たりない ときは ことばで いう）
function babiesText(c) {
  const n = per100(c);
  if (n >= 0.95) return `やく <b class="num">${Math.round(n)}</b>にん`;
  if (n >= 0.4) return `やく <b class="num">1</b>にん`;
  return `<b class="num">1</b>にんも いない（<b class="num">${Math.round(WORLD_BIRTHS / c.births)}</b>にんに <b class="num">1</b>にん）`;
}
// にほんと くらべる（「にほんの やく 3ばい」「にほんの やく 5ぶんの1」）
function vsJapan(v, jp) {
  const r = v / jp;
  if (r >= 1.5) return `にほんの やく <b class="num">${Math.round(r)}</b>ばい`;
  if (r > 0.67) return 'にほんと だいたい おなじ';
  return `にほんの やく <b class="num">${Math.round(1 / r)}</b>ぶんの<b class="num">1</b>`;
}
// せつめいを かいて いない くにの まめちしき（すうじから つくる）
function autoFact(c) {
  const f = [];
  if (c.forest >= 60) f.push('くにの はんぶんより おおくが もりに おおわれて いるよ。');
  else if (c.forest < 3) f.push('もりが ほとんど ない くにだよ。');
  if (c.kids >= 40) f.push('こどもが とても おおい くに。10にんに 4にんいじょうが こどもだよ。');
  else if (c.urban >= 90) f.push('ほとんどの ひとが まちに すんで いるよ。');
  else if (c.urban < 25) f.push('おおくの ひとが いなかで くらして いるよ。');
  f.push(`くにの ひろさは ${vsJapan(c.land, JAPAN.land)}。`);
  return f.slice(0, 2).join('<br>');
}
const factOf = (c) => c.fact || autoFact(c);

const fmt = (n) => Math.round(n).toLocaleString('en-US');
// ねんれいで かわる アイコン
function avatar(age, g) {
  if (age < 3) return '👶';
  if (age < 13) return g === 'm' ? '👦' : '👧';
  if (age < 20) return '🧑';
  if (age < 60) return g === 'm' ? '👨' : '👩';
  return g === 'm' ? '👴' : '👵';
}
const gname = (g) => (g === 'm' ? 'おとこのこ' : 'おんなのこ');
const callName = () => (life.name ? `${life.name}` : 'あなた');
// その くにに うまれる かくりつ（こどもに わかる いいかた）と めずらしさ
function oddsText(c) {
  const per1000 = (c.births / WORLD_BIRTHS) * 1000;
  if (per1000 >= 1) return `<b class="num">1,000</b>にんに <b class="num">${Math.round(per1000)}</b>にん`;
  return `<b class="num">${fmt(WORLD_BIRTHS / c.births)}</b>にんに <b class="num">1</b>にん`;
}
function rarity(c) {
  const p = (c.births / WORLD_BIRTHS) * 100;
  return p >= 5 ? 1 : p >= 1 ? 2 : p >= 0.3 ? 3 : p >= 0.05 ? 4 : 5;
}
const addLog = (age, text) => life.log.push([age, text]);

function tenKids(n, on = '🧒', off = '🧒') {
  let s = '<div class="ten">';
  for (let i = 0; i < 10; i++) s += `<span class="${i < n ? 'on' : 'off'}">${i < n ? on : off}</span>`;
  return s + '</div>';
}

// ───── がめん ─────
let life = null;
const STAGES = [
  { key: 'family', age: 0 },
  { key: 'food', age: 3 },
  { key: 'hello', age: 5 },
  { key: 'home', age: 6 },
  { key: 'play', age: 8 },
  { key: 'area', age: 10 },
  { key: 'dream', age: 12 },
  { key: 'teen', age: 15 },
  { key: 'adult', age: 'adult' }, // その くにで おとなに なる ねんれい
];
const ageOf = (s) => (s.age === 'adult' ? life.c.adult : s.age);
const SUBJECTS = [
  { name: 'さんすう', emoji: '🔢', msg: 'かずの パズルが だいとくい！' },
  { name: 'こくご', emoji: '📚', msg: 'ほんを たくさん よんだよ。' },
  { name: 'りか', emoji: '🔬', msg: 'じっけんが だいすき！' },
  { name: 'たいいく', emoji: '🏃', msg: 'うんどうかいで おおかつやく！' },
  { name: 'おんがく', emoji: '🎵', msg: 'うたや がっきが じょうずに なったよ。' },
  { name: 'ずこう', emoji: '✂️', msg: 'すてきな さくひんを つくったよ。' },
  { name: 'がいこくご', emoji: '🌐', msg: 'ほかの くにの ことばも はなせるように なったよ。' },
];

function show(html, cls = '') {
  app.className = `screen ${cls}`;
  app.innerHTML = html;
  app.scrollTop = 0;
  window.scrollTo(0, 0);
}
function topbar(back = true) {
  return `<div class="topbar">
    ${back ? '<button class="mini" data-act="title">🏠 はじめに もどる</button>' : '<span></span>'}
    <button class="mini" data-act="mute" aria-label="おと">${isMuted() ? '🔇' : '🔊'}</button>
  </div>`;
}
function ageBar(i) {
  return `<div class="agebar">${STAGES.map((s, j) =>
    `<span class="${j < i ? 'done' : j === i ? 'now' : ''}"><b class="num">${ageOf(s)}</b>さい</span>`).join('')}</div>`;
}

function title() {
  const met = Object.keys(save.met).length;
  show(`${topbar(false)}
  <div class="hero">
    <div class="globe spin">🌏</div>
    <h1>せかいの どこかに<br>うまれたら</h1>
    <p class="lead">いま、せかいでは <b class="num">1</b>びょうに やく <b class="num">${Math.round(WORLD_BIRTHS / (365 * 24 * 3600))}</b>にんの あかちゃんが うまれて いるよ。<br>
    あなたも その ひとりに なって、どこかの くにで おおきく なって みよう！</p>
    <button class="btn big" data-act="born">👶 うまれる！</button>
    <div class="row">
      <button class="btn" data-act="zukan">📖 ずかん <small>${met}/${COUNTRIES.length}</small></button>
      <button class="btn" data-act="mura">🏘️ せかい 100にんむら</button>
      ${save.past.length ? '<button class="btn" data-act="past">📜 これまでの じんせい</button>' : ''}
    </div>
    <div class="row settings">
      <button class="mini ${save.auto ? 'on' : ''}" data-act="auto">🎲 おまかせ：${save.auto ? 'オン' : 'オフ'}</button>
      <button class="mini" data-act="speed">⏩ はやさ：<b class="num">${save.speed}</b>ばい</button>
    </div>
    <p class="sub">えらべるのは「うまれる」ことだけ。どこの だれに なるかは わからない。<br>おまかせに すると、えらぶのも ぜんぶ おまかせで じんせいを ながめられるよ。</p>
    <button class="link" data-act="parents">おうちの かたへ</button>
  </div>`, 'bg-sky');
}

// ルーレットで くにが きまる
function born() {
  const c = pickCountry();
  const kids = 1 + Math.min(8, poisson(Math.max(c.tfr - 1, 0)));
  const g = Math.random() < 0.512 ? 'm' : 'f'; // うまれる あかちゃんは おとこのこが すこし おおい
  const me = life = {
    c, stars: 0, g, name: nameFor(c, g),
    order: 1 + rnd(kids), // きょうだいの なんばんめ
    rural: Math.random() * 100 >= c.urban,
    sibs: Array.from({ length: kids - 1 }, () => pick(['👦', '👧'])),
    elec: Math.random() * 100 < c.elec,
    water: Math.random() * 100 < c.water,
    play: null, dream: null, subject: null, log: [],
  };
  show(`${topbar()}
  <div class="hero">
    <p class="lead">どこに うまれるかな…？</p>
    <div class="roulette" id="rl">🌏</div>
    <p class="rl-name" id="rlname">&nbsp;</p>
  </div>`, 'bg-sky');
  const el = document.getElementById('rl');
  const nm = document.getElementById('rlname');
  let t = 0, delay = 60;
  const step = () => {
    if (life !== me) return; // とちゅうで もどった
    if (delay > 320) { reveal(); return; }
    const x = t++ % 3 === 0 ? pickCountry() : pick(COUNTRIES);
    el.textContent = x.flag; nm.textContent = x.name;
    sfx('tick');
    delay *= 1.12;
    setTimeout(step, delay);
  };
  step();
}

function reveal() {
  const c = life.c;
  const a = AREA[c.area];
  const isNew = !save.met[c.id];
  sfx('fanfare');
  addLog(0, `${c.name}の ${life.rural ? 'いなか' : 'まち'}で、${gname(life.g)} として うまれた。${life.name ? `なまえは ${life.name}。` : ''}`);
  show(`${topbar()}
  <div class="card pop">
    <div class="flag-big">${c.flag}</div>
    <h2>おめでとう！<br>あなたは <span class="cname">${c.name}</span> で うまれたよ！</h2>
    ${isNew ? '<div class="newbadge">はじめての くに！</div>' : ''}
    <p class="area">${a.globe} ${a.name}の くに${c.capital ? ` ・ しゅと：${c.capital}` : ''}</p>
    <div class="idcard">
      <span class="idava">👶</span>
      <div><p>${life.rural ? '🌾 いなか' : '🏙️ まち'}の いえに、<b>${gname(life.g)}</b> として うまれたよ。</p>
      ${life.name ? `<p>なまえは <b class="pname">${life.name}</b>。</p>` : ''}</div>
    </div>
    <div class="info">
      <p>🎲 ${c.name}に うまれる かくりつは ${oddsText(c)}</p>
      <p class="rare">めずらしさ ${'★'.repeat(rarity(c))}<span>${'★'.repeat(5 - rarity(c))}</span></p>
      <p>📅 きょう ${c.name}で うまれた あかちゃんは やく <b class="num">${fmt(c.births / 365)}</b>にん<br><small>（せかいでは やく <b class="num">${fmt(WORLD_BIRTHS / 365)}</b>にん）</small></p>
    </div>
    <button class="btn big" data-act="next" data-i="0">おおきく なる ▶</button>
  </div>`, `bg-${c.area}`);
  autoStep();
}

function stage(i) {
  const s = STAGES[i];
  const c = life.c;
  const head = `${topbar()}${ageBar(i)}<div class="who">${avatar(ageOf(s), life.g)} <b>${callName()}</b> <small>${c.flag} ${c.name}</small></div>`;
  const cls = `bg-${c.area}`;
  if (s.key === 'family') {
    const n = life.sibs.length;
    addLog(0, n === 0 ? 'ひとりっこ。' : `${n + 1}にん きょうだいの ${life.order}ばんめ。`);
    show(`${head}<div class="card">
      <div class="agebig"><b class="num">0</b>さい</div>
      <h2>あなたの かぞく</h2>
      <div class="family">👨 👩 ${life.sibs.join(' ')} <span class="me">👶</span></div>
      <p>${n === 0 ? 'あなたは ひとりっこ だよ。' : `<b class="num">${n + 1}</b>にん きょうだいの <b class="num">${life.order}</b>ばんめ だよ！`}</p>
      <div class="info">
        <p>${c.name}では、おかあさん <b class="num">10</b>にんに こどもが やく <b class="num">${Math.round(c.tfr * 10)}</b>にん うまれるよ。</p>
        ${c.id === 'jp' ? '' : `<p class="jp">🇯🇵 にほんは <b class="num">${Math.round(JAPAN.tfr * 10)}</b>にん</p>`}
      </div>
      <button class="btn big" data-act="next" data-i="1">つぎへ ▶</button>
    </div>`, cls);
  } else if (s.key === 'food' && !c.rich) {
    compareQuiz(head, cls, i, 3, 'ひとの かず', 'ひとが おおいのは', c.pop, JAPAN.pop, `${c.name}の ひとの かずは ${vsJapan(c.pop, JAPAN.pop)}。`);
  } else if (s.key === 'hello' && !c.rich) {
    compareQuiz(head, cls, i, 5, 'くにの ひろさ', 'くにが ひろいのは', c.land, JAPAN.land, `${c.name}の ひろさは ${vsJapan(c.land, JAPAN.land)}。`);
  } else if (s.key === 'food') {
    const others = shuffle(COUNTRIES.filter((x) => x.rich && x.food !== c.food && x.foodEmoji !== c.foodEmoji)).slice(0, 2);
    const choices = shuffle([c, ...others]);
    quiz(head, cls, i, '<b class="num">3</b>さい', 'たべもの クイズ',
      `${c.name}で よく たべられて いる りょうりは どれかな？`,
      choices.map((x) => ({ label: `${x.foodEmoji} ${x.food}`, ok: x === c })),
      `${c.foodEmoji} <b>${c.food}</b> が だいすきに なったよ！`, [3, `${c.food}が だいすきに なった。`]);
  } else if (s.key === 'hello') {
    const others = shuffle(COUNTRIES.filter((x) => x.rich && x.hello !== c.hello)).slice(0, 2);
    const choices = shuffle([c, ...others]);
    quiz(head, cls, i, '<b class="num">5</b>さい', 'ことば クイズ',
      `${c.name}の ことばで「こんにちは」は どれかな？`,
      choices.map((x) => ({ label: `💬 ${x.hello}`, ok: x === c })),
      `${c.lang}で「<b>${c.hello}</b>」！ ともだちに あいさつ できたよ。`, [5, `${c.lang}で「${c.hello}」と あいさつ できるように なった。`]);
  } else if (s.key === 'home') {
    const e = of10(c.elec), w = of10(c.water);
    addLog(6, `${life.elec ? 'でんきの ある' : 'でんきの ない'} いえで くらした。${life.water ? '' : 'みずくみの おてつだいを した。'}`);
    show(`${head}<div class="card">
      <div class="agebig"><b class="num">6</b>さい</div>
      <h2>あなたの いえの くらし</h2>
      <div class="lifebox ${life.elec ? 'yes' : 'no'}">
        <div class="ico">${life.elec ? '💡' : '🕯️'}</div>
        <p>${life.elec
          ? 'いえで でんきが つかえるよ。よるも あかるい！'
          : 'いえには でんきが きて いないよ。よるは ランプや ろうそくで すごすよ。'}</p>
      </div>
      <div class="info"><p>こども <b class="num">10</b>にんの うち、でんきが つかえるのは やく <b class="num">${e}</b>にん</p>${tenKids(e, '💡', '🕯️')}</div>
      <div class="lifebox ${life.water ? 'yes' : 'no'}">
        <div class="ico">${life.water ? '🚰' : '🪣'}</div>
        <p>${life.water
          ? 'いえの ちかくで きれいな みずが てに はいるよ。'
          : 'きれいな みずは とおくに あるよ。あるいて みずくみの おてつだいを するよ。'}</p>
      </div>
      <div class="info"><p>こども <b class="num">10</b>にんの うち、ちかくで きれいな みずが てに はいるのは やく <b class="num">${w}</b>にん</p>${tenKids(w, '🚰', '🪣')}</div>
      ${c.id === 'jp' ? '' : `<p class="jp">🇯🇵 にほんは でんき <b class="num">${of10(JAPAN.elec)}</b>にん・みず <b class="num">${of10(JAPAN.water)}</b>にん</p>`}
      <button class="btn big" data-act="next" data-i="${i + 1}">つぎへ ▶</button>
    </div>`, cls);
  } else if (s.key === 'play') {
    const opts = shuffle([...(c.sport ? [c.sport] : []), ...shuffle(PLAYS).slice(0, c.sport ? 3 : 4)]);
    show(`${head}<div class="card">
      <div class="agebig"><b class="num">8</b>さい</div>
      <h2>ともだちと なにして あそぶ？</h2>
      <div class="choices">${opts.map((p) => `<button class="btn choice" data-act="play" data-v="${p}">${p}</button>`).join('')}</div>
      <div id="after"></div>
    </div>`, cls);
  } else if (s.key === 'area') {
    const wrong = shuffle(Object.keys(AREA).filter((k) => k !== c.area)).slice(0, 2);
    const choices = shuffle([c.area, ...wrong]);
    quiz(head, cls, i, '<b class="num">10</b>さい', 'ちず クイズ',
      `${c.name}は どこに ある くにかな？`,
      choices.map((k) => ({ label: `${AREA[k].globe} ${AREA[k].name}`, ok: k === c.area })),
      `${c.name}は <b>${AREA[c.area].name}</b>の くに。<br>📝 ${factOf(c)}`, [10, `じぶんの くにが ${AREA[c.area].name}に ある ことを しった。`]);
  } else if (s.key === 'dream') {
    const opts = shuffle(DREAMS).slice(0, 4);
    show(`${head}<div class="card">
      <div class="agebig"><b class="num">12</b>さい</div>
      <h2>おおきく なったら なにに なりたい？</h2>
      <div class="choices">${opts.map((d) => `<button class="btn choice" data-act="dream" data-v="${d.name}">${d.emoji} ${d.name}</button>`).join('')}</div>
      <div id="after"></div>
    </div>`, cls);
  } else if (s.key === 'teen') {
    const opts = shuffle(SUBJECTS).slice(0, 4);
    show(`${head}<div class="card">
      <div class="agebig"><b class="num">15</b>さい</div>
      <h2>がっこうで いちばん すきな べんきょうは？</h2>
      <div class="choices">${opts.map((x) => `<button class="btn choice" data-act="subject" data-v="${x.name}">${x.emoji} ${x.name}</button>`).join('')}</div>
      <div id="after"></div>
    </div>`, cls);
  } else if (s.key === 'adult') {
    addLog(c.adult, 'おとなの なかまいり。');
    show(`${head}<div class="card pop">
      <div class="agebig"><b class="num">${c.adult}</b>さい</div>
      <div class="flag-big">🎉</div>
      <h2>おとなの なかまいり！</h2>
      <p>${c.name}では <b class="num">${c.adult}</b>さいで おとなに なるよ。</p>
      ${c.id === 'jp' ? '' : `<p class="jp">🇯🇵 にほんは <b class="num">${JAPAN.adult}</b>さい</p>`}
      <div class="info"><p>${c.flag} ${c.name}で うまれて、<b class="num">${c.adult}</b>ねん。<br>${c.rich ? `${c.foodEmoji} ${c.food}を たべて、「${c.hello}」と あいさつして、` : ''}${life.play}で あそんで おおきく なったね。</p></div>
      <button class="btn big" data-act="next" data-i="${i + 1}">そのあとの じんせいを みる ▶</button>
    </div>`, cls);
  }
}

function choose(act, v, msg) {
  app.querySelectorAll(`[data-act=${act}]`).forEach((b) => { b.disabled = true; if (b.dataset.v === v) b.classList.add('right'); });
  const i = STAGES.findIndex((x) => x.key === (act === 'dream' ? 'dream' : 'teen'));
  document.getElementById('after').innerHTML = `
    <div class="info"><p>${msg}</p></div>
    <button class="btn big" data-act="next" data-i="${i + 1}">つぎへ ▶</button>`;
}

// にほんと くらべる 2たく クイズ（せつめいを かいて いない くに よう）
function compareQuiz(head, cls, i, age, label, q, v, jp, win) {
  const c = life.c;
  quiz(head, cls, i, `<b class="num">${age}</b>さい`, `${label} クイズ`,
    `${c.name}と にほん、${q} どっち？`,
    [{ label: `${c.flag} ${c.name}`, ok: v >= jp }, { label: '🇯🇵 にほん', ok: v < jp }],
    win, [age, `${label}を にほんと くらべて みた。`]);
}

function quiz(head, cls, i, age, label, q, choices, win, log) {
  show(`${head}<div class="card">
    <div class="agebig">${age}</div>
    <div class="qlabel">❓ ${label}</div>
    <h2>${q}</h2>
    <div class="choices">${choices.map((ch, k) => `<button class="btn choice" data-act="answer" data-k="${k}">${ch.label}</button>`).join('')}</div>
    <div id="after"></div>
  </div>`, cls);
  life.quiz = { choices, win, i, log };
}

function answer(k, btn) {
  const qz = life.quiz;
  if (!qz || qz.done) return;
  qz.done = true;
  const ok = qz.choices[k].ok;
  if (ok) life.stars++;
  if (qz.log) addLog(...qz.log);
  sfx(ok ? 'ok' : 'ng');
  app.querySelectorAll('[data-act=answer]').forEach((b, j) => {
    b.disabled = true;
    if (qz.choices[j].ok) b.classList.add('right');
    else if (b === btn) b.classList.add('wrong');
  });
  document.getElementById('after').innerHTML = `
    <p class="result ${ok ? 'ok' : 'ng'}">${ok ? '⭐ せいかい！' : 'おしい！ こたえは みどりの ボタンだよ。'}</p>
    <div class="info"><p>${qz.win}</p></div>
    <button class="btn big" data-act="next" data-i="${qz.i + 1}">つぎへ ▶</button>`;
}

function play(v) {
  const c = life.c;
  if (life.play) return;
  life.play = v;
  addLog(8, `ともだちと ${v}を して あそんだ。`);
  sfx('ok');
  app.querySelectorAll('[data-act=play]').forEach((b) => { b.disabled = true; if (b.dataset.v === v) b.classList.add('right'); });
  document.getElementById('after').innerHTML = `
    <div class="info"><p>${v === c.sport
      ? `${c.name}では <b>${c.sport}</b>が だいにんき！ みんなで もりあがったよ。`
      : `<b>${v}</b>で あそんだよ！ たのしかったね。${c.sport ? `<br>${c.name}では <b>${c.sport}</b>も だいにんき だよ。` : ''}`}</p></div>
    <button class="btn big" data-act="next" data-i="${STAGES.findIndex((x) => x.key === 'play') + 1}">つぎへ ▶</button>`;
}

// おとなに なった あとの じんせい（しんがく → しごと → かぞく → まご → としを とる）
// しを えがかず、「いまも くらして いる」で おわる。
function grownUp() {
  const c = life.c;
  const d = DREAMS.find((x) => x.name === life.dream);
  const uni = Math.random() * 100 < c.uni;
  const hit = Math.random() < (d.uni ? (uni ? 0.8 : 0) : (uni ? 0.7 : 0.5));
  const job = hit ? d : pick(Math.random() * 100 < c.agri ? JOBS_FARM : JOBS_TOWN);
  const a0 = c.adult;
  if (uni) addLog(a0, `だいがくに すすんで、${d.study}を まなんだ。`);
  else addLog(a0, 'がっこうを おえて、はたらきはじめた。');
  const workAge = uni ? Math.max(a0 + 4, 22) : a0;
  addLog(workAge, hit ? `ゆめだった ${job.name}に なった！ ${job.end}` : `${job.name}に なった。${job.end}`);
  const family = Math.random() < 0.85;
  const kids = family ? Math.min(9, poisson(c.tfr)) : 0;
  let gkids = 0;
  if (family) {
    const wed = workAge + 2 + rnd(8);
    addLog(wed, 'たいせつな ひとと かぞくに なった。');
    if (kids > 0) addLog(wed + 1 + rnd(3), `こどもが うまれた。こどもは ぜんぶで ${kids}にん。`);
    for (let k = 0; k < kids; k++) gkids += Math.random() < 0.85 ? poisson(c.tfr) : 0;
    if (gkids > 0) addLog(wed + 28 + rnd(6), `まごが うまれた。${life.g === 'm' ? 'おじいちゃん' : 'おばあちゃん'}に なった！`);
  } else {
    addLog(workAge + 5 + rnd(10), 'ともだちや しごとの なかまに かこまれて、にぎやかに くらした。');
  }
  // としを とった ねんれい：その くにの へいきんじゅみょう ふきん（60さい いじょう）
  const le = (life.g === 'm' ? life.c.lem : life.c.lef) || 72;
  const old = Math.max(60, le - 5 + rnd(16));
  const where = life.rural ? 'いなか' : 'まち';
  addLog(old, `${old}さい。いまも ${c.name}の ${where}で、${gkids ? `まご ${gkids}にんと ` : kids ? `こども ${kids}にんと ` : ''}たのしく くらして いる。`);
  life.log.sort((x, y) => x[0] - y[0]);
  return { job, hit, uni, kids, gkids, old };
}

function lifeTitle(c, g) {
  return `${c.name}の ${life.rural ? 'いなか' : 'まち'}で ${gname(life.g)} として うまれ、${g.job.name}として いきた${life.name ? ` ${life.name}の` : ''} じんせい`;
}

let lastShare = '';
function ending() {
  const c = life.c;
  const g = grownUp();
  const isNew = !save.met[c.id];
  save.met[c.id] = (save.met[c.id] || 0) + 1;
  save.lives++;
  const headline = lifeTitle(c, g);
  save.past.unshift({ flag: c.flag, g: life.g, job: `${g.job.emoji} ${g.job.name}`, old: g.old, text: headline });
  save.past = save.past.slice(0, 30);
  store(save);
  sfx('fanfare');
  lastShare = `${c.flag} ${headline}\n` + life.log.map(([a, t]) => `${a}さい ${t}`).join('\n') + '\n#せかいのどこかにうまれたら';
  const row = (label, a, b, key) => `<tr><th>${label}</th><td>${a}${c.estimated.includes(key) ? '<small>※</small>' : ''}</td>${c.id === 'jp' ? '' : `<td>${b}</td>`}</tr>`;
  show(`${topbar()}<div class="card pop">
    <div class="flag-big">${c.flag}<span class="oldava">${avatar(g.old, life.g)}</span></div>
    <h2 class="headline">${headline}</h2>
    <div class="stars">${'⭐'.repeat(life.stars)}${'☆'.repeat(3 - life.stars)}</div>
    ${isNew ? `<div class="stamp">${c.flag}<span>ずかんに<br>スタンプ！</span></div>` : ''}
    <h3 class="loghead">📖 じんせいの きろく</h3>
    <ol class="lifelog">${life.log.map(([a, t], k) => `<li style="animation-delay:${Math.min(k * 0.08, 1.2)}s"><span class="age"><b class="num">${a}</b>さい</span><span class="ava">${avatar(a, life.g)}</span><p>${t}</p></li>`).join('')}</ol>
    <p class="owari">おしまい</p>
    <button class="btn" data-act="share">📋 きろくを コピー</button>
    <p class="sub" id="shared" hidden>コピー したよ。おうちの ひとに みせてね。</p>
    <div class="summary">
      <h3>くらべて みよう</h3>
      <table class="cmp">
        <tr><th></th><td>${c.flag} ${c.name}</td>${c.id === 'jp' ? '' : `<td>🇯🇵 にほん</td>`}</tr>
        ${row('💡 でんきが つかえる<br><small>（こども 10にんの うち）</small>', `<b class="num">${of10(c.elec)}</b>にん`, `<b class="num">${of10(JAPAN.elec)}</b>にん`)}
        ${row('🚰 ちかくに きれいな みず<br><small>（こども 10にんの うち）</small>', `<b class="num">${of10(c.water)}</b>にん`, `<b class="num">${of10(JAPAN.water)}</b>にん`)}
        ${row('🎓 だいがくなどで まなぶ<br><small>（わかもの 10にんの うち）</small>', n10(c.uni), n10(JAPAN.uni), 'uni')}
        ${row('🧑‍🌾 のうぎょうで はたらく<br><small>（おとな 10にんの うち）</small>', n10(c.agri), n10(JAPAN.agri), 'agri')}
        ${row('🎉 おとなに なる ねんれい', `<b class="num">${c.adult}</b>さい`, `<b class="num">${JAPAN.adult}</b>さい`)}
        ${row('👶 うまれる こども<br><small>（おかあさん 10にんで）</small>', `<b class="num">${Math.round(c.tfr * 10)}</b>にん`, `<b class="num">${Math.round(JAPAN.tfr * 10)}</b>にん`)}
        ${row('🎲 うまれる かくりつ', oddsText(c), oddsText(JAPAN))}
      </table>
      ${c.estimated.some((k) => k === 'uni' || k === 'agri') ? '<p class="sub">※ この くにの データが ないので、おなじ たいりくの へいきん</p>' : ''}
    </div>
    <button class="btn big" data-act="born">👶 もう いちど うまれる</button>
    <div class="row">
      <button class="btn" data-act="past">📜 これまでの じんせい</button>
      <button class="btn" data-act="zukan">📖 ずかん</button>
      <button class="btn" data-act="title">🏠 はじめに もどる</button>
    </div>
  </div>`, `bg-${c.area}`);
  life = null;
}

// きろくを コピー（クリップボードが つかえない ときは テキストを えらぶ）
function copyShare() {
  const done = () => { const el = document.getElementById('shared'); if (el) el.hidden = false; };
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = lastShare; document.body.appendChild(ta); ta.select();
    try { if (document.execCommand('copy')) done(); } catch (e) { /* できなくても すすめる */ }
    ta.remove();
  };
  try { navigator.clipboard.writeText(lastShare).then(done, fallback); } catch (e) { fallback(); }
}

// これまでの じんせい
function past() {
  show(`${topbar()}<div class="card wide">
    <h2>📜 これまでの じんせい</h2>
    <p class="sub">これまでに うまれた <b class="num">${save.lives}</b>かいの うち、あたらしい <b class="num">${save.past.length}</b>かい</p>
    <ol class="past">${save.past.map((x) => `<li><span class="pf">${x.flag}</span><div><p>${x.text}</p><small>${x.job} ・ ${avatar(x.old, x.g)} <b class="num">${x.old}</b>さい</small></div></li>`).join('')}</ol>
    <button class="btn big" data-act="born">👶 うまれる</button>
  </div>`, 'bg-sky');
}

// ずかん
function zukan(sel) {
  const met = Object.keys(save.met).length;
  const c = sel && COUNTRIES.find((x) => x.id === sel);
  show(`${topbar()}<div class="card wide">
    <h2>📖 くにの ずかん <small><b class="num">${met}</b> / <b class="num">${COUNTRIES.length}</b></small></h2>
    <p class="sub">うまれた ことの ある くにに スタンプが つくよ。ぜんぶ あつめられるかな？</p>
    ${c ? `<div class="detail">
      <div class="flag-mid">${c.flag}</div>
      <div><h3>${c.name}</h3>
      <p>${AREA[c.area].globe} ${AREA[c.area].name}${c.capital ? ` ・ しゅと：${c.capital}` : ''}</p>
      ${c.rich ? `<p>💬 ${c.hello}（${c.lang}） ・ ${c.foodEmoji} ${c.food}</p>` : ''}
      <p>📝 ${factOf(c)}</p>
      <p>🍼 あかちゃん <b class="num">100</b>にんの うち ${babiesText(c)} ・ うまれた かいすう <b class="num">${save.met[c.id]}</b></p></div>
    </div>` : ''}
    ${Object.entries(AREA).map(([k, a]) => {
      const xs = COUNTRIES.filter((x) => x.area === k);
      return `<h3 class="zhead">${a.globe} ${a.name} <small><b class="num">${xs.filter((x) => save.met[x.id]).length}</b> / <b class="num">${xs.length}</b></small></h3>
      <div class="zgrid">${xs.map((x) => save.met[x.id]
        ? `<button class="zcell got ${x.id === sel ? 'sel' : ''}" data-act="zsel" data-v="${x.id}"><span>${x.flag}</span><small>${x.name}</small></button>`
        : '<div class="zcell"><span>❔</span><small>？？？</small></div>').join('')}</div>`;
    }).join('')}
    <p class="sub">これまでに うまれた かいすう：<b class="num">${save.lives}</b></p>
  </div>`, 'bg-sky');
}

// あかちゃん 100にん
function hundred() {
  // 100にんを くにごとに わける（はしたは おおきい じゅんに 1にんずつ）
  const items = COUNTRIES.map((c) => ({ c, v: per100(c) }));
  const rest = { c: null, v: 100 - items.reduce((s, x) => s + x.v, 0) };
  const all = [...items, rest];
  all.forEach((x) => { x.n = Math.floor(x.v); });
  let left = 100 - all.reduce((s, x) => s + x.n, 0);
  for (const x of all.slice().sort((a, b) => (b.v - b.n) - (a.v - a.n))) { if (left-- <= 0) break; x.n++; }
  const other = rest.n;
  const shown = items.filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
  const cells = [];
  shown.forEach((x) => { for (let i = 0; i < x.n; i++) cells.push(x.c.flag); });
  while (cells.length < 100) cells.push('🌐');
  show(`${topbar()}<div class="card wide">
    <h2>🍼 せかいの あかちゃん <b class="num">100</b>にん</h2>
    <p class="sub">いま せかいで うまれる あかちゃんを <b class="num">100</b>にん あつめると、こんな くにで うまれるよ。</p>
    <div class="grid100">${cells.map((f) => `<span>${f}</span>`).join('')}</div>
    <ul class="legend">${shown.map((x) => `<li>${x.c.flag} ${x.c.name} <b class="num">${x.n}</b>にん</li>`).join('')}
      <li>🌐 そのほかの くに <b class="num">${other}</b>にん</li></ul>
    <p class="sub">🇯🇵 にほんで うまれるのは ${babiesText(JAPAN)}。</p>
    <button class="btn" data-act="mura">🏘️ 100にんむらへ もどる</button>
  </div>`, 'bg-sky');
}

function parents() {
  show(`${topbar()}<div class="card wide parents">
    <h2>おうちの かたへ</h2>
    <p>いま生まれてくる赤ちゃんの一人として、世界のどこかの国にランダムに生まれ、0歳からその国で成人する年齢までの暮らしを体験し、最後にその後の進学・仕事・人生をみじかく読んで終わるゲームです。
    生まれる国は、実際にその国で生まれる赤ちゃんの数に比例した確率で、世界の${COUNTRIES.length}か国から決まります。
    そのうち赤ちゃんの数が多い${COUNTRIES.filter((c) => c.rich).length}か国には、あいさつ・料理などの説明とクイズがあります。それ以外の国では、日本とくらべる数字のクイズになります。</p>
    <p>Web ゲーム「80億分の1」（1in8b.life）の、統計どおりに世界のどこかに生まれて一生を見守るというアイデアへのオマージュです（元の作品は15歳以上向け。このゲームは別に作ったもので、文章や絵は使っていません）。
    「おまかせ」をオンにすると、選択も自動で進み、人生を上から眺められます。年をとった後は描かず「いまも くらして いる」で終わります。</p>
    <p>「せかい 100にんむら」では、世界を100人の村にしたら何人が電気を使えるか、などを予想してから答え合わせします。</p>
    <p>きょうだいの数・家の電気・近くのきれいな水・大学などへの進学・農業の仕事につくかどうかは、その国の統計の割合にしたがってランダムに決まります。
    小学校低学年でも読めるよう、数は「10人のうち何人」「100人のうち何人」にまるめています。</p>
    <h3>使っているデータ</h3>
    <p>世界銀行 World Development Indicators の、各国のいちばん新しい値です（${FETCHED} に取得。2010年より古い値は使っていません）。
    元になっている統計は国連・WHO/UNICEF・UNESCO・ILO などです。</p>
    <ul>
      <li>人口・出生率（出生数＝人口×出生率）・合計特殊出生率</li>
      <li>電気を使える人・基本的な飲み水を使える人・基本的なトイレを使える人の割合</li>
      <li>大学などで学ぶ若者の割合（高等教育総就学率。100%をこえる国は100%）</li>
      <li>農業で働く人の割合（働く人のうち）・都市に住む人・0〜14歳・インターネットを使う人の割合</li>
      <li>森林の割合・国土の広さ</li>
    </ul>
    <p>値がない国は、同じ大陸の国の平均で補っています（画面に ※ がつきます）。成人年齢は各国の民法などの成年年齢です。</p>
    <p>病気・事故・戦争・死など、低学年の子どもにとって重い出来事は扱っていません。
    「どうして でんきが ない いえが あるのかな？」など、遊んだあとにお子さんと話すきっかけにしてみてください。</p>
    <p class="sub">記録（ずかん）はこの端末のブラウザにだけ保存されます。</p>
    <button class="btn" data-act="reset">ずかんを けす</button>
  </div>`, 'bg-sky');
}

// ───── せかい 100にんむら ─────
// せかいを 100にんの むらに したら？ よそうしてから こたえあわせ する。
const areaPct = (k) => (COUNTRIES.filter((c) => c.area === k).reduce((t, c) => t + c.pop, 0) / WORLD.pop) * 100;
// たいりくごとの にんずう（ごうけいが ちょうど 100にんに なるように まるめる）
function areaParts() {
  const parts = Object.keys(AREA).map((k) => ({ k, v: areaPct(k) }));
  const sum = parts.reduce((t, x) => t + x.v, 0);
  parts.forEach((x) => { x.v = (x.v / sum) * 100; x.n = Math.floor(x.v); });
  let left = 100 - parts.reduce((t, x) => t + x.n, 0);
  for (const x of parts.slice().sort((a, b) => (b.v - b.n) - (a.v - a.n))) { if (left-- <= 0) break; x.n++; }
  return parts.sort((a, b) => b.n - a.n);
}
const TOPICS = [
  { key: 'asia', title: 'アジアに すむ ひと', icon: '🌏', on: '🌏', q: 'アジアに すんで いる ひとは なんにん？', v: () => areaParts().find((x) => x.k === 'asia').n, region: true },
  { key: 'kids', title: 'こども', icon: '🧒', on: '🧒', q: 'こども（<b class="num">14</b>さいまで）は なんにん？' },
  { key: 'urban', title: 'まちに すむ', icon: '🏙️', on: '🏙️', off: '🏡', q: 'まちに すんで いる ひとは なんにん？' },
  { key: 'elec', title: 'でんき', icon: '💡', on: '💡', q: 'いえで でんきが つかえる ひとは なんにん？' },
  { key: 'water', title: 'きれいな みず', icon: '🚰', on: '🚰', q: 'ちかくで きれいな みずが てに はいる ひとは なんにん？' },
  { key: 'toilet', title: 'トイレ', icon: '🚽', on: '🚽', q: 'きちんとした トイレが つかえる ひとは なんにん？' },
  { key: 'net', title: 'インターネット', icon: '📱', on: '📱', q: 'インターネットを つかう ひとは なんにん？' },
  { key: 'agri', title: 'のうぎょう', icon: '🧑‍🌾', on: '🧑‍🌾', q: 'はたらく おとな <b class="num">100</b>にんの うち、のうぎょうで はたらく ひとは なんにん？' },
  { key: 'forest', title: 'もり', icon: '🌳', on: '🌳', off: '🟫', unit: 'マス', q: 'ちきゅうの りくちを <b class="num">100</b>マスに わけると、もりは なんマス？' },
];
let muraState = null;

function mura() {
  muraState = null;
  const total = TOPICS.reduce((t, x) => t + (save.mura[x.key] || 0), 0);
  show(`${topbar()}<div class="card wide">
    <h2>🏘️ せかい <b class="num">100</b>にんむら</h2>
    <p class="sub">せかいの <b class="num">${Math.round(WORLD.pop / 1e8)}</b>おくにんを <b class="num">100</b>にんの むらに したら、どんな むらに なるかな？<br>
    よそうして から こたえあわせ しよう。ちかいほど ほしが もらえるよ。</p>
    <div class="topics">${TOPICS.map((x) => `<button class="btn topic" data-act="topic" data-v="${x.key}">
      <span class="ti">${x.icon}</span><span>${x.title}</span>
      <small>${'⭐'.repeat(save.mura[x.key] || 0)}${'☆'.repeat(3 - (save.mura[x.key] || 0))}</small></button>`).join('')}
      <button class="btn topic" data-act="hundred"><span class="ti">🍼</span><span>あかちゃん</span><small>みるだけ</small></button>
    </div>
    <p class="sub">あつめた ほし <b class="num">${total}</b> / <b class="num">${TOPICS.length * 3}</b></p>
  </div>`, 'bg-sky');
}

function topic(key) {
  const t = TOPICS.find((x) => x.key === key);
  const v = t.v ? t.v() : WORLD[key];
  muraState = { t, v, ans: Math.round(v), guess: null, done: false };
  const unit = t.unit || 'にん';
  show(`${topbar()}<div class="card wide">
    <div class="qlabel">${t.icon} せかい <b class="num">100</b>にんむら</div>
    <h2>${t.q}</h2>
    <p class="sub" id="ghint">${t.unit ? 'マス' : 'ひと'}を タッチして よそうしてね</p>
    <div class="vgrid" id="vg">${Array.from({ length: 100 }, (_, i) => `<button class="vc" data-act="g" data-v="${i + 1}" aria-label="${i + 1}">${t.unit ? '⬜' : '🧑'}</button>`).join('')}</div>
    <div class="row" id="gbar">
      <button class="btn" data-act="gstep" data-v="-1">−</button>
      <p class="gnum">よそう <b class="num" id="gv">？</b>${unit}</p>
      <button class="btn" data-act="gstep" data-v="1">＋</button>
    </div>
    <div id="after"><button class="btn big" data-act="check" id="chk" disabled>こたえあわせ ▶</button></div>
    <button class="link" data-act="mura">もどる</button>
  </div>`, 'bg-sky');
}

function setGuess(n) {
  const m = muraState;
  if (!m || m.done) return;
  m.guess = n;
  document.getElementById('gv').textContent = n;
  document.getElementById('chk').disabled = false;
  document.querySelectorAll('#vg .vc').forEach((el, i) => el.classList.toggle('g', i < n));
}

function check() {
  const m = muraState;
  if (!m || m.done || m.guess == null) return;
  m.done = true;
  const { t, ans, guess } = m;
  const unit = t.unit || 'にん';
  const diff = Math.abs(guess - ans);
  const stars = diff <= 5 ? 3 : diff <= 15 ? 2 : 1;
  save.mura[t.key] = Math.max(save.mura[t.key] || 0, stars);
  store(save);
  sfx(stars === 3 ? 'fanfare' : 'ok');
  document.getElementById('gbar').hidden = true;
  document.getElementById('ghint').hidden = true;
  const cells = [...document.querySelectorAll('#vg .vc')];
  // たいりくの ときは ぜんぶの たいりくで ぬりわける
  let paint = [];
  let legend = '';
  if (t.region) {
    const parts = areaParts();
    parts.forEach((x) => { for (let i = 0; i < x.n; i++) paint.push(`a-${x.k}`); });
    legend = `<ul class="legend">${parts.map((x) => `<li><span class="sw a-${x.k}"></span>${AREA[x.k].name} <b class="num">${x.n}</b>にん</li>`).join('')}</ul>`;
  } else {
    paint = cells.map((_, i) => (i < ans ? 'on' : 'off'));
  }
  cells.forEach((el, i) => {
    el.disabled = true;
    setTimeout(() => {
      el.classList.remove('g');
      el.classList.add(paint[i] || 'off');
      if (!t.region) el.textContent = i < ans ? t.on : (t.off || '🧑');
      if (i < guess) el.classList.add('was');
    }, i * 12);
  });
  const jp = t.region ? '' : JAPAN[t.key] != null ? `<p class="jp">🇯🇵 にほんを <b class="num">100</b>${unit === 'マス' ? 'マス' : 'にんの むら'}に すると <b class="num">${Math.round(JAPAN[t.key])}</b>${unit}</p>` : '';
  document.getElementById('after').innerHTML = `
    <p class="result ok">こたえは <b class="num">${ans}</b>${unit}！ <span class="sub">（あなたの よそう <b class="num">${guess}</b>${unit}）</span></p>
    <div class="stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
    ${legend}${jp}
    <button class="btn big" data-act="mura">ほかの テーマ ▶</button>`;
}

// ───── そうさ ─────
app.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  const act = b.dataset.act;
  if (act !== 'mute') sfx('tap');
  if (act === 'title') { life = null; title(); }
  else if (act === 'born') born();
  else if (act === 'next') { const i = +b.dataset.i; if (i < STAGES.length) stage(i); else ending(); }
  else if (act === 'answer') answer(+b.dataset.k, b);
  else if (act === 'play') play(b.dataset.v);
  else if (act === 'dream' && !life.dream) {
    life.dream = b.dataset.v;
    const d = DREAMS.find((x) => x.name === life.dream);
    addLog(12, `しょうらいの ゆめは ${d.name}。`);
    choose('dream', life.dream, `${d.emoji} <b>${d.name}</b>に なりたいな！ ゆめに むかって がんばろう。`);
  } else if (act === 'subject' && !life.subject) {
    life.subject = b.dataset.v;
    const x = SUBJECTS.find((y) => y.name === life.subject);
    addLog(15, `${x.name}が いちばん すきな べんきょうに なった。`);
    choose('subject', life.subject, `${x.emoji} <b>${x.name}</b>が いちばん すき！ ${x.msg}`);
  }
  else if (act === 'zukan') zukan();
  else if (act === 'zsel') zukan(b.dataset.v);
  else if (act === 'hundred') hundred();
  else if (act === 'mura') mura();
  else if (act === 'past') past();
  else if (act === 'share') copyShare();
  else if (act === 'auto') { save.auto = !save.auto; store(save); title(); }
  else if (act === 'speed') { save.speed = save.speed >= 4 ? 1 : save.speed * 2; store(save); title(); }
  else if (act === 'topic') topic(b.dataset.v);
  else if (act === 'g') setGuess(+b.dataset.v);
  else if (act === 'gstep') setGuess(Math.max(0, Math.min(100, (muraState?.guess || 0) + +b.dataset.v)));
  else if (act === 'check') check();
  else if (act === 'parents') parents();
  else if (act === 'mute') { save.muted = !isMuted(); setMuted(save.muted); store(save); b.textContent = isMuted() ? '🔇' : '🔊'; }
  else if (act === 'reset') {
    // 2かい おすと けす（ダイアログが つかえない ばしょでも うごくように）
    if (b.dataset.sure) { save.met = {}; save.lives = 0; store(save); title(); }
    else { b.dataset.sure = '1'; b.textContent = 'ほんとうに けす？ もう いちど おしてね'; }
  }
  autoStep();
});

// おまかせ：えらぶのも すすむのも じどうで、じんせいを うえから ながめる
let autoT = 0;
function autoStep() {
  clearTimeout(autoT);
  if (!save.auto || !life) return;
  const me = life;
  autoT = setTimeout(() => {
    if (life !== me) return;
    const opts = [...app.querySelectorAll('[data-act=answer],[data-act=play],[data-act=dream],[data-act=subject]')].filter((x) => !x.disabled);
    const t = opts.length ? pick(opts) : app.querySelector('[data-act=next]');
    if (t) t.click();
  }, 2400 / save.speed);
}

title();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
