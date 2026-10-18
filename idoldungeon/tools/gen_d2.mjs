// 「奈落の大劇場（仮）」5階ぶんのマップを作る下書き道具（作者用）
// 迷路（穴掘り法＋ところどころ輪にする）をもとに、部屋・階段・仕掛けを置き、js/data/floors.js に貼る文字の平面図を出す
// 種が同じなら同じマップになる。出力を貼ったあとは floors.js が正本（手で直してよい）
//   node idoldungeon/tools/gen_d2.mjs > /tmp/d2.js
import { seeded } from '../js/engine/rng.js';

const W = 20, H = 20;
const DX = [0, 1, 0, -1], DY = [1, 0, -1, 0];
const key = (x, y) => `${x},${y}`;

function makeFloor(seed, { rooms = [], start, braid = 0.25 }) {
  const rng = seeded(seed);
  const open = new Set(); // "x,y,d" 開いている境目（両向き）
  const edgeChar = new Map();
  const cell = new Map();
  const inRoom = (x, y) => rooms.find((r) => x >= r.x1 && x <= r.x2 && y >= r.y1 && y <= r.y2);
  const setEdge = (x, y, d, ch = ' ') => {
    const nx = x + DX[d], ny = y + DY[d];
    edgeChar.set(`${x},${y},${d}`, ch); edgeChar.set(`${nx},${ny},${(d + 2) % 4}`, ch);
  };
  // 部屋の中は全部つなぐ
  for (const r of rooms) for (let x = r.x1; x <= r.x2; x++) for (let y = r.y1; y <= r.y2; y++) {
    if (x < r.x2) setEdge(x, y, 1); if (y < r.y2) setEdge(x, y, 0);
  }
  // 迷路（部屋の外だけ）
  const seen = new Set([key(start.x, start.y)]);
  const stack = [[start.x, start.y]];
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const nb = [0, 1, 2, 3].filter((d) => {
      const nx = x + DX[d], ny = y + DY[d];
      return nx >= 0 && ny >= 0 && nx < W && ny < H && !inRoom(nx, ny) && !seen.has(key(nx, ny));
    });
    if (!nb.length) { stack.pop(); continue; }
    const d = nb[Math.floor(rng() * nb.length)];
    setEdge(x, y, d);
    const nx = x + DX[d], ny = y + DY[d];
    seen.add(key(nx, ny)); stack.push([nx, ny]);
  }
  // 行き止まりの一部を輪にする（迷いすぎないように）
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (inRoom(x, y) || !seen.has(key(x, y))) continue;
    const exits = [0, 1, 2, 3].filter((d) => edgeChar.get(`${x},${y},${d}`) === ' ');
    if (exits.length !== 1 || rng() > braid) continue;
    const cand = [0, 1, 2, 3].filter((d) => {
      const nx = x + DX[d], ny = y + DY[d];
      return !exits.includes(d) && nx >= 0 && ny >= 0 && nx < W && ny < H && !inRoom(nx, ny) && seen.has(key(nx, ny));
    });
    if (cand.length) setEdge(x, y, cand[Math.floor(rng() * cand.length)]);
  }
  return { rng, edgeChar, cell, seen, rooms, inRoom, setEdge, open };
}

// 境目の開き具合を使った幅優先の距離
function dist(f, sx, sy) {
  const d = new Map([[key(sx, sy), 0]]);
  const q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift();
    for (let k = 0; k < 4; k++) {
      const e = f.edgeChar.get(`${x},${y},${k}`);
      if (e === undefined || e === '|' || e === '-') continue;
      const nx = x + DX[k], ny = y + DY[k];
      if (d.has(key(nx, ny))) continue;
      d.set(key(nx, ny), d.get(key(x, y)) + 1); q.push([nx, ny]);
    }
  }
  return d;
}
const farthest = (f, sx, sy, ok = () => true) => [...dist(f, sx, sy)].filter(([k]) => ok(...k.split(',').map(Number))).sort((a, b) => b[1] - a[1])[0][0].split(',').map(Number);
const deadEnds = (f) => {
  const out = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (f.inRoom(x, y) || !f.seen.has(key(x, y))) continue;
    if ([0, 1, 2, 3].filter((d) => f.edgeChar.get(`${x},${y},${d}`) === ' ').length === 1) out.push([x, y]);
  }
  return out;
};

function render(f) {
  const rows = [];
  for (let r = 0; r < 2 * H + 1; r++) {
    let line = '';
    for (let c = 0; c < 2 * W + 1; c++) {
      if (r % 2 === 0 && c % 2 === 0) { line += '+'; continue; }
      const y = H - 1 - Math.floor(r / 2), x = Math.floor(c / 2);
      if (r % 2 === 1 && c % 2 === 1) {
        const k = key(x, y);
        line += f.cell.get(k) || (f.seen.has(k) || f.inRoom(x, y) ? '.' : ' ');
      } else if (r % 2 === 0) { // 上下の境目：このマス (x, yUp) の南
        const yUp = H - r / 2; // 行 r の上のマス
        const e = yUp < H && yUp - 1 >= 0 ? f.edgeChar.get(`${x},${yUp},2`) : undefined;
        line += e === undefined ? '-' : e;
      } else {
        const xl = c / 2 - 1;
        const e = xl >= 0 && xl + 1 < W ? f.edgeChar.get(`${xl},${y},1`) : undefined;
        line += e === undefined ? '|' : e;
      }
    }
    rows.push(line);
  }
  return rows;
}

