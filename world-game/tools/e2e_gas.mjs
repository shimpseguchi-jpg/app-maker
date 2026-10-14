// GAS 版の通しテスト：google.script.run のにせものを入れて、クラウドへのセーブと「つづきから」をたしかめる
// 使い方：node tools/build_gas.mjs ; (cd world-game && python3 -m http.server 8124 &) ; node tools/e2e_gas.mjs
import { chromium } from 'playwright';
const url = process.env.URL || 'http://localhost:8124/gas/index.html';
const out = process.env.OUT || (await import('os')).tmpdir();
const exe = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.stack || e)));
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push(m.text()); });
// にせの GAS：セーブは localStorage の mock.cloud に入れる（ゲーム自身のセーブとは別のキー）
await page.addInitScript(() => {
  const db = () => JSON.parse(localStorage.getItem('mock.cloud') || '{}');
  const impl = {
    wgLoad() { const d = db(); return { user: 'u1', save: d.save || null, settings: d.settings || null, updated: d.updated || 0 }; },
    wgSave(p) {
      const d = db();
      if (p.save !== undefined) d.save = p.save;
      if (p.settings !== undefined) d.settings = p.settings;
      if (p.meta) d.meta = p.meta;
      d.updated = Date.now(); d.calls = (d.calls || 0) + 1;
      localStorage.setItem('mock.cloud', JSON.stringify(d));
      return d.updated;
    },
  };
  const runner = (ok, ng) => new Proxy({}, { get(_, k) {
    if (k === 'withSuccessHandler') return (f) => runner(f, ng);
    if (k === 'withFailureHandler') return (f) => runner(ok, f);
    return (...a) => setTimeout(() => { try { const v = impl[k](...a); ok && ok(v); } catch (e) { ng && ng(e); } }, 80);
  } });
  window.google = { script: { get run() { return runner(); } } };
});
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log('NG:', m); } else console.log('OK:', m); };

await page.goto(url);
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('mock.cloud', JSON.stringify({ settings: JSON.stringify({ gm: 'normal', speed: 'fast', mode: 'kid' }), updated: 1 })); });
await page.reload();
await page.waitForSelector('[data-new]');
ok(/学校の アカウント/.test(await page.textContent('.cloudnote')), 'タイトルにクラウド保存の表示（1ねんせいの表記）');
ok(await page.evaluate(() => window.WG.settings.mode === 'kid'), 'クラウドの設定を読みこむ');
await page.screenshot({ path: `${out}/gas-01-title.png` });
await page.click('[data-new]');
await page.click('[data-b="B02"]');
await page.click('[data-start]');
for (let t = 0; t < 2000; t++) {
  await page.waitForTimeout(40);
  const year = await page.evaluate(() => window.WG.g?.year || 0);
  if (year >= 3 && await page.$('.card')) break;
  if (await page.$('.dice-back [data-ok]') && await page.evaluate(() => getComputedStyle(document.querySelector('.dice-back [data-ok]')).visibility === 'visible')) await page.click('.dice-back [data-ok]');
  else if (await page.$('.news-back [data-side]')) await page.click('.news-back [data-side]');
  else if (await page.$('.ncard:not(.flipped):not(.out-l):not(.out-r)')) await page.click('.ncard');
  else if (await page.$('.news-back')) continue;
  else if (await page.$('.dice-back')) continue;
  else if (await page.$('.modal')) {
    if (await page.$('[data-hold]')) await page.click('[data-hold]');
    else if (await page.$('.modal [data-a]')) await page.click('.modal [data-a]');
    else if (await page.$('.modal [data-n]')) await page.click('.modal [data-n]');
    else await page.click('.modal [data-close]');
  } else if (await page.$('.card h4')) { await page.click('.card h4'); await page.click('.card.sel [data-go]'); }
  else if (await page.$('[data-next]')) await page.click('[data-next]');
}
await page.waitForTimeout(2000);
const before = await page.evaluate(() => ({ year: window.WG.g.year, player: window.WG.g.player, seed: window.WG.g.seed }));
const cl = await page.evaluate(() => JSON.parse(localStorage.getItem('mock.cloud')));
ok(cl.save && JSON.parse(cl.save).year === before.year, `クラウドに今のセーブ（${before.year}かいめ、${cl.save?.length} 字、送信 ${cl.calls} 回）`);
ok(cl.meta?.mode === '1ねんせい' && cl.meta.status === 'playing', `先生の一覧用の見出し ${JSON.stringify(cl.meta)}`);
// 端末のセーブを消して開き直す → クラウドから「つづきから」
await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k !== 'mock.cloud') localStorage.removeItem(k); });
await page.reload();
await page.waitForSelector('[data-new]');
ok(!!(await page.$('[data-cont]')), 'クラウドから「つづきから」が出る');
await page.click('[data-cont]');
await page.waitForTimeout(800);
const after = await page.evaluate(() => ({ year: window.WG.g.year, player: window.WG.g.player, seed: window.WG.g.seed }));
ok(JSON.stringify(before) === JSON.stringify(after), `同じところから再開 ${JSON.stringify(after)}`);
await page.screenshot({ path: `${out}/gas-02-resume.png` });
ok(errors.length === 0, 'エラーなし ' + errors.join('\n'));
await browser.close();
process.exit(fail ? 1 : 0);
