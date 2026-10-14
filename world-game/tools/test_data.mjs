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

console.log(fail ? `${fail} 件の問題` : 'すべて OK');
process.exit(fail ? 1 : 0);
