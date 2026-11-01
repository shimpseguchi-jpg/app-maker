// セーブ（ブラウザに ほぞん）。かぎの せっとうじ manabi.
const P = 'manabi.';
function read(k, def) { try { const v = localStorage.getItem(P + k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
function write(k, v) { try { if (v == null) localStorage.removeItem(P + k); else localStorage.setItem(P + k, JSON.stringify(v)); } catch (e) { /* ほぞん できなくても あそべる */ } }

const DEFAULT_SETTINGS = { text: null, bgm: 0.5, sfx: 0.8, speech: true, fontSize: 'm', autorun: false, easy: false };
const DEFAULT_META = { runs: 0, clears: 0, carry: 0, carryFrom: null, mistakes: [], cards: {}, titles: {}, album: [], scores: [], kanji: {}, words: {}, units: {}, heroClears: {}, hardUnlocked: false, playLog: [] };

export const settings = Object.assign({}, DEFAULT_SETTINGS, read('settings', {}));
export const meta = (() => { const m = read('meta', {}); return { ...DEFAULT_META, ...m }; })();
export function saveSettings() { write('settings', settings); }
export function saveMeta() { write('meta', meta); }
export function loadRun() { return read('run', null); }
export function saveRun(run) { write('run', run); }
export function clearRun() { write('run', null); }
export function resetAll() { try { Object.keys(localStorage).filter((k) => k.startsWith(P)).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* */ } }
export function markCard(id) { if (!meta.cards[id]) { meta.cards[id] = Date.now(); saveMeta(); } }
// たんげんごとの せいとうりつ（おうちのひとへ）
export function logUnit(subj, unit, ok) { const k = `${subj}:${unit}`; const u = meta.units[k] || [0, 0]; u[0] += ok ? 1 : 0; u[1]++; meta.units[k] = u; }
export function logMistakeDetail(q, ok) {
  meta.playLog = meta.playLog || [];
  if (!ok) { meta.playLog.unshift({ subj: q.subj, q: q.q, a: String(q.answer), ex: q.explain, at: Date.now() }); if (meta.playLog.length > 20) meta.playLog.length = 20; }
}
