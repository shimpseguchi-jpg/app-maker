// ステージの ぶつり（がめんから どくりつ。Node でも うごく）
// たんい：ピクセル。タイル 40px。こてい タイムステップ 1/60 びょう
import { ITEMS, ITEM_WEIGHTS } from '../data/items.js';
import { ROWS } from '../data/stages.js';

export const TILE = 40;
export const DT = 1 / 60;
const GRAV = 2400, JUMP_V = 860, RUN = 260, RUN_W = 28, RUN_H = 36, ENEMY_SPEED = 60;
const DEATH_Y = ROWS * TILE + 120;

const solidChar = (c) => c === '#' || c === '=' || c === '?';

export function createWorld(stage, runners, opts = {}) {
  const { rows } = stage;
  const W = rows[0].length;
  const tiles = rows.map((r) => r.split(''));
  const enemies = []; const checkpoints = []; let startX = 2 * TILE, goalX = (W - 8) * TILE;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < W; x++) {
    const c = tiles[y][x];
    if (c === 'E') { enemies.push({ x: x * TILE + 6, y: y * TILE + TILE - 30, w: 28, h: 30, dir: -1, alive: true }); tiles[y][x] = '.'; }
    else if (c === 'C') { checkpoints.push(x * TILE); tiles[y][x] = '.'; }
    else if (c === 'S') { startX = x * TILE; tiles[y][x] = '.'; }
    else if (c === 'G') { goalX = x * TILE; tiles[y][x] = '.'; }
  }
  const world = {
    tiles, W, H: ROWS, widthPx: W * TILE, enemies, checkpoints, startX, goalX, stage,
    time: 0, finished: 0, projectiles: [], events: [], rng: opts.rng || Math.random,
    runners: runners.map((r, i) => makeRunner(r, i, startX, stage)),
  };
  return world;
}

// r: { id, name, isPlayer, stats:{math,ja,en}, correct:{math,ja,en}, passive, style, skill, actives:[] }
function makeRunner(r, i, startX, stage) {
  const avg = (r.stats.math + r.stats.ja + r.stats.en) / 3;
  const rank = Math.min(7, Math.floor(avg / 100)); // 0..7 ≒ G..S
  const speedMul = (1 + rank * 0.04) * (1 + (r.passive?.speed || 0));
  const maxHp = (avg < 300 ? 3 : avg < 650 ? 4 : 5) + (r.passive?.hp || 0);
  const blocks = {};
  for (const b of stage.blocks) {
    const n = r.correct?.[b.subj] ?? 0;
    blocks[`${b.x},${b.y}`] = { filled: b.idx < n, used: false, subj: b.subj };
  }
  if (r.actives?.includes('golden')) { const e = Object.values(blocks).find((b) => !b.filled); if (e) e.filled = true; }
  return {
    id: r.id, name: r.name, isPlayer: !!r.isPlayer, style: r.style || 'balance', skill: r.skill ?? 0.7,
    x: startX - i * 30, y: (ROWS - 2) * TILE - RUN_H, vx: 0, vy: 0, w: RUN_W, h: RUN_H, onGround: false, face: 1,
    hp: maxHp, maxHp, speedMul, jumpMul: 1 + (r.passive?.jump || 0), zonePower: r.passive?.zonePower || { math: 0, ja: 0, en: 0 },
    stats: r.stats, blocks, items: [], itemSlots: 1 + (r.passive?.itemSlots || 0),
    dashT: 0, shieldT: 0, stunT: 0, invT: 0, deadT: 0, respawnTime: Math.max(1, 3 + (r.passive?.respawn || 0)),
    checkpoint: startX, finish: null, rank: null, dist: 0, deaths: 0, damageTaken: 0, itemsUsed: 0,
    actives: new Set(r.actives || []), usedActives: new Set(), reviveReady: r.actives?.includes('revive'),
    input: { left: false, right: false, jump: false, item: false, special: null }, jumpHeld: false, aiT: 0, aiJumpDelay: 0,
    autorun: !!r.autorun, trail: [],
  };
}

