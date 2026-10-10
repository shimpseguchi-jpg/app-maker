// 役（やく）：じゅもんに いれた ルーンの くみあわせ
// rank が おおきいほど つよい
export const HANDS = {
  five:     { rank: 13, name: 'ファイブ', power: 120, mult: 12, up: [40, 4], desc: 'おなじ {数|かず}が 5{枚|まい}', ex: [7, 7, 7, 7, 7] },
  rainbow:  { rank: 12, name: 'いろかいだん', power: 100, mult: 8, up: [40, 4], desc: '5{枚|まい}が {数|かず}の じゅんばんで、ぞくせいも ぜんぶ おなじ', ex: [3, 4, 5, 6, 7] },
  four:     { rank: 11, name: 'フォーカード', power: 60, mult: 7, up: [30, 3], desc: 'おなじ {数|かず}が 4{枚|まい}', ex: [4, 4, 4, 4] },
  fullHouse:{ rank: 10, name: 'フルハウス', power: 40, mult: 4, up: [25, 2], desc: 'おなじ {数|かず} 3{枚|まい} と おなじ {数|かず} 2{枚|まい}', ex: [6, 6, 6, 2, 2] },
  longStair:{ rank: 9, name: 'ながい かいだん', power: 40, mult: 4, up: [30, 3], desc: '{数|かず}が 5つ じゅんばんに ならぶ', ex: [2, 3, 4, 5, 6] },
  kuku:     { rank: 8, name: 'くくの わ', power: 40, mult: 4, up: [25, 3], desc: 'かけ{算|ざん}が できる 3{枚|まい}（2と 3と 6 → 2×3=6）', ex: [2, 3, 6], math: true },
  flush:    { rank: 7, name: 'いろそろい', power: 35, mult: 4, up: [15, 2], desc: 'ルーンが 4{枚|まい}いじょう、ぜんぶ おなじ ぞくせい', ex: [1, 4, 6, 9] },
  triple:   { rank: 6, name: 'スリーカード', power: 30, mult: 3, up: [20, 2], desc: 'おなじ {数|かず}が 3{枚|まい}', ex: [5, 5, 5] },
  stair:    { rank: 5, name: 'かいだん', power: 25, mult: 3, up: [20, 2], desc: '{数|かず}が 3つ じゅんばんに ならぶ（4・5・6）', ex: [4, 5, 6] },
  twoPair:  { rank: 4, name: 'ツーペア', power: 20, mult: 2, up: [15, 1], desc: 'ペアが 2くみ', ex: [3, 3, 8, 8] },
  ten:      { rank: 3, name: 'じゅうの わ', power: 15, mult: 2, up: [15, 1], desc: 'たすと ちょうど 10に なる 2{枚|まい}（3と 7）', ex: [3, 7], math: true },
  pair:     { rank: 2, name: 'ペア', power: 10, mult: 2, up: [10, 1], desc: 'おなじ {数|かず}が 2{枚|まい}', ex: [9, 9] },
  high:     { rank: 1, name: 'ひとつ', power: 5, mult: 1, up: [10, 1], desc: 'くみあわせ なし（ルーンが 1{枚|まい}いじょう）', ex: [8] },
  none:     { rank: 0, name: 'ルーン なし', power: 0, mult: 1, up: [0, 0], desc: 'ルーンが ない', ex: [] },
};
export const HAND_ORDER = Object.keys(HANDS).sort((a, b) => HANDS[b].rank - HANDS[a].rank);
export const PAIR_FAMILY = new Set(['pair', 'twoPair', 'triple', 'fullHouse', 'four', 'five']);

export function handStats(id, lv = 1) {
  const h = HANDS[id];
  return { power: h.power + (lv - 1) * h.up[0], mult: h.mult + (lv - 1) * h.up[1] };
}

// runes: [{ v, els:Set }]（にじ は ぜんぶの ぞくせい）
export function detectHands(runes, { noPair = false } = {}) {
  const has = new Set();
  const members = {};
  const n = runes.length;
  if (!n) return { best: 'none', has, members: { none: [] } };
  has.add('high'); members.high = [runes.reduce((bi, r, i) => (r.v > runes[bi].v ? i : bi), 0)];
  const byV = new Map();
  runes.forEach((r, i) => { if (r.v == null) return; if (!byV.has(r.v)) byV.set(r.v, []); byV.get(r.v).push(i); });
  const groups = [...byV.values()].sort((a, b) => b.length - a.length);
  const g2 = groups.filter((g) => g.length >= 2);
  if (g2.length) { has.add('pair'); members.pair = g2[0].slice(0, 2); }
  if (g2.length >= 2 || (groups[0] && groups[0].length >= 4)) { has.add('twoPair'); members.twoPair = g2.length >= 2 ? [...g2[0].slice(0, 2), ...g2[1].slice(0, 2)] : groups[0].slice(0, 4); }
  if (groups[0] && groups[0].length >= 3) { has.add('triple'); members.triple = groups[0].slice(0, 3); }
  if (groups[0] && groups[0].length >= 4) { has.add('four'); members.four = groups[0].slice(0, 4); }
  if (groups[0] && groups[0].length >= 5) { has.add('five'); members.five = groups[0].slice(0, 5); }
  if (groups[0] && groups[0].length >= 3 && groups.filter((g) => g.length >= 2).length >= 2) {
    has.add('fullHouse'); members.fullHouse = [...groups[0].slice(0, 3), ...groups.filter((g) => g.length >= 2)[1].slice(0, 2)];
  }
  // じゅうの わ
  outer: for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    if (runes[i].v != null && runes[j].v != null && runes[i].v + runes[j].v === 10) { has.add('ten'); members.ten = [i, j]; members.tenEq = `${runes[i].v} + ${runes[j].v} = 10`; break outer; }
  }
  // かいだん
  const vals = [...byV.keys()].sort((a, b) => a - b);
  let best = [], cur = [];
  for (const v of vals) { if (cur.length && v === cur[cur.length - 1] + 1) cur.push(v); else cur = [v]; if (cur.length > best.length) best = [...cur]; }
  if (best.length >= 3) { has.add('stair'); members.stair = best.slice(0, 3).map((v) => byV.get(v)[0]); }
  if (best.length >= 5) { has.add('longStair'); members.longStair = best.slice(0, 5).map((v) => byV.get(v)[0]); }
  // いろそろい
  if (n >= 4) {
    for (const el of ['fire', 'water', 'wood', 'thunder', 'shadow']) {
      if (runes.every((r) => r.els.has(el))) { has.add('flush'); members.flush = runes.map((_, i) => i); if (has.has('longStair') && n === 5) { has.add('rainbow'); members.rainbow = runes.map((_, i) => i); } break; }
    }
  }
  // くくの わ（a × b = c）
  kk: for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) {
    if (i === j || j === k || i === k || i > j) continue;
    const a = runes[i].v, b = runes[j].v, c = runes[k].v;
    if (a == null || b == null || c == null) continue;
    if (a >= 2 && b >= 2 && a * b === c) { has.add('kuku'); members.kuku = [i, j, k]; members.kukuEq = `${a} × ${b} = ${c}`; break kk; }
  }
  if (noPair) for (const p of PAIR_FAMILY) has.delete(p);
  const bestId = HAND_ORDER.find((id) => has.has(id)) || 'none';
  return { best: bestId, has, members };
}
