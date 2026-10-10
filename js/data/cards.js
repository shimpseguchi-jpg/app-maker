// カードの データ
// cat: add(たしざん) sub(ひきざん) mul(かけざん) div(わりざん) prog(プログラム) def(まもり)
//      atk(こうげき) shape(かたち) know(ちしき) junk(おじゃま)
// rar: s=はじめから c=よくある u=ちょっと めずらしい r=レア x=おじゃま
// grade: この がくねんから でてくる

export const CATS = {
  add:   { name: '{足|た}し{算|ざん}', color: '#ff7a45', sym: '+' },
  sub:   { name: '{引|ひ}き{算|ざん}', color: '#3d8bff', sym: '−' },
  mul:   { name: 'かけ{算|ざん}', color: '#2fbf71', sym: '×' },
  div:   { name: 'わり{算|ざん}', color: '#9b5cff', sym: '÷' },
  prog:  { name: 'プログラム', color: '#ffc21a', sym: '🔁' },
  def:   { name: '{守|まも}り', color: '#20b9c9', sym: '🛡' },
  atk:   { name: '{攻撃|こうげき}', color: '#ff4f7b', sym: '⚔' },
  shape: { name: 'かたち', color: '#ff6fd0', sym: '△' },
  know:  { name: 'ちしき', color: '#c48a3a', sym: '📖' },
  junk:  { name: 'おじゃま', color: '#8a8a9a', sym: '💤' },
};

export const RARITY_NAME = { s: 'はじめの カード', c: 'よくある', u: 'めずらしい', r: 'レア', x: 'おじゃま' };

const K = {
  kazu: '{数|かず}',
  tasu: '{足|た}す',
  mamori: '{守|まも}り',
  ashi: '{足|あし}',
  kado: 'かど',
  mouichido: 'もう{一度|いちど}',
  tsugi: '{次|つぎ}',
  kai: '{回|かい}',
  bai: '{倍|ばい}',
  kougeki: '{攻撃|こうげき}',
  teki: '{敵|てき}',
  zenin: '{全員|ぜんいん}',
};

export const CARDS = {};
function def(c) {
  c.tags = c.tags || {};
  c.grade = c.grade || 1;
  CARDS[c.id] = c;
}

// ちしきカードの いきもの / かたち は 「あしの かず」「かどの かず」を つかう
function legBonus(ctx, card) {
  let n = card.tags.legs;
  const extra = [];
  if (card.tags.insect && ctx.has('magnifier')) { n += 3; extra.push('むしめがね +3'); }
  if (ctx.has('socks')) { n += 2; extra.push('くつした +2'); }
  return { n, extra };
}

// ───── たしざん ─────
def({ id: 'p2', name: '{足|た}す 2', cat: 'add', rar: 's', face: '+2',
  text: (up) => `${K.kazu}に ${up ? 4 : 2}を ${K.tasu}`,
  exec: (c, i, up) => c.add(up ? 4 : 2) });
def({ id: 'p3', name: '{足|た}す 3', cat: 'add', rar: 's', face: '+3',
  text: (up) => `${K.kazu}に ${up ? 5 : 3}を ${K.tasu}`,
  exec: (c, i, up) => c.add(up ? 5 : 3) });
def({ id: 'p4', name: '{足|た}す 4', cat: 'add', rar: 'c', face: '+4',
  text: (up) => `${K.kazu}に ${up ? 6 : 4}を ${K.tasu}`,
  exec: (c, i, up) => c.add(up ? 6 : 4) });
def({ id: 'p5', name: '{足|た}す 5', cat: 'add', rar: 'c', face: '+5',
  text: (up) => `${K.kazu}に ${up ? 7 : 5}を ${K.tasu}`,
  exec: (c, i, up) => c.add(up ? 7 : 5) });
def({ id: 'p10', name: '10の たば', cat: 'add', rar: 'u', face: '+10',
  text: (up) => `${K.kazu}に 10を ${K.tasu}` + (up ? `。${K.mamori} +4` : ''),
  exec: (c, i, up) => { c.add(10); if (up) c.block(4); } });
