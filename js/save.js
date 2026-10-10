// セーブ（ブラウザに ほぞん）
const P = 'kazumaho.';
function read(k, def) {
  try { const v = localStorage.getItem(P + k); return v ? JSON.parse(v) : def; } catch (e) { return def; }
}
function write(k, v) {
  try { if (v == null) localStorage.removeItem(P + k); else localStorage.setItem(P + k, JSON.stringify(v)); } catch (e) { /* ほぞん できなくても あそべる */ }
}

const DEFAULT_SETTINGS = { text: null, bgm: 0.5, sfx: 0.8, predict: true, speed: 'normal' };
const DEFAULT_META = {
  cards: {}, enemies: {}, facts: {}, tips: {},
  records: { runs: 0, wins: 0, bestFloor: 0, predOk: 0, predTry: 0, calcs: 0, pittari: 0, quizOk: 0, quizTry: 0, maxHit: 0 },
};

export const settings = Object.assign({}, DEFAULT_SETTINGS, read('settings', {}));
export const meta = (() => {
  const m = read('meta', {});
  return { ...DEFAULT_META, ...m, records: { ...DEFAULT_META.records, ...(m.records || {}) } };
})();

export function saveSettings() { write('settings', settings); }
export function saveMeta() { write('meta', meta); }
export function loadRun() { return read('run', null); }
export function saveRun(run) { write('run', run); }
export function clearRun() { write('run', null); }
export function resetAll() {
  try { Object.keys(localStorage).filter((k) => k.startsWith(P)).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* */ }
}

export function markSeenCard(id) { if (!meta.cards[id]) { meta.cards[id] = 1; saveMeta(); } }
export function markSeenEnemy(id) { if (!meta.enemies[id]) { meta.enemies[id] = 1; saveMeta(); } }
// ちしきを はじめて しったら true
export function learnFact(key) { if (meta.facts[key]) return false; meta.facts[key] = Date.now(); saveMeta(); return true; }
export function tipSeen(id) { return !!meta.tips[id]; }
export function markTip(id) { meta.tips[id] = 1; saveMeta(); }
