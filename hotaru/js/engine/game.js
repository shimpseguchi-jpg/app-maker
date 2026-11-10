// たんけんの ルール（がめんから どくりつ。Node でも うごく）
// G＝いまの かいの ようす、P＝きろく（レベル・もちもの・ほたる など）
// act(G, P, こうどう) が 1ターン すすめて、おきた ことの ならび（events）を かえす
import { makeRng } from '../../../js/util.js';
import { generate, roomAt, W, H, WALL, idx, inMap } from './mapgen.js';
import { MOBS, SPAWN, LAST_FLOOR, isBossFloor, areaOf } from '../data/enemies.js';
import { ITEMS, BAG_MAX, FLOOR_ITEMS } from '../data/items.js';
import { FIREFLY_LIST } from '../data/fireflies.js';
import { heroStats, gainExp } from './hero.js';

export { W, H, WALL, idx };
export const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const DIRS8 = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];

export const mobAt = (G, x, y) => G.mobs.find((m) => m.x === x && m.y === y);
export const objAt = (G, x, y) => G.objs.find((o) => o.x === x && o.y === y);
export const walkable = (G, x, y) => inMap(x, y) && G.tiles[idx(x, y)] !== WALL;
const dmgOf = (rng, atk, def) => Math.max(1, Math.round(atk * (0.85 + rng() * 0.3) - def));

// ───── かいを つくる ─────
export function enterFloor(P, floor, seed, carry = null) {
  const rng = makeRng(seed);
  const boss = isBossFloor(floor);
  const { tiles, rooms } = generate(rng, { boss });
  const S = heroStats(P);
  const G = { floor, tiles, rooms, seen: new Array(W * H).fill(0), vis: new Array(W * H).fill(0), mobs: [], objs: [], turn: 0, nextId: 1, bossAlive: boss, over: null, rs: 0,
    hero: { x: 0, y: 0, hp: carry ? Math.min(carry.hp, S.maxHp) : S.maxHp, poison: carry ? carry.poison : 0, sleep: 0, dir: [0, 1] } };
  const normal = rooms.filter((r) => !r.big);
  const start = rng.pick(normal);
  const center = (r) => [r.x + Math.floor(r.w / 2), r.y + Math.floor(r.h / 2)];
  [G.hero.x, G.hero.y] = center(start);
  const d2 = (r) => { const [cx, cy] = center(r); return (cx - G.hero.x) ** 2 + (cy - G.hero.y) ** 2; };
  const goal = boss ? rooms.find((r) => r.big) : normal.filter((r) => r !== start).sort((a, b) => d2(b) - d2(a))[0];
  const taken = new Set([idx(G.hero.x, G.hero.y)]);
  const freeIn = (r, margin = 0) => {
    for (let t = 0; t < 60; t++) {
      const x = rng.int(r.x + margin, r.x + r.w - 1 - margin), y = rng.int(r.y + margin, r.y + r.h - 1 - margin);
      if (!taken.has(idx(x, y))) { taken.add(idx(x, y)); return [x, y]; }
    }
    return null;
  };
  const put = (r, o) => { const p = freeIn(r); if (p) G.objs.push({ ...o, x: p[0], y: p[1] }); };
  const others = rooms.filter((r) => r !== start);
  // かいだん
  const [gx, gy] = center(goal);
  if (boss) {
    taken.add(idx(gx, gy));
    spawn(G, areaOf(floor).boss, gx, gy, { alertOnSight: true });
    const p = freeIn(goal); G.objs.push({ t: 'stairs', x: p[0], y: p[1] });
    put(start, { t: 'spring' });
  } else {
    put(goal, { t: 'stairs' });
    if (rng.chance(0.3)) put(rng.pick(rooms), { t: 'spring' });
  }
  // まいごの ほたる
  const cage = FIREFLY_LIST.filter((f) => f.from === 'floor' && f.floors.includes(floor) && !P.fireflies.includes(f.id));
  if (cage.length) put(rng.pick(others), { t: 'cage', id: cage[0].id });
  // たからばこ・どうぐ・おかね・わな
  if (rng.chance(floor % 3 === 2 ? 1 : 0.5)) put(rng.pick(others), { t: 'chest' });
  for (let i = rng.int(3, 5); i > 0; i--) put(rng.pick(rooms), { t: 'item', id: rng.weighted(FLOOR_ITEMS) });
  for (let i = rng.int(2, 4); i > 0; i--) put(rng.pick(rooms), { t: 'gold', n: rng.int(4, 9) + floor * 2 });
  if (floor >= 2) for (let i = rng.int(1, 3); i > 0; i--) put(rng.pick(others), { t: 'trap', kind: rng.pick(['warp', 'sleep', 'spike']) });
  // まもの（さいしょの へやには おかない）
  const n = boss ? 2 : 3 + Math.floor(floor / 2) + rng.int(0, 1);
  for (let i = 0; i < n; i++) {
    const r = rng.pick(boss ? others.filter((o) => !o.big) : others);
    const p = freeIn(r);
    if (p) spawn(G, rng.weighted(SPAWN[floor]), p[0], p[1], { nap: rng() });
  }
  G.rs = rng.state();
  updateFov(G, P);
  return G;
}
function spawn(G, kind, x, y, { nap = 1, alert = false } = {}) {
  const d = MOBS[kind];
  const m = { id: G.nextId++, kind, x, y, hp: d.hp, alert, nap: nap < (d.nap || 0), stun: 0, energy: 0, cd: 0, n: 0 };
  G.mobs.push(m);
  return m;
}
export function nextFloor(G, P, seed) {
  P.deepest = Math.max(P.deepest, G.floor);
  return enterFloor(P, G.floor + 1, seed, { hp: G.hero.hp, poison: G.hero.poison });
}