def({ id: 'ten', name: '10の まとまり', cat: 'add', rar: 'u', face: '→10',
  text: (up) => `${K.tsugi}の 10の まとまりまで ${K.tasu}` + (up ? `。${K.mamori} +3` : ''),
  fact: '7は あと 3で 10。 8は あと 2で 10。 10の まとまりを つくると {計算|けいさん}が らくに なるよ',
  exec: (c, i, up) => {
    const target = (Math.floor(c.v / 10) + 1) * 10;
    c.add(target - c.v, `あと ${target - c.v}で ${target}`);
    if (up) c.block(3);
  } });

// ───── ひきざん ─────
def({ id: 'm2', name: 'けずる', cat: 'sub', rar: 'c', face: '−2',
  text: (up) => `${K.kazu}から 2を {引|ひ}く。${K.mamori} +${up ? 8 : 5}`,
  exec: (c, i, up) => { c.sub(2); c.block(up ? 8 : 5); } });
def({ id: 'm1', name: 'ちょこっと', cat: 'sub', rar: 'u', face: '−1',
  text: (up) => `${K.kazu}から 1を {引|ひ}く。${K.tsugi}の ターン カード +${up ? 2 : 1}{枚|まい}`,
  exec: (c, i, up) => { c.sub(1); c.extraDraw(up ? 2 : 1); } });
def({ id: 'm5', name: 'ひきざん たて', cat: 'sub', rar: 'u', face: '−5',
  text: (up) => `5を {引|ひ}く。{引|ひ}いた ぶんの 2${K.bai}を ${K.mamori}に` + (up ? '（+3）' : ''),
  exec: (c, i, up) => { const b = c.v; c.sub(5); c.block((b - c.v) * 2 + (up ? 3 : 0)); } });

// ───── かけざん ─────
def({ id: 'x2', name: 'かける 2', cat: 'mul', rar: 's', grade: 2, face: '×2',
  text: (up) => up ? `1 ${K.tasu}してから、2${K.bai}に する` : `${K.kazu}を 2${K.bai}に する`,
  exec: (c, i, up) => { if (up) c.add(1); c.mul(2); } });
def({ id: 'x3', name: 'かける 3', cat: 'mul', rar: 'u', grade: 2, face: '×3',
  text: (up) => up ? `1 ${K.tasu}してから、3${K.bai}に する` : `${K.kazu}を 3${K.bai}に する`,
  exec: (c, i, up) => { if (up) c.add(1); c.mul(3); } });
def({ id: 'x4', name: 'かける 4', cat: 'mul', rar: 'u', grade: 2, face: '×4',
  text: (up) => up ? `1 ${K.tasu}してから、4${K.bai}に する` : `${K.kazu}を 4${K.bai}に する`,
  exec: (c, i, up) => { if (up) c.add(1); c.mul(4); } });
def({ id: 'x5', name: 'かける 5', cat: 'mul', rar: 'r', grade: 2, face: '×5',
  text: (up) => up ? `2 ${K.tasu}してから、5${K.bai}に する` : `${K.kazu}を 5${K.bai}に する`,
  exec: (c, i, up) => { if (up) c.add(2); c.mul(5); } });
def({ id: 'sq', name: '{九九|くく}の まほう', cat: 'mul', rar: 'r', grade: 2, face: 'n×n',
  text: (up) => `${K.kazu}が ${up ? 12 : 9}いか なら、おなじ ${K.kazu}を かける`,
  fact: 'おなじ {数|かず}どうしの かけ{算|ざん}：2×2=4、3×3=9、4×4=16 … {九九|くく}の {表|ひょう}の ななめに ならんで いるよ',
  exec: (c, i, up) => {
    const lim = up ? 12 : 9;
    if (c.cond(`${c.v} は ${lim}いか？`, c.v <= lim && c.v > 0)) c.mul(c.v);
  } });

