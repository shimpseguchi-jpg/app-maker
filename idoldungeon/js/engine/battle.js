// 戦闘（エルミナージュ準拠。docs/DESIGN.md「11. 戦闘」）
//   6人パーティ（前列3・後列3） vs 敵グループ（最大4）。全員のコマンドを決めてからターンを解決する
//   行動順は素早さ＋運（毎ターン決め直す）。射程 S/M/L で届く敵の列が決まる。逃げるは選んだ人だけが逃げる
// 画面から独立。rng を渡せば結果は決まる
// 1ターンの解決後、b.order（行動順）と b.steps（1人ずつの行動：ログの範囲・当たった数字・その時点の HP）を残す。
//   画面はこれを使って、エルミナージュのように1人ずつ順に見せる
import { ENEMIES } from '../data/enemies.js';
import { SPELLS_BY_ID, SPELL_LIST, KIND_TARGET } from '../data/spells.js';

const REACH = { S: 1, M: 2, L: 99 };
const DISABLED = new Set(['dead', 'ash', 'stone', 'paralyze']);
const rint = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const has = (m, id) => m.abilities?.some((a) => a.id === id);
const avg = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
// 行動順の乱数の幅。素早さがこれ以上違えば、速いほうが必ず先に動く
export const INIT_SPREAD = 10;
export const initiative = (spd, rng) => spd + rng() * INIT_SPREAD;

// ── 戦闘の準備 ──
// party: expedition.js の battleParty() の結果
// groups: [{ enemy: id | 敵データ, count }]
// opts: { kind, zone: { dark, anti }, canFlee, rng }
export function createBattle(party, groups, opts = {}) {
  const rng = opts.rng || Math.random;
  const b = {
    turn: 0, kind: opts.kind || 'wander', canFlee: opts.canFlee !== false, zone: opts.zone || {},
    party: party.map((m) => ({ ...m, poison: m.cond === 'poison', cond: m.cond === 'poison' ? 'ok' : m.cond,
      sleep: 0, silence: 0, charm: 0, buff: 0, shield: false, fled: false, defending: false })),
    groups: groups.slice(0, 4).map((g, gi) => {
      const d = typeof g.enemy === 'string' ? ENEMIES[g.enemy] : g.enemy;
      return { gi, def: d, identified: false,
        members: Array.from({ length: g.count }, () => ({ hp: d.hp, maxHp: d.hp, dead: false, sleep: 0, silence: 0, confuse: 0, poison: false })) };
    }),
    log: [], result: null, unitLiveUsed: false, exp: 0, gold: 0,
  };
  identify(b, rng);
  for (const g of b.groups) b.log.push(`${groupName(g)}が${g.members.length}体現れた！`);
  if (b.zone.anti) b.log.push('ここは呪文禁止エリアだ');
  // 先制・不意打ち：パーティと敵の素早さの差で起こりやすさが変わる（ボスは不意打ちしない）
  const p = rng() * 100;
  const gap = avg(b.party.map((m) => m.stats.spd)) - avg(b.groups.flatMap((g) => g.members.map(() => g.def.spd)));
  const partyFirst = clamp(12 + gap / 2, 4, 30) + (b.party.some((m) => has(m, 'thunderStep')) ? 10 : 0);
  const enemyFirst = b.kind === 'boss' || b.party.some((m) => has(m, 'ambush')) || (b.zone.dark && b.party.some((m) => has(m, 'stealth'))) ? 0 : clamp(10 - gap / 2, 3, 25);
  b.surprise = p < partyFirst ? 'party' : p < partyFirst + enemyFirst ? 'enemy' : null;
  if (b.surprise === 'party') b.log.push('敵はまだこちらに気づいていない！');
  if (b.surprise === 'enemy') b.log.push('不意を突かれた！');
  // 不思議空間：敵1グループを1ターン封じる
  if (b.party.some((m) => has(m, 'seal')) && rng() < 0.3) {
    const g = b.groups[0];
    g.members.forEach((e) => { if (!g.def.resist.includes('sleep')) e.sleep = Math.max(e.sleep, 1); });
    b.log.push(`不思議空間！ ${groupName(g)}は動けない`);
  }
  return b;
}

