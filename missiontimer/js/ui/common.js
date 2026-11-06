// がめんの どうぐ（モーダル・トースト・よみあげ・おと・がめんを けさない・とけい）
import { T } from '../../../js/text.js';
import { sfx, setVolumes, unlockAudio } from '../../../js/audio.js';
import { profile } from '../save.js';
import { minText, clock } from '../engine/schedule.js';

export { T, minText, clock };
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
export function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const kana = (s) => String(s ?? '').replace(/\{([^|{}]+)\|([^{}]+)\}/g, '$2');   // よみあげ よう
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// 「3ぼん」「1ぽん」（カギの かず）
export function hon(n) { const d = Math.abs(n) % 10; return n + ([1, 6, 8, 0].includes(d) ? 'ぽん' : d === 3 ? 'ぼん' : 'ほん'); }
// のこり じかんの おおきな かず：{ num, unit }（1ぷん みまんは びょう、すぎたら −）
export function bigParts(left) {
  if (left > 1) { const n = Math.ceil(left - 1e-9); return { num: String(n), unit: minText(n).slice(String(n).length) }; }
  if (left > 0) return { num: String(Math.ceil(left * 60 - 1e-9)), unit: 'びょう' };
  const n = Math.max(1, Math.ceil(-left - 1e-9));
  return { num: '−' + n, unit: minText(n).slice(String(n).length) };
}

// ── おと（F-104・N-06：なし・小・ふつう。ティック音は ならさない）
export function applyVolume() { setVolumes(profile.drama === 'dramatic' ? 0.5 : 0, { off: 0, low: 0.35, normal: 0.8 }[profile.volume] ?? 0.8); }
export function play(name, arg) { sfx(name, arg); }
let unlocked = false;
export function unlockOnce() { if (!unlocked) { unlockAudio(); unlocked = true; } }

// ── よみあげ（F-306。つかえない たんまつでは ひょうじ だけ）
export function speak(text, { rate = 1 } = {}) {
  if (!profile.speech || profile.volume === 'off' || !('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(kana(text).replace(/[「」『』]/g, ''));
    u.lang = 'ja-JP'; u.rate = rate; u.volume = profile.volume === 'low' ? 0.5 : 1;
    window.speechSynthesis.speak(u);
  } catch (e) { /* */ }
}
export function hush() { try { window.speechSynthesis?.cancel(); } catch (e) { /* */ } }

// ── モーダル・トースト
export function modal(html, { cls = '', onClose, dismiss = true } = {}) {
  const back = el(`<div class="modal-back"><div class="modal ${cls}">${html}</div></div>`);
  document.body.appendChild(back);
  const close = () => { if (!back.isConnected) return; back.remove(); onClose?.(); };
  if (dismiss) back.addEventListener('pointerdown', (e) => { if (e.target === back) close(); });
  $$('[data-close]', back).forEach((b) => b.addEventListener('click', () => { play('tap'); close(); }));
  return { root: back.firstElementChild, close };
}
export function confirmBox(title, body, yes = 'はい', no = 'やめる') {
  return new Promise((res) => {
    const { root, close } = modal(`<h2>${T(title)}</h2>${body ? `<p>${T(body)}</p>` : ''}<div class="row"><button class="btn gray" data-no>${T(no)}</button><button class="btn" data-yes>${T(yes)}</button></div>`, { onClose: () => res(false) });
    $('[data-yes]', root).addEventListener('click', () => { play('tap'); res(true); close(); });
    $('[data-no]', root).addEventListener('click', () => { play('tap'); close(); });
  });
}
let toastTimer = null;
export function toast(html, ms = 2400) {
  let t = $('#toast');
  if (!t) { t = el('<div id="toast" role="status" aria-live="polite"></div>'); document.body.appendChild(t); }
  t.innerHTML = html; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), ms);
}

// ながおし（F-105 ほごしゃモードの いりぐち・F-508 いちじていし）
export function longPress(node, ms, fn, onProgress) {
  let timer = null, t0 = 0, raf = 0;
  const stop = () => { clearTimeout(timer); cancelAnimationFrame(raf); timer = null; onProgress?.(0); };
  const loop = () => { onProgress?.(Math.min(1, (performance.now() - t0) / ms)); raf = requestAnimationFrame(loop); };
  node.addEventListener('pointerdown', (e) => { e.preventDefault(); t0 = performance.now(); loop(); timer = setTimeout(() => { stop(); fn(); }, ms); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => node.addEventListener(ev, () => { if (timer) stop(); }));
}

// ── がめんを けさない（F-501・N-05）
let lock = null, wantLock = false, lockNoticed = false;
export async function keepAwake(on) {
  wantLock = on;
  if (!on) { try { await lock?.release(); } catch (e) { /* */ } lock = null; return; }
  if (!('wakeLock' in navigator)) {
    if (!lockNoticed) { lockNoticed = true; toast(T('がめんが きえないように しておいてね'), 4000); }
    return;
  }
  try { lock = await navigator.wakeLock.request('screen'); } catch (e) { /* */ }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && wantLock) keepAwake(true); });
