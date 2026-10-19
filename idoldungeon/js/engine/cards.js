// カードモード（Reigns 型。docs/DESIGN.md 17.3）。迷宮の1階から最下階のボスまで、カードを左右に振って進む
// 状態は ex.card：{ dungeon, floor, step（この階で進んだ枚数）, perFloor（この階の枚数）, cur（いまのカード）,
//   hint（道順カードで選んだ手がかり）, dark・anti（ダークゾーン・呪文禁止の残り枚数）, loot（この挑戦で拾った物）, corpse・guardian（この階で出したか） }
// 戦闘は DRPG と同じ（engine/battle.js）。画面から独立。rng を渡せば結果は決まる
import { IDOLS } from '../data/idols.js';
import { BOSSES } from '../data/bosses.js';
import { ENEMIES, ENCOUNTERS } from '../data/enemies.js';
import { DUNGEONS } from '../data/floors.js';
import { CARD_DUNGEONS, EXTRA_CARDS, ZONE_CARDS, HINTS, WEIGHTS, HINT_BOOST, EVENTS } from '../data/cards.js';
import { enterDungeon, partyView, startBattle, finishBattle, rollGroups, damage, checkWipe, addScore, scoreName, randomSong,
  rewardRate, toTown } from './expedition.js';
import { SEARCHERS } from './dungeon.js';
import { bossStage } from './boss.js';
import { findGear, gearName, depthOf, removeGear } from './gear.js';
import { DOWN } from './revive.js';

const pick = (list, rng) => list[Math.floor(rng() * list.length)];
const standing = (ex) => partyView(ex).filter((m) => !DOWN.has(m.cond));
const has = (m, id) => m.abilities.some((a) => a.id === id);
const floorName = (c) => DUNGEONS[c.dungeon].floors[c.floor].id;

// カードモードで迷宮に入る（解放の確認は enterDungeon）
export function enterCardMode(ex, dungeonId, rng = Math.random) {
  const msgs = enterDungeon(ex, dungeonId, 'card');
  if (ex.mode !== 'card') return msgs;
  ex.card = { dungeon: dungeonId, floor: 0, step: 0, perFloor: CARD_DUNGEONS[dungeonId].perFloor, cur: null, hint: null,
    dark: 0, anti: 0, loot: { gold: 0, scores: [], items: [], gear: [] }, corpse: {}, guardian: {}, prev: null };
  ex.ex.floor = 0;
  ex.card.cur = draw(ex, rng);
  return msgs;
}

// パーティの残り HP（％）。画面の上のゲージ
export function partyHp(ex) {
  const p = partyView(ex);
  const max = p.reduce((s, m) => s + m.maxHp, 0);
  const hp = p.reduce((s, m) => s + (DOWN.has(m.cond) ? 0 : m.hp), 0);
  return max ? Math.round((hp / max) * 100) : 0;
}

// 画面に出すもの
export function cardView(ex) {
  const c = ex.card;
  return { card: c.cur, floor: floorName(c), step: Math.min(c.step + 1, c.perFloor), perFloor: c.perFloor,
    last: c.floor === CARD_DUNGEONS[c.dungeon].floors - 1, dark: c.dark, anti: c.anti, loot: c.loot, hp: partyHp(ex) };
}

// ── 次のカードを引く ──
function draw(ex, rng) {
  const c = ex.card, cfg = CARD_DUNGEONS[c.dungeon];
  // 仲間の死体：カードモードでこの階に倒れた仲間がいれば、この階で必ず出る
  const bodies = Object.entries(ex.lost).filter(([, at]) => at.card && at.dungeon === c.dungeon && at.floor === c.floor).map(([id]) => id);
  if (bodies.length && !c.corpse[c.floor] && c.step >= 1) { c.corpse[c.floor] = true; return corpseCard(bodies); }
  if (c.step >= c.perFloor) return c.floor === cfg.floors - 1 ? bossCard(ex) : stairsCard();
  const w = { ...WEIGHTS };
  if (c.prev === 'route') w.route = 0;
  if (c.guardian[c.floor]) w.guardian = 0;
  if (c.hint) for (const k of HINTS[c.hint].kinds) w[k] *= HINT_BOOST;
  c.hint = null;
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  let r = rng() * total, kind = 'enemy';
  for (const [k, v] of Object.entries(w)) { r -= v; if (r < 0) { kind = k; break; } }
  c.prev = kind;
  return makeCard(ex, kind, rng);
}

