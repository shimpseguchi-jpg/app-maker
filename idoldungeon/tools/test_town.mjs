// 街（酒場・宿屋・商店・寺院・城・記録）と、全滅したときの死体の扱いのテスト
// node idoldungeon/tools/test_town.mjs
import { newExpedition, normalize, addScore, partyView, unitOf, move, enterDungeon, wipeOut, startBattle, finishBattle, STARTER_SONGS } from '../js/engine/expedition.js';
import { roster, joinParty, leaveParty, moveMember, equip, appraiseAll, stay, ROOMS, shopList, buy, sellList, sell, appraise, treat, retrieve, donate, bestiary,
  trainingInfo, doChangeClass, doPromote } from '../js/engine/town.js';
import { IDOLS } from '../js/data/idols.js';
import { exportText, importText, summary } from '../js/save.js';
import { expForLevel } from '../js/engine/growth.js';
import { SONGS } from '../js/data/songs.js';

let fail = 0, pass = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log('NG:', msg); } };
const fresh = () => newExpedition([{ idol: 'makoto' }, { idol: 'hibiki' }, { idol: 'haruka' }]);

// ── 酒場 ──
{
  const ex = fresh();
  ok(roster(ex).length === 13 && roster(ex).filter((r) => r.inParty).length === 3, '13人の名簿と、パーティの3人');
  ok(ex.scores.length === STARTER_SONGS.length && ex.scores.every((s) => s.known), '最初の楽譜は鑑定済み');
  for (const id of ['chihaya', 'yukiho', 'yayoi']) joinParty(ex, id);
  ok(ex.slots.length === 6, '6人まで加えられる');
  ok(joinParty(ex, 'miki')[0].includes('6人'), '7人目は入れない');
  leaveParty(ex, 'yayoi');
  ok(ex.slots.length === 5 && !ex.slots.some((s) => s.idol === 'yayoi'), '外す');
  moveMember(ex, 'chihaya', -1);
  ok(ex.slots[2].idol === 'chihaya' && partyView(ex)[2].row === 'front', '並べかえで前列へ');
  const ready = ex.scores[0];
  equip(ex, 'makoto', ready.uid);
  ok(partyView(ex)[0].song === ready.song, '楽譜を装備すると楽曲が付く');
  equip(ex, 'hibiki', ready.uid);
  ok(!ex.equip.makoto && ex.equip.hibiki === ready.uid, '同じ楽譜は1人だけ（付け替え）');
  const unk = addScore(ex, 'aoi_tori');
  ok(equip(ex, 'makoto', unk.uid)[0].includes('未鑑定') && !ex.equip.makoto, '未鑑定の楽譜は装備できない');
  ok(appraiseAll(ex)[0].includes('ビショップ'), 'ビショップがいないとまとめて鑑定できない');
  unitOf(ex, 'yukiho').cls = 'bishop';
  appraiseAll(ex);
  ok(unk.known, 'ビショップがいればまとめて鑑定');
}

// ── 宿屋：経験値は泊まったときにレベルになる。部屋で回復量が違う ──
{
  const ex = fresh();
  ex.gold = 10000;
  const u = unitOf(ex, 'makoto');
  u.exp = expForLevel(3);
  ok(u.level === 1, '経験値をためただけではレベルは上がらない');
  ex.hp.makoto = 1; ex.cond.makoto = 'poison';
  const mp = (ex.mp.makoto ||= {});
  const msgs = stay(ex, 'stable');
  ok(u.level === 3 && msgs.some((m) => m.includes('Lv3')), '泊まるとレベルアップ（馬小屋でも）');
  ok(ex.cond.makoto === 'poison', '馬小屋では毒は治らない');
  const hp = ex.hp.makoto;
  stay(ex, 'economy');
  ok(ex.hp.makoto > hp && ex.cond.makoto === 'ok', 'エコノミーで HP が回復し、毒も治る');
  stay(ex, 'suite');
  ok(ex.hp.makoto === partyView(ex)[0].maxHp, 'スイートで全快');
  const g = ex.gold;
  stay(ex, 'suite');
  ok(g - ex.gold === ROOMS[2].fee * 3, '料金は人数ぶん');
  ex.gold = 0;
  ok(stay(ex, 'suite')[0].includes('足りない') && stay(ex, 'stable').length >= 1, 'お金がなくても馬小屋には泊まれる');
}

