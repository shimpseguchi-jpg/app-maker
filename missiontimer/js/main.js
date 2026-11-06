// ミッションタイマー（仮）：はじまり と がめんの ながれ（REQUIREMENTS.md 5.10）
// はじめかた → ホーム → スケジュールメイカー → ブリーフィング → ミッション中 → だっしゅつ せいこう → けっか → ホーム
import { setTextMode } from '../../js/text.js';
import { T, $, el, toast, play, unlockOnce, applyVolume, fullscreen, clock, minText } from './ui/common.js';
import { profile, saveProfile, loadMission, saveMission, saveDraft, record } from './save.js';
import { themeById } from './data/themes.js';
import * as M from './engine/mission.js';
import { STEP } from './engine/schedule.js';
import { renderSetup, renderHome, renderSettings, renderParent } from './ui/home.js';
import { renderMaker, newDraft, draftFromTemplate, planDraft, startOf, endOf, nowMinute } from './ui/maker.js';
import { runBriefing } from './ui/briefing.js';
import { runTimer } from './ui/timer.js';
import { renderResult, renderRecord, applyResult } from './ui/result.js';

const VERSION = '0.1.0';
const root = $('#app');
if (profile.text !== 'hira' && profile.text !== 'ruby') profile.text = 'ruby';      // 漢字には かならず ふりがな
setTextMode(profile.text);
applyVolume();
document.addEventListener('pointerdown', unlockOnce, { capture: true });               // N-05 さいしょの タップで おとを かいほう
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !window.__noSW) navigator.serviceWorker.register('sw.js').catch(() => {});

// テーマの いろ（F-606）
function applyTheme(th) {
  const s = document.documentElement.style;
  for (const [k, v] of Object.entries(th.colors)) s.setProperty('--' + k, v);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', th.colors.bg);
}
const theme = () => themeById(profile.theme);
applyTheme(theme());

let cleanup = null;
function mount(fn) { cleanup?.(); cleanup = null; document.querySelectorAll('.modal-back').forEach((x) => x.remove()); root.innerHTML = ''; window.scrollTo(0, 0); cleanup = fn() || null; }

const app = {
  version: VERSION, theme, applyTheme, loadMission, saveMission,
  go(name, params = {}) {
    root.dataset.screen = name;
    if (name === 'home') return mount(() => renderHome(root, app));
    if (name === 'setup') return mount(() => renderSetup(root, app));
    if (name === 'settings') return mount(() => renderSettings(root, app));
    if (name === 'parent') return mount(() => renderParent(root, app));
    if (name === 'record') return mount(() => renderRecord(root, app));
    if (name === 'maker') {
      const draft = params.template ? draftFromTemplate(params.template) : params.draft || (params.fresh ? newDraft() : newDraft());
      return mount(() => renderMaker(root, app, draft));
    }
    if (name === 'briefing') return mount(() => runBriefing(root, { theme: theme(), mission: params.m, onDone: () => begin(params.m) }));
    if (name === 'timer') return mount(() => runTimer(root, app, params.m));
    if (name === 'result') return mount(() => renderResult(root, app, params.m, params.gained));
    if (name === 'waiting') return mount(() => waiting(params.draft));
  },
  // ミッションかいし！（F-204：はじまりが すぎていたら いまに、まだ さき なら まつ）
  launch(draft, { force = false } = {}) {
    unlockOnce(); fullscreen(true);
    const now = Date.now(), nowM = nowMinute(now);
    const S = startOf(draft, now), E = endOf(draft, S);
    const ceilNow = Math.ceil(nowM / STEP - 1e-9) * STEP;
    let over = {};
    if (S < nowM - 0.5) { over = { start: ceilNow, end: E }; toast(T(`はじまりを ${clock(ceilNow)} に したよ`)); }
    else if (S - nowM > STEP && !force) return app.go('waiting', { draft });
    else if (force && S - nowM > STEP) over = { start: ceilNow, end: E };
    const tt = planDraft(draft, now, over);
    if (!tt.ok) { toast(T(tt.text)); draft.step = 2; return app.go('maker', { draft }); }
    const m = M.createMission(tt, { now, theme: profile.theme });
    saveMission(m); saveDraft(null);
    app.go('briefing', { m });
  },
  resume() {
    const m = loadMission();
    if (!m || m.state === 'finished') return app.go('home');
    if (m.state === 'ready') return app.go('briefing', { m });
    app.go('timer', { m });
  },
  finished(m) { saveMission(m); const gained = applyResult(m); app.go('result', { m, gained }); },
  quitMission() { const m = loadMission(); if (m && m.state !== 'finished') { const r = M.quit(m, Date.now()); saveMission(r.m); applyResult(r.m); } },
};

function begin(m0) {
  const { m } = M.startMission(m0, Date.now());
  profile.briefings = (profile.briefings || 0) + 1; saveProfile();
  saveMission(m);
  app.go('timer', { m });
}

// はじまりの じこくまで まつ
function waiting(draft) {
  const th = theme();
  const node = el(`<div class="screen waiting"><div class="card"><div class="mascot big">${th.mascot.emoji}</div>
    <h1 data-at></h1><p class="lead" data-left></p>
    <div class="col"><button class="btn big" data-now>▶ ${T('いますぐ はじめる')}</button><button class="btn gray" data-back>${T('もどる')}</button></div></div></div>`);
  root.appendChild(node);
  const S = startOf(draft);
  node.querySelector('[data-at]').innerHTML = T(`${clock(S)} に はじまるよ`);
  const iv = setInterval(() => {
    const left = S - nowMinute();
    if (left <= STEP) { clearInterval(iv); app.launch(draft); return; }
    node.querySelector('[data-left]').innerHTML = T(`あと ${minText(Math.ceil(left))}`);
  }, 1000);
  node.querySelector('[data-left]').innerHTML = T(`あと ${minText(Math.ceil(S - nowMinute()))}`);
  node.querySelector('[data-now]').addEventListener('click', () => { play('select'); clearInterval(iv); app.launch(draft, { force: true }); });
  node.querySelector('[data-back]').addEventListener('click', () => { play('tap'); clearInterval(iv); draft.step = 2; app.go('maker', { draft }); });
  return () => clearInterval(iv);
}

// ── きどう（F-102・F-902：すすめている ミッションは さいよみこみ しても つづきから）
window.__app = app;
const saved = loadMission();
if (!profile.setup) app.go('setup');
else if (saved && (saved.state === 'running' || saved.state === 'paused')) app.go('timer', { m: saved });
else if (saved && saved.state === 'finished' && saved.result && !record.missions.some((x) => x.id === saved.id)) app.finished(saved);
else app.go('home');
