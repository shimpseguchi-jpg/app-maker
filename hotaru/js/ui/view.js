// めいきゅうの え（canvas）。うえから みた ちず・まもの・しゅじんこう・こうか
import { W, H, WALL, idx } from '../engine/game.js';
import { MOBS, areaOf } from '../data/enemies.js';
import { ITEMS } from '../data/items.js';
import { colorOf } from '../data/fireflies.js';

export const TS = 72; // 1マスの おおきさ（がめんの たんい）
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const TRAP_EMO = { warp: '🌀', sleep: '💤', spike: '📌' };
const hash = (x, y) => { let n = (x * 374761393 + y * 668265263) | 0; n = (n ^ (n >> 13)) * 1274126177; return ((n ^ (n >> 16)) >>> 0) / 4294967296; };

export class View {
  constructor(canvas, mini) {
    this.cv = canvas; this.c = canvas.getContext('2d');
    this.mini = mini; this.mc = mini.getContext('2d');
    this.w = 880; this.h = 760; this.dpr = 2;
    this.cam = null; this.pos = new Map(); this.fx = []; this.shakes = new Map(); this.quakeT = 0; this.flashT = 0; this.flashColor = '#fff';
    this.sprites = new Map();
  }
  resize(w, h) {
    this.w = w; this.h = h;
    this.cv.width = w * this.dpr; this.cv.height = h * this.dpr;
    this.cv.style.width = w + 'px'; this.cv.style.height = h + 'px';
  }
  set(G, P) { this.G = G; this.P = P; }
  reset() { this.cam = null; this.pos.clear(); this.fx = []; }
  // がめんの てん → マス
  tileAt(px, py) {
    const ox = this.w / 2 - (this.cam.x + 0.5) * TS, oy = this.h / 2 - (this.cam.y + 0.5) * TS;
    return [Math.floor((px - ox) / TS), Math.floor((py - oy) / TS)];
  }
  // ── こうか
  float(x, y, text, color = '#fff', size = 30) { this.fx.push({ k: 'float', x, y, text, color, size, t: performance.now() }); }
  beam(x0, y0, x1, y1, color = '#ffe97a') { this.fx.push({ k: 'beam', x0, y0, x1, y1, color, t: performance.now() }); }
  ring(x, y, color = '#ffe97a', r = 1.5) { this.fx.push({ k: 'ring', x, y, color, r, t: performance.now() }); }
  puff(x, y, emo) { this.fx.push({ k: 'puff', x, y, emo, t: performance.now() }); }
  shake(id) { this.shakes.set(id, performance.now()); }
  quake() { this.quakeT = performance.now(); }
  flash(color = '#fff') { this.flashT = performance.now(); this.flashColor = color; }

