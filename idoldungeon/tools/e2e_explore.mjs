// ロボットが迷宮を通しで遊ぶテスト（鍵→スイッチ→B1F→B2F→ワープ→ボス→街へ戻る）
// 道順は探索エンジンで探し、ブラウザではキーボードで操作する
// 使いかた：リポジトリのルートで npx http-server -p 8123 -c-1 . を動かしてから
//   node idoldungeon/tools/e2e_explore.mjs
import { chromium } from 'playwright';
import { newExplore, act, useStairs, getFloor } from '../js/engine/dungeon.js';

const url = process.env.URL || 'http://localhost:8123/idoldungeon/explore.html';
const KEYS = { forward: 'ArrowUp', turnL: 'ArrowLeft', turnR: 'ArrowRight', search: ' ', stairs: 'Enter' };
const noEnc = () => 0.999;

// 現在の状態から目的地までの行動列（幅優先探索）
function route(st0, goal) {
  const key = (s) => `${s.floor}:${s.x},${s.y},${s.dir}:${Object.keys(s.found).length}`;
  const seen = new Set([key(st0)]);
  const q = [[st0, []]];
  while (q.length) {
    const [s, path] = q.shift();
    if (s.floor === goal.floor && s.x === goal.x && s.y === goal.y) return { st: s, path };
    for (const a of ['forward', 'turnL', 'turnR', 'search', 'stairs']) {
      const n = structuredClone(s);
      if (a === 'stairs') { const r = useStairs(n); if (r !== 'moved') continue; }
      else act(n, a, { rng: noEnc, searcher: true });
      const k = key(n);
      if (seen.has(k)) continue;
      seen.add(k); q.push([n, [...path, a]]);
    }
  }
  throw new Error('道が見つからない: ' + JSON.stringify(goal));
}

const goals = [
  { floor: 0, x: 11, y: 1 },   // 隠し部屋の銀の鍵
  { floor: 0, x: 9, y: 11 },   // スイッチ
  { floor: 2, x: 6, y: 8 },    // B2F のボス（鍵の扉・ワープを通る）
  { floor: 0, x: 5, y: 0 },    // 入口へ戻る
];
let st = newExplore('d1');
const plan = [];
for (const g of goals) { const r = route(st, g); st = r.st; plan.push(...r.path); }
plan.push('stairs'); // 街へ
console.log('行動数', plan.length);

const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(url);
await page.evaluate(() => {
  localStorage.clear();
  // 盗賊（亜美）を入れて、シークレットドアを確実に見つけられるパーティにする
  localStorage.setItem('idoldungeon.proto', JSON.stringify([{ idol: 'makoto' }, { idol: 'hibiki' }, { idol: 'haruka' }, { idol: 'ritsuko' }, { idol: 'ami' }, { idol: 'yukiho' }]));
});
await page.reload();
await page.click('[data-t=enter]');
let battles = 0;
for (const a of plan) {
  await page.keyboard.press(KEYS[a]);
  while (await page.isVisible('#modal')) {
    battles++;
    await page.click('[data-m=win]');
  }
}
const ex = await page.evaluate(() => JSON.parse(localStorage.getItem('idoldungeon.expedition')));
const shot = (process.env.OUT || (await import('os')).tmpdir()) + '/e2e_explore_town.png';
await page.screenshot({ path: shot });
await browser.close();

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log('NG:', m); } };
ok(ex.mode === 'town', '街に戻った');
ok(ex.ex.bossClears.b1 === 1, 'ボスを倒し、再戦の回数が増えた');
ok(ex.items.length >= 1, 'ボスのドロップ（昇格アイテム）');
ok(ex.ex.keys.includes('silverKey') && ex.ex.flags.f1gate, '鍵とスイッチ');
ok(Object.keys(ex.ex.seen).length === 3, '3つの階をオートマップに記録');
ok(!errors.length, 'ページのエラー: ' + errors.join(' / '));
console.log(`戦闘 ${battles} 回 / 所持金 ${ex.gold}G / スクリーンショット ${shot}`);
console.log(fail ? `${fail} ng` : 'ok');
process.exit(fail ? 1 : 0);
