// ゲームの進行：世界の生成 → 基本政策 → 毎年（イベント → 各国の手番 → 年末処理）→ 終了
import { makeRng, hashSeed, shuffle, pick, weighted, clamp } from '../util.js';
import { MAJORS, BACKS, REGIONS } from '../data/countries.js';
import { POLICIES, POLICY_LIST, BASE, targetsFor } from '../data/policies.js';
import { EVENTS, EVENT_BY_ID, nukePair } from '../data/events.js';
import { GM, AI_LINES } from '../data/gm.js';
import { registerBases, neighbors, polarNeighbors, isSeat, C, power, probability, judge, TIER, rel, addRel, active } from './core.js';
import { applyFx } from './effects.js';
import { PERSONAS, choosePolicy, voteYes, AGENDAS } from './ai.js';
import { tickMajor, tickBack, tickWorld, envIndex, bankruptCount } from './tick.js';
import { SPARKS, startSpark, sparkEffect, tickSparks } from './sparks.js';

registerBases(BASE);
export const START_YEAR = 2005;
export const MAX_YEARS = 50;
export const STAGES = ['国連', '国連の解体', '世界政府準備委員会', '世界総選挙', '世界議会'];
export const ENV_LIMIT = 10;
const clone = (o) => JSON.parse(JSON.stringify(o));
export const yearLabel = (g) => START_YEAR + g.year - 1;

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
  return ids.some((a) => ids.some((b) => a < b && (neighbors(a).includes(b) || polarNeighbors(a).includes(b))));
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

