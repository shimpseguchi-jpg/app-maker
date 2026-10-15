// ぶんしょうだいを つくる
// もんだいは「ぶん（センテンス）」の ならびと、ぶんの なかの「かず（トークン）」で できている。
// こたえの しきは トークンの ばんごうで もつので、どの ぶんの かずを つかったか まで しらべられる。
import { makeRng } from '../util.js';

// ───── かぞえかた ─────
const tail = (n) => n % 10;
const hiki = (n) => ([0, 1, 6, 8].includes(tail(n)) ? 'ぴき' : tail(n) === 3 ? 'びき' : 'ひき');
const hon = (n) => ([0, 1, 6, 8].includes(tail(n)) ? 'ぽん' : tail(n) === 3 ? 'ぼん' : 'ほん');
const SUBJ = {
  mouse: { name: 'ねずみ', emoji: '🐭', unit: 'ひき', c: hiki },
  rabbit: { name: 'うさぎ', emoji: '🐰', unit: 'ひき', c: hiki },
  frog: { name: 'かえる', emoji: '🐸', unit: 'ひき', c: hiki },
  dragonfly: { name: 'とんぼ', emoji: '🦋', unit: 'ひき', c: hiki },
  bird: { name: 'とり', emoji: '🐦', unit: 'わ', c: () => 'わ' },
  duck: { name: 'あひる', emoji: '🦆', unit: 'わ', c: () => 'わ' },
  swan: { name: 'はくちょう', emoji: '🦢', unit: 'わ', c: () => 'わ' },
  kid: { name: 'こども', emoji: '🧒', unit: 'にん', c: () => 'にん', word: (n) => (n === 1 ? 'ひとり' : n === 2 ? 'ふたり' : null) },
  boy: { name: 'おとこのこ', emoji: '👦', unit: 'にん', c: () => 'にん', word: (n) => (n === 1 ? 'ひとり' : n === 2 ? 'ふたり' : null) },
  girl: { name: 'おんなのこ', emoji: '👧', unit: 'にん', c: () => 'にん', word: (n) => (n === 1 ? 'ひとり' : n === 2 ? 'ふたり' : null) },
  adult: { name: 'おとな', emoji: '🧑', unit: 'にん', c: () => 'にん', word: (n) => (n === 1 ? 'ひとり' : n === 2 ? 'ふたり' : null) },
  candy: { name: 'あめ', emoji: '🍬', unit: 'こ', c: () => 'こ' },
  gum: { name: 'ガム', emoji: '🟩', unit: 'こ', c: () => 'こ' },
  car: { name: 'くるま', emoji: '🚗', unit: 'だい', c: () => 'だい' },
  bike: { name: 'じてんしゃ', emoji: '🚲', unit: 'だい', c: () => 'だい' },
  cookie: { name: 'クッキー', emoji: '🍪', unit: 'まい', c: () => 'まい' },
  cup: { name: 'コップ', emoji: '🥛', unit: 'こ', c: () => 'こ' },
  pencil: { name: 'えんぴつ', emoji: '✏️', unit: 'ほん', c: hon },
  eraser: { name: 'けしゴム', emoji: '🧽', unit: 'こ', c: () => 'こ' },
  flower: { name: 'はな', emoji: '🌷', unit: 'ほん', c: hon },
  redflower: { name: 'あかい はな', emoji: '🌹', unit: 'ほん', c: hon },
  whiteflower: { name: 'しろい はな', emoji: '🤍', unit: 'ほん', c: hon },
  apple: { name: 'りんご', emoji: '🍎', unit: 'こ', c: () => 'こ' },
  orange: { name: 'みかん', emoji: '🍊', unit: 'こ', c: () => 'こ' },
};
export const UNITS = ['ひき', 'こ', 'ほん', 'まい', 'にん', 'だい', 'わ'];
export function subjOf(key) { return SUBJ[key]; }
// かずの かきかた（「5ひき」「ひとり」）
export function countWord(subjKey, n) {
  const s = SUBJ[subjKey];
  const w = s.word && s.word(n);
  return w ? { num: w, suf: '' } : { num: String(n), suf: s.c(n) };
}

