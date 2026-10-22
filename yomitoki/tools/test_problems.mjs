// もんだいの しくみの チェック：node tools/test_problems.mjs
import { gen, KIND_IDS, KINDS, checkExpr, exprText, countWord } from '../js/data/problems.js';
let n = 0, bad = 0;
const fail = (msg, p) => { bad++; if (bad < 15) console.log('NG', msg, JSON.stringify(p && { kind: p.kind, seed: p.seed, s: p.sentences.map((x) => x.text) })); };
for (const kind of KIND_IDS) {
  for (let seed = 1; seed <= 400; seed++) {
    const p = gen(kind, seed * 7919 + kind.length);
    n++;
    // せいかいの しきは とおる
    if (!checkExpr(p, p.expr).ok) fail('せいかいが とおらない', p);
    // こたえは 0より おおきく 20いか
    if (!(p.answer >= 1 && p.answer <= 20)) fail('こたえが はんいがい ' + p.answer, p);
    // ぶんの なかの # は ぜんぶ トークンに なっている
    const ids = p.sentences.flatMap((s) => [...s.text.matchAll(/#(\d+)/g)].map((m) => +m[1]));
    if (ids.length !== p.tokens.length) fail('トークンの かずが あわない', p);
    if (!p.ask.options[p.ask.correct] || p.ask.options.length < 2) fail('ききかたの せんたくし', p);
    if (!p.units.includes(p.unit)) fail('たんい', p);
    // きごうを ぎゃくに すると とおらない
    if (p.expr.length >= 2) {
      const flip = p.expr.map((e, i) => (i === p.expr.length - 1 ? { ...e, sign: -e.sign } : e));
      if (checkExpr(p, flip).ok) fail('きごう ぎゃくでも とおる', p);
      const r = checkExpr(p, flip);
      if (r.cat !== 'op' && r.cat !== 'order') fail('きごう ぎゃくの しんだん ' + r.cat, p);
    }
    // いらない かずを つかうと extra
    if (p.extraTok >= 0) { const r = checkExpr(p, [...p.expr, { t: p.extraTok, sign: 1 }]); if (r.cat !== 'extra') fail('extra しんだん', p); }
    // かずが たりないと missing
    if (p.expr.length >= 3) { const r = checkExpr(p, p.expr.slice(0, 2)); if (r.cat !== 'missing') fail('missing しんだん ' + r.cat, p); }
  }
}
// たしざんは じゅんばんを かえても よい
const p = gen('zoka', 5);
if (!checkExpr(p, [{ t: p.expr[1].t, sign: 1 }, { t: p.expr[0].t, sign: 1 }]).ok) fail('たしざんの いれかえ', p);
// かぞえかた
const cw = (s, v) => { const w = countWord(s, v); return w.num + w.suf; };
const want = [['mouse', 1, '1ぴき'], ['mouse', 3, '3びき'], ['mouse', 10, '10ぴき'], ['mouse', 5, '5ひき'], ['pencil', 3, '3ぼん'], ['pencil', 6, '6ぽん'], ['kid', 1, 'ひとり'], ['kid', 2, 'ふたり'], ['kid', 4, '4にん']];
for (const [s, v, w] of want) if (cw(s, v) !== w) fail(`かぞえかた ${s} ${v} → ${cw(s, v)}`);
// どれだけ ちがう ぶんが でるか（かずを ふせて かぞえる）
const plain = (q) => q.sentences.map((s) => s.text.replace(/#\d+/g, '□')).join(' ');
for (const kind of KIND_IDS) {
  const set = new Set();
  for (let seed = 1; seed <= 2000; seed++) set.add(plain(gen(kind, seed)));
  console.log(`  ${kind}: ぶんの かたち ${set.size} とおり`);
  if (set.size < 20) fail(`${kind} の バリエーションが すくない`);
}
// みほん
for (const kind of KIND_IDS) { const q = gen(kind, 42); console.log(`[${KINDS[kind].level}] ${kind}:`, q.sentences.map((s) => s.text.replace(/#(\d+)/g, (_, i) => { const w = countWord(q.tokens[i].subj, q.tokens[i].v); return w.num + w.suf; })).join(' '), '→', exprText(q), '=', q.answer + q.unit); }
console.log(bad ? `NG ${bad} / ${n}` : `OK ${n} もん`);
process.exit(bad ? 1 : 0);
