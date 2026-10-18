// カードモードのテスト（docs/DESIGN.md 17.3）
// node idoldungeon/tools/test_cards.mjs
import { newExpedition, unitOf, syncParty, battleTurn, partyView } from '../js/engine/expedition.js';
import { enterCardMode, chooseCard, makeCard, cardView, partyHp, finishCardBattle, returnHome, cardWipe } from '../js/engine/cards.js';
import { autoCommands } from '../js/engine/battle.js';
import { CARD_DUNGEONS, EXTRA_CARDS, ZONE_CARDS, HINTS, WEIGHTS, EVENTS } from '../js/data/cards.js';
import { ENCOUNTERS, FIXED_GROUPS, ENEMIES } from '../js/data/enemies.js';
import { DUNGEONS } from '../js/data/floors.js';
import { gainExp, expForLevel } from '../js/engine/growth.js';
import { seeded } from '../js/engine/rng.js';
import { masterRate } from '../js/engine/boss.js';

let fail = 0, pass = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log('NG:', msg); } };
const SIX = ['makoto', 'hibiki', 'haruka', 'ritsuko', 'ami', 'yukiho'];
function party(ids = SIX, level = 12) {
  const ex = newExpedition(ids.map((idol) => ({ idol })));
  for (const id of ids) gainExp(unitOf(ex, id), expForLevel(level), '', seeded(3));
  ex.hp = {}; ex.mp = {}; syncParty(ex);
  ex.ex.bossClears.b1 = 1; // DRPGモードでボスを倒して街に戻った（カードモードが解放されている）
  return ex;
}
const play = (ex, rng) => { let n = 0; while (!ex.battle.result && n++ < 80) battleTurn(ex, autoCommands(ex.battle), rng); return finishCardBattle(ex, rng); };
const put = (ex, kind, rng = seeded(1)) => { ex.card.cur = makeCard(ex, kind, rng); return ex.card.cur; };

// ── データ ──
for (const [d, c] of Object.entries(CARD_DUNGEONS)) {
  ok(DUNGEONS[d] && c.floors === DUNGEONS[d].floors.length && c.guardians.length === c.floors && c.guardians.every((g) => FIXED_GROUPS[g]), `${d}：階の数と番人`);
  ok(ENCOUNTERS[d].length >= c.floors, `${d}：敵の出現表が各階にある`);
}
for (const [k, h] of Object.entries(HINTS)) ok(h.kinds.every((x) => WEIGHTS[x] != null), `手がかり ${k} のカード`);
for (const [k, e] of Object.entries(EVENTS)) ok(WEIGHTS[k] != null && e.text.includes('{name}') && e.left.label && e.right.label, `イベント ${k}`);

// ── 入る ──
{
  const ex = newExpedition([{ idol: 'makoto' }]);
  ok(enterCardMode(ex, 'd1')[0].includes('DRPGモードで倒す') && ex.mode === 'town' && !ex.card, 'ボスを倒すまでは入れない');
  const p = party();
  enterCardMode(p, 'd1', seeded(2));
  const v = cardView(p);
  ok(p.mode === 'card' && p.play === 'card' && v.card && v.floor === '1F' && v.perFloor === 7 && v.hp === 100, 'カードモードで入ると1枚目のカードが出る');
}

// ── 1つの階：決まった枚数で階段。最下階はボス ──
{
  const ex = party(SIX, 30);
  enterCardMode(ex, 'd1', seeded(4));
  const rng = seeded(5);
  let n = 0;
  while (ex.card.cur.kind !== 'stairs' && n++ < 40) {
    if (ex.battle) play(ex, rng); else chooseCard(ex, ex.card.cur.kind === 'boss' ? 'left' : 'right', rng);
  }
  ok(ex.card.cur.kind === 'stairs' && ex.card.step >= ex.card.perFloor, `決まった枚数（7枚）進むと階段が出る（${n}手）`);
  chooseCard(ex, 'left', rng);
  ok(ex.card.perFloor === 7 + EXTRA_CARDS && ex.card.floor === 0, '「この階をもっと探る」で3枚増える');
  put(ex, 'stairs');
  chooseCard(ex, 'right', rng);
  ok(ex.card.floor === 1 && ex.card.step === 0 && ex.ex.floor === 1 && cardView(ex).floor === 'B1F', '「下りる」で次の階へ');
  ex.card.floor = 2; ex.card.step = 7;
  put(ex, 'route');
  chooseCard(ex, 'left', rng);
  ok(ex.card.cur.kind === 'boss', '最下階では階段の代わりにボス');
}

