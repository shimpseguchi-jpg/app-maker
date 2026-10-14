// AI 元首：性格ごとの重みで政策と対象を選ぶ（POLICIES_EVENTS.md 5 章）
import { AGENDAS } from '../data/agendas.js';
import { POLICIES } from '../data/policies.js';
import { probability, rel, isSeat, C } from './core.js';
import { SPARKS } from './sparks.js';

export const PERSONAS = {
  tech: { name: '技術立国', base: 'B01' },
  edu: { name: '教育・文化', base: 'B02' },
  trade: { name: '中継貿易', base: 'B03' },
  order: { name: '秩序・強国', base: 'B04' },
  finance: { name: '金融', base: 'B06' },
  ambition: { name: '野心家', base: 'B10' },
};
const H = 3, M = 2, L = 1;
const W = {
  tech: { eco: M, edu: H, res: M, fw: M, dom: L, dip: M, mil: L, intl: L },
  edu: { eco: L, edu: H, res: L, fw: M, dom: M, dip: H, mil: L, intl: M },
  trade: { eco: H, edu: M, res: M, fw: M, dom: L, dip: H, mil: L, intl: M },
  order: { eco: M, edu: L, res: M, fw: L, dom: H, dip: M, mil: H, intl: M },
  finance: { eco: H, edu: L, res: L, fw: L, dom: M, dip: H, mil: L, intl: M },
  ambition: { eco: M, edu: M, res: H, fw: L, dom: M, dip: L, mil: H, intl: L },
};
const COOP = { tech: 0.2, edu: 0.6, trade: 0.4, order: 0, finance: 0.3, ambition: -0.3 };
const SZW = { s: 1, m: 2, l: 3 };

function gain(pol) {
  let v = 0.5;
  for (const f of pol.ok) {
    const m = /^(\w+)\.(\w+)([+-])([sml])$/.exec(f);
    if (!m) { v += 0.5; continue; }
    const [, scope, stat, sg, sz] = m;
    const bad = ['inequality', 'ethnic', 'guerrilla', 'debt', 'co2'].includes(stat);
    const good = (sg === '+') !== bad;
    if (scope === 'self') v += good ? SZW[sz] : -SZW[sz] * 0.5;
  }
  return Math.max(0.3, v);
}

// 自国の弱点に効く政策を少し優先する
function need(c, pol) {
  const s = c.stats;
  let n = 0;
  const has = (k) => pol.ok.some((f) => f.startsWith(`self.${k}+`));
  const lower = (k) => pol.ok.some((f) => f.startsWith(`self.${k}-`));
  if (s.stability < 45 && has('stability')) n += 1.2;
  if (s.security < 40 && has('security')) n += 0.8;
  if (s.food < 70 && has('food')) n += 1.2;
  if (s.water < 25 && has('water')) n += 1.2;
  if (s.fiscal < -6 && has('fiscal')) n += 1;
  if (s.literacy < 90 && has('literacy')) n += 0.8;
  if (s.guerrilla > 40 && lower('guerrilla')) n += 1;
  if (s.ethnic > 65 && lower('ethnic')) n += 0.8;
  if (s.oil < 20 && s.altE < 35 && has('altE')) n += 0.8;
  return n;
}

export function chooseTarget(g, c, pol, tgts) {
  if (!tgts.length || tgts[0] == null) return null;
  // 協調的な元首は、火種の国に効く支援ならそこを選ぶ
  if (COOP[c.persona] >= 0.2) for (const sp of g.sparks || []) if ((SPARKS[sp.type].fx[pol.id] ?? 0) < 0 && tgts.includes(sp.where)) return sp.where;
  const coop = (pol.tags || []).includes('coop');
  const aggr = (pol.tags || []).includes('aggr');
  const score = (id) => {
    if (isSeat(g, id)) {
      const r = rel(g, c.id, id);
      if (pol.tgt === 'nbAny') return -C(g, id).stats.stability - C(g, id).power + 30;
      if (pol.tgt === 'unstable') return -C(g, id).stats.stability;
      return aggr ? -r : coop ? r : r;
    }
    const b = g.backs[id].stats;
    if (pol.tgt === 'nbAny') return 60 - b.stability;
    return -b.stability - b.econ;
  };
  return tgts.reduce((a, b) => (score(b) > score(a) ? b : a), tgts[0]);
}

