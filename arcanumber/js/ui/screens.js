// マップ・ほうしゅう・おみせ・たきび・たからばこ・なぞ
import * as R from '../engine/run.js';
import { CARDS, ELEMENTS } from '../data/cards.js';
import { ARCANA, arcanaPrice } from '../data/arcana.js';
import { SCROLLS, scrollName } from '../data/scrolls.js';
import { HANDS } from '../data/hands.js';
import { EVENTS } from '../data/events.js';
import { T } from '../text.js';
import { el, $, $$ } from '../util.js';
import { sfx, playBgm } from '../audio.js';
import { mark } from '../save.js';
import { cardHtml } from './cardview.js';
import { bgHtml, topbarHtml, updateTopbar, heroArt } from './common.js';
import { swirl } from './bg.js';
import { openModal, cardDetail, deckView, quizPrompt, guide, alertBox, arcanaDetail, arcanaHtml, chooseBox, elementPicker, scrollDetail } from './modal.js';
import { clockSvg, gridSvg, coinsSvg, shapeSvg } from './qart.js';
import * as FX from './fx.js';
import { packHtml, openPacks, rebuildRun } from './deckbuild.js';
import { PACKS } from '../data/packs.js';
import { HEROES } from '../data/heroes.js';

function mountWith(app, inner, theme) {
  const root = el(`<div class="screen fade-in">${bgHtml()}${topbarHtml(app.run)}${inner}</div>`);
  app.mount(root);
  swirl($('canvas.swirl', root), theme || R.ACTS[app.run.act].theme);
  app.wireTopbar(root, {});
  return root;
}

// ───── マップ ─────
export function mapScreen(app) {
  return new Promise((resolve) => {
    const run = app.run, m = run.map, A = R.ACTS[run.act];
    playBgm('map');
    const root = mountWith(app, `<div class="mapwrap"><svg class="map-svg"></svg>
      <div class="map-title">${A.icon} ${run.act}${T('しょう')}　${T(A.name)}</div>
      <div class="map-legend">${Object.values(R.NODE_INFO).map((v) => `<span>${v.icon} ${T(v.name)}</span>`).join('')}</div></div>`);
    const wrap = $('.mapwrap', root);
    const W = wrap.offsetWidth, H = wrap.offsetHeight;
    const x0 = 80, x1 = W - 160, y0 = 110, y1 = H - 80;
    const pos = (n) => n.id === 'boss' ? { x: W - 85, y: (y0 + y1) / 2 } : { x: x0 + (x1 - x0) * (n.col / (m.cols - 1)), y: y0 + (y1 - y0) * (n.lane / (m.lanes - 1)) + (((n.col * 37 + n.lane * 13) % 17) - 8) };
    const avail = R.availableNodes(run);
    let lines = '';
    const visitedEdge = (a, b) => { const i = m.visited.indexOf(a); return i >= 0 && m.visited[i + 1] === b; };
    for (const n of Object.values(m.nodes)) for (const nx of n.next) {
      const p = pos(n), q = pos(m.nodes[nx]); const v = visitedEdge(n.id, nx);
      lines += `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="${v ? '#e3b55b' : 'rgba(227,181,91,.28)'}" stroke-width="${v ? 6 : 3}" stroke-dasharray="${v ? '0' : '3 10'}" stroke-linecap="round"/>`;
    }
    $('.map-svg', root).innerHTML = lines;
    for (const n of Object.values(m.nodes)) {
      const p = pos(n); const info = R.NODE_INFO[n.type];
      const b = el(`<button class="mnode t-${n.type} ${n.id === 'boss' ? 'boss' : ''}" style="left:${p.x}px;top:${p.y}px">${info.icon}</button>`);
      if (m.visited.includes(n.id)) b.classList.add('done');
      if (n.id === run.pos) b.classList.add('here');
      b.classList.add(avail.includes(n.id) ? 'avail' : 'locked');
      b.addEventListener('click', () => choose(n, p));
      wrap.appendChild(b);
    }
    const here = run.pos ? pos(m.nodes[run.pos]) : { x: 26, y: (y0 + y1) / 2 };
    const hero = el(`<div class="map-hero" style="left:${here.x}px;top:${here.y}px">${heroArt(run)}</div>`);
    wrap.appendChild(hero);
    let popEl = null;
    function choose(n, p) {
      if (!avail.includes(n.id)) { sfx('tap'); FX.toast(T('ひかっている ところから えらんでね'), '👆', 1400); return; }
      sfx('select'); popEl && popEl.remove();
      const info = R.NODE_INFO[n.type];
      const left = Math.min(Math.max(p.x, 170), W - 170);
      const top = p.y > H / 2 ? p.y - 190 : p.y + 50;
      popEl = el(`<div class="map-pop" style="left:${left}px;top:${top}px"><div style="font-family:var(--display);font-size:24px;color:var(--gold-hi)">${info.icon} ${T(info.name)}</div>
        <div style="font-size:15px;color:var(--ink-dim);margin:6px 0 10px;line-height:1.5">${T(info.desc)}</div><button class="btn green small" style="width:100%">${T('ここへ すすむ')}</button></div>`);
      wrap.appendChild(popEl);
      $('button', popEl).addEventListener('click', async () => { sfx('tap'); popEl.remove(); hero.style.left = p.x + 'px'; hero.style.top = p.y + 'px'; await FX.wait(650); resolve(n.id); });
    }
    if (!run.pos && run.act === 1) guide('m_intro', 'ここは まよいの もり。ひかっている マスを えらんで すすもう。💀は のろいを もつ つよい てき、🪙は おみせ、🔥は たきび。みぎはしの 👑 ボスを たおすと つぎの しょうへ！');
  });
}

