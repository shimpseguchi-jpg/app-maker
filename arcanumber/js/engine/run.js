// ぼうけん ぜんたい：マップ・ほうしゅう・おみせ
import { CARDS, EL_LIST, rewardableCards } from '../data/cards.js';
import { ARCANA, arcanaPool, arcanaPrice } from '../data/arcana.js';
import { SCROLLS, SCROLL_PRICE } from '../data/scrolls.js';
import { HANDS } from '../data/hands.js';
import { ENCOUNTERS } from '../data/enemies.js';
import { HEROES } from '../data/heroes.js';
import { makeRng, uid } from '../util.js';
import { PACK_TYPES } from '../data/packs.js';

export const ACTS = {
  1: { name: 'くらやみの もり', theme: 'forest', icon: '🌲' },
  2: { name: 'しずんだ みやこ', theme: 'sea', icon: '🌊' },
  3: { name: 'ほしふる とう', theme: 'tower', icon: '🌌' },
};
export const NODE_INFO = {
  battle: { icon: '⚔️', name: 'たたかい', desc: 'モンスターと たたかう。かつと カードが もらえる' },
  elite: { icon: '💀', name: 'つよい てき', desc: 'のろいを もつ つよい てき。かつと アルカナが もらえる' },
  rest: { icon: '🔥', name: 'たきび', desc: 'HPを かいふく するか、カードを きたえる' },
  shop: { icon: '🪙', name: 'おみせ', desc: 'アルカナ・カード・まきものを かう' },
  treasure: { icon: '🗝️', name: 'たからばこ', desc: 'アルカナが はいっている' },
  event: { icon: '❔', name: 'なぞ', desc: 'なにかが おこる。さんすうの なぞときも' },
  boss: { icon: '👑', name: 'ボス', desc: 'この しょうの ボス。のろいに ちゅうい！' },
};
export const MAX_ARCANA = 5;
export const MAX_SCROLLS = 2;

export function runRng(run) { const rng = makeRng(run.rngState); return { rng, save: () => { run.rngState = rng.state(); } }; }

export function makeRune(el, v, extra = {}) { return { uid: uid(), id: 'rune', el, v, up: false, ...extra }; }
export function makeCard(id, up = false) { return { uid: uid(), id, up }; }

export function newRun({ hero, grade, diff, seed }) {
  const H = HEROES[hero];
  const run = {
    v: 1, seed, rngState: seed, hero, grade, diff,
    hp: H.hp, maxHp: H.hp, coins: 4,
    deck: H.deck.map((d) => (Array.isArray(d) ? makeRune(d[0], d[1]) : makeCard(d))),
    arcana: [{ uid: uid(), id: H.arcana, n: 0 }], scrolls: [], handLv: {}, side: [],
    act: 1, map: null, pos: null, pending: null, removeCost: 5, rerollBase: 2,
    stats: { battles: 0, casts: 0, best: 0, challengeTry: 0, challengeOk: 0, quizOk: 0, quizTry: 0, hands: {} },
  };
  if (diff === 'easy') { run.hp += 15; run.maxHp += 15; run.coins += 4; }
  const { rng, save } = runRng(run);
  run.map = genMap(rng, 1);
  save();
  return run;
}

