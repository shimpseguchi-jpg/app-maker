// せかいの どこかに うまれたら
// いま うまれる あかちゃんの ひとりに なって、その くにの くらしを おとなに なるまで たいけんし、
// その あとの しんがく・しごと・じんせいを みじかく よんで おわる。
import { COUNTRIES, AREA, WORLD_BIRTHS, JAPAN, DREAMS, PLAYS, JOBS_FARM, JOBS_TOWN } from './data.js';
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
const save = Object.assign({ met: {}, lives: 0, muted: false }, load());
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
    <p class="lead">いま、せかいでは <b class="num">1</b>びょうに やく <b class="num">4</b>にんの あかちゃんが うまれて いるよ。<br>
    あなたも その ひとりに なって、どこかの くにで おおきく なって みよう！</p>
    <button class="btn big" data-act="born">👶 うまれる！</button>
    <div class="row">
      <button class="btn" data-act="zukan">📖 ずかん <small>${met}/${COUNTRIES.length}</small></button>
      <button class="btn" data-act="hundred">🍼 あかちゃん 100にん</button>
    </div>
    <button class="link" data-act="parents">おうちの かたへ</button>
  </div>`, 'bg-sky');
}

// ルーレットで くにが きまる
function born() {
  const c = pickCountry();
  const kids = 1 + Math.min(8, poisson(Math.max(c.tfr - 1, 0)));
  const me = life = {
    c, stars: 0,
    sibs: Array.from({ length: kids - 1 }, () => pick(['👦', '👧'])),
    elec: Math.random() * 100 < c.elec,
    water: Math.random() * 100 < c.water,
    play: null, dream: null, subject: null,
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
  show(`${topbar()}
  <div class="card pop">
    <div class="flag-big">${c.flag}</div>
    <h2>おめでとう！<br>あなたは <span class="cname">${c.name}</span> で うまれたよ！</h2>
    ${isNew ? '<div class="newbadge">はじめての くに！</div>' : ''}
    <p class="area">${a.globe} ${a.name}の くに ・ しゅと：${c.capital}</p>
    <div class="info">
      <p>🍼 いま せかいで うまれる あかちゃんを <b class="num">100</b>にん あつめると、<br>${c.name}で うまれるのは ${babiesText(c)}。</p>
    </div>
    <button class="btn big" data-act="next" data-i="0">おおきく なる ▶</button>
  </div>`, `bg-${c.area}`);
}

function stage(i) {
  const s = STAGES[i];
  const c = life.c;
  const head = `${topbar()}${ageBar(i)}`;
  const cls = `bg-${c.area}`;
  if (s.key === 'family') {
    const n = life.sibs.length;
    show(`${head}<div class="card">
      <div class="agebig"><b class="num">0</b>さい</div>
      <h2>あなたの かぞく</h2>
      <div class="family">👨 👩 ${life.sibs.join(' ')} <span class="me">👶</span></div>
      <p>${n === 0 ? 'あなたは ひとりっこ だよ。' : `きょうだいが <b class="num">${n}</b>にん いるよ！`}</p>
      <div class="info">
        <p>${c.name}では、おかあさん <b class="num">10</b>にんに こどもが やく <b class="num">${Math.round(c.tfr * 10)}</b>にん うまれるよ。</p>
        ${c.id === 'jp' ? '' : `<p class="jp">🇯🇵 にほんは <b class="num">${Math.round(JAPAN.tfr * 10)}</b>にん</p>`}
      </div>
      <button class="btn big" data-act="next" data-i="1">つぎへ ▶</button>
    </div>`, cls);
  } else if (s.key === 'food') {
    const others = shuffle(COUNTRIES.filter((x) => x.food !== c.food && x.foodEmoji !== c.foodEmoji)).slice(0, 2);
    const choices = shuffle([c, ...others]);
    quiz(head, cls, i, '<b class="num">3</b>さい', 'たべもの クイズ',
      `${c.name}で よく たべられて いる りょうりは どれかな？`,
      choices.map((x) => ({ label: `${x.foodEmoji} ${x.food}`, ok: x === c })),
      `${c.foodEmoji} <b>${c.food}</b> が だいすきに なったよ！`);
  } else if (s.key === 'hello') {
    const others = shuffle(COUNTRIES.filter((x) => x.hello !== c.hello)).slice(0, 2);
    const choices = shuffle([c, ...others]);
    quiz(head, cls, i, '<b class="num">5</b>さい', 'ことば クイズ',
      `${c.name}の ことばで「こんにちは」は どれかな？`,
      choices.map((x) => ({ label: `💬 ${x.hello}`, ok: x === c })),
      `${c.lang}で「<b>${c.hello}</b>」！ ともだちに あいさつ できたよ。`);
  } else if (s.key === 'home') {
    const e = of10(c.elec), w = of10(c.water);
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
    const opts = shuffle([c.sport, ...shuffle(PLAYS).slice(0, 3)]);
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
      `${c.name}は <b>${AREA[c.area].name}</b>の くに。<br>📝 ${c.fact}`);
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
    show(`${head}<div class="card pop">
      <div class="agebig"><b class="num">${c.adult}</b>さい</div>
      <div class="flag-big">🎉</div>
      <h2>おとなの なかまいり！</h2>
      <p>${c.name}では <b class="num">${c.adult}</b>さいで おとなに なるよ。</p>
      ${c.id === 'jp' ? '' : `<p class="jp">🇯🇵 にほんは <b class="num">${JAPAN.adult}</b>さい</p>`}
      <div class="info"><p>${c.flag} ${c.name}で うまれて、<b class="num">${c.adult}</b>ねん。<br>${c.foodEmoji} ${c.food}を たべて、「${c.hello}」と あいさつして、${life.play}で あそんで おおきく なったね。</p></div>
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

