// 小さな道具
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// 乱数（状態を保存できる mulberry32）
export function makeRng(state) {
  let s = state >>> 0;
  const rng = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.state = () => s;
  return rng;
}
// シード値（英数字6文字）
const SEED_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function newSeed() {
  let s = '';
  for (let i = 0; i < 6; i++) s += SEED_CHARS[Math.floor(Math.random() * SEED_CHARS.length)];
  return s;
}
export function normSeed(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12); }
export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
export function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
export function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export function weighted(rng, items, w) {
  const ws = items.map(w), tot = ws.reduce((a, b) => a + b, 0);
  if (tot <= 0) return null;
  let r = rng() * tot;
  for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}
export const fmt = (v, d = 0) => (Math.round(v * 10 ** d) / 10 ** d).toLocaleString('ja-JP', { minimumFractionDigits: d, maximumFractionDigits: d });
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
