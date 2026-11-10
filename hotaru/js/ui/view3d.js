// めいきゅうの え（3D）。ななめ うえから みおろす カメラ・たかさの ある かべ・ランタンの あかり
// WebGL を じかに つかう（ライブラリ なし）。まもの・どうぐは えもじの いた（ビルボード）
// もじ・HPバー・こうかは うえに かさねた 2D の canvas に かく。つかいかたは view.js の View と おなじ
import { W, H, WALL, idx } from '../engine/game.js';
import { MOBS, areaOf } from '../data/enemies.js';
import { ITEMS } from '../data/items.js';
import { colorOf } from '../data/fireflies.js';

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const TRAP_EMO = { warp: '🌀', sleep: '💤', spike: '📌' };
const WALL_H = 0.62, FOV = 40 * Math.PI / 180, CAM_UP = 11.4, CAM_BACK = 5.4;
const hash = (x, y) => { let n = (x * 374761393 + y * 668265263) | 0; n = (n ^ (n >> 13)) * 1274126177; return ((n ^ (n >> 16)) >>> 0) / 4294967296; };
const rgb = (hex) => [parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255];

// ── ぎょうれつ（れつ ゆうせん）
function perspective(fov, aspect, near, far) {
  const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far);
  return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
function lookAt(eye, at) {
  const f = norm(sub(at, eye)), r = norm(cross(f, [0, 1, 0])), u = cross(r, f);
  return { m: [r[0], u[0], -f[0], 0, r[1], u[1], -f[1], 0, r[2], u[2], -f[2], 0, -dot(r, eye), -dot(u, eye), dot(f, eye), 1], r, u, f };
}
function mul(a, b) {
  const o = new Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  return o;
}

const VS = `
attribute vec3 aPos; attribute vec3 aNor; attribute vec3 aCol; attribute float aLit; attribute float aKind;
uniform mat4 uPV;
varying vec3 vPos; varying vec3 vNor; varying vec3 vCol; varying float vLit; varying float vKind;
void main() { vPos = aPos; vNor = aNor; vCol = aCol; vLit = aLit; vKind = aKind; gl_Position = uPV * vec4(aPos, 1.0); }`;
const FS = `
precision mediump float;
uniform vec3 uHero; uniform float uLight;
varying vec3 vPos; varying vec3 vNor; varying vec3 vCol; varying float vLit; varying float vKind;
void main() {
  vec3 c = vCol;
  if (vKind < 0.5) { // ゆか：いしだたみの めじ
    vec2 f = fract(vPos.xz);
    float e = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
    c *= 0.82 + 0.18 * smoothstep(0.0, 0.07, e);
  } else if (vKind < 1.5) { // かべの よこ：つみいし
    float row = floor(vPos.y / 0.21);
    float u = (abs(vNor.x) > 0.5 ? vPos.z : vPos.x) + mod(row, 2.0) * 0.25;
    float e = min(fract(vPos.y / 0.21), 1.0 - fract(vPos.y / 0.21)) * 0.21;
    float e2 = min(fract(u * 2.0), 1.0 - fract(u * 2.0)) * 0.5;
    c *= 0.72 + 0.28 * smoothstep(0.0, 0.03, min(e, e2));
    c *= 0.75 + 0.25 * (vPos.y / ${WALL_H.toFixed(2)});
  }
  if (vKind > 1.5) { // かべの うえ：ゆかと みわけが つく ように くらく、ふちを すこし あかるく
    vec2 f = fract(vPos.xz);
    float e = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
    c *= 0.5 + 0.12 * (1.0 - smoothstep(0.0, 0.1, e));
  }
  float diff = 0.62 + 0.38 * max(dot(normalize(vNor), normalize(vec3(-0.35, 0.85, 0.4))), 0.0);
  float d = distance(vPos.xz, uHero.xz);
  float lamp = exp(-d * d / (uLight * uLight * 0.55)); // ランタンの あかり
  vec3 col = c * diff * (0.5 + 0.75 * lamp) + vec3(1.0, 0.82, 0.45) * lamp * (vKind > 1.5 ? 0.02 : 0.10);
  gl_FragColor = vec4(col * vLit, 1.0);
}`;
const SVS = `
attribute vec2 aCorner;
uniform mat4 uPV; uniform vec3 uBase; uniform vec3 uRight; uniform vec3 uUp; uniform vec2 uSize;
varying vec2 vUv;
void main() { vUv = vec2(aCorner.x + 0.5, aCorner.y); gl_Position = uPV * vec4(uBase + uRight * aCorner.x * uSize.x + uUp * aCorner.y * uSize.y, 1.0); }`;
const SFS = `
precision mediump float;
uniform sampler2D uTex; uniform vec4 uTint;
varying vec2 vUv;
void main() { vec4 t = texture2D(uTex, vUv) * uTint; if (t.a < 0.02) discard; gl_FragColor = t; }`;

