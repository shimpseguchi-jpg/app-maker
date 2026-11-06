// ブラウザで ホーム → つくる → ブリーフィング → ミッション → だっしゅつ せいこう を とおす（REQUIREMENTS.md N-08）
// じこくを にせて 60ぷんの ミッションを すうびょうで まわす。iPad よこ と スマホ たて の りょうほう。
// つかいかた：リポジトリの ルートで  python3 -m http.server 8123  （または npx http-server -p 8123 -c-1 .）を うごかして
//            node missiontimer/tools/e2e.mjs        （SHOTS=…/shots で スクリーンショットの ばしょ）
// けんさ：UI の 漢字は すべて <ruby> の なか（ふりがな つき）／よこに はみださない／ミッション中は 1がめんに おさまる／
//         のこりの かずは がめんの みじかい ほうの 1/4 いじょう（F-504）
import { createRequire } from 'module';
import { mkdirSync } from 'fs';
const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }
const BASE = process.env.BASE || 'http://127.0.0.1:8123/missiontimer/';
const SHOTS = process.env.SHOTS || '/tmp/missiontimer-shots'; mkdirSync(SHOTS, { recursive: true });
const DEVICES = [['ipad', { width: 1180, height: 820 }], ['phone', { width: 390, height: 844 }]];

let fails = 0;
const ok = (name, cond, info = '') => { console.log(`${cond ? '✓' : '✗'} ${name}${cond ? '' : '  ' + JSON.stringify(info).slice(0, 300)}`); if (!cond) fails++; };

