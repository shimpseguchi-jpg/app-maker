// おまかせスケジューラ（REQUIREMENTS.md 4.3、5.4 の F-401〜F-408）
//
// DOM に さわらない じゅんすいな かんすう だけで できている。Node で うごき、tools/test_schedule.mjs で けんさする（N-07・F-408）。
//   plan(input)                 … 4.3 の 1〜7：はじまり・おわり と わくの パネル から タイムテーブルを つくる
//   replan(timetable, event)    … 4.3 の 8：ミッション中の さいけいさん（はやく おわった／もうすこし／おわりを のばす）
//   earlyChoices(timetable, …)  … はやく おわったときに えらべる もの（F-407）
//
// じこくは「その日の 0:00 からの 分」（17:00 → 1020）。日を またぐ ときは 1440 を こえて よい。
// ぜったい じこく（ms）への おきかえは ミッションの じょうたいきかい（M2・engine/mission.js）が する。
//
// タイムテーブルの 1こ（items[]）：
//   { panel, obj, verb, emoji, kind, finish, unit, qty,
//     start, end,        … じこく（分）。これからの くぎりは 5ふん きざみ
//     planned,           … ながさ（分・5ふん きざみ）。ミッション中に はやく はじまった ぶんの はした（5ふん みまん）は ふくまない
//     locked,            … こてい（🔒・ながさを かえた パネル・ほごしゃが きめた ながさ）。おまかせは ながさを かえない
//     auto,              … false | 'break'（じどうで はさんだ きゅうけい）| 'free'（あまりの じゆうじかん）| 'rest'（ちょっと きゅうけい）
//     min, max, weight, capped, src（input.items の ばんごう。auto は -1）, key,
//     extended（もうすこし の かいすう）, overtime?（じかんぎれの えんちょうの かいすう・F-605） }

import { PANEL_BY_ID, DEFAULT_REWARD_CAP } from '../data/panels.js';

export const STEP = 5;            // F-402 5ふん きざみ
export const MIN_TOTAL = 10;      // F-203 ごうけいは 10〜180ぷん
export const MAX_TOTAL = 180;
export const BREAK_MINUTES = 5;   // F-404 じどうで はさむ きゅうけい
export const EXTEND_MINUTES = 5;  // F-407 もうすこし（+5ふん）
export const EXTEND_MAX = 2;      // F-407・F-803 もうすこし の かいすう（しょきち）
export const REST_MAX = 10;       // 4.3 の 8「ちょっと きゅうけい（d≤10 のとき）」

const EPS = 1e-6;
const BREAK_DONORS = ['reward', 'focus'];                    // 4.3 の 5：きゅうけいの 5ふんを ひく じゅん
const SHRINK_ORDER = {                                       // 4.3 の 8・9.2 の 4：もうすこし の 5ふんを ちぢめる じゅん
  others: [['life', 'rest'], ['focus'], ['reward']],         //   しょうじゅん：しゅうちゅう いがい → しゅうちゅう → ごほうび（ごほうびは さいごに まもる）
  reward: [['reward'], ['life', 'rest'], ['focus']],         //   ほごしゃモード「ごほうびから ちぢめる」
};

// ── こまごま
const sum = (arr, f = (x) => x) => arr.reduce((s, x) => s + f(x), 0);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const snap = (m) => Math.round(m / STEP) * STEP;
const floorStep = (m) => Math.floor(m / STEP + EPS) * STEP;
const ceilStep = (m) => Math.ceil(m / STEP - EPS) * STEP;
const isGrid = (m) => Number.isInteger(m) && m % STEP === 0;

// 「5ふん」「10ぷん」
export function minText(n) { return n + ([0, 1, 3, 4, 6, 8].includes(Math.abs(n) % 10) ? 'ぷん' : 'ふん'); }
// 1020 → '17:00'
export function clock(m) {
  const t = ((Math.round(m) % 1440) + 1440) % 1440;
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}
// '19:00' → 1140（かず なら そのまま）
export function parseClock(s) {
  if (typeof s === 'number') return s;
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s).trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
}
// F-404 れんぞくする しゅうちゅうの げんど：max(15, 学年×10)
export function breakThreshold(grade) { return Math.max(15, clampGrade(grade) * 10); }
const clampGrade = (g) => clamp(Math.round(Number(g) || 2), 1, 6);

