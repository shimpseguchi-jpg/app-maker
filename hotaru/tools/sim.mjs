// ロボットが さいしょから クリアまで なんども あそび、やられた かいすう・レベル・かかった ターンを だす
// つかいかた：node hotaru/tools/sim.mjs [にんずう] [skill 0〜1] [もんだいの せいかいりつ 0〜1] [ひらめき こうげきを つかう わりあい 0〜1]
import { newProfile } from '../js/engine/hero.js';
import { startFloors } from '../js/engine/game.js';
import { playRun, shop } from './bot.mjs';

const N = Number(process.argv[2] || 60), skill = Number(process.argv[3] ?? 1), acc = Number(process.argv[4] ?? 0.8), sparkRate = Number(process.argv[5] ?? 0.7);
const res = [];
for (let k = 0; k < N; k++) {
  const P = newProfile();
  let seed = 1000 + k * 7919, runs = 0, turns = 0, quiz = 0, cleared = false;
  const bossLv = {}, deaths = {};
  while (runs < 60 && !cleared) {
    shop(P, { skill });
    const start = Math.max(...startFloors(P));
    const r = playRun(P, start, seed, { skill, acc, sparkRate }); seed += 100; runs++; turns += r.turns; quiz += r.quiz;
    Object.assign(bossLv, r.boss || {});
    if (r.end === 'dead') deaths[r.floor] = (deaths[r.floor] || 0) + 1;
    if (r.end === 'clear') cleared = true;
    if (r.end === 'timeout') { console.log('timeout', k, r.floor); break; }
  }
  res.push({ runs, turns, quiz, cleared, level: P.level, bossLv, deaths, falls: P.falls, fireflies: P.fireflies.length, w: P.weapon, s: P.shield });
}
const avg = (f) => (res.reduce((s, r) => s + f(r), 0) / res.length).toFixed(1);
console.log(`skill=${skill}  せいかいりつ=${acc}  ひらめき=${sparkRate}  ${N}にん`);
console.log(`クリア ${res.filter((r) => r.cleared).length}/${N}  たんけん ${avg((r) => r.runs)}かい  やられた ${avg((r) => r.falls)}かい  ターン ${avg((r) => r.turns)}  もんだい ${avg((r) => r.quiz)}もん  さいごの Lv ${avg((r) => r.level)}  ほたる ${avg((r) => r.fireflies)}  ぶき ${avg((r) => r.w)} たて ${avg((r) => r.s)}`);
for (const f of [3, 6, 9]) console.log(`  ${f}かいの ボスを たおした Lv: ${avg((r) => r.bossLv[f] || 0)}`);
const dd = {}; res.forEach((r) => Object.entries(r.deaths).forEach(([f, n]) => { dd[f] = (dd[f] || 0) + n; }));
console.log('  やられた かい（ひとり あたり）:', Object.entries(dd).map(([f, n]) => `${f}かい ${(n / N).toFixed(2)}`).join('  '));
