// マップ・ほうしゅう・おみせ・やすみ・たからばこ・できごと
import * as R from '../engine/run.js';
import { CARDS } from '../data/cards.js';
import { RELICS } from '../data/relics.js';
import { EVENTS } from '../data/events.js';
import { T } from '../text.js';
import { el, $, $$ } from '../util.js';
import { sfx, playBgm } from '../audio.js';
import { markSeenCard, meta, saveMeta } from '../save.js';
import { cardHtml } from './cardview.js';
import { bgHtml, topbarHtml, updateTopbar, HEROES } from './common.js';
import { cardDetail, deckView, openModal, quizPrompt, owl, alertBox, relicDetail } from './modal.js';
import * as FX from './fx.js';

// ───── マップ ─────
export function mapScreen(app) {
  return new Promise((resolve) => {
    const run = app.run;
    const m = run.map;
    const f = R.FLOORS[run.floor];
    playBgm('map');
    const root = el(`<div class="screen fade-in">
      ${bgHtml(f.theme)}
      ${topbarHtml(run)}
      <div class="mapwrap">
        <svg class="map-svg"></svg>
        <div class="map-title">${f.icon} ${run.floor}${T('かい')}　${T(f.name)}</div>
        <div class="map-legend">${Object.entries(R.NODE_INFO).map(([k, v]) => `<span>${v.icon} ${T(v.name)}</span>`).join('')}</div>
      </div>
    </div>`);
    app.mount(root);
    app.wireTopbar(root, { refresh: () => { root.remove(); mapScreen(app).then(resolve); } });
    const wrap = $('.mapwrap', root);
    const W = wrap.offsetWidth, H = wrap.offsetHeight;
    const x0 = 80, x1 = W - 150, y0 = 110, y1 = H - 80;
    const pos = (n) => n.id === 'boss'
      ? { x: W - 80, y: (y0 + y1) / 2 }
      : { x: x0 + (x1 - x0) * (n.col / (m.cols - 1)), y: y0 + (y1 - y0) * (n.lane / (m.lanes - 1)) + ((n.col * 37 + n.lane * 13) % 17 - 8) };
    const avail = R.availableNodes(run);
    const svg = $('.map-svg', root);
    let lines = '';
    const visitedEdge = (a, b) => { const i = m.visited.indexOf(a); return i >= 0 && m.visited[i + 1] === b; };
    for (const n of Object.values(m.nodes)) for (const nx of n.next) {
      const p = pos(n), q = pos(m.nodes[nx]);
      const v = visitedEdge(n.id, nx);
      lines += `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="${v ? '#ff5fa2' : f.theme === 'castle' ? 'rgba(255,255,255,.55)' : 'rgba(80,60,120,.45)'}" stroke-width="${v ? 8 : 5}" stroke-dasharray="${v ? '0' : '2 12'}" stroke-linecap="round"/>`;
    }
    svg.innerHTML = lines;
    for (const n of Object.values(m.nodes)) {
      const p = pos(n);
      const info = R.NODE_INFO[n.type];
      const b = el(`<button class="mnode t-${n.type} ${n.id === 'boss' ? 'boss' : ''}" style="left:${p.x}px;top:${p.y}px">${info.icon}</button>`);
      if (m.visited.includes(n.id)) b.classList.add('done');
      if (n.id === run.pos) b.classList.add('here');
      if (avail.includes(n.id)) b.classList.add('avail'); else b.classList.add('locked');
      b.addEventListener('click', () => choose(n, b, p));
      wrap.appendChild(b);
    }
    const here = run.pos ? pos(m.nodes[run.pos]) : { x: 30, y: (y0 + y1) / 2 };
    const hero = el(`<div class="map-hero" style="left:${here.x}px;top:${here.y}px">${HEROES[run.hero] || HEROES[0]}</div>`);
    wrap.appendChild(hero);
    let pop = null;
    function choose(n, btn, p) {
      if (!avail.includes(n.id)) { sfx('tap'); FX.toast(T('ひかっている ところから えらんでね'), '👆', 1500); return; }
      sfx('select');
      pop && pop.remove();
      const info = R.NODE_INFO[n.type];
      const desc = {
        battle: 'モンスターと たたかう。かつと カードが もらえる',
        elite: 'つよい モンスター！ かつと たからものが もらえる',
        rest: 'HPを かいふく するか、カードを きたえる',
        shop: 'コインで カードや たからものを かえる',
        treasure: 'たからものが はいっている！',
        event: 'なにが おこるかな？ さんすうの なぞとき も あるよ',
        boss: 'この かいの ボス！ じゅんびは いい？',
      }[n.type];
      const left = Math.min(Math.max(p.x, 170), W - 170);
      const top = p.y > H / 2 ? p.y - 200 : p.y + 50;
      pop = el(`<div style="position:absolute;z-index:6;left:${left}px;top:${top}px;transform:translateX(-50%);width:320px;padding:14px 18px;border-radius:22px;background:#fff;box-shadow:var(--shadow);text-align:center">
        <div style="font-size:26px;font-weight:900">${info.icon} ${T(info.name)}</div>
        <div style="font-size:16px;font-weight:700;color:var(--ink-soft);margin:6px 0 10px;line-height:1.5">${T(desc)}</div>
        <button class="btn green small" style="width:100%">${T('ここへ いく！')}</button></div>`);
      wrap.appendChild(pop);
      $('button', pop).addEventListener('click', async () => {
        sfx('tap');
        pop.remove();
        hero.style.left = p.x + 'px'; hero.style.top = p.y + 'px';
        await FX.wait(650);
        resolve(n.id);
      });
    }
    if (!run.pos && run.floor === 1) owl('m_intro', 'ここが まほうの とうの 1かい。ひかっている ところを タップして、すすむ みちを えらぼう！ みぎの 👑 ボスを たおすと {次|つぎ}の かいへ いけるよ。');
  });
}

