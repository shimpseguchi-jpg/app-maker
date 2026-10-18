// 一人称のワイヤーフレーム迷宮（エルミナージュ／ウィザードリィ風）
// cells は engine/dungeon.js の viewCells() の結果。奥から手前へ塗り重ねる
const MAX_D = 4;

export function drawView(canvas, st, cells, opts = {}) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, cx = W / 2, cy = H / 2;
  const F = W * 0.3125; // 奥行き1マス先の壁が画面幅の 5/16 になる
  const line = opts.theme || '#7fd1ff', bg = opts.bg || '#07060d';
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.lineJoin = 'round';

  const here = cells.find((c) => c.d === 0 && c.k === 0);
  if (here?.dark) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#555'; ctx.font = `${Math.round(H / 18)}px sans-serif`; ctx.textAlign = 'center';
    ctx.fillText('ダークゾーン', cx, cy);
    return;
  }

  const zNear = (d) => (d === 0 ? 0.3 : d);
  const P = (lat, z, up) => [cx + (lat / z) * F, cy + (up ? -1 : 1) * (0.5 / z) * F];
  const quad = (pts, fill = bg) => {
    ctx.beginPath(); ctx.moveTo(...pts[0]); for (const p of pts.slice(1)) ctx.lineTo(...p); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = line; ctx.lineWidth = 1.5; ctx.stroke();
  };
  // 壁の面（lat1→lat2, z1→z2）上の部分（u: 横 0..1, v: 縦 0..1 上から）
  const onFront = (k, z, u1, u2, v1, v2) => {
    const x = (u) => k - 0.5 + u, y = (v) => 0.5 - v;
    return [[x(u1), y(v1)], [x(u2), y(v1)], [x(u2), y(v2)], [x(u1), y(v2)]].map(([lx, ly]) => [cx + (lx / z) * F, cy - (ly / z) * F]);
  };
  const onSide = (lat, z1, z2, u1, u2, v1, v2) => {
    const z = (u) => z1 + (z2 - z1) * u, y = (v) => 0.5 - v;
    return [[u1, v1], [u2, v1], [u2, v2], [u1, v2]].map(([u, v]) => [cx + (lat / z(u)) * F, cy - (y(v) / z(u)) * F]);
  };
  const decorate = (face, kind) => {
    if (kind === 'wall' || kind === 'open') return;
    const door = face(0.25, 0.75, 0.18, 1);
    quad(door);
    if (kind === 'locked') { ctx.fillStyle = line; const [a, , c] = face(0.46, 0.54, 0.55, 0.65); ctx.fillRect(a[0], a[1], c[0] - a[0], c[1] - a[1]); }
    if (kind === 'gate') for (const u of [0.35, 0.45, 0.55, 0.65]) { const [a, , , d] = face(u, u, 0.18, 1); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...d); ctx.stroke(); }
  };

  const order = cells.filter((c) => c.d <= MAX_D && !c.solid).sort((a, b) => b.d - a.d || Math.abs(b.k) - Math.abs(a.k));
  for (const c of order) {
    const z1 = zNear(c.d), z2 = c.d + 1;
    if (c.dark) {
      // 先にあるダークゾーンは黒い幕として描く
      quad([P(c.k - 0.5, z1, true), P(c.k + 0.5, z1, true), P(c.k + 0.5, z1, false), P(c.k - 0.5, z1, false)], '#000');
      continue;
    }
    // 床の目印（正面の列だけ）
    if (c.k === 0 && c.d >= 0 && c.d <= 3) floorMark(ctx, c, P, z1, z2, line, H);
    if (c.front.kind !== 'open') {
      quad([P(c.k - 0.5, z2, true), P(c.k + 0.5, z2, true), P(c.k + 0.5, z2, false), P(c.k - 0.5, z2, false)]);
      decorate((u1, u2, v1, v2) => onFront(c.k, z2, u1, u2, v1, v2), c.front.kind);
    }
    if (c.k <= 0 && c.left.kind !== 'open') {
      const lat = c.k - 0.5;
      quad([P(lat, z1, true), P(lat, z2, true), P(lat, z2, false), P(lat, z1, false)]);
      decorate((u1, u2, v1, v2) => onSide(lat, z1, z2, u1, u2, v1, v2), c.left.kind);
    }
    if (c.k >= 0 && c.right.kind !== 'open') {
      const lat = c.k + 0.5;
      quad([P(lat, z1, true), P(lat, z2, true), P(lat, z2, false), P(lat, z1, false)]);
      decorate((u1, u2, v1, v2) => onSide(lat, z1, z2, u1, u2, v1, v2), c.right.kind);
    }
  }
}

function floorMark(ctx, c, P, z1, z2, line, H) {
  let label = null;
  if (c.ch === 'u') label = '▲ 上り階段';
  else if (c.ch === 'd') label = '▼ 下り階段';
  else if (c.special?.type === 'fountain') label = '泉';
  if (!label) return;
  const zm = Math.max(z1, 0.6), za = (zm + z2) / 2;
  const pts = [P(-0.3, zm, false), P(0.3, zm, false), P(0.3, z2 - 0.1, false), P(-0.3, z2 - 0.1, false)];
  ctx.beginPath(); ctx.moveTo(...pts[0]); for (const p of pts.slice(1)) ctx.lineTo(...p); ctx.closePath();
  ctx.setLineDash([4, 3]); ctx.strokeStyle = line; ctx.stroke(); ctx.setLineDash([]);
  const [x, y] = P(0, za, false);
  ctx.fillStyle = line; ctx.textAlign = 'center';
  ctx.font = `${Math.max(10, Math.round(H / 14 / za))}px sans-serif`;
  ctx.fillText(label, x, y);
}
