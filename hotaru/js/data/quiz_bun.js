// ぶんづくりの もんだい（こくご・1ねんせいの ことばの きまり）
// 光村図書「こくご一上」の ならびに あわせた 3だんかい。れいぶんは ぜんぶ この ゲームの ために つくった もの
//   bunGa    … 「〜が 〜。」の ぶんを カードを ならべて つくる（5月「ぶんを つくろう」）
//   bunJoshi … 「は・を・へ」を いれて ぶんを つくる（7月「はをへを つかおう」）
//   bunFix   … 「わ・お・え」と かいて しまった まちがいを なおす（10月「まちがいを なおそう」）
// もんだいの かたち（type）
//   build … cards を ただしい じゅんに ならべる（order＝ただしい ならび）
//   fill  … parts の あいだの □ に pool から じを いれる（slots＝ただしい じ）
//   fix   … chars の なかの まちがった じを タップして なおす（wrong＝まちがいの ばしょ）

const pick = (rng, a) => a[Math.floor(rng() * a.length)];
const shuffle = (rng, a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

// 「〜が 〜。」 [えもじ, だれ・なに, どうする]
export const GA = [
  ['🐕', 'いぬ', 'はしる'], ['🐦', 'とり', 'とぶ'], ['🌷', 'はな', 'さく'], ['☔', 'あめ', 'ふる'], ['🐸', 'かえる', 'なく'], ['🐱', 'ねこ', 'ねる'],
  ['🐟', 'さかな', 'およぐ'], ['🍃', 'かぜ', 'ふく'], ['⭐', 'ほし', 'ひかる'], ['👶', 'あかちゃん', 'わらう'], ['🐴', 'うま', 'はしる'], ['❄️', 'ゆき', 'ふる'],
  ['🌙', 'つき', 'でる'], ['🚗', 'くるま', 'とまる'], ['🐘', 'ぞう', 'あるく'], ['🔔', 'かね', 'なる'], ['🌞', 'ひ', 'のぼる'], ['🐝', 'はち', 'とぶ'],
];

// 「は・を・へ」の ぶん。[えもじ, [ことば, くっつく じ]…, さいごの ことば]
// 「え を かく」「は を みがく」「おかし」「わなげ」「えき」の ように、まぎらわしい ことばも まぜて ある
export const JOSHI = [
  ['🍚', ['ぼく', 'は'], ['ごはん', 'を'], 'たべる'], ['🏫', ['わたし', 'は'], ['がっこう', 'へ'], 'いく'], ['🥛', ['おとうと', 'は'], ['みず', 'を'], 'のむ'],
  ['🖍️', ['いもうと', 'は'], ['え', 'を'], 'かく'], ['🐟', ['ねこ', 'は'], ['さかな', 'を'], 'たべる'], ['🏪', ['おかあさん', 'は'], ['みせ', 'へ'], 'いく'],
  ['🌳', ['ぼく', 'は'], ['こうえん', 'へ'], 'いく'], ['✉️', ['わたし', 'は'], ['てがみ', 'を'], 'かく'], ['⛰️', ['うさぎ', 'は'], ['やま', 'へ'], 'かえる'],
  ['👹', ['おに', 'は'], ['そと', 'へ'], 'にげる'], ['📖', ['せんせい', 'は'], ['ほん', 'を'], 'よむ'], ['🐦', ['とり', 'は'], ['そら', 'を'], 'とぶ'],
  ['🐸', ['かえる', 'は'], ['いけ', 'へ'], 'とびこむ'], ['🍪', ['わたし', 'は'], ['おかし', 'を'], 'たべる'], ['⭕', ['ぼく', 'は'], ['わなげ', 'を'], 'する'],
  ['🚉', ['おねえさん', 'は'], ['えき', 'へ'], 'いく'], ['🦴', ['いぬ', 'は'], ['ほね', 'を'], 'かじる'], ['🎵', ['こども', 'は'], ['うた', 'を'], 'うたう'],
  ['🌱', ['わたし', 'は'], ['はな', 'を'], 'うえる'], ['🥕', ['おじいさん', 'は'], ['はたけ', 'へ'], 'いく'], ['🧼', ['わたし', 'は'], ['かお', 'を'], 'あらう'],
  ['🦷', ['ぼく', 'は'], ['は', 'を'], 'みがく'], ['🚗', ['おとうさん', 'は'], ['くるま', 'を'], 'あらう'], ['🌲', ['くま', 'は'], ['もり', 'へ'], 'かえる'],
  ['🐜', ['あり', 'は'], ['えさ', 'を'], 'はこぶ'], ['🌊', ['わたし', 'は'], ['うみ', 'へ'], 'いく'], ['🚪', ['おとうと', 'は'], ['へや', 'へ'], 'もどる'],
  ['🎒', ['ぼく', 'は'], ['かばん', 'を'], 'もつ'], ['🏠', ['おばあさん', 'は'], ['いえ', 'へ'], 'かえる'], ['🧹', ['わたし', 'は'], ['にわ', 'を'], 'はく'],
];
const WRONG = { は: 'わ', を: 'お', へ: 'え' };
const sentence = (it) => it.slice(1, -1).map(([w, p]) => w + p).join(' ') + ' ' + it[it.length - 1] + '。';
const WHY = '「は・を・へ」は ことばの あとに くっつく じ。「わ・お・え」と よんでも、かく ときは「は・を・へ」。';

export const BUN = {
  // カードを ならべて ぶんを つくる
  bunGa(level, rng) {
    if (level <= 2) {
      const [emo, s, p] = pick(rng, GA), right = [s, 'が', p, '。'];
      const cards = shuffle(rng, right);
      return { type: 'build', q: 'カードを ならべて、えに あう ぶんを つくろう', cards, order: right.map((c) => cards.indexOf(c)), answer: `${s}が ${p}。`,
        vis: { type: 'emoji', rows: [[emo, 1]] }, explain: `「${s}が ${p}。」 「なにが」→「どうする」の じゅん。ぶんの おわりには まる（。）を つける。`, unit: 'bunGa' };
    }
    // だれが → なにを・どこへ → どうする
    const it = pick(rng, JOSHI), right = [...it.slice(1, -1).map(([w, p]) => w + p), it[it.length - 1], '。'];
    const cards = shuffle(rng, right);
    return { type: 'build', q: 'カードを ならべて、えに あう ぶんを つくろう', cards, order: right.map((c) => cards.indexOf(c)), answer: sentence(it),
      vis: { type: 'emoji', rows: [[it[0], 1]] }, explain: `「${sentence(it)}」 「だれは」→「なにを・どこへ」→「どうする」の じゅん。おわりには まる（。）。`, unit: 'bunGa' };
  },
  // □ に「は・を・へ」を いれる
  bunJoshi(level, rng) {
    const it = pick(rng, JOSHI), mid = it.slice(1, -1), last = it[it.length - 1];
    const blank = level <= 2 ? [Math.floor(rng() * mid.length)] : mid.map((_, i) => i); // やさしい うちは 1かしょ だけ
    const parts = [], slots = [];
    mid.forEach(([w, p], i) => { parts.push(w); if (blank.includes(i)) { parts.push(null); slots.push(p); } else parts[parts.length - 1] += p; });
    parts.push(last + '。');
    const pool = level >= 4 ? shuffle(rng, ['は', 'を', 'へ', 'わ', 'お', 'え']) : ['は', 'を', 'へ'];
    return { type: 'fill', q: '□に じを いれて、ぶんを つくろう', parts, slots, pool, answer: sentence(it),
      vis: { type: 'emoji', rows: [[it[0], 1]] }, explain: `「${sentence(it)}」 ${WHY}`, unit: 'bunJoshi' };
  },
  // まちがった じを タップして なおす
  bunFix(level, rng) {
    const it = pick(rng, JOSHI), mid = it.slice(1, -1);
    const bad = level >= 5 || rng() < 0.4 ? mid.map((_, i) => i) : [Math.floor(rng() * mid.length)];
    const chars = [], wrong = [];
    mid.forEach(([w, p], i) => { chars.push(...w); if (bad.includes(i)) { wrong.push(chars.length); chars.push(WRONG[p]); } else chars.push(p); chars.push(' '); });
    chars.push(...it[it.length - 1], '。');
    return { type: 'fix', q: `まちがった じを タップして なおそう（まちがいは ${wrong.length}つ）`, chars, wrong, answer: sentence(it),
      vis: { type: 'emoji', rows: [[it[0], 1]] }, explain: `ただしくは「${sentence(it)}」 ${WHY}`, unit: 'bunFix' };
  },
};
// タップで いれかわる じ（まちがいなおし）
export const FIX_SWAP = { わ: 'は', は: 'わ', お: 'を', を: 'お', え: 'へ', へ: 'え' };
export const fixed = (q, flips) => q.chars.map((c, i) => (flips.has(i) && FIX_SWAP[c] ? FIX_SWAP[c] : c)).join('');

// レベルに あわせて 1もん つくる（1ねんせいの レベルは 1〜5）。quick＝たたかいの さいちゅう（すぐ こたえられる「□に いれる」だけ）
export function makeBun(topic, level, rng, { quick = false } = {}) {
  let kind = BUN[topic] ? topic : null;
  if (!kind) kind = quick ? 'bunJoshi' : pick(rng, level <= 2 ? ['bunGa', 'bunGa', 'bunJoshi'] : level <= 4 ? ['bunJoshi', 'bunJoshi', 'bunGa', 'bunFix'] : ['bunFix', 'bunFix', 'bunJoshi', 'bunGa']);
  const q = BUN[kind](level, rng);
  q.subj = 'ja'; q.topic = kind; q.level = level;
  return q;
}