const fail = (reason, text, fixes = [], extra = {}) => ({ ok: false, reason, text, fixes, ...extra });

// ─────────────────────────────────────────────
// わりふり（4.3 の 3・4）
//
// waterfill：ents = [{ w, lo, hi }]（たんいは 5ふん。せいすう）に total を おもみの ひで わける。
// [lo, hi] から はみでた ものを はしに こていし、のこりを わけなおす（4.3 の 3 の クリップと さいはいぶん）。
// はみでた そうりょうの おおきい がわを こていすると かならず しゅうそくする（いっかいに 1こ いじょう こていされるので
// さいだいでも パネルの かず だけ くりかえす）。さいごに さいだい じょうよほう で せいすうに まるめる（4.3 の 4）。
// ぶんすうは ぶんし・ぶんぼの せいすうで あつかうので、まるめの じゅんばんが ふどうしょうすうで ぶれない。
// まえじょうけん：Σlo ≤ total ≤ Σhi
function waterfill(total, ents) {
  const n = ents.length;
  const x = new Array(n).fill(null);
  let free = ents.map((_, i) => i);
  let rem = total;
  while (free.length) {
    const flat = sum(free, (i) => ents[i].w) <= 0;    // おもみが ぜんぶ 0 なら おなじに わける
    const w = (i) => (flat ? 1 : ents[i].w);
    const W = sum(free, w);
    const over = [], under = [];
    let exc = 0, def = 0;
    for (const i of free) {
      const num = w(i) * rem;                      // わりあて ＝ num / W
      if (num > ents[i].hi * W) { over.push(i); exc += num - ents[i].hi * W; }
      else if (num < ents[i].lo * W) { under.push(i); def += ents[i].lo * W - num; }
    }
    if (!over.length && !under.length) {
      // さいだい じょうよほう：きりすて、あまりの おおきい じゅん（おなじ なら まえの パネル）に 1ずつ たす
      const q = free.map((i) => ({ i, f: Math.floor((w(i) * rem) / W), r: (w(i) * rem) % W }));
      let left = rem - sum(q, (e) => e.f);
      q.sort((a, b) => b.r - a.r || a.i - b.i);
      for (const e of q) { x[e.i] = e.f + (left > 0 && e.r > 0 ? 1 : 0); if (left > 0 && e.r > 0) left--; }
      break;
    }
    const fix = exc >= def ? over.map((i) => [i, ents[i].hi]) : under.map((i) => [i, ents[i].lo]);
    for (const [i, v] of fix) { x[i] = v; rem -= v; }
    const fixed = new Set(fix.map(([i]) => i));
    free = free.filter((i) => !fixed.has(i));
  }
  return x;
}

// ごほうびの じょうげん（F-403・F-801）つきの わりふり。capped の パネルは「ひとまとまり」として
// うえの だんで ほかの パネルと いっしょに わけ（ひとまとまりの hi は じょうげん）、なかで もう一度 わける。
function allocate(total, ents, capUnits) {
  const nc = [], cp = [];
  ents.forEach((e, i) => (e.capped ? cp : nc).push(i));
  const top = nc.map((i) => ents[i]);
  if (cp.length) {
    top.push({ w: sum(cp, (i) => ents[i].w), lo: sum(cp, (i) => ents[i].lo), hi: Math.min(sum(cp, (i) => ents[i].hi), capUnits) });
  }
  const xs = waterfill(total, top);
  const out = new Array(ents.length);
  nc.forEach((i, k) => { out[i] = xs[k]; });
  if (cp.length) {
    const ys = waterfill(xs[top.length - 1], cp.map((i) => ents[i]));
    cp.forEach((i, k) => { out[i] = ys[k]; });
  }
  return out;
}

// ─────────────────────────────────────────────
// にゅうりょくの せいり

