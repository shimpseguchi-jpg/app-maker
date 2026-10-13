// セーブ（ブラウザに ほぞん）
const P = 'arcanumber.';
function read(k, def) { try { const v = localStorage.getItem(P + k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
function write(k, v) { try { if (v == null) localStorage.removeItem(P + k); else localStorage.setItem(P + k, JSON.stringify(v)); } catch (e) { /* ほぞん できなくても あそべる */ } }

// はじめは おと なし・はやさ「はやい」（sv：せっていの はんばん）
const DEFAULT_SETTINGS = { text: null, bgm: 0, sfx: 0, challenge: true, speed: 'fast', sv: 2 };
const DEFAULT_META = {
  cards: {}, arcana: {}, enemies: {}, hands: {}, facts: {}, tips: {},
  records: { runs: 0, wins: 0, bestAct: 0, best: 0, challengeOk: 0, challengeTry: 0, quizOk: 0, quizTry: 0, heroWins: {} },
};
export const settings = (() => {
  const saved = read('settings', {});
  // まえの はんの ほぞんデータは、おと・はやさを あたらしい はじめの せっていに そろえる（いちどだけ）
  if (saved.sv !== DEFAULT_SETTINGS.sv) { delete saved.bgm; delete saved.sfx; delete saved.speed; }
  return Object.assign({}, DEFAULT_SETTINGS, saved);
})();
export const meta = (() => { const m = read('meta', {}); return { ...DEFAULT_META, ...m, records: { ...DEFAULT_META.records, ...(m.records || {}) } }; })();
export function saveSettings() { write('settings', settings); }
export function saveMeta() { write('meta', meta); }
export function loadRun() { return read('run', null); }
export function saveRun(run) { write('run', run); }
export function clearRun() { write('run', null); }
export function resetAll() { try { Object.keys(localStorage).filter((k) => k.startsWith(P)).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* */ } }
export function mark(kind, id) { if (!meta[kind][id]) { meta[kind][id] = 1; saveMeta(); } }
export function tipSeen(id) { return !!meta.tips[id]; }
export function markTip(id) { meta.tips[id] = 1; saveMeta(); }