const solidAt = (w, px, py) => {
  const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
  if (tx < 0 || tx >= w.W) return true;
  if (ty < 0) return false; if (ty >= w.H) return false;
  return solidChar(w.tiles[ty][tx]);
};
const charAt = (w, px, py) => {
  const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
  if (tx < 0 || tx >= w.W || ty < 0 || ty >= w.H) return '.';
  return w.tiles[ty][tx];
};
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function moveX(w, e, dx) {
  const nx = e.x + dx; const dir = Math.sign(dx);
  if (dir === 0) return;
  const edge = dir > 0 ? nx + e.w - 1 : nx;
  for (let yy = e.y + 1; yy < e.y + e.h; yy += TILE / 2) {
    if (solidAt(w, edge, yy) || solidAt(w, edge, e.y + e.h - 1)) {
      const tx = Math.floor(edge / TILE);
      e.x = dir > 0 ? tx * TILE - e.w : (tx + 1) * TILE;
      e.vx = 0; e.hitWall = true; return;
    }
  }
  e.x = nx;
}
function moveY(w, e, dy) {
  const ny = e.y + dy; const dir = Math.sign(dy);
  e.onGround = false;
  if (dir === 0) return;
  const edge = dir > 0 ? ny + e.h : ny;
  let hit = false;
  for (let xx = e.x + 2; xx < e.x + e.w - 2 + TILE / 2; xx += TILE / 2) {
    const sx = Math.min(xx, e.x + e.w - 2);
    if (solidAt(w, sx, edge)) { hit = true; e.hitTile = { x: Math.floor(sx / TILE), y: Math.floor(edge / TILE) }; break; }
  }
  if (hit) {
    const ty = Math.floor(edge / TILE);
    if (dir > 0) { e.y = ty * TILE - e.h; e.onGround = true; } else { e.y = (ty + 1) * TILE; }
    e.vy = 0;
  } else e.y = ny;
}

function damage(w, r, amount, src) {
  if (r.shieldT > 0 || r.invT > 0 || r.deadT > 0 || r.finish) return false;
  r.hp -= amount; r.damageTaken += amount; r.invT = 1; r.stunT = Math.max(r.stunT, 0.4);
  w.events.push({ t: 'hurt', id: r.id, src });
  if (r.hp <= 0) die(w, r, src);
  return true;
}
function die(w, r, src) {
  if (r.reviveReady) { r.reviveReady = false; r.usedActives.add('revive'); r.hp = r.maxHp; r.invT = 1.5; r.vy = -JUMP_V * 0.6; w.events.push({ t: 'revive', id: r.id }); return; }
  r.hp = 0; r.deadT = r.respawnTime; r.deaths++; r.vx = 0; r.vy = 0; r.dashT = 0; w.events.push({ t: 'die', id: r.id, src });
}
function respawn(w, r) {
  r.x = r.checkpoint; r.y = (ROWS - 2) * TILE - RUN_H - 2; r.hp = r.maxHp; r.vx = 0; r.vy = 0; r.invT = 1.5; r.deadT = 0; r.stunT = 0;
  w.events.push({ t: 'respawn', id: r.id });
}

function zoneOf(w, px) { const tx = Math.floor(px / TILE); return w.stage.zones.find((z) => tx >= z.x0 && tx < z.x1) || w.stage.zones[w.stage.zones.length - 1]; }
function itemPower(r, subj) { const v = r.stats[subj] || 0; return 1 + Math.min(1, v / 800) * 0.5 + (r.zonePower[subj] || 0); }

function giveItem(w, r, subj) {
  const id = w.rng.weighted ? w.rng.weighted(ITEM_WEIGHTS) : ITEM_WEIGHTS[Math.floor(w.rng() * ITEM_WEIGHTS.length)][0];
  const it = { id, power: itemPower(r, subj), subj };
  if (r.items.length >= r.itemSlots) r.items.shift();
  r.items.push(it);
  w.events.push({ t: 'item', id: r.id, item: id });
}