// ───── ばめん：ふえたり へったり する おはなし ─────
// t の なかの # に かずが はいる。v は「ふえる？へる？」で きく ことば。
const SEQ = [
  { id: 'train', subj: 'mouse', start: 'でんしゃに ねずみが # のって います。',
    plus: [{ t: '# のりました。', v: 'のりました', rel: 'のって きた' }, { t: 'えきで # のって きました。', v: 'のって きました', rel: 'のって きた' }],
    minus: [{ t: '# おりました。', v: 'おりました', rel: 'おりた' }],
    now: 'いま でんしゃに のって いる ねずみ', short: 'でんしゃの ねずみ', first: 'はじめに のって いた ねずみ',
    q: 'でんしゃの ねずみは なんびきに なりましたか。',
    extra: { t: 'ホームには うさぎが # います。', subj: 'rabbit', label: 'ホームに いる うさぎ' } },
  { id: 'tree', subj: 'bird', start: 'きに とりが # とまって います。',
    plus: [{ t: '# とんで きました。', v: 'とんで きました', rel: 'とんで きた' }],
    minus: [{ t: '# とんで いきました。', v: 'とんで いきました', rel: 'とんで いった' }],
    now: 'いま きに とまって いる とり', short: 'きの とり', first: 'はじめに とまって いた とり',
    q: 'きに とまって いる とりは なんわに なりましたか。',
    extra: { t: 'したの いけには あひるが # います。', subj: 'duck', label: 'いけに いる あひる' } },
  { id: 'park', subj: 'kid', start: 'こうえんで こどもが # あそんで います。',
    plus: [{ t: '# あそびに きました。', v: 'あそびに きました', rel: 'あそびに きた' }],
    minus: [{ t: '# いえに かえりました。', v: 'かえりました', rel: 'かえった' }],
    now: 'いま こうえんで あそんで いる こども', short: 'こうえんの こども', first: 'はじめに あそんで いた こども',
    q: 'こうえんで あそんで いる こどもは なんにんに なりましたか。',
    extra: { t: 'ベンチでは おとなが # みて います。', subj: 'adult', label: 'ベンチに いる おとな' } },
  { id: 'candy', subj: 'candy', start: 'あおいさんは あめを # もって います。',
    plus: [{ t: 'おねえさんから # もらいました。', v: 'もらいました', rel: 'もらった' }],
    minus: [{ t: 'ともだちに # あげました。', v: 'あげました', rel: 'あげた' }, { t: '# たべました。', v: 'たべました', rel: 'たべた' }],
    now: 'いま もって いる あめ', short: 'あおいさんの あめ', first: 'はじめに もって いた あめ',
    q: 'あおいさんの あめは なんこに なりましたか。',
    extra: { t: 'ガムも # もって います。', subj: 'gum', label: 'もって いる ガム' } },
  { id: 'parking', subj: 'car', start: 'ちゅうしゃじょうに くるまが # とまって います。',
    plus: [{ t: '# はいって きました。', v: 'はいって きました', rel: 'はいって きた' }],
    minus: [{ t: '# でて いきました。', v: 'でて いきました', rel: 'でて いった' }],
    now: 'いま とまって いる くるま', short: 'ちゅうしゃじょうの くるま', first: 'はじめに とまって いた くるま',
    q: 'ちゅうしゃじょうの くるまは なんだいに なりましたか。',
    extra: { t: 'じてんしゃも # とまって います。', subj: 'bike', label: 'とまって いる じてんしゃ' } },
  { id: 'cookie', subj: 'cookie', start: 'おさらに クッキーが # あります。',
    plus: [{ t: 'おかあさんが # のせました。', v: 'のせました', rel: 'のせた' }],
    minus: [{ t: 'みんなで # たべました。', v: 'たべました', rel: 'たべた' }],
    now: 'いま おさらに ある クッキー', short: 'おさらの クッキー', first: 'はじめに あった クッキー',
    q: 'おさらの クッキーは なんまいに なりましたか。',
    extra: { t: 'テーブルには コップが # あります。', subj: 'cup', label: 'テーブルの コップ' } },
  { id: 'pencil', subj: 'pencil', start: 'ふでばこに えんぴつが # はいって います。',
    plus: [{ t: 'おみせで # かいました。', v: 'かいました', rel: 'かった' }],
    minus: [{ t: 'ともだちに # かしました。', v: 'かしました', rel: 'かした' }],
    now: 'いま ふでばこに ある えんぴつ', short: 'ふでばこの えんぴつ', first: 'はじめに あった えんぴつ',
    q: 'ふでばこの えんぴつは なんぼんに なりましたか。',
    extra: { t: 'けしゴムも # はいって います。', subj: 'eraser', label: 'ふでばこの けしゴム' } },
  { id: 'pond', subj: 'frog', start: 'いけに かえるが # います。',
    plus: [{ t: '# とびこんで きました。', v: 'とびこんで きました', rel: 'とびこんで きた' }],
    minus: [{ t: '# いけから でて いきました。', v: 'でて いきました', rel: 'でて いった' }],
    now: 'いま いけに いる かえる', short: 'いけの かえる', first: 'はじめに いた かえる',
    q: 'いけの かえるは なんびきに なりましたか。',
    extra: { t: 'はすの はには とんぼが # とまって います。', subj: 'dragonfly', label: 'はすの はの とんぼ' } },
];

