// おと：こうかおん と BGM を WebAudio で つくる（おんせいファイル なし）
let ctx = null, master = null, sfxGain = null, bgmGain = null;
let settings = { bgm: 0.5, sfx: 0.8 };
let current = null; // いま ながれている きょく
let timer = null;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
  sfxGain = ctx.createGain(); sfxGain.connect(master);
  bgmGain = ctx.createGain(); bgmGain.connect(master);
  applyVolumes();
  return ctx;
}
function applyVolumes() {
  if (!ctx) return;
  sfxGain.gain.value = settings.sfx * 0.55;
  bgmGain.gain.value = settings.bgm * 0.22;
}
export function setVolumes(bgm, sfx) { settings.bgm = bgm; settings.sfx = sfx; applyVolumes(); }

// iPad では さいしょの タッチで おとを ならせる ように する
export function unlockAudio() {
  const c = ensure();
  if (!c) return;
  if (c.state === 'suspended') c.resume();
  const b = c.createBuffer(1, 1, 22050); const s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0);
}
document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend(); else ctx.resume();
});

const NOTE = {};
(() => {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  for (let o = 1; o < 8; o++) names.forEach((n, i) => { NOTE[n + o] = 440 * Math.pow(2, (o * 12 + i - 57) / 12); });
})();
const f = (n) => (typeof n === 'number' ? n : NOTE[n]);

function tone({ freq, type = 'square', t = 0, dur = 0.12, vol = 0.3, slide = 0, out, attack = 0.005, release = 0.06 }) {
  const c = ensure(); if (!c) return;
  const st = c.currentTime + t;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f(freq), st);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f(freq) * slide), st + dur);
  g.gain.setValueAtTime(0, st);
  g.gain.linearRampToValueAtTime(vol, st + attack);
  g.gain.setValueAtTime(vol, st + Math.max(attack, dur - release));
  g.gain.exponentialRampToValueAtTime(0.0008, st + dur + release);
  o.connect(g); g.connect(out || sfxGain);
  o.start(st); o.stop(st + dur + release + 0.02);
}
let noiseBuf = null;
function noise({ t = 0, dur = 0.1, vol = 0.3, hp = 1000, out }) {
  const c = ensure(); if (!c) return;
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const st = c.currentTime + t;
  const s = c.createBufferSource(); s.buffer = noiseBuf;
  const fl = c.createBiquadFilter(); fl.type = 'highpass'; fl.frequency.value = hp;
  const g = c.createGain(); g.gain.setValueAtTime(vol, st); g.gain.exponentialRampToValueAtTime(0.001, st + dur);
  s.connect(fl); fl.connect(g); g.connect(out || sfxGain);
  s.start(st); s.stop(st + dur + 0.02);
}