export function useItem(w, r) {
  if (!r.items.length || r.deadT > 0 || r.stunT > 0) return false;
  const it = r.items.shift(); const I = ITEMS[it.id]; r.itemsUsed++;
  w.events.push({ t: 'use', id: r.id, item: it.id });
  if (it.id === 'dash') r.dashT = I.dur(it.power);
  else if (it.id === 'shield') r.shieldT = I.dur(it.power);
  else if (it.id === 'heart') r.hp = Math.min(r.maxHp, r.hp + I.amount(it.power));
  else if (it.id === 'spring') { r.vy = -JUMP_V * I.mul(it.power) * r.jumpMul; r.onGround = false; }
  else if (it.id === 'ball') w.projectiles.push({ x: r.x + (r.face > 0 ? r.w : -12), y: r.y + 10, w: 12, h: 12, vx: 520 * r.face, owner: r.id, range: I.range(it.power) * TILE, traveled: 0 });
  return true;
}

export function useActive(w, r, id) {
  if (!r.actives.has(id) || r.usedActives.has(id) || r.deadT > 0 || r.finish) return false;
  if (id === 'revive' || id === 'golden') return false; // じどうで はたらく
  r.usedActives.add(id); w.events.push({ t: 'active', id: r.id, card: id });
  if (id === 'startdash') r.dashT = 3;
  else if (id === 'barrier') r.shieldT = 10;
  else if (id === 'warp') { const next = w.checkpoints.find((c) => c > r.x + 10) ?? w.goalX; r.x = next - 5; r.y = (ROWS - 2) * TILE - RUN_H - 2; r.vx = 0; r.vy = 0; }
  else if (id === 'stopall') for (const o of w.runners) if (o !== r) o.stunT = Math.max(o.stunT, 2);
  return true;
}

// ── ライバルの あたま（かんたんな はんのうがた）
// まえの じめんを しらべて、あな・トゲ・かべ・てきまでの きょりで とぶ タイミングを きめる
function senseAhead(w, r) {
  const right = r.x + r.w; const footY = r.y + r.h + 4;
  let pit = Infinity, spike = Infinity, wall = Infinity;
  for (let d = 0; d <= 6 * TILE; d += 8) {
    const px = right + d;
    if (wall === Infinity && (solidAt(w, px, r.y + r.h - 8) || solidAt(w, px, r.y + r.h / 2))) wall = d;
    if (spike === Infinity && charAt(w, px, footY - 12) === '^') spike = d;
    if (pit === Infinity) { let ground = false; for (let yy = footY; yy < w.H * TILE; yy += TILE / 2) if (solidAt(w, px, yy)) { ground = true; break; } if (!ground) pit = d; }
  }
  return { pit, spike, wall };
}
function ai(w, r) {
  const inp = r.input; inp.left = false; inp.right = true; inp.jump = false; inp.item = false;
  if (r.deadT > 0 || r.finish) { inp.right = false; return; }
  r.aiT += DT;
  const { pit, spike, wall } = senseAhead(w, r);
  const enemyAhead = w.enemies.some((e) => e.alive && e.x > r.x && e.x < r.x + 130 && Math.abs(e.y - r.y) < 50);
  const blockAbove = w.stage.blocks.find((b) => Math.abs(b.x * TILE + TILE / 2 - (r.x + r.w / 2)) < 30 && b.y * TILE < r.y && r.blocks[`${b.x},${b.y}`]?.filled && !r.blocks[`${b.x},${b.y}`]?.used);
  let wantJump = false;
  if (r.onGround && pit <= 26) {
    // ミス：うでが ひくいほど、とぶのが おくれて おちる
    if (r.aiJumpDelay === 0) r.aiJumpDelay = w.rng() < r.skill ? -1 : 0.12 + w.rng() * 0.25;
    if (r.aiJumpDelay < 0) { wantJump = true; r.aiJumpDelay = 0; }
    else { r.aiJumpDelay -= DT; if (r.aiJumpDelay <= 0) { wantJump = true; r.aiJumpDelay = 0; } }
  } else if (r.onGround && pit > 26) r.aiJumpDelay = 0;
  if (spike <= 44) wantJump = true;
  if (wall <= 30) wantJump = true;
  if (enemyAhead && w.rng() < 0.08 + r.skill * 0.1) wantJump = true;
  if (blockAbove && r.onGround) wantJump = true;
  if (r.hitWall && r.onGround) wantJump = true;
  if (wantJump && r.onGround) inp.jump = true;
  if (!r.onGround && r.vy < 0) inp.jump = true; // ながおし
  // アイテム
  if (r.items.length && r.aiT > 0.5) {
    const it = r.items[0];
    const aheadOf = (o) => o && o.x > r.x && o.x - r.x < 8 * TILE && Math.abs(o.y - r.y) < 60;
    let use = false;
    if (it.id === 'heart') use = r.hp <= r.maxHp - 1;
    else if (it.id === 'dash') use = pit > 3 * TILE && spike > 3 * TILE && !enemyAhead && (r.style === 'rush' || w.rng() < 0.4);
    else if (it.id === 'shield') use = enemyAhead || spike < 2 * TILE || r.style === 'safe' || w.rng() < 0.2;
    else if (it.id === 'ball') use = w.runners.some((o) => o !== r && aheadOf(o)) && (r.style === 'block' || w.rng() < 0.5);
    else if (it.id === 'spring') use = (wall < 2 * TILE || pit < 2 * TILE) && w.rng() < 0.5;
    if (use) { inp.item = true; r.aiT = 0; }
  }
  // カード（ステージ用）
  if (r.actives.size) {
    if (r.actives.has('startdash') && !r.usedActives.has('startdash') && w.time < 1) inp.special = 'startdash';
    else if (r.actives.has('barrier') && !r.usedActives.has('barrier') && (enemyAhead || spike < 2 * TILE)) inp.special = 'barrier';
    else if (r.actives.has('stopall') && !r.usedActives.has('stopall') && w.runners.some((o) => o !== r && o.x > r.x + 3 * TILE)) inp.special = 'stopall';
    else if (r.actives.has('warp') && !r.usedActives.has('warp') && w.time > 20) inp.special = 'warp';
  }
}

