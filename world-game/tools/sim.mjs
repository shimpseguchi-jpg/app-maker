// バランス調整：AI が自国も操作して何百回も遊び、結末の割合や国ごとの成績を出す
// 使い方：node tools/sim.mjs [回数]   （V=1 で1ゲームの年表を表示）
import * as G from '../js/engine/game.js';
import { choosePolicy } from '../js/engine/ai.js';
import { BASE } from '../js/data/policies.js';
import { makeRng } from '../js/util.js';

const N = Number(process.argv[2] || 300);
const VERBOSE = !!process.env.V;
const PERSONA = process.env.P || null; // 自国の打ち方（未指定ならランダム）
const KID = !!process.env.KID; // 1ねんせいモード（20かい）
const rng = makeRng(12345);
const PERS = ['tech', 'edu', 'trade', 'order', 'finance', 'ambition'];

function playOne(i) {
  const seed = 'SIM' + i;
  const g = G.newGame(seed, { diceSeed: 1000 + i, kid: KID });
  const pl = g.majors[g.player];
  pl.persona = PERSONA || PERS[Math.floor(rng() * PERS.length)];
  const bases = Object.keys(BASE).filter((b) => b !== 'B10');
  G.startGame(g, [bases[Math.floor(rng() * bases.length)]]);
  let guard = 0;
  while (!g.result && guard++ < 5000) {
    if (g.pending) {
      const p = g.pending;
      G.resolvePending(g, p.type === 'nuke' ? (rng() < 0.05 ? 'fire' : 'hold') : p.type === 'vote' ? p.options[0] : p.options[0]);
      continue;
    }
    if (g.phase === 'yearEnd') { G.beginYear(g); continue; }
    const r = G.step(g);
    if (r.type === 'player') {
      const ch = choosePolicy(g, g.majors[g.player], g.offers.list, rng);
      G.playerAct(g, ch.id, ch.tgt);
    }
  }
  return g;
}

const res = {}, byCountry = {}, years = [], fired = {}, traj = {};
let sparkStart = 0, sparkOk = 0, sparkNg = 0, alliesSum = 0, collapses = 0, stageMax = [0, 0, 0, 0, 0], coopN = 0;
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const g = playOne(i);
  const r = g.result || { type: 'stuck', year: g.year };
  res[r.type] = (res[r.type] || 0) + 1;
  years.push(r.year);
  stageMax[g.world.stage]++;
  // 推移は「50年に換算した経過」で10年ごとにまとめる（1ねんせいモードは20かい＝50年）
  const last = {};
  g.hist.forEach((h, i) => { const q = ((i + 1) * 50) / G.maxYears(g); if (q % 10 < 2.5 || q % 10 === 0) last[Math.round(q / 10) * 10] = h; });
  for (const [y, h] of Object.entries(last)) { if (+y === 0) continue; const t = (traj[y] ||= { n: 0, env: 0, co2: 0, conflicts: 0, tension: 0 }); t.n++; for (const k of ['env', 'co2', 'conflicts', 'tension']) t[k] += h[k]; }
  coopN += g.coop.length; alliesSum += g.allies.length;
  for (const c of g.chron) { if (/^(火種|ひだね)：/.test(c.text)) sparkStart++; if (/封じ込め|おさえこんだ/.test(c.text)) sparkOk++; if (/世界に拡大|せかいに ひろがった/.test(c.text)) sparkNg++; }
  for (const id of Object.keys(g.fired)) fired[id] = (fired[id] || 0) + 1;
  // 自国になった国ごとの成績（国力の順位・崩壊・クリア）
  const pid = g.player;
  const rank = 1 + g.seats.filter((x) => g.majors[x].power > g.majors[pid].power).length;
  const b = (byCountry[pid] ||= { n: 0, rank: 0, collapsed: 0, clear: 0, conquest: 0, power: 0 });
  b.n++; b.rank += rank; b.power += g.majors[pid].power;
  if (g.chron.some((x) => x.text.startsWith(g.majors[pid].origName) && /崩壊|クーデター|敗戦|たおれた|のっとった|まけた/.test(x.text))) b.collapsed++;
  if (r.type === 'clear') b.clear++;
  if (r.type === 'conquest' && g.conqueror === pid) b.conquest++;
  collapses += g.chron.filter((x) => /崩壊|クーデター|敗戦|せいふが たおれた|のっとった|まけた/.test(x.text)).length;
  if (VERBOSE && i === 0) {
    for (const c of g.chron) console.log(c.year, c.text);
    console.log(g.world, g.result);
  }
}
const pct = (n) => ((100 * n) / N).toFixed(1) + '%';
console.log(`${N}回 (${((Date.now() - t0) / N).toFixed(0)}ms/回)`);
console.log('結末:', Object.entries(res).map(([k, v]) => `${k} ${pct(v)}`).join(' / '));
console.log('平均年数:', (years.reduce((a, b) => a + b, 0) / N).toFixed(1), ' 崩壊/ゲーム:', (collapses / N).toFixed(2), ' 協調の成功例/ゲーム:', (coopN / N).toFixed(2), ' 提携/ゲーム終了時:', (alliesSum / N).toFixed(1));
console.log('火種/ゲーム:', (sparkStart / N).toFixed(2), ' 封じ込め:', (sparkOk / N).toFixed(2), ' 拡大:', (sparkNg / N).toFixed(2));
console.log('到達した段階:', stageMax.map((n, i) => `${G.STAGES[i]} ${pct(n)}`).join(' / '));
console.log('推移（その年まで続いたゲームの平均）:', Object.entries(traj).map(([y, t]) => `${y}年目 環境${(t.env / t.n).toFixed(0)} CO₂${(t.co2 / t.n).toFixed(0)} 紛争${(t.conflicts / t.n).toFixed(0)} 緊張${(t.tension / t.n).toFixed(0)} (n=${t.n})`).join('\n  '));
console.log('\n自国になった国ごと（国力の順位 1〜6、自国の崩壊率、クリア率、征服率）');
for (const [id, b] of Object.entries(byCountry).sort()) {
  console.log(id.padEnd(4), `n=${String(b.n).padStart(3)}`, `順位 ${(b.rank / b.n).toFixed(2)}`, `国力 ${(b.power / b.n).toFixed(0)}`, `崩壊 ${((100 * b.collapsed) / b.n).toFixed(0)}%`, `クリア ${((100 * b.clear) / b.n).toFixed(0)}%`, `征服 ${((100 * b.conquest) / b.n).toFixed(0)}%`);
}
console.log('\nイベントの発生率:');
console.log(Object.entries(fired).sort().map(([k, v]) => `${k}:${Math.round((100 * v) / N)}`).join(' '));
