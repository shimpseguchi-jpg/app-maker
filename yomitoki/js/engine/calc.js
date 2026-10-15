// けいさん れっしゃ：きょうかしょと おなじ かたちの けいさん
import { makeRng } from '../util.js';

export const CALC_SETS = {
  ten: { name: '10までの たしざん・ひきざん', icon: '🔟' },
  three: { name: '3つの かず（たす・ひく）', icon: '3️⃣' },
  mix: { name: '3つの かず（まぜる）', icon: '🔀' },
  ten_pack: { name: '10の まとまり', icon: '📦' },
  carry: { name: 'くりあがり・くりさがり', icon: '🎢' },
};

// [かず, きごう, かず, …] と こたえ
function make(set, rng) {
  const r = rng.int;
  switch (set) {
    case 'ten': {
      if (rng.chance(0.5)) { const a = r(1, 9), b = r(1, 10 - a); return [a, 1, b]; }
      const a = r(2, 10), b = r(1, a - 1); return [a, -1, b];
    }
    case 'three': {
      if (rng.chance(0.5)) { const a = r(1, 9), b = r(1, 9), c = r(1, 9); return a + b + c <= 20 ? [a, 1, b, 1, c] : null; }
      const a = r(6, 18), b = r(1, 9), c = r(1, 9); return a - b - c >= 0 ? [a, -1, b, -1, c] : null;
    }
    case 'mix': {
      const a = r(2, 18), b = r(1, 9), c = r(1, 9);
      const q = rng.chance(0.5) ? [a, -1, b, 1, c] : [a, 1, b, -1, c];
      const mid = a + q[1] * b, end = mid + q[3] * c;
      return mid >= 0 && mid <= 20 && end >= 0 && end <= 20 ? q : null;
    }
    case 'ten_pack': {
      // 8+2+7、18−8+2、14−4−3 の ように、さいしょの 2つで 10に なる
      const t = r(0, 2);
      if (t === 0) { const a = r(1, 9), c = r(1, 9); return [a, 1, 10 - a, 1, c]; }
      if (t === 1) { const a = r(11, 19), c = r(1, 9); return [a, -1, a - 10, 1, c]; }
      const a = r(11, 19), c = r(1, 9); return [a, -1, a - 10, -1, c];
    }
    case 'carry': {
      if (rng.chance(0.5)) { const a = r(2, 9), b = r(11 - a, 9); return b >= 2 && a + b > 10 ? [a, 1, b] : null; }
      const a = r(11, 18), b = r(a - 9, 9); return b >= 2 && b > a - 10 ? [a, -1, b] : null;
    }
  }
  return null;
}
export function value(q) { let v = q[0]; for (let i = 1; i < q.length; i += 2) v += q[i] * q[i + 1]; return v; }
export function text(q) { return q.map((x, i) => (i % 2 ? (x > 0 ? '＋' : '−') : String(x))).join(' '); }
export function calcSet(set, seed, n = 10) {
  const rng = makeRng(seed), out = [], seen = new Set();
  for (let i = 0; out.length < n && i < 2000; i++) {
    const s = set === 'any' ? rng.pick(Object.keys(CALC_SETS)) : set;
    const q = make(s, rng);
    if (!q) continue;
    const k = q.join(',');
    if (seen.has(k) && i < 1000) continue;
    seen.add(k); out.push(q);
  }
  return out;
}
// にた もんだい（まちがえた ときに おかわり）
export function similar(q, rng) {
  for (let i = 0; i < 100; i++) {
    const n = q.map((x, j) => (j % 2 ? x : Math.max(0, x + rng.int(-2, 2))));
    const v = value(n); let mid = n[0], ok = v >= 0 && v <= 20;
    for (let j = 1; j < n.length; j += 2) { mid += n[j] * n[j + 1]; if (mid < 0 || mid > 20) ok = false; }
    if (ok && n.join() !== q.join() && n.every((x, j) => j % 2 || x > 0)) return n;
  }
  return q;
}