export function makeCard(ex, kind, rng) {
  const c = ex.card, cfg = CARD_DUNGEONS[c.dungeon];
  if (kind === 'stairs') return stairsCard();
  if (kind === 'boss') return bossCard(ex);
  if (kind === 'route') {
    const keys = Object.keys(HINTS);
    const a = pick(keys, rng), b = pick(keys.filter((k) => k !== a), rng);
    const name = (k) => (c.dark ? '？？？' : HINTS[k].name);
    return { kind, tag: '道順', title: '分かれ道', text: '道が二つに分かれている。',
      left: { label: `左の道（${name(a)}）`, hp: 0, hint: a }, right: { label: `右の道（${name(b)}）`, hp: 0, hint: b } };
  }
  if (kind === 'enemy') {
    const groups = rollGroups(pick(ENCOUNTERS[c.dungeon][c.floor], rng), rng);
    const names = groups.map((g) => `${ENEMIES[g.enemy].uname}×${g.count}`).join('・');
    return { kind, tag: '敵', title: '敵の気配', text: c.dark ? '暗がりの奥で、何かが動いた。' : `${names}が行く手をふさいでいる。`,
      left: { label: '避ける', hp: 1 }, right: { label: '戦う', hp: 2 }, groups };
  }
  if (kind === 'guardian') {
    c.guardian[c.floor] = true;
    return { kind, tag: '敵', title: '番人の部屋', text: '扉の奥で、番人が宝箱を守っている。',
      left: { label: '通り過ぎる', hp: 0 }, right: { label: '挑む', hp: 2 }, id: cfg.guardians[c.floor] };
  }
  const def = EVENTS[kind];
  const who = presenter(ex, def.who, rng);
  return { kind, tag: def.kind, title: def.title, text: def.text.replace('{name}', who ? IDOLS[who].name : '仲間'), who,
    left: { ...def.left }, right: { ...def.right } };
}

const stairsCard = () => ({ kind: 'stairs', tag: '階段', title: '下り階段', text: '下へ続く階段がある。',
  left: { label: 'この階をもっと探る', hp: 0 }, right: { label: '下りる', hp: 0 } });
const bossCard = (ex) => {
  const id = CARD_DUNGEONS[ex.card.dungeon].boss, stage = bossStage(ex.ex.bossClears[id] || 0);
  return { kind: 'boss', tag: 'ボス', title: BOSSES[id].name, text: `${BOSSES[id].name}の気配がする。ここが最深部だ。${stage ? `（第${stage + 1}段階の強さ）` : ''}`,
    left: { label: '街へ戻る（拾った物の半分を失う）', hp: 0 }, right: { label: '挑む', hp: 2 }, id };
};
const corpseCard = (ids) => ({ kind: 'corpse', tag: '仲間', title: '倒れた仲間', text: `${ids.map((id) => IDOLS[id].name).join('・')}が倒れている……`,
  left: { label: '置いていく', hp: 0 }, right: { label: '連れて帰る', hp: 0 }, ids });

// 相談を持ってくるアイドル：内容に合うクラス・属性の子が来やすい
function presenter(ex, who, rng) {
  const list = standing(ex);
  if (!list.length) return null;
  const fit = list.filter((m) => who.cls?.includes(m.cls) || who.tags?.some((t) => m.tags.includes(t)));
  return pick(fit.length ? fit : list, rng).id;
}

