// 冒険全体の状態：ダンジョンの位置（dungeon.js）＋パーティの育成・HP・状態・呪文の回数・所持金・アイテム、戦闘（battle.js）
import { newExplore, act, useStairs, retreat, returnToTown, getFloor, isDark, isAntiMagic, SEARCHERS, KEY_NAMES } from './dungeon.js';
import { buildMembers, computeParty } from './party.js';
import { bossAt, rollDrops, shopStock } from './boss.js';
import { createBattle, runTurn } from './battle.js';
import { gainExp } from './growth.js';
import { BOSSES } from '../data/bosses.js';
import { IDOLS } from '../data/idols.js';
import { CLASSES, SPELL_FAMILIES } from '../data/classes.js';
import { ENCOUNTERS, FIXED_GROUPS, BOSS_GUARD, BOSS_ESCORT } from '../data/enemies.js';
import { spellPool } from '../data/spells.js';
import { ITEMS, PROMOTE_ITEMS } from '../data/items.js';
import { tryRevive, REVIVE_FEE, DOWN, isWiped, CONDITIONS } from './revive.js';

export function newExpedition(slots, dungeonId = 'd1') {
  const ex = { ex: newExplore(dungeonId), mode: 'town', slots, units: {}, hp: {}, cond: {}, mp: {}, live: {}, usedRevive: {},
    gold: 500, items: [], bought: 0, battle: null, battleEv: null };
  syncParty(ex);
  return ex;
}

// アイドルごとの育成状態（クラス・レベル・経験値・能力・覚えた魔法）
export function unitOf(ex, idolId) {
  ex.units ||= {};
  const idol = IDOLS[idolId];
  return (ex.units[idolId] ||= { cls: idol.cls, level: 1, exp: 0, base: { ...idol.base }, learned: [] });
}
const slotsOf = (ex) => ex.slots.map((s) => ({ ...s, ...unitOf(ex, s.idol) }));
export const familiesOf = (m) => SPELL_FAMILIES.filter((f) => m.abilities.some((a) => a.id === f || (f === 'dark' && a.id === 'sleepStaff')));

