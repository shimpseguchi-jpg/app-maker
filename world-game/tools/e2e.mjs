// ブラウザ上でロボットが最初から最後まで遊ぶ通しテスト（スクリーンショットも撮る）
// 使い方：(cd world-game && python3 -m http.server 8124 &) ; node tools/e2e.mjs
import { chromium } from 'playwright';
const url = process.env.URL || 'http://localhost:8124/';
const out = process.env.OUT || (await import('os')).tmpdir();
const SEED = process.env.SEED || 'TEST01';
const exe = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1180, height: 820 }, hasTouch: true });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e.stack || e)));
await page.goto(url);
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('worldgame.settings', JSON.stringify({ gm: 'normal', speed: 'fast' })); });
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
let t = 0;
for (; t < 4000; t++) {
  await page.waitForTimeout(40);
  const st = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    if (q('.ending')) return 'ending';
    if (q('.dice-back [data-ok]') && getComputedStyle(q('.dice-back [data-ok]')).visibility === 'visible') return 'dice';
    if (q('.dice-back')) return 'rolling';
    const m = q('.modal');
    if (m) return 'modal:' + (m.querySelector('h2')?.textContent || '');
    if (q('.card')) return 'player';
    if (q('[data-next]')) return 'yearEnd';
    return 'wait';
  });
  const year = await page.evaluate(() => window.WG.g?.year || 0);
  if (st === 'ending') break;
  if (st === 'dice') {
    if (!shot.has('dice')) { shot.add('dice'); await page.screenshot({ path: `${out}/wg-04-dice.png` }); }
    await page.click('.dice-back [data-ok]');
  } else if (st.startsWith('modal:')) {
    if (!shot.has(st)) { shot.add(st); await page.screenshot({ path: `${out}/wg-modal-${shot.size}.png` }); }
    if (await page.$('[data-hold]')) await page.click('[data-hold]');
    else if (await page.$('.modal [data-a]')) await page.click('.modal [data-a]');
    else if (await page.$('.modal [data-n]')) await page.click('.modal [data-n]');
    else await page.click('.modal [data-close]');
  } else if (st === 'player') {
    if (!shot.has('player')) { shot.add('player'); await page.screenshot({ path: `${out}/wg-03-player.png` }); }
    if (year === 20 && !shot.has('y20')) { shot.add('y20'); await page.screenshot({ path: `${out}/wg-05-year20.png` }); }
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
const res = await page.evaluate(() => window.WG.g?.result);
console.log('steps', t, 'result', JSON.stringify(res));
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
await browser.close();
process.exit(errors.length ? 1 : 0);