const floors = [];
// ── 1F 客席：大ホール（ルームガーダー）、隠し部屋の宝、入口近くの泉 ──
{
  const hall = { x1: 6, y1: 6, x2: 13, y2: 11 }, closet = { x1: 0, y1: 17, x2: 2, y2: 19 };
  const f = makeFloor(101, { rooms: [hall, closet], start: { x: 10, y: 0 } });
  f.setEdge(9, 5, 0, 'D'); f.setEdge(10, 11, 0, 'D'); f.setEdge(2, 18, 1, 'S');
  f.cell.set('10,0', 'u');
  const [dx, dy] = farthest(f, 10, 0, (x, y) => !f.inRoom(x, y));
  f.cell.set(key(dx, dy), 'd');
  const fountain = [...dist(f, 10, 0)].find(([k, v]) => v === 4 && !f.inRoom(...k.split(',').map(Number)))[0].split(',').map(Number);
  floors.push({ f, id: '1F', name: '奈落の大劇場 1F 客席', d: [dx, dy], specials: [
    { type: 'event', x: 10, y: 1, id: 'd2open', text: '客席には誰もいない。舞台の上から、かすかに歌声が聞こえる' },
    { type: 'fountain', x: fountain[0], y: fountain[1], effect: 'heal', amount: 20, text: 'ロビーの水飲み場だ' },
    { type: 'guardian', x: 9, y: 8, id: 'g2a', name: '客席の案内係', hint: 9 },
    { type: 'event', x: 1, y: 18, id: 'd2closet', give: { gold: 300, score: 'go_my_way' }, text: '忘れ物の箱だ。中にお金と楽譜が入っている' },
  ] });
}
// ── B1F 舞台裏：ダークゾーン、一方通行、小道具部屋の鍵 ──
{
  const [sx, sy] = floors[0].d;
  const f = makeFloor(202, { start: { x: sx, y: sy }, braid: 0.4 });
  for (let x = 4; x <= 9; x++) for (let y = 10; y <= 15; y++) f.cell.set(key(x, y), '#');
  f.cell.set(key(sx, sy), 'u');
  const [dx, dy] = farthest(f, sx, sy);
  f.cell.set(key(dx, dy), 'd');
  const ends = deadEnds(f).filter(([x, y]) => !(x === dx && y === dy) && !(x === sx && y === sy) && !f.cell.get(key(x, y)));
  const d0 = dist(f, sx, sy);
  ends.sort((a, b) => d0.get(key(...b)) - d0.get(key(...a)));
  const [kx, ky] = ends[0], [gx, gy] = ends[1];
  floors.push({ f, id: 'B1F', name: '奈落の大劇場 B1F 舞台裏', d: [dx, dy], specials: [
    { type: 'event', x: kx, y: ky, id: 'propKey', give: { key: 'propKey' }, text: '小道具の山の中に「小道具部屋の鍵」があった' },
    { type: 'guardian', x: gx, y: gy, id: 'g2b', name: '舞台裏の番人', hint: 11 },
  ] });
}
// ── B2F 奈落：ピット・シュート・回転床・呪文禁止エリア ──
{
  const [sx, sy] = floors[1].d;
  const f = makeFloor(303, { start: { x: sx, y: sy }, braid: 0.35 });
  for (let x = 12; x <= 16; x++) for (let y = 3; y <= 7; y++) f.cell.set(key(x, y), 'm');
  f.cell.set(key(sx, sy), 'u');
  const [dx, dy] = farthest(f, sx, sy, (x, y) => !(x >= 12 && x <= 16 && y >= 3 && y <= 7));
  f.cell.set(key(dx, dy), 'd');
  const d0 = dist(f, sx, sy);
  const cells = [...d0.keys()].map((k) => k.split(',').map(Number)).filter(([x, y]) => !f.cell.get(key(x, y)));
  const pick = (n, ok) => { const out = []; for (const c of cells) { if (out.length >= n) break; if (ok(c) && f.rng() < 0.15) { out.push(c); f.cell.set(key(...c), 'x'); } } return out; };
  const pits = pick(6, ([x, y]) => d0.get(key(x, y)) > 3);
  const spins = pick(4, ([x, y]) => d0.get(key(x, y)) > 5);
  const chutes = pick(2, ([x, y]) => d0.get(key(x, y)) > 8 && x < 14 && y < 14);
  pits.forEach((c) => f.cell.set(key(...c), 'p'));
  spins.forEach((c) => f.cell.set(key(...c), 'r'));
  chutes.forEach((c) => f.cell.set(key(...c), 'c'));
  floors.push({ f, id: 'B2F', name: '奈落の大劇場 B2F 奈落', d: [dx, dy], pit: 10, specials: [
    { type: 'event', x: 14, y: 5, id: 'd2anti', text: '舞台装置の残響で、ここでは呪文がかき消される' },
  ] });
}
// ── B3F 楽屋：小部屋、鍵の部屋（下り階段）、ワープ、固定敵 ──
{
  const [sx, sy] = floors[2].d;
  const lock = { x1: 15, y1: 15, x2: 18, y2: 18 }, r1 = { x1: 2, y1: 2, x2: 4, y2: 4 }, r2 = { x1: 2, y1: 14, x2: 4, y2: 16 };
  const rooms = [lock, r1, r2].filter((r) => !(sx >= r.x1 && sx <= r.x2 && sy >= r.y1 && sy <= r.y2));
  const f = makeFloor(404, { rooms, start: { x: sx, y: sy }, braid: 0.3 });
  f.setEdge(16, 14, 0, 'L'); f.setEdge(4, 3, 1, 'D'); f.setEdge(4, 15, 1, 'D');
  f.cell.set(key(sx, sy), 'u');
  f.cell.set('17,17', 'd');
  const d0 = dist(f, sx, sy);
  const ends = deadEnds(f).filter(([x, y]) => !f.cell.get(key(x, y))).sort((a, b) => d0.get(key(...b)) - d0.get(key(...a)));
  const [wx, wy] = ends[0], [fx, fy] = ends[1], [hx, hy] = ends[2];
  floors.push({ f, id: 'B3F', name: '奈落の大劇場 B3F 楽屋', d: [17, 17], specials: [
    { type: 'lock', x: 16, y: 14, dir: 0, key: 'propKey' },
    { type: 'event', x: 3, y: 3, id: 'd2room1', give: { gold: 500 }, text: '主演女優の楽屋だ。化粧台にお金が置いてある' },
    { type: 'event', x: 3, y: 15, id: 'd2room2', give: { score: 'tonari' }, text: '誰かの楽屋だ。机の上に楽譜が置いてある' },
    { type: 'warp', x: wx, y: wy, to: { x: sx, y: sy }, text: '鏡が光った！ どこかへ飛ばされた' },
    { type: 'fixed', x: fx, y: fy, id: 'understudy', name: '控えの怪人' },
    { type: 'fountain', x: hx, y: hy, effect: 'heal', amount: 60, text: '楽屋の給湯室だ。お茶で一息ついた' },
  ] });
}
// ── B4F 大舞台：仕掛け扉の奥にボス、遠くのスイッチ、扉の前の泉 ──
{
  const [sx, sy] = floors[3].d;
  const stage = { x1: 7, y1: 14, x2: 12, y2: 18 };
  const f = makeFloor(505, { rooms: [stage], start: { x: sx, y: sy }, braid: 0.3 });
  f.setEdge(9, 13, 0, 'G');
  f.cell.set(key(sx, sy), 'u');
  const d0 = dist(f, sx, sy);
  const ends = deadEnds(f).filter(([x, y]) => !f.cell.get(key(x, y))).sort((a, b) => d0.get(key(...b)) - d0.get(key(...a)));
  const [wx, wy] = ends[0], [fx, fy] = ends[1];
  floors.push({ f, id: 'B4F', name: '奈落の大劇場 B4F 大舞台', specials: [
    { type: 'switch', x: wx, y: wy, flag: 'd2gate', text: '緞帳（どんちょう）を上げるハンドルを回した。大舞台の扉が開く音がする' },
    { type: 'gate', x: 9, y: 13, dir: 0, flag: 'd2gate' },
    { type: 'fountain', x: 9, y: 13, effect: 'heal', amount: 999, text: '舞台袖の泉だ。本番前に、心も体も整った' },
    { type: 'fixed', x: fx, y: fy, id: 'understudy2', name: '控えの怪人' },
    { type: 'boss', x: 9, y: 16, boss: 'b2' },
  ] });
}

const THEME = ['#ffd27a', '#9fb4ff', '#ff7a9a', '#c7a0ff', '#ffb35c'];
const ENC = [0.06, 0.06, 0.07, 0.07, 0.08];
const q = (s) => `'${s}'`;
const obj = (o) => '{ ' + Object.entries(o).map(([k, v]) => `${k}: ${typeof v === 'object' ? obj(v) : typeof v === 'string' ? q(v) : v}`).join(', ') + ' }';
let out = `// ここから下は tools/gen_d2.mjs の出力（手で直してよい）\ndef({ id: 'd2', name: '奈落の大劇場（仮）', unlock: 'b1', start: { x: 10, y: 0, dir: 0 }, floors: [\n`;
floors.forEach((fl, i) => {
  out += `  { id: '${fl.id}', name: '${fl.name}', encounter: ${ENC[i]}, theme: '${THEME[i]}',${fl.pit ? ` pit: ${fl.pit},` : ''} map: [\n`;
  out += render(fl.f).map((r) => `    ${q(r)},`).join('\n') + '\n  ], specials: [\n';
  out += fl.specials.map((s) => `    ${obj(s)},`).join('\n') + '\n  ] },\n';
});
out += '] });';
console.log(out);
