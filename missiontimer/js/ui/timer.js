// ミッション中の がめん（REQUIREMENTS.md 5.5・F-501〜F-510・F-603・F-605・F-607）
// うえ：いまの パネル（えもじ・ミッション文） まんなか：のこり じかん（えんばん／バー／マスコット／すうじ）と おおきな かず
// その した：つぎは ◯◯・できた！  した：そうさ と ミッションの おび（おわった ものは ✓・いまの いち・カギと とびら）
import { T, $, $$, el, esc, modal, toast, play, speak, hush, confirmBox, longPress, keepAwake, fullscreen, wait, bigParts, hon, discPath, itemColor, clock, minText } from './common.js';
import * as M from '../engine/mission.js';
import { fill } from '../data/themes.js';
import { profile, parent, saveProfile } from '../save.js';

const VIEWS = [['disc', 'えんばん'], ['bar', 'バー'], ['mascot', 'マスコット'], ['numbers', 'すうじ']];

export function runTimer(root, app, m0) {
  let m = m0;
  const theme = app.theme();
  let sig = '', busy = false, raf = 0, lastTick = 0, lastSave = 0, stopped = false, bannerTimer = null;
  const quiet = () => profile.drama === 'quiet' || profile.volume === 'off';
  keepAwake(true);

  const commit = (next, events = []) => { m = next; app.saveMission(m); handle(events); frame(true); };

  function view() { return !profile.showNumbers && profile.view === 'numbers' ? 'disc' : profile.view; }
  function signature() { const c = M.current(m); return [m.cursor, m.tt.end, c?.uid, m.tt.items.map((it) => `${it.uid}${it.state}${it.planned}`).join(','), view(), profile.showNumbers].join('|'); }

  // ── がめんの ほね（パネルが かわった ときに つくりなおす）
  function build() {
    const cur = M.current(m), nx = M.nextPanel(m);
    if (!cur) return;
    const doneType = cur.finish === 'done' && !cur.auto;
    const extLeft = Math.max(0, (parent.extendMax ?? 2) - (cur.extended || 0));
    const isRest = cur.auto === 'break' || cur.auto === 'rest' || cur.kind === 'rest';
    const v = view();
    root.innerHTML = '';
    root.appendChild(el(`<div class="screen timer view-${v} ${isRest ? 'is-rest' : ''}">
      <header class="t-top">
        <div class="t-now"><span class="em">${cur.emoji}</span><div><div class="t-sentence">${T(M.missionText(cur, minText))}</div>
          <div class="t-kind">${T(doneType ? 'できた！で おわる' : cur.auto === 'free' ? 'じかんが あまったよ。すきに すごそう' : 'じかんで おわる')}</div></div></div>
        <button class="btn ghost small" data-view aria-label="${T('ひょうじを かえる')}">👁 ${T(VIEWS.find((x) => x[0] === v)[1])}</button>
      </header>
      <main class="t-main">
        <div class="t-visual">${visualHtml(v)}</div>
        <div class="t-side">
          ${profile.showNumbers ? `<div class="t-num" data-num><small>${T('のこり')}</small><b data-n></b><span data-u></span></div>` : ''}
          <div class="t-next">${nx ? `${T('つぎは')} <span class="em">${nx.emoji}</span> ${T(nx.obj)}` : `${T('つぎは')} ${theme.door.closed} ${T('ゴール！')}`}</div>
          ${doneType ? `<button class="btn big done" data-done>⭐ ${T('できた！')}</button><div class="t-wait" data-wait></div>`
            : `<button class="btn mid gray" data-done>${T(cur.auto ? 'つぎへ すすむ' : 'おわった！')}</button>`}
        </div>
      </main>
      <nav class="t-ctl">
        <button class="btn gray" data-pause>⏸ ${T('いちじていし')}${parent.pauseLongPress ? `<small>${T('ながおし')}</small>` : ''}<i class="press" data-press></i></button>
        <button class="btn gray" data-more ${extLeft && !isRest ? '' : 'disabled'}>＋5 ${T('もうすこし')}<small>${T('あと')} ${extLeft}</small></button>
        <button class="btn gray" data-later ${!cur.auto && nx ? '' : 'disabled'}>↪ ${T('あとで')}</button>
        <button class="btn gray" data-quit>✋ ${T('おわる')}</button>
      </nav>
      <footer class="t-band">
        <div class="band" data-band>${m.tt.items.map((it, i) => `<span class="seg ${it.state} ${i === m.cursor ? 'now' : ''}" style="flex:${Math.max(0.6, it.end - it.start)};--c:${itemColor(it)}"><i>${it.state === 'done' ? '✓' : it.auto === 'skipped' ? '' : it.emoji}</i>${i === m.cursor ? '<b class="prog" data-prog></b>' : ''}</span>`).join('')}</div>
        <div class="door"><span class="dr">${M.keysOf(m) >= M.totalKeysOf(m) ? theme.door.open : theme.door.closed}</span><span class="holes">${Array.from({ length: M.totalKeysOf(m) }, (_, k) => `<i class="${k < M.keysOf(m) ? 'lit' : ''}">${theme.key}</i>`).join('')}</span></div>
        <div class="t-total" data-total></div>
      </footer>
      <div class="t-banner" data-banner></div>
    </div>`));
    wire(cur);
  }

  function visualHtml(v) {
    if (v === 'disc') return `<svg class="disc" viewBox="0 0 200 200"><circle cx="100" cy="100" r="96" class="disc-face"/><path data-disc class="disc-fill"/>${Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * 2 * Math.PI; return `<line x1="${(100 + 84 * Math.sin(a)).toFixed(1)}" y1="${(100 - 84 * Math.cos(a)).toFixed(1)}" x2="${(100 + 94 * Math.sin(a)).toFixed(1)}" y2="${(100 - 94 * Math.cos(a)).toFixed(1)}" class="disc-tick"/>`; }).join('')}<circle cx="100" cy="100" r="7" class="disc-pin"/></svg>`;
    if (v === 'bar') return '<div class="vbar"><div class="vbar-fill" data-bar></div></div>';
    if (v === 'mascot') return `<div class="road"><span class="flag">🚩</span><span class="path"></span><span class="mascot" data-mascot>${theme.mascot.emoji}</span><span class="goal">${theme.door.closed}</span></div>`;
    return '';
  }

  // ── まいフレーム（かずは 1びょうに 1かい、えんばんは なめらかに。N-11）
  function frame(force = false) {
    if (stopped) return;
    const now = Date.now();
    if (now - lastTick > 250 || force) {
      lastTick = now;
      if (m.state === 'running') {
        const r = M.tick(m, now);
        if (r.events.length) { m = r.m; app.saveMission(m); handle(r.events); if (stopped) return; }
        else m = r.m;
        if (now - lastSave > 5000) { lastSave = now; app.saveMission(m); }
      }
    }
    const s = signature();
    if (s !== sig) { sig = s; build(); }
    const cur = M.current(m);
    if (!cur) return;
    const rem = M.remaining(m, now);
    const span = Math.max(1e-6, cur.end - cur.start);
    const frac = Math.max(0, Math.min(1, rem.item / span));
    const node = root.firstElementChild;
    const disc = $('[data-disc]', node); if (disc) disc.setAttribute('d', discPath(frac));
    const bar = $('[data-bar]', node); if (bar) bar.style.width = (frac * 100).toFixed(2) + '%';
    const mas = $('[data-mascot]', node); if (mas) mas.style.left = `calc(${((1 - frac) * 100).toFixed(2)}% * 0.82 + 4%)`;
    const prog = $('[data-prog]', node); if (prog) prog.style.width = ((1 - frac) * 100).toFixed(2) + '%';
    const n = $('[data-n]', node);
    if (n) { const p = bigParts(rem.item); if (n.textContent !== p.num) { n.textContent = p.num; $('[data-u]', node).textContent = p.unit; $('[data-num]', node).classList.toggle('over', rem.item <= 0); } }
    const tot = $('[data-total]', node);
    if (tot) {
      const left = Math.max(0, Math.ceil(rem.total - 1e-9));
      const txt = `${T('ぜんぶで のこり')} <b>${minText(left)}</b> <small>${T('おわり')} ${clock(M.wallMinute(m, m.tt.end))}</small>`;
      if (tot.dataset.t !== txt) { tot.dataset.t = txt; tot.innerHTML = txt; }
    }
    const wt = $('[data-wait]', node), db = $('[data-done]', node);
    if (wt && db) {
      const w = M.doneWait(m, now);
      db.disabled = w > 0;
      const msg = w > 0 ? T(`あと ${minText(Math.ceil(w - 1e-9))} で おせるよ`) : '';
      if (wt.dataset.t !== msg) { wt.dataset.t = msg; wt.innerHTML = msg; }
    }
    if (m.state === 'paused' && !$('.pause-over')) pauseOverlay();
  }
  function loop() { frame(); raf = requestAnimationFrame(loop); }

  // ── できごと
  function handle(events) {
    for (const e of events) {
      if (e.type === 'complete' && e.auto) {
        if (e.key) { play('coin'); banner(`${theme.key} ${T(theme.announce.key)}`); }
        else play('select');
      } else if (e.type === 'next') {
        const it = m.tt.items.find((x) => x.uid === e.uid);
        if (it && !busy) setTimeout(() => speak(M.missionText(it, minText)), 600);
      } else if (e.type === 'milestone') {
        const cur = M.current(m);
        const key = e.kind;
        const text = fill(theme.announce[key], { panel: cur ? cur.obj : '' });
        banner(`🔔 ${T(text)}`, e.silent);
        if (!e.silent) { if (!quiet()) play('correct'); speak(text); }
      } else if (e.type === 'overtime') {
        banner(`⏰ ${T(theme.announce.overtime)}`); if (!quiet()) play('charge'); speak(theme.announce.overtime);
      } else if (e.type === 'finish') {
        stop(); app.finished(m);
        return;
      }
    }
  }
  function banner(html, silent) {
    const b = $('[data-banner]', root); if (!b) return;
    b.innerHTML = html + (silent ? ` <small>${T('（おやすみ ちゅうに すぎたよ）')}</small>` : '');
    b.classList.add('on'); clearTimeout(bannerTimer); bannerTimer = setTimeout(() => b.classList.remove('on'), 4500);
  }

  // ── そうさ
  function wire(cur) {
    const node = root.firstElementChild;
    $('[data-view]', node).addEventListener('click', () => {
      play('tap');
      const list = VIEWS.map((x) => x[0]).filter((x) => profile.showNumbers || x !== 'numbers');
      profile.view = list[(list.indexOf(view()) + 1) % list.length]; saveProfile(); frame(true);
    });
    $('[data-done]', node).addEventListener('click', () => onDone(cur.uid));
    const pb = $('[data-pause]', node);
    if (parent.pauseLongPress) longPress(pb, 1500, doPause, (p) => { $('[data-press]', pb).style.width = (p * 100) + '%'; });
    else pb.addEventListener('click', doPause);
    $('[data-more]', node).addEventListener('click', onMore);
    $('[data-later]', node).addEventListener('click', () => {
      play('tap');
      const r = M.laterItem(m, Date.now());
      if (r.error) { toast(T(r.text || 'できないよ')); return; }
      toast(`↪ ${T(cur.obj)}${T('は あとで やろう')}`);
      commit(r.m, r.events);
    });
    $('[data-quit]', node).addEventListener('click', async () => {
      play('tap');
      if (await confirmBox('ミッションを おわる？', 'ここまでの カギと スターは のこるよ', 'おわる', 'つづける')) { const r = M.quit(m, Date.now()); commit(r.m, r.events); }
    });
  }

  async function onDone(uid) {
    if (busy) return;
    const at = Date.now();
    let r = M.finishItem(m, at, { uid });
    if (r.error === 'too_early') { play('tap'); toast(T(`あと ${minText(Math.ceil(r.wait - 1e-9))} で おせるよ`)); return; }
    if (r.error) return;
    busy = true;
    if (r.needChoice) {
      const choice = await chooseEarly(r.choices, r.spare);
      r = M.finishItem(m, at, { uid, choice });
      if (r.error) { busy = false; return; }
    }
    const cur = m.tt.items.find((x) => x.uid === uid);
    const comp = r.events.find((e) => e.type === 'complete');
    if (comp?.key && cur && !cur.auto) await starTap(comp.star);                 // F-506 ほしタップ → カギ
    busy = false;
    commit(r.m, r.events);
  }

  // F-506：ほしが でて、タップすると ひかる → カギを 1つ → 1.5びょうで つぎへ
  function starTap(star) {
    return new Promise((res) => {
      const { root: r, close } = modal(`<div class="star-tap"><button class="star" data-star aria-label="${T('ほしを タップ')}">⭐</button><p data-msg>${T('ほしを タップしてね！')}</p></div>`, { cls: 'clear', dismiss: false });
      let tapped = false;
      const go = async () => {
        if (tapped) return; tapped = true;
        play('correct');
        $('[data-star]', r).classList.add('lit');
        $('[data-msg]', r).innerHTML = `+${star} ${T('スター')}<br><span class="key">${theme.key}</span> ${T(theme.announce.key)}`;
        speak(theme.announce.key);
        await wait(1500);
        close(); res();
      };
      $('[data-star]', r).addEventListener('click', go);
      setTimeout(go, 8000);                                                     // タップ しなくても すすむ
    });
  }

  // 4.3-8 はやく おわった：つぎへ／さいごの ごほうびに たす／ちょっと きゅうけい。えらばなければ 10びょうで つぎへ
  function chooseEarly(choices, spare) {
    return new Promise((res) => {
      const label = { next: '▶ つぎへ すすむ', reward: '🎁 さいごの ごほうびに たす', rest: '☕ ちょっと きゅうけい' };
      const mins = Math.max(1, Math.floor(spare));
      const { root: r, close } = modal(`<h2>${T('はやく おわったね！')}</h2><p>${T(`あと ${minText(mins)} あるよ。どうする？`)}</p>
        <div class="col">${choices.map((c) => `<button class="btn" data-c="${c}">${T(label[c])}</button>`).join('')}</div><div class="countdown"><i data-cd></i></div>`, { dismiss: false });
      let doneFlag = false;
      const pick = (c) => { if (doneFlag) return; doneFlag = true; play('select'); close(); res(c); };
      $$('[data-c]', r).forEach((b) => b.addEventListener('click', () => pick(b.dataset.c)));
      const t0 = Date.now();
      const tickCd = () => { if (doneFlag) return; const p = (Date.now() - t0) / 10000; $('[data-cd]', r).style.width = Math.max(0, 100 - p * 100) + '%'; if (p >= 1) pick('next'); else requestAnimationFrame(tickCd); };
      tickCd();
    });
  }

  function onMore() {
    play('tap');
    const r = M.extendItem(m, Date.now());
    if (r.m !== m && !r.error) { toast(`＋5 ${T('もうすこし！ がんばれ！')}`); commit(r.m); return; }
    if (r.error === 'no_room') {
      const fx = r.fixes || [];
      const { root: mr, close } = modal(`<h2>${T('うしろの パネルを もう ちぢめられないよ')}</h2><div class="col">
        ${fx.map((f, i) => `<button class="btn" data-fx="${i}">${T(f.id === 'stop' ? '{今日|きょう}は ここまで にする' : f.text)}</button>`).join('')}
        <button class="btn gray" data-close>${T('このまま つづける')}</button></div>`);
      $$('[data-fx]', mr).forEach((b) => b.addEventListener('click', () => {
        const f = fx[Number(b.dataset.fx)]; close();
        if (f.id === 'extendEnd') { const e = M.extendItem(m, Date.now(), { endExtend: true }); if (!e.error) { toast(T('おわりを 5ふん のばしたよ')); commit(e.m); } }
        else { const q = M.quit(m, Date.now()); commit(q.m, q.events); }
      }));
      return;
    }
    toast(T(r.text || 'もうすこし は ここまで だよ'));
  }

  function doPause() {
    if (m.state !== 'running') return;
    play('tap'); hush();
    commit(M.pause(m, Date.now()));
  }
  function pauseOverlay() {
    const { root: r, close } = modal(`<div class="pause-over"><div class="big">⏸</div><h2>${T('いちじていし ちゅう')}</h2><p>${T('とまって いた ぶん、おわりも うしろへ ずれるよ')}</p><button class="btn big" data-resume>▶ ${T('つづける')}</button></div>`, { dismiss: false });
    $('[data-resume]', r).addEventListener('click', () => { play('select'); close(); commit(M.resume(m, Date.now())); });
  }

  function stop() { stopped = true; cancelAnimationFrame(raf); clearTimeout(bannerTimer); keepAwake(false); hush(); }
  const onVis = () => { if (!document.hidden) frame(true); };                    // F-510 ふっきしたら すぐに さいけいさん
  document.addEventListener('visibilitychange', onVis);
  loop();
  return () => { stop(); document.removeEventListener('visibilitychange', onVis); $$('.modal-back').forEach((x) => x.remove()); };
}

export { fullscreen };
