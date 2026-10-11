// カードパック
import { CARDS, EL_LIST } from './cards.js';
import { uid } from '../util.js';

export const PACKS = {
  fire: { name: 'ほのおの パック', icon: '🔥', el: 'fire', desc: '{倍率|ばいりつ}を ふやす カードが はいりやすい' },
  water: { name: 'みずの パック', icon: '💧', el: 'water', desc: '{守|まも}りと {手札|てふだ}の カード' },
  wood: { name: 'もりの パック', icon: '🌿', el: 'wood', desc: '{力|ちから}を そだてる カード' },
  thunder: { name: 'いかずちの パック', icon: '⚡', el: 'thunder', desc: 'もう{一度|いちど} かぞえる カード' },
  shadow: { name: 'やみの パック', icon: '🌙', el: 'shadow', desc: 'ペアと おおわざの カード' },
  silver: { name: 'ぎんの パック', icon: '✦', el: 'none', desc: 'いろんな ぞくせいの ルーンと、むしょくの カード' },
};
export const PACK_TYPES = Object.keys(PACKS);
export const PACK_SIZE = 5;
export const DECK_MIN = 10;
export const DECK_MAX = 20;
export const REBUILD_MAX = 26;

const ENHS = [['foil', 3], ['flame', 3], ['gold', 2], ['wild', 2], ['glass', 1]];
const rar = (c) => (c.rar === 's' ? 'c' : c.rar);
function poolOf(el, r) { return Object.values(CARDS).filter((c) => c.type !== 'rune' && c.type !== 'curse' && c.el === el && rar(c) === r); }

function rune(rng, el, enhChance) {
  const r = { uid: uid(), id: 'rune', el, v: rng.int(1, 10), up: false };
  if (rng() < enhChance) r.enh = rng.weighted(ENHS);
  return r;
}
function card(rng, list) { const c = rng.pick(list); return { uid: uid(), id: c.id, up: false }; }

// パックを あける：5{枚|まい}（ルーン3・よくある1・めずらしい いじょう1）
export function openPack(type, rng, { rareBoost = 0 } = {}) {
  const out = [];
  if (type === 'silver') {
    const els = rng.shuffle([...EL_LIST]);
    out.push(rune(rng, els[0], 0.2), rune(rng, els[1], 0.2));
    out.push({ ...rune(rng, els[2], 0), enh: 'wild' });
    out.push(card(rng, poolOf('none', 'c')));
    const r = rng() < 0.3 + rareBoost ? 'r' : 'u';
    out.push(card(rng, poolOf('none', r).length ? poolOf('none', r) : poolOf('none', 'u')));
  } else {
    const el = PACKS[type].el;
    for (let i = 0; i < 3; i++) out.push(rune(rng, el, 0.15));
    // おなじ {数|かず}が 3{枚|まい} かさならない ように
    if (out[0].v === out[1].v && out[1].v === out[2].v) out[2].v = (out[2].v % 10) + 1;
    out.push(card(rng, poolOf(el, 'c')));
    const r = rng() < 0.28 + rareBoost ? 'r' : 'u';
    const pool = poolOf(el, r).length ? poolOf(el, r) : poolOf(el, 'u');
    out.push(card(rng, pool));
  }
  return out;
}
export function cardRarity(inst) { return inst.id === 'rune' ? (inst.enh ? 'u' : 'c') : rar(CARDS[inst.id]); }
