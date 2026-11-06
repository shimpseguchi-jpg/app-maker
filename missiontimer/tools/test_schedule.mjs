// おまかせスケジューラの けんさ（REQUIREMENTS.md 4.3・F-401〜F-408・N-08）
//   node missiontimer/tools/test_schedule.mjs [らんすうの かず=5000] [シード=20261106]
// 1. 3.2 の れいと、4.3 の きまりを 1つずつ たしかめる きまった けんさ
// 2. らんすうの にゅうりょく（すうせん けん）で、ごうけい いっち・さいしょう さいだい・5ふん きざみ・きゅうけいの きまり・
//    こていの ふへん・ならびじゅん・ごほうびの じょうげん を plan と replan の りょうほうで たしかめる
// 3. UI に だす もじ（パネルの なまえ・おしらせ・ていあん）の 漢字に すべて ふりがな（{漢字|かな}）が ついているか
import { makeRng } from '../../js/util.js';
import { PANELS, PANEL_BY_ID, KINDS, VERBS } from '../js/data/panels.js';
import { THEMES } from '../js/data/themes.js';
import { TEMPLATES } from '../js/data/templates.js';
import {
  plan, replan, earlyChoices, clock, breakThreshold, STEP, MIN_TOTAL, MAX_TOTAL, EXTEND_MAX, REST_MAX,
} from '../js/engine/schedule.js';

const N = Number(process.argv[2]) || 5000;
const SEED = Number(process.argv[3]) || 20261106;
const EPS = 1e-6;

// ── けんさの きろく
const results = new Map();
function check(name, cond, info) {
  if (!results.has(name)) results.set(name, { pass: 0, fail: 0, ex: [] });
  const r = results.get(name);
  if (cond) r.pass++;
  else { r.fail++; if (r.ex.length < 3) r.ex.push(typeof info === 'function' ? info() : info); }
  return !!cond;
}
const short = (o) => { const s = String(JSON.stringify(o)); return s.length > 600 ? s.slice(0, 600) + '…' : s; };
const sum = (a, f = (x) => x) => a.reduce((s, x) => s + f(x), 0);
const onGrid = (m) => Math.abs(m / STEP - Math.round(m / STEP)) < EPS;
const near = (a, b) => Math.abs(a - b) < EPS;
const table = (r) => r.items.map((it) => `${it.panel}${it.auto ? '(' + it.auto + ')' : ''} ${clock(it.start)}-${clock(it.end)}`);
function deepFreeze(o) { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); Object.values(o).forEach(deepFreeze); } return o; }

// ── ふりがな：{漢字|かな} の そとに 漢字が ないか（かなの がわにも 漢字を いれない）
const KANJI = /[㐀-䶿一-鿿豈-﫿々〆ヶ]/;
const texts = [];
function bareKanji(s) {
  const rest = String(s).replace(/\{([^|{}]+)\|([^{}]+)\}/g, (m, k, kana) => (KANJI.test(kana) ? '漢' : ''));
  return KANJI.test(rest);
}
function collect(r) {
  if (!r) return;
  if (r.text) texts.push(r.text);
  for (const k of ['fixes', 'notices', 'suggestions']) for (const x of r[k] || []) texts.push(x.text);
  for (const it of r.items || []) texts.push(it.obj, it.verb);
}

// ─────────────────────────────────────────────
// 1. きまった けんさ

const S17 = 17 * 60, E18 = 18 * 60;
const EX = [{ panel: 'book' }, { panel: 'print', qty: 1 }, { panel: 'game' }];   // 3.2：どくしょ・プリント（1まい）・ゲーム
const P = (o) => { const r = plan(o); collect(r); return r; };
const R = (t, e, o) => { const r = replan(t, e, o); collect(r); return r; };
const eq = (name, r, want) => check(name, r.ok && JSON.stringify(table(r)) === JSON.stringify(want), () => (r.ok ? table(r) : short(r)));

// 3.2 の れい（F-401・F-402）
const WANT_RATIO = ['book 17:00-17:20', 'print 17:20-17:35', 'game 17:35-18:00'];
const WANT_EQUAL = ['book 17:00-17:20', 'print 17:20-17:40', 'game 17:40-18:00'];
const WANT_G3 = ['book 17:00-17:20', 'rest(break) 17:20-17:25', 'print 17:25-17:40', 'game 17:40-18:00'];
eq('3.2 れい1 F-401 おまかせ（ひれい）2年：はさんだ きゅうけいを はずした とき（F-404）', P({ start: S17, end: E18, items: EX, grade: 2, mode: 'ratio', autoBreak: false }), WANT_RATIO);
eq('3.2 れい2 F-401 おまかせ（おなじ）2年：はさんだ きゅうけいを はずした とき（F-404）', P({ start: S17, end: E18, items: EX, grade: 2, mode: 'equal', autoBreak: false }), WANT_EQUAL);
for (const g of [4, 5, 6]) {
  eq('3.2 れい1 F-401 ひれい：きゅうけいが いらない 4〜6年', P({ start: S17, end: E18, items: EX, grade: g, mode: 'ratio' }), WANT_RATIO);
  eq('3.2 れい2 F-401 おなじ：きゅうけいが いらない 4〜6年', P({ start: S17, end: E18, items: EX, grade: g, mode: 'equal' }), WANT_EQUAL);
}
eq('3.2 れい3 F-404 ひれい 3年：プリントの まえに きゅうけい、ゲーム 25→20', P({ start: S17, end: E18, items: EX, grade: 3, mode: 'ratio' }), WANT_G3);
// 3.2 の 2年の れいは 4.3 の 5 と くいちがう（20＋15＝35 > max(15, 2×10)＝20）。きまり（9.1 の けってい じこう）を とる
eq('4.3-5 F-404 2年 ひれい：きまりどおり プリントの まえに きゅうけい（3.2 の 2年の れいとは ちがう）', P({ start: S17, end: E18, items: EX, grade: 2, mode: 'ratio' }), WANT_G3);
eq('4.3-5 F-404 2年 おなじ：きまりどおり プリントの まえに きゅうけい、ゲーム 20→15',
  P({ start: S17, end: E18, items: EX, grade: 2, mode: 'equal' }), ['book 17:00-17:20', 'rest(break) 17:20-17:25', 'print 17:25-17:45', 'game 17:45-18:00']);

