// カードの データ
// type: rune(ルーン) / spell(じゅもんに いれる) / instant(すぐ つかう) / aura(けっかい：ばに のこる) / curse(おじゃま)
// el: fire water wood thunder shadow none
// rar: s(はじめ) c u r x(おじゃま)

export const ELEMENTS = {
  fire:    { name: 'ほのお', icon: '🔥', color: '#ff6a3d', dark: '#7a1e10' },
  water:   { name: 'みず', icon: '💧', color: '#3ea6ff', dark: '#0f3a6b' },
  wood:    { name: 'もり', icon: '🌿', color: '#4fd27e', dark: '#164a2a' },
  thunder: { name: 'いかずち', icon: '⚡', color: '#ffd23f', dark: '#6b5200' },
  shadow:  { name: 'やみ', icon: '🌙', color: '#b07cff', dark: '#3a1f6b' },
  none:    { name: 'むしょく', icon: '✦', color: '#cfc6b0', dark: '#3d382c' },
};
export const EL_LIST = ['fire', 'water', 'wood', 'thunder', 'shadow'];

export const TYPE_NAME = { rune: 'ルーン', spell: 'スペル', instant: 'インスタント', aura: 'けっかい', curse: 'のろい' };
export const TYPE_HELP = {
  rune: 'じゅもんに いれると {数|かず}だけ {力|ちから}が ふえる。{役|やく}を つくる もとに なる',
  spell: 'じゅもんに いれて つかう。おいた ばしょで はつどう する',
  instant: 'タップすると すぐに こうかが でる',
  aura: 'ばに はると、たたかいが おわるまで ずっと はたらく',
  curse: 'つかえない カード',
};
export const ENH = {
  foil: { name: 'きらめき', icon: '✨', text: 'かぞえると {力|ちから} +30' },
  flame: { name: 'ほむら', icon: '🔥', text: 'かぞえると {倍率|ばいりつ} +4' },
  glass: { name: 'ガラス', icon: '🔷', text: 'かぞえると {倍率|ばいりつ} ×2。4{回|かい}に 1{回|かい} われて きえる' },
  gold: { name: 'きん', icon: '🪙', text: 'かぞえると コイン +2' },
  wild: { name: 'にじ', icon: '🌈', text: 'どの ぞくせいとしても かぞえる' },
};

const K = {
  pow: '{力|ちから}', mult: '{倍率|ばいりつ}', shield: '{守|まも}り', rune: 'ルーン', hand: '{手札|てふだ}',
  teki: '{敵|てき}', mai: '{枚|まい}', kai: '{回|かい}', kazu: '{数|かず}', yaku: '{役|やく}', next: '{次|つぎ}',
};
export { K as TXT };

export const CARDS = {};
function def(c) { c.tags = c.tags || {}; c.cost = c.cost ?? 0; CARDS[c.id] = c; }

// ───── ルーン ─────
def({ id: 'rune', name: 'ルーン', type: 'rune', rar: 's', el: 'none',
  text: (up) => `${K.pow} +{v}` + (up ? `、${K.mult} +1` : '') });

// ───── むしょく ─────
def({ id: 'focus', name: '{力|ちから}を こめる', type: 'spell', el: 'none', rar: 's', cost: 1, icon: '✊',
  text: (up) => `${K.mult} +${up ? 3 : 2}`, exec: (c, i, up) => c.addMult(up ? 3 : 2) });
def({ id: 'guard', name: '{守|まも}りの じゅもん', type: 'spell', el: 'none', rar: 's', cost: 1, icon: '🛡️',
  text: (up) => `${K.shield} +${up ? 10 : 7}`, exec: (c, i, up) => c.addShield(up ? 10 : 7) });
def({ id: 'seed', name: '{力|ちから}の たね', type: 'spell', el: 'none', rar: 'c', cost: 1, icon: '🌰',
  text: (up) => `${K.pow} +${up ? 35 : 25}`, exec: (c, i, up) => c.addPower(up ? 35 : 25) });
def({ id: 'gather', name: 'あつめる じゅもん', type: 'spell', el: 'none', rar: 'u', cost: 1, icon: '🧲',
  text: (up) => `じゅもんの ${K.rune} 1${K.mai}に つき ${K.mult} +${up ? 2 : 1}`,
  exec: (c, i, up) => c.addMult(c.runeCount() * (up ? 2 : 1), `${K.rune} ${c.runeCount()}${K.mai}`) });