// ── カードを左右に振る ──
// 戻り値 { msgs, battle?（戦闘が始まった）, wiped?（全滅した）, town?（街に戻った） }
export function chooseCard(ex, side, rng = Math.random) {
  const c = ex.card, card = c?.cur;
  if (!card || ex.battle || (side !== 'left' && side !== 'right')) return { msgs: [] };
  const msgs = [];
  if (c.dark) c.dark--;
  if (c.anti) c.anti--;
  const r = RESOLVE[card.kind](ex, card, side, rng, msgs) || {};
  if (r.battle) return { msgs, battle: true };
  if (r.town) return { msgs, town: true };
  if (checkWipe(ex, msgs)) return { msgs, wiped: true };
  advance(ex, rng, r.stay);
  return { msgs };
}

function advance(ex, rng, stay = false) {
  const c = ex.card;
  if (!stay) c.step++;
  c.cur = draw(ex, rng);
}

const zone = (c) => ({ dark: c.dark > 0, anti: c.anti > 0 });
const fight = (ex, ev, rng, surprised = false) => {
  startBattle(ex, ev, rng, zone(ex.card));
  if (surprised) { ex.battle.surprise = 'enemy'; ex.battle.log.push('不意を突かれた！'); }
  return { battle: true };
};

const RESOLVE = {
  route(ex, card, side, rng, msgs) {
    ex.card.hint = card[side].hint;
    msgs.push(`${side === 'left' ? '左' : '右'}の道を進んだ`);
  },
  enemy(ex, card, side, rng, msgs) {
    const ev = { kind: 'wander', groups: card.groups };
    if (side === 'right') return fight(ex, ev, rng);
    // 避ける：パーティと敵の素早さの差で決まる
    const ps = standing(ex), es = card.groups.map((g) => ENEMIES[g.enemy].spd);
    const p = Math.max(15, Math.min(90, 50 + (avg(ps.map((m) => m.stats.spd)) - avg(es)) * 1.5));
    if (rng() * 100 < p) { msgs.push('気づかれずにやり過ごした'); return {}; }
    msgs.push('見つかってしまった！');
    return fight(ex, ev, rng, true);
  },
  guardian(ex, card, side, rng, msgs) {
    if (side === 'right') return fight(ex, { kind: 'guardian', id: card.id }, rng);
    msgs.push('番人の部屋を通り過ぎた');
  },
  boss(ex, card, side, rng, msgs) {
    if (side === 'right') return fight(ex, { kind: 'boss', id: card.id }, rng);
    msgs.push(...returnHome(ex));
    return { town: true };
  },
  stairs(ex, card, side, rng, msgs) {
    const c = ex.card;
    if (side === 'left') { c.perFloor += EXTRA_CARDS; msgs.push('この階をもう少し探ることにした'); return { stay: true }; }
    c.floor++; c.step = 0; c.perFloor = CARD_DUNGEONS[c.dungeon].perFloor;
    ex.ex.floor = c.floor;
    msgs.push(`${floorName(c)}に下りた`);
    return { stay: true };
  },
  corpse(ex, card, side, rng, msgs) {
    if (side === 'left') { msgs.push('いまは置いていくしかない……'); return {}; }
    for (const id of card.ids) {
      if (ex.slots.length >= 6) { msgs.push(`${IDOLS[id].name}を運ぶ空きがない`); continue; }
      delete ex.lost[id];
      ex.slots.push({ idol: id });
      msgs.push(`${IDOLS[id].name}を連れて帰る。寺院で蘇生しよう`);
    }
  },
  chest(ex, card, side, rng, msgs) {
    if (side === 'left') { msgs.push('宝箱はそっとしておいた'); return {}; }
    const s = standing(ex).find((m) => SEARCHERS.has(m.cls));
    if (s) msgs.push(`${s.idol.name}が罠を外した`);
    else if (rng() < 0.35) { msgs.push('罠だ！ 宝箱が爆発した'); hurtAll(ex, 0.12, rng, msgs); }
    loot(ex, 1, 0.3, rng, msgs);
  },
  fountain(ex, card, side, rng, msgs) {
    if (side === 'left') { msgs.push('泉には手をつけなかった'); return {}; }
    const good = rng() < 0.7;
    const wise = standing(ex).find((m) => EVENTS.fountain.who.cls.includes(m.cls));
    if (!good && wise) { msgs.push(`${wise.idol.name}「この水は飲まないほうがいい」`); return {}; }
    if (good) { msgs.push('澄んだ水だ。体に力が戻ってきた'); healAll(ex, 0.35, msgs); }
    else { msgs.push('濁った水だった……気分が悪い'); hurtAll(ex, 0.1, rng, msgs); }
  },
  pit(ex, card, side, rng, msgs) {
    if (side === 'left') { msgs.push('回り道をした'); return { stay: true }; }
    for (const m of standing(ex)) {
      if (has(m, 'flying') || has(m, 'fly')) { msgs.push(`${m.idol.name}は飛んで渡った`); continue; }
      if (rng() < 0.45 + (m.base.dan - 10) * 0.03) continue;
      msgs.push(`${m.idol.name}は穴に落ちた！`);
      damage(ex, m, hurtOf(m, 0.2, rng), msgs);
    }
    msgs.push('穴の向こうへ渡った');
  },
  door(ex, card, side, rng, msgs) {
    if (side === 'left') { msgs.push('扉の前を通り過ぎた'); return {}; }
    const s = standing(ex).find((m) => SEARCHERS.has(m.cls));
    if (s) { msgs.push(`${s.idol.name}が鍵を開けた。中に宝があった`); loot(ex, 1.5, 0.5, rng, msgs); return {}; }
    if (rng() < 0.5) { msgs.push('鍵はびくともしない'); return {}; }
    msgs.push('扉をこじ開けた音で、敵が集まってきた！');
    return fight(ex, { kind: 'wander', groups: rollGroups(pick(ENCOUNTERS[ex.card.dungeon][ex.card.floor], rng), rng) }, rng);
  },
  rest(ex, card, side, rng, msgs) {
    if (side === 'left') { msgs.push('先を急いだ'); return {}; }
    healAll(ex, 0.25, msgs);
    msgs.push('ひと休みした');
    if (rng() < 0.25) {
      msgs.push('休んでいるところを襲われた！');
      return fight(ex, { kind: 'wander', groups: rollGroups(pick(ENCOUNTERS[ex.card.dungeon][ex.card.floor], rng), rng) }, rng, true);
    }
  },
  dark(ex, card, side, rng, msgs) {
    if (side === 'right') {
      const s = standing(ex).find((m) => (ex.live[m.id]?.left || 0) > 0);
      if (s) { ex.live[s.id].left--; msgs.push(`${s.idol.name}の歌で、通路が明るくなった`); return {}; }
      msgs.push('歌える人がいない……');
    }
    ex.card.dark = ZONE_CARDS;
    msgs.push(`ダークゾーンに入った（あと${ZONE_CARDS}枚、手がかりも敵の正体も分からない）`);
  },
  anti(ex, card, side, rng, msgs) {
    if (side === 'left') { msgs.push('回り道をした'); return { stay: true }; }
    ex.card.anti = ZONE_CARDS;
    msgs.push(`呪文禁止の場所に入った（あと${ZONE_CARDS}枚、呪文が使えない）`);
  },
  warp(ex, card, side, rng, msgs) {
    if (side === 'left') { msgs.push('紋様を避けて進んだ'); return {}; }
    const c = ex.card;
    if (rng() < 0.5) { c.step = Math.min(c.perFloor - 1, c.step + 2); msgs.push('先へ飛ばされた！'); }
    else { c.step = Math.max(0, c.step - 2); msgs.push('来た道へ戻されてしまった……'); }
  },
  rubble: (ex, card, side, rng, msgs) => synergy(ex, 'rubble', side, rng, msgs,
    (who) => { msgs.push(`${who}が瓦礫を押しのけた！ 奥に何か落ちている`); loot(ex, 0.8, 0.2, rng, msgs); },
    () => { msgs.push('瓦礫はびくともしない。手を痛めた'); hurtAll(ex, 0.06, rng, msgs); return { stay: true }; }, '回り道をした', true),
  lost: (ex, card, side, rng, msgs) => synergy(ex, 'lost', side, rng, msgs,
    (who) => { msgs.push(`${who}が小道具係を送り届けた。お礼をもらった`); loot(ex, 1, 0.4, rng, msgs); },
    () => { msgs.push('一緒に迷ってしまった……'); hurtAll(ex, 0.05, rng, msgs); }, '先を急いだ'),
  riddle: (ex, card, side, rng, msgs) => synergy(ex, 'riddle', side, rng, msgs,
    (who) => { msgs.push(`${who}が謎を解いた！ 扉の奥に宝があった`); loot(ex, 1.2, 0.5, rng, msgs); },
    () => { msgs.push('答えを間違えた！ 扉から電撃が走る'); hurtAll(ex, 0.12, rng, msgs); }, '謎かけはやめておいた'),
  stage: (ex, card, side, rng, msgs) => synergy(ex, 'stage', side, rng, msgs,
    (who) => {
      msgs.push(`${who}の歌声が響いた。みんなの心が軽くなった`);
      healAll(ex, 0.15, msgs);
      for (const m of standing(ex)) if (m.live && ex.live[m.id]) ex.live[m.id].left = Math.min(m.live.uses, ex.live[m.id].left + 1);
    },
    () => { msgs.push('歌ってみたが、何も起きなかった'); }, '舞台を通り過ぎた'),
  kitchen: (ex, card, side, rng, msgs) => synergy(ex, 'kitchen', side, rng, msgs,
    (who) => { msgs.push(`${who}の料理で、みんな元気になった`); healAll(ex, 0.4, msgs); },
    () => {
      if (rng() < 0.5) { msgs.push('……お腹をこわした'); hurtAll(ex, 0.08, rng, msgs); }
      else { msgs.push('まあまあの味だった'); healAll(ex, 0.1, msgs); }
    }, '食材はそのままにした'),
  cat: (ex, card, side, rng, msgs) => synergy(ex, 'cat', side, rng, msgs,
    (who) => { msgs.push(`猫は${who}になついて、宝のありかを教えてくれた`); loot(ex, 1, 0.5, rng, msgs); },
    () => { msgs.push('猫は逃げてしまった'); }, '猫を見送った'),
};