function config(input) {
  return {
    grade: clampGrade(input.grade),
    mode: input.mode === 'equal' ? 'equal' : 'ratio',                            // F-401
    cap: Math.max(0, floorStep(input.rewardCap ?? DEFAULT_REWARD_CAP)),          // F-801（よびだしがわが きょうの のこりと 1ミッションの じょうげんの ちいさい ほうを わたす）
    autoBreak: input.autoBreak !== false,                                         // F-404（はさんだ きゅうけいを はずすと false）
    catalog: input.catalog || PANEL_BY_ID,
    extendMax: input.extendMax ?? EXTEND_MAX,                                     // F-803
    allowEndExtend: !!input.allowEndExtend,                                       // F-803
    shrink: input.shrink === 'reward' ? 'reward' : 'others',                      // 9.2 の 4
  };
}

function resolvePanel(ref, catalog) {
  if (ref && typeof ref === 'object') return ref;    // じさく パネル（F-305）は オブジェクトで わたせる
  return catalog[ref] || null;
}

// わくの 1こ → けいさんよう。ながさは ぜんぶ 分（5ふん きざみ）
function entryOf(item, src, cfg) {
  const p = resolvePanel(item.panel, cfg.catalog);
  if (!p || !p.id) return null;
  const min = Math.max(STEP, snap(p.min ?? STEP));
  const max = Math.max(min, snap(p.max ?? min));
  let qty = null;
  if (p.unit) {                                       // F-304 すうりょう 1〜5。すうりょうの ある パネルは きじゅん・さいしょう・さいだい が すうりょう ばい
    if (item.qty == null) qty = p.unitOptional ? null : 1;
    else qty = clamp(Math.round(item.qty), 1, 5);
  }
  const f = qty || 1;
  const base = clamp(snap(p.byGrade ? cfg.grade * p.byGrade : (p.base ?? min)), min, max) * f;
  const lo = min * f;
  const hi = p.capped ? Math.min(max * f, cfg.cap) : max * f;
  // 4.3 の 2：こてい。🔒・ながさを かえた パネル（F-307：minutes が あれば こてい あつかい）・ほごしゃが きめた ながさ（じかんで おわる パネル）
  let locked = false, minutes = null;
  if (item.locked || item.minutes != null) { locked = true; minutes = item.minutes ?? base; }
  else if (p.fixed != null && p.finish === 'timed') { locked = true; minutes = p.fixed; }
  if (locked) minutes = clamp(snap(minutes), lo, Math.max(lo, hi));
  return { src, key: item.key, p, kind: p.kind, lo, hi, w: cfg.mode === 'equal' ? 1 : base, qty, capped: !!p.capped, locked, minutes };
}

function itemOf(e) {
  const p = e.p;
  return {
    panel: p.id, obj: p.obj, verb: p.verb, emoji: p.emoji, kind: p.kind, finish: p.finish, unit: p.unit || null, qty: e.qty,
    start: 0, end: 0, planned: e.minutes, locked: e.locked, auto: false,
    min: e.lo, max: e.hi, weight: e.w, capped: e.capped, src: e.src, ...(e.key != null ? { key: e.key } : {}), extended: 0,
  };
}

function autoItem(id, auto, planned, min, max, catalog) {
  const p = catalog[id] || PANEL_BY_ID[id];
  return {
    panel: p.id, obj: p.obj, verb: p.verb, emoji: p.emoji, kind: p.kind, finish: 'timed', unit: null, qty: null,
    start: 0, end: 0, planned, locked: false, auto, min, max, weight: 0, capped: false, src: -1, extended: 0,
  };
}
const breakItem = (catalog) => autoItem('rest', 'break', BREAK_MINUTES, BREAK_MINUTES, BREAK_MINUTES, catalog);
const freeItem = (minutes, catalog) => autoItem('free', 'free', minutes, STEP, MAX_TOTAL, catalog);

function layout(items, from, startAt, cursor) {
  for (let j = from; j < items.length; j++) {
    items[j].start = j === from ? startAt : cursor;
    items[j].end = cursor + items[j].planned;
    cursor = items[j].end;
  }
  return cursor;
}

