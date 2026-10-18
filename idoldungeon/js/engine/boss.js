// ボスの再戦強化とドロップ
// clears: そのボスを倒した回数（0＝初戦。クリア後に再出現するたびに1ずつ増える）
// 数値は仮。戦闘エンジンを作るときに調整する
import { BOSSES } from '../data/bosses.js';

export const STAT_GROWTH = 0.3;       // 再戦1回ごとの能力上昇（+30%）
export const LEVEL_GROWTH = 5;
export const MASTER_RATE = { base: 10, per: 10, max: 50 }; // マスタープルフのドロップ率（%）

// 再戦 n 回目のボスの能力
export function bossAt(id, clears = 0) {
  const b = BOSSES[id];
  const mul = 1 + STAT_GROWTH * clears;
  const stats = {};
  for (const [k, v] of Object.entries(b.base)) stats[k] = Math.floor(v * mul);
  return { ...b, clears, level: b.level + LEVEL_GROWTH * clears, stats,
    traits: b.rematch.filter((t) => clears >= t.from),
    gold: Math.floor(b.gold * (1 + 0.5 * clears)),
    songRank: Math.min(5, b.songRank + clears) };
}

// 倒したときのドロップ。系統別の昇格アイテムは確定、マスタープルフは再戦ほど出やすい
export function rollDrops(id, clears = 0, rng = Math.random) {
  const b = bossAt(id, clears);
  const crests = BOSSES[id].drops.crests;
  const items = [crests[Math.floor(rng() * crests.length)]];
  if (rng() * 100 < masterRate(clears)) items.push('masterSeal');
  return { items, gold: b.gold, songRank: b.songRank };
}
export const masterRate = (clears) => Math.min(MASTER_RATE.max, MASTER_RATE.base + MASTER_RATE.per * clears);

// 店の在庫：マスタープルフはボスを倒した回数ぶん入荷（買えば減る）
export function shopStock(totalClears, bought = 0) {
  return { masterSeal: Math.max(0, totalClears - bought) };
}
