// たたかいの しくみ（がめんとは べつ）
import { CARDS } from '../data/cards.js';
import { ENEMIES, GRADE_SCALE, DIFF_SCALE, lockRange, weakChoices } from '../data/enemies.js';
import { runChain, computeHit } from './chain.js';
import { uid } from '../util.js';

export function slotCount(run) {
  return Math.min(6, (run.slots || 3) + (run.relics.includes('hat') ? 1 : 0));
}
export function handSize(run) {
  return 5 + (run.relics.includes('randoseru') ? 1 : 0);
}

function makeEnemy(b, id) {
  const d = ENEMIES[id];
  const sc = GRADE_SCALE[b.grade];
  const dsc = DIFF_SCALE[b.run.diff || 'normal'];
  const hpBase = b.rng.int(d.hp[0], d.hp[1]);
  const hp = Math.max(4, Math.round(hpBase * sc.hp * dsc.hp));
  const e = {
    uid: uid(), id, name: d.name, art: d.art,
    hp, maxHp: hp, block: 0, str: 0,
    armor: d.armor ? Math.max(1, Math.round(d.armor * (b.grade === 1 ? 0.7 : 1))) : 0,
    lock: 0, hasLock: !!d.lock,
    weak: d.weak ? b.rng.pick(weakChoices(b.grade)) : 0,
    turn: 0, cycle: 0, revived: false, charging: false,
    boss: !!d.boss, elite: !!d.elite,
    intent: null,
  };
  return e;
}

export function scaledN(b, n) { return Math.max(1, Math.round(n * GRADE_SCALE[b.grade].atk * DIFF_SCALE[b.run.diff || 'normal'].atk)); }

function chooseIntent(b, e) {
  const d = ENEMIES[e.id];
  let mv;
  if (typeof d.pattern === 'function') {
    mv = d.movesByKey[d.pattern(e, e.turn)];
  } else if (d.pattern === 'cycle') {
    mv = d.moves[e.cycle % d.moves.length];
    e.cycle++;
  } else {
    // おなじ わざを 3かい つづけない
    let cand = d.moves;
    if (e.lastK && e.lastK2 === e.lastK) cand = d.moves.filter((m) => JSON.stringify(m) !== e.lastK) ;
    mv = b.rng.pick(cand.length ? cand : d.moves);
    e.lastK2 = e.lastK; e.lastK = JSON.stringify(mv);
  }
  e.intent = { ...mv };
  // つぎの ターンの ための まえぶれ
  if (mv.k === 'charge') {
    const nextKey = typeof d.pattern === 'function' ? d.pattern(e, e.turn + 1) : null;
    const nm = nextKey ? d.movesByKey[nextKey] : d.moves[e.cycle % d.moves.length];
    e.intent.nextN = nm && nm.n ? nm.n : 0;
  }
}

export function intentDamage(b, e, n) { return scaledN(b, n) + e.str; }

export function createBattle(run, enemyIds, kind, rng) {
  const b = {
    kind, grade: run.grade, floor: run.floor, rng,
    enemies: [], draw: [], hand: [], discard: [], exhaust: [],
    slots: Array(slotCount(run)).fill(null),
    pBlock: 0, memo: 0, turn: 0, extraDrawNext: 0, over: null,
    stats: { turns: 0, predTry: 0, predOk: 0, calcs: 0, pittari: 0, weakHits: 0, maxHit: 0 },
  };
  b.run = run;
  for (const id of enemyIds) b.enemies.push(makeEnemy(b, id));
  b.draw = rng.shuffle(run.deck.map((c) => ({ uid: uid(), id: c.id, up: !!c.up, deckUid: c.uid })));
  b.enemies.forEach((e) => chooseIntent(b, e));
  return b;
}

export function battleStartEffects(b) {
  const ev = [];
  const r = b.run.relics;
  if (r.includes('cape')) { b.pBlock += 10; ev.push({ t: 'pblock', n: 10, src: 'cape' }); }
  if (r.includes('bell')) {
    for (const e of alive(b)) ev.push(damageEnemy(b, e, 5, { pierce: true, src: 'bell' }));
  }
  return ev;
}

export const alive = (b) => b.enemies.filter((e) => e.hp > 0);

function rollCard(b, inst) {
  const d = CARDS[inst.id];
  if (d.roll) {
    inst.roll = d.roll(b.rng, inst.up);
    if (b.run.relics.includes('lucky') && inst.id === 'dice') inst.roll = inst.roll.map((x) => Math.max(3, x));
  }
}

export function drawCards(b, n) {
  const drawn = [];
  for (let i = 0; i < n; i++) {
    if (!b.draw.length) {
      if (!b.discard.length) break;
      b.draw = b.rng.shuffle(b.discard.splice(0));
      drawn.push({ shuffle: true });
    }
    const c = b.draw.pop();
    rollCard(b, c);
    b.hand.push(c);
    drawn.push(c);
  }
  return drawn;
}

