// 劇中の街の施設（エルミナージュ準拠：酒場・宿屋・商店・寺院・城・訓練所）
import { IDOLS, IDOL_LIST } from '../data/idols.js';
import { SONGS } from '../data/songs.js';
import { PROMOTE_ITEMS, ITEMS } from '../data/items.js';
import { ENEMIES } from '../data/enemies.js';
import { spellPool } from '../data/spells.js';
import { CONDITIONS, REVIVE_FEE, DOWN, tryRevive } from './revive.js';
import { gainExp, expForLevel } from './growth.js';
import { shopStock } from './boss.js';
import { unitOf, partyView, syncParty, familiesOf, addScore, scoreName, equippedScore } from './expedition.js';
import { CLASSES, PROMOTE_LEVEL } from '../data/classes.js';
import { itemFits } from '../data/items.js';
import { canChangeClass, changeClass, canPromote, promote } from './classes.js';
import { buildMembers, computeParty, BASE_STATS, STAT_NAME } from './party.js';
import { GEAR, GEAR_SLOTS } from '../data/gear.js';
import { addGear, gearName, gearPrice, gearSellPrice, gearAppraiseFee, wornUids, removeGear, dropUnfit, canWear, isCursed, wornGear, wear, unwear, autoEquipAll, uncurse } from './gear.js';

export const PARTY_MAX = 6;
const name = (id) => IDOLS[id].name;

// ── 酒場：パーティの結成。司教（ビショップ）がいれば楽譜・装備をまとめて鑑定。装備（4部位）は街の「装備」で着せかえる ──
// 戻り値は 13人の状態（パーティにいる／迷宮に取り残されている／待機）
export function roster(ex) {
  return IDOL_LIST.map((id) => {
    const u = unitOf(ex, id);
    return { id, idol: IDOLS[id], level: u.level, cls: u.cls, cond: ex.cond[id] || 'ok',
      inParty: ex.slots.some((s) => s.idol === id), lost: !!ex.lost[id], score: equippedScore(ex, id) };
  });
}
export function joinParty(ex, id) {
  if (ex.lost[id]) return [`${name(id)}は迷宮に取り残されている`];
  if (ex.slots.some((s) => s.idol === id)) return [];
  if (ex.slots.length >= PARTY_MAX) return ['パーティは6人まで'];
  ex.slots.push({ idol: id });
  syncParty(ex);
  return [`${name(id)}がパーティに加わった`];
}
export function leaveParty(ex, id) {
  ex.slots = ex.slots.filter((s) => s.idol !== id);
  return [`${name(id)}はパーティを抜けた`];
}
// 並べかえ（先頭3人が前列）
export function moveMember(ex, id, delta) {
  const i = ex.slots.findIndex((s) => s.idol === id), j = i + delta;
  if (i < 0 || j < 0 || j >= ex.slots.length) return [];
  [ex.slots[i], ex.slots[j]] = [ex.slots[j], ex.slots[i]];
  syncParty(ex);
  return [];
}
// 楽譜を装備する（鑑定済みのものだけ。1つの楽譜は1人だけ）。uid=null で外す
export function equip(ex, id, uid) {
  if (uid == null) { delete ex.equip[id]; syncParty(ex); return [`${name(id)}の楽譜を外した`]; }
  const sc = ex.scores.find((x) => x.uid === uid);
  if (!sc) return [];
  if (!sc.known) return ['未鑑定の楽譜は装備できない'];
  for (const [k, v] of Object.entries(ex.equip)) if (v === uid) delete ex.equip[k];
  ex.equip[id] = uid;
  syncParty(ex);
  return [`${name(id)}が「${SONGS[sc.song].title}」を装備した`];
}
// 小道具・衣装・アクセサリを着せかえる（uid=null で外す）。おまかせは着られる物が少ない子から順に
export function dressUp(ex, id, slot, uid) {
  const msgs = uid == null ? unwear(ex, id, slot) : wear(ex, id, uid);
  syncParty(ex);
  return msgs;
}
export function dressAuto(ex, ids) {
  const msgs = autoEquipAll(ex, ids);
  syncParty(ex);
  return msgs.length ? msgs : ['これ以上よい装備は持っていない'];
}
export const hasAppraiser = (ex) => partyView(ex).some((m) => !DOWN.has(m.cond) && m.abilities.some((a) => a.id === 'identify'));
export const unknownCount = (ex) => ex.scores.filter((sc) => !sc.known).length + ex.gear.filter((g) => !g.known).length;
export function appraiseAll(ex) {
  if (!hasAppraiser(ex)) return ['鑑定できる仲間（ビショップ）がいない'];
  const list = ex.scores.filter((sc) => !sc.known), gear = ex.gear.filter((g) => !g.known);
  if (!list.length && !gear.length) return ['未鑑定の楽譜・装備はない'];
  list.forEach((sc) => { sc.known = true; });
  gear.forEach((g) => { g.known = true; });
  return [...list.map((sc) => `鑑定した：「${SONGS[sc.song].title}」`), ...gear.map((g) => `鑑定した：${gearName(g)}`)];
}

