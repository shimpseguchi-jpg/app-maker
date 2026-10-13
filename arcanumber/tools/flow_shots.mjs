// はじめの デッキづくりの ながれを しゃしんに とる
import { chromium } from 'playwright';
const out = process.env.OUT || (await import('os')).tmpdir();
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: Number(process.env.DPR || 1) });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.stack || e)));
await page.goto('http://localhost:8123/arcanumber/');
await page.evaluate((text) => { localStorage.clear(); localStorage.setItem('arcanumber.settings', JSON.stringify({ sv: 2, text, bgm: 0, sfx: 0, challenge: true, speed: 'normal' })); }, process.env.TEXT || 'ruby');
await page.reload(); await page.waitForTimeout(500);
const skip = async () => { for (let i = 0; i < 6; i++) { const has = await page.$('.guide-dim'); if (!has) break; await page.waitForTimeout(380); await page.evaluate(() => document.querySelector('.guide-dim')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); await page.waitForTimeout(150); } };
await page.click('[data-new]'); await page.click('[data-h="0"]'); await page.click('[data-next]'); await page.click('[data-go]');
await page.waitForTimeout(700); await skip();
await page.screenshot({ path: `${out}/pk_1_select.png` });
for (const t of ['fire', 'thunder', 'silver']) await page.click(`.pack-pick .pack[data-pack="${t}"]`, { force: true });
await page.waitForTimeout(300); await page.screenshot({ path: `${out}/pk_2_chosen.png` });
await page.click('[data-open]', { force: true }); await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/pk_3_pack.png` });
for (let k = 0; k < 3; k++) {
  await page.click('.overlay .pack', { force: true }); await page.waitForTimeout(1100);
  if (k === 0) await page.screenshot({ path: `${out}/pk_4_backs.png` });
  const flips = await page.$$('.flip');
  for (let i = 0; i < flips.length; i++) { await flips[i].click({ force: true }); await page.waitForTimeout(250); }
  await page.waitForTimeout(600);
  if (k === 0) await page.screenshot({ path: `${out}/pk_5_revealed.png` });
  await page.click('.overlay [data-next]', { force: true }); await page.waitForTimeout(700);
}
await skip();
await page.screenshot({ path: `${out}/pk_6_builder.png` });
await page.click('[data-auto]', { force: true }); await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/pk_7_auto.png` });
await page.screenshot({ path: `${out}/pk_8_hist.png`, clip: { x: 840, y: 300, width: 320, height: 160 } });
await page.click('.overlay [data-ok]', { force: true }); await page.waitForTimeout(800);
const deck = await page.evaluate(() => [window.AN.run.deck.length, window.AN.run.side.length]);
console.log('deck/side', deck, 'errors:', errors.join('\n') || 'none');
await browser.close();
