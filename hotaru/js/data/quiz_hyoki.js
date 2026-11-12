// かなの きまり（ひょうき）の もんだい（こくご・1ねんせいの 1がっき）
// 光村図書「こくご一上」の ならびに あわせた 4たんげん。ことばは ぜんぶ この ゲームの ために えらんだ もの
//   hyoDaku  … ゛゜の つく じ（5月「かきと かぎ」）
//   hyoSoku  … ちいさい「っ」（5月「ねこと ねっこ」）
//   hyoChoon … のばす おん（6月「おばさんと おばあさん」）
//   hyoYoon  … ちいさい「ゃ・ゅ・ょ」（6月「おもちやと おもちゃ」）
// もんだいの かたち
//   えを みて ただしい かきかたを えらぶ（3たく）／ にた ことばの えを えらぶ（2たく）
//   fix … まちがった じを タップして なおす（ぶんづくりの まちがいなおしと おなじ がめん。swap＝いれかわる じ）

const pick = (rng, a) => a[Math.floor(rng() * a.length)];
const shuffle = (rng, a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const uniq = (a) => [...new Set(a)];

// ゛゜：[え, ただしい, まちがい1, まちがい2]
export const DAKU = [
  ['🔑', 'かぎ', 'かき', 'がき'], ['🐷', 'ぶた', 'ふた', 'ぷた'], ['🍇', 'ぶどう', 'ふどう', 'ぶとう'], ['🐘', 'ぞう', 'そう', 'どう'], ['🍎', 'りんご', 'りんこ', 'りんぐ'],
  ['📞', 'でんわ', 'てんわ', 'でんば'], ['✏️', 'えんぴつ', 'えんひつ', 'えんびつ'], ['🌼', 'たんぽぽ', 'たんほほ', 'たんぼぼ'], ['🐭', 'ねずみ', 'ねすみ', 'ねずび'],
  ['👓', 'めがね', 'めかね', 'めがめ'], ['🍙', 'おにぎり', 'おにきり', 'おにぎい'], ['🌈', 'にじ', 'にし', 'にぎ'], ['🍓', 'いちご', 'いちこ', 'いじご'], ['🥚', 'たまご', 'たまこ', 'だまご'],
  ['🐰', 'うさぎ', 'うさき', 'うざぎ'], ['💧', 'みず', 'みす', 'みぞ'], ['🧤', 'てぶくろ', 'てふくろ', 'でぶくろ'], ['🌰', 'どんぐり', 'とんくり', 'どんくり'], ['🍁', 'もみじ', 'もみし', 'もみぎ'],
  ['🐧', 'ぺんぎん', 'へんきん', 'べんぎん'], ['🦒', 'きりん', 'ぎりん', 'きりぐ'], ['🎩', 'ぼうし', 'ほうし', 'ぽうし'], ['💰', 'おかね', 'おがね', 'おかげ'],
];
// ちいさい「っ」：[え, ただしい]
export const SOKU = [
  ['🎫', 'きっぷ'], ['🌱', 'ねっこ'], ['🏫', 'がっこう'], ['🎺', 'らっぱ'], ['📔', 'にっき'], ['🎶', 'がっき'], ['🧼', 'せっけん'], ['🍃', 'はっぱ'],
  ['🦗', 'ばった'], ['3️⃣', 'みっつ'], ['4️⃣', 'よっつ'], ['6️⃣', 'むっつ'], ['8️⃣', 'やっつ'], ['🍋', 'すっぱい'],
];
// のばす おん：[え, ただしい, まちがい1, まちがい2]。「お」の だんは「う」と かく ものが おおい（おとうさん）。「おおかみ・こおり・とお」は「お」
export const CHOON = [
  ['👵', 'おばあさん', 'おばさん', 'おばーさん'], ['👴', 'おじいさん', 'おじさん', 'おじーさん'], ['👨', 'おとうさん', 'おとおさん', 'おとさん'], ['👩', 'おかあさん', 'おかさん', 'おかーさん'],
  ['👦', 'おにいさん', 'おにさん', 'おにーさん'], ['👧', 'おねえさん', 'おねいさん', 'おねさん'], ['🐺', 'おおかみ', 'おうかみ', 'おかみ'], ['✈️', 'ひこうき', 'ひこおき', 'ひこき'],
  ['🧊', 'こおり', 'こうり', 'こり'], ['🎈', 'ふうせん', 'ふせん', 'ふーせん'], ['🧹', 'ほうき', 'ほおき', 'ほき'], ['🕰️', 'とけい', 'とけえ', 'とけ'],
  ['🎬', 'えいが', 'ええが', 'えが'], ['🔟', 'とお', 'とう', 'と'], ['🚦', 'しんごう', 'しんごお', 'しんご'], ['🐘', 'ぞう', 'ぞお', 'ぞ'], ['🌬️', 'たいふう', 'たいふ', 'たいふー'],
  ['🎩', 'ぼうし', 'ぼおし', 'ぼし'], ['🚓', 'けいさつ', 'けえさつ', 'けさつ'],
];
// ちいさい「ゃ・ゅ・ょ」：[え, ただしい]
export const YOON = [
  ['🧸', 'おもちゃ'], ['🚃', 'でんしゃ'], ['🍵', 'おちゃ'], ['🥛', 'ぎゅうにゅう'], ['🥒', 'きゅうり'], ['🏥', 'びょういん'], ['💯', 'ひゃく'], ['📷', 'しゃしん'],
  ['🚒', 'しょうぼうしゃ'], ['🚑', 'きゅうきゅうしゃ'], ['🎃', 'かぼちゃ'], ['🐉', 'りゅう'], ['🥟', 'ぎょうざ'], ['🐟', 'きんぎょ'], ['🩺', 'いしゃ'], ['🦋', 'ちょうちょ'],
  ['📚', 'としょかん'], ['🚲', 'じてんしゃ'], ['👶', 'あかちゃん'], ['💉', 'ちゅうしゃ'], ['🤝', 'あくしゅ'], ['🍚', 'ちゃわん'],
];
// にた ことば：[[ことば, え], [ことば, え], たんげん]
export const PAIRS = [
  [['ねこ', '🐱'], ['ねっこ', '🌱'], 'hyoSoku'],
  [['おばさん', '👩'], ['おばあさん', '👵'], 'hyoChoon'], [['おじさん', '👨'], ['おじいさん', '👴'], 'hyoChoon'],
  [['びょういん', '🏥'], ['びよういん', '💇'], 'hyoYoon'],
];

const VOICED = 'がかぎきぐくげけごこざさじしずすぜせぞそだたぢちづつでてどとばはびひぶふべへぼほ';
const DAKU_SWAP = {}; for (let i = 0; i < VOICED.length; i += 2) { DAKU_SWAP[VOICED[i]] = VOICED[i + 1]; DAKU_SWAP[VOICED[i + 1]] = VOICED[i]; }
const unvoice = (w) => [...w].map((c) => (VOICED.indexOf(c) >= 0 && VOICED.indexOf(c) % 2 === 0 ? DAKU_SWAP[c] : c)).join('');
const SMALL = { ゃ: 'や', ゅ: 'ゆ', ょ: 'よ', っ: 'つ' };
const big = (w) => [...w].map((c) => SMALL[c] || c).join('');
const SOKU_SWAP = { つ: 'っ', っ: 'つ' }, YOON_SWAP = { や: 'ゃ', ゃ: 'や', ゆ: 'ゅ', ゅ: 'ゆ', よ: 'ょ', ょ: 'よ' };
const diff = (a, b) => [...a].flatMap((c, i) => (c !== b[i] ? [i] : []));

const WHY = {
  hyoDaku: '「か」に てんてん（゛）で「が」。「は」に まる（゜）で「ぱ」。てんてんが あると ちがう ことばに なる。',
  hyoSoku: 'つまる おんは、ちいさい「っ」を かく。',
  hyoChoon: 'のばす おんは「あ・い・う・え・お」を かく。「おとうさん」の ように、「お」の だんは「う」と かく ことが おおい。',
  hyoYoon: '「きゃ・しゅ・ちょ」の ような おんは、「ゃ・ゅ・ょ」を ちいさく かく。',
};
const choice = (rng, emo, right, wrongs, unit) => ({ q: 'えに あう、ただしい かきかたは どれ？', answer: right, choices: shuffle(rng, uniq([right, ...wrongs]).slice(0, 3)),
  vis: { type: 'emoji', rows: [[emo, 1]] }, explain: `「${right}」 ${WHY[unit]}`, unit });
const fix = (emo, right, shown, swap, prompt, unit) => { const wrong = diff(shown, right); return { type: 'fix', q: `${prompt}（${wrong.length}つ）`, chars: [...shown], wrong, swap, answer: right,
  vis: { type: 'emoji', rows: [[emo, 1]] }, explain: `ただしくは「${right}」 ${WHY[unit]}`, unit }; };
// 「ねっこ」は どっち？
function pair(rng, unit) {
  const p = pick(rng, PAIRS.filter((x) => x[2] === unit)), k = rng() < 0.5 ? 0 : 1;
  return { q: `「${p[k][0]}」は どっち？`, answer: p[k][1], choices: shuffle(rng, [p[0][1], p[1][1]]), big: true, explain: `${p[0][1]} は「${p[0][0]}」、${p[1][1]} は「${p[1][0]}」。 ${WHY[unit]}`, unit };
}

// active＝じぶんで なおす もんだい（fix）を だして よい（たたかいの さいちゅうは えらぶ だけ）
export const HYOKI = {
  hyoDaku(rng, active) {
    const r = rng();
    const [emo, right, w1, w2] = pick(rng, DAKU);
    const plain = unvoice(right);
    if (active && r < 0.6 && plain !== right && !/[ぱぴぷぺぽ]/.test(right)) return fix(emo, right, plain, DAKU_SWAP, 'てんてん（゛）が ぬけた じを タップして なおそう', 'hyoDaku');
    return choice(rng, emo, right, [w1, w2], 'hyoDaku');
  },
  hyoSoku(rng, active) {
    const r = rng();
    if (r < 0.2) return pair(rng, 'hyoSoku');
    const [emo, right] = pick(rng, SOKU);
    if (active && r < 0.6) return fix(emo, right, big(right), SOKU_SWAP, 'ちいさく かく「っ」を タップして なおそう', 'hyoSoku');
    return choice(rng, emo, right, [big(right), right.replace('っ', '')], 'hyoSoku');
  },
  hyoChoon(rng) {
    if (rng() < 0.2) return pair(rng, 'hyoChoon');
    const [emo, right, w1, w2] = pick(rng, CHOON);
    return choice(rng, emo, right, [w1, w2], 'hyoChoon');
  },
  hyoYoon(rng, active) {
    const r = rng();
    if (r < 0.12) return pair(rng, 'hyoYoon');
    const [emo, right] = pick(rng, YOON);
    if (active && r < 0.6) return fix(emo, right, big(right), YOON_SWAP, 'ちいさく かく じを タップして なおそう', 'hyoYoon');
    const other = right.replace(/[ゃゅょ]/, (c) => ({ ゃ: 'ょ', ゅ: 'ゃ', ょ: 'ゅ' }[c]));
    return choice(rng, emo, right, [big(right), other], 'hyoYoon');
  },
};

// レベルに あわせて 1もん つくる（きょうかしょの じゅん：゛゜・っ → のばす おん・ゃゅょ）。quick＝たたかいの さいちゅう
export function makeHyoki(topic, level, rng, { quick = false } = {}) {
  const kind = HYOKI[topic] ? topic : pick(rng, level <= 2 ? ['hyoDaku', 'hyoSoku'] : ['hyoDaku', 'hyoSoku', 'hyoChoon', 'hyoChoon', 'hyoYoon', 'hyoYoon']);
  const q = HYOKI[kind](rng, !quick);
  q.subj = 'ja'; q.topic = kind; q.level = level;
  return q;
}