// 不確定名：知恵（ボーカル）が高いほど、ビショップ（鑑定）がいるほど正体が分かる。ダークゾーンでは分からない
function identify(b, rng) {
  const vo = Math.max(...b.party.map((m) => m.base?.vo || 0));
  const bonus = b.party.some((m) => has(m, 'identify')) ? 30 : 0;
  for (const g of b.groups) g.identified = !b.zone.dark && rng() * 100 < clamp(40 + vo * 2 + bonus, 0, 95);
}
export const groupName = (g) => (g.identified ? g.def.name : g.def.uname);
export const aliveGroups = (b) => b.groups.filter((g) => g.members.some((e) => !e.dead));
const ableParty = (m) => !m.fled && !DISABLED.has(m.cond) && m.hp > 0;
export const canAct = (m) => ableParty(m) && !m.sleep && !m.charm;

// 届く敵グループ（生き残っているグループの並びで数える。前のグループが全滅すると繰り上がる）
export function reachableGroups(b, m) {
  const reach = REACH[m.range || 'S'] - (m.row === 'back' ? 1 : 0);
  return aliveGroups(b).slice(0, Math.max(0, reach));
}

// その人が今使える呪文
export function castable(b, m) {
  return SPELL_LIST.filter((s) => m.families?.includes(s.family) && s.lv <= m.level && (m.mp?.[s.family] || 0) > 0);
}
export function unitLiveReady(b) {
  const holders = b.party.filter((m) => has(m, 'unitLive'));
  return !b.unitLiveUsed && holders.length >= 3 && holders.every(canAct);
}

// ── ターン ──
// commands[i]: { type: 'attack', group } | { type: 'spell', spell, target } | { type: 'live', target }
//   | { type: 'defend' } | { type: 'guard', ally } | { type: 'flee' } | { type: 'dance', ally } | { type: 'unitLive' }
// target は敵ならグループの番号（aliveGroups の並び）、味方なら party の番号
export function runTurn(b, commands, rng = Math.random) {
  if (b.result) return b;
  b.turn++;
  const log = (s) => b.log.push(s);
  log(`── ターン ${b.turn} ──`);
  const guards = {};
  b.party.forEach((m) => { m.defending = false; });
  const actors = [];
  const partyMoves = !(b.turn === 1 && b.surprise === 'enemy');
  const enemyMoves = !(b.turn === 1 && b.surprise === 'party');
  if (partyMoves) {
    b.party.forEach((m, i) => {
      const c = commands[i];
      if (!c || !canAct(m)) return;
      if (c.type === 'defend') { m.defending = true; return; }
      if (c.type === 'guard') { guards[c.ally] = i; return; }
      let init = initiative(m.stats.spd, rng);
      if (b.turn === 1 && (has(m, 'ready') || has(m, 'quickStart'))) init += 1000;
      actors.push({ side: 'p', i, init, c });
    });
  }
  if (enemyMoves) {
    b.groups.forEach((g) => g.members.forEach((e, ei) => {
      if (e.dead) return;
      const n = g.def.traits?.some((t) => t.id === 'twoActions') ? 2 : 1;
      for (let k = 0; k < n; k++) actors.push({ side: 'e', g, ei, init: initiative(g.def.spd, rng) });
    }));
  }
  actors.sort((a, b2) => b2.init - a.init);
  b.order = actors.map((a) => (a.side === 'p' ? { side: 'p', i: a.i } : { side: 'e', gi: a.g.gi, ei: a.ei }));
  b.steps = [];
  b.hits = [];
  // 双子が同じグループを狙ったら連携攻撃
  const twinTargets = b.party.map((m, i) => (has(m, 'twinAttack') && commands[i]?.type === 'attack' ? commands[i].group : null)).filter((x) => x != null);
  const twinGroup = twinTargets.length >= 2 && twinTargets[0] === twinTargets[1] ? twinTargets[0] : null;

  for (let k = 0; k < actors.length; k++) {
    const a = actors[k], from = b.log.length;
    if (b.result) break;
    if (a.side === 'p') partyAct(b, a.i, a.c, rng, log, twinGroup);
    else enemyAct(b, a.g, a.ei, rng, log, guards);
    checkEnd(b, log);
    pushStep(b, k, from);
  }
  const from = b.log.length;
  if (!b.result) endOfTurn(b, rng, log);
  checkEnd(b, log);
  pushStep(b, -1, from);
  delete b.hits;
  return b;
}

