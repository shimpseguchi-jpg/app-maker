// 政策のデータ（POLICIES_EVENTS.md の 2〜3 章）
// ok：成功時、ng：失敗時の効果。効果の書き方は engine/effects.js
// tgt：対象の種類（major 他国／bg 小国／poorBg 貧困国／nbAny 隣国／unstable 紛争地／collapsed 崩壊国）
// tags：AI の判断用（coop 協調／selfish 自国優先／aggr 攻撃的／nuke 核）
import { neighbors, isSeat, allyCount, others } from '../engine/core.js';

export const CATS = {
  eco: '経済', edu: '教育・技術', res: '資源・エネルギー', fw: '食糧・水', dom: '治安・内政', dip: '外交', mil: '軍事', intl: '国際機関',
};

// ───── 基本政策 ─────
export const BASE = {
  B01: { name: '技術開発優先', desc: '職人の国。技術系の政策が成功しやすい', bonus: ['P12', 'P13', 'P14', 'P15', 'P85', 'P87', 'P90'], fx: ['self.tech+s', 'self.industry+s'] },
  B02: { name: '教育優先', desc: '読み書きと暗算。識字率が伸び、長い目で全体が強くなる', bonus: ['P10', 'P11', 'P43'], fx: ['self.literacy+m'], litBoost: 1.5 },
  B03: { name: '中継貿易拠点', desc: 'エネルギーと物資の中継基地。貿易・関税に強い', bonus: ['P05', 'P06', 'P50', 'P51'], fx: ['self.mobility+m', 'self.capital+s'] },
  B04: { name: '治安と教育改革', desc: '取り締まりと教育。治安が下がりにくい', bonus: ['P40', 'P41', 'P44', 'P10'], fx: ['self.security+m'], secGuard: true },
  B05: { name: '税制優遇で企業誘致', desc: '文化の違いを経済で越える。企業と資本が集まる', bonus: ['P03', 'P51', 'P06'], fx: ['self.industry+s', 'self.capital+s'] },
  B06: { name: '高金利', desc: '金利を上げて預金を集める。援助先の負担は重い', bonus: ['P01', 'P52', 'P04'], fx: ['self.rate+m', 'self.capital+m'] },
  B07: { name: '低金利・外交重視', desc: '金利を下げて企業を誘致し、外交で稼ぐ', bonus: ['P02', 'P50', 'P53', 'P55', 'P56'], fx: ['self.rate-m', 'self.industry+s'] },
  B08: { name: '農業・食糧自給', desc: '農業大学を作り、食糧で国を支える', bonus: ['P30', 'P14', 'P31', 'P32'], fx: ['self.food+m'] },
  B09: { name: '資源開発', desc: '石油と鉱物を掘る。CO₂ は増える', bonus: ['P20', 'P21', 'P23', 'P24', 'P25'], fx: ['self.oil+s', 'self.gnp+s', 'self.co2+s'] },
  B10: { name: '核兵器の開発', desc: '核開発がいつでも選べる。世界からの評価は下がる', bonus: ['P65', 'P60'], fx: ['self.rep-m', 'world.tension+s'] },
};

const has = (g, f) => g.flags[f] != null;
const myLaw = (c, k) => !!c.laws?.[k];
const anyCollapsed = (g) => g.seats.some((id) => !g.majors[id].panel && !g.majors[id].annexedBy);