// ─────────────────────────────────────────────
// 4.3 の 5：きゅうけいを はさむ（F-404）
// ならびじゅんに みて、れんぞくする しゅうちゅうの ごうけいが げんどを こえる パネルの まえに 5ふんの きゅうけいを いれる。
// 1つの パネルだけで こえる ときは わけない（パネルは 1つの やること）。しゅうちゅう いがいの パネルが あいだに あれば れんぞくは きれる。
// 5ふんは うしろの かへん パネルから ごほうび → しゅうちゅう の じゅんに ひく（おなじ しゅるいの なかでは ゆとりの おおきい もの、
// おなじ なら うしろの もの）。ひけない ときは いれずに「きゅうけいが はいらなかったよ」。
function insertBreaks(items, threshold, notices, catalog) {
  const skipped = [];
  let run = 0;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.kind !== 'focus') { run = 0; continue; }
    if (run > 0 && run + it.planned > threshold) {
      const donor = pickDonor(items, i, BREAK_DONORS.map((k) => [k]));
      if (donor >= 0) {
        items[donor].planned -= BREAK_MINUTES;
        items.splice(i, 0, breakItem(catalog));
        i++;
        run = items[i].planned;
        continue;
      }
      skipped.push(it.src);
    }
    run += it.planned;
  }
  if (skipped.length) notices.push({ code: 'break_skipped', items: skipped, text: '{休憩|きゅうけい}が {入|はい}らなかったよ' });
}

// うしろ（from いこう）の かへん パネルから、tiers の じゅんに 5ふん ゆずれる ものを えらぶ
function pickDonor(items, from, tiers) {
  for (const kinds of tiers) {
    let best = -1, slack = 0;
    for (let j = from; j < items.length; j++) {
      const it = items[j];
      if (it.locked || it.auto === 'break' || it.auto === 'rest' || !kinds.includes(it.kind)) continue;
      const s = it.planned - it.min;
      if (s >= STEP && s >= slack) { best = j; slack = s; }
    }
    if (best >= 0) return best;
  }
  return -1;
}

// ─────────────────────────────────────────────
// 4.3 の 7：ていあん（F-406）。とりいれは 1タップ（apply を input に かさねて plan しなおす）。しなくても よい。
// input.suppress に id を いれると だささない（おなじ ていあんは 1ミッションに 1かい まで）。
function suggest(input, ents, S, E) {
  const out = [];
  const sup = new Set(input.suppress || []);
  const items = input.items;
  const order = (srcs) => srcs.map((s) => items[s]);

  // ごほうびが しゅうちゅう より まえ →「ゲームは さいごに すると がんばれるよ」（Premack の げんり）
  const lastFocus = Math.max(-1, ...ents.filter((e) => e.kind === 'focus').map((e) => e.src));
  const early = ents.filter((e) => e.kind === 'reward' && e.src < lastFocus);
  if (early.length && !sup.has('reward_last')) {
    const moved = new Set(early.map((e) => e.src));
    const srcs = [...ents.filter((e) => !moved.has(e.src)), ...early].map((e) => e.src);
    out.push({ id: 'reward_last', text: `${early[0].p.obj}は さいごに すると がんばれるよ`, apply: { items: order(srcs) } });
  }

  // じこくの めやす（ほごしゃモードの anchors：{ bath: '19:00' }）→「おふろは 19:00 ごろ だね」
  const seen = new Set();
  for (const e of ents) {
    const raw = input.anchors?.[e.p.id];
    if (raw == null || seen.has(e.p.id)) continue;
    seen.add(e.p.id);
    let a = parseClock(raw);
    if (!(a >= S && a < E) && a + 1440 >= S && a + 1440 < E) a += 1440;
    const id = 'anchor:' + e.p.id;
    if (!(a >= S && a < E) || sup.has(id)) continue;
    const others = ents.filter((x) => x !== e);
    const pos = ents.indexOf(e);
    let t = S, best = null;
    for (let j = 0; j <= others.length; j++) {
      const d = Math.abs(t - a);
      if (!best || d < best.d || (d === best.d && Math.abs(j - pos) < Math.abs(best.j - pos))) best = { j, d };
      if (j < others.length) t += others[j].minutes;
    }
    const cur = Math.abs(S + sum(ents.slice(0, pos), (x) => x.minutes) - a);
    if (best.j !== pos && best.d + STEP <= cur) {
      const srcs = others.map((x) => x.src);
      srcs.splice(best.j, 0, e.src);
      out.push({ id, text: `${e.p.obj}は ${clock(a)} ごろ だね`, apply: { items: order(srcs) } });
    }
  }

  // しゅうちゅうが 3つ いじょう ならび、おなじ パネルが となりあう →「かんじ と けいさん を こうたいに すると あきないよ」
  if (!sup.has('alternate')) {
    for (let i = 0; i < ents.length;) {
      let j = i;
      while (j < ents.length && ents[j].kind === 'focus') j++;
      const run = ents.slice(i, j);
      const alt = run.length >= 3 && run.some((e, k) => k > 0 && e.p.id === run[k - 1].p.id) ? interleave(run) : null;
      if (alt) {
        const srcs = ents.map((e) => e.src);
        srcs.splice(i, run.length, ...alt.map((e) => e.src));
        const ids = [...new Set(alt.map((e) => e.p.id))]
          .sort((a, b) => run.filter((e) => e.p.id === b).length - run.filter((e) => e.p.id === a).length);
        const name = (id) => run.find((e) => e.p.id === id).p.obj;
        out.push({ id: 'alternate', text: `${name(ids[0])} と ${name(ids[1])} を こうたいに すると あきないよ`, apply: { items: order(srcs) } });
        break;
      }
      i = j === i ? i + 1 : j;
    }
  }
  return out;
}

