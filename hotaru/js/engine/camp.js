// キャンプ（おみせ）の ルール
import { ITEMS, BAG_MAX, WEAPONS, SHIELDS } from '../data/items.js';

export function buyItem(P, id) {
  const it = ITEMS[id];
  if (P.gold < it.price) return 'gold';
  if (P.bag.length >= BAG_MAX) return 'full';
  P.gold -= it.price; P.bag.push(id);
  return null;
}
// おみせに ならぶ そうび：ボスを たおす たびに 1だんかい ふえる（ひかりの そうびは たからばこ だけ）
export const shopTier = (P) => Math.min(3, 1 + P.bosses.filter((f) => f < 9).length);
export function nextEquip(P, kind) {
  const list = kind === 'weapon' ? WEAPONS : SHIELDS, cur = P[kind];
  const t = cur + 1;
  return t <= shopTier(P) ? { tier: t, ...list[t] } : null;
}
export function buyEquip(P, kind) {
  const e = nextEquip(P, kind);
  if (!e) return 'none';
  if (P.gold < e.price) return 'gold';
  P.gold -= e.price; P[kind] = e.tier;
  return null;
}
export function sellItem(P, id) {
  const i = P.bag.indexOf(id);
  if (i < 0) return 0;
  const n = Math.max(5, Math.floor(ITEMS[id].price / 2));
  P.bag.splice(i, 1); P.gold += n;
  return n;
}