// ───── カードを えらぶ ─────
export function cardChoice(app, ids, { title = 'カードを 1{枚|まい} えらぼう', skip = true } = {}) {
  return new Promise((resolve) => {
    ids.forEach(markSeenCard);
    const { m, close } = openModal(`<h2>${T(title)}</h2>
      <div class="sub">${T('カードを タップして えらぶ。ⓘで くわしく みられるよ')}</div>
      <div class="offer-row">${ids.map((id, i) => `<div class="offer"><div data-i="${i}">${cardHtml({ id, up: false, uid: 'offer' + i }, { cls: 'flip' })}</div><button class="btn white small info-btn" data-info="${i}">ⓘ ${T('せつめい')}</button></div>`).join('')}</div>
      ${skip ? `<button class="btn gray" data-skip>${T('いらない')}</button>` : ''}`, { closable: false });
    $$('.offer .card', m).forEach((c, i) => { c.style.animationDelay = (i * 0.12) + 's'; });
    $$('[data-i]', m).forEach((n) => n.addEventListener('click', () => { sfx('upgrade'); close(); resolve(ids[Number(n.dataset.i)]); }));
    $$('[data-info]', m).forEach((n) => n.addEventListener('click', () => { sfx('tap'); cardDetail({ id: ids[Number(n.dataset.info)], up: false }); }));
    const sk = $('[data-skip]', m);
    if (sk) sk.addEventListener('click', () => { sfx('tap'); close(); resolve(null); });
  });
}

