// しゅじんこう こうほ 4にん・せんせい 3にん・きょうか
export const SUBJECTS = ['math', 'ja', 'en'];
export const SUBJ = {
  math: { name: '{算数|さんすう}', short: 'さんすう', icon: '🔢', color: '#3d8bff', zone: 'かずの ひろば' },
  ja: { name: '{国語|こくご}', short: 'こくご', icon: '📖', color: '#ff5fa2', zone: 'ことばの もり' },
  en: { name: '{英語|えいご}', short: 'えいご', icon: '🔤', color: '#2fbf71', zone: 'えいごの うみ' },
};

export const HEROES = [
  { id: 'ken', name: 'ケン', emoji: '🧒', color: '#3d8bff', fav: 'math', style: 'rush', card: 'hero_math',
    line: 'けいさんは ぼくに まかせて！ いちばんに ゴールするぞ', desc: 'さんすうが とくい。せんこうタイプ' },
  { id: 'momo', name: 'モモ', emoji: '👧', color: '#ff5fa2', fav: 'ja', style: 'block', card: 'hero_ja',
    line: 'ことばの ちからで みんなを おいぬくよ！', desc: 'こくごが とくい。アイテムで じゃまする タイプ' },
  { id: 'lily', name: 'リリー', emoji: '👱‍♀️', color: '#2fbf71', fav: 'en', style: 'safe', card: 'hero_en',
    line: 'Hello! えいごなら だれにも まけないわ', desc: 'えいごが とくい。あんぜん だいいちの タイプ' },
  { id: 'sora', name: 'ソラ', emoji: '🧑', color: '#ffc21a', fav: null, style: 'balance', card: 'hero_all',
    line: 'なんでも ちょっとずつ できるのが じまん！', desc: 'バランスがた。どの きょうかも ふつう' },
];
export const heroById = (id) => HEROES.find((h) => h.id === id);

export const TEACHERS = {
  math: { name: 'かずき{先生|せんせい}', emoji: '👨‍🏫' },
  ja: { name: 'ことは{先生|せんせい}', emoji: '👩‍🏫' },
  en: { name: 'エミリー{先生|せんせい}', emoji: '👩‍🦰' },
};

export const RANKS = [[800, 'S'], [650, 'A'], [500, 'B'], [400, 'C'], [300, 'D'], [200, 'E'], [100, 'F'], [0, 'G']];
export function rankOf(v) { for (const [th, r] of RANKS) if (v >= th) return r; return 'G'; }
export const RANK_INDEX = { G: 0, F: 1, E: 2, D: 3, C: 4, B: 5, A: 6, S: 7 };
export const MOODS = ['😢', '😐', '🙂', '😄', '🤩'];
export const MOOD_MUL = [0.6, 0.8, 1.0, 1.2, 1.5];
