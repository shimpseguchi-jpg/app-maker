// カードの みため
import { CARDS, CATS } from '../data/cards.js';
import { T, P } from '../text.js';
import { shapeSvg, diceSvg } from './art.js';
import { el } from '../util.js';

export function faceHtml(card, inst) {
  const f = card.face;
  if (f === 'dice') {
    const r = inst && inst.roll;
    if (r && r.length > 1) return `<div style="display:flex;gap:2px">${diceSvg(r[0]).replace('<svg', '<svg style="width:44px;height:44px"')}${diceSvg(r[1]).replace('<svg', '<svg style="width:44px;height:44px"')}</div>`;
    return diceSvg(r ? r[0] : 0);
  }
  if (f.startsWith('shape:')) return shapeSvg(f.slice(6));
  // すうじ・きごう か えもじ か
  if (/^[+−×÷→n½❓]/u.test(f)) {
    const len = [...f].length;
    return `<span class="sym ${len >= 4 ? 'small' : len === 3 ? 'mid' : ''}">${f}</span>`;
  }
  return `<span class="emo">${f}</span>`;
}

export function cardHtml(inst, opts = {}) {
  const card = CARDS[inst.id];
  const up = !!inst.up;
  const name = card.name + (up ? '＋' : '');
  const plain = P(name);
  const nameCls = plain.length >= 9 ? 'xlong' : plain.length >= 6 ? 'long' : '';
  const color = CATS[card.cat].color;
  const ex = card.exhaust && card.exhaust(up) ? '<span class="c-exh" title="1かいきり">🔥</span>' : '';
  const classes = ['card', `cat-${card.cat}`, `rar-${card.rar}`, up ? 'up' : '', card.unplayable ? 'unplayable' : '', opts.cls || ''].join(' ');
  return `<div class="${classes}" style="--c:${color}" data-uid="${inst.uid || ''}" data-id="${inst.id}">
    <div class="c-name ${nameCls}"><span>${T(name)}</span></div>
    <div class="c-art">${faceHtml(card, inst)}</div>
    <div class="c-text"><span>${T(card.text(up))}</span></div>
    ${ex}<div class="c-gem"></div>
  </div>`;
}
export function cardEl(inst, opts) { return el(cardHtml(inst, opts)); }