export function relicReveal(app, id, title = 'たからもの ゲット！') {
  return new Promise((resolve) => {
    if (!id) { resolve(); return; }
    sfx('open');
    const r = RELICS[id];
    R.gainRelic(app.run, id);
    const { m, close } = openModal(`<h2>${T(title)}</h2><div style="font-size:110px;animation:pop .5s ease">${r.icon}</div>
      <div style="font-size:30px;font-weight:900">${T(r.name)}</div><div class="sub" style="font-size:21px;max-width:520px">${T(r.text)}</div>
      <button class="btn green" data-ok>${T('やったね！')}</button>`, { closable: false });
    const p = FX.posOf($('.modal', m.parentElement), 0.5, 0.35);
    FX.burst(p.x, p.y, { n: 20, stars: true, dist: 200 });
    $('[data-ok]', m).addEventListener('click', () => { sfx('tap'); close(); resolve(); });
  });
}

function relicChoice(ids) {
  return new Promise((resolve) => {
    const { m, close } = openModal(`<h2>👑 ${T('ボスの たからもの を 1つ えらぼう')}</h2>
      <div class="row">${ids.map((id) => `<div class="relic-offer" data-id="${id}"><div class="ro-icon">${RELICS[id].icon}</div><div class="ro-name">${T(RELICS[id].name)}</div><div class="ro-text">${T(RELICS[id].text)}</div></div>`).join('')}</div>`, { closable: false });
    $$('[data-id]', m).forEach((n) => n.addEventListener('click', () => { sfx('upgrade'); close(); resolve(n.dataset.id); }));
  });
}

// ───── たたかいの あとの ほうしゅう ─────
export async function rewardScreen(app, kind) {
  const run = app.run;
  const { rng, save } = app.rng();
  const coins = R.battleCoins(run, rng, kind);
  const cardIds = R.rollCards(run, rng, { elite: kind !== 'battle' });
  const relicId = kind === 'elite' ? R.rollRelic(run, rng) : null;
  const bossRelics = kind === 'boss' ? R.bossRelicChoices(run, rng) : null;
  save();
  if (run.relics.includes('candy')) R.heal(run, 5);
  run.stats.battles++;
  await new Promise((resolve) => {
    const f = R.FLOORS[run.floor];
    const root = el(`<div class="screen fade-in">
      ${bgHtml(f.theme)}
      ${topbarHtml(run)}
      <div class="panel-screen">
        <h1>🎉 ${T('しょうり！')}</h1>
        <div class="lead">${T('ほうしゅうを うけとろう')}</div>
        <div class="reward-list"></div>
        <button class="btn green big" data-next>${T('つぎへ ▶')}</button>
      </div></div>`);
    app.mount(root);
    app.wireTopbar(root, {});
    const list = $('.reward-list', root);
    const add = (icon, label, fn) => {
      const b = el(`<button class="reward-item"><span class="ri-icon">${icon}</span><span>${T(label)}</span></button>`);
      b.addEventListener('click', async () => { const ok = await fn(); if (ok !== false) b.classList.add('taken'); });
      list.appendChild(b);
      return b;
    };
    const coinBtn = add('🪙', `コイン ${coins}`, () => { sfx('coin'); run.coins += coins; updateTopbar(root, run); return true; });
    add('🎴', 'カードを 1{枚|まい} もらう', async () => {
      const id = await cardChoice(app, cardIds);
      if (!id) return false;
      R.addCard(run, id); updateTopbar(root, run); return true;
    });
    if (relicId) add(RELICS[relicId].icon, `たからもの：${RELICS[relicId].name}`, async () => { await relicReveal(app, relicId); app.wireTopbar(root, {}); return true; });
    if (bossRelics && bossRelics.length) add('👑', 'ボスの たからもの', async () => { const id = await relicChoice(bossRelics); await relicReveal(app, id); return true; });
    $('[data-next]', root).addEventListener('click', () => {
      sfx('tap');
      if (!coinBtn.classList.contains('taken')) { run.coins += coins; }
      resolve();
    });
  });
}