// ───── みえる はんい ─────
function los(G, x0, y0, x1, y1) {
  let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy, x = x0, y = y0;
  while (x !== x1 || y !== y1) {
    if ((x !== x0 || y !== y0) && G.tiles[idx(x, y)] === WALL) return false;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
  return true;
}
export function updateFov(G, P) {
  const R = heroStats(P).light, h = G.hero;
  G.vis.fill(0);
  for (let y = h.y - R; y <= h.y + R; y++) for (let x = h.x - R; x <= h.x + R; x++) {
    if (!inMap(x, y) || (x - h.x) ** 2 + (y - h.y) ** 2 > R * R + R) continue;
    if (los(G, h.x, h.y, x, y)) { G.vis[idx(x, y)] = 1; G.seen[idx(x, y)] = 1; }
  }
  for (const m of G.mobs) if (G.vis[idx(m.x, m.y)]) P.seen[m.kind] = 1;
}
export const visibleMobs = (G) => G.mobs.filter((m) => G.vis[idx(m.x, m.y)]);

function distMap(G) {
  const d = new Array(W * H).fill(-1), q = [[G.hero.x, G.hero.y]];
  d[idx(G.hero.x, G.hero.y)] = 0;
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i];
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (walkable(G, nx, ny) && d[idx(nx, ny)] < 0) { d[idx(nx, ny)] = d[idx(x, y)] + 1; q.push([nx, ny]); }
    }
  }
  return d;
}

// いま いる ばしょから (tx,ty) までの みち（みた ことの ある ばしょ だけを とおる）。[[dx,dy], ...] か null
export function pathTo(G, tx, ty, avoidTraps = true) {
  if (!inMap(tx, ty) || !G.seen[idx(tx, ty)] || !walkable(G, tx, ty)) return null;
  const prev = new Array(W * H).fill(-1), start = idx(G.hero.x, G.hero.y), goal = idx(tx, ty), q = [start];
  prev[start] = start;
  for (let i = 0; i < q.length && prev[goal] < 0; i++) {
    const c = q[i], x = c % W, y = Math.floor(c / W);
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy, n = idx(nx, ny);
      if (!walkable(G, nx, ny) || !G.seen[n] || prev[n] >= 0) continue;
      if (n !== goal && G.vis[n] && mobAt(G, nx, ny)) continue;
      const o = objAt(G, nx, ny);
      if (avoidTraps && n !== goal && o && o.t === 'trap') continue; // わなは よけて とおる
      prev[n] = c; q.push(n);
    }
  }
  if (prev[goal] < 0) return avoidTraps ? pathTo(G, tx, ty, false) : null; // わなを ふまないと いけない とき
  const steps = [];
  for (let c = goal; c !== start; c = prev[c]) { const p = prev[c]; steps.unshift([(c % W) - (p % W), Math.floor(c / W) - Math.floor(p / W)]); }
  return steps;
}

