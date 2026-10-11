// バランス しらべ：AIが なんども ぼうけん する
import * as B from '../js/engine/battle.js';
import * as R from '../js/engine/run.js';
import { CARDS, cardCost } from '../js/data/cards.js';
import { ARCANA } from '../js/data/arcana.js';
import { openPack } from '../js/data/packs.js';
import { HEROES } from '../js/data/heroes.js';

function* combos(arr, k, start = 0, cur = []) {
  if (cur.length === k) { yield cur; return; }
  for (let i = start; i < arr.length; i++) yield* combos(arr, k, i + 1, [...cur, arr[i]]);
}
// AI：てふだから いちばん つよい じゅもんを えらぶ（ルーンは かずじゅん、スペルは ×が さいご）
function bestSpell(b) {
  const cand = b.hand.filter((c) => ['rune', 'spell'].includes(CARDS[c.id].type) && !(CARDS[c.id].type === 'spell' && b.rule === 'noSpells'));
  const lim = B.slotLimit(b);
  const incoming = B.alive(b).reduce((s, e) => s + (B.intentInfo(b, e).total || 0), 0);
  const need = Math.max(0, incoming - b.pBlock);
  let best = null, bestScore = -1;
  for (let k = Math.min(lim, cand.length); k >= Math.max(1, Math.min(lim, cand.length) - 2); k--) {
    for (const set of combos(cand, k)) {
      const mana = set.filter((c) => CARDS[c.id].type === 'spell').reduce((s, c) => s + cardCost(c), 0);
      if (mana > b.mana) continue;
      const order = [...set].sort((x, y) => rank(x) - rank(y));
      const saved = b.slots; b.slots = [...order, ...Array(B.SLOT_MAX - order.length).fill(null)];
      const ctx = B.preview(b);
      b.slots = saved;
      const t = B.target(b);
      const dmg = Math.min(ctx.total, t ? t.hp + t.block : ctx.total);
      const score = dmg + Math.min(ctx.shield, need) * Math.max(10, (t ? t.maxHp : 100) * 0.012);
      if (score > bestScore) { bestScore = score; best = order; }
    }
  }
  return best || [];
}
function rank(c) {
  const d = CARDS[c.id];
  if (d.type === 'rune') return 10;
  if (['chain'].includes(c.id)) return 5;
  if (['clone'].includes(c.id)) return 35;
  if (['inferno', 'phoenix', 'deepSea', 'square', 'storm', 'eclipse', 'grow'].includes(c.id)) return 30;
  if (['waterShield'].includes(c.id)) return 25;
  return 20;
}
function simBattle(run, ids, kind, rng) {
  const b = B.createBattle(run, ids, kind, rng);
  let guard = 0;
  while (!b.over && guard++ < 40) {
    B.startTurn(b);
    // けっかい と インスタント
    for (const c of [...b.hand]) {
      const d = CARDS[c.id];
      if ((d.type === 'aura' || (d.type === 'instant' && !d.target)) && cardCost(c) <= b.mana && b.mana >= 1 + cardCost(c) * 0) B.playCard(b, c);
    }
    // いれかえ：ルーン いがいで つかえない カードを すてる
    if (b.discardsLeft > 0) {
      const junk = b.hand.filter((c) => CARDS[c.id].unplayable);
      if (junk.length) B.redraw(b, junk);
    }
    const play = bestSpell(b);
    for (const c of play) B.placeCard(b, c);
    const cr = B.cast(b, { bonus: rng() < CH ? 1.5 : 1 });
    DMG[run.act].push(cr.ctx.total); BLK[run.act].push(cr.ctx.shield);
    if (b.over) break;
    B.endPlayerTurn(b);
    B.enemyTurn(b);
  }
  return { win: b.over === 'win', turns: b.turn, b };
}
const DMG = { 1: [], 2: [], 3: [] }, BLK = { 1: [], 2: [], 3: [] };
const CH = Number(process.env.CH ?? 0.5);
function simRun(hero, seed, diff) {
  const run = R.newRun({ hero, grade: 2, diff, seed });
  const { rng } = R.runRng(run);
  const els = HEROES[hero].els;
  if (!process.env.NOPACK) {
    const pool = [...run.deck, ...openPack(els[0], rng), ...openPack(els[1], rng), ...openPack(rng.pick([els[0], 'silver']), rng)];
    run.deck = R.autoBuild(pool, els, Number(process.env.DECKN || 15));
    run.side = pool.filter((c) => !run.deck.includes(c));
  }
  const log = [];
  for (let act = 1; act <= 3; act++) {
    run.act = act;
    if (act > 1) { run.map = R.genMap(rng); run.pos = null; }
    while (true) {
      const av = R.availableNodes(run);
      if (!av.length) break;
      let id = rng.pick(av);
      const types = av.map((x) => run.map.nodes[x].type);
      if (run.hp < run.maxHp * 0.45 && types.includes('rest')) id = av[types.indexOf('rest')];
      else if (types.includes('shop') && run.coins > 8) id = av[types.indexOf('shop')];
      const node = run.map.nodes[id]; run.pos = id; run.map.visited.push(id);
      const t = node.type;
      if (['battle', 'elite', 'boss'].includes(t)) {
        const ids = R.pickEncounter(run, t, rng);
        const hp0 = run.hp;
        const res = simBattle(run, ids, t, rng);
        log.push({ act, t, ids: ids.join('+'), turns: res.turns, lost: hp0 - run.hp, win: res.win });
        if (!res.win) return { win: false, act, log, run };
        run.coins += R.battleCoins(run, t).total;
        const offer = R.rollCards(run, rng, { elite: t !== 'battle' });
        const pick = offer.find((c) => c.id !== 'rune' && CARDS[c.id].type === 'spell') || offer[0];
        if (rng() < 0.8) run.deck.push(pick);
        if (t === 'elite') { const a = R.rollArcana(run, rng); if (a) R.addArcana(run, a); }
        if (t === 'boss') {
          const a = R.rollArcana(run, rng, 'r'); if (a) R.addArcana(run, a); R.heal(run, Math.round((run.maxHp - run.hp) * 0.7));
          if (!process.env.NOPACK) { const pool = [...run.deck, ...run.side, ...openPack(rng.pick(els), rng, { rareBoost: 0.4 })]; run.deck = R.autoBuild(pool, els, Math.min(20, run.deck.length + 1)); run.side = pool.filter((c) => !run.deck.includes(c)); }
          break;
        }
      } else if (t === 'rest') {
        if (run.hp < run.maxHp * 0.65) R.heal(run, Math.round(run.maxHp * 0.35));
        else { const c = run.deck.find((x) => !x.up && x.id !== 'rune'); if (c) c.up = true; }
      } else if (t === 'treasure') { const a = R.rollArcana(run, rng); if (a) R.addArcana(run, a); }
      else if (t === 'shop') {
        const shop = R.makeShop(run, rng);
        for (const a of shop.arcana) if (run.coins >= a.price && run.arcana.length < 5) { run.coins -= a.price; R.addArcana(run, a.id); }
        for (const s of shop.scrolls) if (s.scroll.id === 'star' && run.coins >= s.price) { run.coins -= s.price; run.handLv[s.scroll.hand] = (run.handLv[s.scroll.hand] || 1) + 1; }
        const g = run.deck.find((c) => c.id === 'guard');
        if (g && run.coins >= run.removeCost && run.deck.length > 10) { run.coins -= run.removeCost; run.deck = run.deck.filter((x) => x !== g); run.removeCost++; }
      } else if (t === 'event') {
        if (rng() < 0.5) { const a = R.rollArcana(run, rng); if (a) R.addArcana(run, a); } else run.coins += 5;
      }
    }
  }
  return { win: true, act: 3, log, run };
}
const N = Number(process.env.N || 120), V = !!process.env.V, DIFF = process.env.DIFF || 'normal';
for (const hero of [0, 1, 2]) {
  let wins = 0; const death = { 1: 0, 2: 0, 3: 0 }; const agg = {};
  for (let i = 0; i < N; i++) {
    const r = simRun(hero, 100 + i * 7919 + hero * 13, DIFF);
    if (r.win) wins++; else death[r.act]++;
    for (const l of r.log) { const k = `A${l.act} ${l.t.padEnd(6)} ${l.ids}`; const a = agg[k] || (agg[k] = { n: 0, turns: 0, lost: 0, d: 0 }); a.n++; a.turns += l.turns; a.lost += l.lost; if (!l.win) a.d++; }
  }
  console.log(`\n=== hero ${hero}: win ${(wins / N * 100).toFixed(0)}%  deaths A1:${death[1]} A2:${death[2]} A3:${death[3]}`);
  const med = (a) => { const x = [...a].sort((p, q) => p - q); return x[Math.floor(x.length / 2)] || 0; };
  console.log('median cast dmg', [1, 2, 3].map((k) => med(DMG[k])).join(' / '), ' block', [1, 2, 3].map((k) => med(BLK[k])).join(' / '));
  for (const k of [1, 2, 3]) { DMG[k] = []; BLK[k] = []; }
  if (V) for (const [k, a] of Object.entries(agg).sort()) console.log(k.padEnd(34), 'n', String(a.n).padStart(4), 'turns', (a.turns / a.n).toFixed(1), 'lost', (a.lost / a.n).toFixed(1), 'd', a.d);
}
