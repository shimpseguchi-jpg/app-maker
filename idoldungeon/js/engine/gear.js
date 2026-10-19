// 装備（小道具・衣装・アクセサリ）の持ち物と着せかえ。楽譜は town.js の equip（docs/DESIGN.md「18. 装備」）
// 持ち物 ex.gear: [{ uid, item, plus, known }]（plus は強化値。マイナスは呪われている）
// 着ているもの ex.wear: { idolId: { weapon: uid, armor: uid, acc: uid } }
import { GEAR, SETS, TYPE_NAME, PLUS_STEP, GEAR_PRICE, GEAR_SLOTS, SLOT_NAME } from '../data/gear.js';
import { CLASSES } from '../data/classes.js';
import { DUNGEONS } from '../data/floors.js';
import { IDOLS } from '../data/idols.js';
import { STAT_NAME } from './party.js';

const ARMOR_WEIGHT = { robe: 0, light: 1, heavy: 2 };
const clsOf = (ex, id) => ex.units?.[id]?.cls || IDOLS[id].cls;
const nm = (id) => IDOLS[id].name;
const find = (ex, uid) => ex.gear.find((g) => g.uid === uid) || null;

export function addGear(ex, item, { plus = 0, known = false } = {}) {
  const g = { uid: ex.seq++, item, plus, known };
  ex.gear.push(g);
  return g;
}
export const isCursed = (g) => !!(GEAR[g.item].curse || g.plus < 0);
const sign = (n) => (n > 0 ? `+${n}` : n < 0 ? `${n}` : '');
// 未鑑定のうちは種類だけ分かる（「？？？の剣」）
export function gearName(g) {
  const d = GEAR[g.item];
  if (!g.known) return `？？？の${TYPE_NAME[d.type]}`;
  return `${d.name}${sign(g.plus)}${isCursed(g) ? '（呪）' : ''}`;
}
// 能力への効果（強化値込み）。{ atk: 6, hit: 3 } の形
export function gearStats(g) {
  const d = GEAR[g.item];
  const s = { ...d.stats };
  if (g.plus) s[d.main] = (s[d.main] || 0) + g.plus * PLUS_STEP[d.slot];
  return s;
}
export const statText = (s) => Object.entries(s).filter(([, v]) => v).map(([k, v]) => `${STAT_NAME[k]}${v > 0 ? '+' : ''}${v}`).join(' ');
// 種類の説明（「小道具・剣」「衣装・重い衣装」）
export const kindText = (item) => { const d = GEAR[item]; return d.slot === 'acc' ? SLOT_NAME.acc : `${SLOT_NAME[d.slot]}・${TYPE_NAME[d.type]}`; };

// クラスで装備できるか（小道具は種類、衣装は重さ。アクセサリはだれでも）
export function canWear(clsId, item) {
  const c = CLASSES[clsId], d = GEAR[item];
  if (d.slot === 'weapon') return c.weapons.includes(d.type);
  if (d.slot === 'armor') return ARMOR_WEIGHT[d.type] <= ARMOR_WEIGHT[c.armor];
  return true;
}
export const wornUids = (ex) => new Set(Object.values(ex.wear).flatMap((w) => Object.values(w)));
export const wearerOf = (ex, uid) => Object.keys(ex.wear).find((id) => Object.values(ex.wear[id]).includes(uid)) || null;
export function wornGear(ex, id) {
  const w = ex.wear[id] || {};
  return Object.fromEntries(GEAR_SLOTS.map((s) => [s, find(ex, w[s])]));
}

// そろっている衣装セット：[{ id, name, count, of, effects }]
export function setsOf(worn) {
  const count = {};
  for (const g of worn) { const set = GEAR[g.item].set; if (set) count[set] = (count[set] || 0) + 1; }
  return Object.entries(count).filter(([, n]) => n >= 2)
    .map(([id, n]) => ({ id, name: SETS[id].name, count: n, of: SETS[id].pieces.length, effects: SETS[id].bonus[Math.min(n, 3)] }));
}
// その人の装備の効果（party.js の buildMembers に渡す形）：[{ source, effects }]
export function gearEffectsOf(ex, id) {
  const worn = Object.values(wornGear(ex, id)).filter(Boolean);
  const out = worn.map((g) => ({ source: gearName(g), effects: Object.entries(gearStats(g)).map(([stat, add]) => ({ type: 'stat', stat, add, to: 'self' })) }));
  for (const s of setsOf(worn)) out.push({ source: `${s.name}セット`, effects: s.effects });
  return out;
}

