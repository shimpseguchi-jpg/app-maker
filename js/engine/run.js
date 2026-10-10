// ぼうけん（ラン）ぜんたいの しくみ：マップ・ほうしゅう・おみせ
import { CARDS, STARTER } from '../data/cards.js';
import { RELICS, relicPool } from '../data/relics.js';
import { ENCOUNTERS } from '../data/enemies.js';
import { makeRng, uid } from '../util.js';

export const FLOORS = {
  1: { name: 'はじまりの もり', theme: 'forest', icon: '🌳' },
  2: { name: 'からくりの まち', theme: 'town', icon: '⚙️' },
  3: { name: 'よぞらの おしろ', theme: 'castle', icon: '🏰' },
};
export const NODE_INFO = {
  battle: { icon: '⚔️', name: 'たたかい' },
  elite: { icon: '👹', name: 'つよい てき' },
  rest: { icon: '⛺', name: 'やすみ' },
  shop: { icon: '🛒', name: 'おみせ' },
  treasure: { icon: '🎁', name: 'たからばこ' },
  event: { icon: '❓', name: 'ふしぎ' },
  boss: { icon: '👑', name: 'ボス' },
};

export function runRng(run) {
  const rng = makeRng(run.rngState);
  const save = () => { run.rngState = rng.state(); };
  return { rng, save };
}

export function newRun({ grade, hero, seed, diff = 'normal' }) {
  const run = {
    v: 2, seed, rngState: seed, grade, hero, diff,
    hp: 60, maxHp: 60, coins: 30,
    deck: STARTER[grade].map((id) => ({ uid: uid(), id, up: false })),
    relics: ['wand'], floor: 1, slots: 3,
    map: null, pos: null, pending: null,
    removeCost: 60,
    stats: { battles: 0, predTry: 0, predOk: 0, calcs: 0, pittari: 0, weakHits: 0, maxHit: 0, quizOk: 0, quizTry: 0, turns: 0 },
    startedAt: Date.now(),
  };
  if (grade === 1) { run.hp = run.maxHp = 56; }
  if (diff === 'easy') { run.hp += 10; run.maxHp += 10; run.coins += 20; }
  const { rng, save } = runRng(run);
  run.map = genMap(rng, 1);
  save();
  return run;
}

// マップを つくる（ひだり→みぎ）
export function genMap(rng, floor) {
  const COLS = 7, LANES = 4;
  const nodes = {};
  const key = (c, l) => `${c}-${l}`;
  const edges = new Set();
  const crosses = (c, a, b) => {
    for (const e of edges) {
      const [c1, l1, , l2] = e.split(',').map(Number);
      if (c1 !== c) continue;
      if ((l1 - a) * (l2 - b) < 0) return true;
    }
    return false;
  };
  const starts = rng.shuffle([0, 1, 2, 3]).slice(0, 3);
  starts.push(rng.int(0, 3));
  for (const s of starts) {
    let lane = s;
    nodes[key(0, lane)] = nodes[key(0, lane)] || { id: key(0, lane), col: 0, lane, next: [] };
    for (let c = 0; c < COLS - 1; c++) {
      const opts = rng.shuffle([lane - 1, lane, lane + 1].filter((l) => l >= 0 && l < LANES));
      let nl = opts.find((l) => !crosses(c, lane, l));
      if (nl === undefined) nl = lane;
      edges.add(`${c},${lane},${c + 1},${nl}`);
      nodes[key(c + 1, nl)] = nodes[key(c + 1, nl)] || { id: key(c + 1, nl), col: c + 1, lane: nl, next: [] };
      const from = nodes[key(c, lane)];
      if (!from.next.includes(key(c + 1, nl))) from.next.push(key(c + 1, nl));
      lane = nl;
    }
  }
  const boss = { id: 'boss', col: COLS, lane: 1.5, next: [], type: 'boss' };
  for (const n of Object.values(nodes)) if (n.col === COLS - 1) n.next.push('boss');
  nodes.boss = boss;
  // しゅるいを きめる
  const list = Object.values(nodes).filter((n) => n.id !== 'boss');
  for (const n of list) {
    if (n.col === 0) n.type = 'battle';
    else if (n.col === 3) n.type = 'treasure';
    else if (n.col === COLS - 1) n.type = 'rest';
    else if (n.col === 1) n.type = rng.weighted([['battle', 60], ['event', 40]]);
    else {
      const w = [['battle', 42], ['event', 26], ['elite', n.col >= 2 ? 14 : 0], ['shop', 12], ['rest', n.col === 4 ? 10 : 0]];
      n.type = rng.weighted(w);
    }
  }
  // おみせ と つよい てきを かならず 1つ
  const mid = list.filter((n) => n.col >= 2 && n.col <= 5 && n.col !== 3);
  if (!list.some((n) => n.type === 'shop')) rng.pick(mid).type = 'shop';
  if (!list.some((n) => n.type === 'elite')) rng.pick(mid.filter((n) => n.type !== 'shop')).type = 'elite';
  // おなじ しゅるいが つづく やすみ/おみせ を へらす
  for (const n of list) for (const nx of n.next) {
    const m = nodes[nx];
    if (m && m.type === n.type && ['shop', 'rest', 'elite'].includes(n.type) && m.col !== COLS - 1) m.type = 'battle';
  }
  return { floor, nodes, cols: COLS, lanes: LANES, visited: [] };
}

