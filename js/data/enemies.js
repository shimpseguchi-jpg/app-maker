// モンスターの データ
// moves の しゅるい:
//  atk:{n}  multi:{n,times}  blk:{n}  atkblk:{n,b}  buff:{n}  curse:{card,count}
//  heal:{n} summon:{id}  big:{n}（ためて うつ）  charge（ためる） 
// pattern: 'cycle' じゅんばん / 'random' ばらばら / function
// art: えもじ か 'svg:なまえ'

export const ENEMIES = {};
function def(e) { ENEMIES[e.id] = e; }

// ── 1かい：はじまりの もり ──
def({ id: 'slime', name: 'ぷるりん', art: 'svg:slime', hp: [16, 19], pattern: 'cycle',
  moves: [{ k: 'atk', n: 5 }, { k: 'atkblk', n: 3, b: 4 }],
  desc: 'もりに すむ ぷるぷるの スライム。さわると ひんやり。' });
def({ id: 'slimeS', name: 'ちびぷるりん', art: 'svg:slimeS', hp: [10, 12], pattern: 'cycle',
  moves: [{ k: 'atk', n: 3 }, { k: 'atk', n: 4 }],
  desc: 'ちいさな スライム。おおきい スライムから うまれる。' });
def({ id: 'bat', name: 'パタコ', art: '🦇', hp: [12, 14], pattern: 'random',
  moves: [{ k: 'multi', n: 2, times: 2 }, { k: 'multi', n: 3, times: 2 }, { k: 'atk', n: 5 }],
  desc: 'くらい ところが すきな コウモリ。なんども つついて くる。' });
def({ id: 'mushroom', name: 'キノコン', art: '🍄', hp: [22, 25], pattern: 'cycle',
  moves: [{ k: 'buff', n: 2 }, { k: 'atk', n: 6 }, { k: 'blk', n: 6 }],
  desc: 'まいにち すこしずつ おおきく なる キノコ。' });
def({ id: 'bee', name: 'ブンブン', art: '🐝', hp: [14, 17], pattern: 'random',
  moves: [{ k: 'multi', n: 2, times: 3 }, { k: 'atk', n: 6 }],
  desc: 'はちみつを まもる ハチ。3かい つづけて さしてくる。' });
def({ id: 'target', name: 'まとまと', art: 'svg:target', hp: [24, 29], pattern: 'cycle', lock: true,
  moves: [{ k: 'atk', n: 4 }, { k: 'blk', n: 5 }, { k: 'atk', n: 6 }],
  desc: 'からだの 🎯の かずと ぴったり おなじ かずで こうげき すると 2ばい ダメージ！' });
def({ id: 'snail', name: 'のろのろ', art: '🐌', hp: [19, 22], pattern: 'cycle', armor: 2,
  moves: [{ k: 'blk', n: 4 }, { k: 'atk', n: 7 }],
  desc: 'かたい からを もつ カタツムリ。ダメージを 2 へらす。' });
// エリート
def({ id: 'wolf', name: 'ガルル', art: '🐺', hp: [42, 46], elite: true, pattern: 'cycle',
  moves: [{ k: 'atk', n: 9 }, { k: 'multi', n: 4, times: 2 }, { k: 'buff', n: 3 }],
  desc: 'もりの ボス おおかみ。とおぼえで どんどん つよく なる。' });
def({ id: 'rock', name: 'ゴロン', art: '🪨', hp: [36, 40], elite: true, pattern: 'cycle', armor: 3,
  moves: [{ k: 'atk', n: 11 }, { k: 'blk', n: 8 }, { k: 'atk', n: 7 }],
  desc: 'いわの かいぶつ。とても かたくて ダメージを 3 へらす。つらぬく カードが ききめ ばつぐん。' });
// ボス
def({ id: 'slimeKing', name: 'キング ぷるりん', art: 'svg:slimeKing', hp: [85, 85], boss: true,
  pattern: (e, turn) => ['atk', 'summon', 'atkblk', 'charge', 'big'][turn % 5],
  movesByKey: { atk: { k: 'atk', n: 9 }, summon: { k: 'summon', id: 'slimeS' }, atkblk: { k: 'atkblk', n: 5, b: 10 }, charge: { k: 'charge' }, big: { k: 'atk', n: 18 } },
  desc: 'もりの スライムの おうさま。ちびぷるりんを よびだす。ためている ときは まもりを かためよう！' });

// ── 2かい：からくりの まち ──
def({ id: 'mouse', name: 'カラクリネズミ', art: '🐭', hp: [36, 42], pattern: 'random',
  moves: [{ k: 'multi', n: 3, times: 3 }, { k: 'atk', n: 9 }],
  desc: 'ぜんまいで うごく ネズミ。すばやく 3かい かじる。' });
