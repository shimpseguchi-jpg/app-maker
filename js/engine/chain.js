// じゅもん（カードの ならび）を ひだりから じゅんばんに うごかす
import { CARDS, findCombo } from '../data/cards.js';

const MAXV = 9999;
const NO_REPEAT = new Set(['rep', 'repAll', 'next3']);

export class ChainCtx {
  constructor({ startV = 0, memo = 0, relics = [], grade = 2 }) {
    this.v = startV;
    this.startV = startV;
    this.memo = memo;
    this.blockTotal = 0;
    this.relics = relics;
    this.grade = grade;
    this.steps = [];
    this.flags = { all: false, hits: 1, pierce: false, hammer: 0 };
    this.slot = -1;
    this.lastShape = null; // がったいを まっている かたち
    this.extraDrawN = 0;
    this.exhausts = [];
    this.executed = []; // [{slot, inst}]
    this.cards = []; // じゅもんの カード（ぜんぶ）
    this._nextTimes = 0;
    this.repeating = 0;
    this.usedMul = 0;
  }
  has(id) { return this.relics.includes(id); }
  step(s) { this.steps.push({ slot: this.slot, v: this.v, block: this.blockTotal, memo: this.memo, repeat: this.repeating > 0, ...s }); }

  add(n, label) {
    const b = this.v;
    this.v = Math.min(MAXV, b + n);
    this.step({ op: 'add', eq: `${b} + ${n} = ${this.v}`, label });
  }
  sub(n, label) {
    const b = this.v;
    let a = b - n;
    const clamped = a < 0;
    if (clamped) a = 0;
    this.v = a;
    this.step({ op: 'sub', eq: clamped ? `${b} − ${n} → 0` : `${b} − ${n} = ${a}`, label: clamped ? '0より ちいさく ならない' : label });
  }
  mul(n, label) {
    const b = this.v;
    this.v = Math.min(MAXV, b * n);
    this.usedMul++;
    this.step({ op: 'mul', eq: `${b} × ${n} = ${this.v}`, label });
    if (this.has('kukubook')) this.block(2, '九九の ほん');
  }
  div(n, label) {
    const b = this.v;
    const q = Math.floor(b / n), r = b % n;
    this.v = q;
    this.step({ op: 'div', eq: r ? `${b} ÷ ${n} = ${q} あまり ${r}` : `${b} ÷ ${n} = ${q}`, label });
    return { q, r };
  }
  set(n, label) {
    this.v = n;
    this.step({ op: 'set', eq: `→ ${n}`, label });
  }
  block(n, label) {
    if (n <= 0) return;
    this.blockTotal += n;
    this.step({ op: 'block', eq: `🛡️ +${n}`, label, gain: n });
  }
  cond(text, ok) {
    this.step({ op: 'cond', eq: `${text} → ${ok ? 'はい！' : 'いいえ'}`, ok });
    return ok;
  }
  flag(name, val, label) {
    if (name === 'hits') this.flags.hits = Math.max(this.flags.hits, val);
    else if (name === 'hammer') this.flags.hammer = Math.max(this.flags.hammer, val);
    else this.flags[name] = val;
    this.step({ op: 'flag', eq: label || name, flag: name });
  }
  setMemo(v) { this.memo = v; this.step({ op: 'memo', eq: `📝 = ${v}` }); }
  extraDraw(n) { this.extraDrawN += n; }
  nextTimes(n) { this._nextTimes = n; this.step({ op: 'flag', eq: `つぎを ${n}かい` }); }
  chainCards() { return this.cards.map((i) => CARDS[i.id]); }

