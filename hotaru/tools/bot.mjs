// じどうで あそぶ ロボット（バランスちょうせい・テストよう）。みえている ものだけで はんだんする
import * as g from '../js/engine/game.js';
import { heroStats } from '../js/engine/hero.js';
import { buyItem, buyEquip } from '../js/engine/camp.js';
import { ITEMS } from '../js/data/items.js';

const { W, H, idx, DIRS } = g;
const adj4 = (G) => DIRS.map(([dx, dy]) => g.mobAt(G, G.hero.x + dx, G.hero.y + dy)).filter(Boolean);
const adj8 = (G) => { const r = []; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const m = (i || j) && g.mobAt(G, G.hero.x + i, G.hero.y + j); if (m) r.push(m); } return r; };

// つぎの こうどうを きめる。skill: 0＝へた（わざ・どうぐを あまり つかわない）〜 1＝じょうず
export function decide(G, P, opt = {}) {
  const skill = opt.skill ?? 1;
  const h = G.hero, S = heroStats(P), has = (id) => P.bag.includes(id);
  const vis = g.visibleMobs(G);
  const stepTo = (x, y) => { const p = g.pathTo(G, x, y); return p && p.length ? { t: 'move', dx: p[0][0], dy: p[0][1] } : null; };
  // あぶない ときは かいふく
  const low = h.hp < S.maxHp * (skill > 0.5 ? 0.4 : 0.25);
  if (low && vis.length) {
    if (has('bigherb') && h.hp < S.maxHp * 0.3) return { t: 'item', id: 'bigherb' };
    if (has('herb')) return { t: 'item', id: 'herb' };
    if (has('bigherb')) return { t: 'item', id: 'bigherb' };
    if (skill > 0.5 && has('flute') && h.hp < S.maxHp * 0.2) return { t: 'item', id: 'flute' };
  }
  if (!vis.length && has('herb') && h.hp < S.maxHp * 0.45) return { t: 'item', id: 'herb' };
  for (const id of ['powseed', 'defseed', 'lifeseed']) if (has(id)) return { t: 'item', id };
  const a4 = adj4(G), a8 = adj8(G);
  if (a8.length) {
    const boss = a8.some((m) => m.kind === 'ryu' || m.kind === 'nushi' || m.kind === 'hasami');
    if (skill > 0.5 && has('bomb') && (boss || a8.length >= 2)) return { t: 'item', id: 'bomb' };
    if (a4.length) { const m = a4.sort((a, b) => a.hp - b.hp)[0]; return { t: 'move', dx: m.x - h.x, dy: m.y - h.y }; }
  }
  if (vis.length) {
    const awake = vis.filter((m) => !m.nap);
    // まっすぐ さきに いれば ひらめき こうげき（もんだいに こたえる）。sparkRate＝つかう わりあい
    if (awake.length && !g.canSpark(G) && Math.random() < (opt.sparkRate ?? 0.7)) return { t: 'spark' };
    if (awake.length) {
      // ちかづいて くる のを まつ（さきに なぐれる）。とおくから うつ まもの には こちらから いく
      const m = awake.sort((a, b) => Math.abs(a.x - h.x) + Math.abs(a.y - h.y) - Math.abs(b.x - h.x) - Math.abs(b.y - h.y))[0];
      const d = Math.abs(m.x - h.x) + Math.abs(m.y - h.y);
      if (d === 2 && skill > 0.5 && G.turn % 4 && !['tokage', 'hinotama', 'ryu', 'kinoko'].includes(m.kind)) return { t: 'wait' };
    }
    for (const m of [...awake, ...vis]) { const s = stepTo(m.x, m.y); if (s) return s; }
  }
  // ひろえる もの
  const want = G.objs.filter((o) => G.seen[idx(o.x, o.y)] && !(o.x === h.x && o.y === h.y) && (o.t === 'gold' || o.t === 'chest' || o.t === 'cage' || (o.t === 'item' && P.bag.length < 12) || (o.t === 'spring' && !o.used && h.hp < S.maxHp * 0.7)));
  let best = null;
  for (const o of want) { const p = g.pathTo(G, o.x, o.y); if (p && p.length && (!best || p.length < best.length)) best = p; }
  if (best) return { t: 'move', dx: best[0][0], dy: best[0][1] };
  // まだ みていない ところ
  const f = frontier(G, true) || frontier(G, false);
  if (f) return f;
  const st = G.objs.find((o) => o.t === 'stairs');
  if (st && h.x === st.x && h.y === st.y) return G.bossAlive ? { t: 'wait' } : { t: 'stairs' };
  if (st && G.seen[idx(st.x, st.y)]) { const s = stepTo(st.x, st.y); if (s) return s; }
  // ボスが のこっている など：みえない まものへ むかう
  const m = G.mobs[0];
  if (m) { const G2 = { ...G, seen: G.seen.map(() => 1) }; const p = g.pathTo(G2, m.x, m.y); if (p && p.length) return { t: 'move', dx: p[0][0], dy: p[0][1] }; }
  return { t: 'wait' };
}
function frontier(G, avoidTraps) {
  const h = G.hero, prev = new Array(W * H).fill(-1), start = idx(h.x, h.y), q = [start];
  prev[start] = start;
  for (let i = 0; i < q.length; i++) {
    const c = q[i], x = c % W, y = Math.floor(c / W);
    if (c !== start && DIRS.some(([dx, dy]) => g.walkable(G, x + dx, y + dy) && !G.seen[idx(x + dx, y + dy)])) {
      let k = c; while (prev[k] !== start) k = prev[k];
      return { t: 'move', dx: (k % W) - h.x, dy: Math.floor(k / W) - h.y };
    }
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy, n = idx(nx, ny);
      if (!g.walkable(G, nx, ny) || !G.seen[n] || prev[n] >= 0) continue;
      const o = g.objAt(G, nx, ny); if (avoidTraps && o && o.t === 'trap') continue;
      if (G.vis[n] && g.mobAt(G, nx, ny)) continue;
      prev[n] = c; q.push(n);
    }
  }
  return null;
}