export function genMap(rng) {
  const COLS = 7, LANES = 4;
  const nodes = {};
  const key = (c, l) => `${c}-${l}`;
  const edges = new Set();
  const crosses = (c, a, b) => { for (const e of edges) { const [c1, l1, , l2] = e.split(',').map(Number); if (c1 === c && (l1 - a) * (l2 - b) < 0) return true; } return false; };
  const starts = rng.shuffle([0, 1, 2, 3]).slice(0, 3); starts.push(rng.int(0, 3));
  for (const s of starts) {
    let lane = s;
    nodes[key(0, lane)] = nodes[key(0, lane)] || { id: key(0, lane), col: 0, lane, next: [] };
    for (let c = 0; c < COLS - 1; c++) {
      const opts = rng.shuffle([lane - 1, lane, lane + 1].filter((l) => l >= 0 && l < LANES));
      let nl = opts.find((l) => !crosses(c, lane, l)); if (nl === undefined) nl = lane;
      edges.add(`${c},${lane},${c + 1},${nl}`);
      nodes[key(c + 1, nl)] = nodes[key(c + 1, nl)] || { id: key(c + 1, nl), col: c + 1, lane: nl, next: [] };
      const from = nodes[key(c, lane)]; if (!from.next.includes(key(c + 1, nl))) from.next.push(key(c + 1, nl));
      lane = nl;
    }
  }
  for (const n of Object.values(nodes)) if (n.col === COLS - 1) n.next.push('boss');
  nodes.boss = { id: 'boss', col: COLS, lane: 1.5, next: [], type: 'boss' };
  const list = Object.values(nodes).filter((n) => n.id !== 'boss');
  for (const n of list) {
    if (n.col === 0) n.type = 'battle';
    else if (n.col === 3) n.type = 'treasure';
    else if (n.col === COLS - 1) n.type = 'rest';
    else if (n.col === 1) n.type = rng.weighted([['battle', 55], ['event', 45]]);
    else n.type = rng.weighted([['battle', 40], ['event', 22], ['elite', 16], ['shop', 14], ['rest', n.col === 4 ? 10 : 0]]);
  }
  const mid = list.filter((n) => n.col >= 2 && n.col <= 5 && n.col !== 3);
  if (!list.some((n) => n.type === 'shop')) rng.pick(mid).type = 'shop';
  if (!list.some((n) => n.type === 'elite')) rng.pick(mid.filter((n) => n.type !== 'shop')).type = 'elite';
  for (const n of list) for (const nx of n.next) { const m = nodes[nx]; if (m && m.type === n.type && ['shop', 'rest', 'elite'].includes(n.type) && m.col !== COLS - 1) m.type = 'battle'; }
  return { nodes, cols: COLS, lanes: LANES, visited: [], fought: [] };
}
export function availableNodes(run) {
  if (!run.pos) return Object.values(run.map.nodes).filter((n) => n.col === 0).map((n) => n.id);
  return run.map.nodes[run.pos]?.next || [];
}
export function pickEncounter(run, type, rng) {
  const E = ENCOUNTERS[run.act];
  const pool = type === 'elite' ? E.elite : type === 'boss' ? E.boss
    : run.map.visited.filter((id) => run.map.nodes[id].type === 'battle').length <= 1 ? E.easy : E.normal;
  let cands = pool.filter((p) => !run.map.fought.includes(p.join('+')));
  if (!cands.length) cands = pool;
  const enc = rng.pick(cands);
  run.map.fought.push(enc.join('+'));
  return enc;
}

// ── カードの ほうしゅう ──
function heroEls(run) { return HEROES[run.hero].els; }
export function randomRune(run, rng, { enhChance = 0.15 } = {}) {
  const el = rng() < 0.7 ? rng.pick(heroEls(run)) : rng.pick(EL_LIST);
  const r = makeRune(el, rng.int(1, 10));
  if (rng() < enhChance) r.enh = rng.weighted([['foil', 3], ['flame', 3], ['gold', 2], ['wild', 2], ['glass', 1]]);
  return r;
}
export function rollCards(run, rng, { n = 3, elite = false } = {}) {
  const els = heroEls(run);
  const pool = rewardableCards();
  const out = [];
  let guard = 0;
  while (out.length < n && guard++ < 300) {
    if (rng() < 0.3 && !out.some((x) => x.id === 'rune')) { out.push(randomRune(run, rng, { enhChance: elite ? 0.5 : 0.2 })); continue; }
    const rar = elite ? rng.weighted([['c', 40], ['u', 42], ['r', 18]]) : rng.weighted([['c', 58], ['u', 34], ['r', 8]]);
    const wantMine = rng() < 0.7;
    const cand = pool.filter((c) => (c.rar === rar || (c.rar === 's' && rar === 'c')) && (!wantMine || els.includes(c.el) || c.el === 'none') && !out.some((x) => x.id === c.id));
    if (!cand.length) continue;
    out.push(makeCard(rng.pick(cand).id));
  }
  return out;
}

// ── アルカナ ──
export function rollArcana(run, rng, rar) {
  const r = rar || rng.weighted([['c', 55], ['u', 35], ['r', 10]]);
  let pool = arcanaPool(r, run.arcana);
  if (!pool.length) pool = ['c', 'u', 'r'].flatMap((x) => arcanaPool(x, run.arcana));
  if (!pool.length) return null;
  // ヒーローの ぞくせいに あう しるしを でやすく
  const els = heroEls(run);
  const weighted = pool.map((a) => [a.id, a.tag ? (els.includes(a.tag) ? 3 : 0.5) : 1]);
  return rng.weighted(weighted);
}
export function addArcana(run, id) {
  if (run.arcana.length >= MAX_ARCANA) return false;
  run.arcana.push({ uid: uid(), id, n: 0 });
  return true;
}
export function sellValue(a) { return Math.max(1, Math.floor(arcanaPrice(a.id) / 2)); }

// ── まきもの ──
export function rollScroll(run, rng) {
  const ids = Object.keys(SCROLLS);
  const id = rng.weighted(ids.map((k) => [k, k === 'star' ? 6 : SCROLLS[k].rar === 'c' ? 2 : 1]));
  const s = { uid: uid(), id };
  if (id === 'star') s.hand = rng.pick(Object.keys(HANDS).filter((h) => h !== 'none'));
  return s;
}
export function addScroll(run, s) { if (run.scrolls.length >= MAX_SCROLLS) return false; run.scrolls.push(s); return true; }