export function startPlayerTurn(b) {
  b.turn++;
  b.stats.turns++;
  if (!b.run.relics.includes('shell')) b.pBlock = 0;
  const ev = [];
  if (b.run.relics.includes('alarm')) { b.pBlock += 3; ev.push({ t: 'pblock', n: 3, src: 'alarm' }); }
  // 🎯 ぴったりの かずを きめる
  for (const e of alive(b)) {
    const phaseLock = ENEMIES[e.id].phase2 && e.hp <= e.maxHp / 2;
    if (e.hasLock || phaseLock) {
      const [lo, hi] = lockRange(b.floor, b.grade);
      let v; do { v = b.rng.int(lo, hi); } while (v === e.lock);
      e.lock = v;
    }
  }
  let n = handSize(b.run) + b.extraDrawNext;
  if (b.turn === 1 && b.run.relics.includes('wand')) n += 2;
  b.extraDrawNext = 0;
  const drawn = drawCards(b, Math.min(n, 10));
  return { ev, drawn };
}

// カードを わくに おく / もどす
export function placeCard(b, handIdx, slotIdx) {
  const c = b.hand[handIdx];
  if (!c || CARDS[c.id].unplayable) return false;
  if (slotIdx == null) slotIdx = b.slots.indexOf(null);
  if (slotIdx < 0 || slotIdx >= b.slots.length) return false;
  const prev = b.slots[slotIdx];
  b.hand.splice(handIdx, 1);
  b.slots[slotIdx] = c;
  if (prev) b.hand.push(prev);
  return true;
}
export function unplaceCard(b, slotIdx) {
  const c = b.slots[slotIdx];
  if (!c) return false;
  b.slots[slotIdx] = null;
  b.hand.push(c);
  return true;
}
export function swapSlots(b, i, j) { [b.slots[i], b.slots[j]] = [b.slots[j], b.slots[i]]; }

export function chainOpts(b) {
  return { startV: b.run.relics.includes('star0') ? 3 : 0, memo: b.memo, relics: b.run.relics, grade: b.grade };
}
export function previewChain(b) { return runChain(b.slots, chainOpts(b)); }

function damageEnemy(b, e, dmg, { pierce = false } = {}) {
  let blocked = 0;
  if (!pierce && e.block > 0) { blocked = Math.min(e.block, dmg); e.block -= blocked; dmg -= blocked; }
  e.hp = Math.max(0, e.hp - dmg);
  const ev = { t: 'ehit', uid: e.uid, dmg, blocked, hp: e.hp, block: e.block };
  if (e.hp <= 0) {
    if (ENEMIES[e.id].revive && !e.revived) {
      e.revived = true;
      e.hp = Math.ceil(e.maxHp / 2);
      ev.revive = e.hp;
    } else {
      ev.killed = true;
    }
  }
  return ev;
}

// じゅもんを じっこう → ダメージ
export function executeChain(b, { predicted = false } = {}) {
  const ctx = runChain(b.slots, chainOpts(b));
  b.memo = ctx.memo;
  b.extraDrawNext += ctx.extraDrawN;
  b.stats.calcs += ctx.steps.filter((s) => ['add', 'sub', 'mul', 'div'].includes(s.op)).length;
  const ev = [];
  if (ctx.blockTotal > 0) { b.pBlock += ctx.blockTotal; }
  const V = ctx.v;
  const hits = [];
  if (V > 0 && ctx.cards.length) {
    const targets = ctx.flags.all ? alive(b) : [b.enemies.find((e) => e.uid === b.target && e.hp > 0) || alive(b)[0]].filter(Boolean);
    for (let h = 0; h < ctx.flags.hits; h++) {
      for (const e of targets) {
        if (e.hp <= 0) continue;
        const hit = computeHit(V, e, ctx.flags, { relics: b.run.relics, predicted });
        const r = damageEnemy(b, e, hit.dmg, { pierce: ctx.flags.pierce });
        r.notes = hit.notes; r.raw = V; r.hitNo = h;
        if (hit.notes.some((n) => n.t === 'ぴったり！')) b.stats.pittari++;
        if (hit.notes.some((n) => n.t === 'じゃくてん！')) b.stats.weakHits++;
        b.stats.maxHit = Math.max(b.stats.maxHit, hit.dmg);
        hits.push(r);
      }
    }
  }
  if (predicted && b.run.relics.includes('medal')) {
    const before = b.run.hp;
    b.run.hp = Math.min(b.run.maxHp, b.run.hp + 2);
    ev.push({ t: 'heal', n: b.run.hp - before, src: 'medal' });
  }
  // すてふだへ
  const used = b.slots.filter(Boolean);
  for (const c of used) {
    if (ctx.exhausts.includes(c.uid)) b.exhaust.push(c); else b.discard.push(c);
  }
  b.slots = Array(b.slots.length).fill(null);
  checkOver(b);
  return { ctx, hits, ev, V };
}

