// スコアの けいさん：{力|ちから} × {倍率|ばいりつ}（ひだりから じゅんばんに）
import { CARDS } from '../data/cards.js';
import { ARCANA } from '../data/arcana.js';
import { detectHands, handStats } from '../data/hands.js';

const EL5 = ['fire', 'water', 'wood', 'thunder', 'shadow'];
const REPEAT_IDS = new Set(['clone']);

// ルーンの じょうほう
export function runeView(inst) {
  const wild = inst.enh === 'wild';
  const els = new Set(wild ? EL5 : [inst.el]);
  return { inst, v: inst.v, el: inst.el, els, isEl: (e) => els.has(e) };
}

export class ScoreCtx {
  constructor(S) {
    this.S = S;
    this.preview = !!S.preview;
    this.slots = S.slots;
    this.steps = [];
    this.laters = [];
    this.retrig = {};
    this.turn = S.turn || 1;
    this.coins = S.coins || 0;
    this.rule = S.rule || null;
    // ルーンの いち
    this.runeIdx = [];
    this.slots.forEach((inst, i) => { if (inst && CARDS[inst.id].type === 'rune') this.runeIdx.push(i); });
    const blocked = (inst) => (this.rule === 'evenOnly' && inst.v % 2 === 1) || (this.rule === 'oddOnly' && inst.v % 2 === 0);
    this.counted = this.runeIdx.filter((i) => !blocked(this.slots[i]));
    this.blockedIdx = this.runeIdx.filter((i) => blocked(this.slots[i]));
    const views = this.counted.map((i) => runeView(this.slots[i]));
    this.hand = detectHands(views, { noPair: this.rule === 'noPair' });
    // members を スロット番号に
    this.handSlots = (this.hand.members[this.hand.best] || []).map((k) => this.counted[k]);
    this.pairSlots = new Set();
    {
      const byV = {};
      this.counted.forEach((i) => { const v = this.slots[i].v; (byV[v] = byV[v] || []).push(i); });
      Object.values(byV).forEach((g) => { if (g.length >= 2 && this.rule !== 'noPair') g.forEach((i) => this.pairSlots.add(i)); });
    }
    const lv = (S.handLv && S.handLv[this.hand.best]) || 1;
    const hs = handStats(this.hand.best, lv);
    this.power = hs.power;
    this.mult = hs.mult;
    this.shield = 0;
    this.handLv = lv;
    this.push({ kind: 'hand', label: this.hand.best, src: { kind: 'hand' } });
  }
  push(s) { this.steps.push({ power: this.power, mult: this.mult, shield: this.shield, slot: this.curSlot, ...s }); }
  // ── そうさ ──
  addPower(n, label, src) { if (!n) return; this.power += n; this.push({ kind: 'power', n, label, src: this.src(src) }); }
  addMult(n, label, src) { if (!n) return; this.mult += n; this.push({ kind: 'mult', n, label, src: this.src(src) }); }
  xMult(n, label, src) { const b = this.mult; this.mult = b * n; this.push({ kind: 'xmult', n, before: b, label, src: this.src(src) }); }
  xPower(n, label, src) { const b = this.power; this.power = b * n; this.push({ kind: 'xpower', n, before: b, label, src: this.src(src) }); }
  addShield(n, label, src) { if (n <= 0) return; this.shield += n; this.push({ kind: 'shield', n, label, src: this.src(src) }); }
  note(label, src) { this.push({ kind: 'note', label, src: this.src(src) }); }
  cond(label, ok, src) { this.push({ kind: 'cond', label, ok, src: this.src(src) }); return ok; }
  later(fn) { this.laters.push(fn); }
  src(s) { if (s && s.uid) return { kind: s.zone || 'arcana', uid: s.uid }; return s || { kind: 'card', slot: this.curSlot }; }
  // ── しらべる ──
  has(handId) { return this.hand.has.has(handId); }
  runeCount() { return this.counted.length; }
  cardCount() { return this.slots.filter(Boolean).length; }
  runesOf(el) { return this.counted.filter((i) => runeView(this.slots[i]).isEl(el)); }
  elementKinds() { const s = new Set(); this.counted.forEach((i) => { const r = this.slots[i]; if (r.enh === 'wild') return; s.add(r.el); }); return s.size + this.counted.filter((i) => this.slots[i].enh === 'wild').length; }
  firstRuneIndex() { return this.counted.length ? this.counted[0] : -1; }
  lastRuneIndex() { return this.counted.length ? this.counted[this.counted.length - 1] : -1; }
  inPair(i) { return this.pairSlots.has(i); }
  neighbors(i) { return [i - 1, i + 1].map((j) => { const x = this.slots[j]; return x && CARDS[x.id].type === 'rune' ? runeView(x) : null; }); }
  handLeft() { return this.S.handLeft || 0; }
  retrigNext(n) { this.pendingRetrig = (this.pendingRetrig || 0) + n; this.push({ kind: 'note', label: `つぎの ルーン ×${n + 1}`, src: this.src() }); }