def({ id: 'square', name: '{九九|くく}の じゅもん', type: 'spell', el: 'none', rar: 'r', cost: 2, icon: '🔢',
  text: (up) => `いまの ${K.mult}が ${up ? 12 : 9}いか なら、${K.mult} × ${K.mult}`,
  fact: 'おなじ {数|かず}を かけると：3×3=9、4×4=16、5×5=25。{九九|くく}の {表|ひょう}の ななめの {数|かず}だよ',
  exec: (c, i, up) => { const m = c.mult; if (c.cond(`${K.mult} ${m} は ${up ? 12 : 9}いか？`, m <= (up ? 12 : 9))) c.xMult(m); } });
def({ id: 'barrier', name: 'けっかいの たて', type: 'instant', el: 'none', rar: 'c', cost: 1, icon: '🔰',
  text: (up) => `いますぐ ${K.shield} +${up ? 14 : 10}`, play: (b, up, api) => api.block(up ? 14 : 10) });
def({ id: 'insight', name: 'ひらめき', type: 'instant', el: 'none', rar: 'c', cost: 1, icon: '💡',
  text: (up) => `カードを 2${K.mai} ひく` + (up ? '（コスト 0）' : ''), costUp: 0, play: (b, up, api) => api.draw(2) });
def({ id: 'drum', name: 'いくさだいこ', type: 'aura', el: 'none', rar: 'u', cost: 2, icon: '🥁',
  text: (up) => `はなつ たびに この けっかいの ${K.mult}が +1 たまる。いまの ${K.mult}を たす` + (up ? '（コスト 1）' : ''), costUp: 1,
  onAfter: (c, a) => { if (a.n) c.addMult(a.n, null, a); c.later(() => { a.n = (a.n || 0) + 1; }); } });

// ───── ほのお ─────
def({ id: 'flameSpear', name: 'ほのおの やり', type: 'spell', el: 'fire', rar: 's', cost: 1, icon: '🔱',
  text: (up) => `${K.mult} +${up ? 6 : 4}`, exec: (c, i, up) => c.addMult(up ? 6 : 4) });
def({ id: 'spark', name: 'ひばな', type: 'spell', el: 'fire', rar: 'c', cost: 0, icon: '✨',
  text: (up) => `${K.mult} +${up ? 2 : 1}。🔥${K.rune}が 3${K.mai} いじょう なら かわりに +${up ? 7 : 5}`,
  exec: (c, i, up) => { const n = c.runesOf('fire').length; if (c.cond(`🔥${K.rune} ${n}${K.mai}`, n >= 3)) c.addMult(up ? 7 : 5); else c.addMult(up ? 2 : 1); } });
def({ id: 'inferno', name: 'ばくえん', type: 'spell', el: 'fire', rar: 'u', cost: 2, icon: '💥',
  text: (up) => `${K.mult} ×2` + (up ? '（コスト 1）' : ''), costUp: 1, exec: (c) => c.xMult(2) });
def({ id: 'phoenix', name: 'ふしちょう', type: 'spell', el: 'fire', rar: 'r', cost: 2, icon: '🦅',
  text: (up) => `${K.mult} ×3` + (up ? '' : '。たたかいで 1{回|かい}きり'), exhaust: (up) => !up, exec: (c) => c.xMult(3) });
def({ id: 'fireball', name: 'ファイアボール', type: 'instant', el: 'fire', rar: 'c', cost: 1, icon: '☄️',
  text: (up) => `この ターン ${K.mult} +${up ? 5 : 3}`, play: (b, up, api) => api.buff('mult', up ? 5 : 3) });
def({ id: 'fireAltar', name: 'ほのおの さいだん', type: 'aura', el: 'fire', rar: 'u', cost: 1, icon: '🕯️',
  text: (up) => `🔥${K.rune}を かぞえる たびに ${K.mult} +${up ? 2 : 1}`,
  onRune: (c, r, a, up) => { if (r.isEl('fire')) c.addMult(up ? 2 : 1, null, a); } });
