// シナジー判定・能力値計算・データ整合性のチェック
// node idoldungeon/tools/test_synergy.mjs
import { TAGS } from '../js/data/tags.js';
import { IDOLS } from '../js/data/idols.js';
import { SYNERGIES } from '../js/data/synergies.js';
import { SONGS } from '../js/data/songs.js';
import { evaluateSynergies, matchDistinct } from '../js/engine/synergy.js';
import { buildMembers, computeParty, BASE_STATS, DERIVED_STATS } from '../js/engine/party.js';
import { CLASSES, SPELLS } from '../js/data/classes.js';
import { newUnit, canChangeClass, changeClass, canPromote, promote } from '../js/engine/classes.js';
import { tryRevive, reviveChance, isWiped } from '../js/engine/revive.js';
import { ITEMS, PROMOTE_ITEMS, crestFor } from '../js/data/items.js';
import { BOSSES } from '../js/data/bosses.js';
import { bossAt, rollDrops, masterRate, shopStock, untilNextStage } from '../js/engine/boss.js';

let fail = 0, pass = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log('NG:', msg); } };
const party = (...ids) => buildMembers(ids.map((x) => (typeof x === 'string' ? { idol: x } : x)));
const activeIds = (m) => evaluateSynergies(m).active.map((a) => a.syn.id);

// ── データ整合性 ──
const STATS = new Set([...BASE_STATS, ...DERIVED_STATS]);
const TARGETS = new Set(['party', 'holders', 'front', 'back', 'self']);
for (const i of Object.values(IDOLS)) {
  for (const t of i.tags) ok(TAGS[t], `${i.name}: 未定義タグ ${t}`);
  ok(i.tags.filter((t) => TAGS[t]?.cat === 'color').length === 1, `${i.name}: イメージカラーはちょうど1つ`);
  ok(i.tags.filter((t) => TAGS[t]?.cat === 'school').length === 1, `${i.name}: 学年区分はちょうど1つ`);
  for (const k of BASE_STATS) ok(Number.isInteger(i.base[k]), `${i.name}: base.${k}`);
}
const checkEffects = (where, effects) => {
  for (const e of effects) {
    ok(e.type === 'stat' || e.type === 'ability', `${where}: type ${e.type}`);
    if (e.type === 'stat') ok(STATS.has(e.stat) && (e.add || e.pct), `${where}: stat ${e.stat}`);
    if (e.type === 'ability') ok(e.id && e.name && e.text, `${where}: ability の id/name/text`);
    ok(TARGETS.has(e.to || 'self'), `${where}: to ${e.to}`);
  }
};
const synIds = new Set();
for (const s of SYNERGIES) {
  ok(!synIds.has(s.id), `シナジーid重複 ${s.id}`); synIds.add(s.id);
  if (s.kind === 'count') ok(TAGS[s.tag], `${s.id}: tag ${s.tag}`);
  if (s.kind === 'combo') for (const t of s.all) ok(TAGS[t], `${s.id}: tag ${t}`);
  for (const t of s.tiers || [{ effects: s.effects }]) checkEffects(s.id, t.effects);
  // 単体（1人）では発動しない、というルールの確認
  for (const i of Object.keys(IDOLS)) ok(!activeIds(party(i)).includes(s.id), `${s.id} が ${i} 1人で発動している`);
}
for (const s of Object.values(SONGS)) {
  ok(s.title && s.rank >= 1 && s.rank <= 5, `${s.id}: title/rank`);
  checkEffects(s.id, s.effects);
}
// 13人全員から作れる最大の編成でシナジーが発動できるか（データの作り損ね検出）
// count は今の13人で届かないものは警告だけ（アイドル追加待ち）
{
  const all = Object.values(IDOLS).map((idol, i) => ({ id: idol.id, idol, tags: idol.tags, row: i < 3 ? 'front' : 'back', song: null, level: 1 }));
  for (const s of SYNERGIES) {
    if (s.kind === 'count') {
      const n = all.filter((m) => m.tags.includes(s.tag)).length;
      if (n < s.tiers[0].n) console.log(`  注意: ${s.id} は今の13人では発動できない（アイドル追加待ち）`);
    } else if (s.kind === 'combo') {
      ok(s.all.length <= 6 && !!matchDistinct(all, s.all), `${s.id}: 13人では発動できない`);
    }
  }
}

