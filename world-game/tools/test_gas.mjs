// GAS のサーバー側（gas/Code.gs）を、にせのスプレッドシートで動かしてたしかめる：node tools/test_gas.mjs
import fs from 'fs';
import vm from 'vm';
import crypto from 'crypto';

const code = fs.readFileSync(new URL('../gas/Code.gs', import.meta.url), 'utf8');
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log('NG:', m); } };

// セルに入れた値はスプレッドシートと同じように化ける：' で始まれば文字のまま、数字っぽければ数字、= で始まれば数式
const cellIn = (v) => (typeof v === 'string' ? (v.startsWith("'") ? v.slice(1) : v.startsWith('=') ? '#ERROR!' : v !== '' && !isNaN(Number(v)) ? Number(v) : v) : v);
function makeSheet() {
  const rows = [];
  const sh = {
    rows,
    getLastRow: () => rows.length,
    getMaxRows: () => 1000,
    appendRow: (vals) => { rows.push(vals.map(cellIn)); },
    getRange: (r, c, nr = 1, nc = 1) => ({
      getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => rows[r - 1 + i]?.[c - 1 + j] ?? '')),
      setValues: (vals) => { vals.forEach((row, i) => row.forEach((v, j) => { (rows[r - 1 + i] ||= [])[c - 1 + j] = cellIn(v); })); return sh.getRange(r, c, nr, nc); },
      setValue: (v) => { (rows[r - 1] ||= [])[c - 1] = cellIn(v); },
      setFontWeight() { return this; }, setNumberFormat() { return this; },
    }),
    setName() {}, setFrozenRows() {}, hideColumns() {},
    getParent: () => ({ getUrl: () => 'https://example/sheet' }),
  };
  return sh;
}
const sheet = makeSheet();
let user = 'Kid1@school.example';
const props = {};
const ctx = {
  Session: { getActiveUser: () => ({ getEmail: () => user }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  SpreadsheetApp: { create: () => ({ getId: () => 'ID1', getSheets: () => [sheet] }), openById: () => ({ getSheetByName: () => sheet }), flush() {} },
  Utilities: { computeDigest: (_a, s) => [...crypto.createHash('sha256').update(s).digest()].map((b) => (b > 127 ? b - 256 : b)), DigestAlgorithm: {}, Charset: {} },
  HtmlService: {}, Logger: { log() {} },
};
vm.createContext(ctx);
vm.runInContext(code, ctx);
const { wgLoad, wgSave } = ctx;

let r = wgLoad();
ok(r.user && /^[0-9a-f]{16}$/.test(r.user) && r.save === null, '初回はセーブなし');
// 数式・数字・日付に見える部分があっても、そのまま戻ること。長いセーブは何セルかに分ける
const save = JSON.stringify({ a: '=SUM(A1)', b: '+81', big: 'x'.repeat(39940), q: "'quote", big2: 'y'.repeat(50000), n: 12345 }).replace('{', '{"head":"2031-01-01",');
ok(save.slice(40000, 40001) === "'", 'テスト：2つ目のセルが \' で始まる');
wgSave({ save, settings: '{"mode":"kid"}', meta: { mode: '1ねんせい', year: 2031, country: 'ステラの くに', status: 'playing', score: '' } });
r = wgLoad();
ok(r.save === save, 'セーブがそのまま戻る（' + save.length + ' 字）');
ok(r.settings === '{"mode":"kid"}', '設定が戻る');
ok(sheet.rows.length === 2 && sheet.rows[1][2] === '1ねんせい' && sheet.rows[1][4] === 'ステラの くに' && sheet.rows[1][5] === 'プレイ中', '先生の一覧 ' + JSON.stringify(sheet.rows[1].slice(0, 7)));
// 設定だけの保存ではセーブは消えない
wgSave({ settings: '{"mode":"adult"}' });
r = wgLoad();
ok(r.save === save && r.settings === '{"mode":"adult"}', '設定だけ変えてもセーブは残る');
// 二人目は別の行
user = 'kid2@school.example';
ok(wgLoad().save === null, '二人目は別のセーブ');
wgSave({ save: '{"y":1}', meta: { mode: 'おとな', year: 2010, country: 'X', status: 'playing', score: '' } });
user = 'KID1@school.example';
ok(wgLoad().save === save, '大文字小文字がちがっても同じ人');
ok(sheet.rows.length === 3, '一人一行');
// おわったらセーブを消し、結果を残す
wgSave({ save: null, meta: { mode: '1ねんせい', year: 2050, country: 'ステラの くに', status: 'clear', score: 8175 } });
r = wgLoad();
ok(r.save === null && sheet.rows[1][5] === 'クリア' && sheet.rows[1][6] === 8175, 'おわると結果だけ残る');
user = '';
ok(wgLoad().user === null, 'アカウントが分からないときは端末だけ');
console.log(fail ? `${fail} 件の問題` : 'すべて OK');
process.exit(fail ? 1 : 0);
