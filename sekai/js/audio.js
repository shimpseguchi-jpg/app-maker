// こうかおん（WebAudio で その ばで つくる）
let ctx = null;
let muted = false;

export function setMuted(m) { muted = !!m; }
export function isMuted() { return muted; }

function tone(freq, start, dur, type = 'sine', vol = 0.15) {
  const t = ctx.currentTime + start;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export function sfx(name) {
  if (muted) return;
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) { return; }
  if (name === 'tap') tone(660, 0, 0.06, 'triangle', 0.08);
  else if (name === 'tick') tone(880 + Math.random() * 220, 0, 0.04, 'square', 0.04);
  else if (name === 'ok') { tone(784, 0, 0.12, 'triangle'); tone(1047, 0.1, 0.2, 'triangle'); }
  else if (name === 'ng') { tone(392, 0, 0.15, 'triangle', 0.1); tone(330, 0.12, 0.22, 'triangle', 0.1); }
  else if (name === 'fanfare') [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, i === 3 ? 0.5 : 0.14, 'triangle'));
}