function quiz(head, cls, i, age, label, q, choices, win) {
  show(`${head}<div class="card">
    <div class="agebig">${age}</div>
    <div class="qlabel">❓ ${label}</div>
    <h2>${q}</h2>
    <div class="choices">${choices.map((ch, k) => `<button class="btn choice" data-act="answer" data-k="${k}">${ch.label}</button>`).join('')}</div>
    <div id="after"></div>
  </div>`, cls);
  life.quiz = { choices, win, i };
}

function answer(k, btn) {
  const qz = life.quiz;
  if (!qz || qz.done) return;
  qz.done = true;
  const ok = qz.choices[k].ok;
  if (ok) life.stars++;
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
  sfx('ok');
  app.querySelectorAll('[data-act=play]').forEach((b) => { b.disabled = true; if (b.dataset.v === v) b.classList.add('right'); });
  document.getElementById('after').innerHTML = `
    <div class="info"><p>${v === c.sport
      ? `${c.name}では <b>${c.sport}</b>が だいにんき！ みんなで もりあがったよ。`
      : `<b>${v}</b>で あそんだよ！ たのしかったね。<br>${c.name}では <b>${c.sport}</b>も だいにんき だよ。`}</p></div>
    <button class="btn big" data-act="next" data-i="${STAGES.findIndex((x) => x.key === 'play') + 1}">つぎへ ▶</button>`;
}

// おとなに なった あとの じんせい（しんがく → しごと → かぞく → おしまい）
function grownUp() {
  const c = life.c;
  const d = DREAMS.find((x) => x.name === life.dream);
  const uni = Math.random() * 100 < c.uni;
  const hit = Math.random() < (d.uni ? (uni ? 0.8 : 0) : (uni ? 0.7 : 0.5));
  const job = hit ? d : pick(Math.random() * 100 < c.agri ? JOBS_FARM : JOBS_TOWN);
  const kids = Math.min(9, poisson(c.tfr));
  const story = [];
  story.push(['🎉', `<b class="num">${c.adult}</b>さい`, 'おとなの なかまいりを したよ。']);
  story.push(uni
    ? ['🎓', 'しんがく', `だいがくに すすんで、${d.study}を べんきょうしたよ。`]
    : ['💪', 'しんがく', 'がっこうを おえて、すぐに はたらきはじめたよ。']);
  story.push(hit
    ? [job.emoji, 'しごと', `ゆめだった <b>${job.name}</b>に なったよ！ ${job.end}`]
    : [job.emoji, 'しごと', `<b>${job.name}</b>に なったよ。${job.end}<br>${d.name}の ゆめとは ちがう みちに なったけど、しごとを たいせつに して がんばったよ。`]);
  story.push(Math.random() < 0.85
    ? ['🏡', 'かぞく', kids > 0 ? `たいせつな ひとと かぞくに なって、こどもが <b class="num">${kids}</b>にん うまれたよ。` : 'たいせつな ひとと かぞくに なって、ふたりで なかよく くらしたよ。']
    : ['🤝', 'なかま', 'ともだちや しごとの なかまに かこまれて、にぎやかに くらしたよ。']);
  story.push(['🌅', 'それから', `としを とっても ${c.food}が だいすきな まま。たくさんの おもいでと いっしょに、ながい いっしょうを すごしたよ。`]);
  return { job, hit, uni, story };
}

