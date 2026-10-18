// 顔アイコン（エルミナージュのフェイスアイコンの代わり）。公式の絵は使わず、イメージカラーと髪型の形だけで描く
// hair: short 短め / bob ボブ / long ロング / twin ツインテール / pony ポニーテール / sideL・sideR サイドテール / braid 三つ編み
import { IDOLS } from '../data/idols.js';

const HAIR = {
  haruka: { hair: 'bob', ribbon: true, tone: '#5a3420' }, chihaya: { hair: 'long', tone: '#2b2f4a' }, yukiho: { hair: 'bob', tone: '#7a5a3c' },
  yayoi: { hair: 'twin', tone: '#c06a2a' }, ritsuko: { hair: 'braid', glasses: true, tone: '#4a3220' }, azusa: { hair: 'long', tone: '#2a2346' },
  iori: { hair: 'long', band: true, tone: '#6a4630' }, makoto: { hair: 'short', tone: '#1c1c22' }, ami: { hair: 'sideR', tone: '#7a5430' },
  mami: { hair: 'sideL', tone: '#7a5430' }, miki: { hair: 'long', tone: '#d8b450' }, hibiki: { hair: 'pony', tone: '#1c1c26' },
  takane: { hair: 'long', tone: '#b9b4c8' },
};
const cache = new Map();

export function portrait(id) {
  if (cache.has(id)) return cache.get(id);
  const idol = IDOLS[id], h = HAIR[id] || { hair: 'short', tone: '#3a2a20' };
  const c = idol.color, t = h.tone, g = `pg-${id}`;
  const back = {
    long: `<path d="M16 26 Q14 52 20 60 L44 60 Q50 52 48 26 Z" fill="${t}"/>`,
    twin: `<circle cx="14" cy="30" r="7" fill="${t}"/><circle cx="50" cy="30" r="7" fill="${t}"/>`,
    pony: `<path d="M38 12 Q56 14 52 40 Q48 30 40 22 Z" fill="${t}"/>`,
    sideR: `<path d="M44 20 Q58 26 52 44 Q48 34 42 28 Z" fill="${t}"/>`,
    sideL: `<path d="M20 20 Q6 26 12 44 Q16 34 22 28 Z" fill="${t}"/>`,
    braid: `<path d="M19 30 Q16 44 20 52 M45 30 Q48 44 44 52" stroke="${t}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  }[h.hair] || '';
  const cap = {
    short: `<path d="M19 26 Q18 12 32 11 Q46 12 45 26 Q42 18 32 18 Q22 18 19 26 Z" fill="${t}"/>`,
    bob: `<path d="M17 32 Q15 11 32 10 Q49 11 47 32 Q45 22 40 19 Q32 22 24 19 Q19 22 17 32 Z" fill="${t}"/>`,
  }[h.hair] || `<path d="M18 30 Q16 11 32 10 Q48 11 46 30 Q44 20 38 18 Q32 21 26 18 Q20 20 18 30 Z" fill="${t}"/>`;
  const extra = [
    h.ribbon ? `<path d="M20 14 l-7 -4 l1 9 Z M44 14 l7 -4 l-1 9 Z" fill="${c}"/>` : '',
    h.band ? `<path d="M19 17 Q32 9 45 17" stroke="${c}" stroke-width="3" fill="none"/>` : '',
    h.glasses ? `<g stroke="#2a2018" stroke-width="1.4" fill="none"><rect x="23" y="25" width="7" height="5" rx="1.5"/><rect x="34" y="25" width="7" height="5" rx="1.5"/><path d="M30 27 h4"/></g>` : '',
  ].join('');
  const svg = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs><radialGradient id="${g}" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="${c}" stop-opacity=".9"/><stop offset="1" stop-color="#120d0a"/></radialGradient></defs>
    <rect width="64" height="64" fill="url(#${g})"/>
    ${back}
    <path d="M10 64 Q12 46 32 44 Q52 46 54 64 Z" fill="${c}" stroke="#1a120c" stroke-width="1.5"/>
    <path d="M27 44 h10 v5 h-10 Z" fill="#e9c9ae"/>
    <ellipse cx="32" cy="29" rx="12.5" ry="14" fill="#f2d6bf"/>
    <circle cx="27" cy="29" r="1.4" fill="#2a1d14"/><circle cx="37" cy="29" r="1.4" fill="#2a1d14"/>
    <path d="M29 36 Q32 38 35 36" stroke="#a0604a" stroke-width="1.2" fill="none"/>
    ${cap}${extra}
  </svg>`;
  cache.set(id, svg);
  return svg;
}

// 顔の上に出す短い名前（下の名前）
const SHORT = { haruka: '春香', chihaya: '千早', yukiho: '雪歩', yayoi: 'やよい', ritsuko: '律子', azusa: 'あずさ', iori: '伊織',
  makoto: '真', ami: '亜美', mami: '真美', miki: '美希', hibiki: '響', takane: '貴音' };
export const shortName = (id) => SHORT[id] || IDOLS[id].name;
