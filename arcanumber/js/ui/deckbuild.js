// パックを えらぶ・あける・デッキを くむ
import { CARDS, ELEMENTS, EL_LIST } from '../data/cards.js';
import { PACKS, PACK_TYPES, openPack, cardRarity, DECK_MIN, DECK_MAX, REBUILD_MAX } from '../data/packs.js';
import { deckSorted, autoBuild } from '../engine/run.js';
import { T } from '../text.js';
import { el, $, $$ } from '../util.js';
import { sfx } from '../audio.js';
import { mark } from '../save.js';
import { cardHtml } from './cardview.js';
import { cardDetail, guide } from './modal.js';
import { HEROES } from '../data/heroes.js';
import * as FX from './fx.js';

function overlay(app, html) {
  const o = el(`<div class="overlay">${html}</div>`);
  app.stage.appendChild(o);
  return o;
}
function packStyle(type) {
  const E = ELEMENTS[PACKS[type].el];
  const pc = type === 'silver' ? '#c9c2d8' : E.color;
  const pd = type === 'silver' ? '#4a4560' : E.dark;
  return `--pc:${pc};--pd:${pd}`;
}
export function packHtml(type, { big = false, rec = false } = {}) {
  const P = PACKS[type];
  return `<div class="pack ${big ? 'big' : ''}" data-pack="${type}" style="${packStyle(type)}">${rec ? `<div class="rec">${T('おすすめ')}</div>` : ''}
    <div class="pk-logo">ARCANA</div><div class="pk-icon">${P.icon}</div><div class="pk-name">${T(P.name)}</div></div>`;
}

// パックを えらぶ（n こ）
export function packSelect(app, { n = 3, els = [], title = 'パックを 3つ えらぼう' } = {}) {
  return new Promise((resolve) => {
    const chosen = [];
    const o = overlay(app, `<div class="ov-head"><div><div class="ov-title">${T(title)}</div><div class="ov-sub">${T('おなじ パックを 2つ えらんでも いいよ。あけた カードと はじめの カードで デッキを つくる！')}</div></div></div>
      <div class="ov-body">
        <div class="row" style="gap:18px">${PACK_TYPES.map((t) => `<div class="pack-pick">${packHtml(t, { rec: els.includes(PACKS[t].el) })}<div class="pk-desc">${T(PACKS[t].desc)}</div></div>`).join('')}</div>
        <div class="row"><div class="tray"></div><button class="btn big" data-open disabled>${T('あける！')}</button></div>
      </div>`);
    const tray = $('.tray', o), openBtn = $('[data-open]', o);
    const render = () => {
      tray.innerHTML = Array.from({ length: n }, (_, i) => {
        const t = chosen[i];
        return t ? `<div class="ts full" data-i="${i}" style="${packStyle(t)}">${PACKS[t].icon}</div>` : `<div class="ts">${i + 1}</div>`;
      }).join('');
      $$('.ts.full', tray).forEach((x) => x.addEventListener('click', () => { sfx('unplace'); chosen.splice(Number(x.dataset.i), 1); render(); }));
      openBtn.disabled = chosen.length < n;
      openBtn.classList.toggle('ready', chosen.length >= n);
    };
    $$('.pack', o).forEach((p) => p.addEventListener('click', () => {
      if (chosen.length >= n) { sfx('wrong'); FX.toast(T(`${n}つまで だよ。したの パックを タップすると もどせる`), '📦', 1600); return; }
      sfx('place'); chosen.push(p.dataset.pack); FX.retrigger(p, 'fire', 300); render();
    }));
    openBtn.addEventListener('click', () => { if (chosen.length < n) return; sfx('tap'); o.remove(); resolve([...chosen]); });
    render();
    guide('pk_intro', 'デッキづくりの はじまり！ すきな パックを 3つ えらぼう。ヒーローの ぞくせいの パックには「おすすめ」が ついているよ。');
  });
}

