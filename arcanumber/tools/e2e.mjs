// ロボットが さいごまで あそぶ テスト（アルカナンバー）
import { chromium } from 'playwright';
const url = process.env.URL || 'http://localhost:8123/arcanumber/';
const out = process.env.OUT || (await import('os')).tmpdir();
const hero = Number(process.env.HERO || 0), grade = Number(process.env.GRADE || 2), diff = process.env.DIFF || 'easy';
const MAXT = Number(process.env.MAXT || 6000);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1180, height: 820 }, hasTouch: true });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e.stack || e)));
await page.goto(url);
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('arcanumber.settings', JSON.stringify({ text: 'ruby', speed: 'turbo', bgm: 0, sfx: 0, challenge: true })); });
await page.reload(); await page.waitForTimeout(500);
await page.click('[data-new]'); await page.click(`[data-h="${hero}"]`); await page.click('[data-next]');
await page.click(`[data-g="${grade}"]`); await page.click(`[data-d="${diff}"]`); await page.click('[data-go]');
let shots = 0, last = '', same = 0; const seen = new Set();
for (let t = 0; t < MAXT; t++) {
  if (process.env.GOD) await page.evaluate(() => { if (window.AN.run) window.AN.run.hp = window.AN.run.maxHp; });
  const st = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const tap = (n) => { const o = { bubbles: true, pointerId: 1, isPrimary: true, button: 0 }; n.dispatchEvent(new PointerEvent('pointerdown', o)); n.dispatchEvent(new PointerEvent('pointerup', o)); };
    if (q('.guide-dim')) { q('.guide-dim').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return 'guide'; }
    const modal = q('.modal');
    if (modal) {
      const h2 = modal.querySelector('h2')?.textContent || '';
      if (modal.querySelector('.eq-big')) { const btns = [...modal.querySelectorAll('[data-v]')]; const eq = modal.querySelector('.eq-big').textContent.match(/(\d+)×(\d+)/); const ans = eq ? Number(eq[1]) * Number(eq[2]) : 0; const b = Math.random() < 0.7 ? btns.find((x) => Number(x.dataset.v) === ans) : btns[0]; (b || btns[0]).click(); return 'challenge'; }
      if (modal.classList.contains('quiz-modal')) {
        const qz = window.__quiz; const nb = modal.querySelector('[data-next]');
        if (nb && nb.style.display !== 'none') { nb.click(); return 'quiz-next'; }
        if (qz.choices) modal.querySelector(`[data-c="${qz.choices.indexOf(qz.answer)}"]`).click();
        else { for (const ch of String(qz.answer)) modal.querySelector(`[data-k="${ch}"]`).click(); modal.querySelector('[data-k="ok"]').click(); }
        return 'quiz';
      }
      const okb = modal.querySelector('[data-ok]'); if (okb) { okb.click(); return 'ok:' + h2; }
      const pick = modal.querySelector('[data-i]') || modal.querySelector('.arc-offer[data-id]') || modal.querySelector('.card-grid .card') || modal.querySelector('[data-auid]');
      if (pick) { pick.click(); return 'pick:' + h2; }
      const b = modal.querySelector('[data-ok], [data-yes], [data-use], [data-nextp]') || modal.querySelector('[data-i]') || modal.querySelector('.row .btn');
      if (b) { b.click(); return 'modal:' + h2; }
      const x = modal.querySelector('[data-close]'); if (x) { x.click(); return 'close:' + h2; }
      return 'modal?' + h2;
    }
    if (q('.battle')) {
      const A = window.AN; if (!A.dbg || !A.dbg.ui.input) return 'battle-wait';
      const b = A.dbg.b;
      if (A.dbg.ui.mode !== 'play') { q('.select-bar [data-cancel]')?.click(); return 'cancel-mode'; }
      // けっかい・インスタント（ねらい なし）を つかう
      const inst = [...document.querySelectorAll('.hand .card.t-aura:not(.dim), .hand .card.t-instant:not(.dim)')].filter((n) => !['paint', 'shift', 'twin'].includes(n.dataset.id));
      if (inst.length && Math.random() < 0.5) { tap(inst[0]); return 'instant'; }
      const filled = b.slots.filter(Boolean).length;
      const lim = b.rule === 'max3' ? 3 : b.rule === 'max4' ? 4 : 5;
      const cand = [...document.querySelectorAll('.hand .card.rune, .hand .card.t-spell:not(.dim)')];
      if (filled < lim && cand.length && Math.random() < 0.85) { tap(cand[Math.floor(Math.random() * cand.length)]); return 'place'; }
      q('.cast-btn').click(); return 'cast';
    }
    if (q('[data-chest]')) { q('[data-chest]').click(); return 'chest'; }
    if (q('.opt')) { const o = document.querySelectorAll('.opt'); o[Math.random() < 0.6 ? 0 : 1].click(); return 'rest'; }
    if (q('[data-leave]')) { const pr = [...document.querySelectorAll('.shop-item:not(.sold) .price:not(.cant)')]; if (pr.length && Math.random() < 0.5) { pr[0].click(); return 'buy'; } q('[data-leave]').click(); return 'leave'; }
    const ri = q('.reward-item:not(.taken)'); if (ri) { ri.click(); return 'reward'; }
    if (q('.panel-screen [data-next]')) { q('.panel-screen [data-next]').click(); return 'next'; }
    const go = q('.map-pop .btn'); if (go) { go.click(); return 'go'; }
    const av = document.querySelectorAll('.mnode.avail'); if (av.length) { av[Math.floor(Math.random() * av.length)].click(); return 'map'; }
    const evb = q('.event-box .choice-list .btn'); if (evb) { evb.click(); return 'event'; }
    if (q('[data-n]')) { q('[data-n]').click(); return 'story'; }
    if (q('[data-t]')) return 'END:' + q('.panel-screen h1').textContent;
    return 'idle';
  }).catch((e) => 'ERR ' + e.message);
  if (st.startsWith('END')) { console.log(st); await page.screenshot({ path: `${out}/an_end_h${hero}.png` }); break; }
  if (st.startsWith('ERR')) errors.push(st);
  const key = st.split(':')[0];
  if (process.env.SHOTS && !seen.has(key)) { seen.add(key); await page.screenshot({ path: `${out}/an_e2e_h${hero}_${String(shots++).padStart(2, '0')}_${key}.png` }); }
  if (st === last && !['battle-wait', 'guide'].includes(st)) same++; else same = 0;
  last = st;
  if (same > 40) { console.log('STUCK at', st); await page.screenshot({ path: `${out}/an_stuck_h${hero}.png` }); break; }
  await page.waitForTimeout(st === 'battle-wait' ? 60 : 35);
  if (t % 300 === 0) console.log(t, st, await page.evaluate(() => window.AN.run ? `A${window.AN.run.act} hp${window.AN.run.hp} deck${window.AN.run.deck.length} arc${window.AN.run.arcana.length}` : 'norun'));
}
console.log('errors:', errors.length ? [...new Set(errors)].join('\n') : 'none');
await browser.close();