// ───── もらう もの ─────
export function cardChoice(app, cards, { title = 'カードを 1{枚|まい} えらぼう', skip = true } = {}) {
  return new Promise((resolve) => {
    cards.forEach((c) => mark('cards', c.id));
    const { m, close } = openModal(`<h2>${T(title)}</h2><div class="sub">${T('タップで えらぶ。ⓘで くわしく')}</div>
      <div class="offer-row">${cards.map((c, i) => `<div class="offer"><div data-i="${i}">${cardHtml(c)}</div><button class="btn dark small" data-info="${i}">ⓘ</button></div>`).join('')}</div>
      ${skip ? `<button class="btn dark" data-skip>${T('いらない')}</button>` : ''}`, { closable: false });
    $$('[data-i]', m).forEach((n) => n.addEventListener('click', () => { sfx('upgrade'); close(); resolve(cards[Number(n.dataset.i)]); }));
    $$('[data-info]', m).forEach((n) => n.addEventListener('click', () => { sfx('tap'); cardDetail(cards[Number(n.dataset.info)]); }));
    $('[data-skip]', m)?.addEventListener('click', () => { sfx('tap'); close(); resolve(null); });
  });
}
function arcOfferHtml(id, price) {
  const d = ARCANA[id];
  return `<div class="arc-offer" data-id="${id}"><div class="ro-icon">${d.icon}</div><div class="ro-name">${T(d.name)}</div><div class="ro-text">${T(d.text)}</div>
    <div class="ro-rar">${T({ c: 'よくある', u: 'めずらしい', r: 'レア' }[d.rar])}${price ? `　🪙 ${price}` : ''}</div></div>`;
}
export async function gainArcana(app, id, { title = 'アルカナ ゲット！' } = {}) {
  if (!id) return false;
  const run = app.run;
  mark('arcana', id);
  if (run.arcana.length >= R.MAX_ARCANA) {
    const sel = await new Promise((res) => {
      const { m, close } = openModal(`<h2>${T('アルカナが いっぱい！')}</h2><div class="sub">${T(`「${ARCANA[id].name}」を いれる ために、どれか 1つを うって いれかえる？`)}</div>
        <div class="row">${run.arcana.map((a) => arcanaHtml(a)).join('')}</div><button class="btn dark" data-skip>${T('いれかえない')}</button>`, { closable: false });
      $$('[data-auid]', m).forEach((n) => n.addEventListener('click', () => { close(); res(n.dataset.auid); }));
      $('[data-skip]', m).addEventListener('click', () => { close(); res(null); });
    });
    if (!sel) return false;
    const a = run.arcana.find((x) => x.uid === sel);
    run.coins += R.sellValue(a);
    run.arcana = run.arcana.filter((x) => x.uid !== sel);
  }
  R.addArcana(run, id);
  sfx('open');
  await new Promise((res) => {
    const { m, close } = openModal(`<h2>${T(title)}</h2>${arcOfferHtml(id)}<button class="btn green" data-ok>${T('やったね！')}</button>`, { closable: false });
    const p = FX.posOf($('.arc-offer', m), 0.5, 0.3); FX.burst(p.x, p.y, { n: 18, stars: true, dist: 200 });
    $('[data-ok]', m).addEventListener('click', () => { sfx('tap'); close(); res(); });
  });
  return true;
}
export async function gainScroll(app, s) {
  const run = app.run;
  if (run.scrolls.length >= R.MAX_SCROLLS) {
    const i = await chooseBox('まきものが いっぱい', `「${scrollName(s)}」を もらう ために、どれかを すてる？`, [...run.scrolls.map((x, k) => ({ label: `${SCROLLS[x.id].icon} ${scrollName(x)} を すてる`, value: String(k) })), { label: 'もらわない', value: 'no', cls: 'blue' }]);
    if (i === null || i === 'no') return false;
    run.scrolls.splice(Number(i), 1);
  }
  R.addScroll(run, s); sfx('coin');
  FX.toast(T(`${SCROLLS[s.id].icon} ${scrollName(s)} を てに いれた`), '📜');
  return true;
}
function arcanaChoice(ids, title) {
  return new Promise((res) => {
    const { m, close } = openModal(`<h2>${T(title)}</h2><div class="row">${ids.map((id) => arcOfferHtml(id)).join('')}</div><button class="btn dark" data-skip>${T('いらない')}</button>`, { closable: false });
    $$('[data-id]', m).forEach((n) => n.addEventListener('click', () => { sfx('upgrade'); close(); res(n.dataset.id); }));
    $('[data-skip]', m).addEventListener('click', () => { close(); res(null); });
  });
}