// F-403・F-307・F-405：こてい
eq('F-403 F-307 🔒 ゲーム 20ぷん こてい：のこり 40ぷんを ひれいで わける', P({ start: S17, end: E18, items: [EX[0], EX[1], { panel: 'game', locked: true, minutes: 20 }], grade: 2, autoBreak: false }),
  ['book 17:00-17:25', 'print 17:25-17:40', 'game 17:40-18:00']);
eq('F-403 4.3-2 ほごしゃが きめた ながさ（じかんで おわる ゲーム 20ぷん）', P({ start: S17, end: E18, items: EX, grade: 2, autoBreak: false, catalog: { ...PANEL_BY_ID, game: { ...PANEL_BY_ID.game, fixed: 20 } } }),
  ['book 17:00-17:25', 'print 17:25-17:40', 'game 17:40-18:00']);
eq('F-405 F-307 1つを のばすと ほかが ちぢんで ごうけいを たもつ', P({ start: S17, end: E18, items: [{ panel: 'book', minutes: 30 }, EX[1], EX[2]], grade: 2, autoBreak: false }),
  ['book 17:00-17:30', 'print 17:30-17:40', 'game 17:40-18:00']);
{
  const r = P({ start: S17, end: S17 + 50, items: [{ panel: 'book', minutes: 30 }, { panel: 'print', qty: 3 }, { panel: 'game' }], grade: 2 });
  check('F-405 F-403 ちぢめられない ときは おわりを のばす ていあん', !r.ok && r.reason === 'short' && r.fixes.some((f) => f.id === 'extendEnd' && f.apply.end === S17 + 55), () => short(r));
}

// F-403・F-203：うけつけない にゅうりょく
{
  const a = P({ start: S17, end: S17 + 5, items: EX });
  const b = P({ start: S17, end: S17 + 185, items: EX });
  check('F-403 F-203 ごうけいは 10〜180ぷん（そとは なおしかたつきで もどす）', !a.ok && a.reason === 'range' && a.fixes[0].apply.end === S17 + MIN_TOTAL && !b.ok && b.reason === 'range' && b.fixes[0].apply.end === S17 + MAX_TOTAL, () => short([a, b]));
  const c = P({ start: S17 + 1, end: E18, items: EX });
  check('F-402 じこくが 5ふん きざみ でなければ もどす', !c.ok && c.reason === 'grid', () => short(c));
  const d = P({ start: S17, end: E18, items: [] });
  const e = P({ start: S17, end: E18, items: [{ panel: 'nothing' }] });
  check('F-403 パネルが ない・しらない パネル', !d.ok && d.reason === 'empty' && !e.ok && e.reason === 'panel', () => short([d, e]));
}

// F-403・4.3-6：たりない
{
  const r = P({ start: S17, end: S17 + 10, items: [{ panel: 'book' }, { panel: 'print' }] });
  const ok = !r.ok && r.reason === 'short' && r.need === 5;
  check('F-403 4.3-6 たりない：「じかんが たりないよ」と はずす パネル・おわりを のばす を ていあん', ok && r.fixes.some((f) => f.id === 'extendEnd') && r.fixes.filter((f) => f.id === 'remove').length === 2, () => short(r));
  check('F-403 4.3-6 たりない：なおしかたを とりいれると つくれる', ok && r.fixes.every((f) => plan({ start: S17, end: S17 + 10, items: [{ panel: 'book' }, { panel: 'print' }], ...f.apply }).ok), () => short(r));
  const one = P({ start: S17, end: S17 + 10, items: [{ panel: 'meal' }] });
  check('F-403 4.3-6 たりない：パネルが 1つ だけ なら はずす ていあんは しない', !one.ok && one.reason === 'short' && !one.fixes.some((f) => f.id === 'remove'), () => short(one));
}

// F-403・4.3-6：あまる
{
  const r = P({ start: S17, end: S17 + 180, items: [{ panel: 'teeth' }] });
  const f = r.ok && r.items[1];
  check('F-403 4.3-6 あまる：あまりを「じゆうじかん」として さいごに おいて「なにに する？」', r.ok && r.items.length === 2 && f.auto === 'free' && f.planned === 175 && r.notices.some((n) => n.code === 'free' && n.minutes === 175), () => short(r));
}