  // ルーンを かぞえる
  scoreRune(i, isRepeat = false) {
    const inst = this.slots[i];
    if (!this.counted.includes(i)) { this.push({ kind: 'blocked', label: 'のろいで かぞえない', src: { kind: 'card', slot: i } }); return; }
    const r = runeView(inst);
    const prev = this.curSlot; this.curSlot = i;
    this.addPower(inst.v, null, { kind: 'card', slot: i, rune: true, repeat: isRepeat });
    if (inst.up) this.addMult(1, '＋', { kind: 'card', slot: i });
    if (inst.enh === 'foil') this.addPower(30, 'きらめき', { kind: 'card', slot: i });
    if (inst.enh === 'flame') this.addMult(4, 'ほむら', { kind: 'card', slot: i });
    if (inst.enh === 'glass') { this.xMult(2, 'ガラス', { kind: 'card', slot: i }); this.later((b, api) => api.glassCheck(inst)); }
    if (inst.enh === 'gold') { this.push({ kind: 'coin', n: 2, src: { kind: 'card', slot: i } }); this.later((b, api) => api.coins(2)); }
    for (const a of this.S.board || []) { const d = CARDS[a.id]; if (d.onRune) d.onRune(this, r, { ...a, zone: 'board' }, !!a.up); }
    for (const a of this.S.arcana || []) { const d = ARCANA[a.id]; if (d.onRune) d.onRune(this, r, Object.assign(a, { zone: 'arcana' })); }
    this.curSlot = prev;
  }
  extraTimes(i) {
    let n = 0;
    for (const a of this.S.board || []) { const d = CARDS[a.id]; if (d.retrigger) n += d.retrigger(this, i, a, !!a.up); }
    for (const a of this.S.arcana || []) { const d = ARCANA[a.id]; if (d.retrigger) n += d.retrigger(this, i, a); }
    return n;
  }
  runSlot(i, isRepeat = false) {
    const inst = this.slots[i];
    if (!inst) return;
    const c = CARDS[inst.id];
    this.curSlot = i;
    if (c.type === 'rune') {
      let times = 1;
      if (!isRepeat) {
        if (this.pendingRetrig && this.counted.includes(i)) { times += this.pendingRetrig; this.pendingRetrig = 0; }
        times += this.extraTimes(i);
      }
      for (let t = 0; t < times; t++) this.scoreRune(i, isRepeat || t > 0);
    } else if (c.exec) {
      c.exec(this, i, !!inst.up);
    }
  }
  repeatPrev(i) {
    let j = i - 1;
    while (j >= 0 && !this.slots[j]) j--;
    if (j < 0 || REPEAT_IDS.has(this.slots[j].id)) { this.note('くりかえす カードが ない'); return; }
    this.push({ kind: 'note', label: 'もう いちど！', src: { kind: 'card', slot: i } });
    this.runSlot(j, true);
    this.curSlot = i;
  }
  rescoreBefore(i) {
    const list = this.counted.filter((k) => k < i);
    if (!list.length) { this.note('ルーンが ない'); return; }
    for (const k of list) this.scoreRune(k, true);
    this.curSlot = i;
  }
}

// じゅもんを ぜんぶ けいさん
// S: { slots, board, arcana, handLv, rule, turn, coins, buff:{power,mult}, handLeft, preview }
export function scoreSpell(S) {
  const c = new ScoreCtx(S);
  if (S.buff && (S.buff.power || S.buff.mult)) {
    c.curSlot = -1;
    if (S.buff.power) c.addPower(S.buff.power, 'この ターンの {力|ちから}', { kind: 'buff' });
    if (S.buff.mult) c.addMult(S.buff.mult, 'この ターンの {倍率|ばいりつ}', { kind: 'buff' });
  }
  S.slots.forEach((_, i) => c.runSlot(i));
  c.curSlot = S.slots.length;
  for (const a of S.board || []) { const d = CARDS[a.id]; if (d.onAfter) d.onAfter(c, Object.assign(a, { zone: 'board' }), !!a.up); }
  for (const a of S.arcana || []) { const d = ARCANA[a.id]; if (d.onAfter) d.onAfter(c, Object.assign(a, { zone: 'arcana' })); }
  if (c.rule === 'halfPower' && c.power > 0) {
    const b = c.power; c.power = Math.floor(b / 2);
    c.push({ kind: 'half', before: b, label: 'はんぶんの のろい', src: { kind: 'rule' } });
  }
  c.total = c.power * c.mult;
  return c;
}
