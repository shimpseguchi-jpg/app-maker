// ミッションの じょうたいきかい（REQUIREMENTS.md 5.5・F-505〜F-510・F-605・F-701・N-04・N-07）
//
// DOM に さわらない じゅんすいな かんすう。いまの じこく now（ms）を ひきすうで うけとり、あたらしい じょうたいと できごとを かえす。
// tools/test_mission.mjs で じこくを すすめて けんさ する。タイマーは setInterval の かぞえあげ ではなく now から もとめる（F-510・N-04）。
//
// じこく：タイムテーブル（engine/schedule.js）は「その日の 0:00 からの 分」。ミッションは base（その日の 0:00 の ms）と
// offset（いちじていしで とまっていた ms の ごうけい）を もち、ミッションの とけい mm = (now − base − offset) / 60000 で くらべる。
// いちじていしは おわりの じこくも おなじだけ うしろへ ずらす（タイムテーブルは 5ふん きざみの まま）。
//
// m = { v, id, theme, base, offset, pausedAt, state: 'ready'|'running'|'paused'|'finished',
//       tt（タイムテーブル。items[] に uid・state・doneAt・star を たす）, cursor, announced[], lastTick, overtimeUsed,
//       startedAt, result: null | { reason: 'success'|'timeup'|'quit', at, keys, total, stars, focusMin, rewardMin } }
//
// できごと（events[]）：{ type: 'complete', uid, star, key, auto } | { type: 'milestone', key, kind: 't10'|'t5'|'t1'|'i5'|'i1', uid, silent }
//   | { type: 'overtime' } | { type: 'finish', reason } | { type: 'next', uid }

import { replan, earlyChoices, STEP } from './schedule.js';

export const STAR_PER = 5;        // F-701・9.2 の 3：5ふん ＝ スター 1（仮）
export const STAR_CAP = 30;       // F-701 1ミッションの じょうげん（仮）
export const SILENT_GAP = 5000;   // F-510 これより あいだが あいたら（スリープ・バックグラウンド）ふしめの おとを ならさない
const EPS = 1e-6;
const MIN = 60000;

export const isAutoItem = (it) => !!it.auto;
const isPanel = (it) => !it.auto;                                    // こどもが ならべた パネル（カギが もらえる）
const clone = (m) => ({ ...m, tt: { ...m.tt, items: m.tt.items.map((it) => ({ ...it })) }, announced: [...m.announced] });

export function localMidnight(ms) { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); }
export function minuteOf(m, now) { const t = m.state === 'paused' ? m.pausedAt : now; return (t - m.base - m.offset) / MIN; }
export function msOf(m, minute) { return m.base + m.offset + minute * MIN; }        // ミッションの とけいの 分 → ほんとうの じこく（ms）

let uidSeq = 1;
const newUid = () => 'it' + Date.now().toString(36) + (uidSeq++).toString(36);
function ensureUids(items) {
  const seen = new Set();
  for (const it of items) { if (!it.uid || seen.has(it.uid)) it.uid = newUid(); seen.add(it.uid); if (!it.state) it.state = 'todo'; }
  return items;
}

// F-303 ミッション文：「プリントを 1まい おわらせること」「{本|ほん}を 15ふん よむこと」
export function missionText(it, minText) {
  const part = it.particle ?? (it.auto ? '' : 'を');
  const obj = part === '' ? '' : `${it.obj}${part} `;
  const qty = it.unit && it.qty ? `${it.qty}${it.unit} ` : '';
  const len = it.finish === 'timed' && !qty ? `${minText(it.planned)} ` : '';
  return `${obj}${qty}${len}${it.verb}こと`;
}

// ── はじめる
// tt は plan() の けっか。theme は テーマの id
export function createMission(tt, { now, theme, id }) {
  const items = ensureUids(tt.items.map((it) => ({ ...it, state: 'todo', doneAt: null, star: 0 })));
  return {
    v: 1, id: id || 'm_' + now.toString(36), theme, base: localMidnight(now), offset: 0, pausedAt: null, state: 'ready',
    tt: { ...tt, items }, cursor: 0, announced: [], lastTick: null, overtimeUsed: false, startedAt: null, result: null,
  };
}

// ブリーフィングの あとに よぶ。はじまりより はやければ、さいしょの パネルが はやく はじまる（はした。F-204・4.3-8 と おなじ かんがえかた）
export function startMission(m0, now) {
  const m = clone(m0);
  const t = minuteOf(m, now);
  const first = m.tt.items[0];
  if (t < first.start) first.start = t;
  first.state = 'active';
  m.state = 'running'; m.startedAt = now; m.lastTick = now;
  return { m, events: [{ type: 'next', uid: first.uid }] };
}

