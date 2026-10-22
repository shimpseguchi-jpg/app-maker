// 乱数（シードつき）と こまごまとした どうぐ
export function makeRng(seed) {
  let a = seed >>> 0;
  const rng = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.int = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
  rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
  rng.chance = (p) => rng() < p;
  rng.shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  rng.weighted = (items) => { // [[value, weight], ...]
    const total = items.reduce((s, x) => s + x[1], 0);
    let r = rng() * total;
    for (const [v, w] of items) { if ((r -= w) < 0) return v; }
    return items[items.length - 1][0];
  };
  rng.state = () => a;
  return rng;
}

export function newSeed() { return (Math.random() * 2 ** 32) >>> 0; }

let uidCounter = 1;
export function uid() { return 'u' + (uidCounter++) + '_' + Math.floor(Math.random() * 1e6).toString(36); }

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// DOM どうぐ
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
export function on(target, type, fn, opts) { target.addEventListener(type, fn, opts); return () => target.removeEventListener(type, fn, opts); }
