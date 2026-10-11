// たたかいの しくみ（がめんとは べつ）
import { CARDS, cardCost, EL_LIST } from '../data/cards.js';
import { ARCANA } from '../data/arcana.js';
import { ENEMIES, DIFF } from '../data/enemies.js';
import { scoreSpell } from './score.js';
import { uid } from '../util.js';

export const SLOT_MAX = 5;
export function passive(run, key) {
  let n = 0;
  for (const a of run.arcana) { const p = ARCANA[a.id].passive; if (p && p[key]) n += p[key] === true ? 1 : p[key]; }
  return n;
}
export const alive = (b) => b.enemies.filter((e) => e.hp > 0);

function makeEnemy(b, id) {
  const d = ENEMIES[id];
  const df = DIFF[b.run.diff || 'normal'];
  const hp = Math.round(d.hp * df.hp * (b.run.hpScale || 1));
  return { uid: uid(), id, name: d.name, art: d.art, hp, maxHp: hp, block: 0, str: 0, weak: 0, vuln: 0, turn: 0, cycle: 0, intent: null, boss: !!d.boss, elite: !!d.elite };
}
export function atkN(b, e, n) {
  let v = Math.round(n * DIFF[b.run.diff || 'normal'].atk) + e.str;
  if (e.weak > 0) v = Math.floor(v / 2);
  return Math.max(0, v);
}
function chooseIntent(b, e) {
  const d = ENEMIES[e.id];
  let mv;
  if (d.script) mv = d.movesByKey[d.script[e.turn % d.script.length]];
  else if (d.pattern === 'random') {
    let cand = d.moves.filter((m) => JSON.stringify(m) !== e.last2);
    mv = b.rng.pick(cand.length ? cand : d.moves);
    e.last2 = e.last1; e.last1 = JSON.stringify(mv);
  } else { mv = d.moves[e.cycle % d.moves.length]; e.cycle++; }
  e.intent = { ...mv };
  if (mv.k === 'charge' && d.script) { const nx = d.movesByKey[d.script[(e.turn + 1) % d.script.length]]; e.intent.nextN = nx.n || 0; }
}
export function intentInfo(b, e) {
  const it = e.intent || {};
  switch (it.k) {
    case 'atk': return { icon: '⚔️', text: `${atkN(b, e, it.n)}`, kind: 'atk', total: atkN(b, e, it.n) };
    case 'multi': return { icon: '⚔️', text: `${atkN(b, e, it.n)}×${it.times}`, kind: 'atk', total: atkN(b, e, it.n) * it.times };
    case 'atkblk': return { icon: '⚔️', text: `${atkN(b, e, it.n)} 🛡️`, kind: 'atk', total: atkN(b, e, it.n) };
    case 'blk': return { icon: '🛡️', text: it.buff ? '💪' : '', kind: 'def' };
    case 'buff': return { icon: '💪', text: `+${it.n}`, kind: 'buff' };
    case 'curse': return { icon: '🌀', text: it.n ? `${atkN(b, e, it.n)}` : '', kind: 'curse', total: it.n ? atkN(b, e, it.n) : 0 };
    case 'drain': return { icon: it.what === 'mana' ? '🔻💠' : '🔻🃏', text: it.dmg ? `${atkN(b, e, it.dmg)}` : '', kind: 'curse', total: it.dmg ? atkN(b, e, it.dmg) : 0 };
    case 'summon': return { icon: '📣', text: '', kind: 'buff' };
    case 'charge': return { icon: '⚡', text: it.nextN ? `${atkN(b, e, it.nextN)}!` : '', kind: 'charge' };
    default: return { icon: '❔', text: '', kind: 'none' };
  }
}

export function createBattle(run, enemyIds, kind, rng) {
  const b = {
    kind, rng, run, enemies: [], draw: [], hand: [], discard: [], exhaust: [], board: [],
    slots: Array(SLOT_MAX).fill(null), mana: 0, discardsLeft: 0, pBlock: 0, turn: 0, extraDraw: 0,
    drainMana: 0, drainHand: 0, buff: { power: 0, mult: 0 }, over: null, target: null, lastDamage: 0,
    rule: null, stats: { casts: 0, best: 0, challengeTry: 0, challengeOk: 0, hands: {} },
  };
  for (const id of enemyIds) b.enemies.push(makeEnemy(b, id));
  const ruled = b.enemies.find((e) => ENEMIES[e.id].rule);
  b.ruleSrc = ruled ? ENEMIES[ruled.id] : null;
  b.draw = rng.shuffle(run.deck.map((c) => ({ ...c, uid: uid(), deckUid: c.uid })));
  b.enemies.forEach((e) => chooseIntent(b, e));
  return b;
}
export function slotLimit(b) { return b.rule === 'max3' ? 3 : b.rule === 'max4' ? 4 : SLOT_MAX; }