export const current = (m) => m.tt.items[m.cursor] || null;
export const nextPanel = (m) => m.tt.items.slice(m.cursor + 1).find((it) => it.auto !== 'skipped') || null;
export const keysOf = (m) => m.tt.items.filter((it) => isPanel(it) && it.state === 'done').length;
export const totalKeysOf = (m) => new Set(m.tt.items.filter((it) => isPanel(it)).map((it) => it.uid)).size;

// のこり（分）。いまの パネル と ぜんたい
export function remaining(m, now) {
  const t = minuteOf(m, now), cur = current(m);
  return { item: cur ? cur.end - t : 0, total: m.tt.end - t, t, elapsed: cur ? t - cur.start : 0 };
}

// F-505「できた！」が おせるまでの のこり（分）。できた！で おわる パネルは さいしょう じかんを すぎてから
export function doneWait(m, now) {
  const cur = current(m);
  if (!cur || cur.finish !== 'done' || cur.auto) return 0;
  return Math.max(0, Math.min(cur.min, cur.planned) - (minuteOf(m, now) - cur.start));
}

function starOf(it, onTime) {
  if (!isPanel(it)) return 0;
  let s = Math.floor(it.planned / STAR_PER);
  if (it.finish === 'done' && onTime) s += 1;                           // F-701 できた！パネルを じかん ない に おえると +1
  return Math.max(1, s);
}

function complete(m, at, auto, events, onTime = true) {
  const it = m.tt.items[m.cursor];
  it.state = 'done'; it.doneAt = at;
  const used = m.tt.items.reduce((s, x) => s + (x.star || 0), 0);
  it.star = Math.min(starOf(it, onTime), Math.max(0, STAR_CAP - used));
  events.push({ type: 'complete', uid: it.uid, star: it.star, key: isPanel(it), auto });
  advance(m, events);
}

function advance(m, events) {
  m.cursor++;
  while (m.cursor < m.tt.items.length && m.tt.items[m.cursor].auto === 'skipped') m.cursor++;
  const nx = m.tt.items[m.cursor];
  if (nx) { nx.state = 'active'; events.push({ type: 'next', uid: nx.uid }); }
}

function finishWith(m, now, reason, events) {
  const items = m.tt.items;
  const at = minuteOf(m, now);
  const cur = items[m.cursor];
  if (cur && cur.state === 'active' && reason !== 'success') cur.state = 'todo';
  const doneIt = items.filter((it) => isPanel(it) && it.state === 'done');
  const dur = (it) => Math.max(0, it.doneAt - it.start);
  m.result = {
    reason, at: now, keys: doneIt.length, total: totalKeysOf(m), stars: items.reduce((s, it) => s + (it.star || 0), 0),
    clearMin: Math.round(at - items[0].start), focusMin: Math.round(doneIt.filter((it) => it.kind === 'focus').reduce((s, it) => s + dur(it), 0)),
    rewardMin: Math.round(doneIt.filter((it) => it.capped).reduce((s, it) => s + dur(it), 0)),
    panels: doneIt.map((it) => it.panel),
  };
  m.state = 'finished';
  events.push({ type: 'finish', reason });
}

// ── じかんを すすめる（えがく たびに よんで よい）
export function tick(m0, now) {
  if (m0.state !== 'running') return { m: m0, events: [] };
  const m = clone(m0);
  const events = [];
  const silent = m.lastTick != null && now - m.lastTick > SILENT_GAP;
  const t = minuteOf(m, now);
  for (let guard = 0; guard < 200; guard++) {
    const cur = current(m);
    if (!cur) { finishWith(m, now, 'success', events); break; }
    // じかんで おわる パネル・きゅうけい・じゆうじかん は じかんが きたら じどうで つぎへ（F-505）
    if ((cur.finish === 'timed' || cur.auto) && t >= cur.end - EPS) { complete(m, cur.end, true, events); continue; }
    // おわりの じこく（F-605）：のこって いれば 1かいだけ 5ふんの えんちょう、それでも のこれば「きょうは ここまで」
    if (t >= m.tt.end - EPS) {
      if (!m.overtimeUsed) {
        const r = replan(m.tt, { type: 'extendEnd', index: m.cursor, force: true });
        m.overtimeUsed = true;
        if (r.ok) { m.tt = { ...r, items: ensureUids(r.items) }; events.push({ type: 'overtime' }); continue; }
      }
      finishWith(m, now, 'timeup', events);
      break;
    }
    break;
  }
  if (m.state === 'running') milestones(m, t, silent, events);
  m.lastTick = now;
  return { m, events };
}