// ───── わりざん ─────
def({ id: 'd2', name: 'はんぶんこ', cat: 'div', rar: 's', grade: 3, face: '÷2',
  text: (up) => `2で わる。のこりの はんぶんは ${K.mamori}に` + (up ? '（+3）' : ''),
  exec: (c, i, up) => { const b = c.v; c.div(2); c.block(b - c.v + (up ? 3 : 0)); } });
def({ id: 'd3', name: '3にんで わけっこ', cat: 'div', rar: 'u', grade: 3, face: '÷3',
  text: (up) => `${K.kazu}を 3で わる。あまりが なければ ${K.mamori} +${up ? 15 : 10}`,
  fact: 'わりきれる ＝ あまりが 0。 12÷3=4 は わりきれる。 13÷3=4 あまり 1 は わりきれない',
  exec: (c, i, up) => { const r = c.div(3); if (c.cond('あまりは 0？', r.r === 0)) c.block(up ? 15 : 10); } });
def({ id: 'halfShield', name: 'はんぶん たて', cat: 'div', rar: 'u', grade: 3, face: '½',
  text: (up) => `${K.kazu}の はんぶん だけ ${K.mamori}（${K.kazu}は そのまま）` + (up ? '+4' : ''),
  exec: (c, i, up) => { c.block(Math.floor(c.v / 2) + (up ? 4 : 0), `${c.v} ÷ 2 = ${Math.floor(c.v / 2)}`); } });

// ───── プログラム ─────
def({ id: 'rep', name: 'もう{一度|いちど}', cat: 'prog', rar: 's', face: '🔁',
  text: (up) => `ひとつ まえの カードを ${up ? '2' : '1'}${K.kai} くりかえす`,
  fact: 'くりかえし（ループ）は プログラムの きほん。 「+3を 2{回|かい}」は 3×2と おなじ',
  exec: (c, i, up) => c.repeatPrev(up ? 2 : 1) });
def({ id: 'repAll', name: 'さいしょから', cat: 'prog', rar: 'r', face: '⏮',
  text: () => `ここまでの カードを ぜんぶ もう{一度|いちど}`,
  exhaust: (up) => !up,
  exec: (c) => c.repeatAll() });
def({ id: 'next3', name: '{次|つぎ}を 3{回|かい}', cat: 'prog', rar: 'r', face: '🔂',
  text: (up) => `${K.tsugi}の カードを 3${K.kai} うごかす` + (up ? `。${K.mamori} +4` : ''),
  exec: (c, i, up) => { c.nextTimes(3); if (up) c.block(4); } });
def({ id: 'ifBig', name: 'もし 10いじょう', cat: 'prog', rar: 'u', face: '❓≧10',
  text: (up) => `もし ${K.kazu}が 10いじょう なら +${up ? 15 : 10}`,
  exec: (c, i, up) => { if (c.cond(`${c.v} は 10いじょう？`, c.v >= 10)) c.add(up ? 15 : 10); } });
def({ id: 'ifSmall', name: 'もし 5より ちいさい', cat: 'prog', rar: 'c', face: '❓<5',
  text: (up) => `もし ${K.kazu}が 5より ちいさい なら +${up ? 11 : 8}`,
  exec: (c, i, up) => { if (c.cond(`${c.v} は 5より ちいさい？`, c.v < 5)) c.add(up ? 11 : 8); } });
def({ id: 'ifEven', name: 'もし ぐうすう', cat: 'prog', rar: 'c', grade: 2, face: '❓2',
  text: (up) => `もし 2で わりきれたら ${up ? '+8' : '+5'}。ちがったら +1`,
  fact: '2で わりきれる {数|かず}を ぐうすう（2, 4, 6, 8 …）、わりきれない {数|かず}を きすう（1, 3, 5, 7 …）と いうよ',
  exec: (c, i, up) => { if (c.cond(`${c.v} は 2で わりきれる？`, c.v % 2 === 0)) c.add(up ? 8 : 5); else c.add(1); } });