export function availableNodes(run) {
  const m = run.map;
  if (!run.pos) return Object.values(m.nodes).filter((n) => n.col === 0).map((n) => n.id);
  const cur = m.nodes[run.pos];
  return cur ? cur.next : [];
}

export function pickEncounter(run, type, rng) {
  const E = ENCOUNTERS[run.floor];
  const fought = run.map.fought || (run.map.fought = []);
  let pool;
  if (type === 'elite') pool = E.elite;
  else if (type === 'boss') pool = E.boss;
  else pool = (run.map.visited.filter((id) => ['battle'].includes(run.map.nodes[id].type)).length < 2) ? E.easy : E.normal;
  let cands = pool.filter((p) => !fought.includes(p.join('+')));
  if (!cands.length) cands = pool;
  const enc = rng.pick(cands);
  fought.push(enc.join('+'));
  return enc;
}

// カードの ほうしゅう
const REWARDABLE_STARTERS = { rep: 'u', x2: 'c', d2: 'c', tri: 'c' };
export function cardRarity(c) { return c.rar === 's' ? REWARDABLE_STARTERS[c.id] : c.rar; }
export function cardPool(grade) {
  return Object.values(CARDS).filter((c) => c.grade <= grade && cardRarity(c) && c.rar !== 'x');
}
export function rollCards(run, rng, { n = 3, elite = false, rare = false } = {}) {
  if (run.relics.includes('books')) n += 1;
  const pool = cardPool(run.grade);
  const out = [];
  let guard = 0;
  while (out.length < n && guard++ < 200) {
    const r = rare ? rng.weighted([['c', 25], ['u', 50], ['r', 25]])
      : elite ? rng.weighted([['c', 40], ['u', 45], ['r', 15]])
        : rng.weighted([['c', 60], ['u', 33], ['r', 7]]);
    const cand = pool.filter((c) => cardRarity(c) === r && !out.includes(c.id));
    if (!cand.length) continue;
    out.push(rng.pick(cand).id);
  }
  return out;
}

export function rollRelic(run, rng, rar) {
  const r = rar || rng.weighted([['c', 50], ['u', 37], ['r', 13]]);
  let pool = relicPool(r, run.grade, run.relics);
  if (!pool.length) pool = ['c', 'u', 'r'].flatMap((x) => relicPool(x, run.grade, run.relics));
  return pool.length ? rng.pick(pool).id : null;
}
export function bossRelicChoices(run, rng) {
  const pool = relicPool('boss', run.grade, run.relics);
  return rng.shuffle(pool.map((r) => r.id)).slice(0, 3);
}

export function gainRelic(run, id) {
  if (!id || run.relics.includes(id)) return;
  run.relics.push(id);
  const r = RELICS[id];
  if (r.onGet) r.onGet(run);
}
export function addCard(run, id, up = false) { run.deck.push({ uid: uid(), id, up }); }
export function removeCard(run, cardUid) { run.deck = run.deck.filter((c) => c.uid !== cardUid); }
export function upgradeCard(run, cardUid) { const c = run.deck.find((x) => x.uid === cardUid); if (c) c.up = true; }
export function heal(run, n) { const b = run.hp; run.hp = Math.min(run.maxHp, run.hp + n); return run.hp - b; }

export function battleCoins(run, rng, kind) {
  let c = kind === 'boss' ? 70 : kind === 'elite' ? rng.int(28, 36) : rng.int(11, 18);
  if (run.relics.includes('piggy')) c += 10;
  return c;
}

export const PRICE = { c: 45, u: 70, r: 115 };
export const RELIC_PRICE = { c: 130, u: 165, r: 210 };
export function makeShop(run, rng) {
  const cards = [];
  const pool = cardPool(run.grade);
  const want = ['c', 'c', 'u', 'u', 'r'];
  for (const r of want) {
    const cand = pool.filter((c) => cardRarity(c) === r && !cards.some((x) => x.id === c.id));
    if (!cand.length) continue;
    const id = rng.pick(cand).id;
    cards.push({ id, price: Math.round(PRICE[r] * (0.9 + rng() * 0.2)), sold: false });
  }
  const sale = rng.int(0, cards.length - 1);
  cards[sale].price = Math.round(cards[sale].price / 2);
  cards[sale].sale = true;
  const relics = [];
  for (const r of ['c', 'u']) {
    const p = relicPool(r, run.grade, run.relics.concat(relics.map((x) => x.id)));
    if (p.length) relics.push({ id: rng.pick(p).id, price: Math.round(RELIC_PRICE[r] * (0.9 + rng() * 0.2)), sold: false });
  }
  return { cards, relics, removed: false };
}

export function deckSorted(deck) {
  const order = ['add', 'sub', 'mul', 'div', 'shape', 'know', 'prog', 'atk', 'def', 'junk'];
  return [...deck].sort((a, b) => order.indexOf(CARDS[a.id].cat) - order.indexOf(CARDS[b.id].cat) || a.id.localeCompare(b.id) || (a.up ? 1 : 0) - (b.up ? 1 : 0));
}
