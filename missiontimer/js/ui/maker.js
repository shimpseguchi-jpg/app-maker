// スケジュールメイカー（REQUIREMENTS.md 5.3〜5.4・F-203・F-301〜F-307・F-401〜F-406）
// 「◯ぷんかん」が きほん：じこく（◯じ〜◯じ）は つかわず、ながさ だけ きめる。いつも いまから はじまる。
// すぐに はじめられるように 1がめん：なんぷんかん・きょうの ミッション（タイムテーブル）・パネル。
// パネルを いれる たびに おまかせで くぎり なおすので、「ミッションかいし！」を おすだけで はじまる。
import { T, $, $$, el, esc, modal, play, speak, clockSvg, itemColor, minText } from './common.js';
import { plan, STEP, MIN_TOTAL, MAX_TOTAL } from '../engine/schedule.js';
import { PANELS, PANEL_BY_ID, KINDS, VERBS, EMOJIS } from '../data/panels.js';
import { profile, parent, record, custom, recent, saveCustom, saveDraft, dayKey } from '../save.js';

const DURS = [15, 20, 30, 45, 60, 90, 120];
let keySeq = 1;
const newKey = () => 'k' + Date.now().toString(36) + (keySeq++);

export function newDraft(over = {}) {
  return { dur: 60, items: [], mode: 'ratio', autoBreak: true, suppress: [], ...over };
}
export function draftFromTemplate(tp) {
  return newDraft({ items: tp.items.map((it) => ({ ...it, key: newKey() })), mode: tp.mode, dur: tp.minutes, template: tp.id });
}
// このまえと おなじ：ならび・すうりょう・こていした ながさ・ほうしき・ながさ を そのまま
export function draftFromLast(last) {
  return newDraft({ items: last.items.map((it) => ({ ...it, key: newKey() })), mode: last.mode || 'ratio', dur: last.dur || 60, autoBreak: last.autoBreak !== false });
}
export function lastOf(d) {
  return { items: d.items.map(({ panel, qty, minutes, locked }) => ({ panel, ...(qty != null ? { qty } : {}), ...(minutes != null ? { minutes } : {}), ...(locked ? { locked } : {}) })), dur: d.dur, mode: d.mode, autoBreak: d.autoBreak };
}

export function catalog() { return { ...PANEL_BY_ID, ...Object.fromEntries(custom.map((p) => [p.id, p])) }; }
export function rewardCapNow() {
  const used = record.days[dayKey()]?.rewardMin || 0;
  return Math.max(0, Math.min(parent.rewardCapMission, parent.rewardCapDay - used));        // F-801
}
// タイムテーブルは 0〜◯ぷん（はじめた ときから はかる）。じこくの めやす（おふろ 19:00 など）は つかわない
export function planDraft(d) {
  return plan({
    start: 0, end: d.dur, items: d.items, grade: profile.grade, mode: d.mode, autoBreak: d.autoBreak, suppress: d.suppress,
    rewardCap: rewardCapNow(), catalog: catalog(),
    extendMax: parent.extendMax, allowEndExtend: parent.allowEndExtend, shrink: parent.shrink,
  });
}

const panelOf = (it) => catalog()[it.panel] || PANEL_BY_ID.free;
const TABS = [['recent', 'さいきん'], ['focus', 'しゅうちゅう'], ['life', 'せいかつ'], ['reward', 'ごほうび'], ['rest', 'きゅうけい'], ['mine', 'じぶんで']];