def({ id: 'if3', name: 'もし 3の だん', cat: 'prog', rar: 'u', grade: 2, face: '❓3',
  text: (up) => `もし ${K.kazu}が 3の だん なら ${up ? 3 : 2}${K.bai}`,
  fact: '3の だん：3, 6, 9, 12, 15, 18, 21, 24, 27',
  exec: (c, i, up) => { if (c.cond(`${c.v} は 3の だん？`, c.v > 0 && c.v % 3 === 0)) c.mul(up ? 3 : 2); } });
def({ id: 'memoSet', name: 'メモする', cat: 'prog', rar: 'u', grade: 2, face: '📝',
  text: (up) => `いまの ${K.kazu}を メモする` + (up ? '。そのあと +3' : `（${K.kazu}は そのまま）`),
  fact: 'あとで つかう {数|かず}を おぼえておく ばしょを、プログラムでは「へんすう」と いうよ',
  exec: (c, i, up) => { c.setMemo(c.v); if (up) c.add(3); } });
def({ id: 'memoAdd', name: 'メモを {足|た}す', cat: 'prog', rar: 'u', grade: 2, face: '+📝',
  text: (up) => `メモの ${K.kazu}を ${K.tasu}` + (up ? '。さらに +3' : ''),
  exec: (c, i, up) => { c.add(c.memo, 'メモ'); if (up) c.add(3); } });

// ───── まもり ─────
def({ id: 'g4', name: '{守|まも}る', cat: 'def', rar: 's', face: '🛡️',
  text: (up) => `${K.mamori} +${up ? 7 : 4}`,
  exec: (c, i, up) => c.block(up ? 7 : 4) });
def({ id: 'brick', name: 'れんがの かべ', cat: 'def', rar: 'c', face: '🧱',
  text: (up) => `${K.mamori} +${up ? 11 : 8}`,
  exec: (c, i, up) => c.block(up ? 11 : 8) });
def({ id: 'shield', name: 'たてに かえる', cat: 'def', rar: 'c', face: '🔄',
  text: (up) => `${K.kazu}を ぜんぶ ${K.mamori}に かえる（${K.kazu}は 0に）` + (up ? '+4' : ''),
  exec: (c, i, up) => { c.block(c.v + (up ? 4 : 0), `${c.v} → 🛡️`); c.set(0, '0に もどる'); } });

// ───── こうげき ─────
def({ id: 'allAtk', name: 'みんなに {攻撃|こうげき}', cat: 'atk', rar: 'u', face: '🌪',
  text: (up) => `さいごの ${K.kazu}で ${K.teki} ${K.zenin}に ${K.kougeki}` + (up ? '。+3' : ''),
  exec: (c, i, up) => { c.flag('all', true, 'みんなに こうげき！'); if (up) c.add(3); } });
def({ id: 'double', name: '2{回|かい} {攻撃|こうげき}', cat: 'atk', rar: 'r', face: '⚡⚡',
  text: (up) => `さいごの ${K.kazu}で ${up ? 3 : 2}${K.kai} ${K.kougeki}する`,
  exec: (c, i, up) => c.flag('hits', up ? 3 : 2, `${up ? 3 : 2}かい こうげき！`) });
def({ id: 'pierce', name: 'つらぬく', cat: 'atk', rar: 'u', face: '🗡',
  text: (up) => `${K.teki}の ${K.mamori}と かたさを むしして ${K.kougeki}` + (up ? '。+3' : ''),
  exec: (c, i, up) => { c.flag('pierce', true, 'つらぬく！'); if (up) c.add(3); } });
def({ id: 'hammer', name: 'ぴったりハンマー', cat: 'atk', rar: 'u', face: '🔨',
  text: (up) => `🎯ぴったりの ダメージが ${up ? 4 : 3}${K.bai}に なる`,
  exec: (c, i, up) => c.flag('hammer', up ? 4 : 3, 'ぴったりハンマー') });

// ───── かたち ─────
def({ id: 'tri', name: '{三角|さんかく}', cat: 'shape', rar: 's', face: 'shape:tri', hidden: true,
  tags: { shape: 'tri', corners: 3 },
  text: (up) => `${K.kado}の ${K.kazu}だけ ${K.tasu}` + (up ? `。${K.mamori} +3` : ''),
  fact: 'さんかく（{三角形|さんかくけい}）には かどが 3つ、へんが 3ぼん ある',
  exec: (c, i, up) => { c.add(3, 'かど 3つ'); if (up) c.block(3); } });
