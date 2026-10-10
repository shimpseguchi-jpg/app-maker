// バランス しらべ：AIが ぼうけんを なんども あそぶ
import * as B from '../js/engine/battle.js';
import * as R from '../js/engine/run.js';
import { runChain, computeHit } from '../js/engine/chain.js';
import { CARDS } from '../js/data/cards.js';
import { makeRng } from '../js/util.js';

const PRED = Number(process.env.PRED ?? 0.6);
const VERBOSE = !!process.env.V;

function* perms(arr, k) {
  if (k === 0) { yield []; return; }
  for (let i = 0; i < arr.length; i++) {
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    for (const p of perms(rest, k - 1)) yield [arr[i], ...p];
  }
}

function bestPlay(b) {
  const playable = b.hand.map((c, i) => i).filter((i) => !CARDS[b.hand[i].id].unplayable);
  const k = Math.min(b.slots.length, playable.length);
  const incoming = B.alive(b).reduce((s, e) => s + (B.intentInfo(b, e).total || 0), 0);
  const needBlock = Math.max(0, incoming - b.pBlock);
  let best = null, bestScore = -1;
  const seen = new Set();
  for (let kk = k; kk >= Math.max(1, k - 1); kk--) {
    for (const p of perms(playable, kk)) {
      const sig = p.map((i) => b.hand[i].id + (b.hand[i].up ? '+' : '')).join(',');
      if (seen.has(sig)) continue; seen.add(sig);
      const slots = Array(b.slots.length).fill(null);
      p.forEach((hi, j) => { slots[j] = b.hand[hi]; });
      const ctx = runChain(slots, B.chainOpts(b));
      const V = ctx.v;
      const targets = ctx.flags.all ? B.alive(b) : [B.alive(b).reduce((a, e) => (e.hp < a.hp ? e : a))];
      let dmg = 0;
      for (const e of targets) {
        const h = computeHit(V, e, ctx.flags, { relics: b.run.relics, predicted: false });
        const eff = Math.max(0, h.dmg - (ctx.flags.pierce ? 0 : e.block));
        dmg += Math.min(e.hp, eff) * ctx.flags.hits + (eff * ctx.flags.hits >= e.hp ? 8 : 0);
      }
      const score = dmg + Math.min(ctx.blockTotal, needBlock) * 1.1 + ctx.blockTotal * 0.05;
      if (score > bestScore) { bestScore = score; best = { p, target: targets[0] && targets[0].uid }; }
    }
  }
  return best;
}

function simBattle(run, ids, kind, rng) {
  const b = B.createBattle(run, ids, kind, rng);
  B.battleStartEffects(b);
  let guard = 0;
  while (!b.over && guard++ < 60) {
    B.startPlayerTurn(b);
    const play = bestPlay(b);
    if (play) {
      // てふだの いちが ずれるので uid で おく
      const insts = play.p.map((i) => b.hand[i]);
      insts.forEach((inst, j) => { const hi = b.hand.indexOf(inst); B.placeCard(b, hi, j); });
      b.target = play.target;
    }
    const pred = rng() < PRED;
    B.executeChain(b, { predicted: pred });
    B.discardHand(b);
    if (b.over) break;
    B.enemyTurn(b);
  }
  return { win: b.over === 'win', turns: b.turn };
}

function simRun(grade, seed) {
  const run = R.newRun({ grade, hero: 0, seed, diff: process.env.DIFF || 'normal' });
  const { rng } = R.runRng(run);
  const log = [];
  for (let floor = 1; floor <= 3; floor++) {
    run.floor = floor;
    if (floor > 1) { run.map = R.genMap(rng, floor); run.pos = null; }
    while (true) {
      const av = R.availableNodes(run);
      if (!av.length) break;
      // AI：HPが すくないと やすみを えらぶ
      let pickId = rng.pick(av);
      const types = av.map((id) => run.map.nodes[id].type);
      if (run.hp < run.maxHp * 0.45 && types.includes('rest')) pickId = av[types.indexOf('rest')];
      else if (run.hp > run.maxHp * 0.7 && types.includes('elite')) pickId = av[types.indexOf('elite')];
      const node = run.map.nodes[pickId];
      run.pos = pickId; run.map.visited.push(pickId);
      const t = node.type;
      if (t === 'battle' || t === 'elite' || t === 'boss') {
        const ids = R.pickEncounter(run, t, rng);
        const hp0 = run.hp;
        const res = simBattle(run, ids, t, rng);
        log.push({ floor, t, ids: ids.join('+'), turns: res.turns, lost: hp0 - run.hp, win: res.win });
        if (!res.win) return { win: false, floor, log, run };
        run.coins += R.battleCoins(run, rng, t);
        if (run.relics.includes('candy')) R.heal(run, 5);
        const offer = R.rollCards(run, rng, { elite: t !== 'battle' });
        if (rng() < 0.85) R.addCard(run, offer[0]);
        if (t === 'elite') R.gainRelic(run, R.rollRelic(run, rng));
        if (t === 'boss') {
          const ch = R.bossRelicChoices(run, rng);
          R.gainRelic(run, rng.pick(ch));
          run.slots += 1;
          R.heal(run, Math.round((run.maxHp - run.hp) * 0.6));
          break;
        }
      } else if (t === 'rest') {
        if (run.hp < run.maxHp * 0.6) R.heal(run, Math.round(run.maxHp * 0.3));
        else { const c = run.deck.find((x) => !x.up && CARDS[x.id].cat !== 'def'); if (c) c.up = true; }
      } else if (t === 'treasure') R.gainRelic(run, R.rollRelic(run, rng));
      else if (t === 'shop') {
        const shop = R.makeShop(run, rng);
        for (const c of shop.cards) if (run.coins >= c.price && rng() < 0.5) { run.coins -= c.price; R.addCard(run, c.id); }
        const weak = run.deck.find((x) => ['p2', 'g4'].includes(x.id));
        if (weak && run.coins >= run.removeCost) { run.coins -= run.removeCost; R.removeCard(run, weak.uid); run.removeCost += 25; }
      } else if (t === 'event') {
        if (rng() < 0.6) R.gainRelic(run, R.rollRelic(run, rng)); else run.coins += 30;
      }
    }
  }
  return { win: true, floor: 3, log, run };
}

const N = Number(process.env.N || 200);
for (const g of [1, 2, 3]) {
  let wins = 0; const death = { 1: 0, 2: 0, 3: 0 };
  const agg = {};
  for (let i = 0; i < N; i++) {
    const r = simRun(g, 1000 + i * 7919 + g);
    if (r.win) wins++; else death[r.floor]++;
    for (const l of r.log) {
      const k = `F${l.floor} ${l.t.padEnd(6)} ${l.ids}`;
      const a = agg[k] || (agg[k] = { n: 0, turns: 0, lost: 0, loss: 0 });
      a.n++; a.turns += l.turns; a.lost += l.lost; if (!l.win) a.loss++;
    }
  }
  console.log(`\n=== がくねん ${g}: かち ${(wins / N * 100).toFixed(0)}%  まけ F1:${death[1]} F2:${death[2]} F3:${death[3]}`);
  if (VERBOSE) for (const [k, a] of Object.entries(agg).sort()) console.log(k.padEnd(40), 'n', String(a.n).padStart(4), 'turns', (a.turns / a.n).toFixed(1), 'lost', (a.lost / a.n).toFixed(1), 'deaths', a.loss);
}