// F-507 ふしめ：パネルごとの のこり 5ふん（ながさ 15ふん いじょう）と 1ぷん、ぜんたいの のこり 10・5・1ぷん
function milestones(m, t, silent, events) {
  const cur = current(m);
  const marks = [];
  if (cur && !cur.auto) {
    const left = cur.end - t;
    if (cur.planned >= 15 && left <= 5 && left > 1) marks.push(['i5', `${cur.uid}:5`]);
    if (left <= 1 && left > 0) marks.push(['i1', `${cur.uid}:1`]);
  }
  const total = m.tt.end - t, T = m.tt.end - m.tt.start;
  if (T > 10 && total <= 10 && total > 5) marks.push(['t10', 't10']);
  if (T > 5 && total <= 5 && total > 1) marks.push(['t5', 't5']);
  if (total <= 1 && total > 0) marks.push(['t1', 't1']);
  for (const [kind, key] of marks) {
    if (m.announced.includes(key)) continue;
    m.announced.push(key);
    events.push({ type: 'milestone', kind, key, uid: cur?.uid, silent });
  }
}

// ── できた！（F-505・F-506）／つぎへ
// はやく おわった ときは choice が いる（choices を かえす。えらばなければ UI が 10びょうで 'next'。4.3-8）。
// uid は おした ときの パネル（あいだに じどうで すすんで いたら なにも しない）
export function finishItem(m0, now, { uid, choice } = {}) {
  const cur = current(m0);
  if (m0.state !== 'running' || !cur || (uid && cur.uid !== uid)) return { m: m0, events: [], error: 'stale' };
  const wait = doneWait(m0, now);
  if (wait > EPS) return { m: m0, events: [], error: 'too_early', wait };
  const m = clone(m0);
  const events = [];
  const t = minuteOf(m, now);
  const last = m.cursor === m.tt.items.length - 1;
  const onTime = t <= cur.end + EPS;
  if (!last && t < cur.end - EPS) {
    const choices = earlyChoices(m.tt, m.cursor, t);
    if (!choice) return { m: m0, events: [], needChoice: true, choices, spare: cur.end - t };
    const r = replan(m.tt, { type: 'early', index: m.cursor, at: t, choice: choices.includes(choice) ? choice : 'next' });
    if (!r.ok) return { m: m0, events: [], error: r.reason };
    m.tt = { ...r, items: ensureUids(r.items) };
  } else if (!last && t >= cur.end - EPS) {
    const r = replan(m.tt, { type: 'late', index: m.cursor, at: t });
    if (r.ok) m.tt = { ...r, items: ensureUids(r.items) };
  } else {
    m.tt.items[m.cursor].end = t;
  }
  complete(m, t, false, events, onTime);
  if (!current(m)) finishWith(m, now, 'success', events);
  return { m, events };
}

// ── もうすこし（+5ふん）。のばせない ときは fixes（おわりを のばす／きょうは ここまで）を かえす
export function extendItem(m0, now, { endExtend = false } = {}) {
  if (m0.state !== 'running' || !current(m0)) return { m: m0, events: [], error: 'stale' };
  const r = replan(m0.tt, { type: endExtend ? 'extendEnd' : 'extend', index: m0.cursor });
  if (!r.ok) return { m: m0, events: [], error: r.reason, fixes: r.fixes, text: r.text };
  const m = clone(m0);
  m.tt = { ...r, items: ensureUids(r.items) };
  return { m, events: [] };
}

// ── あとで（F-508）：いまの パネルを さいごへ
export function laterItem(m0, now) {
  const cur = current(m0);
  if (m0.state !== 'running' || !cur) return { m: m0, events: [], error: 'stale' };
  const r = replan(m0.tt, { type: 'later', index: m0.cursor, at: minuteOf(m0, now) });
  if (!r.ok) return { m: m0, events: [], error: r.reason, text: r.text };
  const m = clone(m0);
  r.items[m0.cursor] = { ...r.items[m0.cursor], uid: newUid(), state: 'skipped' };
  m.tt = { ...r, items: ensureUids(r.items) };
  const moved = m.tt.items[m.tt.items.length - 1];
  moved.state = 'todo';
  m.announced = m.announced.filter((k) => !k.startsWith(moved.uid + ':'));   // まわした パネルの ふしめは もう一度 ならす
  const events = [];
  advance(m, events);
  return { m, events };
}

// ── いちじていし（F-508）：とまっていた あいだ だけ ぜんぶ うしろへ ずれる
export function pause(m0, now) {
  if (m0.state !== 'running') return m0;
  return { ...clone(m0), state: 'paused', pausedAt: now };
}
export function resume(m0, now) {
  if (m0.state !== 'paused') return m0;
  const m = clone(m0);
  m.offset += now - m.pausedAt;
  m.pausedAt = null; m.state = 'running'; m.lastTick = now;
  return m;
}

// ── おわる（F-508。かくにんの あと）
export function quit(m0, now) {
  if (m0.state === 'finished') return { m: m0, events: [] };
  const m = clone(m0);
  if (m.state === 'paused') { m.offset += now - m.pausedAt; m.pausedAt = null; }
  const events = [];
  finishWith(m, now, 'quit', events);
  return { m, events };
}

// 5ふん きざみの くぎりを ほんとうの じこくで かえす（ひょうじよう）
export function wallMinute(m, minute) { return minute + m.offset / MIN; }
export { STEP };
