// パーティの最終能力値（基本能力 → シナジー・楽曲の補正 → 派生ステータス）
// 派生ステータスの式は仮。戦闘エンジンを作るときに調整する
import { IDOLS } from '../data/idols.js';
import { SONGS } from '../data/songs.js';
import { evaluateSynergies } from './synergy.js';

export const BASE_STATS = ['pow', 'vo', 'men', 'sta', 'dan', 'vis'];
export const DERIVED_STATS = ['hp', 'atk', 'mat', 'def', 'res', 'hit', 'eva', 'spd', 'crit'];
export const STAT_NAME = {
  pow: 'パワー', vo: 'ボーカル', men: 'メンタル', sta: 'スタミナ', dan: 'ダンス', vis: 'ビジュアル',
  hp: 'HP', atk: '攻撃', mat: '魔力', def: '防御', res: '魔防', hit: '命中', eva: '回避', spd: '素早さ', crit: '会心',
};
export const FRONT_SIZE = 3;
export const PARTY_SIZE = 6;

export function derive(b, level = 1) {
  return {
    hp: 8 + b.sta * 2 + b.pow + (level - 1) * Math.ceil(b.sta / 2),
    atk: b.pow * 2,
    mat: b.vo * 2,
    def: Math.floor(b.sta / 2),
    res: Math.floor(b.men / 2),
    hit: 50 + b.dan + Math.floor(b.vis / 2),
    eva: Math.floor((b.dan + b.vis) / 2),
    spd: b.dan * 2,
    crit: Math.floor(b.vis / 3),
  };
}

// slots: [{ idol: 'haruka', song: 'ready' | null }, ...] 先頭 FRONT_SIZE 人が前列
export function buildMembers(slots) {
  return slots.filter(Boolean).slice(0, PARTY_SIZE).map((s, i) => {
    const idol = IDOLS[s.idol];
    return { id: idol.id, idol, tags: idol.tags, row: i < FRONT_SIZE ? 'front' : 'back', song: s.song || null, level: s.level || 1 };
  });
}

function targets(to, members, holders, self) {
  switch (to) {
    case 'self': return [self];
    case 'holders': return holders;
    case 'front': return members.flatMap((m, i) => (m.row === 'front' ? [i] : []));
    case 'back': return members.flatMap((m, i) => (m.row === 'back' ? [i] : []));
    default: return members.map((_, i) => i);
  }
}

// 戻り値 { members: [{ ...member, stats, abilities, sources }], synergies }
export function computeParty(members) {
  const synergies = evaluateSynergies(members);
  const mods = members.map(() => ({ add: {}, pct: {}, abilities: [] }));
  const apply = (e, idxs, source) => {
    for (const i of idxs) {
      const m = mods[i];
      if (e.type === 'stat') {
        if (e.add) m.add[e.stat] = (m.add[e.stat] || 0) + e.add;
        if (e.pct) m.pct[e.stat] = (m.pct[e.stat] || 0) + e.pct;
      } else if (e.type === 'ability' && !m.abilities.some((a) => a.id === e.id)) {
        m.abilities.push({ id: e.id, name: e.name, text: e.text, source, to: e.to || 'party' });
      }
    }
  };
  for (const a of synergies.active) {
    for (const e of a.effects) apply(e, targets(e.to, members, a.holders, null), a.syn.name);
  }
  members.forEach((mem, i) => {
    const song = mem.song && SONGS[mem.song];
    if (!song) return;
    for (const e of song.effects) apply(e, targets(e.to || 'self', members, [i], i), song.title);
  });

  const out = members.map((mem, i) => {
    const { add, pct, abilities } = mods[i];
    const fix = (k, v) => Math.floor((v + (add[k] || 0)) * (100 + (pct[k] || 0)) / 100);
    const base = {};
    for (const k of BASE_STATS) base[k] = fix(k, mem.idol.base[k]);
    const d = derive(base, mem.level);
    const stats = { ...base };
    for (const k of DERIVED_STATS) stats[k] = fix(k, d[k]);
    const song = mem.song && SONGS[mem.song];
    return { ...mem, stats, abilities, live: song?.live || null };
  });
  return { members: out, synergies };
}
