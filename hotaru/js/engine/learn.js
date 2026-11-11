// まなび：もんだいを えらぶ・こたえを きろくする（がめんから どくりつ）
// もんだいの つくりかた・レベルちょうせい・にがての きろくは「まなびサクセス」の しくみを りゅうよう
import { makeQuestion, adaptLevel, levelRange } from '../../../manabi/js/engine/quiz.js';
import { makeBun, BUN } from '../data/quiz_bun.js';
import { makeHyoki, HYOKI } from '../data/quiz_hyoki.js';
import { makeSan, SAN } from '../data/quiz_san.js';

export const SUBJECTS = {
  math: { id: 'math', name: 'さんすう', emo: '🔢', color: '#4f8dff' },
  ja: { id: 'ja', name: 'こくご', emo: '📝', color: '#ff6f91' },
  en: { id: 'en', name: 'えいご', emo: '🔤', color: '#2fbf71' },
};
// たんげんの なまえ（きろくの がめんで つかう）
export const UNIT_NAMES = {
  'math:arith': 'けいさん', 'math:tenComp': '10の まとまり', 'math:missing': '□の かず', 'math:legs': 'あしの かず', 'math:pattern': 'きまり さがし',
  'math:sanKazu': 'かずを かぞえる・なんばんめ', 'math:sanBond': 'いくつと いくつ', 'math:sanTeen': '10より おおきい かず', 'math:san3': '3つの かずの けいさん',
  'math:sanMake10': 'くりあがりの たしざん', 'math:sanSub10': 'くりさがりの ひきざん', 'math:sanStory': 'ぶんしょうだい', 'math:sanBig': 'おおきい かず',
  'math:clock': 'とけい', 'math:money': 'おかね', 'math:shape': 'かたち', 'math:unit': 'たんい',
  'ja:kanji': 'かんじ', 'ja:antonym': 'はんたいの ことば', 'ja:katakana': 'カタカナ', 'ja:group': 'なかまの ことば', 'ja:particle': 'は・を・へ', 'ja:order': 'ぶんの じゅんばん', 'ja:kosoado': 'こそあど',
  'ja:hyoDaku': '゛゜の つく じ', 'ja:hyoSoku': 'ちいさい「っ」', 'ja:hyoChoon': 'のばす おん', 'ja:hyoYoon': 'ちいさい「ゃ・ゅ・ょ」',
  'ja:bunGa': 'ぶんを つくる（〜が 〜。）', 'ja:bunJoshi': 'は・を・へを つかう', 'ja:bunFix': 'まちがいを なおす',
  'en:word': 'えいたんご', 'en:listen': 'ききとり', 'en:alphabet': 'アルファベット', 'en:greeting': 'あいさつ', 'en:number': 'かず',
};

export function newLearn(grade = 1, subjects = ['math', 'ja', 'en']) {
  return { grade, subjects, level: {}, streak: {}, mistakes: [], units: {}, wrong: [], recent: [], total: 0, correct: 0, combo: 0, best: 0, days: {} };
}
export const subjectLevel = (L, subj) => L.level[subj] ?? levelRange(L.grade)[0] + 1;

// つぎの もんだい。にがてな たんげんが あれば ときどき そこから だす（ふくしゅう）
// keypad: true＝すうじは じぶんで うつ / false＝3たく（たたかいの さいちゅう など）
// group＝こくごの 'bun'（ぶんづくり）・'hyoki'（かなの きまり）、さんすうの 'san'（けいさんの しかた・ぶんしょうだい）だけを だす（まなびの こや）
export function nextQuestion(L, rng, { keypad = false, subj = null, reviewOnly = false, group = null } = {}) {
  const subjects = L.subjects.length ? L.subjects : ['math'];
  const weak = L.mistakes.filter((m) => subjects.includes(m.subj) && (!subj || m.subj === subj));
  let topic = null, review = false;
  if (weak.length && !group && (reviewOnly || rng() < 0.3)) { const m = weak[Math.floor(rng() * weak.length)]; subj = m.subj; topic = m.topic; review = true; }
  if (!subj) subj = subjects[Math.floor(rng() * subjects.length)];
  if (group) subj = group === 'san' ? 'math' : 'ja';
  // こくごは、かなの きまり（゛゜・っ・のばす おん・ゃゅょ）と ぶんづくり（は・を・へ）を おおめに だす
  // 1ねんせい：かな 3わり・ぶん 3わり ／ 2・3ねんせい：ふくしゅうとして かな 1わり・ぶん 2わり
  let kind = null;
  if (subj === 'ja') {
    if (group) kind = group;
    else if (topic) kind = BUN[topic] ? 'bun' : HYOKI[topic] ? 'hyoki' : null;
    else { const r = rng(), g1 = L.grade === 1; kind = r < (g1 ? 0.3 : 0.1) ? 'hyoki' : r < (g1 ? 0.6 : 0.3) ? 'bun' : null; }
  }
  // さんすうは、1ねんせいの ないようを ならう じゅんに だす（7わり）。2ねんせいは ふくしゅうとして 2わり
  if (subj === 'math') {
    if (group) kind = 'san';
    else if (topic) kind = SAN[topic] ? 'san' : null;
    else if (rng() < (L.grade === 1 ? 0.7 : L.grade === 2 ? 0.2 : 0)) kind = 'san';
  }
  let q;
  if (kind === 'san') {
    for (let k = 0; k < 8; k++) { q = makeSan(SAN[topic] ? topic : null, L.grade, subjectLevel(L, 'math'), rng, { quick: !keypad }); if (!L.recent.includes(q.q + '|' + q.answer)) break; }
  } else if (kind) {
    const make = kind === 'bun' ? makeBun : makeHyoki, t = (kind === 'bun' ? BUN : HYOKI)[topic] ? topic : null;
    for (let k = 0; k < 8; k++) { q = make(t, subjectLevel(L, 'ja'), rng, { quick: !keypad }); if (!L.recent.includes(q.q + '|' + q.answer)) break; }
  } else {
    // えらぶ なかに おなじ ものが 2つ ある もんだい（おなじ えの えいたんご など）は つくりなおす
    for (let k = 0; k < 8; k++) { q = makeQuestion(subj, L.grade, subjectLevel(L, subj), rng, { recent: L.recent, topic, keypad }); if (!q.choices || new Set(q.choices.map(String)).size === q.choices.length) break; }
  }
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