// ── 判定 ──
ok(activeIds(party('haruka', 'takane')).includes('color_red'), '赤系2人でカラーシナジー');
ok(!activeIds(party('haruka', 'chihaya')).includes('color_red'), '赤系1人では発動しない');
{
  const r = evaluateSynergies(party('yayoi', 'ami', 'mami'));
  const y = r.active.find((a) => a.syn.id === 'color_yellow');
  ok(y && y.tier === 3, '黄系3人は第2段階');
  ok(r.active.some((a) => a.syn.id === 'twins'), '亜美・真美でツイン');
  ok(r.active.some((a) => a.syn.id === 'jhs_group'), '中学生3人で育ち盛り');
}
ok(activeIds(party('makoto', 'ritsuko')).includes('bunbu'), 'スポーツ好き＋インテリで文武両道');
ok(!activeIds(party('makoto', 'hibiki')).includes('bunbu'), 'インテリ不在なら文武両道なし');
ok(activeIds(party('iori', 'yayoi')).includes('friendship'), '伊織＋やよいで身分違いの友情');
ok(activeIds(party('yukiho', 'makoto')).includes('monochrome'), '雪歩＋真でモノクローム');
// 同じ人が複数タグを持っていても combo は1人分（響ひとりで なんくるないさー は不可）
ok(!activeIds(party('hibiki')).includes('nankuru'), '響ひとり（南国育ち＋元気）では combo 不成立');
ok(activeIds(party('hibiki', 'haruka')).includes('nankuru'), '響＋元気な仲間で なんくるないさー');
ok(!activeIds(party('makoto', 'chihaya')).includes('ikimono'), '動物好きがいなければ いきものがかり なし');
ok(activeIds(party('hibiki', 'yayoi')).includes('ikimono'), '響＋やよいで いきものがかり');
ok(matchDistinct(party('azusa', 'miki'), ['lost', 'mypace'])?.length === 2, 'あずさ＋美希で迷子の達人');
ok(activeIds(party('iori', 'azusa', 'ami')).includes('unit_ryugu'), '竜宮小町3人');
ok(!activeIds(party('iori', 'azusa', 'mami')).includes('unit_ryugu'), '真美は竜宮小町ではない');
{
  const six = party('haruka', 'chihaya', 'miki', 'yayoi', 'azusa', 'iori');
  const rb = evaluateSynergies(six).active.find((a) => a.syn.id === 'rainbow');
  ok(rb && rb.tier === 6, `6色で虹色ステージ第2段階 (${rb?.tier})`);
}
{
  const n = evaluateSynergies(party('haruka')).near;
  ok(n.some((x) => x.syn.id === 'color_red'), 'あと1人で赤系、を near に出す');
}
// THE IDOLM@STER：人数を1人分多く数える
{
  const m = party({ idol: 'haruka', song: 'the_idolmaster' }, 'takane');
  const red = evaluateSynergies(m).active.find((a) => a.syn.id === 'color_red');
  ok(red && red.tier === 3, 'THE IDOLM@STER で赤系2人が第2段階に');
  const solo = evaluateSynergies(party({ idol: 'haruka', song: 'the_idolmaster' }, 'chihaya'));
  ok(!solo.active.some((a) => a.syn.id === 'color_red'), 'THE IDOLM@STER は発動前のシナジーを起こさない');
}