// ── コイン ──
export function battleCoins(run, kind) {
  const base = kind === 'boss' ? 10 : kind === 'elite' ? 6 : 4;
  const interest = Math.min(5, Math.floor(run.coins / 5));
  let extra = 0;
  for (const a of run.arcana) { const p = ARCANA[a.id].passive; if (p && p.winCoins) extra += p.winCoins; }
  return { base, interest, extra, total: base + interest + extra };
}

export function makeShop(run, rng) {
  const cards = rollCards(run, rng, { n: 3 }).map((c) => ({ card: c, price: c.id === 'rune' ? (c.enh ? 5 : 3) : { s: 3, c: 3, u: 5, r: 7 }[CARDS[c.id].rar], sold: false }));
  const arc = [];
  for (let i = 0; i < 2; i++) {
    const id = rollArcana({ ...run, arcana: [...run.arcana, ...arc.map((x) => ({ id: x.id }))] }, rng);
    if (id) arc.push({ id, price: arcanaPrice(id), sold: false });
  }
  const scrolls = [rollScroll(run, rng), rollScroll(run, rng)].map((s) => ({ scroll: s, price: SCROLL_PRICE[SCROLLS[s.id].rar] || 3, sold: false }));
  const els = heroEls(run);
  const packs = [rng.pick(els), rng.pick(PACK_TYPES)].map((t) => ({ type: t, price: 6, sold: false }));
  if (packs[0].type === packs[1].type) packs[1].type = 'silver';
  return { cards, arcana: arc, scrolls, packs, rerolls: 0 };
}
export function rerollShop(run, rng, shop) {
  const n = makeShop(run, rng);
  shop.cards = n.cards; shop.arcana = n.arcana; shop.packs = n.packs; shop.rerolls++;
}
export function rerollCost(shop, run) { return run.rerollBase + shop.rerolls; }

export function heal(run, n) { const b = run.hp; run.hp = Math.min(run.maxHp, run.hp + n); return run.hp - b; }
export function deckSorted(deck) {
  const tOrder = { rune: 0, spell: 1, instant: 2, aura: 3, curse: 4 };
  const eOrder = ['fire', 'water', 'wood', 'thunder', 'shadow', 'none'];
  return [...deck].sort((a, b) => {
    const ca = CARDS[a.id], cb = CARDS[b.id];
    if (tOrder[ca.type] !== tOrder[cb.type]) return tOrder[ca.type] - tOrder[cb.type];
    const ea = a.id === 'rune' ? a.el : ca.el, eb = b.id === 'rune' ? b.el : cb.el;
    if (ea !== eb) return eOrder.indexOf(ea) - eOrder.indexOf(eb);
    return (a.v || 0) - (b.v || 0) || a.id.localeCompare(b.id);
  });
}

// おまかせで デッキを くむ（よさそうな カードから じゅんに）
export function autoBuild(pool, els, target = 15) {
  const rarVal = { s: 3, c: 4, u: 7, r: 10 };
  const chosen = [];
  const left = [...pool];
  const score = (c) => {
    const d = CARDS[c.id];
    if (c.id === 'rune') {
      const runes = chosen.filter((x) => x.id === 'rune');
      let v = 2;
      v += 3 * runes.filter((x) => x.v === c.v).length;
      v += 2 * runes.filter((x) => x.v + c.v === 10).length;
      v += 1 * runes.filter((x) => Math.abs(x.v - c.v) === 1).length;
      if (els.includes(c.el)) v += 2;
      if (c.enh) v += 3;
      if (runes.length < 7) v += 4;
      return v;
    }
    if (d.type === 'curse') return -99;
    let v = rarVal[d.rar] || 3;
    if (els.includes(d.el)) v += 2;
    if (c.up) v += 2;
    const spells = chosen.filter((x) => x.id !== 'rune').length;
    if (spells >= 7) v -= 6;
    if (c.id === 'guard' && chosen.filter((x) => x.id === 'guard').length >= 2) v -= 5;
    // まもりと ばいりつの カードを すこしは いれる
    const DEF = ['guard', 'waterShield', 'roots', 'tide', 'barrier', 'waterVeil', 'waterHeart'];
    const MULT = ['focus', 'flameSpear', 'spark', 'inferno', 'phoenix', 'bloom', 'static', 'pact', 'eclipse', 'fireHeart', 'gather', 'square', 'deepSea', 'storm'];
    if (DEF.includes(c.id) && !chosen.some((x) => DEF.includes(x.id))) v += 8;
    if (MULT.includes(c.id) && chosen.filter((x) => MULT.includes(x.id)).length < 2) v += 5;
    return v;
  };
  while (chosen.length < target && left.length) {
    let bi = 0, bs = -Infinity;
    left.forEach((c, i) => { const v = score(c); if (v > bs) { bs = v; bi = i; } });
    if (bs < 0) break;
    chosen.push(left.splice(bi, 1)[0]);
  }
  return chosen;
}
