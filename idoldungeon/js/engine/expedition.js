// 冒険全体の状態：ダンジョンの位置（dungeon.js）＋アイドルの育成・HP・状態・呪文の回数、所持金・アイテム・楽譜、
// 迷宮に残された仲間、図鑑、戦闘（battle.js）。街の施設は town.js
import { newExplore, act, useStairs, retreat, returnToTown, getFloor, isDark, isAntiMagic, SEARCHERS, KEY_NAMES } from './dungeon.js';
import { buildMembers, computeParty } from './party.js';
import { bossAt, rollDrops } from './boss.js';
import { createBattle, runTurn } from './battle.js';
import { BOSSES } from '../data/bosses.js';
import { IDOLS } from '../data/idols.js';
import { CLASSES, SPELL_FAMILIES } from '../data/classes.js';
import { ENCOUNTERS, FIXED_GROUPS, BOSS_GUARD, BOSS_ESCORT } from '../data/enemies.js';
import { spellPool } from '../data/spells.js';
import { ITEMS } from '../data/items.js';
import { SONGS } from '../data/songs.js';
import { DOWN, isWiped } from './revive.js';

// 最初に持っている楽譜（鑑定済み）
export const STARTER_SONGS = ['ready', 'ohayo'];

export function newExpedition(slots, dungeonId = 'd1') {
  const ex = normalize({ ex: newExplore(dungeonId), mode: 'town', slots: slots.map((s) => ({ idol: s.idol })), gold: 500 });
  for (const id of STARTER_SONGS) addScore(ex, id, true);
  syncParty(ex);
  return ex;
}

// 古いセーブにも新しい項目をそろえる
export function normalize(ex) {
  for (const [k, v] of Object.entries({ units: {}, hp: {}, cond: {}, mp: {}, live: {}, usedRevive: {}, items: [], bought: 0,
    battle: null, battleEv: null, scores: [], equip: {}, lost: {}, book: {}, seq: 1, days: 0 })) {
    if (ex[k] == null) ex[k] = structuredClone(v);
  }
  ex.slots = ex.slots.map((s) => ({ idol: s.idol }));
  return ex;
}

// ── 楽譜（楽曲の装備品）。未鑑定のうちは曲名が分からず、装備できない ──
export function addScore(ex, songId, known = false) {
  const sc = { uid: ex.seq++, song: songId, known };
  ex.scores.push(sc);
  return sc;
}
export const scoreName = (sc) => (sc.known ? SONGS[sc.song].title : `？？？の楽譜（★${SONGS[sc.song].rank}）`);
export const equippedScore = (ex, idolId) => ex.scores.find((sc) => sc.uid === ex.equip[idolId]) || null;
// rank 以下の楽曲から1つ（ボス・宝箱のドロップ）
export function randomSong(maxRank, rng, exact = false) {
  const list = Object.values(SONGS).filter((s) => (exact ? s.rank === maxRank : s.rank <= maxRank));
  const pool = list.length ? list : Object.values(SONGS).filter((s) => s.rank <= maxRank);
  return pool[Math.floor(rng() * pool.length)].id;
}

// アイドルごとの育成状態（クラス・レベル・経験値・能力・覚えた魔法）
export function unitOf(ex, idolId) {
  ex.units ||= {};
  const idol = IDOLS[idolId];
  return (ex.units[idolId] ||= { cls: idol.cls, level: 1, exp: 0, base: { ...idol.base }, learned: [] });
}
const slotsOf = (ex) => ex.slots.map((s) => ({ idol: s.idol, song: equippedScore(ex, s.idol)?.song || null, ...unitOf(ex, s.idol) }));
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
  pickUpBodies(ex, msgs);
  if (checkWipe(ex, msgs)) pending = { type: 'wiped' };
  return { msgs, pending };
}

function damage(ex, m, dmg, msgs) {
  ex.hp[m.id] = Math.max(0, ex.hp[m.id] - dmg);
  msgs.push(`${m.idol.name}に${dmg}のダメージ`);
  if (ex.hp[m.id] === 0) { ex.cond[m.id] = 'dead'; msgs.push(`${m.idol.name}は倒れた……`); }
}

