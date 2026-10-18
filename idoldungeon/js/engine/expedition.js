// 冒険全体の状態：ダンジョンの位置（dungeon.js）＋パーティの HP・状態・所持金・アイテム
// 戦闘はまだ仮（勝った／逃げたを選ぶだけ）。戦闘エンジンができたら置き換える
import { newExplore, act, useStairs, retreat, returnToTown, SEARCHERS, KEY_NAMES } from './dungeon.js';
import { buildMembers, computeParty } from './party.js';
import { bossAt, rollDrops, shopStock } from './boss.js';
import { BOSSES } from '../data/bosses.js';
import { ITEMS, PROMOTE_ITEMS } from '../data/items.js';
import { tryRevive, REVIVE_FEE, DOWN, isWiped, CONDITIONS } from './revive.js';

export function newExpedition(slots, dungeonId = 'd1') {
  const ex = { ex: newExplore(dungeonId), mode: 'town', slots, hp: {}, cond: {}, gold: 500, items: [], bought: 0, log: [] };
  syncParty(ex);
  return ex;
}

// パーティ編成が変わったときなどに、HP の最大値と現在値をそろえる
export function syncParty(ex) {
  const { members } = computeParty(buildMembers(ex.slots));
  for (const m of members) {
    if (ex.hp[m.id] == null) ex.hp[m.id] = m.stats.hp;
    ex.hp[m.id] = Math.min(ex.hp[m.id], m.stats.hp);
    ex.cond[m.id] ||= 'ok';
  }
  return members;
}

export function partyView(ex) {
  return syncParty(ex).map((m) => ({ ...m, hp: ex.hp[m.id], maxHp: m.stats.hp, cond: ex.cond[m.id] }));
}

const alive = (ex, m) => !DOWN.has(ex.cond[m.id]);

// ダンジョンでの1手。戻り値 { msgs, pending }（pending は戦闘・階段の確認など、プレイヤーの選択待ち）
export function move(ex, action, rng = Math.random) {
  const party = partyView(ex);
  const searcher = party.some((m) => alive(ex, m) && SEARCHERS.has(m.cls));
  const r = act(ex.ex, action, { rng, searcher });
  const msgs = [...r.msgs];
  let pending = null;
  for (const e of r.events) {
    if (e.type === 'pit') {
      for (const m of party) {
        if (!alive(ex, m)) continue;
        if (m.abilities.some((a) => a.id === 'flying' || a.id === 'fly')) { msgs.push(`${m.idol.name}は飛んでかわした`); continue; }
        const dmg = 1 + Math.floor(rng() * e.max);
        damage(ex, m, dmg, msgs);
      }
    } else if (e.type === 'fountain') {
      for (const m of party) {
        if (!alive(ex, m)) continue;
        if (e.effect === 'heal') ex.hp[m.id] = Math.min(m.maxHp, ex.hp[m.id] + e.amount);
        if (e.effect === 'poison') ex.cond[m.id] = 'poison';
      }
    } else if (e.type === 'battle') {
      pending = { type: 'battle', ...e, name: e.name || (e.kind === 'boss' ? bossAt(e.id, ex.ex.bossClears[e.id] || 0).name : 'さまよう敵（仮）') };
      if (e.kind === 'boss') {
        const b = bossAt(e.id, ex.ex.bossClears[e.id] || 0);
        pending.boss = b;
        msgs.push(b.clears ? `${b.name}が強くなって待ち構えていた！（再戦${b.clears}回目）` : `${b.name}が立ちはだかった！`);
      } else msgs.push(`${pending.name}が現れた！`);
    } else if (e.type === 'stairs') {
      pending = { type: 'stairs', up: e.up, toTown: e.toTown };
    }
  }
  // 毒：歩くたびに HP が減る（エルミナージュ準拠。0 にはならない）
  if (action === 'forward' || action === 'back' || action === 'strafeL' || action === 'strafeR') {
    for (const m of party) if (ex.cond[m.id] === 'poison' && ex.hp[m.id] > 1) ex.hp[m.id]--;
  }
  if (checkWipe(ex, msgs)) pending = { type: 'wiped' };
  return { msgs, pending };
}

function damage(ex, m, dmg, msgs) {
  ex.hp[m.id] = Math.max(0, ex.hp[m.id] - dmg);
  msgs.push(`${m.idol.name}に${dmg}のダメージ`);
  if (ex.hp[m.id] === 0) { ex.cond[m.id] = 'dead'; msgs.push(`${m.idol.name}は倒れた……`); }
}

function checkWipe(ex, msgs) {
  const ids = Object.keys(ex.cond).filter((id) => ex.slots.some((s) => s.idol === id));
  if (!isWiped(ids.map((id) => ex.cond[id]))) return false;
  msgs.push('パーティは全滅した……');
  return true;
}

