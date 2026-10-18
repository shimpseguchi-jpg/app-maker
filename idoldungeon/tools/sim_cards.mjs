// カードモードを自動で遊んで、踏破率・全滅率を測る（docs/DESIGN.md 17.3）
// node idoldungeon/tools/sim_cards.mjs [回数]
// カードモードが解放された直後（ボスは DRPG で1回倒されている。5回目までは最初の強さ）に、全快のパーティで挑む
import { newExpedition, unitOf, syncParty, battleTurn } from '../js/engine/expedition.js';
import { enterCardMode, chooseCard, finishCardBattle, partyHp, cardWipe } from '../js/engine/cards.js';
import { autoCommands } from '../js/engine/battle.js';
import { gainExp, expForLevel } from '../js/engine/growth.js';
import { seeded } from '../js/engine/rng.js';

const N = Number(process.argv[2] || 200);
const PARTY = ['makoto', 'hibiki', 'haruka', 'ritsuko', 'chihaya', 'yukiho'];
// おまかせの選び方：HP が少ないときは危ないカードを避ける
const GOOD = new Set(['chest', 'door', 'dark', 'warp', 'rubble', 'lost', 'riddle', 'stage', 'cat', 'corpse']);
function decide(card, hp) {
  switch (card.kind) {
    case 'route': return Math.random() < 0.5 ? 'left' : 'right';
    case 'enemy': return hp < 35 ? 'left' : 'right';
    case 'guardian': return hp > 70 ? 'right' : 'left';
    case 'boss': return 'right';
    case 'stairs': return 'right';
    case 'rest': case 'fountain': case 'kitchen': return hp < 90 ? 'right' : 'left';
    case 'pit': case 'anti': return 'left';
    default: return GOOD.has(card.kind) ? 'right' : 'left';
  }
}

function run(dungeon, level, seed) {
  const ex = newExpedition(PARTY.map((idol) => ({ idol })));
  for (const id of PARTY) gainExp(unitOf(ex, id), expForLevel(level), '', seeded(seed));
  ex.hp = {}; ex.mp = {}; syncParty(ex);
  ex.ex.bossClears = { b1: 1, b2: dungeon === 'd2' ? 1 : 0 };
  const rng = seeded(seed * 7 + 1);
  enterCardMode(ex, dungeon, rng);
  let cards = 0, battles = 0;
  while (ex.mode === 'card' && cards < 200) {
    if (ex.battle) {
      battles++;
      let t = 0;
      while (!ex.battle.result && t++ < 80) battleTurn(ex, autoCommands(ex.battle), rng);
      const r = finishCardBattle(ex, rng);
      if (r.wiped) { cardWipe(ex); return { result: 'wipe', cards, battles }; }
      continue;
    }
    cards++;
    const r = chooseCard(ex, decide(ex.card.cur, partyHp(ex)), rng);
    if (r.wiped) { cardWipe(ex); return { result: 'wipe', cards, battles }; }
  }
  return { result: ex.mode === 'town' ? 'clear' : 'stuck', cards, battles };
}

console.log(`各 ${N} 回（パーティ：真・響・春香／律子・千早・雪歩。全快で入り、街に戻らずボスまで）`);
for (const [d, levels] of [['d1', [8, 10, 12]], ['d2', [20, 22, 24, 26]]]) {
  for (const lv of levels) {
    let clear = 0, cards = 0, battles = 0;
    for (let i = 0; i < N; i++) { const r = run(d, lv, i + 1); clear += r.result === 'clear'; cards += r.cards; battles += r.battles; }
    console.log(`${d} Lv${String(lv).padStart(2)}  踏破 ${(clear / N * 100).toFixed(0).padStart(3)}%  カード ${(cards / N).toFixed(1).padStart(4)}枚  戦闘 ${(battles / N).toFixed(1).padStart(4)}回`);
  }
}