def({ id: 'sqr', name: '{四角|しかく}', cat: 'shape', rar: 'c', face: 'shape:sqr', hidden: true,
  tags: { shape: 'sqr', corners: 4 },
  text: (up) => `${K.kado}の ${K.kazu}だけ ${K.tasu}` + (up ? `。${K.mamori} +3` : ''),
  fact: 'しかく（{四角形|しかくけい}）には かどが 4つ、へんが 4ほん ある',
  exec: (c, i, up) => { c.add(4, 'かど 4つ'); if (up) c.block(3); } });
def({ id: 'hex', name: 'はちの す', cat: 'shape', rar: 'u', face: 'shape:hex', hidden: true,
  tags: { shape: 'hex', corners: 6 },
  text: (up) => `${K.kado}の ${K.kazu}だけ ${K.tasu}` + (up ? `。${K.mamori} +3` : ''),
  fact: 'はちの すの かたちは ろっかっけい。かどが 6つ ある',
  exec: (c, i, up) => { c.add(6, 'かど 6つ'); if (up) c.block(3); } });
def({ id: 'star', name: 'ほし', cat: 'shape', rar: 'u', face: 'shape:star', hidden: true,
  tags: { shape: 'star', corners: 5 },
  text: (up) => `とがった さきの ${K.kazu}だけ ${K.tasu}` + (up ? `。${K.mamori} +3` : ''),
  fact: 'ほしの かたちの とがった さきは 5つ',
  exec: (c, i, up) => { c.add(5, 'さき 5つ'); if (up) c.block(3); } });
def({ id: 'circle', name: 'まる', cat: 'shape', rar: 'c', face: 'shape:circle', hidden: true,
  tags: { shape: 'circle', corners: 0 },
  text: (up) => `${K.kado}が ない まるい たて。${K.mamori} +${up ? 8 : 5}`,
  fact: 'まる（{円|えん}）には かどが ない。だから ころころ ころがるよ',
  exec: (c, i, up) => c.block(up ? 8 : 5) });
def({ id: 'setsq', name: 'さんかくじょうぎ', cat: 'shape', rar: 'r', face: '📐',
  text: (up) => `じゅもんの かたちの ${K.kado}を ぜんぶ ${K.tasu}` + (up ? `。そのあと 2${K.bai}` : ''),
  exec: (c, i, up) => {
    const n = c.chainCards().reduce((s, cd) => s + (cd.tags.corners || 0), 0);
    c.add(n, 'かどの ごうけい');
    if (up) c.mul(2);
  } });

// ───── ちしき（いきもの・もの） ─────
function legCard(id, name, emoji, legs, rar, opts = {}) {
  def({ id, name, cat: 'know', rar, face: emoji, hidden: true, grade: opts.grade || 1,
    tags: { legs, insect: !!opts.insect, creature: true },
    text: (up) => (opts.text ? opts.text(up) : `${K.ashi}の ${K.kazu}だけ ${K.tasu}` + (up ? `。${K.mamori} +3` : '')),
    fact: opts.fact,
    exec: opts.exec || ((c, i, up) => {
      const b = legBonus(c, CARDS[id]);
      c.add(b.n, [`あし ${legs}ほん`, ...b.extra].join(' '));
      if (up) c.block(3);
    }) });
}
legCard('hen', 'にわとり', '🐔', 2, 'c', {
  text: (up) => `${K.ashi}の ${K.kazu}だけ ${K.tasu}。${K.mamori} +${up ? 6 : 3}`,
  fact: 'にわとりの あしは 2ほん。とりの なかまは みんな 2ほんあし',
  exec: (c, i, up) => { const b = legBonus(c, CARDS.hen); c.add(b.n, ['あし 2ほん', ...b.extra].join(' ')); c.block(up ? 6 : 3); } });