// ── 商店 ──
{
  const ex = fresh();
  ex.gold = 5000;
  const songs = shopList(ex).filter((x) => x.kind === 'song');
  ok(songs.length && songs.every((x) => SONGS[x.id].rank === 1), '最初は ★1 の楽譜だけ');
  buy(ex, songs[0].id);
  ok(ex.scores.at(-1).song === songs[0].id && ex.scores.at(-1).known, '買った楽譜は鑑定済み');
  ex.ex.bossClears.b1 = 1;
  ok(shopList(ex).some((x) => x.kind === 'song' && SONGS[x.id].rank === 2), 'ボスを倒すと ★2 が並ぶ');
  buy(ex, 'heroCrest');
  const g = ex.gold;
  const it = sellList(ex).find((x) => x.kind === 'item');
  sell(ex, 'item', 'heroCrest');
  ok(ex.gold === g + it.price && !ex.items.includes('heroCrest'), '昇格アイテムを売る（半額）');
  equip(ex, 'makoto', ex.scores[0].uid);
  ok(!sellList(ex).some((x) => x.ref === ex.scores[0].uid), '装備中の楽譜は売れない');
  const unk = addScore(ex, 'kosmos');
  const g2 = ex.gold;
  appraise(ex, unk.uid);
  ok(unk.known && ex.gold === g2 - SONGS.kosmos.rank * 100, '有料の鑑定');
}

// ── 寺院 ──
{
  const ex = fresh();
  ex.gold = 100000;
  ex.cond.hibiki = 'poison';
  treat(ex, 'hibiki');
  ok(ex.cond.hibiki === 'ok', '毒を治す');
  ex.cond.haruka = 'ash';
  treat(ex, 'haruka', () => 0.999);
  ok(ex.cond.haruka === 'ash', '灰の蘇生に失敗しても灰のまま');
  treat(ex, 'haruka', () => 0);
  ok(ex.cond.haruka === 'ok', '灰から蘇生');
  const u = unitOf(ex, 'makoto');
  donate(ex, 'makoto', 100);
  ok(u.exp === 100, '寄付した額だけ経験値');
}

// ── 全滅：死体は迷宮に残り、寺院か自分たちで回収する ──
{
  const ex = fresh();
  ex.gold = 100000;
  enterDungeon(ex);
  Object.assign(ex.ex, { floor: 0, x: 5, y: 3, dir: 0 });
  for (const s of ex.slots) ex.cond[s.idol] = 'dead';
  wipeOut(ex);
  ok(ex.mode === 'town' && !ex.slots.length && Object.keys(ex.lost).length === 3, '全滅すると3人とも迷宮に取り残される');
  ok(roster(ex).find((r) => r.id === 'makoto').lost && joinParty(ex, 'makoto')[0].includes('取り残'), '取り残された仲間はパーティに入れない');
  ok(enterDungeon(ex)[0].includes('動けるメンバー'), 'だれもいないと迷宮に入れない');
  retrieve(ex, 'makoto');
  ok(!ex.lost.makoto && ex.cond.makoto === 'dead', '寺院で死体を回収（死亡のまま）');
  // 救助隊：別の2人で探しに行く
  joinParty(ex, 'chihaya'); joinParty(ex, 'ami');
  enterDungeon(ex);
  Object.assign(ex.ex, { floor: 0, x: 5, y: 2, dir: 0 });
  const r = move(ex, 'forward', () => 0.999);
  ok(ex.slots.length === 4 && r.msgs.some((m) => m.includes('見つけた')), '取り残された場所へ行くと連れて帰る');
  ok(!Object.keys(ex.lost).length, '全員回収した');
}

// ── 城：図鑑 ──
{
  const ex = fresh();
  enterDungeon(ex);
  startBattle(ex, { kind: 'wander' }, () => 0.5);
  ex.battle.groups.forEach((g) => g.members.forEach((e) => { e.dead = true; }));
  ex.battle.result = 'win';
  const id = ex.battle.groups[0].def.id;
  finishBattle(ex, () => 0.5);
  const b = bestiary(ex).find((x) => x.id === id);
  ok(b.known && b.kills >= 1, '倒した敵が図鑑に載る');
  ok(bestiary(ex).some((x) => !x.known), 'まだ出会っていない敵は ？？？');
}

