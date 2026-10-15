// とっくんの コーチ：にがてな しゅるいを みつけて、なんども だす
// ・しゅるいごとに「はこ」（0〜5）を もつ。まちがえずに とけると 1つ あがり、つぎに でるまで あいだが あく
// ・まちがえると はこ 0 に もどって、すぐ また でる
// ・よみまちがい（しき・ききかた・たんい）を した もんだいは「とっくんノート」に のこり、
//   ちがう ひに 2かい まちがえずに とけるまで きえない（おなじ ひに なんかい といても 1かいぶん）
import { KINDS, KIND_IDS, MAX_LEVEL } from '../data/problems.js';
import { prog, settings, saveProg, today } from '../save.js';

const GAP = [0, 1, 2, 4, 7, 14]; // はこごとの つぎに でるまでの ひにち
export const READ_ERRORS = ['ask', 'extra', 'missing', 'dup', 'op', 'order', 'unit'];
export const ERROR_NAME = {
  ask: 'きかれて いる ことの よみまちがい', extra: 'つかわない かずを つかった', missing: 'かずの よみおとし', dup: 'おなじ かずを 2かい',
  op: '＋と −の まちがい', order: 'ひく じゅんばんの まちがい', unit: 'たんいの まちがい', calc: 'けいさんの まちがい', rush: 'よまずに こたえた', hint: 'ヒントを つかった',
};
export const PASSENGERS = ['🐭', '🐰', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🦊', '🐱', '🐶', '🐹', '🦉', '🐢', '🦄', '🐲', '🦖', '🐳', '🦒'];
export const STARS_PER_PASSENGER = 12;

export function level() { return settings.levelMode === 'auto' ? prog.level : Number(settings.levelMode); }
export function kindsFor(lv = level()) { return KIND_IDS.filter((k) => KINDS[k].level <= lv); }
export function stat(kind) {
  if (!prog.kinds[kind]) prog.kinds[kind] = { box: 0, due: '', tries: 0, perfect: 0, recent: [] };
  return prog.kinds[kind];
}
function addDays(date, n) { const d = new Date(date + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

// もんだいを といた けっか
// r = { stars, hint, errs:[しゅるい], ms, quiz:[true/false], fromNote }
export function record(p, r) {
  const d = today();
  const s = stat(p.kind);
  const perfect = r.stars === 3;
  s.tries++; if (perfect) s.perfect++;
  s.recent = [...s.recent, perfect ? 1 : 0].slice(-10);
  // はこが あがるのは 1にち 1かい まで（おなじ ひに つづけて といても「おぼえた」には しない）
  if (perfect) { if (s.up !== d) { s.box = Math.min(5, s.box + 1); s.up = d; } }
  else s.box = r.stars >= 2 ? Math.max(0, s.box - 1) : 0;
  s.due = addDays(d, perfect ? GAP[s.box] : 0);
  r.errs.forEach((e) => { prog.errors[e] = (prog.errors[e] || 0) + 1; });
  (r.quiz || []).forEach((ok) => { prog.quizTry++; if (ok) prog.quizOk++; });
  // とっくんノート
  const readMiss = r.errs.some((e) => READ_ERRORS.includes(e));
  const item = r.fromNote != null ? prog.note.find((x) => x.id === r.fromNote) : prog.note.find((x) => x.kind === p.kind);
  if (item) {
    if (perfect && item.last !== d) { item.need--; item.last = d; }
    else if (!perfect && readMiss) { item.need = 2; item.last = d; item.miss = (item.miss || 0) + 1; }
    if (item.need <= 0) prog.note = prog.note.filter((x) => x !== item);
  } else if (readMiss || r.stars <= 1) {
    prog.note.push({ id: Date.now().toString(36) + Math.floor(Math.random() * 1e4), kind: p.kind, scene: p.scene, at: d, last: d, need: 2, miss: 1, errs: r.errs.filter((e) => READ_ERRORS.includes(e)) });
  }
  // ひごとの きろく
  const day = prog.days[d] || (prog.days[d] = { n: 0, perfect: 0, stars: 0 });
  day.n++; if (perfect) day.perfect++; day.stars += r.stars;
  const before = Math.floor(prog.stars / STARS_PER_PASSENGER);
  prog.stars += r.stars;
  const gained = Math.floor(prog.stars / STARS_PER_PASSENGER) - before;
  if (gained > 0) prog.passengers = Math.min(PASSENGERS.length, prog.passengers + gained);
  prog.log = [...prog.log, { d, k: p.kind, s: r.stars, e: r.errs, ms: Math.round(r.ms || 0) }].slice(-300);
  saveProg();
  return { newPassenger: gained > 0 && prog.passengers <= PASSENGERS.length ? PASSENGERS[prog.passengers - 1] : null };
}

// レベルアップ：いまの レベルの しゅるいが ぜんぶ はこ2いじょう（2かい つづけて まちがえずに とけた）
export function checkLevelUp() {
  if (settings.levelMode !== 'auto' || prog.level >= MAX_LEVEL) return false;
  const ks = KIND_IDS.filter((k) => KINDS[k].level === prog.level);
  if (ks.every((k) => stat(k).box >= 2 && stat(k).tries >= 3)) { prog.level++; saveProg(); return true; }
  return false;
}

// きょうの とっくん：n もん
export function buildSession(rng, n = 8) {
  const d = today();
  const list = [];
  // 1) ノートの もんだい（きょう まだ といて いない もの）を さきに
  //    （きょう ノートに はいった ものは、セッションの なかで 2もん あとに にた もんだいが でる）
  prog.note.filter((x) => x.last !== d && KINDS[x.kind]).slice(0, 3).forEach((x) => list.push({ kind: x.kind, note: x.id }));
  const ks = kindsFor();
  const W = [6, 4, 3, 2, 1, 0.5];
  while (list.length < n) {
    const items = ks.map((k) => {
      const s = stat(k);
      let w = W[s.box] * (!s.due || s.due <= d ? 2 : 0.6);
      if (KINDS[k].level === level()) w *= 1.6;
      // この せっしょんで もう でた しゅるいは でにくく する
      w *= Math.pow(0.5, list.filter((x) => x.kind === k).length);
      // おなじ しゅるいが 3つ つづかない ように
      const last2 = list.slice(-2).map((x) => x.kind);
      if (last2.length === 2 && last2.every((x) => x === k)) w = 0;
      return [k, w];
    });
    list.push({ kind: rng.weighted(items) });
  }
  // さいしょの 1もんは なれた しゅるいで（いきなり むずかしく しない）
  const easyIdx = list.findIndex((x) => !x.note && KINDS[x.kind].level === 1);
  if (easyIdx > 0) { const [e] = list.splice(easyIdx, 1); list.unshift(e); }
  return list;
}

// おうちの かたへ：しゅるいごとの ようす
export function kindReport() {
  return KIND_IDS.map((k) => {
    const s = stat(k);
    const rec = s.recent.length ? Math.round((s.recent.reduce((a, b) => a + b, 0) / s.recent.length) * 100) : null;
    return { kind: k, ...KINDS[k], tries: s.tries, perfect: s.perfect, box: s.box, recent: rec, unlocked: KINDS[k].level <= level(), inNote: prog.note.filter((x) => x.kind === k).length };
  });
}
export function streakDays() {
  let n = 0;
  for (let i = 0; i < 400; i++) { const d = today(-i); if (prog.days[d] && prog.days[d].n > 0) n++; else if (i > 0) break; }
  return n;
}