// F-403・F-801：ごほうびの じょうげん
{
  const r = P({ start: S17, end: S17 + 90, items: [{ panel: 'homework' }, { panel: 'game' }, { panel: 'video' }], grade: 2, rewardCap: 30 });
  check('F-403 F-801 ゲームと どうがは あわせて じょうげん まで', r.ok && sum(r.items.filter((x) => x.capped), (x) => x.planned) <= 30, () => short(r));
  const z = P({ start: S17, end: S17 + 60, items: [{ panel: 'book' }, { panel: 'game' }], rewardCap: 0 });
  const w = P({ start: S17, end: S17 + 60, items: [{ panel: 'game', minutes: 30 }, { panel: 'video', minutes: 30 }], rewardCap: 30 });
  check('F-403 F-801 じょうげんを まもれない ときは りゆうと はずす ていあん', !z.ok && z.reason === 'cap' && z.fixes.length === 1 && !w.ok && w.reason === 'cap' && w.fixes.length === 2, () => short([z, w]));
}

// F-404：きゅうけい
{
  const r = P({ start: S17, end: S17 + 30, items: [{ panel: 'kanji', minutes: 15 }, { panel: 'calc', minutes: 15 }], grade: 1 });
  check('F-404 4.3-5 ひけない（すべて さいしょう・こてい）ときは いれずに「きゅうけいが はいらなかったよ」', r.ok && !r.items.some((x) => x.auto === 'break') && r.notices.some((n) => n.code === 'break_skipped'), () => short(r));
  const one = P({ start: S17, end: S17 + 30, items: [{ panel: 'homework', minutes: 30 }], grade: 1 });
  check('F-404 1つの パネルだけで げんどを こえる ときは わけない', one.ok && one.items.length === 1, () => short(one));
  const cut = P({ start: S17, end: S17 + 35, items: [{ panel: 'kanji', minutes: 15 }, { panel: 'tidy' }, { panel: 'calc', minutes: 15 }], grade: 1 });
  check('F-404 しゅうちゅう いがいの パネルが あいだに あれば れんぞくは きれる', cut.ok && !cut.items.some((x) => x.auto === 'break'), () => short(cut));
  const many = P({ start: S17, end: S17 + 90, items: ['kanji', 'calc', 'kanji', 'calc', 'book', 'drill'].map((panel) => ({ panel })), grade: 1 });
  check('F-404 ながい しゅうちゅうには なんかいも はさむ', many.ok && many.items.filter((x) => x.auto === 'break').length >= 3, () => short(many));
  const off = P({ start: S17, end: S17 + 90, items: ['kanji', 'calc', 'kanji', 'calc', 'book', 'drill'].map((panel) => ({ panel })), grade: 1, autoBreak: false });
  check('F-404 はさんだ きゅうけいを はずすと（autoBreak=false）もう はさまない', off.ok && !off.items.some((x) => x.auto === 'break'), () => short(off));
}

// F-406：ていあん
{
  const items = [{ panel: 'game' }, { panel: 'homework' }];
  const r = P({ start: S17, end: E18, items, grade: 2 });
  const s = r.ok && r.suggestions.find((x) => x.id === 'reward_last');
  check('F-406 4.3-7「ゲームは さいごに すると がんばれるよ」', !!s && s.text.startsWith('ゲームは さいごに'), () => short(r));
  check('F-406 4.3-7 1タップで とりいれる と ごほうびが さいごに なる', !!s && s.apply.items.map((x) => x.panel).join() === 'homework,game', () => short(s));
  const r2 = P({ start: S17, end: E18, items, grade: 2, suppress: ['reward_last'] });
  check('F-406 おなじ ていあんは 1ミッションに 1かい まで（suppress）', r2.ok && !r2.suggestions.some((x) => x.id === 'reward_last'), () => short(r2));

  const b = P({ start: 18 * 60, end: 19 * 60 + 30, items: [{ panel: 'bath' }, { panel: 'homework' }, { panel: 'book' }], grade: 3, anchors: { bath: '19:00' } });
  const sb = b.ok && b.suggestions.find((x) => x.id === 'anchor:bath');
  const after = sb && P({ start: 18 * 60, end: 19 * 60 + 30, items: sb.apply.items, grade: 3, anchors: { bath: '19:00' } });
  const bathAt = (t) => t.items.find((x) => x.panel === 'bath').start;
  check('F-406 4.3-7「おふろは 19:00 ごろ だね」と いちを ていあん', !!sb && sb.text.includes('19:00') && after.ok && Math.abs(bathAt(after) - 1140) < Math.abs(bathAt(b) - 1140) && !after.suggestions.some((x) => x.id === 'anchor:bath'), () => short([b, after]));

  const k = P({ start: S17, end: E18, items: ['kanji', 'kanji', 'calc', 'calc'].map((panel) => ({ panel })), grade: 6 });
  const sk = k.ok && k.suggestions.find((x) => x.id === 'alternate');
  check('F-406 4.3-7「かんじ と けいさん を こうたいに すると あきないよ」', !!sk && sk.apply.items.map((x) => x.panel).join() === 'kanji,calc,kanji,calc', () => short(k));
  const k2 = P({ start: S17, end: E18, items: ['kanji', 'calc', 'kanji'].map((panel) => ({ panel })), grade: 6 });
  const k3 = P({ start: S17, end: E18, items: ['kanji', 'kanji', 'kanji'].map((panel) => ({ panel })), grade: 6 });
  check('F-406 4.3-7 もう こうたい している・こうたい できない ときは ださない', k2.ok && k3.ok && !k2.suggestions.length && !k3.suggestions.length, () => short([k2, k3]));
}

