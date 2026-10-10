// うごく うずまき の はいけい（ひくい かいぞうどで かいて ひきのばす）
const PALETTES = {
  title: [[40, 12, 60], [150, 30, 70], [20, 60, 120]],
  forest: [[8, 26, 22], [20, 70, 52], [40, 30, 70]],
  sea: [[6, 16, 40], [16, 60, 110], [40, 20, 80]],
  tower: [[22, 8, 40], [90, 30, 120], [20, 40, 100]],
  rest: [[30, 12, 8], [120, 50, 20], [40, 16, 50]],
  shop: [[30, 20, 8], [110, 70, 20], [40, 16, 50]],
};
let running = null;
export function swirl(canvas, theme = 'title') {
  stopSwirl();
  const W = 96, H = 64;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, H);
  const pal = PALETTES[theme] || PALETTES.title;
  let t = Math.random() * 100, last = 0;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const frame = (now) => {
    if (!canvas.isConnected) { running = null; return; }
    running = requestAnimationFrame(frame);
    if (now - last < 50) return;
    last = now;
    t += reduce ? 0 : 0.012;
    const d = img.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const u = (x - W / 2) / H, v = (y - H / 2) / H;
        const r = Math.sqrt(u * u + v * v), a = Math.atan2(v, u);
        const s = Math.sin(a * 3 + r * 9 - t * 2.2) * 0.5 + Math.sin(u * 5 + t) * 0.25 + Math.cos(v * 6 - t * 1.3) * 0.25;
        const k = Math.max(0, Math.min(1, s * 0.5 + 0.5));
        const k2 = Math.max(0, Math.min(1, Math.sin(r * 6 - t * 1.6) * 0.5 + 0.5));
        const i = (y * W + x) * 4;
        for (let c = 0; c < 3; c++) d[i + c] = pal[0][c] * (1 - k) + pal[1][c] * k * (1 - k2 * 0.5) + pal[2][c] * k2 * 0.5;
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  };
  running = requestAnimationFrame(frame);
}
export function stopSwirl() { if (running) cancelAnimationFrame(running); running = null; }