// こうかを あたえる ための どうぐ
export function api(b, ev) {
  return {
    draw: (n) => { const d = drawCards(b, n); ev.push({ t: 'draw', cards: d }); },
    mana: (n) => { b.mana += n; ev.push({ t: 'mana', n }); },
    block: (n) => { b.pBlock += n; ev.push({ t: 'pblock', n }); },
    buff: (k, n) => { b.buff[k] += n; ev.push({ t: 'buff', k, n }); },
    discards: (n) => { b.discardsLeft += n; ev.push({ t: 'discards', n }); },
    selfDamage: (n) => { b.run.hp = Math.max(1, b.run.hp - n); ev.push({ t: 'selfdmg', n }); },
    enemyStatus: (k, n) => { const e = target(b); if (e) { e[k] += n; ev.push({ t: 'estatus', uid: e.uid, k, n }); } },
    coins: (n) => { b.run.coins += n; ev.push({ t: 'coins', n }); },
    discardHand: () => { b.discard.push(...b.hand.filter((c) => !c.temp)); b.hand = []; ev.push({ t: 'discardHand' }); },
    glassCheck: (inst) => { if (b.rng() < 0.25) { inst.broken = true; ev.push({ t: 'glass', uid: inst.uid }); } },
    paintRune: () => ev.push({ t: 'need', what: 'paint' }),
    shiftRune: () => ev.push({ t: 'need', what: 'shift' }),
    copyRune: () => ev.push({ t: 'need', what: 'copy' }),
  };
}
export function target(b) { return b.enemies.find((e) => e.uid === b.target && e.hp > 0) || alive(b)[0]; }

export function drawCards(b, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    if (b.hand.length >= 10) break;
    if (!b.draw.length) { if (!b.discard.length) break; b.draw = b.rng.shuffle(b.discard.splice(0)); out.push({ shuffle: true }); }
    const c = b.draw.pop();
    b.hand.push(c); out.push(c);
  }
  return out;
}

export function startTurn(b) {
  b.turn++;
  const ev = [];
  if (!passive(b.run, 'keepBlock')) b.pBlock = 0;
  b.buff = { power: 0, mult: 0 };
  if (b.ruleSrc) {
    b.rule = b.ruleSrc.rule === 'rotate' ? b.ruleSrc.rotate[(b.turn - 1) % b.ruleSrc.rotate.length] : b.ruleSrc.rule;
    if (!alive(b).some((e) => ENEMIES[e.id].rule)) b.rule = null;
  }
  b.mana = Math.max(0, 3 + passive(b.run, 'mana') - b.drainMana);
  b.discardsLeft = b.rule === 'noDiscard' ? 0 : 1 + passive(b.run, 'discards');
  let n = 7 + passive(b.run, 'hand') + b.extraDraw - b.drainHand - (b.rule === 'smallHand' ? 2 : 0);
  b.extraDraw = 0; b.drainMana = 0; b.drainHand = 0;
  const A = api(b, ev);
  for (const a of b.board) { const d = CARDS[a.id]; if (d.onTurnStart) d.onTurnStart(b, a, !!a.up, A); }
  const drawn = drawCards(b, Math.max(1, n));
  for (const e of alive(b)) if (e.block && e.turn > 0) { /* てきの まもりは じぶんの ターンに きえる */ }
  return { ev, drawn };
}

