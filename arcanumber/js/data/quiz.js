// さんすうクイズ（がくねん べつ）
// クイズ: { q, answer, choices?, explain, vis? }

const pick = (rng, a) => a[Math.floor(rng() * a.length)];
const ri = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

function numChoices(rng, ans, spread = 3, n = 3) {
  const set = new Set([ans]);
  let guard = 0;
  while (set.size < n && guard++ < 50) {
    const d = ri(rng, 1, spread) * (rng() < 0.5 ? -1 : 1);
    if (ans + d >= 0) set.add(ans + d);
  }
  return [...set].sort(() => rng() - 0.5);
}

export const QUIZ = {
  arith(g, rng) {
    if (g === 1) {
      if (rng() < 0.55) {
        const a = ri(rng, 2, 9), b = ri(rng, 2, 9);
        return { q: `${a} + ${b} = ？`, answer: a + b, explain: `${a} と ${b} を あわせると ${a + b}` };
      }
      const a = ri(rng, 10, 18), b = ri(rng, 2, 9);
      return { q: `${a} − ${b} = ？`, answer: a - b, explain: `${a} から ${b} を とると ${a - b}` };
    }
    if (g === 2) {
      const t = ri(rng, 0, 2);
      if (t === 0) { const a = ri(rng, 2, 9), b = ri(rng, 2, 9); return { q: `${a} × ${b} = ？`, answer: a * b, explain: `${a}の だん：${a} × ${b} = ${a * b}` }; }
      if (t === 1) { const a = ri(rng, 12, 68), b = ri(rng, 11, 29); return { q: `${a} + ${b} = ？`, answer: a + b, explain: `いちの くらい、じゅうの くらいの じゅんに たすと ${a + b}` }; }
      const a = ri(rng, 40, 99), b = ri(rng, 11, 38); return { q: `${a} − ${b} = ？`, answer: a - b, explain: `${a} − ${b} = ${a - b}` };
    }
    const t = ri(rng, 0, 3);
    if (t === 0) { const b = ri(rng, 2, 9), q = ri(rng, 2, 9); return { q: `${b * q} ÷ ${b} = ？`, answer: q, explain: `${b} × ${q} = ${b * q} だから ${b * q} ÷ ${b} = ${q}` }; }
    if (t === 1) { const a = ri(rng, 12, 48), b = ri(rng, 2, 6); return { q: `${a} × ${b} = ？`, answer: a * b, explain: `${a} × ${b} = ${a * b}（${Math.floor(a / 10) * 10}×${b} と ${a % 10}×${b} を たす）` }; }
    if (t === 2) { const a = ri(rng, 120, 480), b = ri(rng, 110, 399); return { q: `${a} + ${b} = ？`, answer: a + b, explain: `${a} + ${b} = ${a + b}` }; }
    const a = ri(rng, 300, 900), b = ri(rng, 105, 290); return { q: `${a} − ${b} = ？`, answer: a - b, explain: `${a} − ${b} = ${a - b}` };
  },
  missing(g, rng) {
    if (g === 1) { const a = ri(rng, 2, 9), c = a + ri(rng, 2, 9); return { q: `□ + ${a} = ${c}　□は いくつ？`, answer: c - a, explain: `${c} − ${a} = ${c - a} だから □は ${c - a}` }; }
    if (g === 2) { const a = ri(rng, 2, 9), x = ri(rng, 2, 9); return { q: `□ × ${a} = ${a * x}　□は いくつ？`, answer: x, explain: `${x} × ${a} = ${a * x}。 ${a}の だんで さがそう` }; }
    const a = ri(rng, 3, 9), x = ri(rng, 3, 9); return { q: `□ ÷ ${a} = ${x}　□は いくつ？`, answer: a * x, explain: `□ = ${x} × ${a} = ${a * x}` };
  },
  tenComp(g, rng) {
    if (g === 1) { const a = ri(rng, 1, 9); return { q: `${a} と あと いくつで 10？`, answer: 10 - a, explain: `${a} + ${10 - a} = 10` }; }
    if (g === 2) { const a = ri(rng, 11, 89); return { q: `${a} と あと いくつで 100？`, answer: 100 - a, explain: `${a} + ${100 - a} = 100` }; }
    const a = ri(rng, 101, 899); return { q: `${a} と あと いくつで 1000？`, answer: 1000 - a, explain: `${a} + ${1000 - a} = 1000` };
  },
  pattern(g, rng) {
    let s, d;
    if (g === 1) { d = pick(rng, [1, 2, 5, 10]); s = d === 10 ? 10 : ri(rng, 1, 6); }
    else if (g === 2) { d = pick(rng, [2, 3, 4, 5, 10]); s = d * ri(rng, 1, 3); }
    else { d = pick(rng, [6, 7, 8, 9, 25, 50]); s = d * ri(rng, 1, 4); }
    const desc = rng() < 0.3 && g > 1;
    const seq = Array.from({ length: 5 }, (_, i) => (desc ? s + d * (4 - i) : s + d * i));
    const hole = ri(rng, 1, 4);
    const ans = seq[hole];
    const shown = seq.map((v, i) => (i === hole ? '□' : v)).join(', ');
    return { q: `きまりを みつけよう！　${shown}　□は？`, answer: ans, explain: `${d}ずつ ${desc ? 'へって' : 'ふえて'} いるよ。□は ${ans}` };
  },
  legs(g, rng) {
    const beasts = [['🐔', 'にわとり', 2, 'わ'], ['🐱', 'ねこ', 4, 'ひき'], ['🐜', 'あり', 6, 'ぴき'], ['🕷️', 'くも', 8, 'ひき'], ['🐙', 'たこ', 8, 'ひき']];
    const pool = g === 1 ? beasts.slice(0, 2) : beasts;
    const a = pick(rng, pool);
    let b = pick(rng, pool); if (b === a) b = pool[(pool.indexOf(a) + 1) % pool.length];
    const na = ri(rng, 1, g === 1 ? 2 : 3), nb = ri(rng, 1, g === 1 ? 2 : 3);
    const ans = a[2] * na + b[2] * nb;
    return {
      q: `${a[1]}が ${na}${a[3]}、${b[1]}が ${nb}${b[3]}。 あしは ぜんぶで なんぼん？`,
      answer: ans,
      vis: { type: 'emoji', rows: [[a[0], na], [b[0], nb]] },
      explain: g === 1
        ? `${a[1]}の あしは ${a[2]}ほん、${b[1]}は ${b[2]}ほん。 ${[...Array(na).fill(a[2]), ...Array(nb).fill(b[2])].join(' + ')} = ${ans}`
        : `${a[1]}の あしは ${a[2]}ほん、${b[1]}は ${b[2]}ほん。 ${a[2]}×${na} + ${b[2]}×${nb} = ${ans}`,
    };
  },
  shape(g, rng) {
    const items = [
      { s: 'tri', q: 'さんかくの かどは いくつ？', a: 3, ex: 'さんかくは かどが 3つ' },
      { s: 'sqr', q: 'しかくの へんは いくつ？', a: 4, ex: 'しかくは へんが 4ほん' },
      { s: 'hex', q: 'この かたちの かどは いくつ？', a: 6, ex: 'ろっかっけいは かどが 6つ' },
      { s: 'house', q: 'いえの かたちの かどは いくつ？', a: 5, ex: 'しかくと さんかくで、かどは 5つ（ごかっけい）' },
    ];
    if (g >= 2) items.push(
      { s: 'cube', q: 'はこの かたちの めんは いくつ？', a: 6, ex: 'はこの めんは 6つ' },
      { s: 'cube', q: 'はこの かたちの へんは いくつ？', a: 12, ex: 'はこの へんは 12' },
      { s: 'cube', q: 'はこの かたちの ちょうてんは いくつ？', a: 8, ex: 'はこの ちょうてん（かど）は 8つ' },
    );
    if (g >= 3) {
      const r = ri(rng, 2, 9);
      items.push({ s: 'circle', q: `はんけいが ${r}cmの えん。ちょっけいは なんcm？`, a: r * 2, ex: `ちょっけいは はんけいの 2ばい。${r} × 2 = ${r * 2}` });
      const d = ri(rng, 2, 9) * 2;
      items.push({ s: 'circle', q: `ちょっけいが ${d}cmの えん。はんけいは なんcm？`, a: d / 2, ex: `はんけいは ちょっけいの はんぶん。${d} ÷ 2 = ${d / 2}` });
    }
    const it = pick(rng, items);
    return { q: it.q, answer: it.a, vis: { type: 'shape', shape: it.s }, explain: it.ex };
  },
  clock(g, rng) {
    if (g === 1) {
      const h = ri(rng, 1, 12), half = rng() < 0.5;
      const label = (hh, hf) => `${hh}じ${hf ? 'はん' : ''}`;
      const ans = label(h, half);
      const opts = new Set([ans]);
      opts.add(label(h, !half));
      opts.add(label(h % 12 + 1, half));
      if (opts.size < 3) opts.add(label((h + 5) % 12 + 1, !half));
      return { q: 'この とけいは なんじ？', answer: ans, choices: [...opts].sort(() => rng() - 0.5), vis: { type: 'clock', h, m: half ? 30 : 0 }, explain: `みじかい はりが じを、ながい はりが ふんを さすよ。こたえは ${ans}` };
    }
    if (g === 2) {
      const h = ri(rng, 1, 10), m = pick(rng, [0, 10, 15, 20, 30, 40]), add = pick(rng, [20, 30, 40, 50]);
      let tm = m + add, th = h; if (tm >= 60) { tm -= 60; th += 1; }
      const fmt = (hh, mm) => `${hh}じ${mm ? mm + 'ふん' : ''}`;
      const ans = fmt(th, tm);
      const opts = new Set([ans, fmt(h, Math.min(59, m + add - (m + add >= 60 ? 60 : 0))), fmt(th + 1, tm), fmt(th, (tm + 10) % 60)]);
      const list = [...opts].slice(0, 3); if (!list.includes(ans)) list[0] = ans;
      return { q: `いまは ${fmt(h, m)}。${add}ぷん あとは なんじ なんぷん？`, answer: ans, choices: list.sort(() => rng() - 0.5), vis: { type: 'clock', h, m }, explain: `${fmt(h, m)} の ${add}ぷん あとは ${ans}（60ぷんで 1じかん）` };
    }
    const mi = ri(rng, 1, 3), s = pick(rng, [10, 15, 20, 30, 40, 45]);
    return { q: `${mi}ぷん ${s}びょうは なんびょう？`, answer: mi * 60 + s, explain: `1ぷん = 60びょう。 60 × ${mi} + ${s} = ${mi * 60 + s}` };
  },
  money(g, rng) {
    if (g === 1) {
      const t = ri(rng, 1, 4), o = ri(rng, 1, 5);
      return { q: `10えんだまが ${t}こ と 1えんだまが ${o}こ。 ぜんぶで なんえん？`, answer: t * 10 + o, vis: { type: 'coins', c10: t, c1: o }, explain: `10が ${t}こで ${t * 10}、1が ${o}こで ${o}。あわせて ${t * 10 + o}えん` };
    }
    if (g === 2) {
      const price = ri(rng, 3, 9) * 10;
      return { q: `100えんで ${price}えんの おかしを かうと、おつりは なんえん？`, answer: 100 - price, explain: `100 − ${price} = ${100 - price}えん` };
    }
    const p = ri(rng, 11, 35) * 10, n = ri(rng, 2, 4);
    return { q: `1こ ${p}えんの パンを ${n}こ かうと なんえん？`, answer: p * n, explain: `${p} × ${n} = ${p * n}えん` };
  },
  unit(g, rng) {
    if (g <= 2) {
      const t = ri(rng, 0, 1);
      if (t === 0) { const n = ri(rng, 2, 9); return { q: `${n}cmは なんmm？`, answer: n * 10, explain: `1cm = 10mm だから ${n}cm = ${n * 10}mm` }; }
      const n = ri(rng, 2, 6); return { q: `${n}Lは なんdL？`, answer: n * 10, explain: `1L = 10dL だから ${n}L = ${n * 10}dL` };
    }
    const t = ri(rng, 0, 2);
    if (t === 0) { const n = ri(rng, 2, 5); return { q: `${n}kmは なんm？`, answer: n * 1000, explain: `1km = 1000m` }; }
    if (t === 1) { const n = ri(rng, 2, 5), x = ri(rng, 1, 9) * 100; return { q: `${n}kg ${x}gは なんg？`, answer: n * 1000 + x, explain: `1kg = 1000g。 ${n * 1000} + ${x} = ${n * 1000 + x}` }; }
    const n = ri(rng, 2, 9); return { q: `${n}cm ${n}mmは なんmm？`, answer: n * 11, explain: `${n}cm = ${n * 10}mm。 ${n * 10} + ${n} = ${n * 11}` };
  },
  // プログラミング的思考：ひよこを おうちに かえす じゅんばん
  seq(g, rng) {
    const W = g === 1 ? 4 : 5, H = g === 1 ? 3 : 4;
    for (let tries = 0; tries < 200; tries++) {
      const sx = 0, sy = ri(rng, 0, H - 1);
      const gx = ri(rng, 2, W - 1), gy = ri(rng, 0, H - 1);
      if (gx === sx && gy === sy) continue;
      // 2つの みち：よこ→たて / たて→よこ。かたほうを いわで ふさぐ
      const hFirst = [];
      for (let i = 0; i < gx - sx; i++) hFirst.push('→');
      const vd = gy > sy ? '↓' : '↑';
      for (let i = 0; i < Math.abs(gy - sy); i++) hFirst.push(vd);
      const vFirst = [...hFirst].sort((a, b) => (a === '→' ? 1 : 0) - (b === '→' ? 1 : 0));
      const rocks = [];
      const good = rng() < 0.5 ? hFirst : vFirst;
      const bad = good === hFirst ? vFirst : hFirst;
      const pathCells = (moves) => { let x = sx, y = sy; const cells = []; for (const m of moves) { if (m === '→') x++; else if (m === '←') x--; else if (m === '↓') y++; else y--; cells.push([x, y]); } return cells; };
      const goodCells = pathCells(good);
      if (gy !== sy) {
        const badCells = pathCells(bad).filter(([x, y]) => !goodCells.some(([a, b]) => a === x && b === y) && !(x === gx && y === gy));
        if (badCells.length) rocks.push(pick(rng, badCells));
      }
      const run = (moves) => { let x = sx, y = sy; for (const m of moves) { if (m === '→') x++; else if (m === '←') x--; else if (m === '↓') y++; else y--; if (x < 0 || y < 0 || x >= W || y >= H) return false; if (rocks.some(([a, b]) => a === x && b === y)) return false; } return x === gx && y === gy; };
      if (!run(good)) continue;
      const cands = [];
      if (gy !== sy) cands.push(bad);
      cands.push(good.slice(0, -1));
      cands.push([...good, good[good.length - 1]]);
      const flip = good.map((m) => (m === '↓' ? '↑' : m === '↑' ? '↓' : m));
      cands.push(flip);
      const wrong = cands.filter((c) => c.length && !run(c) && c.join('') !== good.join(''));
      const uniq = [...new Map(wrong.map((c) => [c.join(''), c])).values()];
      if (uniq.length < 2) continue;
      const opts = [good, ...uniq.sort(() => rng() - 0.5).slice(0, 2)].map((c) => c.join(' '));
      const ans = good.join(' ');
      return {
        q: 'ひよこを おうちに かえそう！ ただしい じゅんばんは どれ？（いわは とおれない）',
        answer: ans, choices: opts.sort(() => rng() - 0.5),
        vis: { type: 'grid', W, H, start: [sx, sy], goal: [gx, gy], rocks },
        explain: `ゆびで なぞって みよう。こたえは「${ans}」`,
      };
    }
    return QUIZ.arith(g, rng);
  },
};

export function quizFor(topicList, g, rng) {
  return QUIZ[pick(rng, topicList)](g, rng);
}