const SFX = {
  tap: () => tone({ freq: 'E6', type: 'sine', dur: 0.04, vol: 0.18 }),
  place: () => { tone({ freq: 'G5', type: 'triangle', dur: 0.05, vol: 0.3 }); tone({ freq: 'C6', type: 'triangle', t: 0.04, dur: 0.06, vol: 0.25 }); },
  unplace: () => { tone({ freq: 'C6', type: 'triangle', dur: 0.05, vol: 0.25 }); tone({ freq: 'G5', type: 'triangle', t: 0.04, dur: 0.06, vol: 0.2 }); },
  draw: () => noise({ dur: 0.05, vol: 0.12, hp: 3000 }),
  shuffle: () => { for (let i = 0; i < 6; i++) noise({ t: i * 0.04, dur: 0.04, vol: 0.1, hp: 2500 }); },
  add: (k = 0) => tone({ freq: NOTE.C5 * Math.pow(2, Math.min(k, 12) / 12), type: 'square', dur: 0.08, vol: 0.16 }),
  mul: (k = 0) => { const b = NOTE.E5 * Math.pow(2, Math.min(k, 12) / 12); tone({ freq: b, type: 'square', dur: 0.06, vol: 0.15 }); tone({ freq: b * 1.5, type: 'square', t: 0.06, dur: 0.08, vol: 0.15 }); },
  sub: () => tone({ freq: 'A4', type: 'square', dur: 0.1, vol: 0.14, slide: 0.8 }),
  div: () => { tone({ freq: 'E5', type: 'triangle', dur: 0.07, vol: 0.2 }); tone({ freq: 'B4', type: 'triangle', t: 0.07, dur: 0.08, vol: 0.2 }); },
  block: () => { tone({ freq: 'C4', type: 'triangle', dur: 0.12, vol: 0.35 }); noise({ dur: 0.08, vol: 0.1, hp: 800 }); },
  cond: (ok) => ok ? (tone({ freq: 'C6', type: 'sine', dur: 0.07, vol: 0.2 }), tone({ freq: 'G6', type: 'sine', t: 0.07, dur: 0.1, vol: 0.2 })) : tone({ freq: 'D5', type: 'sine', dur: 0.15, vol: 0.18, slide: 0.85 }),
  combo: () => ['C5', 'E5', 'G5', 'C6', 'E6'].forEach((n, i) => tone({ freq: n, type: 'square', t: i * 0.05, dur: 0.08, vol: 0.14 })),
  shoot: () => tone({ freq: 'A5', type: 'sawtooth', dur: 0.18, vol: 0.12, slide: 2.2 }),
  hit: () => { noise({ dur: 0.12, vol: 0.4, hp: 400 }); tone({ freq: 'C3', type: 'square', dur: 0.1, vol: 0.25, slide: 0.5 }); },
  crit: () => { noise({ dur: 0.2, vol: 0.5, hp: 300 }); ['G5', 'C6', 'E6', 'G6'].forEach((n, i) => tone({ freq: n, type: 'square', t: 0.05 + i * 0.05, dur: 0.1, vol: 0.16 })); },
  hurt: () => { noise({ dur: 0.18, vol: 0.45, hp: 200 }); tone({ freq: 'E3', type: 'sawtooth', dur: 0.2, vol: 0.2, slide: 0.5 }); },
  blocked: () => { tone({ freq: 'A3', type: 'square', dur: 0.06, vol: 0.2 }); noise({ dur: 0.06, vol: 0.2, hp: 2000 }); },
  kill: () => { tone({ freq: 'G4', type: 'square', dur: 0.3, vol: 0.2, slide: 0.3 }); noise({ t: 0.05, dur: 0.3, vol: 0.2, hp: 600 }); },
  buff: () => ['C4', 'E4', 'G4'].forEach((n, i) => tone({ freq: n, type: 'sawtooth', t: i * 0.06, dur: 0.1, vol: 0.12 })),
  curse: () => tone({ freq: 'F4', type: 'sine', dur: 0.4, vol: 0.2, slide: 0.6 }),
  charge: () => tone({ freq: 'C3', type: 'sawtooth', dur: 0.5, vol: 0.12, slide: 3 }),
  coin: () => { tone({ freq: 'B5', type: 'square', dur: 0.05, vol: 0.15 }); tone({ freq: 'E6', type: 'square', t: 0.05, dur: 0.15, vol: 0.15 }); },
  correct: () => ['C6', 'E6', 'G6', 'C7'].forEach((n, i) => tone({ freq: n, type: 'triangle', t: i * 0.07, dur: 0.12, vol: 0.25 })),
  wrong: () => { tone({ freq: 'E5', type: 'triangle', dur: 0.12, vol: 0.2 }); tone({ freq: 'C5', type: 'triangle', t: 0.12, dur: 0.2, vol: 0.2 }); },
  heal: () => ['C5', 'E5', 'G5', 'B5', 'D6'].forEach((n, i) => tone({ freq: n, type: 'sine', t: i * 0.06, dur: 0.12, vol: 0.2 })),
  upgrade: () => ['C5', 'G5', 'C6', 'G6', 'C7'].forEach((n, i) => tone({ freq: n, type: 'triangle', t: i * 0.06, dur: 0.1, vol: 0.22 })),
  open: () => { noise({ dur: 0.1, vol: 0.2, hp: 1500 }); ['G5', 'B5', 'D6', 'G6'].forEach((n, i) => tone({ freq: n, type: 'square', t: 0.1 + i * 0.07, dur: 0.12, vol: 0.14 })); },
  select: () => { tone({ freq: 'D5', type: 'square', dur: 0.05, vol: 0.15 }); tone({ freq: 'A5', type: 'square', t: 0.05, dur: 0.08, vol: 0.15 }); },
  win: () => [['C5', 0], ['E5', 0.12], ['G5', 0.24], ['C6', 0.36], ['G5', 0.52], ['C6', 0.64]].forEach(([n, t]) => tone({ freq: n, type: 'square', t, dur: t > 0.6 ? 0.4 : 0.1, vol: 0.18 })),
  lose: () => [['G4', 0], ['F4', 0.25], ['E4', 0.5], ['C4', 0.75]].forEach(([n, t]) => tone({ freq: n, type: 'triangle', t, dur: 0.25, vol: 0.25 })),
  boss: () => { tone({ freq: 'C2', type: 'sawtooth', dur: 0.8, vol: 0.25 }); tone({ freq: 'C#2', type: 'sawtooth', t: 0.1, dur: 0.8, vol: 0.2 }); },
  page: () => noise({ dur: 0.08, vol: 0.12, hp: 4000 }),
};
export function sfx(name, arg) {
  if (!ctx || settings.sfx <= 0) return;
  try { SFX[name] && SFX[name](arg); } catch (e) { /* むし */ }
}

