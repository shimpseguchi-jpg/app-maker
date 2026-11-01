// しゅつだい：きょうか・がくねん・レベルから もんだいを つくる。ちょうふく よけ・まちがえた もんだいの きろく
import { QUIZ } from '../../../js/data/events.js';
import { QUIZ_JA, jaTopics } from '../data/quiz_ja.js';
import { QUIZ_EN, enTopics } from '../data/quiz_en.js';

function mathTopics(g, level) {
  if (level <= 2) return ['arith', 'tenComp'];
  if (level <= 4) return ['arith', 'tenComp', 'missing', 'legs'];
  if (level <= 6) return ['arith', 'missing', 'pattern', 'clock', 'money', 'shape'];
  return ['missing', 'pattern', 'unit', 'money', 'legs', 'clock'];
}
const GEN = {
  math: (topic, g, rng) => ({ ...QUIZ[topic](g, rng), unit: topic }),
  ja: (topic, g, rng) => QUIZ_JA[topic](g, rng),
  en: (topic, g, rng) => QUIZ_EN[topic](g, rng),
};
const TOPICS = { math: mathTopics, ja: jaTopics, en: enTopics };

// すうじの こたえで choices が ないときは キーぱっど。3たくに したいときは makeChoices
export function makeChoices(q, rng) {
  if (q.choices) return q;
  const ans = Number(q.answer); if (!Number.isFinite(ans)) return q;
  const set = new Set([ans]); let guard = 0;
  while (set.size < 3 && guard++ < 50) {
    const spread = Math.max(2, Math.round(Math.abs(ans) * 0.2) + 2);
    const d = (1 + Math.floor(rng() * spread)) * (rng() < 0.5 ? -1 : 1);
    if (ans + d >= 0) set.add(ans + d);
  }
  const list = [...set]; for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return { ...q, choices: list };
}

// 1もん つくる。recent は ちょうふく よけの もんだいぶん
export function makeQuestion(subj, grade, level, rng, { recent = [], topic = null, keypad = true } = {}) {
  const g = Math.max(1, Math.min(3, grade));
  const lv = Math.max(1, Math.min(8, level));
  const topics = TOPICS[subj](g, lv);
  for (let tries = 0; tries < 12; tries++) {
    const t = topic && GEN[subj] && (subj === 'math' ? QUIZ[topic] : subj === 'ja' ? QUIZ_JA[topic] : QUIZ_EN[topic]) ? topic : topics[Math.floor(rng() * topics.length)];
    let q = GEN[subj](t, g, rng);
    q.subj = subj; q.topic = t; q.level = lv;
    if (recent.includes(q.q + '|' + q.answer) && tries < 10) continue;
    if (!keypad) q = makeChoices(q, rng);
    return q;
  }
  return { ...GEN[subj](topics[0], g, rng), subj, topic: topics[0], level: lv };
}

// てきおう なんいど：2れんぞく せいかいで +1、まちがいで −1。がくねんごとの はば
export function levelRange(grade) { return grade === 1 ? [1, 5] : grade === 2 ? [2, 7] : [3, 8]; }
export function adaptLevel(state, subj, ok, grade) {
  const [lo, hi] = levelRange(grade);
  state.streak = state.streak || {}; state.level = state.level || {};
  const cur = state.level[subj] ?? lo + 1;
  if (ok) { state.streak[subj] = (state.streak[subj] || 0) + 1; if (state.streak[subj] >= 2) { state.level[subj] = Math.min(hi, cur + 1); state.streak[subj] = 0; } }
  else { state.streak[subj] = 0; state.level[subj] = Math.max(lo, cur - 1); }
  return state.level[subj];
}
// テストでは がっきで レベル こてい
export function examLevel(grade, term) { const [lo, hi] = levelRange(grade); return term === 1 ? Math.round(lo + (hi - lo) * 0.35) : Math.round(lo + (hi - lo) * 0.7); }

// まちがえた もんだい：{ subj, topic } を おぼえる（さいせい できる じょうほう）
export function recordMistake(meta, q) {
  meta.mistakes = meta.mistakes || [];
  if (!meta.mistakes.some((m) => m.subj === q.subj && m.topic === q.topic)) meta.mistakes.push({ subj: q.subj, topic: q.topic, at: Date.now() });
  if (meta.mistakes.length > 30) meta.mistakes.shift();
}
export function clearMistake(meta, q) { if (meta.mistakes) meta.mistakes = meta.mistakes.filter((m) => !(m.subj === q.subj && m.topic === q.topic)); }
export function mistakesFor(meta, subj) { return (meta.mistakes || []).filter((m) => m.subj === subj); }
