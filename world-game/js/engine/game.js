// ゲームの進行：世界の生成 → 基本政策 → 毎年（イベント → 各国の手番 → 年末処理）→ 終了
import { SPECIAL, OPTION_BY_ID, kindOf, poolOf } from '../data/reactions.js';
import { secAfterReact, secYearEnd, secBack, moodFromReaction, moodFromPolicy, moodYearEnd, secPolicy } from './secretary.js';
import { makeRng, hashSeed, shuffle, pick, weighted, clamp } from '../util.js';
import { MAJORS, BACKS, REGIONS, POLAR_LINKS } from '../data/countries.js';
import { AREAS, CENTERS } from '../data/mapdata.js';
import { POLICIES, POLICY_LIST, BASE, targetsFor } from '../data/policies.js';
import { EVENTS, EVENT_BY_ID, nukePair } from '../data/events.js';
import { GM, AI_LINES } from '../data/gm.js';
import { registerBases, neighbors, rawNeighbors, setUnits, unitOf, polarNeighbors, isSeat, C, power, probability, judge, TIER, rel, addRel, active, allied, eduLevel, EDU_LOW } from './core.js';
import { applyFx } from './effects.js';
import { PERSONAS, choosePolicy, voteYes, AGENDAS } from './ai.js';
import { AGENDA_BASE, AGENDA_LOSE_FX, AGENDA_GAIN_FX } from '../data/agendas.js';
import { tickMajor, tickBack, tickWorld, envIndex, bankruptCount } from './tick.js';
import { SPARKS, startSpark, sparkEffect, tickSparks } from './sparks.js';
import { SITUATIONS } from '../data/situations.js';
import { KID_COUNTRY, KID_GM, KID_AI_LINES, KID_EVENT, KID_STAGES, KID_AGENDAS, KID_ENDINGS, KID_TIERS, KID_BASE, KID_POLICY, KID_SPARK } from '../data/kid.js';
const KID_SPARK_NAME = (t) => KID_SPARK[t][0];

registerBases(BASE);
export const START_YEAR = 2005;
export const MAX_YEARS = 50;
export const STAGES = ['国連', '国連の解体', '世界政府準備委員会', '世界総選挙', '世界議会'];
export const ENV_LIMIT = 10;
const clone = (o) => JSON.parse(JSON.stringify(o));
// 暦の年。1ねんせいモードは 1かいで 2〜3年すすむ（g.cal は経過した年数）
export const yearLabel = (g) => START_YEAR + (g.cal ?? g.year - 1);
export const maxYears = (g) => g.maxYears || MAX_YEARS;
// 1ねんせいモードでは ひらがなの ほうを使う
export const J = (g, adult, kid) => (g.kid ? kid : adult);
const KID_WHY = { 政権崩壊: 'せいふが たおれた', 軍事クーデター: 'ぐんたいが せいふを のっとった', 敗戦: 'せんそうに まけた', 宗教革命: 'かくめいが おきた' };
// 1ねんせいモードは手番が少ないぶん、1回の政策・できごとの効き目を大きくする（難しさをおとなと同じにするため）
export const fxScale = (g) => (g.kid ? 2.5 : 1);
// できごとは1かいに2〜3こ起きるので、効き目の倍率は小さめ
export const evScale = (g) => (g.kid ? 1.6 : 1);
export const stageName = (g, n) => (g.kid ? KID_STAGES : STAGES)[n];

// ───── 世界の生成（シード値で 6 カ国・自国・AI の性格が決まる） ─────
const OIL = ['M01', 'M02', 'M07', 'M08', 'M09'];
const POLAR = ['M01', 'M06', 'M07', 'M03', 'M10', 'M16'];
const REGION_GROUP = { na: 'na', sa: 'sa', eu: 'eu', me: 'me', as: 'as', oc: 'oc' };
function validDraw(ids) {
  const reg = {};
  for (const id of ids) { const r = REGION_GROUP[MAJORS.find((m) => m.id === id).region]; reg[r] = (reg[r] || 0) + 1; }
  if (Object.keys(reg).length < 3 || Object.values(reg).some((n) => n > 2)) return false;
  if (!ids.some((id) => OIL.includes(id))) return false;
  if (!ids.some((id) => POLAR.includes(id))) return false;
  const polar = (a, b) => POLAR_LINKS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  return ids.some((a) => ids.some((b) => a < b && (rawNeighbors(a).includes(b) || polar(a, b))));
}
export function drawWorld(seed) {
  const rng = makeRng(hashSeed(seed));
  const all = MAJORS.map((m) => m.id);
  let ids;
  for (let i = 0; i < 500; i++) { ids = shuffle(rng, all).slice(0, 6); if (validDraw(ids)) break; }
  const player = pick(rng, ids);
  const personas = shuffle(rng, Object.keys(PERSONAS));
  const seats = shuffle(rng, ids);
  const persona = {};
  let k = 0;
  for (const id of seats) if (id !== player) persona[id] = personas[k++];
  return { seats, player, persona };
}

// 世界の国の数（自国＋AI の6カ国をふくむ）。減らすと背景国が近くの国とまとまって、大きな地域になる
export const WORLD_MIN = 10, WORLD_MAX = 46;

// 背景国をまとめる：いちばん小さいまとまりを、となり（なければいちばん近く）の、同じ地域で小さいまとまりにくっつける。を、数が目標になるまでくりかえす
// 代表（名前・旗・ID）は、抽選外の主要国 → 面積の大きい国の順。数値は面積で重みをつけた平均
function mergeBacks(backs, target) {
  const unit = Object.fromEntries(Object.keys(backs).map((id) => [id, id]));
  const members = Object.fromEntries(Object.keys(backs).map((id) => [id, [id]]));
  const area = (u) => members[u].reduce((sum, m) => sum + (AREAS[m] || 1), 0);
  const dist = (a, b) => Math.hypot(CENTERS[a][0] - CENTERS[b][0], CENTERS[a][1] - CENTERS[b][1]);
  while (Object.keys(members).length > target) {
    const list = Object.keys(members).sort((a, b) => area(a) - area(b) || (a < b ? -1 : 1));
    const small = list[0];
    const nbs = new Set();
    for (const m of members[small]) for (const n of rawNeighbors(m)) { const u = unit[n]; if (u && u !== small) nbs.add(u); }
    const cands = nbs.size ? [...nbs] : list.slice(1);
    const score = (u) => (backs[u].region === backs[small].region ? 0 : 400) + area(u) / 40 + dist(u, small);
    const into = cands.sort((a, b) => score(a) - score(b) || (a < b ? -1 : 1))[0];
    members[into].push(...members[small]);
    for (const m of members[small]) unit[m] = into;
    delete members[small];
  }
  const out = {}, unitOfMap = {};
  for (const ms of Object.values(members)) {
    const rep = ms.slice().sort((a, b) => (backs[b].big ? 1 : 0) - (backs[a].big ? 1 : 0) || (AREAS[b] || 0) - (AREAS[a] || 0))[0];
    const b = backs[rep];
    if (ms.length > 1) {
      const w = ms.map((m) => AREAS[m] || 1), tw = w.reduce((x, y) => x + y, 0);
      for (const st of Object.keys(b.stats)) b.stats[st] = Math.round(ms.reduce((sum, m, i) => sum + (backs[m].stats[st] ?? b.stats[st]) * w[i], 0) / tw);
      b.big = ms.some((m) => backs[m].big);
      if (b.big) b.co2 = ms.reduce((sum, m) => sum + (backs[m].big ? backs[m].co2 || 0 : 0), 0);
      b.merged = ms.slice().sort();
    }
    out[rep] = b;
    for (const m of ms) unitOfMap[m] = rep;
  }
  return { backs: out, unitOf: unitOfMap };
}
// セーブから再開したときなどに、そのゲームの背景国のまとまりを使うようにする
export function attachWorld(g) { setUnits(g.unitOf || null); return g; }

