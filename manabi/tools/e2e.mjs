// ブラウザで タイトルから テストの けっかまで ロボットが あそぶ（Playwright と http-server が ひつよう）
// つかいかた：npx http-server -p 8123 -c-1 .  を うごかして  node manabi/tools/e2e.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }
import { mkdirSync } from 'fs';
const BASE = process.env.BASE || 'http://localhost:8123/manabi/';
const SHOTS = process.env.SHOTS || '/tmp/manabi-shots'; mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(BASE); await page.waitForSelector('[data-new]');
let n = 0; const shot = async (name) => { await page.screenshot({ path: `${SHOTS}/${String(++n).padStart(2, '0')}-${name}.png` }); };
const click = async (sel) => { await page.waitForSelector(sel, { timeout: 8000 }); await page.click(sel); };
await page.evaluate(() => { window.__robot = true; });
await shot('title');
await click('[data-new]'); await shot('setup');
await click('[data-hero="ken"]'); await click('[data-start]'); await click('.modal [data-ok]'); await page.waitForTimeout(500); await shot('home');
// もんだいに こたえる（せいかい）
async function answerQuiz(correct = true) {
  await page.waitForSelector('.quiz-card');
  const q = await page.evaluate(() => window.__q);
  if (q.choices) {
    const idx = q.choices.findIndex((c) => String(c) === String(q.answer));
    const pick = correct ? idx : (idx + 1) % q.choices.length;
    await page.click(`[data-c="${pick}"]`);
  } else {
    const ans = correct ? String(q.answer) : String(Number(q.answer) + 1);
    for (const ch of ans) await page.click(`.keypad [data-k="${ch}"]`);
    await page.click('.keypad [data-k="ok"]');
  }
  await click('[data-next]');
}
async function lesson(subj, correct = true) {
  await click(`[data-cmd="lesson"][data-subj="${subj}"]`);
  for (let i = 0; i < 5; i++) await answerQuiz(correct);
  await shot(`lesson-${subj}`); await click('.modal [data-ok]');
}
// ぜんき：3レッスン ＋ ミニゲーム
await lesson('math'); await lesson('ja', false); await lesson('en');
await click('[data-cmd="minigame"]'); await click('[data-mg="timing"]');
for (let i = 0; i < 3; i++) { await page.waitForTimeout(400); await page.click('[data-area]'); await page.waitForTimeout(800); }
await click('[data-ok]'); await page.waitForTimeout(300); await shot('cards');
await page.click('.modal .skill-card'); await click('.modal [data-ok]');
// テストの ひ
await click('.modal [data-ok]'); await shot('exam-intro');
for (let i = 0; i < 6; i++) await answerQuiz(i !== 3);
await shot('exam-quiz-done'); await click('[data-go]'); await click('.modal [data-ok]');
await page.waitForSelector('.stage-wrap'); await page.waitForTimeout(5000); await shot('stage');
await page.waitForSelector('.rank-row', { timeout: 180000 }); await shot('exam-result');
const rows = await page.$$eval('.rank-row', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
console.log('けっか:', rows.join(' | '));
await click('.modal [data-ok]');
// こうき または せいせきひょう
await page.waitForTimeout(500);
const state = await page.evaluate(() => (window.MANABI.run ? `term${window.MANABI.run.term}` : 'report'));
console.log('つぎ:', state);
await shot('after');
if (state === 'report') { await click('[data-ok]'); } else { await click('.modal [data-ok]'); await page.waitForTimeout(400); await shot('term2-home'); }
if (errors.length) { console.log('✗ エラー:', errors.join('\n')); process.exitCode = 1; } else console.log('✓ つうし OK（エラーなし）');
await browser.close();