legCard('cat', 'ねこ', '🐱', 4, 'c', { fact: 'ねこの あしは 4ほん。いぬも うまも 4ほんあし' });
legCard('ant', 'あり', '🐜', 6, 'c', { insect: true, fact: 'ありは こんちゅう。こんちゅうの あしは みんな 6ぽん' });
legCard('butterfly', 'ちょうちょ', '🦋', 6, 'u', { insect: true,
  text: (up) => `${K.ashi}の ${K.kazu}だけ ${K.tasu}。${K.mamori} +${up ? 7 : 4}`,
  fact: 'ちょうちょも こんちゅう。あしは 6ぽん、はねは 4まい',
  exec: (c, i, up) => { const b = legBonus(c, CARDS.butterfly); c.add(b.n, ['あし 6ぽん', ...b.extra].join(' ')); c.block(up ? 7 : 4); } });
legCard('beetle', 'かぶとむし', '🪲', 6, 'u', { insect: true,
  text: (up) => `${K.ashi}の ${K.kazu}の 2${K.bai}を ${K.tasu}` + (up ? `。${K.mamori} +4` : ''),
  fact: 'かぶとむしも こんちゅう。からだは あたま・むね・はらの 3つに わかれて いて、あしは むねから 6ぽん',
  exec: (c, i, up) => { const b = legBonus(c, CARDS.beetle); c.add(b.n * 2, `あし ${b.n} × 2`); if (up) c.block(4); } });
legCard('spider', 'くも', '🕷️', 8, 'u', { fact: 'くもの あしは 8ほん。だから くもは こんちゅう では ない！' });
legCard('octopus', 'たこ', '🐙', 8, 'u', {
  text: (up) => `${K.ashi}の ${K.kazu}だけ ${K.mamori}` + (up ? '（+4）' : ''),
  fact: 'たこの あしは 8ほん。すみを はいて みを まもるよ',
  exec: (c, i, up) => { const b = legBonus(c, CARDS.octopus); c.block(b.n + (up ? 4 : 0), ['あし 8ほん', ...b.extra].join(' ')); } });
legCard('squid', 'いか', '🦑', 10, 'r', {
  text: (up) => `${K.ashi}の ${K.kazu}だけ ${K.tasu}。${K.zenin}に ${K.kougeki}` + (up ? `。${K.mamori}+5` : ''),
  fact: 'いかの あしは 10ぽん（ながい 2ほんは「しょくわん」）。たこより 2ほん おおい',
  exec: (c, i, up) => { const b = legBonus(c, CARDS.squid); c.add(b.n, ['あし 10ぽん', ...b.extra].join(' ')); c.flag('all', true, 'みんなに こうげき！'); if (up) c.block(5); } });

def({ id: 'net', name: 'むしとりあみ', cat: 'know', rar: 'u', face: '🥅',
  text: (up) => `この じゅもんの こんちゅうカード 1{枚|まい}に つき +${up ? 7 : 5}`,
  fact: 'こんちゅうは あしが 6ぽん。あり・ちょうちょ・かぶとむしは こんちゅう、くもは ちがう',
  exec: (c, i, up) => {
    const n = c.chainCards().filter((cd) => cd.tags.insect).length;
    c.add(n * (up ? 7 : 5), `こんちゅう ${n}ひき`);
  } });
def({ id: 'dice', name: 'さいころ', cat: 'know', rar: 'c', face: 'dice',
  text: (up) => up ? `さいころ 2この めを ${K.tasu}` : `さいころの めを ${K.tasu}`,
  roll: (rng, up) => up ? [rng.int(1, 6), rng.int(1, 6)] : [rng.int(1, 6)],
  exec: (c, inst) => { const r = inst.roll || [3]; c.add(r.reduce((a, b) => a + b, 0), r.length > 1 ? `めは ${r.join(' と ')}` : `めは ${r[0]}`); } });