// ───── 1ターン ─────
// a: { t:'move', dx, dy } / { t:'wait' } / { t:'spark', ok } / { t:'unlock', ok } / { t:'item', id } / { t:'stairs' }
export function act(G, P, a) {
  const ev = [];
  if (G.over) return ev;
  const rng = makeRng(G.rs), h = G.hero;
  let S = heroStats(P);
  let used = false;
  if (h.sleep > 0 && a.t !== 'stairs') { h.sleep--; ev.push({ t: 'msg', text: 'ぐうぐう… ねむっていて うごけない！' }); used = true; }
  else if (a.t === 'move') used = move(G, P, S, rng, ev, a.dx, a.dy);
  else if (a.t === 'wait') used = true;
  else if (a.t === 'spark') used = spark(G, P, S, rng, ev, a.ok);
  else if (a.t === 'unlock') used = unlock(G, P, rng, ev, a.ok);
  else if (a.t === 'item') used = useItem(G, P, S, rng, ev, a.id);
  else if (a.t === 'stairs') {
    const o = objAt(G, h.x, h.y);
    if (o && o.t === 'stairs' && !G.bossAlive) { G.over = 'descend'; ev.push({ t: 'descend' }); }
  }
  if (used && !G.over) {
    S = heroStats(P);
    G.turn++;
    if (G.turn % S.regenEvery === 0 && h.hp < S.maxHp) h.hp++;
    if (h.poison > 0) { h.poison--; if (h.hp > 1) { h.hp--; ev.push({ t: 'poison' }); } if (!h.poison) ev.push({ t: 'msg', text: 'どくが きえた。' }); }
    mobsTurn(G, P, S, rng, ev);
    h.hp = Math.min(h.hp, S.maxHp);
    if (h.hp <= 0) { h.hp = 0; G.over = 'dead'; ev.push({ t: 'dead' }); }
  }
  updateFov(G, P);
  G.rs = rng.state();
  return ev;
}

function move(G, P, S, rng, ev, dx, dy) {
  const h = G.hero, nx = h.x + dx, ny = h.y + dy;
  h.dir = [dx, dy];
  if (!walkable(G, nx, ny)) { ev.push({ t: 'bump' }); return false; }
  const m = mobAt(G, nx, ny);
  if (m) { attack(G, P, S, rng, ev, m, 1, 'hit'); return true; }
  h.x = nx; h.y = ny;
  ev.push({ t: 'step' });
  stepOn(G, P, S, rng, ev);
  return true;
}

function attack(G, P, S, rng, ev, m, mult, how) {
  const d = MOBS[m.kind];
  let dmg = dmgOf(rng, S.atk * mult, d.def), crit = false, sneak = false;
  if (m.nap) { dmg *= 2; sneak = true; m.nap = false; }
  else if (how === 'hit' && rng() * 100 < S.crit) { dmg = Math.round(dmg * 1.6); crit = true; }
  m.alert = true;
  m.hp -= dmg;
  ev.push({ t: 'hit', id: m.id, x: m.x, y: m.y, dmg, crit, sneak, how });
  if (m.hp <= 0) kill(G, P, S, rng, ev, m);
}
function kill(G, P, S, rng, ev, m) {
  const d = MOBS[m.kind];
  G.mobs = G.mobs.filter((o) => o !== m);
  const exp = d.exp, gold = Math.round(d.gold * (0.7 + rng() * 0.6));
  P.gold += gold;
  ev.push({ t: 'kill', id: m.id, kind: m.kind, x: m.x, y: m.y, exp, gold, boss: !!d.boss });
  addExp(G, P, exp, ev);
  if (d.boss) {
    G.bossAlive = false;
    if (!P.bosses.includes(G.floor)) P.bosses.push(G.floor);
    const f = FIREFLY_LIST.find((x) => x.from === 'boss' && x.floor === G.floor && !P.fireflies.includes(x.id));
    if (f) joinFirefly(G, P, ev, f.id);
    if (G.floor >= LAST_FLOOR) { G.over = 'clear'; P.deepest = LAST_FLOOR; ev.push({ t: 'clear' }); } else ev.push({ t: 'bossdown' });
  }
}
function addExp(G, P, exp, ev) {
  const hpBefore = heroStats(P).maxHp;
  if (!gainExp(P, exp)) return;
  if (G) { const S2 = heroStats(P); G.hero.hp = Math.min(S2.maxHp, G.hero.hp + (S2.maxHp - hpBefore) + Math.ceil(S2.maxHp * 0.2)); }
  ev.push({ t: 'levelup', level: P.level });
}
// もんだいに こたえた ごほうび：せいかいで けいけんち（ふかい かい ほど おおい）と HPの かいふく。れんぞく せいかいで おまけ
export function learnReward(G, P, ok, combo = 0) {
  const ev = [];
  if (!ok) return ev;
  const floor = G ? G.floor : Math.max(1, P.deepest);
  const exp = Math.round((2 + floor) * (combo >= 5 ? 1.5 : 1));
  ev.push({ t: 'learnexp', exp });
  addExp(G, P, exp, ev);
  if (G && G.hero.hp > 0) { // めいきゅうの なかでは HPも すこし かいふく
    const max = heroStats(P).maxHp, n = Math.min(max - G.hero.hp, Math.ceil(max * 0.1));
    if (n > 0) { G.hero.hp += n; ev.push({ t: 'learnheal', n }); }
  }
  return ev;
}
function joinFirefly(G, P, ev, id) {
  P.fireflies.push(id);
  G.hero.hp = Math.min(heroStats(P).maxHp, G.hero.hp + 10); // さいだい HPが ふえ、すこし かいふく
  ev.push({ t: 'firefly', id });
}