// ───── ばめん：2つの なかまを くらべたり あわせたり する おはなし ─────
const GRP = [
  { id: 'flowers', subj: 'flower', a: 'redflower', b: 'whiteflower', text: 'はなだんに あかい はなが #、しろい はなが # さいて います。',
    A: 'あかい はな', B: 'しろい はな', all: 'はな',
    qSum: 'はなは あわせて なんぼん さいて いますか。',
    qMore: 'あかい はなは しろい はなより なんぼん おおいですか。',
    qLess: 'しろい はなは あかい はなより なんぼん すくないですか。',
    minus: { t: 'そのあと # つみました。', v: 'つみました', rel: 'つんだ' },
    now: 'いま さいて いる はな', qLeft: 'さいて いる はなは なんぼんに なりましたか。' },
  { id: 'cars', subj: 'mouse', a: 'mouse', b: 'mouse', text: 'でんしゃの ひだりの しゃりょうに ねずみが #、みぎの しゃりょうに # のって います。',
    A: 'ひだりの しゃりょうの ねずみ', B: 'みぎの しゃりょうの ねずみ', all: 'ねずみ',
    qSum: 'ねずみは ぜんぶで なんびき のって いますか。',
    qMore: 'ひだりの しゃりょうの ねずみは、みぎの しゃりょうの ねずみより なんびき おおいですか。',
    qLess: 'みぎの しゃりょうの ねずみは、ひだりの しゃりょうの ねずみより なんびき すくないですか。',
    minus: { t: 'えきで # おりました。', v: 'おりました', rel: 'おりた' },
    now: 'いま でんしゃに のって いる ねずみ', qLeft: 'でんしゃに のって いる ねずみは なんびきに なりましたか。' },
  { id: 'kids', subj: 'kid', a: 'boy', b: 'girl', text: 'こうていに おとこのこが #、おんなのこが # います。',
    A: 'おとこのこ', B: 'おんなのこ', all: 'こども',
    qSum: 'こどもは ぜんぶで なんにん いますか。',
    qMore: 'おとこのこは おんなのこより なんにん おおいですか。',
    qLess: 'おんなのこは おとこのこより なんにん すくないですか。',
    minus: { t: 'そのあと # きょうしつに もどりました。', v: 'もどりました', rel: 'もどった' },
    now: 'いま こうていに いる こども', qLeft: 'こうていに いる こどもは なんにんに なりましたか。' },
  { id: 'fruits', subj: 'apple', a: 'apple', b: 'orange', text: 'かごに りんごが #、みかんが # はいって います。',
    A: 'りんご', B: 'みかん', all: 'くだもの',
    qSum: 'くだものは ぜんぶで なんこ ありますか。',
    qMore: 'りんごは みかんより なんこ おおいですか。',
    qLess: 'みかんは りんごより なんこ すくないですか。',
    minus: { t: 'そのあと # たべました。', v: 'たべました', rel: 'たべた' },
    now: 'いま かごに ある くだもの', qLeft: 'かごの くだものは なんこに なりましたか。' },
  { id: 'lake', subj: 'duck', a: 'duck', b: 'swan', text: 'みずうみに あひるが #、はくちょうが # います。',
    A: 'あひる', B: 'はくちょう', all: 'とり',
    qSum: 'とりは ぜんぶで なんわ いますか。',
    qMore: 'あひるは はくちょうより なんわ おおいですか。',
    qLess: 'はくちょうは あひるより なんわ すくないですか。',
    minus: { t: 'そのあと # とんで いきました。', v: 'とんで いきました', rel: 'とんで いった' },
    now: 'いま みずうみに いる とり', qLeft: 'みずうみに いる とりは なんわに なりましたか。' },
];

