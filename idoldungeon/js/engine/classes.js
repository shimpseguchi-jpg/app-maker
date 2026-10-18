// 転職（エルミナージュ式）と昇格（聖魔の光石式）
// unit: { idol, cls, level, carry, base: {pow..vis}, learned: [abilityId...], history: [clsId...] }
// carry：これまでのクラスで積んだレベルの合計（能力値の計算に使う。js/engine/party.js の power）
import { CLASSES, PROMOTE_LEVEL, SPELLS } from '../data/classes.js';
import { BASE_STATS } from './party.js';
import { itemFits } from '../data/items.js';

export function newUnit(idol) {
  return { idol: idol.id, cls: idol.cls, level: 1, base: { ...idol.base }, learned: [], history: [] };
}

// 転職：能力が条件を満たせばなれる。Lv1・経験値0 に戻り、能力はアイドル本来の値に戻る。覚えた魔法は引き継ぐ
export function canChangeClass(unit, clsId) {
  const c = CLASSES[clsId];
  if (!c || !c.change || clsId === unit.cls) return false;
  return Object.entries(c.req || {}).every(([k, v]) => unit.base[k] >= v);
}
export function changeClass(unit, clsId, idol) {
  if (!canChangeClass(unit, clsId)) throw new Error(`転職できない: ${unit.idol} → ${clsId}`);
  return { ...unit, cls: clsId, level: 1, exp: 0, carry: (unit.carry || 0) + unit.level, base: { ...idol.base },
    learned: mergeLearned(unit), history: [...(unit.history || []), unit.cls] };
}

// 昇格：下位職 Lv10 以上で、今のクラスに合う昇格アイテム（js/data/items.js）を使って2択の上位職へ
// Lv1・経験値0 に戻るが能力は残り、昇格ボーナスが足される。アイテムは使うとなくなる（在庫の管理は呼び出し側）
export function canPromote(unit, clsId, itemId) {
  const cur = CLASSES[unit.cls];
  return !!(cur?.tier === 1 && unit.level >= PROMOTE_LEVEL && cur.promote.includes(clsId) && itemFits(itemId, unit.cls));
}
export function promote(unit, clsId, itemId) {
  if (!canPromote(unit, clsId, itemId)) throw new Error(`昇格できない: ${unit.cls} → ${clsId}`);
  const bonus = CLASSES[clsId].bonus || {};
  const base = {};
  for (const k of BASE_STATS) base[k] = unit.base[k] + (bonus[k] || 0);
  return { ...unit, cls: clsId, level: 1, exp: 0, carry: (unit.carry || 0) + unit.level, base, learned: mergeLearned(unit), history: [...(unit.history || []), unit.cls] };
}

// 今のクラスの魔法を「覚えた」に加える（クラスを変えても魔法は残る）
function mergeLearned(unit) {
  const ids = CLASSES[unit.cls].effects.filter((e) => e.type === 'ability' && SPELLS.has(e.id)).map((e) => e.id);
  return [...new Set([...unit.learned, ...ids])];
}