export function discardHand(b) {
  b.discard.push(...b.hand.splice(0));
}

function checkOver(b) {
  if (b.run.hp <= 0) b.over = 'lose';
  else if (!alive(b).length) b.over = 'win';
}

function hitPlayer(b, dmg) {
  const blocked = Math.min(b.pBlock, dmg);
  b.pBlock -= blocked;
  const real = dmg - blocked;
  b.run.hp = Math.max(0, b.run.hp - real);
  return { t: 'phit', dmg: real, blocked, hp: b.run.hp, block: b.pBlock };
}

// てきの ターン
export function enemyTurn(b) {
  const out = []; // [{uid, intent, events:[]}]
  for (const e of b.enemies.slice()) {
    if (e.hp <= 0 || b.over) continue;
    e.block = 0;
    const it = e.intent;
    const evs = [];
    const atk = (n) => evs.push(hitPlayer(b, intentDamage(b, e, n)));
    switch (it.k) {
      case 'atk': atk(it.n); break;
      case 'multi': for (let i = 0; i < it.times && b.run.hp > 0; i++) atk(it.n); break;
      case 'blk': e.block += scaledN(b, it.n); evs.push({ t: 'eblock', uid: e.uid, block: e.block }); if (it.buff) { e.str += it.buff; evs.push({ t: 'ebuff', uid: e.uid, str: e.str }); } break;
      case 'atkblk': atk(it.n); e.block += scaledN(b, it.b); evs.push({ t: 'eblock', uid: e.uid, block: e.block }); break;
      case 'buff': e.str += it.n; evs.push({ t: 'ebuff', uid: e.uid, str: e.str }); break;
      case 'curse': {
        for (let i = 0; i < it.count; i++) b.discard.push({ uid: uid(), id: it.card, up: false, temp: true });
        evs.push({ t: 'curse', card: it.card, count: it.count });
        if (it.n) atk(it.n);
        break;
      }
      case 'summon': {
        if (alive(b).length < 3) {
          const ne = makeEnemy(b, it.id);
          b.enemies.push(ne);
          chooseIntent(b, ne);
          evs.push({ t: 'summon', enemy: ne });
        } else evs.push({ t: 'none' });
        break;
      }
      case 'charge': evs.push({ t: 'charge' }); break;
      case 'heal': e.hp = Math.min(e.maxHp, e.hp + it.n); evs.push({ t: 'eheal', uid: e.uid, hp: e.hp }); break;
    }
    out.push({ uid: e.uid, intent: it, events: evs });
    checkOver(b);
    if (b.over) break;
  }
  for (const e of alive(b)) { e.turn++; chooseIntent(b, e); }
  // てきの まもりは じぶんの ターンの はじめに きえる（つぎの プレイヤーの ターンは のこる）
  return out;
}

export function intentInfo(b, e) {
  const it = e.intent || {};
  switch (it.k) {
    case 'atk': return { icon: '⚔️', text: `${intentDamage(b, e, it.n)}`, kind: 'atk', total: intentDamage(b, e, it.n) };
    case 'multi': return { icon: '⚔️', text: `${intentDamage(b, e, it.n)}×${it.times}`, kind: 'atk', total: intentDamage(b, e, it.n) * it.times };
    case 'blk': return { icon: '🛡️', text: it.buff ? `💪` : '', kind: 'def' };
    case 'atkblk': return { icon: '⚔️', text: `${intentDamage(b, e, it.n)}+🛡️`, kind: 'atk', total: intentDamage(b, e, it.n) };
    case 'buff': return { icon: '💪', text: `+${it.n}`, kind: 'buff' };
    case 'curse': return { icon: '🌀', text: it.n ? `${intentDamage(b, e, it.n)}` : '', kind: 'curse', total: it.n ? intentDamage(b, e, it.n) : 0 };
    case 'summon': return { icon: '📣', text: '', kind: 'buff' };
    case 'charge': return { icon: '⚡', text: it.nextN ? `つぎ ${intentDamage(b, e, it.nextN)}!` : 'ためる', kind: 'charge' };
    case 'heal': return { icon: '💚', text: `${it.n}`, kind: 'buff' };
    default: return { icon: '❔', text: '', kind: 'none' };
  }
}

// たたかいの あと：おじゃまカードを けして デッキへ
export function finishBattle(b) {
  b.run.memoLast = b.memo;
}