export function newGame(seed, { rerolled = false, diceSeed, kid = false, size = WORLD_MAX } = {}) {
  const d = drawWorld(seed);
  setUnits(null);
  const majors = {};
  let backs = {};
  for (const m of MAJORS) {
    if (d.seats.includes(m.id)) {
      majors[m.id] = { ...clone(m), panel: true, persona: d.persona[m.id] || null, player: m.id === d.player, bases: [], flags: {}, laws: {}, origName: m.name, lastAct: null };
      majors[m.id].power = power(majors[m.id]);
    } else {
      // 抽選に外れた主要国は「大きめの背景国」
      const s = m.stats;
      backs[m.id] = { id: m.id, name: m.name, region: m.region, role: '主要国（抽選外）', flag: m.flag, big: true, owner: null,
        stats: { econ: Math.round(clamp(25 * Math.log10(s.gnp) + 50, 0, 100)), stability: s.stability, water: s.water, food: Math.min(100, Math.round(s.food / 2)), debt: Math.min(80, Math.round(s.debt / 3)) },
        co2: s.co2 };
    }
  }
  for (const b of BACKS) backs[b.id] = { ...clone(b), owner: null };
  if (kid) {
    for (const c of [...Object.values(majors), ...Object.values(backs)]) {
      const k = KID_COUNTRY[c.id];
      c.name = k[0]; if (c.origName) c.origName = k[0];
      if (k[1]) c.renames = k[1];
      if (c.role) c.role = '';
    }
  }
  const worldSize = Math.max(WORLD_MIN, Math.min(WORLD_MAX, Math.round(size) || WORLD_MAX));
  const bgTarget = worldSize - 6;
  let unitOfMap = null;
  if (bgTarget < Object.keys(backs).length) ({ backs, unitOf: unitOfMap } = mergeBacks(backs, bgTarget));
  setUnits(unitOfMap);
  const g = {
    v: 1, seed, rerolled, kid, maxYears: kid ? 20 : MAX_YEARS, cal: 0, year: 0, phase: 'setup', seats: d.seats, player: d.player, majors, backs,
    world: { biodiv: 70, conflicts: 70, treaty: 40, wrate: 5, tension: 35, co2: 40, ice: 80, rain: 60, oilRes: 70, forestRes: 70, waterRes: 70, foodPrice: 50, refugees: 30, trust: 50, stage: 0, temp: 0 },
    bgStatic: Object.fromEntries(Object.values(backs).filter((b) => b.big).map((b) => [b.id, b.co2])),
    worldSize, unitOf: unitOfMap || undefined, bgScale: 40 / Object.keys(backs).length,
    rel: {}, allies: [], bloc: [], laws: {}, flags: {}, counters: { deaths: 0 }, boost: {}, fired: {}, coop: [],
    rngState: (diceSeed ?? (Math.random() * 2 ** 32)) >>> 0, order: [], turn: 0, offers: null, inserts: [], feed: [], chron: [], hist: [], pending: null, result: null, voteTries: 0,
  };
  for (const a of d.seats) for (const b of d.seats) if (a < b) {
    let r = 50;
    if (neighbors(a).includes(b)) r -= 10;
    if (majors[a].persona === 'ambition' || majors[b].persona === 'ambition') r -= 5;
    g.rel[`${a}-${b}`] = r;
  }
  g.world.wrate = d.seats.reduce((s, id) => s + majors[id].stats.rate, 0) / 6;
  g.world.env = envIndex(g.world);
  g.world.bankrupt = bankruptCount(g);
  say(g, 'setup.intro', { name: majors[d.player].name });
  return g;
}

// ───── 乱数・GM ─────
function rngOf(g) {
  const r = makeRng(g.rngState);
  const f = () => { const v = r(); g.rngState = r.state(); return v; };
  return f;
}
export function fill(t, vars) { return t.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? '')); }
export function say(g, tag, vars = {}, extra = {}) {
  const def0 = GM[tag];
  if (!def0) return;
  const def = g.kid && KID_GM[tag] ? { pri: def0.pri, lines: KID_GM[tag] } : def0;
  const rng = rngOf(g);
  g.lastLine = g.lastLine || {};
  let i = Math.floor(rng() * def.lines.length);
  if (def.lines.length > 1 && g.lastLine[tag] === i) i = (i + 1) % def.lines.length;
  g.lastLine[tag] = i;
  g.feed.push({ k: 'gm', pri: def.pri, text: fill(def.lines[i], { year: yearLabel(g), ...vars }), ...extra });
}
const gmText = (g, text, pri = 1) => g.feed.push({ k: 'gm', pri, text });
// 補佐官のせりふ（ニュースの欄に出し、自国の欄にいちばん新しいものを出す）
const secSay = (g, text) => { if (!text) return; g.feed.push({ k: 'sec', text }); g.lastSec = { text, year: g.year }; };
const chron = (g, text) => g.chron.push({ year: yearLabel(g), text });
// sparks.js が年なしで積んだ年表に年を入れる
function fixChronYears(g) { for (const c of g.chron) if (c.year == null) c.year = yearLabel(g); }

// ───── 効果のための道具（イベント・政策から呼ぶ） ─────
function helpers(g) {
  const rng = rngOf(g);
  const H = {
    rng, pick: (a) => pick(rng, a),
    fx: (list, ctx, f = 1) => applyFx(g, list, ctx, f),
    addRel: (a, b, d) => addRel(g, a, b, d),
    say: (text) => { if (!g.kid) gmText(g, text, 2); },
    chron: (text) => { if (!g.kid) chron(g, text); },
    deaths: (m) => { g.counters.deaths += m; },
    stage: (n) => setStage(g, n),
    rename: (id, why) => rename(g, id, why),
    collapse: (id, why) => collapse(g, id, why),
    war: (a, b, tier) => war(g, a, b, tier, H),
    spark: (type, where) => { const s = startSpark(g, H, type, where && unitOf(where)); fixChronYears(g); return s; },
  };
  return H;
}

