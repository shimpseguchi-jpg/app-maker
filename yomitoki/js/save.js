// セーブ（ブラウザに ほぞん）
const P = 'yomitoki.';
function read(k, def) { try { const v = localStorage.getItem(P + k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
function write(k, v) { try { if (v == null) localStorage.removeItem(P + k); else localStorage.setItem(P + k, JSON.stringify(v)); } catch (e) { /* ほぞん できなくても あそべる */ } }

// read：よみあげ（hint＝つかうと ★が へる / free＝いつでも / off＝なし）
// rush：あわてんぼう ロック（よまずに こたえると すこし まつ）
const DEFAULT_SETTINGS = { sfx: 0.7, read: 'hint', rush: true, levelMode: 'auto', big: false };
const DEFAULT_PROG = {
  level: 1,          // いまの レベル（1〜3）
  kinds: {},         // しゅるいごとの きろく { box, due, tries, perfect, recent:[0/1...] }
  note: [],          // とっくんノート [{ kind, scene, at, need }]
  errors: {},        // まちがいの しゅるいごとの かず
  quizOk: 0, quizTry: 0,   // 「ふえる？へる？」の せいかい
  days: {},          // { 'YYYY-MM-DD': { n, perfect, stars } }
  stars: 0,          // ぜんぶの ★
  passengers: 1,     // でんしゃに のって いる なかま
  calcBest: {},      // けいさん れっしゃの いちばん はやい じかん
  sortBest: {},      // ことば しわけ
  log: [],           // さいきんの もんだい（おうちの かたへ）
};
export const settings = Object.assign({}, DEFAULT_SETTINGS, read('settings', {}));
export const prog = (() => { const m = read('prog', {}); return { ...DEFAULT_PROG, ...m }; })();
export function saveSettings() { write('settings', settings); }
export function saveProg() { write('prog', prog); }
export function resetAll() {
  try { Object.keys(localStorage).filter((k) => k.startsWith(P)).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* */ }
  Object.keys(prog).forEach((k) => delete prog[k]);
  Object.assign(prog, JSON.parse(JSON.stringify(DEFAULT_PROG)));
}

// きょうの ひづけ（にほん じかん）
export function today(offset = 0) {
  const d = new Date(Date.now() + 9 * 3600e3 + offset * 86400e3);
  return d.toISOString().slice(0, 10);
}