// 属性タグで結果が変わるイベント（docs/DESIGN.md 17.3）：need の属性を持つ子が count 人以上いれば成功
function synergy(ex, id, side, rng, msgs, ok, ng, leftMsg, leftStays = false) {
  if (side === 'left') { msgs.push(leftMsg); return leftStays ? { stay: true } : {}; }
  const need = EVENTS[id].need;
  const fit = standing(ex).filter((m) => need.tags.some((t) => m.tags.includes(t)));
  if (fit.length >= need.count) return ok(fit.slice(0, need.count).map((m) => m.idol.name).join('と')) || {};
  return ng() || {};
}

const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const hurtOf = (m, pct, rng) => Math.max(1, Math.round(m.maxHp * pct * (0.7 + rng() * 0.6)));
function hurtAll(ex, pct, rng, msgs) {
  for (const m of standing(ex)) damage(ex, m, hurtOf(m, pct, rng), msgs);
}
function healAll(ex, pct, msgs) {
  for (const m of standing(ex)) ex.hp[m.id] = Math.min(m.maxHp, ex.hp[m.id] + Math.max(1, Math.round(m.maxHp * pct)));
  msgs.push(`パーティの HP が回復した（${partyHp(ex)}%）`);
}

// 拾ったお金・楽譜・装備（カードモードの報酬は DRPG の 2/3）。この挑戦の拾った物として記録する
// 装備は楽譜と同じ確率で、楽譜とは別に見つかる
function loot(ex, mult, scoreChance, rng, msgs) {
  const c = ex.card, cfg = CARD_DUNGEONS[c.dungeon];
  const gold = Math.max(1, Math.floor((15 + 12 * c.floor) * cfg.loot * mult * rewardRate(ex) * (0.8 + rng() * 0.4)));
  ex.gold += gold; c.loot.gold += gold;
  msgs.push(`${gold}G を手に入れた`);
  if (rng() < scoreChance * rewardRate(ex)) {
    const sc = addScore(ex, randomSong(Math.min(5, c.floor + (cfg.loot > 1 ? 3 : 1)), rng));
    c.loot.scores.push(sc.uid);
    msgs.push(`${scoreName(sc)}を見つけた`);
  }
  if (rng() < scoreChance * rewardRate(ex)) {
    const g = findGear(ex, depthOf(c.dungeon, c.floor), rng);
    c.loot.gear.push(g.uid);
    msgs.push(`${gearName(g)}を見つけた`);
  }
}