// F-407：ミッション中の さいけいさん
{
  const tt = P({ start: S17, end: E18, items: EX, grade: 2, autoBreak: false });   // 17:00 本 / 17:20 プリント / 17:35 ゲーム
  const at = S17 + 12.5;
  check('F-407 はやく おわった ときに えらべる もの（つぎへ／ごほうびに たす／ちょっと きゅうけい）', earlyChoices(tt, 0, at).join() === 'next,reward,rest' && earlyChoices(tt, 0, S17 + 5).join() === 'next,reward', () => [earlyChoices(tt, 0, at), earlyChoices(tt, 0, S17 + 5)]);
  const nx = R(tt, { type: 'early', index: 0, at, choice: 'next' });
  check('F-407 つぎへ：あまりを うしろへ ひれいで たし、はしたは つぎの パネルが はやく はじまる', nx.ok && near(nx.items[1].start, at) && nx.items[1].end === S17 + 30 && nx.items[2].planned === 30 && nx.end === E18, () => short(nx));
  const rw = R(tt, { type: 'early', index: 0, at, choice: 'reward' });
  check('F-407 さいごの ごほうびに たす（じょうげん ない）', rw.ok && rw.items[2].planned === 30 && rw.items[2].end === E18, () => short(rw));
  const rs = R(tt, { type: 'early', index: 0, at, choice: 'rest' });
  check('F-407 ちょっと きゅうけい：うしろは そのまま', rs.ok && rs.items[1].auto === 'rest' && near(rs.items[1].start, at) && rs.items[2].start === S17 + 20 && rs.items[3].end === E18, () => short(rs));
  check('F-407 ちょっと きゅうけいは あまり 10ぷん いか のとき だけ', R(tt, { type: 'early', index: 0, at: S17 + 5, choice: 'rest' }).reason === 'rest_too_long');
  check('F-407 はやく おわって いない・さいごの パネル・しらない えらびかた', R(tt, { type: 'early', index: 0, at: S17 + 20 }).reason === 'not_early' && R(tt, { type: 'early', index: 2, at: S17 + 40 }).reason === 'last' && R(tt, { type: 'early', index: 0, at, choice: 'x' }).reason === 'choice');
  const nr = R(P({ start: S17, end: E18, items: [{ panel: 'book' }, { panel: 'print' }] }), { type: 'early', index: 0, at, choice: 'reward' });
  check('F-407 うしろに ごほうびが ない ときは ごほうびに たせない', !nr.ok && nr.reason === 'no_reward', () => short(nr));

  const e1 = R(tt, { type: 'extend', index: 1 });
  const e2 = e1.ok && R(e1, { type: 'extend', index: 1 });
  const e3 = e2.ok && R(e2, { type: 'extend', index: 1 });
  check('F-407 もうすこし（+5ふん）：うしろを ちぢめて おわりの じこくは うごかさない', e1.ok && e1.items[1].planned === 20 && e1.items[2].planned === 20 && e1.end === E18 && e2.ok && e2.items[2].planned === 15, () => short([e1, e2]));
  check(`F-407 もうすこし は さいだい ${EXTEND_MAX}かい`, e3 && !e3.ok && e3.reason === 'limit', () => short(e3));

  const full = P({ start: S17, end: S17 + 25, items: [{ panel: 'kanji' }, { panel: 'teeth' }, { panel: 'rest' }], grade: 6 });   // かんじ 15・はみがき 5・きゅうけい 5（すべて さいしょう）
  const nr1 = R(full, { type: 'extend', index: 0 });
  const nr2 = R(full, { type: 'extend', index: 0 }, { allowEndExtend: true });
  check('F-407 4.3-8 ちぢめられない：ほごしゃが きんし なら「きょうは ここまで」、ゆるして いれば おわりを のばす ていあん', !nr1.ok && nr1.reason === 'no_room' && nr1.fixes[0].id === 'stop' && !nr2.ok && nr2.fixes[0].id === 'extendEnd', () => short([nr1, nr2]));
  const ee = nr2.fixes?.[0] && R(full, nr2.fixes[0].event, { allowEndExtend: true });
  check('F-407 4.3-8 おわりを 5ふん のばす（ゆるされて いる とき）', ee && ee.ok && ee.end === S17 + 30 && ee.items[0].planned === 20 && ee.items[2].end === S17 + 30, () => short(ee));
  const ef = R(full, { type: 'extendEnd', index: 0 });
  const ff = R(full, { type: 'extendEnd', index: 2, force: true });
  check('F-407 F-605 おわりを のばすのは ゆるされて いる ときか、じかんぎれの えんちょう（force）だけ', !ef.ok && ef.reason === 'end_locked' && ff.ok && ff.end === S17 + 30, () => short([ef, ff]));
  const br = P({ start: S17, end: E18, items: EX, grade: 3 });
  check('F-407 しらない できごと・ばんごう・タイムテーブル・きゅうけいは のばせない', R(br, { type: 'extend', index: 1 }).reason === 'not_extendable' && R(tt, { type: 'x', index: 0 }).reason === 'event' && R(tt, { type: 'extend', index: 9 }).reason === 'index' && R(null, {}).reason === 'timetable');
  const lt = R(tt, { type: 'late', index: 1, at: S17 + 43 });   // プリント（〜17:35）が 17:43 に おわった
  check('F-407 F-505 おそく おわった：おくれた ぶん うしろを ちぢめる（ゲーム 25→15）', lt.ok && near(lt.items[2].start, S17 + 43) && lt.items[2].planned === 15 && lt.items[2].end === E18 && lt.over === 0, () => short(lt));
  const lt2 = R(tt, { type: 'late', index: 1, at: S17 + 58 });
  check('F-407 F-605 ちぢめきれない ぶんは おわりを こえて over に のこす（おわりの じこくは うごかさない）', lt2.ok && lt2.items[2].planned === 10 && lt2.end === E18 && lt2.over === 10, () => short(lt2));
  check('F-407 まだ じかんが ある ときは おそく おわった に しない', R(tt, { type: 'late', index: 1, at: S17 + 30 }).reason === 'not_late');
  const la = R(tt, { type: 'later', index: 0, at: S17 + 5 });   // 本を 5ふんで あとで に
  check('F-508 あとで：いまの パネルを さいごへ まわし、つかった 5ふんは うしろを ちぢめて あわせる', la.ok && la.items.map((x) => x.panel + (x.auto ? '(' + x.auto + ')' : '')).join() === 'book(skipped),print,game,book' && la.items[0].end === S17 + 5 && near(la.items[1].start, S17 + 5) && la.items[3].end === E18 && la.items[3].later === 1 && sum(la.items, (x) => x.planned) === 55, () => short(la));
  check('F-508 あとで：さいごの パネル・きゅうけいは まわせない', R(tt, { type: 'later', index: 2, at: S17 + 40 }).reason === 'last' && R(br, { type: 'later', index: 1, at: S17 + 21 }).reason === 'not_movable');
  const gm = P({ start: S17, end: E18, items: [{ panel: 'book' }, { panel: 'game' }], rewardCap: 30 });
  check('F-407 F-403 ゲームの もうすこし も ごほうびの じょうげん まで', gm.ok && gm.items[1].planned === 30 && R(gm, { type: 'extend', index: 1 }).reason === 'cap', () => short(gm));
}