export async function rewardScreen(app, kind) {
  const run = app.run;
  const { rng, save } = app.rng();
  const coins = R.battleCoins(run, kind);
  const cards = R.rollCards(run, rng, { elite: kind !== 'battle' });
  const arc = kind === 'elite' ? R.rollArcana(run, rng) : null;
  const bossArcs = kind === 'boss' ? [R.rollArcana(run, rng, 'r'), R.rollArcana(run, rng, 'u'), R.rollArcana(run, rng, 'u')].filter((x, i, a) => x && a.indexOf(x) === i) : null;
  const scroll = rng() < (kind === 'battle' ? 0.3 : 0.6) ? R.rollScroll(run, rng) : null;
  save();
  for (const a of [...run.arcana]) { const p = ARCANA[a.id].passive; if (p && p.fleeChance && rng() < 1 / p.fleeChance) { run.arcana = run.arcana.filter((x) => x !== a); FX.toast(T(`${ARCANA[a.id].icon} ${ARCANA[a.id].name} は にげて しまった…`), '💨', 2600); } }
  run.stats.battles++;
  await new Promise((resolve) => {
    const root = mountWith(app, `<div class="panel-screen"><h1>${T('しょうり！')}</h1>
      <div class="coin-calc">${T(`🪙 ほうしゅう <b>${coins.base}</b>　＋　りそく <b>${coins.interest}</b>（コイン ${run.coins}まい ÷ 5、さいだい 5）${coins.extra ? `　＋　アルカナ <b>${coins.extra}</b>` : ''}　＝　<b>${coins.total}</b>`)}</div>
      <div class="reward-list"></div><button class="btn green big" data-next>${T('つぎへ ▶')}</button></div>`);
    const list = $('.reward-list', root);
    const add = (icon, label, fn) => { const b = el(`<button class="reward-item"><span class="ri-icon">${icon}</span><span>${T(label)}</span></button>`); b.addEventListener('click', async () => { if ((await fn()) !== false) b.classList.add('taken'); updateTopbar(root, run); app.wireTopbar(root, {}); }); list.appendChild(b); return b; };
    const coinBtn = add('🪙', `コイン ${coins.total}まい`, () => { sfx('coin'); run.coins += coins.total; return true; });
    add('🎴', 'カードを 1{枚|まい} えらぶ', async () => { const c = await cardChoice(app, cards); if (!c) return false; run.deck.push(c); return true; });
    if (arc) add(ARCANA[arc].icon, `アルカナ：${ARCANA[arc].name}`, () => gainArcana(app, arc));
    if (bossArcs && bossArcs.length) add('👑', 'ボスの アルカナを えらぶ', async () => { const id = await arcanaChoice(bossArcs, 'ボスの アルカナ（1つ えらぶ）'); if (!id) return false; return gainArcana(app, id); });
    if (scroll) add(SCROLLS[scroll.id].icon, `まきもの：${scrollName(scroll)}`, () => gainScroll(app, scroll));
    if (kind === 'boss') add('📦', 'ボスの パック（レアが でやすい）', async () => {
      const els = HEROES[run.hero].els;
      const type = await new Promise((res) => {
        const opts = [...new Set([...els, 'silver'])];
        const { m, close } = openModal(`<h2>${T('どの パックを あける？')}</h2><div class="row" style="gap:20px">${opts.map((t) => packHtml(t)).join('')}</div>`, { closable: false });
        $$('.pack', m).forEach((p) => p.addEventListener('click', () => { sfx('tap'); close(); res(p.dataset.pack); }));
      });
      const { rng: r2, save: s2 } = app.rng();
      const cards = await openPacks(app, [type], r2, { rareBoost: 0.4 }); s2();
      await rebuildRun(app, { newCards: cards, title: 'あたらしい カードを デッキに いれる？', canCancel: false });
      return true;
    });
    $('[data-next]', root).addEventListener('click', () => { sfx('tap'); if (!coinBtn.classList.contains('taken')) run.coins += coins.total; resolve(); });
    if (kind === 'battle') guide('rw_interest', 'コインは 5{枚|まい}ごとに 1{枚|まい}「りそく」が つくよ（さいだい 5{枚|まい}）。ためておくと どんどん ふえる！ おみせで アルカナを かおう。');
  });
}