// ── 戦闘のあと ──
// 拾った物を記録し、カードを進める。ボスに勝てば街へ（全部持ち帰る）
export function finishCardBattle(ex, rng = Math.random) {
  const c = ex.card, ev = ex.battleEv || {}, result = ex.battle.result;
  const g0 = ex.gold, s0 = ex.scores.length, i0 = ex.items.length, e0 = ex.gear.length;
  const r = finishBattle(ex, rng);
  c.loot.gold += Math.max(0, ex.gold - g0);
  c.loot.scores.push(...ex.scores.slice(s0).map((sc) => sc.uid));
  c.loot.items.push(...ex.items.slice(i0));
  (c.loot.gear ||= []).push(...ex.gear.slice(e0).map((g) => g.uid));
  if (r.wiped) return r;
  if (ev.kind === 'boss' && result === 'win') { r.msgs.push(...clearRun(ex)); r.town = true; return r; }
  advance(ex, rng);
  return r;
}

function lootText(l) {
  return [`${l.gold}G`, l.scores.length && `楽譜${l.scores.length}`, l.gear?.length && `装備${l.gear.length}`, l.items.length && `アイテム${l.items.length}`].filter(Boolean).join('・');
}

// ボスを倒した：拾った物は全部持ち帰る
function clearRun(ex) {
  const msgs = [`${DUNGEONS[ex.card.dungeon].name}を踏破した！ 拾った物をすべて持ち帰った（${lootText(ex.card.loot)}）`];
  endRun(ex);
  return msgs;
}

