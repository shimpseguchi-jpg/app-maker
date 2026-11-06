// ミッションタイマー（仮）：はじまり と がめんの ながれ（REQUIREMENTS.md 5.10）
// はじめかた → ホーム → スケジュールメイカー → ブリーフィング → ミッション中 → だっしゅつ せいこう → けっか → ホーム
import { setTextMode } from '../../js/text.js';
import { T, $, toast, unlockOnce, applyVolume, fullscreen } from './ui/common.js';
import { profile, saveProfile, loadMission, saveMission, saveDraft, saveLast, record } from './save.js';
import { themeById } from './data/themes.js';
import * as M from './engine/mission.js';
import { renderSetup, renderHome, renderSettings, renderParent } from './ui/home.js';
import { renderMaker, newDraft, draftFromTemplate, draftFromLast, lastOf, planDraft } from './ui/maker.js';
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
// サンドボックスの なかでは serviceWorker に さわるだけで エラーに なる ことが あるので かこむ
try { if (!window.__noSW && 'serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) { /* オフラインに ならない だけ */ }

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
      // テンプレ／このまえと おなじ は タイムテーブルが できた じょうたいで ひらく。じぶんで つくる は つくりかけが あれば つづきから
      const draft = params.template ? draftFromTemplate(params.template) : params.last ? draftFromLast(params.last) : params.draft?.items ? params.draft : newDraft();
      return mount(() => renderMaker(root, app, draft));
    }
    if (name === 'briefing') return mount(() => runBriefing(root, { theme: theme(), mission: params.m, onDone: () => begin(params.m) }));
    if (name === 'timer') return mount(() => runTimer(root, app, params.m));
    if (name === 'result') return mount(() => renderResult(root, app, params.m, params.gained));
  },
  // ミッションかいし！「◯ぷんかん」の ミッションを いまから はじめる（ブリーフィングの あとから はかる）
  launch(draft) {
    unlockOnce(); fullscreen(true);
    const tt = planDraft(draft);
    if (!tt.ok) { toast(T(tt.text)); return app.go('maker', { draft }); }
    const m = M.createMission(tt, { now: Date.now(), theme: profile.theme, relative: true });
    saveMission(m); saveDraft(null); saveLast(lastOf(draft));                           // ホームの「このまえと おなじ」
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

// ── きどう（F-102・F-902：すすめている ミッションは さいよみこみ しても つづきから）
window.__app = app;
const saved = loadMission();
if (!profile.setup) app.go('setup');
else if (saved && (saved.state === 'running' || saved.state === 'paused')) app.go('timer', { m: saved });
else if (saved && saved.state === 'finished' && saved.result && !record.missions.some((x) => x.id === saved.id)) app.finished(saved);
else app.go('home');