export function treasureScreen(app) {
  const run = app.run; const { rng, save } = app.rng();
  const id = R.rollArcana(run, rng); save();
  return new Promise((resolve) => {
    const root = mountWith(app, `<div class="panel-screen"><h1>${T('たからばこ')}</h1><button class="btn dark" style="font-size:130px;min-height:200px;width:240px;border-radius:30px" data-chest>🗝️</button><div class="lead">${T('タップして あけよう')}</div></div>`);
    $('[data-chest]', root).addEventListener('click', async (e) => {
      e.currentTarget.disabled = true; e.currentTarget.textContent = '✨';
      if (id) await gainArcana(app, id); else { run.coins += 8; sfx('coin'); await alertBox('コイン 8まい！', 'なかには コインが はいっていた。'); }
      resolve();
    });
  });
}

export function restScreen(app) {
  const run = app.run;
  return new Promise((resolve) => {
    const healN = Math.round(run.maxHp * 0.35);
    const root = mountWith(app, `<div class="panel-screen"><h1>${T('たきび')}</h1><div class="fire-pit">🔥</div>
      <div class="opt-row"><div class="opt" data-a="heal"><div class="p-icon">💤</div><div class="p-title">${T('やすむ')}</div><div class="p-desc">${T(`HPを ${healN} かいふく`)}</div></div>
      <div class="opt" data-a="up"><div class="p-icon">⚒️</div><div class="p-title">${T('きたえる')}</div><div class="p-desc">${T('カードを 1{枚|まい} つよく する（ルーンは {倍率|ばいりつ} +1）')}</div></div>
      <div class="opt" data-a="build"><div class="p-icon">🃏</div><div class="p-title">${T('くみなおす')}</div><div class="p-desc">${T(`サイドの カード（${run.side.length}{枚|まい}）と いれかえて デッキを つくりなおす`)}</div></div></div></div>`, 'rest');
    $$('.opt', root).forEach((o) => o.addEventListener('click', async () => {
      if (o.dataset.a === 'heal') { sfx('heal'); const n = R.heal(run, healN); updateTopbar(root, run); FX.toast(T(`HPが ${n} かいふく`), '💖'); await FX.wait(900); resolve(); return; }
      if (o.dataset.a === 'build') { if (await rebuildRun(app, { title: 'デッキを くみなおそう' })) { FX.toast(T(`デッキ ${run.deck.length}{枚|まい}に なった`), '🃏'); await FX.wait(700); resolve(); } return; }
      const inst = await deckView(run.deck, { title: 'きたえる カードを えらぼう', pick: true, filter: (c) => !c.up });
      if (!inst) return;
      inst.up = true; sfx('upgrade');
      await upgradeShow(inst); resolve();
    }));
  });
}
function upgradeShow(inst) {
  return new Promise((res) => {
    const { m, close } = openModal(`<h2>⚒️ ${T('きたえた！')}</h2><div class="row" style="gap:30px"><div style="transform:scale(1.2);margin:20px">${cardHtml({ ...inst, up: false })}</div><div style="font-size:44px">➡️</div><div style="transform:scale(1.2);margin:20px">${cardHtml(inst)}</div></div><button class="btn green" data-ok>OK</button>`, { closable: false });
    $('[data-ok]', m).addEventListener('click', () => { sfx('tap'); close(); res(); });
  });
}

