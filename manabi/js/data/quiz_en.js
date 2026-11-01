// えいごの もんだい：おとと えが しゅやく。audio は よみあげる えいご
const pick = (rng, a) => a[Math.floor(rng() * a.length)];
const shuffle = (rng, a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export const WORDS = [
  // grade 1〜
  { en: 'apple', ja: 'りんご', emoji: '🍎', g: 1, topic: 'food' }, { en: 'banana', ja: 'バナナ', emoji: '🍌', g: 1, topic: 'food' }, { en: 'egg', ja: 'たまご', emoji: '🥚', g: 1, topic: 'food' }, { en: 'milk', ja: 'ぎゅうにゅう', emoji: '🥛', g: 1, topic: 'food' },
  { en: 'cat', ja: 'ねこ', emoji: '🐱', g: 1, topic: 'animal' }, { en: 'dog', ja: 'いぬ', emoji: '🐶', g: 1, topic: 'animal' }, { en: 'fish', ja: 'さかな', emoji: '🐟', g: 1, topic: 'animal' }, { en: 'bird', ja: 'とり', emoji: '🐦', g: 1, topic: 'animal' }, { en: 'rabbit', ja: 'うさぎ', emoji: '🐰', g: 1, topic: 'animal' }, { en: 'lion', ja: 'ライオン', emoji: '🦁', g: 1, topic: 'animal' },
  { en: 'red', ja: 'あか', emoji: '🟥', g: 1, topic: 'color' }, { en: 'blue', ja: 'あお', emoji: '🟦', g: 1, topic: 'color' }, { en: 'yellow', ja: 'きいろ', emoji: '🟨', g: 1, topic: 'color' }, { en: 'green', ja: 'みどり', emoji: '🟩', g: 1, topic: 'color' },
  { en: 'one', ja: '1', emoji: '1️⃣', g: 1, topic: 'number' }, { en: 'two', ja: '2', emoji: '2️⃣', g: 1, topic: 'number' }, { en: 'three', ja: '3', emoji: '3️⃣', g: 1, topic: 'number' }, { en: 'four', ja: '4', emoji: '4️⃣', g: 1, topic: 'number' }, { en: 'five', ja: '5', emoji: '5️⃣', g: 1, topic: 'number' },
  { en: 'sun', ja: 'たいよう', emoji: '☀️', g: 1, topic: 'nature' }, { en: 'star', ja: 'ほし', emoji: '⭐', g: 1, topic: 'nature' }, { en: 'car', ja: 'くるま', emoji: '🚗', g: 1, topic: 'thing' }, { en: 'book', ja: 'ほん', emoji: '📕', g: 1, topic: 'thing' }, { en: 'ball', ja: 'ボール', emoji: '⚽', g: 1, topic: 'thing' },
  // grade 2〜
  { en: 'orange', ja: 'オレンジ', emoji: '🍊', g: 2, topic: 'food' }, { en: 'bread', ja: 'パン', emoji: '🍞', g: 2, topic: 'food' }, { en: 'rice', ja: 'ごはん', emoji: '🍚', g: 2, topic: 'food' }, { en: 'ice cream', ja: 'アイス', emoji: '🍦', g: 2, topic: 'food' },
  { en: 'elephant', ja: 'ぞう', emoji: '🐘', g: 2, topic: 'animal' }, { en: 'monkey', ja: 'さる', emoji: '🐵', g: 2, topic: 'animal' }, { en: 'horse', ja: 'うま', emoji: '🐴', g: 2, topic: 'animal' }, { en: 'frog', ja: 'かえる', emoji: '🐸', g: 2, topic: 'animal' },
  { en: 'black', ja: 'くろ', emoji: '⬛', g: 2, topic: 'color' }, { en: 'white', ja: 'しろ', emoji: '⬜', g: 2, topic: 'color' }, { en: 'pink', ja: 'ピンク', emoji: '🩷', g: 2, topic: 'color' }, { en: 'purple', ja: 'むらさき', emoji: '🟪', g: 2, topic: 'color' },
  { en: 'six', ja: '6', emoji: '6️⃣', g: 2, topic: 'number' }, { en: 'seven', ja: '7', emoji: '7️⃣', g: 2, topic: 'number' }, { en: 'eight', ja: '8', emoji: '8️⃣', g: 2, topic: 'number' }, { en: 'nine', ja: '9', emoji: '9️⃣', g: 2, topic: 'number' }, { en: 'ten', ja: '10', emoji: '🔟', g: 2, topic: 'number' },
  { en: 'rain', ja: 'あめ', emoji: '🌧️', g: 2, topic: 'nature' }, { en: 'snow', ja: 'ゆき', emoji: '❄️', g: 2, topic: 'nature' }, { en: 'flower', ja: 'はな', emoji: '🌸', g: 2, topic: 'nature' }, { en: 'tree', ja: 'き', emoji: '🌳', g: 2, topic: 'nature' },
  { en: 'bus', ja: 'バス', emoji: '🚌', g: 2, topic: 'thing' }, { en: 'train', ja: 'でんしゃ', emoji: '🚃', g: 2, topic: 'thing' }, { en: 'pencil', ja: 'えんぴつ', emoji: '✏️', g: 2, topic: 'thing' }, { en: 'bag', ja: 'かばん', emoji: '🎒', g: 2, topic: 'thing' },
  // grade 3〜
  { en: 'happy', ja: 'うれしい', emoji: '😄', g: 3, topic: 'feeling' }, { en: 'sad', ja: 'かなしい', emoji: '😢', g: 3, topic: 'feeling' }, { en: 'sleepy', ja: 'ねむい', emoji: '😴', g: 3, topic: 'feeling' }, { en: 'hungry', ja: 'おなかが すいた', emoji: '🤤', g: 3, topic: 'feeling' },
  { en: 'sunny', ja: 'はれ', emoji: '🌞', g: 3, topic: 'weather' }, { en: 'rainy', ja: 'あめふり', emoji: '☔', g: 3, topic: 'weather' }, { en: 'cloudy', ja: 'くもり', emoji: '☁️', g: 3, topic: 'weather' }, { en: 'windy', ja: 'かぜが つよい', emoji: '🌬️', g: 3, topic: 'weather' },
  { en: 'Monday', ja: 'げつようび', emoji: '🗓️', g: 3, topic: 'day' }, { en: 'Tuesday', ja: 'かようび', emoji: '🗓️', g: 3, topic: 'day' }, { en: 'Wednesday', ja: 'すいようび', emoji: '🗓️', g: 3, topic: 'day' }, { en: 'Thursday', ja: 'もくようび', emoji: '🗓️', g: 3, topic: 'day' }, { en: 'Friday', ja: 'きんようび', emoji: '🗓️', g: 3, topic: 'day' }, { en: 'Saturday', ja: 'どようび', emoji: '🗓️', g: 3, topic: 'day' }, { en: 'Sunday', ja: 'にちようび', emoji: '🗓️', g: 3, topic: 'day' },
  { en: 'soccer', ja: 'サッカー', emoji: '⚽', g: 3, topic: 'sport' }, { en: 'baseball', ja: 'やきゅう', emoji: '⚾', g: 3, topic: 'sport' }, { en: 'swimming', ja: 'すいえい', emoji: '🏊', g: 3, topic: 'sport' }, { en: 'tennis', ja: 'テニス', emoji: '🎾', g: 3, topic: 'sport' },
];
export const GREETINGS = [
  ['あさ あったとき', 'Good morning.', ['Good night.', 'Thank you.']], ['ありがとうと いうとき', 'Thank you.', ['Sorry.', 'Hello.']], ['ごめんねと いうとき', "I'm sorry.", ['See you.', 'Good morning.']],
  ['わかれるとき', 'See you.', ['Hello.', 'Thank you.']], ['ねる まえに', 'Good night.', ['Good morning.', 'Yes.']], ['はじめて あったとき', 'Nice to meet you.', ['Good night.', "I'm fine."]],
  ['「げんき？」と きかれて げんきなとき', "I'm fine.", ["I'm sorry.", 'See you.']], ['なまえを いうとき', "I'm Ken.", ['Thank you.', 'Good night.']],
];
export const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const wordsFor = (g) => WORDS.filter((w) => w.g <= g);

export const QUIZ_EN = {
  // え → えいご（きいて えらぶ）
  pickWord(g, rng) {
    const pool = wordsFor(g); const w = pick(rng, pool);
    const others = shuffle(rng, pool.filter((x) => x !== w && x.topic === w.topic)).slice(0, 2);
    const opts = others.length < 2 ? shuffle(rng, pool.filter((x) => x !== w)).slice(0, 2) : others;
    return { q: `この えは えいごで なに？ 🔊を おすと きけるよ`, answer: w.en, choices: shuffle(rng, [w, ...opts]).map((x) => x.en), vis: { type: 'emoji', rows: [[w.emoji, 1]] }, audio: w.en, audioChoices: true, explain: `${w.emoji} は「${w.en}」（${w.ja}）`, unit: 'word' };
  },
  // えいご（おと） → え
  hearPick(g, rng) {
    const pool = wordsFor(g); const w = pick(rng, pool);
    const others = shuffle(rng, pool.filter((x) => x !== w && x.emoji !== w.emoji)).slice(0, 2);
    return { q: `🔊 「${w.en}」は どれ？`, answer: w.emoji, choices: shuffle(rng, [w, ...others]).map((x) => x.emoji), audio: w.en, autoSpeak: true, explain: `「${w.en}」は ${w.ja} ${w.emoji}`, unit: 'listen', big: true };
  },
  // えいご → にほんご
  meaning(g, rng) {
    const pool = wordsFor(g); const w = pick(rng, pool);
    const others = shuffle(rng, pool.filter((x) => x !== w)).slice(0, 2);
    return { q: `「${w.en}」は どういう いみ？`, answer: w.ja, choices: shuffle(rng, [w, ...others]).map((x) => x.ja), audio: w.en, explain: `「${w.en}」は ${w.ja} ${w.emoji}`, unit: 'word' };
  },
  alphabet(g, rng) {
    const i = Math.floor(rng() * 24); const a = ALPHA[i], b = ALPHA[i + 1];
    const others = shuffle(rng, ALPHA.split('').filter((c) => c !== b && c !== a)).slice(0, 2);
    return { q: `アルファベットで「${a}」の つぎは？`, answer: b, choices: shuffle(rng, [b, ...others]), audio: a, explain: `… ${a} → ${b} …`, unit: 'alphabet', big: true };
  },
  lower(g, rng) {
    const i = Math.floor(rng() * 26); const a = ALPHA[i]; const ans = a.toLowerCase();
    const others = shuffle(rng, ALPHA.split('').filter((c) => c !== a)).slice(0, 2).map((c) => c.toLowerCase());
    return { q: `おおもじ「${a}」の こもじは？`, answer: ans, choices: shuffle(rng, [ans, ...others]), audio: a, explain: `${a} の こもじは ${ans}`, unit: 'alphabet', big: true };
  },
  greeting(g, rng) {
    const it = pick(rng, GREETINGS);
    return { q: `${it[0]}、えいごで なんと いう？`, answer: it[1], choices: shuffle(rng, [it[1], ...it[2]]), audio: it[1], audioChoices: true, explain: `${it[0]}は「${it[1]}」`, unit: 'greeting' };
  },
  count(g, rng) {
    const n = 1 + Math.floor(rng() * (g === 1 ? 5 : 10)); const emo = pick(rng, ['🍎', '⭐', '🐱', '🎈', '🍪']);
    const words = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
    const others = shuffle(rng, words.slice(1, g === 1 ? 6 : 11).filter((x) => x !== words[n])).slice(0, 2);
    return { q: `いくつ ある？ えいごで こたえよう`, answer: words[n], choices: shuffle(rng, [words[n], ...others]), vis: { type: 'emoji', rows: [[emo, n]] }, audio: words[n], audioChoices: true, explain: `${n}こ。えいごで「${words[n]}」`, unit: 'number' };
  },
};
export function enTopics(g, level) {
  if (g === 1) return level <= 3 ? ['hearPick', 'alphabet', 'count'] : level <= 6 ? ['pickWord', 'hearPick', 'alphabet', 'count'] : ['pickWord', 'meaning', 'greeting'];
  if (g === 2) return level <= 3 ? ['hearPick', 'pickWord', 'count'] : level <= 6 ? ['pickWord', 'meaning', 'alphabet', 'greeting'] : ['meaning', 'greeting', 'lower'];
  return level <= 3 ? ['pickWord', 'hearPick', 'lower'] : level <= 6 ? ['meaning', 'greeting', 'lower'] : ['meaning', 'greeting', 'pickWord'];
}
