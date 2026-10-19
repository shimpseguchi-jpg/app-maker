// 装備（小道具・衣装・アクセサリ）のテスト（docs/DESIGN.md 18章）
// node idoldungeon/tools/test_gear.mjs
import { newExpedition, normalize, partyView, unitOf, syncParty, startBattle, finishBattle, enterDungeon, FIRST_PARTY, GEAR_DROP } from '../js/engine/expedition.js';
import { GEAR, SETS, STARTER_GEAR, GEAR_SLOTS, PLUS_STEP } from '../js/data/gear.js';
import { CLASSES } from '../js/data/classes.js';
import { addGear, gearName, gearStats, canWear, wear, unwear, autoEquip, setsOf, wornGear, isCursed, rollGear, findGear, depthOf, rankAt, cursedWorn } from '../js/engine/gear.js';
import { dressUp, dressAuto, removeCurse, shopList, buy, sellList, sell, appraise, appraiseAll, unknownList, doChangeClass, prepCheck, gearShopRank } from '../js/engine/town.js';
import { enterCardMode, returnHome, cardWipe, finishCardBattle } from '../js/engine/cards.js';
import { autoCommands } from '../js/engine/battle.js';
import { battleTurn } from '../js/engine/expedition.js';
import { gainExp, expForLevel } from '../js/engine/growth.js';
import { seeded } from '../js/engine/rng.js';

let fail = 0, pass = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log('NG:', msg); } };
const fresh = () => newExpedition(FIRST_PARTY);
const stat = (ex, id, k) => partyView(ex).find((m) => m.id === id).stats[k];

// ── データ ──
{
  const all = Object.values(GEAR);
  ok(all.every((g) => GEAR_SLOTS.includes(g.slot) && g.rank >= 1 && g.rank <= 5 && g.stats[g.main] != null), 'すべての装備に部位・ランク・強化される能力がある');
  ok(Object.values(SETS).every((s) => s.pieces.length === 3 && GEAR_SLOTS.every((slot) => s.pieces.some((id) => GEAR[id].slot === slot))), '衣装セットは小道具・衣装・アクセサリの3つ');
  ok(all.filter((g) => g.set || g.curse).every((g) => !g.shop), 'セットと呪いの装備は店に並ばない');
  ok(Object.values(CLASSES).every((c) => c.id === 'dancer' || c.weapons.length) && Object.values(CLASSES).every((c) => ['heavy', 'light', 'robe'].includes(c.armor)), 'すべてのクラスに使える小道具と衣装の重さ');
  ok(Object.values(CLASSES).every((c) => c.weapons.every((t) => all.some((g) => g.type === t && g.rank === 1 && g.shop))), 'どのクラスにも、店で買えるランク1の小道具がある');
}

// ── クラスの制限 ──
{
  ok(canWear('fighter', 'woodSword') && canWear('fighter', 'setAxe') && !canWear('fighter', 'practiceBow'), '戦士は剣と斧。弓は使えない');
  ok(canWear('archer', 'practiceBow') && !canWear('archer', 'woodSword'), 'アーチャーは弓だけ');
  ok(canWear('mage', 'baton') && canWear('mage', 'paperKnife') && !canWear('mage', 'woodSword'), '魔道士は杖と短剣');
  ok(canWear('knight', 'cardboard') && canWear('knight', 'jersey') && canWear('knight', 'uniform'), '重い衣装のクラスは軽い衣装・ローブも着られる');
  ok(!canWear('thief', 'cardboard') && canWear('thief', 'jersey'), '盗賊は軽い衣装まで');
  ok(!canWear('mage', 'jersey') && canWear('mage', 'uniform'), '魔道士はローブだけ');
  ok(Object.keys(CLASSES).every((c) => canWear(c, 'ribbon')), 'アクセサリはだれでも');
  const ex = fresh();
  const bow = addGear(ex, 'practiceBow', { known: true });
  ok(wear(ex, 'makoto', bow.uid)[0].includes('装備できない') && !wornGear(ex, 'makoto').weapon?.item.includes('Bow'), '使えない種類は装備できない');
}