def({ id: 'turtle', name: 'テッコウガメ', art: '🐢', hp: [45, 50], pattern: 'cycle', armor: 3,
  moves: [{ k: 'blk', n: 10 }, { k: 'atk', n: 9 }, { k: 'atk', n: 7 }],
  desc: 'てつの こうらの カメ。ダメージを 3 へらす。' });
def({ id: 'witchcat', name: 'まじょねこ', art: '🐈', hp: [42, 46], pattern: 'cycle',
  moves: [{ k: 'curse', card: 'sleepy', count: 2 }, { k: 'atk', n: 10 }, { k: 'multi', n: 5, times: 2 }],
  desc: 'ねむけの まほうを かける ねこ。つかえない カードを まぜてくる。' });
def({ id: 'ghost', name: 'ヒトツメ', art: '👻', hp: [39, 45], pattern: 'cycle', weak: true,
  moves: [{ k: 'atk', n: 10 }, { k: 'blk', n: 8 }, { k: 'multi', n: 4, times: 2 }],
  desc: 'じゃくてんの だんの かずで こうげき すると 2ばい ダメージ！' });
def({ id: 'robot', name: 'ロボまる', art: '🤖', hp: [45, 50], pattern: 'cycle', lock: true,
  moves: [{ k: 'atk', n: 11 }, { k: 'multi', n: 4, times: 3 }, { k: 'blk', n: 10 }],
  desc: 'まちを まもる ロボット。🎯ぴったりの かずに よわい。' });
def({ id: 'spiderE', name: 'クモノスケ', art: '🕷️', hp: [36, 39], pattern: 'cycle',
  moves: [{ k: 'curse', card: 'web', count: 1, n: 6 }, { k: 'multi', n: 3, times: 4 }],
  desc: 'すを はって くる くも。あしは 8ほん。' });
// エリート
def({ id: 'bull', name: 'モーモタウロス', art: '🐂', hp: [80, 86], elite: true, pattern: 'cycle',
  moves: [{ k: 'atk', n: 15 }, { k: 'buff', n: 3 }, { k: 'multi', n: 6, times: 2 }],
  desc: 'まちの もんばん。つのの いちげきは とても いたい。' });
def({ id: 'clown', name: 'カラクリピエロ', art: '🤡', hp: [70, 74], elite: true, pattern: 'cycle', lock: true, weak: true,
  moves: [{ k: 'curse', card: 'sleepy', count: 2 }, { k: 'multi', n: 5, times: 3 }, { k: 'atk', n: 14 }],
  desc: '🎯ぴったりにも じゃくてんにも よわい ふしぎな ピエロ。りょうほう あたると 4ばい！' });
// ボス
def({ id: 'golem', name: 'カラクリゴーレム', art: '🗿', hp: [150, 150], boss: true, armor: 4, lock: true,
  pattern: (e, turn) => ['atk', 'multi', 'blkbuff', 'charge', 'big'][turn % 5],
  movesByKey: { atk: { k: 'atk', n: 14 }, multi: { k: 'multi', n: 5, times: 3 }, blkbuff: { k: 'blk', n: 20, buff: 2 }, charge: { k: 'charge' }, big: { k: 'atk', n: 24 } },
  desc: 'まちの まんなかで ねむっていた きょじん。とても かたいが 🎯ぴったりの かずで こうげき すると 2ばい ダメージ。' });

// ── 3かい：よぞらの おしろ ──
def({ id: 'dragonkid', name: 'ドラコ', art: '🐲', hp: [68, 76], pattern: 'cycle',
  moves: [{ k: 'atk', n: 14 }, { k: 'blk', n: 10, buff: 2 }, { k: 'multi', n: 7, times: 2 }],
  desc: 'ドラゴンの こども。まだ ちいさいけど ひの いきは あつい。' });
def({ id: 'snowman', name: 'ユキダルン', art: '☃️', hp: [62, 68], pattern: 'cycle',
  moves: [{ k: 'blk', n: 15 }, { k: 'multi', n: 6, times: 2 }, { k: 'atk', n: 13 }],
  desc: 'まるを 2つ かさねた ゆきだるま。まもりが かたい。' });
def({ id: 'imp', name: 'コアクマ', art: '😈', hp: [57, 62], pattern: 'cycle', weak: true,
  moves: [{ k: 'curse', card: 'sleepy', count: 2 }, { k: 'atk', n: 13 }, { k: 'multi', n: 5, times: 3 }],
  desc: 'いたずらずきな あくま。じゃくてんの だんの かずに よわい。' });
