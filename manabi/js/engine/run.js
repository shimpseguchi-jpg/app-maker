// 1しゅう（ぜんき・こうき）の じょうたいと すすみかた。がめんから どくりつ
import { makeRng } from '../../../js/util.js';
import { HEROES, heroById, MOOD_MUL, SUBJECTS } from '../data/characters.js';
import { CARDS, passiveSum, DECK_MAX } from '../data/cards.js';

export const WEEKS = 4;
export const BASE_GAIN = { 1: 30, 2: 40 };
export const COST = { lesson: 30, minigame: 15, outing: 10, review: 15, restGain: 60 };
export const CARRY_RATE = 0.2, CARRY_MAX = 200;

export function newRun({ grade, heroId, seed, carry = { math: 0, ja: 0, en: 0 }, bringCard = null, hard = false, autorun = false }) {
  const hero = heroById(heroId);
  const stats = {};
  for (const s of SUBJECTS) stats[s] = 50 + (hero.fav === s ? 30 : 0) + (carry[s] || 0);
  const deck = [hero.card]; if (bringCard && CARDS[bringCard]) deck.push(bringCard);
  return {
    v: 1, grade, hero: heroId, hard, autorun, seed, rngState: seed, term: 1, week: 1,
    stats, stamina: 100, mood: 2, deck, level: {}, streak: {}, seenEvents: [], quizResult: null, exam: null,
    log: { lessons: 0, perfect: 0, review: 0, minigame: 0, outing: 0, rest: 0, cardsGot: 0, correct: { math: [0, 0], ja: [0, 0], en: [0, 0] }, examCorrect: 0, examTotal: 0, ranks: [], deaths: 0, noDamage: 0 },
    startedAt: Date.now(), playMs: 0, ended: null, // ended: 'clear' | 'fail'
  };
}
export function runRng(run) { const rng = makeRng(run.rngState); return { rng, save: () => { run.rngState = rng.state(); } }; }
export const rivalsOf = (run) => HEROES.filter((h) => h.id !== run.hero);
export const passives = (run) => passiveSum(run.deck);
export const moodMul = (run) => MOOD_MUL[run.mood];

export function changeMood(run, d) { const p = passives(run); run.mood = Math.max(p.moodFloor, Math.min(4, run.mood + d)); }
export function canDo(run, cmd) {
  if (cmd === 'rest') return true;
  if (cmd === 'review') return run.stamina > 0;
  if (cmd === 'lesson') return run.stamina > 0;
  if (cmd === 'minigame' || cmd === 'outing') return run.stamina > 0;
  return true;
}
// レッスンの せいか：correct/5 → おおせいこう・せいこう・いまいち
export function lessonGain(run, subj, correct, { review = false } = {}) {
  const p = passives(run);
  let base = BASE_GAIN[run.term] * (review ? 1.5 * p.reviewMul : 1);
  const grade = correct >= 5 ? 'perfect' : correct >= 3 ? 'good' : 'poor';
  const mul = grade === 'perfect' ? 2 : grade === 'good' ? 1 : 0.5;
  let gain = base * mul * moodMul(run);
  if (run.stamina < 20) gain *= 0.5;
  gain = Math.round(Math.min(120, gain));
  return { gain, grade, tired: run.stamina < 20 };
}
export function applyLesson(run, subj, correct, { review = false } = {}) {
  const p = passives(run);
  const r = lessonGain(run, subj, correct, { review });
  run.stats[subj] = Math.min(999, run.stats[subj] + r.gain);
  run.stamina = Math.max(0, run.stamina - Math.max(5, (review ? COST.review : COST.lesson) - p.staminaSave));
  if (r.grade === 'perfect') changeMood(run, 1); else if (r.grade === 'poor') changeMood(run, -1);
  run.log[review ? 'review' : 'lessons']++; if (r.grade === 'perfect') run.log.perfect++;
  run.log.correct[subj][0] += correct; run.log.correct[subj][1] += 5;
  return r;
}
export function applyRest(run) { run.stamina = Math.min(100, run.stamina + COST.restGain); run.log.rest++; }
export function applyMinigame(run) { run.stamina = Math.max(0, run.stamina - COST.minigame); changeMood(run, 1); run.log.minigame++; }
export function applyOuting(run) { run.stamina = Math.max(0, run.stamina - COST.outing); run.log.outing++; }
export function addCard(run, id) {
  if (!CARDS[id]) return false;
  if (CARDS[id].type === 'passive' && run.deck.includes(id)) return false;
  if (run.deck.length >= DECK_MAX + 1) return false; // こゆうカード ぶんは べつ
  run.deck.push(id); run.log.cardsGot++; return true;
}
export function removeCard(run, id) { const i = run.deck.indexOf(id); if (i >= 0 && !CARDS[id].fixed) { run.deck.splice(i, 1); return true; } return false; }
export const deckFull = (run) => run.deck.filter((id) => !CARDS[id].fixed).length >= DECK_MAX;
export function applyEffect(run, eff) {
  if (!eff) return;
  for (const s of SUBJECTS) if (eff[s]) run.stats[s] = Math.max(0, Math.min(999, run.stats[s] + eff[s]));
  if (eff.stamina) run.stamina = Math.max(0, Math.min(100, run.stamina + eff.stamina));
  if (eff.mood) changeMood(run, eff.mood);
}
// しゅうを すすめる。テストの ばん なら 'exam' を かえす
export function nextWeek(run) {
  run.week++;
  if (run.week > WEEKS) return 'exam';
  return 'week';
}
export function startNextTerm(run) { run.term = 2; run.week = 1; run.stamina = 100; run.mood = 2; run.quizResult = null; run.exam = null; }