  sprite(emo, size) {
    const key = emo + size;
    let s = this.sprites.get(key);
    if (!s) {
      s = document.createElement('canvas');
      const px = Math.ceil(size * this.dpr * 1.3);
      s.width = s.height = px;
      const c = s.getContext('2d');
      c.font = `${size * this.dpr}px ${EMOJI_FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(emo, px / 2, px / 2 + size * this.dpr * 0.06);
      this.sprites.set(key, s);
    }
    return s;
  }
  emo(emo, cx, cy, size, alpha = 1) {
    const s = this.sprite(emo, size), d = s.width / this.dpr;
    if (alpha !== 1) this.c.globalAlpha = alpha;
    this.c.drawImage(s, cx - d / 2, cy - d / 2, d, d);
    if (alpha !== 1) this.c.globalAlpha = 1;
  }
  lerp(id, x, y, dt) {
    let p = this.pos.get(id);
    if (!p) { p = { x, y }; this.pos.set(id, p); }
    const k = Math.min(1, dt / 70);
    if (Math.abs(x - p.x) + Math.abs(y - p.y) > 3) { p.x = x; p.y = y; } // ワープは いっしゅんで
    p.x += (x - p.x) * k; p.y += (y - p.y) * k;
    return p;
  }

  draw(now) {
    const { G, P, c } = this; if (!G) return;
    const dt = Math.min(100, now - (this.last || now)); this.last = now;
    const area = areaOf(G.floor), h = G.hero;
    if (!this.cam) this.cam = { x: h.x, y: h.y };
    const ck = Math.min(1, dt / 120);
    if (Math.abs(h.x - this.cam.x) + Math.abs(h.y - this.cam.y) > 4) { this.cam.x = h.x; this.cam.y = h.y; }
    this.cam.x += (h.x - this.cam.x) * ck; this.cam.y += (h.y - this.cam.y) * ck;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.fillStyle = '#05060a'; c.fillRect(0, 0, this.w, this.h);
    let qx = 0, qy = 0;
    const q = now - this.quakeT; if (q < 260) { qx = Math.sin(q / 14) * 7 * (1 - q / 260); qy = Math.cos(q / 11) * 5 * (1 - q / 260); }
    const ox = Math.round(this.w / 2 - (this.cam.x + 0.5) * TS + qx), oy = Math.round(this.h / 2 - (this.cam.y + 0.5) * TS + qy);
    const x0 = Math.max(0, Math.floor(-ox / TS)), x1 = Math.min(W - 1, Math.floor((this.w - ox) / TS));
    const y0 = Math.max(0, Math.floor(-oy / TS)), y1 = Math.min(H - 1, Math.floor((this.h - oy) / TS));
    // ── ゆか と かべ
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = idx(x, y); if (!G.seen[i]) continue;
      const px = ox + x * TS, py = oy + y * TS, t = G.tiles[i], r = hash(x, y);
      if (t === WALL) {
        c.fillStyle = area.wall[0]; c.fillRect(px, py, TS, TS);
        if (y + 1 < H && G.tiles[idx(x, y + 1)] !== WALL) { // てまえに みえる かべの めん
          c.fillStyle = area.wall[1]; c.fillRect(px, py + TS * 0.45, TS, TS * 0.55);
          c.fillStyle = 'rgba(255,255,255,.10)'; c.fillRect(px, py + TS * 0.45, TS, 4);
          c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(px + TS * (0.2 + r * 0.5), py + TS * 0.6, 3, TS * 0.25);
        } else if (r < 0.25) { c.fillStyle = 'rgba(255,255,255,.04)'; c.fillRect(px + r * 160, py + 20, 14, 10); }
      } else {
        c.fillStyle = area.floor[(x + y) & 1]; c.fillRect(px, py, TS, TS);
        if (t === 2) { c.fillStyle = 'rgba(0,0,0,.14)'; c.fillRect(px, py, TS, TS); }
        if (r < 0.3) { c.fillStyle = 'rgba(255,255,255,.07)'; c.beginPath(); c.arc(px + 14 + r * 150, py + 16 + ((r * 977) % 1) * 40, 3 + r * 8, 0, 7); c.fill(); }
        if (y > 0 && G.tiles[idx(x, y - 1)] === WALL) { c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(px, py, TS, 8); }
      }
      if (!G.vis[i]) { c.fillStyle = 'rgba(4,5,12,.58)'; c.fillRect(px, py, TS, TS); }
    }
    // ── おいてある もの
    for (const o of G.objs) {
      const i = idx(o.x, o.y); if (!G.seen[i] || o.x < x0 || o.x > x1 || o.y < y0 || o.y > y1) continue;
      const cx = ox + o.x * TS + TS / 2, cy = oy + o.y * TS + TS / 2, a = G.vis[i] ? 1 : 0.45;
      c.globalAlpha = a;
      if (o.t === 'stairs') this.stairs(cx, cy, G.bossAlive);
      else if (o.t === 'chest') this.chest(cx, cy);
      else if (o.t === 'cage') this.cage(cx, cy, colorOf(o.id), now);
      else if (o.t === 'spring') { this.emo('⛲', cx, cy, TS * 0.7, o.used ? a * 0.4 : a); }
      else if (o.t === 'gold') this.emo('💰', cx, cy + 4, TS * 0.5, a);
      else if (o.t === 'trap') this.emo(TRAP_EMO[o.kind], cx, cy, TS * 0.5, a * 0.9);
      else if (o.t === 'item') { c.fillStyle = 'rgba(255,255,255,.16)'; c.beginPath(); c.ellipse(cx, cy + TS * 0.28, TS * 0.26, TS * 0.09, 0, 0, 7); c.fill(); this.emo(ITEMS[o.id].emo, cx, cy + Math.sin(now / 400 + o.x) * 3, TS * 0.52, a); }
      c.globalAlpha = 1;
    }
    // ── まもの
    const alive = new Set(['hero']);
    for (const m of G.mobs) {
      alive.add(m.id);
      if (!G.vis[idx(m.x, m.y)]) { this.pos.delete(m.id); continue; }
      const d = MOBS[m.kind], p = this.lerp(m.id, m.x, m.y, dt);
      let cx = ox + p.x * TS + TS / 2, cy = oy + p.y * TS + TS / 2;
      const sh = now - (this.shakes.get(m.id) || 0); if (sh < 220) cx += Math.sin(sh / 12) * 6;
      const size = d.big ? TS * 1.25 : TS * 0.74, bob = m.nap || m.stun ? 0 : Math.sin(now / 260 + m.id) * 3;
      c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(cx, cy + TS * 0.34, size * 0.36, size * 0.12, 0, 0, 7); c.fill();
      this.emo(d.emo, cx, cy - (d.big ? TS * 0.18 : 0) + bob, size, m.nap ? 0.8 : 1);
      if (m.nap) this.emo('💤', cx + TS * 0.3, cy - TS * 0.34 + Math.sin(now / 500) * 3, TS * 0.34);
      else if (m.stun) this.emo('💫', cx + TS * 0.28, cy - TS * 0.34, TS * 0.34);
      if (m.hp < d.hp) this.bar(cx, cy + TS * 0.42, d.big ? TS * 1.1 : TS * 0.7, m.hp / d.hp);
    }
    for (const id of this.pos.keys()) if (!alive.has(id)) this.pos.delete(id);
    // ── しゅじんこう と ほたる
    {
      const p = this.lerp('hero', h.x, h.y, dt);
      let cx = ox + p.x * TS + TS / 2; const cy = oy + p.y * TS + TS / 2;
      const sh = now - (this.shakes.get('hero') || 0); if (sh < 220) cx += Math.sin(sh / 12) * 6;
      const g = c.createRadialGradient(cx, cy, 6, cx, cy, TS * 1.5);
      g.addColorStop(0, 'rgba(255,236,150,.30)'); g.addColorStop(1, 'rgba(255,236,150,0)');
      c.fillStyle = g; c.beginPath(); c.arc(cx, cy, TS * 1.5, 0, 7); c.fill();
      c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(cx, cy + TS * 0.34, TS * 0.26, TS * 0.09, 0, 0, 7); c.fill();
      this.emo(h.sleep ? '😴' : '🧒', cx - 3, cy - 2, TS * 0.74);
      this.emo('🏮', cx + TS * 0.3, cy + TS * 0.16, TS * 0.34);
      P.fireflies.forEach((id, k) => {
        const a = now / 600 + k * 2.1 * 0.7, fx = cx + Math.cos(a) * TS * 0.46, fy = cy - TS * 0.1 + Math.sin(a * 1.3) * TS * 0.3;
        const col = colorOf(id);
        c.shadowColor = col; c.shadowBlur = 14; c.fillStyle = col; c.beginPath(); c.arc(fx, fy, 5, 0, 7); c.fill(); c.shadowBlur = 0;
      });
      if (h.poison) this.emo('🤢', cx - TS * 0.32, cy - TS * 0.36, TS * 0.3);
    }
    // ── こうか
    this.fx = this.fx.filter((f) => {
      const t = now - f.t;
      if (f.k === 'float') {
        if (t > 900) return false;
        const cx = ox + f.x * TS + TS / 2, cy = oy + f.y * TS + TS * 0.2 - t * 0.06;
        c.globalAlpha = t > 600 ? 1 - (t - 600) / 300 : 1;
        c.font = `900 ${f.size}px "Zen Maru Gothic",sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.lineWidth = 6; c.strokeStyle = 'rgba(10,10,30,.9)'; c.lineJoin = 'round'; c.strokeText(f.text, cx, cy);
        c.fillStyle = f.color; c.fillText(f.text, cx, cy); c.globalAlpha = 1;
      } else if (f.k === 'beam') {
        if (t > 220) return false;
        c.globalAlpha = 1 - t / 220; c.strokeStyle = f.color; c.lineWidth = 10; c.lineCap = 'round'; c.shadowColor = f.color; c.shadowBlur = 20;
        c.beginPath(); c.moveTo(ox + f.x0 * TS + TS / 2, oy + f.y0 * TS + TS / 2); c.lineTo(ox + f.x1 * TS + TS / 2, oy + f.y1 * TS + TS / 2); c.stroke();
        c.shadowBlur = 0; c.globalAlpha = 1;
      } else if (f.k === 'ring') {
        if (t > 320) return false;
        c.globalAlpha = 1 - t / 320; c.strokeStyle = f.color; c.lineWidth = 8;
        c.beginPath(); c.arc(ox + f.x * TS + TS / 2, oy + f.y * TS + TS / 2, TS * f.r * (0.3 + 0.7 * t / 320), 0, 7); c.stroke(); c.globalAlpha = 1;
      } else if (f.k === 'puff') {
        if (t > 420) return false;
        this.emo(f.emo, ox + f.x * TS + TS / 2, oy + f.y * TS + TS / 2 - t * 0.05, TS * (0.5 + t / 900), 1 - t / 420);
      }
      return true;
    });
    // ── まわりを くらく
    const hx = ox + (this.pos.get('hero')?.x ?? h.x) * TS + TS / 2, hy = oy + (this.pos.get('hero')?.y ?? h.y) * TS + TS / 2;
    const v = c.createRadialGradient(hx, hy, TS * 2.5, hx, hy, TS * 7.5);
    v.addColorStop(0, 'rgba(0,0,10,0)'); v.addColorStop(1, 'rgba(0,0,10,.5)');
    c.fillStyle = v; c.fillRect(0, 0, this.w, this.h);
    const fl = now - this.flashT; if (fl < 300) { c.globalAlpha = 0.6 * (1 - fl / 300); c.fillStyle = this.flashColor; c.fillRect(0, 0, this.w, this.h); c.globalAlpha = 1; }
  }
  bar(cx, cy, w, r) {
    const c = this.c; c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(cx - w / 2 - 2, cy - 2, w + 4, 10);
    c.fillStyle = r > 0.5 ? '#6fe07b' : r > 0.25 ? '#ffc94a' : '#ff6a5a'; c.fillRect(cx - w / 2, cy, w * Math.max(0, r), 6);
  }
  stairs(cx, cy, locked) {
    const c = this.c, s = TS * 0.8;
    c.fillStyle = '#0b0b14'; c.fillRect(cx - s / 2, cy - s / 2, s, s);
    for (let k = 0; k < 4; k++) { c.fillStyle = `rgba(210,200,170,${0.85 - k * 0.2})`; c.fillRect(cx - s / 2 + 4, cy - s / 2 + 4 + k * (s - 8) / 4, s - 8 - k * 9, (s - 8) / 4 - 3); }
    if (locked) this.emo('🔒', cx, cy, TS * 0.4);
  }
  chest(cx, cy) {
    const c = this.c, w = TS * 0.62, h = TS * 0.46;
    c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(cx, cy + h / 2 + 4, w * 0.55, 6, 0, 0, 7); c.fill();
    c.fillStyle = '#8a5326'; c.beginPath(); c.roundRect(cx - w / 2, cy - h / 2, w, h, 8); c.fill();
    c.fillStyle = '#a96a32'; c.beginPath(); c.roundRect(cx - w / 2, cy - h / 2, w, h * 0.42, [8, 8, 0, 0]); c.fill();
    c.fillStyle = '#ffd24a'; c.fillRect(cx - w / 2, cy - h * 0.1, w, 5); c.beginPath(); c.roundRect(cx - 7, cy - h * 0.2, 14, 16, 3); c.fill();
  }
  cage(cx, cy, col, now) {
    const c = this.c, r = TS * 0.26, by = Math.sin(now / 300) * 2;
    c.shadowColor = col; c.shadowBlur = 22 + Math.sin(now / 250) * 8; c.fillStyle = col; c.beginPath(); c.arc(cx, cy + by, 8, 0, 7); c.fill(); c.shadowBlur = 0;
    c.strokeStyle = '#c9c4b0'; c.lineWidth = 3; c.beginPath(); c.roundRect(cx - r, cy - r, r * 2, r * 2, [r, r, 4, 4]); c.stroke();
    for (const dx of [-r * 0.5, 0, r * 0.5]) { c.beginPath(); c.moveTo(cx + dx, cy - r); c.lineTo(cx + dx, cy + r); c.stroke(); }
    this.emo('❗', cx + TS * 0.3, cy - TS * 0.32, TS * 0.26);
  }
  // ── ちいさな ちず
  drawMini() {
    const { G, mc } = this; if (!G) return;
    const s = this.mini.width / W;
    mc.clearRect(0, 0, this.mini.width, this.mini.height);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = idx(x, y); if (!G.seen[i] || G.tiles[i] === WALL) continue;
      mc.fillStyle = G.vis[i] ? 'rgba(210,225,255,.85)' : 'rgba(150,165,205,.55)'; mc.fillRect(x * s, y * s, s, s);
    }
    const dot = (x, y, col, k = 1) => { mc.fillStyle = col; mc.fillRect(x * s - (k - 1) * s / 2, y * s - (k - 1) * s / 2, s * k, s * k); };
    for (const o of G.objs) {
      if (!G.seen[idx(o.x, o.y)]) continue;
      dot(o.x, o.y, o.t === 'stairs' ? '#ffb02e' : o.t === 'cage' ? '#7dffb0' : o.t === 'trap' ? '#c66' : o.t === 'spring' ? '#59d0ff' : '#f6e58d', o.t === 'stairs' ? 1.6 : 1);
    }
    for (const m of G.mobs) if (G.vis[idx(m.x, m.y)]) dot(m.x, m.y, '#ff5a5a', MOBS[m.kind].boss ? 1.8 : 1.2);
    dot(G.hero.x, G.hero.y, '#fff', 1.6);
  }
}