// ── 道順カード：選んだ手がかりに合うカードが出やすい ──
{
  const ex = party();
  enterCardMode(ex, 'd1', seeded(6));
  const rng = seeded(7);
  let hit = 0, base = 0;
  for (let i = 0; i < 400; i++) {
    ex.card.step = 1; ex.card.prev = null;
    const c = put(ex, 'route', rng);
    chooseCard(ex, 'left', rng);
    if (HINTS[c.left.hint].kinds.includes(ex.card.cur.kind)) hit++;
    ex.card.hint = null;
    const k = makeCard(ex, 'route', rng).left.hint; // 手がかりなしで引いたときに、同じ手がかりに合う割合
    ex.card.prev = null; ex.card.step = 1;
    ex.card.cur = null;
    const plain = (() => { const w = { ...WEIGHTS }; const t = Object.values(w).reduce((a, b) => a + b, 0); return HINTS[k].kinds.reduce((s, x) => s + w[x], 0) / t; })();
    base += plain;
  }
  ok(hit / 400 > (base / 400) * 2, `道順の手がかりで次のカードが変わる（${(hit / 4).toFixed(0)}% / ふつう ${(base / 4).toFixed(0)}%）`);
}

// ── イベント：クラスや属性で結果が変わる ──
{
  const ex = party();  // 亜美（盗賊）・雪歩（僧侶）がいる
  enterCardMode(ex, 'd1', seeded(8));
  const g = ex.gold, hp = partyHp(ex);
  put(ex, 'chest');
  const r = chooseCard(ex, 'right', seeded(9));
  ok(r.msgs.some((m) => m.includes('罠を外した')) && ex.gold > g && ex.card.loot.gold === ex.gold - g && partyHp(ex) === hp, '盗賊がいれば宝箱の罠を外せる。お金は拾った物として記録');
  const ex2 = party(['makoto', 'hibiki', 'haruka']);
  enterCardMode(ex2, 'd1', seeded(8));
  let trapped = 0;
  for (let i = 0; i < 40; i++) { put(ex2, 'chest'); if (chooseCard(ex2, 'right', seeded(100 + i)).msgs.some((m) => m.includes('罠だ'))) trapped++; ex2.hp = {}; ex2.cond = {}; syncParty(ex2); }
  ok(trapped > 5 && trapped < 25, `盗賊がいないと宝箱の罠にかかることがある（${trapped}/40）`);
  // 泉：僧侶がいれば悪い水を見分ける
  let warned = 0, poisoned = 0;
  for (let i = 0; i < 40; i++) {
    put(ex, 'fountain');
    const m = chooseCard(ex, 'right', seeded(200 + i)).msgs;
    if (m.some((x) => x.includes('飲まないほうがいい'))) warned++;
    if (m.some((x) => x.includes('濁った'))) poisoned++;
  }
  ok(warned > 0 && poisoned === 0, '僧侶がいれば泉の悪い水を見分ける');
  // 穴：飛べる子（響＝ドラゴンナイト）は落ちない
  put(ex, 'pit');
  const pm = chooseCard(ex, 'right', seeded(11)).msgs;
  ok(pm.some((m) => m.includes('我那覇響は飛んで渡った')), '飛べる子は穴に落ちない');
  put(ex, 'pit');
  const step = ex.card.step;
  chooseCard(ex, 'left', seeded(12));
  ok(ex.card.step === step, '回り道は1枚に数えない');
  // 瓦礫：スポーツ好き・元気が2人いれば押し通れる
  put(ex, 'rubble');
  ok(chooseCard(ex, 'right', seeded(13)).msgs.some((m) => m.includes('押しのけた')), '元気・スポーツ好きが2人いれば瓦礫を押しのける');
  const lone = party(['yukiho', 'ritsuko']);
  enterCardMode(lone, 'd1', seeded(14));
  put(lone, 'rubble');
  ok(chooseCard(lone, 'right', seeded(15)).msgs.some((m) => m.includes('びくともしない')), '属性がそろわないと押し通れない');
  put(lone, 'riddle');
  ok(chooseCard(lone, 'right', seeded(16)).msgs.some((m) => m.includes('謎を解いた')), 'インテリ（律子）がいれば謎かけが解ける');
  // ダークゾーン：歌える子がいれば照らせる。いなければ数枚のあいだ手がかりと敵の正体が見えない
  const dark = party(['makoto']);
  enterCardMode(dark, 'd1', seeded(17));
  put(dark, 'dark');
  chooseCard(dark, 'left', seeded(18));
  ok(dark.card.dark === ZONE_CARDS, 'ダークゾーンに入る');
  ok(makeCard(dark, 'route', seeded(19)).left.label.includes('？？？') && !makeCard(dark, 'enemy', seeded(19)).text.includes('×'), 'ダークゾーンでは手がかりも敵も分からない');
  put(dark, 'anti');
  chooseCard(dark, 'right', seeded(20));
  put(dark, 'enemy');
  chooseCard(dark, 'right', seeded(21));
  ok(dark.battle?.zone.anti && dark.battle.zone.dark, '呪文禁止・ダークゾーンは戦闘にも効く');
  // 相談に来るアイドル：内容に合う子が来やすい
  const who = Array.from({ length: 30 }, (_, i) => makeCard(ex, 'chest', seeded(300 + i)).who);
  ok(who.every((w) => w === 'ami'), '宝箱の相談は盗賊が持ってくる');
}

