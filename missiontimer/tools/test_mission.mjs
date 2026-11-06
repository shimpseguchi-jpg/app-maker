// ミッションの じょうたいきかいの けんさ（REQUIREMENTS.md N-08・F-505〜F-510・F-605・F-701）
//   node missiontimer/tools/test_mission.mjs
// じこくを すすめながら、じどうで つぎへ・できた！・はやく／おそく おわった・もうすこし・あとで・いちじていし・
// スリープからの ふっき・じかんぎれの えんちょう・スター を たしかめる
import { plan, minText } from '../js/engine/schedule.js';
import * as M from '../js/engine/mission.js';
import { makeRng } from '../../js/util.js';

const results = [];
const check = (name, cond, info) => { results.push({ name, ok: !!cond, info }); };
const deepFreeze = (o) => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); Object.values(o).forEach(deepFreeze); } return o; };
const DAY = new Date(2026, 10, 6).getTime();               // 2026-11-06 0:00（ローカル）
const at = (h, mi, s = 0) => DAY + ((h * 60 + mi) * 60 + s) * 1000;
const EX = [{ panel: 'book' }, { panel: 'print', qty: 1 }, { panel: 'game' }];   // 3.2 の れい
const TT = plan({ start: 17 * 60, end: 18 * 60, items: EX, grade: 2, autoBreak: false });   // 本 17:00-17:20 / プリント -17:35 / ゲーム -18:00

function run(m, from, to, step = 1000) {        // from〜to を step ごとに tick
  const events = [];
  for (let now = from; now <= to; now += step) { const r = M.tick(m, now); deepFreeze(r.m); m = r.m; events.push(...r.events.map((e) => ({ ...e, now }))); }
  return { m, events };
}
const start = (now = at(16, 58)) => { const m0 = deepFreeze(M.createMission(TT, { now, theme: 'detective' })); return deepFreeze(M.startMission(m0, now).m); };
const names = (m) => m.tt.items.map((it) => `${it.panel}:${it.state}`).join(' ');

// F-303 ミッション文
{
  const t = (p) => M.missionText(TT.items.find((x) => x.panel === p), minText);
  const bath = plan({ start: 1140, end: 1200, items: [{ panel: 'bath' }, { panel: 'rest' }] }).items;
  check('F-303 ミッション文（もの＋どうする・すうりょう・じかん・じょし）',
    t('print') === 'プリントを 1まい {終|お}わらせること' && t('book') === '{本|ほん}を 20ぷん {読|よ}むこと' && t('game') === 'ゲームを 25ふん {楽|たの}しむこと'
    && M.missionText(bath[0], minText) === 'お{風呂|ふろ}に {入|はい}ること' && M.missionText(bath[1], minText).endsWith('{休|やす}むこと') && !M.missionText(bath[1], minText).includes('{休憩|きゅうけい}'),
    [t('print'), t('book'), t('game'), M.missionText(bath[0], minText), M.missionText(bath[1], minText)]);
}

