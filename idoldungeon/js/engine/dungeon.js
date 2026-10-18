// ダンジョン探索のルール（画面から独立。エルミナージュ準拠：docs/DESIGN.md「10. ダンジョン探索」）
// 向き dir: 0 北 / 1 東 / 2 南 / 3 西。座標は x 東・y 北
import { DUNGEONS } from '../data/floors.js';

export const DIR_NAME = ['北', '東', '南', '西'];
export const DX = [0, 1, 0, -1];
export const DY = [1, 0, -1, 0];
const ONEWAY = { '^': 0, '>': 1, 'v': 2, '<': 3 };
const WALL = new Set(['|', '-', '+']);

// ── マップの読み込み ──
const cache = new Map();
export function getFloor(dungeonId, index) {
  const key = dungeonId + ':' + index;
  if (!cache.has(key)) cache.set(key, parseFloor(DUNGEONS[dungeonId].floors[index]));
  return cache.get(key);
}

export function parseFloor(f) {
  const rows = f.map;
  const h = (rows.length - 1) / 2, w = (rows[0].length - 1) / 2;
  if (!Number.isInteger(h) || !Number.isInteger(w) || rows.some((r) => r.length !== rows[0].length)) {
    throw new Error(`${f.id}: マップの大きさが不正`);
  }
  const at = (x, y) => [2 * (h - 1 - y) + 1, 2 * x + 1];
  const cellAt = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return ' ';
    const [r, c] = at(x, y);
    return rows[r][c];
  };
  const edgeAt = (x, y, dir) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return '|';
    const [r, c] = at(x, y);
    return rows[r - DY[dir]][c + DX[dir]];
  };
  const byCell = new Map(), byEdge = new Map();
  for (const s of f.specials || []) {
    if (s.dir != null) {
      byEdge.set(`${s.x},${s.y},${s.dir}`, s);
      byEdge.set(`${s.x + DX[s.dir]},${s.y + DY[s.dir]},${(s.dir + 2) % 4}`, s);
    } else byCell.set(`${s.x},${s.y}`, s);
  }
  return { ...f, w, h, cellAt, edgeAt,
    special: (x, y) => byCell.get(`${x},${y}`) || null,
    edgeSpecial: (x, y, dir) => byEdge.get(`${x},${y},${dir}`) || null };
}

export const isSolid = (ch) => ch === ' ';
export const isDark = (ch) => ch === '#';
export const isAntiMagic = (ch) => ch === 'm';

// ── 境目の見え方と通りやすさ ──
// 戻り値 kind: open / wall / door / locked / gate / secret（見つける前は wall に見える）
export function edgeInfo(fl, st, x, y, dir) {
  const ch = fl.edgeAt(x, y, dir);
  if (ch === ' ') return { kind: 'open', pass: true };
  if (WALL.has(ch)) return { kind: 'wall', pass: false };
  if (ch === 'D') return { kind: 'door', pass: true };
  if (ch === 'S') {
    const found = !!st.found[secretKey(st, x, y, dir)];
    return found ? { kind: 'door', pass: true, secret: true } : { kind: 'wall', pass: false, hidden: true };
  }
  if (ch === 'L') {
    const key = fl.edgeSpecial(x, y, dir)?.key;
    return { kind: 'locked', pass: !!key && st.keys.includes(key), key };
  }
  if (ch === 'G') {
    const flag = fl.edgeSpecial(x, y, dir)?.flag;
    return { kind: 'gate', pass: !!st.flags[flag] };
  }
  if (ch in ONEWAY) {
    // 通れる側からは扉、反対側からは壁に見える
    return ONEWAY[ch] === dir ? { kind: 'door', pass: true, oneway: true } : { kind: 'wall', pass: false };
  }
  return { kind: 'wall', pass: false };
}
// シークレットドアは両側で同じ扱いにする（どちらから見つけても開く）
function secretKey(st, x, y, dir) {
  const a = `${x},${y},${dir}`, b = `${x + DX[dir]},${y + DY[dir]},${(dir + 2) % 4}`;
  return `${st.floor}:${a < b ? a : b}`;
}

// ── 探索の状態 ──
// 迷宮ごとに分けて持つもの（鍵・スイッチ・見つけた隠し扉・オートマップ・済んだイベント）
const PER_DUNGEON = ['keys', 'flags', 'found', 'seen', 'done'];
const freshPer = () => ({ keys: [], flags: {}, found: {}, seen: {}, done: {} });

// 別の迷宮へ：今の迷宮の記録をしまい、行き先の記録を出して入口に立つ
export function switchDungeon(st, id) {
  st.maps ||= {};
  if (st.dungeon !== id) {
    st.maps[st.dungeon] = Object.fromEntries(PER_DUNGEON.map((k) => [k, st[k]]));
    Object.assign(st, st.maps[id] || freshPer());
    st.dungeon = id;
  }
  const s = DUNGEONS[id].start;
  Object.assign(st, { floor: 0, x: s.x, y: s.y, dir: s.dir, prev: null });
}

