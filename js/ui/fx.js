// えんしゅつ（すうじが とぶ・ゆれる・きらきら）
import { el, sleep } from '../util.js';
import { settings } from '../save.js';

let stage = null, layer = null;
export function initFx(st) { stage = st; }
export function fxLayer() {
  if (!layer || !layer.isConnected) { layer = el('<div class="fx-layer"></div>'); stage.appendChild(layer); }
  return layer;
}
export function speed() { return settings.speed === 'turbo' ? 0.08 : settings.speed === 'fast' ? 0.55 : 1; }
export const wait = (ms) => sleep(ms * speed());

// ステージの なかの ざひょう
export function posOf(node, ax = 0.5, ay = 0.5) {
  const sr = stage.getBoundingClientRect();
  const r = node.getBoundingClientRect();
  const sc = sr.width / stage.offsetWidth;
  return { x: (r.left - sr.left + r.width * ax) / sc, y: (r.top - sr.top + r.height * ay) / sc };
}

export function floatText(x, y, text, cls = '') {
  const n = el(`<div class="float-num ${cls}" style="left:${x}px;top:${y}px">${text}</div>`);
  fxLayer().appendChild(n);
  setTimeout(() => n.remove(), 1200);
}
export function bigWord(text, color) {
  const n = el(`<div class="big-word">${text}</div>`);
  if (color) n.style.color = color;
  fxLayer().appendChild(n);
  setTimeout(() => n.remove(), 1300);
}
export function burst(x, y, { n = 14, colors = ['#ffe14d', '#ff5fa2', '#5ac8ff', '#7be07b'], stars = false, dist = 120 } = {}) {
  const L = fxLayer();
  for (let i = 0; i < n; i++) {
    const p = el(stars ? `<div class="particle star">${['⭐', '✨', '🌟'][i % 3]}</div>` : '<div class="particle"></div>');
    if (!stars) p.style.background = colors[i % colors.length];
    p.style.left = x + 'px'; p.style.top = y + 'px';
    L.appendChild(p);
    const a = Math.random() * Math.PI * 2, d = dist * (0.5 + Math.random() * 0.7);
    p.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d - 30}px) scale(.3)`, opacity: 0 },
    ], { duration: 700 + Math.random() * 300, easing: 'cubic-bezier(.2,.8,.4,1)', fill: 'forwards' });
    setTimeout(() => p.remove(), 1100);
  }
}
export function confetti() {
  const L = fxLayer();
  const W = stage.offsetWidth;
  for (let i = 0; i < 80; i++) {
    const p = el('<div class="particle"></div>');
    p.style.background = ['#ffe14d', '#ff5fa2', '#5ac8ff', '#7be07b', '#b48aff', '#ff7a45'][i % 6];
    p.style.borderRadius = i % 2 ? '3px' : '50%';
    p.style.left = Math.random() * W + 'px'; p.style.top = '-20px';
    L.appendChild(p);
    p.animate([
      { transform: 'translate(0,0) rotate(0)', opacity: 1 },
      { transform: `translate(${(Math.random() - 0.5) * 200}px, ${700 + Math.random() * 300}px) rotate(${Math.random() * 720}deg)`, opacity: 0.8 },
    ], { duration: 1800 + Math.random() * 1400, delay: Math.random() * 600, easing: 'cubic-bezier(.3,.6,.6,1)', fill: 'forwards' });
    setTimeout(() => p.remove(), 4000);
  }
}
export async function projectile(from, to, { dur = 380, cls = '' } = {}) {
  const p = el(`<div class="projectile ${cls}"></div>`);
  p.style.left = from.x + 'px'; p.style.top = from.y + 'px';
  fxLayer().appendChild(p);
  const midY = Math.min(from.y, to.y) - 80;
  const a = p.animate([
    { transform: 'translate(0,0) scale(.6)' },
    { transform: `translate(${(to.x - from.x) / 2}px, ${midY - from.y}px) scale(1.1)`, offset: 0.5 },
    { transform: `translate(${to.x - from.x}px, ${to.y - from.y}px) scale(1)` },
  ], { duration: dur * speed(), easing: 'ease-in' });
  await a.finished.catch(() => {});
  p.remove();
}
export function shake(node) { node.classList.remove('shake'); void node.offsetWidth; node.classList.add('shake'); setTimeout(() => node.classList.remove('shake'), 400); }
export function flashScreen(color = '#fff') {
  const f = el(`<div class="flash-screen" style="background:${color}"></div>`);
  stage.appendChild(f); setTimeout(() => f.remove(), 450);
}
export function retrigger(node, cls, ms = 500) { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); setTimeout(() => node.classList.remove(cls), ms); }

export function toast(html, icon = '✨', ms = 2600) {
  const t = el(`<div class="toast"><span class="t-icon">${icon}</span><span>${html}</span></div>`);
  stage.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, ms);
}
