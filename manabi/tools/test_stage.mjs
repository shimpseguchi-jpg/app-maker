// ステージの けんさ：いろいろな シードで つくり、AI 4にんが ゴールできるか・かかる じかんを みる
import { makeRng } from '../../js/util.js';
import { buildStage, CHUNKS, ROWS } from '../js/data/stages.js';
import { createWorld, step, allFinished, ranking, DT } from '../js/engine/stage.js';

let fail = 0;
for (const [name, ch] of Object.entries(CHUNKS)) {
  if (ch.length !== ROWS) { console.log(`✗ ${name}: ${ch.length} ぎょう`); fail++; }
  for (const line of ch) if (line.length !== 12) { console.log(`✗ ${name}: よこ ${line.length}`); fail++; }
}
const mk = (id, stats, skill, style, correct) => ({ id, name: id, stats, correct, skill, style, passive: null });
const times = { 1: [], 2: [] }; let dnf = 0;
for (const term of [1, 2]) {
  for (let seed = 1; seed <= 40; seed++) {
    const rng = makeRng(seed * 7919 + term);
    const stage = buildStage(term, rng);
    if (stage.blocks.length !== 6) { console.log(`✗ term${term} seed${seed}: ブロック ${stage.blocks.length}`); fail++; }
    if (stage.zones.length !== 3) { console.log(`✗ term${term} seed${seed}: ゾーン ${stage.zones.length}`); fail++; }
    const lv = term === 1 ? 150 : 300;
    const w = createWorld(stage, [
      mk('a', { math: lv, ja: lv, en: lv }, 0.99, 'balance', { math: 2, ja: 2, en: 2 }),
      mk('b', { math: lv, ja: lv, en: lv }, 0.7, 'rush', { math: 1, ja: 1, en: 1 }),
      mk('c', { math: lv, ja: lv, en: lv }, 0.5, 'block', { math: 0, ja: 0, en: 0 }),
      mk('d', { math: 50, ja: 50, en: 50 }, 0.3, 'safe', { math: 0, ja: 0, en: 0 }),
    ], { rng: makeRng(seed) });
    let t = 0;
    while (!allFinished(w) && t < 300) { step(w); t += DT; }
    const rk = ranking(w);
    for (const r of w.runners) { if (!r.finish) { dnf++; console.log(`  DNF term${term} seed${seed} ${r.id} x=${Math.round(r.x / 40)} deaths=${r.deaths}`); } else times[term].push(r.finish); }
    if (seed <= 3) console.log(`term${term} seed${seed} W=${stage.width}: ` + rk.map((r) => `${r.id}:${r.finish ? r.finish.toFixed(0) + 's' : 'DNF'}(d${r.deaths})`).join(' '));
  }
}
for (const term of [1, 2]) { const a = times[term]; a.sort((x, y) => x - y); console.log(`term${term}: ゴール ${a.length} 中央 ${a[a.length >> 1]?.toFixed(0)}s  はやい ${a[0]?.toFixed(0)}s  おそい ${a[a.length - 1]?.toFixed(0)}s`); }
console.log(`DNF ${dnf}`);
if (fail) { console.log(`✗ ${fail} けん`); process.exit(1); } else console.log('✓ ステージ けんさ OK');
