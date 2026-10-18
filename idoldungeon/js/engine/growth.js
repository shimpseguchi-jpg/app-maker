// 経験値とレベルアップ（エルミナージュ風：上がるたびに能力がいくつかランダムに伸びる）。数値は仮
import { BASE_STATS } from './party.js';

// そのレベルに上がるのに必要な累計経験値
export const expForLevel = (lv) => (lv <= 1 ? 0 : Math.round(60 * (lv - 1) ** 2 + 40 * (lv - 1)));
export const MAX_LEVEL = 99;

// unit: { level, exp, base } に経験値を足し、上がったレベルぶん能力を伸ばす。戻り値はメッセージ
export function gainExp(unit, exp, name, rng = Math.random) {
  const msgs = [];
  unit.exp = (unit.exp || 0) + exp;
  while (unit.level < MAX_LEVEL && unit.exp >= expForLevel(unit.level + 1)) {
    unit.level++;
    const ups = [];
    for (const k of BASE_STATS) if (rng() < 0.35) { unit.base[k]++; ups.push(k); }
    if (!ups.length) { const k = BASE_STATS[Math.floor(rng() * BASE_STATS.length)]; unit.base[k]++; ups.push(k); }
    msgs.push(`${name}は Lv${unit.level} になった！`);
  }
  return msgs;
}
