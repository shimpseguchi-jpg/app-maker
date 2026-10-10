// カードの みため
import { CARDS, ELEMENTS, TYPE_NAME, ENH, cardCost } from '../data/cards.js';
import { T, P } from '../text.js';
import { el } from '../util.js';

function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function mix(a, b, t) { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v * (1 - t) + B[i] * t)).join(',')})`; }
export function rgba(a, al) { const A = hex(a); return `rgba(${A.join(',')},${al})`; }
export function elVars(elId) {
  const E = ELEMENTS[elId] || ELEMENTS.none;
  return `--c:${E.color};--cd:${E.dark};--cb:${mix(E.color, '#000000', 0.3)};--cn:${mix(E.color, '#000000', 0.45)};--cg:${rgba(E.color, 0.4)};--cr:${mix(E.color, '#1f1a2e', 0.78)}`;
}

export function runeText(inst) {
  const parts = [`{力|ちから} +${inst.v}`];
  if (inst.up) parts.push('{倍率|ばいりつ} +1');
  if (inst.enh) parts.push(ENH[inst.enh].text);
  return parts.join('、');
}

export function cardHtml(inst, opts = {}) {
  const c = CARDS[inst.id];
  if (!c) return '';
  const cls = ['card', `t-${c.type}`, `rar-${c.rar}`, inst.up ? 'up' : '', c.unplayable ? 'unplayable' : '', opts.cls || ''];
  if (c.type === 'rune') {
    const E = ELEMENTS[inst.el];
    cls.push('rune'); if (inst.enh === 'wild') cls.push('wild');
    return `<div class="${cls.join(' ')}" style="${elVars(inst.el)}" data-uid="${inst.uid || ''}" data-id="rune">
      <div class="r-corner tl">${inst.v}<small>${E.icon}</small></div>
      <div class="r-num">${inst.v}</div>
      <div class="r-el">${T(E.name)}</div>
      ${inst.enh ? `<div class="r-enh">${ENH[inst.enh].icon}</div>` : ''}
      ${inst.up ? '<div class="r-up">＋</div>' : ''}
      <div class="r-corner br">${inst.v}<small>${E.icon}</small></div>
    </div>`;
  }
  const name = c.name + (inst.up ? '＋' : '');
  const long = P(name).length >= 7;
  const cost = c.type === 'curse' ? '' : `<div class="c-cost ${cardCost(inst) === 0 ? 'free' : ''}">${cardCost(inst)}</div>`;
  return `<div class="${cls.join(' ')}" style="${elVars(c.el)}" data-uid="${inst.uid || ''}" data-id="${inst.id}">
    ${cost}
    <div class="c-name ${long ? 'long' : ''}"><span>${T(name)}</span></div>
    <div class="c-art"><span>${c.icon}</span></div>
    <div class="c-type">${T(TYPE_NAME[c.type])}</div>
    <div class="c-text"><span>${T(c.text(!!inst.up))}</span></div>
    <div class="c-gem"></div>
  </div>`;
}
export function cardEl(inst, opts) { return el(cardHtml(inst, opts)); }
