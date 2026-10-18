// オートマップ（歩いたマスだけを描く。ダークゾーンは記録されない）
import { getFloor, edgeInfo } from '../engine/dungeon.js';

export function drawMap(canvas, st, opts = {}) {
  const ctx = canvas.getContext('2d');
  const fl = getFloor(st.dungeon, st.floor);
  const W = canvas.width, H = canvas.height;
  const pad = 6, s = Math.floor(Math.min((W - pad * 2) / fl.w, (H - pad * 2) / fl.h));
  const ox = Math.floor((W - s * fl.w) / 2), oy = Math.floor((H - s * fl.h) / 2);
  const line = opts.theme || '#7fd1ff';
  const X = (x) => ox + x * s, Y = (y) => oy + (fl.h - 1 - y) * s; // 北が上
  ctx.fillStyle = '#0b0a14'; ctx.fillRect(0, 0, W, H);

  // 格子（うっすら）
  ctx.strokeStyle = '#1d1a33'; ctx.lineWidth = 1;
  for (let i = 0; i <= fl.w; i++) { ctx.beginPath(); ctx.moveTo(ox + i * s, oy); ctx.lineTo(ox + i * s, oy + fl.h * s); ctx.stroke(); }
  for (let i = 0; i <= fl.h; i++) { ctx.beginPath(); ctx.moveTo(ox, oy + i * s); ctx.lineTo(ox + fl.w * s, oy + i * s); ctx.stroke(); }

  const seen = st.seen[st.floor] || {};
  for (const key of Object.keys(seen)) {
    const [x, y] = key.split(',').map(Number);
    ctx.fillStyle = '#211d3d'; ctx.fillRect(X(x) + 1, Y(y) + 1, s - 1, s - 1);
    const ch = fl.cellAt(x, y), sp = fl.special(x, y);
    const mark = ch === 'u' ? '↑' : ch === 'd' ? '↓' : ch === 'm' ? '×' : sp?.type === 'fountain' ? '泉' : sp?.type === 'boss' ? '!' : null;
    if (mark) {
      ctx.fillStyle = line; ctx.font = `${Math.floor(s * 0.7)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(mark, X(x) + s / 2, Y(y) + s / 2 + 1);
    }
    for (let d = 0; d < 4; d++) {
      const e = edgeInfo(fl, st, x, y, d);
      if (e.kind === 'open') continue;
      const [x1, y1, x2, y2] = edgeLine(X(x), Y(y), s, d);
      ctx.strokeStyle = line; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      if (e.kind !== 'wall') {
        // 扉：まん中に目印（鍵は赤、仕掛け扉は黄）
        ctx.fillStyle = e.kind === 'locked' ? '#ff6b6b' : e.kind === 'gate' ? '#ffd34d' : '#0b0a14';
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, r = Math.max(2, s * 0.18);
        ctx.fillRect(mx - r, my - r, r * 2, r * 2);
        ctx.strokeRect(mx - r, my - r, r * 2, r * 2);
      }
    }
  }

  // 現在地（三角形で向きを示す）
  const px = X(st.x) + s / 2, py = Y(st.y) + s / 2, r = s * 0.38;
  const ang = [-Math.PI / 2, 0, Math.PI / 2, Math.PI][st.dir];
  ctx.fillStyle = '#ffd34d'; ctx.beginPath();
  ctx.moveTo(px + Math.cos(ang) * r, py + Math.sin(ang) * r);
  ctx.lineTo(px + Math.cos(ang + 2.4) * r, py + Math.sin(ang + 2.4) * r);
  ctx.lineTo(px + Math.cos(ang - 2.4) * r, py + Math.sin(ang - 2.4) * r);
  ctx.closePath(); ctx.fill();
}

function edgeLine(x, y, s, d) {
  if (d === 0) return [x, y, x + s, y];
  if (d === 1) return [x + s, y, x + s, y + s];
  if (d === 2) return [x, y + s, x + s, y + s];
  return [x, y, x, y + s];
}