// ───── BGM ─────
// きょくは 16ぶおんぷ ずつの ならび。'-' は のばす、'.' は やすみ
const SONGS = {
  title: { bpm: 104, lead: 'square', bars: [
    'E5 . G5 . C6 - B5 . A5 . G5 . E5 - . . | F5 . A5 . D6 - C6 . B5 . G5 . A5 - . . | E5 . G5 . C6 - B5 . A5 . G5 . A5 . B5 . | C6 - - . G5 . E5 . C5 - - - . . . .',
    'C3 . G3 . C3 . G3 . A2 . E3 . A2 . E3 . | F2 . C3 . F2 . C3 . G2 . D3 . G2 . D3 . | C3 . G3 . C3 . G3 . A2 . E3 . A2 . E3 . | F2 . C3 . G2 . D3 . C3 . G3 . C3 - - .'],
    drums: 'k . h . s . h . k . h . s . h h' },
  map: { bpm: 96, lead: 'triangle', bars: [
    'G5 . E5 . C5 . E5 . G5 - A5 . G5 - - . | F5 . D5 . B4 . D5 . F5 - G5 . F5 - - . | E5 . G5 . C6 . B5 . A5 . G5 . F5 . E5 . | D5 - - . E5 . F5 . G5 - - - . . . .',
    'C3 - . . G2 - . . C3 - . . G2 - . . | G2 - . . D3 - . . G2 - . . D3 - . . | A2 - . . E3 - . . F2 - . . C3 - . . | G2 - . . G2 - . . C3 - . . G2 - . .'],
    drums: 'k . . h . . h . k . h . . . h .' },
  battle: { bpm: 138, lead: 'square', bars: [
    'A4 . C5 . E5 . A5 . G5 . E5 . C5 . D5 . | E5 . . . E5 . D5 . C5 . D5 . E5 . . . | F5 . E5 . D5 . C5 . B4 . C5 . D5 . G4 . | A4 . B4 . C5 . D5 . E5 - - - E5 . G#5 .',
    'A2 A2 . A2 A3 . A2 . A2 A2 . A2 G3 . E3 . | C3 C3 . C3 C4 . C3 . G2 G2 . G2 G3 . G2 . | F2 F2 . F2 F3 . F2 . G2 G2 . G2 G3 . G2 . | A2 A2 . A2 A3 . A2 . E2 E2 . E2 E3 . G#2 .'],
    drums: 'k . h . s . h k k . h . s . h h' },
  boss: { bpm: 150, lead: 'sawtooth', bars: [
    'E5 . E5 . D#5 . E5 . G5 . F#5 . E5 . B4 . | C5 . C5 . B4 . C5 . E5 . D5 . C5 . A4 . | B4 . B4 . A#4 . B4 . D5 . C#5 . B4 . F#4 . | G4 . A4 . B4 . C5 . D#5 - - - B4 - - -',
    'E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 | A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 A2 A3 | B2 B3 B2 B3 B2 B3 B2 B3 B2 B3 B2 B3 B2 B3 B2 B3 | E2 E3 E2 E3 E2 E3 E2 E3 B1 B2 B1 B2 B1 B2 B1 B2'],
    drums: 'k . h k s . h . k k h . s . h s' },
  victory: { bpm: 120, lead: 'square', loop: true, bars: [
    'C5 . E5 . G5 . C6 - - . A5 . C6 . F6 - | E6 - - . D6 . C6 . B5 . G5 . C6 - - - | A5 . C6 . F6 - - . E6 . C6 . A5 - - . | B5 . D6 . G6 - - . F6 - E6 - D6 - C6 -',
    'C3 . G3 . C3 . G3 . F2 . C3 . F2 . C3 . | C3 . G3 . E3 . G3 . G2 . D3 . G2 . D3 . | F2 . C3 . F2 . C3 . A2 . E3 . A2 . E3 . | G2 . D3 . G2 . D3 . G2 . B2 . C3 . G2 .'],
    drums: 'k . h . s . h . k . h . s . h .' },
};

