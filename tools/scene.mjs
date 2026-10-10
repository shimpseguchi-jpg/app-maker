// とくていの ばめんを つくって しゃしんを とる
import { chromium } from 'playwright';
const out = process.env.OUT || (await import('os')).tmpdir();
const scene = process.env.SCENE || 'shop';
const text = process.env.TEXT || 'ruby';
const [w, h] = (process.env.SIZE || '1180x820').split('x').map(Number);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: w, height: h }, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.stack || e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:8123/');
await page.evaluate(async ({ scene, text }) => {
  localStorage.clear();
  localStorage.setItem('kazumaho.settings', JSON.stringify({ text, speed: 'normal', bgm: 0, sfx: 0, predict: scene !== 'nopredict' }));
  localStorage.setItem('kazumaho.meta', JSON.stringify({ tips: Object.fromEntries(['m_intro', 'b_intro', 'b_cards', 'b_rep', 'b_shape', 'b_legs', 'b_memo', 'b_junk', 'b_lock', 'b_weak', 'b_armor', 'b_multi', 'b_charge', 'b_target', 'b_run', 'b_predict', 'b_block', 'b_combo', 'b_curse', 'r_intro', 'b_hint'].map((k) => [k, 1])), cards: { p2: 1, p3: 1, x2: 1, tri: 1, g4: 1, rep: 1, spider: 1, ant: 1 }, enemies: { slime: 1, bat: 1, target: 1 }, facts: { 'card:tri': 1, 'card:spider': 1 }, records: { runs: 3, wins: 1, bestFloor: 3, predOk: 42, predTry: 55, calcs: 380, pittari: 12, quizOk: 7, quizTry: 9, maxHit: 96 } }));
  const R = await import('/js/engine/run.js');
  const run = R.newRun({ grade: 2, hero: 0, seed: 777, diff: 'normal' });
  const node = Object.values(run.map.nodes).find((n) => n.col === 0);
  const types = { shop: 'shop', battle: 'battle', nopredict: 'battle', event: 'event', rest: 'rest', elite: 'elite', boss: 'boss' };
  if (types[scene]) {
    node.type = types[scene];
    if (scene === 'battle' || scene === 'nopredict') node.enc = ['target', 'bat'];
    if (scene === 'elite') node.enc = ['wolf'];
    if (scene === 'boss') { node.enc = ['slimeKing']; }
    run.pos = node.id; run.map.visited.push(node.id); run.pending = node.id;
  }
  run.coins = 160;
  if (scene === 'six') { node.type = 'battle'; node.enc = ['clown']; run.pos = node.id; run.map.visited.push(node.id); run.pending = node.id; run.slots = 5; run.relics.push('hat'); run.floor = 2; run.deck.push({ uid: 'y1', id: 'tri', up: true }, { uid: 'y2', id: 'memoSet', up: false }, { uid: 'y3', id: 'if3', up: false }); }
  run.deck.push({ uid: 'x1', id: 'spider', up: false }, { uid: 'x2', id: 'ifBig', up: true }, { uid: 'x3', id: 'sqr', up: false }, { uid: 'x4', id: 'dice', up: false });
  run.relics.push('apple', 'magnifier');
  if (scene === 'floor3') { run.floor = 3; run.slots = 5; run.map = R.genMap((await import('/js/util.js')).makeRng(5), 3); }
  localStorage.setItem('kazumaho.run', JSON.stringify(run));
}, { scene, text });
await page.reload();
await page.waitForTimeout(700);
if (!['title', 'zukan', 'settings'].includes(scene)) await page.click('[data-cont]');
if (scene === 'zukan') { await page.click('[data-zukan]'); await page.waitForTimeout(400); if (process.env.TAB) await page.click(`[data-tab="${process.env.TAB}"]`); }
if (scene === 'settings') await page.click('[data-settings]');
await page.waitForTimeout(Number(process.env.WAIT || 1800));
const acts = JSON.parse(process.env.ACTS || '[]');
let i = 0;
for (const a of acts) {
  if (a.js) await page.evaluate(a.js).catch((e) => errors.push(e.message));
  if (a.wait) await page.waitForTimeout(a.wait);
  if (a.shot) await page.screenshot({ path: `${out}/sc_${scene}_${a.shot}.png` });
}
await page.screenshot({ path: `${out}/sc_${scene}.png` });
console.log('errors:', errors.join('\n') || 'none');
await browser.close();