// ── 宿屋：部屋で回復の量が違う。経験値が足りていれば泊まったときにレベルが上がる ──
export const ROOMS = [
  { id: 'stable', name: '馬小屋', fee: 0, hp: 0.1, cure: false, text: 'HP 少し（1割）・呪文とライブの回数' },
  { id: 'economy', name: 'エコノミー', fee: 10, hp: 0.5, cure: true, text: 'HP 半分・毒も治る' },
  { id: 'suite', name: 'スイート', fee: 40, hp: 1, cure: true, text: 'HP 全快・毒も治る' },
];
export const roomFee = (ex, room) => room.fee * ex.slots.length;
export function stay(ex, roomId, rng = Math.random) {
  const room = ROOMS.find((r) => r.id === roomId);
  if (!ex.slots.length) return ['泊まる仲間がいない'];
  const fee = roomFee(ex, room);
  if (ex.gold < fee) return [`お金が足りない（${fee}G）`];
  ex.gold -= fee;
  ex.days++;
  const msgs = [`${room.name}に泊まった${fee ? `（${fee}G）` : ''}`];
  syncParty(ex); // レベルが上がる前の最大 HP を覚えておく（上がったぶんは syncParty が今の HP に足す）
  for (const s of ex.slots) {
    const id = s.idol;
    if (DOWN.has(ex.cond[id])) continue;
    const u = unitOf(ex, id);
    msgs.push(...gainExp(u, 0, name(id), rng)); // ためた経験値でレベルアップ
    const m = partyView(ex).find((x) => x.id === id);
    ex.hp[id] = Math.min(m.maxHp, ex.hp[id] + Math.ceil(m.maxHp * room.hp)); // レベルアップで増えた最大 HP のぶんは syncParty が足す
    if (room.cure && ex.cond[id] === 'poison') ex.cond[id] = 'ok';
    for (const f of familiesOf(m)) ex.mp[id][f] = spellPool(f, m.level, m.base);
    if (m.live && ex.live[id]) ex.live[id].left = m.live.uses;
  }
  syncParty(ex);
  return msgs;
}
export const expToNext = (u) => Math.max(0, expForLevel(u.level + 1) - u.exp);

// ── 商店：昇格アイテム・楽譜・装備の売買、有料の鑑定 ──
export const songPrice = (id) => SONGS[id].rank * 400;
export const appraiseFee = (id) => SONGS[id].rank * 100;
const totalClears = (ex) => Object.values(ex.ex.bossClears).reduce((a, b) => a + b, 0) + Object.values(ex.ex.trip).filter((t) => t === 'boss').length;
// 倒したことのあるボスの数（迷宮ごと）。装備の品ぞろえは、これに 1 を足したランクまで
const bossesBeaten = (ex) => new Set([...Object.keys(ex.ex.bossClears).filter((id) => ex.ex.bossClears[id] > 0),
  ...Object.keys(ex.ex.trip).filter((id) => ex.ex.trip[id] === 'boss')]).size;
