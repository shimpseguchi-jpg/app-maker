// きょうの ちょうせん（日替わりスコアアタック）
// 日本の 日付から ルールと 乱数の たねを きめる → だれが あそんでも おなじ ルール
import { makeRng } from '../util.js';
import { pickMods } from '../data/mods.js';
import { HEROES } from '../data/heroes.js';
import { PACK_TYPES } from '../data/packs.js';

// にほんの 日付（YYYY-MM-DD）
export function todayJST(now = Date.now()) { return new Date(now + 9 * 3600 * 1000).toISOString().slice(0, 10); }
export function shiftDate(date, days) { const t = Date.parse(`${date}T00:00:00Z`) + days * 86400000; return new Date(t).toISOString().slice(0, 10); }
export function dateLabel(date) { const [, m, d] = date.split('-').map(Number); return `${m}がつ${d}にち`; }
export function dateShort(date) { const [, m, d] = date.split('-').map(Number); return `${m}/${d}`; }

// もじれつ → 32ビットの かず（FNV-1a）
export function hashStr(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
export function dailyMods(date) { return pickMods(makeRng(hashStr(`arcanumber-daily-mods:${date}`))); }
export function dailySeed(date) { return hashStr(`arcanumber-daily-run:${date}`); }
// しゅじんこうと はじめの パック（3つの しゅるいと なかみ）も ひづけで きめる
export function dailyHero(date) { return hashStr(`arcanumber-daily-hero:${date}`) % HEROES.length; }
export function dailyPackTypes(date) {
  const els = HEROES[dailyHero(date)].els;
  const rng = makeRng(hashStr(`arcanumber-daily-packtypes:${date}`));
  return [els[0], els[1], rng.pick(PACK_TYPES)];
}
// パックの なかみ よう（あそびかたに よらず いつも おなじ じゅんばんで つかう）
export function dailyPackRng(date) { return makeRng(hashStr(`arcanumber-daily-packs:${date}`)); }

// ランキングに でる なまえ（ほんとうの なまえは つかわない）
const ADJ = ['すばやい', 'つよい', 'かしこい', 'ひかる', 'げんきな', 'ふしぎな', 'ゆうかんな', 'やさしい', 'きらきら', 'もりもり', 'のんびり', 'ちいさな', 'おおきな', 'まほうの', 'ほしの', 'にじいろの'];
const ANI = ['ドラゴン', 'ペンギン', 'キツネ', 'フクロウ', 'ネコ', 'ライオン', 'イルカ', 'パンダ', 'ウサギ', 'クマ', 'カメ', 'タカ', 'リス', 'オオカミ', 'ユニコーン', 'カエル'];
export function nameCandidates(rng, n = 3) {
  const out = new Set();
  let guard = 0;
  while (out.size < n && guard++ < 50) out.add(`${rng.pick(ADJ)} ${rng.pick(ANI)}`);
  return [...out];
}
export function newTag(rng) { return Array.from({ length: 4 }, () => '23456789abcdefghjkmnpqrstuvwxyz'[Math.floor(rng() * 31)]).join(''); }