// パックを あける
export function openPacks(app, types, rng, { rareBoost = 0 } = {}) {
  return new Promise((resolve) => {
    const all = [];
    const o = overlay(app, `<div class="ov-head"><div class="ov-title" data-t></div><div class="ov-sub" data-s></div></div><div class="ov-body" data-b></div>`);
    let k = 0;
    const next = () => {
      if (k >= types.length) { o.remove(); resolve(all); return; }
      const type = types[k];
      $('[data-t]', o).innerHTML = T(`${PACKS[type].name}（${k + 1} / ${types.length}）`);
      $('[data-s]', o).innerHTML = T('パックを タップして あけよう');
      const body = $('[data-b]', o);
      body.innerHTML = packHtml(type, { big: true });
      const pk = $('.pack', body);
      pk.addEventListener('click', async () => {
        if (pk._opened) return; pk._opened = true;
        sfx('shuffle'); pk.classList.add('shake');
        await FX.wait(520);
        FX.flashScreen('#fff'); sfx('open');
        const cards = openPack(type, rng, { rareBoost });
        cards.forEach((c) => mark('cards', c.id));
        all.push(...cards);
        body.innerHTML = `<div class="reveal-row">${cards.map((c, i) => `<div class="flip deal r-${cardRarity(c)}" data-i="${i}" style="animation-delay:${i * 0.08}s"><div class="fi"><div class="back">✦</div><div class="face">${cardHtml(c)}</div></div></div>`).join('')}</div>
          <div class="row"><button class="btn dark" data-all>${T('ぜんぶ めくる')}</button><button class="btn green big" data-next style="display:none">${T(k + 1 < types.length ? 'つぎの パック ▶' : 'デッキを つくる ▶')}</button></div>`;
        $('[data-s]', o).innerHTML = T('カードを タップして めくろう。ひかって いるのは めずらしい カード！');
        const flips = $$('.flip', body);
        const check = () => { if (flips.every((f) => f.classList.contains('open'))) { $('[data-all]', body).style.display = 'none'; $('[data-next]', body).style.display = ''; } };
        const flip = (f) => {
          if (f.classList.contains('open')) { cardDetail(cards[Number(f.dataset.i)]); return; }
          f.classList.add('open');
          const r = cardRarity(cards[Number(f.dataset.i)]);
          if (r === 'r') { sfx('crit'); const p = FX.posOf(f); FX.burst(p.x, p.y, { n: 20, stars: true, dist: 170 }); }
          else if (r === 'u') { sfx('upgrade'); } else sfx('place');
          check();
        };
        flips.forEach((f) => f.addEventListener('click', () => flip(f)));
        $('[data-all]', body).addEventListener('click', async () => { for (const f of flips) { if (!f.classList.contains('open')) { flip(f); await FX.wait(160); } } });
        $('[data-next]', body).addEventListener('click', () => { sfx('tap'); k++; next(); });
      });
    };
    next();
  });
}

