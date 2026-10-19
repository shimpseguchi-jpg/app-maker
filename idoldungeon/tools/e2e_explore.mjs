// ロボットが迷宮を通しで遊ぶテスト
//   劇場地下迷宮：鍵→スイッチ→B2Fのボス→街へ  →  奈落の大劇場：鍵→スイッチ→B4Fのボス→街へ
// 道順は探索エンジンで探し、ブラウザではキーボードで操作する。回転床などで予定とずれたら、その場で道順を引き直す
// 戦闘は「おまかせ」で進める。流れを確かめるのが目的なので、パーティは Lv30 に育てておく（Lv24 だと休まずに奈落を進むうちに、たまに全滅する）（強さの調整は tools/sim_battle.mjs・sim_play.mjs）
// 使いかた：リポジトリのルートで npx http-server -p 8123 -c-1 . を動かしてから
//   node idoldungeon/tools/e2e_explore.mjs
import { chromium } from 'playwright';
import { act, useStairs } from '../js/engine/dungeon.js';
import { newExpedition, unitOf, syncParty } from '../js/engine/expedition.js';
import { gainExp, expForLevel } from '../js/engine/growth.js';
import { seeded } from '../js/engine/rng.js';
import { DUNGEONS } from '../js/data/floors.js';
import { STARTER_GEAR } from '../js/data/gear.js';

const url = process.env.URL || 'http://localhost:8123/idoldungeon/explore.html';
const KEYS = { forward: 'ArrowUp', turnL: 'ArrowLeft', turnR: 'ArrowRight', search: ' ', stairs: 'Enter' };

// 今の状態から目的地までの最初の一手（幅優先探索。遭遇なし・回転床は止まった向きのまま）
function nextStep(st0, goal) {
  const k = (s) => `${s.floor}:${s.x},${s.y},${s.dir}:${Object.keys(s.found).length}`;
  const lite = (s) => ({ ...s, keys: [...s.keys], flags: { ...s.flags }, found: { ...s.found }, done: { ...s.done }, seen: {}, trip: { ...s.trip } });
  const start = lite(st0);
  const seen = new Set([k(start)]);
  const q = [[start, null]];
  while (q.length) {
    const [s, first] = q.shift();
    if (s.floor === goal.floor && s.x === goal.x && s.y === goal.y) return first;
    for (const a of ['forward', 'turnL', 'turnR', 'search', 'stairs']) {
      const n = lite(s);
      if (a === 'stairs') { if (useStairs(n) !== 'moved') continue; }
      else act(n, a, { rng: () => 0.999, searcher: true });
      const kk = k(n);
      if (seen.has(kk)) continue;
      seen.add(kk); q.push([n, first || a]);
    }
  }
  throw new Error('道が見つからない: ' + JSON.stringify(goal));
}

// 迷宮ごとの目的地：鍵 → スイッチ → ボス → 入口
function goalsOf(d) {
  const sp = DUNGEONS[d].floors.flatMap((f, i) => f.specials.map((s) => ({ ...s, floor: i })));
  const at = (s) => ({ floor: s.floor, x: s.x, y: s.y });
  return [...sp.filter((s) => s.give?.key).map(at), ...sp.filter((s) => s.type === 'switch').map(at), ...sp.filter((s) => s.type === 'boss').map(at),
    { floor: 0, ...DUNGEONS[d].start, home: true }];
}

const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(url);
// 盗賊（亜美）を入れて、シークレットドアを確実に見つけられるパーティにする
const PARTY = [{ idol: 'makoto' }, { idol: 'hibiki' }, { idol: 'haruka' }, { idol: 'ritsuko' }, { idol: 'ami' }, { idol: 'yukiho' }];
const start = newExpedition(PARTY);
const grow = seeded(1);
for (const s of PARTY) gainExp(unitOf(start, s.idol), expForLevel(30), '', grow);
start.hp = {}; start.mp = {};
syncParty(start);
await page.evaluate((ex) => { localStorage.clear(); localStorage.setItem('idoldungeon.expedition', JSON.stringify(ex)); }, start);
await page.reload();

