// 記録（セーブ）。自動保存とは別に、3つの記録枠と、文字列での書き出し・読み込み（機種変更・バックアップ用）
const SLOT = (n) => `idoldungeon.slot${n}`;
export const SLOTS = [1, 2, 3];

export function saveSlot(n, ex) {
  const rec = { savedAt: new Date().toISOString(), summary: summary(ex), data: ex };
  localStorage.setItem(SLOT(n), JSON.stringify(rec));
  return rec;
}
export function readSlot(n) {
  try { return JSON.parse(localStorage.getItem(SLOT(n))); } catch (e) { return null; }
}
export function summary(ex) {
  const lv = ex.slots.map((s) => ex.units?.[s.idol]?.level || 1);
  return `${ex.slots.length}人・最高Lv${lv.length ? Math.max(...lv) : '-'}・${ex.gold}G・${ex.days || 0}泊`;
}

// 書き出し：JSON を base64 にした文字列（日本語を含むので UTF-8 を経由）
export function exportText(ex) {
  const bytes = new TextEncoder().encode(JSON.stringify(ex));
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return 'IDLD1:' + btoa(bin);
}
export function importText(text) {
  const t = String(text).trim();
  if (!t.startsWith('IDLD1:')) throw new Error('アイドル迷宮の記録ではない');
  const bin = atob(t.slice(6));
  const ex = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
  if (!ex?.ex?.dungeon || !Array.isArray(ex.slots)) throw new Error('記録が壊れている');
  return ex;
}