function setStage(g, n) {
  if (n <= g.world.stage) return;
  g.world.stage = n;
  chron(g, J(g, `国際機関の段階が「${STAGES[n]}」に進む`, `「${KID_STAGES[n]}」まで すすんだ`));
  say(g, 'stage.up', { stage: stageName(g, n) });
}

export function rename(g, id, why) {
  const c = g.majors[id];
  if (!c) return;
  const cands = (c.renames || []).filter((n) => n !== c.name);
  if (!cands.length) return;
  if (c.player && c.panel !== false) { g.pendingQueue = g.pendingQueue || []; g.pendingQueue.push({ type: 'rename', id, options: cands, why }); return; }
  const rng = rngOf(g);
  doRename(g, id, pick(rng, cands));
}
export function doRename(g, id, name) {
  const c = g.majors[id];
  const old = c.name;
  c.name = name;
  chron(g, J(g, `${old}、国号を「${name}」に改める`, `${old}の なまえが「${name}」に かわった`));
  say(g, 'rename', { old, name });
}

function collapse(g, id, why) {
  const c = g.majors[id];
  if (!c || !c.panel) return;
  c.panel = false; c.collapsedYear = g.year; c.support = 0;
  const w = why || '政権崩壊';
  g.feed.push({ k: 'sys', cls: 'bad', text: J(g, `${c.name}で${w}。パネルがオフになった。`, `${c.name}で ${KID_WHY[w] || 'せいふが たおれた'}。しばらく おやすみ。`) });
  chron(g, J(g, `${c.name}、${w}`, `${c.name}で ${KID_WHY[w] || 'せいふが たおれた'}`));
  say(g, c.player ? 'player.collapsed' : 'ai.collapsed', { name: c.name });
  g.allies = g.allies.filter((k) => !k.split('-').includes(id));
  collapseShock(g, id);
}

// 崩壊の波紋：国の大きさ（主要国全体の GNP に占める割合）しだいで、世界への影響が大きくなる。
// 大国なら世界中の景気・紛争・難民・国際機関への信頼に、小さな国ならおもに となりの国に
const r1 = (v) => Math.round(v * 10) / 10;
export function shockLevel(share) { return share >= 0.15 ? 3 : share >= 0.05 ? 2 : 1; }
function collapseShock(g, id) {
  const c = g.majors[id];
  const total = Object.values(g.majors).filter((x) => !x.annexedBy).reduce((sum, x) => sum + x.stats.gnp, 0) || 1;
  const share = Math.min(0.5, c.stats.gnp / total);
  const lv = shockLevel(share);
  const fx = [`world.conflicts+${r1(2 + 30 * share)}`, `world.refugees+${r1(4 + 40 * share)}`, `world.tension+${r1(2 + 20 * share)}`, `world.trust-${r1(2 + 20 * share)}`,
    `tgtNb.stability-${r1(4 + 30 * share)}`, 'tgtNb.guerrilla+3'];
  if (lv >= 2) fx.push(`all.capital-${r1(40 * share)}`, `all.industry-${r1(25 * share)}`);
  if (lv >= 3) fx.push(`all.stability-${r1(15 * share)}`, 'world.foodPrice+10', 'bgAll.econ-4');
  pushShock(g, id, lv, fx);
}
// 背景国が国として成り立たなくなった（政情がほぼ0）：大きな国（抽選外の主要国・まとまった地域）ほど影響が大きい
function backFailures(g) {
  for (const b of Object.values(g.backs)) {
    if (b.owner || b.sunk) continue;
    if (b.failed != null && b.stats.stability >= 30) delete b.failed;
    if (b.failed != null || b.stats.stability > 6) continue;
    b.failed = g.year;
    const lv = b.big || (b.merged?.length || 1) >= 3 ? 2 : 1;
    pushShock(g, b.id, lv, lv >= 2 ? ['tgtNb.stability-8', 'tgtNb.guerrilla+4', 'world.refugees+6', 'world.conflicts+4']
      : ['tgtNb.stability-5', 'tgtNb.guerrilla+2', 'world.refugees+3', 'world.conflicts+2']);
  }
}
function pushShock(g, id, lv, fx) {
  const changes = [];
  applyFx(g, fx, { self: id, tgt: id }, 1, changes);
  const name = C(g, id).name;
  g.feed.push({ k: 'shock', id, lv, failed: !g.majors[id], res: summarizeChanges(g, changes.filter((x) => x.id !== id)) });
  if (lv >= 3) chron(g, J(g, `${name}の崩壊が世界をゆるがす`, `${name}が たおれて、せかいじゅうが ゆれた`));
}

function annex(g, owner, id) {
  const o = g.majors[owner];
  if (isSeat(g, id)) {
    const t = g.majors[id];
    t.panel = false; t.annexedBy = owner;
    g.allies = g.allies.filter((k) => !k.split('-').includes(id));
    o.stats.gnp += t.stats.gnp * 0.5; o.stats.pop += t.stats.pop; o.stats.ethnic = clamp(o.stats.ethnic + 15, 0, 100);
    chron(g, J(g, `${t.name}、${o.name}に併合される`, `${t.name}が ${o.name}に とられた`));
    say(g, 'annex', { who: t.name, name: o.name });
    if (t.player) endGame(g, 'annexed');
  } else {
    const b = g.backs[id];
    b.owner = owner;
    o.stats.gnp *= 1 + b.stats.econ / 1000; o.stats.ethnic = clamp(o.stats.ethnic + 6, 0, 100);
    chron(g, J(g, `${b.name}、${o.name}に併合される`, `${b.name}が ${o.name}に とられた`));
    say(g, 'annex', { who: b.name, name: o.name });
  }
}

// 戦争の結果（P63 宣戦布告、E28 水戦争、E66 侵攻）
function war(g, a, b, tier, H) {
  if (!b) return;
  const A = g.majors[a];
  const win = tier === 'crit' || tier === 'ok' || tier === 'partial';
  g.counters.deaths += 0.05;
  const oilRich = isSeat(g, b) ? g.majors[b].stats.oil >= 60 : ['B07', 'B13', 'B21', 'B27', 'M08', 'M02', 'M07'].includes(b);
  if (oilRich) g.flags.oilWar = g.year;
  if (isSeat(g, b)) {
    const B = g.majors[b];
    addRel(g, a, b, -30);
    if (win) {
      applyFx(g, ['tgt.stability-l', 'tgt.soldiers-m', 'tgt.gnp-m'], { self: a, tgt: b }, tier === 'crit' ? 1.5 : 1);
      if (B.stats.stability < 10 && tier === 'crit') annex(g, a, b);
      else if (B.stats.stability < 12) collapse(g, b, '敗戦');
    } else applyFx(g, ['self.soldiers-m', 'self.stability-s'], { self: a }, 1);
  } else {
    const bk = g.backs[b];
    if (win && (bk.stats.stability <= 45 || tier === 'crit')) annex(g, a, b);
    else if (win) bk.stats.stability = Math.max(0, bk.stats.stability - 15);
    applyFx(g, ['world.refugees+m'], { self: a });
    if (!win) applyFx(g, ['self.soldiers-m', 'self.stability-s'], { self: a });
  }
  A.stats.rep = clamp(A.stats.rep - 5, 0, 100);
}