// おなじ パネルが となりあわない ならびに する（のこりの おおい ものから。できなければ null）
function interleave(run) {
  const queues = new Map();
  for (const e of run) { if (!queues.has(e.p.id)) queues.set(e.p.id, []); queues.get(e.p.id).push(e); }
  if (queues.size < 2) return null;
  const out = [];
  let prev = null;
  while (out.length < run.length) {
    let pick = null;
    for (const [id, q] of queues) if (q.length && id !== prev && (!pick || q.length > queues.get(pick).length)) pick = id;
    if (!pick) return null;
    out.push(queues.get(pick).shift());
    prev = pick;
  }
  return out;
}

// ─────────────────────────────────────────────
// plan（4.3 の 1〜7）
//
// input = {
//   start, end,              … 分（5ふん きざみ）
//   items: [{ panel: 'book' | {じさく パネル}, qty?, locked?, minutes?, key? }],   … わくの ならび（この じゅんを まもる）
//   grade, mode: 'ratio'|'equal', rewardCap, autoBreak, anchors?, suppress?, catalog?,
//   extendMax?, allowEndExtend?, shrink?: 'others'|'reward'   … ミッション中の きまり（replan が つかう）
// }
// かえりち：{ ok: true, start, end, total, ..., items, notices, suggestions } または { ok: false, reason, text, fixes }
//   fixes / suggestions の apply は input に かさねる もの（{ items } や { end }）
export function plan(input) {
  const cfg = config(input);
  const S = input.start, E = input.end;
  // 4.3 の 1：ごうけい じかん
  if (!isGrid(S) || !isGrid(E)) return fail('grid', 'じこくは 5ふん きざみに してね');
  const T = E - S;
  if (T < MIN_TOTAL) return fail('range', `みじかすぎるよ。${minText(MIN_TOTAL)} いじょうに してね`, [setEnd(S + MIN_TOTAL)]);
  if (T > MAX_TOTAL) return fail('range', 'ながすぎるよ。3じかん までに してね', [setEnd(S + MAX_TOTAL)]);
  const items = input.items || [];
  if (!items.length) return fail('empty', 'パネルを えらんでね');
  const ents = [];
  for (let i = 0; i < items.length; i++) {
    const e = entryOf(items[i], i, cfg);
    if (!e) return fail('panel', 'しらない パネルが あるよ', [], { item: i });
    ents.push(e);
  }
  const removeFix = (e) => ({ id: 'remove', item: e.src, text: `${e.p.obj}を はずす`, apply: { items: items.filter((_, k) => k !== e.src) } });

  // F-403 ごほうびの じょうげん
  const capLeft = cfg.cap - sum(ents.filter((e) => e.locked && e.capped), (e) => e.minutes);
  const vars = ents.filter((e) => !e.locked);
  const capVars = vars.filter((e) => e.capped);
  if (capLeft < 0 || sum(capVars, (e) => e.lo) > capLeft) {
    return fail('cap', `ゲームと {動画|どうが}は あわせて ${minText(cfg.cap)} までだよ`, ents.filter((e) => e.capped).reverse().map(removeFix));
  }
  for (const e of capVars) e.hi = Math.min(e.hi, capLeft);

  // 4.3 の 2：こてい ぶんを ひく
  const R = T - sum(ents.filter((e) => e.locked), (e) => e.minutes);
  const sumLo = sum(vars, (e) => e.lo);
  const sumHi = sum(vars.filter((e) => !e.capped), (e) => e.hi) + Math.min(sum(capVars, (e) => e.hi), capLeft);

  // 4.3 の 6（たりない）：はずす パネル・おわりを のばす を ていあん（F-403）
  if (R < sumLo) {
    const need = sumLo - R;
    const fixes = [];
    if (T + need <= MAX_TOTAL) fixes.push({ id: 'extendEnd', minutes: need, text: `おわりを ${minText(need)} のばす`, apply: { end: E + need } });
    for (const e of items.length > 1 ? [...ents].reverse() : []) {
      if (e.locked ? sumLo <= R + e.minutes : sumLo - e.lo <= R) fixes.push(removeFix(e));
    }
    return fail('short', 'じかんが たりないよ', fixes, { need });
  }

  // 4.3 の 3・4：ひれい／おなじ で わけ、クリップして わけなおし、5ふん きざみに まるめる（F-401・F-402）
  const units = allocate(Math.min(R, sumHi) / STEP,
    vars.map((e) => ({ w: e.w, lo: e.lo / STEP, hi: e.hi / STEP, capped: e.capped })), capLeft / STEP);
  vars.forEach((e, k) => { e.minutes = units[k] * STEP; });
  const seq = ents.map(itemOf);
  const notices = [];

  // 4.3 の 6（あまる）：あまりを「じゆうじかん」として さいごに おき、「なにに する？」と きく
  const extra = R - sum(vars, (e) => e.minutes);
  if (extra > 0) {
    seq.push(freeItem(extra, cfg.catalog));
    notices.push({ code: 'free', minutes: extra, text: `じかんが ${minText(extra)} あまったよ。なにに する？` });
  }

  // 4.3 の 5：きゅうけいを はさむ（F-404）
  if (cfg.autoBreak) insertBreaks(seq, breakThreshold(cfg.grade), notices, cfg.catalog);

  layout(seq, 0, S, S);
  return {
    ok: true, start: S, end: E, total: T, grade: cfg.grade, mode: cfg.mode, rewardCap: cfg.cap, autoBreak: cfg.autoBreak,
    extendMax: cfg.extendMax, allowEndExtend: cfg.allowEndExtend, shrink: cfg.shrink,
    items: seq, notices, suggestions: suggest(input, ents, S, E),
  };
}