export function canPlace(b, inst) {
  const c = CARDS[inst.id];
  if (c.unplayable) return 'つかえない カード';
  if (c.type !== 'rune' && c.type !== 'spell') return null;
  if (b.slots.filter(Boolean).length >= slotLimit(b)) return 'じゅもんが いっぱい';
  if (c.type === 'spell' && b.rule === 'noSpells') return 'のろいで スペルが つかえない';
  if (c.type === 'spell' && cardCost(inst) > b.mana) return 'マナが たりない';
  return null;
}
export function placeCard(b, inst, slot) {
  const err = canPlace(b, inst);
  if (err) return err;
  const hi = b.hand.indexOf(inst);
  if (hi < 0) return 'ない';
  if (slot == null || b.slots[slot]) slot = b.slots.findIndex((s, i) => !s && i < SLOT_MAX);
  b.hand.splice(hi, 1);
  b.slots[slot] = inst;
  if (CARDS[inst.id].type === 'spell') b.mana -= cardCost(inst);
  compactSlots(b);
  return null;
}
function compactSlots(b) {
  const list = b.slots.filter(Boolean);
  b.slots = [...list, ...Array(SLOT_MAX - list.length).fill(null)];
}
export function unplaceCard(b, inst) {
  const i = b.slots.indexOf(inst);
  if (i < 0) return;
  b.slots[i] = null;
  if (CARDS[inst.id].type === 'spell') b.mana += cardCost(inst);
  b.hand.push(inst);
  compactSlots(b);
}
export function moveSlot(b, from, to) {
  const list = b.slots.filter(Boolean);
  const [x] = list.splice(from, 1);
  list.splice(Math.min(to, list.length), 0, x);
  b.slots = [...list, ...Array(SLOT_MAX - list.length).fill(null)];
}

// インスタント / けっかい
export function playCard(b, inst, choice) {
  const c = CARDS[inst.id];
  const cost = cardCost(inst);
  if (cost > b.mana) return { err: 'マナが たりない' };
  const ev = [];
  if (c.type === 'aura') {
    if (b.board.length >= 4) return { err: 'けっかいは 4つまで' };
    b.mana -= cost;
    b.hand.splice(b.hand.indexOf(inst), 1);
    b.board.push({ uid: inst.uid, id: inst.id, up: inst.up, n: 0, src: inst });
    ev.push({ t: 'aura', inst });
    return { ev };
  }
  if (c.type === 'instant') {
    if (c.target === 'rune') {
      const tgt = choice && b.hand.find((h) => h.uid === choice.uid && h.id === 'rune' && h !== inst);
      if (!tgt) return { err: 'ルーンを えらんでね', need: c.target };
      b.mana -= cost;
      b.hand.splice(b.hand.indexOf(inst), 1);
      if (inst.id === 'paint') { tgt.el = choice.el || EL_LIST[(EL_LIST.indexOf(tgt.el) + 1) % 5]; tgt.tempChange = true; }
      if (inst.id === 'shift') { tgt.v = Math.max(1, Math.min(10, tgt.v + (choice.delta || 1))); tgt.tempChange = true; }
      if (inst.id === 'twin') b.hand.push({ ...tgt, uid: uid(), temp: true });
      ev.push({ t: 'target', uid: tgt.uid });
    } else {
      b.mana -= cost;
      b.hand.splice(b.hand.indexOf(inst), 1);
      c.play(b, !!inst.up, api(b, ev));
    }
    if (c.exhaust && c.exhaust(!!inst.up)) b.exhaust.push(inst); else b.discard.push(inst);
    return { ev };
  }
  return { err: 'ここでは つかえない' };
}

export function redraw(b, insts) {
  if (b.discardsLeft <= 0 || !insts.length) return null;
  b.discardsLeft--;
  for (const x of insts) { const i = b.hand.indexOf(x); if (i >= 0) { b.hand.splice(i, 1); if (!x.temp) b.discard.push(x); } }
  return drawCards(b, insts.length);
}

export function scoreState(b, preview) {
  return {
    slots: b.slots, board: b.board, arcana: b.run.arcana, handLv: b.run.handLv, rule: b.rule, turn: b.turn,
    coins: b.run.coins, buff: b.buff, handLeft: b.hand.length, preview,
    handCards: b.hand, drawCards: b.draw, discardCards: b.discard, deckSize: b.run.deck.length,
  };
}
export function preview(b) { return scoreSpell(scoreState(b, true)); }

