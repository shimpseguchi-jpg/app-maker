// モンスター と のろい（ボスの とくべつ ルール）
// moves: atk{n} multi{n,times} blk{n} atkblk{n,b} buff{n} curse{card,count,n} drain{what,n} heal{n} summon{id} charge
export const RULES = {
  halfPower: { name: 'はんぶんの のろい', icon: '➗', text: 'さいごに {力|ちから}が はんぶん（÷2）に なる' },
  noDiscard: { name: 'かたまりの のろい', icon: '🔒', text: 'いれかえが できない' },
  max4: { name: 'せまい まほうじん', icon: '4️⃣', text: 'じゅもんに カードを 4{枚|まい}までしか いれられない' },
  max3: { name: 'ちいさな まほうじん', icon: '3️⃣', text: 'じゅもんに カードを 3{枚|まい}までしか いれられない' },
  noPair: { name: 'ひとりぼっちの のろい', icon: '💔', text: 'ペアの なかまの {役|やく}（ペア・ツーペア・スリーカード・フルハウス など）が できない' },
  evenOnly: { name: 'ぐうすうの のろい', icon: '⚖️', text: '2で わりきれない {数|かず}（1・3・5・7・9）の ルーンは かぞえない' },
  oddOnly: { name: 'きすうの のろい', icon: '⚖️', text: '2で わりきれる {数|かず}（2・4・6・8・10）の ルーンは かぞえない' },
  noSpells: { name: 'しずけさの のろい', icon: '🤫', text: 'スペルカードを じゅもんに いれられない（ルーンだけ）' },
  smallHand: { name: 'くらやみの のろい', icon: '🌫️', text: 'まいターン {手札|てふだ}が 2{枚|まい} へる' },
};

export const ENEMIES = {};
function def(e) { ENEMIES[e.id] = e; }

// ── 1しょう：くらやみの もり ──
def({ id: 'wolf', name: 'かげおおかみ', art: '🐺', hp: 610, moves: [{ k: 'atk', n: 7 }, { k: 'multi', n: 3, times: 2 }, { k: 'buff', n: 2 }] });
def({ id: 'bat', name: 'よるこうもり', art: '🦇', hp: 380, pattern: 'random', moves: [{ k: 'multi', n: 2, times: 3 }, { k: 'atk', n: 5 }] });
def({ id: 'shroom', name: 'ねむりだけ', art: '🍄', hp: 670, moves: [{ k: 'curse', card: 'sleepy', count: 2 }, { k: 'atk', n: 8 }, { k: 'blk', n: 100 }] });
def({ id: 'spider', name: 'もりぐも', art: '🕷️', hp: 530, moves: [{ k: 'curse', card: 'web', count: 1, n: 4 }, { k: 'multi', n: 3, times: 3 }] });
def({ id: 'boar', name: 'いわいのしし', art: '🐗', hp: 830, moves: [{ k: 'blk', n: 130 }, { k: 'atk', n: 10 }, { k: 'atk', n: 7 }] });
def({ id: 'wisp', name: 'まよいび', art: '👻', hp: 450, moves: [{ k: 'drain', what: 'mana', n: 1, dmg: 3 }, { k: 'atk', n: 7 }] });
def({ id: 'troll', name: 'もりの トロル', art: '🧌', hp: 2080, elite: true, rule: 'noDiscard', moves: [{ k: 'atk', n: 11 }, { k: 'buff', n: 3 }, { k: 'multi', n: 5, times: 2 }] });
def({ id: 'scorpion', name: 'どくさそり', art: '🦂', hp: 1760, elite: true, rule: 'max4', moves: [{ k: 'multi', n: 4, times: 2 }, { k: 'drain', what: 'hand', n: 2, dmg: 7 }, { k: 'atk', n: 13 }] });
def({ id: 'treant', name: 'くちた たいじゅ', art: '🌳', hp: 3520, boss: true, rule: 'halfPower',
  script: ['atk', 'summon', 'blk', 'charge', 'big'], movesByKey: { atk: { k: 'atk', n: 9 }, summon: { k: 'summon', id: 'wisp' }, blk: { k: 'atkblk', n: 7, b: 320 }, charge: { k: 'charge' }, big: { k: 'atk', n: 20 } },
  desc: 'もりの おくに ねむる たいじゅ。のろいで {力|ちから}を はんぶんに して しまう。ためている ときは {守|まも}りを かためよう' });

