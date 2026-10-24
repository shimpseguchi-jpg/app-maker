// 試作（M0）を、GAS のかわりの「にせもの」の上で動かして、ひととおり確かめる
// つかいかた：node kotozute/tools/test_m0.mjs   （Playwright が必要）
// Code.gs と m0.html を同じページで動かすので、画面とサーバーの両方のまちがいが見つかる。
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const M0 = join(dirname(fileURLToPath(import.meta.url)), '..', 'm0');
const OUT = process.env.OUT || '';
const html = readFileSync(join(M0, 'm0.html'), 'utf8');
const code = readFileSync(join(M0, 'Code.gs'), 'utf8');

// GAS のかわり。SpreadsheetApp などを、メモリの中だけで動かす
const FAKE_GAS = String.raw`
window.__gas = { props: {}, sheets: {}, folder: null, files: [], fail: {}, calls: [],
  email: /noemail/.test(location.search) ? '' : 'ab1234@school.example.jp', owner: 'teacher@school.example.jp' };
(function () {
  var G = window.__gas, nid = 0;
  function makeSS(name) {
    var ss = { id: 'ss' + (++nid), name: name, sheets: [] };
    ss.insertSheet = function (n) {
      var sh = { name: n, rows: [] };
      sh.setName = function (x) { sh.name = x; return sh; };
      sh.appendRow = function (r) { sh.rows.push(r.slice()); return sh; };
      sh.setFrozenRows = function () {};
      sh.getLastRow = function () { return sh.rows.length; };
      sh.getRange = function (r, c, nr, nc) {
        return { getValues: function () { return sh.rows.slice(r - 1, r - 1 + nr).map(function (row) { return row.slice(c - 1, c - 1 + nc); }); } };
      };
      ss.sheets.push(sh);
      return sh;
    };
    ss.insertSheet('シート1');
    ss.getSheets = function () { return ss.sheets; };
    ss.getSheetByName = function (n) { return ss.sheets.filter(function (s) { return s.name === n; })[0] || null; };
    ss.getId = function () { return ss.id; };
    ss.getUrl = function () { return 'https://docs.example/' + ss.id; };
    G.sheets[ss.id] = ss;
    return ss;
  }
  window.SpreadsheetApp = { create: makeSS, openById: function (id) { return G.sheets[id]; } };
  window.DriveApp = {
    createFolder: function (name) {
      G.folder = { name: name, getId: function () { return 'folder1'; }, getUrl: function () { return 'https://drive.example/folder1'; },
        createFile: function (blob) { G.files.push(blob); return { getUrl: function () { return 'https://drive.example/file' + G.files.length; } }; } };
      return G.folder;
    },
    getFolderById: function () { return G.folder; }
  };
  window.Session = {
    getActiveUser: function () { return { getEmail: function () { return G.email; } }; },
    getEffectiveUser: function () { return { getEmail: function () { return G.owner; } }; },
    getScriptTimeZone: function () { return 'Asia/Tokyo'; }
  };
  window.PropertiesService = { getScriptProperties: function () { return {
    getProperty: function (k) { return k in G.props ? G.props[k] : null; },
    setProperty: function (k, v) { G.props[k] = String(v); }
  }; } };
  window.LockService = { getScriptLock: function () { return { waitLock: function () {}, releaseLock: function () {} }; } };
  window.Utilities = {
    newBlob: function (bytes, mime, name) { return { mime: mime, name: name, getBytes: function () { return bytes; } }; },
    base64Decode: function (b64) { var s = atob(b64), a = []; for (var i = 0; i < s.length; i++) a.push(s.charCodeAt(i)); return a; },
    formatDate: function () { return '20261024_101500'; }
  };
  window.Logger = { log: function (m) { console.log(m); } };
  // google.script.run：本物と同じく、引数と戻り値は JSON を通し、名前が _ で終わるものは呼べない
  function runner(ok, ng) {
    return new Proxy({}, { get: function (_, name) {
      if (name === 'withSuccessHandler') return function (f) { return runner(f, ng); };
      if (name === 'withFailureHandler') return function (f) { return runner(ok, f); };
      return function (arg) {
        G.calls.push(name);
        var a = arg === undefined ? undefined : JSON.parse(JSON.stringify(arg));
        setTimeout(function () {
          if (/_$/.test(name) || typeof window[name] !== 'function') { ng && ng(new Error('呼べない関数 ' + name)); return; }
          if (G.fail[name] > 0) { G.fail[name]--; ng && ng(new Error('There are too many scripts running simultaneously for this Google user account.')); return; }
          try { var r = window[name](a); ok && ok(r === undefined ? undefined : JSON.parse(JSON.stringify(r))); } catch (e) { ng && ng(e); }
        }, 10);
      };
    } });
  }
  window.google = { script: {
    run: runner(null, null),
    url: { getLocation: function (cb) { var m = /mode=(\w+)/.exec(location.search); setTimeout(function () { cb({ parameter: m ? { mode: m[1] } : {} }); }, 0); } }
  } };
})();
`;