export function step(w) {
  w.time += DT; w.events.length = 0;
  for (const r of w.runners) {
    if (!r.isPlayer || r.robot) ai(w, r);
    const inp = r.input;
    if (inp.special) { useActive(w, r, inp.special); inp.special = null; }
    if (r.deadT > 0) { r.deadT -= DT; if (r.deadT <= 0) respawn(w, r); continue; }
    if (r.finish) continue;
    r.invT = Math.max(0, r.invT - DT); r.dashT = Math.max(0, r.dashT - DT); r.shieldT = Math.max(0, r.shieldT - DT); r.stunT = Math.max(0, r.stunT - DT);
    if (inp.item) { useItem(w, r); inp.item = false; }
    // よこ
    const speed = RUN * r.speedMul * (r.dashT > 0 ? 1.6 : 1);
    let ax = 0;
    if (r.stunT <= 0) { if (inp.right || r.autorun) ax = 1; if (inp.left && !r.autorun) ax = -1; }
    const target = ax * speed;
    r.vx += (target - r.vx) * Math.min(1, DT * (r.onGround ? 14 : 8));
    if (ax) r.face = ax;
    // ジャンプ（おしつづけると たかく）
    if (inp.jump && r.onGround && r.stunT <= 0) { r.vy = -JUMP_V * r.jumpMul; r.onGround = false; r.jumpHeld = true; w.events.push({ t: 'jump', id: r.id }); }
    if (!inp.jump && r.jumpHeld && r.vy < -300) { r.vy = -300; }
    if (!inp.jump) r.jumpHeld = false;
    r.vy = Math.min(1400, r.vy + GRAV * DT);
    r.hitWall = false; r.hitTile = null;
    moveX(w, r, r.vx * DT);
    const wasAir = !r.onGround;
    moveY(w, r, r.vy * DT);
    // ブロック
    if (r.hitTile) {
      const key = `${r.hitTile.x},${r.hitTile.y}`; const b = r.blocks[key];
      if (b && !b.used) { b.used = true; if (b.filled) giveItem(w, r, b.subj); else w.events.push({ t: 'empty', id: r.id }); }
    }
    // トゲ
    const foot = r.y + r.h + 1;
    if (foot % TILE > 14 && (charAt(w, r.x + 6, foot) === '^' || charAt(w, r.x + r.w - 6, foot) === '^')) damage(w, r, 1, 'spike');
    // おちた
    if (r.y > DEATH_Y) { if (r.reviveReady) { r.reviveReady = false; r.usedActives.add('revive'); r.x = r.checkpoint; r.y = (ROWS - 2) * TILE - RUN_H - 2; r.vy = 0; r.invT = 1.5; w.events.push({ t: 'revive', id: r.id }); } else { r.deaths++; r.hp = 0; r.deadT = r.respawnTime; w.events.push({ t: 'die', id: r.id, src: 'pit' }); continue; } }
    // チェックポイント
    for (const c of w.checkpoints) if (r.x + r.w / 2 >= c && r.checkpoint < c) { r.checkpoint = c; w.events.push({ t: 'check', id: r.id }); }
    // ゴール
    if (r.x >= w.goalX) { r.finish = w.time; r.rank = ++w.finished; w.events.push({ t: 'goal', id: r.id, rank: r.rank }); }
    r.dist = Math.max(r.dist, r.x);
    if (r.isPlayer) { r.trail.push([r.x, r.y]); if (r.trail.length > 6) r.trail.shift(); }
  }
  // てき
  for (const e of w.enemies) {
    if (!e.alive) continue;
    const nx = e.x + e.dir * ENEMY_SPEED * DT;
    const frontX = e.dir > 0 ? nx + e.w : nx;
    if (solidAt(w, frontX, e.y + e.h / 2) || !solidAt(w, frontX, e.y + e.h + 2)) e.dir *= -1; else e.x = nx;
    for (const r of w.runners) {
      if (r.deadT > 0 || r.finish || !overlap(r, e)) continue;
      if (r.vy > 0 && r.y + r.h - e.y < 18) { e.alive = false; r.vy = -JUMP_V * 0.5; w.events.push({ t: 'stomp', id: r.id }); }
      else damage(w, r, 1, 'enemy');
    }
  }
  // ランナー どうしの ふみつけ
  for (const a of w.runners) for (const b of w.runners) {
    if (a === b || a.deadT > 0 || b.deadT > 0 || a.finish || b.finish) continue;
    if (a.vy > 0 && overlap(a, b) && a.y + a.h - b.y < 16 && b.stunT <= 0 && b.shieldT <= 0) { b.stunT = 1; a.vy = -JUMP_V * 0.45; w.events.push({ t: 'stompRunner', id: a.id, target: b.id }); }
  }
  // ボール
  for (const p of w.projectiles) {
    const dx = p.vx * DT; p.x += dx; p.traveled += Math.abs(dx);
    if (p.traveled > p.range || solidAt(w, p.x + p.w / 2, p.y + p.h / 2)) { p.dead = true; continue; }
    for (const r of w.runners) {
      if (r.id === p.owner || r.deadT > 0 || r.finish || !overlap(p, r)) continue;
      if (damage(w, r, 1, 'ball')) r.stunT = Math.max(r.stunT, 1);
      p.dead = true; break;
    }
  }
  w.projectiles = w.projectiles.filter((p) => !p.dead);
  return w;
}

export function allFinished(w) { return w.runners.every((r) => r.finish); }
// じゅんいを きめる（ゴールしていない ひとは すすんだ きょりで）
export function ranking(w) {
  return [...w.runners].sort((a, b) => {
    if (a.finish && b.finish) return a.finish - b.finish;
    if (a.finish) return -1; if (b.finish) return 1;
    return b.dist - a.dist;
  });
}
export function progress(w, r) { return Math.max(0, Math.min(1, (r.x - w.startX) / (w.goalX - w.startX))); }