// ───── もんだいの しゅるい ─────
export const KINDS = {
  zoka: { level: 1, name: 'ふえると いくつ', icon: '⬆️', memo: 'のりました・もらいました など、ふえる おはなし' },
  genshou: { level: 1, name: 'へると いくつ', icon: '⬇️', memo: 'おりました・たべました など、へる おはなし' },
  gappei: { level: 1, name: 'あわせて いくつ', icon: '🤝', memo: '2つの なかまを あわせる おはなし' },
  kyusa: { level: 2, name: 'ちがいは いくつ', icon: '⚖️', memo: '「なんこ おおい」「すくない」を くらべる おはなし' },
  mittsu_pp: { level: 2, name: '3つの かず（ふえる・ふえる）', icon: '3️⃣', memo: '2かい ふえる おはなし' },
  mittsu_mm: { level: 2, name: '3つの かず（へる・へる）', icon: '3️⃣', memo: '2かい へる おはなし' },
  mittsu_mix: { level: 2, name: '3つの かず（ふえる・へる）', icon: '🔀', memo: 'ふえたり へったり する おはなし' },
  extra: { level: 3, name: 'つかわない かずが ある', icon: '🙈', memo: 'もんだいに かんけい ない かずが まじって いる' },
  twocar: { level: 3, name: 'あわせて から へる', icon: '🚃', memo: '2つの なかまを あわせて、そこから へる おはなし' },
  asks: { level: 3, name: 'きかれて いる ことに ちゅうい', icon: '❓', memo: '「おりたのは あわせて なんびき？」など、とちゅうの かずを きく' },
};
export const KIND_IDS = Object.keys(KINDS);
export const MAX_LEVEL = 3;

// ───── つくる ─────
// gen(kind, seed, { level, scene }) → もんだい
export function gen(kind, seed, opt = {}) {
  const rng = makeRng(seed);
  for (let i = 0; i < 60; i++) {
    const p = build(kind, rng, opt);
    if (p && distinct(p)) { p.kind = kind; p.seed = seed; return p; }
  }
  throw new Error('もんだいが つくれない: ' + kind);
}
function distinct(p) { const vs = p.tokens.map((t) => t.v); return new Set(vs).size === vs.length; }

const lim = (lv) => (lv >= 2 ? 20 : 10);