export class View3D {
  static supported() {
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch (e) { return false; }
  }
  constructor(canvas, mini) {
    this.cv = canvas; this.c = canvas.getContext('2d'); // うえに かさねる 2D（もじ・こうか）
    this.mini = mini; this.mc = mini.getContext('2d');
    this.glcv = document.createElement('canvas'); this.glcv.className = 'cv3d';
    canvas.parentElement.insertBefore(this.glcv, canvas);
    const gl = this.gl = this.glcv.getContext('webgl', { antialias: true, alpha: false }) || this.glcv.getContext('experimental-webgl');
    this.w = 880; this.h = 760; this.dpr = 2;
    this.cam = null; this.pos = new Map(); this.fx = []; this.shakes = new Map(); this.quakeT = 0; this.flashT = 0; this.flashColor = '#fff';
    this.tex = new Map(); this.sig = ''; this.count = 0;
    this.prog = this.program(VS, FS); this.sprog = this.program(SVS, SFS);
    this.vbo = gl.createBuffer();
    this.quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.5, 0, 0.5, 0, 0.5, 1, -0.5, 0, 0.5, 1, -0.5, 1]), gl.STATIC_DRAW);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  }
  destroy() { this.glcv.remove(); this.c.clearRect(0, 0, this.cv.width, this.cv.height); }
  program(vs, fs) {
    const gl = this.gl, p = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      gl.attachShader(p, s);
    }
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const loc = {}; const u = (n) => (loc[n] ??= gl.getUniformLocation(p, n)); const a = (n) => (loc['@' + n] ??= gl.getAttribLocation(p, n));
    return { p, u, a };
  }
  resize(w, h) {
    this.w = w; this.h = h;
    for (const cv of [this.cv, this.glcv]) { cv.width = w * this.dpr; cv.height = h * this.dpr; cv.style.width = w + 'px'; cv.style.height = h + 'px'; }
  }
  set(G, P) { this.G = G; this.P = P; this.sig = ''; }
  reset() { this.cam = null; this.pos.clear(); this.fx = []; this.sig = ''; }

  // ── こうか（view.js と おなじ よびかた）
  float(x, y, text, color = '#fff', size = 30) { this.fx.push({ k: 'float', x, y, text, color, size, t: performance.now() }); }
  beam(x0, y0, x1, y1, color = '#ffe97a') { this.fx.push({ k: 'beam', x0, y0, x1, y1, color, t: performance.now() }); }
  ring(x, y, color = '#ffe97a', r = 1.5) { this.fx.push({ k: 'ring', x, y, color, r, t: performance.now() }); }
  puff(x, y, emo) { this.fx.push({ k: 'puff', x, y, emo, t: performance.now() }); }
  shake(id) { this.shakes.set(id, performance.now()); }
  quake() { this.quakeT = performance.now(); }
  flash(color = '#fff') { this.flashT = performance.now(); this.flashColor = color; }

  // ── テクスチャ（えもじ・じぶんで かいた え）
  texture(key, paint, size = 128) {
    let t = this.tex.get(key);
    if (t) return t;
    const gl = this.gl, cv = document.createElement('canvas'); cv.width = cv.height = size;
    paint(cv.getContext('2d'), size);
    t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.tex.set(key, t);
    return t;
  }
  emoTex(emo) {
    return this.texture('e' + emo, (c, s) => { c.font = `${s * 0.78}px ${EMOJI_FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(emo, s / 2, s / 2 + s * 0.05); });
  }
  glowTex() {
    return this.texture('glow', (c, s) => { const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, s, s); }, 64);
  }
  shadowTex() {
    return this.texture('shadow', (c, s) => { const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(0,0,0,.5)'); g.addColorStop(0.6, 'rgba(0,0,0,.3)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, s, s); }, 64);
  }
  stairsTex(locked) {
    return this.texture('stairs' + locked, (c, s) => {
      c.fillStyle = '#07070d'; c.fillRect(s * 0.06, s * 0.06, s * 0.88, s * 0.88);
      for (let k = 0; k < 5; k++) { c.fillStyle = `rgba(215,205,175,${0.95 - k * 0.19})`; c.fillRect(s * 0.1, s * 0.1 + k * s * 0.16, s * 0.8 - k * s * 0.1, s * 0.13); }
      if (locked) { c.font = `${s * 0.45}px ${EMOJI_FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🔒', s / 2, s / 2); }
    });
  }
  chestTex() {
    return this.texture('chest', (c, s) => {
      const w = s * 0.74, h = s * 0.56, x = (s - w) / 2, y = s * 0.36;
      c.fillStyle = '#8a5326'; c.beginPath(); c.roundRect(x, y, w, h, s * 0.08); c.fill();
      c.fillStyle = '#b5743a'; c.beginPath(); c.roundRect(x, y, w, h * 0.42, [s * 0.08, s * 0.08, 0, 0]); c.fill();
      c.fillStyle = '#ffd24a'; c.fillRect(x, y + h * 0.4, w, s * 0.05); c.beginPath(); c.roundRect(s / 2 - s * 0.06, y + h * 0.3, s * 0.12, s * 0.15, 3); c.fill();
      c.fillRect(x + w * 0.1, y, s * 0.04, h); c.fillRect(x + w * 0.86, y, s * 0.04, h);
    });
  }
  cageTex() {
    return this.texture('cage', (c, s) => {
      const r = s * 0.3, cx = s / 2, cy = s * 0.6;
      c.strokeStyle = '#d9d4c0'; c.lineWidth = s * 0.035;
      c.beginPath(); c.roundRect(cx - r, cy - r, r * 2, r * 2, [r, r, 5, 5]); c.stroke();
      for (const dx of [-r * 0.5, 0, r * 0.5]) { c.beginPath(); c.moveTo(cx + dx, cy - r); c.lineTo(cx + dx, cy + r); c.stroke(); }
      c.fillStyle = '#d9d4c0'; c.fillRect(cx - r * 1.1, cy + r - 2, r * 2.2, s * 0.05);
    });
  }

  // ── カメラ
  camera(now) {
    const h = this.G.hero;
    let qx = 0, qz = 0; const q = now - this.quakeT;
    if (q < 260) { qx = Math.sin(q / 14) * 0.1 * (1 - q / 260); qz = Math.cos(q / 11) * 0.07 * (1 - q / 260); }
    const at = [this.cam.x + 0.5 + qx, 0, this.cam.y + 0.5 + qz], eye = [at[0], CAM_UP, at[2] + CAM_BACK];
    const v = lookAt(eye, at), aspect = this.w / this.h;
    this.eye = eye; this.basis = v; this.aspect = aspect;
    this.pv = mul(perspective(FOV, aspect, 0.5, 60), v.m);
    void h;
  }
  // せかいの てん → がめんの てん
  project(x, y, z) {
    const m = this.pv, cx = m[0] * x + m[4] * y + m[8] * z + m[12], cy = m[1] * x + m[5] * y + m[9] * z + m[13], cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    return [(cx / cw * 0.5 + 0.5) * this.w, (1 - (cy / cw * 0.5 + 0.5)) * this.h, this.h / cw * 1.3]; // 3つめ：その ばしょでの 1マスの おおよその おおきさ
  }
  // がめんの てん → マス（まものの からだを タップ したら その まものの マス）
  tileAt(px, py) {
    if (!this.pv) return [-1, -1];
    for (const m of this.G.mobs) {
      if (!this.G.vis[idx(m.x, m.y)]) continue;
      const [sx, sy, s] = this.project(m.x + 0.5, 0.4, m.y + 0.5);
      if (Math.hypot(px - sx, py - sy) < s * 0.42) return [m.x, m.y];
    }
    const t = Math.tan(FOV / 2), nx = (px / this.w * 2 - 1) * t * this.aspect, ny = (1 - py / this.h * 2) * t, { r, u, f } = this.basis;
    const d = [f[0] + r[0] * nx + u[0] * ny, f[1] + r[1] * nx + u[1] * ny, f[2] + r[2] * nx + u[2] * ny];
    if (d[1] >= -1e-4) return [-1, -1];
    const k = -this.eye[1] / d[1];
    return [Math.floor(this.eye[0] + d[0] * k), Math.floor(this.eye[2] + d[2] * k)];
  }

  // ── ゆか と かべの かたち（みた ことの ある ところ だけ）
  build() {
    const G = this.G, area = areaOf(G.floor), v = [];
    const fl = area.floor.map(rgb), wt = rgb(area.wall[0]).map((c) => c * 1.15), ws = rgb(area.wall[1]).map((c) => c * 1.25);
    const quad = (p, n, col, lit, kind) => { for (const i of [0, 1, 2, 0, 2, 3]) v.push(p[i][0], p[i][1], p[i][2], n[0], n[1], n[2], col[0], col[1], col[2], lit, kind); };
    const isWall = (x, y) => x < 0 || y < 0 || x >= W || y >= H || G.tiles[idx(x, y)] === WALL;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = idx(x, y); if (!G.seen[i]) continue;
      const lit = G.vis[i] ? 1 : 0.36, r = hash(x, y), t = G.tiles[i];
      if (t !== WALL) {
        const c = fl[(x + y) & 1].map((k) => k * (t === 2 ? 0.8 : 1) * (0.93 + r * 0.14));
        quad([[x, 0, y + 1], [x + 1, 0, y + 1], [x + 1, 0, y], [x, 0, y]], [0, 1, 0], c, lit, 0);
        continue;
      }
      const top = wt.map((k) => k * (0.9 + r * 0.2)), h = WALL_H;
      quad([[x, h, y + 1], [x + 1, h, y + 1], [x + 1, h, y], [x, h, y]], [0, 1, 0], top, lit, 2);
      // よこの めん：となりが ゆかで、みた ことが ある ところ だけ
      const side = (nx, ny, p, n) => { if (!isWall(nx, ny) && G.seen[idx(nx, ny)]) quad(p, n, ws, G.vis[idx(nx, ny)] ? 1 : 0.36, 1); };
      side(x, y + 1, [[x, 0, y + 1], [x + 1, 0, y + 1], [x + 1, h, y + 1], [x, h, y + 1]], [0, 0, 1]);
      side(x, y - 1, [[x + 1, 0, y], [x, 0, y], [x, h, y], [x + 1, h, y]], [0, 0, -1]);
      side(x + 1, y, [[x + 1, 0, y + 1], [x + 1, 0, y], [x + 1, h, y], [x + 1, h, y + 1]], [1, 0, 0]);
      side(x - 1, y, [[x, 0, y], [x, 0, y + 1], [x, h, y + 1], [x, h, y]], [-1, 0, 0]);
    }
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.DYNAMIC_DRAW);
    this.count = v.length / 11;
  }

  lerp(id, x, y, dt) {
    let p = this.pos.get(id);
    if (!p) { p = { x, y }; this.pos.set(id, p); }
    const k = Math.min(1, dt / 70);
    if (Math.abs(x - p.x) + Math.abs(y - p.y) > 3) { p.x = x; p.y = y; }
    p.x += (x - p.x) * k; p.y += (y - p.y) * k;
    return p;
  }
  // えの いた。flat＝ゆかに ねかせる / そうでなければ カメラの ほうを むいて たつ
  sprite(tex, x, y, z, w, h, { flat = false, alpha = 1, tint = [1, 1, 1], add = false } = {}) {
    const gl = this.gl, s = this.sprog, b = this.basis;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.blendFunc(gl.ONE, add ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform3f(s.u('uBase'), x, y, flat ? z + h / 2 : z);
    gl.uniform3f(s.u('uRight'), 1, 0, 0);
    if (flat) gl.uniform3f(s.u('uUp'), 0, 0, -1); else gl.uniform3f(s.u('uUp'), b.u[0], b.u[1], b.u[2]);
    gl.uniform2f(s.u('uSize'), w, h);
    gl.uniform4f(s.u('uTint'), tint[0] * alpha, tint[1] * alpha, tint[2] * alpha, alpha);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  draw(now) {
    const { G, P, gl } = this; if (!G) return;
    const dt = Math.min(100, now - (this.last || now)); this.last = now;
    const h = G.hero;
    if (!this.cam) this.cam = { x: h.x, y: h.y };
    const ck = Math.min(1, dt / 120);
    if (Math.abs(h.x - this.cam.x) + Math.abs(h.y - this.cam.y) > 4) { this.cam.x = h.x; this.cam.y = h.y; }
    this.cam.x += (h.x - this.cam.x) * ck; this.cam.y += (h.y - this.cam.y) * ck;
    this.camera(now);
    let seen = 0; for (let i = 0; i < G.seen.length; i++) seen += G.seen[i];
    const sig = `${G.floor}|${G.turn}|${h.x},${h.y}|${seen}`;
    if (sig !== this.sig) { this.sig = sig; this.build(); }

    gl.viewport(0, 0, this.glcv.width, this.glcv.height);
    gl.clearColor(0.016, 0.02, 0.04, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND);
    // ── ゆか と かべ
    const hp = this.lerp('hero', h.x, h.y, dt), m = this.prog;
    gl.useProgram(m.p);
    gl.uniformMatrix4fv(m.u('uPV'), false, new Float32Array(this.pv));
    gl.uniform3f(m.u('uHero'), hp.x + 0.5, 0, hp.y + 0.5); gl.uniform1f(m.u('uLight'), 4.6 + Math.sin(now / 700) * 0.12);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    const F = 4, stride = 11 * F;
    for (const [name, size, off] of [['aPos', 3, 0], ['aNor', 3, 3], ['aCol', 3, 6], ['aLit', 1, 9], ['aKind', 1, 10]]) { const a = m.a(name); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, size, gl.FLOAT, false, stride, off * F); }
    gl.drawArrays(gl.TRIANGLES, 0, this.count);
    for (const name of ['aNor', 'aCol', 'aLit', 'aKind']) gl.disableVertexAttribArray(m.a(name));

    // ── えの いた（ゆかに ねかせる もの → たっている もの。とおい じゅん）
    const s = this.sprog;
    gl.useProgram(s.p); gl.uniformMatrix4fv(s.u('uPV'), false, new Float32Array(this.pv));
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad); const ac = s.a('aCorner'); gl.enableVertexAttribArray(ac); gl.vertexAttribPointer(ac, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND); gl.depthMask(false);
    const stand = [], overlay = [];
    const shadow = (x, z, size) => this.sprite(this.shadowTex(), x, 0.012, z, size, size * 0.8, { flat: true });
    for (const o of G.objs) {
      const i = idx(o.x, o.y); if (!G.seen[i]) continue;
      const a = G.vis[i] ? 1 : 0.4, cx = o.x + 0.5, cz = o.y + 0.5;
      if (o.t === 'stairs') this.sprite(this.stairsTex(G.bossAlive), cx, 0.01, cz, 0.9, 0.9, { flat: true, alpha: a });
      else if (o.t === 'trap') this.sprite(this.emoTex(TRAP_EMO[o.kind]), cx, 0.01, cz, 0.7, 0.7, { flat: true, alpha: a * 0.9 });
      else {
        shadow(cx, cz, 0.6);
        if (o.t === 'chest') stand.push({ z: cz, f: () => this.sprite(this.chestTex(), cx, 0, cz, 0.78, 0.78, { alpha: a }) });
        else if (o.t === 'spring') stand.push({ z: cz, f: () => this.sprite(this.emoTex('⛲'), cx, 0, cz, 0.85, 0.85, { alpha: o.used ? a * 0.4 : a }) });
        else if (o.t === 'gold') stand.push({ z: cz, f: () => this.sprite(this.emoTex('💰'), cx, 0, cz, 0.55, 0.55, { alpha: a }) });
        else if (o.t === 'item') stand.push({ z: cz, f: () => this.sprite(this.emoTex(ITEMS[o.id].emo), cx, 0.06 + Math.sin(now / 400 + o.x) * 0.04, cz, 0.55, 0.55, { alpha: a }) });
        else if (o.t === 'cage') {
          const col = rgb(colorOf(o.id));
          stand.push({ z: cz, f: () => {
            this.sprite(this.glowTex(), cx, 0.1 + Math.sin(now / 300) * 0.03, cz - 0.01, 0.7, 0.7, { tint: col, add: true, alpha: 0.8 + Math.sin(now / 250) * 0.2 });
            this.sprite(this.cageTex(), cx, 0, cz, 0.8, 0.8, { alpha: a });
          } });
          overlay.push({ x: cx + 0.3, y: 0.85, z: cz, emo: '❗', size: 0.3 });
        }
      }
    }
    const alive = new Set(['hero']);
    for (const mob of G.mobs) {
      alive.add(mob.id);
      if (!G.vis[idx(mob.x, mob.y)]) { this.pos.delete(mob.id); continue; }
      const d = MOBS[mob.kind], p = this.lerp(mob.id, mob.x, mob.y, dt);
      let cx = p.x + 0.5; const cz = p.y + 0.5;
      const sh = now - (this.shakes.get(mob.id) || 0); if (sh < 220) cx += Math.sin(sh / 12) * 0.08;
      const size = d.big ? 1.45 : 0.86, bob = mob.nap || mob.stun ? 0 : Math.abs(Math.sin(now / 260 + mob.id)) * 0.06;
      shadow(cx, cz, size * 0.8);
      stand.push({ z: cz, f: () => this.sprite(this.emoTex(d.emo), cx, bob, cz, size, size, { alpha: mob.nap ? 0.8 : 1 }) });
      if (mob.nap) overlay.push({ x: cx + 0.3, y: size * 0.85, z: cz, emo: '💤', size: 0.34, bob: true });
      else if (mob.stun) overlay.push({ x: cx + 0.3, y: size * 0.85, z: cz, emo: '💫', size: 0.34 });
      if (mob.hp < d.hp) overlay.push({ x: cx, y: -0.05, z: cz + 0.42, bar: mob.hp / d.hp, w: d.big ? 1.1 : 0.7 });
    }
    for (const id of this.pos.keys()) if (!alive.has(id)) this.pos.delete(id);
    { // しゅじんこう・ランタン・ほたる
      let cx = hp.x + 0.5; const cz = hp.y + 0.5;
      const sh = now - (this.shakes.get('hero') || 0); if (sh < 220) cx += Math.sin(sh / 12) * 0.08;
      shadow(cx, cz, 0.7);
      this.sprite(this.glowTex(), cx, 0.012, cz, 3.2, 3.2, { flat: true, tint: [1, 0.85, 0.5], add: true, alpha: 0.2 });
      stand.push({ z: cz, f: () => {
        this.sprite(this.emoTex(h.sleep ? '😴' : '🧒'), cx - 0.03, 0, cz, 0.88, 0.88);
        this.sprite(this.emoTex('🏮'), cx + 0.33, 0.12, cz + 0.01, 0.38, 0.38);
        P.fireflies.forEach((id, k) => {
          const a = now / 600 + k * 1.47;
          this.sprite(this.glowTex(), cx + Math.cos(a) * 0.5, 0.45 + Math.sin(a * 1.3) * 0.3, cz + Math.sin(a) * 0.18, 0.26, 0.26, { tint: rgb(colorOf(id)), add: true });
        });
      } });
      if (h.poison) overlay.push({ x: cx - 0.34, y: 0.95, z: cz, emo: '🤢', size: 0.3 });
    }
    stand.sort((a, b) => a.z - b.z).forEach((o) => o.f());
    gl.disableVertexAttribArray(ac);
    gl.depthMask(true); gl.disable(gl.BLEND);

    this.overlay(now, overlay, hp);
  }

  // ── うえに かさねる 2D：HPバー・きごう・すうじ・ひかりの せん・まわりの くらさ
  emo2d(emo, x, y, size, alpha = 1) {
    const c = this.c; c.globalAlpha = alpha; c.font = `${size}px ${EMOJI_FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(emo, x, y); c.globalAlpha = 1;
  }
  overlay(now, list, hp) {
    const c = this.c;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); c.clearRect(0, 0, this.w, this.h);
    for (const o of list) {
      const [x, y, s] = this.project(o.x, o.y, o.z);
      if (o.bar !== undefined) {
        const w = o.w * s;
        c.fillStyle = 'rgba(0,0,0,.65)'; c.fillRect(x - w / 2 - 2, y - 2, w + 4, 10);
        c.fillStyle = o.bar > 0.5 ? '#6fe07b' : o.bar > 0.25 ? '#ffc94a' : '#ff6a5a'; c.fillRect(x - w / 2, y, w * Math.max(0, o.bar), 6);
      } else this.emo2d(o.emo, x, y + (o.bob ? Math.sin(now / 500) * 3 : 0), o.size * s);
    }
    this.fx = this.fx.filter((f) => {
      const t = now - f.t;
      if (f.k === 'float') {
        if (t > 900) return false;
        const [x, y] = this.project(f.x + 0.5, 0.9, f.y + 0.5);
        c.globalAlpha = t > 600 ? 1 - (t - 600) / 300 : 1;
        c.font = `900 ${f.size}px "Zen Maru Gothic",sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.lineWidth = 6; c.strokeStyle = 'rgba(10,10,30,.9)'; c.lineJoin = 'round'; c.strokeText(f.text, x, y - t * 0.06);
        c.fillStyle = f.color; c.fillText(f.text, x, y - t * 0.06); c.globalAlpha = 1;
      } else if (f.k === 'beam') {
        if (t > 220) return false;
        const a = this.project(f.x0 + 0.5, 0.45, f.y0 + 0.5), b = this.project(f.x1 + 0.5, 0.45, f.y1 + 0.5);
        c.globalAlpha = 1 - t / 220; c.strokeStyle = f.color; c.lineWidth = 10; c.lineCap = 'round'; c.shadowColor = f.color; c.shadowBlur = 20;
        c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); c.shadowBlur = 0; c.globalAlpha = 1;
      } else if (f.k === 'ring') {
        if (t > 320) return false;
        const r = f.r * (0.3 + 0.7 * t / 320);
        c.globalAlpha = 1 - t / 320; c.strokeStyle = f.color; c.lineWidth = 8; c.beginPath();
        for (let k = 0; k <= 32; k++) { const a = k / 32 * Math.PI * 2, p = this.project(f.x + 0.5 + Math.cos(a) * r, 0.05, f.y + 0.5 + Math.sin(a) * r); if (k) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }
        c.stroke(); c.globalAlpha = 1;
      } else if (f.k === 'puff') {
        if (t > 420) return false;
        const [x, y, s] = this.project(f.x + 0.5, 0.4, f.y + 0.5);
        this.emo2d(f.emo, x, y - t * 0.05, s * (0.5 + t / 900), 1 - t / 420);
      }
      return true;
    });
    const [hx, hy, hs] = this.project(hp.x + 0.5, 0.3, hp.y + 0.5);
    const v = c.createRadialGradient(hx, hy, hs * 2.6, hx, hy, hs * 8);
    v.addColorStop(0, 'rgba(0,0,10,0)'); v.addColorStop(1, 'rgba(0,0,10,.55)');
    c.fillStyle = v; c.fillRect(0, 0, this.w, this.h);
    const fl = now - this.flashT; if (fl < 300) { c.globalAlpha = 0.6 * (1 - fl / 300); c.fillStyle = this.flashColor; c.fillRect(0, 0, this.w, this.h); c.globalAlpha = 1; }
  }

  // ── ちいさな ちず（2D と おなじ）
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