// ── 2しょう：しずんだ みやこ ──
def({ id: 'crab', name: 'よろいがに', art: '🦀', hp: 1920, moves: [{ k: 'blk', n: 380 }, { k: 'atk', n: 10 }, { k: 'multi', n: 4, times: 2 }] });
def({ id: 'serpent', name: 'うみへび', art: '🐍', hp: 1440, pattern: 'random', moves: [{ k: 'multi', n: 3, times: 3 }, { k: 'atk', n: 11 }, { k: 'buff', n: 3 }] });
def({ id: 'jelly', name: 'でんきふぐ', art: '🐡', hp: 1120, moves: [{ k: 'drain', what: 'mana', n: 1, dmg: 6 }, { k: 'multi', n: 2, times: 4 }] });
def({ id: 'squid', name: 'すみいか', art: '🦑', hp: 1600, moves: [{ k: 'drain', what: 'hand', n: 2, dmg: 7 }, { k: 'atk', n: 12 }] });
def({ id: 'ghost2', name: 'しずんだ へいし', art: '💀', hp: 1840, moves: [{ k: 'atk', n: 11 }, { k: 'curse', card: 'sleepy', count: 2, n: 5 }, { k: 'blk', n: 340 }] });
def({ id: 'siren', name: 'うたう まもの', art: '🧜‍♀️', hp: 4320, elite: true, rule: 'noPair', moves: [{ k: 'curse', card: 'sleepy', count: 2 }, { k: 'multi', n: 4, times: 3 }, { k: 'atk', n: 15 }] });
def({ id: 'knight', name: 'ぼうれい きし', art: '🛡️', hp: 3280, elite: true, rule: 'evenOnly', moves: [{ k: 'atkblk', n: 11, b: 670 }, { k: 'buff', n: 3 }, { k: 'atk', n: 16 }] });
def({ id: 'leviathan', name: 'しんかいの おう', art: '🐙', hp: 6720, boss: true, rule: 'max3',
  script: ['multi', 'drain', 'blk', 'charge', 'big'], movesByKey: { multi: { k: 'multi', n: 4, times: 4 }, drain: { k: 'drain', what: 'hand', n: 2, dmg: 9 }, blk: { k: 'blk', n: 1440, buff: 1 }, charge: { k: 'charge' }, big: { k: 'atk', n: 26 } },
  desc: 'しずんだ みやこの ぬし。じゅもんは 3{枚|まい}まで。すくない カードで おおきな {役|やく}を つくろう' });

// ── 3しょう：ほしふる とう ──
def({ id: 'eye', name: 'みはりの め', art: '👁️', hp: 2380, moves: [{ k: 'drain', what: 'mana', n: 1, dmg: 8 }, { k: 'atk', n: 12 }, { k: 'blk', n: 500 }] });
def({ id: 'drake', name: 'ほしの りゅう', art: '🐲', hp: 2940, moves: [{ k: 'atk', n: 14 }, { k: 'multi', n: 4, times: 3 }, { k: 'buff', n: 3 }] });
def({ id: 'golem', name: 'ほしくず ゴーレム', art: '🗿', hp: 3640, moves: [{ k: 'blk', n: 1120 }, { k: 'atk', n: 15 }, { k: 'atk', n: 10 }] });
def({ id: 'oni', name: 'あかおに', art: '👹', hp: 3150, moves: [{ k: 'buff', n: 4 }, { k: 'atk', n: 13 }, { k: 'multi', n: 3, times: 3 }] });
def({ id: 'griffin', name: 'グリフォン', art: '🦅', hp: 2590, pattern: 'random', moves: [{ k: 'multi', n: 3, times: 4 }, { k: 'atk', n: 14 }] });
def({ id: 'dragon', name: 'てんくうの りゅう', art: '🐉', hp: 7280, elite: true, rule: 'oddOnly', moves: [{ k: 'atk', n: 16 }, { k: 'multi', n: 6, times: 3 }, { k: 'blk', n: 1400, buff: 2 }] });
def({ id: 'lich', name: 'やみの だいまどうし', art: '🧙‍♂️', hp: 6720, elite: true, rule: 'noSpells', moves: [{ k: 'curse', card: 'void', count: 3, n: 8 }, { k: 'atk', n: 15 }, { k: 'drain', what: 'mana', n: 1, dmg: 10 }] });
def({ id: 'zeroKing', name: 'ゼロの おう', art: 'svg:zero', hp: 16800, boss: true, rule: 'rotate', rotate: ['halfPower', 'noPair', 'max4', 'evenOnly', 'smallHand', 'oddOnly'],
  script: ['atk', 'curse', 'multi', 'blk', 'charge', 'big'], movesByKey: { atk: { k: 'atk', n: 14 }, curse: { k: 'curse', card: 'void', count: 2, n: 7 }, multi: { k: 'multi', n: 3, times: 4 }, blk: { k: 'blk', n: 2240, buff: 2 }, charge: { k: 'charge' }, big: { k: 'atk', n: 29 } },
  desc: 'すべての {数|かず}を 0に しようと する おう。ターンごとに のろいが かわる！' });

export const ENCOUNTERS = {
  1: { easy: [['wolf'], ['bat', 'bat'], ['wisp', 'bat']], normal: [['shroom', 'bat'], ['spider', 'wolf'], ['boar'], ['wolf', 'wisp'], ['shroom', 'spider'], ['boar', 'bat']], elite: [['troll'], ['scorpion']], boss: [['treant']] },
  2: { easy: [['serpent'], ['jelly', 'jelly']], normal: [['crab', 'jelly'], ['squid', 'serpent'], ['ghost2'], ['crab'], ['ghost2', 'jelly'], ['squid', 'jelly']], elite: [['siren'], ['knight']], boss: [['leviathan']] },
  3: { easy: [['eye'], ['griffin']], normal: [['drake', 'eye'], ['golem'], ['oni', 'griffin'], ['drake'], ['golem', 'eye'], ['oni']], elite: [['dragon'], ['lich']], boss: [['zeroKing']] },
};
export const DIFF = { easy: { hp: 0.7, atk: 0.7 }, normal: { hp: 1, atk: 1 } };
