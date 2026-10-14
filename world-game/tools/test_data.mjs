// データとルールの整合チェック：node tools/test_data.mjs
import { POLICIES, POLICY_LIST, BASE } from '../js/data/policies.js';
import { EVENTS, EVENT_BY_ID } from '../js/data/events.js';
import { MAJORS, BACKS } from '../js/data/countries.js';
import { SHAPES, CENTERS } from '../js/data/mapdata.js';
import { GM } from '../js/data/gm.js';
import { drawWorld, newGame } from '../js/engine/game.js';
import { neighbors } from '../js/engine/core.js';
import { SPARKS } from '../js/engine/sparks.js';

let fail = 0;
const ok = (cond, msg) => { if (!cond) { fail++; console.log('NG:', msg); } };
const FX = /^(\w+)\.(\w+)([+-])([sml]|\d+(?:\.\d+)?)$|^(flag|unflag|boost|law|mylaw|unmylaw):\w+$|^(ally|nuke\+)$/;

ok(POLICY_LIST.length === 90, `政策は90種（${POLICY_LIST.length}）`);
ok(EVENTS.length === 149, `イベントは149種（${EVENTS.length}）`);
ok(new Set(EVENTS.map((e) => e.id)).size === EVENTS.length && new Set(POLICY_LIST.map((p) => p.id)).size === POLICY_LIST.length, 'ID の重複なし');
for (const t of Object.values(SPARKS)) for (const id of Object.keys(t.fx)) ok(POLICIES[id], `火種 ${t.name} の対応策 ${id}`);
for (const t of Object.values(SPARKS)) { ok(Object.values(t.fx).some((d) => d < 0), `火種 ${t.name} に正しい支援がある`); }
ok(MAJORS.length === 16 && BACKS.length === 30, '国は主要国16＋背景国30');
for (const p of POLICY_LIST) for (const f of [...p.ok, ...p.ng, ...(p.after?.ok || [])]) ok(FX.test(f), `${p.id} の効果 ${f}`);
for (const p of POLICY_LIST) for (const f of p.ok.filter((x) => x.startsWith('boost:'))) ok(EVENT_BY_ID[f.slice(6)], `${p.id} の boost 先 ${f}`);
for (const b of Object.values(BASE)) for (const id of b.bonus) ok(POLICIES[id], `基本政策のボーナス ${id}`);
for (const e of EVENTS) {
  for (const id of e.ins || []) ok(POLICIES[id], `${e.id} の差し込み ${id}`);
  for (const id of e.next || []) ok(EVENT_BY_ID[id], `${e.id} の連鎖先 ${id}`);
  for (const f of e.fx || []) ok(FX.test(f), `${e.id} の効果 ${f}`);
}
for (const c of [...MAJORS, ...BACKS]) { ok(SHAPES[c.id], `${c.id} の地図`); ok(CENTERS[c.id], `${c.id} の位置`); ok(neighbors(c.id).length > 0, `${c.id} の隣国`); }
for (const [k, v] of Object.entries(GM)) ok(v.lines.length > 0, `GM ${k}`);

// 抽選のルール（MAP.md 4 章）
const OIL = ['M01', 'M02', 'M07', 'M08', 'M09'], POLAR = ['M01', 'M06', 'M07', 'M03', 'M10', 'M16'];
for (let i = 0; i < 500; i++) {
  const d = drawWorld('T' + i);
  const reg = {};
  for (const id of d.seats) { const r = MAJORS.find((m) => m.id === id).region; reg[r] = (reg[r] || 0) + 1; }
  ok(d.seats.length === 6 && new Set(d.seats).size === 6, `抽選 ${i}：6カ国`);
  ok(Object.keys(reg).length >= 3 && Object.values(reg).every((n) => n <= 2), `抽選 ${i}：地域のばらつき`);
  ok(d.seats.some((id) => OIL.includes(id)), `抽選 ${i}：石油`);
  ok(d.seats.some((id) => POLAR.includes(id)), `抽選 ${i}：極地`);
  ok(d.seats.includes(d.player), `抽選 ${i}：自国`);
}
// 同じシード値なら同じ組み合わせ
const a = drawWorld('SAME42'), b = drawWorld('SAME42');
ok(JSON.stringify(a) === JSON.stringify(b), 'シード値の再現性');
const g = newGame('SAME42');
ok(Object.keys(g.majors).length === 6 && Object.keys(g.backs).length === 40, '席6・背景国40');