function build(kind, rng, opt) {
  const lv = opt.level || KINDS[kind].level;
  const big = lim(lv);
  const seqScene = () => (opt.scene && SEQ.find((s) => s.id === opt.scene)) || rng.pick(SEQ);
  const grpScene = () => (opt.scene && GRP.find((s) => s.id === opt.scene)) || rng.pick(GRP);
  switch (kind) {
    case 'zoka': {
      const a = rng.int(1, big - 2), b = rng.int(1, Math.min(9, big - a));
      if (a + b > big || a + b < 3) return null;
      return seq(seqScene(), rng, a, [+b], {});
    }
    case 'genshou': {
      const a = rng.int(3, big === 10 ? 10 : 18), b = rng.int(1, Math.min(9, a - 1));
      return seq(seqScene(), rng, a, [-b], {});
    }
    case 'extra': {
      const s = seqScene();
      const plus = rng.chance(0.5);
      const a = plus ? rng.int(2, 12) : rng.int(5, 18);
      const b = plus ? rng.int(1, Math.min(9, 20 - a)) : rng.int(1, Math.min(9, a - 1));
      return seq(s, rng, a, [plus ? b : -b], { extra: rng.int(2, 9) });
    }
    case 'mittsu_pp': {
      const a = rng.int(1, 10), b = rng.int(1, 9), c = rng.int(1, 9);
      if (a + b + c > 20) return null;
      return seq(seqScene(), rng, a, [b, c], {});
    }
    case 'mittsu_mm': {
      // 10の まとまりを つかう かたちも まぜる（13−3−4 など）
      let a = rng.int(6, 18), b = rng.int(1, 9);
      if (a > 10 && rng.chance(0.5)) b = a - 10;
      const c = rng.int(1, 9);
      if (b < 1 || a - b - c < 1) return null;
      return seq(seqScene(), rng, a, [-b, -c], {});
    }
    case 'mittsu_mix': {
      const a = rng.int(3, 15), b = rng.int(1, 9), c = rng.int(1, 9);
      const ops = rng.pick([[-b, c], [b, -c]]);
      const mid = a + ops[0], end = mid + ops[1];
      if (mid < 1 || mid > 20 || end < 1 || end > 20) return null;
      return seq(seqScene(), rng, a, ops, {});
    }
    case 'asks': {
      // 2かい おなじ むきに うごいて、うごいた かずの あわせを きく
      const s = seqScene();
      const down = rng.chance(0.6);
      const b = rng.int(1, 8), c = rng.int(1, 8);
      const a = down ? rng.int(b + c + 1, 18) : rng.int(1, 18 - b - c);
      if (a < 1 || a > 20) return null;
      return seq(s, rng, a, down ? [-b, -c] : [b, c], { askMoved: true });
    }
    case 'gappei': {
      const s = grpScene();
      const a = rng.int(1, big - 2), b = rng.int(1, Math.min(9, big - a));
      if (a + b > big || a + b < 3) return null;
      return grp(s, rng, a, b, 'sum');
    }
    case 'kyusa': {
      const s = grpScene();
      const a = rng.int(3, lv >= 3 ? 18 : 10), b = rng.int(1, a - 1);
      return grp(s, rng, a, b, rng.chance(lv >= 3 ? 0.5 : 0.3) ? 'less' : 'more');
    }
    case 'twocar': {
      const s = grpScene();
      const a = rng.int(2, 12), b = rng.int(2, 9), c = rng.int(2, 9);
      if (a + b > 20 || c >= a + b || c <= Math.min(a, b)) return null;
      return grp(s, rng, a, b, 'left', c);
    }
  }
  return null;
}

// トークン（ぶんの なかの かず）を ぶんに うめる
function fill(t, sIdx, toks, vals, subjs) {
  let k = 0;
  return t.replace(/#/g, () => {
    const id = toks.length;
    toks.push({ v: vals[k], s: sIdx, subj: subjs[k] });
    k++;
    return '#' + id;
  });
}