// ── はじめの装備と能力への反映 ──
{
  const ex = fresh();
  ok(ex.gear.length === STARTER_GEAR.length && ex.gear.every((g) => g.known), 'はじめの装備を持っている（鑑定済み）');
  ok(ex.slots.every((s) => wornGear(ex, s.idol).weapon && wornGear(ex, s.idol).armor) && wornGear(ex, 'ritsuko').armor?.item === 'uniform', 'はじめのパーティは全員、小道具と衣装を着ている（ローブしか着られない律子は制服）');
  const atk = stat(ex, 'makoto', 'atk');
  dressUp(ex, 'makoto', 'weapon', null);
  const bare = stat(ex, 'makoto', 'atk');
  ok(bare < atk, `小道具を外すと攻撃が下がる（${atk}→${bare}）`);
  const plus = addGear(ex, 'woodSword', { known: true, plus: 2 });
  dressUp(ex, 'makoto', 'weapon', plus.uid);
  ok(gearStats(plus).atk === GEAR.woodSword.stats.atk + 2 * PLUS_STEP.weapon && stat(ex, 'makoto', 'atk') - bare > atk - bare && gearName(plus) === '稽古用の木刀+2', `強化値は強化される能力に足される（+2 で攻撃 ${bare}→${stat(ex, 'makoto', 'atk')}）`);
  const def = stat(ex, 'makoto', 'def');
  const armor = wornGear(ex, 'makoto').armor;
  dressUp(ex, 'makoto', 'armor', null);
  ok(stat(ex, 'makoto', 'def') === def - gearStats(armor).def, '衣装を外すと防御が下がる');
  // 別の子が着ている物を選ぶと、その子から外れて移る
  const pole = wornGear(ex, 'hibiki').weapon;
  dressUp(ex, 'haruka', 'weapon', pole.uid);
  ok(wornGear(ex, 'haruka').weapon?.uid === pole.uid && !wornGear(ex, 'hibiki').weapon, '着ている物を別の子に移す');
}

// ── 未鑑定と呪い ──
{
  const ex = fresh();
  const unk = addGear(ex, 'woodAxe', { plus: 1 });
  ok(gearName(unk) === '？？？の斧', `未鑑定は種類だけ分かる（${gearName(unk)}）`);
  ok(!dressUp(ex, 'makoto', 'weapon', unk.uid).some((m) => m.includes('呪')) && wornGear(ex, 'makoto').weapon?.uid === unk.uid && !unk.known, '呪われていなければ、未鑑定のまま着られる');
  const cur = addGear(ex, 'bloodSword');
  const msgs = dressUp(ex, 'makoto', 'weapon', cur.uid);
  ok(msgs.some((m) => m.includes('呪われていた')) && cur.known && isCursed(cur), `未鑑定の呪いの装備を着ると、呪いが分かる（${msgs.join(' / ')}）`);
  ok(unwear(ex, 'makoto', 'weapon')[0].includes('外せない') && wornGear(ex, 'makoto').weapon?.uid === cur.uid, '呪いの装備は外せない');
  ok(dressUp(ex, 'makoto', 'weapon', unk.uid)[0].includes('外せない'), '呪いの装備は別の物に替えられない');
  ok(dressAuto(ex, ['makoto']) && wornGear(ex, 'makoto').weapon?.uid === cur.uid, 'おまかせでも呪いの装備はそのまま');
  const neg = addGear(ex, 'jersey', { plus: -1, known: true });
  ok(isCursed(neg) && gearName(neg) === 'ジャージ-1（呪）', 'マイナスの強化値は呪われている');
  // 寺院の解呪
  ok(cursedWorn(ex).length === 1 && cursedWorn(ex)[0].id === 'makoto', '寺院に、呪われた装備をつけている仲間が出る');
  ex.gold = 0;
  ok(removeCurse(ex, 'makoto', 'weapon')[0].includes('お金が足りない'), '解呪はお金がいる');
  ex.gold = 5000;
  const n = ex.gear.length;
  ok(removeCurse(ex, 'makoto', 'weapon')[0].includes('崩れて消えた') && !wornGear(ex, 'makoto').weapon && ex.gear.length === n - 1, '解呪すると外れて、その装備はなくなる');
  // おまかせは呪いの物・未鑑定の物を選ばない
  dressAuto(ex, ['ami']);
  ok(!Object.values(wornGear(ex, 'ami')).some((g) => g && (isCursed(g) || !g.known)), 'おまかせは鑑定済みで呪われていない物だけ');
}