const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('idoldungeon.expedition')));
let battles = 0, presses = 0, plays = 0, guardians = 0;
const results = {};
for (const d of ['d1', 'd2']) {
  await page.click('[data-tab=depart]');
  await page.click(`[data-t=enter][data-id=${d}]`);
  for (const goal of goalsOf(d)) {
    for (let guard = 0; guard < 3000; guard++) {
      const ex = await state();
      if (ex.mode === 'town') break;
      if (ex.ex.floor === goal.floor && ex.ex.x === goal.x && ex.ex.y === goal.y && !goal.home) break;
      const a = ex.ex.floor === goal.floor && ex.ex.x === goal.x && ex.ex.y === goal.y ? 'stairs' : nextStep(ex.ex, goal);
      await page.keyboard.press(KEYS[a]);
      presses++;
      if (await page.isVisible('[data-m=fight]')) { await page.click('[data-m=fight]'); guardians++; } // ルームガーダーには挑む
      if (await page.isVisible('#battle')) battles++;
      while (await page.isVisible('#battle')) {
        for (const sel of ['[data-b=skip]', '[data-b=end]', '[data-b=auto]', '[data-b=go]']) {
          if (await page.isVisible(sel)) { if (sel === '[data-b=skip]') plays++; await page.click(sel); break; }
        }
      }
      if (await page.isVisible('#modal')) throw new Error('全滅した');
    }
  }
  const ex = await state();
  results[d] = { town: ex.mode === 'town', boss: ex.ex.bossClears[d === 'd1' ? 'b1' : 'b2'] === 1, floors: Object.keys(ex.ex.seen).length };
}
// カードモード：劇場地下迷宮を矢印キー（→）で振って、ボスまで進んで街へ戻る
await page.click('[data-tab=depart]');
await page.click('[data-t=enterCard][data-id=d1]');
let cardsSeen = 0;
for (let guard = 0; guard < 400; guard++) {
  const ex = await state();
  if (ex.mode === 'town') break;
  if (await page.isVisible('#battle')) {
    for (const sel of ['[data-b=skip]', '[data-b=end]', '[data-b=auto]', '[data-b=go]']) {
      if (await page.isVisible(sel)) { await page.click(sel); break; }
    }
    continue;
  }
  if (await page.isVisible('#modal')) throw new Error('カードモードで全滅した');
  await page.keyboard.press('ArrowRight');
  cardsSeen++;
}
{
  const ex = await state();
  results.card = { town: ex.mode === 'town' && !ex.card, clears: ex.ex.bossClears.b1, cards: cardsSeen };
}
// 装備：酒場の「装備」から衣装部屋へ。拾った装備を商店で鑑定して、全員おまかせで着せる
{
  const before = await state();
  // ボス戦の再生と結果を閉じる
  for (let i = 0; i < 20 && await page.isVisible('#battle'); i++) {
    for (const sel of ['[data-b=skip]', '[data-b=end]']) if (await page.isVisible(sel)) { await page.click(sel); break; }
  }
  await page.click('[data-tab=tavern]');
  await page.click('[data-dress=ami]');
  const tab = await page.isVisible('select[data-wear=weapon]') && await page.isVisible('select[data-wear=armor]') && await page.isVisible('select[data-equip=ami]');
  await page.click('[data-tab=shop]');
  await page.click('[data-shop=appraise]');
  for (let i = 0; i < 40 && await page.isVisible('[data-t=appraise]:not([disabled])'); i++) await page.click('[data-t=appraise]:not([disabled])');
  await page.click('[data-tab=equip]');
  await page.click('[data-t=dressAll]');
  const after = await state();
  const unknown = (e) => e.gear.filter((g) => !g.known).length;
  results.equip = { unknownScore: before.scores.some((sc) => !sc.known), tab, found: before.gear.length - STARTER_GEAR.length, appraised: unknown(before) - unknown(after), worn: Object.values(after.wear).flatMap((w) => Object.values(w)).length };
}
const ex = await state();
const shot = (process.env.OUT || (await import('os')).tmpdir()) + '/e2e_explore_town.png';
await page.screenshot({ path: shot });
await browser.close();

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log('NG:', m); } };
ok(results.d1.town && results.d1.boss, '劇場地下迷宮：ボスを倒して街に戻った');
ok(results.d2.town && results.d2.boss, '奈落の大劇場：ボスを倒して街に戻った');
ok(results.d2.floors === 5, '奈落の大劇場の5つの階をオートマップに記録');
ok(ex.items.length >= 2, 'ボスのドロップ（昇格アイテム）');
ok(results.equip.unknownScore, 'ボスのドロップ（未鑑定の楽譜。最後に商店で鑑定する前）');
const per = (d, k) => (ex.ex.dungeon === d ? ex.ex[k] : ex.ex.maps[d][k]); // 鍵・スイッチは迷宮ごとに記録（いまいる迷宮のぶんは ex.ex に出ている）
ok(per('d2', 'keys').includes('propKey') && per('d2', 'flags').d2gate && per('d1', 'keys').includes('silverKey'), '両方の迷宮の鍵とスイッチ（迷宮ごとに記録）');
ok(results.card.town && results.card.clears === 2 && results.card.cards >= 21, `カードモード：劇場地下迷宮をボスまで進んで街に戻った（${results.card.cards}枚）`);
ok(results.equip.tab && results.equip.found > 0 && results.equip.appraised > 0 && results.equip.worn >= 12, `装備：拾った装備を鑑定して着せる（拾った ${results.equip.found}・鑑定 ${results.equip.appraised}・着ている ${results.equip.worn}）`);
ok(guardians > 0, `ルームガーダーの部屋では挑むか聞かれる（${guardians}回）`);
ok(plays > 0, '戦闘のターンを1人ずつ再生する（行動順の表示と「とばす」）');
ok(!errors.length, 'ページのエラー: ' + errors.join(' / '));
console.log(`操作 ${presses} 回・戦闘 ${battles} 回 / 所持金 ${ex.gold}G / スクリーンショット ${shot}`);
console.log(fail ? `${fail} ng` : 'ok');
process.exit(fail ? 1 : 0);
