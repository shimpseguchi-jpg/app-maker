// バランス しらべ：AIが なんども ぼうけん する
import * as B from '../js/engine/battle.js';
import * as R from '../js/engine/run.js';
import { CARDS, cardCost } from '../js/data/cards.js';
import { ARCANA } from '../js/data/arcana.js';
import { openPack } from '../js/data/packs.js';
import { HEROES } from '../js/data/heroes.js';
import { pickMods, hasMod, MODS } from '../js/data/mods.js';
import { runScore } from '../js/engine/runscore.js';
import { makeRng } from '../js/util.js';

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
  b.tookDamage = false;
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
    const chal = rng() < CH;
    const cr = B.cast(b, { bonus: chal ? 1.5 : 1 });
    run.stats.challengeTry++; if (chal) run.stats.challengeOk++;
    run.stats.best = Math.max(run.stats.best, cr.dmg);
    for (const [h, n] of Object.entries(b.stats.hands)) run.stats.hands[h] = n;
    DMG[run.act].push(cr.ctx.total); BLK[run.act].push(cr.ctx.shield);
    if (b.over) break;
    B.endPlayerTurn(b);
    B.enemyTurn(b);
  }
  return { win: b.over === 'win', turns: b.turn, b };
}
const DMG = { 1: [], 2: [], 3: [] }, BLK = { 1: [], 2: [], 3: [] };
let SC = [], SCW = [], BEST = [];
const CH = Number(process.env.CH ?? 0.5);
function simRun(hero, seed, diff, mods = []) {
  const run = R.newRun({ hero, grade: 2, diff, seed, mode: mods.length ? 'random' : 'normal', mods });
  const { rng } = R.runRng(run);
  const els = R.heroEls(run);
  const gifts = R.applyStartMods(run, rng);
  const sm = R.startMode(run);
  if (sm === 'draft') { run.deck = []; for (let i = 0; i < 15; i++) { const o = R.draftOffer(run, rng); run.deck.push(R.autoBuild([...run.deck, ...o], els, run.deck.length + 1).find((c) => o.includes(c)) || o[0]); } }
  else if (sm === 'sealed') { const pool = R.sealedTypes(run, rng).flatMap((t) => openPack(t, rng)); run.deck = R.autoBuild(pool, els, 14); run.side = pool.filter((c) => !run.deck.includes(c)); }
  else if (sm === 'insanity') run.deck = R.insanityDeck(run, rng);
  else if (sm === 'starter') { /* はじめの デッキ だけ */ }
  else if (!process.env.NOPACK) {
    const base = sm === 'chimera' ? R.chimeraPool() : run.deck;
    const pool = [...base, ...openPack(els[0], rng), ...openPack(els[1], rng), ...openPack(rng.pick([els[0], 'silver']), rng)];
    run.deck = R.autoBuild(pool, els, Number(process.env.DECKN || 15));
    run.side = pool.filter((c) => !run.deck.includes(c));
  }
  run.deck.push(...gifts);
  const t0 = Date.now();
  const log = [];
  for (let act = 1; act <= 3; act++) {
    run.act = act;
    if (act > 1) { run.map = R.genMap(rng, R.mapOpts(run)); run.pos = null; }
    while (true) {
      const av = R.availableNodes(run);
      if (!av.length) break;
      let id = rng.pick(av);
      const types = av.map((x) => run.map.nodes[x].type);
      if (run.hp < run.maxHp * 0.45 && types.includes('rest')) id = av[types.indexOf('rest')];
      else if (types.includes('shop') && run.coins > 8) id = av[types.indexOf('shop')];
      const node = run.map.nodes[id]; run.pos = id; run.map.visited.push(id);
      R.enterNode(run, node);
      let t = node.type;
      if (t === 'event' && hasMod(run, 'deadly') && rng() < 0.3) t = 'elite';
      if (['battle', 'elite', 'boss'].includes(t)) {
        const ids = R.pickEncounter(run, t, rng);
        const hp0 = run.hp;
        const res = simBattle(run, ids, t, rng);
        log.push({ act, t, ids: ids.join('+'), turns: res.turns, lost: hp0 - run.hp, win: res.win });
        if (!res.win) return { win: false, act, log, run };
        R.recordBattle(run, t, { kills: res.b.enemies.length, tookDamage: res.b.tookDamage });
        run.stats.battles++;
        R.addCoins(run, R.battleCoins(run, t).total);
        const noCards = hasMod(run, 'starter') || (hasMod(run, 'vintage') && t === 'battle');
        if (!noCards) {
          const offer = R.rollCards(run, rng, { n: hasMod(run, 'binary') ? 2 : 3, elite: t !== 'battle', allRare: hasMod(run, 'swarm') && t === 'elite' });
          const pick = offer.find((c) => c.id !== 'rune' && CARDS[c.id].type === 'spell') || offer[0];
          if (rng() < 0.8) R.gainCard(run, pick);
        }
        if (t === 'elite' || (hasMod(run, 'vintage') && t === 'battle')) { const a = R.rollArcana(run, rng); if (a) R.addArcana(run, a); }
        if (t === 'boss') {
          const a = R.rollArcana(run, rng, 'r'); if (a) R.addArcana(run, a); R.heal(run, Math.round((run.maxHp - run.hp) * 0.7));
          R.bossCurse(run);
          if (!process.env.NOPACK && !hasMod(run, 'starter')) { const pool = [...run.deck, ...run.side, ...openPack(rng.pick(els), rng, { rareBoost: 0.4 })]; run.deck = R.autoBuild(pool, els, Math.min(20, run.deck.length + 1)); run.side = pool.filter((c) => !run.deck.includes(c)); }
          break;
        }
      } else if (t === 'rest') {
        if (run.hp < run.maxHp * 0.65 || hasMod(run, 'midas')) { if (hasMod(run, 'night')) { run.maxHp = Math.max(1, run.maxHp - 5); run.hp = run.maxHp; } else R.heal(run, Math.round(run.maxHp * 0.35)); }
        else { const c = run.deck.find((x) => !x.up && x.id !== 'rune'); if (c) c.up = true; }
      } else if (t === 'treasure') { const a = R.rollArcana(run, rng); if (a) R.addArcana(run, a); }
      else if (t === 'shop') {
        const shop = R.makeShop(run, rng);
        for (const a of shop.arcana) if (run.coins >= a.price && run.arcana.length < 5) { run.coins -= a.price; R.addArcana(run, a.id); }
        for (const s of shop.scrolls) if (s.scroll.id === 'star' && run.coins >= s.price) { run.coins -= s.price; run.handLv[s.scroll.hand] = (run.handLv[s.scroll.hand] || 1) + 1; }
        const g = run.deck.find((c) => c.id === 'guard');
        if (g && run.coins >= run.removeCost && run.deck.length > 10 && !hasMod(run, 'hoarder')) { run.coins -= run.removeCost; run.deck = run.deck.filter((x) => x !== g); run.removeCost++; }
      } else if (t === 'event') {
        if (rng() < 0.5) { const a = R.rollArcana(run, rng); if (a) R.addArcana(run, a); } else R.addCoins(run, 5);
        if (rng() < 0.5) { run.stats.quizTry++; if (rng() < 0.7) run.stats.quizOk++; }
      }
    }
  }
  return { win: true, act: 3, log, run };
}
function finish(r) { r.run.stats.playMs = 50 * 60000; r.score = runScore(r.run, r.win); return r; }
const N = Number(process.env.N || 120), V = !!process.env.V, DIFF = process.env.DIFF || 'normal';
if (process.env.MODS) {
  // ランダムモード：とくしゅルールごとの かちりつと スコア
  const per = {}; const scores = []; let wins = 0, total = 0;
  for (let i = 0; i < N; i++) for (const hero of [0, 1, 2]) {
    const seed = 500 + i * 7919 + hero * 13;
    const mods = process.env.MODS === 'random' ? pickMods(makeRng(seed ^ 0x5bd1e995)) : process.env.MODS.split(',');
    const r = finish(simRun(hero, seed, DIFF, mods));
    total++; if (r.win) wins++;
    scores.push(r.score.total);
    for (const m of mods) { const a = per[m] || (per[m] = { n: 0, w: 0 }); a.n++; if (r.win) a.w++; }
  }
  scores.sort((a, b) => a - b);
  console.log(`random mode: win ${(wins / total * 100).toFixed(0)}%  score p10 ${scores[Math.floor(total * 0.1)]} med ${scores[Math.floor(total / 2)]} p90 ${scores[Math.floor(total * 0.9)]} max ${scores[total - 1]}`);
  for (const [m, a] of Object.entries(per).sort((x, y) => x[1].w / x[1].n - y[1].w / y[1].n)) console.log(`${m.padEnd(12)} ${MODS[m].kind.padEnd(5)} score ${String(MODS[m].score).padStart(5)}  n ${String(a.n).padStart(3)}  win ${(a.w / a.n * 100).toFixed(0)}%`);
  process.exit(0);
}
for (const hero of [0, 1, 2]) {
  let wins = 0; const death = { 1: 0, 2: 0, 3: 0 }; const agg = {};
  for (let i = 0; i < N; i++) {
    const r = finish(simRun(hero, 100 + i * 7919 + hero * 13, DIFF));
    if (r.win) wins++; else death[r.act]++;
    SC.push(r.score.total); if (r.win) { SCW.push(r.score); BEST.push(r.run.stats.best); }
    for (const l of r.log) { const k = `A${l.act} ${l.t.padEnd(6)} ${l.ids}`; const a = agg[k] || (agg[k] = { n: 0, turns: 0, lost: 0, d: 0 }); a.n++; a.turns += l.turns; a.lost += l.lost; if (!l.win) a.d++; }
  }
  console.log(`\n=== hero ${hero}: win ${(wins / N * 100).toFixed(0)}%  deaths A1:${death[1]} A2:${death[2]} A3:${death[3]}`);
  const med = (a) => { const x = [...a].sort((p, q) => p - q); return x[Math.floor(x.length / 2)] || 0; };
  console.log('median cast dmg', [1, 2, 3].map((k) => med(DMG[k])).join(' / '), ' block', [1, 2, 3].map((k) => med(BLK[k])).join(' / '));
  for (const k of [1, 2, 3]) { DMG[k] = []; BLK[k] = []; }
  console.log('score median', med(SC), 'p90', [...SC].sort((a, b) => a - b)[Math.floor(SC.length * 0.9)], ' win-score median', med(SCW.map((x) => x.total)));
  if (SCW.length) { const it = {}; for (const sc of SCW) for (const x of sc.items) it[x.id] = (it[x.id] || 0) + 1; console.log('items in wins:', Object.entries(it).map(([k, n]) => `${k}:${Math.round(n / SCW.length * 100)}%`).join(' ')); }
  { const x = BEST.sort((a, b) => a - b); console.log("best hit p25/50/75/90", [0.25, 0.5, 0.75, 0.9].map((q) => x[Math.floor(x.length * q)]).join(" / ")); }
  SC = []; SCW = []; BEST = [];
  if (V) for (const [k, a] of Object.entries(agg).sort()) console.log(k.padEnd(34), 'n', String(a.n).padStart(4), 'turns', (a.turns / a.n).toFixed(1), 'lost', (a.lost / a.n).toFixed(1), 'd', a.d);
}
