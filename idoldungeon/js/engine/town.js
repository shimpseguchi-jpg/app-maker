// 劇中の街の施設（エルミナージュ準拠：酒場・宿屋・商店・寺院・城。訓練所はマイルストーン5）
import { IDOLS, IDOL_LIST } from '../data/idols.js';
import { SONGS } from '../data/songs.js';
import { PROMOTE_ITEMS, ITEMS } from '../data/items.js';
import { ENEMIES } from '../data/enemies.js';
import { spellPool } from '../data/spells.js';
import { CONDITIONS, REVIVE_FEE, DOWN, tryRevive } from './revive.js';
import { gainExp, expForLevel } from './growth.js';
import { shopStock } from './boss.js';
import { unitOf, partyView, syncParty, familiesOf, addScore, scoreName, equippedScore } from './expedition.js';

export const PARTY_MAX = 6;
const name = (id) => IDOLS[id].name;

// ── 酒場：パーティの結成と、楽譜の装備。司教（ビショップ）がいればまとめて鑑定 ──
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
export const hasAppraiser = (ex) => partyView(ex).some((m) => !DOWN.has(m.cond) && m.abilities.some((a) => a.id === 'identify'));
export function appraiseAll(ex) {
  if (!hasAppraiser(ex)) return ['鑑定できる仲間（ビショップ）がいない'];
  const list = ex.scores.filter((sc) => !sc.known);
  if (!list.length) return ['未鑑定の楽譜はない'];
  list.forEach((sc) => { sc.known = true; });
  return list.map((sc) => `鑑定した：「${SONGS[sc.song].title}」`);
}

// ── 宿屋：部屋で回復の量が違う。経験値が足りていれば泊まったときにレベルが上がる ──
export const ROOMS = [
  { id: 'stable', name: '馬小屋', fee: 0, hp: 0, cure: false, text: '呪文・ライブの回数だけ回復' },
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
  for (const s of ex.slots) {
    const id = s.idol;
    if (DOWN.has(ex.cond[id])) continue;
    const u = unitOf(ex, id);
    const before = partyView(ex).find((m) => m.id === id);
    msgs.push(...gainExp(u, 0, name(id), rng)); // ためた経験値でレベルアップ
    const m = partyView(ex).find((x) => x.id === id);
    ex.hp[id] = Math.min(m.maxHp, ex.hp[id] + Math.max(0, m.maxHp - before.maxHp) + Math.ceil(m.maxHp * room.hp));
    if (room.cure && ex.cond[id] === 'poison') ex.cond[id] = 'ok';
    for (const f of familiesOf(m)) ex.mp[id][f] = spellPool(f, m.level, m.base);
    if (m.live && ex.live[id]) ex.live[id].left = m.live.uses;
  }
  syncParty(ex);
  return msgs;
}
export const expToNext = (u) => Math.max(0, expForLevel(u.level + 1) - u.exp);

// ── 商店：昇格アイテムと楽譜の売買、有料の鑑定 ──
export const songPrice = (id) => SONGS[id].rank * 400;
export const appraiseFee = (id) => SONGS[id].rank * 100;
const totalClears = (ex) => Object.values(ex.ex.bossClears).reduce((a, b) => a + b, 0) + Object.values(ex.ex.trip).filter((t) => t === 'boss').length;
export function shopList(ex) {
  const stock = shopStock(totalClears(ex), ex.bought);
  const items = PROMOTE_ITEMS.map((it) => ({ kind: 'item', ...it, stock: it.shop === 'perClear' ? stock[it.id] : Infinity }));
  // 楽譜：★1 はいつでも、★2 はボスを一度倒すと並ぶ
  const maxRank = totalClears(ex) ? 2 : 1;
  const songs = Object.values(SONGS).filter((s) => s.rank <= maxRank)
    .map((s) => ({ kind: 'song', id: s.id, name: `楽譜「${s.title}」`, price: songPrice(s.id), stock: Infinity }));
  return [...items, ...songs];
}
export function buy(ex, id) {
  const it = shopList(ex).find((x) => x.id === id);
  if (!it || it.stock <= 0) return ['在庫がない'];
  if (ex.gold < it.price) return ['お金が足りない'];
  ex.gold -= it.price;
  if (it.kind === 'song') addScore(ex, id, true);
  else { ex.items.push(id); if (it.shop === 'perClear') ex.bought++; }
  return [`${it.name}を買った（${it.price}G）`];
}
// 売れるもの：昇格アイテムと、装備していない楽譜（売値は半額。未鑑定は安い）
export function sellList(ex) {
  const items = [...new Set(ex.items)].map((id) => ({ kind: 'item', ref: id, name: ITEMS[id].name, price: Math.floor(ITEMS[id].price / 2) }));
  const worn = new Set(Object.values(ex.equip));
  const scores = ex.scores.filter((sc) => !worn.has(sc.uid))
    .map((sc) => ({ kind: 'score', ref: sc.uid, name: scoreName(sc), price: Math.floor(songPrice(sc.song) / (sc.known ? 2 : 4)) }));
  return [...items, ...scores];
}
export function sell(ex, kind, ref) {
  const it = sellList(ex).find((x) => x.kind === kind && x.ref === ref);
  if (!it) return [];
  if (kind === 'item') ex.items.splice(ex.items.indexOf(ref), 1);
  else ex.scores = ex.scores.filter((sc) => sc.uid !== ref);
  ex.gold += it.price;
  return [`${it.name}を売った（${it.price}G）`];
}
export function appraise(ex, uid) {
  const sc = ex.scores.find((x) => x.uid === uid && !x.known);
  if (!sc) return [];
  const fee = appraiseFee(sc.song);
  if (ex.gold < fee) return [`お金が足りない（${fee}G）`];
  ex.gold -= fee; sc.known = true;
  return [`鑑定してもらった（${fee}G）：「${SONGS[sc.song].title}」`];
}

// ── 寺院：治療・蘇生（料金はレベルに応じる）、死体の回収、寄付（寄付額と同じ経験値） ──
const TREAT = new Set(['dead', 'ash', 'paralyze', 'stone', 'poison']);
export const treatFee = (ex, id) => (REVIVE_FEE[ex.cond[id]] || 20) * unitOf(ex, id).level;
export function treat(ex, id, rng = Math.random) {
  const st = ex.cond[id];
  if (!TREAT.has(st)) return ['治療の必要はない'];
  const fee = treatFee(ex, id);
  if (ex.gold < fee) return [`お金が足りない（${fee}G）`];
  ex.gold -= fee;
  if (st !== 'dead' && st !== 'ash') { ex.cond[id] = 'ok'; return [`${name(id)}の${CONDITIONS[st].name}が治った（${fee}G）`]; }
  const r = tryRevive(unitOf(ex, id), st, rng);
  if (r === 'ok') { ex.cond[id] = 'ok'; ex.hp[id] = 1; return [`${name(id)}は生き返った！（${fee}G）`]; }
  ex.cond[id] = 'ash';
  return [`蘇生に失敗した……${name(id)}は灰になった（${fee}G）`];
}
export const retrieveFee = (ex, id) => 150 * unitOf(ex, id).level;
export function retrieve(ex, id) {
  if (!ex.lost[id]) return [];
  const fee = retrieveFee(ex, id);
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
