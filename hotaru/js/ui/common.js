// がめんの きょうつう ぶひん（モーダル・おしらせ）
import { T } from '../../../js/text.js';
import { el, $ } from '../../../js/util.js';
import { sfx } from '../../../js/audio.js';

let stage = null;
export function initCommon(s) { stage = s; }
export const modalOpen = () => !!$('.modal-back', stage);

export function openModal(html, { cls = '', onClose = null, closable = true } = {}) {
  const back = el(`<div class="modal-back"><div class="modal ${cls}">${closable ? '<button class="x" data-x aria-label="とじる">✕</button>' : ''}${html}</div></div>`);
  const m = $('.modal', back);
  const close = () => { back.remove(); onClose && onClose(); };
  $('[data-x]', back)?.addEventListener('click', () => { sfx('tap'); close(); });
  if (closable) back.addEventListener('pointerdown', (e) => { if (e.target === back) close(); });
  stage.append(back);
  return { m, close, back };
}
export function alertBox(html, ok = 'OK', cls = '') {
  return new Promise((res) => {
    const { m, close } = openModal(`${html}<div class="row"><button class="btn" data-ok>${T(ok)}</button></div>`, { cls: 'center ' + cls, closable: false });
    $('[data-ok]', m).addEventListener('click', () => { sfx('tap'); close(); res(); });
  });
}
export function confirmBox(html, yes = 'はい', no = 'いいえ') {
  return new Promise((res) => {
    const { m, close } = openModal(`${html}<div class="row"><button class="btn gray" data-no>${T(no)}</button><button class="btn" data-ok>${T(yes)}</button></div>`, { cls: 'center', closable: false });
    $('[data-ok]', m).addEventListener('click', () => { sfx('tap'); close(); res(true); });
    $('[data-no]', m).addEventListener('click', () => { sfx('tap'); close(); res(false); });
  });
}
export function toast(html, ms = 1800) {
  const t = el(`<div class="toast">${html}</div>`);
  stage.querySelectorAll('.toast').forEach((x) => x.remove()); // かさならない ように
  stage.append(t);
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => t.remove(), ms + 400);
}
