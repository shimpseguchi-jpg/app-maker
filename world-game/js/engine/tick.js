// 年末の処理：経済・社会・資源・環境の変化（数値は仮置き。tools/sim.mjs で調整する）
import { getMood } from './secretary.js';
import { clamp } from '../util.js';
import { power, rel } from './core.js';
import { BASE } from '../data/policies.js';

const rev = (v, to, k) => v + (to - v) * k;
export const KID_TUNE = { co2: 0.15, forest: 0.2, stab: 5 };

// 国民の気持ちが政情の落ち着く先に効く強さ（気持ち 80 で +3.6、20 で −3.6）
export const MOOD_STAB = 0.12;
export function tickMajor(g, c, H) {
  const s = c.stats, w = g.world;
  const off = !c.panel;
  const oilFactor = 1 + (70 - w.oilRes) / 40 + (g.flags.embargo != null && g.year - g.flags.embargo <= 1 ? 1 : 0);
  const supply = s.oil * 0.6 + s.altE * 0.8;
  const energy = supply < 35 ? -((35 - supply) / 25) * oilFactor : 0;
  const structure = (s.industry - 50) / 40 + (s.tech - 50) / 80 + (s.stability - 50) / 50 + (s.security - 50) / 100
    + (s.capital - 50) / 80 - (s.rate - w.wrate) * 0.2 - Math.max(0, s.rate - 8) * 0.2 + (s.literacy - 85) / 40;
  let growth = 0.3 + structure * 0.6 + energy
    + clamp((60 - s.industry) / 25, 0, 2); // 途上国は追いつく力がある
  if (off) growth -= 3;
  if (g.flags.pandemic != null && g.year > g.flags.pandemic && !c.flags.sealed && !c.flags.cured) growth -= 1.5;
  growth = clamp(growth, -12, 8);
  c.growth = growth;
  s.gnp = Math.max(0.01, s.gnp * (1 + growth / 100));

  // 財政と国債（GNP 比）
  s.fiscal = clamp(rev(s.fiscal, -2, 0.1) + (growth - 2) * 0.15, -30, 15);
  s.debt = clamp((s.debt - s.fiscal * 0.8) / (1 + Math.max(-5, growth) / 100), 0, 400);
  s.capital = clamp(rev(s.capital + (s.rate - w.wrate) * 0.4 + (s.security - 60) / 25 + (growth - 2) * 0.4, 50, 0.08), 0, 100);
  s.inequality = clamp(rev(s.inequality + (s.rate - 5) * 0.1 + (s.capital - 60) / 60 - (s.literacy - 90) / 40, 50, 0.03), 0, 100);
  const litBoost = (c.bases || []).some((b) => BASE[b]?.litBoost) ? 1.5 : 1;
  if (s.literacy < 100) s.literacy = clamp(s.literacy + ((100 - s.literacy) * 0.02 + 0.05) * litBoost, 5, 100);
  const secGuard = (c.bases || []).some((b) => BASE[b]?.secGuard);
  s.security = clamp(rev(s.security + (s.stability - 55) / 50 - s.guerrilla / 80 + (s.literacy - 85) / 60, secGuard ? 70 : 55, 0.05), 0, 100);
  s.guerrilla = clamp(rev(s.guerrilla + (45 - s.stability) / 10 + (s.inequality - 60) / 30 - (s.security - 50) / 30, 10, 0.08), 0, 100);

  // 食糧・水の不足
  let short = 0, popShort = 0;
  // 豊かな国は食糧・水を輸入できる（1人あたり GNP が高いほど不足の影響が小さい）
  const perCap = (s.gnp / s.pop) * 1000;
  const imp = 1 - clamp(perCap / 60, 0, 0.85);
  if (s.food < 60) { short += (60 - s.food) / 4; popShort += (60 - s.food) / 20; }
  if (s.water < 20) { short += (20 - s.water) / 2; popShort += (20 - s.water) / 10; }
  short *= imp; popShort *= imp;
  const natural = (g.kid ? -KID_TUNE.stab : 0) + 50 + (s.security - 50) * 0.35 - (s.inequality - 50) * 0.3 - (s.ethnic - 50) * 0.25 - s.guerrilla * 0.2
    + growth * 1.5 - short + (s.rep - 50) * 0.05 + 18
    + (getMood(c) - 50) * MOOD_STAB; // 国民の気持ち（短絡的で自国優先）
  s.stability = clamp(rev(s.stability, natural, 0.2), 0, 100);

  const pg = (100 - s.literacy) / 25 + 0.3 - popShort;
  const before = s.pop;
  s.pop = Math.max(0.1, s.pop * (1 + pg / 100));
  if (s.pop < before) H.deaths(before - s.pop);

  s.food = clamp(s.food + (w.rain - 60) / 15 + (s.water - 30) / 60 - (w.co2 - 40) / 40, 0, 300);
  s.water = clamp(s.water + (w.rain - 60) / 20 - (w.co2 - 40) / 50, 0, 100);
  if (s.oil > 0) s.oil = Math.max(0, s.oil - 0.4);
  if (s.forest < 80) s.forest = clamp(s.forest + 0.2, 0, 100);
  s.co2 = clamp(s.co2 + (s.industry - 60) / 50 - (s.altE - 30) / 50, 0, 100);
  s.tech = clamp(s.tech + (s.literacy - 85) / 60 + (s.capital - 50) / 150, 0, 100);
  s.ethnic = clamp(s.ethnic + (s.mobility - 60) / 80 + w.refugees / 200 - 0.3, 0, 100);
  s.rep = clamp(rev(s.rep, 50, 0.03), 0, 100);
  c.power = power(c);
}