// ───── 開始 ─────
export function aiBases(g, id) {
  const c = g.majors[id];
  const rng = rngOf(g);
  const first = PERSONAS[c.persona].base;
  const list = [first];
  if (rng() < 0.6) list.push(pick(rng, Object.keys(BASE).filter((b) => b !== first && b !== 'B10')));
  return list;
}
export function startGame(g, playerBases) {
  for (const id of g.seats) {
    const c = g.majors[id];
    c.bases = c.player ? playerBases.slice(0, 2) : aiBases(g, id);
    for (const b of c.bases) applyFx(g, BASE[b].fx, { self: id });
    c.power = power(c);
    g.feed.push({ k: 'sys', text: J(g, `${c.name}の基本政策：${c.bases.map((b) => BASE[b].name).join('・')}`, `${c.name}の やりかた：${c.bases.map((b) => KID_BASE[b][0]).join('、')}`) });
  }
  g.chron.push({ year: START_YEAR, text: J(g, 'ゲーム開始。各国の元首が基本政策を定める', 'げーむ すたーと。くにの だいひょうが やりかたを きめた') });
  beginYear(g);
}

// ───── 1年の流れ ─────
export function beginYear(g) {
  g.year += 1;
  g.feed = [];
  g.inserts = [];
  g.yearActs = [];
  if (g.situations) { const cal = g.cal ?? g.year - 1; g.situations = g.situations.filter((s) => cal < s.until); }
  if (g.world.stage === 3) setStage(g, 4);
  say(g, 'year.start');
  const H = helpers(g);
  const evs = pickEvents(g, H);
  for (const ev of evs) fireEvent(g, ev, H);
  // 火種への対応策を、その年の選択肢に差し込む。様子は GM がほのめかすだけ（深刻度と期限は秘匿）
  for (const s of g.sparks || []) {
    for (const p of Object.keys(SPARKS[s.type].fx)) if (!g.inserts.includes(p)) g.inserts.push(p);
    if (s.start < g.year) {
      const lv = s.sev <= 25 ? 'low' : s.sev <= 55 ? 'mid' : s.sev <= 80 ? 'high' : 'crit';
      say(g, `spark.hint.${lv}`, { name: C(g, s.where).name, what: g.kid ? KID_SPARK_NAME(s.type) : SPARKS[s.type].name });
    }
  }
  // 席順に時計回り。毎年ひとつずつ開始位置がずれる
  const start = (g.year - 1) % g.seats.length;
  g.order = [...g.seats.slice(start), ...g.seats.slice(0, start)];
  g.turn = 0;
  g.phase = g.result ? 'over' : 'turns';
  if (g.pendingQueue?.length && !g.pending) g.pending = g.pendingQueue.shift();
  if (g.pending && !g.result) g.phase = 'pending';
}

// プレイヤーの国の状態で起きやすくなるニュース：弱いところ（強いところ）に関係するニュースほど起きやすい
const PRESSURE = [
  { kinds: ['food'], test: (s) => s.food < 60, m: 1.8, why: ['食べものが足りない', 'たべものが たりない'] },
  { kinds: ['water'], test: (s) => s.water < 30, m: 1.8, why: ['水が足りない', 'みずが たりない'] },
  { kinds: ['unrest', 'population', 'refugee'], test: (s) => s.stability < 40, m: 1.6, why: ['政情が不安定', 'くにが ぐらぐら して いる'] },
  { kinds: ['crisis', 'money'], test: (s) => s.debt >= 150 || s.fiscal <= -8, m: 1.6, why: ['借金が多い', 'しゃっきんが おおい'] },
  { kinds: ['armed', 'crime'], test: (s) => s.security < 40 || s.guerrilla >= 50, m: 1.6, why: ['治安が悪い', 'あぶない ひとが おおい'] },
  { kinds: ['outbreak'], test: (s, c) => eduLevel(c) < EDU_LOW, m: 1.5, why: ['教育が低い', 'べんきょうが たりない'] },
  { kinds: ['climate', 'nature'], test: (s) => s.co2 >= 70, m: 1.4, why: ['CO₂を多く出している', 'けむりを たくさん だして いる'] },
  { kinds: ['war', 'tension', 'nuke'], test: (s) => s.soldiers >= 100 || s.nuke >= 4, m: 1.3, why: ['軍が大きい', 'ぐんたいが おおきい'] },
  { kinds: ['cyber', 'frontier', 'good', 'space'], test: (s) => s.tech >= 80, m: 1.3, why: ['技術が進んでいる', 'ぎじゅつが すすんで いる'] },
];
function pressure(g, ev) {
  const c = g.majors[g.player];
  if (!c?.panel || !(ev.w > 0 && ev.w < 100)) return null;
  const k = kindOf(ev);
  return PRESSURE.find((p) => p.kinds.includes(k) && p.test(c.stats, c)) || null;
}

function pickEvents(g, H) {
  const out = [];
  const can = (e) => {
    if (out.includes(e)) return false;
    if (g.fired[e.id] != null && !e.repeat) return false;
    if (g.fired[e.id] != null && g.year - g.fired[e.id] < e.repeat) return false;
    try { return !!e.cond(g, H); } catch (err) { return false; }
  };
  // 必ず起きるもの（開幕・報道・世界議会・核のボタン）
  for (const e of EVENTS) if ((e.w === 0 || e.w >= 100) && can(e)) out.push(e);
  const pool = EVENTS.filter((e) => e.w > 0 && e.w < 100 && can(e));
  const n = g.kid ? (H.rng() < 0.5 ? 3 : 2) : H.rng() < 0.45 ? 2 : 1;
  for (let i = 0; i < n && pool.length; i++) {
    const e = weighted(H.rng, pool.filter((x) => !out.includes(x)), (x) => x.w * (1 + (g.boost[x.id] || 0)) * (pressure(g, x)?.m || 1));
    if (e) out.push(e);
  }
  return out;
}

