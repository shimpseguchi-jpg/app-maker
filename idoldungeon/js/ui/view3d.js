// 一人称の迷宮（エルミナージュ風の陰影つき石壁）
// cells は engine/dungeon.js の viewCells() の結果。奥から手前へ塗り重ねる
// 色は階ごとの theme をほんのり混ぜた石の色。奥ほど暗く（霧）、側面は正面より暗い
const MAX_D = 4;

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;

export function drawView(canvas, st, cells, opts = {}) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, cx = W / 2, cy = H / 2;
  const F = W * 0.3125;
  const tint = hex(opts.theme || '#7fd1ff');
  const stone = mix([96, 88, 78], tint, 0.22);       // 石の地の色
  const dark = [6, 5, 8];
  const fog = (z) => Math.min(1, Math.max(0, (z - 0.6) / 4.6)); // 奥ほど暗く
  const shade = (base, z, k = 1) => rgb(mix(mix(base, dark, 1 - k), dark, fog(z) * 0.92));

  // 天井と床（奥へ向かって暗くなる）
  const ceil = ctx.createLinearGradient(0, 0, 0, cy);
  ceil.addColorStop(0, rgb(mix(stone, dark, 0.55))); ceil.addColorStop(1, rgb(dark));
  ctx.fillStyle = ceil; ctx.fillRect(0, 0, W, cy);
  const floor = ctx.createLinearGradient(0, cy, 0, H);
  floor.addColorStop(0, rgb(dark)); floor.addColorStop(1, rgb(mix(stone, dark, 0.35)));
  ctx.fillStyle = floor; ctx.fillRect(0, cy, W, H - cy);
  // 床と天井の目地（奥行きの手がかり）
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1;
  for (let z = 1; z <= MAX_D + 1; z++) {
    const dy = (0.5 / z) * F;
    ctx.beginPath(); ctx.moveTo(0, cy + dy); ctx.lineTo(W, cy + dy); ctx.moveTo(0, cy - dy); ctx.lineTo(W, cy - dy); ctx.stroke();
  }

  const here = cells.find((c) => c.d === 0 && c.k === 0);
  if (here?.dark) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#4a4440'; ctx.font = `${Math.round(H / 16)}px "Shippori Mincho", serif`; ctx.textAlign = 'center';
    ctx.fillText('―― 闇 ――', cx, cy);
    return;
  }

  const zNear = (d) => (d === 0 ? 0.3 : d);
  const P = (lat, z, up) => [cx + (lat / z) * F, cy + (up ? -1 : 1) * (0.5 / z) * F];
  const poly = (pts, fill, stroke) => {
    ctx.beginPath(); ctx.moveTo(...pts[0]); for (const p of pts.slice(1)) ctx.lineTo(...p); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  };
  // 壁の面の上の点（u: 横 0..1, v: 縦 0..1 上から）
  const onFront = (k, z) => (u, v) => [cx + ((k - 0.5 + u) / z) * F, cy - ((0.5 - v) / z) * F];
  const onSide = (lat, z1, z2) => (u, v) => { const z = z1 + (z2 - z1) * u; return [cx + (lat / z) * F, cy - ((0.5 - v) / z) * F]; };
  const line = (a, b) => { ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); };

  // 石積みの目地（正面は互い違いの縦目地、側面は横目地だけ）
  const bricks = (at, z, front) => {
    ctx.strokeStyle = `rgba(0,0,0,${0.45 * (1 - fog(z))})`; ctx.lineWidth = 1;
    const rows = 6;
    for (let r = 1; r < rows; r++) line(at(0, r / rows), at(1, r / rows));
    if (!front) return;
    for (let r = 0; r < rows; r++) for (let c = (r % 2 ? 0.5 : 0); c <= 3; c += 1) {
      const u = (c + 0.5) / 3.5;
      if (u > 0 && u < 1) line(at(u, r / rows), at(u, (r + 1) / rows));
    }
  };
  const wallFace = (pts, at, z, front, kind, light) => {
    poly(pts, shade(stone, z, light));
    // 上下の縁にうっすら光
    ctx.strokeStyle = `rgba(255,230,190,${0.12 * (1 - fog(z))})`; ctx.lineWidth = 1;
    line(pts[0], pts[1]);
    bricks(at, z, front);
    poly(pts, null, 'rgba(0,0,0,.6)');
    door(at, z, kind);
  };
  const door = (at, z, kind) => {
    if (kind === 'wall' || kind === 'open') return;
    const f = 1 - fog(z) * 0.9;
    const frame = [at(0.22, 0.14), at(0.78, 0.14), at(0.78, 1), at(0.22, 1)];
    poly(frame, rgb(mix([40, 30, 22], dark, 1 - f)));
    const board = [at(0.26, 0.18), at(0.74, 0.18), at(0.74, 1), at(0.26, 1)];
    const wood = kind === 'gate' ? [70, 74, 80] : kind === 'locked' ? [92, 58, 36] : [110, 72, 40];
    poly(board, rgb(mix(wood, dark, (1 - f) * 0.95)), 'rgba(0,0,0,.6)');
    ctx.strokeStyle = 'rgba(0,0,0,.45)';
    if (kind === 'gate') for (const u of [0.32, 0.42, 0.52, 0.62, 0.7]) line(at(u, 0.18), at(u, 1));
    else for (const u of [0.38, 0.5, 0.62]) line(at(u, 0.18), at(u, 1));
    // 取っ手・鍵穴
    ctx.fillStyle = kind === 'locked' ? `rgba(255,120,90,${f})` : `rgba(230,190,110,${f})`;
    const [hx, hy] = at(0.68, 0.6);
    ctx.beginPath(); ctx.arc(hx, hy, Math.max(1.5, 5 / z), 0, Math.PI * 2); ctx.fill();
  };

  const order = cells.filter((c) => c.d <= MAX_D && !c.solid).sort((a, b) => b.d - a.d || Math.abs(b.k) - Math.abs(a.k));
  for (const c of order) {
    const z1 = zNear(c.d), z2 = c.d + 1;
    if (c.dark) {
      poly([P(c.k - 0.5, z1, true), P(c.k + 0.5, z1, true), P(c.k + 0.5, z1, false), P(c.k - 0.5, z1, false)], '#000');
      continue;
    }
    if (c.k === 0 && c.d <= 3) floorMark(ctx, c, P, z1, z2, fog);
    if (c.front.kind !== 'open') {
      wallFace([P(c.k - 0.5, z2, true), P(c.k + 0.5, z2, true), P(c.k + 0.5, z2, false), P(c.k - 0.5, z2, false)], onFront(c.k, z2), z2, true, c.front.kind, 1);
    }
    if (c.k <= 0 && c.left.kind !== 'open') {
      const lat = c.k - 0.5;
      wallFace([P(lat, z1, true), P(lat, z2, true), P(lat, z2, false), P(lat, z1, false)], onSide(lat, z1, z2), (z1 + z2) / 2, false, c.left.kind, 0.72);
    }
    if (c.k >= 0 && c.right.kind !== 'open') {
      const lat = c.k + 0.5;
      wallFace([P(lat, z1, true), P(lat, z2, true), P(lat, z2, false), P(lat, z1, false)], onSide(lat, z1, z2), (z1 + z2) / 2, false, c.right.kind, 0.72);
    }
  }
  // 周辺を暗く（たいまつの明かりの感じ）
  const vg = ctx.createRadialGradient(cx, cy, H * 0.25, cx, cy, W * 0.62);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
}

