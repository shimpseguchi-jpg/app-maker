// きょうの ちょうせん：ひづけの ルールと GAS の ランキング（Code.gs）の テスト
import { readFileSync } from 'fs';
import vm from 'vm';
import { todayJST, shiftDate, dailyMods, dailySeed, hashStr, nameCandidates, newTag } from '../js/engine/daily.js';
import { MODS } from '../js/data/mods.js';
import { makeRng } from '../js/util.js';

let fail = 0;
const ok = (c, msg) => { if (!c) { fail++; console.log('NG', msg); } else console.log('ok', msg); };

// ── ひづけ ──
ok(todayJST(Date.UTC(2026, 9, 13, 14, 59)) === '2026-10-13' && todayJST(Date.UTC(2026, 9, 13, 15, 0)) === '2026-10-14', 'にほんの 0じで ひづけが かわる');
ok(shiftDate('2026-03-01', -1) === '2026-02-28' && shiftDate('2026-12-31', 1) === '2027-01-01', 'ひづけの けいさん');
ok(JSON.stringify(dailyMods('2026-10-13')) === JSON.stringify(dailyMods('2026-10-13')) && dailySeed('2026-10-13') === dailySeed('2026-10-13'), 'おなじ ひは おなじ ルール・おなじ たね');
const days = Array.from({ length: 60 }, (_, i) => shiftDate('2026-10-01', i));
ok(new Set(days.map((d) => dailyMods(d).join())).size >= 55, 'ひが かわると ルールも かわる');
ok(days.every((d) => { const m = dailyMods(d); return m.length === 3 && m.every((id) => MODS[id]) && m.filter((id) => MODS[id].group === 'start').length <= 1; }), 'まいにち 3つ・はじまりルールは 1つまで');
ok(hashStr('a') !== hashStr('b'), 'hash');
const R = await import('../js/engine/run.js');
const mk = () => R.newRun({ hero: 1, grade: 2, diff: 'normal', seed: dailySeed('2026-10-13'), mode: 'random', mods: dailyMods('2026-10-13') });
ok(JSON.stringify(mk().map) === JSON.stringify(mk().map), 'おなじ ひ・おなじ しゅじんこうなら おなじ マップ');
const { dailyHero, dailyPackTypes, dailyPackRng } = await import('../js/engine/daily.js');
const { openPack, PACK_TYPES } = await import('../js/data/packs.js');
const { HEROES } = await import('../js/data/heroes.js');
ok(days.every((d) => dailyHero(d) === dailyHero(d) && dailyHero(d) >= 0 && dailyHero(d) < 3) && new Set(days.map(dailyHero)).size === 3, 'しゅじんこうは ひづけで きまる（3にん とも でる）');
ok(days.every((d) => { const t = dailyPackTypes(d), els = HEROES[dailyHero(d)].els; return t.length === 3 && t[0] === els[0] && t[1] === els[1] && PACK_TYPES.includes(t[2]); }), 'パックは しゅじんこうの ぞくせい 2つ＋もう 1つ');
const contents = (d) => { const rr = dailyPackRng(d); return dailyPackTypes(d).flatMap((t) => openPack(t, rr)).map((c) => `${c.id}:${c.el || ''}${c.v || ''}${c.enh || ''}`).join(','); };
ok(contents('2026-10-13') === contents('2026-10-13') && contents('2026-10-13') !== contents('2026-10-14'), 'パックの なかみも おなじ ひは おなじ');
const r = makeRng(1); ok(nameCandidates(r).length === 3 && /^[0-9a-z]{4}$/.test(newTag(r)), 'なまえと ばんごう');

// ── GAS の サーバー（Code.gs）を にせものの Google で うごかす ──
function gasSandbox(nowRef) {
  const store = new Map();
  const props = { getProperty: (k) => (store.has(k) ? store.get(k) : null), setProperty: (k, v) => { if (Buffer.byteLength(String(v)) > 9000) throw new Error('too big ' + k); store.set(k, String(v)); }, deleteProperty: (k) => store.delete(k), getKeys: () => [...store.keys()] };
  const ctx = {
    PropertiesService: { getScriptProperties: () => props },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Utilities: { formatDate: (d) => todayJST(d.getTime()) },
    Date: class extends Date { constructor(...a) { if (a.length) super(...a); else super(nowRef.t); } static now() { return nowRef.t; } },
    Math, JSON, String, Number, Error,
  };
  vm.createContext(ctx);
  vm.runInContext(readFileSync(new URL('../../tools/gas_Code.gs', import.meta.url), 'utf8'), ctx);
  return { ctx, store };
}
const now = { t: Date.UTC(2026, 9, 13, 3, 0) }; // にほんの 12じ
const { ctx, store } = gasSandbox(now);
const today = '2026-10-13';
const E = (g, s, extra = {}) => ({ d: today, n: `なまえ${g}`, g, h: 1, s, w: 1, a: 3, df: 'normal', ...extra });
let res = ctx.submitDaily(E('aaaa', 500));
ok(res.rank === 1 && res.total === 1, 'はじめての スコアは 1い');
res = ctx.submitDaily(E('bbbb', 800)); ok(res.rank === 1 && res.total === 2, 'たかい スコアが 1い');
res = ctx.submitDaily(E('aaaa', 300)); ok(res.rank === 2 && res.list.filter((x) => x.g === 'aaaa')[0].s === 500, 'ひくい スコアでは ベストは かわらない');
res = ctx.submitDaily(E('aaaa', 900)); ok(res.rank === 1 && res.total === 2 && res.list.length === 2, 'ベストを こうしん（ひとり 1ぎょう）');
for (let i = 0; i < 60; i++) ctx.submitDaily(E('p' + i.toString(36).padStart(3, '0'), 100 + i, { n: 'にじいろの ユニコーン' }));
const got = ctx.getDaily(today);
ok(got.list.length === 30 && got.total === 62 && got.list[0].s === 900, `ランキングは 30い まで みせる（${got.total}にん）`);
ok(Buffer.byteLength(store.get('daily:' + today)) < 9000, `ほぞんの おおきさ ${Buffer.byteLength(store.get('daily:' + today))} バイト（9KB いない）`);
let threw = ''; try { ctx.submitDaily(E('cccc', 1, { d: '2026-10-10' })); } catch (e) { threw = e.message; }
ok(threw.includes('おわった'), 'むかしの ひには のせられない');
ok(ctx.submitDaily(E('dddd', 50, { d: '2026-10-12' })).rank === 1, 'きのうの ぶんは のせられる（よる 0じを またいだ とき）');
const bad = ctx.submitDaily(E('<b>x', 99999999, { n: '<script>alert(1)</script>', h: 9, a: 0 }));
const row = bad.list.find((x) => x.g === 'bx');
ok(row && !/[<>]/.test(row.n) && row.s === 99999 && row.h === 2 && row.a === 1, 'おかしな あたいは なおして ほぞん');
now.t = Date.UTC(2026, 9, 25, 3, 0);
ctx.submitDaily({ ...E('eeee', 10), d: '2026-10-25' });
ok(!store.has('daily:' + today) && !store.has('dailytags:' + today) && store.has('daily:2026-10-25'), 'ふるい ひの ランキングは けす');
console.log(fail ? `\n${fail} NG` : '\nall ok');
process.exit(fail ? 1 : 0);
