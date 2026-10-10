// とくていの ばめんを しゃしんに とる
import { chromium } from 'playwright';
const out = process.env.OUT || (await import('os')).tmpdir();
const scene = process.env.SCENE || 'shop';
const [w, h] = (process.env.SIZE || '1180x820').split('x').map(Number);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: w, height: h }, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.stack || e)));
await page.goto('http://localhost:8123/arcanumber/');
await page.evaluate(async ({ scene, text }) => {
  localStorage.clear();
  localStorage.setItem('arcanumber.settings', JSON.stringify({ text, speed: 'normal', bgm: 0, sfx: 0, challenge: scene !== 'nochallenge' }));
  const tips = ['m_intro', 'bt_intro', 'bt_rune', 'bt_arcana', 'bt_rule', 'bt_aura', 'bt_instant', 'bt_cast', 'bt_mana', 'bt_order', 'bt_redraw', 'bt_challenge', 'bt_block', 'bt_curse', 'rw_interest', 'sh_intro', 'bt_aura2'];
  localStorage.setItem('arcanumber.meta', JSON.stringify({ tips: Object.fromEntries(tips.map((k) => [k, 1])) }));
  const R = await import('/arcanumber/js/engine/run.js');
  const run = R.newRun({ hero: 0, grade: 2, diff: 'normal', seed: 4242 });
  run.coins = 23;
  run.arcana.push({ uid: 'a2', id: 'pairCharm', n: 0 }, { uid: 'a3', id: 'snowball', n: 3 }, { uid: 'a4', id: 'trioCrown', n: 0 });
  run.deck = [R.makeRune('fire', 5), R.makeRune('fire', 5), R.makeRune('thunder', 5, { enh: 'foil' }), R.makeRune('fire', 2), R.makeRune('thunder', 3), R.makeCard('focus'), R.makeCard('inferno'), R.makeCard('fireAltar'), R.makeCard('guard')];
  run.scrolls.push({ uid: 's1', id: 'star', hand: 'triple' });
  run.handLv.triple = 2;
  const node = Object.values(run.map.nodes).find((n) => n.col === 0);
  const t = { shop: 'shop', battle: 'battle', nochallenge: 'battle', event: 'event', rest: 'rest', boss: 'boss', elite: 'elite' }[scene];
  if (t) { node.type = t; run.pos = node.id; run.map.visited.push(node.id); run.pending = node.id; if (t === 'battle') node.enc = ['wolf', 'bat']; if (t === 'elite') node.enc = ['troll']; if (t === 'boss') { node.enc = ['zeroKing']; run.act = 3; } }
  localStorage.setItem('arcanumber.run', JSON.stringify(run));
}, { scene, text: process.env.TEXT || 'ruby' });
await page.reload(); await page.waitForTimeout(600);
await page.click('[data-cont]');
await page.waitForTimeout(Number(process.env.WAIT || 2000));
for (const a of JSON.parse(process.env.ACTS || '[]')) {
  if (a.js) await page.evaluate(a.js).catch((e) => errors.push(e.message));
  if (a.wait) await page.waitForTimeout(a.wait);
  if (a.shot) await page.screenshot({ path: `${out}/an_sc_${scene}_${a.shot}.png` });
}
await page.screenshot({ path: `${out}/an_sc_${scene}.png` });
console.log('errors:', errors.join('\n') || 'none');
await browser.close();