// 全滅：寺院の回収係が街まで運ぶ（回収料として所持金の半分）。エルミナージュの救助隊は今後
export function rescue(ex) {
  ex.gold = Math.floor(ex.gold / 2);
  toTown(ex);
  return ['寺院の回収係に運ばれて、街に戻った（回収料：所持金の半分）'];
}

// 仮の戦闘の決着
export function resolveBattle(ex, battle, result, rng = Math.random) {
  const msgs = [];
  if (result === 'flee') {
    if (battle.kind !== 'wander') retreat(ex.ex);
    msgs.push('逃げ出した');
    return msgs;
  }
  if (battle.kind === 'boss') {
    const clears = ex.ex.bossClears[battle.id] || 0;
    const d = rollDrops(battle.id, clears, rng);
    ex.ex.trip[battle.id] = 'boss';
    ex.gold += d.gold; ex.items.push(...d.items);
    msgs.push(`${BOSSES[battle.id].name}を倒した！ ${d.gold}G を手に入れた`);
    for (const it of d.items) msgs.push(`「${ITEMS[it].name}」を手に入れた`);
    msgs.push(`★${d.songRank}の楽譜も落ちていた（楽譜の入手は今後実装）`);
  } else if (battle.kind === 'guardian') {
    ex.ex.trip[battle.id] = 'guardian';
    const g = 80 + Math.floor(rng() * 40);
    ex.gold += g;
    msgs.push(`${battle.name}を倒した！ 宝箱から ${g}G を手に入れた`);
  } else {
    const g = 10 + Math.floor(rng() * 20);
    ex.gold += g;
    msgs.push(`${battle.name}を倒した！ ${g}G を手に入れた`);
  }
  return msgs;
}

export function climb(ex) {
  const r = useStairs(ex.ex);
  if (r === 'town') { toTown(ex); return ['街に戻った']; }
  return [];
}

function toTown(ex) {
  returnToTown(ex.ex);
  ex.mode = 'town';
}

export function enterDungeon(ex) {
  ex.mode = 'dungeon';
  const msgs = ['迷宮に入った'];
  ex.ex.seen[0] ||= {};
  ex.ex.seen[0][`${ex.ex.x},${ex.ex.y}`] = 1;
  return msgs;
}

// ── 街 ──
export const INN_FEE = 10;
export function inn(ex) {
  if (ex.gold < INN_FEE) return ['お金が足りない'];
  ex.gold -= INN_FEE;
  for (const m of partyView(ex)) {
    if (DOWN.has(ex.cond[m.id])) continue;
    ex.hp[m.id] = m.maxHp; ex.cond[m.id] = 'ok';
  }
  return [`宿屋で休んだ（${INN_FEE}G）。HP と状態異常が回復した`];
}

export function temple(ex, idolId, rng = Math.random) {
  const m = partyView(ex).find((x) => x.id === idolId);
  const st = ex.cond[idolId];
  if (!m || (st !== 'dead' && st !== 'ash' && st !== 'paralyze' && st !== 'stone')) return ['治療の必要はない'];
  const fee = (REVIVE_FEE[st] || 50) * m.level;
  if (ex.gold < fee) return [`お金が足りない（${fee}G）`];
  ex.gold -= fee;
  if (st === 'paralyze' || st === 'stone') { ex.cond[idolId] = 'ok'; return [`${m.idol.name}の${CONDITIONS[st].name}が治った（${fee}G）`]; }
  const r = tryRevive({ base: m.base }, st, rng);
  if (r === 'ok') { ex.cond[idolId] = 'ok'; ex.hp[idolId] = 1; return [`${m.idol.name}は生き返った！（${fee}G）`]; }
  ex.cond[idolId] = 'ash';
  return [`蘇生に失敗した……${m.idol.name}は灰になった（${fee}G）`];
}

export function shopList(ex) {
  const clears = Object.values(ex.ex.bossClears).reduce((a, b) => a + b, 0) + Object.values(ex.ex.trip).filter((t) => t === 'boss').length;
  const stock = shopStock(clears, ex.bought);
  return PROMOTE_ITEMS.map((it) => ({ ...it, stock: it.shop === 'perClear' ? stock[it.id] : Infinity }));
}
export function buy(ex, itemId) {
  const it = shopList(ex).find((x) => x.id === itemId);
  if (!it || it.stock <= 0) return ['在庫がない'];
  if (ex.gold < it.price) return ['お金が足りない'];
  ex.gold -= it.price; ex.items.push(it.id);
  if (it.shop === 'perClear') ex.bought++;
  return [`「${it.name}」を買った（${it.price}G）`];
}

export const keyLabel = (k) => KEY_NAMES[k] || k;
