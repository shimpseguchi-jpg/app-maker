// シナジー判定・能力値計算・データ整合性のチェック
// node idoldungeon/tools/test_synergy.mjs
import { TAGS } from '../js/data/tags.js';
import { IDOLS } from '../js/data/idols.js';
import { SYNERGIES } from '../js/data/synergies.js';
import { SONGS } from '../js/data/songs.js';
import { evaluateSynergies, matchDistinct } from '../js/engine/synergy.js';
import { buildMembers, computeParty, BASE_STATS, DERIVED_STATS } from '../js/engine/party.js';

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

console.log(`${pass} ok / ${fail} ng`);
process.exit(fail ? 1 : 0);
