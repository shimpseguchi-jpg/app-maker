// さんすうの もんだい（1ねんせいの ないようを、ならう じゅんに）
// こたえを だす だけで なく、かんがえかたを 1てずつ いれる もんだい（type:'steps'）が ある
//   sanKazu   … かずを かぞえる・なんばんめ
//   sanBond   … いくつと いくつ（7は 3と □）
//   sanTeen   … 10より おおきい かず（10と 4で □）
//   san3      … 3つの かずの けいさん
//   sanMake10 … くりあがりの たしざん（10の まとまりを つくる「さくらんぼ」の かんがえかた）
//   sanSub10  … くりさがりの ひきざん（10から ひいて のこりを たす）
//   sanStory  … ぶんしょうだい（たしざんか ひきざんかを きめてから けいさん）
//   sanBig    … おおきい かず（10が いくつと 1が いくつ）
// steps: [{ text（□が こたえの ばしょ）, answer, choices? }]。choices が あれば えらぶ、なければ すうじを いれる

const pick = (rng, a) => a[Math.floor(rng() * a.length)];
const ri = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const shuffle = (rng, a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
// すうじの こたえを 3たくに する（たたかいの さいちゅう）
function withChoices(q, rng) {
  const ans = Number(q.answer), set = new Set([ans]);
  for (let g = 0; set.size < 3 && g < 50; g++) { const v = ans + ri(rng, 1, 3) * (rng() < 0.5 ? -1 : 1); if (v >= 0) set.add(v); }
  return { ...q, choices: shuffle(rng, [...set]) };
}
const num = (q, rng, quick) => (quick ? withChoices(q, rng) : q);
const aru = (c) => (c === 'にん' ? 'います' : 'あります'); // ひとは「います」

const ANIMALS = ['🐶', '🐱', '🐭', '🐰', '🐻', '🐸', '🐵', '🐧', '🐷', '🐔'];
const THINGS = ['🍎', '⭐', '🍪', '🎈', '🌷', '🐟', '🍓', '🚗'];
// ぶんしょうだい。かぞえかたは おとが かわらない もの だけ（こ・まい・にん・だい・さつ）
const COMBINE = [['あかい りんご', 'みどりの りんご', 'こ', '🍎🍏'], ['おとこのこ', 'おんなのこ', 'にん', '👦👧'], ['あかい いろがみ', 'あおい いろがみ', 'まい', '🔴🔵'], ['おおきい くるま', 'ちいさい くるま', 'だい', '🚌🚗'], ['えほん', 'ずかん', 'さつ', '📕📗']];
const INCREASE = [['どんぐり', 'こ', 'ひろうと', '🌰'], ['いろがみ', 'まい', 'もらうと', '🔶'], ['こども', 'にん', 'くると', '🧒'], ['くるま', 'だい', 'くると', '🚗'], ['ほん', 'さつ', 'かうと', '📘']];
const REMAIN = [['みかん', 'こ', 'たべると', '🍊'], ['いろがみ', 'まい', 'つかうと', '🔷'], ['こども', 'にん', 'かえると', '🧒'], ['くるま', 'だい', 'でて いくと', '🚙'], ['おかし', 'こ', 'たべると', '🍪']];
const DIFF = [['りんご', 'みかん', 'こ', '🍎🍊'], ['おとこのこ', 'おんなのこ', 'にん', '👦👧'], ['あかい いろがみ', 'あおい いろがみ', 'まい', '🔴🔵'], ['いぬの ほん', 'ねこの ほん', 'さつ', '📙📘']];

export const SAN = {
  sanKazu(level, rng, quick) {
    if (rng() < 0.5) {
      const n = ri(rng, 3, 10), emo = pick(rng, THINGS);
      const rows = n > 5 ? [[emo, 5], [emo, n - 5]] : [[emo, n]];
      return num({ q: 'いくつ あるかな？', answer: n, vis: { type: 'emoji', rows }, explain: `ぜんぶで ${n}。5の まとまりで かぞえると はやい。`, unit: 'sanKazu' }, rng, quick);
    }
    const row = shuffle(rng, ANIMALS).slice(0, 5), k = ri(rng, 1, 5), left = rng() < 0.5;
    return { q: `${left ? 'ひだり' : 'みぎ'}から ${k}ばんめは どれ？`, answer: row[left ? k - 1 : 5 - k], choices: row, row: true, big: true,
      explain: `${left ? 'ひだり' : 'みぎ'}から 1、2、3…と じゅんに かぞえる。`, unit: 'sanKazu' };
  },
  sanBond(level, rng, quick) {
    const n = ri(rng, level <= 1 ? 5 : 6, 10), a = ri(rng, 1, n - 1), b = n - a;
    const vis = { type: 'dots', a, b };
    if (rng() < 0.3) return num({ q: `${a}と ${b}で いくつ？`, answer: n, vis, explain: `${a}と ${b}で ${n}。`, unit: 'sanBond' }, rng, quick);
    return num({ q: `${n}は ${a}と いくつ？`, answer: b, vis, explain: `${n}は ${a}と ${b}。`, unit: 'sanBond' }, rng, quick);
  },
  sanTeen(level, rng, quick) {
    const t = ri(rng, 0, level >= 3 ? 3 : 1), k = ri(rng, 1, 9);
    if (t === 0) return num({ q: `10と ${k}で いくつ？`, answer: 10 + k, vis: { type: 'dots', a: 10, b: k }, explain: `10と ${k}で ${10 + k}。`, unit: 'sanTeen' }, rng, quick);
    if (t === 1) return num({ q: `${10 + k}は 10と いくつ？`, answer: k, vis: { type: 'dots', a: 10, b: k }, explain: `${10 + k}は 10と ${k}。`, unit: 'sanTeen' }, rng, quick);
    const base = ri(rng, 11, 16), d = ri(rng, 1, 3), up = t === 2;
    return num({ q: `${base}より ${d} ${up ? 'おおきい' : 'ちいさい'} かずは？`, answer: up ? base + d : base - d, explain: `${base}から ${d} ${up ? 'すすむ' : 'もどる'}と ${up ? base + d : base - d}。`, unit: 'sanTeen' }, rng, quick);
  },
  san3(level, rng, quick) {
    const t = ri(rng, 0, level >= 4 ? 4 : 2);
    let a, b, c, o1 = '+', o2 = '+';
    if (t === 0) { a = ri(rng, 1, 4); b = ri(rng, 1, 3); c = ri(rng, 1, 3); }
    else if (t === 1) { a = ri(rng, 7, 10); b = ri(rng, 1, 3); c = ri(rng, 1, 3); o1 = o2 = '−'; }
    else if (t === 2) { a = ri(rng, 3, 6); b = ri(rng, 1, 3); c = ri(rng, 1, a + b - 1); o2 = '−'; }
    else if (t === 3) { a = ri(rng, 6, 9); b = 10 - a; c = ri(rng, 2, 8); } // 10を つくって から たす
    else { c = ri(rng, 1, 5); b = ri(rng, 1, 8); a = 10 + b; o1 = o2 = '−'; } // 10に してから ひく
    const f = (x, o, y) => (o === '+' ? x + y : x - y), m = f(a, o1, b), ans = f(m, o2, c);
    return num({ q: `${a} ${o1} ${b} ${o2} ${c} = ？`, answer: ans, explain: `まえから じゅんに。${a} ${o1} ${b} = ${m}、${m} ${o2} ${c} = ${ans}。`, unit: 'san3' }, rng, quick);
  },
  sanMake10(level, rng, quick) {
    const a = ri(rng, 7, 9), b = ri(rng, 11 - a, Math.min(a, 9)), need = 10 - a, rest = b - need, ans = a + b;
    const explain = `${a}は あと ${need}で 10。${b}を ${need}と ${rest}に わける。10と ${rest}で ${ans}。`;
    if (quick) return withChoices({ q: `${a} + ${b} = ？`, answer: ans, explain, unit: 'sanMake10' }, rng);
    return { type: 'steps', q: `${a} + ${b} を、10の まとまりを つくって けいさん しよう`, answer: `${a} + ${b} = ${ans}`, explain, unit: 'sanMake10',
      steps: [{ text: `${a}は あと □で 10`, answer: need }, { text: `${b}を ${need}と □に わける`, answer: rest }, { text: `10と ${rest}で □`, answer: ans }] };
  },
  sanSub10(level, rng, quick) {
    const ones = ri(rng, 1, 8), a = 10 + ones, b = ri(rng, ones + 1, 9), left = 10 - b, ans = a - b;
    const explain = `${a}を 10と ${ones}に わける。10から ${b}を ひいて ${left}。${left}と ${ones}で ${ans}。`;
    if (quick) return withChoices({ q: `${a} − ${b} = ？`, answer: ans, explain, unit: 'sanSub10' }, rng);
    return { type: 'steps', q: `${a} − ${b} を、10から ひいて けいさん しよう`, answer: `${a} − ${b} = ${ans}`, explain, unit: 'sanSub10',
      steps: [{ text: `${a}を 10と □に わける`, answer: ones }, { text: `10 − ${b} = □`, answer: left }, { text: `${left}と ${ones}で □`, answer: ans }] };
  },
  sanStory(level, rng, quick) {
    const big = level >= 4; // くりあがり・くりさがりの ある かず
    const kind = pick(rng, level >= 4 ? ['combine', 'increase', 'remain', 'diff', 'diff'] : ['combine', 'increase', 'remain', 'remain']);
    let text, a, b, op, emo, c;
    if (kind === 'combine') { const t = pick(rng, COMBINE); a = ri(rng, 2, big ? 9 : 5); b = ri(rng, 2, big ? 9 : 4); op = '+'; c = t[2]; emo = t[3]; text = `${t[0]}が ${a}${c}、${t[1]}が ${b}${c} ${aru(c)}。あわせて なん${c}？`; }
    else if (kind === 'increase') { const t = pick(rng, INCREASE); a = ri(rng, 3, big ? 9 : 6); b = ri(rng, 2, big ? 8 : 3); op = '+'; c = t[1]; emo = t[3]; text = `${t[0]}が ${a}${c} ${aru(c)}。${b}${c} ${t[2]}、ぜんぶで なん${c}？`; }
    else if (kind === 'remain') { const t = pick(rng, REMAIN); a = big ? ri(rng, 11, 16) : ri(rng, 5, 10); b = big ? ri(rng, a - 9, 9) : ri(rng, 1, a - 1); op = '−'; c = t[1]; emo = t[3]; text = `${t[0]}が ${a}${c} ${aru(c)}。${b}${c} ${t[2]}、のこりは なん${c}？`; }
    else { const t = pick(rng, DIFF); a = ri(rng, 6, 13); b = ri(rng, Math.max(2, a - 9), a - 2); op = '−'; c = t[2]; emo = t[3]; text = `${t[0]}が ${a}${c}、${t[1]}が ${b}${c} ${aru(c)}。${t[0]}は ${t[1]}より なん${c} おおい？`; }
    const ans = op === '+' ? a + b : a - b, shiki = `${a} ${op} ${b}`;
    const why = { combine: '「あわせて」は たしざん。', increase: 'ふえるから たしざん。', remain: '「のこりは」は ひきざん。', diff: '「ちがい」を しらべる ときは、おおい ほうから すくない ほうを ひく。' }[kind];
    const explain = `${why} しき：${shiki} = ${ans}　こたえ：${ans}${c}`;
    const vis = { type: 'emoji', rows: [[emo, 1]], small: true };
    if (quick) return { q: `${text}<br>しきは どれ？`, answer: shiki, choices: shuffle(rng, [`${a} + ${b}`, `${a} − ${b}`, a === b ? `${a + 1} + ${b}` : `${b} − ${a}`]), explain, unit: 'sanStory', long: true };
    return { type: 'steps', q: text, answer: `${shiki} = ${ans}`, explain, unit: 'sanStory', vis, long: true,
      steps: [{ text: 'どっち？', answer: op === '+' ? 'たしざん' : 'ひきざん', choices: ['たしざん', 'ひきざん'] }, { text: `${shiki} = □`, answer: ans }] };
  },
  sanBig(level, rng, quick) {
    const t = ri(rng, 0, 2), tens = ri(rng, 2, 9), ones = ri(rng, 1, 9), n = tens * 10 + ones;
    if (t === 0) return num({ q: `10が ${tens}こと、1が ${ones}こで いくつ？`, answer: n, explain: `10が ${tens}こで ${tens * 10}。${tens * 10}と ${ones}で ${n}。`, unit: 'sanBig' }, rng, quick);
    if (t === 1) return num({ q: `${n}は、10が なんこと 1が ${ones}こ？`, answer: tens, explain: `${n}の じゅうの くらいは ${tens}。10が ${tens}こ。`, unit: 'sanBig' }, rng, quick);
    const s = ri(rng, 18, 96), k = ri(rng, 1, 2), seq = [s, s + 1, s + 2, s + 3];
    return num({ q: `□に はいる かずは？　${seq.map((v, i) => (i === k ? '□' : v)).join('、')}`, answer: seq[k], explain: `1ずつ ふえて いる。${seq.join('、')}。`, unit: 'sanBig' }, rng, quick);
  },
};

// がくねんと レベルに あわせた たんげん（1ねんせいの レベルは 1〜5。ならう じゅんに ひろがる）
export function sanTopics(grade, level) {
  if (grade >= 2) return ['sanMake10', 'sanSub10', 'sanStory', 'san3'];
  if (level <= 1) return ['sanKazu', 'sanBond', 'sanBond'];
  if (level === 2) return ['sanBond', 'sanTeen', 'sanTeen', 'sanStory'];
  if (level === 3) return ['sanTeen', 'san3', 'sanMake10', 'sanMake10', 'sanStory'];
  if (level === 4) return ['sanMake10', 'sanSub10', 'sanSub10', 'san3', 'sanStory'];
  return ['sanSub10', 'sanMake10', 'sanStory', 'sanStory', 'sanBig'];
}
// 1もん つくる。quick＝たたかいの さいちゅう（えらぶ だけ）
export function makeSan(topic, grade, level, rng, { quick = false } = {}) {
  const kind = SAN[topic] ? topic : pick(rng, sanTopics(grade, level));
  const q = SAN[kind](grade >= 2 ? Math.max(level, 4) : level, rng, quick);
  q.subj = 'math'; q.topic = kind; q.level = level;
  return q;
}
