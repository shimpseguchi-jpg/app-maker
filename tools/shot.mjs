// がめんを しゃしんに とる
import { chromium } from 'playwright';
const url = process.env.URL || 'http://localhost:8123/';
const out = process.env.OUT || (await import('os')).tmpdir();
const [w, h] = (process.env.SIZE || '1180x820').split('x').map(Number);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(url);
await page.waitForTimeout(800);
const steps = JSON.parse(process.env.STEPS || '[]');
let i = 0;
for (const st of steps) {
  if (st.click) { await page.locator(st.click).first().click({ timeout: 4000, force: !!st.force }).catch((e) => errors.push('click ' + st.click + ' ' + e.message.split('\n')[0])); }
  if (st.eval) { await page.evaluate(st.eval).catch((e) => errors.push('eval ' + e.message)); }
  if (st.tap) { await page.evaluate((s) => { const n = document.querySelector(s); if (!n) throw new Error('no ' + s); const o = { bubbles: true, pointerId: 1, isPrimary: true }; n.dispatchEvent(new PointerEvent('pointerdown', o)); n.dispatchEvent(new PointerEvent('pointerup', o)); n.click(); }, st.tap).catch((e) => errors.push('tap ' + e.message)); }
  if (st.skipTips) { for (let k = 0; k < 12; k++) { const n = await page.$('.owl-dim'); if (!n) break; await page.waitForTimeout(400); await page.evaluate(() => { const d = document.querySelector('.owl-dim'); if (d) d.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); }); await page.waitForTimeout(150); } }
  if (st.wait) await page.waitForTimeout(st.wait);
  if (st.shot) { await page.screenshot({ path: `${out}/${st.shot}.png` }); i++; }
}
console.log('errors:', errors.length ? errors.join('\n') : 'none');
await browser.close();
