// たたかいの がめん
import * as B from '../engine/battle.js';
import { computeHit } from '../engine/chain.js';
import { CARDS, COMBOS } from '../data/cards.js';
import { ENEMIES } from '../data/enemies.js';
import { RELICS } from '../data/relics.js';
import { FLOORS } from '../engine/run.js';
import { T } from '../text.js';
import { el, $, $$ } from '../util.js';
import { sfx, playBgm } from '../audio.js';
import { settings, markSeenCard, markSeenEnemy, learnFact } from '../save.js';
import { cardHtml, cardEl } from './cardview.js';
import { enemyArt, shapeSvg } from './art.js';
import { bgHtml, topbarHtml, updateTopbar, flashRelic, HEROES } from './common.js';
import { predictPrompt, cardDetail, deckView, owl, confirmBox, relicDetail } from './modal.js';
import * as FX from './fx.js';

const OPS = new Set(['add', 'sub', 'mul', 'div', 'set']);

export function battleScreen(app, enemyIds, kind) {
  return new Promise((resolve) => {
    const run = app.run;
    const { rng, save } = app.rng();
    const b = B.createBattle(run, enemyIds, kind, rng);
    const theme = FLOORS[run.floor].theme;
    const ui = { input: false, hintUsed: false, resolveTurn: null, enemyNodes: new Map(), lastTarget: null };
    enemyIds.forEach(markSeenEnemy);
    app.dbg = { b, ui, preview: () => B.previewChain(b) };

    const root = el(`<div class="screen battle fade-in">
      ${bgHtml(theme)}
      ${topbarHtml(run)}
      <div class="target-info"></div>
      <div class="arena">
        <div class="hero-box">
          <div class="hero-art">${HEROES[run.hero] || HEROES[0]}</div>
          <div class="shadow-oval"></div>
          <div style="position:relative;margin-top:4px">
            <div class="block-badge" style="display:none"></div>
            <div class="hpbar"><div class="ghost-fill"></div><div class="fill"></div><div class="txt"></div></div>
          </div>
        </div>
        <div class="enemies"></div>
      </div>
      <div class="spell ${b.slots.length > 4 ? 'compact' : ''}">
        <div class="memo-badge"></div>
        <div class="orb start"><span class="lbl">はじめ</span><span class="num">0</span></div>
        <div class="slots"></div>
        <div class="orb result"><span class="lbl">こうげき</span><span class="num">?</span></div>
        <div class="run-col">
          <button class="btn run-btn">${T('じっこう')}</button>
          <button class="btn white hint-btn">💡 ${T('ヒント')}</button>
        </div>
      </div>
      <div class="handzone">
        <div class="pile draw"><span class="num">0</span>${T('やま')}</div>
        <div class="hand"></div>
        <div class="pile discard"><span class="num">0</span>${T('すてふだ')}</div>
        <div class="pile exhaust empty"><span class="num">0</span>🔥</div>
      </div>
    </div>`);
    app.mount(root);
    app.wireTopbar(root, { inBattle: true, refresh: () => renderAll() });
    playBgm(kind === 'boss' ? 'boss' : 'battle');

    const handEl = $('.hand', root), slotsEl = $('.slots', root), enemiesEl = $('.enemies', root);
    const runBtn = $('.run-btn', root), hintBtn = $('.hint-btn', root);
    const heroArt = $('.hero-art', root), heroBox = $('.hero-box', root);

    // ───── えがく ─────
    function renderHero() {
      const pct = Math.max(0, run.hp / run.maxHp * 100);
      $('.hpbar .fill', root).style.width = pct + '%';
      $('.hpbar .ghost-fill', root).style.width = pct + '%';
      $('.hpbar .txt', root).textContent = `${run.hp} / ${run.maxHp}`;
      const bb = $('.block-badge', root);
      bb.style.display = b.pBlock > 0 ? '' : 'none';
      bb.textContent = b.pBlock;
      updateTopbar(root, run);
    }
    function weakLabel(e) { return b.grade === 1 ? `${e.weak}とび` : `${e.weak}のだん`; }
    function enemyHtml(e) {
      const d = ENEMIES[e.id];
      return `<div class="enemy ${e.boss ? 'boss' : ''} spawn" data-uid="${e.uid}">
        <div class="intent"></div>
        <div class="e-art">${enemyArt(d.art)}</div>
        <div class="e-name">${T(e.name)}</div>
        <div style="position:relative;margin-top:2px"><div class="block-badge" style="display:none"></div>
        <div class="hpbar enemy" style="width:${e.boss ? 200 : 150}px"><div class="ghost-fill"></div><div class="fill"></div><div class="txt"></div></div></div>
        <div class="badges"></div>
      </div>`;
    }
    function updateEnemy(e) {
      let n = ui.enemyNodes.get(e.uid);
      if (!n) {
        n = el(enemyHtml(e));
        n.addEventListener('click', () => {
          if (!ui.input || e.hp <= 0) return;
          b.target = e.uid; sfx('select'); renderEnemies(); renderTargetInfo();
        });
        enemiesEl.appendChild(n);
        ui.enemyNodes.set(e.uid, n);
        setTimeout(() => n.classList.remove('spawn'), 600);
      }
      const pct = Math.max(0, e.hp / e.maxHp * 100);
      $('.fill', n).style.width = pct + '%';
      $('.ghost-fill', n).style.width = pct + '%';
      $('.txt', n).textContent = `${e.hp} / ${e.maxHp}`;
      const bb = $('.block-badge', n); bb.style.display = e.block > 0 ? '' : 'none'; bb.textContent = e.block;
      const it = B.intentInfo(b, e);
      const iEl = $('.intent', n);
      iEl.className = `intent ${it.kind}`;
      iEl.innerHTML = `<span>${it.icon}</span><span>${T(it.text)}</span>`;
      iEl.style.visibility = e.hp > 0 ? '' : 'hidden';
      const badges = [];
      if (e.lock) badges.push(`<span class="badge lock">🎯 ${e.lock}</span>`);
      if (e.weak) badges.push(`<span class="badge weak">💥 ${T(weakLabel(e))}</span>`);
      if (e.armor) badges.push(`<span class="badge armor">🪨 ${T('かたい')} ${e.armor}</span>`);
      if (e.str) badges.push(`<span class="badge str">💪 +${e.str}</span>`);
      if (ENEMIES[e.id].revive && !e.revived) badges.push(`<span class="badge">💀 ${T('ふっかつ')}</span>`);
      $('.badges', n).innerHTML = badges.join('');
      n.classList.toggle('target', e.uid === currentTarget()?.uid && B.alive(b).length > 1);
      if (e.hp <= 0) n.classList.add('dead');
    }
    function currentTarget() {
      let t = b.enemies.find((e) => e.uid === b.target && e.hp > 0);
      if (!t) { t = B.alive(b)[0]; if (t) b.target = t.uid; }
      return t;
    }
    function renderEnemies() { b.enemies.forEach(updateEnemy); }
    function renderTargetInfo() {
      const t = currentTarget();
      const info = $('.target-info', root);
      if (!t) { info.innerHTML = ''; return; }
      const parts = [];
      if (t.lock) parts.push(`🎯 <b class="num">${t.lock}</b> と ぴったり おなじ {数|かず}で {攻撃|こうげき}すると 2{倍|ばい}！`);
      if (t.weak) parts.push(`💥 ${t.weak}, ${t.weak * 2}, ${t.weak * 3} …の {数|かず}で 2{倍|ばい}！`);
      if (t.armor) parts.push(`🪨 ダメージが ${t.armor} へる`);
      const many = B.alive(b).length > 1;
      info.innerHTML = parts.length || many ? T(`${many ? '👉 ねらい：' : ''}<b>${t.name}</b>　` + parts.join('　')) : '';
    }

    function renderSlots() {
      slotsEl.innerHTML = '';
      const prev = previewValues();
      b.slots.forEach((inst, i) => {
        const ar = el(`<div class="arrow"><span class="mid num">${i > 0 && prev.show && b.slots[i - 1] ? prev.after[i - 1] : ''}</span>▶</div>`);
        slotsEl.appendChild(ar);
        const s = el(`<div class="slot" data-slot="${i}"><span class="slot-no">${i + 1}</span></div>`);
        if (inst) {
          const c = cardEl(inst);
          s.appendChild(c);
          bindCard(c, { from: 'slot', slot: i });
        }
        slotsEl.appendChild(s);
      });
      const last = el(`<div class="arrow"><span class="mid num"></span>▶</div>`);
      slotsEl.appendChild(last);
      const r = $('.orb.result', root);
      const any = b.slots.some(Boolean);
      r.classList.toggle('hidden-v', !prev.show);
      $('.num', r).textContent = !any ? '–' : prev.show ? prev.v : '？';
      $('.orb.start .num', root).textContent = B.chainOpts(b).startV;
      $('.memo-badge', root).innerHTML = b.memo ? T(`📝 メモ：${b.memo}`) : '';
      runBtn.innerHTML = any ? T('じっこう') : T('パス');
      runBtn.classList.toggle('ready', any && !b.slots.includes(null) && ui.input);
      runBtn.classList.toggle('gray', !any);
      renderDmgPreview(prev, any);
      hintBtn.style.display = settings.predict ? '' : 'none';
      hintBtn.disabled = ui.hintUsed || !ui.input;
    }
    function previewValues() {
      const show = !settings.predict || ui.hintUsed;
      const ctx = B.previewChain(b);
      const after = b.slots.map((_, i) => {
        const st = ctx.steps.filter((s) => s.slot === i);
        return st.length ? st[st.length - 1].v : null;
      });
      return { show, v: ctx.v, after, ctx };
    }
    function renderDmgPreview(prev, any) {
      $$('.dmg-preview', enemiesEl).forEach((n) => n.remove());
      if (!prev.show || !any || !ui.input || prev.v <= 0) return;
      const ctx = prev.ctx;
      const targets = ctx.flags.all ? B.alive(b) : [currentTarget()].filter(Boolean);
      for (const e of targets) {
        const n = ui.enemyNodes.get(e.uid);
        if (!n) continue;
        const h = computeHit(prev.v, e, ctx.flags, { relics: run.relics, predicted: false });
        const notes = h.notes.filter((x) => x.t !== 'ひらめき！').map((x) => (x.t === 'ぴったり！' ? '🎯' : x.t === 'じゃくてん！' ? '💥' : '🪨')).join('');
        const tag = el(`<div class="dmg-preview">${notes} −${h.dmg * ctx.flags.hits}${ctx.flags.hits > 1 ? ` (${h.dmg}×${ctx.flags.hits})` : ''}</div>`);
        $('.e-art', n).appendChild(tag);
      }
    }
    function renderHand(newOnes = []) {
      handEl.innerHTML = '';
      const avail = handEl.offsetWidth || 960;
      const n = Math.max(1, b.hand.length);
      const mg = Math.max(-46, Math.min(4, (avail - n * 124) / n / 2));
      if (!b.hand.length) handEl.appendChild(el(`<div class="hand-empty">${T(b.slots.some(Boolean) ? '「じっこう」を おそう！' : 'てふだが ない')}</div>`));
      b.hand.forEach((inst, i) => {
        const c = cardEl(inst);
        c.style.margin = `0 ${mg}px`;
        const k = newOnes.indexOf(inst);
        if (k >= 0) { c.classList.add('drawn'); c.style.animationDelay = (k * 0.07) + 's'; }
        handEl.appendChild(c);
        bindCard(c, { from: 'hand', idx: i });
      });
      $('.pile.draw .num', root).textContent = b.draw.length;
      $('.pile.discard .num', root).textContent = b.discard.length;
      const ex = $('.pile.exhaust', root);
      ex.classList.toggle('empty', !b.exhaust.length);
      $('.num', ex).textContent = b.exhaust.length;
    }
    function renderAll() { renderHero(); renderEnemies(); renderTargetInfo(); renderSlots(); renderHand(); }

    // ───── そうさ ─────
    function flipFrom(rect, node) {
      if (!rect || !node) return;
      const r2 = node.getBoundingClientRect();
      const sc = r2.width / node.offsetWidth || 1;
      const dx = (rect.left - r2.left) / sc, dy = (rect.top - r2.top) / sc;
      node.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.2,.9,.4,1)' });
    }
    function afterChange(movedUid, fromRect) {
      renderSlots(); renderHand();
      const n = root.querySelector(`.card[data-uid="${movedUid}"]`);
      flipFrom(fromRect, n);
      tutorialAfterPlace();
    }
    function tapHand(inst, node) {
      if (CARDS[inst.id].unplayable) { sfx('wrong'); FX.shake(node); FX.toast(T('この カードは つかえない…'), '💤', 1600); return; }
      const empty = b.slots.indexOf(null);
      if (empty < 0) { sfx('wrong'); FX.shake(slotsEl); FX.toast(T('わくが いっぱい！ わくの カードを タップすると もどせるよ'), '✋', 2000); return; }
      const rect = node.getBoundingClientRect();
      B.placeCard(b, b.hand.indexOf(inst), empty);
      sfx('place');
      afterChange(inst.uid, rect);
    }
    function tapSlot(inst, node) {
      const rect = node.getBoundingClientRect();
      B.unplaceCard(b, b.slots.indexOf(inst));
      sfx('unplace');
      afterChange(inst.uid, rect);
    }
    function dropTo(inst, from, target) {
      const rect = root.querySelector(`.card[data-uid="${inst.uid}"]`)?.getBoundingClientRect();
      if (target.type === 'slot') {
        const to = target.slot;
        if (from.from === 'hand') {
          if (CARDS[inst.id].unplayable) { sfx('wrong'); renderHand(); return; }
          B.placeCard(b, b.hand.indexOf(inst), to);
        } else {
          B.swapSlots(b, b.slots.indexOf(inst), to);
        }
        sfx('place');
      } else if (target.type === 'hand' && from.from === 'slot') {
        B.unplaceCard(b, b.slots.indexOf(inst));
        sfx('unplace');
      }
      afterChange(inst.uid, rect);
    }
    function bindCard(node, from) {
      const inst = from.from === 'hand' ? b.hand[from.idx] : b.slots[from.slot];
      node.addEventListener('pointerdown', (e) => {
        if (e.button > 0) return;
        const sx = e.clientX, sy = e.clientY;
        let dragging = false, ghost = null, longFired = false, overEl = null;
        const pid = e.pointerId;
        try { node.setPointerCapture(pid); } catch (err) { /* */ }
        const longT = setTimeout(() => { if (!dragging) { longFired = true; sfx('page'); cardDetail(inst); } }, 480);
        const stageRect = () => app.stage.getBoundingClientRect();
        const toStage = (x, y) => { const r = stageRect(); const sc = r.width / app.stage.offsetWidth; return { x: (x - r.left) / sc, y: (y - r.top) / sc }; };
        const findTarget = (x, y) => {
          const hit = document.elementFromPoint(x, y);
          if (!hit) return null;
          const s = hit.closest('.slot');
          if (s) return { type: 'slot', slot: Number(s.dataset.slot), node: s };
          if (hit.closest('.handzone')) return { type: 'hand', node: handEl };
          return null;
        };
        const move = (ev) => {
          if (ev.pointerId !== pid) return;
          const dx = ev.clientX - sx, dy = ev.clientY - sy;
          if (!dragging && Math.hypot(dx, dy) > 12 && ui.input && !longFired) {
            dragging = true; clearTimeout(longT);
            ghost = node.cloneNode(true); ghost.classList.add('card-ghost');
            app.stage.appendChild(ghost);
            node.style.opacity = '.35';
          }
          if (dragging) {
            const p = toStage(ev.clientX, ev.clientY);
            ghost.style.left = (p.x - 62) + 'px'; ghost.style.top = (p.y - 86) + 'px';
            const t = findTarget(ev.clientX, ev.clientY);
            const ne = t && t.type === 'slot' ? t.node : null;
            if (overEl !== ne) { overEl && overEl.classList.remove('over'); ne && ne.classList.add('over'); overEl = ne; }
          }
        };
        const up = (ev) => {
          if (ev.pointerId !== pid) return;
          clearTimeout(longT);
          node.removeEventListener('pointermove', move);
          node.removeEventListener('pointerup', up);
          node.removeEventListener('pointercancel', up);
          overEl && overEl.classList.remove('over');
          if (dragging) {
            ghost.remove(); node.style.opacity = '';
            const t = ev.type === 'pointerup' ? findTarget(ev.clientX, ev.clientY) : null;
            if (t && ui.input) dropTo(inst, from, t);
            return;
          }
          if (longFired || ev.type !== 'pointerup' || !ui.input) return;
          if (from.from === 'hand') tapHand(inst, node); else tapSlot(inst, node);
        };
        node.addEventListener('pointermove', move);
        node.addEventListener('pointerup', up);
        node.addEventListener('pointercancel', up);
      });
    }
    $('.pile.draw', root).addEventListener('click', () => { sfx('tap'); deckView(b.draw, { title: 'やま（つぎに ひく カード）', sub: 'じゅんばんは ひみつ' }); });
    $('.pile.discard', root).addEventListener('click', () => { sfx('tap'); deckView(b.discard, { title: 'すてふだ' }); });
    $('.pile.exhaust', root).addEventListener('click', () => { sfx('tap'); deckView(b.exhaust, { title: 'つかいきった カード' }); });
    hintBtn.addEventListener('click', async () => {
      if (!ui.input || ui.hintUsed) return;
      sfx('tap');
      await owl('b_hint', 'ヒントを つかうと、とちゅうの {数|かず}が みえるよ。でも この ターンは よそうボーナスが もらえなく なるよ。');
      ui.hintUsed = true; renderSlots();
    });
    runBtn.addEventListener('click', async () => {
      if (!ui.input) return;
      sfx('tap');
      if (!b.slots.some(Boolean)) {
        const playable = b.hand.some((c) => !CARDS[c.id].unplayable);
        if (playable && !(await confirmBox('なにも しない？', 'カードを わくに ならべて いないよ。このまま ターンを おわる？', 'おわる', 'もどる'))) return;
      }
      ui.input = false;
      renderSlots();
      ui.resolveTurn && ui.resolveTurn();
    });

    // ───── チュートリアル ─────
    let placedOnce = false;
    function tutorialAfterPlace() {
      if (placedOnce) return; placedOnce = true;
      owl('b_run', 'いいね！ わくが うまったら「じっこう」を おそう。ひだりから じゅんばんに {計算|けいさん}して、できた {数|かず}で {攻撃|こうげき}するよ！', { spot: runBtn });
    }
    async function tutorialTurnStart() {
      await owl('b_intro', 'たたかいの はじまり！ {敵|てき}の うえの ふきだしは、{次|つぎ}に する こと だよ。⚔️は {攻撃|こうげき}、🛡️は {守|まも}り。', { spot: enemiesEl });
      await owl('b_cards', 'したの カードを タップして、じゅもんの わくに ならべよう。{数|かず}は 0から はじまって、カードの じゅんばんに かわって いくよ。', { spot: $('.spell', root) });
      const ids = new Set(b.hand.map((c) => c.id));
      if (ids.has('rep')) await owl('b_rep', '🔁「もう{一度|いちど}」は、ひとつ まえの カードを もう{一度|いちど} うごかすよ。「+3 → もう{一度|いちど}」なら +3を 2{回|かい}！ じゅんばんが だいじ！');
      if (ids.has('tri') || ids.has('sqr')) await owl('b_shape', 'かたちカードは「かどの {数|かず}」だけ たすよ。さんかくの かどは いくつ かな？ かたちを となりに ならべると「がったい」するかも…！');
      if ([...ids].some((i) => CARDS[i].tags.legs)) await owl('b_legs', 'いきものカードは「{足|あし}の {数|かず}」だけ たすよ。どの いきものの {足|あし}が おおいかな？');
      if (ids.has('memoSet') || ids.has('memoAdd')) await owl('b_memo', '📝「メモする」で いまの {数|かず}を おぼえて おける。「メモを {足|た}す」で あとから つかえるよ。プログラムの「へんすう」と おなじ しくみ！');
      if ([...ids].some((i) => CARDS[i].cat === 'junk')) await owl('b_junk', '💤 おじゃまカードは つかえない。たたかいが おわると きえるよ。');
      for (const e of B.alive(b)) {
        if (e.lock) await owl('b_lock', `🎯は「ぴったり」マーク！ {攻撃|こうげき}の {数|かず}が 🎯の {数|かず}と ぴったり おなじだと 2{倍|ばい} ダメージ！ ぴったりを ねらって ならべかたを くふう しよう。`, { spot: ui.enemyNodes.get(e.uid) });
        if (e.weak) await owl('b_weak', `💥は じゃくてん！ たとえば「3のだん」なら 3, 6, 9, 12 …の {数|かず}で {攻撃|こうげき}すると 2{倍|ばい} ダメージ！`, { spot: ui.enemyNodes.get(e.uid) });
        if (e.armor) await owl('b_armor', '🪨「かたい」{敵|てき}は ダメージが へって しまう。おおきな {数|かず}を つくるか、「つらぬく」カードで {攻撃|こうげき}しよう。');
        if (e.intent.k === 'multi') await owl('b_multi', '⚔️「3×2」は 3の {攻撃|こうげき}を 2{回|かい} する いみ。ぜんぶで 3×2＝6 ダメージ。{守|まも}りで ふせごう！');
        if (e.intent.k === 'charge') await owl('b_charge', '⚡ {敵|てき}が ちからを ためている！ {次|つぎ}の ターンは つよい {攻撃|こうげき}が くるよ。{守|まも}りを かためよう！');
        if (b.slots.length > 1 && B.alive(b).length > 1) await owl('b_target', '{敵|てき}が たくさん いる ときは、{敵|てき}を タップすると ねらう {敵|てき}を えらべるよ。');
      }
    }

    // ───── じゅもんの アニメ ─────
    async function animateChain(ctx, predicted, guess) {
      const spell = $('.spell', root);
      const slotNodes = $$('.slot', slotsEl);
      const startOrb = $('.orb.start', root), resultOrb = $('.orb.result', root);
      const orb = el(`<div class="run-orb">${ctx.startV}</div>`);
      const L = FX.fxLayer(); L.appendChild(orb);
      const place = (p) => { orb.style.left = p.x + 'px'; orb.style.top = p.y + 'px'; };
      place(FX.posOf(startOrb));
      await FX.wait(120);
      let bubble = null;
      const showBubble = (slotIdx, s) => {
        bubble && bubble.remove();
        const anchor = slotIdx >= 0 && slotIdx < slotNodes.length ? slotNodes[slotIdx] : resultOrb;
        const p = FX.posOf(anchor, 0.5, 0);
        const cls = s.op;
        let text = s.eq;
        if (s.op === 'combo') text = `${s.combo.icon.startsWith('shape:') ? shapeSvg(s.combo.icon.slice(6)).replace('<svg', '<svg style="width:42px;height:42px;vertical-align:middle"') : s.combo.icon} ${T('がったい！')}`;
        const lbl = s.op === 'combo' ? T(s.label) : s.label ? T(s.label) : '';
        bubble = el(`<div class="eq-bubble ${cls}" style="left:${p.x}px;top:${p.y - 44}px">${s.repeat ? '🔁 ' : ''}${s.op === 'cond' || s.op === 'flag' || s.op === 'none' || s.op === 'memo' ? T(text) : text}${lbl ? `<span class="lbl">${lbl}</span>` : ''}</div>`);
        L.appendChild(bubble);
      };
      let k = 0;
      for (const s of ctx.steps) {
        if (s.op === 'begin') {
          bubble && bubble.remove(); bubble = null;
          slotNodes.forEach((n, i) => { n.classList.toggle('running', i === s.slot); if (i < s.slot) n.classList.add('done'); });
          const sn = slotNodes[s.slot];
          if (sn) place(FX.posOf(sn, 0.5, 0.02));
          await FX.wait(230);
          continue;
        }
        if (s.slot >= slotNodes.length) { slotNodes.forEach((n) => n.classList.add('done')); place(FX.posOf(resultOrb, 0.5, 0.1)); await FX.wait(200); }
        showBubble(s.slot, s);
        if (OPS.has(s.op)) {
          orb.textContent = s.v; FX.retrigger(orb, 'bump', 320);
          sfx(s.op === 'set' ? 'sub' : s.op, k++);
          await FX.wait(720);
        } else if (s.op === 'block') {
          sfx('block');
          const hp = FX.posOf(heroBox, 0.5, 0.45);
          FX.floatText(hp.x, hp.y, `🛡+${s.gain}`, 'block');
          const bb = $('.block-badge', root); bb.style.display = ''; bb.textContent = s.block; FX.retrigger(bb, 'pop', 400);
          await FX.wait(560);
        } else if (s.op === 'cond') {
          sfx('cond', s.ok); await FX.wait(760);
        } else if (s.op === 'combo') {
          sfx('combo');
          const p = FX.posOf(slotNodes[s.slot] || resultOrb, 0, 0.5);
          FX.burst(p.x, p.y, { n: 18, stars: true });
          if (learnFact('combo:' + [s.combo.a, s.combo.b].sort().join('+'))) queueFact(s.combo.icon, s.combo.fact);
          await owl('b_combo', 'がったい！ かたちカードを となりに ならべると、くっついて あたらしい かたちに なるよ。できた かたちの かどの {数|かず}が さらに たされる！');
          await FX.wait(820);
        } else {
          await FX.wait(480);
        }
      }
      bubble && bubble.remove();
      slotNodes.forEach((n) => { n.classList.remove('running'); n.classList.add('done'); });
      place(FX.posOf(resultOrb));
      await FX.wait(300);
      $('.num', resultOrb).textContent = ctx.v;
      resultOrb.classList.remove('hidden-v');
      orb.remove();
      if (predicted) {
        const p = FX.posOf(resultOrb);
        FX.burst(p.x, p.y, { n: 16, stars: true, dist: 160 });
        FX.bigWord(T('ひらめき！'));
        await FX.wait(700);
      } else if (guess != null) {
        FX.toast(T(`おしい！ こたえは <b class="num" style="font-size:26px">${ctx.v}</b> だったよ（よそう：${guess}）`), '💭', 2600);
        await FX.wait(500);
      }
    }

    const factQueue = [];
    function queueFact(icon, fact) { factQueue.push({ icon, fact }); }
    async function flushFacts() {
      while (factQueue.length) {
        const f = factQueue.shift();
        const ic = f.icon && f.icon.startsWith('shape:') ? shapeSvg(f.icon.slice(6)).replace('<svg', '<svg style="width:40px;height:40px"') : (f.icon || '📖');
        FX.toast(`<span style="color:#b07a00">${T('ちしき ゲット！')}</span><br>${T(f.fact)}`, ic, 3600);
        sfx('upgrade');
        await FX.wait(900);
      }
    }

    async function animateHits(hits, V, ctx) {
      if (!ctx.cards.length) return;
      if (V <= 0) {
        const p = FX.posOf($('.orb.result', root));
        if (ctx.blockTotal <= 0) FX.floatText(p.x, p.y - 30, T('0… なにも おきない'), 'note blue');
        await FX.wait(500);
        return;
      }
      heroArt.classList.remove('cast'); void heroArt.offsetWidth; heroArt.classList.add('cast');
      const from = FX.posOf(heroBox, 0.7, 0.35);
      const byHit = new Map();
      for (const h of hits) { if (!byHit.has(h.hitNo)) byHit.set(h.hitNo, []); byHit.get(h.hitNo).push(h); }
      for (const [, group] of byHit) {
        sfx('shoot');
        await Promise.all(group.map((h) => {
          const n = ui.enemyNodes.get(h.uid);
          return FX.projectile(from, FX.posOf($('.e-art', n), 0.5, 0.5));
        }));
        for (const h of group) {
          const n = ui.enemyNodes.get(h.uid);
          const e = b.enemies.find((x) => x.uid === h.uid);
          const p = FX.posOf($('.e-art', n), 0.5, 0.4);
          const crit = h.notes.some((x) => x.t === 'ぴったり！' || x.t === 'じゃくてん！');
          sfx(crit ? 'crit' : 'hit');
          FX.retrigger(n, 'hit', 380);
          FX.floatText(p.x, p.y, h.dmg, crit || h.dmg >= 30 ? 'big' : '');
          let dy = -70;
          for (const note of h.notes) {
            const txt = note.t === 'ぴったり！' ? `🎯${T('ぴったり！')} ×${note.m}` : note.t === 'じゃくてん！' ? `💥${T('じゃくてん！')} ×2` : note.t === 'ひらめき！' ? `💡×${note.m}` : `🪨${T(note.t)}`;
            setTimeout(() => FX.floatText(p.x, p.y + dy, txt, `note ${note.t === 'ひらめき！' ? 'pink' : note.armor ? 'blue' : ''}`), 120);
            dy -= 42;
          }
          if (h.notes.some((x) => x.t === 'ぴったり！')) { FX.burst(p.x, p.y, { n: 22, stars: true, dist: 180 }); FX.flashScreen('#fff6b0'); }
          if (h.blocked) setTimeout(() => FX.floatText(p.x + 60, p.y + 20, `🛡−${h.blocked}`, 'block'), 200);
          // HP バー
          const shown = { ...e, hp: h.hp, block: h.block };
          $('.fill', n).style.width = Math.max(0, shown.hp / e.maxHp * 100) + '%';
          setTimeout(() => { $('.ghost-fill', n).style.width = Math.max(0, shown.hp / e.maxHp * 100) + '%'; }, 50);
          $('.txt', n).textContent = `${shown.hp} / ${e.maxHp}`;
          const bb = $('.block-badge', n); bb.style.display = shown.block > 0 ? '' : 'none'; bb.textContent = shown.block;
          if (h.killed) {
            await FX.wait(260);
            sfx('kill'); FX.burst(p.x, p.y, { n: 20 });
            n.classList.add('dead');
            $('.intent', n).style.visibility = 'hidden';
          } else if (h.revive) {
            await FX.wait(500);
            FX.floatText(p.x, p.y - 40, T('ふっかつ！'), 'note');
            sfx('buff');
          }
        }
        await FX.wait(520);
      }
      renderEnemies();
    }

    // ───── てきの ターン ─────
    async function animateEnemyTurn(acts) {
      for (const a of acts) {
        const n = ui.enemyNodes.get(a.uid);
        if (!n) continue;
        const e = b.enemies.find((x) => x.uid === a.uid);
        const k = a.intent.k;
        const ep = FX.posOf($('.e-art', n), 0.5, 0.3);
        for (const ev of a.events) {
          if (ev.t === 'phit') {
            FX.retrigger(n, 'lunge', 420);
            await FX.wait(170);
            const hp = FX.posOf(heroBox, 0.5, 0.35);
            if (ev.dmg > 0) {
              sfx('hurt');
              heroArt.classList.remove('hurt'); void heroArt.offsetWidth; heroArt.classList.add('hurt');
              FX.shake(app.stage);
              FX.floatText(hp.x, hp.y, ev.dmg);
              if (ev.blocked) FX.floatText(hp.x - 70, hp.y + 30, `🛡−${ev.blocked}`, 'block');
            } else {
              sfx('blocked');
              FX.floatText(hp.x, hp.y, T('ブロック！'), 'block');
            }
            $('.hpbar .fill', root).style.width = Math.max(0, ev.hp / run.maxHp * 100) + '%';
            setTimeout(() => { $('.hpbar .ghost-fill', root).style.width = Math.max(0, ev.hp / run.maxHp * 100) + '%'; }, 60);
            $('.hpbar .txt', root).textContent = `${ev.hp} / ${run.maxHp}`;
            const bb = $('.block-badge', root); bb.style.display = ev.block > 0 ? '' : 'none'; bb.textContent = ev.block;
            updateTopbar(root, { ...run, hp: ev.hp });
            await FX.wait(k === 'multi' ? 330 : 420);
          } else if (ev.t === 'eblock') {
            sfx('block'); FX.retrigger(n, 'glow-blue', 700);
            FX.floatText(ep.x, ep.y, `🛡+${ev.block}`, 'block');
            updateEnemy(e);
            await FX.wait(500);
          } else if (ev.t === 'ebuff') {
            sfx('buff'); FX.retrigger(n, 'glow-red', 700);
            FX.floatText(ep.x, ep.y - 30, T(`💪 つよく なった！`), 'note');
            updateEnemy(e);
            await FX.wait(600);
          } else if (ev.t === 'curse') {
            sfx('curse');
            const dp = FX.posOf($('.pile.discard', root));
            for (let i = 0; i < ev.count; i++) {
              const ic = el(`<div class="particle star" style="font-size:40px">${CARDS[ev.card].face}</div>`);
              FX.fxLayer().appendChild(ic);
              ic.style.left = ep.x + 'px'; ic.style.top = ep.y + 'px';
              ic.animate([{ transform: 'translate(-50%,-50%) scale(1)' }, { transform: `translate(${dp.x - ep.x - 20}px, ${dp.y - ep.y - 20}px) scale(.6)` }], { duration: 600, delay: i * 120, fill: 'forwards', easing: 'ease-in' });
              setTimeout(() => ic.remove(), 800 + i * 120);
            }
            await FX.wait(800);
            renderHand();
            await owl('b_curse', `${CARDS[ev.card].face} おじゃまカードを まぜられた！ つかえない カードだけど、たたかいが おわれば きえるよ。`);
          } else if (ev.t === 'summon') {
            sfx('boss');
            updateEnemy(ev.enemy);
            markSeenEnemy(ev.enemy.id);
            await FX.wait(700);
          } else if (ev.t === 'charge') {
            sfx('charge');
            FX.retrigger(n, 'glow-red', 1000);
            FX.floatText(ep.x, ep.y - 20, T('⚡ ちからを ためている…'), 'note');
            await FX.wait(800);
          } else if (ev.t === 'eheal') {
            sfx('heal'); updateEnemy(e); await FX.wait(500);
          }
        }
        if (b.over) break;
      }
      renderEnemies();
      renderHero();
    }

    function banner(text, cls = '') {
      const n = el(`<div class="turn-banner ${cls}">${T(text)}</div>`);
      root.appendChild(n); setTimeout(() => n.remove(), 1200);
    }

    // ───── すすめかた ─────
    async function loop() {
      renderAll();
      if (kind === 'boss') { sfx('boss'); FX.bigWord(T('ボス あらわる！'), '#ff8a8a'); await FX.wait(1300); }
      const startEv = B.battleStartEffects(b);
      for (const ev of startEv) {
        if (ev.t === 'pblock') { flashRelic(root, ev.src); sfx('block'); }
        if (ev.t === 'ehit') { flashRelic(root, ev.src); sfx('hit'); const n = ui.enemyNodes.get(ev.uid); FX.retrigger(n, 'hit', 380); const p = FX.posOf($('.e-art', n)); FX.floatText(p.x, p.y, ev.dmg); }
      }
      if (startEv.length) { renderAll(); await FX.wait(500); }
      while (!b.over) {
        const { ev, drawn } = B.startPlayerTurn(b);
        ui.hintUsed = false;
        if (ev.some((x) => x.src === 'alarm')) flashRelic(root, 'alarm');
        if (drawn.some((d) => d.shuffle)) sfx('shuffle');
        drawn.filter((d) => d.id).forEach((d) => markSeenCard(d.id));
        if (b.turn > 1) banner('あなたの ターン');
        renderHero(); renderEnemies(); renderTargetInfo(); renderSlots();
        renderHand(drawn.filter((d) => d.id));
        sfx('draw');
        await FX.wait(350);
        if (b.turn === 1 || app.run.stats.battles < 2) await tutorialTurnStart();
        ui.input = true;
        renderSlots();
        await new Promise((r) => { ui.resolveTurn = r; });
        ui.resolveTurn = null;

        // よそう
        const pv = B.previewChain(b);
        const hasOps = pv.steps.some((s) => OPS.has(s.op));
        let predicted = false, guess = null;
        const canPredict = settings.predict && hasOps && (!ui.hintUsed || run.relics.includes('feather'));
        if (canPredict) {
          await owl('b_predict', '「じっこう」の まえに、こたえを よそう しよう！ あたまの なかで {計算|けいさん}して、さいごの {数|かず}を いれてね。あたると ダメージが 1.5{倍|ばい}！');
          const res = await predictPrompt(b.slots, B.chainOpts(b).startV, pv.v);
          if (res) {
            b.stats.predTry++; guess = res.value;
            if (res.ok) { predicted = true; b.stats.predOk++; }
          }
        }
        // じっこう
        b.target = currentTarget()?.uid;
        const used = b.slots.filter(Boolean);
        const result = B.executeChain(b, { predicted });
        for (const inst of used) {
          const c = CARDS[inst.id];
          if (c.fact && learnFact('card:' + c.id)) queueFact(c.face.startsWith('shape:') ? c.face : c.face === 'dice' ? '🎲' : c.face, c.fact);
        }
        await animateChain(result.ctx, predicted, predicted ? null : guess);
        renderHero();
        for (const e2 of result.ev) if (e2.t === 'heal') { flashRelic(root, e2.src); sfx('heal'); }
        await animateHits(result.hits, result.V, result.ctx);
        await flushFacts();
        renderSlots();
        // てふだを すてる
        $$('.card', handEl).forEach((c) => c.classList.add('discarding'));
        if (b.hand.length) await FX.wait(320);
        B.discardHand(b);
        renderHand();
        if (b.over) break;
        banner('てきの ターン', 'enemy-turn');
        await FX.wait(700);
        const acts = B.enemyTurn(b);
        await animateEnemyTurn(acts);
        if (!b.over) await owl('b_block', 'てきの {攻撃|こうげき}は 🛡️{守|まも}りで ふせげるよ。「{守|まも}る」カードや「たてに かえる」カードを うまく つかおう！');
      }
      // おわり
      for (const k of ['predTry', 'predOk', 'calcs', 'pittari', 'weakHits', 'turns']) run.stats[k] = (run.stats[k] || 0) + b.stats[k];
      run.stats.maxHit = Math.max(run.stats.maxHit || 0, b.stats.maxHit);
      save();
      if (b.over === 'win') {
        sfx('win');
        FX.bigWord(T('かった！'));
        FX.confetti();
        await FX.wait(1500);
        resolve('win');
      } else {
        sfx('lose');
        heroArt.style.transition = 'transform .8s, opacity .8s'; heroArt.style.transform = 'rotate(-90deg) translateY(30px)'; heroArt.style.opacity = '.4';
        await FX.wait(1600);
        resolve('lose');
      }
    }
    loop();
  });
}