const P = [
  // ── 経済 ──
  { id: 'P01', name: '金利を上げる', cat: 'eco', p: 70, mods: ['capital'], ok: ['self.rate+m', 'self.capital+m', 'self.gnp+s', 'poorBg.debt+s'], ng: ['self.industry-s'], tags: ['selfish'], avail: (g, c) => c.stats.rate < 15 },
  { id: 'P02', name: '金利を下げる', cat: 'eco', p: 70, mods: ['security'], ok: ['self.rate-m', 'self.industry+m', 'world.wrate-s'], ng: ['self.capital-s'], avail: (g, c) => c.stats.rate > 0.5 },
  { id: 'P03', name: '税制優遇で企業誘致', cat: 'eco', p: 60, mods: ['security', 'literacy'], ok: ['self.industry+m', 'self.tech+s', 'self.fiscal-s'], ng: ['self.fiscal-s'] },
  { id: 'P04', name: '国債を発行する', cat: 'eco', p: 75, mods: ['capital'], ok: ['self.fiscal+m', 'self.debt+m'], ng: ['self.fiscal-m', 'self.debt+m', 'self.capital-s'], avail: (g, c) => c.stats.fiscal < 2 },
  { id: 'P05', name: '関税を撤廃する', cat: 'eco', p: 55, mods: ['allies'], ok: ['self.gnp+m', 'rel.all+s', 'all.gnp+s', 'world.treaty+s'], ng: ['self.industry-m'], tags: ['coop'], avail: (g, c) => !myLaw(c, 'freeTrade') , after: { ok: ['mylaw:freeTrade'] } },
  { id: 'P06', name: '輸出を促進する', cat: 'eco', p: 60, mods: ['industry', 'tech'], ok: ['self.gnp+m', 'self.industry+s'], ng: ['self.fiscal-s'], tags: ['selfish'] },
  { id: 'P07', name: '緊縮財政', cat: 'eco', p: 65, mods: ['stability'], ok: ['self.fiscal+l', 'self.debt-m', 'self.stability-s'], ng: ['self.stability-m', 'self.inequality+m'], avail: (g, c) => c.stats.fiscal < 0 },
  // ── 教育・技術 ──
  { id: 'P10', name: '識字教育を進める', cat: 'edu', p: 65, mods: ['security'], ok: ['self.literacy+m', 'self.inequality-s'], ng: [], avail: (g, c) => c.stats.literacy < 99.5 },
  { id: 'P11', name: '留学生制度を作る', cat: 'edu', p: 60, mods: ['mobility'], tgt: 'major', ok: ['self.literacy+s', 'self.tech+s', 'tgt.tech+s', 'rel.tgt+m', 'self.mobility+s'], ng: ['self.security-s'], tags: ['coop'] },
  { id: 'P12', name: '新技術を開発する', cat: 'edu', p: 40, mods: ['tech', 'literacy'], ok: ['self.tech+l', 'self.patents+s', 'self.industry+s'], ng: [] },
  { id: 'P13', name: '代替エネルギーを開発する', cat: 'edu', p: 25, mods: ['tech'], ok: ['self.altE+l', 'self.co2-s', 'world.foodPrice+m', 'flag:altE', 'boost:E03'], ng: [] },
  { id: 'P14', name: '遺伝子改良穀物を開発する', cat: 'edu', p: 20, mods: ['tech', 'literacy'], ok: ['self.food+l', 'self.food+l', 'self.patents+m', 'self.water-m', 'flag:gmo', 'boost:E05'], ng: [], avail: (g, c) => c.stats.tech >= 40 },
  { id: 'P15', name: '真水の製造技術を開発する', cat: 'edu', p: 15, mods: ['tech', 'literacy'], ok: ['self.water+l', 'self.patents+m', 'flag:pureWater', 'boost:E27'], ng: [], avail: (g, c) => c.stats.tech >= 60 && !has(g, 'pureWater') },
  // ── 資源・エネルギー ──
  { id: 'P20', name: '石油資源を開発する', cat: 'res', p: 55, mods: ['tech'], ok: ['self.oil+m', 'self.gnp+m', 'self.co2+s', 'world.co2+s', 'world.oilRes-s'], ng: ['self.fiscal-s'], avail: (g, c) => c.stats.oil >= 15 || (has(g, 'polarOil') && c.flags.polar) },
  { id: 'P21', name: '極地を自国の領土と主張する', cat: 'res', p: 30, mods: ['soldiers', 'power'], ok: ['self.oil+l', 'rel.all-m', 'self.rep-s', 'world.tension+m', 'boost:E12'], ng: ['self.rep-m', 'rel.all-s'], tags: ['selfish', 'aggr'], avail: (g, c) => has(g, 'polarOil') && !!c.polar && !c.flags.polar, run: (g, ctx, tier) => { if (tier !== 'ng' && tier !== 'fumble') g.majors[ctx.self].flags.polar = g.year; } },
  { id: 'P22', name: 'パーム植林で代替燃料を量産', cat: 'res', p: 50, mods: ['industry'], ok: ['self.altE+m', 'self.gnp+m', 'self.forest-m', 'world.forestRes-m', 'boost:E06'], ng: ['self.forest-m'], tags: ['selfish'], avail: (g, c) => has(g, 'altE') && c.stats.forest > 20 },
  { id: 'P23', name: '森林を伐採して輸出する', cat: 'res', p: 70, ok: ['self.gnp+m', 'self.forest-l', 'world.forestRes-m', 'world.co2+s'], ng: ['self.forest-m'], tags: ['selfish'], avail: (g, c) => c.stats.forest > 15 },
  { id: 'P24', name: '資源を封鎖する（輸出停止）', cat: 'res', p: 60, mods: ['power'], ok: ['self.rep-s', 'rel.all-m', 'all.gnp-s', 'world.tension+s', 'flag:embargo', 'boost:E31'], ng: ['self.gnp-s'], tags: ['selfish', 'aggr'], avail: (g, c) => c.stats.oil >= 50 || c.stats.uranium >= 50 },
  { id: 'P25', name: '排他的な資源条約を結ぶ', cat: 'res', p: 45, mods: ['allies'], tgt: 'major', ok: ['self.oil+m', 'tgt.oil+s', 'rel.tgt+m', 'rel.all-s', 'self.rep-s'], ng: ['self.rep-s'], tags: ['selfish'] },
  // ── 食糧・水 ──
  { id: 'P30', name: '食糧を増産する', cat: 'fw', p: 60, mods: ['water', 'tech'], ok: ['self.food+m', 'self.water-s', 'world.foodPrice-s'], ng: ['self.water-s'] },
  { id: 'P31', name: '食糧援助を行う', cat: 'fw', p: 70, mods: ['food'], tgt: 'poorBg', ok: ['tgt.food+m', 'tgt.stability+m', 'self.rep+m', 'self.food-s'], ng: ['self.food-m'], tags: ['coop'], avail: (g, c) => c.stats.food >= 70 },
  { id: 'P32', name: '水資源を開発する', cat: 'fw', p: 50, mods: ['tech'], ok: ['self.water+m', 'nb.water-s', 'world.waterRes-s'], ng: ['self.fiscal-s'], avail: (g, c) => c.stats.water < 90 },
  { id: 'P33', name: '水管理法を制定する', cat: 'fw', p: 80, mods: ['stability'], ok: ['law:water', 'self.water+m', 'self.stability-s', 'self.inequality+s', 'boost:E24'], ng: ['self.stability-m'], avail: (g, c) => !myLaw(c, 'water') && (g.world.waterRes < 60 || c.stats.water < 40) },
  { id: 'P34', name: '水管理法の規制を緩和する', cat: 'fw', p: 50, mods: ['water'], ok: ['self.stability+m', 'self.inequality-s', 'self.water-m'], ng: ['self.water-m'], avail: (g, c) => myLaw(c, 'water') },
  { id: 'P35', name: '水を輸出する', cat: 'fw', p: 65, mods: ['water'], ok: ['self.gnp+l', 'self.water-m', 'self.inequality+s', 'flag:waterExport', 'boost:E25'], ng: ['self.water-m'], tags: ['selfish'], avail: (g, c) => c.stats.water >= 60 && g.world.waterRes < 65 },
  // ── 治安・内政 ──
  { id: 'P40', name: '治安を強化する', cat: 'dom', p: 65, mods: ['literacy'], ok: ['self.security+m', 'self.guerrilla-s'], ng: ['self.stability-s'] },
  { id: 'P41', name: '移民を規制する', cat: 'dom', p: 70, ok: ['self.security+s', 'self.ethnic+s', 'self.mobility-m', 'world.refugees+s', 'flag:immigCut', 'boost:E19'], ng: ['self.ethnic+m'], tags: ['selfish'] },
  { id: 'P42', name: '移民を受け入れる', cat: 'dom', p: 55, mods: ['security'], ok: ['self.pop+s', 'self.industry+m', 'self.ethnic+m', 'world.refugees-m', 'self.rep+s'], ng: ['self.ethnic+m', 'self.security-s'], tags: ['coop'] },
  { id: 'P43', name: '民族・宗教の融和政策', cat: 'dom', p: 40, mods: ['literacy'], ok: ['self.ethnic-l', 'self.stability+s'], ng: [], avail: (g, c) => c.stats.ethnic > 15 },
  { id: 'P44', name: '反政府勢力を鎮圧する', cat: 'dom', p: 55, mods: ['soldiers'], ok: ['self.guerrilla-l', 'self.stability+s', 'self.rep-m', 'boost:E14'], ng: ['self.stability-m', 'self.rep-m', 'self.guerrilla+s'], tags: ['aggr'], avail: (g, c) => c.stats.guerrilla >= 20 },
  { id: 'P45', name: '新元首の選出を支援する', cat: 'dom', p: 50, mods: ['rel'], tgt: 'collapsed', ok: ['rel.tgt+l', 'self.rep+s'], ng: [], tags: ['coop'], avail: (g) => anyCollapsed(g), run: (g, ctx, tier) => { if (tier !== 'ng' && tier !== 'fumble') { const t = g.majors[ctx.tgt]; t.support = (t.support || 0) + (tier === 'crit' ? 30 : 15); } } },
  // ── 外交 ──
  { id: 'P50', name: '他国と提携する（協調路線）', cat: 'dip', p: 55, mods: ['rel'], tgt: 'major', ok: ['ally', 'rel.tgt+m', 'self.gnp+s', 'tgt.gnp+s', 'world.treaty+s'], ng: [], tags: ['coop'], avail: (g, c) => others(g, c.id).some((o) => !g.allies.includes([c.id, o].sort().join('-'))) },
  { id: 'P51', name: '貿易協定を結ぶ', cat: 'dip', p: 60, mods: ['rel'], tgt: 'major', ok: ['self.gnp+m', 'tgt.gnp+m', 'rel.tgt+s', 'world.treaty+s'], ng: [], tags: ['coop'] },
  { id: 'P52', name: '開発援助（高金利）', cat: 'dip', p: 70, mods: ['capital'], tgt: 'poorBg', ok: ['self.capital+l', 'self.gnp+s', 'tgt.econ+s', 'tgt.debt+l', 'self.rep-s', 'flag:aidHigh', 'boost:E07'], ng: ['self.rep-s'], tags: ['selfish'], run: (g) => { g.counters.aidHigh = (g.counters.aidHigh || 0) + 1; } },
  { id: 'P53', name: '開発援助（低金利）', cat: 'dip', p: 60, mods: ['fiscal'], tgt: 'poorBg', ok: ['tgt.econ+m', 'tgt.stability+m', 'tgt.debt-s', 'self.rep+m', 'self.fiscal-s'], ng: ['self.fiscal-m'], tags: ['coop'] },
  { id: 'P54', name: '経済制裁', cat: 'dip', p: 65, mods: ['power'], tgt: 'major', ok: ['tgt.gnp-m', 'tgt.stability-s', 'rel.tgt-l', 'self.gnp-s'], ng: ['self.gnp-s', 'rel.tgt-m'], tags: ['aggr'] },
  { id: 'P55', name: '大使団を派遣して仲介する', cat: 'dip', p: 40, mods: ['rep'], ok: ['world.tension-m', 'world.conflicts-m', 'self.rep+m', 'rel.all+s'], ng: [], tags: ['coop'] },
  { id: 'P56', name: '国連に平和維持軍を要請する', cat: 'dip', p: 50, mods: ['rep'], ok: ['world.conflicts-m', 'world.trust+m', 'self.rep+s'], ng: ['world.trust-s'], tags: ['coop'], avail: (g) => g.world.stage < 1 },
  // ── 軍事 ──
  { id: 'P60', name: '軍を増強する', cat: 'mil', p: 75, mods: ['fiscal'], ok: ['self.soldiers+m', 'self.bases+s', 'self.fiscal-m', 'world.tension+s', 'rel.nb-s'], ng: ['self.fiscal-m'], tags: ['aggr'] },
  { id: 'P61', name: '軍を派遣する', cat: 'mil', p: 55, mods: ['soldiers'], tgt: 'unstable', ok: ['tgt.stability+m', 'world.conflicts-s', 'self.rep+s', 'self.fiscal-s'], ng: ['self.soldiers-s', 'self.fiscal-m', 'self.stability-s', 'world.conflicts+s'], tags: ['aggr'] },
  { id: 'P62', name: '空爆を実施する', cat: 'mil', p: 60, mods: ['soldiers', 'tech'], tgt: 'unstable', ok: ['world.conflicts-m', 'tgt.stability+s', 'self.rep-m', 'flag:airstrike', 'boost:E18'], ng: ['tgt.stability-m', 'self.rep-l', 'world.refugees+m'], tags: ['aggr'], run: (g) => { g.counters.deaths += 0.01; } },
  { id: 'P63', name: '宣戦を布告する', cat: 'mil', p: 30, mods: ['soldiers', 'power'], tgt: 'nbAny', ok: ['self.oil+m', 'self.soldiers-s', 'tgt.stability-l', 'self.rep-l', 'world.conflicts+m', 'world.tension+l', 'rel.all-m'], ng: ['self.soldiers-l', 'self.stability-m', 'self.rep-l', 'world.conflicts+m', 'world.tension+m'], tags: ['aggr'], run: (g, ctx, tier, H) => H.war(ctx.self, ctx.tgt, tier) },
  { id: 'P64', name: '同盟国を後方支援する', cat: 'mil', p: 65, mods: ['fiscal'], tgt: 'major', ok: ['tgt.soldiers+s', 'tgt.stability+s', 'rel.tgt+m', 'self.fiscal-s'], ng: ['self.fiscal-s'], tags: ['coop'], avail: (g, c) => allyCount(g, c.id) > 0 },
  { id: 'P65', name: '核兵器を開発する', cat: 'mil', p: 2, pMax: 10, mods: [], pAdj: (g, c) => Math.min(8, c.stats.uranium / 15 + (c.stats.tech - 50) / 15 + c.stats.nuke * 1.5), ok: ['nuke+', 'self.rep-l', 'world.tension+l', 'rel.all-m', 'boost:E02'], ng: ['self.fiscal-s'], tags: ['nuke', 'aggr'], avail: (g, c) => c.stats.nuke < 4 && (c.stats.nuke >= 1 || c.stats.uranium >= 15 || c.bases.includes('B10')) },
  { id: 'P66', name: '軍備を放棄する', cat: 'mil', p: 35, mods: ['stability', 'allies'], ok: ['self.soldiers-l', 'self.soldiers-l', 'self.fiscal+l', 'self.rep+l', 'world.tension-m', 'rel.all+m'], ng: ['self.stability-m'], tags: ['coop'], avail: (g, c) => c.stats.soldiers > 2 && c.stats.nuke < 4 },
  // ── 国際機関 ──
  { id: 'P70', name: '安保理決議を提案する', cat: 'intl', p: 45, mods: ['rep'], ok: ['world.conflicts-m', 'world.tension-s', 'world.trust+s'], ng: ['self.rep-s', 'world.trust-s'], tags: ['coop'], avail: (g) => g.world.stage < 1, run: (g, ctx, tier) => { if (tier === 'ng' || tier === 'fumble') g.counters.unFail = (g.counters.unFail || 0) + 1; } },
  { id: 'P71', name: '国際法廷に提訴する', cat: 'intl', p: 50, mods: ['rep'], tgt: 'major', ok: ['tgt.rep-m', 'rel.tgt-m', 'world.trust+s'], ng: ['rel.tgt-m', 'self.rep-s'] },
  { id: 'P72', name: '世界政府準備委員会の設立を提案', cat: 'intl', p: 30, mods: ['rep', 'allies'], ok: ['world.trust+m', 'self.rep+m'], ng: [], tags: ['coop'], avail: (g) => (g.world.stage === 1 || (g.world.stage === 0 && g.coop.length >= 3)) && g.allies.length >= 3, run: (g, ctx, tier, H) => { if (tier !== 'ng' && tier !== 'fumble') H.stage(2); } },
  { id: 'P73', name: '世界総選挙を実施する', cat: 'intl', p: 40, mods: ['rep', 'stability'], ok: ['world.trust+m'], ng: ['self.stability-s'], tags: ['coop'], avail: (g) => g.world.stage === 2 && g.seats.every((id) => g.majors[id].panel || g.majors[id].annexedBy), run: (g, ctx, tier, H) => { if (tier !== 'ng' && tier !== 'fumble') H.stage(3); } },
  // ── 追加（現実モチーフのイベント用） ──
  { id: 'P80', name: '国境を封鎖する', cat: 'dom', p: 75, mods: ['soldiers'], ok: ['self.security+s', 'self.gnp-m', 'self.mobility-l', 'rel.nb-s'], ng: ['self.gnp-m'], tags: ['selfish'], avail: (g) => has(g, 'pandemic') || g.world.refugees >= 60, run: (g, ctx) => { g.majors[ctx.self].flags.sealed = g.year; } },
  { id: 'P81', name: 'ワクチン・治療薬を共同開発する', cat: 'edu', p: 30, mods: ['tech', 'allies'], ok: ['rel.all+m', 'world.trust+m', 'self.rep+m', 'unflag:pandemic'], ng: [], tags: ['coop'], avail: (g) => has(g, 'pandemic'), run: (g, ctx, tier) => { if (tier !== 'ng' && tier !== 'fumble') g.flags.vaccineCoop = g.year; } },
  { id: 'P82', name: '治療薬を自国で独占する', cat: 'edu', p: 60, mods: ['tech'], ok: ['self.stability+m', 'self.rep-l', 'rel.all-l'], ng: ['self.rep-m'], tags: ['selfish'], avail: (g) => has(g, 'pandemic'), run: (g, ctx) => { g.majors[ctx.self].flags.cured = g.year; } },
  { id: 'P83', name: '金融機関を救済する', cat: 'eco', p: 60, mods: ['fiscal'], ok: ['self.gnp+m', 'self.fiscal-l', 'self.debt+m', 'self.inequality+m'], ng: ['self.fiscal-l'], avail: (g) => has(g, 'finCrisis') },
  { id: 'P84', name: '各国と通貨を協調介入する', cat: 'eco', p: 40, mods: ['allies'], ok: ['all.gnp+s', 'self.gnp+s', 'world.wrate-s', 'rel.all+s'], ng: [], tags: ['coop'], avail: (g) => has(g, 'finCrisis') || has(g, 'currency') },
  { id: 'P85', name: '原子力発電所を建設する', cat: 'res', p: 55, mods: ['tech'], ok: ['self.altE+l', 'self.co2-m', 'self.uranium-s', 'world.tension+s'], ng: ['self.fiscal-m'], avail: (g, c) => !c.flags.plant && c.stats.tech >= 50, run: (g, ctx, tier) => { if (tier !== 'ng' && tier !== 'fumble') g.majors[ctx.self].flags.plant = g.year; } },
  { id: 'P86', name: '原子力発電から撤退する', cat: 'res', p: 60, mods: ['altE'], ok: ['self.stability+s', 'self.altE-m', 'self.co2+s'], ng: ['self.altE-m'], avail: (g, c) => !!c.flags.plant, run: (g, ctx, tier) => { if (tier !== 'ng' && tier !== 'fumble') delete g.majors[ctx.self].flags.plant; } },
  { id: 'P87', name: 'サイバー防衛を強化する', cat: 'dom', p: 55, mods: ['tech'], ok: ['self.security+s', 'self.fiscal-s'], ng: ['self.fiscal-s'], run: (g, ctx, tier) => { if (tier !== 'ng' && tier !== 'fumble') g.majors[ctx.self].flags.cyber = g.year; } },
  { id: 'P88', name: '情報を統制する', cat: 'dom', p: 70, mods: ['security'], ok: ['self.stability+s', 'self.rep-m', 'self.mobility-s'], ng: ['self.rep-m', 'self.stability-s'], tags: ['selfish'], run: (g, ctx) => { const c = g.majors[ctx.self]; c.flags.censor = (c.flags.censor || 0) + 1; } },
  { id: 'P89', name: '経済圏から離脱する', cat: 'dip', p: 50, mods: ['power'], ok: ['self.stability+m', 'self.gnp-m', 'rel.all-s'], ng: ['self.gnp-m'], tags: ['selfish'], avail: (g, c) => g.bloc.includes(c.id), run: (g, ctx, tier) => { if (tier !== 'ng' && tier !== 'fumble') g.bloc = g.bloc.filter((x) => x !== ctx.self); } },
  { id: 'P90', name: '国際共同研究・宇宙開発に参加', cat: 'edu', p: 45, mods: ['tech', 'allies'], ok: ['self.tech+m', 'rel.all+s', 'self.fiscal-s', 'boost:E80'], ng: ['self.fiscal-s'], tags: ['coop'], avail: (g, c) => c.stats.tech >= 50, run: (g, ctx, tier) => { if (tier !== 'ng' && tier !== 'fumble') g.counters.space = (g.counters.space || 0) + 1; } },
  { id: 'P91', name: '国際環境条約に署名する', cat: 'intl', p: 50, mods: ['rep'], ok: ['self.co2-m', 'world.co2-s', 'self.rep+s', 'self.industry-s', 'world.treaty+s'], ng: ['self.industry-s'], tags: ['coop'], avail: (g, c) => !myLaw(c, 'envTreaty'), after: { ok: ['mylaw:envTreaty'] } },
  { id: 'P92', name: '国号を改める', cat: 'dom', p: 70, mods: ['stability'], ok: ['self.stability+s'], ng: ['self.stability-s'], w: 0.25, run: (g, ctx, tier, H) => { if (tier !== 'ng' && tier !== 'fumble') H.rename(ctx.self, 'policy'); } },
];

// 対象の候補
export function targetsFor(g, c, pol) {
  const backs = Object.keys(g.backs).filter((id) => !g.backs[id].owner);
  switch (pol.tgt) {
    case 'major': return others(g, c.id);
    case 'bg': return backs;
    case 'poorBg': return backs.filter((id) => g.backs[id].stats.econ <= 35 || g.backs[id].stats.stability <= 30);
    case 'nbAny': return neighbors(c.id).filter((id) => (isSeat(g, id) ? g.majors[id]?.panel : !g.backs[id].owner));
    case 'unstable': return [
      ...backs.filter((id) => g.backs[id].stats.stability <= 35),
      ...others(g, c.id).filter((id) => g.majors[id].stats.stability <= 35 || g.majors[id].stats.guerrilla >= 45),
    ];
    case 'collapsed': return g.seats.filter((id) => id !== c.id && !g.majors[id].panel && !g.majors[id].annexedBy);
    default: return [null];
  }
}

export const POLICIES = Object.fromEntries(P.map((p) => [p.id, p]));
export const POLICY_LIST = P;