// ─────────────────────────────────────────────
// 2. らんすうの にゅうりょく

const rng = makeRng(SEED);
const CUSTOM = [
  { id: 'diary', obj: '{日記|にっき}', verb: '{書|か}く', emoji: '📓', kind: 'focus', base: 10, min: 5, max: 20, finish: 'done' },
  { id: 'pet', obj: 'ペットの おせわ', verb: 'する', emoji: '🐹', kind: 'life', base: 10, min: 5, max: 15, finish: 'done' },
  { id: 'lego', obj: 'ブロック', verb: 'あそぶ', emoji: '🧱', kind: 'reward', base: 25, min: 10, max: 50, finish: 'timed' },
];

function bounds(p, item, grade, cap) {
  const f = p.unit ? (item.qty ?? (p.unitOptional ? 1 : 1)) : 1;
  const lo = p.min * f;
  const hi = p.capped ? Math.min(p.max * f, cap) : p.max * f;
  return { lo, hi, f };
}

function randomInput() {
  const grade = rng.int(1, 6);
  const mode = rng.chance(0.5) ? 'ratio' : 'equal';
  const start = rng.int(6 * 12, 21 * 12) * STEP;
  let T = rng.int(2, 36) * STEP;
  if (rng.chance(0.03)) T = rng.pick([0, 5, 185, 240]);
  const rewardCap = rng.pick([0, 10, 20, 30, 30, 30, 45, 60, 90]);
  const catalog = { ...PANEL_BY_ID };
  if (rng.chance(0.1)) catalog.game = { ...catalog.game, fixed: rng.pick([10, 20, 30]) };   // F-802 ほごしゃが ゲームの ながさを きめる
  if (rng.chance(0.1)) catalog.print = { ...catalog.print, base: 15 };                       // F-802 きじゅんの うわがき
  const pool = [...PANELS.map((p) => p.id), ...(rng.chance(0.2) ? CUSTOM : [])];
  const n = rng.int(1, 8);
  const items = [];
  for (let k = 0; k < n; k++) {
    const ref = rng.pick(pool);
    const p = typeof ref === 'string' ? catalog[ref] : ref;
    const item = { panel: ref };
    if (p.unit && rng.chance(0.7)) item.qty = rng.int(1, 5);
    if (rng.chance(0.15)) {
      const { lo, hi } = bounds(p, item, grade, rewardCap);
      if (hi >= lo) { item.minutes = rng.int(lo / STEP, hi / STEP) * STEP; if (rng.chance(0.5)) item.locked = true; }
    }
    items.push(item);
  }
  return { start, end: start + T, items, grade, mode, rewardCap, autoBreak: rng.chance(0.8), catalog };
}

// にゅうりょく から べつに もとめた めやす（4.3 の 1・2・6、F-403）
function expect(input) {
  const T = input.end - input.start;
  if (T < MIN_TOTAL || T > MAX_TOTAL) return { reason: 'range' };
  const ents = input.items.map((it, src) => {
    const p = typeof it.panel === 'string' ? input.catalog[it.panel] : it.panel;
    const { lo, hi } = bounds(p, it, input.grade, input.rewardCap);
    // こていの ながさは [さいしょう, さいだい]（ごほうびは じょうげん）に おさめる
    const raw = it.minutes ?? (p.fixed != null && p.finish === 'timed' ? p.fixed : null);
    const fixed = raw == null ? null : Math.min(Math.max(raw, lo), Math.max(lo, hi));
    return { src, p, lo, hi, capped: !!p.capped, fixed };
  });
  const capLeft = input.rewardCap - sum(ents.filter((e) => e.fixed != null && e.capped), (e) => e.fixed);
  const vars = ents.filter((e) => e.fixed == null);
  if (capLeft < 0 || sum(vars.filter((e) => e.capped), (e) => e.lo) > capLeft) return { reason: 'cap' };
  const Rm = T - sum(ents.filter((e) => e.fixed != null), (e) => e.fixed);
  if (Rm < sum(vars, (e) => e.lo)) return { reason: 'short' };
  const hiTotal = sum(vars.filter((e) => !e.capped), (e) => e.hi) + Math.min(sum(vars.filter((e) => e.capped), (e) => Math.min(e.hi, capLeft)), capLeft);
  return { reason: null, ents, free: Math.max(0, Rm - hiTotal) };
}