def({ id: 'skull', name: 'ホネホネ', art: '💀', hp: [51, 57], pattern: 'cycle', revive: true,
  moves: [{ k: 'multi', n: 5, times: 3 }, { k: 'atk', n: 13 }],
  desc: 'いちど たおしても はんぶんの HPで ふっかつ する！' });
def({ id: 'ufo', name: 'ナゾのUFO', art: '🛸', hp: [59, 65], pattern: 'cycle', lock: true,
  moves: [{ k: 'charge' }, { k: 'atk', n: 18 }, { k: 'blk', n: 12 }],
  desc: 'ためてから つよい ビームを うつ。🎯ぴったりの かずに よわい。' });
// エリート
def({ id: 'dragon', name: 'ほしドラゴン', art: '🐉', hp: [140, 150], elite: true, pattern: 'cycle', armor: 3,
  moves: [{ k: 'atk', n: 18 }, { k: 'multi', n: 7, times: 3 }, { k: 'blk', n: 15, buff: 3 }],
  desc: 'よぞらを とぶ ドラゴン。うろこが かたい。' });
def({ id: 'lion', name: 'キメラ', art: '🦁', hp: [125, 135], elite: true, pattern: 'cycle', weak: true, lock: true,
  moves: [{ k: 'multi', n: 6, times: 3 }, { k: 'curse', card: 'sleepy', count: 2, n: 10 }, { k: 'atk', n: 20 }],
  desc: 'ライオンの かおを した まもの。じゃくてんと 🎯ぴったりを ねらおう。' });
// さいごの ボス
def({ id: 'zeroKing', name: 'ゼロの まおう', art: 'svg:zeroKing', hp: [270, 270], boss: true, armor: 3,
  pattern: (e, turn) => (e.hp <= e.maxHp / 2
    ? ['curse', 'multi', 'charge', 'big', 'atk'][turn % 5]
    : ['atk', 'curse', 'blk', 'multi', 'charge', 'big'][turn % 6]),
  movesByKey: { atk: { k: 'atk', n: 16 }, curse: { k: 'curse', card: 'zero', count: 2, n: 8 }, blk: { k: 'blk', n: 25, buff: 2 },
    multi: { k: 'multi', n: 5, times: 4 }, charge: { k: 'charge' }, big: { k: 'atk', n: 30 } },
  phase2: true,
  desc: 'すうじを ぜんぶ 0に して しまおうと する まおう。HPが はんぶんに なると 🎯ぴったりの じゃくてんが あらわれる！' });

// でてくる くみあわせ
export const ENCOUNTERS = {
  1: {
    easy: [['slime'], ['bat'], ['slimeS', 'slimeS']],
    normal: [['slime', 'slimeS'], ['bat', 'bat'], ['mushroom'], ['bee', 'slimeS'], ['target'], ['snail', 'bat'], ['slime', 'bat']],
    elite: [['wolf'], ['rock']],
    boss: [['slimeKing']],
  },
  2: {
    easy: [['mouse'], ['ghost']],
    normal: [['mouse', 'bat'], ['turtle'], ['witchcat', 'mouse'], ['ghost', 'bee'], ['robot'], ['spiderE', 'mouse'], ['turtle', 'ghost']],
    elite: [['bull'], ['clown']],
    boss: [['golem']],
  },
  3: {
    easy: [['dragonkid'], ['snowman']],
    normal: [['dragonkid', 'imp'], ['snowman', 'ghost'], ['skull', 'imp'], ['ufo', 'skull'], ['dragonkid', 'ufo'], ['snowman', 'imp']],
    elite: [['dragon'], ['lion']],
    boss: [['zeroKing']],
  },
};

// がくねん で つよさを かえる
export const DIFF_SCALE = { easy: { hp: 0.8, atk: 0.75 }, normal: { hp: 1, atk: 1 } };
export const GRADE_SCALE = {
  1: { hp: 0.8, atk: 0.85 },
  2: { hp: 1.0, atk: 1.0 },
  3: { hp: 1.0, atk: 1.0 },
};

// 🎯ぴったりの かずの はんい（かい・がくねん）
export function lockRange(floor, grade) {
  const base = { 1: [[5, 14], [8, 20], [10, 26]], 2: [[6, 18], [10, 36], [16, 56]], 3: [[8, 24], [14, 48], [24, 90]] };
  return base[grade][floor - 1];
}
// じゃくてんの だん
export function weakChoices(grade) {
  return { 1: [5, 10], 2: [2, 3, 4, 5], 3: [3, 4, 6, 7] }[grade];
}
