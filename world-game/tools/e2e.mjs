// ブラウザ上でロボットが最初から最後まで遊ぶ通しテスト（スクリーンショットも撮る）
// 使い方：(cd world-game && python3 -m http.server 8124 &) ; node tools/e2e.mjs
import { chromium } from 'playwright';
const url = process.env.URL || 'http://localhost:8124/';
const out = process.env.OUT || (await import('os')).tmpdir();
const SEED = process.env.SEED || 'TEST01';
const KID = !!process.env.KID; // 1ねんせいモード：画面に 1年生で ならわない かん字が ないか しらべる
const G1 = '一右雨円王音下火花貝学気九休玉金空月犬見五口校左三山子四糸字耳七車手十出女小上森人水正生青夕石赤千川先早草足村大男竹中虫町天田土二日入年白八百文木本名目立力林六';
const exe = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1180, height: 820 }, hasTouch: true });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e.stack || e)));
await page.goto(url);
await page.evaluate((kid) => { localStorage.clear(); localStorage.setItem('worldgame.settings', JSON.stringify({ gm: 'many', speed: 'fast', mode: kid ? 'kid' : 'adult' })); }, KID);
await page.reload();
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/wg-01-title.png` });
await page.fill('[data-seed]', SEED);
await page.click('[data-seedgo]');
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/wg-02-setup.png` });
await page.click('[data-b="B02"]');
await page.click('[data-b="B05"]');
await page.click('[data-start]');
const shot = new Set();
const badText = new Map();
async function checkKana() {
  if (!KID) return;
  const t = await page.evaluate(() => document.querySelector('#stage').innerText);
  for (const m of t.matchAll(/[^\s]{0,8}[一-龯々〆][^\s]{0,8}/g)) if ([...m[0]].some((ch) => /[一-龯々〆]/.test(ch) && !G1.includes(ch))) badText.set(m[0], (badText.get(m[0]) || 0) + 1);
  for (const m of t.matchAll(/(?<![ァ-ヺー])[ぁ-ゖ]*ー[ぁ-ゖー]*/g)) if (m[0] !== 'やったー') badText.set('かなのまま:' + m[0], (badText.get('かなのまま:' + m[0]) || 0) + 1);
}
let t = 0;
for (; t < 4000; t++) {
  await page.waitForTimeout(40);
  const st = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    if (q('.ending')) return 'ending';
    if (q('.news-back')) return q('.news-back [data-side]') ? 'news-pick' : q('.ncard:not(.flipped):not(.out-l):not(.out-r)') ? 'news-flip' : 'wait';
    if (q('.dice-back [data-ok]') && getComputedStyle(q('.dice-back [data-ok]')).visibility === 'visible') return 'dice';
    if (q('.dice-back')) return 'rolling';
    const m = q('.modal');
    if (m) return 'modal:' + (m.querySelector('h2')?.textContent || '');
    if (q('.card')) return 'player';
    if (q('[data-next]')) return 'yearEnd';
    return 'wait';
  });
  const year = await page.evaluate(() => window.WG.g?.year || 0);
  if (t % 5 === 0 || st !== 'wait') await checkKana();
  if (st === 'ending') break;
  if (st === 'news-flip') {
    if (!shot.has('news')) { shot.add('news'); await page.screenshot({ path: `${out}/wg-10-news-back.png` }); }
    await page.click('.ncard');
  } else if (st === 'news-pick') {
    if (!shot.has('news2')) { shot.add('news2'); await page.waitForTimeout(600); await page.screenshot({ path: `${out}/wg-11-news-front.png` }); }
    const opts = await page.$$('.news-back [data-side]');
    // ときどきスワイプで選ぶ
    if (opts.length === 2 && Math.random() < 0.4) {
      const b = await page.$('.ncard'); const r = await b.boundingBox();
      await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await page.mouse.down();
      await page.mouse.move(r.x + r.width / 2 + (Math.random() < 0.5 ? -200 : 200), r.y + r.height / 2, { steps: 6 }); await page.mouse.up();
    } else await opts[Math.floor(Math.random() * opts.length)].click();
  } else if (st === 'dice') {
    if (!shot.has('dice')) { shot.add('dice'); await page.screenshot({ path: `${out}/wg-04-dice.png` }); }
    await page.click('.dice-back [data-ok]');
  } else if (st.startsWith('modal:')) {
    if (!shot.has(st)) { shot.add(st); await page.screenshot({ path: `${out}/wg-modal-${shot.size}.png` }); }
    if (await page.$('[data-hold]')) await page.click('[data-hold]');
    else if (await page.$('.modal [data-a]')) await page.click('.modal [data-a]');
    else if (await page.$('.modal [data-yes]')) await page.click(Math.random() < 0.8 ? '.modal [data-yes]' : '.modal [data-no]');
    else if (await page.$('.modal [data-n]')) await page.click('.modal [data-n]');
    else await page.click('.modal [data-close]');
  } else if (st === 'player') {
    if (!shot.has('player')) { shot.add('player'); await page.screenshot({ path: `${out}/wg-03-player.png` }); }
    if (year === 20 && !shot.has('y20')) { shot.add('y20'); await page.screenshot({ path: `${out}/wg-05-year20.png` }); }
    if (!shot.has('spark') && await page.$('.sparkcard')) { shot.add('spark'); await page.screenshot({ path: `${out}/wg-08-spark.png` }); }
    if (!shot.has('sit') && await page.$('.sitcard') && await page.$('.evres')) { shot.add('sit'); await page.screenshot({ path: `${out}/wg-09-situation.png` }); }
    const cards = await page.$$('.card h4');
    const i = Math.floor(Math.random() * cards.length);
    await cards[i].click();
    await page.click('.card.sel [data-go]');
  } else if (st === 'yearEnd') {
    if (!shot.has('yearEnd')) { shot.add('yearEnd'); await page.screenshot({ path: `${out}/wg-06-yearend.png` }); }
    await page.click('[data-next]');
  }
}
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/wg-07-ending.png` });
await checkKana();
const res = await page.evaluate(() => window.WG.g?.result);
if (process.env.DEBUG) console.log(await page.evaluate(() => JSON.stringify({ kid: window.WG.g.kid, max: window.WG.g.maxYears, hist: window.WG.g.hist.map((h) => h.year) })));
if (KID) { console.log(badText.size ? '1年生で ならわない かん字・カタカナに なって いない ことば:\n' + [...badText.keys()].slice(0, 60).join('\n') : '1年生の かん字・カタカナ OK'); }
console.log('steps', t, 'result', JSON.stringify(res));
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
await browser.close();
process.exit(errors.length ? 1 : 0);
