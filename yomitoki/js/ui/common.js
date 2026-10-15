// がめんの どうぐ：モーダル・トースト・テンキー・ぶんの ひょうじ
import { el, $ } from '../util.js';
import { countWord } from '../data/problems.js';
import { sfx } from '../audio.js';

let stage = null;
export function initCommon(s) { stage = s; }

export function openModal(html, { onClose } = {}) {
  const back = el(`<div class="modal-back"><div class="modal fade-in">${html}</div></div>`);
  stage.appendChild(back);
  const close = () => { back.remove(); onClose && onClose(); };
  return { node: back, box: $('.modal', back), close };
}
export function confirmBox(msg, yes = 'はい', no = 'やめる') {
  return new Promise((res) => {
    const m = openModal(`<p style="font-size:24px;text-align:center">${msg}</p><div class="acts"><button class="btn white" data-no>${no}</button><button class="btn" data-yes>${yes}</button></div>`);
    $('[data-no]', m.node).onclick = () => { m.close(); res(false); };
    $('[data-yes]', m.node).onclick = () => { m.close(); res(true); };
  });
}
export function toast(msg, ms = 1800) {
  const t = el(`<div class="toast">${msg}</div>`);
  stage.appendChild(t);
  setTimeout(() => t.remove(), ms);
}
export function confetti() {
  const box = el('<div class="confetti"></div>');
  const colors = ['#f08a1c', '#3d8bf2', '#3bb26b', '#ffd84a', '#e2513f', '#b07cf0'];
  for (let i = 0; i < 70; i++) {
    const c = document.createElement('i');
    c.style.left = Math.random() * 100 + '%';
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = 1.6 + Math.random() * 1.6 + 's';
    c.style.animationDelay = Math.random() * 0.5 + 's';
    box.appendChild(c);
  }
  stage.appendChild(box);
  setTimeout(() => box.remove(), 3800);
  return box;
}
export function starsHtml(n, max = 3) {
  return Array.from({ length: max }, (_, i) => `<span class="${i < n ? '' : 'off'}">⭐</span>`).join('');
}

// テンキー：onKey('0'〜'9' | 'del' | 'ok')
export function keypad(onKey, { ok = false, cols = 5 } = {}) {
  const keys = cols === 3 ? ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'del', '0', ...(ok ? ['ok'] : [])] : ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'del'];
  const k = el(`<div class="keypad">${keys.map((x) => `<button data-k="${x}" class="${x === 'del' ? 'del' : ''}">${x === 'del' ? 'けす' : x === 'ok' ? 'OK' : x}</button>`).join('')}</div>`);
  if (cols !== 3) k.lastElementChild.style.gridColumn = 'span 5';
  k.addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) { sfx('tap'); onKey(b.dataset.k); } });
  return k;
}
// キーボード（パソコンで ためす とき）
export function onKeys(fn) {
  const h = (e) => {
    if (/^[0-9]$/.test(e.key)) fn(e.key);
    else if (e.key === 'Backspace') fn('del');
    else if (e.key === 'Enter') fn('ok');
  };
  document.addEventListener('keydown', h);
  return () => document.removeEventListener('keydown', h);
}

// もんだいの ぶんを HTML に する（かずは タッチ できる チップ）
export function tokenText(p, i) { const t = p.tokens[i]; const w = countWord(t.subj, t.v); return { num: w.num, suf: w.suf }; }
export function sentenceHtml(p, s, si) {
  let text = s.text.replace(/#(\d+)/g, (_, i) => {
    const w = tokenText(p, +i);
    const isWord = !/^\d+$/.test(w.num);
    return `<span class="chip${isWord ? ' word' : ''}" data-t="${i}">${w.num}</span>${w.suf}`;
  });
  return `<p class="sent${s.role === 'question' ? ' q' : ''}" data-s="${si}">${text}</p>`;
}
// よみあげ よう（「5ひき」の まま よむ）
export function sentencePlain(p, s) {
  return s.text.replace(/#(\d+)/g, (_, i) => { const w = tokenText(p, +i); return w.num + w.suf; });
}
// ぶんの なかの ことばに せんを ひく
export function markWord(sentNode, word) {
  if (!word || !sentNode) return;
  const walker = document.createTreeWalker(sentNode, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const i = n.data.indexOf(word);
    if (i >= 0) {
      const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + word.length);
      const m = document.createElement('mark'); m.className = 'w'; r.surroundContents(m);
      return;
    }
  }
}
export function clearMarks(root) {
  root.querySelectorAll('mark.w').forEach((m) => { m.replaceWith(document.createTextNode(m.textContent)); });
  root.querySelectorAll('.sent').forEach((s) => s.normalize());
  root.querySelectorAll('.sent.hl').forEach((s) => s.classList.remove('hl'));
  root.querySelectorAll('.chip.flag').forEach((s) => s.classList.remove('flag'));
}
