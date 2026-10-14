// せかいの どこかに うまれたら
// いま うまれる あかちゃんの ひとりに なって、その くにの くらしを おとなに なるまで たいけんし、
// その あとの しんがく・しごと・じんせいを みじかく よんで おわる。
import { COUNTRIES, AREA, WORLD, WORLD_BIRTHS, FETCHED, JAPAN, DREAMS, JOBS_FARM, JOBS_TOWN, nameFor, deathAge } from './data.js';
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
const save = Object.assign({ met: {}, lives: 0, muted: false, mura: {}, past: [], auto: false, speed: 1, gentle: false }, load());
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
const WEALTH = {
  very: 'いえは とても まずしく、ひとり 1にち <b class="num">3</b>ドル（やく <b class="num">450</b>えん）より すくない おかねで くらして いる。',
  poor: 'いえの くらしは ゆとりが ない。',
  ok: 'いえの くらしは ふつう。',
};

function tenKids(n, on = '🧒', off = '🧒') {
  let s = '<div class="ten">';
  for (let i = 0; i < 10; i++) s += `<span class="${i < n ? 'on' : 'off'}">${i < n ? on : off}</span>`;
  return s + '</div>';
}

// ───── がめん ─────
let life = null;

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

function title() {
  const met = Object.keys(save.met).length;
  show(`${topbar(false)}
  <div class="hero">
    <div class="globe spin">🌏</div>
    <h1>せかいの どこかに<br>うまれたら</h1>
    <p class="lead">いま、せかいでは <b class="num">1</b>びょうに やく <b class="num">${Math.round(WORLD_BIRTHS / (365 * 24 * 3600))}</b>にんの あかちゃんが うまれて いるよ。<br>
    あなたも その ひとりに なって、どこかの くにで いっしょうを いきて みよう！</p>
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
    <p class="sub">うまれる ばしょは えらべない。じんせいの とちゅうでは えらべる ことも あるけど、<br>えらんでも かなうとは かぎらないし、かなっても しあわせに なるとは かぎらない。</p>
    <p class="sub warn">※ ほんとうの すうじの とおりに、こどもの うちに なくなる じんせいも あるよ。おうちの ひとと いっしょに あそんでね。</p>
    <button class="link" data-act="parents">おうちの かたへ</button>
  </div>`, 'bg-sky');
}