export const gearShopRank = (ex) => 1 + bossesBeaten(ex);
export function shopList(ex) {
  const stock = shopStock(totalClears(ex), ex.bought);
  const items = PROMOTE_ITEMS.map((it) => ({ kind: 'item', ...it, stock: it.shop === 'perClear' ? stock[it.id] : Infinity }));
  // 楽譜：★1 はいつでも、★2 はボスを一度倒すと並ぶ
  const maxRank = totalClears(ex) ? 2 : 1;
  const songs = Object.values(SONGS).filter((s) => s.rank <= maxRank)
    .map((s) => ({ kind: 'song', id: s.id, name: `楽譜「${s.title}」`, price: songPrice(s.id), stock: Infinity }));
  // 装備：ランク1はいつでも。迷宮のボスを倒すたびに1つ上のランクが並ぶ。衣装セットと呪いの装備は店にない
  const gear = Object.values(GEAR).filter((g) => g.shop && g.rank <= gearShopRank(ex))
    .map((g) => ({ kind: 'gear', id: g.id, name: g.name, price: gearPrice(g.id), stock: Infinity }));
  return [...items, ...songs, ...gear];
}
export function buy(ex, id) {
  const it = shopList(ex).find((x) => x.id === id);
  if (!it || it.stock <= 0) return ['在庫がない'];
  if (ex.gold < it.price) return ['お金が足りない'];
  ex.gold -= it.price;
  if (it.kind === 'song') addScore(ex, id, true);
  else if (it.kind === 'gear') addGear(ex, id, { known: true });
  else { ex.items.push(id); if (it.shop === 'perClear') ex.bought++; }
  return [`${it.name}を買った（${it.price}G）`];
}
// 売れるもの：昇格アイテムと、装備していない楽譜・装備（売値は半額。未鑑定と呪いの装備は安い）
export function sellList(ex) {
  const items = [...new Set(ex.items)].map((id) => ({ kind: 'item', ref: id, name: ITEMS[id].name, price: Math.floor(ITEMS[id].price / 2) }));
  const worn = new Set(Object.values(ex.equip));
  const scores = ex.scores.filter((sc) => !worn.has(sc.uid))
    .map((sc) => ({ kind: 'score', ref: sc.uid, name: scoreName(sc), price: Math.floor(songPrice(sc.song) / (sc.known ? 2 : 4)) }));
  const wornG = wornUids(ex);
  const gear = ex.gear.filter((g) => !wornG.has(g.uid)).map((g) => ({ kind: 'gear', ref: g.uid, name: gearName(g), price: gearSellPrice(g) }));
  return [...items, ...scores, ...gear];
}
export function sell(ex, kind, ref) {
  const it = sellList(ex).find((x) => x.kind === kind && x.ref === ref);
  if (!it) return [];
  if (kind === 'item') ex.items.splice(ex.items.indexOf(ref), 1);
  else if (kind === 'gear') removeGear(ex, [ref]);
  else ex.scores = ex.scores.filter((sc) => sc.uid !== ref);
  ex.gold += it.price;
  return [`${it.name}を売った（${it.price}G）`];
}
// 未鑑定の楽譜・装備（uid は楽譜と装備で共通の通し番号）
export const unknownList = (ex) => [
  ...ex.scores.filter((sc) => !sc.known).map((sc) => ({ uid: sc.uid, name: scoreName(sc), fee: appraiseFee(sc.song) })),
  ...ex.gear.filter((g) => !g.known).map((g) => ({ uid: g.uid, name: gearName(g), fee: gearAppraiseFee(g) })),
];
export function appraise(ex, uid) {
  const g = ex.gear.find((x) => x.uid === uid && !x.known);
  if (g) {
    const fee = gearAppraiseFee(g);
    if (ex.gold < fee) return [`お金が足りない（${fee}G）`];
    ex.gold -= fee; g.known = true;
    return [`鑑定してもらった（${fee}G）：${gearName(g)}`];
  }
  const sc = ex.scores.find((x) => x.uid === uid && !x.known);
  if (!sc) return [];
  const fee = appraiseFee(sc.song);
  if (ex.gold < fee) return [`お金が足りない（${fee}G）`];
  ex.gold -= fee; sc.known = true;
  return [`鑑定してもらった（${fee}G）：「${SONGS[sc.song].title}」`];
}

