// ロボットが あそぶ テスト：npx http-server -p 8123 -c-1 . を うごかしてから node yomitoki/tools/e2e.mjs
// OUT=フォルダ で スクリーンショットを のこす
import { chromium } from 'playwright';
const url = process.env.URL || 'http://localhost:8123/yomitoki/';
const out = process.env.OUT || (await import('os')).tmpdir();
const W = Number(process.env.W || 1180), H = Number(process.env.H || 820);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: W, height: H }, hasTouch: true });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404') && !m.text().includes('fonts')) errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e.stack || e)));
const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.goto(url);
await page.waitForSelector('.home');
await sleep(400);
await shot('01_home');

const P = () => page.evaluate(() => { const n = document.querySelector('.solve'); return n && n.__p; });
async function solve(i, { mistakes = false } = {}) {
  const p = await P();
  try { await page.waitForSelector('[data-done]:not([disabled])', { timeout: 10000 }); } catch (e) { await shot('ERR_' + i); console.log(await page.evaluate(() => document.querySelector('#stage').innerText.slice(0, 600))); throw e; }
  if (i === 0) await shot('02_read');
  await page.click('[data-done]');
  if (mistakes) {
    // あわてて まちがえる → ロック
    const wrong = p.ask.correct === 0 ? 1 : 0;
    await page.click(`.opt[data-i="${wrong}"]`);
    await sleep(500); await shot('03_ask_wrong_lock');
    await page.waitForSelector('.lock', { state: 'detached', timeout: 8000 });
  }
  await page.click(`.opt[data-i="${p.ask.correct}"]`);
  await page.waitForSelector('[data-expr]');
  const build = async (expr) => {
    for (let k = 0; k < expr.length; k++) {
      if (k > 0) await page.click(`[data-op="${expr[k].sign}"]`);
      await page.click(`.chip[data-t="${expr[k].t}"]`);
    }
  };
  if (mistakes) {
    // きごうを ぎゃくに → ミニクイズ
    const flip = p.expr.map((e, k) => (k === p.expr.length - 1 ? { ...e, sign: -e.sign } : e));
    await build(flip);
    await shot('04_expr_built');
    await page.click('[data-check]');
    await sleep(400);
    if (await page.$('.lock')) { await shot('05a_rush_lock'); await page.waitForSelector('.lock', { state: 'detached', timeout: 8000 }); }
    await shot('05_op_quiz');
    const quizBtn = await page.$('[data-c]');
    if (quizBtn) {
      const q = p.quiz[p.expr[p.expr.length - 1].t];
      await page.click(`[data-c="${q.correct}"]`);
      await sleep(1800);
    }
    for (let k = 0; k < p.expr.length * 2; k++) await page.click('[data-del]');
    // もういちど まちがえる → せつめい
    await build(flip); await page.click('[data-check]'); await sleep(300);
    if (await page.$('.lock')) await page.waitForSelector('.lock', { state: 'detached', timeout: 8000 });
    if (await page.$('[data-c]')) { await page.click('[data-c="0"]'); await sleep(1800); }
    if (await page.$('[data-again]')) { await shot('06_explain'); await page.click('[data-again]'); }
    else { for (let k = 0; k < p.expr.length * 2; k++) await page.click('[data-del]'); }
  }
  await build(p.expr);
  await page.click('[data-check]');
  await page.waitForSelector('[data-ans]');
  if (mistakes) {
    // けいさん まちがい と たんい まちがい
    await page.click(`.units [data-u="${p.units.find((u) => u !== p.unit)}"]`);
    await page.keyboard.type(String((p.answer + 1) % 20 || 2));
    await sleep(2500);
    await page.click('[data-check]');
    await sleep(300);
    await shot('07_calc_wrong');
    await page.keyboard.type(String(p.answer));
    await page.click('[data-check]');
    await sleep(300);
    await shot('08_unit_wrong');
  }
  await page.click(`.units [data-u="${p.unit}"]`);
  if (!mistakes) await page.keyboard.type(String(p.answer));
  if (i === 1) await shot('09_answer');
  await page.click('[data-check]');
  await page.waitForSelector('[data-next]');
  if (i === 0 || i === 1) await shot(`10_result_${i}`);
  await page.click('[data-next]');
}

await page.click('[data-go="today"]');
await page.waitForSelector('.solve');
let i = 0;
while (await page.$('.solve') && !(await page.$('[data-home]'))) {
  await solve(i, { mistakes: i === 0 });
  await sleep(250);
  i++;
  if (i > 12) throw new Error('おわらない');
}
await page.waitForSelector('[data-home]');
await shot('11_summary');
await page.click('[data-home]');
await page.waitForSelector('.home');
await shot('12_home_after');
console.log('とっくん', i, 'もん');

// ノート
if (await page.$('[data-go="note"]:not([disabled])')) {
  await page.click('[data-go="note"]');
  await page.waitForSelector('.solve'); await sleep(300); await shot('13_note');
  await page.click('[data-quit]'); await page.click('[data-yes]');
  await page.waitForSelector('.home');
}
// ことば しわけ
await page.click('[data-go="sort"]');
await page.waitForSelector('.sort'); await sleep(400);
await shot('14_sort');
await page.click('.bin.m'); await sleep(200); await shot('15_sort_feedback');
await page.click('[data-back]');
// けいさん
await page.click('[data-go="calc"]');
await shot('16_calc_menu');
await page.click('[data-set="three"]');
await page.waitForSelector('.calc');
await page.keyboard.type('99'); await page.keyboard.press('Enter'); await sleep(200);
await shot('17_calc');
await page.click('[data-back]');
// おうちの かた
await page.click('[data-go="parent"]');
const q = await page.textContent('.gate .q');
const [a, b] = q.match(/(\d+) × (\d+)/).slice(1).map(Number);
await page.keyboard.type(''); for (const d of String(a * b)) await page.click(`.gate [data-k="${d}"]`);
await page.click('.gate [data-ok]');
await page.waitForSelector('.parent'); await sleep(400);
await shot('18_parent');
await page.evaluate(() => document.querySelector('.parent-body').scrollTo(0, 900));
await shot('19_parent2');
await browser.close();
if (errors.length) { console.log('ERRORS\n' + errors.join('\n')); process.exit(1); }
console.log('OK');
