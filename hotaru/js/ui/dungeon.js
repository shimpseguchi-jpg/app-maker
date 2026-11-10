// めいきゅうの がめん：そうさ（タップ・スワイプ・じゅうじボタン・キーボード）と、おきた ことの えんしゅつ
import { T } from '../../../js/text.js';
import { el, $, $$, newSeed } from '../../../js/util.js';
import { sfx } from '../../../js/audio.js';
import * as g from '../engine/game.js';
import { heroStats, expNeed } from '../engine/hero.js';
import { MOBS, areaOf, isBossFloor, LAST_FLOOR } from '../data/enemies.js';
import { ITEMS, WEAPONS, SHIELDS, BAG_MAX } from '../data/items.js';
import { FIREFLIES, FIREFLY_LIST, FIREFLY_HP, colorOf } from '../data/fireflies.js';
import { View } from './view.js';
import { openModal, alertBox, confirmBox, toast, modalOpen } from './common.js';
import { settings } from '../save.js';
import { askQuiz } from './quiz.js';

export const fireflyCard = (id) => `<div class="ff-card"><i class="ff-dot" style="--c:${colorOf(id)}"></i><div><b>${T(FIREFLIES[id].name)}</b><div class="sub">${T('さいだい HP')} +${FIREFLY_HP}</div></div></div>`;
export const howtoHtml = () => `<h2>🏮 ${T('あそびかた')}</h2><ul class="howto">
  <li>${T('{行|い}きたい ばしょを <b>タップ</b>すると {歩|ある}く。{左下|ひだりした}の <b>やじるし</b>でも うごける。')}</li>
  <li>${T('まものに ぶつかると <b>こうげき</b>。じぶんが 1かい うごくと、まものも 1かい うごく。')}</li>
  <li>${T('<b>💡 ひらめき こうげき</b>：もんだいに せいかい すると、はなれた まものに <b>つよい こうげき</b>。')}</li>
  <li>${T('<b>たからばこ</b>と <b>ほたるの かご</b>は、もんだいに せいかい すると あく。')}</li>
  <li>${T('せいかい する たびに <b>けいけんち</b>が もらえて、<b>HPも すこし かいふく</b>する。')}</li>
  <li>${T('<b>かいだん</b>を おりて、いちばん おくの ボスを たおそう。')}</li>
  <li>${T('やられても だいじょうぶ。レベルと もちものは そのまま、おかねが はんぶんに なるだけ。')}</li></ul>`;