function parse(line) { return line.replace(/\|/g, ' ').trim().split(/\s+/); }

export function playBgm(name) {
  if (current && current.name === name) return;
  stopBgm();
  const c = ensure(); if (!c) return;
  const song = SONGS[name]; if (!song) return;
  const lead = parse(song.bars[0]), bass = parse(song.bars[1]), drums = song.drums.split(/\s+/);
  const stepDur = 60 / song.bpm / 4;
  const out = c.createGain(); out.gain.value = 0; out.connect(bgmGain);
  out.gain.linearRampToValueAtTime(1, c.currentTime + 0.8);
  current = { name, out, step: 0, next: c.currentTime + 0.1 };
  const len = Math.max(lead.length, bass.length);
  const noteLen = (arr, i) => { let n = 1; while (arr[(i + n) % arr.length] === '-' && n < 16) n++; return n; };
  timer = setInterval(() => {
    if (!current || !ctx) return;
    while (current.next < ctx.currentTime + 0.25) {
      const i = current.step % len;
      const t = current.next - ctx.currentTime;
      const ln = lead[i % lead.length], bn = bass[i % bass.length], dn = drums[i % drums.length];
      if (ln && NOTE[ln]) tone({ freq: ln, type: song.lead, t, dur: stepDur * noteLen(lead, i % lead.length) * 0.9, vol: song.lead === 'sawtooth' ? 0.1 : 0.14, out: current.out, release: 0.04 });
      if (bn && NOTE[bn]) tone({ freq: bn, type: 'triangle', t, dur: stepDur * noteLen(bass, i % bass.length) * 0.9, vol: 0.32, out: current.out });
      if (dn === 'k') tone({ freq: 120, type: 'sine', t, dur: 0.08, vol: 0.5, slide: 0.35, out: current.out });
      if (dn === 's') noise({ t, dur: 0.1, vol: 0.18, hp: 1200, out: current.out });
      if (dn === 'h') noise({ t, dur: 0.03, vol: 0.07, hp: 6000, out: current.out });
      current.step++;
      current.next += stepDur;
    }
  }, 60);
}
export function stopBgm() {
  if (timer) clearInterval(timer);
  timer = null;
  if (current && ctx) {
    const o = current.out;
    o.gain.cancelScheduledValues(ctx.currentTime);
    o.gain.setValueAtTime(o.gain.value, ctx.currentTime);
    o.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    setTimeout(() => o.disconnect(), 600);
  }
  current = null;
}
