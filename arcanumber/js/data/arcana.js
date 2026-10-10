// アルカナ（ずっと つかえる おまもり。ひだりから じゅんばんに はたらく）
// rar: c u r / price: コイン
import { TXT as K } from './cards.js';

export const ARCANA = {};
function def(a) { ARCANA[a.id] = a; }
const P = { c: 5, u: 7, r: 9 };

// ぞくせいの しるし
for (const [el, nm, ic] of [['fire', 'ほのお', '🔥'], ['water', 'みず', '💧'], ['wood', 'もり', '🌿'], ['thunder', 'いかずち', '⚡'], ['shadow', 'やみ', '🌙']]) {
  def({ id: 'sigil_' + el, name: `${nm}の しるし`, icon: ic, rar: 'c', tag: el,
    text: `${ic}${K.rune}を かぞえる たびに ${K.mult} +2`,
    onRune: (c, r, a) => { if (r.isEl(el)) c.addMult(2, null, a); } });
}
def({ id: 'pairCharm', name: 'ふたごの おまもり', icon: '👯', rar: 'c', text: `${K.yaku}に ペアが あれば ${K.mult} +8`,
  onAfter: (c, a) => { if (c.has('pair')) c.addMult(8, null, a); } });
def({ id: 'stairBoots', name: 'かいだんの くつ', icon: '🥾', rar: 'c', text: `${K.yaku}に かいだんが あれば ${K.mult} +12`,
  onAfter: (c, a) => { if (c.has('stair')) c.addMult(12, null, a); } });
def({ id: 'tenRing', name: 'じゅうの ゆびわ', icon: '💍', rar: 'c', text: `${K.yaku}に じゅうの わが あれば ${K.pow} +60`, math: true,
  onAfter: (c, a) => { if (c.has('ten')) c.addPower(60, null, a); } });
def({ id: 'kukuScroll', name: '{九九|くく}の まきもの', icon: '📜', rar: 'u', text: `${K.yaku}に くくの わが あれば ${K.mult} ×3`, math: true,
  onAfter: (c, a) => { if (c.has('kuku')) c.xMult(3, null, a); } });
def({ id: 'trioCrown', name: 'みつごの かんむり', icon: '👑', rar: 'u', text: `${K.yaku}に スリーカードが あれば ${K.mult} ×2`,
  onAfter: (c, a) => { if (c.has('triple')) c.xMult(2, null, a); } });
def({ id: 'palette', name: 'えのぐばこ', icon: '🎨', rar: 'u', text: `${K.yaku}に いろそろいが あれば ${K.mult} ×2`,
  onAfter: (c, a) => { if (c.has('flush')) c.xMult(2, null, a); } });
def({ id: 'evenStaff', name: 'ぐうすうの つえ', icon: '🪄', rar: 'c', text: `2で わりきれる ${K.rune}（2・4・6・8・10）を かぞえる たびに ${K.mult} +2`, math: true,
  onRune: (c, r, a) => { if (r.v != null && r.v % 2 === 0) c.addMult(2, null, a); } });
def({ id: 'oddStaff', name: 'きすうの つえ', icon: '🦯', rar: 'c', text: `2で わりきれない ${K.rune}（1・3・5・7・9）を かぞえる たびに ${K.pow} +15`, math: true,
  onRune: (c, r, a) => { if (r.v != null && r.v % 2 === 1) c.addPower(15, null, a); } });
def({ id: 'smallStar', name: 'ちいさな ほし', icon: '⭐', rar: 'c', text: `3いかの ${K.rune}を かぞえる たびに ${K.mult} +3`,
  onRune: (c, r, a) => { if (r.v != null && r.v <= 3) c.addMult(3, null, a); } });
def({ id: 'bigMoon', name: 'おおきな つき', icon: '🌕', rar: 'c', text: `8いじょうの ${K.rune}を かぞえる たびに ${K.pow} +20`,
  onRune: (c, r, a) => { if (r.v != null && r.v >= 8) c.addPower(20, null, a); } });
def({ id: 'abacus', name: 'そろばん', icon: '🧮', rar: 'c', text: `いつでも ${K.mult} +4`, onAfter: (c, a) => c.addMult(4, null, a) });
def({ id: 'fiveStar', name: 'いつつぼし', icon: '🌟', rar: 'u', text: `じゅもんの 5${K.mai}が ぜんぶ ${K.rune}なら ${K.mult} ×3`,
  onAfter: (c, a) => { if (c.runeCount() === 5) c.xMult(3, null, a); } });
def({ id: 'minimal', name: 'ひかえめな はね', icon: '🪶', rar: 'c', text: `じゅもんの カードが 3${K.mai}いか なら ${K.mult} +10`,
  onAfter: (c, a) => { if (c.cardCount() <= 3) c.addMult(10, null, a); } });