// 1. じかんどおり：本（じかんで おわる）→ プリント（できた！）→ ゲーム → だっしゅつ せいこう
{
  let m = start();
  check('F-204 はじまりより はやく かいし すると さいしょの パネルが はやく はじまる', m.tt.items[0].start === 16 * 60 + 58 && m.tt.items[0].end === 17 * 60 + 20, m.tt.items[0]);
  let r = run(m, at(16, 58), at(17, 20, 5));
  m = r.m;
  const ms = r.events.filter((e) => e.type === 'milestone').map((e) => e.kind);
  check('F-505 じかんで おわる パネルは じかんが きたら じどうで つぎへ', M.current(m).panel === 'print' && m.tt.items[0].state === 'done' && m.tt.items[0].doneAt === 17 * 60 + 20, names(m));
  check('F-507 ふしめ：ながさ 15ふん いじょうの パネルは のこり 5ふん と 1ぷん', ms.join() === 'i5,i1', ms);
  const early = M.finishItem(m, at(17, 22), { uid: M.current(m).uid });
  check('F-505 できた！は さいしょう じかん（プリント 5ふん）を すぎるまで おせない', early.error === 'too_early' && Math.abs(early.wait - 3) < 1e-6 && Math.abs(M.doneWait(m, at(17, 22)) - 3) < 1e-6, early);
  const ask = M.finishItem(m, at(17, 28), { uid: M.current(m).uid });
  check('F-407 はやく おわった ときは えらびかたを きく', ask.needChoice && ask.choices.join() === 'next,reward,rest' && ask.m === m, ask);
  const done = M.finishItem(m, at(17, 28), { uid: M.current(m).uid, choice: 'reward' });
  m = deepFreeze(done.m);
  check('F-407 さいごの ごほうびに たす（ゲーム 25 → 30ぷん）', M.current(m).panel === 'game' && M.current(m).planned === 30 && M.current(m).start === 17 * 60 + 28, M.current(m));
  check('F-506 できた！で カギが 1つ ふえる', M.keysOf(m) === 2 && done.events.some((e) => e.type === 'complete' && e.key), done.events);
  check('F-506 おなじ パネルを 2かい おしても にじゅうに すすまない', M.finishItem(m, at(17, 28, 1), { uid: m.tt.items[1].uid }).error === 'stale');
  r = run(m, at(17, 28), at(18, 0, 2), 2000);
  m = r.m;
  check('F-604 さいごの パネルが おわると だっしゅつ せいこう', m.state === 'finished' && m.result.reason === 'success' && m.result.keys === 3 && m.result.total === 3, m.result);
  // スター：本 20ぷん＝4、プリント 15ふん＝3＋じかんない 1、ゲーム 30ぷん＝6
  check('F-701 スター：5ふん ＝ 1、できた！パネルを じかんない に おえると +1', m.result.stars === 14 && m.tt.items.map((x) => x.star).join() === '4,4,6', m.tt.items.map((x) => x.star));
  check('F-703 きろく：しゅうちゅうの じかん（本 22＋プリント 8）・ごほうびの じかん（ゲーム 32）', m.result.focusMin === 30 && m.result.rewardMin === 32, m.result);
  const tot = r.events.filter((e) => e.type === 'milestone' && e.kind.startsWith('t')).map((e) => e.kind).join();
  check('F-507 ぜんたいの のこり 10・5・1ぷん', tot === 't10,t5,t1', tot);
}

// 2. できた！が おくれた → うしろが ちぢむ。おわりを すぎても のこれば 5ふんの えんちょうを 1かい → きょうは ここまで（F-605）
{
  let m = run(start(), at(16, 58), at(17, 40)).m;
  check('F-505 できた！パネルは じかんを すぎても とまらず まつ（のこり −5ふん）', M.current(m).panel === 'print' && Math.abs(M.remaining(m, at(17, 40)).item + 5) < 1e-6, M.remaining(m, at(17, 40)));
  const late = M.finishItem(m, at(17, 43), { uid: M.current(m).uid });
  check('F-407 おそく おわった ぶん うしろを ちぢめる（ゲーム 25 → 15ふん）', late.m.tt.items[2].planned === 15 && late.m.tt.items[2].end === 18 * 60, late.m.tt.items[2]);
  check('F-701 おくれても スターは へらない（ボーナス なし・3）', late.m.tt.items[1].star === 3, late.m.tt.items[1]);
  m = run(start(), at(16, 58), at(18, 0, 0)).m;
  check('F-605 おわりの じこくに のこって いれば えんちょう ミッション（おわり 18:05）', m.state === 'running' && m.tt.end === 18 * 60 + 5 && m.overtimeUsed, { end: m.tt.end, state: m.state });
  const r = run(m, at(18, 0, 1), at(18, 5, 1));
  m = r.m;
  check('F-605 えんちょうでも のこれば「きょうは ここまで」。おえた パネルの カギと スターは のこる', m.state === 'finished' && m.result.reason === 'timeup' && m.result.keys === 1 && m.result.stars === 4, m.result);
}

