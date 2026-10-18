// 自動対戦でバランスを測る（おまかせ作戦で戦い続ける）
// node idoldungeon/tools/sim_battle.mjs [回数]
// 1F・B1F・B2F の徘徊する敵、ルームガーダー、ボスについて、パーティのレベルごとの勝率と残り HP を出す
import { createBattle, runTurn, autoCommands } from '../js/engine/battle.js';
import { newExpedition, battleParty, bossGroups, unitOf, syncParty } from '../js/engine/expedition.js';
import { ENCOUNTERS, FIXED_GROUPS } from '../js/data/enemies.js';
import { gainExp, expForLevel } from '../js/engine/growth.js';
import { seeded } from '../js/engine/rng.js';

const N = Number(process.argv[2] || 300);
const PARTY = [{ idol: 'makoto' }, { idol: 'hibiki' }, { idol: 'haruka' }, { idol: 'ritsuko' }, { idol: 'chihaya' }, { idol: 'yukiho' }];

function partyAt(level, seed) {
  const ex = newExpedition(PARTY);
  const rng = seeded(seed);
  for (const s of PARTY) { const u = unitOf(ex, s.idol); gainExp(u, expForLevel(level), '', rng); }
  ex.hp = {}; ex.mp = {};
  syncParty(ex);
  return battleParty(ex);
}

function fight(party, groups, rng, kind = 'wander') {
  const b = createBattle(party, groups, { kind, canFlee: false, rng });
  let turns = 0;
  while (!b.result && turns < 50) { runTurn(b, autoCommands(b), rng); turns++; }
  const hp = b.party.reduce((s, m) => s + m.hp, 0) / b.party.reduce((s, m) => s + m.maxHp, 0);
  return { win: b.result === 'win', turns, hp, exp: b.exp, dead: b.party.filter((m) => m.cond === 'dead').length };
}

// 休まずに k 連戦（HP・状態・呪文の回数は持ち越し）したときの全滅率と、最後に残った HP
function trial(label, level, makeGroups, kind, k = 1) {
  let wiped = 0, turns = 0, hp = 0, dead = 0, fights = 0;
  for (let i = 0; i < N; i++) {
    const rng = seeded(1000 + i);
    let party = partyAt(level, i + 1);
    let lost = false;
    for (let j = 0; j < k && !lost; j++) {
      const b = createBattle(party, makeGroups(rng), { kind, canFlee: false, rng });
      let t = 0;
      while (!b.result && t < 50) { runTurn(b, autoCommands(b), rng); t++; }
      turns += t; fights++;
      if (b.result !== 'win') lost = true;
      party = b.party.map((m) => ({ ...m, cond: m.cond === 'ok' && m.poison ? 'poison' : m.cond, live: m.live && { ...m.live } }));
    }
    wiped += lost;
    hp += party.reduce((s, m) => s + m.hp, 0) / party.reduce((s, m) => s + m.maxHp, 0);
    dead += party.filter((m) => m.cond === 'dead').length;
  }
  console.log(`${label.padEnd(16)} Lv${String(level).padStart(2)} ${String(k).padStart(2)}連戦  全滅 ${(wiped / N * 100).toFixed(0).padStart(3)}%  1戦 ${(turns / fights).toFixed(1).padStart(4)}ターン  残りHP ${(hp / N * 100).toFixed(0).padStart(3)}%  戦闘不能 ${(dead / N).toFixed(2)}`);
}

const roll = (spec, rng) => spec.map(([enemy, min, max]) => ({ enemy, count: min + Math.floor(rng() * (max - min + 1)) }));
const wander = (f, d = 'd1') => (rng) => { const t = ENCOUNTERS[d][f]; return roll(t[Math.floor(rng() * t.length)], rng); };

console.log(`各 ${N} 回（パーティ：真・響・春香／律子・千早・雪歩）`);
for (const lv of [1, 2, 3]) trial('1F 徘徊', lv, wander(0), 'wander', 5);
for (const lv of [2, 3]) trial('1F 楽屋の番人', lv, (rng) => roll(FIXED_GROUPS.g1a, rng), 'guardian');
for (const lv of [3, 4, 5]) trial('B1F 徘徊', lv, wander(1), 'wander', 5);
for (const lv of [4, 5]) trial('B1F 奈落の見張り', lv, (rng) => roll(FIXED_GROUPS.g1b, rng), 'guardian');
for (const lv of [5, 6, 7]) trial('B2F 徘徊', lv, wander(2), 'wander', 5);
for (const lv of [6, 7, 8]) trial('B2F ボス', lv, () => bossGroups('b1', 0), 'boss');
for (const lv of [9, 11]) trial('ボス再戦1回目', lv, () => bossGroups('b1', 1), 'boss');
for (const lv of [12, 14]) trial('ボス再戦2回目', lv, () => bossGroups('b1', 2), 'boss');
// 奈落の大劇場（d2）
const only = process.argv[3];
if (!only || only === 'd2') {
  for (const [f, lvs] of [[0, [8, 10]], [1, [10, 12]], [2, [12, 14]], [3, [13, 15]], [4, [15, 17]]]) for (const lv of lvs) trial(`d2 ${['1F', 'B1F', 'B2F', 'B3F', 'B4F'][f]} 徘徊`, lv, wander(f, 'd2'), 'wander', 5);
  for (const lv of [9, 11]) trial('d2 案内係長', lv, (rng) => roll(FIXED_GROUPS.g2a, rng), 'guardian');
  for (const lv of [11, 13]) trial('d2 舞台監督', lv, (rng) => roll(FIXED_GROUPS.g2b, rng), 'guardian');
  for (const lv of [18, 20, 22, 24]) trial('奈落の怪人', lv, () => bossGroups('b2', 0), 'boss');
}