// 1人ぶんの行動を記録する（画面で1人ずつ見せるため）。何も起きなかった行動（眠っていた等）は残さない
function pushStep(b, k, from) {
  if (b.log.length > from) {
    b.steps.push({ k, from, to: b.log.length, hits: b.hits,
      party: b.party.map((m) => ({ hp: m.hp, cond: m.cond, fled: m.fled, poison: m.poison, sleep: m.sleep, silence: m.silence })),
      foes: b.groups.map((g) => g.members.map((e) => (e.dead ? 0 : e.hp))) });
  }
  b.hits = [];
}

function partyAct(b, i, c, rng, log, twinGroup) {
  const m = b.party[i];
  if (!canAct(m)) return;
  const name = m.name;
  if (c.type === 'flee') {
    const es = b.groups.flatMap((g) => g.members.filter((e) => !e.dead).map(() => g.def.spd));
    const avg = es.length ? es.reduce((x, y) => x + y, 0) / es.length : 0;
    if (!b.canFlee) { log(`${name}は逃げようとしたが、逃げられない！`); return; }
    const p = clamp(50 + (m.stats.spd - avg) + (has(m, 'dash') ? 25 : 0), 10, 95);
    if (rng() * 100 < p) { m.fled = true; log(`${name}は逃げ出した`); } else log(`${name}は逃げられなかった`);
    return;
  }
  if (c.type === 'attack') { attack(b, m, c.group, rng, log, twinGroup === c.group ? 1.5 : 1); return; }
  if (c.type === 'dance') {
    const t = b.party[c.ally];
    if (!t || t === m || !canAct(t)) { log(`${name}は踊ったが、誰も応えなかった`); return; }
    log(`${name}の踊り！ ${t.name}がもう一度動く`);
    const g = reachableGroups(b, t)[0];
    if (g) attack(b, t, aliveGroups(b).indexOf(g), rng, log, 1);
    return;
  }
  if (c.type === 'unitLive') {
    if (!unitLiveReady(b)) { log(`${name}：ユニットライブの準備ができていない`); return; }
    if (b.zone.anti) { log('ユニットライブ！……しかし呪文禁止エリアでかき消された'); b.unitLiveUsed = true; return; }
    b.unitLiveUsed = true;
    const holders = b.party.filter((x) => has(x, 'unitLive'));
    const power = holders.reduce((s, x) => s + x.stats.mat, 0) * 0.6;
    log(`竜宮小町のユニットライブ！`);
    for (const g of aliveGroups(b)) for (const e of g.members) if (!e.dead) hurtEnemy(b, g, e, Math.max(1, Math.round(power * (0.85 + rng() * 0.3)) - g.def.res), log);
    return;
  }
  // 呪文・ライブスキル
  let eff, label;
  if (c.type === 'spell') {
    eff = SPELLS_BY_ID[c.spell];
    if (!eff || (m.mp?.[eff.family] || 0) <= 0) { log(`${name}は呪文を唱えられない`); return; }
    m.mp[eff.family]--;
    label = `${name}は「${eff.name}」を唱えた`;
  } else if (c.type === 'live') {
    if (!m.live || m.live.left <= 0) { log(`${name}はもう歌えない`); return; }
    m.live.left--;
    eff = m.live;
    label = `${name}のライブスキル「${eff.name}」！`;
  } else return;
  if (m.silence) { log(`${label}……しかし声が出ない！`); return; }
  if (b.zone.anti) { log(`${label}……しかし呪文禁止エリアでかき消された`); return; }
  log(label);
  applyEffect(b, m, eff, c.target, rng, log);
}

