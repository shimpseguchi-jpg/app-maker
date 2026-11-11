// まなび：もんだいを えらぶ・こたえを きろくする（がめんから どくりつ）
// もんだいの つくりかた・レベルちょうせい・にがての きろくは「まなびサクセス」の しくみを りゅうよう
import { makeQuestion, adaptLevel, levelRange } from '../../../manabi/js/engine/quiz.js';
import { makeBun, BUN } from '../data/quiz_bun.js';

export const SUBJECTS = {
  math: { id: 'math', name: 'さんすう', emo: '🔢', color: '#4f8dff' },
  ja: { id: 'ja', name: 'こくご', emo: '📝', color: '#ff6f91' },
  en: { id: 'en', name: 'えいご', emo: '🔤', color: '#2fbf71' },
};
// たんげんの なまえ（きろくの がめんで つかう）
export const UNIT_NAMES = {
  'math:arith': 'けいさん', 'math:tenComp': '10の まとまり', 'math:missing': '□の かず', 'math:legs': 'あしの かず', 'math:pattern': 'きまり さがし',
  'math:clock': 'とけい', 'math:money': 'おかね', 'math:shape': 'かたち', 'math:unit': 'たんい',
  'ja:kanji': 'かんじ', 'ja:antonym': 'はんたいの ことば', 'ja:katakana': 'カタカナ', 'ja:group': 'なかまの ことば', 'ja:particle': 'は・を・へ', 'ja:order': 'ぶんの じゅんばん', 'ja:kosoado': 'こそあど',
  'ja:bunGa': 'ぶんを つくる（〜が 〜。）', 'ja:bunJoshi': 'は・を・へを つかう', 'ja:bunFix': 'まちがいを なおす',
  'en:word': 'えいたんご', 'en:listen': 'ききとり', 'en:alphabet': 'アルファベット', 'en:greeting': 'あいさつ', 'en:number': 'かず',
};

export function newLearn(grade = 1, subjects = ['math', 'ja', 'en']) {
  return { grade, subjects, level: {}, streak: {}, mistakes: [], units: {}, wrong: [], recent: [], total: 0, correct: 0, combo: 0, best: 0, days: {} };
}
export const subjectLevel = (L, subj) => L.level[subj] ?? levelRange(L.grade)[0] + 1;

// つぎの もんだい。にがてな たんげんが あれば ときどき そこから だす（ふくしゅう）
// keypad: true＝すうじは じぶんで うつ / false＝3たく（たたかいの さいちゅう など）
// bun＝こくごの「ぶんづくり」だけを だす（まなびの こや）
export function nextQuestion(L, rng, { keypad = false, subj = null, reviewOnly = false, bun = false } = {}) {
  const subjects = L.subjects.length ? L.subjects : ['math'];
  const weak = L.mistakes.filter((m) => subjects.includes(m.subj) && (!subj || m.subj === subj));
  let topic = null, review = false;
  if (weak.length && !bun && (reviewOnly || rng() < 0.3)) { const m = weak[Math.floor(rng() * weak.length)]; subj = m.subj; topic = m.topic; review = true; }
  if (!subj) subj = subjects[Math.floor(rng() * subjects.length)];
  if (bun) subj = 'ja';
  // こくごは、ぶんづくり（は・を・へ など）を おおめに だす。1ねんせいは はんぶん、2・3ねんせいは ふくしゅうとして 4ぶんの1
  const useBun = subj === 'ja' && (bun || (topic ? !!BUN[topic] : rng() < (L.grade === 1 ? 0.5 : 0.25)));
  let q;
  if (useBun) {
    for (let t = 0; t < 8; t++) { q = makeBun(bun && !BUN[topic] ? null : topic, subjectLevel(L, 'ja'), rng, { quick: !keypad }); if (!L.recent.includes(q.q + '|' + q.answer)) break; }
  } else q = makeQuestion(subj, L.grade, subjectLevel(L, subj), rng, { recent: L.recent, topic, keypad });
  q.review = review;
  return q;
}

// こたえを きろくする。もどりち { combo, levelUp, levelDown }
export function recordAnswer(L, q, ok, day = '') {
  const key = `${q.subj}:${q.unit || q.topic}`;
  const u = L.units[key] || [0, 0]; u[0] += ok ? 1 : 0; u[1]++; L.units[key] = u;
  L.total++; if (ok) L.correct++;
  L.combo = ok ? L.combo + 1 : 0; L.best = Math.max(L.best, L.combo);
  if (day) { const d = L.days[day] || [0, 0]; d[0] += ok ? 1 : 0; d[1]++; L.days[day] = d; const keys = Object.keys(L.days); if (keys.length > 30) delete L.days[keys[0]]; }
  L.recent.push(q.q + '|' + q.answer); if (L.recent.length > 8) L.recent.shift();
  const before = subjectLevel(L, q.subj);
  const after = adaptLevel(L, q.subj, ok, L.grade);
  // にがて：まちがえた たんげんを おぼえる。ふくしゅうで 2かい せいかい すると そつぎょう
  const m = L.mistakes.find((x) => x.subj === q.subj && x.topic === q.topic);
  if (ok) { if (m && q.review && --m.need <= 0) L.mistakes = L.mistakes.filter((x) => x !== m); }
  else {
    if (m) m.need = 2; else L.mistakes.push({ subj: q.subj, topic: q.topic, need: 2 });
    if (L.mistakes.length > 30) L.mistakes.shift();
    L.wrong.unshift({ subj: q.subj, q: q.q, answer: String(q.answer), explain: q.explain || '', day });
    if (L.wrong.length > 20) L.wrong.pop();
  }
  return { combo: L.combo, levelUp: after > before, levelDown: after < before };
}
export const accuracy = (L) => (L.total ? Math.round(L.correct / L.total * 100) : 0);
