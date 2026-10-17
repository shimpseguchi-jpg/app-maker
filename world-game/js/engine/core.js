// ルールの土台：効果の適用・成功確率・ダイス判定・国力・隣接
import { clamp } from '../util.js';
import { LAND_NEIGHBORS } from '../data/mapdata.js';
import { SEA_LINKS, POLAR_LINKS } from '../data/countries.js';

// 効果量（小・中・大）。'%' は掛け算
const SZ = {
  idx: [4, 8, 15], literacy: [2, 4, 8], food: [5, 12, 25], gnp: ['%', 2, 5, 10], pop: ['%', 1, 3, 8],
  rate: [0.5, 1.5, 3], fiscal: [1, 3, 6], debt: [5, 15, 30], soldiers: ['%', 10, 25, 50], bases: [1, 2, 4], patents: [1, 3, 6],
  rel: [5, 10, 20],
  // 世界
  conflicts: [1, 3, 6], treaty: [2, 5, 10], wrate: [0.3, 0.8, 1.5], co2: [1, 3, 6], foodPrice: [5, 10, 20],
};
const BOUNDS = {
  literacy: [5, 100], food: [0, 300], rate: [0, 30], fiscal: [-30, 15], debt: [0, 400], pop: [0.1, 1e5], gnp: [0.01, 1e4],
  soldiers: [0.5, 1e4], bases: [0, 50], patents: [0, 999], nuke: [0, 4], conflicts: [0, 200], treaty: [0, 100], wrate: [0, 30],
  foodPrice: [10, 300], co2: [0, 100],
};
const sizeOf = (stat) => SZ[stat] || SZ.idx;
const IDX = { s: 0, m: 1, l: 2 };

// 背景国は簡易パラメータしかないので読み替える
const BG_MAP = { gnp: 'econ', industry: 'econ', capital: 'econ', econ: 'econ', stability: 'stability', security: 'stability', water: 'water', food: 'food', debt: 'debt' };

export function addStat(obj, stat, size, sign, factor = 1, isBg = false) {
  if (isBg) { stat = BG_MAP[stat]; if (!stat) return 0; }
  if (!(stat in obj)) return 0;
  const sz = sizeOf(isBg ? 'idx' : stat);
  let delta;
  if (typeof size === 'number') delta = size * sign * factor;
  else if (sz[0] === '%') delta = obj[stat] * (sz[IDX[size] + 1] / 100) * sign * factor;
  else delta = sz[IDX[size]] * sign * factor;
  const [lo, hi] = BOUNDS[stat] || [0, 100];
  const before = obj[stat];
  obj[stat] = clamp(before + delta, lo, hi);
  return obj[stat] - before;
}

// ───── 隣接 ─────
// 地図どおりの隣接（46カ国のまま）
export function rawNeighbors(id) {
  const set = new Set(LAND_NEIGHBORS[id] || []);
  for (const [a, b] of SEA_LINKS) { if (a === id) set.add(b); if (b === id) set.add(a); }
  return [...set];
}
// 世界の国の数を減らしたゲームでは、背景国がまとまっている（g.unitOf：元の国 → まとまりの代表）。
// いま遊んでいるゲームのまとまりを覚えておき、隣接はまとまりどうしで答える
let UNITS = null, MEMBERS = null, nbCache = {};
export function setUnits(unitOf) {
  UNITS = unitOf || null;
  MEMBERS = null; nbCache = {};
  if (UNITS) { MEMBERS = {}; for (const [m, u] of Object.entries(UNITS)) (MEMBERS[u] ||= []).push(m); }
}
export const unitOf = (id) => (UNITS && UNITS[id]) || id;
export function neighbors(id) {
  if (!UNITS) return rawNeighbors(id);
  if (nbCache[id]) return nbCache[id];
  const set = new Set();
  for (const m of MEMBERS[id] || [id]) for (const n of rawNeighbors(m)) { const u = unitOf(n); if (u !== id) set.add(u); }
  return (nbCache[id] = [...set]);
}
export function polarNeighbors(id) {
  const out = [];
  for (const [a, b] of POLAR_LINKS) { if (a === id) out.push(b); if (b === id) out.push(a); }
  return out.map(unitOf).filter((x) => x !== id);
}

