// セーブ（ブラウザに ほぞん。REQUIREMENTS.md F-901〜F-903・F-806）。かぎの せっとうじ missiontimer.
const P = 'missiontimer.';
function read(k, def) { try { const v = localStorage.getItem(P + k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
function write(k, v) { try { if (v == null) localStorage.removeItem(P + k); else localStorage.setItem(P + k, JSON.stringify(v)); } catch (e) { /* ほぞん できなくても つかえる */ } }

// こども むけの せってい（F-101・F-104）。text は 'hira'（ひらがな）| 'ruby'（{漢字|かんじ}に ふりがな）
const DEFAULT_PROFILE = { setup: false, grade: 2, theme: 'detective', view: 'disc', showNumbers: true, volume: 'normal', speech: true, drama: 'normal', text: 'ruby', briefings: 0 };
// ほごしゃモード（F-801〜F-805）
const DEFAULT_PARENT = { rewardCapDay: 30, rewardCapMission: 30, extendMax: 2, allowEndExtend: false, shrink: 'others', pauseLongPress: false, bathAt: '', kidCustom: true };

export const profile = { ...DEFAULT_PROFILE, ...read('profile', {}) };
export const parent = { ...DEFAULT_PARENT, ...read('parent', {}) };
// きろく：days['2026-11-06'] = { stars, items: [panel], focusMin, rewardMin, stamp, missions }（F-702・F-703）
export const record = { days: {}, totalStars: 0, missions: [], ...read('record', {}) };
export const custom = read('custom', []);   // じさく パネル（F-305）
export const recent = read('recent', []);   // さいきん つかった パネル（F-301）

export function saveProfile() { write('profile', profile); }
export function saveParent() { write('parent', parent); }
export function saveRecord() { write('record', record); }
export function saveCustom() { write('custom', custom); }
export function saveRecent() { write('recent', recent); }
export function loadMission() { return read('mission', null); }
export function saveMission(m) { write('mission', m); }
export function loadDraft() { return read('draft', null); }
export function loadLast() { return read('last', null); }     // このまえの ミッション（ホームの「このまえと おなじ」）
export function saveLast(l) { write('last', l); }
export function saveDraft(d) { write('draft', d); }

export function dayKey(ms = Date.now()) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// F-903 きろくは ちょっきん 365にち。こえた ぶんは つきごとの ごうけいに たたむ
export function compactRecord(now = Date.now()) {
  const limit = dayKey(now - 365 * 86400000);
  record.months = record.months || {};
  for (const k of Object.keys(record.days)) {
    if (k >= limit) continue;
    const d = record.days[k], mk = k.slice(0, 7);
    const mo = record.months[mk] || { stars: 0, focusMin: 0, stamps: 0 };
    mo.stars += d.stars || 0; mo.focusMin += d.focusMin || 0; mo.stamps += d.stamp ? 1 : 0;
    record.months[mk] = mo;
    delete record.days[k];
  }
  if (record.missions.length > 200) record.missions.length = 200;
}

// F-806 かきだし・よみこみ（きしゅへんこう よう）
export function exportAll() {
  const out = {};
  for (const k of ['profile', 'parent', 'record', 'custom', 'recent', 'last']) out[k] = read(k, null);
  return { app: 'missiontimer', version: 1, at: new Date().toISOString(), data: out };
}
export function importAll(obj) {
  if (!obj || obj.app !== 'missiontimer' || !obj.data) throw new Error('bad file');
  for (const [k, v] of Object.entries(obj.data)) if (v != null) write(k, v);
}
export function resetAll() {
  try { Object.keys(localStorage).filter((k) => k.startsWith(P)).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* */ }
}