function ending() {
  const c = life.c;
  const g = grownUp();
  const isNew = !save.met[c.id];
  save.met[c.id] = (save.met[c.id] || 0) + 1;
  save.lives++;
  store(save);
  sfx('fanfare');
  const row = (label, a, b) => `<tr><th>${label}</th><td>${a}</td>${c.id === 'jp' ? '' : `<td>${b}</td>`}</tr>`;
  show(`${topbar()}<div class="card pop">
    <div class="flag-big">${c.flag}</div>
    <h2>${c.name}で うまれて、<br><span class="cname">${g.job.emoji} ${g.job.name}</span>として いきた じんせい</h2>
    <ol class="story">${g.story.map(([e, t, x]) => `<li><span class="se">${e}</span><div><small>${t}</small><p>${x}</p></div></li>`).join('')}</ol>
    <p class="owari">おしまい</p>
    <div class="stars">${'⭐'.repeat(life.stars)}${'☆'.repeat(3 - life.stars)}</div>
    ${isNew ? `<div class="stamp">${c.flag}<span>ずかんに<br>スタンプ！</span></div>` : ''}
    <div class="summary">
      <h3>あなたの こども じだい（<b class="num">0</b>〜<b class="num">${c.adult}</b>さい）</h3>
      <ul>
        <li>👪 きょうだい <b class="num">${life.sibs.length}</b>にん</li>
        <li>${c.foodEmoji} すきな たべもの：${c.food}</li>
        <li>💬 あいさつ：${c.hello}</li>
        <li>${life.elec ? '💡 でんき あり' : '🕯️ でんき なし'} ・ ${life.water ? '🚰 みず ちかい' : '🪣 みず とおい'}</li>
        <li>⚽ あそび：${life.play}</li>
        <li>📖 すきな べんきょう：${life.subject}</li>
      </ul>
      <h3>くらべて みよう</h3>
      <table class="cmp">
        <tr><th></th><td>${c.flag} ${c.name}</td>${c.id === 'jp' ? '' : `<td>🇯🇵 にほん</td>`}</tr>
        ${row('💡 でんきが つかえる<br><small>（こども 10にんの うち）</small>', `<b class="num">${of10(c.elec)}</b>にん`, `<b class="num">${of10(JAPAN.elec)}</b>にん`)}
        ${row('🚰 ちかくに きれいな みず<br><small>（こども 10にんの うち）</small>', `<b class="num">${of10(c.water)}</b>にん`, `<b class="num">${of10(JAPAN.water)}</b>にん`)}
        ${row('🎓 だいがくなどで まなぶ<br><small>（わかもの 10にんの うち）</small>', n10(c.uni), n10(JAPAN.uni))}
        ${row('🧑‍🌾 のうぎょうで はたらく<br><small>（おとな 10にんの うち）</small>', n10(c.agri), n10(JAPAN.agri))}
        ${row('🎉 おとなに なる ねんれい', `<b class="num">${c.adult}</b>さい`, `<b class="num">${JAPAN.adult}</b>さい`)}
        ${row('👶 うまれる こども<br><small>（おかあさん 10にんで）</small>', `<b class="num">${Math.round(c.tfr * 10)}</b>にん`, `<b class="num">${Math.round(JAPAN.tfr * 10)}</b>にん`)}
      </table>
    </div>
    <button class="btn big" data-act="born">👶 もう いちど うまれる</button>
    <div class="row">
      <button class="btn" data-act="zukan">📖 ずかん</button>
      <button class="btn" data-act="title">🏠 はじめに もどる</button>
    </div>
  </div>`, `bg-${c.area}`);
  life = null;
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
      <p>${AREA[c.area].globe} ${AREA[c.area].name} ・ しゅと：${c.capital}</p>
      <p>💬 ${c.hello}（${c.lang}） ・ ${c.foodEmoji} ${c.food}</p>
      <p>📝 ${c.fact}</p>
      <p>🍼 あかちゃん <b class="num">100</b>にんの うち ${babiesText(c)} ・ うまれた かいすう <b class="num">${save.met[c.id]}</b></p></div>
    </div>` : ''}
    <div class="zgrid">${COUNTRIES.map((x) => save.met[x.id]
      ? `<button class="zcell got ${x.id === sel ? 'sel' : ''}" data-act="zsel" data-v="${x.id}"><span>${x.flag}</span><small>${x.name}</small></button>`
      : `<div class="zcell"><span>❔</span><small>？？？</small></div>`).join('')}</div>
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
  </div>`, 'bg-sky');
}

