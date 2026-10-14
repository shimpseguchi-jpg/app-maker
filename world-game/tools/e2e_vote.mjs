// 世界議会の流れをたしかめる：議題3つから選ぶ → 賛成・反対。ゲームの途中で議会の投票を起こして、画面と結果を見る
// 使い方：(cd world-game && python3 -m http.server 8124 &) ; node tools/e2e_vote.mjs   （KID=1 で 1ねんせい）
import { chromium } from 'playwright';
const url = process.env.URL || 'http://localhost:8124/';
const out = process.env.OUT || (await import('os')).tmpdir();
const KID = !!process.env.KID;
const exe = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.stack || e)));
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log('NG:', m); } else console.log('OK:', m); };
const tag = KID ? 'kid' : 'adult';

for (const vote of ['no', 'yes']) {
  await page.goto(url);
  await page.evaluate((m) => { localStorage.clear(); localStorage.setItem('worldgame.settings', JSON.stringify({ gm: 'normal', speed: 'fast', mode: m })); }, KID ? 'kid' : 'adult');
  await page.reload();
  await page.fill('[data-seed]', 'COUNCIL1'); await page.click('[data-seedgo]');
  await page.click('[data-b="B02"]'); await page.click('[data-start]');
  // ニュースのカードを読んで、自国の番まで進める
  for (let t = 0; t < 400 && !(await page.$('.card h4')); t++) {
    await page.waitForTimeout(40);
    if (await page.$('.news-back [data-side]')) await page.click('.news-back [data-side]');
    else if (await page.$('.ncard:not(.flipped):not(.out-l):not(.out-r)')) await page.click('.ncard');
  }
  if (vote === 'no') await page.screenshot({ path: `${out}/${tag}-mood.png` });
  // 議会の段階にして、投票を起こす（それまでのニュースとして環境・食糧のニュースが起きたことにする）
  await page.evaluate(() => {
    const g = window.WG.g, G = window.WG.G;
    g.world.stage = 4;
    Object.assign(g.fired, { E06: 1, E22: 1, E04: 1, E86: 1 });
    const { options, why } = G.agendaOptions(g);
    g.pending = { type: 'vote', options, why };
    g.phase = 'pending'; g.offers = null;
    localStorage.setItem('worldgame.save', JSON.stringify(g));
  });
  await page.reload();
  await page.click('[data-cont]');
  await page.waitForSelector('.agenda');
  const names = await page.$$eval('.agenda b', (b) => b.map((x) => x.textContent));
  ok(names.length === 3, `議題の候補は3つ：${names.join(' / ')}`);
  ok(await page.$$eval('.agenda .from', (x) => x.length) >= 1, 'きっかけのニュースが出る');
  if (vote === 'no') await page.screenshot({ path: `${out}/${tag}-agendas.png` });
  await page.click('.agenda');
  await page.waitForSelector('[data-yes]');
  ok(!!(await page.$('.modal .gm.sec')), '投票の画面に補佐官（国民の気持ち）が出る');
  if (vote === 'no') {
    await page.screenshot({ path: `${out}/${tag}-vote.png` });
    await page.click('[data-back]');
    ok(!!(await page.waitForSelector('.agenda')), '選び直せる');
    await page.click('.agenda');
    await page.click('[data-no]');
    await page.waitForTimeout(800);
    const r = await page.evaluate(() => ({ result: window.WG.g.result, tried: window.WG.g.agendaTried, feed: window.WG.g.feed.filter((f) => f.k === 'vote').length }));
    ok(!r.result && r.tried?.length === 1 && r.feed === 1, '反対すると否決され、ゲームは続く');
  } else {
    // 全会一致になるように、AI の関係と信頼を上げておく
    await page.evaluate(() => { const g = window.WG.g; g.world.trust = 100; g.voteTries = 8; });
    await page.click('[data-yes]');
    await page.waitForTimeout(1500);
    const r = await page.evaluate(() => window.WG.g.result);
    ok(r?.type === 'clear' || r === null, `賛成して投票した（結果：${r?.type || '否決'}${r?.agenda ? '・' + r.agenda : ''}）`);
    await page.screenshot({ path: `${out}/${tag}-after-vote.png` });
  }
}
ok(errors.length === 0, 'エラーなし ' + errors.join('\n'));
await browser.close();
process.exit(fail ? 1 : 0);