// 3. スリープ・バックグラウンドからの ふっき（F-510・N-04）
{
  let m = run(start(), at(16, 58), at(17, 1)).m;
  const r = M.tick(m, at(17, 50));
  check('F-510 ふっきすると ぜったい じこくから ただしい いちに すすむ', M.current(r.m).panel === 'print' && r.m.tt.items[0].state === 'done', names(r.m));
  const ms = r.events.filter((e) => e.type === 'milestone');
  check('F-510 ふっきの ときの ふしめは おとを ならさない（silent）', ms.length > 0 && ms.every((e) => e.silent), ms);
}

// 4. いちじていし：とまって いた ぶん おわりも うしろへ
{
  let m = run(start(), at(16, 58), at(17, 5)).m;
  m = deepFreeze(M.pause(m, at(17, 5)));
  const frozen = M.remaining(m, at(17, 14)).item;
  m = deepFreeze(M.resume(m, at(17, 15)));
  check('F-508 いちじていし中は のこりが へらない', Math.abs(frozen - 15) < 1e-6, frozen);
  check('F-508 さいかい すると とまっていた 10ぷん だけ うしろへ（本の おわり 17:30）', Math.abs(M.msOf(m, m.tt.items[0].end) - at(17, 30)) < 1 && M.current(M.tick(m, at(17, 29)).m).panel === 'book' && M.current(M.tick(m, at(17, 30, 1)).m).panel === 'print', m.offset);
}

// 5. もうすこし・あとで・おわる
{
  let m = run(start(), at(16, 58), at(17, 25)).m;          // プリント中
  const e1 = M.extendItem(m, at(17, 25));
  check('F-407 もうすこし（+5ふん）：プリント 15 → 20、ゲーム 25 → 20', e1.m.tt.items[1].planned === 20 && e1.m.tt.items[2].planned === 20, e1.m.tt.items.map((x) => x.planned));
  const lt = M.laterItem(m, at(17, 25));
  check('F-508 あとで：プリントを さいごへ。つぎは ゲーム、カギの かずは かわらない', M.current(lt.m).panel === 'game' && lt.m.tt.items[lt.m.tt.items.length - 1].panel === 'print' && M.totalKeysOf(lt.m) === 3 && lt.m.tt.items[1].state === 'skipped', names(lt.m));
  const q = M.quit(m, at(17, 26));
  check('F-508 おわる：けっかを のこして おわる', q.m.state === 'finished' && q.m.result.reason === 'quit' && q.m.result.keys === 1, q.m.result);
}

// 6.「◯ぷんかん」（relative）：ブリーフィングの あと はじめた ときから はかり、ぴったり ◯ぷんで おわる
{
  const tt = plan({ start: 0, end: 60, items: EX, grade: 2, autoBreak: false });
  let m = deepFreeze(M.createMission(tt, { now: at(16, 57, 23), theme: 'magic', relative: true }));
  const t0 = at(16, 57, 41);                                                   // ブリーフィングに 18びょう
  m = deepFreeze(M.startMission(m, t0).m);
  check('F-203 ◯ぷんかん：はじめた しゅんかんが 0ぷん（ブリーフィングは ふくめない）', Math.abs(M.minuteOf(m, t0)) < 1e-9 && m.tt.items[0].start === 0 && m.tt.items[2].end === 60, { min: M.minuteOf(m, t0) });
  // 本（〜20ぷん）は じどう、プリント（〜35ぷん）は 35ぷんで できた！、ゲーム（〜60ぷん）は じどう → ちょうど 60ぷんで せいこう
  let a = run(m, t0, t0 + 35 * 60000, 2000).m;
  a = deepFreeze(M.finishItem(a, t0 + 35 * 60000, { uid: M.current(a).uid }).m);
  const r = run(a, t0 + 35 * 60000 + 1000, t0 + 61 * 60000, 1000);
  const fin = r.events.find((e) => e.type === 'finish');
  check('F-203 ◯ぷんかん：60ぷんかんの ミッションは はじめて 60ぷんで おわる', r.m.result?.reason === 'success' && fin && fin.now >= t0 + 60 * 60000 && fin.now <= t0 + 60 * 60000 + 1000, { result: r.m.result, at: fin && (fin.now - t0) / 60000 });
  const g = run(m, t0, t0 + 20 * 60000 + 1000, 1000).m;
  check('F-203 ◯ぷんかん：本（20ぷん）は はじめて 20ぷんで おわる', M.current(g).panel === 'print' && g.tt.items[0].doneAt === 20, names(g));
  const p = M.resume(M.pause(g, t0 + 21 * 60000), t0 + 31 * 60000);
  check('F-508 ◯ぷんかん：いちじていし した 10ぷんは のこりから へらない', Math.abs(M.remaining(p, t0 + 31 * 60000).total - 39) < 1e-6, M.remaining(p, t0 + 31 * 60000));
}