// ── 寺院：治療・蘇生（料金はレベルに応じる）、呪いの装備の解呪、死体の回収、寄付（寄付額と同じ経験値） ──
const TREAT = new Set(['dead', 'ash', 'paralyze', 'stone', 'poison']);
export const treatFee = (ex, id) => (REVIVE_FEE[ex.cond[id]] || 20) * unitOf(ex, id).level;
export function treat(ex, id, rng = Math.random) {
  const st = ex.cond[id];
  if (!TREAT.has(st)) return ['治療の必要はない'];
  let fee = treatFee(ex, id);
  // 寺院の慈悲：だれも動けず、お金も足りないときは、1人だけ無料で蘇生してくれる（詰み防止）
  const charity = (st === 'dead' || st === 'ash') && ex.gold < fee && IDOL_LIST.every((x) => ex.lost[x] || DOWN.has(ex.cond[x] || 'ok'));
  if (charity) fee = 0;
  if (ex.gold < fee) return [`お金が足りない（${fee}G）`];
  ex.gold -= fee;
  if (charity) { ex.cond[id] = 'ok'; ex.hp[id] = 1; return [`寺院の人たちが哀れんで、${name(id)}を無料で生き返らせてくれた`]; }
  if (st !== 'dead' && st !== 'ash') { ex.cond[id] = 'ok'; return [`${name(id)}の${CONDITIONS[st].name}が治った（${fee}G）`]; }
  const r = tryRevive(unitOf(ex, id), st, rng);
  if (r === 'ok') { ex.cond[id] = 'ok'; ex.hp[id] = 1; return [`${name(id)}は生き返った！（${fee}G）`]; }
  ex.cond[id] = 'ash';
  return [`蘇生に失敗した……${name(id)}は灰になった（${fee}G）`];
}
// 解呪：呪いを解くと、その装備は崩れてなくなる（js/engine/gear.js）
export function removeCurse(ex, id, slot) {
  const msgs = uncurse(ex, id, slot);
  syncParty(ex);
  return msgs;
}
export const retrieveFee = (ex, id) => 50 + 30 * unitOf(ex, id).level;
export function retrieve(ex, id) {
  if (!ex.lost[id]) return [];
  let fee = retrieveFee(ex, id);
  // 寺院の慈悲：だれも動けず、お金も足りないときは1人だけ無料で運んでくれる
  if (ex.gold < fee && IDOL_LIST.every((x) => ex.lost[x] || DOWN.has(ex.cond[x] || 'ok'))) fee = 0;
  if (ex.gold < fee) return [`お金が足りない（${fee}G）`];
  ex.gold -= fee;
  delete ex.lost[id];
  return [`寺院の人たちが${name(id)}を迷宮から運んできた（${fee}G）`];
}
export function donate(ex, id, amount) {
  amount = Math.floor(amount);
  if (amount <= 0 || ex.gold < amount) return ['お金が足りない'];
  ex.gold -= amount;
  unitOf(ex, id).exp += amount;
  return [`${amount}G を寄付した。${name(id)}は ${amount} の経験値を得た（宿屋に泊まるとレベルが上がる）`];
}