// ───── おみせ ─────
export function shopScreen(app) {
  const run = app.run; const { rng, save } = app.rng();
  const shop = R.makeShop(run, rng); save();
  playBgm('map');
  return new Promise((resolve) => {
    const root = mountWith(app, `<div class="panel-screen" style="justify-content:flex-start;padding-top:12px">
      <div class="row" style="width:100%;max-width:1100px;justify-content:space-between;flex-wrap:nowrap">
        <h1 style="font-size:28px;white-space:nowrap">🦉 ${T('ふくろうの まほうや')}</h1>
        <div class="shop-sec" style="padding:6px 10px;display:flex;align-items:center;gap:8px"><span style="font-size:12px;color:var(--ink-dim);width:56px;line-height:1.3">${T('もっている アルカナ')}</span><div class="arcana-row" data-mine></div></div>
        <div class="row" style="flex-wrap:nowrap"><button class="btn dark small" data-reroll></button><button class="btn blue" data-leave>${T('でる ▶')}</button></div>
      </div>
      <div class="shop">
        <div class="shop-sec" style="grid-column:1 / 3"><h3>${T('アルカナ')}</h3><div class="shop-items" data-arc></div></div>
        <div class="shop-sec"><h3>${T('カード')}</h3><div class="shop-items" data-cards></div></div>
        <div class="shop-sec"><h3>${T('まきもの と サービス')}</h3><div class="shop-items" data-misc></div></div>
      </div></div>`, 'shop');
    const say = (t) => FX.toast(T(t), '🦉', 1800);
    function render() {
      updateTopbar(root, run); app.wireTopbar(root, {});
      const rc = R.rerollCost(shop, run);
      const rb = $('[data-reroll]', root); rb.innerHTML = T(`🎲 いれかえ 🪙${rc}`); rb.classList.toggle('disabled', run.coins < rc);
      const arcEl = $('[data-arc]', root); arcEl.innerHTML = '';
      shop.arcana.forEach((it) => {
        const n = el(`<div class="shop-item ${it.sold ? 'sold' : ''}">${arcOfferHtml(it.id)}<span class="price ${run.coins < it.price ? 'cant' : ''}">🪙 ${it.price}</span></div>`);
        $('.price', n).addEventListener('click', async () => {
          if (it.sold) return;
          if (run.coins < it.price) { sfx('wrong'); say('コインが たりないよ'); return; }
          run.coins -= it.price;
          if (await gainArcana(app, it.id, { title: 'かった！' })) it.sold = true; else run.coins += it.price;
          render();
        });
        arcEl.appendChild(n);
      });
      const cEl = $('[data-cards]', root); cEl.innerHTML = '';
      shop.cards.forEach((it) => {
        const n = el(`<div class="shop-item ${it.sold ? 'sold' : ''}">${cardHtml(it.card)}<span class="price ${run.coins < it.price ? 'cant' : ''}">🪙 ${it.price}</span></div>`);
        $('.card', n).addEventListener('click', () => { sfx('tap'); cardDetail(it.card); });
        $('.price', n).addEventListener('click', () => { if (it.sold) return; if (run.coins < it.price) { sfx('wrong'); say('コインが たりないよ'); return; } run.coins -= it.price; it.sold = true; run.deck.push(it.card); mark('cards', it.card.id); sfx('coin'); render(); });
        cEl.appendChild(n);
      });
      const mEl = $('[data-misc]', root); mEl.innerHTML = '';
      shop.scrolls.forEach((it) => {
        const s = it.scroll;
        const n = el(`<div class="shop-item ${it.sold ? 'sold' : ''}"><div class="scroll-card"><div class="si">${SCROLLS[s.id].icon}</div><div class="sn">${T(scrollName(s))}</div></div><span class="price ${run.coins < it.price ? 'cant' : ''}">🪙 ${it.price}</span></div>`);
        $('.scroll-card', n).addEventListener('click', () => { sfx('tap'); scrollDetail(s, { canUse: false }); });
        $('.price', n).addEventListener('click', async () => { if (it.sold) return; if (run.coins < it.price) { sfx('wrong'); say('コインが たりないよ'); return; } run.coins -= it.price; if (await gainScroll(app, s)) it.sold = true; else run.coins += it.price; render(); });
        mEl.appendChild(n);
      });
      (shop.packs || []).forEach((it) => {
        const n = el(`<div class="shop-item ${it.sold ? 'sold' : ''}"><div style="transform:scale(.56);transform-origin:top center;height:120px;width:96px;display:flex;justify-content:center">${packHtml(it.type)}</div><span class="price ${run.coins < it.price ? 'cant' : ''}">🪙 ${it.price}</span></div>`);
        $('.price', n).addEventListener('click', async () => {
          if (it.sold) return;
          if (run.coins < it.price) { sfx('wrong'); say('コインが たりないよ'); return; }
          run.coins -= it.price; it.sold = true; render();
          const cards = await openPacks(app, [it.type], rng); save();
          await rebuildRun(app, { newCards: cards, title: 'あたらしい カードを デッキに いれる？', canCancel: false });
          render();
        });
        mEl.appendChild(n);
      });
      const rm = el(`<div class="shop-item"><div class="scroll-card"><div class="si">🗑️</div><div class="sn">${T('カードを わすれる')}</div></div><span class="price ${run.coins < run.removeCost ? 'cant' : ''}">🪙 ${run.removeCost}</span></div>`);
      $('.price', rm).addEventListener('click', async () => {
        if (run.coins < run.removeCost) { sfx('wrong'); say('コインが たりないよ'); return; }
        const inst = await deckView(run.deck, { title: 'わすれる カードを えらぼう', pick: true, sub: 'デッキが すっきりすると ほしい カードを ひきやすく なる' });
        if (!inst) return;
        run.coins -= run.removeCost; run.removeCost += 1; run.deck = run.deck.filter((c) => c !== inst); sfx('coin'); render();
      });
      mEl.appendChild(rm);
      const mine = $('[data-mine]', root); mine.innerHTML = run.arcana.map((a) => arcanaHtml(a)).join('') || `<div style="color:var(--ink-dim);font-size:13px">${T('まだ ない')}</div>`;
      $$('[data-auid]', mine).forEach((n) => n.addEventListener('click', async () => {
        const a = run.arcana.find((x) => x.uid === n.dataset.auid);
        const r = await arcanaDetail(a, { sell: R.sellValue(a), move: true });
        if (!r) return;
        if (r.sell) { run.coins += R.sellValue(a); run.arcana = run.arcana.filter((x) => x !== a); }
        if (r.move) { const i = run.arcana.indexOf(a), j = i + r.move; if (j >= 0 && j < run.arcana.length) [run.arcana[i], run.arcana[j]] = [run.arcana[j], run.arcana[i]]; }
        render();
      }));
    }
    $('[data-reroll]', root).addEventListener('click', () => { const c = R.rerollCost(shop, run); if (run.coins < c) { sfx('wrong'); return; } run.coins -= c; R.rerollShop(run, rng, shop); save(); sfx('shuffle'); render(); });
    $('[data-leave]', root).addEventListener('click', () => { sfx('tap'); save(); resolve(); });
    render();
    guide('sh_intro', 'おみせでは アルカナ・カード・まきものが かえる。アルカナは 5つまで。いらなく なったら うって コインに できるよ。「いれかえ」で しなものを かえられる。');
  });
}