// 1ねんせいモードの ことばは ひらがなで かき、ひょうじの ときに カタカナ・1年生の かん字へ おきかえる
const KID = await import('../js/data/kid.js');
const walk = (v, path) => { if (typeof v === 'string') { if (/[一-龯々ァ-ヺ]/.test(v)) ok(false, `1ねんせい ${path}: ${v}`); } else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`); };
for (const k of ['KID_STATS', 'KID_FX_NAME', 'KID_COUNTRY', 'KID_PERSONA', 'KID_CATS', 'KID_STAGES', 'KID_AGENDAS', 'KID_ENDINGS', 'KID_TIERS', 'KID_BASE', 'KID_SPARK', 'KID_POLICY', 'KID_EVENT', 'KID_GM_NAME', 'KID_GM', 'KID_AI_LINES']) walk(KID[k], k);
for (const v of Object.values(KID.KID_MOD)) walk(v, 'KID_MOD');
for (const p of POLICY_LIST) ok(KID.KID_POLICY[p.id], `1ねんせいの せいさく ${p.id}`);
for (const e of EVENTS) ok(KID.KID_EVENT[e.id], `1ねんせいの できごと ${e.id}`);
for (const k of Object.keys(GM)) ok(KID.KID_GM[k], `1ねんせいの せりふ ${k}`);
for (const k of Object.keys(SPARKS)) ok(KID.KID_SPARK[k], `1ねんせいの ひだね ${k}`);

const { kidify, KIDIFY_DICT, GRADE1_KANJI } = await import('../js/ui/kidify.js');
for (const [k, v] of Object.entries(KIDIFY_DICT)) for (const ch of v.match(/[一-龯々]/g) || []) ok(GRADE1_KANJI.includes(ch), `1年生で ならわない かん字 ${ch}（${k}）`);
const expect = { 'すてらの くに': 'ステラの くに', 'みったーまいやー': 'ミッターマイヤー', 'おおきな ひとが みずを のむ': '大きな 人が 水を のむ', 'ひとつの くに': '一つの くに', '2031ねん': '2031年', 'みずうみが ひあがった': 'みずうみが ひあがった', 'ほしを そらす': 'ほしを そらす', 'まちがえたり': 'まちがえたり', 'でめが 3': '出目が 3', 'にゅーすの かーど': 'ニュースの カード' };
for (const [a, b] of Object.entries(expect)) ok(kidify(a) === b, `kidify「${a}」→「${kidify(a)}」（よそう「${b}」）`);
for (const k of ['KID_COUNTRY', 'KID_POLICY', 'KID_EVENT', 'KID_GM', 'KID_SPARK']) { const w = (v) => { if (typeof v === 'string') { for (const ch of kidify(v).match(/[一-龯々]/g) || []) ok(GRADE1_KANJI.includes(ch), `${k}: ${kidify(v)}`); } else if (v && typeof v === 'object') Object.values(v).forEach(w); }; w(KID[k]); }

// ニュースへの反応：ニュースの種類ごとに左右2つ、効果の書き方が正しいか
const { REACTIONS, NEWS_ICON, NEWS_CAT } = await import('../js/data/reactions.js');
for (const e of EVENTS) ok(NEWS_ICON[e.cat] && NEWS_CAT[e.cat], `ニュースの種類 ${e.id} ${e.cat}`);
for (const [k, pair] of Object.entries(REACTIONS)) {
  ok(pair.length === 2, `反応 ${k} は2つ`);
  for (const o of pair) { const kt = KID.kidFx(o.fx).join(' '); ok(/↑/.test(kt) && /↓/.test(kt), `反応 ${k}「${o.k}」は 1ねんせいの ひょうじでも とくと そんが ある：${kt}`); ok(o.n && o.k && !/[一-龯々ァ-ヺ]/.test(o.k), `反応 ${k} の名前`); for (const f of o.fx) ok(/^(self|who|world|poorBg|rel)\.\w+[+-][sml]$/.test(f), `反応 ${k} の効果 ${f}`); }
}

// 補佐官のせりふ：おとな・1ねんせいがそろっているか、1ねんせいは ひらがなで かいて あるか
const SEC = await import('../js/data/secretary.js');
for (const tbl of ['SEC_REACT', 'SEC_DANGER', 'SEC_MOOD']) for (const [k, v] of Object.entries(SEC[tbl])) ok(v.length === 2 && v[0] && v[1] && !/[一-龯々ァ-ヺ]/.test(v[1]), `補佐官 ${tbl}.${k}`);
for (const [k, list] of Object.entries(SEC.SEC_POP)) for (const v of list) ok(v[0] && v[1] && !/[一-龯々ァ-ヺ]/.test(v[1]), `補佐官 SEC_POP.${k}`);
for (const k of SEC.SEC_DANGER_ORDER) ok(SEC.SEC_DANGER[k], `補佐官 注意 ${k}`);
for (const pair of Object.values(REACTIONS)) for (const o of pair) ok(Number.isInteger(o.pop), `反応「${o.n}」に国民の気持ち（pop）`);
// 世界議会の議題
const { AGENDAS: AG } = await import('../js/data/agendas.js');
const cats = new Set(EVENTS.map((e) => e.cat));
for (const [k, a] of Object.entries(AG)) {
  ok(a.name && a.kid && !/[一-龯々ァ-ヺ]/.test(a.kid) && a.who?.length === 2 && typeof a.lose === 'function' && typeof a.gain === 'function', `議題 ${k}`);
  ok(a.cats.every((c) => cats.has(c)), `議題 ${k} のニュースの種類`);
}
const gv = newGame('VOTE1');
for (let y = 0; y < 30; y++) gv.fired['E' + String(y + 1).padStart(2, '0')] = y;
gv.year = 30;
const ao = (await import('../js/engine/game.js')).agendaOptions(gv);
ok(ao.options.length === 3 && new Set(ao.options).size === 3, '議題の候補は3つ（重なりなし）');

console.log(fail ? `${fail} 件の問題` : 'すべて OK');
process.exit(fail ? 1 : 0);