// ── 城：モンスター図鑑 ──
export function bestiary(ex) {
  return Object.values(ENEMIES).map((e) => {
    const b = ex.book[e.id];
    return { id: e.id, known: !!b?.seen, kills: b?.kills || 0, enemy: e };
  });
}

// ── 訓練所：転職（エルミナージュ式）と昇格（聖魔の光石式） ──
// 戻り値：転職できるクラス・昇格先の一覧と、できない理由
export function trainingInfo(ex, id) {
  const u = unitOf(ex, id);
  const cur = CLASSES[u.cls];
  const blocked = ex.lost[id] ? '迷宮に取り残されている' : DOWN.has(ex.cond[id]) ? `${CONDITIONS[ex.cond[id]].name}のため訓練できない` : null;
  const changes = Object.values(CLASSES).filter((c) => c.change && c.id !== u.cls).map((c) => ({
    cls: c, ok: !blocked && canChangeClass(u, c.id),
    reqs: Object.entries(c.req || {}).map(([k, need]) => ({ stat: k, need, have: u.base[k], ok: u.base[k] >= need })),
  }));
  const promotions = cur.tier === 1 ? cur.promote.map((pid) => {
    const items = [...new Set(ex.items)].filter((it) => itemFits(it, u.cls));
    const reason = blocked || (u.level < PROMOTE_LEVEL ? `Lv${PROMOTE_LEVEL} から` : !items.length ? '昇格アイテムがない' : null);
    return { cls: CLASSES[pid], items, ok: !reason, reason };
  }) : [];
  return { unit: u, cls: cur, blocked, changes, promotions };
}

// 転職・昇格の後：装備できなくなった物を外し、HP は新しい最大値、呪文の回数は新しいレベルで数え直す。戻り値は外した装備の知らせ
function afterTraining(ex, id) {
  const msgs = dropUnfit(ex, id);
  const solo = computeParty(buildMembers([{ idol: id, ...unitOf(ex, id) }])).members[0];
  ex.hp[id] = solo.stats.hp;
  delete ex.mp[id];
  const inParty = partyView(ex).find((m) => m.id === id); // パーティにいればシナジー込みの最大値で全快
  if (inParty) ex.hp[id] = inParty.maxHp;
  syncParty(ex);
  return msgs;
}

export function doChangeClass(ex, id, clsId) {
  const info = trainingInfo(ex, id);
  if (info.blocked) return [info.blocked];
  const u = info.unit;
  if (!canChangeClass(u, clsId)) return ['能力が条件に届いていない'];
  const from = CLASSES[u.cls].name;
  ex.units[id] = changeClass(u, clsId, IDOLS[id]);
  const off = afterTraining(ex, id);
  return [`${name(id)}は${from}から${CLASSES[clsId].name}に転職した（Lv1 から。覚えた魔法はそのまま）`, ...off];
}

export function doPromote(ex, id, clsId, itemId) {
  const info = trainingInfo(ex, id);
  if (info.blocked) return [info.blocked];
  const u = info.unit;
  if (!ex.items.includes(itemId) || !canPromote(u, clsId, itemId)) return ['昇格できない'];
  const from = CLASSES[u.cls].name;
  const bonus = CLASSES[clsId].bonus || {};
  ex.units[id] = promote(u, clsId, itemId);
  ex.items.splice(ex.items.indexOf(itemId), 1);
  const off = afterTraining(ex, id);
  const up = BASE_STATS.filter((k) => bonus[k]).map((k) => `${STAT_NAME[k]}+${bonus[k]}`).join(' ');
  return [`${name(id)}は「${ITEMS[itemId].name}」を使い、${from}から${CLASSES[clsId].name}に昇格した！`, `昇格ボーナス：${up}`, ...off];
}

