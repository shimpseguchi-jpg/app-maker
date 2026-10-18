// 戦闘ルールのテスト
// node idoldungeon/tools/test_battle.mjs
import { createBattle, runTurn, reachableGroups, aliveGroups, castable, unitLiveReady, autoCommands, canAct, groupName } from '../js/engine/battle.js';
import { newExpedition, battleParty, startBattle, battleTurn, finishBattle, unitOf, enterDungeon, bossEnemy, bossGroups } from '../js/engine/expedition.js';
import { ENEMIES, ENCOUNTERS, FIXED_GROUPS } from '../js/data/enemies.js';
import { SPELL_LIST, KIND_TARGET } from '../js/data/spells.js';
import { SONGS } from '../js/data/songs.js';
import { expForLevel, gainExp } from '../js/engine/growth.js';
import { seeded } from '../js/engine/rng.js';

let fail = 0, pass = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log('NG:', msg); } };
const partyOf = (...slots) => battleParty(newExpedition(slots.map((s) => (typeof s === 'string' ? { idol: s } : s))));
const dummy = (o = {}) => ({ id: 'dummy', name: '的', uname: '的', icon: '🎯', level: 1, hp: 999, atk: 0, mat: 0, def: 0, res: 0, spd: 1, hit: 0, eva: 0, exp: 10, gold: 5, resist: [], acts: [{ kind: 'attack', w: 1 }], ...o });
const noSurprise = (b) => { b.surprise = null; b.log = []; return b; };

// ── データ ──
for (const e of Object.values(ENEMIES)) {
  ok(e.hp > 0 && e.uname && e.icon && e.acts.length, `${e.id}: 基本データ`);
  for (const a of e.acts) ok(a.kind === 'attack' || KIND_TARGET[a.kind], `${e.id}: 行動 ${a.kind}`);
}
for (const t of ENCOUNTERS.d1) for (const f of t) {
  ok(f.length >= 1 && f.length <= 4, '1回の戦闘は1〜4グループ');
  for (const [id, a, b] of f) ok(ENEMIES[id] && a >= 1 && b >= a, `出現パターン ${id}`);
}
for (const [k, f] of Object.entries(FIXED_GROUPS)) for (const [id] of f) ok(ENEMIES[id], `${k}: ${id}`);
for (const s of SPELL_LIST) ok(KIND_TARGET[s.kind] && s.target === KIND_TARGET[s.kind], `${s.id}: 対象 ${s.target}`);
for (const s of Object.values(SONGS)) if (s.live) ok(KIND_TARGET[s.live.kind], `${s.id}: ライブスキルの効果 ${s.live.kind}`);

// ── 射程（S：目の前の列だけ／M：2列先まで／L：全部。後列は1列短い） ──
{
  // 真（戦士 S・前列）、響（ドラゴンナイト M・前列）、春香（ソシアルナイト M・前列）、律子（錬金術師 S・後列）、やよい（アーチャー L・後列）、雪歩（僧侶 S・後列）
  const p = partyOf('makoto', 'hibiki', 'haruka', 'ritsuko', 'yayoi', 'yukiho');
  const b = noSurprise(createBattle(p, [{ enemy: dummy(), count: 1 }, { enemy: dummy(), count: 1 }, { enemy: dummy(), count: 1 }], { rng: seeded(1) }));
  ok(reachableGroups(b, b.party[0]).length === 1, '前列 S は1グループ目だけ');
  ok(reachableGroups(b, b.party[1]).length === 2, '前列 M は2グループ目まで');
  ok(reachableGroups(b, b.party[3]).length === 0, '後列 S は届かない');
  ok(reachableGroups(b, b.party[4]).length === 3, '後列 L は全部');
  b.groups[0].members[0].dead = true;
  ok(reachableGroups(b, b.party[0])[0] === b.groups[1], '前のグループが全滅すると繰り上がる');
  const auto = autoCommands(b);
  ok(auto[5]?.type !== 'attack', '届かない人はおまかせで戦わない');
}

// ── 逃げる：選んだ人だけが逃げる。全員逃げると終わる。ボス戦は逃げられない ──
{
  const p = partyOf('makoto', 'hibiki');
  const b = noSurprise(createBattle(p, [{ enemy: dummy(), count: 1 }], { rng: seeded(2) }));
  runTurn(b, [{ type: 'flee' }, { type: 'defend' }], () => 0.01);
  ok(b.party[0].fled && !b.party[1].fled && !b.result, '1人だけ逃げても戦闘は続く');
  runTurn(b, [null, { type: 'flee' }], () => 0.01);
  ok(b.result === 'flee', '全員逃げたら戦闘終了');
  const bb = noSurprise(createBattle(partyOf('makoto'), [{ enemy: dummy(), count: 1 }], { rng: seeded(2), canFlee: false }));
  runTurn(bb, [{ type: 'flee' }], () => 0.01);
  ok(!bb.party[0].fled, 'ボス戦は逃げられない');
}

