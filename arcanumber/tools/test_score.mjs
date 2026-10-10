import { scoreSpell } from '../js/engine/score.js';
const R = (el, v, extra = {}) => ({ uid: Math.random().toString(36).slice(2), id: 'rune', el, v, ...extra });
const C = (id, up = false) => ({ uid: Math.random().toString(36).slice(2), id, up });
const show = (name, slots, extra = {}) => {
  const c = scoreSpell({ slots, board: [], arcana: [], handLv: {}, turn: 1, coins: 12, ...extra });
  console.log(name.padEnd(28), c.hand.best.padEnd(10), `${c.power} × ${c.mult} = ${c.total}`, 'shield', c.shield, '|', c.steps.map((s) => s.kind + (s.n ?? '')).join(' '));
};
show('pair+focus', [R('fire', 3), R('fire', 3), R('thunder', 5), C('focus'), null]);
show('order +mult then x2', [R('fire', 5), R('fire', 5), C('focus'), C('inferno'), null]);
show('order x2 then +mult', [R('fire', 5), R('fire', 5), C('inferno'), C('focus'), null]);
show('kuku', [R('water', 2), R('wood', 4), R('water', 8), C('guard'), null]);
show('chain retrig', [C('chain'), R('thunder', 7), R('thunder', 3), null, null]);
show('clone rune', [R('shadow', 4), C('clone'), R('shadow', 4), null, null]);
show('arcana sigil+pair', [R('fire', 2), R('fire', 2), R('fire', 6), null, null], { arcana: [{ uid: 'a', id: 'sigil_fire' }, { uid: 'b', id: 'pairCharm' }] });
show('half rule', [R('fire', 9), R('fire', 1), null, null, null], { rule: 'halfPower' });
show('evenOnly', [R('fire', 3), R('fire', 4), R('fire', 4), null, null], { rule: 'evenOnly' });
show('board altar', [R('fire', 3), R('fire', 4), R('fire', 5), null, null], { board: [{ uid: 'x', id: 'fireAltar' }] });
show('waterShield', [R('water', 6), R('water', 4), C('waterShield'), null, null]);
show('glass+foil', [R('fire', 3, { enh: 'glass' }), R('fire', 5, { enh: 'foil' }), null, null, null]);