// ───── 国の状態 ─────
export const isMajor = (id) => id && id[0] === 'M';
// 席についている国（自国＋AI）か。抽選外の主要国は背景国として g.backs にいる
export const isSeat = (g, id) => !!(id && g.majors[id]);
export const C = (g, id) => g.majors[id] || g.backs[id] || (g.unitOf ? g.backs[g.unitOf[id]] : undefined);
export const active = (g) => g.seats.filter((id) => g.majors[id].panel);
export const others = (g, id) => active(g).filter((x) => x !== id);
export const rel = (g, a, b) => (a === b ? 100 : g.rel[[a, b].sort().join('-')] ?? 50);
export function addRel(g, a, b, d) {
  if (a === b || !g.rel) return;
  const k = [a, b].sort().join('-');
  g.rel[k] = clamp((g.rel[k] ?? 50) + d, 0, 100);
}
export const allied = (g, a, b) => g.allies.includes([a, b].sort().join('-'));
export const allyCount = (g, id) => g.allies.filter((k) => k.split('-').includes(id)).length;

export function power(c) {
  const s = c.stats;
  const gnpS = clamp(25 * Math.log10(Math.max(0.01, s.gnp)) + 50, 0, 100);
  const milS = clamp(20 * Math.log10(Math.max(1, s.soldiers)) + 10 + s.nuke * 5, 0, 100);
  const litS = clamp((s.literacy - 50) * 2, 0, 100);
  return Math.round(0.35 * gnpS + 0.15 * s.tech + 0.15 * s.stability + 0.1 * s.security + 0.1 * litS + 0.15 * milS);
}

// ───── 成功確率 ─────
let BASE_REG = {};
export function registerBases(b) { BASE_REG = b; }
const MOD_LABEL = {
  power: '国力', literacy: '識字率', security: '治安', stability: '政情', tech: '技術力', capital: '資本', industry: '産業',
  rep: '国際的評価', soldiers: '兵士', fiscal: '財政', water: '水資源', food: '食糧', oil: '石油', uranium: 'ウラン',
  mobility: '人の往来', altE: '代替エネルギー', rel: '相手との関係', allies: '提携の数', guerrilla: 'ゲリラ',
};
function modValue(g, c, key, tgt) {
  const s = c.stats;
  switch (key) {
    case 'power': return clamp((c.power - 50) / 4, -12, 12);
    case 'literacy': return clamp((s.literacy - 80) / 2, -10, 10);
    case 'soldiers': return clamp(10 * Math.log10(Math.max(1, s.soldiers) / 30), -10, 10);
    case 'fiscal': return clamp(s.fiscal * 1.5, -10, 10);
    case 'food': return clamp((s.food - 90) / 6, -10, 10);
    case 'rel': return tgt && isSeat(g, tgt) ? clamp((rel(g, c.id, tgt) - 50) / 4, -12, 12) : 0;
    case 'allies': return clamp(allyCount(g, c.id) * 3, 0, 12);
    case 'guerrilla': return clamp((30 - s.guerrilla) / 4, -10, 8);
    default: return clamp(((s[key] ?? 50) - 50) / 5, -10, 10);
  }
}
// 国の「教育」の高さ（0〜100）：識字率と技術力から（1ねんせいモードの「べんきょう」と同じ式）
export const eduLevel = (c) => clamp(Math.round((c.stats.literacy - 50) * 1.2 + c.stats.tech * 0.4), 0, 100);
export const EDU_LOW = 60, EDU_HIGH = 88;
// 国の状態で成功率が上下する：政情・国民の気持ち・教育。[おとなの名前, 値, 1ねんせいの名前]
function statusMods(c, pol) {
  const out = [], s = c.stats, tags = pol.tags || [];
  // 治安・内政の政策は、国を立て直すための手なので政情では下げない（不安定な国がますます立て直せなくなるのを防ぐ）
  if (pol.cat !== 'dom') {
    if (s.stability < 25) out.push(['政情が不安定', -6, 'くにが ぐらぐら']);
    else if (s.stability < 40) out.push(['政情が不安定', -3, 'くにが ぐらぐら']);
    else if (s.stability >= 75) out.push(['政情が安定', 3, 'くにが おちついて いる']);
  }
  const m = c.mood ?? 50;
  if (tags.includes('coop') && m < 35) out.push(['国民の反発', -8, 'みんなが はんたい']);
  else if (tags.includes('coop') && m >= 70) out.push(['国民の後押し', 3, 'みんなが おうえん']);
  else if (tags.includes('selfish') && m < 35) out.push(['国民の後押し', 5, 'みんなが おうえん']);
  // 教育：教育・技術の政策は教育の高い国ほど通りやすく、教育の低い国では教育・技術と国際機関の政策（長い目で見る手）が通りにくい
  const e = eduLevel(c);
  if (pol.cat === 'edu' && e >= EDU_HIGH) out.push(['教育が高い', 3, 'べんきょうが すすんで いる']);
  else if ((pol.cat === 'edu' || pol.cat === 'intl') && e < EDU_LOW) out.push(['教育が低い', -4, 'べんきょうが たりない']);
  return out;
}