// ───── たからばこ ─────
export function treasureScreen(app) {
  const run = app.run;
  const { rng, save } = app.rng();
  const id = R.rollRelic(run, rng);
  save();
  return new Promise((resolve) => {
    const f = R.FLOORS[run.floor];
    const root = el(`<div class="screen fade-in">${bgHtml(f.theme)}${topbarHtml(run)}
      <div class="panel-screen"><h1>${T('たからばこ を みつけた！')}</h1>
      <button class="btn white" style="font-size:150px;min-height:220px;width:260px;border-radius:40px" data-chest>🎁</button>
      <div class="lead">${T('タップして あけよう')}</div></div></div>`);
    app.mount(root); app.wireTopbar(root, {});
    $('[data-chest]', root).addEventListener('click', async (e) => {
      e.currentTarget.disabled = true;
      e.currentTarget.textContent = '✨';
      if (id) await relicReveal(app, id);
      else { run.coins += 50; sfx('coin'); await alertBox('コイン 50まい！', 'たからばこの なかは コインで いっぱい！'); }
      resolve();
    });
  });
}

// ───── やすみ ─────
export function restScreen(app) {
  const run = app.run;
  return new Promise((resolve) => {
    const healN = Math.round(run.maxHp * 0.3) + (run.relics.includes('bento') ? 10 : 0);
    const root = el(`<div class="screen fade-in">${bgHtml('rest')}${topbarHtml(run)}
      <div class="panel-screen"><h1>⛺ ${T('ひとやすみ')}</h1>
      <div class="campfire">🔥</div>
      <div class="rest-opts">
        <div class="rest-opt" data-a="heal"><div class="p-icon">💤</div><div class="p-title">${T('ねむる')}</div><div class="p-desc">${T(`HPを ${healN} かいふく`)}</div></div>
        <div class="rest-opt" data-a="up"><div class="p-icon">🔨</div><div class="p-title">${T('きたえる')}</div><div class="p-desc">${T('すきな カードを 1{枚|まい} つよく する')}</div></div>
      </div></div></div>`);
    app.mount(root); app.wireTopbar(root, {});
    owl('r_intro', 'やすみ ばしょ では、HPを かいふく するか、カードを きたえて つよく できるよ。どちらか 1つ えらんでね。');
    $$('.rest-opt', root).forEach((o) => o.addEventListener('click', async () => {
      if (o.dataset.a === 'heal') {
        sfx('heal'); const n = R.heal(run, healN); updateTopbar(root, run);
        FX.toast(T(`HPが ${n} かいふく した！`), '💖');
        await FX.wait(900); resolve();
      } else {
        const inst = await deckView(run.deck, { title: 'きたえる カードを えらぼう', pick: true, filter: (c) => !c.up && CARDS[c.id].rar !== 'x' });
        if (!inst) return;
        R.upgradeCard(run, inst.uid); sfx('upgrade');
        await upgradeShow(inst);
        resolve();
      }
    }));
  });
}
function upgradeShow(inst) {
  return new Promise((res) => {
    const { m, close } = openModal(`<h2>🔨 ${T('きたえた！')}</h2><div class="row" style="gap:30px">
      <div style="transform:scale(1.2);margin:20px">${cardHtml({ ...inst, up: false })}</div><div style="font-size:50px">➡️</div>
      <div style="transform:scale(1.2);margin:20px">${cardHtml({ ...inst, up: true })}</div></div>
      <button class="btn green" data-ok>OK</button>`, { closable: false });
    $('[data-ok]', m).addEventListener('click', () => { sfx('tap'); close(); res(); });
  });
}