// ── 出発前のチェック（街の「迷宮へ」に出す）。ok=false の項目に、行くとよい施設（tab）をつける ──
export function prepCheck(ex) {
  const party = partyView(ex);
  const names = (list) => list.map((m) => m.idol.name).join('・');
  const out = [];
  const add = (ok, text, tab) => out.push({ ok, text, tab });
  const up = party.filter((m) => !DOWN.has(m.cond));
  if (!party.length) { add(false, 'パーティがいない。酒場で組もう', 'tavern'); return out; }
  const free = roster(ex).filter((r) => !r.inParty && !r.lost && !DOWN.has(r.cond));
  add(party.length >= PARTY_MAX || !free.length, party.length >= PARTY_MAX ? 'パーティは6人そろっている' : `パーティは${party.length}人。待機中の仲間を加えられる`, 'tavern');
  const down = party.filter((m) => DOWN.has(m.cond));
  add(!down.length, down.length ? `倒れている仲間がいる：${names(down)}` : '全員動ける', 'temple');
  const sick = up.filter((m) => m.cond === 'poison');
  if (sick.length) add(false, `毒の仲間がいる：${names(sick)}（寺院か、宿屋のエコノミー以上で治る）`, 'temple');
  const hurt = up.filter((m) => m.hp < m.maxHp);
  add(!hurt.length, hurt.length ? `HP が減っている：${names(hurt)}` : 'HP は満タン', 'inn');
  const tired = up.filter((m) => familiesOf(m).some((f) => (ex.mp[m.id]?.[f] ?? 0) < spellPool(f, m.level, m.base)) || (m.live && (ex.live[m.id]?.left ?? m.live.uses) < m.live.uses));
  add(!tired.length, tired.length ? `呪文・ライブの回数が減っている：${names(tired)}` : '呪文・ライブの回数は全快', 'inn');
  const ready = up.filter((m) => expToNext(unitOf(ex, m.id)) === 0);
  if (ready.length) add(false, `泊まればレベルアップ：${names(ready)}`, 'inn');
  // 小道具・衣装・アクセサリ：空いている部位に、着られる鑑定済みの装備が余っていれば知らせる
  const taken = wornUids(ex);
  const spareFor = (m, slot) => ex.gear.some((g) => g.known && !isCursed(g) && !taken.has(g.uid) && GEAR[g.item].slot === slot && canWear(m.cls, g.item));
  const undressed = party.filter((m) => { const w = wornGear(ex, m.id); return GEAR_SLOTS.some((slot) => !w[slot] && spareFor(m, slot)); });
  add(!undressed.length, undressed.length ? `空いている部位に着られる装備がある：${names(undressed)}（「おまかせ」でまとめて着せられる）` : '着られる装備は全部着ている（新しい装備は商店で買える）', 'equip');
  const worn = new Set(Object.values(ex.equip));
  const spare = ex.scores.filter((sc) => sc.known && !worn.has(sc.uid));
  const bare = party.filter((m) => !ex.equip[m.id]);
  add(!bare.length || !spare.length, bare.length && spare.length ? `楽譜を装備していない仲間がいる：${names(bare)}（使える楽譜 ${spare.length}枚）` : bare.length ? '楽譜は全部装備ずみ（新しい楽譜は商店で買える）' : '全員が楽譜を装備している', 'equip');
  const unknownS = ex.scores.filter((sc) => !sc.known).length, unknownG = ex.gear.filter((g) => !g.known).length;
  if (unknownS + unknownG) add(false, `未鑑定の${[unknownS && `楽譜が${unknownS}枚`, unknownG && `装備が${unknownG}個`].filter(Boolean).join('・')}（楽譜は鑑定するまで装備できない。装備は呪われているかもしれない）`, hasAppraiser(ex) ? 'tavern' : 'shop');
  const promo = party.filter((m) => trainingInfo(ex, m.id).promotions.some((p) => p.ok));
  if (promo.length) add(false, `昇格できる：${names(promo)}`, 'training');
  const lost = Object.keys(ex.lost).map((id) => IDOLS[id].name);
  if (lost.length) add(false, `迷宮に取り残された仲間がいる：${lost.join('・')}`, 'temple');
  return out;
}