// ふえたり へったり する おはなし
function seq(s, rng, a, moves, o) {
  const toks = [], sentences = [];
  const subj = s.subj, S = SUBJ[subj];
  const three = moves.length >= 2;
  sentences.push({ role: 'start', text: (three ? 'はじめに ' : '') + fill(s.start, 0, toks, [a], [subj]) });
  const startTok = 0;
  let extraTok = -1;
  if (o.extra != null) {
    sentences.push({ role: 'extra', text: fill(s.extra.t, 1, toks, [o.extra], [s.extra.subj]) });
    extraTok = toks.length - 1;
  }
  const events = [];
  moves.forEach((m, i) => {
    const e = rng.pick(m > 0 ? s.plus : s.minus);
    const pre = three ? (i === 0 ? 'つぎに ' : 'その つぎに ') : '';
    const idx = sentences.length;
    sentences.push({ role: 'event', sign: m > 0 ? 1 : -1, verb: e.v, text: pre + fill(e.t, idx, toks, [Math.abs(m)], [subj]) });
    events.push({ tok: toks.length - 1, sign: m > 0 ? 1 : -1, ev: e, s: idx });
  });
  const rel = events[0].ev.rel;
  let question, expr, answer, ask, why;
  if (o.askMoved) {
    question = `${rel} ${S.name}は あわせて ${qWord(subj)}ですか。`;
    expr = events.map((e) => ({ t: e.tok, sign: 1 }));
    answer = events.reduce((sum, e) => sum + toks[e.tok].v, 0);
    ask = askSet(rng, `${rel} ${S.name}を あわせた かず`, [`${s.now}の かず`, `${s.first}の かず`]);
    why = [`きかれて いるのは「${rel} ${S.name}」の かず。`, `${events.map((e) => say(toks[e.tok])).join('と ')}を あわせるので たしざん。`, `はじめの ${say(toks[0])}は つかわないよ。`];
  } else {
    question = s.q;
    expr = [{ t: startTok, sign: 1 }, ...events.map((e) => ({ t: e.tok, sign: e.sign }))];
    answer = a + moves.reduce((x, y) => x + y, 0);
    const pool = [`${s.first}の かず`, ...new Set(events.map((e) => `${e.ev.rel} ${S.name}の かず`))];
    if (extraTok >= 0) pool.unshift(`${s.extra.label}の かず`);
    ask = askSet(rng, `${s.now}の かず`, pool);
    why = [`はじめは ${say(toks[0])}。`, ...events.map((e) => `「${e.ev.v}」→ ${e.sign > 0 ? 'ふえる → たしざん（＋）' : 'へる → ひきざん（−）'}`)];
    if (extraTok >= 0) why.push(`${s.extra.label}は ${S.name}では ないので つかわない。`);
  }
  // ふえる？へる？ の ミニクイズ（しきの きごうを まちがえた とき）
  const quiz = {};
  events.forEach((e) => {
    quiz[e.tok] = o.askMoved
      ? { q: `「${rel} ${S.name}を あわせた かず」を しらべるのは？`, choices: ['たしざん', 'ひきざん'], correct: 0, word: e.ev.v, s: e.s }
      : { q: `「${e.ev.v}」で、${s.short}は？`, choices: ['ふえる', 'へる'], correct: e.sign > 0 ? 0 : 1, word: e.ev.v, s: e.s };
  });
  const stages = o.askMoved
    ? [{ n: a, kind: 'start' }, ...events.map((e) => ({ n: toks[e.tok].v, kind: e.sign > 0 ? 'in' : 'out', focus: true }))]
    : [{ n: a, kind: 'start' }, ...events.map((e) => ({ n: toks[e.tok].v, kind: e.sign > 0 ? 'in' : 'out' }))];
  return finish({ scene: s.id, subj, sentences, toks, question, expr, answer, ask, quiz, why, rng,
    diagram: { type: 'seq', emoji: S.emoji, stages, moved: !!o.askMoved }, extraTok, extraSubj: o.extra != null ? s.extra.subj : null });
}

