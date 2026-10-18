// ボスの再戦強化とドロップ（docs/DESIGN.md 9章）
// clears: そのボスを倒した回数（0＝初戦。クリア後に再出現するたびに1ずつ増える）
// 強さは5回ごとの段階で上がる：1〜5回目は最初の強さ、6〜10回目は第2段階、11〜15回目は第3段階……
import { BOSSES } from '../data/bosses.js';

export const STAGE_SIZE = 5;          // 何回倒すごとに1段階強くなるか
export const STAT_GROWTH = 0.5;       // 1段階ごとの能力上昇（+50%）
export const LEVEL_GROWTH = 10;       // 1段階ごとのレベル
export const MASTER_RATE = { base: 10, per: 20, max: 50 }; // マスタープルフのドロップ率（%）。段階ごとに上がる
export const bossStage = (clears = 0) => Math.floor(clears / STAGE_SIZE);
// 次の段階まであと何回倒すか
export const untilNextStage = (clears = 0) => STAGE_SIZE - (clears % STAGE_SIZE);

// 倒した回数が clears のボスの能力。特性・報酬も段階で決まる（弱いうちに何度倒しても報酬は増えない）
export function bossAt(id, clears = 0) {
  const b = BOSSES[id], stage = bossStage(clears);
  const mul = 1 + STAT_GROWTH * stage;
  const stats = {};
  for (const [k, v] of Object.entries(b.base)) stats[k] = Math.floor(v * mul);
  return { ...b, clears, stage, level: b.level + LEVEL_GROWTH * stage, stats,
    traits: b.rematch.filter((t) => stage >= t.from),
    gold: Math.floor(b.gold * (1 + 0.5 * stage)),
    songRank: Math.min(5, b.songRank + stage) };
}

// 倒したときのドロップ。系統別の昇格アイテムは確定、マスタープルフは段階が上がるほど出やすい
export function rollDrops(id, clears = 0, rng = Math.random) {
  const b = bossAt(id, clears);
  const crests = BOSSES[id].drops.crests;
  const items = [crests[Math.floor(rng() * crests.length)]];
  if (rng() * 100 < masterRate(clears)) items.push('masterSeal');
  return { items, gold: b.gold, songRank: b.songRank };
}
export const masterRate = (clears) => Math.min(MASTER_RATE.max, MASTER_RATE.base + MASTER_RATE.per * bossStage(clears));

// 店の在庫：マスタープルフはボスを倒した回数ぶん入荷（買えば減る）
export function shopStock(totalClears, bought = 0) {
  return { masterSeal: Math.max(0, totalClears - bought) };
}