function fireEvent(g, ev, H) {
  // 同じ年に先に起きたイベントで状況が変わることがあるので、条件をもう一度確かめる
  try { if (!ev.cond(g, H)) return; } catch (err) { return; }
  g.fired[ev.id] = g.year;
  delete g.boost[ev.id];
  let who = null;
  try { who = ev.who ? ev.who(g, H) : null; } catch (err) { who = null; }
  if (who) who = unitOf(who); // まとまった背景国は代表で
  const whoName = who ? C(g, who)?.name : '';
  const [evName, evText] = g.kid && KID_EVENT[ev.id] ? KID_EVENT[ev.id] : [ev.name, ev.text || ''];
  const entry = { k: 'event', id: ev.id, cat: ev.cat, name: evName, who, text: fill(evText, { who: whoName, year: yearLabel(g) }) };
  // つながり：前のニュースがきっかけで起きやすくなっていたら、そのニュース（from）。このニュースで起きやすくなるもの（next）
  const from = g.cause?.[ev.id];
  if (from) { entry.from = from; delete g.cause[ev.id]; }
  entry.next = (ev.next || []).filter((n) => EVENT_BY_ID[n]);
  const pr = pressure(g, ev);
  if (pr) entry.why = J(g, pr.why[0], pr.why[1]);
  g.feed.push(entry);
  chron(g, `${evName}${whoName ? `（${whoName}）` : ''}${from ? J(g, `　←「${from.name}」から`, `　←「${from.name}」から`) : ''}`);
  // このニュースで動いた数値を集めて、ニュースの下に「→ どこの何が上下したか」を出す
  const evChanges = [];
  const HE = { ...H, fx: (list, ctx, f = 1) => applyFx(g, list, ctx, f, evChanges) };
  if (ev.fx) applyFx(g, ev.fx, { who, self: null }, evScale(g), evChanges);
  if (ev.run) { try { ev.run(g, HE, who); } catch (err) { console.warn(ev.id, err); } }
  entry.res = summarizeChanges(g, evChanges);
  addSituations(g, ev, who, evName);
  // ニュースへの反応（左右の2択）。自国が動いていて、核・投票など別の決定があるニュースでなければ
  const me = g.majors[g.player];
  const kind = kindOf(ev);
  if (me?.panel && !ev.special && kind) { entry.react = who === g.player ? 'self' : kind; entry.opts = newsOptions(g, entry); }
  for (const n of ev.next || []) { g.boost[n] = (g.boost[n] || 0) + 3; (g.cause ||= {})[n] = { id: ev.id, name: evName, year: yearLabel(g) }; }
  for (const p of ev.ins || []) if (!g.inserts.includes(p)) g.inserts.push(p);
  if (ev.coop && !g.coop.includes(ev.id)) {
    g.coop.push(ev.id);
    g.feed.push({ k: 'sys', cls: 'good', text: J(g, `協調の成功例（${g.coop.length}/3）`, `みんなで ちからを あわせた（${g.coop.length}/3）`) });
  }
  if (ev.special === 'nuke') nukeCrisis(g, H);
  if (ev.special === 'vote') startVote(g, H);
}

// ニュースのカードの選択肢：自国優先から1つ、よその国を助ける・がまんするから1つ（左右はランダム）。状況しだいで3つめ（↑）
function newsOptions(g, e) {
  const me = g.majors[g.player];
  const rng = rngOf(g);
  const pool = poolOf(e.react);
  // 国の状態で選べない選択肢（need）はのぞく。のぞいて空になったら、そのまま
  const can = (list) => { const ok = list.filter((o) => !o.need || o.need(me.stats)); return ok.length ? ok : list; };
  const a = pick(rng, can(pool.filter((o) => o.pop > 0))), b = pick(rng, can(pool.filter((o) => o.pop <= 0)));
  const opts = rng() < 0.5 ? [a.id, b.id] : [b.id, a.id];
  // 状況しだいで3つめ（▲）・4つめ（▼）
  const h = { allied, rel, isSeat, neighbors };
  for (const x of SPECIAL) {
    if (opts.length >= 4) break;
    try { if (x.when(g, me, e, h) && (x.chance == null || rng() < x.chance)) opts.push(x.id); } catch (err) { /* 当てはまらない */ }
  }
  return opts;
}
// カードの選択肢（前の版のセーブで選択肢が見つからないときは、山の最初の2つ）
export const newsOpts = (e) => {
  if (e.opts && e.opts.every((id) => OPTION_BY_ID[id])) return e.opts;
  const pool = poolOf(e.react);
  return pool ? pool.slice(0, 2).map((o) => o.id) : [];
};

// プレイヤーがニュースのカードで選んだ（side：0＝左、1＝右、2＝↑前）
export function reactNews(g, i, side) {
  const e = g.feed[i];
  if (!e || !e.react || e.chosen != null) return null;
  const id = newsOpts(e)[side];
  const opt = OPTION_BY_ID[id];
  if (!opt) return null;
  const changes = [];
  applyFx(g, opt.fx, { self: g.player, who: e.who, tgt: e.who }, evScale(g), changes);
  e.chosen = side;
  e.choice = id;
  e.rres = summarizeChanges(g, changes);
  // 補佐官が「街の声」を伝える
  moodFromReaction(g.majors[g.player], opt.pop);
  e.sec = secAfterReact(g, e.rres, opt.pop);
  g.lastSec = { text: e.sec, year: g.year };
  return e;
}

// 情勢（data/situations.js）をはじめる。期限は暦の年で持つ
function addSituations(g, ev, who, evName) {
  const defs = SITUATIONS[ev.id];
  if (!defs) return;
  const cal = g.cal ?? g.year - 1;
  g.situations = (g.situations || []).filter((s) => s.ev !== ev.id);
  for (const d of defs) {
    g.situations.push({ ev: ev.id, name: ev.name, kname: KID_EVENT[ev.id]?.[0] || ev.name, who, cats: d.cats, pols: d.pols, mod: d.mod, scope: d.scope, until: cal + d.years });
  }
}