function concentrationRuns(items) {
  const runs = [];
  let cur = [];
  for (const it of items) { if (it.kind === 'focus') cur.push(it); else { if (cur.length) runs.push(cur); cur = []; } }
  if (cur.length) runs.push(cur);
  return runs;
}

const BREAK_TOL = 5;   // F-404 の ひつようせい：きゅうけいの 5ふんを うしろの しゅうちゅうから ひいた ぶん
const okPlans = [];
const reasons = {};
for (let k = 0; k < N; k++) {
  const input = deepFreeze(randomInput());
  const ex = expect(input);
  const r = plan(input);
  collect(r);
  const info = () => short({ input: { ...input, catalog: undefined }, out: r.ok ? table(r) : r });
  reasons[r.ok ? 'ok' : r.reason] = (reasons[r.ok ? 'ok' : r.reason] || 0) + 1;
  check('F-408 おなじ にゅうりょく → おなじ けっか（じゅんすい かんすう・にゅうりょくを かえない）', JSON.stringify(plan(input)) === JSON.stringify(r), info);
  check('F-403 4.3-1・2・6 うけつけない／たりない／じょうげんの はんてい', (r.ok ? null : r.reason) === ex.reason, info);
  if (!r.ok) {
    if (r.reason === 'short') {
      for (const f of r.fixes) check('F-403 4.3-6 たりない ときの なおしかたを とりいれると つくれる', plan({ ...input, ...f.apply }).ok, () => short({ fix: f.id, input: { ...input, catalog: undefined } }));
    }
    continue;
  }
  okPlans.push(input);
  const it = r.items, T = input.end - input.start;
  const thr = breakThreshold(input.grade);

  // F-402 ごうけい いっち・5ふん きざみ
  check('F-402 ごうけいが T に いっち（くぎりが つながり はじまり〜おわりを うめる）',
    it[0].start === input.start && it[it.length - 1].end === input.end && it.every((x, j) => j === 0 || x.start === it[j - 1].end) && sum(it, (x) => x.planned) === T && it.every((x) => x.end - x.start === x.planned), info);
  check('F-402 5ふん きざみ（じこく・ながさ）', it.every((x) => onGrid(x.start) && onGrid(x.end) && onGrid(x.planned) && x.planned >= STEP), info);
  // F-403 さいしょう・さいだい・じょうげん・こてい
  check('F-403 さいしょう・さいだいを まもる（すうりょう ばい・ごほうびの じょうげん こみ）',
    it.every((x) => (x.auto === 'break' ? x.planned === 5 : x.auto === 'free' ? x.planned >= STEP : x.planned >= ex.ents[x.src].lo && x.planned <= ex.ents[x.src].hi)), info);
  check('F-403 F-801 ゲームと どうがは あわせて じょうげん まで', sum(it.filter((x) => x.capped), (x) => x.planned) <= input.rewardCap, info);
  check('F-403 F-307 こていの ふへん（🔒・ながさを かえた パネル・ほごしゃの こてい）',
    it.filter((x) => !x.auto).every((x) => (ex.ents[x.src].fixed == null ? !x.locked : x.locked && x.planned === ex.ents[x.src].fixed)), info);
  check('9.1 ならびじゅんを そんちょう（わくの じゅんの まま）', it.filter((x) => !x.auto).map((x) => x.src).join() === input.items.map((_, j) => j).join(), info);
  // 4.3-6 あまる
  const free = it.filter((x) => x.auto === 'free');
  check('F-403 4.3-6 あまる ときだけ さいごに じゆうじかん', ex.free ? free.length === 1 && it[it.length - 1].auto === 'free' && free[0].planned + (it.filter((x) => x.auto === 'break').length * 5) >= ex.free : free.length === 0, info);
  // F-404 きゅうけいの きまり
  const skipped = new Set(r.notices.find((x) => x.code === 'break_skipped')?.items || []);
  if (!input.autoBreak) check('F-404 はさんだ きゅうけいを はずすと（autoBreak=false）はさまない', !it.some((x) => x.auto === 'break') && !skipped.size, info);
  else {
    check('F-404 きゅうけいの きまり：れんぞくする しゅうちゅうが max(15, 学年×10) を こえない（いれられない ときは おしらせ）',
      concentrationRuns(it).every((run) => run.length < 2 || sum(run, (x) => x.planned) <= thr || run.some((x) => skipped.has(x.src))), info);
    check('F-404 きゅうけいの きまり：はさむのは しゅうちゅうと しゅうちゅうの あいだ・5ふん・ひつような ときだけ', it.every((x, j) => {
      if (x.auto !== 'break') return true;
      const prev = it[j - 1], next = it[j + 1];
      if (!prev || !next || prev.kind !== 'focus' || next.kind !== 'focus' || x.planned !== 5) return false;
      let before = 0;
      for (let q = j - 1; q >= 0 && it[q].kind === 'focus'; q--) before += it[q].planned;
      return before + next.planned + BREAK_TOL > thr;
    }), info);
  }
  // F-401 ひれい／おなじ（きゅうけいを ひく まえの くばりかた）
  if (!input.autoBreak) {
    const vars = it.filter((x) => !x.auto && !x.locked && !x.capped);
    const inside = vars.filter((x) => x.planned > x.min && x.planned < x.max);
    const rate = (x, m = x.planned) => m / x.weight;
    let good = true;
    for (const a of vars) for (const b of inside) {
      if (a === b) continue;
      const tol = STEP / a.weight + STEP / b.weight + EPS;
      if (inside.includes(a) && Math.abs(rate(a) - rate(b)) > tol) good = false;            // はみでない もの どうしは おなじ わりあい
      if (a.planned === a.max && rate(a) > rate(b) + tol) good = false;                    // さいだいで とめた ものは わりあいが ちいさい がわ
      if (a.planned === a.min && a.min < a.max && rate(a) < rate(b) - tol) good = false;   // さいしょうで とめた ものは わりあいが おおきい がわ
    }
    if (free.length) good = good && vars.every((x) => x.planned === x.max);
    check(`F-401 ${input.mode === 'equal' ? 'おなじ：とうぶん' : 'ひれい：きじゅん じかんの ひ'}で わけ、[さいしょう, さいだい] で クリップ`, good, info);
  }
  // F-406 ていあんを とりいれても つくれる
  for (const s of r.suggestions) check('F-406 ていあんを とりいれても タイムテーブルが できる', plan({ ...input, ...s.apply }).ok, () => short({ s: s.id, input: { ...input, catalog: undefined } }));
}