function stepOn(G, P, S, rng, ev) {
  const h = G.hero, o = objAt(G, h.x, h.y);
  if (!o) return;
  const remove = () => { G.objs = G.objs.filter((x) => x !== o); };
  if (o.t === 'item') {
    if (P.bag.length >= BAG_MAX) { ev.push({ t: 'bagfull', id: o.id }); return; }
    P.bag.push(o.id); remove(); ev.push({ t: 'pickup', id: o.id });
  } else if (o.t === 'gold') {
    const n = o.n;
    P.gold += n; remove(); ev.push({ t: 'gold', n });
  } else if (o.t === 'chest') {
    ev.push({ t: 'askchest' }); // もんだいに こたえると あく（unlock）
  } else if (o.t === 'spring') {
    if (o.used) return;
    o.used = true; h.hp = S.maxHp; h.poison = 0; ev.push({ t: 'spring' });
  } else if (o.t === 'cage') {
    ev.push({ t: 'askcage', id: o.id });
  } else if (o.t === 'trap') {
    remove();
    if (o.kind === 'warp') { warp(G, rng); ev.push({ t: 'trap', kind: 'warp' }); }
    else if (o.kind === 'sleep') { h.sleep = 2; ev.push({ t: 'trap', kind: 'sleep' }); }
    else { const dmg = Math.min(h.hp - 1, 3 + G.floor); h.hp -= dmg; ev.push({ t: 'trap', kind: 'spike', dmg }); }
  } else if (o.t === 'stairs') {
    ev.push({ t: 'onstairs', locked: G.bossAlive });
  }
}
// たからばこ・ほたるの かごを あける。ok＝さいしょの 1もんで せいかい した（たからばこの なかみが よくなる）
function unlock(G, P, rng, ev, ok) {
  const o = objAt(G, G.hero.x, G.hero.y);
  if (!o || (o.t !== 'chest' && o.t !== 'cage')) return false;
  G.objs = G.objs.filter((x) => x !== o);
  if (o.t === 'chest') openChest(G, P, rng, ev, ok); else joinFirefly(G, P, ev, o.id);
  return true;
}
function openChest(G, P, rng, ev, ok) {
  const cap = Math.min(4, areaOf(G.floor).id + 1 + (G.floor >= 8 ? 1 : 0)); // ひかりの そうびは 8かい から
  const canW = P.weapon < cap, canS = P.shield < cap;
  if ((canW || canS) && rng.chance(ok ? 0.75 : 0.4)) {
    const w = canW && (!canS || P.weapon <= P.shield);
    if (w) { P.weapon++; ev.push({ t: 'chest', equip: 'weapon', tier: P.weapon }); } else { P.shield++; ev.push({ t: 'chest', equip: 'shield', tier: P.shield }); }
    return;
  }
  const id = rng.pick(['powseed', 'defseed', 'lifeseed', 'bigherb']);
  const gold = Math.round((20 + G.floor * 8) * (ok ? 1.5 : 1));
  P.gold += gold;
  if (P.bag.length < BAG_MAX) { P.bag.push(id); ev.push({ t: 'chest', id, gold, ok }); } else ev.push({ t: 'chest', gold, ok });
}
function warp(G, rng) {
  for (let t = 0; t < 200; t++) {
    const r = rng.pick(G.rooms), x = rng.int(r.x, r.x + r.w - 1), y = rng.int(r.y, r.y + r.h - 1);
    if (!mobAt(G, x, y) && !objAt(G, x, y)) { G.hero.x = x; G.hero.y = y; return; }
  }
}