// デッキの ぶんせき
function analysis(cards) {
  const runes = cards.filter((c) => c.id === 'rune');
  const others = cards.length - runes.length;
  const elCount = Object.fromEntries(EL_LIST.map((e) => [e, runes.filter((r) => r.el === e || r.enh === 'wild').length]));
  const hist = Array.from({ length: 10 }, (_, i) => runes.filter((r) => r.v === i + 1).length);
  const hints = [];
  const pairs = hist.map((n, i) => [i + 1, n]).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]);
  if (pairs.length) hints.push(`<b>ペア</b>：${pairs.slice(0, 3).map(([v, n]) => `${v}が ${n}{枚|まい}`).join('、')}`);
  const tens = [];
  for (let v = 1; v <= 5; v++) { const w = 10 - v; if ((v === 5 && hist[4] >= 2) || (v !== 5 && hist[v - 1] && hist[w - 1])) tens.push(`${v}と${w}`); }
  if (tens.length) hints.push(`<b>じゅうの わ</b>：${tens.slice(0, 4).join('、')}`);
  let best = [], cur = [];
  for (let v = 1; v <= 10; v++) { if (hist[v - 1]) { cur.push(v); if (cur.length > best.length) best = [...cur]; } else cur = []; }
  if (best.length >= 3) hints.push(`<b>かいだん</b>：${best.join('・')}`);
  const kk = [];
  for (let a = 2; a <= 5; a++) for (let b = a; b <= 5; b++) { const c = a * b; if (c > 10) continue; const need = {}; [a, b, c].forEach((x) => { need[x] = (need[x] || 0) + 1; }); if (Object.entries(need).every(([x, n]) => hist[x - 1] >= n)) kk.push(`${a}×${b}=${c}`); }
  if (kk.length) hints.push(`<b>くくの わ</b>：${kk.slice(0, 3).join('、')}`);
  const fl = EL_LIST.filter((e) => elCount[e] >= 6);
  if (fl.length) hints.push(`<b>いろそろい</b>：${fl.map((e) => `${ELEMENTS[e].icon}${elCount[e]}{枚|まい}`).join(' ')}`);
  if (!hints.length) hints.push('ルーンの {数|かず}が ばらばら。おなじ {数|かず}を あつめると {役|やく}が つくりやすい');
  return { runes: runes.length, others, elCount, hist, hints };
}

