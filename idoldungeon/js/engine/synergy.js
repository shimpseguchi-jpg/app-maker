// シナジー判定（画面・戦闘から独立した純粋関数）
// members: [{ id, tags: [...], row: 'front' | 'back', song: songId | null }]（並び順＝隊列の位置）
import { SYNERGIES } from '../data/synergies.js';
import { SONGS } from '../data/songs.js';
import { TAGS } from '../data/tags.js';

const holdersOf = (members, tag) => members.flatMap((m, i) => (m.tags.includes(tag) ? [i] : []));

// combo 用：all の各タグに「別々のメンバー」を割り当てられるか（6人×数タグなので総当たりで十分）
export function matchDistinct(members, tags) {
  const used = new Set();
  const pick = [];
  const go = (k) => {
    if (k === tags.length) return true;
    for (const i of holdersOf(members, tags[k])) {
      if (used.has(i)) continue;
      used.add(i); pick.push(i);
      if (go(k + 1)) return true;
      used.delete(i); pick.pop();
    }
    return false;
  };
  return go(0) ? pick.slice() : null;
}

// 「THE IDOLM@STER」など、人数で段階が上がるシナジーを水増しする効果
function countBonus(members) {
  return members.some((m) => m.song && SONGS[m.song]?.effects.some((e) => e.type === 'ability' && e.id === 'synergyUp')) ? 1 : 0;
}

// 戻り値 { active: 発動中, near: あと1歩で発動 }
// active[i] = { syn, tier, count, holders, effects }
export function evaluateSynergies(members, list = SYNERGIES) {
  const active = [], near = [];
  const bonus = countBonus(members);
  for (const syn of list) {
    if (syn.kind === 'count' || syn.kind === 'distinct') {
      let holders, count;
      if (syn.kind === 'count') {
        holders = holdersOf(members, syn.tag);
        count = holders.length;
        if (count >= syn.tiers[0].n) count += bonus; // 発動中のものだけ水増し
      } else {
        const kinds = new Set(members.flatMap((m) => m.tags.filter((t) => TAGS[t]?.cat === syn.cat)));
        holders = members.map((_, i) => i);
        count = kinds.size;
      }
      const reached = syn.tiers.filter((t) => count >= t.n);
      const next = syn.tiers.find((t) => count < t.n);
      if (reached.length) {
        const tier = reached[reached.length - 1];
        active.push({ syn, tier: tier.n, count, holders, effects: tier.effects });
      }
      if (next && count === next.n - 1) near.push({ syn, tier: next.n, count, need: 1 });
    } else if (syn.kind === 'combo') {
      const pick = matchDistinct(members, syn.all);
      if (pick) {
        const holders = [...new Set(syn.all.flatMap((t) => holdersOf(members, t)))].sort((a, b) => a - b);
        active.push({ syn, tier: null, count: syn.all.length, holders, effects: syn.effects });
      } else {
        const missing = syn.all.filter((t) => !holdersOf(members, t).length);
        if (missing.length === 1) near.push({ syn, tier: null, missing });
      }
    }
  }
  return { active, near };
}