// 動いた数値をまとめる（同じ数値が3カ国以上で同じ向きに動いたら「小国◯カ国」「各国」にまとめる）
const PCT_STATS = new Set(['gnp', 'pop', 'soldiers']);
function arrows(g, id, stat, d) {
  if (PCT_STATS.has(stat) && id !== 'world') {
    const now = C(g, id)?.stats?.[stat] ?? 1;
    const r = Math.abs(d) / Math.max(0.01, now - d);
    return r >= 0.08 ? 3 : r >= 0.04 ? 2 : r >= 0.005 ? 1 : 0;
  }
  const a = Math.abs(d);
  if (id === 'world' && stat === 'co2') return a >= 5 ? 3 : a >= 2 ? 2 : a >= 0.3 ? 1 : 0;
  return a >= 12 ? 3 : a >= 6 ? 2 : a >= 0.5 ? 1 : 0;
}
export function summarizeChanges(g, changes) {
  const sum = new Map();
  for (const c of changes) { const k = `${c.id}|${c.stat}`; sum.set(k, (sum.get(k) || 0) + c.d); }
  const items = [];
  for (const [k, d] of sum) {
    const [id, stat] = k.split('|');
    const a = arrows(g, id, stat, d);
    if (a) items.push({ id, stat, a: d > 0 ? a : -a });
  }
  const out = [], used = new Set();
  for (const kind of ['bg', 'majors']) {
    const isKind = (id) => id !== 'world' && (kind === 'majors' ? isSeat(g, id) : !isSeat(g, id));
    const groups = new Map();
    for (const it of items) if (isKind(it.id)) { const k = `${it.stat}|${Math.sign(it.a)}`; (groups.get(k) || groups.set(k, []).get(k)).push(it); }
    for (const [k, list] of groups) if (list.length >= 3) {
      const [stat] = k.split('|');
      out.push({ id: kind, n: list.length, stat, a: list.reduce((m, x) => (Math.abs(x.a) > Math.abs(m) ? x.a : m), list[0].a) });
      list.forEach((x) => used.add(x));
    }
  }
  for (const it of items) if (!used.has(it)) out.push(it);
  return out.slice(0, 10);
}

// ───── 核のボタン ─────
function nukeCrisis(g, H) {
  const pair = nukePair(g, 25);
  if (!pair) return;
  const [a, b] = pair;
  if (g.majors[a].player || g.majors[b].player) {
    const me = g.majors[a].player ? a : b, foe = me === a ? b : a;
    queuePending(g, { type: 'nuke', me, foe });
    return;
  }
  for (const id of [a, b]) {
    const c = g.majors[id];
    const pUse = (c.persona === 'ambition' ? 0.2 : c.persona === 'order' ? 0.1 : 0.04) + (c.stats.stability < 25 ? 0.08 : 0);
    if (H.rng() < pUse) { g.feed.push({ k: 'sys', cls: 'bad', text: J(g, `${c.name}が核のボタンを押した。`, `${c.name}が かくへいきの ぼたんを おした。`) }); endGame(g, 'nuke'); return; }
  }
  applyFx(g, ['world.tension-m'], {});
  addRel(g, a, b, 10);
  g.feed.push({ k: 'sys', text: J(g, `${g.majors[a].name}と${g.majors[b].name}は、ぎりぎりで踏みとどまった。`, `${g.majors[a].name}と ${g.majors[b].name}は、ぎりぎりで がまんした。`) });
}

// ───── 世界議会の投票 ─────
// 世界議会の議題の候補：それまでに起きたニュースの種類に関係するものほど上に（最近のものほど重い）。前に否決された議題は出にくい
export function agendaOptions(g) {
  const rng = rngOf(g);
  const fired = Object.entries(g.fired).sort((a, b) => b[1] - a[1]);
  const score = {}, why = {};
  for (const [k, a] of Object.entries(AGENDAS)) {
    let sc = AGENDA_BASE.includes(k) ? 0.5 : 0;
    const evs = [];
    for (const [eid, yr] of fired) {
      const e = EVENT_BY_ID[eid];
      if (!e || !a.cats.includes(e.cat)) continue;
      sc += 1 + Math.max(0, 10 - (g.year - yr)) / 5;
      if (evs.length < 2) evs.push(eid);
    }
    if (k === 'water' && (g.flags.waterLawWorld != null || Object.values(g.majors).some((c) => c.laws?.water))) sc += 3;
    if (k === 'climate' && g.world.co2 >= 65) sc += 2;
    if (k === 'nukes' && g.seats.some((id) => g.majors[id].stats.nuke >= 4)) sc += 2;
    if (k === 'polar' && g.flags.polarOil != null) sc += 2;
    sc -= 3 * (g.agendaTried || []).filter((x) => x === k).length;
    score[k] = sc + rng() * 1.5;
    why[k] = evs;
  }
  const options = Object.keys(AGENDAS).sort((a, b) => score[b] - score[a]).slice(0, 3);
  return { options, why: Object.fromEntries(options.map((k) => [k, why[k]])) };
}
function startVote(g, H) {
  const pl = g.majors[g.player];
  const { options, why } = agendaOptions(g);
  if (pl.panel) { queuePending(g, { type: 'vote', options, why }); return; }
  runVote(g, options[0]);
}
// playerYes：プレイヤーの票（反対すると否決。議題は来年また選び直し）
export function runVote(g, agenda, playerYes = true) {
  const rng = rngOf(g);
  const votes = [];
  for (const id of g.seats) {
    const c = g.majors[id];
    if (!c.panel) continue;
    if (c.player) { votes.push({ id, yes: !!playerYes, p: 100 }); continue; }
    votes.push({ id, ...voteYes(g, c, agenda, rng) });
  }
  const all = votes.every((v) => v.yes);
  const a = AGENDAS[agenda];
  g.feed.push({ k: 'vote', agenda, name: g.kid ? a.kid : a.name, votes });
  if (all) {
    // 可決：損をする国・得をする国の国力が動く（点数に響く）
    for (const id of g.seats) {
      const c = g.majors[id];
      if (!c.panel) continue;
      if (a.lose(c)) applyFx(g, AGENDA_LOSE_FX, { self: id });
      else if (a.gain(c)) applyFx(g, AGENDA_GAIN_FX, { self: id });
      c.power = power(c);
    }
    chron(g, J(g, `世界議会、最初の議題「${a.name}」を全会一致で可決`, `せかいの ぎかいで「${a.kid}」が ぜんいん さんせいで きまった`));
    g.clearAgenda = agenda;
    endGame(g, 'clear');
  } else {
    g.voteTries = (g.voteTries || 0) + 1;
    (g.agendaTried ||= []).push(agenda);
    say(g, playerYes ? 'vote.fail' : 'vote.reject');
  }
}

function queuePending(g, p) {
  if (!g.pending) g.pending = p;
  else (g.pendingQueue ||= []).push(p);
}

// プレイヤーの決定が必要なもの（核・投票・国号）
export function resolvePending(g, choice) {
  const p = g.pending;
  if (!p) return;
  g.pending = null;
  if (p.type === 'nuke') {
    if (choice === 'fire') { g.feed.push({ k: 'sys', cls: 'bad', text: J(g, `${g.majors[p.me].name}が核のボタンを押した。`, `${g.majors[p.me].name}が かくへいきの ぼたんを おした。`) }); endGame(g, 'nuke'); }
    else {
      say(g, 'nuke.hold');
      applyFx(g, ['world.tension-l', 'self.rep+m'], { self: p.me });
      addRel(g, p.me, p.foe, 15);
      const foe = g.majors[p.foe];
      const rng = rngOf(g);
      const pUse = (foe.persona === 'ambition' ? 0.15 : 0.04);
      if (rng() < pUse) { g.feed.push({ k: 'sys', cls: 'bad', text: J(g, `だが、${foe.name}が核のボタンを押した。`, `でも、${foe.name}が ぼたんを おして しまった。`) }); endGame(g, 'nuke'); }
    }
  } else if (p.type === 'vote') {
    if (choice && typeof choice === 'object') runVote(g, choice.agenda, choice.yes);
    else runVote(g, choice || p.options[0]);
  }
  else if (p.type === 'rename') { if (choice) doRename(g, p.id, choice); }
  if (g.pendingQueue?.length && !g.result) g.pending = g.pendingQueue.shift();
  g.phase = g.result ? 'over' : g.pending ? 'pending' : g.phase === 'pending' ? (g.resumePhase || 'turns') : g.phase;
}

