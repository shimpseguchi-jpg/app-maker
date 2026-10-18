// 自動プレイ：Lv1 から最後のボスまで、ゲームのルールどおりに遊び続けてバランスを測る
// node idoldungeon/tools/sim_play.mjs [回数=5] [種=1]
//   街：寺院で治療・回収 → 宿屋 → 昇格できる人は昇格
//   迷宮：レベルに見合う階まで潜って戦い、HP が減ったり倒れた人が出たら引き返す
//   鍵・スイッチは道すがら取り、ボスを倒したら次の迷宮へ
import { DUNGEONS } from '../js/data/floors.js';
import { newExpedition, move, battleTurn, finishBattle, wipeOut, climb, enterDungeon, partyView, unitOf } from '../js/engine/expedition.js';
import { act, useStairs, getFloor, isSolid } from '../js/engine/dungeon.js';
import { autoCommands } from '../js/engine/battle.js';
import { stay, treat, retrieve, trainingInfo, doPromote, ROOMS, roomFee } from '../js/engine/town.js';
import { DOWN } from '../js/engine/revive.js';
import { seeded } from '../js/engine/rng.js';

const RUNS = Number(process.argv[2] || 5), SEED = Number(process.argv[3] || 1);
const PARTY = [{ idol: 'makoto' }, { idol: 'hibiki' }, { idol: 'haruka' }, { idol: 'ritsuko' }, { idol: 'ami' }, { idol: 'yukiho' }];
// 階ごとの目安のレベル（この平均レベルに届いたらその階まで潜る）。最後の要素はボス
export const REC = { d1: [1, 4, 7, 8], d2: [10, 12, 13, 15, 17, 21] };
const BOSS = { d1: 'b1', d2: 'b2' };
const MAX_TRIPS = 600;

// ── 道順（遭遇なしで探索ルールを試し、幅優先で探す） ──
const lite = (st) => ({ dungeon: st.dungeon, floor: st.floor, x: st.x, y: st.y, dir: st.dir, prev: null, steps: 0,
  keys: [...st.keys], flags: { ...st.flags }, found: { ...st.found }, seen: {}, done: { ...st.done }, trip: { ...st.trip }, bossClears: st.bossClears });
function route(st0, goal, limit = 40000) {
  const k = (s) => `${s.floor}:${s.x},${s.y},${s.dir}:${Object.keys(s.found).length}:${s.keys.length}:${Object.keys(s.flags).length}`;
  const start = lite(st0);
  const seen = new Set([k(start)]);
  const q = [[start, []]];
  let n = 0;
  while (q.length && n++ < limit) {
    const [s, path] = q.shift();
    if (s.floor === goal.floor && s.x === goal.x && s.y === goal.y) return path;
    for (const a of ['forward', 'turnL', 'turnR', 'search', 'stairs']) {
      const t = { ...s, keys: [...s.keys], flags: { ...s.flags }, found: { ...s.found }, done: { ...s.done }, seen: {} };
      if (a === 'stairs') { if (useStairs(t) !== 'moved') continue; }
      else act(t, a, { rng: () => 0.999, searcher: true });
      const kk = k(t);
      if (seen.has(kk)) continue;
      seen.add(kk); q.push([t, [...path, a]]);
    }
  }
  return null;
}