function attack(b, m, gIndex, rng, log, mult) {
  const reach = reachableGroups(b, m);
  let g = aliveGroups(b)[gIndex];
  if (!g || !reach.includes(g)) g = reach[0];
  if (!g) { log(`${m.name}の攻撃は届かない`); return; }
  const casterOnly = (m.families?.length || 0) > 0 && m.range === 'S' && !has(m, 'bow');
  // 攻撃回数：戦士系はレベルとともに増える。8レベルごとに1回、そのあいだは確率でなめらかに（急に強くならないように）
  const extra = casterOnly ? 0 : ((m.power || m.level) - 1) / 8;
  const hits = 1 + Math.floor(extra) + (rng() < extra % 1 ? 1 : 0) + (has(m, 'doubleHit') && rng() < 0.25 ? 1 : 0);
  let landed = 0, total = 0, kills = 0;
  for (let h = 0; h < hits; h++) {
    const alive = g.members.filter((e) => !e.dead);
    if (!alive.length) break;
    const e = alive[rint(rng, 0, alive.length - 1)];
    const p = clamp(m.stats.hit - g.def.eva + (e.sleep ? 20 : 0), 20, 95);
    if (rng() * 100 >= p) continue;
    landed++;
    if (has(m, 'silencer') && !g.def.resist.includes('death') && rng() < 0.05) {
      log(`${m.name}の首切り！ ${groupName(g)}を一撃で倒した`);
      hurtEnemy(b, g, e, e.hp, log, true);
      landed--;
      continue;
    }
    const atk = m.stats.atk * (m.buff ? 1.3 : 1) * mult;
    const def = has(m, 'pierce') && rng() < 0.15 ? 0 : g.def.def;
    let dmg = Math.max(1, Math.round(atk * (0.8 + rng() * 0.4)) - def);
    if (rng() * 100 < m.stats.crit) { dmg = Math.round(dmg * 1.5); log('会心の一撃！'); }
    total += dmg;
    e.sleep = 0;
    if ((has(m, 'charm') || has(m, 'eyeContact')) && rng() < 0.1 && !e.dead) { e.confuse = 1; log(`${groupName(g)}はうっとりしている`); }
    if (hurtEnemy(b, g, e, dmg, log, true)) kills++;
  }
  if (landed > 0) log(`${m.name}の攻撃！ ${groupName(g)}に${landed}回命中、${total}のダメージ`);
  else if (landed === 0) { log(`${m.name}の攻撃！ ${groupName(g)}にかわされた`); b.hits?.push({ side: 'e', gi: g.gi, miss: true }); }
  // 倒したことは、攻撃の結果のあとに出す
  if (kills) log(`${groupName(g)}を${kills > 1 ? `${kills}体` : ''}倒した`);
}

// quiet：ダメージと「倒した」を出さない（呼んだ側でまとめて出す）。倒したら true
function hurtEnemy(b, g, e, dmg, log, quiet = false) {
  if (e.dead) return false;
  e.hp = Math.max(0, e.hp - dmg);
  if (!quiet) log(`${groupName(g)}に${dmg}のダメージ`);
  b.hits?.push({ side: 'e', gi: g.gi, dmg, kill: e.hp === 0 });
  if (e.hp > 0) return false;
  e.dead = true;
  b.exp += g.def.exp; b.gold += g.def.gold;
  if (!quiet) log(`${groupName(g)}を倒した`);
  return true;
}

