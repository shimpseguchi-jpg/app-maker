// スケジュールメイカー（REQUIREMENTS.md 5.2〜5.4・F-201〜F-204・F-301〜F-307・F-401〜F-406）
// 1. じかんと パネル（じかんを きめる・パネルを えらぶ・きょうの わく）→ 2. タイムテーブル（なおす・ていあん・ミッションかいし！）
import { T, $, $$, el, esc, modal, toast, play, speak, clockSvg, itemColor, clock, minText } from './common.js';
import { plan, STEP, MIN_TOTAL, MAX_TOTAL } from '../engine/schedule.js';
import { PANELS, PANEL_BY_ID, KINDS, VERBS, EMOJIS } from '../data/panels.js';
import { profile, parent, record, custom, recent, saveCustom, saveDraft, dayKey } from '../save.js';

const ceil5 = (m) => Math.ceil(m / STEP - 1e-9) * STEP;
export const nowMinute = (now = Date.now()) => { const d = new Date(now); return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; };
let keySeq = 1;
const newKey = () => 'k' + Date.now().toString(36) + (keySeq++);

export function newDraft(over = {}) {
  return { startMode: 'now', start: ceil5(nowMinute()), endMode: 'dur', dur: 60, end: null, items: [], mode: 'ratio', autoBreak: true, suppress: [], step: 1, ...over };
}
export function draftFromTemplate(tp) {
  return newDraft({ items: tp.items.map((it) => ({ ...it, key: newKey() })), mode: tp.mode, dur: tp.minutes, step: 2, template: tp.id });
}

export function catalog() { return { ...PANEL_BY_ID, ...Object.fromEntries(custom.map((p) => [p.id, p])) }; }
export function startOf(d, now = Date.now()) { return d.startMode === 'now' ? ceil5(nowMinute(now)) : d.start; }   // F-204 いまから は かいしまで いまに ついていく
export function endOf(d, S) { return d.endMode === 'dur' ? S + d.dur : d.end; }
export function rewardCapNow() {
  const used = record.days[dayKey()]?.rewardMin || 0;
  return Math.max(0, Math.min(parent.rewardCapMission, parent.rewardCapDay - used));        // F-801
}
export function planDraft(d, now = Date.now(), over = {}) {
  const S = over.start ?? startOf(d, now);
  return plan({
    start: S, end: over.end ?? endOf(d, S), items: d.items, grade: profile.grade, mode: d.mode, autoBreak: d.autoBreak, suppress: d.suppress,
    rewardCap: rewardCapNow(), anchors: parent.bathAt ? { bath: parent.bathAt } : {}, catalog: catalog(),
    extendMax: parent.extendMax, allowEndExtend: parent.allowEndExtend, shrink: parent.shrink,
  });
}

const panelOf = (it) => catalog()[it.panel] || PANEL_BY_ID.free;
const TABS = [['recent', 'さいきん'], ['focus', 'しゅうちゅう'], ['life', 'せいかつ'], ['reward', 'ごほうび'], ['rest', 'きゅうけい'], ['mine', 'じぶんで']];