// ───── 手番 ─────
export function offersFor(g, id) {
  const c = g.majors[id];
  const rng = rngOf(g);
  const ok = (pol) => {
    try { if (pol.avail && !pol.avail(g, c)) return false; } catch (err) { return false; }
    const t = targetsFor(g, c, pol);
    return t.length > 0 ? t : false;
  };
  const avail = [];
  for (const pol of POLICY_LIST) { const t = ok(pol); if (t) avail.push({ id: pol.id, tgts: t }); }
  const out = [];
  // 火種への対応を優先して2つまで、ほかの情勢の政策を合わせて最大3つ
  const sparkIds = new Set((g.sparks || []).flatMap((s) => Object.keys(SPARKS[s.type].fx)));
  const insS = shuffle(rng, avail.filter((o) => g.inserts.includes(o.id) && sparkIds.has(o.id)));
  const insO = shuffle(rng, avail.filter((o) => g.inserts.includes(o.id) && !sparkIds.has(o.id)));
  for (const o of insS.slice(0, 2)) out.push(o);
  for (const o of insO.slice(0, (sparkIds.size ? 3 : 2) - out.length)) out.push(o);
  // 国際機関の段階を進める政策は、条件を満たしていれば必ず出す
  for (const o of avail) if ((o.id === 'P72' || o.id === 'P73') && !out.includes(o)) out.push(o);
  const rest = avail.filter((o) => !out.includes(o));
  while (out.length < (g.kid ? 3 : 4) && rest.length) {
    const o = weighted(rng, rest, (x) => {
      const pol = POLICIES[x.id];
      let w = pol.w ?? 1;
      if ((c.bases || []).some((b) => BASE[b].bonus.includes(x.id))) w *= 1.6;
      return w;
    });
    out.push(o);
    rest.splice(rest.indexOf(o), 1);
  }
  return out;
}

// 次の手番へ。プレイヤーの番なら 'player'、年が終われば 'yearEnd'
export function step(g) {
  if (g.result) { g.phase = 'over'; return { type: 'over' }; }
  if (g.pending) { g.phase = 'pending'; return { type: 'pending' }; }
  while (g.turn < g.order.length) {
    const id = g.order[g.turn];
    const c = g.majors[id];
    if (!c.panel) { g.turn++; continue; }
    if (c.player) {
      if (!g.offers || g.offers.id !== id) {
        g.offers = { id, list: offersFor(g, id) };
        say(g, 'turn.player', { name: c.name });
      }
      g.phase = 'player';
      return { type: 'player' };
    }
    const offers = offersFor(g, id);
    const choice = choosePolicy(g, c, offers, rngOf(g));
    g.turn++;
    if (choice) {
      const rec = act(g, id, choice.id, choice.tgt);
      if (g.result) { g.phase = 'over'; return { type: 'over', rec }; }
      if (g.pending) { g.resumePhase = 'turns'; g.phase = 'pending'; return { type: 'pending', rec }; }
      return { type: 'ai', rec };
    }
  }
  endYear(g);
  return { type: 'yearEnd' };
}

export function playerAct(g, polId, tgt) {
  const id = g.offers.id;
  g.offers = null;
  g.turn++;
  const rec = act(g, id, polId, tgt);
  const pol = POLICIES[polId];
  if ((pol.tags || []).includes('nuke')) say(g, 'player.nuclear');
  else if (polId === 'P63') say(g, 'player.war');
  else if ((pol.tags || []).includes('selfish')) say(g, 'player.selfish');
  else if ((pol.tags || []).includes('coop')) say(g, 'player.coop');
  secSay(g, secPolicy(g, rec.moodD));
  if (g.pending && !g.result) { g.resumePhase = 'turns'; g.phase = 'pending'; }
  else g.phase = g.result ? 'over' : 'turns';
  return rec;
}

// 政策を実行してダイスで判定する
export function act(g, id, polId, tgt) {
  const c = g.majors[id];
  const pol = POLICIES[polId];
  const pr = probability(g, c, pol, tgt);
  const rng = rngOf(g);
  const roll = 1 + Math.floor(rng() * 100);
  const tier = judge(roll, pr.p);
  const ctx = { self: id, tgt };
  const changes = [];
  const succ = tier === 'crit' || tier === 'ok' || tier === 'partial';
  const k = fxScale(g);
  if (tier === 'crit') applyFx(g, pol.ok, ctx, 2 * k, changes);
  else if (tier === 'ok') applyFx(g, pol.ok, ctx, k, changes);
  else if (tier === 'partial') { applyFx(g, pol.ok, ctx, 0.5 * k, changes); applyFx(g, pol.ng, ctx, 0.5 * k, changes); }
  else if (tier === 'ng') applyFx(g, pol.ng, ctx, k, changes);
  else applyFx(g, pol.ng, ctx, 2 * k, changes);
  if (succ && pol.after?.ok) applyFx(g, pol.after.ok, ctx, 1, changes);
  if (pol.run) pol.run(g, ctx, tier, helpers(g));
  if (succ && polId === 'P43') g.flags.harmony = g.year;
  if (succ && polId === 'P31') g.counters.foodAid = (g.counters.foodAid || 0) + 1;
  if (succ && polId === 'P53') g.counters.lowAid = (g.counters.lowAid || 0) + 1;
  const spk = sparkEffect(g, id, pol, tgt, tier);
  if (succ && polId === 'P54') g.counters.sanction = (g.counters.sanction || 0) + 1;
  if (c.stats.nuke >= 4 && changes.some((x) => x.stat === 'nuke')) { g.flags.newNuke = g.year; g.newNukeId = id; chron(g, J(g, `${c.name}、核兵器を保有`, `${c.name}が かくへいきを もった`)); }
  c.power = power(c);
  const moodD = moodFromPolicy(c, pol.tags);
  const rec = { k: 'act', id, pol: polId, tgt, p: pr.p, crit: pr.crit, roll, tier, changes, spark: spk, year: g.year, moodD };
  c.lastAct = rec;
  g.feed.push(rec);
  g.yearActs.push(rec);
  if (tier === 'crit' || tier === 'fumble') chron(g, J(g, `${c.name}「${pol.name}」${TIER[tier].name}`, `${c.name}「${KID_POLICY[pol.id]}」${KID_TIERS[tier]}`));
  if (c.player) {
    if (tier === 'crit') say(g, pr.p <= 10 ? 'dice.lowcrit' : 'dice.crit', { p: pr.p });
    else say(g, `dice.${tier}`, { p: pr.p });
  } else {
    if (tier === 'crit' && pr.p <= 10) say(g, 'dice.lowcrit', { p: pr.p });
    const lines = (g.kid ? KID_AI_LINES : AI_LINES)[succ ? 'good' : 'bad'][c.persona];
    if (lines && (tier === 'crit' || tier === 'fumble' || rng() < 0.35)) g.feed.push({ k: 'ai', id, pri: 3, text: pick(rng, lines) });
  }
  return rec;
}

