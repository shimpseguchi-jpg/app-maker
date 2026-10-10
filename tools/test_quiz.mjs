import { QUIZ } from '../js/data/events.js';
import { makeRng } from '../js/util.js';
const rng = makeRng(42);
for (const g of [1, 2, 3]) for (const k of Object.keys(QUIZ)) for (let i = 0; i < 40; i++) {
  const q = QUIZ[k](g, rng);
  if (q.answer === undefined || q.answer === null || (typeof q.answer === 'number' && (isNaN(q.answer) || q.answer < 0))) throw new Error(k + g + JSON.stringify(q));
  if (q.choices && !q.choices.includes(q.answer)) throw new Error('choices ' + k + g + JSON.stringify(q));
  if (q.choices && new Set(q.choices).size !== q.choices.length) throw new Error('dup ' + JSON.stringify(q));
  if (i === 0) console.log(g, k, q.q, '=>', q.answer, q.choices || '');
}
console.log('ok');