// 装備する。未鑑定でも装備できるが、呪われていたら外せなくなる（エルミナージュ準拠）
export function wear(ex, id, uid) {
  const g = find(ex, uid);
  if (!g) return [];
  const d = GEAR[g.item], cls = clsOf(ex, id);
  if (!canWear(cls, g.item)) return [`${nm(id)}（${CLASSES[cls].name}）は${TYPE_NAME[d.type]}を装備できない`];
  const w = (ex.wear[id] ||= {}), cur = find(ex, w[d.slot]);
  if (cur?.uid === uid) return [];
  if (cur && isCursed(cur)) return [`${gearName(cur)}は呪われていて外せない（寺院で解呪できる）`];
  const other = wearerOf(ex, uid);
  if (other) {
    if (isCursed(g)) return [`${nm(other)}の${gearName(g)}は呪われていて外せない`];
    delete ex.wear[other][d.slot];
  }
  w[d.slot] = uid;
  const msgs = [`${nm(id)}が${gearName(g)}を装備した`];
  if (isCursed(g) && !g.known) { g.known = true; msgs.push(`しまった、呪われていた！ ${gearName(g)}は外せない（寺院で解呪できる）`); }
  return msgs;
}
export function unwear(ex, id, slot) {
  const w = ex.wear[id] || {}, g = find(ex, w[slot]);
  if (!g) return [];
  if (isCursed(g)) return [`${gearName(g)}は呪われていて外せない（寺院で解呪できる）`];
  delete w[slot];
  return [`${nm(id)}は${gearName(g)}を外した`];
}

// おまかせ装備：鑑定済みで呪われていない物から、そのクラスにいちばん役立つ物を着せる
const CASTER = new Set(['staff', 'dagger']);
function value(g, cls) {
  const s = gearStats(g), c = CLASSES[cls];
  const caster = c.weapons.every((t) => CASTER.has(t)) && c.weapons.includes('staff');
  return (s.atk || 0) * (caster ? 0.5 : 2) + (s.mat || 0) * (caster ? 2 : 0.3) + (s.def || 0) * 2 + (s.res || 0)
    + (s.hit || 0) * 0.3 + (s.eva || 0) * 0.6 + (s.spd || 0) * 0.3 + (s.crit || 0) * 0.5 + (s.hp || 0) * 0.2;
}
export function autoEquip(ex, id) {
  const cls = clsOf(ex, id), w = (ex.wear[id] ||= {}), taken = wornUids(ex), msgs = [];
  for (const slot of GEAR_SLOTS) {
    const cur = find(ex, w[slot]);
    if (cur && isCursed(cur)) continue;
    const best = ex.gear.filter((g) => GEAR[g.item].slot === slot && g.known && !isCursed(g) && canWear(cls, g.item) && (!taken.has(g.uid) || g.uid === w[slot]))
      .sort((a, b) => value(b, cls) - value(a, cls))[0];
    if (!best || best.uid === w[slot] || (cur && value(best, cls) <= value(cur, cls)) || value(best, cls) <= 0) continue;
    w[slot] = best.uid; taken.add(best.uid);
    if (cur) taken.delete(cur.uid);
    msgs.push(`${nm(id)}が${gearName(best)}を装備した`);
  }
  return msgs;
}

// 何人かまとめておまかせ：着られる物が少ない子（ローブだけ・軽い衣装まで、小道具の種類が少ない）から先に選ぶ
export function autoEquipAll(ex, ids) {
  const order = ids.map((id) => CLASSES[clsOf(ex, id)]).map((c, i) => ({ id: ids[i], k: ARMOR_WEIGHT[c.armor] * 10 + c.weapons.length }));
  return order.sort((a, b) => a.k - b.k).flatMap((x) => autoEquip(ex, x.id));
}

