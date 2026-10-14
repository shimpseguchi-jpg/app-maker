// 拡大表示と国の情報の見え方を確かめるスクリーンショット：node tools/zoomshot.mjs
import { chromium } from 'playwright';
const out = process.env.OUT || (await import('os')).tmpdir();
const KID = !!process.env.KID;
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(process.env.URL || 'http://localhost:8124/');
await page.evaluate((kid) => { localStorage.clear(); localStorage.setItem('worldgame.settings', JSON.stringify({ gm: 'normal', speed: 'fast', mode: kid ? 'kid' : 'adult' })); }, KID);
await page.reload();
await page.fill('[data-seed]', 'ZOOM01');
await page.click('[data-seedgo]');
await page.click('[data-b="B03"]');
await page.click('[data-start]');
await page.waitForSelector('.card');
const p = KID ? 'kid-' : '';
await page.click('[data-zmap]'); await page.waitForTimeout(200); await page.screenshot({ path: `${out}/${p}z1-map.png` }); await page.click('.zoom-hint');
await page.click('.card [data-zcard]'); await page.waitForTimeout(200); await page.screenshot({ path: `${out}/${p}z2-card.png` }); await page.click('.zoom-hint');
await page.click('.feed .ev'); await page.waitForTimeout(200); await page.screenshot({ path: `${out}/${p}z3-news.png` }); await page.click('.zoom-hint');
// 仲のよさごとの国の情報
const ids = await page.evaluate(() => { const g = window.WG.g; return g.seats.filter((x) => x !== g.player); });
await page.evaluate((id) => { const g = window.WG.g; const k = [g.player, id].sort().join('-'); g.rel[k] = 80; }, ids[0]);
await page.evaluate((id) => { const g = window.WG.g; const k = [g.player, id].sort().join('-'); g.rel[k] = 50; }, ids[1]);
await page.evaluate((id) => { const g = window.WG.g; const k = [g.player, id].sort().join('-'); g.rel[k] = 20; }, ids[2]);
for (const [i, name] of [[0, 'full'], [1, 'some'], [2, 'little']]) {
  await page.click(`.rival[data-id="${ids[i]}"]`); await page.waitForTimeout(150);
  await page.screenshot({ path: `${out}/${p}z4-intel-${name}.png` }); await page.click('.modal [data-close]');
}
console.log(errors.length ? errors.join('\n') : 'no errors');
await browser.close();