// まっすぐ さきで いちばん ちかい まもの
function lineTarget(G, range) {
  const h = G.hero;
  let best = null;
  const dirs = [h.dir, ...DIRS.filter((d) => d[0] !== h.dir[0] || d[1] !== h.dir[1])];
  for (const [dx, dy] of dirs) {
    for (let k = 1; k <= range; k++) {
      const x = h.x + dx * k, y = h.y + dy * k;
      if (!walkable(G, x, y)) break;
      const m = mobAt(G, x, y);
      if (m) { if (G.vis[idx(x, y)] && (!best || k < best.k)) best = { m, k, dir: [dx, dy] }; break; }
    }
  }
  return best;
}
const around = (G) => DIRS8.map(([dx, dy]) => mobAt(G, G.hero.x + dx, G.hero.y + dy)).filter(Boolean);

// ひらめき こうげき：もんだいに せいかい すると、まっすぐ さきの まものへ つよい ひかりを とばす
// つかえない ときは りゆうの ぶんを かえす
export const SPARK_RANGE = 5, SPARK_POWER = 2.5;
export function canSpark(G) {
  if (G.hero.sleep > 0) return 'ねむっていて つかえない！';
  if (!lineTarget(G, SPARK_RANGE)) return 'まっすぐ さきに まものが いない。';
  return null;
}
// ok＝もんだいに せいかい した。まちがえると からぶり（ターンだけ すすむ）
function spark(G, P, S, rng, ev, ok) {
  const no = canSpark(G);
  if (no) { ev.push({ t: 'msg', text: no }); return false; }
  const tg = lineTarget(G, SPARK_RANGE);
  G.hero.dir = tg.dir;
  if (!ok) { ev.push({ t: 'sparkmiss' }); return true; }
  ev.push({ t: 'beam', x: tg.m.x, y: tg.m.y, from: 'hero' });
  attack(G, P, S, rng, ev, tg.m, SPARK_POWER, 'spark');
  return true;
}

function useItem(G, P, S, rng, ev, id) {
  const i = P.bag.indexOf(id), it = ITEMS[id], h = G.hero;
  if (i < 0) return false;
  if (it.use === 'heal') {
    if (h.hp >= S.maxHp && !h.poison) { ev.push({ t: 'msg', text: 'HPは まんたん。' }); return false; }
    const n = Math.min(S.maxHp - h.hp, it.n);
    h.hp += n; h.poison = 0; ev.push({ t: 'heal', n, item: id });
  } else if (it.use === 'bomb') {
    const ms = around(G);
    if (!ms.length) { ev.push({ t: 'msg', text: 'まわりに まものが いない。' }); return false; }
    ev.push({ t: 'bomb' });
    const pw = 12 + G.floor * 3;
    ms.forEach((m) => {
      const dmg = Math.max(1, pw - MOBS[m.kind].def); m.hp -= dmg; m.alert = true; m.nap = false;
      ev.push({ t: 'hit', id: m.id, x: m.x, y: m.y, dmg, how: 'bomb' });
      if (m.hp <= 0) kill(G, P, S, rng, ev, m);
    });
  } else if (it.use === 'sleep') {
    const ms = visibleMobs(G);
    if (!ms.length) { ev.push({ t: 'msg', text: 'ちかくに まものが いない。' }); return false; }
    ms.forEach((m) => { m.stun = MOBS[m.kind].boss ? 3 : 6; });
    ev.push({ t: 'sleepall', n: ms.length });
  } else if (it.use === 'warp') {
    warp(G, rng); ev.push({ t: 'warp' });
  } else if (it.use === 'map') {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (walkable(G, x, y)) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) if (inMap(x + k, y + j)) G.seen[idx(x + k, y + j)] = 1;
    }
    ev.push({ t: 'mapped' });
  } else if (it.use === 'return') {
    G.over = 'return'; ev.push({ t: 'return' });
  } else if (it.use === 'seed') {
    P.seeds[it.stat] += it.n; if (it.stat === 'hp') h.hp += it.n;
    ev.push({ t: 'seed', id });
  }
  P.bag.splice(P.bag.indexOf(id), 1);
  return true;
}