// ── 守る・かばう ──
{
  const hitter = dummy({ atk: 40, hit: 999, spd: 99 });
  const p = partyOf('makoto', 'hibiki');
  const b = noSurprise(createBattle(p, [{ enemy: hitter, count: 1 }], { rng: seeded(3) }));
  const rng = () => 0.5;
  runTurn(b, [{ type: 'guard', ally: 1 }, { type: 'defend' }], rng);
  ok(b.party[1].hp === b.party[1].maxHp || b.party[0].hp < b.party[0].maxHp, 'かばう：狙われた仲間の代わりに受ける');
  const a = noSurprise(createBattle(partyOf('makoto'), [{ enemy: hitter, count: 1 }], { rng: seeded(3) }));
  const c = noSurprise(createBattle(partyOf('makoto'), [{ enemy: hitter, count: 1 }], { rng: seeded(3) }));
  runTurn(a, [{ type: 'defend' }], rng); runTurn(c, [null], rng);
  ok(a.party[0].maxHp - a.party[0].hp < c.party[0].maxHp - c.party[0].hp, '守るとダメージが減る');
}

// ── 呪文：回数を使う。呪文禁止エリア・沈黙では効かない ──
{
  const p = partyOf('makoto', 'hibiki', 'haruka', 'chihaya');
  const b = noSurprise(createBattle(p, [{ enemy: dummy(), count: 2 }], { rng: seeded(4) }));
  const chihaya = b.party[3];
  ok(castable(b, chihaya).some((s) => s.id === 'flameArrow'), '魔道士 Lv1 は炎の矢');
  ok(!castable(b, chihaya).some((s) => s.id === 'blizzard'), 'Lv3 の呪文はまだ');
  const mp = chihaya.mp.arcane;
  runTurn(b, [null, null, null, { type: 'spell', spell: 'flameArrow', target: 0 }], seeded(5));
  ok(chihaya.mp.arcane === mp - 1 && b.groups[0].members.some((e) => e.hp < 999), '呪文で回数が減り、ダメージ');
  const anti = noSurprise(createBattle(partyOf('chihaya'), [{ enemy: dummy(), count: 1 }], { rng: seeded(4), zone: { anti: true } }));
  runTurn(anti, [{ type: 'spell', spell: 'flameArrow', target: 0 }], seeded(5));
  ok(anti.groups[0].members[0].hp === 999 && anti.log.some((l) => l.includes('呪文禁止')), '呪文禁止エリアではかき消される');
  const sil = noSurprise(createBattle(partyOf('chihaya'), [{ enemy: dummy(), count: 1 }], { rng: seeded(4) }));
  sil.party[0].silence = 2;
  runTurn(sil, [{ type: 'spell', spell: 'flameArrow', target: 0 }], seeded(5));
  ok(sil.groups[0].members[0].hp === 999, '沈黙中は唱えられない');
}

// ── 眠り：眠った敵は動かない。ポジティブ！は眠らない ──
{
  const p = partyOf('takane');
  const b = noSurprise(createBattle(p, [{ enemy: dummy({ atk: 30, hit: 999 }), count: 3 }], { rng: seeded(6) }));
  runTurn(b, [{ type: 'spell', spell: 'shadowBolt', target: 0 }], seeded(6));
  b.groups[0].members.forEach((e) => { e.sleep = 3; });
  const hp = b.party[0].hp;
  runTurn(b, [{ type: 'defend' }], seeded(7));
  ok(b.party[0].hp === hp, '眠った敵は動かない');
  const sleeper = dummy({ spd: 99, acts: [{ kind: 'sleepGroup', w: 1 }] });
  const pos = noSurprise(createBattle(partyOf({ idol: 'makoto', song: 'positive' }), [{ enemy: sleeper, count: 3 }], { rng: seeded(8) }));
  runTurn(pos, [{ type: 'defend' }], () => 0.01);
  ok(!pos.party[0].sleep, 'ポジティブ！なら眠らない');
}

