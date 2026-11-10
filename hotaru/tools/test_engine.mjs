// ルールの テスト：ちずが つながっているか・ひらめき こうげき・たからばこ・ほたる・まなびの きろく
// つかいかた：node hotaru/tools/test_engine.mjs
import assert from 'node:assert/strict';
import { makeRng } from '../../js/util.js';
import * as g from '../js/engine/game.js';
import { newProfile, heroStats, gainExp, expNeed } from '../js/engine/hero.js';
import { buyItem, buyEquip } from '../js/engine/camp.js';
import { newLearn, nextQuestion, recordAnswer, subjectLevel, UNIT_NAMES } from '../js/engine/learn.js';
import { FIREFLY_LIST, FIREFLY_HP } from '../js/data/fireflies.js';
import { SPAWN, MOBS, LAST_FLOOR, isBossFloor } from '../js/data/enemies.js';

let n = 0; const test = (name, f) => { f(); n++; console.log('ok  ' + name); };
const { W, H, idx } = g;

test('ちず：どの かいも ぜんぶの ゆかが つながり、かいだんが あり、ボスの かいには ボスが いる', () => {
  for (let floor = 1; floor <= LAST_FLOOR; floor++) for (let seed = 1; seed <= 150; seed++) {
    const P = newProfile(), G = g.enterFloor(P, floor, seed * 31 + floor);
    const seen = new Set([idx(G.hero.x, G.hero.y)]), q = [[G.hero.x, G.hero.y]];
    for (let i = 0; i < q.length; i++) for (const [dx, dy] of g.DIRS) { const x = q[i][0] + dx, y = q[i][1] + dy; if (g.walkable(G, x, y) && !seen.has(idx(x, y))) { seen.add(idx(x, y)); q.push([x, y]); } }
    const total = G.tiles.filter((t) => t !== g.WALL).length;
    assert.equal(seen.size, total, `F${floor} seed${seed}: つながっていない ゆかが ある`);
    for (let x = 0; x < W; x++) assert.ok(!g.walkable(G, x, 0) && !g.walkable(G, x, H - 1));
    assert.equal(G.objs.filter((o) => o.t === 'stairs').length, 1);
    assert.equal(G.mobs.filter((m) => MOBS[m.kind].boss).length, isBossFloor(floor) ? 1 : 0);
    assert.ok(!g.mobAt(G, G.hero.x, G.hero.y));
    const pos = new Set(); for (const o of G.objs) { assert.ok(g.walkable(G, o.x, o.y)); assert.ok(!pos.has(idx(o.x, o.y)), 'ものが かさなっている'); pos.add(idx(o.x, o.y)); }
    for (const m of G.mobs) assert.ok(g.walkable(G, m.x, m.y));
  }
  for (const f of Object.keys(SPAWN)) for (const [k] of SPAWN[f]) assert.ok(MOBS[k], k);
});

test('ほたる：ぜんぶ どこかで なかまに できる', () => {
  for (const f of FIREFLY_LIST) assert.ok(f.from === 'start' || (f.from === 'boss' && isBossFloor(f.floor)) || (f.from === 'floor' && f.floors.every((x) => !isBossFloor(x))), f.id);
});

test('レベル と おみせ', () => {
  const P = newProfile();
  assert.equal(gainExp(P, expNeed(1) + expNeed(2)), 2); assert.equal(P.level, 3);
  P.gold = 15; assert.equal(buyItem(P, 'herb'), null); assert.equal(buyItem(P, 'herb'), 'gold');
  P.gold = 1000; assert.equal(buyEquip(P, 'weapon'), null); assert.equal(buyEquip(P, 'weapon'), 'none'); // ボスを たおすまで つぎは ならばない
  P.bosses.push(3); assert.equal(buyEquip(P, 'weapon'), null); assert.equal(P.weapon, 2);
});