// ── 衣装セット ──
{
  const ex = fresh();
  const [k, c, m] = ['thiefKnife', 'thiefCostume', 'thiefMask'].map((id) => addGear(ex, id, { known: true }));
  dressUp(ex, 'ami', 'weapon', null); dressUp(ex, 'ami', 'armor', null);
  const eva0 = stat(ex, 'ami', 'eva'), crit0 = stat(ex, 'ami', 'crit');
  dressUp(ex, 'ami', 'weapon', k.uid);
  ok(!setsOf(Object.values(wornGear(ex, 'ami')).filter(Boolean)).length, '1つではセットにならない');
  dressUp(ex, 'ami', 'armor', c.uid);
  let sets = setsOf(Object.values(wornGear(ex, 'ami')).filter(Boolean));
  ok(sets.length === 1 && sets[0].count === 2 && stat(ex, 'ami', 'eva') === eva0 + GEAR.thiefCostume.stats.eva + 5, `2つで怪盗セット（回避 ${eva0}→${stat(ex, 'ami', 'eva')}）`);
  dressUp(ex, 'ami', 'acc', m.uid);
  sets = setsOf(Object.values(wornGear(ex, 'ami')).filter(Boolean));
  const ami = partyView(ex).find((x) => x.id === 'ami');
  ok(sets[0].count === 3 && ami.stats.crit === crit0 + GEAR.thiefKnife.stats.crit + 8 && ami.abilities.some((a) => a.id === 'doubleHit'), '3つで大きな効果（会心と早業）');
}

// ── 転職で使えなくなった物は外れる ──
{
  const ex = fresh();
  const u = unitOf(ex, 'makoto');
  Object.assign(u.base, { vo: 20 });
  const msgs = doChangeClass(ex, 'makoto', 'mage');
  ok(!wornGear(ex, 'makoto').weapon && !wornGear(ex, 'makoto').armor && msgs.some((x) => x.includes('外した')), `魔道士に転職すると剣と鎧が外れる（${msgs.slice(1).join(' / ')}）`);
}

// ── 商店 ──
{
  const ex = fresh();
  ex.gold = 1000;
  const gear = shopList(ex).filter((it) => it.kind === 'gear');
  ok(gear.length && gear.every((it) => GEAR[it.id].rank === 1), 'はじめはランク1の装備が並ぶ');
  ex.ex.bossClears.b1 = 1;
  ok(gearShopRank(ex) === 2 && shopList(ex).some((it) => it.kind === 'gear' && GEAR[it.id].rank === 2), 'ボスを倒すとランク2が並ぶ');
  const n = ex.gear.length;
  buy(ex, 'ribbon');
  ok(ex.gear.length === n + 1 && ex.gear.at(-1).known && ex.gold === 1000 - 120, '装備を買う（鑑定済み）');
  const worn = wornGear(ex, 'makoto').weapon.uid;
  ok(!sellList(ex).some((it) => it.kind === 'gear' && it.ref === worn), '着ている装備は売れない');
  const rb = ex.gear.at(-1).uid;
  sell(ex, 'gear', rb);
  ok(!ex.gear.some((g) => g.uid === rb) && ex.gold === 1000 - 120 + 60, '装備を売る（半額）');
  const unk = addGear(ex, 'adventurer', { plus: 1 });
  ok(unknownList(ex).some((x) => x.uid === unk.uid), '未鑑定の装備は鑑定の一覧に出る');
  appraise(ex, unk.uid);
  ok(unk.known && gearName(unk) === '冒険者の衣装+1', '商店で装備を鑑定する');
  addGear(ex, 'hairpin');
  Object.assign(unitOf(ex, 'yukiho'), { cls: 'bishop' }); syncParty(ex);
  appraiseAll(ex);
  ok(ex.gear.every((g) => g.known), 'ビショップはまとめて装備も鑑定する');
}