// ── シナジー・楽曲の特殊能力 ──
{
  const p = partyOf('iori', 'azusa', 'ami');
  const b = noSurprise(createBattle(p, [{ enemy: dummy(), count: 2 }], { rng: seeded(9) }));
  ok(unitLiveReady(b), '竜宮小町3人でユニットライブ');
  runTurn(b, [{ type: 'unitLive' }, { type: 'defend' }, { type: 'defend' }], seeded(9));
  ok(b.unitLiveUsed && b.groups[0].members.every((e) => e.hp < 999), 'ユニットライブは敵全体');
  ok(!unitLiveReady(b), 'ユニットライブは1戦闘に1回');
  ok(!unitLiveReady(noSurprise(createBattle(partyOf('iori', 'azusa', 'mami'), [{ enemy: dummy(), count: 1 }], { rng: seeded(9) }))), '真美では竜宮小町にならない');
  // 自分REST@RT：1度だけ HP1 で立ち上がる
  const r = noSurprise(createBattle(partyOf({ idol: 'makoto', song: 'jibun_restart' }), [{ enemy: dummy({ atk: 999, hit: 999, spd: 99 }), count: 1 }], { rng: seeded(10) }));
  runTurn(r, [{ type: 'defend' }], () => 0.5);
  ok(r.party[0].hp === 1 && r.party[0].usedRevive && !r.result, '自分REST@RT で1度だけ立ち上がる');
  runTurn(r, [{ type: 'defend' }], () => 0.5);
  ok(r.result === 'lose', '2度目は倒れる');
}

// ── 先制・不意打ち・不確定名 ──
{
  const b = createBattle(partyOf('makoto'), [{ enemy: dummy({ atk: 50, hit: 999, spd: 99 }), count: 1 }], { rng: () => 0.01 });
  ok(b.surprise === 'party', '先制');
  const hp = b.party[0].hp;
  runTurn(b, [{ type: 'defend' }], () => 0.5);
  ok(b.party[0].hp === hp, '先制したターンは敵が動かない');
  const d = createBattle(partyOf('ritsuko'), [{ enemy: 'bat', count: 1 }], { rng: () => 0.01, zone: { dark: true } });
  ok(!d.groups[0].identified && groupName(d.groups[0]) === ENEMIES.bat.uname, 'ダークゾーンでは正体が分からない');
  const boss = createBattle(partyOf('makoto'), bossGroups('b1', 0), { rng: () => 0.15, kind: 'boss' });
  ok(boss.surprise !== 'enemy', 'ボスは不意打ちしない');
  ok(bossGroups('b1', 3).length === 3 && bossEnemy('b1', 1).traits.some((t) => t.id === 'twoActions'), '再戦で取り巻き・連続行動');
}

// ── 経験値とレベルアップ ──
{
  const u = { level: 1, exp: 0, base: { pow: 10, vo: 10, men: 10, sta: 10, dan: 10, vis: 10 } };
  const msgs = gainExp(u, expForLevel(3), '真', seeded(11));
  ok(u.level === 3 && msgs.length === 2, 'レベルが2つ上がる');
  ok(Object.values(u.base).reduce((a, b) => a + b, 0) >= 62, 'レベルアップで能力が伸びる');
}

// ── 冒険とつなぐ：経験値は生き残った人で山分け、HP は戦闘後も残る ──
{
  const ex = newExpedition([{ idol: 'makoto' }, { idol: 'hibiki' }, { idol: 'haruka' }]);
  enterDungeon(ex);
  startBattle(ex, { kind: 'wander' }, seeded(12));
  ok(ex.battle && ex.battle.groups.length >= 1, '徘徊する敵との戦闘が始まる');
  const rng = seeded(13);
  let n = 0;
  while (!ex.battle.result && n++ < 60) battleTurn(ex, autoCommands(ex.battle), rng);
  ok(ex.battle.result === 'win', `Lv1 でも1F の敵には勝てる（${ex.battle.result}）`);
  ex.battle.party[2].cond = 'dead'; ex.battle.party[2].hp = 0;
  const exp = ex.battle.exp;
  const r = finishBattle(ex, seeded(14));
  ok(!ex.battle && unitOf(ex, 'makoto').exp === Math.floor(exp / 2) && unitOf(ex, 'haruka').exp === 0, '経験値は生き残った2人で山分け');
  ok(ex.cond.haruka === 'dead' && r.msgs.length, '倒れた人は死亡のまま');
  // ルームガーダーから逃げると来たマスへ戻る
  Object.assign(ex.ex, { floor: 0, x: 3, y: 2, prev: { x: 4, y: 2 } });
  startBattle(ex, { kind: 'guardian', id: 'g1a' }, seeded(15));
  ex.battle.result = 'flee';
  finishBattle(ex);
  ok(ex.ex.x === 4 && !ex.ex.trip.g1a, 'ルームガーダーから逃げると部屋の外へ戻る');
}

// ── 同じ乱数なら同じ結果 ──
{
  const run = () => {
    const b = createBattle(partyOf('makoto', 'hibiki', 'haruka', 'ritsuko', 'chihaya', 'yukiho'), [{ enemy: 'rat', count: 3 }, { enemy: 'critic', count: 1 }], { rng: seeded(99) });
    const rng = seeded(100);
    while (!b.result) runTurn(b, autoCommands(b), rng);
    return b.log.join('\n');
  };
  ok(run() === run(), '同じ種なら同じ戦闘になる');
}

console.log(`${pass} ok / ${fail} ng`);
process.exit(fail ? 1 : 0);