function parents() {
  show(`${topbar()}<div class="card wide parents">
    <h2>おうちの かたへ</h2>
    <p>いま生まれてくる赤ちゃんの一人として、世界のどこかの国にランダムに生まれ、0歳からその国で成人する年齢までの暮らしを体験し、最後にその後の進学・仕事・人生をみじかく読んで終わるゲームです。
    生まれる国は、実際にその国で生まれる赤ちゃんの数に比例した確率で決まります（このゲームでは赤ちゃんの数が多い国を中心に40か国）。</p>
    <p>きょうだいの数・家の電気・近くのきれいな水・大学などへの進学・農業の仕事につくかどうかは、その国の統計の割合にしたがってランダムに決まります。
    小学校低学年でも読めるよう、数は「10人のうち何人」「100人のうち何人」にまるめています。</p>
    <h3>使っているデータ（概数）</h3>
    <ul>
      <li>出生数・合計特殊出生率：国連「World Population Prospects 2024」（2023年ごろ）</li>
      <li>電気を使える人の割合：世界銀行（2022年）</li>
      <li>基本的な飲み水を使える人の割合：WHO/UNICEF JMP（2022年）</li>
      <li>成人年齢：各国の民法などの成年年齢</li>
      <li>大学などで学ぶ若者の割合：UNESCO 高等教育総就学率（100%をこえる国は100%）</li>
      <li>農業で働く人の割合：ILO（世界銀行）2022年ごろ</li>
    </ul>
    <p>病気・事故・戦争・死など、低学年の子どもにとって重い出来事は扱っていません。
    「どうして でんきが ない いえが あるのかな？」など、遊んだあとにお子さんと話すきっかけにしてみてください。</p>
    <p class="sub">記録（ずかん）はこの端末のブラウザにだけ保存されます。</p>
    <button class="btn" data-act="reset">ずかんを けす</button>
  </div>`, 'bg-sky');
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
    choose('dream', life.dream, `${d.emoji} <b>${d.name}</b>に なりたいな！ ゆめに むかって がんばろう。`);
  } else if (act === 'subject' && !life.subject) {
    life.subject = b.dataset.v;
    const x = SUBJECTS.find((y) => y.name === life.subject);
    choose('subject', life.subject, `${x.emoji} <b>${x.name}</b>が いちばん すき！ ${x.msg}`);
  }
  else if (act === 'zukan') zukan();
  else if (act === 'zsel') zukan(b.dataset.v);
  else if (act === 'hundred') hundred();
  else if (act === 'parents') parents();
  else if (act === 'mute') { save.muted = !isMuted(); setMuted(save.muted); store(save); b.textContent = isMuted() ? '🔇' : '🔊'; }
  else if (act === 'reset') {
    // 2かい おすと けす（ダイアログが つかえない ばしょでも うごくように）
    if (b.dataset.sure) { save.met = {}; save.lives = 0; store(save); title(); }
    else { b.dataset.sure = '1'; b.textContent = 'ほんとうに けす？ もう いちど おしてね'; }
  }
});

title();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