const server = createServer((req, res) => {
  if (req.url.startsWith('/m0.html')) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(html); return; }
  res.writeHead(204); res.end(); // favicon など
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/m0.html`;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true });
// Playwright は差しこんだスクリプトを関数の中で動かすので、Code.gs の関数を window に出しておく
const names = [...code.matchAll(/^function (\w+)/gm)].map((m) => m[1]);
await ctx.addInitScript({ content: FAKE_GAS + '\n' + code + '\n' + names.map((n) => `window.${n} = ${n};`).join('\n') });
const errors = [];
let fails = 0;
const check = (ok, name, info = '') => { console.log(`${ok ? 'ok ' : 'NG '} ${name}${info ? '  ' + info : ''}`); if (!ok) fails++; };
const gas = (page) => page.evaluate(() => {
  const G = window.__gas, ss = Object.values(G.sheets)[0];
  const rows = (n) => (ss ? ss.getSheetByName(n).rows : []);
  return { kekka: rows('けっか'), douji: rows('どうじ'), files: G.files.map((f) => ({ mime: f.mime, name: f.name, n: f.getBytes().length })), sheets: Object.keys(G.sheets).length, calls: G.calls };
});
const status = (page, item) => page.textContent(`[data-st="${item}"]`);
const visible = (page, sel) => page.isVisible(sel);

// ---- ふつうの画面（先生が1台で試す） ----
{
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e.stack || e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base);
  await page.waitForFunction(() => document.querySelector('[data-st="ほぞん"]').textContent !== 'しらべちゅう');
  await page.waitForFunction(() => document.querySelector('[data-st="アカウント"]').textContent !== 'しらべちゅう');
  check((await status(page, 'アカウント')) === 'できた', 'アカウント：学校のドメインなら ○', await page.textContent('#who'));
  check((await status(page, 'ほぞん')) === 'できた', 'ほぞん：開いた回数を保存できる', await page.textContent('#opens'));
  check(await visible(page, '#speak') && await visible(page, '#pad') && !(await visible(page, '#go')), 'ふつうの画面では 1〜7 が出て、クラス用のボタンは出ない');

  // 3. よみあげ
  await page.click('#speak');
  await page.click('[data-heard="1"]');
  check((await status(page, 'よみあげ')) === 'できた', 'よみあげ：「きこえた」で ○');

  // 4. カメラ（2000x1500 の画像 → 1600x1200 の JPEG にして送る）
  const png = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 2000; c.height = 1500;
    const x = c.getContext('2d'); x.fillStyle = '#fc3'; x.fillRect(0, 0, 2000, 1500);
    return c.toDataURL('image/png').split(',')[1];
  });
  await page.setInputFiles('#camera', { name: 'neko.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await page.waitForFunction(() => /おくれた/.test(document.querySelector('#cameraMsg').textContent), null, { timeout: 10000 });
  check((await status(page, 'カメラ')) === 'できた', 'カメラ：撮った写真を送れる', await page.textContent('#cameraMsg'));

  // 5. てがき（マウスで線を引く）
  await page.click('#padSend');
  check(/まず かいてね/.test(await page.textContent('#padMsg')), 'てがき：何も書かずに送ろうとすると止める');
  const box = await page.locator('#pad').boundingBox();
  await page.mouse.move(box.x + 40, box.y + 30);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(box.x + 40 + i * 12, box.y + 30 + i * 8);
  await page.mouse.up();
  await page.click('#padSend');
  await page.waitForFunction(() => /おくれた/.test(document.querySelector('#padMsg').textContent), null, { timeout: 10000 });
  check((await status(page, 'てがき')) === 'できた', 'てがき：書いた画像を送れる', await page.textContent('#padMsg'));

  // 6. カード：まちがった並べ方 → もどす → ドラッグとタップで正しく並べる（述語より前は自由）
  const word = (t) => page.locator('#deck .word, #slots .word', { hasText: t });
  await word('たべる。').click();
  await word('ねこが').click();
  await word('さかなを').click();
  check(/もういちど/.test(await page.textContent('#cardMsg')), 'カード：「たべる。」が最後でないと やりなおし');
  for (const t of ['たべる。', 'ねこが', 'さかなを']) await page.locator('#slots .word', { hasText: t }).click();
  check((await page.locator('#deck .word').count()) === 3, 'カード：並べたカードをタップすると手元にもどる');
  const drag = async (t, slotIndex) => {
    // マウスで動かすときは自動でスクロールしないので、カードの場所を画面の真ん中に出しておく
    await page.locator('#slots').evaluate((el) => el.closest('section').scrollIntoView({ block: 'center' }));
    const a = await word(t).boundingBox();
    const b = await page.locator('#slots .slot').nth(slotIndex).boundingBox();
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++) await page.mouse.move(a.x + a.width / 2 + (b.x + b.width / 2 - a.x - a.width / 2) * i / 8, a.y + a.height / 2 + (b.y + b.height / 2 - a.y - a.height / 2) * i / 8);
    await page.mouse.up();
  };
  await drag('たべる。', 2);
  await word('さかなを').click();
  await word('ねこが').click();
  check(/せいかい！「さかなを ねこが たべる。」/.test(await page.textContent('#cardMsg')), 'カード：ドラッグとタップで並べられ、「さかなを ねこが たべる。」も正解', await page.textContent('#cardMsg'));
  check((await status(page, 'カード')) === 'できた', 'カード：○ になる');

  // 7. いっせい：5件のうち3件は1回目に断られる → 送り直してぜんぶとどく
  await page.evaluate(() => { window.__gas.fail.burst = 3; });
  await page.click('#go5');
  await page.waitForFunction(() => /とどいた/.test(document.querySelector('#goMsg').textContent), null, { timeout: 20000 });
  check(/5 \/ 5 とどいた（おくりなおし 3かい/.test(await page.textContent('#goMsg')), 'いっせい：断られても送り直して 5/5 とどく', await page.textContent('#goMsg'));
  await page.click('#summary');
  await page.waitForFunction(() => /iPad/.test(document.querySelector('#sumMsg').textContent));
  check(/iPad 1だい・5けん とどいた（おくりなおし 3けん・いちばん おおくて 2かいめ）/.test(await page.textContent('#sumMsg')), 'いっせい：まとめの数が合う', await page.textContent('#sumMsg'));

  await page.waitForTimeout(300);
  const g = await gas(page);
  const items = g.kekka.slice(1).map((r) => `${r[3]}:${r[4]}`);
  check(g.sheets === 1, 'スプレッドシートは1つだけ作られる', `${g.sheets}`);
  check(['アカウント:できた', 'ほぞん:できた', 'よみあげ:できた', 'カメラ:できた', 'てがき:できた', 'カード:できた', 'いっせい:できた'].every((x) => items.includes(x)), 'けっか シートに7項目が記録される', items.join(' '));
  check(g.kekka.slice(1).every((r) => r[1] === 'ab…@school.example.jp'), 'メールアドレスは一部だけ残す', g.kekka[1] && g.kekka[1][1]);
  const camRow = g.kekka.find((r) => r[3] === 'カメラ');
  check(/もと 2000x1500/.test(camRow[5]), 'カメラの記録に元の大きさが入る', camRow[5]);
  check(g.files.length === 2 && g.files.every((f) => f.mime === 'image/jpeg' && f.n > 0), '画像は2枚とも JPEG でフォルダに入る', JSON.stringify(g.files));
  const camW = await page.evaluate(() => new Promise((r) => { const i = new Image(); i.onload = () => r(i.naturalWidth + 'x' + i.naturalHeight); i.src = document.querySelector('#preview').src; }));
  check(camW === '1600x1200', '写真は長い辺 1600 にちぢめて送る', camW);
  check(g.douji.length === 6 && g.douji.slice(1).filter((r) => r[4] === 2).length === 3, 'どうじ シートに5件、そのうち3件は2回目でとどいた');
  check(!g.calls.some((c) => /_$/.test(c)), '画面からは _ で終わる関数を呼ばない');
  if (OUT) await page.screenshot({ path: join(OUT, 'm0_normal.png'), fullPage: true });

  // 開きなおすと、開いた回数が増え、iPad の番号は変わらない
  const before = await page.evaluate(() => localStorage.getItem('kz-m0-device'));
  await page.reload();
  await page.waitForFunction(() => document.querySelector('[data-st="ほぞん"]').textContent !== 'しらべちゅう');
  check(/2 かいめ/.test(await page.textContent('#opens')) && before === await page.evaluate(() => localStorage.getItem('kz-m0-device')), 'ほぞん：開きなおすと2回目になり、iPad の番号は同じ');
  await page.close();
}

// ---- クラス用の画面（?mode=class） ----
{
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e.stack || e)));
  await page.goto(base + '?mode=class&noemail=1');
  await page.waitForFunction(() => document.querySelector('[data-st="アカウント"]').textContent !== 'しらべちゅう');
  check(await visible(page, '#go') && !(await visible(page, '#speak')) && !(await visible(page, '#go5')), 'クラス用：「せーので おす」だけが出る');
  check((await status(page, 'アカウント')) === 'できない' && /わかりませんでした/.test(await page.textContent('#who')), 'クラス用：メールアドレスがとれないと × になる');
  await page.click('#go');
  await page.waitForFunction(() => /とどいた/.test(document.querySelector('#goMsg').textContent));
  check((await page.textContent('#goMark')) === '○' && (await status(page, 'いっせい')) === 'できた', 'クラス用：押すと1件送って ○ が出る');
  const g = await gas(page);
  check(g.kekka.slice(1).some((r) => r[3] === 'アカウント' && r[4] === 'できない' && r[1] === '（とれない）'), 'メールアドレスがとれなかったことが記録される');
  if (OUT) await page.screenshot({ path: join(OUT, 'm0_class.png'), fullPage: true });
  await page.close();
}

// ---- GAS の外で開いたとき ----
{
  const plain = await browser.newPage();
  plain.on('pageerror', (e) => errors.push(String(e.stack || e)));
  await plain.goto(base);
  check(await plain.isVisible('#offline'), 'GAS の外で開くと、その旨を出す（止まらない）');
  await plain.close();
}

check(errors.length === 0, 'ページのエラーがない', errors.join('\n'));
await browser.close();
server.close();
console.log(fails ? `\n${fails} 件 NG` : '\nぜんぶ ok');
process.exit(fails ? 1 : 0);