// ───── おみせ ─────
export function shopScreen(app) {
  const run = app.run;
  const { rng, save } = app.rng();
  const shop = R.makeShop(run, rng);
  save();
  playBgm('map');
  return new Promise((resolve) => {
    const root = el(`<div class="screen fade-in">${bgHtml('shop')}${topbarHtml(run)}
      <div class="panel-screen" style="justify-content:flex-start;padding-top:24px">
        <h1 style="color:#7a4300;text-shadow:0 3px 0 #fff">🐿️ ${T('りすの まほうてん')}</h1>
        <div class="shop-grid" data-cards></div>
        <div class="shop-grid" data-relics style="align-items:flex-end"></div>
        <button class="btn blue" data-leave style="position:absolute;right:30px;bottom:24px">${T('おみせを でる ▶')}</button>
      </div>
      <div class="shopkeeper"><div class="sk">🐿️</div><div class="say">${T('いらっしゃい！ コインで おかいもの してね')}</div></div>
    </div>`);
    app.mount(root); app.wireTopbar(root, { refresh: () => {} });
    const say = (t) => { $('.shopkeeper .say', root).innerHTML = T(t); };
    function render() {
      updateTopbar(root, run);
      const cw = $('[data-cards]', root); cw.innerHTML = '';
      shop.cards.forEach((it) => {
        const n = el(`<div class="shop-item ${it.sold ? 'sold' : ''}">${it.sale ? `<span class="sale">${T('はんがく！')}</span>` : ''}${cardHtml({ id: it.id, up: false, uid: 's' + it.id })}<span class="price ${run.coins < it.price ? 'cant' : ''}">🪙 ${it.price}</span></div>`);
        n.querySelector('.card').addEventListener('click', () => { sfx('tap'); cardDetail({ id: it.id, up: false }); });
        n.querySelector('.price').addEventListener('click', () => buy(it, () => { R.addCard(run, it.id); markSeenCard(it.id); }));
        cw.appendChild(n);
      });
      const rw = $('[data-relics]', root); rw.innerHTML = '';
      shop.relics.forEach((it) => {
        const r = RELICS[it.id];
        const n = el(`<div class="shop-item ${it.sold ? 'sold' : ''}"><div class="shop-relic">${r.icon}</div><span class="price ${run.coins < it.price ? 'cant' : ''}">🪙 ${it.price}</span></div>`);
        n.querySelector('.shop-relic').addEventListener('click', () => { sfx('tap'); say(`<b>${r.name}</b>：${r.text}`); });
        n.querySelector('.price').addEventListener('click', () => buy(it, () => { R.gainRelic(run, it.id); app.wireTopbar(root, {}); }));
        rw.appendChild(n);
      });
      const rm = el(`<div class="shop-item ${shop.removed ? 'sold' : ''}"><div class="shop-relic" style="font-size:54px">🗑️</div><span class="price ${run.coins < run.removeCost ? 'cant' : ''}">🪙 ${run.removeCost}</span><div style="font-size:15px;font-weight:800;margin-top:-8px">${T('カードを すてる')}</div></div>`);
      rm.querySelector('.shop-relic').addEventListener('click', () => { sfx('tap'); say('いらない カードを デッキから すてられるよ。デッキが すっきり すると、つよい カードを ひきやすく なる！'); });
      rm.querySelector('.price').addEventListener('click', async () => {
        if (run.coins < run.removeCost) { sfx('wrong'); say('コインが たりないみたい…'); return; }
        const inst = await deckView(run.deck, { title: 'すてる カードを えらぼう', pick: true });
        if (!inst) return;
        run.coins -= run.removeCost; run.removeCost += 25; shop.removed = true;
        R.removeCard(run, inst.uid); sfx('coin'); say('ポイッ！ すっきり したね'); render();
      });
      rw.appendChild(rm);
    }
    function buy(it, give) {
      if (it.sold) return;
      if (run.coins < it.price) { sfx('wrong'); say('コインが たりないみたい…'); return; }
      run.coins -= it.price; it.sold = true; give(); sfx('coin'); say('まいど ありがとう！'); render();
    }
    render();
    $('[data-leave]', root).addEventListener('click', () => { sfx('tap'); resolve(); });
  });
}