// ───── まものの ばん ─────
function mobsTurn(G, P, S, rng, ev) {
  const h = G.hero;
  let dist = distMap(G);
  for (const m of G.mobs.slice()) {
    if (G.over || !G.mobs.includes(m)) continue;
    const d = MOBS[m.kind];
    if (m.stun > 0) { m.stun--; continue; }
    if (m.nap) { // ねている。となりに くると おきる ことが ある
      if (Math.max(Math.abs(m.x - h.x), Math.abs(m.y - h.y)) <= 1 && rng.chance(0.3)) { m.nap = false; m.alert = true; ev.push({ t: 'wake', id: m.id }); }
      continue;
    }
    if (!m.alert) {
      if (G.vis[idx(m.x, m.y)]) { m.alert = true; ev.push({ t: 'notice', id: m.id, kind: m.kind }); continue; }
      if (d.ai !== 'still' && rng.chance(0.4)) { const [dx, dy] = rng.pick(DIRS); tryMove(G, m, m.x + dx, m.y + dy); }
      continue;
    }
    m.energy += d.speed;
    while (m.energy >= 1 && h.hp > 0) {
      m.energy -= 1;
      mobAct(G, P, S, rng, ev, m, d, dist);
    }
  }
}
function tryMove(G, m, x, y) {
  if (!walkable(G, x, y) || mobAt(G, x, y) || (G.hero.x === x && G.hero.y === y)) return false;
  m.x = x; m.y = y; return true;
}
function mobAct(G, P, S, rng, ev, m, d, dist) {
  const h = G.hero, ax = Math.abs(m.x - h.x), ay = Math.abs(m.y - h.y);
  m.n++; if (m.cd > 0) m.cd--;
  if (d.summon && m.n % 6 === 0 && G.mobs.length < 4) {
    const spots = DIRS8.map(([dx, dy]) => [m.x + dx, m.y + dy]).filter(([x, y]) => walkable(G, x, y) && !mobAt(G, x, y) && !(h.x === x && h.y === y));
    if (spots.length) { const [x, y] = rng.pick(spots); const s = spawn(G, d.summon, x, y, { alert: true }); ev.push({ t: 'summon', id: s.id, kind: s.kind }); return; }
  }
  if (ax + ay === 1) { hurt(G, S, rng, ev, m, d, 1, 'hit'); return; }
  if (d.ai === 'ranged' && (ax === 0 || ay === 0) && ax + ay <= d.range && m.cd <= 0 && clearLine(G, m.x, m.y, h.x, h.y)) {
    m.cd = d.cool || 0;
    ev.push({ t: 'beam', x: h.x, y: h.y, from: m.id, fx: m.x, fy: m.y });
    hurt(G, S, rng, ev, m, d, 0.75, 'shot');
    return;
  }
  if (d.ai === 'still') return;
  // しゅじんこうへ ちかづく
  const here = dist[idx(m.x, m.y)];
  const opts = DIRS.map(([dx, dy]) => [m.x + dx, m.y + dy]).filter(([x, y]) => walkable(G, x, y) && dist[idx(x, y)] >= 0 && dist[idx(x, y)] < here && !mobAt(G, x, y) && !(h.x === x && h.y === y));
  if (opts.length) { const [x, y] = rng.pick(opts); m.x = x; m.y = y; }
}
function clearLine(G, x0, y0, x1, y1) {
  const dx = Math.sign(x1 - x0), dy = Math.sign(y1 - y0);
  for (let x = x0 + dx, y = y0 + dy; x !== x1 || y !== y1; x += dx, y += dy) if (!walkable(G, x, y) || mobAt(G, x, y)) return false;
  return true;
}
function hurt(G, S, rng, ev, m, d, mult, how) {
  const h = G.hero, dmg = dmgOf(rng, d.atk * mult, S.def);
  h.hp -= dmg;
  let poison = false;
  if (d.poison && !h.poison && rng.chance(0.5)) { h.poison = d.poison; poison = true; }
  ev.push({ t: 'hurt', id: m.id, kind: m.kind, dmg, poison, how });
}

// ───── たんけんの おわり ─────
export function finishRun(G, P) {
  P.runs++;
  P.deepest = Math.max(P.deepest, G.over === 'clear' ? LAST_FLOOR : G.floor - 1);
  if (G.over === 'dead') { const lost = Math.floor(P.gold / 2); P.gold -= lost; P.falls++; return { lost }; }
  if (G.over === 'clear') P.clears++;
  return { lost: 0 };
}
// はじめられる かい（ボスを たおすと つぎの エリアから はじめられる）
export function startFloors(P) {
  const list = [1];
  if (P.bosses.includes(3)) list.push(4);
  if (P.bosses.includes(6)) list.push(7);
  return list;
}