def({ id: 'dice7', name: 'おもてと うら', cat: 'know', rar: 'u', face: '🎲', hidden: true,
  text: (up) => `さいころの おもてと うらの めを ${K.tasu}` + (up ? `。${K.mamori}+3` : ''),
  fact: 'さいころの おもてと うらの めを たすと、かならず 7に なる（1と6、2と5、3と4）',
  roll: (rng) => [rng.int(1, 6)],
  exec: (c, inst, up) => { const f = (inst.roll || [3])[0]; c.add(7, `${f} + ${7 - f}`); if (up) c.block(3); } });
def({ id: 'week', name: '1しゅうかん', cat: 'know', rar: 'u', face: '📅', hidden: true,
  text: (up) => `1しゅうかんの {日|ひ}の ${K.kazu}だけ ${K.tasu}` + (up ? `。${K.mamori} +3` : ''),
  fact: '1しゅうかんは 7にち（{日|にち}・{月|げつ}・{火|か}・{水|すい}・{木|もく}・{金|きん}・{土|ど}）',
  exec: (c, i, up) => { c.add(7, '7にち'); if (up) c.block(3); } });
def({ id: 'rainbow', name: 'にじ', cat: 'know', rar: 'u', face: '🌈', hidden: true,
  text: (up) => `にじの {色|いろ}の ${K.kazu}だけ ${K.tasu}。${K.zenin}に ${K.kougeki}` + (up ? '。+3' : ''),
  fact: 'にほんでは にじの いろは 7しょく（あか・だいだい・きいろ・みどり・あお・あい・むらさき）と いわれるよ',
  exec: (c, i, up) => { c.add(7 + (up ? 3 : 0), '7しょく'); c.flag('all', true, 'みんなに こうげき！'); } });
def({ id: 'hand', name: 'かたての ゆび', cat: 'know', rar: 'c', face: '✋', hidden: true,
  text: (up) => up ? `りょうての {指|ゆび}の ${K.kazu}だけ ${K.tasu}` : `かたての {指|ゆび}の ${K.kazu}だけ ${K.tasu}`,
  fact: 'かたての ゆびは 5ほん、りょうてで 10ぽん。5と 5で 10！',
  exec: (c, i, up) => c.add(up ? 10 : 5, up ? 'ゆび 10ぽん' : 'ゆび 5ほん') });
def({ id: 'clock', name: '{時計|とけい}', cat: 'know', rar: 'u', grade: 2, face: '🕐', hidden: true,
  text: (up) => `とけいの すうじの ${K.kazu}だけ ${K.tasu}` + (up ? `。${K.mamori} +3` : ''),
  fact: 'とけいの もじばんには 1から 12まで すうじが ある。ながい はりが 1しゅうで 60ぷん',
  exec: (c, i, up) => { c.add(12, '1〜12'); if (up) c.block(3); } });
def({ id: 'ruler', name: 'ものさし', cat: 'know', rar: 'u', grade: 2, face: '📏', hidden: true,
  text: (up) => `1cmの めもり（mm）の ${K.kazu}だけ ${K.tasu}` + (up ? `。${K.mamori}+4` : ''),
  fact: '1cm = 10mm。 ものさしの ちいさな めもり 1つが 1mm',
  exec: (c, i, up) => { c.add(10, '1cm = 10mm'); if (up) c.block(4); } });
def({ id: 'cube', name: 'はこの かたち', cat: 'know', rar: 'c', grade: 2, face: '📦', hidden: true,
  text: (up) => up ? `はこの へんの ${K.kazu}だけ ${K.tasu}` : `はこの めんの ${K.kazu}だけ ${K.tasu}`,
  fact: 'さいころの ような はこの かたちは、めんが 6つ、へんが 12、ちょうてんが 8つ',
  exec: (c, i, up) => c.add(up ? 12 : 6, up ? 'へん 12' : 'めん 6つ') });
def({ id: 'litre', name: '1リットルます', cat: 'know', rar: 'r', grade: 2, face: '🥛', hidden: true,
  text: (up) => `1Lは なんdL？ その ${K.kazu}の ${K.bai}に する` + (up ? `。${K.mamori}+10` : ''),
  fact: '1L = 10dL。 1dLの ますで 10ぱい はいると 1L',
  exhaust: () => true,
  exec: (c, i, up) => { c.mul(10, '1L = 10dL'); if (up) c.block(10); } });
