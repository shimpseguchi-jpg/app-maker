// ロボットが さいごまで あそぶ テスト
import { chromium } from 'playwright';
const url = process.env.URL || 'http://localhost:8123/';
const out = process.env.OUT || (await import('os')).tmpdir();
const grade = Number(process.env.GRADE || 2);
const diff = process.env.DIFF || 'easy';
const MAXT = Number(process.env.MAXT || 900);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1180, height: 820 }, hasTouch: true });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e.stack || e)));
await page.goto(url);
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('kazumaho.settings', JSON.stringify({ text: 'ruby', speed: 'turbo', bgm: 0, sfx: 0, predict: true })); });
await page.reload();
await page.waitForTimeout(500);
await page.click('[data-new]');
await page.click(`[data-g="${grade}"]`);
await page.click(`[data-d="${diff}"]`);
await page.click('[data-go]');
let shots = 0, last = '', same = 0;
const seen = new Set();
for (let t = 0; t < MAXT; t++) {
  const st = await page.evaluate(async () => {
    const q = (s) => document.querySelector(s);
    const tap = (n) => { const o = { bubbles: true, pointerId: 1, isPrimary: true, button: 0 }; n.dispatchEvent(new PointerEvent('pointerdown', o)); n.dispatchEvent(new PointerEvent('pointerup', o)); };
    if (q('.owl-dim')) { q('.owl-dim').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return 'owl'; }
    const modal = q('.modal');
    if (modal) {
      const h2 = modal.querySelector('h2')?.textContent || '';
      if (modal.querySelector('.keypad') && h2.includes('よそう')) {
        const v = window.KZ.dbg.preview().v;
        const str = Math.random() < 0.7 ? String(v) : String(v + 1);
        for (const ch of str) modal.querySelector(`[data-k="${ch}"]`).click();
        modal.querySelector('[data-k="ok"]').click();
        return 'predict';
      }
      if (modal.classList.contains('quiz-modal')) {
        const qz = window.__quiz;
        const nb = modal.querySelector('[data-next]');
        if (nb && nb.style.display !== 'none') { nb.click(); return 'quiz-next'; }
        if (qz.choices) { const i = qz.choices.indexOf(qz.answer); modal.querySelector(`[data-c="${i}"]`).click(); }
        else { for (const ch of String(qz.answer)) modal.querySelector(`[data-k="${ch}"]`).click(); modal.querySelector('[data-k="ok"]').click(); }
        return 'quiz:' + qz.q;
      }
      const pick = modal.querySelector('[data-i]') || modal.querySelector('.relic-offer') || modal.querySelector('.card-grid .card');
      if (pick) { pick.click(); return 'pick:' + h2; }
      const b = modal.querySelector('[data-ok], [data-yes], [data-v], [data-nextp]');
      if (b) { b.click(); return 'modal-ok:' + h2; }
      const x = modal.querySelector('[data-close]'); if (x) { x.click(); return 'close:' + h2; }
      return 'modal?' + h2;
    }
    if (q('.battle')) {
      const app = window.KZ;
      if (!app.dbg || !app.dbg.ui.input) return 'battle-wait';
      const b = app.dbg.b;
      const empty = b.slots.indexOf(null);
      const playable = [...document.querySelectorAll('.hand .card:not(.unplayable)')];
      if (empty >= 0 && playable.length) { tap(playable[Math.floor(Math.random() * playable.length)]); return 'place'; }
      q('.run-btn').click(); return 'run';
    }
    if (q('[data-chest]')) { q('[data-chest]').click(); return 'chest'; }
    if (q('.rest-opt')) { const o = document.querySelectorAll('.rest-opt'); o[Math.random() < 0.5 ? 0 : 1].click(); return 'rest'; }
    if (q('[data-leave]')) {
      const pr = [...document.querySelectorAll('.shop-item:not(.sold) .price:not(.cant)')];
      if (pr.length && Math.random() < 0.5) { pr[0].click(); return 'buy'; }
      q('[data-leave]').click(); return 'leave';
    }
    const ri = q('.reward-item:not(.taken)'); if (ri) { ri.click(); return 'reward'; }
    if (q('[data-next]')) { q('[data-next]').click(); return 'next'; }
    const go = q('.mapwrap .btn.green'); if (go) { go.click(); return 'go'; }
    const av = document.querySelectorAll('.mnode.avail'); if (av.length) { av[Math.floor(Math.random() * av.length)].click(); return 'map'; }
    const evb = q('.event-box .choice-list .btn'); if (evb) { evb.click(); return 'event'; }
    if (q('[data-n]')) { q('[data-n]').click(); return 'story'; }
    if (q('[data-t]')) return 'END:' + q('.panel-screen h1').textContent;
    return 'idle';
  }).catch((e) => 'ERR ' + e.message);
  if (st.startsWith('END')) { console.log(st); await page.screenshot({ path: `${out}/e2e_end_g${grade}.png` }); break; }
  if (st.startsWith('ERR')) errors.push(st);
  const key = st.split(':')[0];
  if (!seen.has(key) && process.env.SHOTS) { seen.add(key); await page.screenshot({ path: `${out}/e2e_g${grade}_${String(shots++).padStart(2, '0')}_${key}.png` }); }
  if (st === last && !['battle-wait', 'owl'].includes(st)) same++; else same = 0;
  last = st;
  if (same > 30) { console.log('STUCK at', st); await page.screenshot({ path: `${out}/e2e_stuck.png` }); break; }
  await page.waitForTimeout(st === 'battle-wait' ? 60 : 40);
  if (t % 100 === 0) { const info = await page.evaluate(() => window.KZ.run ? `F${window.KZ.run.floor} hp${window.KZ.run.hp} deck${window.KZ.run.deck.length}` : 'norun'); console.log(t, st, info); }
}
console.log('errors:', errors.length ? [...new Set(errors)].join('\n') : 'none');
await browser.close();