function setEnd(end) { return { id: 'setEnd', text: `おわりを ${clock(end)} に する`, apply: { end } }; }

// ─────────────────────────────────────────────
// replan（4.3 の 8・F-407）
//
// event：
//   { type: 'early', index, at, choice }  … index の パネルが at（分）に はやく おわった。
//        choice 'next'（しょきち）… あまりを うしろの かへん パネルへ おもみの ひで たす（のりきらない ぶんは じゆうじかん）
//               'reward'       … さいごの ごほうびに たす（じょうげん ない。あふれた ぶんは 'next' と おなじ）
//               'rest'         … ちょっと きゅうけい（あまりが 10ぷん いか のとき）
//        5ふん みまんの はしたは つぎの パネルが はやく はじまる ぶんとして つぎの パネルに つく（くぎりは 5ふん きざみの まま）
//   { type: 'extend', index }             … もうすこし（+5ふん）。うしろの かへん パネルを 5ふん ちぢめる。おわりの じこくは うごかさない
//   { type: 'extendEnd', index, force? }  … おわりを 5ふん のばして index の パネルに たす。
//        ほごしゃが ゆるして いる とき（allowEndExtend）か force（F-605 の じかんぎれの えんちょう）だけ
// opts で タイムテーブルの きまり（extendMax・allowEndExtend・shrink・rewardCap）を うわがき できる
export function replan(tt, event, opts = {}) {
  if (!tt || !tt.ok || !Array.isArray(tt.items)) return fail('timetable', 'タイムテーブルが ないよ');
  const cfg = {
    extendMax: tt.extendMax ?? EXTEND_MAX, allowEndExtend: !!tt.allowEndExtend, shrink: tt.shrink === 'reward' ? 'reward' : 'others',
    rewardCap: tt.rewardCap ?? DEFAULT_REWARD_CAP, ...opts,
  };
  const t = { ...tt, items: tt.items.map((it) => ({ ...it })), notices: [], suggestions: [] };
  const i = event?.index;
  if (!Number.isInteger(i) || i < 0 || i >= t.items.length) return fail('index', 'パネルが みつからないよ');
  if (event.type === 'early') return early(t, i, event, cfg);
  if (event.type === 'extend') return extend(t, i, cfg);
  if (event.type === 'extendEnd') return extendEnd(t, i, event, cfg);
  return fail('event', 'しらない できごと だよ');
}