// ── 敵カード：戦う・避ける。戦闘の報酬はカードモードの値で、拾った物として記録 ──
{
  const ex = party(SIX, 14);
  enterCardMode(ex, 'd1', seeded(22));
  const c = put(ex, 'enemy', seeded(23));
  ok(c.groups.length >= 1 && c.text.includes('×'), '敵カードには敵の不確定名と数が出る');
  chooseCard(ex, 'right', seeded(24));
  ok(ex.battle && ex.battle.groups.map((g) => g.def.id).join() === c.groups.map((g) => g.enemy).join(), '戦うと、カードの敵と戦闘');
  const step = ex.card.step, g0 = ex.gold;
  const r = play(ex, seeded(25));
  ok(!ex.battle && ex.card.step === step + 1 && ex.card.loot.gold === ex.gold - g0 && !r.msgs.some((m) => m.includes('DRPGボーナス')), '戦闘のあとは次のカード。お金は拾った物として記録');
  let avoided = 0, caught = 0;
  for (let i = 0; i < 60; i++) {
    put(ex, 'enemy', seeded(400 + i));
    const m = chooseCard(ex, 'left', seeded(500 + i));
    if (m.battle) { caught++; ok(ex.battle.surprise === 'enemy', '避けそこねると不意打ち'); play(ex, seeded(600 + i)); ex.hp = {}; ex.cond = {}; syncParty(ex); } else avoided++;
  }
  ok(avoided > 20 && caught > 0, `避けるのは素早さで判定（${avoided}/60 避けた）`);
}

// ── 帰還：いつでも戻れるが、拾った物の半分を失う ──
{
  const ex = party();
  enterCardMode(ex, 'd1', seeded(26));
  ex.gold += 101; ex.card.loot.gold = 101;
  const g = ex.gold;
  const m = returnHome(ex);
  ok(ex.mode === 'town' && !ex.card && ex.gold === g - 51 && m[0].includes('半分'), `途中で帰ると拾った物の半分を失う（${m[0]}）`);
}

// ── 全滅：死体はカードモードのその階に残り、別のパーティで「仲間の死体」カードから連れて帰れる ──
{
  const ex = party(['makoto', 'hibiki', 'haruka', 'ritsuko', 'ami', 'yukiho', 'chihaya', 'yayoi', 'azusa'].slice(0, 6));
  enterCardMode(ex, 'd1', seeded(27));
  ex.card.floor = 1; ex.ex.floor = 1;
  ex.gold += 80; ex.card.loot.gold = 80;
  const g = ex.gold;
  for (const s of ex.slots) ex.cond[s.idol] = 'dead';
  const m = cardWipe(ex);
  ok(ex.mode === 'town' && !ex.slots.length && ex.lost.makoto?.card && ex.lost.makoto.floor === 1 && ex.gold === g - 80, `全滅すると死体がその階に残り、拾った物はすべて失う（${m[0]}）`);
  // 別のパーティで探しに行く
  ex.slots = [{ idol: 'chihaya' }, { idol: 'yayoi' }];
  for (const id of ['chihaya', 'yayoi']) { gainExp(unitOf(ex, id), expForLevel(30), '', seeded(3)); }
  ex.hp = {}; syncParty(ex);
  enterCardMode(ex, 'd1', seeded(28));
  ex.card.floor = 1; ex.card.step = 1; ex.ex.floor = 1;
  put(ex, 'route');
  chooseCard(ex, 'left', seeded(29));
  ok(ex.card.cur.kind === 'corpse' && ex.card.cur.ids.length === 6, '倒れた仲間がいる階では「仲間の死体」カードが出る');
  chooseCard(ex, 'right', seeded(30));
  ok(ex.slots.length === 6 && Object.keys(ex.lost).length === 2 && ex.cond.makoto === 'dead', '空きのぶんだけ連れて帰れる（死亡のまま）');
}

// ── ボス：勝てば全部持ち帰って街へ。昇格アイテムは DRPG より出にくい ──
{
  let cardItems = 0, n = 0;
  for (let i = 0; i < 24; i++) {
    const ex = party(SIX, 34);
    enterCardMode(ex, 'd1', seeded(700 + i));
    ex.card.floor = 2; ex.card.step = 7; ex.ex.floor = 2;
    ex.card.loot.gold = 0;
    put(ex, 'route'); chooseCard(ex, 'right', seeded(800 + i));
    ok(ex.card.cur.kind === 'boss', 'ボスカード');
    chooseCard(ex, 'right', seeded(900 + i));
    const r = play(ex, seeded(1000 + i));
    if (ex.mode !== 'town') { ok(false, `Lv34 ならボスに勝てる（${r.msgs.join(' / ')}）`); continue; }
    n++;
    cardItems += ex.items.length;
    if (i === 0) ok(r.msgs.some((m) => m.includes('踏破')) && ex.ex.bossClears.b1 === 2 && !ex.card, 'ボスに勝つと踏破。ボスはまた強くなる');
  }
  const drpg = 1 + masterRate(1) / 100; // DRPG：紋章1つ＋マスタープルフの確率
  ok(n > 20 && cardItems / n < drpg * 0.6, `カードモードのボスは昇格アイテムが出にくい（平均 ${(cardItems / n).toFixed(2)} 個。DRPG は ${drpg.toFixed(2)} 個）`);
}

console.log(`${pass} ok / ${fail} ng`);
process.exit(fail ? 1 : 0);