// 7. らんすう：いろいろな ミッションを さいごまで すすめても こわれない
{
  const rng = makeRng(7);
  const pool = ['homework', 'print', 'drill', 'kanji', 'calc', 'book', 'tidy', 'bath', 'teeth', 'game', 'video', 'outside', 'free', 'rest'];
  let bad = 0, finished = 0;
  for (let k = 0; k < 400; k++) {
    const S = 16 * 60 + rng.int(0, 12) * 5, T = rng.int(4, 24) * 5;
    const tt = plan({ start: S, end: S + T, items: Array.from({ length: rng.int(1, 6) }, () => ({ panel: rng.pick(pool) })), grade: rng.int(1, 6), mode: rng.chance(0.5) ? 'ratio' : 'equal', allowEndExtend: rng.chance(0.5) });
    if (!tt.ok) continue;
    let now = DAY + (S - rng.int(0, 4)) * 60000;
    let m = M.startMission(M.createMission(tt, { now, theme: 'space' }), now).m;
    for (let g = 0; g < 3000 && m.state !== 'finished'; g++) {
      now += rng.int(5, 90) * 1000;
      const roll = rng();
      if (roll < 0.01) { m = M.pause(m, now); now += rng.int(10, 300) * 1000; m = M.resume(m, now); }
      else if (roll < 0.02) m = M.extendItem(m, now).m;
      else if (roll < 0.025) m = M.laterItem(m, now).m;
      else if (roll < 0.08) { const r = M.finishItem(m, now, { uid: M.current(m)?.uid }); m = r.needChoice ? M.finishItem(m, now, { uid: M.current(m).uid, choice: rng.pick(r.choices) }).m : r.m; }
      if (m.state !== 'finished') m = M.tick(m, now).m;
      const items = m.tt.items;
      if (!items.every((it, j) => j === 0 || Math.abs(it.start - items[j - 1].end) < 1e-6)) bad++;
      if (m.state === 'running' && (!M.current(m) || M.current(m).state !== 'active')) bad++;
    }
    if (m.state === 'finished') finished++;
    if (m.state === 'finished' && (m.result.stars > M.STAR_CAP || m.result.keys > m.result.total)) bad++;
  }
  check('F-510 N-07 らんすうの ミッション 400かい：タイムテーブルが つながり、いまの パネルが ある', bad === 0, bad);
  check('F-604 F-605 らんすうの ミッションは かならず おわる（せいこう／ここまで）', finished > 300, finished);
}

let fail = 0;
for (const r of results) { if (r.ok) console.log('✓ ' + r.name); else { fail++; console.log('✗ ' + r.name + '\n    ' + JSON.stringify(r.info).slice(0, 500)); } }
if (fail) { console.log(`✗ ${fail} けん`); process.exit(1); } else console.log('✓ ミッション けんさ OK');