// ── 能力値 ──
{
  const base = computeParty(party('makoto')).members[0].stats;
  const withHibiki = computeParty(party('makoto', 'hibiki')).members[0].stats; // 部活動：前列 atk +15%
  ok(withHibiki.atk === Math.floor(base.atk * 1.15), `部活動で攻撃+15% (${base.atk} → ${withHibiki.atk})`);
  const back = computeParty(party('makoto', 'chihaya', 'yukiho', 'hibiki')).members[3].stats; // 響は後列
  const hb = computeParty(party('hibiki')).members[0].stats;
  ok(back.atk === hb.atk, '後列は部活動の対象外');
}
{
  const r = computeParty(party({ idol: 'chihaya', song: 'aoi_tori' }, 'haruka'));
  const c = r.members[0], h = r.members[1];
  ok(c.abilities.some((a) => a.id === 'fly'), '蒼い鳥で飛行');
  ok(!h.abilities.some((a) => a.id === 'fly'), '蒼い鳥は装備者だけ');
  ok(c.live?.uses === 3, 'ライブスキルの回数');
  ok(c.abilities.some((a) => a.id === 'fly' && a.source === '蒼い鳥'), '効果の出どころを記録');
}

// ── クラス ──
for (const c of Object.values(CLASSES)) {
  ok(c.tier === 1 || c.tier === 2, `${c.id}: tier`);
  checkEffects(c.id, c.effects);
  for (const k of Object.keys(c.req || {})) ok(BASE_STATS.includes(k), `${c.id}: req.${k}`);
  for (const k of Object.keys(c.bonus || {})) ok(BASE_STATS.includes(k), `${c.id}: bonus.${k}`);
  if (c.tier === 1) {
    ok(c.change && c.req, `${c.id}: 下位職は転職で選べる`);
    for (const p of c.promote) ok(CLASSES[p]?.tier === 2, `${c.id} → ${p}: 昇格先は上位職`);
    ok(c.promote.length === 2 || c.id === 'dancer', `${c.id}: 昇格先は2択`);
  } else {
    ok(!c.promote, `${c.id}: 上位職は昇格しない`);
    const from = Object.values(CLASSES).filter((x) => x.promote?.includes(c.id));
    ok(from.length || (c.change && c.req), `${c.id}: 昇格元も転職条件もない`);
  }
}
for (const i of Object.values(IDOLS)) {
  ok(CLASSES[i.cls]?.tier === 1, `${i.name}: 初期クラスは下位職`);
  ok(Object.entries(CLASSES[i.cls].req).every(([k, v]) => i.base[k] >= v), `${i.name}: 初期クラスの条件を満たす`);
}
{
  const u = newUnit(IDOLS.chihaya);                 // 魔道士
  ok(!canPromote(u, 'sage', 'guidingRing'), 'Lv1 では昇格できない');
  const u10 = { ...u, level: 10, base: { ...u.base, vo: 20 } };
  ok(!canPromote(u10, 'bishop', 'guidingRing'), '昇格先は2択のどちらか（魔道士→ビショップ不可）');
  ok(!canPromote(u10, 'sage', null), '昇格アイテムが必要');
  ok(!canPromote(u10, 'sage', 'heroCrest'), '系統の違うアイテムでは昇格できない');
  ok(canPromote(u10, 'sage', 'masterSeal'), 'マスタープルフはどの下位職にも使える');
  const s = promote(u10, 'sage', 'guidingRing');
  ok(s.cls === 'sage' && s.level === 1 && s.base.vo === 22 && s.base.men === u.base.men + 2, '昇格：Lv1・能力は残りボーナス加算');
  ok(s.learned.includes('arcane'), '昇格しても魔法は残る');
  ok(!canChangeClass(u, 'samurai'), '侍は条件が高い');
  const p = changeClass(u10, 'priest', IDOLS.chihaya);
  ok(p.level === 1 && p.base.vo === IDOLS.chihaya.base.vo, '転職：Lv1・能力はアイドル本来の値に戻る');
  ok(p.learned.includes('arcane') && p.history.includes('mage'), '転職：魔法は引き継ぐ');
  const t = changeClass(newUnit(IDOLS.ami), 'mercenary', IDOLS.ami);
  ok(!t.learned.includes('disarm'), '罠解除のようなクラス技能は引き継がない');
  ok([...SPELLS].every((id) => Object.values(CLASSES).some((c) => c.effects.some((e) => e.id === id))), 'SPELLS は実在の能力');
  const m = computeParty(buildMembers([{ idol: 'chihaya', cls: 'priest', learned: ['arcane'] }])).members[0];
  ok(m.abilities.some((a) => a.id === 'arcane') && m.abilities.some((a) => a.id === 'heal'), '習得済み魔法と今のクラスの魔法');
  const k = computeParty(buildMembers([{ idol: 'makoto', cls: 'knight' }])).members[0];
  const f = computeParty(buildMembers([{ idol: 'makoto', cls: 'fighter' }])).members[0];
  ok(k.stats.def === f.stats.def + 4, 'クラス特性が能力値に反映');
}