export function fullscreen(on) {
  try {
    if (on && !document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  } catch (e) { /* iPad Safari など：1がめんに おさめる */ }
}

// ── アナログ とけい（F-202：はじまり〜おわりの おうぎがた。60ぷんで 1しゅう、こえた ぶんは うちがわの わに）
export const KIND_COLOR = { focus: '#4dabf7', life: '#69db7c', reward: '#ff922b', rest: '#ffd43b', free: '#b197fc', skipped: '#868e96' };
export function itemColor(it) { return it.auto === 'free' ? KIND_COLOR.free : it.auto === 'skipped' ? KIND_COLOR.skipped : KIND_COLOR[it.kind] || '#adb5bd'; }
function arc(cx, cy, r0, r1, a0, a1) {
  // はんしゅう より ながい わは 2つに わける（はじめと おわりが かさなると SVG が わを かかないため）
  if (a1 - a0 > Math.PI) { const mid = (a0 + a1) / 2; return arc(cx, cy, r0, r1, a0, mid) + ' ' + arc(cx, cy, r0, r1, mid, a1); }
  const p = (r, a) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = p(r1, a0), [x1, y1] = p(r1, a1), [x2, y2] = p(r0, a1), [x3, y3] = p(r0, a0);
  return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r1},${r1} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)} L${x2.toFixed(2)},${y2.toFixed(2)} A${r0},${r0} 0 ${large} 0 ${x3.toFixed(2)},${y3.toFixed(2)} Z`;
}
// segs = [{ from, to, color }]（分）。hands = その日の 分（はりで しめす。null なら はり なし）
// minutes：「◯ぷんかん」の めもり（12 の ところが 0／60ぷん、すうじは 5・10・…・60）
export function clockSvg(segs, hands, { minutes = false } = {}) {
  const cx = 100, cy = 100, R = 92;
  const S0 = segs.length ? segs[0].from : 0;
  const parts = [];
  for (const sg of segs) {
    for (let a = sg.from; a < sg.to - 1e-6;) {
      const lap = Math.floor((a - S0) / 60 + 1e-9);
      const lapEnd = S0 + (lap + 1) * 60;
      const b = Math.min(sg.to, lapEnd);
      const r1 = 78 - lap * 20, r0 = r1 - 18;
      const a0 = ((a % 60) / 60) * 2 * Math.PI, a1 = a0 + ((b - a) / 60) * 2 * Math.PI;
      if (r0 > 4) parts.push(`<path d="${arc(cx, cy, r0, r1, a0, Math.min(a1, a0 + 2 * Math.PI - 1e-4))}" fill="${sg.color}" stroke="#0003" stroke-width="0.6"/>`);
      a = b;
    }
  }
  const nums = Array.from({ length: 12 }, (_, i) => { const a = ((i + 1) / 12) * 2 * Math.PI; return `<text x="${(cx + 86 * Math.sin(a)).toFixed(1)}" y="${(cy - 86 * Math.cos(a) + 4.5).toFixed(1)}"${minutes ? ' class="mn"' : ''}>${minutes ? (i + 1) * 5 : i + 1}</text>`; }).join('');
  const ticks = Array.from({ length: 60 }, (_, i) => { const a = (i / 60) * 2 * Math.PI, r0 = i % 5 ? 95 : 93; return `<line x1="${(cx + r0 * Math.sin(a)).toFixed(1)}" y1="${(cy - r0 * Math.cos(a)).toFixed(1)}" x2="${(cx + 98 * Math.sin(a)).toFixed(1)}" y2="${(cy - 98 * Math.cos(a)).toFixed(1)}"/>`; }).join('');
  let hand = '';
  if (hands != null) {
    const hm = ((hands % 720) + 720) % 720, ma = ((hands % 60) / 60) * 2 * Math.PI, ha = (hm / 720) * 2 * Math.PI;
    hand = `<line class="hh" x1="100" y1="100" x2="${(cx + 42 * Math.sin(ha)).toFixed(1)}" y2="${(cy - 42 * Math.cos(ha)).toFixed(1)}"/><line class="mh" x1="100" y1="100" x2="${(cx + 66 * Math.sin(ma)).toFixed(1)}" y2="${(cy - 66 * Math.cos(ma)).toFixed(1)}"/><circle cx="100" cy="100" r="4" class="pin"/>`;
  }
  return `<svg class="clock" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="${R + 6}" class="face"/>${parts.join('')}<g class="ticks">${ticks}</g><g class="nums">${nums}</g>${hand}</svg>`;
}

// ── えんばん（F-503 Time Timer がた。のこりの わりあいで おうぎがたが へる）
export function discPath(frac) {
  const f = Math.max(0, Math.min(1, frac));
  if (f >= 0.9999) return 'M100,8 A92,92 0 1 1 99.99,8 Z';
  if (f <= 0) return '';
  const a = f * 2 * Math.PI, x = 100 + 92 * Math.sin(a), y = 100 - 92 * Math.cos(a);
  return `M100,100 L100,8 A92,92 0 ${f > 0.5 ? 1 : 0} 1 ${x.toFixed(2)},${y.toFixed(2)} Z`;
}
