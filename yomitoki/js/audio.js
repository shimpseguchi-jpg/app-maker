// おと：WebAudio で その ばで つくる（おんせいファイル なし）
let ctx = null, out = null, vol = 0.7;
function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC(); out = ctx.createGain(); out.gain.value = vol * 0.5; out.connect(ctx.destination);
  return ctx;
}
export function setVolume(v) { vol = v; if (out) out.gain.value = v * 0.5; }
export function unlockAudio() {
  const c = ensure(); if (!c) return;
  if (c.state === 'suspended') c.resume();
  const b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0);
}
document.addEventListener('visibilitychange', () => { if (ctx) { if (document.hidden) ctx.suspend(); else ctx.resume(); } });
function tone(freq, t = 0, dur = 0.12, type = 'sine', v = 0.3) {
  const c = ensure(); if (!c || vol <= 0) return;
  const st = c.currentTime + t, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, st);
  g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(v, st + 0.01); g.gain.exponentialRampToValueAtTime(0.001, st + dur + 0.08);
  o.connect(g); g.connect(out); o.start(st); o.stop(st + dur + 0.1);
}
const C = 523.25, E = 659.25, G = 783.99, C6 = 1046.5;
const SFX = {
  tap: () => tone(1200, 0, 0.03, 'sine', 0.15),
  chip: () => { tone(880, 0, 0.05, 'triangle', 0.25); tone(1320, 0.04, 0.05, 'triangle', 0.2); },
  ok: () => { tone(C, 0, 0.08, 'triangle'); tone(E, 0.08, 0.08, 'triangle'); tone(G, 0.16, 0.16, 'triangle'); },
  ng: () => { tone(330, 0, 0.12, 'square', 0.12); tone(262, 0.13, 0.2, 'square', 0.12); },
  star: () => { [C6, 1318.5, 1568].forEach((f, i) => tone(f, i * 0.07, 0.1, 'sine', 0.2)); },
  clear: () => { [C, E, G, C6, G, C6].forEach((f, i) => tone(f, i * 0.11, i === 5 ? 0.4 : 0.1, 'triangle', 0.28)); },
  train: () => { [0, 0.18, 0.5, 0.68].forEach((t) => tone(740, t, 0.12, 'square', 0.08)); tone(988, 1.0, 0.5, 'sine', 0.2); },
  lock: () => tone(220, 0, 0.3, 'sawtooth', 0.08),
};
export function sfx(name) { try { SFX[name] && SFX[name](); } catch (e) { /* */ } }