// はなつ
export function cast(b, { bonus = 1 } = {}) {
  const ctx = scoreSpell(scoreState(b, false));
  const ev = [];
  const A = api(b, ev);
  b.pBlock += ctx.shield;
  b.stats.casts++;
  b.stats.hands[ctx.hand.best] = (b.stats.hands[ctx.hand.best] || 0) + 1;
  let dmg = Math.floor(ctx.total * bonus);
  const hits = [];
  const t = target(b);
  if (dmg > 0 && t) {
    let d = dmg;
    if (t.vuln > 0) { d *= 2; t.vuln--; }
    const blocked = Math.min(t.block, d);
    t.block -= blocked;
    const real = d - blocked;
    t.hp = Math.max(0, t.hp - real);
    hits.push({ uid: t.uid, dmg: d, real, blocked, hp: t.hp, block: t.block, killed: t.hp <= 0, vuln: d !== dmg });
    b.lastDamage = d;
    b.stats.best = Math.max(b.stats.best, d);
    const ls = passive(b.run, 'lifesteal');
    if (ls) { const h = Math.min(8, Math.floor(real / ls)); if (h > 0) { b.run.hp = Math.min(b.run.maxHp, b.run.hp + h); ev.push({ t: 'heal', n: h }); } }
  }
  for (const fn of ctx.laters) fn(b, A);
  for (const inst of b.slots.filter(Boolean)) {
    const c = CARDS[inst.id];
    if (inst.broken) { b.run.deck = b.run.deck.filter((d) => d.uid !== inst.deckUid); continue; }
    if (inst.temp) continue;
    if (c.exhaust && c.exhaust(!!inst.up)) b.exhaust.push(inst); else b.discard.push(inst);
  }
  b.slots = Array(SLOT_MAX).fill(null);
  checkOver(b);
  return { ctx, hits, ev, dmg };
}

function checkOver(b) {
  if (b.run.hp <= 0) b.over = 'lose';
  else if (!alive(b).length) b.over = 'win';
}

export function endPlayerTurn(b) {
  const ev = [];
  const A = api(b, ev);
  for (const a of b.board) { const d = CARDS[a.id]; if (d.onTurnEnd) d.onTurnEnd(b, a, !!a.up, A); }
  b.discard.push(...b.hand.filter((c) => !c.temp));
  b.hand = [];
  return ev;
}

function hitPlayer(b, dmg) {
  const blocked = Math.min(b.pBlock, dmg);
  b.pBlock -= blocked;
  b.run.hp = Math.max(0, b.run.hp - (dmg - blocked));
  return { t: 'phit', dmg: dmg - blocked, blocked, hp: b.run.hp, block: b.pBlock };
}

export function enemyTurn(b) {
  const out = [];
  for (const e of b.enemies.slice()) {
    if (e.hp <= 0 || b.over) continue;
    e.block = 0;
    const it = e.intent;
    const evs = [];
    const atk = (n) => evs.push(hitPlayer(b, atkN(b, e, n)));
    switch (it.k) {
      case 'atk': atk(it.n); break;
      case 'multi': for (let i = 0; i < it.times && b.run.hp > 0; i++) atk(it.n); break;
      case 'atkblk': atk(it.n); e.block += Math.round(it.b * (b.run.hpScale || 1)); evs.push({ t: 'eblock', block: e.block }); break;
      case 'blk': e.block += Math.round(it.n * (b.run.hpScale || 1)); evs.push({ t: 'eblock', block: e.block }); if (it.buff) { e.str += it.buff; evs.push({ t: 'ebuff', str: e.str }); } break;
      case 'buff': e.str += it.n; evs.push({ t: 'ebuff', str: e.str }); break;
      case 'curse': for (let i = 0; i < it.count; i++) b.discard.push({ uid: uid(), id: it.card, temp: true }); evs.push({ t: 'curse', card: it.card, count: it.count }); if (it.n) atk(it.n); break;
      case 'drain': if (it.what === 'mana') b.drainMana += it.n; else b.drainHand += it.n; evs.push({ t: 'drain', what: it.what, n: it.n }); if (it.dmg) atk(it.dmg); break;
      case 'summon': if (alive(b).length < 3) { const ne = makeEnemy(b, it.id); b.enemies.push(ne); chooseIntent(b, ne); evs.push({ t: 'summon', enemy: ne }); } break;
      case 'charge': evs.push({ t: 'charge' }); break;
    }
    if (e.weak > 0) e.weak--;
    out.push({ uid: e.uid, intent: it, events: evs });
    checkOver(b);
  }
  for (const e of alive(b)) { e.turn++; chooseIntent(b, e); }
  return out;
}