export function newExplore(dungeonId = 'd1') {
  const s = DUNGEONS[dungeonId].start;
  return { dungeon: dungeonId, floor: 0, x: s.x, y: s.y, dir: s.dir, prev: null, steps: 0,
    keys: [], flags: {}, found: {}, seen: {}, done: {}, trip: {}, bossClears: {} };
}

// 歩いたマスと、そのまわりの壁をオートマップに記録する（ダークゾーンでは記録しない）
export function markSeen(st) {
  const fl = getFloor(st.dungeon, st.floor);
  if (isDark(fl.cellAt(st.x, st.y))) return;
  const m = (st.seen[st.floor] ||= {});
  m[`${st.x},${st.y}`] = 1;
}

// 行動：forward back turnL turnR turnBack strafeL strafeR search
// 戻り値 { msgs: [文字列], events: [{ type, ... }] }（events は戦闘・階段など、画面側で続きを決めるもの）
// ctx: { rng, flying: 落とし穴を無視できる人の数など、パーティ側の情報 }
export function act(st, action, ctx = {}) {
  const rng = ctx.rng || Math.random;
  const out = { msgs: [], events: [] };
  switch (action) {
    case 'turnL': st.dir = (st.dir + 3) % 4; return out;
    case 'turnR': st.dir = (st.dir + 1) % 4; return out;
    case 'turnBack': st.dir = (st.dir + 2) % 4; return out;
    case 'search': return search(st, ctx, out);
    case 'forward': return step(st, st.dir, ctx, out, rng);
    case 'back': return step(st, (st.dir + 2) % 4, ctx, out, rng);
    case 'strafeL': return step(st, (st.dir + 3) % 4, ctx, out, rng);
    case 'strafeR': return step(st, (st.dir + 1) % 4, ctx, out, rng);
    default: throw new Error('不明な行動: ' + action);
  }
}

function step(st, dir, ctx, out, rng) {
  const fl = getFloor(st.dungeon, st.floor);
  const e = edgeInfo(fl, st, st.x, st.y, dir);
  if (!e.pass) {
    if (e.kind === 'locked') out.msgs.push('鍵がかかっている');
    else if (e.kind === 'gate') out.msgs.push('扉は固く閉ざされている。どこかに仕掛けがありそうだ');
    else out.msgs.push('壁だ');
    out.events.push({ type: 'bump' });
    return out;
  }
  if (e.kind === 'locked') out.msgs.push('「' + keyName(e.key) + '」で扉を開けた');
  const nx = st.x + DX[dir], ny = st.y + DY[dir];
  if (isSolid(fl.cellAt(nx, ny))) { out.msgs.push('壁だ'); out.events.push({ type: 'bump' }); return out; }
  st.prev = { x: st.x, y: st.y };
  st.x = nx; st.y = ny; st.steps++;
  enterCell(st, ctx, out, rng, true);
  return out;
}

export const KEY_NAMES = { silverKey: '銀の鍵', propKey: '小道具部屋の鍵' };
const keyName = (k) => KEY_NAMES[k] || k;