// ── 昇格アイテム ──
for (const c of Object.values(CLASSES)) {
  if (c.tier === 1 && c.promote.length) ok(crestFor(c.id), `${c.id}: 系統別の昇格アイテムがある`);
}
for (const it of PROMOTE_ITEMS) {
  ok(it.price > 0 && (it.shop === 'always' || it.shop === 'perClear'), `${it.id}: 店売りの設定`);
  for (const c of it.for) ok(c === '*' || CLASSES[c]?.tier === 1, `${it.id}: 対象 ${c}`);
}

// ── ボスと再戦 ──
for (const b of Object.values(BOSSES)) for (const c of b.drops.crests) ok(ITEMS[c], `${b.id}: ドロップ ${c}`);
{
  const b0 = bossAt('b1', 0), b4 = bossAt('b1', 4), b5 = bossAt('b1', 5), b10 = bossAt('b1', 10), b15 = bossAt('b1', 15);
  ok(b4.stats.hp === b0.stats.hp && b4.level === b0.level && !b4.traits.length && b4.gold === b0.gold && b4.stage === 0, '1〜5回目（倒した回数0〜4）は最初の強さのまま');
  ok(b5.stage === 1 && b5.stats.hp === Math.floor(b0.stats.hp * 1.5) && b10.stats.atk > b5.stats.atk && b10.level > b5.level, '5回倒すごとに1段階強くなる（＋50%）');
  ok(b5.traits.length === 1 && b10.traits.length === 2 && b15.traits.length === 3, '段階ごとに特性が1つずつ増える');
  ok(b10.gold > b5.gold && b5.gold > b0.gold && b10.songRank > b0.songRank && bossAt('b1', 50).songRank === 5, '報酬も段階で良くなる（楽曲ランクは5まで）');
  ok(untilNextStage(0) === 5 && untilNextStage(4) === 1 && untilNextStage(5) === 5, '次の段階まであと何回');
  const d = rollDrops('b1', 0, () => 0.99);
  ok(d.items.length === 1 && BOSSES.b1.drops.crests.includes(d.items[0]), '系統別の昇格アイテムは確定ドロップ');
  ok(rollDrops('b1', 0, () => 0).items.includes('masterSeal'), 'マスタープルフも落とす');
  ok(masterRate(4) === masterRate(0) && masterRate(5) > masterRate(0) && masterRate(99) === 50, 'マスタープルフは段階が上がるほど出やすい（上限50%）');
  ok(shopStock(0).masterSeal === 0 && shopStock(3, 1).masterSeal === 2, '店のマスタープルフはボスを倒した回数ぶん入荷');
}

// ── 蘇生（ロストなし） ──
{
  const u = newUnit(IDOLS.makoto);
  ok(tryRevive(u, 'dead', () => 0) === 'ok', '蘇生成功');
  ok(tryRevive(u, 'dead', () => 0.999) === 'ash', '死亡からの失敗は灰');
  ok(tryRevive(u, 'ash', () => 0.999) === 'ash', '灰からの失敗も灰のまま（ロストしない）');
  ok(reviveChance(u, 'dead') > reviveChance(u, 'ash'), '灰のほうが難しい');
  ok(isWiped(['dead', 'ash', 'stone']) && !isWiped(['dead', 'ok']), '全滅判定');
}

console.log(`${pass} ok / ${fail} ng`);
process.exit(fail ? 1 : 0);
