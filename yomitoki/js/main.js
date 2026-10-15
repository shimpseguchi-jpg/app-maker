// よみとき でんしゃ：はじまり
import { el, $, $$, makeRng, newSeed } from './util.js';
import { unlockAudio, setVolume, sfx } from './audio.js';
import { prog, settings } from './save.js';
import { KINDS } from './data/problems.js';
import { buildSession, level, streakDays, PASSENGERS, STARS_PER_PASSENGER } from './engine/coach.js';
import { initCommon, openModal } from './ui/common.js';
import { runSession } from './ui/solve.js';
import { sortScreen } from './ui/sort.js';
import { calcMenu } from './ui/calc.js';
import { parentGate } from './ui/parent.js';

const stage = $('#stage');
initCommon(stage);
setVolume(settings.sfx);

// ───── がめんの おおきさ（iPad よこむき 1180 を きじゅんに かくだい・しゅくしょう）─────
const DW = 1180, MIN_H = 720, MAX_H = 900;
let fitted = false;
function fit() {
  const de = document.documentElement;
  const vw = window.innerWidth || de.clientWidth, vh = window.innerHeight || de.clientHeight;
  if (!(vw > 50 && vh > 50)) { setTimeout(fit, 100); return; }
  fitted = true;
  let s = vw / DW, w = DW, h = vh / s;
  if (h < MIN_H) { s = vh / MIN_H; h = MIN_H; w = Math.min(vw / s, 1500); } else if (h > MAX_H) h = MAX_H;
  stage.style.width = w + 'px'; stage.style.height = h + 'px'; stage.style.transform = `scale(${s})`;
  stage.style.left = Math.max(0, (vw - w * s) / 2) + 'px'; stage.style.top = Math.max(0, (vh - h * s) / 2) + 'px';
}
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', () => setTimeout(fit, 200));
window.addEventListener('load', fit);
window.addEventListener('pageshow', fit);
if (window.ResizeObserver) new ResizeObserver(() => fit()).observe(document.documentElement);
[50, 300, 1000, 2500].forEach((t) => setTimeout(fit, t));
fit();
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('contextmenu', (e) => e.preventDefault());
let audioReady = false;
document.addEventListener('pointerdown', () => { if (!audioReady) { unlockAudio(); audioReady = true; fit(); } }, { capture: true });
$('[data-portrait]')?.addEventListener('click', () => document.body.classList.add('allow-portrait'));

const app = {
  stage,
  mount(node) {
    $$('.screen, .modal-back, .toast, .confetti', stage).forEach((s) => s.remove());
    stage.appendChild(node);
  },
  home,
};

function trainHtml() {
  const riders = PASSENGERS.slice(0, prog.passengers);
  const cars = [];
  for (let i = 0; i < riders.length; i += 3) cars.push(riders.slice(i, i + 3));
  const shown = cars.slice(-5);
  return `<div class="train"><div class="car head"><span class="rider">🐭</span></div>${shown.map((c) => `<div class="car">${c.map((r) => `<span class="rider">${r}</span>`).join('')}</div>`).join('')}</div>`;
}

function home() {
  const noteN = prog.note.length;
  const next = STARS_PER_PASSENGER - (prog.stars % STARS_PER_PASSENGER);
  const node = el(`<div class="screen home fade-in">
    <div class="home-top">
      <div class="logo">よみとき でんしゃ<small>ぶんしょうだい とっくん</small></div>
      <div class="home-badges">
        <span class="badge">レベル <b>${level()}</b></span>
        <span class="badge">⭐ <b>${prog.stars}</b></span>
        <span class="badge">🔥 れんぞく <b>${streakDays()}</b> にち</span>
      </div>
    </div>
    <div class="rail-scene">${trainHtml()}<div class="rail"></div>
      <div style="position:absolute;right:34px;top:30px;font-size:18px;background:#fff;border-radius:14px;padding:8px 14px">あと ⭐<b class="n">${next}</b> で あたらしい なかま</div></div>
    <div class="home-main">
      <button class="menu-card main" data-go="today"><span class="mi">🚃</span><span class="mt">きょうの とっくん</span><span class="ms">ぶんしょうだい 8もん。<br>にがてな かたちが たくさん でるよ。</span></button>
      <button class="menu-card" data-go="note" ${noteN ? '' : 'disabled'}>${noteN ? `<span class="count">${noteN}</span>` : ''}<span class="mi">📒</span><span class="mt">とっくん ノート</span><span class="ms">${noteN ? 'まちがえた かたちを もういちど' : 'まちがえた もんだいが ここに はいるよ'}</span></button>
      <button class="menu-card" data-go="sort"><span class="mi">🔤</span><span class="mt">ことば しわけ</span><span class="ms">「おりました」は たしざん？ ひきざん？</span></button>
      <button class="menu-card" data-go="calc"><span class="mi">🧮</span><span class="mt">けいさん れっしゃ</span><span class="ms">3つの かずの けいさんを スピード れんしゅう</span></button>
      <button class="menu-card" data-go="kinds"><span class="mi">🗺️</span><span class="mt">もんだいの かたち</span><span class="ms">どんな もんだいが あるか みる</span></button>
    </div>
    <div class="home-foot"><span class="sp"></span><button class="btn white small" data-go="parent">おうちの かたへ</button></div>
  </div>`);
  app.mount(node);
  node.addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]'); if (!b) return;
    sfx('tap');
    const go = b.dataset.go;
    if (go === 'today') { sfx('train'); runSession(app, buildSession(makeRng(newSeed()), 8)); }
    else if (go === 'note') runSession(app, prog.note.slice(0, 6).map((x) => ({ kind: x.kind, note: x.id })), { title: 'とっくん ノート' });
    else if (go === 'sort') sortScreen(app);
    else if (go === 'calc') calcMenu(app);
    else if (go === 'parent') parentGate(app);
    else if (go === 'kinds') kindsModal();
  });
}

function kindsModal() {
  const lv = level();
  const m = openModal(`<h2>🗺️ もんだいの かたち</h2>
    ${[1, 2, 3].map((l) => `<p style="margin:14px 0 4px"><b>レベル ${l}</b>${l > lv ? ' 🔒' : ''}</p>${Object.values(KINDS).filter((k) => k.level === l).map((k) => `<p style="margin:2px 0 2px 16px;font-size:18px;${l > lv ? 'opacity:.45' : ''}">${k.icon} ${k.name}：${k.memo}</p>`).join('')}`).join('')}
    <p style="font-size:16px;color:#6b7b78">いまの レベルの かたちを ぜんぶ 2かい つづけて まちがえずに とくと、つぎの レベルに すすむよ。</p>
    <div class="acts"><button class="btn" data-x>とじる</button></div>`);
  $('[data-x]', m.node).onclick = m.close;
}

home();
(function bootDone() { if (fitted) { window.__bootDone = true; document.getElementById('boot')?.remove(); } else setTimeout(bootDone, 200); })();
const topLevel = (() => { try { return window.top === window.self; } catch (e) { return false; } })();
if ('serviceWorker' in navigator && location.protocol === 'https:' && topLevel) navigator.serviceWorker.register('sw.js').catch(() => {});