export function choosePolicy(g, c, offers, rng) {
  const pw = W[c.persona] || W.trade;
  const s = c.stats;
  const crisisSelf = s.stability < 35 || s.fiscal < -10;
  const crisisWorld = g.world.tension > 70 || g.world.co2 > 70 || g.world.waterRes < 45;
  let best = null, bestV = -1e9;
  for (const o of offers) {
    const pol = POLICIES[o.id];
    const tgt = chooseTarget(g, c, pol, o.tgts);
    const pr = probability(g, c, pol, tgt).p / 100;
    let cw = pw[pol.cat] || 1;
    if (crisisSelf && (pol.cat === 'dom' || pol.cat === 'mil')) cw += 1;
    if (crisisWorld && (pol.cat === 'dip' || pol.cat === 'intl')) cw += 1;
    const tags = pol.tags || [];
    let v = cw * (0.35 + pr) * gain(pol) * 0.5 + need(c, pol);
    if (tags.includes('coop')) v += COOP[c.persona] + (crisisWorld ? 0.6 : 0) + (pol.tgt === 'spark' || pol.id === 'P105' ? 0.5 : 0);
    if (tags.includes('aggr')) v += c.persona === 'ambition' || c.persona === 'order' ? 0.3 : -0.6;
    if (tags.includes('nuke')) v += c.persona === 'ambition' ? 0.4 : c.persona === 'order' && g.world.tension > 60 ? 0 : -2;
    if (pol.id === 'P63') v -= 1.2; // 戦争は最後の手段
    // 火種：協調的な元首は、何が効くかをある程度わかっている（野心家・秩序型は自国の得を優先する）
    for (const s of g.sparks || []) {
      const d = SPARKS[s.type].fx[pol.id];
      if (d == null || (pol.tgt && tgt !== s.where)) continue;
      const wise = COOP[c.persona] >= 0.2;
      if (wise) v += d < 0 ? 1.2 : -1.5;
    }
    if (pol.id === 'P72' || pol.id === 'P73') v += 1.5 + COOP[c.persona];
    if (pol.id === 'P45') v += 0.5;
    if (pol.id === 'P92') v -= 1;
    v += rng() * 1.2;
    if (v > bestV) { bestV = v; best = { id: o.id, tgt }; }
  }
  return best;
}

// 世界議会の議題に賛成するか
export { AGENDAS };
// 世界議会の議題に賛成する見込み（％）。可決されると損をする国は反対しやすく、得をする国は賛成しやすい
export function voteChance(g, c, agenda) {
  const a = AGENDAS[agenda];
  const act = g.seats.filter((id) => id !== c.id && g.majors[id].panel);
  const avgRel = act.length ? act.reduce((s, id) => s + rel(g, c.id, id), 0) / act.length : 50;
  let p = 50 + (avgRel - 50) * 0.6 + (g.world.trust - 50) * 0.3 + (g.voteTries || 0) * 6;
  if (a.likes.includes(c.persona)) p += 15;
  if (a.dislikes.includes(c.persona)) p -= 15;
  if (a.lose(c)) p -= 22;
  if (a.gain(c)) p += 10;
  if (agenda === 'water' && g.flags.waterLawWorld != null) p += 10;
  if (agenda === 'climate' && g.world.co2 >= 65) p += 10;
  return Math.round(Math.max(10, Math.min(97, p)));
}
export function voteYes(g, c, agenda, rng) {
  const p = voteChance(g, c, agenda);
  return { yes: rng() * 100 < p, p };
}
