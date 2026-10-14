// 効果の文字列（'self.industry+m' など）を状態に適用する
import { addStat, C, isSeat, others, neighbors, addRel, allied } from './core.js';

const RE = /^(\w+)\.(\w+)([+-])([sml]|\d+(?:\.\d+)?)$/;
const WORLD_KEYS = new Set(['biodiv', 'conflicts', 'treaty', 'wrate', 'tension', 'co2', 'ice', 'rain', 'oilRes', 'forestRes', 'waterRes', 'foodPrice', 'refugees', 'trust']);

function scopeIds(g, scope, ctx) {
  const self = ctx.self;
  switch (scope) {
    case 'self': return self ? [self] : [];
    case 'tgt': return ctx.tgt ? [ctx.tgt] : [];
    case 'who': return ctx.who ? [ctx.who] : [];
    case 'all': return others(g, self || ctx.who || '');
    case 'majors': return g.seats.filter((id) => g.majors[id].panel);
    case 'nb': return neighbors(self || ctx.who).filter((id) => !isSeat(g, id) || g.majors[id]?.panel);
    case 'tgtNb': return ctx.tgt ? neighbors(ctx.tgt).filter((id) => id !== self && (!isSeat(g, id) || g.majors[id]?.panel)) : [];
    case 'bgAll': return Object.keys(g.backs).filter((id) => !g.backs[id].owner);
    case 'poorBg': return Object.keys(g.backs).filter((id) => !g.backs[id].owner && g.backs[id].stats.econ <= 25);
    default: return [];
  }
}

// factor：大成功 2、やや成功 0.5 など
export function applyFx(g, list, ctx, factor = 1, changes = []) {
  for (const raw of list || []) {
    if (raw.startsWith('flag:')) { g.flags[raw.slice(5)] = g.year; continue; }
    if (raw.startsWith('unflag:')) { delete g.flags[raw.slice(7)]; continue; }
    if (raw.startsWith('boost:')) { const id = raw.slice(6); g.boost[id] = (g.boost[id] || 0) + 3; continue; }
    if (raw.startsWith('law:')) { g.laws[raw.slice(4)] = g.year; if (ctx.self) (g.majors[ctx.self].laws ||= {})[raw.slice(4)] = g.year; continue; }
    if (raw.startsWith('mylaw:')) { if (ctx.self) (g.majors[ctx.self].laws ||= {})[raw.slice(6)] = g.year; continue; }
    if (raw.startsWith('unmylaw:')) { if (ctx.self) delete (g.majors[ctx.self].laws ||= {})[raw.slice(8)]; continue; }
    if (raw === 'ally') {
      if (ctx.self && ctx.tgt && isSeat(g, ctx.tgt) && !allied(g, ctx.self, ctx.tgt)) g.allies.push([ctx.self, ctx.tgt].sort().join('-'));
      continue;
    }
    if (raw === 'nuke+') { const s = g.majors[ctx.self].stats; if (s.nuke < 4) { s.nuke++; changes.push({ id: ctx.self, stat: 'nuke', d: 1 }); } continue; }
    const m = RE.exec(raw);
    if (!m) { console.warn('unknown fx', raw); continue; }
    const [, scope, stat, sg, sz] = m;
    const sign = sg === '+' ? 1 : -1;
    const size = /^\d/.test(sz) ? Number(sz) : sz;
    if (scope === 'world') {
      if (!WORLD_KEYS.has(stat)) { console.warn('world key', stat); continue; }
      const d = addStat(g.world, stat, size, sign, factor);
      if (d) changes.push({ id: 'world', stat, d });
      continue;
    }
    if (scope === 'rel') {
      const sizes = { s: 5, m: 10, l: 20 };
      const d = (typeof size === 'number' ? size : sizes[size]) * sign * factor;
      const targets = stat === 'tgt' ? [ctx.tgt] : stat === 'all' ? others(g, ctx.self) : stat === 'nb' ? neighbors(ctx.self).filter((x) => isSeat(g, x)) : [];
      for (const t of targets) if (t && isSeat(g, t)) addRel(g, ctx.self, t, d);
      if (targets.length) changes.push({ id: stat === 'tgt' ? ctx.tgt : stat, stat: 'rel', d });
      continue;
    }
    for (const id of scopeIds(g, scope, ctx)) {
      const c = C(g, id);
      if (!c) continue;
      const d = addStat(c.stats, stat, size, sign, factor, !isSeat(g, id));
      if (d) changes.push({ id, stat: isSeat(g, id) ? stat : stat, d });
    }
  }
  return changes;
}

// カードに出す短い説明（'self.industry+m' → 「自 産業↑↑」）
const SCOPE_JA = { self: '自', tgt: '相手', who: '対象', all: '他国', majors: '各国', nb: '隣国', tgtNb: '相手の隣国', bgAll: '小国', poorBg: '貧困国', world: '世界' };
const STAT_JA = {
  pop: '人口', gnp: 'GNP', rate: '金利', capital: '資本', fiscal: '財政', debt: '国債', industry: '産業', inequality: '貧富の差',
  security: '治安', literacy: '識字率', ethnic: '民族対立', stability: '政情', mobility: '往来', tech: '技術', patents: '特許',
  oil: '石油', altE: '代替エネ', food: '食糧', water: '水', forest: '森林', uranium: 'ウラン', co2: 'CO₂', soldiers: '兵士',
  bases: '基地', guerrilla: 'ゲリラ', rep: '評価', econ: '経済',
  conflicts: '紛争', treaty: '条約', wrate: '金利', tension: '緊張', ice: '氷', rain: '降雨', oilRes: '石油', forestRes: '森林',
  waterRes: '水', biodiv: '生物多様性', foodPrice: '食糧価格', refugees: '難民', trust: '国際機関の信頼',
};
export function describeFx(list) {
  const out = [];
  for (const raw of list || []) {
    if (raw === 'ally') { out.push('提携'); continue; }
    if (raw === 'nuke+') { out.push('核 1段階↑'); continue; }
    if (raw.startsWith('law:') || raw.startsWith('mylaw:')) { out.push('法の制定'); continue; }
    const m = RE.exec(raw);
    if (!m) continue;
    const [, scope, stat, sg, sz] = m;
    const arrow = (sg === '+' ? '↑' : '↓').repeat(sz === 'l' ? 3 : sz === 'm' ? 2 : 1);
    if (scope === 'rel') { out.push(`${stat === 'tgt' ? '相手' : stat === 'all' ? '各国' : '隣国'}との関係${arrow}`); continue; }
    out.push(`${SCOPE_JA[scope] || scope} ${STAT_JA[stat] || stat}${arrow}`);
  }
  return out;
}
export { STAT_JA, SCOPE_JA };