const browser = await chromium.launch();
for (const [dev, viewport] of DEVICES) {
  console.log(`\n── ${dev} ${viewport.width}×${viewport.height}`);
  const ctx = await browser.newContext({ viewport, hasTouch: true, timezoneId: 'Asia/Tokyo', locale: 'ja-JP', deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push(m.text()); });
  await page.addInitScript(() => { window.__noSW = true; });
  await page.clock.install({ time: new Date('2026-11-06T16:57:00+09:00') });
  let n = 0;
  const shot = async (name, full = false) => { await page.screenshot({ path: `${SHOTS}/${dev}-${String(++n).padStart(2, '0')}-${name}.png`, fullPage: full }); };
  const run = (ms) => page.clock.runFor(ms);
  const click = async (sel) => { await page.waitForSelector(sel, { timeout: 5000 }); await page.click(sel); await run(120); };
  const at = async () => page.evaluate(() => document.querySelector('#app').dataset.screen);
  // ふりがなの けんさ：漢字の もじは <ruby> の なか（<rt> の なかには 漢字を いれない）
  const furigana = async (label) => {
    const bad = await page.evaluate(() => {
      const K = /[㐀-䶿一-鿿豈-﫿々]/, out = [];
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let t; (t = w.nextNode());) {
        if (!K.test(t.nodeValue) || t.parentElement.closest('script,style,noscript')) continue;
        if (t.parentElement.closest('rt') || !t.parentElement.closest('ruby')) out.push(t.nodeValue.trim().slice(0, 24));
      }
      return out;
    });
    ok(`ふりがな：${label} の 漢字は すべて ふりがな つき`, !bad.length, bad);
  };
  const noOverflow = async (label) => {
    const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth }));
    ok(`N-02 ${label}：よこに はみださない`, r.sw <= r.w + 1, r);
  };
  const check = async (label) => { await furigana(label); await noOverflow(label); };

  // ── はじめかた（F-101）：なまえは きかない。「なんねんせい？」の 1タップ で ホームへ
  await page.goto(BASE); await run(500);
  ok('F-101 はじめかた が でる', (await at()) === 'setup');
  ok('F-101 なまえの にゅうりょくは ない', await page.locator('input').count() === 0);
  await check('はじめかた'); await shot('setup');
  await click('[data-grade="2"]');
  ok('F-102 がくねんを 1タップで ホームへ', (await at()) === 'home');
  ok('F-106 ホームに テンプレと じぶんで つくる', await page.locator('[data-quick^="tpl:"]').count() === 4 && await page.locator('[data-quick="new"]').count() === 1 && await page.locator('[data-quick="last"]').count() === 0);
  await check('ホーム'); await shot('home');

  // ── じぶんで つくる（1がめん）：ドラッグ・タップで いれると その ばで くぎる（F-302・F-401）
  await click('[data-quick="new"]');
  ok('F-401 つくる がめんは 1がめん（パネルが ないと かいし できない）', (await at()) === 'maker' && await page.locator('[data-go]').isDisabled());
  await click('[data-tab="focus"]');
  // わく（うえ）と パレット（した）が どちらも みえる ように する
  await page.evaluate(() => { document.querySelector('[data-waku]').scrollIntoView({ block: 'start' }); document.querySelector('[data-add="kanji"]').scrollIntoView({ block: 'nearest', inline: 'center' }); }); await run(100);
  const src = await page.locator('[data-add="kanji"]').boundingBox();
  const dst = await page.locator('[data-waku]').boundingBox();
  await page.mouse.move(src.x + src.width / 2, src.y + src.height / 2);
  await page.mouse.down();
  for (let k = 1; k <= 12; k++) await page.mouse.move(src.x + src.width / 2 + (dst.x + 40 - src.x - src.width / 2) * k / 12, src.y + src.height / 2 + (dst.y + 30 - src.y - src.height / 2) * k / 12);
  await page.mouse.up(); await run(200);
  ok('F-302 ドラッグで パネルが わくに はいる', await page.locator('[data-w]').count() === 1);
  await click('[data-add="print"]');
  ok('F-302 タップでも すえに はいる', await page.locator('[data-w]').count() === 2);
  ok('F-401 いれた ときに タイムテーブルが できて かいし できる', /\d+:\d\d/.test(await page.locator('[data-w="0"] .tt-time').innerText()) && !(await page.locator('[data-go]').isDisabled()));
  await click('[data-qty="1:3"]');
  ok('F-304 すうりょう ボタン', await page.locator('[data-qty="1:3"].on').count() === 1);
  const len0 = await page.locator('[data-w="0"] .len').innerText();
  await click('[data-w="0"] [data-adj="5"]');
  ok('F-405 +5 で のびて こてい（🔒）', (await page.locator('[data-w="0"] .len').innerText()) !== len0 && await page.locator('[data-w="0"] .lock.on').count() === 1);
  await check('スケジュールメイカー'); await shot('maker', true);
  await click('[data-home]');

  // ── テンプレ「ほうかご」：おすと タイムテーブルが できた じょうたい → ミッションかいし！（F-106・F-401〜F-406）
  await click('[data-quick="tpl:afterschool"]');
  ok('F-106 テンプレを おすと タイムテーブルが できている', await page.locator('.trow').count() >= 4 && !(await page.locator('[data-go]').isDisabled()));
  const rows = await page.locator('.trow').allInnerTexts();
  ok('F-404 2ねんせい：しゅくだい と ほん の あいだに きゅうけい', rows.some((t) => /きゅうけい|休憩/.test(t)), rows);
  await check('タイムテーブル'); await shot('timetable', true);
  await click('[data-mode="equal"]');
  ok('F-401 ひれい／おなじ を きりかえ', await page.locator('[data-mode="equal"].on').count() === 1);
  await click('[data-mode="ratio"]');

  // ── ブリーフィング（F-601）
  await click('[data-go]');
  ok('F-601 ブリーフィング', (await at()) === 'briefing');
  await run(4000); await check('ブリーフィング'); await shot('briefing');
  await run(40000);
  ok('F-601 ブリーフィングの あと ミッションが はじまる', (await at()) === 'timer');

  // ── ミッション中（F-502〜F-504）
  await run(1500);
  await check('ミッション中'); await shot('timer');
  const fit = await page.evaluate(() => {
    const n = document.querySelector('[data-n]').getBoundingClientRect();
    return { h: document.documentElement.scrollHeight, vh: innerHeight, num: n.height, short: Math.min(innerWidth, innerHeight) };
  });
  ok('N-02 F-501 ミッション中は 1がめんに おさまる', fit.h <= fit.vh + 1, fit);
  ok('F-504 のこりの かずは みじかい ほうの 1/4 いじょう', fit.num >= fit.short / 4, fit);
  ok('F-502 いまの パネル・つぎは・おび・カギ', await page.locator('.t-sentence').count() === 1 && await page.locator('.t-next').count() === 1 && await page.locator('.t-band .seg').count() >= 3 && await page.locator('.door .holes i').count() === 3);
  await page.click('[data-done]', { force: true }).catch(() => {}); await run(200);
  ok('F-505 できた！は さいしょう じかんまで おせない', await page.locator('[data-done]').isDisabled());

  // 17:20 に できた！→ はやく おわった → つぎへ → ほしタップ → カギ（F-505・F-506・4.3-8）
  await page.clock.fastForward('23:00'); await run(1200);
  await click('[data-done]');
  ok('F-407 はやく おわった ときの えらびかた', await page.locator('[data-c="next"]').count() === 1);
  await shot('early'); await furigana('はやく おわった');
  await click('[data-c="next"]');
  ok('F-506 ほしタップ', await page.locator('[data-star]').count() === 1);
  await click('[data-star]'); await run(1700); await shot('star');
  await run(800);
  ok('F-603 カギが 1つ ひかる', await page.locator('.door .holes i.lit').count() === 1);

  // さいよみこみ しても つづきから（F-102・F-510）
  await page.reload(); await run(1500);
  ok('F-102 さいよみこみ しても ミッションの つづき', (await at()) === 'timer' && await page.locator('.door .holes i.lit').count() === 1);
  // まわしても じょうたいを うしなわない（N-02）
  await page.setViewportSize({ width: viewport.height, height: viewport.width }); await run(600);
  await shot('rotated'); await check('ミッション中（かいてん）');
  ok('N-02 かいてん しても つづく', (await at()) === 'timer' && await page.locator('.door .holes i.lit').count() === 1);
  await page.setViewportSize(viewport); await run(400);
  // ひょうじ もーどの きりかえ（F-503）
  for (const v of ['bar', 'mascot', 'numbers']) { await click('[data-view]'); await run(300); ok(`F-503 ひょうじ：${v}`, await page.locator(`.timer.view-${v}`).count() === 1); await shot(`view-${v}`); }
  await click('[data-view]');

  // きゅうけい（じどうで はさんだ もの）は もうすこし できない → すぎたら 本（F-404・F-505）
  // できた！は 17:20 すぎ（5ふん みまん はやい）→ はしたは つぎの きゅうけいが はやく はじまる ぶん（17:20〜17:30）
  ok('F-404 しゅくだいの あとは じどうの きゅうけい（もうすこし は できない）', /休|やす/.test(await page.locator('.t-sentence').innerText()) && await page.locator('[data-more]').isDisabled(), await page.locator('.t-sentence').innerText());
  await page.clock.fastForward('10:00'); await run(800);
  ok('F-505 きゅうけいは じかんで じどうで つぎへ', /本|ほん/.test(await page.locator('.t-sentence').innerText()), await page.locator('.t-sentence').innerText());
  // もうすこし（F-407）
  await click('[data-more]');
  ok('F-407 もうすこし の のこり かいすうが へる', /あと\s*1/.test(await page.locator('[data-more]').innerText()), await page.locator('[data-more]').innerText());
  // いちじていし → つづける（F-508）
  await click('[data-pause]'); await run(300);
  ok('F-508 いちじていし', await page.locator('[data-resume]').count() === 1);
  await page.clock.fastForward('02:00'); await click('[data-resume]');

  // スリープで ぜんぶ すぎる → じかんで おわる パネルは じどうで すすみ、さいごに だっしゅつ せいこう（F-510・F-604）
  for (let k = 0; k < 9; k++) { await page.clock.fastForward('05:00'); await run(600); if ((await at()) !== 'timer') break; }
  await run(1000);
  ok('F-604 だっしゅつ せいこう', (await at()) === 'result' && await page.locator('.escape.win').count() === 1, await at());
  await run(1400); await page.waitForTimeout(1800); await shot('escape'); await furigana('だっしゅつ せいこう');   // CSS の うごきは ほんとうの じかんで すすむ
  await click('[data-next]');
  const res = await page.locator('.res-head').innerText();
  ok('F-604 けっか：カギ 3/3・スター', /3ぼん \/ 3ぼん/.test(res) && /⭐ \+\d+/.test(res), res);
  ok('F-702 スタンプ', await page.locator('.stamp-get').count() === 1);
  await check('けっか'); await shot('result', true);
  await click('[data-show]'); await furigana('おうちの ひとに みせる'); await shot('show'); await click('.modal [data-close]');

  // ホームに「このまえと おなじ」→ おすと おなじ ミッションが できている
  await click('[data-home]');
  ok('F-106 ホームに「このまえと おなじ」', await page.locator('[data-quick="last"]').count() === 1);
  await click('[data-quick="last"]');
  ok('F-106 このまえと おなじ：おなじ パネルで すぐ かいし できる', await page.locator('[data-w]').count() === 3 && !(await page.locator('[data-go]').isDisabled()));
  await click('[data-home]');
  // きろく（F-702〜F-704）
  await click('[data-record]');
  ok('F-702 カレンダーに スタンプ', await page.locator('.cal i.st').count() === 1);
  await check('きろく'); await shot('record', true);
  await click('[data-card]'); await furigana('がんばりカード'); await shot('card'); await click('.modal [data-close]');
  await click('[data-home]');

  // せってい → ほごしゃモード（F-104・F-105）
  await click('[data-settings]');
  await check('せってい'); await shot('settings', true);
  await page.locator('[data-parent]').scrollIntoViewIfNeeded();
  const pb = await page.locator('[data-parent]').boundingBox();
  await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2); await page.mouse.down(); await run(3200); await page.mouse.up(); await run(200);
  const q = await page.locator('.modal .lead').innerText();
  const [a, b] = q.match(/\d+/g).map(Number);
  for (const ch of String(a + b)) await click(`.pad [data-k="${ch}"]`);
  await click('.pad [data-k="OK"]');
  ok('F-105 ながおし と たしざんで ほごしゃモード', (await at()) === 'parent');
  await check('ほごしゃモード'); await shot('parent', true);
  await click('[data-back]');
  // ひらがな モード：漢字が ひとつも ない（F-103）
  await click('[data-seg="text"] [data-v="hira"]'); await run(200);
  const kanji = await page.evaluate(() => (document.body.innerText.match(/[一-鿿]/g) || []).join(''));
  ok('F-103 ひらがな モードでは 漢字を ださない', !kanji, kanji);
  ok('コンソールに エラーが ない', !errors.length, errors);
  await ctx.close();
}
await browser.close();
console.log(fails ? `\n✗ ${fails} けん` : '\n✓ e2e OK');
process.exit(fails ? 1 : 0);