export function runDungeon({ stage, P, G, save, openSettings, bgm }) {
  return new Promise((resolve) => {
    const screen = el(`<div class="screen dungeon">
      <div class="view"><canvas class="cv"></canvas>
        <div class="floor-name"></div>
        <canvas class="mini" width="186" height="126"></canvas>
        <div class="log" aria-live="polite"></div>
        <div class="dpad" ${settings.pad ? '' : 'hidden'}>
          <button data-d="0,-1" class="u">▲</button><button data-d="-1,0" class="l">◀</button><button data-wait class="c">⏳</button><button data-d="1,0" class="r">▶</button><button data-d="0,1" class="d">▼</button>
        </div>
      </div>
      <aside class="side">
        <div class="status"></div>
        <div class="lantern"></div>
        <button class="spark" data-spark><span class="emo">💡</span><span class="nm">${T('ひらめき こうげき')}</span><small>${T('もんだいに せいかいで つよい こうげき')}</small></button>
        <div class="side-btns">
          <button class="btn stairs" data-stairs hidden>⬇️ ${T('かいだんを おりる')}</button>
          <button class="btn" data-bag>🎒 ${T('もちもの')}</button>
          <button class="btn gray" data-menu>☰ ${T('メニュー')}</button>
        </div>
      </aside></div>`);
    $$('.screen', stage).forEach((s) => s.remove());
    stage.prepend(screen);
    const viewEl = $('.view', screen), view = new View($('.cv', screen), $('.mini', screen));
    const fit = () => view.resize(viewEl.clientWidth, viewEl.clientHeight);
    fit(); const ro = new ResizeObserver(fit); ro.observe(viewEl);
    view.set(G, P);
    let done = false, busy = false, walk = null, raf = 0;
    const loop = (now) => { if (done) return; view.draw(now); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    window.__hotaru = { get G() { return G; }, P, act: (a) => doAct(a), spark: () => useSpark(), get busy() { return busy; } }; // テストよう

    const logEl = $('.log', screen);
    const say = (text, cls = '') => { logEl.append(el(`<div class="${cls}">${T(text)}</div>`)); while (logEl.children.length > 4) logEl.firstChild.remove(); };
    const name = (kind) => MOBS[kind].name;

    function refresh() {
      const S = heroStats(P), h = G.hero, area = areaOf(G.floor);
      $('.floor-name', screen).innerHTML = `${T(area.name)} <b>${G.floor}</b>${T('かい')}${isBossFloor(G.floor) && G.bossAlive ? ' <span class="boss">ボス</span>' : ''}`;
      const pct = (a, b) => Math.max(0, Math.min(100, Math.round(a / b * 100)));
      $('.status', screen).innerHTML = `
        <div class="who"><span class="lv">Lv <b>${P.level}</b></span><span class="gold">💰 <b>${P.gold}</b></span></div>
        <div class="gauge hp ${h.hp < S.maxHp * 0.3 ? 'low' : ''}"><span>HP</span><div class="bar"><i style="width:${pct(h.hp, S.maxHp)}%"></i></div><b>${h.hp}<small>/${S.maxHp}</small></b></div>
        <div class="gauge exp"><span>EXP</span><div class="bar"><i style="width:${pct(P.exp, expNeed(P.level))}%"></i></div><b><small>${T('あと')} ${expNeed(P.level) - P.exp}</small></b></div>
        <div class="eq">${WEAPONS[P.weapon].emo} ${T('こうげき')} <b>${S.atk}</b>　${SHIELDS[P.shield].emo} ${T('ぼうぎょ')} <b>${S.def}</b>${h.poison ? ` <span class="bad">🤢 ${T('どく')}</span>` : ''}${h.sleep ? ` <span class="bad">😴</span>` : ''}</div>`;
      $('.lantern', screen).innerHTML = `<div class="lt-title">🏮 ${T('たすけた ほたる')} <b>${P.fireflies.length}</b>/${FIREFLY_LIST.length}</div><div class="lt-ffs">${P.fireflies.map((id) => `<i class="ff-dot" style="--c:${colorOf(id)}" title="${FIREFLIES[id].name}"></i>`).join('')}</div>`;
      $('[data-spark]', screen).classList.toggle('off', !!g.canSpark(G));
      const o = g.objAt(G, h.x, h.y);
      $('[data-stairs]', screen).hidden = !(o && o.t === 'stairs' && !G.bossAlive);
      $('[data-bag]', screen).innerHTML = `🎒 ${T('もちもの')} <small>${P.bag.length}/${BAG_MAX}</small>`;
      view.drawMini();
    }

    // ── おきた ことを がめんに だす
    function handle(ev) {
      const after = [], h = G.hero;
      for (const e of ev) {
        if (e.t === 'msg') say(e.text, 'dim');
        else if (e.t === 'bump') sfx('blocked');
        else if (e.t === 'hit') {
          view.shake(e.id); view.float(e.x, e.y, String(e.dmg), e.crit || e.sneak ? '#ffe45c' : '#fff', e.crit || e.sneak ? 40 : 30);
          sfx(e.crit || e.sneak ? 'crit' : 'hit');
          if (e.how === 'spark') say('ひらめいた！ ひかりの こうげき！', 'good'); else if (e.sneak) say('ふいうち！ ダメージ 2ばい！', 'good'); else if (e.crit) say('かいしんの いちげき！', 'good');
        } else if (e.t === 'kill') {
          view.puff(e.x, e.y, '💨'); sfx('kill');
          say(`${name(e.kind)}を やっつけた！ <small>EXP +${e.exp}　💰 +${e.gold}</small>`);
        } else if (e.t === 'hurt') {
          view.shake('hero'); view.quake(); view.float(h.x, h.y, '-' + e.dmg, '#ff7a6b', 32); sfx('hurt');
          say(`${name(e.kind)}の ${e.how === 'shot' ? 'とおくからの こうげき' : 'こうげき'}！ ${e.dmg} ダメージ${e.poison ? '。どくを うけた！' : ''}`, 'bad');
        } else if (e.t === 'poison') view.float(h.x, h.y, '-1', '#b98cff', 24);
        else if (e.t === 'beam') { if (e.from === 'hero') { view.beam(h.x, h.y, e.x, e.y); sfx('shoot'); } else view.beam(e.fx, e.fy, e.x, e.y, '#ff8a5c'); }
        else if (e.t === 'bomb') { view.ring(h.x, h.y, '#ffb45c', 1.8); view.flash('#ffb45c'); sfx('crit'); say('どっかーん！'); }
        else if (e.t === 'sleepall') { sfx('curse'); say('まものたちは ねむって しまった。', 'good'); }
        else if (e.t === 'heal') { view.float(h.x, h.y, '+' + e.n, '#7dffa0', 32); sfx('heal'); say(`HPが ${e.n} かいふくした。`, 'good'); }
        else if (e.t === 'pickup') { sfx('add'); say(`${ITEMS[e.id].emo} ${ITEMS[e.id].name}を ひろった。`); }
        else if (e.t === 'bagfull') say(`かばんが いっぱいで ${ITEMS[e.id].name}を ひろえない。`, 'dim');
        else if (e.t === 'gold') { sfx('coin'); view.float(h.x, h.y, '+' + e.n, '#ffd84a', 26); say(`💰 ${e.n} ゴールド ひろった。`); }
        else if (e.t === 'chest') {
          sfx('open');
          if (e.equip) { const it = (e.equip === 'weapon' ? WEAPONS : SHIELDS)[e.tier]; say(`たからばこから ${it.emo} ${it.name}！ さっそく そうびした。`, 'good'); toast(`${it.emo} ${T(it.name)}<small>${T('を てに いれた！')}</small>`); }
          else say(`たからばこから ${e.id ? ITEMS[e.id].emo + ' ' + ITEMS[e.id].name + 'と ' : ''}💰 ${e.gold} ゴールド！`, 'good');
        } else if (e.t === 'spring') { view.float(h.x, h.y, T('ぜんかいふく'), '#8fd0ff', 28); sfx('heal'); say('いずみの {水|みず}を のんだ。HPが ぜんぶ かいふく！', 'good'); }
        else if (e.t === 'trap') {
          sfx('curse');
          if (e.kind === 'warp') { view.reset(); say('ワープの わな！ どこかへ とばされた。', 'bad'); }
          else if (e.kind === 'sleep') say('ねむりの わな！ 2ターン ねむって しまう。', 'bad');
          else { view.quake(); view.float(h.x, h.y, '-' + e.dmg, '#ff7a6b', 30); say(`とげの わな！ ${e.dmg} ダメージ。`, 'bad'); }
        } else if (e.t === 'warp') { view.reset(); sfx('buff'); say('ふわっ… べつの ばしょに ワープした。'); }
        else if (e.t === 'mapped') { sfx('page'); say('この かいの ちずが わかった！', 'good'); }
        else if (e.t === 'seed') { sfx('upgrade'); say(`${ITEMS[e.id].emo} ${ITEMS[e.id].text}`, 'good'); }
        else if (e.t === 'notice') { const m = G.mobs.find((x) => x.id === e.id); if (m) view.float(m.x, m.y, '！', '#ff6a5a', 34); }
        else if (e.t === 'wake') { const m = G.mobs.find((x) => x.id === e.id); if (m) { view.float(m.x, m.y, '！', '#ff6a5a', 34); say(`${name(m.kind)}が {目|め}を さました！`, 'dim'); } }
        else if (e.t === 'summon') { sfx('curse'); say(`やみの ぬしが ${name(e.kind)}を よびだした！`, 'bad'); }
        else if (e.t === 'levelup') {
          sfx('upgrade'); view.ring(h.x, h.y, '#ffe45c', 2); view.float(h.x, h.y, 'LEVEL UP!', '#ffe45c', 34);
          say(`レベルが ${e.level}に あがった！ つよく なって、HPも かいふく。`, 'good');
        } else if (e.t === 'firefly') {
          sfx('win');
          say(`ほたるの ${FIREFLIES[e.id].name}を たすけた！ さいだい HP +${FIREFLY_HP}。`, 'good');
          after.push(() => alertBox(`<div class="big-emo">🏮</div><h2>${T('ほたるを たすけた！')}</h2>${fireflyCard(e.id)}<p class="sub">${T('ランタンが あかるく なって、さいだい HPが ふえた。')}（${P.fireflies.length}/${FIREFLY_LIST.length}）</p>`));
        } else if (e.t === 'bossdown') {
          bgm('map');
          after.push(() => alertBox(`<div class="big-emo">🎉</div><h2>${T('ボスを たおした！')}</h2><p>${T('かいだんが つかえる ように なった。<br>キャンプから、つぎの エリアを すぐ はじめられる ように なった。')}</p>`));
        } else if (e.t === 'sparkmiss') { sfx('blocked'); view.float(h.x, h.y, T('からぶり…'), '#c6cbe6', 26); say('ひらめかなかった… こうげきは からぶり。', 'dim'); }
        else if (e.t === 'learnexp') view.float(h.x, h.y, `EXP +${e.exp}`, '#9fd0ff', 24);
        else if (e.t === 'learnheal') view.float(h.x + 0.6, h.y, `HP +${e.n}`, '#7dffa0', 22);
        else if (e.t === 'askchest') {
          say('たからばこだ！ もんだいに せいかい すると あく。');
          after.push(async () => {
            const first = await quiz({ head: '🔑 たからばこの かぎ：1もんめで せいかい すると なかみが よくなる！', keypad: true });
            let ok = first; while (!ok) ok = await quiz({ head: '🔑 たからばこの かぎ：せいかい すると あく', keypad: true });
            exec({ t: 'unlock', ok: first });
          });
        } else if (e.t === 'askcage') {
          say('かごの なかで ほたるが ひかって いる！');
          after.push(async () => {
            const dots = [null, null, null]; let n = 0;
            while (n < 3) { const ok = await quiz({ head: '🏮 ほたるを たすけよう：3もん せいかいで かごが あく', keypad: true, dots: dots.slice() }); if (ok) dots[n++] = true; }
            exec({ t: 'unlock' });
          });
        } else if (e.t === 'onstairs') {
          if (e.locked) say('ボスを たおさないと かいだんは つかえない。', 'dim');
          else after.push(async () => { if (await confirmBox(`<div class="big-emo">⬇️</div><h2>${T('かいだんを みつけた！')}</h2><p>${T('つぎの かいへ すすむ？')}</p>`, 'すすむ', 'まだ たんけんする')) exec({ t: 'stairs' }); });
        }
      }
      return after;
    }

    function finish(end) {
      done = true; cancelAnimationFrame(raf); ro.disconnect(); stopWalk();
      window.removeEventListener('keydown', onKey);
      resolve({ end, G });
    }
    // もんだいを 1もん だす。せいかいで けいけんち。れんぞく せいかいを しらせる
    async function quiz(opts) {
      const r = await askQuiz(stage, P, opts);
      const ev = g.learnReward(G, P, r.ok, r.combo);
      if (r.ok && r.combo > 0 && r.combo % 5 === 0) toast(`🔥 ${r.combo}${T('もん れんぞく せいかい！')}<small>${T('けいけんち 1.5ばい')}</small>`);
      pending.push(...handle(ev)); save(G); refresh();
      return r.ok;
    }
    const pending = [];
    async function runAfter() {
      if (busy) return; // すでに じゅんばんに かたづけて いる
      busy = true;
      while (pending.length) await pending.shift()();
      busy = false;
      if (done) return;
      if (G.over === 'descend') {
        G = g.nextFloor(G, P, newSeed());
        view.set(G, P); view.reset(); logEl.innerHTML = '';
        sfx('page'); bgm(isBossFloor(G.floor) ? 'boss' : 'map');
        say(`${areaOf(G.floor).name} ${G.floor}かい。`);
        if (isBossFloor(G.floor)) say('つよい まものの けはいが する…！ いずみで かいふく できる。', 'bad');
        save(G); refresh();
      } else if (G.over === 'dead') {
        busy = true; sfx('lose');
        await alertBox(`<div class="big-emo">😵</div><h2>${T('やられて しまった…')}</h2><p>${T('ほたるたちが キャンプまで はこんで くれた。<br>レベルと もちものは そのまま。おかねは はんぶんに なった。')}</p>`, 'キャンプへ');
        finish('dead');
      } else if (G.over === 'return') { busy = true; await alertBox(`<div class="big-emo">🎵</div><h2>${T('キャンプへ かえった')}</h2>`, 'OK'); finish('return'); }
      else if (G.over === 'clear') finish('clear');
    }
    // 1ターン すすめる（もんだいの あと など、なかからも よぶ）
    function exec(a) {
      if (done || G.over) return [];
      const ev = g.act(G, P, a);
      pending.push(...handle(ev));
      save(G); refresh();
      if (pending.length || G.over) { stopWalk(); runAfter(); }
      return ev;
    }
    function doAct(a) { return busy ? [] : exec(a); }
    // ひらめき こうげき：もんだいに こたえてから はつどう
    function useSpark() {
      if (busy || done || G.over) return;
      stopWalk();
      const no = g.canSpark(G);
      if (no) { say(no, 'dim'); sfx('blocked'); return; }
      pending.push(async () => { const ok = await quiz({ head: '💡 ひらめき こうげき：せいかいで つよい こうげき！' }); exec({ t: 'spark', ok }); });
      runAfter();
    }

    // ── タップで あるく
    function stopWalk() { if (walk) { clearTimeout(walk.timer); walk = null; } }
    function tick() {
      if (!walk) return;
      const [dx, dy] = walk.steps.shift(), n = g.visibleMobs(G).length;
      const ev = doAct({ t: 'move', dx, dy });
      if (!walk) return;
      if (!walk.steps.length || ev.some((e) => !['step', 'gold', 'pickup'].includes(e.t)) || g.visibleMobs(G).length > n || G.over || modalOpen()) { walk = null; return; }
      walk.timer = setTimeout(tick, 95);
    }
    function tapTile(x, y) {
      const h = G.hero;
      stopWalk();
      if (x === h.x && y === h.y) { doAct({ t: 'wait' }); return; }
      if (Math.abs(x - h.x) + Math.abs(y - h.y) === 1) { doAct({ t: 'move', dx: x - h.x, dy: y - h.y }); return; }
      const p = g.pathTo(G, x, y);
      if (!p || !p.length) { sfx('blocked'); return; }
      walk = { steps: p, timer: 0 }; tick();
    }
    let down = null;
    const cv = $('.cv', screen);
    cv.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
    cv.addEventListener('pointerup', (e) => {
      if (!down || busy || modalOpen()) { down = null; return; }
      const dx = e.clientX - down.x, dy = e.clientY - down.y, r = cv.getBoundingClientRect(), sc = r.width / view.w;
      down = null;
      if (Math.hypot(dx, dy) > 40 * sc) { stopWalk(); doAct(Math.abs(dx) > Math.abs(dy) ? { t: 'move', dx: Math.sign(dx), dy: 0 } : { t: 'move', dx: 0, dy: Math.sign(dy) }); return; }
      const [tx, ty] = view.tileAt((e.clientX - r.left) / sc, (e.clientY - r.top) / sc);
      tapTile(tx, ty);
    });
    // ── じゅうじボタン（おしっぱなしで つづけて うごく）
    let rep = 0;
    const padStop = () => { clearInterval(rep); rep = 0; };
    $$('.dpad button', screen).forEach((b) => {
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault(); stopWalk(); padStop();
        const a = b.dataset.d ? { t: 'move', dx: +b.dataset.d.split(',')[0], dy: +b.dataset.d.split(',')[1] } : { t: 'wait' };
        doAct(a);
        rep = setInterval(() => { if (modalOpen() || busy) padStop(); else doAct(a); }, 170);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => b.addEventListener(t, padStop));
    });
    const KEYS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
    function onKey(e) {
      if (modalOpen() || busy) return;
      const k = KEYS[e.key];
      if (k) { e.preventDefault(); stopWalk(); doAct({ t: 'move', dx: k[0], dy: k[1] }); }
      else if (e.key === ' ') { e.preventDefault(); doAct({ t: 'wait' }); }
      else if (e.key === 'Enter') doAct({ t: 'stairs' });
      else if (e.key === 'i') openBag();
      else if (e.key === 'z' || e.key === '1') useSpark();
    }
    window.addEventListener('keydown', onKey);

    // ── よこの ボタン
    screen.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b || busy) return;
      if ('spark' in b.dataset) useSpark();
      else if ('stairs' in b.dataset) doAct({ t: 'stairs' });
      else if ('bag' in b.dataset) { sfx('tap'); openBag(); }
      else if ('menu' in b.dataset) { sfx('tap'); openMenu(); }
    });
    function openBag() {
      stopWalk();
      const ids = [...new Set(P.bag)];
      const { m, close } = openModal(`<h2>🎒 ${T('もちもの')} <small>${P.bag.length}/${BAG_MAX}</small></h2>
        <div class="item-list">${ids.map((id) => `<button class="item" data-item="${id}"><span class="emo">${ITEMS[id].emo}</span><span class="nm">${T(ITEMS[id].name)} <b>×${P.bag.filter((b) => b === id).length}</b><small>${T(ITEMS[id].text)}</small></span><span class="use">${T('つかう')}</span></button>`).join('') || `<p class="sub">${T('なにも もっていない。')}</p>`}</div>`);
      $$('[data-item]', m).forEach((b) => b.addEventListener('click', () => { close(); doAct({ t: 'item', id: b.dataset.item }); }));
    }
    function openMenu() {
      stopWalk();
      const { m, close } = openModal(`<h2>☰ ${T('メニュー')}</h2><div class="col">
        <button class="btn" data-how>📖 ${T('あそびかた')}</button>
        <button class="btn" data-set>⚙️ ${T('せってい')}</button>
        <button class="btn gray" data-quit>🏳️ ${T('あきらめて キャンプへ')}</button>
        <p class="sub">${T('とちゅうで やめても、つづきから あそべる。')}</p></div>`, { cls: 'center' });
      $('[data-how]', m).addEventListener('click', () => { close(); openModal(howtoHtml()); });
      $('[data-set]', m).addEventListener('click', () => { close(); openSettings(() => { $('.dpad', screen).hidden = !settings.pad; refresh(); }); });
      $('[data-quit]', m).addEventListener('click', async () => {
        close();
        if (await confirmBox(`<h2>${T('あきらめる？')}</h2><p>${T('やられた ときと おなじで、おかねが はんぶんに なる。')}</p>`, 'あきらめる', 'つづける')) { G.over = 'dead'; save(G); finish('dead'); }
      });
    }

    bgm(isBossFloor(G.floor) && G.bossAlive ? 'boss' : 'map');
    say(`${areaOf(G.floor).name} ${G.floor}かい。`);
    refresh();
    if (!P.tips.howto) { P.tips.howto = 1; busy = true; alertBox(howtoHtml(), 'わかった！', 'wide').then(() => { busy = false; }); }
    void LAST_FLOOR;
  });
}