def({ id: 'clock60', name: 'ストップウォッチ', cat: 'know', rar: 'r', grade: 3, face: '⏱️', hidden: true,
  text: (up) => `1ぷんは なんびょう？ その ${K.kazu}を ${K.tasu}` + (up ? `。${K.mamori}+10` : ''),
  fact: '1ぷん = 60びょう。 1じかん = 60ぷん',
  exhaust: () => true,
  exec: (c, i, up) => { c.add(60, '1ぷん = 60びょう'); if (up) c.block(10); } });
def({ id: 'diameter', name: 'コンパス', cat: 'know', rar: 'u', grade: 3, face: '🧭', hidden: true,
  text: (up) => `${K.kazu}を はんけいと して ちょっけいに する` + (up ? `。${K.mamori}+4` : ''),
  fact: 'えんの ちょっけいは はんけいの 2{倍|ばい}。はんけい 3cmの えんの ちょっけいは 6cm',
  exec: (c, i, up) => { c.mul(2, 'ちょっけい = はんけい × 2'); if (up) c.block(4); } });

// ───── おじゃまカード（つかえない） ─────
def({ id: 'sleepy', name: 'ねむけ', cat: 'junk', rar: 'x', face: '💤', unplayable: true,
  text: () => 'つかえない。たたかいが おわると きえる' });
def({ id: 'web', name: 'くもの す', cat: 'junk', rar: 'x', face: '🕸️', unplayable: true,
  text: () => 'つかえない。たたかいが おわると きえる' });
def({ id: 'zero', name: 'ゼロの のろい', cat: 'junk', rar: 'x', face: '🌑', unplayable: true,
  text: () => 'つかえない。たたかいが おわると きえる' });

// がったい（となりあう かたちカードが くっつく）
export const COMBOS = [
  { a: 'tri', b: 'tri', name: '{四角|しかく}', icon: 'shape:sqr', corners: 4, fact: 'さんかくを 2つ あわせると、しかくが できる（かど 4つ）' },
  { a: 'sqr', b: 'sqr', name: 'ながしかく', icon: 'shape:rect', corners: 4, fact: 'しかくを 2つ ならべると、ながしかく（ちょうほうけい）。かどは やっぱり 4つ' },
  { a: 'tri', b: 'sqr', name: 'いえの かたち', icon: 'shape:house', corners: 5, fact: 'しかくの うえに さんかくを のせると、いえの かたち（ごかっけい）。かどは 5つ' },
  { a: 'hex', b: 'hex', name: 'はちの すの へや', icon: 'shape:hex', corners: 6, fact: 'ろっかっけいは すきまなく ならべられる。だから はちの すは この かたち' },
  { a: 'circle', b: 'circle', name: 'ゆきだるま', icon: '⛄', block: 8, fact: 'まるを 2つ かさねると ゆきだるま！' },
  { a: 'star', b: 'star', name: 'ほしぞら', icon: '🌌', corners: 5, all: true, fact: 'ほしが たくさんで ほしぞら。とがった さきが 5つずつ' },
];
export function findCombo(a, b) {
  return COMBOS.find((c) => (c.a === a && c.b === b) || (c.a === b && c.b === a));
}

export const STARTER = {
  1: ['p2', 'p2', 'p3', 'p3', 'p4', 'g4', 'g4', 'tri', 'rep'],
  2: ['p2', 'p2', 'p3', 'p3', 'x2', 'g4', 'g4', 'tri', 'rep'],
  3: ['p2', 'p3', 'p3', 'p4', 'x2', 'g4', 'g4', 'd2', 'tri', 'rep'],
};

export function cardName(id, up) { return CARDS[id].name + (up ? '＋' : ''); }
export function rewardPool(grade) {
  return Object.values(CARDS).filter((c) => c.grade <= grade && c.rar !== 'x');
}
