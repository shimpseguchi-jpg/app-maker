// ルールの テスト：ちずが つながっているか・ひらめき こうげき・たからばこ・ほたる・まなびの きろく
// つかいかた：node hotaru/tools/test_engine.mjs
import assert from 'node:assert/strict';
import { makeRng } from '../../js/util.js';
import * as g from '../js/engine/game.js';
import { newProfile, heroStats, gainExp, expNeed } from '../js/engine/hero.js';
import { buyItem, buyEquip } from '../js/engine/camp.js';
import { newLearn, nextQuestion, recordAnswer, subjectLevel, UNIT_NAMES } from '../js/engine/learn.js';
import { FIREFLY_LIST, FIREFLY_HP } from '../js/data/fireflies.js';
import { fixed, swapOf, GA, JOSHI } from '../js/data/quiz_bun.js';
import { DAKU, SOKU, CHOON, YOON, PAIRS, HYOKI } from '../js/data/quiz_hyoki.js';
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
      if (q.type) {
        assert.ok(['build', 'fill', 'fix'].includes(q.type) && (keypad || q.type === 'fill'), `たたかいの さいちゅうに ${q.type} が でた`);
        if (q.type === 'build') { assert.equal(new Set(q.cards).size, q.cards.length); assert.equal(q.order.map((i) => q.cards[i]).join('').replace('。', ''), q.answer.replace(/[ 。]/g, '')); }
        if (q.type === 'fill') { assert.equal(q.parts.filter((p) => p === null).length, q.slots.length); let k = 0; assert.equal(q.parts.map((p) => p ?? q.slots[k++]).join(''), q.answer.replace(/ /g, '')); q.slots.forEach((c) => assert.ok(q.pool.includes(c))); }
        if (q.type === 'fix') { assert.ok(q.wrong.length >= 1); q.wrong.forEach((i) => assert.ok(swapOf(q)[q.chars[i]], 'タップで なおせない じ')); assert.notEqual(fixed(q, new Set()), q.answer); assert.equal(fixed(q, new Set(q.wrong)), q.answer); }
      } else if (q.choices) assert.ok(new Set(q.choices.map(String)).size === q.choices.length && q.choices.map(String).includes(String(q.answer)), `${q.q}：えらぶ なかに こたえが ない`);
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
test('ぶんづくり：れいぶんの かたち・3だんかいが レベルに あわせて でる・こくごの 3わり ほどが ぶんづくり（1ねんせい）', () => {
  for (const [, s, p] of GA) assert.ok(s && p && !/[がはをへ]$/.test(s));
  for (const it of JOSHI) { assert.ok(it.length >= 3); for (const [w, p] of it.slice(1, -1)) assert.ok(w && ['は', 'を', 'へ'].includes(p)); }
  const rng = makeRng(21), count = (lv, opt) => { const L = newLearn(1, ['ja']); const c = {}; for (let k = 0; k < 400; k++) { L.level.ja = lv; L.recent = []; const q = nextQuestion(L, rng, opt); c[q.unit] = (c[q.unit] || 0) + 1; } return c; };
  const lo = count(2, { keypad: true, group: 'bun' }), hi = count(5, { keypad: true, group: 'bun' });
  assert.ok(lo.bunGa > lo.bunJoshi && !lo.bunFix); assert.ok(hi.bunFix > hi.bunJoshi && hi.bunJoshi > 0);
  const mix = count(3, { keypad: true }); const bun = (mix.bunGa || 0) + (mix.bunJoshi || 0) + (mix.bunFix || 0);
  assert.ok(bun > 80 && bun < 170, `ぶんづくり ${bun}/400`);
  const L = newLearn(1, ['ja']); const q = nextQuestion(L, rng, { keypad: true, group: 'bun' }); recordAnswer(L, q, false, 'd');
  assert.equal(L.mistakes[0].topic, q.topic); const r = nextQuestion(L, rng, { keypad: true, reviewOnly: true }); assert.equal(r.topic, q.topic); // にがての ふくしゅうでも でる
});
test('かなの きまり：ことばの かたち・4たんげんが レベルに あわせて でる・じぶんで なおす もんだいは たたかいの さいちゅうには でない', () => {
  for (const [, right, w1, w2] of [...DAKU, ...CHOON]) assert.ok(new Set([right, w1, w2]).size === 3, right);
  for (const [, w] of SOKU) assert.ok(w.includes('っ'), w);
  for (const [, w] of YOON) assert.ok(/[ゃゅょ]/.test(w), w);
  for (const [a, b, unit] of PAIRS) assert.ok(a[0] !== b[0] && a[1] !== b[1] && HYOKI[unit]);
  const rng = makeRng(33), count = (lv, opt) => { const L = newLearn(1, ['ja']); const c = { fix: 0 }; for (let k = 0; k < 600; k++) { L.level.ja = lv; L.recent = []; const q = nextQuestion(L, rng, opt); c[q.unit] = (c[q.unit] || 0) + 1; if (q.type === 'fix') c.fix++; } return c; };
  const lo = count(2, { keypad: true, group: 'hyoki' }), hi = count(4, { keypad: true, group: 'hyoki' });
  assert.ok(lo.hyoDaku && lo.hyoSoku && !lo.hyoChoon && !lo.hyoYoon && lo.fix > 100);
  assert.ok(hi.hyoDaku && hi.hyoSoku && hi.hyoChoon > hi.hyoDaku && hi.hyoYoon > hi.hyoSoku);
  assert.equal(count(4, { keypad: false, group: 'hyoki' }).fix, 0);
  const mix = count(3, { keypad: true }); const h = mix.hyoDaku + mix.hyoSoku + mix.hyoChoon + mix.hyoYoon;
  assert.ok(h > 130 && h < 240, `かなの きまり ${h}/600`);
});
console.log(`\n${n} こ ぜんぶ OK`);