// ライバルの のうりょく（がっきで きまる。とくい きょうかは +30%）
export function rivalStats(hero, term, hard) {
  const base = term === 1 ? 150 : 300; const spread = term === 1 ? 60 : 100;
  const h = heroById(hero.id);
  const seedIdx = HEROES.indexOf(h);
  const stats = {};
  for (const s of SUBJECTS) { let v = base + ((seedIdx * 37 + s.length * 11) % spread); if (h.fav === s) v *= 1.3; if (hard) v *= 1.2; stats[s] = Math.round(v); }
  return stats;
}
export function rivalCorrectRate(hero, subj, term, hard) { let p = term === 1 ? 0.6 : 0.75; if (hero.fav === subj) p += 0.2; if (hard) p += 0.05; return Math.min(0.98, p); }
export function rivalSkill(hero, term, hard) { const base = { rush: 0.7, block: 0.65, safe: 0.8, balance: 0.72 }[hero.style] + (term === 1 ? 0 : 0.1) + (hard ? 0.15 : 0); return Math.min(0.97, base); }

// ごうかく じょうけん
export function passRank(run) { return run.hard ? 1 : run.term === 1 ? 2 : 1; }
export function judge(run, rank) { return rank <= passRank(run); }

// ひきつぎ ポイント
export function carryPoints(run) { const total = SUBJECTS.reduce((s, k) => s + run.stats[k], 0); return Math.min(run.hard ? CARRY_MAX / 2 : CARRY_MAX, Math.floor(total * CARRY_RATE / 10) * 10); }

// せいせきひょう
export function reportCard(run) {
  const corr = run.log.correct;
  const rate = (s) => (corr[s][1] ? Math.round(corr[s][0] / corr[s][1] * 100) : null);
  return {
    hero: run.hero, grade: run.grade, hard: run.hard, stats: { ...run.stats }, ended: run.ended, term: run.term, ranks: [...run.log.ranks],
    rate: { math: rate('math'), ja: rate('ja'), en: rate('en') }, examCorrect: run.log.examCorrect, examTotal: run.log.examTotal,
    deck: [...run.deck], playMs: run.playMs, at: Date.now(), lessons: run.log.lessons, review: run.log.review, perfect: run.log.perfect, noDamage: run.log.noDamage, deaths: run.log.deaths,
  };
}
// しょうごう
export function earnTitles(run, meta) {
  const got = [];
  const give = (id) => { if (!meta.titles[id]) { meta.titles[id] = Date.now(); got.push(id); } };
  const S = run.stats;
  if (S.math >= 500) give('math_b'); if (S.ja >= 500) give('ja_b'); if (S.en >= 500) give('en_b');
  if (S.math >= 400 && S.ja >= 400 && S.en >= 400) give('all_c');
  if (run.ended === 'clear') { give('first_clear'); if (run.log.ranks.every((r) => r === 1)) give('perfect'); if (run.log.noDamage >= 2) give('nodamage'); if (run.deck.filter((c) => !CARDS[c].fixed).length === 0) give('nocard'); if (run.hard) give('hard'); }
  if (run.log.review >= 4) give('review4');
  if (run.log.examCorrect === run.log.examTotal && run.log.examTotal >= 12) give('allcorrect');
  meta.heroClears = meta.heroClears || {}; if (run.ended === 'clear') meta.heroClears[run.hero] = 1;
  if (Object.keys(meta.heroClears).length >= 4) give('four');
  return got;
}
export const TITLES = {
  math_b: { name: 'さんすう はかせ', icon: '🔢', desc: 'さんすうが B いじょう' }, ja_b: { name: 'ことばの たつじん', icon: '📖', desc: 'こくごが B いじょう' }, en_b: { name: 'えいごの たつじん', icon: '🔤', desc: 'えいごが B いじょう' },
  all_c: { name: 'オールラウンダー', icon: '🌈', desc: '3きょうか すべて C いじょう' }, first_clear: { name: 'はじめの いっぽ', icon: '🎓', desc: 'はじめて クリア' }, perfect: { name: 'パーフェクト', icon: '🏆', desc: 'ぜんき・こうき とも 1い' },
  nodamage: { name: 'ノーダメージ', icon: '💎', desc: 'HPを へらさず ゴール（2かい）' }, nocard: { name: 'ノーカード', icon: '🙅', desc: 'カードを つかわず クリア' }, review4: { name: 'ふくしゅうの おに', icon: '📝', desc: '1しゅうで ふくしゅう 4かい' },
  allcorrect: { name: 'ぜんもん せいかい', icon: '💯', desc: 'テストの もんだいを すべて せいかい' }, four: { name: '4にんの なかま', icon: '👫', desc: '4にん ぜんいんで クリア' }, hard: { name: 'むずかしい せいふく', icon: '🔥', desc: 'むずかしいで クリア' },
};
