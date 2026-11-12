// かいの ちずを つくる（へや と つうろ）。おなじ たねなら おなじ ちず
export const W = 31, H = 21;
export const WALL = 0, FLOOR = 1, PATH = 2;
export const idx = (x, y) => y * W + x;
export const inMap = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

// 3×2 の くぎりに へやを おき、となりどうしを つうろで つなぐ
export function generate(rng, { boss = false } = {}) {
  const tiles = new Array(W * H).fill(WALL);
  const CX = 3, CY = 2, cw = Math.floor(W / CX), ch = Math.floor(H / CY);
  const cells = [];
  const order = rng.shuffle([0, 1, 2, 3, 4, 5]);
  const nRooms = boss ? 4 : rng.int(4, 6);
  const hasRoom = new Set(order.slice(0, nRooms));
  const bossCell = boss ? order[0] : -1;
  for (let c = 0; c < CX * CY; c++) {
    const cx = c % CX, cy = Math.floor(c / CX);
    const x0 = cx * cw + 1, y0 = cy * ch + 1, mw = cw - 2, mh = ch - 2; // へやを おける はんい
    if (hasRoom.has(c)) {
      const big = c === bossCell;
      const w = big ? mw : rng.int(4, mw), h = big ? mh : rng.int(3, mh);
      const x = x0 + rng.int(0, mw - w), y = y0 + rng.int(0, mh - h);
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) tiles[idx(i, j)] = FLOOR;
      cells.push({ c, room: { x, y, w, h, big }, px: rng.int(x, x + w - 1), py: rng.int(y, y + h - 1) });
    } else {
      const px = x0 + rng.int(1, mw - 2), py = y0 + rng.int(1, mh - 2);
      tiles[idx(px, py)] = PATH;
      cells.push({ c, room: null, px, py });
    }
  }
  const dig = (x, y) => { if (tiles[idx(x, y)] === WALL) tiles[idx(x, y)] = PATH; };
  const connect = (a, b) => {
    let x = a.px, y = a.py;
    const horizFirst = rng.chance(0.5);
    const goX = () => { while (x !== b.px) { x += Math.sign(b.px - x); dig(x, y); } };
    const goY = () => { while (y !== b.py) { y += Math.sign(b.py - y); dig(x, y); } };
    if (horizFirst) { goX(); goY(); } else { goY(); goX(); }
  };
  // となりあう くぎりの くみ。ぜんたいが つながる ように えらぶ（ランダムな きを つくり、すこし おまけ）
  const edges = [];
  for (let c = 0; c < CX * CY; c++) {
    if (c % CX < CX - 1) edges.push([c, c + 1]);
    if (c + CX < CX * CY) edges.push([c, c + CX]);
  }
  rng.shuffle(edges);
  const parent = [0, 1, 2, 3, 4, 5];
  const find = (a) => (parent[a] === a ? a : (parent[a] = find(parent[a])));
  for (const [a, b] of edges) {
    const ra = find(a), rb = find(b);
    if (ra !== rb) { parent[ra] = rb; connect(cells[a], cells[b]); } else if (rng.chance(0.3)) connect(cells[a], cells[b]);
  }
  const rooms = cells.filter((c) => c.room).map((c) => c.room);
  return { tiles, rooms };
}

export function roomAt(rooms, x, y) {
  return rooms.findIndex((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
}