def({ id: 'kiln', name: 'るつぼ', type: 'aura', el: 'fire', rar: 'r', cost: 2, icon: '🏺',
  text: (up) => `ターンの はじめに この ターン ${K.mult} +${up ? 6 : 4}`,
  onTurnStart: (b, a, up, api) => api.buff('mult', up ? 6 : 4) });

// ───── みず ─────
def({ id: 'wave', name: 'なみの {力|ちから}', type: 'spell', el: 'water', rar: 's', cost: 1, icon: '🌊',
  text: (up) => `💧${K.rune} 1${K.mai}に つき ${K.pow} +${up ? 15 : 10}`,
  exec: (c, i, up) => { const n = c.runesOf('water').length; c.addPower(n * (up ? 15 : 10), `💧 ${n}${K.mai}`); } });
def({ id: 'waterShield', name: 'みずの たて', type: 'spell', el: 'water', rar: 'c', cost: 1, icon: '🫧',
  text: (up) => `いまの ${K.pow}の はんぶん（÷2）だけ ${K.shield}` + (up ? ' +5' : ''),
  exec: (c, i, up) => c.addShield(Math.floor(c.power / 2) + (up ? 5 : 0), `${c.power} ÷ 2`) });
def({ id: 'tide', name: 'しおの みちひき', type: 'spell', el: 'water', rar: 'c', cost: 1, icon: '🌙',
  text: (up) => `${K.shield} +${up ? 8 : 5}。${K.next}の ターン カード +2${K.mai}`,
  exec: (c, i, up) => { c.addShield(up ? 8 : 5); c.later((b) => { b.extraDraw += 2; }); } });
def({ id: 'deepSea', name: 'しんかい', type: 'spell', el: 'water', rar: 'r', cost: 2, icon: '🐋',
  text: (up) => `${K.mult} × （💧${K.rune}の ${K.kazu}` + (up ? ' +1）' : '）'),
  exec: (c, i, up) => { const n = c.runesOf('water').length + (up ? 1 : 0); if (n > 1) c.xMult(n, `💧 ${n}`); else c.note('💧が たりない'); } });
def({ id: 'shuffle', name: 'かきまぜる', type: 'instant', el: 'water', rar: 'c', cost: 0, icon: '🌀',
  text: (up) => `いれかえ +${up ? 2 : 1}`, play: (b, up, api) => api.discards(up ? 2 : 1) });
def({ id: 'frost', name: 'こおりの いき', type: 'instant', el: 'water', rar: 'u', cost: 1, icon: '❄️',
  text: (up) => `${K.teki}に よわり ${up ? 2 : 1}ターン（${K.teki}の {攻撃|こうげき}が はんぶん）`, play: (b, up, api) => api.enemyStatus('weak', up ? 2 : 1) });
def({ id: 'waterVeil', name: 'みずの ころも', type: 'aura', el: 'water', rar: 'c', cost: 1, icon: '🧥',
  text: (up) => `ターンの おわりに ${K.shield} +${up ? 8 : 5}`, onTurnEnd: (b, a, up, api) => api.block(up ? 8 : 5) });
def({ id: 'wellspring', name: 'ちえの いずみ', type: 'aura', el: 'water', rar: 'u', cost: 1, icon: '⛲',
  text: (up) => `ターンの はじめに カード +1${K.mai}` + (up ? '（コスト 0）' : ''), costUp: 0, onTurnStart: (b, a, up, api) => api.draw(1) });

// ───── もり ─────
def({ id: 'sprout', name: 'めぶき', type: 'spell', el: 'wood', rar: 's', cost: 1, icon: '🌱',
  text: (up) => `${K.pow} +${up ? 20 : 15}。🌿${K.rune}が あれば さらに +${up ? 20 : 15}`,
  exec: (c, i, up) => { c.addPower(up ? 20 : 15); if (c.runesOf('wood').length) c.addPower(up ? 20 : 15, '🌿'); } });
def({ id: 'grow', name: 'おおきく そだつ', type: 'spell', el: 'wood', rar: 'u', cost: 1, icon: '🌳',
  text: (up) => `いまの ${K.pow}を 2{倍|ばい}に する` + (up ? `。そのあと ${K.pow} +10` : ''),
  exec: (c, i, up) => { c.xPower(2); if (up) c.addPower(10); } });