  // ひとつまえの カードを くりかえす
  repeatPrev(times) {
    const idx = this.executed.length - 1;
    const prev = this.executed[idx];
    if (!prev || NO_REPEAT.has(prev.inst.id)) {
      this.step({ op: 'none', eq: 'くりかえす カードが ない' });
      return;
    }
    for (let t = 0; t < times; t++) {
      this.repeating++;
      this.runCard(prev.inst, false);
      this.repeating--;
    }
  }
  repeatAll() {
    const list = this.executed.filter((e) => !NO_REPEAT.has(e.inst.id)).map((e) => e.inst);
    if (!list.length) { this.step({ op: 'none', eq: 'くりかえす カードが ない' }); return; }
    this.repeating++;
    for (const inst of list) this.runCard(inst, false);
    this.repeating--;
  }

  runCard(inst, record = true) {
    const card = CARDS[inst.id];
    if (!card || card.unplayable) return;
    card.exec(this, inst, !!inst.up);
    // がったい
    if (card.tags.shape) {
      if (this.lastShape) {
        const combo = findCombo(this.lastShape, card.tags.shape);
        if (combo) {
          const mult = this.has('setsquare') ? 2 : 1;
          this.step({ op: 'combo', eq: `がったい！`, label: combo.name, combo });
          if (combo.corners) this.add(combo.corners * mult, `${combo.name}の かど ${combo.corners}つ` + (mult > 1 ? ' ×2' : ''));
          if (combo.block) this.block(combo.block * mult, combo.name);
          if (combo.all) this.flag('all', true, 'みんなに こうげき！');
          this.lastShape = null;
        } else this.lastShape = card.tags.shape;
      } else this.lastShape = card.tags.shape;
    } else if (!NO_REPEAT.has(inst.id)) {
      this.lastShape = null;
    }
    if (record) this.executed.push({ slot: this.slot, inst });
  }
}

// じゅもんを ぜんぶ うごかす
// slots: [inst|null], opts: { startV, memo, relics, grade }
export function runChain(slots, opts) {
  const ctx = new ChainCtx(opts);
  ctx.cards = slots.filter(Boolean);
  slots.forEach((inst, i) => {
    if (!inst) return;
    ctx.slot = i;
    const card = CARDS[inst.id];
    if (card.exhaust && card.exhaust(!!inst.up)) ctx.exhausts.push(inst.uid);
    ctx.step({ op: 'begin', eq: '' });
    let times = 1;
    if (ctx._nextTimes && !NO_REPEAT.has(inst.id)) { times = ctx._nextTimes; ctx._nextTimes = 0; }
    for (let t = 0; t < times; t++) {
      if (t > 0) ctx.repeating++;
      ctx.runCard(inst, t === 0);
      if (t > 0) ctx.repeating--;
    }
  });
  ctx.slot = slots.length;
  if (ctx.has('abacus') && ctx.cards.length) ctx.add(2, 'そろばん');
  if (ctx.has('seven') && ctx.v > 0 && ctx.v % 7 === 0) ctx.add(7, 'ラッキーセブン');
  return ctx;
}

// こうげきの ダメージを けいさん
export function computeHit(V, enemy, flags, opts) {
  const notes = [];
  let mult = 1;
  if (V <= 0) return { dmg: 0, notes, raw: 0 };
  if (enemy.lock && V === enemy.lock) {
    const m = flags.hammer || (opts.relics.includes('darts') ? 3 : 2);
    mult *= m;
    notes.push({ t: 'ぴったり！', m });
  }
  if (enemy.weak && V % enemy.weak === 0) {
    mult *= 2;
    notes.push({ t: 'じゃくてん！', m: 2 });
  }
  let dmg = V * mult;
  if (opts.predicted) {
    const pm = opts.relics.includes('lamp') ? 2 : 1.5;
    dmg = Math.ceil(dmg * pm);
    notes.push({ t: 'ひらめき！', m: pm });
  }
  if (enemy.armor && !flags.pierce) {
    dmg = Math.max(0, dmg - enemy.armor);
    notes.push({ t: `かたい −${enemy.armor}`, armor: enemy.armor });
  }
  return { dmg, notes, raw: V };
}
