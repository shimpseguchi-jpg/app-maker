// まきもの（1{回|かい}だけ つかえる どうぐ）
import { HANDS } from './hands.js';
import { TXT as K } from './cards.js';

export const SCROLLS = {
  star: { name: 'ほしの しょ', icon: '📘', rar: 'c', where: 'any',
    text: (s) => `${K.yaku}「${HANDS[s.hand].name}」の レベルを 1 あげる（${K.pow}と ${K.mult}が ふえる）` },
  potion: { name: 'いやしの くすり', icon: '🧪', rar: 'c', where: 'any', text: () => 'HPを 20 かいふく' },
  mana: { name: 'マナの しずく', icon: '💠', rar: 'c', where: 'battle', text: () => 'この ターン マナ +2' },
  bomb: { name: 'こだまの まきもの', icon: '💣', rar: 'u', where: 'battle', text: () => `${K.teki}に「さいごに あたえた ダメージ」と おなじ ダメージ` },
  plus: { name: 'かずの まきもの', icon: '➕', rar: 'c', where: 'deck', text: () => `デッキの ${K.rune} 1${K.mai}の ${K.kazu}を +1（ずっと）` },
  minus: { name: 'へらしの まきもの', icon: '➖', rar: 'c', where: 'deck', text: () => `デッキの ${K.rune} 1${K.mai}の ${K.kazu}を −1（ずっと）` },
  paint: { name: 'そめかえの まきもの', icon: '🖌️', rar: 'c', where: 'deck', text: () => `デッキの ${K.rune} 1${K.mai}の ぞくせいを かえる（ずっと）` },
  foil: { name: 'きらめきの まきもの', icon: '✨', rar: 'u', where: 'deck', enh: 'foil', text: () => `${K.rune} 1${K.mai}を「きらめき」に（かぞえると ${K.pow} +30）` },
  flame: { name: 'ほむらの まきもの', icon: '🔥', rar: 'u', where: 'deck', enh: 'flame', text: () => `${K.rune} 1${K.mai}を「ほむら」に（かぞえると ${K.mult} +4）` },
  glass: { name: 'ガラスの まきもの', icon: '🔷', rar: 'u', where: 'deck', enh: 'glass', text: () => `${K.rune} 1${K.mai}を「ガラス」に（${K.mult} ×2、ときどき われる）` },
  gold: { name: 'こがねの まきもの', icon: '🪙', rar: 'c', where: 'deck', enh: 'gold', text: () => `${K.rune} 1${K.mai}を「きん」に（かぞえると コイン +2）` },
  wild: { name: 'にじの まきもの', icon: '🌈', rar: 'u', where: 'deck', enh: 'wild', text: () => `${K.rune} 1${K.mai}を「にじ」に（どの ぞくせいとしても かぞえる）` },
  twin: { name: 'ふたごの まきもの', icon: '♊', rar: 'u', where: 'deck', text: () => `デッキの ${K.rune} 1${K.mai}を コピーして ふやす` },
  forget: { name: 'わすれの まきもの', icon: '🗑️', rar: 'c', where: 'deck', text: () => 'デッキの カード 1{枚|まい}を けす' },
};
export const SCROLL_PRICE = { c: 3, u: 4 };
export function scrollName(s) { return SCROLLS[s.id].name + (s.id === 'star' ? `「${HANDS[s.hand].name}」` : ''); }
