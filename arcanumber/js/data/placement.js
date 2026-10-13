// まほうの うでだめし：5もんで がくねんと むずかしさを きめる
// レベル 1〜6（せいかいで 1つ むずかしく、まちがいで 1つ やさしく）
export const TEST_N = 5;
export const TEST_START = 3;
export const LV_MAX = 6;
// これより はやく とけたら「スムーズ」（びょう）
const SMOOTH = [0, 6, 8, 12, 8, 10, 18];
export const LV_INFO = [null,
  { g: 1, name: '10までの たしざん' },
  { g: 1, name: 'くりあがりの たしざん・ひきざん' },
  { g: 2, name: '2けたの たしざん・ひきざん' },
  { g: 2, name: '{九九|くく}' },
  { g: 3, name: 'わりざん' },
  { g: 3, name: '3けたの けいさん・2けた×1けた' },
];

const ri = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
export function placementQuestion(lv, rng) {
  switch (lv) {
    case 1: { const a = ri(rng, 1, 6), b = ri(rng, 1, 10 - a); return { q: `${a} + ${b}`, a: a + b }; }
    case 2: {
      if (rng() < 0.5) { const a = ri(rng, 3, 9), b = ri(rng, 11 - a, 9); return { q: `${a} + ${b}`, a: a + b }; }
      const a = ri(rng, 11, 17), b = ri(rng, a - 9, 9); return { q: `${a} − ${b}`, a: a - b };
    }
    case 3: {
      if (rng() < 0.5) { const a = ri(rng, 15, 59), b = ri(rng, 12, 39); return { q: `${a} + ${b}`, a: a + b }; }
      const a = ri(rng, 41, 95), b = ri(rng, 12, a - 11); return { q: `${a} − ${b}`, a: a - b };
    }
    case 4: { const a = ri(rng, 3, 9), b = ri(rng, 3, 9); return { q: `${a} × ${b}`, a: a * b }; }
    case 5: { const b = ri(rng, 3, 9), x = ri(rng, 3, 9); return { q: `${b * x} ÷ ${b}`, a: x }; }
    default: {
      if (rng() < 0.5) { const a = ri(rng, 13, 48), b = ri(rng, 3, 8); return { q: `${a} × ${b}`, a: a * b }; }
      if (rng() < 0.5) { const a = ri(rng, 156, 587), b = ri(rng, 127, 389); return { q: `${a} + ${b}`, a: a + b }; }
      const a = ri(rng, 412, 951), b = ri(rng, 135, a - 120); return { q: `${a} − ${b}`, a: a - b };
    }
  }
}
export function nextLevel(lv, ok) { return Math.max(1, Math.min(LV_MAX, lv + (ok ? 1 : -1))); }

// results: [{ lv, ok, sec }]
export function judgePlacement(results) {
  const okLv = results.filter((r) => r.ok).map((r) => r.lv);
  const top = okLv.length ? Math.max(...okLv) : 0;
  const grade = top >= 5 ? 3 : top >= 3 ? 2 : 1;
  const correct = okLv.length;
  const smooth = results.filter((r) => r.ok && r.sec <= SMOOTH[r.lv]).length;
  const points = correct + smooth;
  const diff = points >= 5 ? 'normal' : 'easy';
  const okSecs = results.filter((r) => r.ok).map((r) => r.sec);
  const avgSec = okSecs.length ? Math.round(okSecs.reduce((s, x) => s + x, 0) / okSecs.length) : 0;
  return { grade, diff, top, correct, smooth, avgSec };
}