function checkWipe(ex, msgs) {
  const ids = ex.slots.map((s) => s.idol);
  if (!ids.length || !isWiped(ids.map((id) => ex.cond[id]))) return false;
  msgs.push('パーティは全滅した……');
  return true;
}

// 全滅：死体はその場に残る（エルミナージュ準拠）。寺院の死体回収か、別のパーティで拾いに行く
export function wipeOut(ex) {
  const st = ex.ex;
  for (const s of ex.slots) ex.lost[s.idol] = { floor: st.floor, x: st.x, y: st.y };
  const names = ex.slots.map((s) => IDOLS[s.idol].name).join('・');
  ex.slots = [];
  ex.battle = null; ex.battleEv = null;
  toTown(ex);
  return [`${names}は迷宮に取り残された……`, '寺院で死体を回収してもらうか、別のパーティで探しに行こう'];
}

// 迷宮に残された仲間を見つけたら、空きがあれば連れて帰る
function pickUpBodies(ex, msgs) {
  const st = ex.ex;
  for (const [id, at] of Object.entries(ex.lost)) {
    if (at.floor !== st.floor || at.x !== st.x || at.y !== st.y) continue;
    if (ex.slots.length >= 6) { msgs.push(`${IDOLS[id].name}が倒れている。でもパーティに空きがない`); continue; }
    delete ex.lost[id];
    ex.slots.push({ idol: id });
    msgs.push(`${IDOLS[id].name}を見つけた！ 連れて帰ろう`);
  }
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
  // 図鑑：正体の分かった敵と倒した数
  for (const g of b.groups) {
    const id = g.def.id;
    const e = (ex.book[id] ||= { seen: false, kills: 0 });
    e.seen ||= g.identified || b.result === 'win';
    e.kills += g.members.filter((x) => x.dead).length;
  }
  if (b.result === 'win') {
    // 経験値はためておき、宿屋に泊まったときにレベルが上がる（エルミナージュ準拠）
    const earners = b.party.filter((m) => !m.fled && !DOWN.has(m.cond));
    const share = earners.length ? Math.floor(b.exp / earners.length) : 0;
    msgs.push(`経験値 ${share} ずつ、${b.gold}G を手に入れた`);
    ex.gold += b.gold;
    for (const m of earners) unitOf(ex, m.id).exp += share;
    if (ev.kind === 'guardian') {
      ex.ex.trip[ev.id] = 'guardian';
      const g = 80 + Math.floor(rng() * 40);
      ex.gold += g;
      msgs.push(`宝箱を開けた。${g}G が入っていた`);
      if (rng() < 0.6) {
        const sc = addScore(ex, randomSong(Math.min(5, ex.ex.floor + 2), rng));
        msgs.push(`${scoreName(sc)}を見つけた`);
      }
    } else if (ev.kind === 'boss') {
      const clears = ex.ex.bossClears[ev.id] || 0;
      const d = rollDrops(ev.id, clears, rng);
      ex.ex.trip[ev.id] = 'boss';
      ex.gold += d.gold; ex.items.push(...d.items);
      msgs.push(`${BOSSES[ev.id].name}を倒した！ ${d.gold}G を手に入れた`);
      for (const it of d.items) msgs.push(`「${ITEMS[it].name}」を手に入れた`);
      const sc = addScore(ex, randomSong(d.songRank, rng, true));
      msgs.push(`${scoreName(sc)}を見つけた`);
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

export function toTown(ex) {
  returnToTown(ex.ex);
  ex.mode = 'town';
}

export function enterDungeon(ex) {
  if (!ex.slots.some((s) => !DOWN.has(ex.cond[s.idol]))) return ['動けるメンバーがいない。酒場でパーティを組もう'];
  ex.mode = 'dungeon';
  const msgs = ['迷宮に入った'];
  ex.ex.seen[0] ||= {};
  ex.ex.seen[0][`${ex.ex.x},${ex.ex.y}`] = 1;
  return msgs;
}

export const keyLabel = (k) => KEY_NAMES[k] || k;
