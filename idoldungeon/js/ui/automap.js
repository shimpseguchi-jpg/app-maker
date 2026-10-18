// オートマップ（エルミナージュ風：こげ茶の方眼に、歩いたマスをオレンジで塗る。ダークゾーンは記録されない）
// opts.full：大きい地図（縦横の座標の数字つき）。opts.mini：迷宮の画面の隅に重ねる小さな地図
import { getFloor, edgeInfo } from '../engine/dungeon.js';

export function drawMap(canvas, st, opts = {}) {
  const ctx = canvas.getContext('2d');
  const fl = getFloor(st.dungeon, st.floor);
  const W = canvas.width, H = canvas.height;
  const pad = opts.full ? 26 : 6;
  const s = Math.floor(Math.min((W - pad * 2) / fl.w, (H - pad * 2) / fl.h));
  const ox = Math.floor((W - s * fl.w) / 2) + (opts.full ? 8 : 0), oy = Math.floor((H - s * fl.h) / 2) - (opts.full ? 6 : 0);
  const X = (x) => ox + x * s, Y = (y) => oy + (fl.h - 1 - y) * s; // 北が上
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = opts.mini ? 'rgba(30,20,12,.82)' : '#2b1d12';
  ctx.fillRect(0, 0, W, H);

  // 方眼
  ctx.strokeStyle = 'rgba(160,120,70,.22)'; ctx.lineWidth = 1;
  for (let i = 0; i <= fl.w; i++) { ctx.beginPath(); ctx.moveTo(X(i) + 0.5, oy); ctx.lineTo(X(i) + 0.5, oy + fl.h * s); ctx.stroke(); }
  for (let i = 0; i <= fl.h; i++) { ctx.beginPath(); ctx.moveTo(ox, oy + i * s + 0.5); ctx.lineTo(ox + fl.w * s, oy + i * s + 0.5); ctx.stroke(); }
  if (opts.full) {
    ctx.fillStyle = '#c9a46a'; ctx.font = `${Math.max(9, Math.floor(s * 0.55))}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let x = 0; x < fl.w; x++) ctx.fillText(String(x), X(x) + s / 2, oy + fl.h * s + 10);
    for (let y = 0; y < fl.h; y++) ctx.fillText(String(y), ox - 12, Y(y) + s / 2);
  }

  const seen = st.seen[st.floor] || {};
  // 歩いたマス
  for (const key of Object.keys(seen)) {
    const [x, y] = key.split(',').map(Number);
    ctx.fillStyle = '#e8963c';
    ctx.fillRect(X(x) + 1, Y(y) + 1, s - 1, s - 1);
  }
  // 壁・扉・目印
  for (const key of Object.keys(seen)) {
    const [x, y] = key.split(',').map(Number);
    const ch = fl.cellAt(x, y), sp = fl.special(x, y);
    const mark = ch === 'u' ? '↑' : ch === 'd' ? '↓' : ch === 'm' ? '×' : sp?.type === 'fountain' ? '泉' : sp?.type === 'boss' ? '!' : null;
    if (mark && s >= 7) {
      ctx.fillStyle = '#3a2210'; ctx.font = `bold ${Math.floor(s * 0.75)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(mark, X(x) + s / 2, Y(y) + s / 2 + 1);
    }
    for (let d = 0; d < 4; d++) {
      const e = edgeInfo(fl, st, x, y, d);
      if (e.kind === 'open') continue;
      const [x1, y1, x2, y2] = edgeLine(X(x), Y(y), s, d);
      ctx.strokeStyle = '#4a2a10'; ctx.lineWidth = Math.max(1.5, s / 8);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      if (e.kind !== 'wall') {
        // 扉：まん中に目印（鍵は赤、仕掛け扉は金）
        ctx.fillStyle = e.kind === 'locked' ? '#d8442c' : e.kind === 'gate' ? '#f0c64a' : '#f6e3c2';
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, r = Math.max(1.5, s * 0.16);
        ctx.fillRect(mx - r, my - r, r * 2, r * 2);
      }
    }
  }

  // 現在地（向きを示す三角）
  const px = X(st.x) + s / 2, py = Y(st.y) + s / 2, r = Math.max(3, s * 0.42);
  const ang = [-Math.PI / 2, 0, Math.PI / 2, Math.PI][st.dir];
  ctx.fillStyle = '#fff6d8'; ctx.strokeStyle = '#3a2210'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(px + Math.cos(ang) * r, py + Math.sin(ang) * r);
  ctx.lineTo(px + Math.cos(ang + 2.4) * r, py + Math.sin(ang + 2.4) * r);
  ctx.lineTo(px + Math.cos(ang - 2.4) * r, py + Math.sin(ang - 2.4) * r);
  ctx.closePath(); ctx.fill(); ctx.stroke();
}

function edgeLine(x, y, s, d) {
  if (d === 0) return [x, y, x + s, y];
  if (d === 1) return [x + s, y, x + s, y + s];
  if (d === 2) return [x, y + s, x + s, y + s];
  return [x, y, x, y + s];
}