def({ id: 'snowball', name: 'ゆきだるま', icon: '⛄', rar: 'u', text: `はなつ たびに ${K.mult}が +1 ずつ たまって いく（ずっと）`, grows: true,
  onAfter: (c, a) => { if (a.n) c.addMult(a.n, null, a); c.later(() => { a.n = (a.n || 0) + 1; }); } });
def({ id: 'treeRings', name: 'ねんりん', icon: '🪵', rar: 'u', text: `🌿${K.rune}を かぞえる たびに この アルカナの ${K.pow}が +5 たまる（ずっと）`, grows: true,
  onRune: (c, r, a) => { if (r.isEl('wood')) c.later(() => { a.n = (a.n || 0) + 5; }); },
  onAfter: (c, a) => { if (a.n) c.addPower(a.n, null, a); } });
def({ id: 'silverMirror', name: 'ぎんの かがみ', icon: '🪞', rar: 'u', text: `いちばん ひだりの ${K.rune}を もう{一度|いちど} かぞえる`,
  retrigger: (c, i) => (i === c.firstRuneIndex() ? 1 : 0) });
def({ id: 'echo', name: 'やまびこ', icon: '🏔️', rar: 'r', text: `いちばん みぎの ${K.rune}を もう 2${K.kai} かぞえる`,
  retrigger: (c, i) => (i === c.lastRuneIndex() ? 2 : 0) });
def({ id: 'manaWell', name: 'マナの いずみ', icon: '🔮', rar: 'r', text: 'まいターン マナ +1', passive: { mana: 1 } });
def({ id: 'bag', name: 'おおきな かばん', icon: '🎒', rar: 'u', text: `まいターン ${K.hand} +1${K.mai}`, passive: { hand: 1 } });
def({ id: 'glove', name: 'まぜまぜ てぶくろ', icon: '🧤', rar: 'c', text: 'まいターン いれかえ +1', passive: { discards: 1 } });
def({ id: 'emblem', name: 'たての もんしょう', icon: '🛡️', rar: 'c', text: `はなつ とき ${K.rune} 1${K.mai}に つき ${K.shield} +3`,
  onAfter: (c, a) => { const n = c.runeCount(); if (n) c.addShield(n * 3, null, a); } });
def({ id: 'thorns', name: 'いばらの かんむり', icon: '🌹', rar: 'u', text: `${K.shield}が ターンを こえても なくならない`, passive: { keepBlock: true } });
def({ id: 'piggy', name: 'ちょきんばこ', icon: '🐷', rar: 'c', text: 'たたかいに かつと コイン +3', passive: { winCoins: 3 } });
def({ id: 'goldFang', name: 'きんの きば', icon: '🦷', rar: 'u', text: `コイン 5${K.mai}に つき ${K.mult} +1`, math: true,
  onAfter: (c, a) => { const n = Math.floor(c.coins / 5); if (n) c.addMult(n, `${c.coins} ÷ 5`, a); } });
def({ id: 'prism', name: 'にじの プリズム', icon: '💎', rar: 'r', text: `じゅもんの ${K.rune}の ぞくせいが 4しゅるい いじょう なら ${K.mult} ×3`,
  onAfter: (c, a) => { if (c.elementKinds() >= 4) c.xMult(3, null, a); } });
def({ id: 'hourglass', name: 'すなどけい', icon: '⏳', rar: 'u', text: `たたかいの 1ターンめは ${K.mult} ×3`,
  onAfter: (c, a) => { if (c.turn === 1) c.xMult(3, null, a); } });
def({ id: 'clockwork', name: 'からくり どけい', icon: '⚙️', rar: 'c', text: `${K.mult} + （いまの ターン ${K.kazu}）`,
  onAfter: (c, a) => c.addMult(c.turn, `ターン ${c.turn}`, a) });
def({ id: 'fang', name: 'きゅうけつの きば', icon: '🧛', rar: 'r', text: `ダメージ 50ごとに HP +1（さいだい 8）`, math: true, passive: { lifesteal: 50 } });
def({ id: 'cat', name: 'くろねこの ひげ', icon: '🐈‍⬛', rar: 'r', text: `${K.mult} ×2。でも たたかいの あとに 6{回|かい}に 1{回|かい} にげて しまう`,
  onAfter: (c, a) => c.xMult(2, null, a), passive: { fleeChance: 6 } });
def({ id: 'joker7', name: 'ラッキーセブン', icon: '🎰', rar: 'u', text: `7の ${K.rune}を かぞえる たびに ${K.pow} +17、${K.mult} +7`,
  onRune: (c, r, a) => { if (r.v === 7) { c.addPower(17, null, a); c.addMult(7, null, a); } } });

export function arcanaPrice(id) { return P[ARCANA[id].rar]; }
export function arcanaPool(rar, owned) {
  const ids = owned.map((a) => a.id);
  return Object.values(ARCANA).filter((a) => a.rar === rar && !ids.includes(a.id));
}