export function newGame(seed, { rerolled = false, diceSeed } = {}) {
  const d = drawWorld(seed);
  const majors = {}, backs = {};
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
  const g = {
    v: 1, seed, rerolled, year: 0, phase: 'setup', seats: d.seats, player: d.player, majors, backs,
    world: { biodiv: 70, conflicts: 70, treaty: 40, wrate: 5, tension: 35, co2: 40, ice: 80, rain: 60, oilRes: 70, forestRes: 70, waterRes: 70, foodPrice: 50, refugees: 30, trust: 50, stage: 0, temp: 0 },
    bgStatic: Object.fromEntries(Object.values(backs).filter((b) => b.big).map((b) => [b.id, b.co2])),
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
  const def = GM[tag];
  if (!def) return;
  const rng = rngOf(g);
  g.lastLine = g.lastLine || {};
  let i = Math.floor(rng() * def.lines.length);
  if (def.lines.length > 1 && g.lastLine[tag] === i) i = (i + 1) % def.lines.length;
  g.lastLine[tag] = i;
  g.feed.push({ k: 'gm', pri: def.pri, text: fill(def.lines[i], { year: yearLabel(g), ...vars }), ...extra });
}
const gmText = (g, text, pri = 1) => g.feed.push({ k: 'gm', pri, text });
const chron = (g, text) => g.chron.push({ year: yearLabel(g), text });

// ───── 効果のための道具（イベント・政策から呼ぶ） ─────
function helpers(g) {
  const rng = rngOf(g);
  const H = {
    rng, pick: (a) => pick(rng, a),
    fx: (list, ctx, f = 1) => applyFx(g, list, ctx, f),
    addRel: (a, b, d) => addRel(g, a, b, d),
    say: (text) => gmText(g, text, 2),
    chron: (text) => chron(g, text),
    deaths: (m) => { g.counters.deaths += m; },
    stage: (n) => setStage(g, n),
    rename: (id, why) => rename(g, id, why),
    collapse: (id, why) => collapse(g, id, why),
    war: (a, b, tier) => war(g, a, b, tier, H),
    spark: (type, where) => startSpark(g, H, type, where),
  };
  return H;
}

function setStage(g, n) {
  if (n <= g.world.stage) return;
  g.world.stage = n;
  chron(g, `国際機関の段階が「${STAGES[n]}」に進む`);
  say(g, 'stage.up', { stage: STAGES[n] });
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
  chron(g, `${old}、国号を「${name}」に改める`);
  say(g, 'rename', { old, name });
}

function collapse(g, id, why) {
  const c = g.majors[id];
  if (!c || !c.panel) return;
  c.panel = false; c.collapsedYear = g.year; c.support = 0;
  g.feed.push({ k: 'sys', cls: 'bad', text: `${c.name}で${why || '政権崩壊'}。パネルがオフになった。` });
  chron(g, `${c.name}、${why || '政権崩壊'}`);
  say(g, c.player ? 'player.collapsed' : 'ai.collapsed', { name: c.name });
  g.allies = g.allies.filter((k) => !k.split('-').includes(id));
}

function annex(g, owner, id) {
  const o = g.majors[owner];
  if (isSeat(g, id)) {
    const t = g.majors[id];
    t.panel = false; t.annexedBy = owner;
    g.allies = g.allies.filter((k) => !k.split('-').includes(id));
    o.stats.gnp += t.stats.gnp * 0.5; o.stats.pop += t.stats.pop; o.stats.ethnic = clamp(o.stats.ethnic + 15, 0, 100);
    chron(g, `${t.name}、${o.name}に併合される`);
    say(g, 'annex', { who: t.name, name: o.name });
    if (t.player) endGame(g, 'annexed');
  } else {
    const b = g.backs[id];
    b.owner = owner;
    o.stats.gnp *= 1 + b.stats.econ / 1000; o.stats.ethnic = clamp(o.stats.ethnic + 6, 0, 100);
    chron(g, `${b.name}、${o.name}に併合される`);
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
    g.feed.push({ k: 'sys', text: `${c.name}の基本政策：${c.bases.map((b) => BASE[b].name).join('・')}` });
  }
  g.chron.push({ year: START_YEAR, text: 'ゲーム開始。各国の元首が基本政策を定める' });
  beginYear(g);
}

// ───── 1年の流れ ─────
export function beginYear(g) {
  g.year += 1;
  g.feed = [];
  g.inserts = [];
  g.yearActs = [];
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
      say(g, `spark.hint.${lv}`, { name: C(g, s.where).name, what: SPARKS[s.type].name });
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
  const n = H.rng() < 0.45 ? 2 : 1;
  for (let i = 0; i < n && pool.length; i++) {
    const e = weighted(H.rng, pool.filter((x) => !out.includes(x)), (x) => x.w * (1 + (g.boost[x.id] || 0)));
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
  const whoName = who ? C(g, who)?.name : '';
  g.feed.push({ k: 'event', id: ev.id, name: ev.name, who, text: fill(ev.text || '', { who: whoName, year: yearLabel(g) }) });
  chron(g, `${ev.name}${whoName ? `（${whoName}）` : ''}`);
  if (ev.fx) applyFx(g, ev.fx, { who, self: null });
  if (ev.run) { try { ev.run(g, H, who); } catch (err) { console.warn(ev.id, err); } }
  for (const n of ev.next || []) g.boost[n] = (g.boost[n] || 0) + 3;
  for (const p of ev.ins || []) if (!g.inserts.includes(p)) g.inserts.push(p);
  if (ev.coop && !g.coop.includes(ev.id)) {
    g.coop.push(ev.id);
    g.feed.push({ k: 'sys', cls: 'good', text: `協調の成功例（${g.coop.length}/3）` });
  }
  if (ev.special === 'nuke') nukeCrisis(g, H);
  if (ev.special === 'vote') startVote(g, H);
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
    if (H.rng() < pUse) { g.feed.push({ k: 'sys', cls: 'bad', text: `${c.name}が核のボタンを押した。` }); endGame(g, 'nuke'); return; }
  }
  applyFx(g, ['world.tension-m'], {});
  addRel(g, a, b, 10);
  g.feed.push({ k: 'sys', text: `${g.majors[a].name}と${g.majors[b].name}は、ぎりぎりで踏みとどまった。` });
}

// ───── 世界議会の投票 ─────
function agendaOptions(g) {
  const list = [];
  if (g.flags.waterLawWorld != null || Object.values(g.majors).some((c) => c.laws?.water)) list.push('water');
  list.push('climate', 'nukes', 'trade', 'refugees');
  return list.slice(0, 3);
}
function startVote(g, H) {
  const pl = g.majors[g.player];
  const options = agendaOptions(g);
  if (pl.panel) { queuePending(g, { type: 'vote', options }); return; }
  runVote(g, options[0]);
}
export function runVote(g, agenda) {
  const rng = rngOf(g);
  const votes = [];
  for (const id of g.seats) {
    const c = g.majors[id];
    if (!c.panel) continue;
    if (c.player) { votes.push({ id, yes: true, p: 100 }); continue; }
    votes.push({ id, ...voteYes(g, c, agenda, rng) });
  }
  const all = votes.every((v) => v.yes);
  g.feed.push({ k: 'vote', agenda, name: AGENDAS[agenda].name, votes });
  if (all) {
    chron(g, `世界議会、最初の議題「${AGENDAS[agenda].name}」を全会一致で可決`);
    g.clearAgenda = agenda;
    endGame(g, 'clear');
  } else {
    g.voteTries = (g.voteTries || 0) + 1;
    say(g, 'vote.fail');
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
    if (choice === 'fire') { g.feed.push({ k: 'sys', cls: 'bad', text: `${g.majors[p.me].name}が核のボタンを押した。` }); endGame(g, 'nuke'); }
    else {
      say(g, 'nuke.hold');
      applyFx(g, ['world.tension-l', 'self.rep+m'], { self: p.me });
      addRel(g, p.me, p.foe, 15);
      const foe = g.majors[p.foe];
      const rng = rngOf(g);
      const pUse = (foe.persona === 'ambition' ? 0.15 : 0.04);
      if (rng() < pUse) { g.feed.push({ k: 'sys', cls: 'bad', text: `だが、${foe.name}が核のボタンを押した。` }); endGame(g, 'nuke'); }
    }
  } else if (p.type === 'vote') runVote(g, choice);
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
  while (out.length < 4 && rest.length) {
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
  if (tier === 'crit') applyFx(g, pol.ok, ctx, 2, changes);
  else if (tier === 'ok') applyFx(g, pol.ok, ctx, 1, changes);
  else if (tier === 'partial') { applyFx(g, pol.ok, ctx, 0.5, changes); applyFx(g, pol.ng, ctx, 0.5, changes); }
  else if (tier === 'ng') applyFx(g, pol.ng, ctx, 1, changes);
  else applyFx(g, pol.ng, ctx, 2, changes);
  if (succ && pol.after?.ok) applyFx(g, pol.after.ok, ctx, 1, changes);
  if (pol.run) pol.run(g, ctx, tier, helpers(g));
  if (succ && polId === 'P43') g.flags.harmony = g.year;
  if (succ && polId === 'P31') g.counters.foodAid = (g.counters.foodAid || 0) + 1;
  if (succ && polId === 'P53') g.counters.lowAid = (g.counters.lowAid || 0) + 1;
  const spk = sparkEffect(g, id, pol, tgt, tier);
  if (succ && polId === 'P54') g.counters.sanction = (g.counters.sanction || 0) + 1;
  if (c.stats.nuke >= 4 && changes.some((x) => x.stat === 'nuke')) { g.flags.newNuke = g.year; g.newNukeId = id; chron(g, `${c.name}、核兵器を保有`); }
  c.power = power(c);
  const rec = { k: 'act', id, pol: polId, tgt, p: pr.p, crit: pr.crit, roll, tier, changes, spark: spk, year: g.year };
  c.lastAct = rec;
  g.feed.push(rec);
  g.yearActs.push(rec);
  if (tier === 'crit' || tier === 'fumble') chron(g, `${c.name}「${pol.name}」${TIER[tier].name}`);
  if (c.player) {
    if (tier === 'crit') say(g, pr.p <= 10 ? 'dice.lowcrit' : 'dice.crit', { p: pr.p });
    else say(g, `dice.${tier}`, { p: pr.p });
  } else {
    if (tier === 'crit' && pr.p <= 10) say(g, 'dice.lowcrit', { p: pr.p });
    const lines = AI_LINES[succ ? 'good' : 'bad'][c.persona];
    if (lines && (tier === 'crit' || tier === 'fumble' || rng() < 0.35)) g.feed.push({ k: 'ai', id, pri: 3, text: pick(rng, lines) });
  }
  return rec;
}

// ───── 年末 ─────
export function endYear(g) {
  const H = helpers(g);
  for (const id of g.seats) {
    const c = g.majors[id];
    if (c.annexedBy) continue;
    tickMajor(g, c, H);
    if (c.panel) {
      if (c.stats.stability < 12) collapse(g, id, '政権崩壊');
      else if (c.stats.stability < 22 && H.rng() < (22 - c.stats.stability) * 0.01) collapse(g, id, '軍事クーデター');
    } else if (g.year - c.collapsedYear >= 3) {
      c.stats.stability = clamp(c.stats.stability + 2.5 + (c.support || 0) / 10, 0, 100);
      const chance = clamp(15 + (c.stats.stability - 15) * 1.5 + (c.support || 0), 5, 80);
      if (H.rng() * 100 < chance) recover(g, id);
      c.support = Math.max(0, (c.support || 0) - 10);
    } else c.stats.stability = clamp(c.stats.stability + 2.5 + (c.support || 0) / 10, 0, 100);
  }
  for (const b of Object.values(g.backs)) if (!b.owner) tickBack(g, b, H);
  // 感染症は3年で終わる（共同開発に成功すれば早く終わる）
  if (g.flags.pandemic != null && (g.year - g.flags.pandemic >= 3 || g.flags.vaccineCoop != null)) {
    if (g.year > g.flags.pandemic) H.deaths(0.5);
    if (g.year - g.flags.pandemic >= 3 || g.flags.vaccineCoop != null) { delete g.flags.pandemic; for (const c of Object.values(g.majors)) { delete c.flags.sealed; delete c.flags.cured; } }
  }
  tickSparks(g, H, (tag, vars) => say(g, tag, vars));
  const prevEnv = g.world.env;
  tickWorld(g);
  g.hist.push({ year: yearLabel(g), env: g.world.env, co2: Math.round(g.world.co2), conflicts: g.world.conflicts, tension: Math.round(g.world.tension), power: g.majors[g.player].power, stage: g.world.stage });
  if (g.world.env <= 25 && prevEnv > 25) say(g, 'world.env');
  if (g.world.tension >= 75 && !g.flags.tensionWarned) { say(g, 'world.tension'); g.flags.tensionWarned = g.year; }
  if (g.world.tension < 60) delete g.flags.tensionWarned;
  checkEnd(g);
  if (!g.result) g.phase = 'yearEnd';
}

function recover(g, id) {
  const c = g.majors[id];
  c.panel = true; c.collapsedYear = null; c.support = 0;
  c.stats.stability = Math.max(c.stats.stability, 38);
  c.stats.guerrilla = Math.max(0, c.stats.guerrilla - 15);
  chron(g, `${c.name}に新元首、国政に復帰`);
  say(g, 'recovered', { name: c.name });
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
  if (g.year >= MAX_YEARS) return endGame(g, 'timeup');
}

export const ENDINGS = {
  clear: { name: '世界統一', good: true }, nuke: { name: '核戦争' }, env: { name: '地球環境の破綻' },
  conquest: { name: '世界征服' }, annexed: { name: '自国の併合' }, timeup: { name: 'タイムアップ' },
};
export function endGame(g, type) {
  if (g.result) return;
  const pl = g.majors[g.player];
  const score = Math.max(0, Math.round(
    (type === 'clear' ? 5000 + (MAX_YEARS - g.year) * 100 : 0) + g.world.stage * 400 + g.world.env * 10
    + (100 - Math.min(100, g.world.conflicts)) * 5 + pl.power * 10 + g.coop.length * 200 - g.counters.deaths * 2,
  ));
  g.result = { type, year: g.year, calYear: yearLabel(g), score, agenda: g.clearAgenda || null, conqueror: g.conqueror || null };
  chron(g, `ゲーム終了：${ENDINGS[type].name}`);
  const tag = type === 'clear' ? 'clear' : `over.${type}`;
  say(g, tag, { name: pl.name });
  g.phase = 'over';
}

export function timeupGrade(g) {
  const w = g.world;
  if (w.stage >= 2 && w.env >= 40) return '統一まであと一歩の世界';
  if (w.env >= 45 && w.conflicts <= 50) return '持ちこたえた世界';
  if (w.env < 30) return '疲れ切った地球';
  return '混迷の世界';
}

export { REGIONS };