function applyEffect(b, m, eff, target, rng, log) {
  const kind = eff.kind;
  const groups = aliveGroups(b);
  const magic = (g, e, power) => {
    const dmg = Math.max(1, Math.round(m.stats.mat * (m.buff ? 1.3 : 1) * power * (0.85 + rng() * 0.3)) - g.def.res);
    hurtEnemy(b, g, e, dmg, log);
    if (eff.poison && !e.dead) e.poison = true;
  };
  const resistRoll = (g, st, base) => !g.def.resist.includes(st) && rng() * 100 < clamp(base - g.def.level * 3, 10, 90);
  switch (kind) {
    case 'dmgOne': { const g = groups[target] || groups[0]; const e = g?.members.find((x) => !x.dead); if (e) magic(g, e, eff.power); break; }
    case 'dmgGroup': { const g = groups[target] || groups[0]; if (g) g.members.forEach((e) => !e.dead && magic(g, e, eff.power)); break; }
    case 'dmgAll': groups.forEach((g) => g.members.forEach((e) => !e.dead && magic(g, e, eff.power))); break;
    case 'sleepGroup': case 'silenceGroup': case 'confuseGroup': {
      const g = groups[target] || groups[0];
      if (!g) break;
      const st = kind === 'sleepGroup' ? 'sleep' : kind === 'silenceGroup' ? 'silence' : 'confuse';
      let n = 0;
      g.members.forEach((e) => { if (!e.dead && resistRoll(g, st, 75)) { e[st] = rint(rng, 2, 3); n++; } });
      log(n ? `${groupName(g)}の${n}体が${{ sleep: '眠った', silence: '黙り込んだ', confuse: '混乱した' }[st]}` : `${groupName(g)}には効かなかった`);
      break;
    }
    case 'healOne': { const t = b.party[target] ?? m; if (ableParty(t)) heal(b, t, Math.round(m.stats.res * 2 * (eff.power || 1) + m.base.men * (1 + rng())), log); break; }
    case 'healAll': b.party.forEach((t) => ableParty(t) && heal(b, t, Math.round(m.base.men * 2 * (eff.power || 1) * (0.8 + rng() * 0.4)), log)); break;
    case 'fullHealAll': b.party.forEach((t) => { if (ableParty(t)) { t.hp = t.maxHp; t.poison = false; t.sleep = 0; t.silence = 0; t.charm = 0; } }); log('全員の HP と状態が回復した'); break;
    case 'cure': { const t = b.party[target] ?? m; if (t.cond === 'paralyze') t.cond = 'ok'; t.poison = false; t.sleep = 0; t.silence = 0; t.charm = 0; log(`${t.name}の状態が回復した`); break; }
    case 'revive': {
      const t = b.party[target];
      if (!t || t.cond !== 'dead') { log('何も起こらなかった'); break; }
      if (rng() * 100 < clamp(50 + t.base.sta * 2, 0, 95)) { t.cond = 'ok'; t.hp = 1; log(`${t.name}は生き返った！`); } else { t.cond = 'ash'; log(`${t.name}は灰になってしまった……`); }
      break;
    }
    case 'buffAlly': { const t = b.party[target] ?? m; if (ableParty(t)) { t.buff = 3; log(`${t.name}の力がみなぎる！`); } break; }
    case 'shieldSelf': m.shield = true; log(`${m.name}は軽やかに身構えた`); break;
    case 'escape':
      if (!b.canFlee) { log('……しかし逃げられない！'); break; }
      b.party.forEach((t) => { if (ableParty(t)) t.fled = true; });
      log('煙にまぎれて、全員逃げ出した');
      break;
    default: log('何も起こらなかった');
  }
}

function heal(b, t, amount, log) {
  const before = t.hp;
  t.hp = Math.min(t.maxHp, t.hp + Math.max(1, amount));
  log(`${t.name}の HP が ${t.hp - before} 回復した`);
  b.hits?.push({ side: 'p', i: b.party.indexOf(t), heal: t.hp - before });
}