export function tickBack(g, b, H) {
  const s = b.stats, w = g.world;
  if (b.sunk) return;
  s.econ = clamp(s.econ + (s.stability - 45) / 40 + (H.rng() - 0.5) * 2, 0, 100);
  s.debt = clamp(s.debt + (w.wrate - 4) * 0.4 + (s.econ < 20 ? 1 : 0) - 0.3, 0, 150);
  s.stability = clamp(rev(s.stability + (s.econ - 35) / 30 + (s.food - 45) / 40 + (s.water - 35) / 50 - (w.conflicts - 70) / 200 + (H.rng() - 0.5) * 3, 45, 0.06), 0, 100);
  s.water = clamp(s.water + (w.rain - 60) / 25, 0, 100);
  s.food = clamp(s.food + (w.rain - 60) / 20 - (w.foodPrice - 50) / 30, 0, 100);
  if (s.debt >= 100) { s.econ = Math.max(0, s.econ - 10); s.stability = Math.max(0, s.stability - 10); s.debt = 70; g.counters.defaults = (g.counters.defaults || 0) + 1; }
  if (s.stability < 15) H.deaths(0.05);
  if (s.food < 20) H.deaths(0.1);
}

export function bankruptCount(g) {
  return Object.values(g.backs).filter((b) => !b.owner && (b.sunk || b.stats.econ <= 8 || b.stats.debt >= 95)).length;
}

export function envIndex(w) {
  return Math.round(100 - Math.max(0, w.co2 - 30) - (100 - w.forestRes) * 0.2 - (100 - w.ice) * 0.2 - (100 - w.waterRes) * 0.2 - (100 - (w.biodiv ?? 70)) * 0.15);
}

export function tickWorld(g) {
  const w = g.world;
  const all = Object.values(g.majors).filter((c) => !c.annexedBy);
  const act = all.filter((c) => c.panel);
  const emis = all.reduce((sum, c) => sum + c.stats.co2, 0) + Object.values(g.bgStatic || {}).reduce((sum, v) => sum + v, 0);
  // 1ねんせいモードは手番が少ないぶん、人の活動による環境の悪化を年ごとの変化に上乗せする（KID_TUNE）
  const kt = g.kid ? KID_TUNE : null;
  w.co2 = clamp(w.co2 + emis / 1000 + 0.2 - w.forestRes / 200 + (kt ? kt.co2 : 0), 0, 100);
  w.ice = clamp(w.ice - 0.15 - Math.max(0, w.co2 - 45) / 15, 0, 100);
  w.rain = clamp(rev(w.rain - Math.max(0, w.co2 - 50) / 20, 60, 0.02), 0, 100);
  w.waterRes = clamp(w.waterRes - 0.25 - Math.max(0, w.co2 - 50) / 25 + (w.rain - 60) / 40, 0, 100);
  w.forestRes = clamp(w.forestRes + 0.1 - (kt ? kt.forest : 0), 0, 100);
  w.biodiv = clamp(w.biodiv - 0.1 - (100 - w.forestRes) / 400 - Math.max(0, w.co2 - 50) / 50, 0, 100);
  w.oilRes = clamp(w.oilRes - 0.35, 0, 100);
  const avgFood = act.length ? act.reduce((s, c) => s + c.stats.food, 0) / act.length : 100;
  w.foodPrice = clamp(rev(w.foodPrice, 50, 0.1) + (avgFood < 90 ? 1 : 0) + (g.flags.altE != null ? 0.5 : 0), 10, 300);
  const backs = Object.values(g.backs).filter((b) => !b.owner);
  const unstable = backs.filter((b) => b.stats.stability <= 25).length;
  w.refugees = clamp(rev(w.refugees + (w.conflicts - 50) / 25 + unstable * 0.3 - 1, 30, 0.05), 0, 100);
  const majUnstable = act.filter((c) => c.stats.stability < 35).length + all.filter((c) => !c.panel).length;
  const natC = 30 + 3 * unstable + 5 * majUnstable + w.tension / 6 + (w.refugees - 30) / 6;
  w.conflicts = Math.round(clamp(rev(w.conflicts, natC, 0.15), 0, 200));
  const nukes = act.filter((c) => c.stats.nuke >= 4).length;
  let hostile = 0;
  for (const a of act) for (const b of act) if (a.id < b.id && rel(g, a.id, b.id) < 25) hostile++;
  const natT = 15 + 6 * nukes + hostile * 4 + w.conflicts / 5 - g.allies.length * 2 - w.treaty / 10;
  w.tension = clamp(rev(w.tension, natT, 0.2), 0, 100);
  w.treaty = clamp(rev(w.treaty + g.allies.length * 0.15 - (w.tension - 50) / 40, 40, 0.02), 0, 100);
  w.trust = clamp(rev(w.trust, 50, 0.03), 0, 100);
  w.wrate = act.length ? act.reduce((s, c) => s + c.stats.rate, 0) / act.length : w.wrate;
  w.temp = Math.max(0, (w.co2 - 40) * 0.06);
  w.env = envIndex(w);
  w.bankrupt = bankruptCount(g);
}