// ───── 年末 ─────
export function endYear(g) {
  const H = helpers(g);
  // 1ねんせいモードは 1かいで 2〜3年ぶん世界が動く（20かいで約50年）
  const n = g.kid ? (g.year % 2 ? 2 : 3) : 1;
  for (let k = 1; k < n; k++) {
    for (const id of g.seats) if (!g.majors[id].annexedBy) tickMajor(g, g.majors[id], H);
    for (const b of Object.values(g.backs)) if (!b.owner) tickBack(g, b, H);
    tickWorld(g);
  }
  for (const id of g.seats) {
    const c = g.majors[id];
    if (c.annexedBy) continue;
    tickMajor(g, c, H);
    if (c.panel) {
      if (c.stats.stability < 12) collapse(g, id, '政権崩壊');
      else if (c.stats.stability < 22 && H.rng() < (22 - c.stats.stability) * 0.01) collapse(g, id, '軍事クーデター');
    } else if (g.year - c.collapsedYear >= (g.kid ? 2 : 3)) {
      c.stats.stability = clamp(c.stats.stability + 2.5 + (c.support || 0) / 10, 0, 100);
      const chance = clamp(15 + (c.stats.stability - 15) * 1.5 + (c.support || 0), 5, 80);
      if (H.rng() * 100 < chance) recover(g, id);
      c.support = Math.max(0, (c.support || 0) - 10);
    } else c.stats.stability = clamp(c.stats.stability + 2.5 + (c.support || 0) / 10, 0, 100);
  }
  for (const b of Object.values(g.backs)) if (!b.owner) tickBack(g, b, H);
  backFailures(g);
  // 感染症は3年で終わる（共同開発に成功すれば早く終わる）
  if (g.flags.pandemic != null && (g.year - g.flags.pandemic >= 3 || g.flags.vaccineCoop != null)) {
    if (g.year > g.flags.pandemic) H.deaths(0.5);
    if (g.year - g.flags.pandemic >= 3 || g.flags.vaccineCoop != null) { delete g.flags.pandemic; for (const c of Object.values(g.majors)) { delete c.flags.sealed; delete c.flags.cured; } }
  }
  tickSparks(g, H, (tag, vars) => say(g, tag, vars));
  fixChronYears(g);
  const prevEnv = g.world.env;
  tickWorld(g);
  g.hist.push({ year: yearLabel(g), env: g.world.env, co2: Math.round(g.world.co2), conflicts: g.world.conflicts, tension: Math.round(g.world.tension), power: g.majors[g.player].power, stage: g.world.stage });
  if (g.world.env <= 25 && prevEnv > 25) say(g, 'world.env');
  if (g.world.tension >= 75 && !g.flags.tensionWarned) { say(g, 'world.tension'); g.flags.tensionWarned = g.year; }
  if (g.world.tension < 60) delete g.flags.tensionWarned;
  g.cal = (g.cal ?? g.year - 1) + n;
  for (const id of g.seats) if (g.majors[id].panel) moodYearEnd(g.majors[id]);
  secSay(g, secYearEnd(g));
  checkEnd(g);
  if (!g.result) g.phase = 'yearEnd';
}

function recover(g, id) {
  const c = g.majors[id];
  c.panel = true; c.collapsedYear = null; c.support = 0;
  c.stats.stability = Math.max(c.stats.stability, 38);
  c.stats.guerrilla = Math.max(0, c.stats.guerrilla - 15);
  chron(g, J(g, `${c.name}に新元首、国政に復帰`, `${c.name}に あたらしい だいひょうが きまった`));
  say(g, 'recovered', { name: c.name });
  if (id === g.player) { secSay(g, secBack(g)); c.secSkip = g.year; }
  if (rngOf(g)() < 0.5) rename(g, id, 'recover');
}

function checkEnd(g) {
  if (g.result) return;
  if (g.world.env <= ENV_LIMIT) return endGame(g, 'env');
  for (const id of g.seats) {
    const owned = Object.values(g.backs).filter((b) => b.owner === id).length;
    const majorsOwned = g.seats.filter((x) => g.majors[x].annexedBy === id).length;
    if (owned >= 10 || (majorsOwned >= 2 && owned >= 5)) { g.conqueror = id; return endGame(g, 'conquest'); }
  }
  if (g.year >= maxYears(g)) return endGame(g, 'timeup');
}

export const ENDINGS = {
  clear: { name: '世界統一', good: true }, nuke: { name: '核戦争' }, env: { name: '地球環境の破綻' },
  conquest: { name: '世界征服' }, annexed: { name: '自国の併合' }, timeup: { name: 'タイムアップ' },
};
export function endGame(g, type) {
  if (g.result) return;
  const pl = g.majors[g.player];
  const score = Math.max(0, Math.round(
    (type === 'clear' ? 5000 + (maxYears(g) - g.year) * (MAX_YEARS / maxYears(g)) * 100 : 0) + g.world.stage * 400 + g.world.env * 10
    + (100 - Math.min(100, g.world.conflicts)) * 5 + pl.power * 10 + g.coop.length * 200 - g.counters.deaths * 2,
  ));
  g.result = { type, year: g.year, calYear: yearLabel(g), score, agenda: g.clearAgenda || null, conqueror: g.conqueror || null };
  chron(g, J(g, `ゲーム終了：${ENDINGS[type].name}`, `げーむ おわり：${KID_ENDINGS[type]}`));
  const tag = type === 'clear' ? 'clear' : `over.${type}`;
  say(g, tag, { name: pl.name });
  g.phase = 'over';
}

export function timeupGrade(g) {
  const w = g.world;
  if (w.stage >= 2 && w.env >= 40) return J(g, '統一まであと一歩の世界', 'ひとつに なるまで あと すこしの せかい');
  if (w.env >= 45 && w.conflicts <= 50) return J(g, '持ちこたえた世界', 'なんとか がんばった せかい');
  if (w.env < 30) return J(g, '疲れ切った地球', 'つかれきった ちきゅう');
  return J(g, '混迷の世界', 'ごちゃごちゃの せかい');
}

export { REGIONS };
