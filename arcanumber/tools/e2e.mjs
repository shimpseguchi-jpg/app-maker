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
// FAKEGAS=1：GAS の サーバー（tools/gas_Code.gs）を ブラウザの なかで うごかして ランキングを ためす
if (process.env.FAKEGAS) {
  const { readFileSync } = await import('fs');
  const code = readFileSync(new URL('../../tools/gas_Code.gs', import.meta.url), 'utf8');
  await page.addInitScript((code) => {
    const load = () => { try { return JSON.parse(localStorage.getItem('fakegas') || '{}'); } catch (e) { return {}; } };
    const store = load();
    const keep = () => localStorage.setItem('fakegas', JSON.stringify(store));
    const props = { getProperty: (k) => (k in store ? store[k] : null), setProperty: (k, v) => { store[k] = String(v); keep(); }, deleteProperty: (k) => { delete store[k]; keep(); }, getKeys: () => Object.keys(store) };
    const api = new Function('PropertiesService', 'LockService', 'Utilities', `${code}; return { getDaily, submitDaily };`)(
      { getScriptProperties: () => props }, { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
      { formatDate: (d) => new Date(d.getTime() + 9 * 3600e3).toISOString().slice(0, 10) });
    const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
    if (!store['daily:' + today]) [['すばやい ペンギン', 'pen1', 0, 1340, 1], ['かしこい フクロウ', 'fuku', 1, 980, 1], ['げんきな キツネ', 'kit2', 2, 610, 0]].forEach(([n, g, h, s, w]) => api.submitDaily({ d: today, n, g, h, s, w, a: w ? 3 : 2, df: 'normal' }));
    const runner = (okf, ngf) => new Proxy({}, { get: (_, name) => (name === 'withSuccessHandler' ? (f) => runner(f, ngf) : name === 'withFailureHandler' ? (f) => runner(okf, f)
      : (...args) => setTimeout(() => { try { const r = api[name](...JSON.parse(JSON.stringify(args))); okf && okf(JSON.parse(JSON.stringify(r))); } catch (e) { ngf && ngf(e); } }, 150)) });
    window.google = { script: { get run() { return runner(null, null); } } };
  }, code);
}
await page.goto(url);
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('arcanumber.settings', JSON.stringify({ sv: 2, text: 'ruby', speed: 'turbo', bgm: 0, sfx: 0, challenge: true })); });
await page.reload(); await page.waitForTimeout(500);
const MODE = process.env.MODE || 'normal';
if (process.env.MODS) await page.evaluate((m) => { window.__forceMods = m.split(','); }, process.env.MODS);
await page.click(MODE === 'random' ? '[data-sa]' : '[data-new]');
if (MODE === 'random') { await page.waitForSelector('.modal [data-ok]'); await page.click('.modal [data-more]'); await page.click('.modal [data-ok]'); }
await page.click(`[data-h="${hero}"]`); await page.click('[data-next]');
let shots = 0, last = '', same = 0; const seen = new Set();
for (let t = 0; t < MAXT; t++) {
  if (process.env.GOD) await page.evaluate(() => { if (window.AN.run) window.AN.run.hp = window.AN.run.maxHp; });
  const st = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const tap = (n) => { const o = { bubbles: true, pointerId: 1, isPrimary: true, button: 0 }; n.dispatchEvent(new PointerEvent('pointerdown', o)); n.dispatchEvent(new PointerEvent('pointerup', o)); };
    if (q('.guide-dim')) { q('.guide-dim').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return 'guide'; }
    const ov = q('.overlay');
    if (ov && ov.classList.contains('pt')) {
      const go = ov.querySelector('[data-go]'); if (go) { const adj = ov.querySelector('[data-adjb]'); if (adj && adj.style.display !== 'none' && Math.random() < 0.3) { adj.click(); ov.querySelector('[data-d] button:last-child').click(); return 'pt-adj'; } go.click(); return 'pt-go'; }
      const k = ov.querySelector('[data-k="ok"]'); if (!k || k.disabled) return 'pt-wait';
      if (Math.random() < 0.15) { ov.querySelector('[data-idk]').click(); return 'pt-idk'; }
      const ans = Math.random() < 0.75 ? window.__pt.a : window.__pt.a + 1;
      for (const ch of String(ans)) ov.querySelector(`[data-k="${ch}"]`).click(); k.click(); return 'pt-ans';
    }
    if (ov && !q('.modal')) {
      const open = ov.querySelector('[data-open]');
      if (open) { if (!open.disabled) { open.click(); return 'pk-open'; } const ps = ov.querySelectorAll('.pack-pick .pack'); ps[Math.floor(Math.random() * ps.length)].click(); return 'pk-pick'; }
      const nx = ov.querySelector('[data-next]'); if (nx && nx.style.display !== 'none') { nx.click(); return 'pk-next'; }
      const fl = ov.querySelector('.flip:not(.open)'); if (fl) { fl.click(); return 'pk-flip'; }
      const pk = ov.querySelector('.pack.big'); if (pk) { pk.click(); return 'pk-tear'; }
      const ok = ov.querySelector('.db-pool') && ov.querySelector('[data-ok]');
      if (ok) {
        if (ok.disabled || Math.random() < 0.4) { ov.querySelector('[data-auto]').click(); return 'db-auto'; }
        const items = ov.querySelectorAll('.db-item'); if (Math.random() < 0.3 && items.length) { const it = items[Math.floor(Math.random() * items.length)]; it.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); it.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); return 'db-toggle'; }
        ok.click(); return 'db-ok';
      }
      return 'overlay-wait';
    }
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
      const mp = modal.querySelector('.pack'); if (mp) { mp.click(); return 'boss-pack'; }
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
    if (q('[data-start]')) { (q('[data-last]') && Math.random() < 0.5 ? q('[data-last]') : q('[data-start]')).click(); return 'level'; }
    if (q('.mod-row') && q('[data-board]') && q('[data-go]')) { q('[data-go]').click(); return 'daily-go'; }
    if (q('[data-chest]')) { q('[data-chest]').click(); return 'chest'; }
    if (q('.opt')) { const o = document.querySelectorAll('.opt'); o[Math.floor(Math.random() * o.length)].click(); return 'rest'; }
    if (q('[data-leave]')) { const pr = [...document.querySelectorAll('.shop-item:not(.sold) .price:not(.cant)')]; if (pr.length && Math.random() < 0.5) { pr[Math.floor(Math.random() * pr.length)].click(); return 'buy'; } q('[data-leave]').click(); return 'leave'; }
    const ri = q('.reward-item:not(.taken)'); if (ri) { ri.click(); return 'reward'; }
    if (q('.panel-screen [data-next]')) { q('.panel-screen [data-next]').click(); return 'next'; }
    const go = q('.map-pop .btn'); if (go) { go.click(); return 'go'; }
    const av = document.querySelectorAll('.mnode.avail'); if (av.length) { av[Math.floor(Math.random() * av.length)].click(); return 'map'; }
    const evb = q('.event-box .choice-list .btn'); if (evb) { evb.click(); return 'event'; }
    if (q('[data-n]')) { q('[data-n]').click(); return 'story'; }
    if (q('[data-t]')) return 'END:' + q('.panel-screen h1').textContent;
    return 'idle';
  }).catch((e) => 'ERR ' + e.message);
  if (st.startsWith('END')) {
    await page.waitForTimeout(7000);
    console.log(st, '| score', await page.evaluate(() => `${document.querySelector('[data-total]')?.textContent} items=${document.querySelectorAll('.sc-item').length} rank=${document.querySelector('[data-rank]')?.textContent}`));
    await page.screenshot({ path: `${out}/an_end_${MODE}_h${hero}.png` });
    if (MODE === 'random') {
      console.log('daily:', await page.evaluate(() => document.querySelector('[data-daily]')?.textContent));
      await page.click('[data-see]'); await page.waitForTimeout(800);
      console.log('board:', await page.evaluate(() => [...document.querySelectorAll('.hs.board tr')].map((r) => r.textContent.replace(/\s+/g, ' ').trim()).join(' | ')));
      await page.screenshot({ path: `${out}/an_board_h${hero}.png` });
    }
    break;
  }
  if (st.startsWith('ERR')) errors.push(st);
  const key = st.split(':')[0];
  if (process.env.SHOTS && !seen.has(key)) { seen.add(key); await page.screenshot({ path: `${out}/an_e2e_h${hero}_${String(shots++).padStart(2, '0')}_${key}.png` }); }
  if (st === last && !['battle-wait', 'guide', 'overlay-wait', 'pk-flip', 'db-toggle', 'db-auto', 'pt-wait'].includes(st)) same++; else same = 0;
  last = st;
  if (same > 40) { console.log('STUCK at', st); await page.screenshot({ path: `${out}/an_stuck_h${hero}.png` }); break; }
  await page.waitForTimeout(st === 'battle-wait' ? 60 : 35);
  if (t % 300 === 0) console.log(t, st, await page.evaluate(() => window.AN.run ? `A${window.AN.run.act} hp${window.AN.run.hp}/${window.AN.run.maxHp} deck${window.AN.run.deck.length} arc${window.AN.run.arcana.length} g${window.AN.run.grade}${window.AN.run.diff} mods=${window.AN.run.mods}` : 'norun'));
}
console.log('errors:', errors.length ? [...new Set(errors)].join('\n') : 'none');
await browser.close();