def({ id: 'bloom', name: 'はなざかり', type: 'spell', el: 'wood', rar: 'c', cost: 1, icon: '🌸',
  text: (up) => `🌿${K.rune} 1${K.mai}に つき ${K.mult} +${up ? 3 : 2}`,
  exec: (c, i, up) => { const n = c.runesOf('wood').length; c.addMult(n * (up ? 3 : 2), `🌿 ${n}${K.mai}`); } });
def({ id: 'roots', name: 'ねっこ', type: 'spell', el: 'wood', rar: 'c', cost: 1, icon: '🪵',
  text: (up) => `${K.shield} +${up ? 8 : 5}、${K.pow} +${up ? 15 : 10}`, exec: (c, i, up) => { c.addShield(up ? 8 : 5); c.addPower(up ? 15 : 10); } });
def({ id: 'paint', name: 'そめかえ', type: 'instant', el: 'wood', rar: 'u', cost: 1, icon: '🎨', target: 'rune',
  text: (up) => `${K.hand}の ${K.rune} 1${K.mai}の ぞくせいを かえる` + (up ? '（コスト 0）' : ''), costUp: 0,
  play: (b, up, api) => api.paintRune() });
def({ id: 'worldSeed', name: 'せかいじゅの め', type: 'aura', el: 'wood', rar: 'u', cost: 1, icon: '🌲',
  text: (up) => `はなつ たびに この けっかいの ${K.pow}が +${up ? 15 : 10} たまる。いまの ${K.pow}を たす`,
  onAfter: (c, a, up) => { const add = up ? 15 : 10; a.n = a.n || 0; c.addPower(a.n + add, null, a); c.later(() => { a.n += add; }); } });
def({ id: 'manaTree', name: 'マナの き', type: 'aura', el: 'wood', rar: 'r', cost: 2, icon: '🌴',
  text: (up) => `ターンの はじめに マナ +1` + (up ? '（コスト 1）' : ''), costUp: 1, onTurnStart: (b, a, up, api) => api.mana(1) });

// ───── いかずち ─────
def({ id: 'chain', name: 'れんさ', type: 'spell', el: 'thunder', rar: 's', cost: 1, icon: '⛓️',
  text: (up) => `${K.next}の ${K.rune}を もう ${up ? 2 : 1}${K.kai} かぞえる`, exec: (c, i, up) => c.retrigNext(up ? 2 : 1) });
def({ id: 'bolt', name: 'いなずま', type: 'spell', el: 'thunder', rar: 'u', cost: 2, icon: '🌩️',
  text: (up) => `ここまでの ${K.rune}を ぜんぶ もう{一度|いちど} かぞえる` + (up ? '（コスト 1）' : ''), costUp: 1, exec: (c, i) => c.rescoreBefore(i) });
def({ id: 'static', name: 'せいでんき', type: 'spell', el: 'thunder', rar: 'c', cost: 0, icon: '🔋',
  text: (up) => `${K.mult} +${up ? 2 : 1}。となりに ⚡${K.rune}が あれば 1${K.mai}に つき +${up ? 4 : 3}`,
  exec: (c, i, up) => { c.addMult(up ? 2 : 1); const n = c.neighbors(i).filter((r) => r && r.isEl('thunder')).length; if (n) c.addMult(n * (up ? 4 : 3), `となりの ⚡ ${n}`); } });
def({ id: 'storm', name: 'あらし', type: 'spell', el: 'thunder', rar: 'r', cost: 2, icon: '🌪️',
  text: (up) => `${K.yaku}に「かいだん」が あれば ${K.mult} ×${up ? 4 : 3}`,
  exec: (c, i, up) => { if (c.cond('かいだん が ある？', c.has('stair'))) c.xMult(up ? 4 : 3); } });
def({ id: 'shift', name: 'かずの まほう', type: 'instant', el: 'thunder', rar: 'u', cost: 1, icon: '🔀', target: 'rune',
  text: (up) => `${K.hand}の ${K.rune} 1${K.mai}の ${K.kazu}を 1 ふやすか へらす` + (up ? '（コスト 0）' : ''), costUp: 0,
  play: (b, up, api) => api.shiftRune() });