// ── 見つかる装備 ──
{
  ok(depthOf('d1', 0) === 0 && depthOf('d2', 0) === 3 && rankAt(0) === 1 && rankAt(7) === 5, '深さとランク');
  const rng = seeded(7);
  const rolls = Array.from({ length: 4000 }, () => rollGear(2, rng));
  const neg = rolls.filter((r) => r.plus < 0).length / rolls.length, plus = rolls.filter((r) => r.plus > 0).length / rolls.length;
  ok(neg > 0.04 && neg < 0.12 && plus > 0.2 && plus < 0.5 && rolls.every((r) => GEAR[r.item].rank === 2), `強化値の出方（呪い ${(neg * 100).toFixed(1)}%・+1以上 ${(plus * 100).toFixed(1)}%）`);
  ok(rolls.some((r) => r.plus === 3) && rolls.some((r) => GEAR[r.item].curse), '+3 も呪いの装備も出る');
  const ex = fresh();
  const g = findGear(ex, 0, rng);
  ok(!g.known && GEAR[g.item].rank === 1, '迷宮で見つけた装備は未鑑定');
  // うろつく敵はときどき、番人とボスは必ず落とす
  const fight = (kind, id, seed) => {
    const e = fresh();
    for (const s of e.slots) gainExp(unitOf(e, s.idol), expForLevel(30), '', seeded(1));
    e.hp = {}; syncParty(e);
    enterDungeon(e, 'd1');
    const r = seeded(seed);
    startBattle(e, { kind, id, name: 'x' }, r);
    let t = 0; while (!e.battle.result && t++ < 60) battleTurn(e, autoCommands(e.battle), r);
    const n0 = e.gear.length; finishBattle(e, r);
    return e.gear.length - n0;
  };
  ok(fight('guardian', 'g1a', 3) === 1, '番人の宝箱には装備が入っている');
  ok(fight('boss', 'b1', 3) === 1, 'ボスは装備を落とす');
  let drops = 0; for (let i = 0; i < 60; i++) drops += fight('wander', null, 100 + i);
  ok(drops > 60 * GEAR_DROP * 0.3 && drops < 60 * GEAR_DROP * 2.5, `うろつく敵はときどき落とす（60戦で ${drops}個）`);
}

// ── カードモード：途中で帰ると拾った装備も半分失う・全滅で全部失う ──
{
  const make = () => {
    const ex = fresh();
    ex.ex.bossClears.b1 = 1;
    enterCardMode(ex, 'd1', seeded(2));
    for (let i = 0; i < 4; i++) ex.card.loot.gear.push(addGear(ex, 'ribbon').uid);
    return ex;
  };
  let ex = make();
  const n = ex.gear.length;
  const msgs = returnHome(ex);
  ok(ex.gear.length === n - 2 && msgs[0].includes('装備2'), `途中で帰ると半分失う（${msgs[0]}）`);
  ex = make();
  const m = ex.gear.length;
  cardWipe(ex);
  ok(ex.gear.length === m - 4, '全滅すると拾った装備は全部失う');
}

// ── 古いセーブ・出発前のチェック ──
{
  const old = normalize({ ex: fresh().ex, mode: 'town', slots: [{ idol: 'makoto' }], hp: {}, cond: {}, gold: 1 });
  ok(old.gear.length === STARTER_GEAR.length && wornGear(old, 'makoto').weapon && partyView(old).length === 1, '装備のない古いセーブには、はじめの装備を渡して着せる');
  ok(normalize(old).gear.length === STARTER_GEAR.length, 'はじめの装備を渡すのは1回だけ');
  const ex = fresh();
  addGear(ex, 'woodAxe');
  ok(prepCheck(ex).some((c) => !c.ok && c.text.includes('装備が1個')), '出発前のチェックに未鑑定の装備が出る');
}

console.log(`${pass} ok / ${fail} ng`);
process.exit(fail ? 1 : 0);
