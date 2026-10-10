// たたかいの がめん
import * as B from '../engine/battle.js';
import { CARDS, ELEMENTS, cardCost } from '../data/cards.js';
import { ARCANA } from '../data/arcana.js';
import { HANDS, handStats } from '../data/hands.js';
import { ENEMIES, RULES } from '../data/enemies.js';
import { SCROLLS } from '../data/scrolls.js';
import { T } from '../text.js';
import { el, $, $$ } from '../util.js';
import { sfx, playBgm } from '../audio.js';
import { settings, mark } from '../save.js';
import { cardHtml, cardEl } from './cardview.js';
import { enemyArt } from './art.js';
import { swirl } from './bg.js';
import { bgHtml, topbarHtml, updateTopbar, heroArt } from './common.js';
import { cardDetail, arcanaHtml, arcanaDetail, handsTable, challengePrompt, guide, confirmBox, elementPicker, chooseBox, scrollDetail } from './modal.js';
import * as FX from './fx.js';
import { ACTS } from '../engine/run.js';

export function battleScreen(app, enemyIds, kind) {
  return new Promise((resolve) => {
    const run = app.run;
    const { rng, save } = app.rng();
    const b = B.createBattle(run, enemyIds, kind, rng);
    const ui = { input: false, mode: 'play', sel: new Set(), peek: false, enemyNodes: new Map(), resolveTurn: null, pendingInstant: null };
    app.dbg = { b, ui };
    enemyIds.forEach((id) => mark('enemies', id));

    const root = el(`<div class="screen battle fade-in">
      ${bgHtml()}
      ${topbarHtml(run)}
      <div class="main">
        <div class="scorepanel">
          <div class="rule-box"></div>
          <div class="hand-name" title="やくの いちらん"><div class="hn">–</div><div class="hl"></div></div>
          <div class="pm"><div class="box p"><small>ちから</small><span>0</span></div><div class="x">×</div><div class="box m"><small>ばいりつ</small><span>0</span></div></div>
          <div class="total"><div class="tl">${T('ダメージ')}</div><div class="tv">–</div></div>
          <div class="res-row">
            <div class="res mana"><div class="rv">3</div><div class="rl">${T('マナ')}</div><div class="gems"></div></div>
            <div class="res disc"><div class="rv">1</div><div class="rl">${T('いれかえ')}</div></div>
          </div>
          <div class="board-label">${T('けっかい')}</div>
          <div class="board"></div>
        </div>
        <div class="field">
          <div class="arcana-bar"><span class="lbl">${T('アルカナ')}</span><div class="arcana-row"></div></div>
          <div class="arena">
            <div class="hero"><div class="h-art">${heroArt(run)}</div><div class="plate"></div>
              <div style="position:relative;margin-top:4px"><div class="shield-badge" style="display:none"></div><div class="bar"><div class="g"></div><div class="f"></div><div class="t"></div></div></div>
            </div>
            <div class="enemies"></div>
          </div>
          <div class="spellrow">
            <div class="slots"></div>
            <div class="spell-btns">
              <button class="btn cast-btn">${T('はなつ！')}</button>
              <div class="row" style="gap:8px;flex-wrap:nowrap">
                <button class="btn dark small" data-redraw style="flex:1;font-size:15px;padding:0 8px">🔄${T('いれかえ')}</button>
                <button class="btn dark small" data-peek style="width:52px;padding:0" title="みとおし">🔍</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="handzone">
        <div class="pile" data-pile="draw"><span class="num">0</span>${T('やま')}</div>
        <div class="hand"></div>
        <div class="pile disc" data-pile="disc"><span class="num">0</span>${T('すてふだ')}</div>
      </div>
    </div>`);
    app.mount(root);
    swirl($('canvas.swirl', root), ACTS[run.act].theme);
    app.wireTopbar(root, { inBattle: true, battle: b, refresh: () => renderAll(), onScroll: useScroll });
    playBgm(kind === 'boss' ? 'boss' : 'battle');

    const handEl = $('.hand', root), slotsEl = $('.slots', root), enemiesEl = $('.enemies', root);
    const castBtn = $('.cast-btn', root), redrawBtn = $('[data-redraw]', root), peekBtn = $('[data-peek]', root);
    const heroEl = $('.hero', root), heroArtEl = $('.h-art', root);
    const pBox = $('.box.p span', root), mBox = $('.box.m span', root), totalEl = $('.total .tv', root), handNameEl = $('.hand-name', root);

    // ───── えがく ─────
    function renderHero(hp = run.hp, block = b.pBlock) {
      $('.hero .f', root).style.width = Math.max(0, hp / run.maxHp * 100) + '%';
      $('.hero .g', root).style.width = Math.max(0, hp / run.maxHp * 100) + '%';
      $('.hero .t', root).textContent = `${hp} / ${run.maxHp}`;
      const sb = $('.hero .shield-badge', root); sb.style.display = block > 0 ? '' : 'none'; sb.textContent = block;
      updateTopbar(root, run, hp);
    }
    function enemyHtml(e) {
      return `<div class="enemy ${e.boss ? 'boss' : ''} spawn" data-uid="${e.uid}"><div class="intent"></div><div class="e-art">${enemyArt(e.art)}</div><div class="e-name">${T(e.name)}</div>
        <div style="position:relative;margin-top:2px"><div class="shield-badge" style="display:none"></div><div class="bar" style="width:${e.boss ? 200 : 150}px"><div class="g"></div><div class="f"></div><div class="t"></div></div></div><div class="estat"></div></div>`;
    }
    function updateEnemy(e, hp = e.hp, block = e.block) {
      let n = ui.enemyNodes.get(e.uid);
      if (!n) {
        n = el(enemyHtml(e));
        n.addEventListener('click', () => { if (!ui.input || e.hp <= 0) return; b.target = e.uid; sfx('select'); renderEnemies(); renderPreview(); });
        enemiesEl.appendChild(n); ui.enemyNodes.set(e.uid, n);
        setTimeout(() => n.classList.remove('spawn'), 600);
      }
      $('.f', n).style.width = Math.max(0, hp / e.maxHp * 100) + '%';
      $('.g', n).style.width = Math.max(0, hp / e.maxHp * 100) + '%';
      $('.t', n).textContent = `${hp} / ${e.maxHp}`;
      const sb = $('.shield-badge', n); sb.style.display = block > 0 ? '' : 'none'; sb.textContent = block;
      const it = B.intentInfo(b, e);
      const iEl = $('.intent', n); iEl.className = `intent ${it.kind}`; iEl.innerHTML = `<span>${it.icon}</span><span>${it.text}</span>`;
      iEl.style.visibility = e.hp > 0 ? '' : 'hidden';
      const st = [];
      if (e.str) st.push(`<span>💪 +${e.str}</span>`);
      if (e.weak) st.push(`<span>❄️ ${T('よわり')} ${e.weak}</span>`);
      if (e.vuln) st.push(`<span>👁️ ${T('もろい')}</span>`);
      $('.estat', n).innerHTML = st.join('');
      const t = B.target(b);
      n.classList.toggle('target', !!t && t.uid === e.uid && B.alive(b).length > 1);
      if (e.hp <= 0) n.classList.add('dead');
    }
    function renderEnemies() { b.enemies.forEach((e) => updateEnemy(e)); }
    function renderRule() {
      const r = b.rule ? RULES[b.rule] : null;
      $('.rule-box', root).innerHTML = r ? `<b>${r.icon} ${T(r.name)}</b>${T(r.text)}` : '';
    }
    function renderArcana() {
      const row = $('.arcana-row', root);
      row.innerHTML = '';
      for (let i = 0; i < 5; i++) {
        const a = run.arcana[i];
        row.insertAdjacentHTML('beforeend', a ? arcanaHtml(a) : '<div class="arc empty"></div>');
      }
      $$('[data-auid]', row).forEach((n) => n.addEventListener('click', async () => {
        sfx('tap');
        const a = run.arcana.find((x) => x.uid === n.dataset.auid);
        const r = await arcanaDetail(a, { move: ui.input });
        if (r && r.move) { const i = run.arcana.indexOf(a), j = i + r.move; if (j >= 0 && j < run.arcana.length) { [run.arcana[i], run.arcana[j]] = [run.arcana[j], run.arcana[i]]; renderArcana(); renderPreview(); } }
      }));
    }
    function renderBoard() {
      const bd = $('.board', root);
      bd.innerHTML = b.board.map((a) => `<div class="bt" data-buid="${a.uid}"><span class="bi">${CARDS[a.id].icon}</span><span><span class="bn">${T(CARDS[a.id].name)}${a.up ? '＋' : ''}</span>${a.n ? ` <b style="color:var(--gold-hi)">${a.n}</b>` : ''}</span></div>`).join('') || `<div style="font-size:12px;color:var(--ink-dim)">${T('まだ ない')}</div>`;
      $$('[data-buid]', bd).forEach((n) => n.addEventListener('click', () => { const a = b.board.find((x) => x.uid === n.dataset.buid); sfx('tap'); cardDetail(a.src || a); }));
    }
    function renderRes() {
      $('.res.mana .rv', root).textContent = b.mana;
      const max = Math.max(3, b.mana);
      $('.res.mana .gems', root).innerHTML = Array.from({ length: Math.min(6, max) }, (_, i) => `<i class="${i < b.mana ? '' : 'off'}"></i>`).join('');
      $('.res.disc .rv', root).textContent = b.discardsLeft;
    }
    function slotLimit() { return B.slotLimit(b); }
    function renderSlots() {
      slotsEl.innerHTML = '';
      const pv = B.preview(b);
      const members = new Set(pv.handSlots);
      for (let i = 0; i < B.SLOT_MAX; i++) {
        const inst = b.slots[i];
        const locked = i >= slotLimit();
        const s = el(`<div class="slot ${locked ? 'locked' : ''}" data-slot="${i}">${locked ? '🔒' : i + 1}</div>`);
        if (inst) {
          const c = cardEl(inst, { cls: [members.has(i) ? 'member' : '', pv.blockedIdx.includes(i) ? 'blocked-r' : ''].join(' ') });
          s.appendChild(c);
          bindCard(c, inst, 'slot');
        }
        slotsEl.appendChild(s);
      }
      renderPreview(pv);
    }
    function renderPreview(pv = B.preview(b)) {
      const H = HANDS[pv.hand.best];
      const lv = (run.handLv[pv.hand.best] || 1);
      $('.hn', handNameEl).innerHTML = T(H.name);
      $('.hl', handNameEl).textContent = pv.hand.best === 'none' ? '' : `Lv ${lv}` + (pv.hand.best === 'kuku' ? `　${pv.hand.members.kukuEq}` : pv.hand.best === 'ten' ? `　${pv.hand.members.tenEq}` : '');
      const hs = handStats(pv.hand.best, lv);
      const show = !settings.challenge || ui.peek;
      pBox.textContent = show ? pv.power : hs.power;
      mBox.textContent = show ? pv.mult : hs.mult;
      totalEl.textContent = !b.slots.some(Boolean) ? '–' : show ? pv.total : '？';
      $('.total', root).classList.toggle('burn', show && pv.total >= 1000);
      // てきに よそう ダメージ
      $$('.dmg-tag', enemiesEl).forEach((n) => n.remove());
      if (show && pv.total > 0 && ui.input) {
        const t = B.target(b);
        const n = t && ui.enemyNodes.get(t.uid);
        if (n) $('.e-art', n).appendChild(el(`<div class="dmg-tag">−${t.vuln ? pv.total * 2 : pv.total}${pv.total * (t.vuln ? 2 : 1) >= t.hp + t.block ? ' 💀' : ''}</div>`));
      }
      const any = b.slots.some(Boolean);
      castBtn.innerHTML = any ? T('はなつ！') : T('パス');
      castBtn.classList.toggle('ready', any && ui.input);
      castBtn.classList.toggle('dark', !any);
      redrawBtn.disabled = !ui.input || b.discardsLeft <= 0;
      redrawBtn.classList.toggle('gold', ui.mode === 'redraw');
      peekBtn.style.display = settings.challenge ? '' : 'none';
      peekBtn.disabled = !ui.input || ui.peek;
      renderRes();
    }
    function renderHand(newOnes = []) {
      handEl.innerHTML = '';
      const avail = handEl.offsetWidth || 900;
      const n = Math.max(1, b.hand.length);
      const mg = Math.max(-44, Math.min(5, (avail - n * 112) / n / 2));
      if (!b.hand.length) handEl.appendChild(el(`<div class="hand-msg">${T('てふだは ない')}</div>`));
      b.hand.forEach((inst) => {
        const c = CARDS[inst.id];
        const dim = ui.input && ui.mode === 'play' && ((c.type === 'spell' && cardCost(inst) > b.mana) || ((c.type === 'instant' || c.type === 'aura') && cardCost(inst) > b.mana) || (c.type === 'spell' && b.rule === 'noSpells'));
        const targetDim = ui.mode === 'target' && (inst.id !== 'rune' || inst === ui.pendingInstant);
        const node = cardEl(inst, { cls: [dim || targetDim ? 'dim' : '', ui.sel.has(inst) ? 'selected-x' : ''].join(' ') });
        node.style.margin = `0 ${mg}px`;
        const k = newOnes.indexOf(inst);
        if (k >= 0) { node.classList.add('drawn'); node.style.animationDelay = (k * 0.06) + 's'; }
        handEl.appendChild(node);
        bindCard(node, inst, 'hand');
      });
      $('[data-pile=draw] .num', root).textContent = b.draw.length;
      $('[data-pile=disc] .num', root).textContent = b.discard.length;
      renderSelectBar();
    }
    function renderSelectBar() {
      $$('.select-bar', root).forEach((n) => n.remove());
      if (ui.mode === 'redraw') {
        const bar = el(`<div class="select-bar">${T(`すてる カードを えらんでね（${ui.sel.size}{枚|まい}）`)}<button class="btn small gold" data-ok ${ui.sel.size ? '' : 'disabled'}>${T('いれかえる')}</button><button class="btn small dark" data-cancel>${T('やめる')}</button></div>`);
        $('.handzone', root).appendChild(bar);
        $('[data-ok]', bar).addEventListener('click', doRedraw);
        $('[data-cancel]', bar).addEventListener('click', () => { sfx('tap'); ui.mode = 'play'; ui.sel.clear(); renderHand(); renderPreview(); });
      } else if (ui.mode === 'target') {
        const bar = el(`<div class="select-bar">${T(`${CARDS[ui.pendingInstant.id].name}：ルーンを 1{枚|まい} えらんでね`)}<button class="btn small dark" data-cancel>${T('やめる')}</button></div>`);
        $('.handzone', root).appendChild(bar);
        $('[data-cancel]', bar).addEventListener('click', () => { sfx('tap'); ui.mode = 'play'; ui.pendingInstant = null; renderHand(); });
      }
    }
    function renderAll() { renderHero(); renderEnemies(); renderRule(); renderArcana(); renderBoard(); renderSlots(); renderHand(); }

    // ───── そうさ ─────
    function flipFrom(rect, node) {
      if (!rect || !node) return;
      const r2 = node.getBoundingClientRect(); const sc = r2.width / node.offsetWidth || 1;
      node.animate([{ transform: `translate(${(rect.left - r2.left) / sc}px, ${(rect.top - r2.top) / sc}px)` }, { transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.2,.9,.4,1)' });
    }
    function after(inst, rect) { renderSlots(); renderHand(); flipFrom(rect, root.querySelector(`.card[data-uid="${inst.uid}"]`)); }
    async function tapHand(inst, node) {
      const c = CARDS[inst.id];
      if (ui.mode === 'redraw') { if (ui.sel.has(inst)) ui.sel.delete(inst); else if (ui.sel.size < 7) ui.sel.add(inst); sfx('tap'); renderHand(); return; }
      if (ui.mode === 'target') {
        if (inst.id !== 'rune' || inst === ui.pendingInstant) { sfx('wrong'); return; }
        const ins = ui.pendingInstant; let choice = { uid: inst.uid };
        if (ins.id === 'paint') { const e = await elementPicker(inst.el); if (!e) return; choice.el = e; }
        if (ins.id === 'shift') { const d = await chooseBox('どっちに する？', `いまの {数|かず}は ${inst.v}`, [{ label: `−1（${Math.max(1, inst.v - 1)}）`, value: -1, cls: 'blue' }, { label: `+1（${Math.min(10, inst.v + 1)}）`, value: 1 }]); if (!d) return; choice.delta = d; }
        const r = B.playCard(b, ins, choice);
        ui.mode = 'play'; ui.pendingInstant = null;
        if (r.err) { FX.toast(T(r.err), '⚠️', 1600); renderHand(); return; }
        sfx('upgrade'); renderAll();
        const n2 = root.querySelector(`.hand .card[data-uid="${inst.uid}"]`); if (n2) FX.retrigger(n2, 'drawn', 400);
        return;
      }
      if (c.unplayable) { sfx('wrong'); FX.shake(node); FX.toast(T('この カードは つかえない'), '💤', 1500); return; }
      if (c.type === 'rune' || c.type === 'spell') {
        const err = B.canPlace(b, inst);
        if (err) { sfx('wrong'); FX.shake(node); FX.toast(T(err), '⚠️', 1500); return; }
        const rect = node.getBoundingClientRect();
        B.placeCard(b, inst);
        sfx('place');
        after(inst, rect);
        tutorialAfterPlace(inst);
        return;
      }
      // インスタント / けっかい
      if (cardCost(inst) > b.mana) { sfx('wrong'); FX.shake(node); FX.toast(T('マナが たりない'), '💠', 1500); return; }
      if (c.type === 'instant' && c.target === 'rune') {
        if (!b.hand.some((h) => h.id === 'rune')) { sfx('wrong'); FX.toast(T('てふだに ルーンが ない'), '⚠️', 1500); return; }
        ui.mode = 'target'; ui.pendingInstant = inst; sfx('tap'); renderHand(); return;
      }
      const r = B.playCard(b, inst);
      if (r.err) { sfx('wrong'); FX.toast(T(r.err), '⚠️', 1500); return; }
      sfx(c.type === 'aura' ? 'buff' : 'upgrade');
      await showEvents(r.ev);
      renderAll();
      if (c.type === 'aura') guide('bt_aura2', 'けっかいを はった！ ひだりの パネルに のこって、たたかいが おわるまで ずっと はたらくよ。');
    }
    function tapSlot(inst, node) {
      if (ui.mode !== 'play') return;
      const rect = node.getBoundingClientRect();
      B.unplaceCard(b, inst); sfx('unplace'); after(inst, rect);
    }
    function bindCard(node, inst, zone) {
      node.addEventListener('pointerdown', (e) => {
        if (e.button > 0) return;
        const sx = e.clientX, sy = e.clientY, pid = e.pointerId;
        let dragging = false, ghost = null, longFired = false, over = null;
        try { node.setPointerCapture(pid); } catch (er) { /* */ }
        const longT = setTimeout(() => { if (!dragging) { longFired = true; sfx('page'); cardDetail(inst); } }, 480);
        const toStage = (x, y) => { const r = app.stage.getBoundingClientRect(); const sc = r.width / app.stage.offsetWidth; return { x: (x - r.left) / sc, y: (y - r.top) / sc }; };
        const findSlot = (x, y) => { const h = document.elementFromPoint(x, y); const s = h && h.closest('.slot'); return s ? Number(s.dataset.slot) : (h && h.closest('.handzone') ? 'hand' : null); };
        const move = (ev) => {
          if (ev.pointerId !== pid) return;
          if (!dragging && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 12 && ui.input && ui.mode === 'play' && !longFired && ['rune', 'spell'].includes(CARDS[inst.id].type)) {
            dragging = true; clearTimeout(longT);
            ghost = node.cloneNode(true); ghost.classList.add('card-ghost'); app.stage.appendChild(ghost); node.style.opacity = '.35';
          }
          if (dragging) {
            const p = toStage(ev.clientX, ev.clientY); ghost.style.left = (p.x - 56) + 'px'; ghost.style.top = (p.y - 78) + 'px';
            const t = findSlot(ev.clientX, ev.clientY);
            const ne = typeof t === 'number' ? slotsEl.children[t] : null;
            if (over !== ne) { over && over.classList.remove('over'); ne && ne.classList.add('over'); over = ne; }
          }
        };
        const up = (ev) => {
          if (ev.pointerId !== pid) return;
          clearTimeout(longT);
          node.removeEventListener('pointermove', move); node.removeEventListener('pointerup', up); node.removeEventListener('pointercancel', up);
          over && over.classList.remove('over');
          if (dragging) {
            ghost.remove(); node.style.opacity = '';
            const t = ev.type === 'pointerup' ? findSlot(ev.clientX, ev.clientY) : null;
            if (t === null || !ui.input) { renderSlots(); renderHand(); return; }
            const rect = node.getBoundingClientRect();
            if (zone === 'hand' && typeof t === 'number') {
              const err = B.canPlace(b, inst);
              if (err) { sfx('wrong'); FX.toast(T(err), '⚠️', 1500); renderHand(); return; }
              B.placeCard(b, inst);
              const from = b.slots.indexOf(inst); B.moveSlot(b, from, t);
              sfx('place'); after(inst, rect); tutorialAfterPlace(inst);
            } else if (zone === 'slot' && typeof t === 'number') {
              B.moveSlot(b, b.slots.indexOf(inst), t); sfx('place'); after(inst, rect);
            } else if (zone === 'slot' && t === 'hand') { B.unplaceCard(b, inst); sfx('unplace'); after(inst, rect); }
            return;
          }
          if (longFired || ev.type !== 'pointerup' || !ui.input) return;
          if (zone === 'hand') tapHand(inst, node); else tapSlot(inst, node);
        };
        node.addEventListener('pointermove', move); node.addEventListener('pointerup', up); node.addEventListener('pointercancel', up);
      });
    }
    async function doRedraw() {
      if (!ui.sel.size) return;
      sfx('shuffle');
      const drawn = B.redraw(b, [...ui.sel]);
      ui.sel.clear(); ui.mode = 'play';
      renderHand((drawn || []).filter((d) => d.id)); renderPreview();
    }
    redrawBtn.addEventListener('click', () => {
      if (!ui.input || b.discardsLeft <= 0) return;
      sfx('tap');
      if (ui.mode === 'redraw') { ui.mode = 'play'; ui.sel.clear(); } else { ui.mode = 'redraw'; ui.sel.clear(); guide('bt_redraw', 'いれかえ：いらない カードを タップして えらび、「いれかえる」で すてて、おなじ {枚|まい}すうを ひきなおすよ。ほしい ルーンを さがそう！'); }
      renderHand(); renderPreview();
    });
    peekBtn.addEventListener('click', async () => {
      if (!ui.input || ui.peek) return;
      sfx('tap');
      if (!(await confirmBox('みとおしの め', 'ダメージを さきに みる？　この ターンは けいさん チャレンジの ボーナスが なくなるよ。', 'みる', 'やめる'))) return;
      ui.peek = true; renderPreview();
    });
    handNameEl.addEventListener('click', () => { sfx('tap'); handsTable(run.handLv, B.preview(b).hand.best); });
    $('[data-pile=draw]', root).addEventListener('click', () => { sfx('tap'); import('./modal.js').then((M) => M.deckView(b.draw, { title: 'やま', sub: 'じゅんばんは ひみつ' })); });
    $('[data-pile=disc]', root).addEventListener('click', () => { sfx('tap'); import('./modal.js').then((M) => M.deckView(b.discard, { title: 'すてふだ' })); });
    castBtn.addEventListener('click', async () => {
      if (!ui.input) return;
      sfx('tap');
      if (ui.mode !== 'play') { ui.mode = 'play'; ui.sel.clear(); renderHand(); }
      if (!b.slots.some(Boolean) && !(await confirmBox('なにも しない？', 'じゅもんが からっぽだよ。このまま ターンを おわる？', 'おわる', 'もどる'))) return;
      ui.input = false; renderPreview(); renderHand();
      ui.resolveTurn && ui.resolveTurn();
    });

    async function useScroll(i) {
      const s = run.scrolls[i];
      if (!s) return;
      const d = SCROLLS[s.id];
      const can = ui.input && (d.where === 'any' || d.where === 'battle');
      const r = await scrollDetail(s, { canUse: can, sell: true });
      if (r === 'drop') { run.scrolls.splice(i, 1); updateTopbar(root, run); return; }
      if (r !== 'use') return;
      run.scrolls.splice(i, 1);
      if (s.id === 'star') { run.handLv[s.hand] = (run.handLv[s.hand] || 1) + 1; sfx('upgrade'); FX.toast(T(`「${HANDS[s.hand].name}」が Lv${run.handLv[s.hand]} に なった！`), '📘'); }
      if (s.id === 'potion') { const h = Math.min(run.maxHp - run.hp, 20); run.hp += h; sfx('heal'); FX.toast(T(`HP +${h}`), '🧪'); }
      if (s.id === 'mana') { b.mana += 2; sfx('upgrade'); }
      if (s.id === 'bomb') {
        const t = B.target(b);
        if (t && b.lastDamage) { t.hp = Math.max(0, t.hp - b.lastDamage); sfx('crit'); const n = ui.enemyNodes.get(t.uid); FX.retrigger(n, 'hit', 380); const p = FX.posOf($('.e-art', n)); FX.floatText(p.x, p.y, b.lastDamage, 'big'); if (t.hp <= 0) { n.classList.add('dead'); } if (!B.alive(b).length) { b.over = 'win'; ui.input = false; ui.resolveTurn && ui.resolveTurn(); } }
        else FX.toast(T('まだ ダメージを あたえて いない'), '💣');
      }
      renderAll();
    }

    // ───── チュートリアル ─────
    let placedOnce = false;
    function tutorialAfterPlace(inst) {
      if (!placedOnce) { placedOnce = true; guide('bt_cast', 'いいね！ ルーンの {数|かず}が「{力|ちから}」に なるよ。おなじ {数|かず}の ルーンを 2{枚|まい} いれると「ペア」の {役|やく}！ よういが できたら「はなつ！」。ダメージ ＝ {力|ちから} × {倍率|ばいりつ}', { spot: $('.scorepanel', root) }); }
      const c = CARDS[inst.id];
      if (c.type === 'spell') guide('bt_mana', 'スペルカードは マナを つかうよ（ひだりうえの {青|あお}い {数|かず}）。マナは まいターン 3つ もどる。');
      if (['inferno', 'phoenix', 'deepSea', 'square', 'storm', 'eclipse', 'grow'].includes(inst.id)) guide('bt_order', '「×」の カードは じゅんばんが だいじ！ 「+2 してから ×2」と「×2 してから +2」では こたえが ちがう。×は みぎの ほうに おくと つよいよ。ドラッグで ならびかえ できる！');
    }
    async function tutorialStart() {
      await guide('bt_intro', 'ぼくは ノクス。たたかいの しかたを おしえるよ。{敵|てき}の うえの ふきだしは {次|つぎ}に する こと。⚔️は {攻撃|こうげき}、🛡️は {守|まも}りだ。', { spot: enemiesEl });
      await guide('bt_rune', 'したの {手札|てふだ}から ルーンを タップして、じゅもんの わくに いれよう。わくには 5{枚|まい}まで はいるよ。', { spot: $('.spellrow', root) });
      if (run.arcana.length) await guide('bt_arcana', 'うえに あるのが アルカナ。ずっと はたらく おまもりで、ひだりから じゅんばんに こうかが でる。タップすると せつめいと ならびかえ が できるよ。', { spot: $('.arcana-bar', root) });
      if (b.rule) await guide('bt_rule', `${RULES[b.rule].icon} のろい！ つよい {敵|てき}は とくべつな ルールを もっている。ひだりうえを よく みて、のろいに あわせた じゅもんを くもう。`, { spot: $('.rule-box', root) });
      if (b.hand.some((c) => CARDS[c.id].type === 'aura')) await guide('bt_aura', 'けっかいカードは タップで ばに はれる。はると たたかいが おわるまで ずっと はたらくよ。');
      if (b.hand.some((c) => CARDS[c.id].type === 'instant')) await guide('bt_instant', 'インスタントカードは タップすると すぐ こうかが でる。マナを つかうよ。');
    }

    // ───── スコアの アニメ ─────
    function srcNode(s) {
      const src = s.src || {};
      if (src.kind === 'arcana') return root.querySelector(`.arc[data-auid="${src.uid}"]`);
      if (src.kind === 'board') return root.querySelector(`.bt[data-buid="${src.uid}"]`);
      if (src.kind === 'hand') return handNameEl;
      if (src.kind === 'buff') return $('.pm', root);
      if (src.kind === 'rule') return $('.rule-box', root) || $('.pm', root);
      const slot = src.slot ?? s.slot;
      if (slot != null && slot >= 0 && slot < B.SLOT_MAX) return slotsEl.children[slot];
      return $('.pm', root);
    }
    function pop(node, text, cls) {
      if (!node) return;
      const below = node.classList.contains('arc');
      const p = FX.posOf(node, 0.5, below ? 1 : 0);
      if (below) p.y += 62;
      const n = el(`<div class="pop-num ${cls}" style="left:${p.x}px;top:${p.y}px">${text}</div>`);
      FX.fxLayer().appendChild(n); setTimeout(() => n.remove(), 800);
    }
    async function animateScore(ctx, hideTotal) {
      const slots = [...slotsEl.children];
      let k = 0, delay = 380;
      for (const s of ctx.steps) {
        const node = srcNode(s);
        const src = s.src || {};
        if (src.kind === 'arcana' || src.kind === 'board') FX.retrigger(node, 'fire', 340);
        slots.forEach((sl, i) => sl.classList.toggle('scoring', i === (src.slot ?? -9) && src.kind !== 'arcana'));
        switch (s.kind) {
          case 'hand': {
            $('.hn', handNameEl).innerHTML = T(HANDS[s.label].name);
            FX.retrigger(handNameEl, 'pop', 400); sfx('handName');
            pBox.textContent = s.power; mBox.textContent = s.mult;
            FX.retrigger(pBox.parentElement, 'bump', 250); FX.retrigger(mBox.parentElement, 'bump', 250);
            await FX.wait(520); continue;
          }
          case 'power': pop(node, `+${s.n}`, 'p'); pBox.textContent = s.power; FX.retrigger(pBox.parentElement, 'bump', 230); sfx('chip', k++); break;
          case 'mult': pop(node, `+${s.n} ${T('{倍率|ばいりつ}')}`, 'm'); mBox.textContent = s.mult; FX.retrigger(mBox.parentElement, 'bump', 230); sfx('multUp', k++); break;
          case 'xmult': pop(node, `×${s.n}`, 'x'); mBox.textContent = s.mult; FX.retrigger(mBox.parentElement, 'bump', 230); sfx('xmult'); FX.shake($('.pm', root)); break;
          case 'xpower': pop(node, `×${s.n}`, 'p'); pBox.textContent = s.power; FX.retrigger(pBox.parentElement, 'bump', 230); sfx('xmult'); break;
          case 'shield': pop(node, `🛡️+${s.n}`, 's'); renderHero(run.hp, b.pBlock + s.shield); sfx('block'); break;
          case 'coin': pop(node, `🪙+${s.n}`, 'c'); sfx('coin'); break;
          case 'blocked': pop(node, '🚫', 'n'); sfx('wrong'); break;
          case 'half': pop($('.pm', root), '÷2', 'n'); pBox.textContent = s.power; sfx('sub'); break;
          case 'cond': pop(node, `${T(s.label)} ${s.ok ? '⭕' : '❌'}`, 'n'); sfx('cond', s.ok); break;
          default: if (s.label) pop(node, T(s.label), 'n'); break;
        }
        await FX.wait(delay);
        delay = Math.max(130, delay * 0.92);
      }
      slots.forEach((sl) => sl.classList.remove('scoring'));
      await FX.wait(200);
      if (hideTotal) { totalEl.textContent = '？'; FX.retrigger($('.pm', root), 'bump', 300); sfx('handName'); await FX.wait(300); return; }
      totalEl.textContent = ctx.total;
      $('.total', root).classList.toggle('burn', ctx.total >= 1000);
      FX.retrigger($('.total', root), 'bump', 300);
      sfx('total');
      if (ctx.total >= 1000) FX.flashScreen('rgba(255,140,60,.35)');
      await FX.wait(500);
    }

    async function showEvents(ev) {
      for (const e of ev) {
        const hp = FX.posOf(heroEl, 0.5, 0.35);
        if (e.t === 'draw') { renderHand((e.cards || []).filter((x) => x.id)); sfx('draw'); }
        if (e.t === 'mana') { FX.floatText(hp.x, hp.y - 40, `💠+${e.n}`, 'note'); sfx('upgrade'); }
        if (e.t === 'pblock') { FX.floatText(hp.x, hp.y, `🛡️+${e.n}`, 'block'); sfx('block'); }
        if (e.t === 'buff') { FX.floatText(hp.x, hp.y - 40, e.k === 'mult' ? `+${e.n} ${T('{倍率|ばいりつ}')}` : `+${e.n}`, 'note'); sfx('buff'); }
        if (e.t === 'discards') { FX.floatText(hp.x, hp.y - 40, `🔄+${e.n}`, 'note'); sfx('upgrade'); }
        if (e.t === 'selfdmg') { FX.floatText(hp.x, hp.y, `−${e.n}`); sfx('hurt'); }
        if (e.t === 'heal') { FX.floatText(hp.x, hp.y, `+${e.n}`, 'heal'); sfx('heal'); }
        if (e.t === 'coins') { sfx('coin'); }
        if (e.t === 'glass') { FX.toast(T('ガラスの ルーンが われた…'), '🔷', 1800); sfx('kill'); }
        if (e.t === 'estatus') { const n = ui.enemyNodes.get(e.uid); const p = FX.posOf($('.e-art', n)); FX.floatText(p.x, p.y - 30, e.k === 'weak' ? `❄️ ${T('よわり')}` : `👁️ ${T('もろい')}`, 'note'); sfx('curse'); }
        await FX.wait(260);
      }
      renderHero(); renderEnemies(); renderBoard(); renderRes();
    }

    async function animateHits(res) {
      heroArtEl.classList.remove('cast'); void heroArtEl.offsetWidth; heroArtEl.classList.add('cast');
      for (const h of res.hits) {
        const n = ui.enemyNodes.get(h.uid);
        const e = b.enemies.find((x) => x.uid === h.uid);
        sfx('shoot');
        await FX.projectile(FX.posOf(heroEl, 0.7, 0.3), FX.posOf($('.e-art', n)));
        const p = FX.posOf($('.e-art', n), 0.5, 0.4);
        sfx(h.dmg >= e.maxHp * 0.5 ? 'crit' : 'hit');
        FX.retrigger(n, 'hit', 380);
        FX.floatText(p.x, p.y, h.dmg, h.dmg >= 1000 ? 'big' : '');
        if (h.vuln) setTimeout(() => FX.floatText(p.x, p.y - 70, `👁️ ×2`, 'note'), 120);
        if (h.blocked) setTimeout(() => FX.floatText(p.x + 60, p.y + 20, `🛡️−${h.blocked}`, 'block'), 200);
        updateEnemy(e, h.hp, h.block);
        if (h.killed) { await FX.wait(250); sfx('kill'); FX.burst(p.x, p.y, { n: 22 }); n.classList.add('dead'); }
        await FX.wait(450);
      }
    }

    async function animateEnemyTurn(acts) {
      for (const a of acts) {
        const n = ui.enemyNodes.get(a.uid);
        if (!n) continue;
        const e = b.enemies.find((x) => x.uid === a.uid);
        const ep = FX.posOf($('.e-art', n), 0.5, 0.3);
        for (const ev of a.events) {
          if (ev.t === 'phit') {
            FX.retrigger(n, 'lunge', 420); await FX.wait(170);
            const hp = FX.posOf(heroEl, 0.5, 0.35);
            if (ev.dmg > 0) { sfx('hurt'); heroArtEl.classList.remove('hurt'); void heroArtEl.offsetWidth; heroArtEl.classList.add('hurt'); FX.shake(app.stage); FX.floatText(hp.x, hp.y, ev.dmg); if (ev.blocked) FX.floatText(hp.x - 70, hp.y + 30, `🛡️−${ev.blocked}`, 'block'); }
            else { sfx('blocked'); FX.floatText(hp.x, hp.y, T('ブロック！'), 'block'); }
            renderHero(ev.hp, ev.block);
            await FX.wait(a.intent.k === 'multi' ? 320 : 420);
          } else if (ev.t === 'eblock') { sfx('block'); FX.floatText(ep.x, ep.y, `🛡️+${ev.block}`, 'block'); updateEnemy(e); await FX.wait(450); }
          else if (ev.t === 'ebuff') { sfx('buff'); FX.floatText(ep.x, ep.y - 30, `💪 ${T('つよく なった')}`, 'note'); updateEnemy(e); await FX.wait(550); }
          else if (ev.t === 'curse') { sfx('curse'); FX.floatText(ep.x, ep.y - 30, `${CARDS[ev.card].icon}×${ev.count}`, 'note'); await FX.wait(600); renderHand(); await guide('bt_curse', `${CARDS[ev.card].icon} のろいの カードを まぜられた！ つかえない カードだけど、いれかえで すてたり、たたかいが おわると きえるよ。`); }
          else if (ev.t === 'drain') { sfx('curse'); FX.floatText(ep.x, ep.y - 30, ev.what === 'mana' ? `💠−${ev.n} ${T('つぎの ターン')}` : `🃏−${ev.n} ${T('つぎの ターン')}`, 'note'); await FX.wait(650); }
          else if (ev.t === 'summon') { sfx('boss'); updateEnemy(ev.enemy); mark('enemies', ev.enemy.id); await FX.wait(650); }
          else if (ev.t === 'charge') { sfx('charge'); FX.floatText(ep.x, ep.y - 20, `⚡ ${T('ちからを ためている…')}`, 'note'); await FX.wait(750); }
        }
        if (b.over) break;
      }
      renderEnemies(); renderHero();
    }
    function banner(text, cls = '') { const n = el(`<div class="turn-banner ${cls}">${T(text)}</div>`); root.appendChild(n); setTimeout(() => n.remove(), 1200); }

    // ───── ながれ ─────
    async function loop() {
      renderAll();
      if (kind === 'boss') { sfx('boss'); FX.bigWord(T('ボス あらわる')); await FX.wait(1300); }
      else if (kind === 'elite') { sfx('boss'); FX.bigWord(T('つよい てき！')); await FX.wait(1100); }
      while (!b.over) {
        const { ev, drawn } = B.startTurn(b);
        ui.peek = false; ui.mode = 'play'; ui.sel.clear();
        drawn.filter((d) => d.id).forEach((d) => mark('cards', d.id));
        if (drawn.some((d) => d.shuffle)) sfx('shuffle');
        if (b.turn > 1) banner('あなたの ターン');
        renderRule(); renderHero(); renderEnemies(); renderBoard();
        renderSlots(); renderHand(drawn.filter((d) => d.id)); sfx('draw');
        await showEvents(ev);
        await FX.wait(300);
        if (b.turn === 1) await tutorialStart();
        ui.input = true; renderSlots(); renderHand();
        await new Promise((r) => { ui.resolveTurn = r; });
        ui.resolveTurn = null;
        if (b.over) break;

        // スコア
        const pv = B.preview(b);
        let bonus = 1;
        if (b.slots.some(Boolean)) {
          mark('hands', pv.hand.best);
          const willAsk = settings.challenge && !ui.peek && pv.mult > 1 && pv.power > 0;
          await animateScore(pv, willAsk);
          if (willAsk) {
            await guide('bt_challenge', 'けいさん チャレンジ！ {力|ちから} × {倍率|ばいりつ} の こたえを えらぼう。あたると「ひらめき」で ダメージが 1.5{倍|ばい}に なるよ！');
            const r = await challengePrompt(pv.power, pv.mult, run.grade);
            if (r.tried) { b.stats.challengeTry++; if (r.ok) { b.stats.challengeOk++; bonus = 1.5; } }
            totalEl.textContent = pv.total; sfx('total'); $('.total', root).classList.toggle('burn', pv.total >= 1000); FX.retrigger($('.total', root), 'bump', 300);
            await FX.wait(450);
            if (r.ok) { FX.bigWord(T('ひらめき！ ×1.5')); totalEl.textContent = Math.floor(pv.total * 1.5); await FX.wait(800); }
          }
        }
        const res = B.cast(b, { bonus });
        if (res.dmg > 0) await animateHits(res);
        await showEvents(res.ev);
        renderSlots();
        if (b.over) break;
        const endEv = B.endPlayerTurn(b);
        renderHand();
        await showEvents(endEv);
        banner('てきの ターン', 'enemy-turn');
        await FX.wait(650);
        const acts = B.enemyTurn(b);
        await animateEnemyTurn(acts);
        if (!b.over) await guide('bt_block', '{敵|てき}の {攻撃|こうげき}は 🛡️{守|まも}りで へらせるよ。{敵|てき}の ふきだしを みて、あぶない ときは {守|まも}りの カードも いれよう。');
      }
      // おわり
      const st = run.stats;
      st.casts += b.stats.casts; st.best = Math.max(st.best, b.stats.best); st.challengeTry += b.stats.challengeTry; st.challengeOk += b.stats.challengeOk;
      for (const [h, n] of Object.entries(b.stats.hands)) st.hands[h] = (st.hands[h] || 0) + n;
      save();
      if (b.over === 'win') { sfx('win'); FX.bigWord(T('しょうり！')); FX.confetti(); await FX.wait(1500); resolve('win'); }
      else { sfx('lose'); heroArtEl.style.transition = 'transform .8s, opacity .8s'; heroArtEl.style.transform = 'rotate(-90deg) translateY(30px)'; heroArtEl.style.opacity = '.4'; await FX.wait(1600); resolve('lose'); }
    }
    loop();
  });
}