const capUsed = (items) => sum(items.filter((it) => it.capped), (it) => it.planned);

// はやく おわったときに えらべる もの
export function earlyChoices(tt, index, at) {
  const items = tt.items, cur = items[index];
  if (!cur || index >= items.length - 1 || !(at < cur.end - EPS)) return [];
  const units = Math.round((cur.end - ceilStep(at)) / STEP);
  const out = ['next'];
  const r = lastReward(items, index + 1);
  if (units > 0 && r >= 0 && rewardRoom(items, r, tt.rewardCap ?? DEFAULT_REWARD_CAP) >= STEP) out.push('reward');
  if (cur.end - at <= REST_MAX + EPS) out.push('rest');
  return out;
}

function lastReward(items, from) {
  for (let j = items.length - 1; j >= from; j--) if (items[j].kind === 'reward' && !items[j].locked && !items[j].auto) return j;
  return -1;
}
function rewardRoom(items, j, cap) {
  const it = items[j];
  const room = it.max - it.planned;
  return Math.max(0, it.capped ? Math.min(room, cap - capUsed(items)) : room);
}

function early(t, i, ev, cfg) {
  const items = t.items, cur = items[i], at = ev.at;
  if (i >= items.length - 1) return fail('last', 'さいごの パネルだよ');
  if (!(at >= cur.start - EPS && at < cur.end - EPS)) return fail('not_early', 'はやく おわって いないよ');
  const choice = ev.choice || 'next';
  const oldEnd = cur.end;
  const g = ceilStep(at);
  let units = Math.round((oldEnd - g) / STEP);       // 5ふん きざみで つかえる あまり
  cur.end = at;

  if (choice === 'rest') {
    if (oldEnd - at > REST_MAX + EPS) return fail('rest_too_long', `ちょっと きゅうけいは ${minText(REST_MAX)} までだよ`);
    items.splice(i + 1, 0, autoItem('rest', 'rest', units * STEP, 0, REST_MAX, PANEL_BY_ID));
    layout(items, i + 1, at, g);
    return t;
  }
  if (choice === 'reward') {
    const r = lastReward(items, i + 1);
    if (r < 0) return fail('no_reward', 'うしろに ごほうびが ないよ');
    const add = Math.min(units * STEP, floorStep(rewardRoom(items, r, cfg.rewardCap)));
    items[r].planned += add;
    units -= add / STEP;
  } else if (choice !== 'next') return fail('choice', 'しらない えらびかた だよ');

  if (units > 0) spread(t, i + 1, units, cfg);
  layout(items, i + 1, at, g);
  return t;
}

