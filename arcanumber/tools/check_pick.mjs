// 「カードを えらぶ」が ちゃんと うごくか しらべる（たきびで きたえる）
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
async function check(game) {
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
  const base = game === 'arc' ? 'http://localhost:8123/arcanumber/' : 'http://localhost:8123/';
  await page.goto(base);
  const result = await page.evaluate(async (game) => {
    localStorage.clear();
    const P = game === 'arc' ? 'arcanumber.' : 'kazumaho.';
    localStorage.setItem(P + 'settings', JSON.stringify({ text: 'hira', bgm: 0, sfx: 0 }));
    localStorage.setItem(P + 'meta', JSON.stringify({ tips: { r_intro: 1 } }));
    const R = await import(game === 'arc' ? '/arcanumber/js/engine/run.js' : '/js/engine/run.js');
    const run = game === 'arc' ? R.newRun({ hero: 0, grade: 2, diff: 'normal', seed: 7 }) : R.newRun({ grade: 2, hero: 0, seed: 7 });
    const node = Object.values(run.map.nodes).find((n) => n.col === 0);
    node.type = 'rest'; run.pos = node.id; run.map.visited.push(node.id); run.pending = node.id;
    localStorage.setItem(P + 'run', JSON.stringify(run));
    return run.deck.filter((c) => c.up).length;
  }, game);
  await page.reload(); await page.waitForTimeout(500);
  await page.click('[data-cont]'); await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelector('.owl-dim, .guide-dim')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
  await page.waitForTimeout(400);
  await page.click(game === 'arc' ? '.opt[data-a=up]' : '.rest-opt[data-a=up]');
  await page.waitForTimeout(500);
  await page.click('.modal .card-grid .card');
  await page.waitForTimeout(600);
  const upgradedShown = await page.evaluate(() => !!document.querySelector('.modal h2') && document.querySelector('.modal h2').textContent);
  const ups = await page.evaluate((game) => (game === 'arc' ? window.AN : window.KZ).run.deck.filter((c) => c.up).length, game);
  console.log(game, 'before', result, 'after', ups, 'modal:', upgradedShown, errs.join(';') || 'no errors');
  await page.close();
}
await check('kaz');
await check('arc');
await browser.close();