// まものを 1ぴきだけ おいた じょうたいを つくる
function arena(kind, dx = 1, dy = 0, level = 6) {
  const P = newProfile(); P.level = level;
  const G = g.enterFloor(P, 2, 7);
  G.mobs = []; G.objs = G.objs.filter((o) => !(Math.abs(o.x - G.hero.x) <= 3 && Math.abs(o.y - G.hero.y) <= 1));
  const m = { id: 99, kind, x: G.hero.x + dx, y: G.hero.y + dy, hp: MOBS[kind].hp, alert: true, nap: false, stun: 0, energy: 0, cd: 0, n: 0 };
  G.mobs.push(m);
  return { P, G, m };
}
test('ひらめき こうげき：せいかいで つよい こうげき、まちがうと からぶり。まものが いないと つかえない', () => {
  const dmg = (act) => { let s = 0; for (let k = 0; k < 40; k++) { const { P, G, m } = arena('ishi', 1); G.rs = k; g.act(G, P, act); s += MOBS.ishi.hp - m.hp; } return s / 40; };
  const hit = dmg({ t: 'move', dx: 1, dy: 0 }), good = dmg({ t: 'spark', ok: true }), bad = dmg({ t: 'spark', ok: false });
  assert.ok(good > hit * 2, `せいかい ${good} / ふつう ${hit}`); assert.equal(bad, 0);
  const { P, G } = arena('ishi', 1);
  assert.equal(g.canSpark(G), null);
  assert.ok(g.act(G, P, { t: 'spark', ok: false }).some((e) => e.t === 'sparkmiss')); assert.equal(G.turn, 1);
  G.mobs = []; assert.ok(g.canSpark(G));
  assert.equal(g.act(G, P, { t: 'spark', ok: true }).length, 1); assert.equal(G.turn, 1); // つかえない ときは ターンが すすまない
});
test('たからばこ と ほたるの かご：もんだいの あとで あく', () => {
  const { P, G } = arena('imomu', 1); G.mobs = [];
  G.objs.push({ t: 'chest', x: G.hero.x + 1, y: G.hero.y });
  let ev = g.act(G, P, { t: 'move', dx: 1, dy: 0 });
  assert.ok(ev.some((e) => e.t === 'askchest')); assert.ok(g.objAt(G, G.hero.x, G.hero.y));
  ev = g.act(G, P, { t: 'unlock', ok: true });
  assert.ok(ev.some((e) => e.t === 'chest')); assert.ok(!g.objAt(G, G.hero.x, G.hero.y));
  G.objs.push({ t: 'cage', id: 'merara', x: G.hero.x - 1, y: G.hero.y });
  assert.ok(g.act(G, P, { t: 'move', dx: -1, dy: 0 }).some((e) => e.t === 'askcage'));
  g.act(G, P, { t: 'unlock' });
  assert.ok(P.fireflies.includes('merara'));
  assert.equal(heroStats(P).maxHp, heroStats(newProfile()).maxHp + FIREFLY_HP + 6 * 5); // ほたる 1ぴき ぶん（arena は Lv6）
});
test('ねている まものは ふいうちで 2ばい・やられると おかねが はんぶん', () => {
  const { P, G, m } = arena('ishi', 1); m.nap = true; m.alert = false;
  const ev = g.act(G, P, { t: 'move', dx: 1, dy: 0 });
  assert.ok(ev.find((e) => e.t === 'hit').sneak);
  P.gold = 100; G.over = 'dead'; assert.equal(g.finishRun(G, P).lost, 50); assert.equal(P.gold, 50);
});

test('まなび：がくねん・きょうかごとに もんだいが つくれる。たんげんの なまえが ある', () => {
  const rng = makeRng(3);
  for (const grade of [1, 2, 3]) for (const subj of ['math', 'ja', 'en']) for (let lv = 1; lv <= 8; lv++) for (const keypad of [true, false]) {
    const L = newLearn(grade, [subj]); L.level[subj] = lv;
    for (let k = 0; k < 30; k++) {
      const q = nextQuestion(L, rng, { keypad });
      assert.ok(q.q && q.answer !== undefined && q.answer !== '', `${subj} g${grade} lv${lv}`);
      if (q.choices) assert.ok(q.choices.map(String).includes(String(q.answer)), `${q.q}：えらぶ なかに こたえが ない`);
      else assert.ok(/^\d+$/.test(String(q.answer)), `${q.q}：キーパッドで こたえられない（${q.answer}）`);
      assert.ok(UNIT_NAMES[`${q.subj}:${q.unit || q.topic}`], `たんげんの なまえが ない：${q.subj}:${q.unit || q.topic}`);
    }
  }
});
test('まなび：せいかいが つづくと むずかしく、まちがえると やさしく。にがては 2かい せいかいで そつぎょう', () => {
  const rng = makeRng(9), L = newLearn(2, ['math']);
  const lv0 = subjectLevel(L, 'math');
  for (let k = 0; k < 4; k++) recordAnswer(L, nextQuestion(L, rng), true, 'd1');
  assert.equal(subjectLevel(L, 'math'), lv0 + 2); assert.equal(L.combo, 4);
  const q = nextQuestion(L, rng); recordAnswer(L, q, false, 'd1');
  assert.equal(subjectLevel(L, 'math'), lv0 + 1); assert.equal(L.combo, 0); assert.equal(L.mistakes.length, 1); assert.equal(L.wrong.length, 1);
  let reviews = 0;
  for (let k = 0; k < 200 && L.mistakes.length; k++) { const r = nextQuestion(L, rng, { reviewOnly: true }); assert.ok(r.review && r.topic === q.topic); recordAnswer(L, r, true, 'd2'); reviews++; }
  assert.equal(reviews, 2); assert.deepEqual(L.days.d1, [4, 5]);
  const P = newProfile(2, ['math']); const ev = g.learnReward(null, P, true, 5);
  assert.ok(ev.some((e) => e.t === 'learnexp') && P.exp > 0); assert.equal(g.learnReward(null, P, false).length, 0);
  const G = g.enterFloor(P, 1, 5); G.hero.hp = 5; // めいきゅうの なかでは せいかいで HPも かいふく
  assert.ok(g.learnReward(G, P, true).some((e) => e.t === 'learnheal') && G.hero.hp > 5);
});
console.log(`\n${n} こ ぜんぶ OK`);