// キャンプでの かいもの
export function shop(P, { skill = 1 } = {}) {
  for (const k of ['weapon', 'shield']) while (!buyEquip(P, k));
  const count = (id) => P.bag.filter((b) => b === id).length;
  while (count('herb') < (skill > 0.5 ? 5 : 3) && !buyItem(P, 'herb'));
  if (skill > 0.5) { if (count('bomb') < 2) buyItem(P, 'bomb'); if (P.gold > 150 && count('bigherb') < 2) buyItem(P, 'bigherb'); }
}

// 1かいの たんけん（かえる・やられる・クリア まで）
export function playRun(P, floor, seed, opt = {}) {
  let G = g.enterFloor(P, floor, seed++);
  const log = { floors: [], turns: 0, quiz: 0 }, acc = opt.acc ?? 0.8; // acc＝もんだいの せいかいりつ
  for (let t = 0; t < 20000; t++) {
    const a = decide(G, P, opt);
    const answer = () => { const ok = Math.random() < acc; log.quiz++; g.learnReward(G, P, ok, 0); return ok; };
    if (a.t === 'spark') a.ok = answer();
    const ev = g.act(G, P, a);
    log.turns++;
    // もんだい：たからばこ（せいかい するまで）・ほたるの かご（3もん せいかい）
    if (ev.some((e) => e.t === 'askchest')) { const first = answer(); while (!first && !answer()); g.act(G, P, { t: 'unlock', ok: first }); }
    if (ev.some((e) => e.t === 'askcage')) { for (let c = 0; c < 3;) if (answer()) c++; g.act(G, P, { t: 'unlock' }); }
    if (ev.some((e) => e.t === 'kill' && e.boss)) (log.boss ||= {})[G.floor] = P.level;
    if (G.over === 'descend') { log.floors.push({ floor: G.floor, level: P.level, turn: G.turn }); G = g.nextFloor(G, P, seed++); continue; }
    if (G.over) break;
    void ev;
  }
  log.end = G.over || 'timeout'; log.floor = G.floor; log.level = P.level;
  const r = g.finishRun(G, P);
  return { ...log, ...r };
}