// パーティ編成が変わったとき・レベルが上がったときに、HP・呪文の回数・ライブスキルの回数をそろえる
export function syncParty(ex) {
  const { members } = computeParty(buildMembers(slotsOf(ex)));
  ex.mp ||= {}; ex.live ||= {}; ex.usedRevive ||= {};
  for (const m of members) {
    if (ex.hp[m.id] == null) ex.hp[m.id] = m.stats.hp;
    ex.hp[m.id] = Math.min(ex.hp[m.id], m.stats.hp);
    ex.cond[m.id] ||= 'ok';
    const mp = (ex.mp[m.id] ||= {});
    for (const f of familiesOf(m)) if (mp[f] == null) mp[f] = spellPool(f, m.level, m.base);
    const key = m.song || '';
    if (m.live && ex.live[m.id]?.song !== key) ex.live[m.id] = { song: key, left: m.live.uses };
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
      if (e.kind === 'boss') {
        const b = bossAt(e.id, ex.ex.bossClears[e.id] || 0);
        msgs.push(b.clears ? `${b.name}が強くなって待ち構えていた！（再戦${b.clears}回目）` : `${b.name}が立ちはだかった！`);
      } else msgs.push(e.kind === 'wander' ? '何かが近づいてくる！' : `${e.name}が待ち構えていた！`);
      startBattle(ex, e, rng);
      pending = { type: 'battle' };
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
  ex.battle = null; ex.battleEv = null;
  toTown(ex);
  return ['寺院の回収係に運ばれて、街に戻った（回収料：所持金の半分）'];
}

// ── 戦闘 ──
// 戦闘に出るメンバー（battle.js の party の形）
export function battleParty(ex) {
  return partyView(ex).map((m) => ({
    id: m.id, name: m.idol.name, row: m.row, hp: m.hp, maxHp: m.maxHp, cond: m.cond, stats: m.stats, base: m.base,
    abilities: m.abilities, tags: m.tags, cls: m.cls, range: CLASSES[m.cls].range, level: m.level,
    families: familiesOf(m), mp: { ...(ex.mp[m.id] || {}) },
    live: m.live ? { ...m.live, left: ex.live[m.id]?.left ?? m.live.uses } : null,
    reviveLeft: m.abilities.some((a) => a.id === 'revive') && !ex.usedRevive[m.id],
  }));
}

// ボスを敵データの形にする（再戦の強化・特性つき）
export function bossEnemy(id, clears) {
  const b = bossAt(id, clears);
  const resistAll = b.traits.some((t) => t.id === 'resistAll');
  return { id, name: b.name, uname: '巨大な影', icon: '👹', level: b.level, ...b.stats, hit: 80 + clears * 3, eva: 8,
    exp: Math.round(600 * (1 + 0.5 * clears)), gold: 0, traits: b.traits,
    resist: resistAll ? ['sleep', 'silence', 'confuse', 'death'] : ['death'],
    acts: [{ kind: 'attack', w: 3 }, { kind: 'dmgAll', power: 0.8, w: 1, name: '大見得' }] };
}

export function bossGroups(id, clears) {
  const groups = [{ enemy: bossEnemy(id, clears), count: 1 }, { enemy: BOSS_ESCORT[0], count: BOSS_ESCORT[1] }];
  if (bossAt(id, clears).traits.some((t) => t.id === 'summonGuard')) groups.push({ enemy: BOSS_GUARD, count: 2 });
  return groups;
}

function rollGroups(spec, rng) {
  return spec.map(([enemy, min, max]) => ({ enemy, count: min + Math.floor(rng() * (max - min + 1)) }));
}

export function startBattle(ex, ev, rng = Math.random) {
  const st = ex.ex, fl = getFloor(st.dungeon, st.floor), ch = fl.cellAt(st.x, st.y);
  let groups;
  if (ev.kind === 'boss') {
    const clears = st.bossClears[ev.id] || 0;
    groups = bossGroups(ev.id, clears);
  } else if (ev.kind === 'wander') {
    const table = ENCOUNTERS[st.dungeon][st.floor];
    groups = rollGroups(table[Math.floor(rng() * table.length)], rng);
  } else groups = rollGroups(FIXED_GROUPS[ev.id], rng);
  ex.battleEv = ev;
  ex.battle = createBattle(battleParty(ex), groups, {
    kind: ev.kind, canFlee: ev.kind !== 'boss', zone: { dark: isDark(ch), anti: isAntiMagic(ch) }, rng });
  return ex.battle;
}

// 1ターン進める。戻り値はこのターンの記録
export function battleTurn(ex, commands, rng = Math.random) {
  const b = ex.battle, from = b.log.length;
  runTurn(b, commands, rng);
  return b.log.slice(from);
}

// 戦闘の後始末（HP・状態・回数を戻し、報酬を配る）。戻り値 { msgs, wiped }
export function finishBattle(ex, rng = Math.random) {
  const b = ex.battle, ev = ex.battleEv || {};
  const msgs = [];
  for (const m of b.party) {
    ex.hp[m.id] = m.hp;
    ex.cond[m.id] = DOWN.has(m.cond) ? m.cond : m.poison ? 'poison' : 'ok';
    ex.mp[m.id] = { ...m.mp };
    if (m.live && ex.live[m.id]) ex.live[m.id].left = m.live.left;
    if (m.usedRevive) ex.usedRevive[m.id] = true;
  }
  if (b.result === 'win') {
    const earners = b.party.filter((m) => !m.fled && !DOWN.has(m.cond));
    const share = earners.length ? Math.floor(b.exp / earners.length) : 0;
    msgs.push(`経験値 ${share} ずつ、${b.gold}G を手に入れた`);
    ex.gold += b.gold;
    for (const m of earners) {
      const u = unitOf(ex, m.id);
      const before = u.level;
      msgs.push(...gainExp(u, share, m.name, rng));
      if (u.level > before) {
        // 上がったぶん、HP の最大値と呪文の回数が増える
        const hpBefore = m.maxHp;
        const after = partyView(ex).find((x) => x.id === m.id);
        ex.hp[m.id] += after.maxHp - hpBefore;
        for (const f of familiesOf(after)) ex.mp[m.id][f] = Math.min(spellPool(f, after.level, after.base), (ex.mp[m.id][f] || 0) + 1);
      }
    }
    if (ev.kind === 'guardian') {
      ex.ex.trip[ev.id] = 'guardian';
      const g = 80 + Math.floor(rng() * 40);
      ex.gold += g;
      msgs.push(`宝箱を開けた。${g}G が入っていた`);
    } else if (ev.kind === 'boss') {
      const clears = ex.ex.bossClears[ev.id] || 0;
      const d = rollDrops(ev.id, clears, rng);
      ex.ex.trip[ev.id] = 'boss';
      ex.gold += d.gold; ex.items.push(...d.items);
      msgs.push(`${BOSSES[ev.id].name}を倒した！ ${d.gold}G を手に入れた`);
      for (const it of d.items) msgs.push(`「${ITEMS[it].name}」を手に入れた`);
      msgs.push(`★${d.songRank}の楽譜も落ちていた（楽譜の入手は今後実装）`);
    }
  } else if (b.result === 'flee') {
    if (ev.kind !== 'wander') retreat(ex.ex);
  }
  const wiped = b.result === 'lose';
  ex.battle = null; ex.battleEv = null;
  syncParty(ex);
  return { msgs, wiped };
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
    // 呪文とライブスキルの回数も全快（エルミナージュ準拠）
    for (const f of familiesOf(m)) ex.mp[m.id][f] = spellPool(f, m.level, m.base);
    if (m.live && ex.live[m.id]) ex.live[m.id].left = m.live.uses;
  }
  return [`宿屋で休んだ（${INN_FEE}G）。HP・状態異常・呪文の回数が回復した`];
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