// 床の目印：階段・泉（正面の列だけ）
function floorMark(ctx, c, P, z1, z2, fog) {
  const kind = c.ch === 'u' ? 'up' : c.ch === 'd' ? 'down' : c.special?.type === 'fountain' ? 'fountain' : null;
  if (!kind) return;
  const zn = Math.max(z1, 0.7), zf = z2 - 0.08;
  const a = 1 - fog((zn + zf) / 2);
  if (kind === 'fountain') {
    const [x1, y1] = P(-0.3, (zn + zf) / 2, false), [x2] = P(0.3, (zn + zf) / 2, false);
    const r = (x2 - x1) / 2, mx = (x1 + x2) / 2;
    ctx.fillStyle = `rgba(80,160,220,${0.55 * a})`;
    ctx.beginPath(); ctx.ellipse(mx, y1, r, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(200,230,255,${0.6 * a})`; ctx.stroke();
    return;
  }
  // 階段：段の線（上りは明るく、下りは暗い穴）
  const steps = 5;
  for (let i = 0; i < steps; i++) {
    const t1 = zn + ((zf - zn) * i) / steps, t2 = zn + ((zf - zn) * (i + 1)) / steps;
    const pts = [P(-0.32, t1, false), P(0.32, t1, false), P(0.32, t2, false), P(-0.32, t2, false)];
    const lv = kind === 'up' ? 150 - i * 18 : 60 - i * 10;
    ctx.fillStyle = `rgba(${lv},${lv - 10},${lv - 22},${a})`;
    ctx.beginPath(); ctx.moveTo(...pts[0]); for (const p of pts.slice(1)) ctx.lineTo(...p); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(0,0,0,${0.6 * a})`; ctx.stroke();
  }
}