def({ id: 'thunderCloud', name: 'らいうん', type: 'aura', el: 'thunder', rar: 'u', cost: 1, icon: '⛈️',
  text: (up) => `じゅもんの いちばん みぎの ${K.rune}を もう${up ? ' 2' : ' 1'}${K.kai} かぞえる`,
  retrigger: (c, i, a, up) => (i === c.lastRuneIndex() ? (up ? 2 : 1) : 0) });

// ───── やみ ─────
def({ id: 'clone', name: 'かげぶんしん', type: 'spell', el: 'shadow', rar: 's', cost: 0, icon: '👥',
  text: (up) => `ひとつ まえの カードを もう{一度|いちど} うごかす` + (up ? `。${K.mult} +2` : ''), exec: (c, i, up) => { c.repeatPrev(i); if (up) c.addMult(2); } });
def({ id: 'pact', name: 'やみの けいやく', type: 'spell', el: 'shadow', rar: 'c', cost: 0, icon: '🩸',
  text: (up) => `HP −3。${K.mult} +${up ? 6 : 4}`, exec: (c, i, up) => { c.addMult(up ? 6 : 4); c.later((b, api) => api.selfDamage(3)); } });
def({ id: 'sacrifice', name: 'いけにえ', type: 'spell', el: 'shadow', rar: 'u', cost: 1, icon: '🕳️',
  text: (up) => `のこりの ${K.hand}を ぜんぶ すてる。1${K.mai}に つき ${K.mult} +${up ? 3 : 2}`,
  exec: (c, i, up) => { const n = c.handLeft(); c.addMult(n * (up ? 3 : 2), `${K.hand} ${n}${K.mai}`); c.later((b, api) => api.discardHand()); } });
def({ id: 'eclipse', name: 'にっしょく', type: 'spell', el: 'shadow', rar: 'r', cost: 2, icon: '🌑',
  text: (up) => `${K.yaku}に「ペア」が あれば ${K.mult} ×${up ? 4 : 3}`,
  exec: (c, i, up) => { if (c.cond('ペア が ある？', c.has('pair'))) c.xMult(up ? 4 : 3); } });
def({ id: 'hex', name: 'のろいの ことば', type: 'instant', el: 'shadow', rar: 'u', cost: 1, icon: '👁️',
  text: (up) => `${K.teki}を もろく する（${K.next}に うける ダメージ ×2）` + (up ? '（コスト 0）' : ''), costUp: 0, play: (b, up, api) => api.enemyStatus('vuln', 1) });
def({ id: 'twin', name: 'ふたご', type: 'instant', el: 'shadow', rar: 'r', cost: 1, icon: '🪞', target: 'rune',
  text: (up) => `${K.hand}の ${K.rune} 1${K.mai}を コピーして ${K.hand}に くわえる` + (up ? '（コスト 0）' : ''), costUp: 0, play: (b, up, api) => api.copyRune() });
def({ id: 'moonMirror', name: 'つきの かがみ', type: 'aura', el: 'shadow', rar: 'r', cost: 2, icon: '🪩',
  text: (up) => `ペアに なっている ${K.rune}を もう{一度|いちど} かぞえる` + (up ? '（コスト 1）' : ''), costUp: 1,
  retrigger: (c, i, a) => (c.inPair(i) ? 1 : 0) });
def({ id: 'darkPact', name: 'やみの ちかい', type: 'aura', el: 'shadow', rar: 'u', cost: 1, icon: '📜',
  text: (up) => `ターンの はじめに HP −${up ? 1 : 2}、カード +2${K.mai}`, onTurnStart: (b, a, up, api) => { api.selfDamage(up ? 1 : 2); api.draw(2); } });
def({ id: 'manaShard', name: 'マナの かけら', type: 'instant', el: 'none', rar: 'u', cost: 0, icon: '🔹',
  text: (up) => `マナ +${up ? 3 : 2}。たたかいで 1{回|かい}きり`, exhaust: () => true, play: (b, up, api) => api.mana(up ? 3 : 2) });

// ───── デッキの かたちで つよく なる カード ─────
def({ id: 'fireHeart', name: 'ほのおの こころ', type: 'spell', el: 'fire', rar: 'u', cost: 1, icon: '❤️‍🔥',
  text: (up) => `${K.hand}に のこした 🔥${K.rune} 1${K.mai}に つき ${K.mult} +${up ? 4 : 3}`,
  exec: (c, i, up) => { const n = c.handRunesOf('fire'); c.addMult(n * (up ? 4 : 3), `てふだの 🔥 ${n}${K.mai}`); } });