export function renderMaker(root, app, draft) {
  let tab = recent.length ? 'recent' : 'focus';
  let spoken = '';
  if (!(draft.dur >= MIN_TOTAL && draft.dur <= MAX_TOTAL)) draft.dur = 60;           // ふるい つくりかけ（じこく しき）でも ひらける

  function draw() {
    const keep = root.querySelector('[data-palette]')?.scrollLeft || 0;
    const y = window.scrollY;
    root.innerHTML = '';
    root.appendChild(screen());
    const pal = root.querySelector('[data-palette]'); if (pal) pal.scrollLeft = keep;
    window.scrollTo(0, y);
    saveDraft(draft);
  }

  function screen() {
    const T0 = draft.dur;
    const tt = draft.items.length ? planDraft(draft) : null;
    const segs = tt?.ok ? tt.items.map((it) => ({ from: it.start, to: it.end, color: itemColor(it) })) : [{ from: 0, to: T0, color: 'var(--accent)' }];
    const node = el(`<div class="screen maker">
      <header class="bar"><button class="btn ghost" data-home>← ${T('ホーム')}</button><h1>${T('ミッションを つくる')}</h1>
        <div class="seg" role="group"><button data-mode="ratio" class="${draft.mode === 'ratio' ? 'on' : ''}">${T('ひれい')}</button><button data-mode="equal" class="${draft.mode === 'equal' ? 'on' : ''}">${T('おなじ')}</button></div></header>
      <div class="maker-body">
        <section class="card m-time">
          <div class="time-row">
            <div class="clock-wrap">${clockSvg(segs, null, { minutes: true })}</div>
            <div class="time-ctl">
              <div class="lbl">${T('なんぷんかん？')}</div>
              <div class="dur-big"><button class="adj" data-step="-5" ${T0 - STEP < MIN_TOTAL ? 'disabled' : ''} aria-label="−5">−5</button>
                <span class="total"><b>${T0}</b>${minText(T0).slice(String(T0).length)}${T('かん')}</span>
                <button class="adj" data-step="5" ${T0 + STEP > MAX_TOTAL ? 'disabled' : ''} aria-label="+5">+5</button></div>
              <div class="chips">${DURS.map((m) => `<button data-dur="${m}" class="${draft.dur === m ? 'on' : ''}">${minText(m)}</button>`).join('')}</div>
              <div class="sub-note">${T('「ミッションかいし！」で いまから はじまるよ')}</div>
            </div>
          </div>
        </section>
        <section class="card m-list">
          <h2>${T('きょうの ミッション')} <small>${T('ならべた じゅんに すすむよ')}</small>${draft.items.length ? `<button class="btn ghost small clear" data-clear>🗑 ${T('ぜんぶ はずす')}</button>` : ''}</h2>
          ${tt ? (tt.ok ? bubbleHtml(tt) : errorHtml(tt)) : ''}
          <div class="waku" data-waku>${rowsHtml(tt)}</div>
        </section>
        <section class="card m-panels">
          <h2>${T('パネル')} <small>${T('タップで いれる・ドラッグで ならべる')}</small></h2>
          <div class="tabs" role="tablist">${TABS.map(([k, n]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${T(n)}</button>`).join('')}</div>
          <div class="palette" data-palette>${paletteHtml()}</div>
        </section>
      </div>
      <footer class="foot"><button class="btn big go" data-go ${tt?.ok ? '' : 'disabled'}>🚀 ${T('ミッションかいし！')}</button></footer>
    </div>`);
    wire(node, tt);
    if (tt?.ok && tt.suggestions[0] && spoken !== tt.suggestions[0].id) { spoken = tt.suggestions[0].id; setTimeout(() => speak(tt.suggestions[0].text), 300); }
    return node;
  }

  function bubbleHtml(tt) {
    const s = tt.suggestions[0];
    const sugg = s ? `<div class="bubble"><span class="mascot">${app.theme().mascot.emoji}</span><div><p>${T(s.text)}</p><div class="row"><button class="btn small" data-sugg="yes">${T('そうする')}</button><button class="btn small gray" data-sugg="no">${T('このまま')}</button></div></div></div>` : '';
    return sugg + tt.notices.map((n) => `<div class="notice">${T(n.text)}</div>`).join('');
  }
  function errorHtml(tt) {
    // なおしかたの もじは「◯ぷんかん」で いう（スケジューラの もじは じこく しき）
    const label = (f) => (f.id === 'extendEnd' ? `${minText(f.minutes)} ふやす` : f.id === 'setEnd' ? `${minText(f.apply.end)}かんに する` : f.text);
    return `<div class="bubble err"><span class="mascot">${app.theme().mascot.emoji}</span><div><p>${T(tt.text)}</p><div class="row wrap">${(tt.fixes || []).map((f, i) => `<button class="btn small" data-fix="${i}">${T(label(f))}</button>`).join('')}</div></div></div>`;
  }
  function rowsHtml(tt) {
    if (!draft.items.length) return `<div class="empty drop-hint">${T('パネルを タップして いれてね')}</div>`;
    const rows = tt?.ok ? tt.items : draft.items.map((it, i) => ({ ...panelOf(it), ...it, src: i, planned: null, auto: false }));
    let no = 0;
    return rows.map((it) => {
      const d = it.auto ? null : draft.items[it.src];
      const p = d ? panelOf(d) : null;
      const time = d ? `<span class="no">${++no}</span>` : '<span class="no none"></span>';      // じゅんばん（じこくは ださない）
      const len = it.planned != null ? `<b class="len">${minText(it.planned)}</b>` : '';
      let ctl = '';
      if (it.auto === 'break') ctl = `<button class="btn small gray" data-nobreak>${T('はずす')}</button>`;
      else if (d) {
        const qty = p.unit ? `<span class="qty">${[1, 2, 3, 4, 5].map((n) => `<button data-qty="${it.src}:${n}" class="${(d.qty ?? (p.unitOptional ? 0 : 1)) === n ? 'on' : ''}">${n}</button>`).join('')}<i>${T(p.unit)}</i></span>` : '';
        const adj = it.planned != null ? `<button class="adj" data-adj="-5" data-i="${it.src}" ${it.planned - STEP < it.min ? 'disabled' : ''}>−5</button><button class="adj" data-adj="5" data-i="${it.src}" ${it.planned + STEP > it.max ? 'disabled' : ''}>+5</button><button class="adj lock ${it.locked ? 'on' : ''}" data-lock="${it.src}" aria-label="${T('こてい')}">${it.locked ? '🔒' : '🔓'}</button>` : '';
        ctl = `${qty}${adj}<button class="adj x" data-del="${it.src}" aria-label="${T('はずす')}">✕</button>`;
      }
      return `<div class="trow ${it.auto ? 'auto' : ''}" ${d ? `data-w="${it.src}"` : ''} style="--c:${itemColor(it)}">
        ${d ? `<span class="grip" data-grip="${it.src}" aria-label="${T('うごかす')}">⠿</span>` : '<span class="grip none"></span>'}
        ${time}<span class="em">${it.emoji}</span><span class="nm">${T(it.obj)}</span>${len}
        <div class="ctl">${ctl}</div></div>`;
    }).join('');
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
  function addPanel(id, at = draft.items.length) {
    const p = catalog()[id]; if (!p) return;
    draft.items.splice(at, 0, { key: newKey(), panel: id, ...(p.unit && !p.unitOptional ? { qty: 1 } : {}) });
    play('place'); speak(p.obj);
  }

  function wire(node, tt) {
    $('[data-home]', node).addEventListener('click', () => { play('tap'); app.go('home'); });
    $$('[data-mode]', node).forEach((b) => b.addEventListener('click', () => { play('tap'); draft.mode = b.dataset.mode; draw(); }));
    $$('[data-dur]', node).forEach((b) => b.addEventListener('click', () => { play('tap'); draft.dur = Number(b.dataset.dur); draw(); }));
    $$('[data-step]', node).forEach((b) => b.addEventListener('click', () => { play('tap'); draft.dur = Math.max(MIN_TOTAL, Math.min(MAX_TOTAL, draft.dur + Number(b.dataset.step))); draw(); }));
    $$('[data-tab]', node).forEach((b) => b.addEventListener('click', () => { play('tap'); tab = b.dataset.tab; draw(); }));
    $$('[data-make]', node).forEach((b) => b.addEventListener('click', () => { play('tap'); makePanel(); }));
    $('[data-clear]', node)?.addEventListener('click', () => { play('unplace'); draft.items = []; draft.suppress = []; draft.autoBreak = true; draw(); });
    $$('[data-del]', node).forEach((b) => b.addEventListener('click', () => { play('unplace'); draft.items.splice(Number(b.dataset.del), 1); draw(); }));
    $$('[data-qty]', node).forEach((b) => b.addEventListener('click', () => { play('tap'); const [i, n] = b.dataset.qty.split(':').map(Number); draft.items[i].qty = n; delete draft.items[i].minutes; draw(); }));
    $$('[data-nobreak]', node).forEach((b) => b.addEventListener('click', () => { play('unplace'); draft.autoBreak = false; draw(); }));   // F-404 はずすと もう はさまない
    $$('[data-fix]', node).forEach((b) => b.addEventListener('click', () => { play('select'); applyFix(tt.fixes[Number(b.dataset.fix)].apply); }));
    $$('[data-sugg]', node).forEach((b) => b.addEventListener('click', () => {
      play('tap');
      const s = tt.suggestions[0];
      draft.suppress = [...new Set([...draft.suppress, s.id])];                       // F-406 おなじ ていあんは 1かい まで
      if (b.dataset.sugg === 'yes') draft.items = s.apply.items.map((x) => ({ ...x }));
      draw();
    }));
    // F-405 −5／+5：かえた ながさは こてい あつかい（F-307）。ほかが ちぢんで ごうけいを たもつ
    $$('[data-adj]', node).forEach((b) => b.addEventListener('click', () => {
      play('tap');
      const src = Number(b.dataset.i), it = tt.items.find((x) => x.src === src && !x.auto);
      draft.items[src].minutes = Math.max(it.min, Math.min(it.max, it.planned + Number(b.dataset.adj)));
      draw();
    }));
    $$('[data-lock]', node).forEach((b) => b.addEventListener('click', () => {
      play('tap');
      const src = Number(b.dataset.lock), it = tt.items.find((x) => x.src === src && !x.auto), d = draft.items[src];
      if (it.locked) { delete d.minutes; delete d.locked; } else d.minutes = it.planned;
      draw();
    }));
    $('[data-go]', node).addEventListener('click', () => { if (!tt?.ok) return; play('select'); app.launch(draft); });
    $$('[data-add]', node).forEach((b) => dragSource(b, b, { kind: 'new', id: b.dataset.add }, node));
    $$('[data-grip]', node).forEach((g) => dragSource(g, g.closest('.trow'), { kind: 'move', index: Number(g.dataset.grip) }, node));
  }
  function applyFix(apply) {
    if (apply.items) draft.items = apply.items.map((x) => ({ ...x }));
    if (apply.end != null) draft.dur = apply.end;                                        // はじまりは 0 なので おわり ＝ ◯ぷんかん
    draw();
  }

  // F-302 ドラッグ（ながおし ふよう）。パレットの カードは タップで すえに はいる。ゆびで パレットから ドラッグ する ときは
  // たてに うごかす（よこは パレットの スクロール）。わくの なかは ⠿ を つかんで ならべかえ、わくの そとへ はなすと はずす
  function dragSource(handle, body, info, node) {
    let sx = 0, sy = 0, dragging = false, ghost = null, pid = null, mark = null, touch = false;
    const waku = $('[data-waku]', node);
    const insertIndex = (y) => {
      for (const r of $$('[data-w]', waku)) { const b = r.getBoundingClientRect(); if (y < b.top + b.height / 2) return Number(r.dataset.w); }
      return draft.items.length;
    };
    const overWaku = (x, y) => { const r = waku.getBoundingClientRect(); return x >= r.left - 10 && x <= r.right + 10 && y >= r.top - 30 && y <= r.bottom + 30; };
    handle.addEventListener('pointerdown', (e) => {
      sx = e.clientX; sy = e.clientY; pid = e.pointerId; dragging = false; touch = e.pointerType === 'touch';
      if (!touch || info.kind === 'move') { try { handle.setPointerCapture(pid); } catch (er) { /* */ } }
    });
    handle.addEventListener('pointermove', (e) => {
      if (pid !== e.pointerId) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!dragging) {
        // パレットが よこに スクロール できる（スマホ たて）ときだけ、ゆびは たてに うごかしたら ドラッグ
        const pal = $('[data-palette]', node), scrolls = pal && pal.scrollWidth > pal.clientWidth + 2;
        const go = info.kind === 'new' && touch && scrolls ? Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx) : Math.hypot(dx, dy) > 8;
        if (!go) return;
        dragging = true;
        try { handle.setPointerCapture(pid); } catch (er) { /* */ }
        const r = body.getBoundingClientRect();
        ghost = body.cloneNode(true); ghost.classList.add('drag-ghost'); ghost.style.width = r.width + 'px'; document.body.appendChild(ghost);
        body.classList.add('dragging');
        mark = el('<div class="drop-mark"></div>');
      }
      e.preventDefault();
      ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px';
      const inside = overWaku(e.clientX, e.clientY);
      waku.classList.toggle('over', inside);
      if (inside) {
        const idx = insertIndex(e.clientY);
        const row = $(`[data-w="${idx}"]`, waku);
        if (row) waku.insertBefore(mark, row); else waku.appendChild(mark);
      } else mark.remove();
    });
    const end = (e, cancel) => {
      if (pid !== e.pointerId) return;
      pid = null;
      if (!dragging) { if (!cancel && info.kind === 'new') { addPanel(info.id); draw(); } return; }   // タップでも すえに はいる
      dragging = false; ghost?.remove(); mark?.remove(); body.classList.remove('dragging'); waku.classList.remove('over');
      if (cancel) return;
      const inside = overWaku(e.clientX, e.clientY);
      if (info.kind === 'new' && inside) { addPanel(info.id, insertIndex(e.clientY)); draw(); }
      if (info.kind === 'move') {
        const to0 = insertIndex(e.clientY);
        const [it] = draft.items.splice(info.index, 1);
        if (inside) { const to = to0 > info.index ? to0 - 1 : to0; draft.items.splice(Math.min(to, draft.items.length), 0, it); play('place'); } else play('unplace');
        draw();
      }
    };
    handle.addEventListener('pointerup', (e) => end(e, false));
    handle.addEventListener('pointercancel', (e) => end(e, true));
  }


  // F-305 じさく パネル（パネルの なまえは ひらがな 8もじ まで）
  function makePanel() {
    const st = { verb: VERBS[0], emoji: EMOJIS[0], kind: 'focus', base: 10 };
    const { root: r, close } = modal(`<h2>${T('パネルを つくる')}</h2>
      <div class="lbl">${T('パネルの なまえ')}（${T('ひらがな 8もじ まで')}）</div><input data-pname maxlength="8" autocomplete="off">
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
      const name = $('[data-pname]', r).value.trim();
      if (!/^[ぁ-ゖーー ]{1,8}$/.test(name)) { $('[data-err]', r).innerHTML = T('なまえは ひらがなで 1〜8もじ だよ'); return; }
      const finish = st.kind === 'focus' || st.kind === 'life' ? 'done' : 'timed';
      const min = Math.max(5, Math.floor(st.base / 2 / 5) * 5), max = Math.min(120, Math.max(st.base, st.base * 2));
      custom.push({ id: 'my_' + Date.now().toString(36), obj: name, verb: st.verb, emoji: st.emoji, kind: st.kind, base: st.base, min, max, finish, custom: true });
      saveCustom();
      play('upgrade'); close(); tab = 'mine'; draw();
    });
    sync();
  }

  draw();
}