function enemyAct(b, g, ei, rng, log, guards) {
  const e = g.members[ei];
  if (e.dead) return;
  const nm = groupName(g);
  if (e.sleep) { return; }
  if (e.confuse) {
    // 混乱：仲間を攻撃する
    const others = aliveGroups(b).flatMap((x) => x.members.filter((y) => !y.dead && y !== e).map((y) => [x, y]));
    if (others.length) {
      const [og, oe] = others[rint(rng, 0, others.length - 1)];
      log(`${nm}は混乱して仲間を攻撃した`);
      hurtEnemy(b, og, oe, Math.max(1, Math.round(g.def.atk * (0.8 + rng() * 0.4)) - og.def.def), log);
    }
    return;
  }
  // 行動を選ぶ（沈黙・呪文禁止エリアでは特技を使わない）
  let acts = g.def.acts;
  if (e.silence || b.zone.anti) acts = acts.filter((a) => a.kind === 'attack');
  if (!acts.length) acts = [{ kind: 'attack', w: 1 }];
  const total = acts.reduce((s, a) => s + a.w, 0);
  let r = rng() * total, act = acts[0];
  for (const a of acts) { r -= a.w; if (r < 0) { act = a; break; } }

  const targets = b.party.filter(ableParty);
  if (!targets.length) return;
  if (act.kind === 'attack') {
    const front = targets.filter((m) => m.row === 'front');
    let t = (front.length ? front : targets)[rint(rng, 0, (front.length ? front : targets).length - 1)];
    t = redirect(b, t, guards, rng, log);
    const p = clamp(g.def.hit - t.stats.eva, 15, 95);
    if (rng() * 100 >= p) { log(`${nm}の攻撃！ ${t.name}はかわした`); b.hits?.push({ side: 'p', i: b.party.indexOf(t), miss: true }); return; }
    let dmg = Math.max(1, Math.round(g.def.atk * (0.8 + rng() * 0.4)) - t.stats.def);
    if (t.defending) dmg = Math.ceil(dmg / 2);
    log(`${nm}の攻撃！`);
    hurtParty(b, t, dmg, log);
    if (g.def.poison && !DISABLED.has(t.cond) && rng() * 100 < g.def.poison) { t.poison = true; log(`${t.name}は毒におかされた`); }
    return;
  }
  log(`${nm}の${act.name || '特技'}！`);
  const row = rng() < 0.5 ? 'front' : 'back';
  const rowTargets = targets.filter((m) => m.row === row).length ? targets.filter((m) => m.row === row) : targets;
  const mag = (t, power) => {
    let dmg = Math.max(1, Math.round(g.def.mat * power * (0.85 + rng() * 0.3)) - t.stats.res);
    if (t.defending) dmg = Math.ceil(dmg / 2);
    hurtParty(b, t, dmg, log);
  };
  if (act.kind === 'dmgOne') mag(targets[rint(rng, 0, targets.length - 1)], act.power);
  else if (act.kind === 'dmgGroup') rowTargets.forEach((t) => mag(t, act.power));
  else if (act.kind === 'dmgAll') targets.forEach((t) => mag(t, act.power));
  else if (act.kind === 'sleepGroup' || act.kind === 'silenceGroup') {
    const st = act.kind === 'sleepGroup' ? 'sleep' : 'silence';
    for (const t of rowTargets) {
      if (st === 'sleep' && has(t, 'noFear')) { log(`${t.name}は平気だ`); continue; }
      if (rng() * 100 < clamp(60 - t.base.men * 2, 10, 80)) { t[st] = rint(rng, 1, 3); log(`${t.name}は${st === 'sleep' ? '眠ってしまった' : '声が出なくなった'}`); }
      else log(`${t.name}は耐えた`);
    }
  }
}

// かばう：守る（ガード）コマンド、王子様とお姫様、隣に…
function redirect(b, t, guards, rng, log) {
  const ti = b.party.indexOf(t);
  const gi = guards[ti];
  if (gi != null && ableParty(b.party[gi])) { log(`${b.party[gi].name}が${t.name}をかばった`); return b.party[gi]; }
  if (t.tags?.includes('ojou')) {
    const k = b.party.find((m) => m !== t && has(m, 'cover') && m.tags?.includes('boyish') && canAct(m));
    if (k && rng() < 0.5) { log(`${k.name}が${t.name}をかばった`); return k; }
  }
  const n = b.party.find((m, i) => m !== t && Math.abs(i - ti) === 1 && m.row === t.row && has(m, 'coverNext') && canAct(m));
  if (n && rng() < 0.3) { log(`${n.name}が${t.name}をかばった`); return n; }
  return t;
}