// 途中で街に戻る：この挑戦で拾った物の半分を失う
export function returnHome(ex) {
  const l = ex.card.loot;
  const half = (xs = []) => xs.slice(Math.floor(xs.length / 2));
  const lost = { gold: Math.min(ex.gold, Math.ceil(l.gold / 2)), scores: half(l.scores), items: half(l.items), gear: half(l.gear) };
  drop(ex, lost);
  const msgs = [`街に戻った。拾った物の半分を失った（${lootText(lost)}）`];
  endRun(ex);
  return msgs;
}

// 全滅：死体はカードモードのこの迷宮・この階に残る。拾った物はすべて失う
export function cardWipe(ex) {
  const c = ex.card;
  drop(ex, { gold: Math.min(ex.gold, c.loot.gold), scores: c.loot.scores, items: c.loot.items, gear: c.loot.gear || [] });
  for (const s of ex.slots) ex.lost[s.idol] = { dungeon: c.dungeon, floor: c.floor, card: true };
  const names = ex.slots.map((s) => IDOLS[s.idol].name).join('・');
  ex.slots = [];
  ex.battle = null; ex.battleEv = null;
  endRun(ex);
  return [`${names}は${DUNGEONS[c.dungeon].name} ${floorName(c)}に取り残された……`, '拾った物はすべて失った', '寺院で死体を回収してもらうか、別のパーティでカードモードに入って探しに行こう'];
}

function drop(ex, lost) {
  ex.gold -= lost.gold;
  const gone = new Set(lost.scores);
  for (const [id, uid] of Object.entries(ex.equip)) if (gone.has(uid)) delete ex.equip[id];
  ex.scores = ex.scores.filter((sc) => !gone.has(sc.uid));
  for (const it of lost.items) { const i = ex.items.lastIndexOf(it); if (i >= 0) ex.items.splice(i, 1); }
  removeGear(ex, lost.gear || []);
}

function endRun(ex) {
  ex.card = null;
  toTown(ex);
}