// マスに入ったときの仕掛け。walked=false はワープ・落下で来たとき（遭遇判定をしない）
function enterCell(st, ctx, out, rng, walked) {
  const fl = getFloor(st.dungeon, st.floor);
  const ch = fl.cellAt(st.x, st.y);
  markSeen(st);
  if (isDark(ch) && !isDark(fl.cellAt(st.prev?.x ?? -1, st.prev?.y ?? -1))) out.msgs.push('ダークゾーンに入った。何も見えない');
  if (isAntiMagic(ch) && !isAntiMagic(fl.cellAt(st.prev?.x ?? -1, st.prev?.y ?? -1))) out.msgs.push('呪文禁止エリアだ');

  if (ch === 'p') {
    out.msgs.push('ピットだ！');
    out.events.push({ type: 'pit', max: fl.pit || 4 });
  } else if (ch === 'c') {
    out.msgs.push('床が抜けた！ 下の階へ落ちていく……');
    st.floor++; st.prev = null;
    out.events.push({ type: 'floor' });
    enterCell(st, ctx, out, rng, false);
    return;
  } else if (ch === 'r') {
    // 回転床：知らないうちに向きが変わる（何も言わない。オートマップや座標で気づく）
    st.dir = Math.floor(rng() * 4);
  } else if (ch === 'u' || ch === 'd') {
    out.events.push({ type: 'stairs', up: ch === 'u', toTown: ch === 'u' && st.floor === 0 });
  }

  const sp = fl.special(st.x, st.y);
  if (sp) {
    const id = `${st.floor}:${st.x},${st.y}`;
    switch (sp.type) {
      case 'event':
        if (!st.done[sp.id || id]) {
          st.done[sp.id || id] = 1;
          out.msgs.push(sp.text);
          if (sp.give?.key && !st.keys.includes(sp.give.key)) st.keys.push(sp.give.key);
          // お金・楽譜は冒険の側（expedition.js）で受け取る
          if (sp.give?.gold || sp.give?.score) out.events.push({ type: 'give', gold: sp.give.gold || 0, score: sp.give.score || null });
        }
        break;
      case 'switch':
        if (!st.flags[sp.flag]) { st.flags[sp.flag] = 1; out.msgs.push(sp.text); }
        break;
      case 'fountain':
        out.msgs.push(sp.text);
        out.events.push({ type: 'fountain', effect: sp.effect, amount: sp.amount || 0 });
        break;
      case 'warp':
        out.msgs.push(sp.text);
        st.x = sp.to.x; st.y = sp.to.y; st.prev = null;
        if (sp.to.floor != null) st.floor = sp.to.floor;
        enterCell(st, ctx, out, rng, false);
        return;
      case 'guardian':
        if (!st.trip[sp.id]) out.events.push({ type: 'battle', kind: 'guardian', id: sp.id, name: sp.name });
        return;
      case 'fixed':
        out.events.push({ type: 'battle', kind: 'fixed', id: sp.id, name: sp.name });
        return;
      case 'boss':
        if (!st.trip[sp.boss]) out.events.push({ type: 'battle', kind: 'boss', id: sp.boss });
        return;
      default: break;
    }
  }
  // 徘徊する敵（歩いて入ったとき、仕掛けのない床でだけ）
  if (walked && !sp && ch !== 'u' && ch !== 'd' && rng() < (fl.encounter || 0)) {
    out.events.push({ type: 'battle', kind: 'wander' });
  }
}

// 調べる：正面の壁にシークレットドアがあれば見つける。盗賊系がいれば必ず、いなければ 1/3
export const SEARCHERS = new Set(['thief', 'assassin', 'rogue', 'ninja', 'ranger']);
function search(st, ctx, out) {
  const fl = getFloor(st.dungeon, st.floor);
  const e = edgeInfo(fl, st, st.x, st.y, st.dir);
  const rng = ctx.rng || Math.random;
  if (e.hidden && (ctx.searcher || rng() < 1 / 3)) {
    st.found[secretKey(st, st.x, st.y, st.dir)] = 1;
    out.msgs.push('シークレットドアを見つけた！');
  } else {
    out.msgs.push('何も見つからなかった');
  }
  return out;
}

// 階段を使う（stairs イベントを受けて画面側が呼ぶ）。戻り値 'town' なら街へ
export function useStairs(st) {
  const fl = getFloor(st.dungeon, st.floor);
  const ch = fl.cellAt(st.x, st.y);
  if (ch === 'u' && st.floor === 0) return 'town';
  if (ch === 'u') st.floor--;
  else if (ch === 'd') st.floor++;
  else return null;
  st.prev = null;
  markSeen(st);
  return 'moved';
}

// 逃げたときは来たマスへ戻る（ルームガーダー・ボスの部屋から押し出される）
export function retreat(st) {
  if (st.prev) { st.x = st.prev.x; st.y = st.prev.y; st.prev = null; }
}

// 街に戻ったとき：ルームガーダーは復活し、倒したボスは強化されて再出現する
export function returnToTown(st) {
  for (const id of Object.keys(st.trip)) {
    if (st.trip[id] === 'boss') st.bossClears[id] = (st.bossClears[id] || 0) + 1;
  }
  st.trip = {};
  const s = DUNGEONS[st.dungeon].start;
  Object.assign(st, { floor: 0, x: s.x, y: s.y, dir: s.dir, prev: null });
}

// 前方の見え方（3D 描画用）。depth 0..maxDepth、横 -2..2 のマスについて、壁・扉の種類を返す
export function viewCells(st, maxDepth = 4) {
  const fl = getFloor(st.dungeon, st.floor);
  const fwd = st.dir, right = (st.dir + 1) % 4, left = (st.dir + 3) % 4;
  const cells = [];
  for (let d = 0; d <= maxDepth; d++) {
    for (let k = -2; k <= 2; k++) {
      const x = st.x + DX[fwd] * d + DX[right] * k, y = st.y + DY[fwd] * d + DY[right] * k;
      const ch = fl.cellAt(x, y);
      cells.push({ d, k, x, y, ch, solid: isSolid(ch), dark: isDark(ch),
        front: edgeInfo(fl, st, x, y, fwd), left: edgeInfo(fl, st, x, y, left), right: edgeInfo(fl, st, x, y, right),
        special: fl.special(x, y) });
    }
  }
  return cells;
}