// ── 訓練所：転職と昇格 ──
{
  const ex = fresh();
  // 千早（魔道士）を育ててから転職：Lv1・経験値0・能力は本来の値。魔法は残る
  const u = unitOf(ex, 'chihaya');
  joinParty(ex, 'chihaya');
  u.exp = expForLevel(5); stay(ex, 'suite');
  ok(u.level === 5, '千早 Lv5');
  const info = trainingInfo(ex, 'chihaya');
  ok(info.changes.find((x) => x.cls.id === 'priest').ok, '僧侶には転職できる（メンタル11以上）');
  ok(!info.changes.find((x) => x.cls.id === 'samurai').ok, '侍には条件が足りない');
  ok(info.changes.find((x) => x.cls.id === 'samurai').reqs.some((r) => !r.ok), 'どの能力が足りないか分かる');
  ok(info.promotions.every((p) => !p.ok && p.reason.includes('Lv')), 'Lv10 未満は昇格できない');
  doChangeClass(ex, 'chihaya', 'priest');
  const v = unitOf(ex, 'chihaya');
  ok(v.cls === 'priest' && v.level === 1 && v.exp === 0, '転職：Lv1・経験値0');
  ok(v.base.vo === IDOLS.chihaya.base.vo && v.learned.includes('arcane') && v.history.includes('mage'), '転職：能力は本来の値、理魔法は覚えたまま');
  const m = partyView(ex).find((x) => x.id === 'chihaya');
  ok(ex.hp.chihaya === m.maxHp && ex.mp.chihaya.arcane >= 1 && ex.mp.chihaya.heal >= 1, '転職後は HP 全快、理魔法と回復魔法の両方の回数');
  ok(doChangeClass(ex, 'chihaya', 'samurai')[0].includes('条件'), '条件を満たさない転職は断られる');
  // 昇格：Lv10・合うアイテムが必要。アイテムは使うとなくなる
  const w = unitOf(ex, 'makoto');
  w.exp = expForLevel(10); stay(ex, 'stable');
  ok(w.level === 10, '真 Lv10');
  ok(trainingInfo(ex, 'makoto').promotions.every((p) => p.reason === '昇格アイテムがない'), 'アイテムがないと昇格できない');
  ex.items.push('knightCrest', 'heroCrest');
  const pr = trainingInfo(ex, 'makoto').promotions;
  ok(pr.map((p) => p.cls.id).join() === 'warrior,hero' && pr.every((p) => p.ok && p.items.join() === 'heroCrest'), '戦士はヒーローの証で、ウォーリアか勇者へ');
  const pow = w.base.pow;
  const msgs = doPromote(ex, 'makoto', 'hero', 'heroCrest');
  const h = unitOf(ex, 'makoto');
  ok(h.cls === 'hero' && h.level === 1 && h.exp === 0 && h.base.pow === pow + 2, '昇格：Lv1・能力は残りボーナス加算');
  ok(!ex.items.includes('heroCrest') && ex.items.includes('knightCrest'), '使ったアイテムだけなくなる');
  ok(msgs.some((x) => x.includes('パワー+2')), '昇格ボーナスを日本語で表示');
  ok(!trainingInfo(ex, 'makoto').promotions.length, '上位職はもう昇格しない');
  ex.cond.hibiki = 'dead';
  ok(trainingInfo(ex, 'hibiki').blocked && doChangeClass(ex, 'hibiki', 'mercenary')[0].includes('訓練できない'), '死亡中は訓練できない');
}

// ── 記録 ──
{
  const ex = fresh();
  ex.gold = 1234;
  const t = exportText(ex);
  ok(t.startsWith('IDLD1:') && importText(t).gold === 1234 && importText(t).slots.length === 3, '書き出し・読み込み（日本語を含んでも元に戻る）');
  let bad = false;
  try { importText('hello'); } catch (e) { bad = true; }
  ok(bad, 'ほかの文字列は読み込まない');
  ok(summary(ex).includes('3人'), '記録の見出し');
  // 古いセーブ（楽譜・取り残しなどの項目がない）も読める
  const old = normalize({ ex: ex.ex, mode: 'town', slots: [{ idol: 'makoto', song: 'ready' }], hp: {}, cond: {}, gold: 1 });
  ok(Array.isArray(old.scores) && old.lost && old.book && !old.slots[0].song, '古いセーブを新しい形にそろえる');
}

console.log(`${pass} ok / ${fail} ng`);
process.exit(fail ? 1 : 0);
