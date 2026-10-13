// タイトル・うでだめし・スコアアタックの がめんを しゃしんに とる（スコアの がめんは e2e.mjs の さいごで とれる）
import { chromium } from 'playwright';
const out = process.env.OUT || (await import('os')).tmpdir();
const [w, h] = (process.env.SIZE || '1180x820').split('x').map(Number);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: w, height: h }, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.stack || e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:8123/arcanumber/');
await page.evaluate((text) => {
  localStorage.clear();
  localStorage.setItem('arcanumber.settings', JSON.stringify({ text, speed: 'normal', bgm: 0, sfx: 0, challenge: true }));
  localStorage.setItem('arcanumber.meta', JSON.stringify({ tips: { db_intro: 1, m_intro: 1 }, scores: { normal: [{ s: 812, h: 1, w: 1, a: 3, g: 2, d: 'normal', m: [], t: Date.now() - 86400000 }, { s: 455, h: 0, w: 0, a: 2, g: 2, d: 'easy', m: [], t: Date.now() }], random: [{ s: 1104, h: 2, w: 1, a: 3, g: 3, d: 'normal', m: ['glass', 'draft', 'midas'], t: Date.now() }] } }));
}, process.env.TEXT || 'ruby');
await page.reload(); await page.waitForTimeout(700);
const shot = async (n) => { await page.waitForTimeout(500); await page.screenshot({ path: `${out}/new_${n}.png` }); };
await shot('01_title');
await page.click('[data-sa]'); await page.click('[data-h="1"]'); await page.click('[data-next]');
await shot('02_level');
await page.click('[data-start]');
await page.waitForTimeout(300);
// 1もんめ・2もんめは「わからない」→ やさしい もんだい（え つき）へ
await page.click('[data-idk]'); await shot('03a_idk');
await page.waitForTimeout(1500); await shot('03b_lv2');
await page.click('[data-idk]'); await page.waitForTimeout(1800); await shot('03c_lv1');
for (let i = 2; i < 5; i++) {
  const a = await page.evaluate(() => window.__pt.a);
  for (const ch of String(a)) await page.click(`[data-k="${ch}"]`);
  if (i === 3) await shot('03d_question');
  await page.click('[data-k="ok"]');
  await page.waitForTimeout(900);
}
await shot('04_result');
await page.click('[data-adjb]'); await shot('05_result_adj');
await page.click('[data-go]');
await page.waitForTimeout(1200); await shot('06_mods');
console.log('errors:', errors.length ? errors.join('\n') : 'none');
await browser.close();