// ───── できごと ─────
export function eventScreen(app) {
  const run = app.run;
  const { rng, save } = app.rng();
  const seen = run.map.events || (run.map.events = []);
  let pool = EVENTS.filter((e) => !seen.includes(e.id) && !(run.seenEvents || []).includes(e.id));
  if (!pool.length) pool = EVENTS;
  const ev = rng.pick(pool);
  seen.push(ev.id);
  run.seenEvents = [...(run.seenEvents || []), ev.id].slice(-6);
  save();
  playBgm('map');
  return new Promise((resolve) => {
    const root = el(`<div class="screen fade-in">${bgHtml('event')}${topbarHtml(run)}
      <div class="panel-screen"><div class="event-box">
        <div class="ev-art">${ev.art}</div><div class="ev-title">${T(ev.title)}</div>
        <div class="ev-text"></div><div class="choice-list"></div>
      </div></div></div>`);
    app.mount(root); app.wireTopbar(root, {});
    const textEl = $('.ev-text', root), chEl = $('.choice-list', root);
    const buttons = (labels) => new Promise((res) => {
      chEl.innerHTML = '';
      labels.forEach((l, i) => {
        const b = el(`<button class="btn ${i === labels.length - 1 && labels.length > 1 ? 'gray' : 'blue'}">${T(l)}</button>`);
        b.addEventListener('click', () => { sfx('tap'); chEl.innerHTML = ''; res(i); });
        chEl.appendChild(b);
      });
    });
    const ctx = {
      grade: run.grade, rng, run,
      say: async (t) => { textEl.innerHTML = T(t); sfx('page'); await buttons(['つぎへ']); },
      choose: async (labels) => { return buttons(labels); },
      quiz: async (q) => {
        run.stats.quizTry = (run.stats.quizTry || 0) + 1;
        const ok = await quizPrompt(q, { title: ev.title });
        if (ok) run.stats.quizOk = (run.stats.quizOk || 0) + 1;
        return ok;
      },
      relic: async () => { const id = R.rollRelic(run, rng); save(); await relicReveal(app, id); app.wireTopbar(root, {}); },
      coins: async (n) => { run.coins = Math.max(0, run.coins + n); updateTopbar(root, run); if (n > 0) { sfx('coin'); FX.toast(T(`コインを ${n} もらった！`), '🪙'); } },
      heal: async (n) => { const h = R.heal(run, n); updateTopbar(root, run); sfx('heal'); FX.toast(T(`HPが ${h} かいふく`), '💖'); },
      damage: async (n) => { run.hp = Math.max(1, run.hp - n); updateTopbar(root, run); sfx('hurt'); FX.shake(app.stage); },
      cards: async (opts) => { const ids = R.rollCards(run, rng, opts); save(); const id = await cardChoice(app, ids); if (id) R.addCard(run, id); },
      gainCard: async (id) => { R.addCard(run, id); markSeenCard(id); sfx('upgrade'); await alertBox('カードを もらった！', `「${CARDS[id].name}」が デッキに はいった`); },
      upgradeRandom: async (n) => {
        const cand = run.deck.filter((c) => !c.up && CARDS[c.id].rar !== 'x');
        rng.shuffle(cand).slice(0, n).forEach((c) => { c.up = true; });
        sfx('upgrade');
      },
      upgradeChoose: async () => {
        const inst = await deckView(run.deck, { title: 'きたえる カードを えらぼう', pick: true, filter: (c) => !c.up && CARDS[c.id].rar !== 'x' });
        if (inst) { R.upgradeCard(run, inst.uid); sfx('upgrade'); await upgradeShow(inst); }
      },
      removeChoose: async () => {
        const inst = await deckView(run.deck, { title: 'すてる カードを えらぼう', pick: true });
        if (inst) { R.removeCard(run, inst.uid); sfx('coin'); FX.toast(T('カードを すてた'), '🗑️'); }
      },
    };
    (async () => {
      await ev.run(ctx);
      save();
      textEl.innerHTML += '';
      await buttons(['マップに もどる ▶']);
      resolve();
    })();
  });
}