export function renderMaker(root, app, draft) {
  let tab = recent.length ? 'recent' : 'focus';
  const save = () => saveDraft(draft);
  let timer = null;

  function draw() {
    root.innerHTML = '';
    clearInterval(timer);
    root.appendChild(draft.step === 2 ? stepTable() : stepPanels());
    save();
    // F-204：いまから の とき、じこくが すすんだら かきなおす
    if (draft.startMode === 'now') {
      let last = startOf(draft);
      timer = setInterval(() => { if (!root.isConnected) return clearInterval(timer); const s = startOf(draft); if (s !== last) { last = s; draw(); } }, 5000);
    }
  }

  // ───────────── 1. じかんと パネル
  function stepPanels() {
    const S = startOf(draft), E = endOf(draft, S), T0 = E - S;
    const node = el(`<div class="screen maker">
      <header class="bar"><button class="btn ghost" data-home>← ${T('ホーム')}</button><h1>${T('ミッションを つくる')}</h1><span class="step">1 / 2</span></header>
      <div class="maker-body">
        <section class="card time">
          <h2>${T('じかんを きめる')}</h2>
          <div class="time-row">
            <div class="clock-wrap">${clockSvg(T0 > 0 ? [{ from: S, to: Math.min(E, S + MAX_TOTAL), color: 'var(--accent)' }] : [], S)}</div>
            <div class="time-ctl">
              <div class="lbl">${T('はじまり')}</div>
              <div class="chips"><button data-start-now class="${draft.startMode === 'now' ? 'on' : ''}">${T('いまから')}</button><button data-start-pick class="${draft.startMode === 'fixed' ? 'on' : ''}">🕐 ${clock(S)}</button></div>
              <div class="lbl">${T('おわり')}</div>
              <div class="chips">${[30, 45, 60, 90, 120].map((m) => `<button data-dur="${m}" class="${draft.endMode === 'dur' && draft.dur === m ? 'on' : ''}">+${m}</button>`).join('')}<button data-end-pick class="${draft.endMode === 'fixed' ? 'on' : ''}">🕐 ${clock(E)}</button></div>
              <div class="total ${T0 < MIN_TOTAL || T0 > MAX_TOTAL ? 'bad' : ''}"><b>${T0}</b>${minText(T0).slice(String(T0).length)}<small>${clock(S)}〜${clock(E)}</small></div>
              ${T0 < MIN_TOTAL ? `<div class="warn">${T('10ぷん いじょうに してね')}</div>` : T0 > MAX_TOTAL ? `<div class="warn">${T('3じかん までに してね')}</div>` : ''}
            </div>
          </div>
        </section>
        <section class="card panels">
          <h2>${T('パネルを えらぶ')} <small>${T('タップか ドラッグで わくに いれる')}</small></h2>
          <div class="tabs" role="tablist">${TABS.map(([k, n]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${T(n)}</button>`).join('')}</div>
          <div class="palette" data-palette>${paletteHtml()}</div>
          <h3>${T('きょうの わく')} <small>${T('ならべた じゅんに すすむよ')}</small></h3>
          <div class="waku" data-waku>${wakuHtml()}</div>
        </section>
      </div>
      <footer class="foot"><button class="btn big" data-cut ${draft.items.length && T0 >= MIN_TOTAL && T0 <= MAX_TOTAL ? '' : 'disabled'}>✂️ ${T('おまかせで くぎる')}</button></footer>
    </div>`);
    $('[data-home]', node).addEventListener('click', () => { play('tap'); app.go('home'); });
    $('[data-start-now]', node).addEventListener('click', () => { play('tap'); draft.startMode = 'now'; draw(); });
    $('[data-start-pick]', node).addEventListener('click', () => { play('tap'); pickTime('はじまりの じかん', S, (m) => { draft.startMode = 'fixed'; draft.start = m; if (draft.endMode === 'fixed' && draft.end <= m) { draft.endMode = 'dur'; } draw(); }); });
    $$('[data-dur]', node).forEach((b) => b.addEventListener('click', () => { play('tap'); draft.endMode = 'dur'; draft.dur = Number(b.dataset.dur); draw(); }));
    $('[data-end-pick]', node).addEventListener('click', () => { play('tap'); pickTime('おわりの じかん', E, (m) => { draft.endMode = 'fixed'; draft.end = m <= S ? m + 1440 : m; draw(); }); });
    $$('[data-tab]', node).forEach((b) => b.addEventListener('click', () => { play('tap'); tab = b.dataset.tab; draw(); }));
    $('[data-cut]', node).addEventListener('click', () => { play('select'); draft.step = 2; draw(); });
    wireWaku(node);
    wirePalette(node);
    return node;
  }

  function paletteList() {
    const hidden = new Set(parent.hidden || []);
    const all = [...PANELS.filter((p) => !hidden.has(p.id)), ...custom];
    if (tab === 'recent') return recent.map((id) => all.find((p) => p.id === id)).filter(Boolean);
    if (tab === 'mine') return custom;
    return all.filter((p) => p.kind === tab);
  }
  function paletteHtml() {
    const list = paletteList();
    const cards = list.map((p) => `<button class="pcard kind-${p.kind}" data-add="${esc(p.id)}"><span class="em">${p.emoji}</span><span class="nm">${T(p.obj)}</span></button>`).join('');
    const make = tab === 'mine' && parent.kidCustom ? `<button class="pcard make" data-make><span class="em">➕</span><span class="nm">${T('つくる')}</span></button>` : '';
    const empty = !list.length && !make ? `<div class="empty">${T(tab === 'recent' ? 'まだ ないよ' : 'パネルが ないよ')}</div>` : '';
    return cards + make + empty;
  }
  function wakuHtml() {
    if (!draft.items.length) return `<div class="empty drop-hint">${T('ここに パネルを いれてね')}</div>`;
    return draft.items.map((it, i) => {
      const p = panelOf(it);
      const qty = p.unit ? `<div class="qty">${[1, 2, 3, 4, 5].map((n) => `<button data-qty="${i}:${n}" class="${(it.qty ?? (p.unitOptional ? 0 : 1)) === n ? 'on' : ''}">${n}</button>`).join('')}<span>${T(p.unit)}</span></div>` : '';
      return `<div class="wcard kind-${p.kind}" data-w="${i}"><span class="no">${i + 1}</span><span class="em">${p.emoji}</span><span class="nm">${T(p.obj)}</span>${qty}<button class="x" data-del="${i}" aria-label="${T('はずす')}">✕</button></div>`;
    }).join('');
  }
  function addPanel(id, at = draft.items.length) {
    const p = catalog()[id]; if (!p) return;
    draft.items.splice(at, 0, { key: newKey(), panel: id, ...(p.unit && !p.unitOptional ? { qty: 1 } : {}) });
    play('place'); speak(p.obj);
  }

  function wirePalette(node) {
    $$('[data-make]', node).forEach((b) => b.addEventListener('click', () => { play('tap'); makePanel(); }));
    $$('[data-add]', node).forEach((b) => dragSource(b, { kind: 'new', id: b.dataset.add }, node));
  }
  function wireWaku(node) {
    $$('[data-del]', node).forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); play('unplace'); draft.items.splice(Number(b.dataset.del), 1); draw(); }));
    $$('[data-qty]', node).forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); play('tap'); const [i, n] = b.dataset.qty.split(':').map(Number); draft.items[i].qty = n; draw(); }));
    $$('[data-w]', node).forEach((c) => dragSource(c, { kind: 'move', index: Number(c.dataset.w) }, node));
  }

  // F-302 ドラッグ（ながおし ふよう）。パレットは よこに スクロール するので、たてに うごかしたら ドラッグに する
  function dragSource(src, info, node) {
    let sx = 0, sy = 0, dragging = false, ghost = null, pid = null, mark = null;
    const waku = $('[data-waku]', node);
    const insertIndex = (x, y) => {
      const cards = $$('[data-w]', waku);
      for (let i = 0; i < cards.length; i++) {
        const r = cards[i].getBoundingClientRect();
        if (y < r.top) return i;
        if (y <= r.bottom && x < r.left + r.width / 2) return i;
      }
      return cards.length;
    };
    const overWaku = (x, y) => { const r = waku.getBoundingClientRect(); return x >= r.left - 10 && x <= r.right + 10 && y >= r.top - 30 && y <= r.bottom + 30; };
    let touch = false;
    src.addEventListener('pointerdown', (e) => {
      if (e.target.closest('[data-del],[data-qty]')) return;
      sx = e.clientX; sy = e.clientY; pid = e.pointerId; dragging = false; touch = e.pointerType === 'touch';
      if (!touch) { try { src.setPointerCapture(pid); } catch (er) { /* */ } }       // マウス・ペンは ずっと この カードで うけとる
    });
    src.addEventListener('pointermove', (e) => {
      if (pid !== e.pointerId) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!dragging) {
        // ゆびで パレットから：よこに うごかしたら スクロール（ブラウザが pointercancel）、たてなら ドラッグ
        const go = info.kind === 'new' && touch ? Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx) : Math.hypot(dx, dy) > 10;
        if (!go) return;
        dragging = true;
        try { src.setPointerCapture(pid); } catch (er) { /* */ }
        ghost = src.cloneNode(true); ghost.classList.add('drag-ghost'); document.body.appendChild(ghost);
        src.classList.add('dragging');
        mark = el('<div class="drop-mark"></div>');
      }
      ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px';
      const inside = overWaku(e.clientX, e.clientY);
      waku.classList.toggle('over', inside);
      if (inside) {
        const idx = insertIndex(e.clientX, e.clientY);
        const cards = $$('[data-w]', waku);
        if (cards[idx]) waku.insertBefore(mark, cards[idx]); else waku.appendChild(mark);
      } else mark.remove();
    });
    const end = (e, cancel) => {
      if (pid !== e.pointerId) return;
      pid = null;
      if (!dragging) {
        if (!cancel && info.kind === 'new') { addPanel(info.id); draw(); }      // タップでも すえに はいる
        return;
      }
      dragging = false; ghost?.remove(); mark?.remove(); src.classList.remove('dragging'); waku.classList.remove('over');
      if (cancel) return;
      const inside = overWaku(e.clientX, e.clientY);
      if (info.kind === 'new' && inside) { addPanel(info.id, insertIndex(e.clientX, e.clientY)); draw(); }
      if (info.kind === 'move') {
        const [it] = draft.items.splice(info.index, 1);
        if (inside) { let to = insertIndex(e.clientX, e.clientY); if (to > info.index) to--; draft.items.splice(Math.min(to, draft.items.length), 0, it); play('place'); } else play('unplace');   // わくの そとへ ドラッグで はずす
        draw();
      }
    };
    src.addEventListener('pointerup', (e) => end(e, false));
    src.addEventListener('pointercancel', (e) => end(e, true));
  }

  // じかんを えらぶ（じ・ふん を タップ）
  function pickTime(title, cur, done) {
    let h = Math.floor(cur / 60) % 24, m = cur % 60;
    const { root: r, close } = modal(`<h2>${T(title)}</h2><div class="pick-big" data-show></div>
      <div class="lbl">${T('じ')}</div><div class="chips wrap">${Array.from({ length: 18 }, (_, i) => i + 5).map((x) => `<button data-h="${x}">${x}</button>`).join('')}</div>
      <div class="lbl">${T('ふん')}</div><div class="chips wrap">${Array.from({ length: 12 }, (_, i) => i * 5).map((x) => `<button data-m="${x}">${String(x).padStart(2, '0')}</button>`).join('')}</div>
      <div class="row"><button class="btn gray" data-close>${T('やめる')}</button><button class="btn" data-ok>${T('きめる')}</button></div>`, { cls: 'picker' });
    const show = () => { $('[data-show]', r).textContent = `${h}:${String(m).padStart(2, '0')}`; $$('[data-h]', r).forEach((b) => b.classList.toggle('on', Number(b.dataset.h) === h)); $$('[data-m]', r).forEach((b) => b.classList.toggle('on', Number(b.dataset.m) === m)); };
    $$('[data-h]', r).forEach((b) => b.addEventListener('click', () => { play('tap'); h = Number(b.dataset.h); show(); }));
    $$('[data-m]', r).forEach((b) => b.addEventListener('click', () => { play('tap'); m = Number(b.dataset.m); show(); }));
    $('[data-ok]', r).addEventListener('click', () => { play('select'); close(); done(h * 60 + m); });
    show();
  }

  // F-305 じさく パネル（なまえは ひらがな 8もじ まで）
  function makePanel() {
    const st = { name: '', verb: VERBS[0], emoji: EMOJIS[0], kind: 'focus', base: 10 };
    const { root: r, close } = modal(`<h2>${T('パネルを つくる')}</h2>
      <div class="lbl">${T('なまえ')}（${T('ひらがな 8もじ まで')}）</div><input data-name maxlength="8" inputmode="kana" autocomplete="off">
      <div class="lbl">${T('どうする')}</div><div class="chips wrap">${VERBS.map((v, i) => `<button data-verb="${i}">${T(v)}</button>`).join('')}</div>
      <div class="lbl">${T('え')}</div><div class="emoji-grid">${EMOJIS.map((x) => `<button data-emoji="${x}">${x}</button>`).join('')}</div>
      <div class="lbl">${T('しゅるい')}</div><div class="chips">${Object.values(KINDS).map((k) => `<button data-kind="${k.id}">${T(k.name)}</button>`).join('')}</div>
      <div class="lbl">${T('ながさの めやす')}</div><div class="chips wrap">${[5, 10, 15, 20, 30, 45, 60].map((x) => `<button data-base="${x}">${minText(x)}</button>`).join('')}</div>
      <div class="warn" data-err></div>
      <div class="row"><button class="btn gray" data-close>${T('やめる')}</button><button class="btn" data-ok>${T('つくる')}</button></div>`, { cls: 'wide' });
    const sync = () => {
      $$('[data-verb]', r).forEach((b) => b.classList.toggle('on', VERBS[Number(b.dataset.verb)] === st.verb));
      $$('[data-emoji]', r).forEach((b) => b.classList.toggle('on', b.dataset.emoji === st.emoji));
      $$('[data-kind]', r).forEach((b) => b.classList.toggle('on', b.dataset.kind === st.kind));
      $$('[data-base]', r).forEach((b) => b.classList.toggle('on', Number(b.dataset.base) === st.base));
    };
    $$('[data-verb]', r).forEach((b) => b.addEventListener('click', () => { play('tap'); st.verb = VERBS[Number(b.dataset.verb)]; sync(); }));
    $$('[data-emoji]', r).forEach((b) => b.addEventListener('click', () => { play('tap'); st.emoji = b.dataset.emoji; sync(); }));
    $$('[data-kind]', r).forEach((b) => b.addEventListener('click', () => { play('tap'); st.kind = b.dataset.kind; sync(); }));
    $$('[data-base]', r).forEach((b) => b.addEventListener('click', () => { play('tap'); st.base = Number(b.dataset.base); sync(); }));
    $('[data-ok]', r).addEventListener('click', () => {
      const name = $('[data-name]', r).value.trim();
      if (!/^[ぁ-ゖーー ]{1,8}$/.test(name)) { $('[data-err]', r).innerHTML = T('なまえは ひらがなで 1〜8もじ だよ'); return; }
      const finish = st.kind === 'focus' || st.kind === 'life' ? 'done' : 'timed';
      const min = Math.max(5, Math.floor(st.base / 2 / 5) * 5), max = Math.min(120, Math.max(st.base, st.base * 2));
      const p = { id: 'my_' + Date.now().toString(36), obj: name, verb: st.verb, emoji: st.emoji, kind: st.kind, base: st.base, min, max, finish, custom: true };
      custom.push(p); saveCustom();
      play('upgrade'); close(); tab = 'mine'; draw();
    });
    sync();
  }

  // ───────────── 2. タイムテーブル
  function stepTable() {
    const tt = planDraft(draft);
    const S = startOf(draft), E = endOf(draft, S);
    const node = el(`<div class="screen maker table">
      <header class="bar"><button class="btn ghost" data-back>← ${T('もどる')}</button><h1>${T('タイムテーブル')}</h1>
        <div class="seg" role="group"><button data-mode="ratio" class="${draft.mode === 'ratio' ? 'on' : ''}">${T('ひれい')}</button><button data-mode="equal" class="${draft.mode === 'equal' ? 'on' : ''}">${T('おなじ')}</button></div></header>
      <div class="tt-body">
        <section class="card tt-visual">
          <div class="clock-wrap">${clockSvg(tt.ok ? tt.items.map((it) => ({ from: it.start, to: it.end, color: itemColor(it) })) : [], S)}</div>
          <div class="total"><b>${E - S}</b>${minText(E - S).slice(String(E - S).length)}<small>${clock(S)}〜${clock(E)}</small></div>
          ${tt.ok ? `<div class="band">${tt.items.map((it) => `<span style="flex:${it.planned};background:${itemColor(it)}" title="${esc(it.panel)}">${it.emoji}</span>`).join('')}</div>` : ''}
        </section>
        <section class="card tt-list">${tt.ok ? listHtml(tt) : errorHtml(tt)}</section>
      </div>
      <footer class="foot"><button class="btn big go" data-go ${tt.ok ? '' : 'disabled'}>🚀 ${T('ミッションかいし！')}</button></footer>
    </div>`);
    $('[data-back]', node).addEventListener('click', () => { play('tap'); draft.step = 1; draw(); });
    $$('[data-mode]', node).forEach((b) => b.addEventListener('click', () => { play('tap'); draft.mode = b.dataset.mode; draw(); }));
    $$('[data-fix]', node).forEach((b) => b.addEventListener('click', () => { play('select'); applyFix(tt.fixes[Number(b.dataset.fix)].apply); }));
    $$('[data-adj]', node).forEach((b) => b.addEventListener('click', () => { play('tap'); adjust(tt, Number(b.dataset.i), Number(b.dataset.adj)); }));
    $$('[data-lock]', node).forEach((b) => b.addEventListener('click', () => { play('tap'); toggleLock(tt, Number(b.dataset.lock)); }));
    $$('[data-nobreak]', node).forEach((b) => b.addEventListener('click', () => { play('unplace'); draft.autoBreak = false; draw(); }));
    $$('[data-sugg]', node).forEach((b) => b.addEventListener('click', () => {
      play('tap');
      const s = tt.suggestions[0];
      draft.suppress = [...new Set([...draft.suppress, s.id])];
      if (b.dataset.sugg === 'yes') draft.items = s.apply.items.map((x) => ({ ...x }));
      draw();
    }));
    $('[data-go]', node).addEventListener('click', () => { if (!tt.ok) return; play('select'); app.launch(draft); });
    if (tt.ok && tt.suggestions[0]) setTimeout(() => speak(tt.suggestions[0].text), 300);
    return node;
  }
  function listHtml(tt) {
    const s = tt.suggestions[0];
    const sugg = s ? `<div class="bubble"><span class="mascot">${app.theme().mascot.emoji}</span><div><p>${T(s.text)}</p><div class="row"><button class="btn small" data-sugg="yes">${T('そうする')}</button><button class="btn small gray" data-sugg="no">${T('このまま')}</button></div></div></div>` : '';
    const notes = tt.notices.map((n) => `<div class="notice">${T(n.text)}</div>`).join('');
    const rows = tt.items.map((it, i) => {
      const time = `<div class="tt-time">${clock(it.start)}<small>〜${clock(it.end)}</small></div>`;
      const name = `<div class="tt-name"><span class="em">${it.emoji}</span><span>${T(it.obj)}${it.qty ? ` <small>${it.qty}${T(it.unit)}</small>` : ''}</span><b>${minText(it.planned)}</b></div>`;
      let ctl = '';
      if (it.auto === 'break') ctl = `<button class="btn small gray" data-nobreak>${T('はずす')}</button>`;
      else if (!it.auto) ctl = `<button class="adj" data-adj="-5" data-i="${i}" ${it.planned - STEP < it.min ? 'disabled' : ''}>−5</button><button class="adj" data-adj="5" data-i="${i}" ${it.planned + STEP > it.max ? 'disabled' : ''}>+5</button><button class="adj lock ${it.locked ? 'on' : ''}" data-lock="${i}" aria-label="${T('こてい')}">${it.locked ? '🔒' : '🔓'}</button>`;
      return `<div class="tt-row" style="--c:${itemColor(it)}">${time}${name}<div class="tt-ctl">${ctl}</div></div>`;
    }).join('');
    return sugg + notes + `<div class="tt-rows">${rows}</div>`;
  }
  function errorHtml(tt) {
    return `<div class="bubble err"><span class="mascot">${app.theme().mascot.emoji}</span><div><p>${T(tt.text)}</p><div class="row wrap">${(tt.fixes || []).map((f, i) => `<button class="btn small" data-fix="${i}">${T(f.text)}</button>`).join('')}</div></div></div>`;
  }
  function applyFix(apply) {
    if (apply.items) draft.items = apply.items.map((x) => ({ ...x }));
    if (apply.end != null) { const S = startOf(draft); if (draft.endMode === 'dur') draft.dur = apply.end - S; else draft.end = apply.end; }
    draw();
  }
  // F-405 −5／+5：かえた ながさは こてい あつかい（F-307）。ほかが ちぢんで ごうけいを たもつ
  function adjust(tt, i, delta) {
    const it = tt.items[i]; const d = draft.items[it.src];
    if (!d) return;
    d.minutes = Math.max(it.min, Math.min(it.max, it.planned + delta));
    draw();
  }
  function toggleLock(tt, i) {
    const it = tt.items[i]; const d = draft.items[it.src];
    if (!d) return;
    if (it.locked) { delete d.minutes; delete d.locked; } else d.minutes = it.planned;
    draw();
  }

  draw();
  return () => clearInterval(timer);
}