// 転職・昇格で装備できなくなった物は外れる（呪いの装備も外れる）
export function dropUnfit(ex, id) {
  const w = ex.wear[id] || {}, cls = clsOf(ex, id), msgs = [];
  for (const slot of GEAR_SLOTS) {
    const g = find(ex, w[slot]);
    if (g && !canWear(cls, g.item)) { delete w[slot]; msgs.push(`${CLASSES[cls].name}は${gearName(g)}を装備できないので外した`); }
  }
  return msgs;
}

// 持ち物から消す（売る・解呪・カードモードで失う）。着ていれば外れる
export function removeGear(ex, uids) {
  const gone = new Set(uids);
  for (const w of Object.values(ex.wear)) for (const s of GEAR_SLOTS) if (gone.has(w[s])) delete w[s];
  ex.gear = ex.gear.filter((g) => !gone.has(g.uid));
}

// ── 見つかる装備 ──
// 迷宮の深さ（劇場地下迷宮 1F が 0。次の迷宮は前の迷宮の階の数から数える）と、その深さで出るランク
export function depthOf(dungeonId, floor) {
  let d = 0;
  for (const id of Object.keys(DUNGEONS)) { if (id === dungeonId) return d + floor; d += DUNGEONS[id].floors.length; }
  return floor;
}
export const rankAt = (depth) => Math.min(5, 1 + Math.floor((depth + 1) / 2));
// ランクの装備を1つ選び、強化値を決める（たまに +1〜+3、ときどき呪われた −1・−2）
export function rollGear(rank, rng) {
  let pool = Object.values(GEAR).filter((g) => g.rank === rank);
  if (!pool.length) pool = Object.values(GEAR).filter((g) => g.rank <= rank);
  const d = pool[Math.floor(rng() * pool.length)];
  let plus = 0;
  if (!d.curse) {
    const p = rng();
    if (p < 0.08) plus = -1 - Math.floor(rng() * 2);
    else if (p < 0.09 + 0.005 * rank) plus = 3;
    else if (p < 0.13 + 0.015 * rank) plus = 2;
    else if (p < 0.25 + 0.03 * rank) plus = 1;
  }
  return { item: d.id, plus };
}
// 迷宮で見つける（未鑑定）。浅い階なら1つ下のランクのことも多い
export function findGear(ex, depth, rng, bonus = 0) {
  const rank = Math.max(1, Math.min(5, rankAt(depth) + bonus - (rng() < 0.3 ? 1 : 0)));
  const r = rollGear(rank, rng);
  return addGear(ex, r.item, { plus: r.plus });
}

// ── 値段 ──
export const gearPrice = (item) => GEAR_PRICE[GEAR[item].rank];
export const gearSellPrice = (g) => Math.floor(gearPrice(g.item) * (1 + Math.max(0, g.plus) * 0.5) / (g.known && !isCursed(g) ? 2 : 4));
export const gearAppraiseFee = (g) => GEAR[g.item].rank * 60;
export const uncurseFee = (g) => GEAR[g.item].rank * 150;

// 寺院の解呪：呪いを解くと、その装備は崩れてなくなる（エルミナージュ準拠）
export function cursedWorn(ex) {
  return Object.entries(ex.wear).flatMap(([id, w]) => GEAR_SLOTS.map((slot) => ({ id, slot, g: find(ex, w[slot]) })))
    .filter((x) => x.g && isCursed(x.g)).map((x) => ({ ...x, fee: uncurseFee(x.g) }));
}
export function uncurse(ex, id, slot) {
  const g = find(ex, (ex.wear[id] || {})[slot]);
  if (!g || !isCursed(g)) return [];
  const fee = uncurseFee(g);
  if (ex.gold < fee) return [`お金が足りない（${fee}G）`];
  ex.gold -= fee;
  const name = gearName(g);
  removeGear(ex, [g.uid]);
  return [`${nm(id)}の${name}の呪いを解いた。${name}は崩れて消えた（${fee}G）`];
}