// ルーレットで くにが きまる
function born() {
  const c = pickCountry();
  const kids = 1 + Math.min(8, poisson(Math.max(c.tfr - 1, 0)));
  const g = Math.random() < 0.512 ? 'm' : 'f'; // うまれる あかちゃんは おとこのこが すこし おおい
  const r = Math.random() * 100;
  const me = life = {
    c, g, name: nameFor(c, g),
    order: 1 + rnd(kids), // きょうだいの なんばんめ
    rural: Math.random() * 100 >= c.urban,
    sibs: Array.from({ length: kids - 1 }, () => pick(['👦', '👧'])),
    elec: Math.random() * 100 < c.elec,
    water: Math.random() * 100 < c.water,
    wealth: r < c.pov3 ? 'very' : r < c.pov8 ? 'poor' : 'ok',
    // なくなる ねんれい：生命表から。やさしい モードでは おとなに なるまでは なくならない
    death: deathAge(c, g, save.gentle ? c.adult + 1 : 0),
    school: 'none', uni: false, dream: null, job: null, wed: null,
    joy: 5, tries: 0, wins: 0, log: [], step: 0,
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
  addLog(0, `${c.name}の ${life.rural ? 'いなか' : 'まち'}で、${gname(life.g)} として うまれた。${life.name ? `なまえは ${life.name}。` : ''}${WEALTH[life.wealth].replace(/<[^>]+>/g, '')}`);
  if (life.wealth === 'very') joy(-1);
  show(`${topbar()}
  <div class="card pop">
    <div class="flag-big">${c.flag}</div>
    <h2>おめでとう！<br>あなたは <span class="cname">${c.name}</span> で うまれたよ！</h2>
    ${isNew ? '<div class="newbadge">はじめての くに！</div>' : ''}
    <p class="area">${a.globe} ${a.name}の くに${c.capital ? ` ・ しゅと：${c.capital}` : ''}</p>
    <div class="idcard">
      <span class="idava">👶</span>
      <div><p>${life.rural ? '🌾 いなか' : '🏙️ まち'}の いえに、<b>${gname(life.g)}</b> として うまれたよ。</p>
      ${life.name ? `<p>なまえは <b class="pname">${life.name}</b>。</p>` : ''}
      <p class="wl">${WEALTH[life.wealth]}</p></div>
    </div>
    <div class="info">
      <p>🎲 ${c.name}に うまれる かくりつは ${oddsText(c)}</p>
      <p class="rare">めずらしさ ${'★'.repeat(rarity(c))}<span>${'★'.repeat(5 - rarity(c))}</span></p>
      <p>📅 きょう ${c.name}で うまれた あかちゃんは やく <b class="num">${fmt(c.births / 365)}</b>にん<br><small>（せかいでは やく <b class="num">${fmt(WORLD_BIRTHS / 365)}</b>にん）</small></p>
    </div>
    <button class="btn big" data-act="next">おおきく なる ▶</button>
  </div>`, `bg-${c.area}`);
  autoStep();
}

// ───── しあわせ ─────
// かなうか どうか（かくりつ）と、しあわせかどうかは べつ。けっかごとに よい こと・たいへんな ことが ランダムに おこる。
function joy(d) { life.joy = Math.max(0, Math.min(10, life.joy + d)); }
function mood(good, goods, bads) {
  return Math.random() < good ? { d: 1, why: pick(goods) } : { d: -1, why: pick(bads) };
}
function joyBar() {
  const n = Math.round(life.joy);
  return `<span class="joybar" title="しあわせ">😊 ${'<i class="on"></i>'.repeat(n)}${'<i></i>'.repeat(10 - n)}</span>`;
}

// かくりつの いいかた
function pText(p) {
  if (p >= 99.5) return '<b class="num">10</b>にんに <b class="num">10</b>にん';
  if (p < 5 && p > 0) return `<b class="num">100</b>にんに <b class="num">${Math.max(1, Math.round(p))}</b>にん`;
  return `<b class="num">10</b>にんに <b class="num">${Math.round(p / 10)}</b>にん`;
}
const SRC = { data: '📊 とうけい', game: '🎲 ゲームの めやす', always: '' };

// ───── じんせいの えらぶ ばめん ─────
// それぞれ { age, icon, title, body, options:[{ emoji, label, p, src, why, pass(), fail() }] } を かえす。
// pass/fail は { text, log, mood:{d,why} } を かえす。options が ない ものは よむだけ。
const STEPS = [
  // 0さい：かぞく
  () => {
    const n = life.sibs.length;
    addLog(0, n === 0 ? 'ひとりっこ。' : `${n + 1}にん きょうだいの ${life.order}ばんめ。`);
    return {
      age: 0, icon: '👪', title: 'あなたの かぞく',
      body: `<div class="family">👨 👩 ${life.sibs.join(' ')} <span class="me">👶</span></div>
        <p>${n === 0 ? 'あなたは ひとりっこ だよ。' : `<b class="num">${n + 1}</b>にん きょうだいの <b class="num">${life.order}</b>ばんめ だよ！`}</p>
        <div class="info"><p>${life.c.name}では、おかあさん <b class="num">10</b>にんに こどもが やく <b class="num">${Math.round(life.c.tfr * 10)}</b>にん うまれるよ。</p>
        ${life.c.id === 'jp' ? '' : `<p class="jp">🇯🇵 にほんは <b class="num">${Math.round(JAPAN.tfr * 10)}</b>にん</p>`}</div>`,
    };
  },
  // 3さい：くらし
  () => {
    const c = life.c;
    const e = of10(c.elec), w = of10(c.water);
    addLog(3, `${life.elec ? 'でんきの ある' : 'でんきの ない'} いえで くらした。${life.water ? '' : 'みずくみの おてつだいを した。'}${c.rich ? `${c.food}が だいすきに なった。` : ''}`);
    if (!life.water) joy(-1);
    return {
      age: 3, icon: '🏠', title: 'あなたの いえの くらし',
      body: `<div class="lifebox ${life.elec ? 'yes' : 'no'}"><div class="ico">${life.elec ? '💡' : '🕯️'}</div>
          <p>${life.elec ? 'いえで でんきが つかえるよ。よるも あかるい！' : 'いえには でんきが きて いないよ。よるは ランプや ろうそくで すごすよ。'}</p></div>
        <div class="info"><p>こども <b class="num">10</b>にんの うち、でんきが つかえるのは やく <b class="num">${e}</b>にん</p>${tenKids(e, '💡', '🕯️')}</div>
        <div class="lifebox ${life.water ? 'yes' : 'no'}"><div class="ico">${life.water ? '🚰' : '🪣'}</div>
          <p>${life.water ? 'いえの ちかくで きれいな みずが てに はいるよ。' : 'きれいな みずは とおくに あるよ。みずくみの おてつだいを するよ。'}</p></div>
        <div class="info"><p>こども <b class="num">10</b>にんの うち、ちかくで きれいな みずが てに はいるのは やく <b class="num">${w}</b>にん</p>${tenKids(w, '🚰', '🪣')}</div>
        ${c.rich ? `<div class="info"><p>${c.foodEmoji} すきな たべもの：<b>${c.food}</b> ・ 💬 あいさつ：<b>${c.hello}</b>（${c.lang}）</p></div>` : ''}
        <div class="info"><p>📝 ${factOf(c)}</p></div>`,
    };
  },
  // 6さい：しょうがっこう
  () => {
    const c = life.c;
    return {
      age: 6, icon: '🎒', title: 'しょうがっこうに いく？',
      body: `<p class="sub">${c.name}では、しょうがっこうを さいごまで おえる こどもは ${pText(c.prim)}。</p>`,
      options: [
        { emoji: '🎒', label: 'しょうがっこうに いく', p: c.prim, src: 'data', why: 'さいごまで かよえる こどもの わりあい',
          pass: () => { life.school = 'prim'; return { text: 'しょうがっこうを さいごまで かよったよ！', log: 'しょうがっこうに かよい、さいごまで おえた。', mood: mood(0.65, ['ともだちが たくさん できた。', 'よみかきが できるように なって うれしかった。'], ['べんきょうが むずかしくて たいへんだった。', 'とおい みちを あるいて かよって つかれた。']) }; },
          fail: () => { const a = 7 + rnd(4); return { text: `${life.wealth === 'ok' ? 'がっこうが とおくて' : 'いえの しごとが いそがしくて'}、<b class="num">${a}</b>さいで がっこうを やめたよ。`, log: `しょうがっこうに かよったが、${a}さいで やめた。`, mood: mood(0.4, ['いえで かぞくと すごす じかんが ふえた。', 'どうぶつの せわが じょうずに なった。'], ['ともだちが がっこうに いくのを みて さみしかった。']) }; } },
        { emoji: '🧺', label: 'いえの しごとを てつだう', p: 100, src: 'always',
          pass: () => ({ text: 'がっこうには いかず、いえの しごとを てつだったよ。', log: 'がっこうには いかず、いえの しごとを てつだった。', mood: mood(0.5, ['かぞくに たよりに されて うれしかった。', 'はたけしごとを たくさん おぼえた。'], ['まいにち つかれた。', 'じが よめなくて こまる ことが あった。']) }) },
      ],
    };
  },
  // 10さい：ゆめ
  () => ({
    age: 10, icon: '💭', title: 'おおきく なったら なにに なりたい？',
    body: '<p class="sub">ゆめは だれでも もてるよ。かなうかは あとで わかる。</p>',
    options: shuffle(DREAMS).slice(0, 4).map((d) => ({
      emoji: d.emoji, label: d.name, p: 100, src: 'always',
      pass: () => { life.dream = d; return { text: `<b>${d.name}</b>に なりたいな！`, log: `しょうらいの ゆめは ${d.name}。` }; },
    })),
  }),
  // 12さい：ちゅうがっこう（しょうがっこうを おえた ひと）／ はたらく こども
  () => {
    const c = life.c;
    if (life.school === 'prim') {
      const p = Math.min(99, (c.lsec / Math.max(c.prim, 1)) * 100);
      return {
        age: 12, icon: '🏫', title: 'ちゅうがっこうに すすむ？',
        body: `<p class="sub">${c.name}では、ちゅうがっこうを さいごまで おえる こどもは ${pText(c.lsec)}。</p>`,
        options: [
          { emoji: '🏫', label: 'ちゅうがっこうに すすむ', p, src: 'data', why: 'しょうがっこうを おえた こどもの うち、ちゅうがっこうも おえる わりあい',
            pass: () => { life.school = 'lsec'; return { text: 'ちゅうがっこうを さいごまで おえたよ！', log: 'ちゅうがっこうに すすみ、さいごまで おえた。', mood: mood(0.6, ['すきな かもくが みつかった。', 'しょうらいの ことを たくさん かんがえた。'], ['しけんが たいへんで まいにち ねぶそくだった。', 'がくひの ことで いえの ひとが こまって いた。']) }; },
            fail: () => ({ text: 'とちゅうで がっこうを やめて、はたらく ことに なったよ。', log: 'ちゅうがっこうを とちゅうで やめて、はたらきはじめた。', mood: mood(0.4, ['じぶんで かせいだ おかねで かぞくを たすけた。'], ['もっと べんきょう したかった。']) }) },
          { emoji: '🛠️', label: 'はたらきに でる', p: 100, src: 'always',
            pass: () => ({ text: '12さいで はたらきはじめたよ。', log: '12さいで はたらきはじめた。', mood: mood(0.45, ['しごとを おぼえて たよりに された。', 'かぞくの くらしが すこし らくに なった。'], ['あさから ばんまで はたらいて つかれた。']) }) },
        ],
      };
    }
    // がっこうに いって いない こども：はたらくか どうかは とうけいの わりあいで きまる（えらべない）
    if (c.clab < 0.5) return null;
    return {
      age: 12, icon: '🧒', title: 'こどもの しごと',
      body: `<p class="sub">${c.name}では、7〜14さいの こどもの うち ${pText(c.clab)}が はたらいて いるよ${c.estimated.includes('clab') ? '<small>※</small>' : ''}。</p>`,
      event: { emoji: '🧺', label: 'いえの そとで はたらく ことに なる？', p: c.clab, src: 'data',
        pass: () => ({ text: 'いちばや はたけで、おとなと いっしょに はたらいたよ。', log: 'いえの そとで、おとなと いっしょに はたらいた。', mood: mood(0.35, ['しごとを ほめられた。'], ['あそぶ じかんが なかった。', 'からだが いたく なった。']) }),
        fail: () => ({ text: 'いえの てつだいを しながら すごしたよ。', log: 'いえの てつだいを しながら すごした。', mood: mood(0.55, ['かぞくと すごす じかんが おおかった。'], ['がっこうに いく ともだちが うらやましかった。']) }) },
    };
  },
  // 15さい：おんなのこの はやい けっこん（えらべない できごと）
  () => {
    const c = life.c;
    if (life.g !== 'f' || c.cm18 < 0.5) return null;
    return {
      age: 15, icon: '💍', title: 'けっこんの はなし',
      body: `<p class="sub">${c.name}では、18さいに なる まえに けっこんする おんなのひとが ${pText(c.cm18)}${c.estimated.includes('cm18') ? '<small>※</small>' : ''}。</p>`,
      event: { emoji: '💍', label: '18さいより まえに けっこんする ことに なる？', p: c.cm18, src: 'data',
        pass: () => { life.wed = 15 + rnd(3); return { text: `<b class="num">${life.wed}</b>さいで けっこんする ことに なったよ。${life.school === 'lsec' ? '' : 'がっこうは やめる ことに なった。'}`, log: `${life.wed}さいで けっこんした。`, mood: mood(0.3, ['あいての かぞくが やさしかった。'], ['まだ こどもで いたかった。', 'ともだちと あえなく なった。']) }; },
        fail: () => ({ text: 'けっこんは まだ せず、じぶんの みちを かんがえたよ。', log: '', mood: { d: 0 } }) },
    };
  },
  // おとな：しんろ
  () => {
    const c = life.c;
    const pu = life.school === 'lsec' ? Math.min(99, (c.uni / Math.max(c.lsec, 1)) * 100) : 0;
    const opts = [
      { emoji: '🎓', label: 'だいがくに すすむ', p: pu, src: 'data', why: life.school === 'lsec' ? 'ちゅうがっこうを おえた ひとの うち、だいがくなどで まなぶ わりあい' : 'ちゅうがっこうを おえて いないと うけられない',
        pass: () => { life.uni = true; return { text: `だいがくに ごうかく！ ${life.dream.study}を まなんだよ。`, log: `だいがくに すすんで、${life.dream.study}を まなんだ。`, mood: mood(0.6, ['すきな ことを ふかく まなべた。', 'せかいじゅうの ともだちが できた。'], ['がくひの ために よるも はたらいて たいへんだった。', 'べんきょうに ついていけず くるしかった。']) }; },
        fail: () => ({ text: `${life.wealth === 'ok' ? 'しけんに おちて' : 'がくひが はらえず'}、だいがくには いけなかったよ。`, log: `だいがくを めざしたが、${life.wealth === 'ok' ? 'しけんに おちた' : 'がくひが はらえなかった'}。`, mood: mood(0.4, ['はやく はたらきはじめて、じぶんの おかねで くらせた。'], ['とても くやしかった。']) }) },
      { emoji: '💪', label: 'はたらく', p: 100, src: 'always',
        pass: () => ({ text: 'はたらきはじめたよ。', log: 'おとなとして はたらきはじめた。', mood: mood(0.5, ['じぶんの おかねで すきな ものを かえた。'], ['しごとが きびしかった。']) }) },
    ];
    if (life.rural) opts.push({ emoji: '🏙️', label: 'まちに でる', p: 100, src: 'always',
      pass: () => { life.rural = false; return { text: 'ふるさとを でて、まちで くらしはじめたよ。', log: 'ふるさとを でて、まちで くらしはじめた。', mood: mood(0.5, ['あたらしい ともだちが できた。', 'まちの くらしは べんりだった。'], ['ふるさとが こいしかった。', 'へやが せまくて やちんが たかかった。']) }; } });
    return { age: c.adult, icon: '🧭', title: `おとなの なかまいり！ ${c.adult}さい`, body: `<p class="sub">${c.name}では <b class="num">${c.adult}</b>さいで おとなに なるよ${c.id === 'jp' ? '' : `（にほんは <b class="num">${JAPAN.adult}</b>さい）`}。これから どうする？</p>`, options: opts };
  },
  // しごと
  () => {
    const c = life.c;
    const d = life.dream;
    const age = Math.max(c.adult + (life.uni ? 4 : 1), life.uni ? 22 : 0);
    const pw = life.uni ? Math.min(97, c.wage + 25) : c.wage;
    const fallback = () => pick(Math.random() * 100 < c.agri ? JOBS_FARM : JOBS_TOWN);
    const setJob = (j) => { life.job = j; };
    return {
      age, icon: '💼', title: 'どんな しごとを する？',
      body: `<p class="sub">${c.name}では、はたらく ひとの うち おきゅうりょうを もらって はたらく ひとは ${pText(c.wage)}。のこりの ひとは、のうぎょうや じぶんの しょうばいを して いるよ。</p>`,
      options: [
        { emoji: d.emoji, label: `ゆめの ${d.name}を めざす`, p: d.uni ? (life.uni ? 70 : 0) : 40, src: 'game', why: d.uni && !life.uni ? 'だいがくを でて いないと なれない' : 'ゆめの しごとに つける かずは かぎられて いる',
          pass: () => { setJob(d); return { text: `ゆめだった <b>${d.name}</b>に なったよ！ ${d.end}`, log: `ゆめだった ${d.name}に なった！`, mood: mood(0.7, ['まいにちが たのしかった。', 'たくさんの ひとに ありがとうと いわれた。'], ['ゆめが かなっても、しごとは おもったより たいへんだった。', 'いそがしくて かぞくとの じかんが へった。']) }; },
          fail: () => { const j = fallback(); setJob(j); return { text: `${d.name}には なれなかった。かわりに <b>${j.name}</b>に なったよ。`, log: `${d.name}を めざしたが なれず、${j.name}に なった。`, mood: mood(0.45, ['おもって いなかった しごとが だんだん すきに なった。'], ['ゆめを あきらめて かなしかった。']) }; } },
        { emoji: '🏢', label: 'おきゅうりょうの しごと（かいしゃ・やくしょ・こうじょう など）', p: pw, src: 'data', why: life.uni ? 'だいがくを でると はいりやすい（とうけい＋ゲームの めやす）' : 'おきゅうりょうを もらって はたらく ひとの わりあい',
          pass: () => { const j = pick(JOBS_TOWN); setJob(j); return { text: `<b>${j.name}</b>として はたらきはじめたよ。まいつき おきゅうりょうが もらえる。`, log: `${j.name}として はたらいた。`, mood: mood(0.55, ['くらしが あんていした。'], ['まいにち おなじ しごとで たいくつだった。', 'じょうしが こわかった。']) }; },
          fail: () => { const j = fallback(); setJob(j); return { text: `しごとが みつからず、<b>${j.name}</b>を する ことに なったよ。`, log: `かいしゃの しごとは みつからず、${j.name}に なった。`, mood: mood(0.4, ['じぶんの ペースで はたらけた。'], ['しゅうにゅうが すくなく、くらしが くるしかった。']) }; } },
        { emoji: '🌾', label: 'はたけ・ぼくじょう・りょうで はたらく', p: 100, src: 'always',
          pass: () => { const j = pick(JOBS_FARM); setJob(j); return { text: `<b>${j.name}</b>として はたらいたよ。${j.end}`, log: `${j.name}として はたらいた。`, mood: mood(0.5, ['しぜんの なかで はたらくのが すきだった。', 'みのりの きせつが うれしかった。'], ['あめが ふらない としは くらしが くるしかった。']) }; } },
      ],
    };
  },
  // けっこん
  () => {
    if (life.wed) return null;
    const age = Math.max(24, (life.uni ? 26 : life.c.adult + 5));
    return {
      age, icon: '💞', title: 'これからの くらし',
      options: [
        { emoji: '💍', label: 'けっこんする', p: 80, src: 'game', why: 'いっしょに くらしたい ひとに であえるか',
          pass: () => { life.wed = age; return { text: 'たいせつな ひとと けっこんしたよ！', log: `${age}さいで けっこんした。`, mood: mood(0.7, ['まいにち わらいが たえなかった。'], ['けんかも たくさん した。']) }; },
          fail: () => ({ text: 'けっこんしたい ひとには であえなかったよ。', log: 'けっこんは しなかった。', mood: mood(0.5, ['ひとりの じかんを たのしんだ。', 'ともだちと たくさん たびを した。'], ['ときどき さみしかった。']) }) },
        { emoji: '🧳', label: 'ひとりで じゆうに くらす', p: 100, src: 'always',
          pass: () => ({ text: 'ひとりで じゆうに くらす ことに したよ。', log: 'ひとりで じゆうに くらした。', mood: mood(0.55, ['すきな ことに じかんを つかえた。'], ['びょうきの とき こころぼそかった。']) }) },
      ],
    };
  },
];

function stageHead(age) {
  return `${topbar()}<div class="who">${avatar(age, life.g)} <b>${callName()}</b> <small>${life.c.flag} ${life.c.name} ・ <b class="num">${age}</b>さい</small> ${joyBar()}</div>`;
}

// つぎの ばめんへ（いきられなかった ときや、ばめんが ない ときは おわり）
function nextStep() {
  while (life.step < STEPS.length) {
    const sp = STEPS[life.step++]();
    if (!sp) continue;
    if (sp.age > life.death) break;
    return renderStep(sp);
  }
  ending();
}

function optCard(o, k, ev = false) {
  const p = Math.max(0, Math.min(100, o.p));
  return `<button class="opt" data-act="opt" data-k="${k}" ${p <= 0 && !ev ? 'disabled' : ''}>
    <span class="oe">${o.emoji}</span>
    <span class="ol"><b>${o.label}</b>
      ${o.p >= 100 && o.src === 'always' ? '<small>だれでも できる</small>' : `<small>${ev ? 'そう なる' : 'かなう'} かくりつ ${pText(p)}（<b class="num">${Math.round(p)}</b>%）${SRC[o.src] ? ` ・ ${SRC[o.src]}` : ''}</small>
      <span class="pbar"><i style="width:${p}%"></i></span>${o.why ? `<small class="why">${o.why}</small>` : ''}`}</span>
  </button>`;
}

function renderStep(sp) {
  life.cur = sp;
  const c = life.c;
  const choice = sp.options || (sp.event ? [sp.event] : null);
  show(`${stageHead(sp.age)}<div class="card">
    <div class="agebig">${sp.icon} <b class="num">${sp.age}</b>さい</div>
    <h2>${sp.title}</h2>
    ${sp.body || ''}
    ${sp.options ? `<div class="opts">${sp.options.map((o, k) => optCard(o, k)).join('')}</div>` : ''}
    ${sp.event ? `<div class="opts">${optCard(sp.event, 0, true)}</div>
      <p class="sub">これは えらべない できごと。ボタンを おすと、どうなるか きまるよ。</p>` : ''}
    <div id="after">${choice ? '' : '<button class="btn big" data-act="next">つぎへ ▶</button>'}</div>
  </div>`, `bg-${c.area}`);
}

// えらんだ あとの さいころ：ゲージの うえを はりが うごいて、とまった ばしょで きまる
function chooseOpt(k) {
  const sp = life.cur;
  if (!sp || sp.done) return;
  sp.done = true;
  const o = sp.options ? sp.options[k] : sp.event;
  const p = Math.max(0, Math.min(100, o.p));
  const r = Math.random() * 100;
  const ok = r < p;
  app.querySelectorAll('[data-act=opt]').forEach((b) => { b.disabled = true; if (+b.dataset.k === k) b.classList.add('picked'); });
  const after = document.getElementById('after');
  const show2 = () => {
    const res = (ok ? o.pass : o.fail)();
    if (o.src !== 'always' && !sp.event) { life.tries++; if (ok) life.wins++; }
    if (res.log) addLog(sp.age, res.log);
    const m = res.mood || { d: 0 };
    joy(m.d);
    if (m.why) addLog(sp.age, m.why);
    sfx(ok ? 'ok' : 'ng');
    after.innerHTML = `${o.src === 'always' && !sp.event ? '' : `<p class="result ${ok ? 'ok' : 'ng'}">${sp.event ? (ok ? 'そう なった' : 'そうは ならなかった') : ok ? '✨ かなった！' : '💧 かなわなかった…'}</p>`}
      <div class="info"><p>${res.text}</p></div>
      ${m.why ? `<div class="moodline ${m.d > 0 ? 'up' : m.d < 0 ? 'down' : ''}">${m.d > 0 ? '😊 しあわせ ＋1' : m.d < 0 ? '😢 しあわせ −1' : ''}<span>${m.why}</span></div>` : ''}
      <button class="btn big" data-act="next">つぎへ ▶</button>`;
    const who = app.querySelector('.who .joybar');
    if (who) who.outerHTML = joyBar();
    autoStep();
  };
  if (o.src === 'always' && !sp.event) { show2(); return; }
  // ゲージの アニメーション
  after.innerHTML = `<div class="roll"><div class="track"><i class="zone" style="width:${p}%"></i><b class="needle" id="needle"></b></div>
    <div class="rlabel"><span>${sp.event ? 'そう なる' : 'かなう'}</span><span>${sp.event ? 'ならない' : 'かなわない'}</span></div></div>`;
  const nd = document.getElementById('needle');
  let t = 0;
  const steps = 14;
  const tick = () => {
    if (life?.cur !== sp) return;
    t++;
    const x = t < steps ? Math.random() * 100 : r;
    nd.style.left = `${x}%`;
    sfx('tick');
    if (t < steps) setTimeout(tick, 40 + t * 12 / save.speed);
    else setTimeout(show2, 450 / save.speed);
  };
  tick();
}

// ───── そのあとの じんせい（こども・まご・さいご） ─────
function laterLife() {
  const c = life.c;
  const D = life.death;
  const at = (a, text, d = 0) => { if (a < D) { addLog(a, text); joy(d); } };
  if (life.wed) {
    const want = Math.min(9, poisson(c.tfr));
    let kids = 0, lost = 0, gkids = 0;
    for (let k = 0; k < want; k++) {
      const b = life.wed + 1 + k * 2 + rnd(2);
      if (b >= D || b > 45) break;
      kids++;
      if (Math.random() < c.u5 / 1000) lost++;
    }
    if (kids > 0) at(life.wed + 1, `こどもが うまれた。こどもは ぜんぶで ${kids}にん。`, 1);
    if (lost > 0) at(life.wed + 3 + rnd(6), lost === 1 ? 'こどもの ひとりが、おさない うちに びょうきで なくなった。とても かなしかった。' : `こどもの うち ${lost}にんが、おさない うちに びょうきで なくなった。とても かなしかった。`, -2);
    for (let k = 0; k < kids - lost; k++) gkids += Math.random() < 0.85 ? poisson(c.tfr) : 0;
    if (gkids > 0) at(life.wed + 26 + rnd(8), `まごが うまれた。${life.g === 'm' ? 'おじいちゃん' : 'おばあちゃん'}に なった！`, 1);
  }
  if (life.job && D >= 60) at(60 + rnd(6), 'しごとを ひきついで、ゆっくり くらすように なった。', pick([1, 0]));
}

// さいごの ことば（しいんは「びょうき」「じこ」「としを とって」だけで やさしく）
function lastWords(a) {
  if (a === 0) return Math.random() < 0.5 ? 'うまれて すぐに、ちいさな からだで びょうきに なり、なくなりました。' : `うまれて <b class="num">${1 + rnd(11)}</b>かげつで、びょうきに なり、なくなりました。`;
  if (a < 5) return `<b class="num">${a}</b>さいの とき、びょうきに なり、なくなりました。`;
  const accident = a < 15 ? 0.3 : a < 45 ? 0.35 : a < 70 ? 0.08 : 0.02;
  if (Math.random() < accident) return `<b class="num">${a}</b>さいの とき、じこに あって、なくなりました。`;
  if (a >= 70 && Math.random() < 0.6) return `<b class="num">${a}</b>さいで、としを とって、${life.rural ? 'いなか' : 'まち'}の いえで しずかに なくなりました。`;
  return `<b class="num">${a}</b>さいの とき、びょうきに なり、なくなりました。`;
}

function joyVerdict(j) {
  if (j >= 8) return ['🌈', 'とても しあわせな いっしょう'];
  if (j >= 5) return ['🌤️', 'しあわせも たいへんな ことも あった いっしょう'];
  if (j >= 3) return ['🌥️', 'くろうの おおい いっしょう'];
  return ['🌧️', 'とても くるしい ことが おおかった いっしょう'];
}

let lastShare = '';
function ending() {
  const c = life.c;
  const D = life.death;
  const grown = D >= c.adult;
  laterLife();
  life.log.sort((x, y) => x[0] - y[0]);
  const last = lastWords(D);
  addLog(D, last.replace(/<[^>]+>/g, ''));
  const isNew = !save.met[c.id];
  save.met[c.id] = (save.met[c.id] || 0) + 1;
  save.lives++;
  const who = life.name ? ` ${life.name}の` : '';
  const place = `${c.name}の ${life.rural ? 'いなか' : 'まち'}で ${gname(life.g)} として うまれ`;
  const headline = grown
    ? `${place}、${life.job ? `${life.job.name}として はたらき、` : ''}${D}さいまで いきた${who} じんせい`
    : `${place}、${D}さいで なくなった${who} じんせい`;
  const [vi, vt] = joyVerdict(life.joy);
  save.past.unshift({ flag: c.flag, g: life.g, job: life.job ? `${life.job.emoji} ${life.job.name}` : '🕊️', old: D, text: headline, joy: Math.round(life.joy) });
  save.past = save.past.slice(0, 30);
  store(save);
  sfx(grown ? 'fanfare' : 'ng');
  lastShare = `${c.flag} ${headline}\n${grown ? `しあわせ ${Math.round(life.joy)}/10 ・ かなった えらびかた ${life.wins}/${life.tries}\n` : ''}` + life.log.map(([a, t]) => `${a}さい ${t}`).join('\n') + '\n#せかいのどこかにうまれたら';
  const row = (label, a, b, key) => `<tr><th>${label}</th><td>${a}${key && c.estimated.includes(key) ? '<small>※</small>' : ''}</td>${c.id === 'jp' ? '' : `<td>${b}</td>`}</tr>`;
  const per1000 = (v) => `<b class="num">${Math.round(v)}</b>にん`;
  show(`${topbar()}<div class="card pop">
    <div class="flag-big">${c.flag}<span class="oldava">${grown ? avatar(D, life.g) : '🕊️'}</span></div>
    <h2 class="headline">${headline}</h2>
    <div class="lastbox ${grown ? '' : 'young'}"><p>${last}</p>
      ${grown ? '' : `<p class="sub">${callName()}の ことを、かぞくは ずっと わすれなかったよ。</p>`}</div>
    ${grown ? `<div class="verdict"><span class="vi">${vi}</span><div><b>${vt}</b>
      <p>${joyBar()}</p>
      <p class="sub">えらんで かなった こと <b class="num">${life.wins}</b> / <b class="num">${life.tries}</b>。${life.wins >= life.tries / 2 === life.joy >= 5 ? 'かなった ことも しあわせも、かさなる ときも あれば かさならない ときも ある。' : life.joy >= 5 ? 'かなわない ことが おおくても、しあわせな じかんは たくさん あったね。' : 'かなった ことが おおくても、しあわせとは かぎらないんだね。'}</p></div></div>`
      : `<div class="info"><p>${c.name}では、うまれた あかちゃん <b class="num">1,000</b>にんの うち、<b class="num">5</b>さいまでに なくなるのは やく ${per1000(c.u5)}。${c.id === 'jp' ? '' : `<br>にほんは やく ${per1000(JAPAN.u5)}。`}</p>
      <p class="sub">びょうきの おおくは、きれいな みず・ワクチン・くすり・びょういんが あれば ふせげるんだよ。</p></div>`}
    ${isNew ? `<div class="stamp">${c.flag}<span>ずかんに<br>スタンプ！</span></div>` : ''}
    <h3 class="loghead">📖 じんせいの きろく</h3>
    <ol class="lifelog">${life.log.map(([a, t], k) => `<li style="animation-delay:${Math.min(k * 0.06, 1.2)}s"><span class="age"><b class="num">${a}</b>さい</span><span class="ava">${k === life.log.length - 1 ? '🕊️' : avatar(a, life.g)}</span><p>${t}</p></li>`).join('')}</ol>
    <p class="owari">おしまい</p>
    <button class="btn" data-act="share">📋 きろくを コピー</button>
    <p class="sub" id="shared" hidden>コピー したよ。おうちの ひとに みせてね。</p>
    <div class="summary">
      <h3>くらべて みよう</h3>
      <table class="cmp">
        <tr><th></th><td>${c.flag} ${c.name}</td>${c.id === 'jp' ? '' : `<td>🇯🇵 にほん</td>`}</tr>
        ${row(`⏳ へいきんじゅみょう<br><small>（${life.g === 'm' ? 'おとこの ひと' : 'おんなの ひと'}）</small>`, `<b class="num">${life.g === 'm' ? c.lem : c.lef}</b>さい`, `<b class="num">${life.g === 'm' ? JAPAN.lem : JAPAN.lef}</b>さい`, life.g === 'm' ? 'lem' : 'lef')}
        ${row('🍼 5さいまでに なくなる<br><small>（あかちゃん 1,000にんの うち）</small>', per1000(c.u5), per1000(JAPAN.u5), 'u5')}
        ${row('🪙 1にち 3ドルより すくない おかねで くらす<br><small>（10にんの うち）</small>', n10(c.pov3), n10(JAPAN.pov3), 'pov3')}
        ${row('🎒 しょうがっこうを おえる<br><small>（こども 10にんの うち）</small>', n10(c.prim), n10(JAPAN.prim), 'prim')}
        ${row('🏫 ちゅうがっこうを おえる<br><small>（こども 10にんの うち）</small>', n10(c.lsec), n10(JAPAN.lsec), 'lsec')}
        ${row('🎓 だいがくなどで まなぶ<br><small>（わかもの 10にんの うち）</small>', n10(c.uni), n10(JAPAN.uni), 'uni')}
        ${row('🏢 おきゅうりょうの しごと<br><small>（はたらく ひと 10にんの うち）</small>', n10(c.wage), n10(JAPAN.wage), 'wage')}
        ${row('💡 でんきが つかえる<br><small>（こども 10にんの うち）</small>', `<b class="num">${of10(c.elec)}</b>にん`, `<b class="num">${of10(JAPAN.elec)}</b>にん`)}
        ${row('🎲 うまれる かくりつ', oddsText(c), oddsText(JAPAN))}
      </table>
      ${c.estimated.length ? '<p class="sub">※ この くにの データが ないので、にた くにの へいきん</p>' : ''}
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
    <ol class="past">${save.past.map((x) => `<li><span class="pf">${x.flag}</span><div><p>${x.text}</p><small>${x.job} ・ <b class="num">${x.old}</b>さいまで いきた${x.joy != null ? ` ・ 😊 <b class="num">${x.joy}</b>/10` : ''}</small></div></li>`).join('')}</ol>
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
    <p>いま生まれてくる赤ちゃんの一人として、世界のどこかの国にランダムに生まれ、その国の統計どおりの一生を生きるゲームです。
    人生の節目（小学校・中学校・進路・仕事・結婚）では選択肢を選びます。選択肢には<strong>かなう確率</strong>が表示され（📊は統計、🎲は統計がないためのゲームの目安）、ゲージの針で「かなったか」が決まります。
    たとえば大学に進める確率は、中学校を終えた人のうち大学などで学ぶ人の割合なので、国によって大きく違います。
    また、選択がかなうことと幸せになることは別にしてあります。結果ごとに良いこと・大変なことがランダムに起こり、「しあわせ」が上下します。
    こどもの労働や18歳未満の結婚は、選べない「できごと」として統計の確率で起こります。</p>
    <p>
    生まれる国は、実際にその国で生まれる赤ちゃんの数に比例した確率で、世界の${COUNTRIES.length}か国から決まります。
    そのうち赤ちゃんの数が多い${COUNTRIES.filter((c) => c.rich).length}か国には、あいさつ・料理などの説明があります。それ以外の国では、数字から作った説明になります。</p>
    <p>Web ゲーム「80億分の1」（1in8b.life）の、統計どおりに世界のどこかに生まれて一生を見守るというアイデアへのオマージュです（元の作品は15歳以上向け。このゲームは別に作ったもので、文章や絵は使っていません）。
    「おまかせ」をオンにすると、選択も自動で進み、人生を上から眺められます。</p>
    <h3>いのちについて（大切）</h3>
    <p>何歳まで生きるかは、その国・男女の生命表（乳児死亡率・5歳未満死亡率・5歳きざみの死亡確率・成人死亡率・平均寿命から作成）にしたがって決まります。
    そのため、国によっては<strong>こどものうちに亡くなる人生</strong>もあります（たとえばナイジェリアでは1,000人のうち約116人が5歳までに亡くなります。日本は約2人）。
    死因は「びょうき」「じこ」「としを とって」とだけ、やさしく表します。戦争・暴力・自殺などは描きません。</p>
    <p>小さなお子さんは、できれば大人と一緒に遊んでください。下の「やさしい モード」をオンにすると、成人するまでは亡くならないようになります。</p>
    <p>「せかい 100にんむら」では、世界を100人の村にしたら何人が電気を使えるか、などを予想してから答え合わせします。</p>
    <p>きょうだいの数・家の暮らし向き（1日3ドル／8.30ドル未満で暮らす人の割合）・家の電気・近くのきれいな水・小学校／中学校を最後まで終えるか・こどもの労働・18歳未満の結婚（女の子）・大学などへの進学・農業の仕事につくかどうか・こどもの数は、その国の統計の割合にしたがってランダムに決まります。
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
      <li>乳児死亡率・5歳未満死亡率・5〜24歳の5歳きざみの死亡確率・成人死亡率（男女別）・平均寿命（男女別）</li>
      <li>小学校・中学校（前期中等教育）修了率・貧困率（1日3ドル／8.30ドル、2021年PPP）・18歳までに結婚した女性の割合・働いているこども（7〜14歳）の割合</li>
    </ul>
    <p>値がない国は、同じ大陸（学校・貧困・結婚・こどもの労働は同じ所得グループ）の国の平均で補っています（画面に ※ がつきます）。成人年齢は各国の民法などの成年年齢です。</p>
    <p>「どうして でんきが ない いえが あるのかな？」「どうして こどもの うちに なくなる ひとが いるのかな？」など、遊んだあとにお子さんと話すきっかけにしてみてください。</p>
    <p class="sub">記録（ずかん）はこの端末のブラウザにだけ保存されます。</p>
    <button class="btn" data-act="gentle">${save.gentle ? '✅' : '⬜'} やさしい モード（こどもの うちは なくならない）</button>
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
  else if (act === 'next') { if (life) nextStep(); }
  else if (act === 'opt') { if (life) chooseOpt(+b.dataset.k); }
  else if (act === 'zukan') zukan();
  else if (act === 'zsel') zukan(b.dataset.v);
  else if (act === 'hundred') hundred();
  else if (act === 'mura') mura();
  else if (act === 'past') past();
  else if (act === 'gentle') { save.gentle = !save.gentle; store(save); parents(); }
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
    const opts = [...app.querySelectorAll('[data-act=opt]')].filter((x) => !x.disabled);
    const t = opts.length ? pick(opts) : app.querySelector('[data-act=next]');
    if (t) t.click();
  }, 2400 / save.speed);
}

title();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