// デッキを くむ。pool の なかから えらぶ。かえりち：えらんだ カード（null なら やめた）
export function deckBuilder(app, { pool, selected, min = DECK_MIN, max = DECK_MAX, title = 'デッキを つくろう', newUids = [], canCancel = false, els = [] }) {
  return new Promise((resolve) => {
    const sel = new Set(selected.map((c) => c.uid));
    const list = deckSorted(pool);
    const o = overlay(app, `<div class="ov-head">
        <div><div class="ov-title">${T(title)}</div><div class="ov-sub">${T('カードを タップして デッキに いれる / はずす。ながおしで せつめい')}</div></div>
        <div class="row" style="flex-wrap:nowrap;gap:10px"><div class="count-pill" data-count></div>
          <button class="btn dark small" data-auto>🪄 ${T('おまかせ')}</button>
          ${canCancel ? `<button class="btn dark small" data-cancel>${T('やめる')}</button>` : ''}
          <button class="btn green" data-ok>${T('けってい')}</button></div></div>
      <div class="db"><div class="db-pool scroll"><div class="db-grid"></div></div><div class="db-side"></div></div>`);
    const grid = $('.db-grid', o), side = $('.db-side', o);
    const render = () => {
      grid.innerHTML = list.map((c) => `<div class="db-item ${sel.has(c.uid) ? 'in' : 'out'}" data-uid="${c.uid}">${newUids.includes(c.uid) ? '<div class="newb">NEW</div>' : ''}<div class="chk">${sel.has(c.uid) ? '✓' : '＋'}</div>${cardHtml(c)}</div>`).join('');
      $$('.db-item', grid).forEach((n) => bind(n));
      renderSide();
    };
    const renderSide = () => {
      const chosen = list.filter((c) => sel.has(c.uid));
      const A = analysis(chosen);
      const n = chosen.length;
      const cp = $('[data-count]', o);
      cp.innerHTML = T(`デッキ ${n}{枚|まい}`) + `<span style="font-size:13px;color:var(--ink-dim)">（${min}〜${max}）</span>`;
      cp.className = 'count-pill ' + (n >= min && n <= max ? 'ok' : 'ng');
      $('[data-ok]', o).disabled = !(n >= min && n <= max);
      const maxEl = Math.max(1, ...Object.values(A.elCount));
      const maxH = Math.max(1, ...A.hist);
      side.innerHTML = `<h4>${T('なかみ')}</h4><div style="font-size:14px">${T(`ルーン ${A.runes}{枚|まい}　それいがい ${A.others}{枚|まい}`)}</div>
        <div class="elbars">${EL_LIST.map((e) => `<div class="elbar"><span>${ELEMENTS[e].icon}</span><span class="t"><i style="width:${A.elCount[e] / maxEl * 100}%;background:${ELEMENTS[e].color}"></i></span><span class="n">${A.elCount[e]}</span></div>`).join('')}</div>
        <h4>${T('ルーンの {数|かず}')}</h4>
        <div class="hist">${A.hist.map((h, i) => `<div class="hc"><span class="hv">${h || ''}</span><div class="hb ${h ? '' : 'z'}" style="height:${h / maxH * 60}px"></div><span class="hn">${i + 1}</span></div>`).join('')}</div>
        <h4>${T('つくりやすい {役|やく}')}</h4><div class="hints">${A.hints.map((h) => `<div class="hint">${T(h)}</div>`).join('')}</div>
        <div class="db-msg">${T(n < min ? `あと ${min - n}{枚|まい} いれてね` : n > max ? `${n - max}{枚|まい} はずしてね` : 'デッキは すくないほど、つよい カードを よく ひけるよ')}</div>`;
    };
    const bind = (n) => {
      const uidv = n.dataset.uid;
      const inst = list.find((c) => c.uid === uidv);
      let t = null, long = false;
      n.addEventListener('pointerdown', () => { long = false; t = setTimeout(() => { long = true; sfx('page'); cardDetail(inst); }, 480); });
      n.addEventListener('pointerleave', () => clearTimeout(t));
      n.addEventListener('pointerup', () => {
        clearTimeout(t);
        if (long) return;
        if (sel.has(uidv)) { sel.delete(uidv); sfx('unplace'); }
        else { if (sel.size >= max) { sfx('wrong'); FX.toast(T(`デッキは ${max}{枚|まい}まで`), '🎴', 1500); return; } sel.add(uidv); sfx('place'); }
        n.classList.toggle('in', sel.has(uidv)); n.classList.toggle('out', !sel.has(uidv));
        $('.chk', n).textContent = sel.has(uidv) ? '✓' : '＋';
        renderSide();
      });
    };
    $('[data-auto]', o).addEventListener('click', () => {
      sfx('upgrade');
      const target = Math.max(min, Math.min(max, 15));
      const pick = autoBuild(list, els, target);
      sel.clear(); pick.forEach((c) => sel.add(c.uid));
      render();
    });
    $('[data-ok]', o).addEventListener('click', () => { sfx('upgrade'); o.remove(); resolve(list.filter((c) => sel.has(c.uid))); });
    $('[data-cancel]', o)?.addEventListener('click', () => { sfx('tap'); o.remove(); resolve(null); });
    render();
    guide('db_intro', 'デッキづくり！ ✓が ついた カードが デッキに はいるよ。みぎの「つくりやすい {役|やく}」を みて、おなじ {数|かず}や たして 10に なる ルーンを あつめると つよい。こまったら「おまかせ」！');
  });
}

// ラン の デッキと サイドを くみなおす
export async function rebuildRun(app, { newCards = [], title = 'デッキを くみなおそう', canCancel = true } = {}) {
  const run = app.run;
  // のろいの カードは はずせない
  const locked = run.deck.filter((c) => CARDS[c.id].type === 'curse');
  const deck = run.deck.filter((c) => !locked.includes(c));
  const pool = [...deck, ...run.side, ...newCards];
  run.side = [...run.side, ...newCards];
  const chosen = await deckBuilder(app, { pool, selected: deck, min: DECK_MIN, max: Math.max(REBUILD_MAX, deck.length), title, newUids: newCards.map((c) => c.uid), canCancel, els: HEROES[run.hero].els });
  if (!chosen) return false;
  const ids = new Set(chosen.map((c) => c.uid));
  run.deck = [...pool.filter((c) => ids.has(c.uid)), ...locked];
  run.side = pool.filter((c) => !ids.has(c.uid));
  return true;
}