// ───── なぞ ─────
function visHtml(vis) {
  if (!vis) return '';
  if (vis.type === 'clock') return `<div style="width:210px;height:210px">${clockSvg(vis.h, vis.m)}</div>`;
  if (vis.type === 'grid') return `<div style="width:${vis.W * 70}px;max-width:360px">${gridSvg(vis)}</div>`;
  if (vis.type === 'coins') return `<div style="height:80px">${coinsSvg(vis.c10, vis.c1)}</div>`;
  if (vis.type === 'shape') return `<div style="width:120px;height:120px">${shapeSvg(vis.shape)}</div>`;
  if (vis.type === 'emoji') return `<div style="display:flex;flex-direction:column;align-items:center;font-size:44px;gap:4px">${vis.rows.map(([e, n]) => `<div>${e.repeat(n)}</div>`).join('')}</div>`;
  return '';
}
async function pickRune(app, title) {
  return deckView(app.run.deck, { title, pick: true, filter: (c) => c.id === 'rune' });
}
export function eventScreen(app) {
  const run = app.run; const { rng, save } = app.rng();
  let pool = EVENTS.filter((e) => !(run.seenEvents || []).includes(e.id));
  if (!pool.length) { run.seenEvents = []; pool = EVENTS; }
  const ev = rng.pick(pool);
  run.seenEvents = [...(run.seenEvents || []), ev.id];
  save();
  playBgm('map');
  return new Promise((resolve) => {
    const root = mountWith(app, `<div class="panel-screen"><div class="event-box"><div class="ev-art">${ev.art}</div><div class="ev-title">${T(ev.title)}</div><div class="ev-text"></div><div class="choice-list"></div></div></div>`);
    const textEl = $('.ev-text', root), chEl = $('.choice-list', root);
    const buttons = (labels) => new Promise((res) => {
      chEl.innerHTML = '';
      labels.forEach((l, i) => { const b = el(`<button class="btn ${i === labels.length - 1 && labels.length > 1 ? 'dark' : 'blue'}">${T(l)}</button>`); b.addEventListener('click', () => { sfx('tap'); chEl.innerHTML = ''; res(i); }); chEl.appendChild(b); });
    });
    const refresh = () => { updateTopbar(root, run); app.wireTopbar(root, {}); };
    const c = {
      grade: run.grade, rng, run,
      say: async (t) => { textEl.innerHTML = T(t); sfx('page'); await buttons(['つぎへ']); },
      choose: (labels) => buttons(labels),
      quiz: async (q) => { run.stats.quizTry++; const ok = await quizPrompt(q, visHtml(q.vis), ev.title); if (ok) run.stats.quizOk++; return ok; },
      coins: async (n) => { run.coins = Math.max(0, run.coins + n); refresh(); if (n > 0) { sfx('coin'); FX.toast(T(`コイン +${n}`), '🪙'); } },
      heal: async (n) => { const h = R.heal(run, n); refresh(); sfx('heal'); FX.toast(T(`HP +${h}`), '💖'); },
      damage: async (n) => { run.hp = Math.max(1, run.hp - n); refresh(); sfx('hurt'); FX.shake(app.stage); },
      arcana: async (rar) => { const id = R.rollArcana(run, rng, rar); save(); await gainArcana(app, id); refresh(); },
      scroll: async (id, hand) => { const s = id === 'star' ? { uid: 'sc' + Date.now(), id, hand } : { uid: 'sc' + Date.now(), id }; await gainScroll(app, s); refresh(); },
      cards: async (opts) => { const cs = R.rollCards(run, rng, opts); save(); const x = await cardChoice(app, cs); if (x) run.deck.push(x); },
      enhanceRune: async (enh) => { const r = await pickRune(app, 'ルーンを えらぼう'); if (r) { r.enh = enh; sfx('upgrade'); await upgradeShowRune(r); } },
      upgradeRandom: async (n) => { rng.shuffle(run.deck.filter((x) => !x.up)).slice(0, n).forEach((x) => { x.up = true; }); sfx('upgrade'); },
      upgradeChoose: async () => { const inst = await deckView(run.deck, { title: 'きたえる カードを えらぼう', pick: true, filter: (x) => !x.up }); if (inst) { inst.up = true; sfx('upgrade'); await upgradeShow(inst); } },
      removeChoose: async () => { const inst = await deckView(run.deck, { title: 'わすれる カードを えらぼう', pick: true }); if (inst) { run.deck = run.deck.filter((x) => x !== inst); sfx('coin'); FX.toast(T('カードを わすれた'), '🗑️'); } },
      shiftDeckRune: async () => { await shiftRune(app); },
    };
    (async () => { await ev.run(c); save(); await buttons(['マップへ ▶']); resolve(); })();
  });
}
function upgradeShowRune(r) {
  return new Promise((res) => { const { m, close } = openModal(`<h2>✨ ${T('ルーンが かわった！')}</h2><div style="transform:scale(1.3);margin:30px">${cardHtml(r)}</div><button class="btn green" data-ok>OK</button>`, { closable: false }); $('[data-ok]', m).addEventListener('click', () => { sfx('tap'); close(); res(); }); });
}
export async function shiftRune(app, delta) {
  const r = await pickRune(app, 'ルーンを えらぼう');
  if (!r) return false;
  let d = delta;
  if (!d) d = await chooseBox('どっちに する？', `いまの {数|かず}は ${r.v}`, [{ label: `−1（${Math.max(1, r.v - 1)}）`, value: -1, cls: 'blue' }, { label: `+1（${Math.min(10, r.v + 1)}）`, value: 1 }]);
  if (!d) return false;
  r.v = Math.max(1, Math.min(10, r.v + d)); sfx('upgrade'); await upgradeShowRune(r); return true;
}
// マップなどで まきものを つかう
export async function useScrollOutside(app, i, root) {
  const run = app.run; const s = run.scrolls[i]; if (!s) return;
  const d = SCROLLS[s.id];
  const r = await scrollDetail(s, { canUse: d.where !== 'battle', sell: true });
  if (r === 'drop') { run.scrolls.splice(i, 1); return; }
  if (r !== 'use') return;
  let used = true;
  if (s.id === 'star') { run.handLv[s.hand] = (run.handLv[s.hand] || 1) + 1; sfx('upgrade'); await alertBox('レベル アップ！', `「${HANDS[s.hand].name}」が Lv${run.handLv[s.hand]} に なった！`); }
  else if (s.id === 'potion') { R.heal(run, 20); sfx('heal'); }
  else if (s.id === 'plus' || s.id === 'minus') used = await shiftRune(app, s.id === 'plus' ? 1 : -1);
  else if (s.id === 'paint') { const ru = await pickRune(app, 'ぞくせいを かえる ルーン'); if (ru) { const e = await elementPicker(ru.el); if (e) { ru.el = e; sfx('upgrade'); await upgradeShowRune(ru); } else used = false; } else used = false; }
  else if (d.enh) { const ru = await pickRune(app, 'ルーンを えらぼう'); if (ru) { ru.enh = d.enh; sfx('upgrade'); await upgradeShowRune(ru); } else used = false; }
  else if (s.id === 'twin') { const ru = await pickRune(app, 'コピーする ルーン'); if (ru) { run.deck.push({ ...ru, uid: 'r' + Date.now() + Math.random().toString(36).slice(2) }); sfx('upgrade'); FX.toast(T('ルーンが ふえた！'), '♊'); } else used = false; }
  else if (s.id === 'forget') { const inst = await deckView(run.deck, { title: 'わすれる カード', pick: true }); if (inst) run.deck = run.deck.filter((x) => x !== inst); else used = false; }
  if (used) run.scrolls.splice(run.scrolls.indexOf(s), 1);
}