function hurtParty(b, t, dmg, log) {
  if (t.shield) { t.shield = false; log(`${t.name}はひらりとかわした`); b.hits?.push({ side: 'p', i: b.party.indexOf(t), miss: true }); return; }
  t.hp = Math.max(0, t.hp - dmg);
  t.sleep = 0;
  log(`${t.name}に${dmg}のダメージ`);
  b.hits?.push({ side: 'p', i: b.party.indexOf(t), dmg });
  if (t.hp === 0) {
    if (t.reviveLeft) { t.reviveLeft = false; t.hp = 1; t.usedRevive = true; log(`${t.name}は倒れかけたが、立ち上がった！（リスタート）`); return; }
    t.cond = 'dead'; t.poison = false;
    log(`${t.name}は倒れた……`);
  }
}

function endOfTurn(b, rng, log) {
  for (const m of b.party) {
    if (!ableParty(m)) continue;
    if (m.poison) { const d = rint(rng, 1, 3); m.hp = Math.max(1, m.hp - d); }
    if (has(m, 'regen')) m.hp = Math.min(m.maxHp, m.hp + Math.max(1, Math.round(m.maxHp * 0.05)));
    if (m.sleep) m.sleep = rng() < 0.3 ? 0 : m.sleep - 1;
    if (m.silence) m.silence--;
    if (m.charm) m.charm--;
    if (m.buff) m.buff--;
  }
  for (const g of b.groups) for (const e of g.members) {
    if (e.dead) continue;
    if (e.poison && hurtEnemy(b, g, e, rint(rng, 1, 4), log, true)) log(`${groupName(g)}は毒で倒れた`);
    if (e.sleep) e.sleep--;
    if (e.silence) e.silence--;
    if (e.confuse) e.confuse--;
  }
}

function checkEnd(b, log) {
  if (b.result) return;
  if (!aliveGroups(b).length) { b.result = 'win'; log('敵をすべて倒した！'); return; }
  const standing = b.party.filter(ableParty);
  if (standing.length) return;
  if (b.party.some((m) => m.fled)) { b.result = 'flee'; log('戦闘から逃げ出した'); }
  else { b.result = 'lose'; log('パーティは全滅した……'); }
}

// おまかせ作戦：弱った仲間がいれば回復、敵が多ければグループ魔法、届けば戦う、届かなければ魔法か防御
// 画面の「おまかせ」と自動対戦（tools/sim_battle.mjs）で使う。呪文禁止エリアでは魔法を使わない
export function autoCommands(b) {
  const groups = aliveGroups(b);
  return b.party.map((m) => {
    if (!canAct(m)) return null;
    const spells = b.zone.anti || m.silence ? [] : castable(b, m);
    const pick = (kind) => spells.filter((s) => s.kind === kind).sort((x, y) => y.lv - x.lv)[0];
    const hurt = b.party.map((t, i) => [t, i]).filter(([t]) => ableParty(t) && t.hp < t.maxHp * 0.4).sort((x, y) => x[0].hp - y[0].hp)[0];
    const healAll = pick('healAll'), heal = pick('healOne');
    if (b.party.filter((t) => ableParty(t) && t.hp < t.maxHp * 0.5).length >= 3 && healAll) return { type: 'spell', spell: healAll.id };
    if (hurt && heal) return { type: 'spell', spell: heal.id, target: hurt[1] };
    const big = groups.findIndex((g) => g.members.filter((e) => !e.dead).length >= 3);
    const all = pick('dmgAll'), grp = pick('dmgGroup'), one = pick('dmgOne');
    if (all && groups.length >= 2) return { type: 'spell', spell: all.id };
    if (grp && big >= 0) return { type: 'spell', spell: grp.id, target: big };
    const g = reachableGroups(b, m)[0];
    if (g) return { type: 'attack', group: groups.indexOf(g) };
    if (one) return { type: 'spell', spell: one.id, target: 0 };
    if (grp) return { type: 'spell', spell: grp.id, target: 0 };
    return { type: 'defend' };
  });
}

export { KIND_TARGET };