export function probability(g, c, pol, tgt) {
  const parts = [['基本', pol.p]];
  let p = pol.p;
  for (const k of ['power', ...(pol.mods || [])]) {
    const v = Math.round(modValue(g, c, k, tgt));
    if (v) { parts.push([MOD_LABEL[k] || k, v]); p += v; }
  }
  for (const b of c.bases || []) {
    const bonus = BASE_REG[b]?.bonus;
    if (bonus && bonus.includes(pol.id)) { parts.push(['基本政策', 10]); p += 10; break; }
  }
  if (pol.pAdj) { const v = Math.round(pol.pAdj(g, c, tgt)); if (v) { parts.push(['状況', v]); p += v; } }
  for (const x of statusMods(c, pol)) { parts.push(x); p += x[1]; }
  // 情勢：ニュースのあと、しばらく成功率が上下する（data/situations.js）
  for (const s of activeSituations(g)) {
    if (s.scope === 'who' && s.who !== c.id) continue;
    if (s.scope === 'others' && s.who === c.id) continue;
    if (!(s.cats || []).includes(pol.cat) && !(s.pols || []).includes(pol.id)) continue;
    parts.push([`情勢：${s.name}`, s.mod, `いまの ようす：${s.kname}`, 'sit']); p += s.mod;
  }
  const lo = pol.pMin ?? 1, hi = pol.pMax ?? 95;
  p = clamp(Math.round(p), lo, hi);
  return { p, crit: Math.max(1, Math.floor(p / 10)), fumble: p >= 96 ? 0 : 5, parts };
}

export function activeSituations(g) {
  const cal = g.cal ?? g.year - 1;
  return (g.situations || []).filter((s) => cal < s.until);
}

// d100 の判定
export function judge(roll, p) {
  if (roll <= Math.max(1, Math.floor(p / 10))) return 'crit';
  if (roll <= p) return 'ok';
  if (roll >= 96) return 'fumble';
  if (roll <= p + 10) return 'partial';
  return 'ng';
}
export const TIER = {
  crit: { name: '大成功', cls: 'crit' }, ok: { name: '成功', cls: 'ok' }, partial: { name: 'やや成功', cls: 'partial' },
  ng: { name: '失敗', cls: 'ng' }, fumble: { name: '大失敗', cls: 'fumble' },
};