// units（5ふん たんい）を from いこうの かへん パネルへ おもみの ひで たす。のりきらない ぶんは じゆうじかんへ
function spread(t, from, units, cfg) {
  const items = t.items;
  const idx = [];
  for (let j = from; j < items.length; j++) {
    const it = items[j];
    if (!it.locked && !it.auto && it.weight > 0 && it.max - it.planned >= STEP) idx.push(j);
  }
  const capRoom = Math.max(0, floorStep(cfg.rewardCap - capUsed(items))) / STEP;
  const ents = idx.map((j) => ({ w: items[j].weight, lo: 0, hi: floorStep(items[j].max - items[j].planned) / STEP, capped: items[j].capped }));
  const room = sum(ents.filter((e) => !e.capped), (e) => e.hi) + Math.min(sum(ents.filter((e) => e.capped), (e) => e.hi), capRoom);
  const give = Math.min(units, room);
  if (give > 0) {
    const add = allocate(give, ents, capRoom);
    idx.forEach((j, k) => { items[j].planned += add[k] * STEP; });
  }
  const left = (units - give) * STEP;
  if (left > 0) {
    let f = -1;
    for (let j = from; j < items.length; j++) if (items[j].auto === 'free') f = j;
    if (f >= 0) items[f].planned += left;
    else items.push(freeItem(left, PANEL_BY_ID));
    t.notices.push({ code: 'free', minutes: left, text: `じかんが ${minText(left)} あまったよ。なにに する？` });
  }
}

function extend(t, i, cfg) {
  const items = t.items, cur = items[i];
  if (cur.auto === 'break' || cur.auto === 'rest') return fail('not_extendable', 'きゅうけいは のばせないよ');
  if ((cur.extended || 0) >= cfg.extendMax) return fail('limit', 'もうすこし は ここまで だよ');
  if (cur.capped && cfg.rewardCap - capUsed(items) < EXTEND_MINUTES) return fail('cap', `ゲームと {動画|どうが}は あわせて ${minText(cfg.rewardCap)} までだよ`);
  const donor = pickDonor(items, i + 1, SHRINK_ORDER[cfg.shrink]);
  if (donor < 0) {
    // すべて さいしょう：おわりを 5ふん のばす ていあん。ほごしゃモードで きんし なら「きょうは ここまで」
    const fixes = cfg.allowEndExtend
      ? [{ id: 'extendEnd', minutes: EXTEND_MINUTES, text: `おわりを ${minText(EXTEND_MINUTES)} のばす`, event: { type: 'extendEnd', index: i } }]
      : [{ id: 'stop', text: 'きょうは ここまで' }];
    return fail('no_room', 'うしろの パネルを もう ちぢめられないよ', fixes);
  }
  items[donor].planned -= EXTEND_MINUTES;
  cur.planned += EXTEND_MINUTES;
  cur.end += EXTEND_MINUTES;
  cur.extended = (cur.extended || 0) + 1;
  layout(items, i + 1, cur.end, cur.end);
  return t;
}

function extendEnd(t, i, ev, cfg) {
  const items = t.items, cur = items[i];
  if (!ev.force) {
    if (!cfg.allowEndExtend) return fail('end_locked', 'きょうは ここまで', [{ id: 'stop', text: 'きょうは ここまで' }]);
    if ((cur.extended || 0) >= cfg.extendMax) return fail('limit', 'もうすこし は ここまで だよ');
  }
  if (cur.capped && cfg.rewardCap - capUsed(items) < EXTEND_MINUTES) return fail('cap', `ゲームと {動画|どうが}は あわせて ${minText(cfg.rewardCap)} までだよ`);
  cur.planned += EXTEND_MINUTES;
  cur.end += EXTEND_MINUTES;
  if (ev.force) cur.overtime = (cur.overtime || 0) + 1;   // F-605 じかんぎれの えんちょう（もうすこし とは べつに かぞえる）
  else cur.extended = (cur.extended || 0) + 1;
  t.end = layout(items, i + 1, cur.end, cur.end);
  t.total = t.end - t.start;
  t.endExtended = (t.endExtended || 0) + 1;
  return t;
}