// 2つの なかまの おはなし
function grp(s, rng, a, b, mode, c) {
  const toks = [], sentences = [];
  sentences.push({ role: 'group', text: fill(s.text, 0, toks, [a, b], [s.a, s.b]) });
  let question, expr, answer, ask, why, diagram;
  const quiz = {};
  const unitSubj = s.subj;
  if (mode === 'sum') {
    question = s.qSum;
    expr = [{ t: 0, sign: 1 }, { t: 1, sign: 1 }];
    answer = a + b;
    ask = askSet(rng, `${s.A}と ${s.B}を あわせた かず`, [`${s.A}と ${s.B}の かずの ちがい`, `${s.A}の かず`, `${s.B}の かず`]);
    quiz[1] = { q: `「あわせて」「ぜんぶで」の かずを しらべるのは？`, choices: ['たしざん', 'ひきざん'], correct: 0, word: question.includes('あわせて') ? 'あわせて' : 'ぜんぶで', s: 1 };
    why = [`${s.A}と ${s.B}を あわせる → たしざん（＋）`];
    diagram = { type: 'grp', mode, a, b, ea: SUBJ[s.a].emoji, eb: SUBJ[s.b].emoji };
  } else if (mode === 'more' || mode === 'less') {
    question = mode === 'more' ? s.qMore : s.qLess;
    expr = [{ t: 0, sign: 1 }, { t: 1, sign: -1 }];
    answer = a - b;
    ask = askSet(rng, `${s.A}と ${s.B}の かずの ちがい`, [`${s.A}と ${s.B}を あわせた かず`, `${s.A}の かず`, `${s.B}の かず`]);
    const w = mode === 'more' ? 'おおい' : 'すくない';
    quiz[1] = { q: `「${qWord(unitSubj)} ${w}」と、かずの ちがいを しらべるのは？`, choices: ['たしざん', 'ひきざん'], correct: 1, word: w, s: 1 };
    why = [`「${w}」→ ${s.A}と ${s.B}の ちがいを くらべる。`, `ちがいは ひきざん。おおきい かずから ちいさい かずを ひく。`];
    if (mode === 'less') why.push('「すくない」と きかれても、ちがいを だすのは ひきざんだよ。');
    diagram = { type: 'grp', mode: 'diff', a, b, ea: SUBJ[s.a].emoji, eb: SUBJ[s.b].emoji };
  } else {
    sentences.push({ role: 'event', sign: -1, verb: s.minus.v, text: fill(s.minus.t, 1, toks, [c], [s.subj]) });
    question = s.qLeft;
    expr = [{ t: 0, sign: 1 }, { t: 1, sign: 1 }, { t: 2, sign: -1 }];
    answer = a + b - c;
    ask = askSet(rng, `${s.now}の かず`, [`${s.A}と ${s.B}を あわせた かず`, `${s.minus.rel} ${s.all}の かず`]);
    quiz[1] = { q: `${s.A}と ${s.B}を ぜんぶ あわせるのは？`, choices: ['たしざん', 'ひきざん'], correct: 0, word: null, s: 0 };
    quiz[2] = { q: `「${s.minus.v}」で、${s.all}は？`, choices: ['ふえる', 'へる'], correct: 1, word: s.minus.v, s: 1 };
    why = [`まず ${s.A}と ${s.B}を あわせる → たしざん（＋）`, `「${s.minus.v}」→ へる → ひきざん（−）`];
    diagram = { type: 'seq', emoji: SUBJ[s.a].emoji, stages: [{ n: a, kind: 'start' }, { n: b, kind: 'in', pair: true }, { n: c, kind: 'out' }] };
  }
  return finish({ scene: s.id, subj: unitSubj, sentences, toks, question, expr, answer, ask, quiz, why, rng, diagram, extraTok: -1, extraSubj: null });
}

function qWord(subj) { return { ひき: 'なんびき', こ: 'なんこ', ほん: 'なんぼん', まい: 'なんまい', にん: 'なんにん', だい: 'なんだい', わ: 'なんわ' }[SUBJ[subj].unit]; }
function say(tok) { const w = countWord(tok.subj, tok.v); return w.num + w.suf; }
function askSet(rng, correct, pool) {
  const wrong = rng.shuffle([...new Set(pool)].filter((x) => x !== correct)).slice(0, 2);
  const options = rng.shuffle([correct, ...wrong]);
  return { options, correct: options.indexOf(correct) };
}

function finish(p) {
  const { rng } = p;
  p.sentences.push({ role: 'question', text: p.question });
  const unit = SUBJ[p.subj].unit;
  // たんいの えらびかた：まぎらわしい ものを いれる（つかわない かずの たんい など）
  const pool = UNITS.filter((u) => u !== unit);
  const near = p.extraSubj && SUBJ[p.extraSubj].unit !== unit ? [SUBJ[p.extraSubj].unit] : [];
  const others = rng.shuffle(pool.filter((u) => !near.includes(u)));
  p.units = rng.shuffle([unit, ...near, ...others].slice(0, 3));
  p.unit = unit;
  p.tokens = p.toks; delete p.toks; delete p.rng;
  return p;
}