function runOnce(seed) {
  const rng = seeded(seed);
  const ex = newExpedition(PARTY);
  const log = { wipes: 0, deaths: 0, trips: 0, battles: 0, promotions: 0, rescues: 0, cleared: {}, per: {} };
  const per = (d) => (log.per[d] ||= { battles: 0, wipes: 0, bossTries: 0, bossWins: 0, firstTryLv: null });
  const avgLevel = () => { const p = ex.slots.map((s) => unitOf(ex, s.idol)); return p.length ? p.reduce((a, u) => a + u.level + Math.min(u.carry || 0, 20), 0) / p.length : 0; };

  const fight = () => {
    log.battles++;
    const pd = per(ex.ex.dungeon);
    pd.battles++;
    const isBoss = ex.battleEv?.kind === 'boss';
    if (isBoss) { pd.bossTries++; pd.firstTryLv ??= Math.round(avgLevel() * 10) / 10; }
    let t = 0;
    while (!ex.battle.result && t++ < 60) {
      // 分が悪ければ全員で逃げる（ボス戦以外）
      const b = ex.battle;
      const hp = b.party.reduce((a, m) => a + m.hp, 0) / b.party.reduce((a, m) => a + m.maxHp, 0);
      const down = b.party.filter((m) => m.hp <= 0).length;
      const flee = b.canFlee && (hp < 0.35 || down >= 2);
      battleTurn(ex, flee ? b.party.map(() => ({ type: 'flee' })) : autoCommands(b), rng);
    }
    if (!ex.battle.result) ex.battle.result = 'flee';
    if (isBoss && ex.battle.result === 'win') pd.bossWins++;
    const r = finishBattle(ex, rng);
    if (r.wiped) { wipeOut(ex); log.wipes++; pd.wipes++; return 'wiped'; }
    return 'ok';
  };
  const needRest = () => {
    const p = partyView(ex);
    const hp = p.reduce((a, m) => a + m.hp, 0) / p.reduce((a, m) => a + m.maxHp, 0);
    const heal = p.some((m) => !DOWN.has(m.cond) && (ex.mp[m.id]?.heal || 0) > 0);
    return p.some((m) => DOWN.has(m.cond)) || hp < (heal ? 0.5 : 0.65);
  };
  // 1歩ずつ進む。戦闘があれば戦い、引き返す必要が出たら 'rest'
  const walk = (path, stopOnRest = true) => {
    for (const a of path) {
      if (a === 'stairs') { const r = climb(ex); if (ex.mode === 'town') return 'town'; continue; }
      const before = `${ex.ex.floor}:${ex.ex.x},${ex.ex.y},${ex.ex.dir}`;
      const r = move(ex, a, rng);
      if (r.pending?.type === 'battle') { if (fight() === 'wiped') return 'wiped'; }
      if (r.pending?.type === 'wiped') { wipeOut(ex); log.wipes++; return 'wiped'; }
      if (stopOnRest && needRest()) return 'rest';
      // 回転床・ワープ・逃走で予定とずれたら、道順を引き直す
      if (a === 'forward' && `${ex.ex.floor}:${ex.ex.x},${ex.ex.y},${ex.ex.dir}` === before) return 'blocked';
    }
    return 'arrived';
  };
  const goTo = (goal, stopOnRest = true) => {
    for (let tries = 0; tries < 30; tries++) {
      if (ex.ex.floor === goal.floor && ex.ex.x === goal.x && ex.ex.y === goal.y) return 'arrived';
      const p = route(ex.ex, goal);
      if (!p) return 'noroute';
      const r = walk(p, stopOnRest);
      if (r !== 'blocked') return r;
    }
    return 'noroute';
  };
  const goHome = () => {
    const s = DUNGEONS[ex.ex.dungeon].start;
    const r = goTo({ floor: 0, x: s.x, y: s.y }, false);
    if (r === 'arrived') climb(ex);
    return ex.mode === 'town';
  };

  const MAIN = PARTY.map((p) => p.idol);
  const RESERVE = ['chihaya', 'yayoi', 'azusa', 'iori', 'mami', 'miki', 'takane'];
  // 取り残された仲間：お金があれば寺院で、なければ待機中のアイドルで救助隊を組んで拾いに行く（エルミナージュ準拠）
  const rescue = () => {
    for (const id of Object.keys(ex.lost)) retrieve(ex, id);
    let guard = 0;
    while (Object.keys(ex.lost).length && guard++ < 20) {
      const [id, at] = Object.entries(ex.lost)[0];
      const bodies = Object.values(ex.lost).filter((b) => b.dungeon === at.dungeon && b.floor === at.floor && b.x === at.x && b.y === at.y).length;
      const crew = [...MAIN, ...RESERVE].filter((x) => !ex.lost[x] && !DOWN.has(ex.cond[x])).slice(0, Math.max(1, 6 - bodies));
      if (crew.length < Math.min(4, 6 - bodies)) { retrieve(ex, id); if (ex.lost[id]) break; continue; } // 救助隊が組めなければ寺院（慈悲）頼み
      ex.slots = crew.map((idol) => ({ idol }));
      rest();
      enterDungeon(ex, at.dungeon || 'd1');
      log.rescues++;
      const r = goTo({ floor: at.floor, x: at.x, y: at.y });
      if (ex.mode === 'dungeon') goHome();
      if (ex.mode === 'dungeon') { wipeOut(ex); log.wipes++; }
      for (const c of ex.slots) if (DOWN.has(ex.cond[c.idol])) treat(ex, c.idol, rng);
    }
    ex.slots = MAIN.filter((id) => !ex.lost[id]).map((idol) => ({ idol }));
  };

  // ふだんはエコノミー（HP が戻りきるまで泊まる）、お金に余裕があればスイート、なければ馬小屋
  const rest = () => {
    for (let n = 0; n < 12; n++) {
      const p = partyView(ex);
      if (n && p.every((m) => DOWN.has(m.cond) || m.hp >= m.maxHp)) break;
      const room = roomFee(ex, ROOMS[2]) * 20 <= ex.gold ? ROOMS[2] : roomFee(ex, ROOMS[1]) <= ex.gold ? ROOMS[1] : ROOMS[0];
      stay(ex, room.id, rng);
    }
  };

  const town = () => {
    ex.gold = Math.max(ex.gold, 0);
    if (Object.keys(ex.lost).length) rescue();
    ex.slots = MAIN.filter((id) => !ex.lost[id]).map((idol) => ({ idol }));
    for (const s of ex.slots) for (let i = 0; i < 3 && DOWN.has(ex.cond[s.idol]); i++) { if (treat(ex, s.idol, rng)[0].includes('足りない')) break; }
    // 治せなかった仲間は外し、待機中の元気なアイドルで埋めて稼ぎに行く
    ex.slots = ex.slots.filter((s) => !DOWN.has(ex.cond[s.idol]));
    for (const id of RESERVE) if (ex.slots.length < 6 && !ex.lost[id] && !DOWN.has(ex.cond[id]) && !ex.slots.some((s) => s.idol === id)) ex.slots.push({ idol: id });
    if (ex.cond && Object.values(ex.cond).some((c) => c === 'dead' || c === 'ash')) log.deaths++;
    rest();
    for (const s of ex.slots) {
      const info = trainingInfo(ex, s.idol);
      const p = info.promotions.find((x) => x.ok);
      if (p) { doPromote(ex, s.idol, p.cls.id, p.items[0]); log.promotions++; stay(ex, 'stable', rng); }
    }
  };

  for (const d of ['d1', 'd2']) {
    const boss = BOSS[d];
    const bossSp = DUNGEONS[d].floors.flatMap((f, i) => f.specials.filter((x) => x.type === 'boss').map((x) => ({ floor: i, x: x.x, y: x.y })))[0];
    while (!(ex.ex.bossClears[boss] > 0) && log.trips < MAX_TRIPS) {
      log.trips++;
      town();
      if (!ex.slots.some((s) => !DOWN.has(ex.cond[s.idol]))) continue;
      // 動ける人が4人に満たなければ、最初の迷宮でお金を稼いで立て直す
      const able = ex.slots.filter((s) => !DOWN.has(ex.cond[s.idol])).length;
      const dd = able < 4 ? 'd1' : d;
      enterDungeon(ex, dd);
      const lv = avgLevel();
      const rec = REC[dd];
      const deepest = Math.min(rec.filter((r) => lv >= r).length - 1, able < 4 ? 1 : 99);
      if (dd === d && deepest >= rec.length - 1) {
        // ボスに挑む：鍵・スイッチは道順の中で拾う（取れていなければ先に取りに行く）
        for (const f of DUNGEONS[d].floors.map((fl, i) => [fl, i])) {
          for (const sp of f[0].specials) {
            if ((sp.give?.key && !ex.ex.keys.includes(sp.give.key)) || (sp.type === 'switch' && !ex.ex.flags[sp.flag])) {
              if (goTo({ floor: f[1], x: sp.x, y: sp.y }) !== 'arrived') break;
            }
          }
        }
        if (ex.mode === 'dungeon' && !needRest()) {
          const r = goTo(bossSp);
          if (r === 'arrived' && ex.battle) fight();
        }
      } else {
        // その階をうろうろして稼ぐ
        const floor = Math.max(0, deepest);
        const fl = getFloor(dd, floor);
        for (let n = 0; n < 6 && ex.mode === 'dungeon' && !needRest(); n++) {
          let gx, gy;
          do { gx = Math.floor(rng() * fl.w); gy = Math.floor(rng() * fl.h); } while (isSolid(fl.cellAt(gx, gy)));
          const r = goTo({ floor, x: gx, y: gy });
          if (r === 'wiped' || r === 'town') break;
        }
      }
      if (ex.mode === 'dungeon') goHome();
      if (ex.mode === 'dungeon') { wipeOut(ex); log.wipes++; } // 帰れなかった（道がない）ときは全滅扱いで街へ
      if (ex.ex.bossClears[boss] > 0 || ex.ex.trip[boss]) log.cleared[boss] = { trips: log.trips, days: ex.days, lv: Math.round(avgLevel() * 10) / 10 };
    }
  }
  return log;
}

const results = [];
for (let i = 0; i < RUNS; i++) {
  const t0 = Date.now();
  const r = runOnce(SEED + i);
  results.push(r);
  const c = (b, d) => {
    const p = r.per[d] || {};
    return r.cleared[b] ? `${r.cleared[b].trips}回目の探索で撃破（戦闘${p.battles}・全滅${p.wipes}・ボス${p.bossWins}/${p.bossTries}勝・初挑戦Lv${p.firstTryLv}・撃破時Lv${r.cleared[b].lv}）` : '未';
  };
  console.log(`#${i + 1} 劇場地下迷宮：${c('b1', 'd1')}\n   奈落の大劇場：${c('b2', 'd2')}\n   救助 ${r.rescues} 回・昇格 ${r.promotions} 人（${((Date.now() - t0) / 1000).toFixed(1)}秒）`);
}
const ok = results.filter((r) => r.cleared.b2).length;
console.log(`奈落の怪人まで倒せたのは ${ok}/${RUNS} 回`);