def({ id: 'waterHeart', name: 'みずの こころ', type: 'spell', el: 'water', rar: 'u', cost: 1, icon: '💙',
  text: (up) => `${K.hand}に のこした カード 1${K.mai}に つき ${K.shield} +${up ? 5 : 4}`,
  exec: (c, i, up) => { const n = c.handLeft(); c.addShield(n * (up ? 5 : 4), `てふだ ${n}${K.mai}`); } });
def({ id: 'woodHeart', name: 'もりの こころ', type: 'spell', el: 'wood', rar: 'u', cost: 1, icon: '💚',
  text: (up) => `やまに のこっている 🌿${K.rune} 1${K.mai}に つき ${K.pow} +${up ? 15 : 10}`,
  exec: (c, i, up) => { const n = c.drawRunesOf('wood'); c.addPower(n * (up ? 15 : 10), `やまの 🌿 ${n}${K.mai}`); } });
def({ id: 'thunderHeart', name: 'いかずちの こころ', type: 'spell', el: 'thunder', rar: 'u', cost: 1, icon: '💛',
  text: (up) => `じゅもんの ⚡${K.rune}を ぜんぶ もう{一度|いちど} かぞえる` + (up ? '（コスト 0）' : ''), costUp: 0,
  exec: (c, i) => { const list = c.runesOf('thunder'); if (!list.length) { c.note('⚡が ない'); return; } for (const k of list) c.scoreRune(k, true); c.curSlot = i; } });
def({ id: 'shadowHeart', name: 'やみの こころ', type: 'spell', el: 'shadow', rar: 'u', cost: 1, icon: '💜',
  text: (up) => `すてふだ ${up ? 2 : 3}${K.mai}に つき ${K.mult} +1`,
  exec: (c, i, up) => { const n = Math.floor(c.discardCount() / (up ? 2 : 3)); c.addMult(n, `すてふだ ${c.discardCount()}${K.mai}`); } });
def({ id: 'fewMagic', name: 'ひとにぎりの まほう', type: 'spell', el: 'none', rar: 'r', cost: 1, icon: '🤏',
  text: (up) => `デッキが ${up ? 14 : 12}${K.mai} いか なら ${K.mult} ×3`,
  fact: 'デッキの {枚|まい}すうが すくないと、つよい カードを なんども ひける。デッキを すっきり させる ことも だいじな さくせん！',
  exec: (c, i, up) => { const d = c.deckSize(); if (c.cond(`デッキ ${d}${K.mai}`, d <= (up ? 14 : 12))) c.xMult(3); } });
def({ id: 'manyMagic', name: 'たいぐんの まほう', type: 'spell', el: 'none', rar: 'u', cost: 1, icon: '🐜',
  text: (up) => `デッキ 5${K.mai}に つき ${K.pow} +${up ? 12 : 8}`,
  exec: (c, i, up) => { const d = c.deckSize(); c.addPower(Math.floor(d / 5) * (up ? 12 : 8), `${d} ÷ 5`); } });

// ───── おじゃま ─────
def({ id: 'sleepy', name: 'ねむけ', type: 'curse', el: 'none', rar: 'x', icon: '💤', unplayable: true, text: () => 'つかえない。たたかいが おわると きえる' });
def({ id: 'web', name: 'くもの いと', type: 'curse', el: 'none', rar: 'x', icon: '🕸️', unplayable: true, text: () => 'つかえない。たたかいが おわると きえる' });
def({ id: 'void', name: 'ゼロの のろい', type: 'curse', el: 'none', rar: 'x', icon: '⚫', unplayable: true, text: () => 'つかえない。たたかいが おわると きえる' });

export function cardCost(inst) {
  const c = CARDS[inst.id];
  if (inst.up && c.costUp !== undefined) return c.costUp;
  return c.cost || 0;
}
export function cardEl(inst) { return inst.id === 'rune' ? inst.el : CARDS[inst.id].el; }
export function rewardableCards() {
  return Object.values(CARDS).filter((c) => c.type !== 'rune' && c.type !== 'curse');
}