// ───── しきを しらべる ─────
// child: [{t, sign}] こどもが つくった しき（さいしょの かずの sign は +1）
// かえりち：{ ok } か { ok:false, cat, tok, msg }
export function evalExpr(p, child) {
  let v = 0, neg = false;
  child.forEach((c, i) => { v += (i === 0 ? 1 : c.sign) * p.tokens[c.t].v; if (v < 0) neg = true; });
  return { v, neg };
}
export function checkExpr(p, child) {
  if (child.length < 2) return { ok: false, cat: 'short', msg: 'しきが まだ とちゅうだよ。かずを 2つ いじょう つかおう。' };
  const want = p.expr.map((e) => e.t);
  const used = child.map((c) => c.t);
  const dup = used.find((t, i) => used.indexOf(t) !== i);
  if (dup != null) return { ok: false, cat: 'dup', tok: dup, msg: 'おなじ かずを 2かい つかって いるよ。' };
  const extra = used.find((t) => !want.includes(t));
  if (extra != null) {
    const isExtraSentence = p.extraTok === extra;
    return { ok: false, cat: 'extra', tok: extra,
      msg: isExtraSentence ? 'その かずは、きかれて いる ことと かんけい ある？ もんだいの さいごの ぶんを よもう。'
        : 'その かずは つかうかな？ なにを きかれて いるか、もういちど よもう。' };
  }
  const miss = want.find((t) => !used.includes(t));
  if (miss != null) return { ok: false, cat: 'missing', tok: miss, msg: 'つかって いない かずが あるよ。ぶんを ぜんぶ よんだかな？' };
  const { v, neg } = evalExpr(p, child);
  if (v === p.answer && !neg) return { ok: true };
  if (neg) return { ok: false, cat: 'order', tok: child[0].t, msg: 'とちゅうで ひけなく なって いるよ。はじめの かずは どれかな？' };
  // きごうを まちがえた ところを さがす
  const signOf = (list, t) => { const i = list.findIndex((c) => c.t === t); return i === 0 ? 1 : list[i].sign; };
  const bad = p.expr.find((e) => signOf(child, e.t) !== e.sign && p.quiz[e.t]) || p.expr.find((e) => signOf(child, e.t) !== e.sign);
  return { ok: false, cat: 'op', tok: bad ? bad.t : child[1].t, msg: '＋と −は あって いるかな？' };
}

// もんだいの こたえを みせる しき（"5 + 3 + 2"）
export function exprText(p, list = p.expr) {
  return list.map((e, i) => (i === 0 ? '' : e.sign > 0 ? ' ＋ ' : ' − ') + p.tokens[e.t].v).join('');
}

// ───── ことばしわけ（たしざん？ ひきざん？）─────
export const PHRASES = [
  ['3びき のりました', 1, 1, 'のる → ふえる'], ['2ひき おりました', -1, 1, 'おりる → へる'], ['4こ もらいました', 1, 1, 'もらう → ふえる'],
  ['3こ たべました', -1, 1, 'たべる → へる'], ['5わ とんで きました', 1, 1, 'くる → ふえる'], ['2わ とんで いきました', -1, 1, 'いく → へる'],
  ['ともだちに 2こ あげました', -1, 1, 'あげる → へる'], ['3にん あそびに きました', 1, 1, 'くる → ふえる'], ['ふたり かえりました', -1, 1, 'かえる → へる'],
  ['あわせて なんこ', 1, 1, 'あわせる → たしざん'], ['ぜんぶで なんぼん', 1, 1, 'ぜんぶ → たしざん'], ['のこりは なんまい', -1, 1, 'のこり → ひきざん'],
  ['2だい はいって きました', 1, 1, 'はいって くる → ふえる'], ['3だい でて いきました', -1, 1, 'でて いく → へる'],
  ['おみせで 2ほん かいました', 1, 2, 'かう → ふえる'], ['ともだちに 1ぽん かしました', -1, 2, 'かす → へる'],
  ['ちがいは なんこ', -1, 2, 'ちがい → ひきざん'], ['どちらが なんびき おおい', -1, 2, 'くらべる → ひきざん'],
  ['なんにん すくない', -1, 2, '「すくない」も くらべる → ひきざん'], ['4ひき とびこんで きました', 1, 2, 'くる → ふえる'],
  ['おりたのは あわせて なんびき', 1, 3, '「おりた」でも、おりた かずを あわせる → たしざん'],
  ['たべたのは ぜんぶで なんこ', 1, 3, '「たべた」でも、たべた かずを あわせる → たしざん'],
  ['しろい はなは あかい はなより なんぼん すくない', -1, 3, 'ちがいを くらべる → ひきざん'],
  ['5ひき のって いて、2ひき おりると', -1, 3, 'おりると へる → ひきざん'],
  ['2ひき おりて、3びき のって くると', 1, 3, 'のって くると ふえる → たしざん'],
].map(([text, sign, level, why]) => ({ text, sign, level, why }));
