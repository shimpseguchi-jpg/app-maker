// ブラウザで タイトルから クリアまで ロボットが あそぶ（Playwright と http-server が ひつよう）
// つかいかた：npx http-server -p 8123 -c-1 .  を うごかして  node hotaru/tools/e2e.mjs
import { createRequire } from 'module';
import { mkdirSync } from 'fs';
const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }
const BASE = process.env.BASE || 'http://localhost:8123/hotaru/';
const SHOTS = process.env.SHOTS || '/tmp/hotaru-shots'; mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: Number(process.env.DSF || 1) });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|fonts/.test(m.text())) errors.push(m.text()); });
await page.goto(BASE); await page.waitForSelector('[data-new]');
let n = 0; const shot = async (name) => { await page.waitForTimeout(350); await page.screenshot({ path: `${SHOTS}/${String(++n).padStart(2, '0')}-${name}.png` }); };
const click = async (sel) => { await page.waitForSelector(sel, { timeout: 8000 }); await page.click(sel); };
const ok = async () => { while (await page.$('.modal [data-ok]')) { await page.click('.modal [data-ok]'); await page.waitForTimeout(30); } };
await shot('title');
await page.evaluate(() => { window.__robot = true; });
await click('[data-new]'); await shot('story'); await click('.modal [data-ok]');
await page.waitForSelector('[data-g]'); await click('[data-g="2"]'); await shot('grade'); await click('.modal [data-ok]');
await page.waitForSelector('.camp'); await shot('camp');
// もんだいに こたえる（rate の わりあいで せいかい）
let asked = 0;
async function answer(rate = 0.8) {
  const q = await page.evaluate(() => window.__q); asked++;
  const right = Math.random() < rate;
  if (q.type && !right) await page.click('.quiz [data-giveup]');
  else if (q.type === 'build') { for (const i of q.order) await page.click(`.quiz .bun-pool [data-i="${i}"]`); await page.click('.quiz [data-bunok]'); }
  else if (q.type === 'fill') { for (const c of q.slots) await page.click(`.quiz .bun-pool [data-p="${c}"]`); await page.click('.quiz [data-bunok]'); }
  else if (q.type === 'fix') { for (const i of q.wrong) await page.click(`.quiz .ch[data-i="${i}"]`); await page.click('.quiz [data-bunok]'); }
  else if (q.choices) {
    const i = q.choices.findIndex((c) => String(c) === String(q.answer));
    await page.click(`.quiz [data-c="${right ? i : (i + 1) % q.choices.length}"]`);
  } else {
    for (const ch of String(right ? q.answer : Number(q.answer) + 1)) await page.click(`.quiz .keypad [data-k="${ch}"]`);
    await page.click('.quiz .keypad [data-k="ok"]');
  }
  await page.click('.quiz [data-next]');
}
// まなびの こや（5もん）と きろく
await click('[data-cmd="study"]'); await shot('study'); await click('[data-st="any"]');
for (let i = 0; i < 5; i++) { await page.waitForSelector('.quiz'); if (i === 1) await shot('quiz'); await answer(i === 2 ? 0 : 1); if (i === 2) { /* まちがい */ } }
await page.waitForSelector('.modal [data-ok]'); await shot('study-result'); await ok();
// ぶんづくり（カードを ならべる・□に いれる・まちがいを なおす）を ほんとうに タップして とく
const kinds = new Set();
for (let round = 0; round < 6 && kinds.size < 3; round++) {
  await page.evaluate((lv) => { const P = JSON.parse(localStorage.getItem('hotaru.profile')); P.learn.level.ja = lv; P.learn.streak.ja = 0; localStorage.setItem('hotaru.profile', JSON.stringify(P)); }, [2, 3, 5][round % 3]);
  await page.reload(); await page.evaluate(() => { window.__robot = true; }); await click('[data-go]'); await page.waitForSelector('.camp');
  await click('[data-cmd="study"]'); await click('[data-st="bun"]');
  for (let i = 0; i < 5; i++) {
    await page.waitForSelector('.quiz'); const t = await page.evaluate(() => window.__q.type);
    if (!t) errors.push('ぶんづくりで ほかの もんだいが でた');
    if (!kinds.has(t)) { kinds.add(t); await shot('bun-' + t); }
    await answer(1);
  }
  const ok = await page.evaluate(() => /5 \/ 5/.test(document.querySelector('.modal h2')?.textContent || ''));
  if (!ok) errors.push('ぶんづくり：ただしく タップしたのに 5もん せいかいに ならない');
  await page.click('.modal [data-ok]'); await page.waitForSelector('.camp');
}
if (kinds.size < 3) errors.push('ぶんづくりの 3しゅるいが そろわない：' + [...kinds].join(','));
await click('[data-cmd="record"]'); await shot('record'); await click('.modal [data-x]');
// キャンプの がめんを ひととおり ひらく
await click('[data-cmd="shop"]'); await click('[data-buy="herb"]'); await shot('shop'); await click('.modal [data-x]');
await click('[data-cmd="bag"]'); await shot('bag'); await click('.modal [data-x]');
await click('[data-cmd="book"]'); await shot('book'); await click('.modal [data-x]');
// めいきゅうへ
await click('[data-cmd="go"]'); await page.waitForSelector('.dungeon'); await shot('howto'); await ok(); await shot('dungeon');
// タップ・じゅうじボタン・キーボード
const turn0 = await page.evaluate(() => window.__hotaru.G.turn);
await page.click('.dpad .c'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowRight');
const box = await page.locator('.cv').boundingBox();
await page.mouse.click(box.x + box.width / 2 + 72 * 2, box.y + box.height / 2); await page.waitForTimeout(500);
const turn1 = await page.evaluate(() => window.__hotaru.G.turn);
if (turn1 - turn0 < 3) errors.push(`そうさが きいていない（ターン ${turn0} → ${turn1}）`);
await click('[data-bag]'); await shot('dungeon-bag'); await click('.modal [data-x]');
// ここからは ロボットが あそぶ（やられたら かいものを して もういちど）
await page.evaluate(async () => { window.__bot = await import('../hotaru/tools/bot.mjs'); });
const shots = new Set();
let runs = 0, cleared = false;
for (let step = 0; step < 40000 && !cleared; step++) {
  const st = await page.evaluate(() => {
    if (document.querySelector('.quiz')) return { quiz: document.querySelector('.quiz .why')?.textContent || '' };
    if (document.querySelector('.modal [data-ok]')) return { modal: document.querySelector('.modal h2')?.textContent || 'modal' };
    if (document.querySelector('.camp')) return { camp: true };
    if (!document.querySelector('.dungeon')) return { other: true };
    const H = window.__hotaru; let k = 0;
    while (k++ < 40 && !H.G.over && !H.busy && !document.querySelector('.modal')) {
      const a = window.__bot.decide(H.G, H.P);
      if (a.t === 'spark') { H.spark(); break; } // ひらめき こうげきは もんだいに こたえてから
      H.act(a);
    }
    return { floor: H.G.floor, level: H.P.level, mobs: window.__bot && H.G.mobs.filter((m) => H.G.vis[m.y * 31 + m.x]).length };
  });
  if (st.quiz) {
    const kind = st.quiz.slice(0, 2);
    if (!shots.has('q' + kind) && shots.size < 30) { shots.add('q' + kind); await shot('quiz-' + shots.size); }
    await answer(0.8); continue;
  }
  if (st.modal) {
    if (/クリア/.test(st.modal)) cleared = true;
    if (!shots.has(st.modal) && shots.size < 30) { shots.add(st.modal); await shot('modal-' + shots.size); }
    await page.click('.modal [data-ok]'); continue;
  }
  if (st.camp) {
    if (++runs > 25) { errors.push('25かい たんけん しても クリア できない'); break; }
    if (await page.$('.modal [data-ok]')) continue;
    await page.evaluate(() => { const P = JSON.parse(localStorage.getItem('hotaru.profile')); window.__bot.shop(P); localStorage.setItem('hotaru.profile', JSON.stringify(P)); });
    await page.reload(); await click('[data-go]'); await page.waitForSelector('.camp');
    await page.evaluate(async () => { window.__robot = true; window.__bot = await import('../hotaru/tools/bot.mjs'); });
    if (runs === 2) await shot('camp-2');
    await click('[data-cmd="go"]');
    if (await page.$('.modal [data-f]')) { if (!shots.has('pick')) { shots.add('pick'); await shot('start-floor'); } await page.click('.modal [data-f]:last-child'); }
    await page.waitForSelector('.dungeon'); continue;
  }
  if (st.floor && st.mobs >= 2 && !shots.has('f' + st.floor)) { shots.add('f' + st.floor); await shot('floor-' + st.floor); }
}
await ok(); await page.waitForSelector('.camp', { timeout: 8000 }).catch(() => errors.push('クリアの あと キャンプに もどらない'));
await shot('camp-clear');
await click('[data-cmd="book"]'); await shot('book-full');
const P = await page.evaluate(() => JSON.parse(localStorage.getItem('hotaru.profile')));
console.log(`もんだい ${asked}もん（きろく ${P.learn.total}もん・せいかい ${P.learn.correct}）  たんけん ${P.runs}かい  やられた ${P.falls}かい  Lv ${P.level}  ほたる ${P.fireflies.length}  クリア ${P.clears}`);
if (!P.clears) errors.push('クリア できなかった');
if (P.learn.total !== asked) errors.push(`もんだいの きろくが あわない（${asked} もん こたえて きろくは ${P.learn.total}）`);
await browser.close();
if (errors.length) { console.log('NG'); errors.slice(0, 10).forEach((e) => console.log(' -', e)); process.exit(1); }
console.log('OK  スクリーンショット:', SHOTS);