// ── replan：ミッションを はやおくりで すすめる（F-407）
let sims = 0, events = 0;
for (const input of okPlans.slice(0, Math.max(500, Math.floor(N / 2)))) {
  const opts = { allowEndExtend: rng.chance(0.5), shrink: rng.chance(0.3) ? 'reward' : 'others' };
  let t = deepFreeze(plan({ ...input, ...opts }));
  const E0 = t.end, cap = t.rewardCap;
  const lockedPlan = new Map(t.items.filter((x) => x.locked).map((x) => [x.src, x.planned]));
  let endExt = 0, i = 0, guard = 0, laters = 0;
  let order = t.items.filter((x) => !x.auto).map((x) => x.src);
  sims++;
  while (i < t.items.length && guard++ < 60) {
    const cur = t.items[i];
    const roll = rng();
    let next = null, kind = null, at = null;
    if (roll < 0.4 && i < t.items.length - 1) {
      at = cur.start + rng() * (cur.end - cur.start) * 0.999;
      const choice = rng.pick(earlyChoices(t, i, at));
      next = replan(t, { type: 'early', index: i, at, choice }); kind = 'early';
      check('F-407 はやく おわった：えらべる ものは かならず うけつける', next.ok, () => short({ choice, at, items: table(t) }));
    } else if (roll < 0.62) {
      const ext = replan(t, { type: 'extend', index: i }, opts);
      kind = 'extend';
      if (ext.ok) {
        // ちぢめる じゅん（4.3-8・9.2-4）：さきの だんに ちぢめられる ものが ない ときだけ つぎの だんへ
        const tiers = opts.shrink === 'reward' ? [['reward'], ['life', 'rest'], ['focus']] : [['life', 'rest'], ['focus'], ['reward']];
        const donor = ext.items.findIndex((x, j) => j > i && x.planned < t.items[j].planned);
        const can = (kinds) => t.items.some((x, j) => j > i && !x.locked && x.auto !== 'break' && x.auto !== 'rest' && kinds.includes(x.kind) && x.planned - x.min >= STEP);
        const tier = tiers.findIndex((ks) => ks.includes(ext.items[donor]?.kind));
        check('F-407 もうすこし：ちぢめる じゅん（しゅうちゅう いがい → しゅうちゅう → ごほうび／ほごしゃモードで ごほうびから）', donor > i && tier >= 0 && tiers.slice(0, tier).every((ks) => !can(ks)), () => short({ opts, before: t.items.map((x) => [x.panel, x.planned]), after: ext.items.map((x) => [x.panel, x.planned]) }));
        next = ext;
      } else if (ext.reason === 'no_room') {
        const room = t.items.some((x, j) => j > i && !x.locked && x.auto !== 'break' && x.auto !== 'rest' && x.planned - x.min >= STEP);
        check('F-407 4.3-8 ちぢめられない のは うしろが すべて さいしょう・こてい のとき だけ', !room, () => short(t.items));
        if (opts.allowEndExtend) { next = replan(t, ext.fixes[0].event, opts); kind = 'extendEnd'; check('F-407 4.3-8 おわりを のばす ていあんを とりいれられる', next.ok, () => short(next)); }
      } else {
        check('F-407 もうすこし が できない りゆう', ext.reason === 'limit' ? (cur.extended || 0) >= EXTEND_MAX : ['not_extendable', 'cap'].includes(ext.reason), () => short(ext));
      }
    } else if (roll < 0.72 && !cur.auto) {
      // できた！が おそかった（F-505 の「のこり −3ふん」の あと）
      at = cur.end + rng() * 25;
      next = replan(t, { type: 'late', index: i, at }, opts); kind = 'late';
      check('F-407 おそく おわった：いつでも うけつける', next.ok, () => short(next));
    } else if (roll < 0.76 && !cur.auto && i < t.items.length - 1 && laters < 3) {
      // あとで（F-508）：いまの パネルを さいごへ
      at = cur.start + rng() * (cur.end - cur.start) * 0.999;
      next = replan(t, { type: 'later', index: i, at }, opts); kind = 'later'; laters++;
      check('F-508 あとで：うけつける', next.ok, () => short(next));
      if (next.ok) order = [...order.filter((x) => x !== cur.src), cur.src];
    } else if (roll < 0.8) {
      next = replan(t, { type: 'extendEnd', index: i, force: true }, opts); kind = 'extendEnd';
      if (!next.ok) { check('F-605 じかんぎれの えんちょうが できない のは ごほうびの じょうげん だけ', next.reason === 'cap' && cur.capped, () => short(next)); next = null; }
    } else { i++; continue; }

    if (!next || !next.ok) { if (!next) i++; continue; }
    events++;
    collect(next);
    if (kind === 'extendEnd') endExt++;
    const it = next.items;
    const first = i + 1;                                                  // これからの パネルの さいしょ
    const frac = ['early', 'late', 'later'].includes(kind) ? first : -1;  // はじまりに はしたが ある パネル
    const info = () => short({ kind, at, i, before: table(t), after: table(next), over: next.over });
    check('F-407 F-402 ごうけい いっち：くぎりが つながり、おわりの じこくは のばした ぶん だけ うごく',
      it[0].start === t.start && it.every((x, j) => j === 0 || near(x.start, it[j - 1].end)) && near(it[it.length - 1].end, next.end + next.over) && next.end === E0 + endExt * 5 && next.total === next.end - next.start, info);
    check('F-407 4.3-8 おわりを こえる（over）のは うしろが すべて さいしょう・こてい のとき だけ',
      next.over >= 0 && (next.over === 0 || !it.some((x, j) => j >= first && !x.locked && x.auto !== 'break' && x.auto !== 'rest' && x.planned - x.min >= STEP)), info);
    check('F-407 F-402 これからの くぎりは 5ふん きざみ（はやく・おそく はじまった つぎの パネルの はじまり だけ はした）',
      it.every((x, j) => j < first || (onGrid(x.end) && onGrid(x.planned) && (onGrid(x.start) || j === frac))) && it.every((x, j) => j < first || x.end - x.start >= x.planned - EPS && x.end - x.start < x.planned + STEP), info);
    check('F-407 F-403 これからの パネルも さいしょう・さいだいを まもる', it.every((x, j) => j < first || x.extended || x.overtime || (x.auto === 'break' ? x.planned === 5 : x.auto === 'rest' ? x.planned <= REST_MAX : x.auto === 'free' ? x.planned >= STEP : x.planned >= x.min && x.planned <= x.max)), info);
    check('F-407 F-403 ごほうびの じょうげんを まもる', sum(it.filter((x) => x.capped), (x) => x.planned) <= cap, info);
    check('F-407 F-403 こていの ふへん（もうすこし・じかんぎれの えんちょう を した パネル いがい）', it.filter((x) => x.locked && !x.extended && !x.overtime).every((x) => lockedPlan.get(x.src) === x.planned), info);
    check(`F-407 もうすこし は 1つの パネルに ${EXTEND_MAX}かい まで`, it.every((x) => (x.extended || 0) <= EXTEND_MAX), info);
    check('9.1 F-407 ならびじゅんは かわらない（あとで に した パネルだけ さいごへ）', it.filter((x) => !x.auto).map((x) => x.src).join() === order.join(), info);
    t = deepFreeze(next);
    if (kind === 'early' || kind === 'late' || kind === 'later') i++;
  }
}

// ─────────────────────────────────────────────
// 3. ふりがな

for (const p of PANELS) texts.push(p.obj, p.verb);
// テーマ（ブリーフィング・アナウンス）・テンプレ・しゅるい・どうする の もじも（N-12 の データ）
const strings = (o) => (typeof o === 'string' ? [o] : o && typeof o === 'object' ? Object.values(o).flatMap(strings) : []);
texts.push(...strings(THEMES).filter((s) => !s.startsWith('#')), ...strings(TEMPLATES), ...strings(KINDS), ...VERBS);
const bad = [...new Set(texts.filter((s) => s != null && bareKanji(s)))];
check('ふりがな：UI に だす 漢字には すべて {漢字|かな} が ついている（パネル・おしらせ・ていあん・なおしかた）', !bad.length, () => bad.slice(0, 10));
check('ふりがな：けんさした もじの かず', texts.length > 100, texts.length);

// ─────────────────────────────────────────────
let fail = 0;
for (const [name, r] of results) {
  if (r.fail) { fail += r.fail; console.log(`✗ ${name}  ${r.fail}/${r.pass + r.fail}`); for (const e of r.ex) console.log('    ' + (typeof e === 'string' ? e : short(e))); }
  else console.log(`✓ ${name}${r.pass > 1 ? `  (${r.pass})` : ''}`);
}
console.log(`\nらんすう ${N} けん（シード ${SEED}）：${Object.entries(reasons).map(([k, v]) => `${k} ${v}`).join(' / ')}　ミッション ${sims} かい・できごと ${events} かい`);
if (fail) { console.log(`✗ ${fail} けん`); process.exit(1); } else console.log('✓ スケジューラ けんさ OK');
