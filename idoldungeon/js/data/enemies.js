// 敵（作中劇の舞台にちなんだもの。名前・数値は仮）
// uname: 正体が分かる前の名前（エルミナージュの不確定名）
// hp atk mat def res spd hit eva / exp gold: 1体あたりの報酬
// acts: 行動の候補（w は重み）。kind は js/engine/battle.js の効果の種類、attack は通常攻撃
//   poison: 攻撃が当たると毒（確率 %） / sleep など
// resist: 効かない状態（sleep silence confuse death）
// icon: 画面に出す絵文字

export const ENEMIES = {};
function def(e) { ENEMIES[e.id] = { resist: [], acts: [{ kind: 'attack', w: 1 }], ...e }; }

// 1F
def({ id: 'bat', name: '楽屋コウモリ', uname: '羽ばたく影', icon: '🦇', level: 1,
  hp: 35, atk: 13, mat: 0, def: 1, res: 1, spd: 24, hit: 70, eva: 18, exp: 48, gold: 12 });
def({ id: 'prop', name: '動く小道具', uname: '動く物体', icon: '📦', level: 1,
  hp: 55, atk: 15, mat: 0, def: 4, res: 0, spd: 10, hit: 65, eva: 4, exp: 60, gold: 20, resist: ['sleep'] });
def({ id: 'kuroko', name: '黒子の影', uname: '黒い人影', icon: '👤', level: 2,
  hp: 50, atk: 14, mat: 14, def: 2, res: 4, spd: 18, hit: 72, eva: 10, exp: 80, gold: 24,
  acts: [{ kind: 'attack', w: 3 }, { kind: 'sleepGroup', w: 1, name: '子守唄' }] });
// B1F
def({ id: 'rat', name: '奈落の大ネズミ', uname: '小さな獣', icon: '🐀', level: 3,
  hp: 90, atk: 19, mat: 0, def: 3, res: 2, spd: 22, hit: 75, eva: 12, exp: 120, gold: 28, poison: 30 });
def({ id: 'critic', name: '辛口の批評家', uname: 'ローブ姿の人物', icon: '🧐', level: 4,
  hp: 102, atk: 14, mat: 22, def: 3, res: 8, spd: 16, hit: 70, eva: 8, exp: 180, gold: 60,
  acts: [{ kind: 'attack', w: 1 }, { kind: 'dmgOne', power: 1.2, w: 2, name: '酷評' }, { kind: 'silenceGroup', w: 1, name: '野次' }] });
def({ id: 'curtain', name: '暗幕の亡霊', uname: 'ゆらめく布', icon: '👻', level: 4,
  hp: 96, atk: 23, mat: 22, def: 5, res: 6, spd: 14, hit: 72, eva: 14, exp: 200, gold: 48, resist: ['sleep', 'death'],
  acts: [{ kind: 'attack', w: 2 }, { kind: 'dmgAll', power: 0.5, w: 1, name: '暗転' }] });
// B2F
def({ id: 'spotlight', name: 'さまようスポットライト', uname: '光る何か', icon: '🔦', level: 5,
  hp: 140, atk: 24, mat: 29, def: 6, res: 10, spd: 26, hit: 78, eva: 16, exp: 280, gold: 60, resist: ['sleep'],
  acts: [{ kind: 'attack', w: 1 }, { kind: 'dmgGroup', power: 0.8, w: 1, name: '強い光' }] });
def({ id: 'stagehand', name: '荒くれ大道具', uname: '大柄な人影', icon: '🪓', level: 6,
  hp: 188, atk: 30, mat: 0, def: 8, res: 3, spd: 12, hit: 75, eva: 6, exp: 360, gold: 90 });
// ルームガーダー・固定敵
def({ id: 'gatekeeper', name: '楽屋の番人', uname: '鎧を着た人影', icon: '🛡️', level: 3,
  hp: 224, atk: 32, mat: 0, def: 6, res: 4, spd: 14, hit: 75, eva: 6, exp: 240, gold: 80, resist: ['sleep'] });
def({ id: 'watcher', name: '奈落の見張り', uname: '目の多い何か', icon: '👁️', level: 5,
  hp: 266, atk: 36, mat: 29, def: 6, res: 8, spd: 18, hit: 78, eva: 10, exp: 440, gold: 120,
  acts: [{ kind: 'attack', w: 2 }, { kind: 'sleepGroup', w: 1, name: 'にらみ' }] });
def({ id: 'abi', name: '居残りの亡霊', uname: '透けた人影', icon: '🕯️', level: 6,
  hp: 150, atk: 22, mat: 20, def: 6, res: 10, spd: 16, hit: 75, eva: 14, exp: 600, gold: 40, resist: ['death'],
  acts: [{ kind: 'attack', w: 2 }, { kind: 'dmgGroup', power: 0.7, w: 1, name: '恨み節' }] });

// ── 奈落の大劇場（d2） ──
// 1F 客席
def({ id: 'usher', name: '案内係の亡霊', uname: '懐中電灯を持つ影', icon: '🕯️', level: 7,
  hp: 212, atk: 38, mat: 32, def: 9, res: 8, spd: 26, hit: 80, eva: 14, exp: 160, gold: 50,
  acts: [{ kind: 'attack', w: 3 }, { kind: 'sleepGroup', w: 1, name: '開演前のアナウンス' }] });
def({ id: 'seatbug', name: '客席の虫', uname: '這い回るもの', icon: '🪲', level: 7,
  hp: 150, atk: 35, mat: 0, def: 8, res: 4, spd: 30, hit: 82, eva: 20, exp: 120, gold: 30, poison: 40 });
// B1F 舞台裏
def({ id: 'mannequin', name: '衣装のマネキン', uname: '動く人形', icon: '🎎', level: 8,
  hp: 288, atk: 42, mat: 0, def: 12, res: 6, spd: 18, hit: 80, eva: 8, exp: 210, gold: 60, resist: ['sleep', 'confuse'] });
def({ id: 'rope', name: '暴れる綱', uname: '長いもの', icon: '🪢', level: 8,
  hp: 225, atk: 38, mat: 35, def: 8, res: 8, spd: 32, hit: 84, eva: 18, exp: 190, gold: 40,
  acts: [{ kind: 'attack', w: 2 }, { kind: 'dmgGroup', power: 0.8, w: 1, name: 'しなる一撃' }] });
// B2F 奈落
def({ id: 'imp', name: '奈落の小鬼', uname: '小さな影', icon: '👺', level: 9,
  hp: 212, atk: 42, mat: 38, def: 10, res: 10, spd: 36, hit: 86, eva: 22, exp: 230, gold: 70, poison: 30,
  acts: [{ kind: 'attack', w: 3 }, { kind: 'silenceGroup', w: 1, name: '耳ざわりな笑い' }] });
def({ id: 'trapdoor', name: 'せり上がりの怪', uname: '床のようなもの', icon: '🕳️', level: 10,
  hp: 375, atk: 52, mat: 0, def: 14, res: 6, spd: 14, hit: 82, eva: 6, exp: 300, gold: 80, resist: ['sleep'] });
// B3F 楽屋
def({ id: 'diva', name: '嫉妬の歌姫', uname: 'ドレスの人影', icon: '💃', level: 11,
  hp: 325, atk: 38, mat: 52, def: 10, res: 16, spd: 30, hit: 84, eva: 18, exp: 380, gold: 120,
  acts: [{ kind: 'attack', w: 1 }, { kind: 'dmgAll', power: 0.6, w: 2, name: '金切り声' }, { kind: 'silenceGroup', w: 1, name: '嫉妬の視線' }] });
def({ id: 'mirror', name: '楽屋の鏡', uname: '光る板', icon: '🪞', level: 11,
  hp: 350, atk: 48, mat: 45, def: 16, res: 18, spd: 20, hit: 84, eva: 10, exp: 360, gold: 100, resist: ['sleep', 'confuse'],
  acts: [{ kind: 'attack', w: 2 }, { kind: 'dmgOne', power: 1.4, w: 1, name: '映し返し' }] });
// B4F 大舞台
def({ id: 'chorus', name: '亡霊合唱団', uname: 'ささやく影', icon: '👥', level: 12,
  hp: 300, atk: 45, mat: 50, def: 12, res: 14, spd: 28, hit: 86, eva: 16, exp: 420, gold: 110, resist: ['death'],
  acts: [{ kind: 'attack', w: 2 }, { kind: 'dmgGroup', power: 0.8, w: 1, name: '不協和音' }] });
def({ id: 'conductor', name: '狂った指揮者', uname: '棒を振る人影', icon: '🎼', level: 13,
  hp: 450, atk: 55, mat: 55, def: 14, res: 16, spd: 34, hit: 88, eva: 14, exp: 560, gold: 160,
  acts: [{ kind: 'attack', w: 2 }, { kind: 'dmgAll', power: 0.7, w: 1, name: 'フォルティッシモ' }, { kind: 'sleepGroup', w: 1, name: '子守歌の指揮' }] });
// ルームガーダー・固定敵
def({ id: 'headUsher', name: '案内係長', uname: '制服の人影', icon: '🎫', level: 9,
  hp: 588, atk: 47, mat: 39, def: 12, res: 10, spd: 24, hit: 84, eva: 10, exp: 500, gold: 150, resist: ['sleep'],
  acts: [{ kind: 'attack', w: 3 }, { kind: 'sleepGroup', w: 1, name: '終演のアナウンス' }] });
def({ id: 'stageBoss', name: '舞台監督の亡霊', uname: 'メガホンの人影', icon: '📣', level: 10,
  hp: 672, atk: 52, mat: 44, def: 14, res: 12, spd: 26, hit: 85, eva: 10, exp: 620, gold: 180,
  acts: [{ kind: 'attack', w: 2 }, { kind: 'dmgAll', power: 0.5, w: 1, name: '怒号' }] });
def({ id: 'understudy', name: '控えの怪人', uname: '仮面の人影', icon: '🎭', level: 12,
  hp: 525, atk: 55, mat: 50, def: 14, res: 16, spd: 30, hit: 86, eva: 16, exp: 900, gold: 60, resist: ['death'],
  acts: [{ kind: 'attack', w: 2 }, { kind: 'dmgGroup', power: 0.9, w: 1, name: '代役の意地' }] });

// 階ごとの出現パターン（[敵, 最少, 最多] のグループを1〜4つ）
export const ENCOUNTERS = {
  d1: [
    [[['bat', 1, 3]], [['prop', 1, 2]], [['bat', 1, 2], ['prop', 1, 2]], [['kuroko', 1, 2]], [['prop', 1, 2], ['kuroko', 1, 1]]],
    [[['rat', 2, 3]], [['critic', 1, 1], ['rat', 1, 3]], [['curtain', 1, 2]], [['rat', 1, 2], ['curtain', 1, 1]], [['kuroko', 2, 3], ['critic', 1, 1]]],
    [[['spotlight', 1, 3]], [['stagehand', 1, 2]], [['stagehand', 1, 1], ['spotlight', 1, 2]], [['curtain', 1, 2], ['critic', 1, 1], ['rat', 1, 3]]],
  ],
  d2: [
    [[['usher', 1, 3]], [['seatbug', 2, 4]], [['usher', 1, 2], ['seatbug', 1, 3]], [['stagehand', 1, 2], ['usher', 1, 1]]],
    [[['mannequin', 1, 3]], [['rope', 1, 3]], [['mannequin', 1, 2], ['rope', 1, 2]], [['usher', 2, 3], ['rope', 1, 1]]],
    [[['imp', 2, 4]], [['trapdoor', 1, 2]], [['trapdoor', 1, 1], ['imp', 1, 3]], [['mannequin', 1, 2], ['imp', 1, 2]]],
    [[['diva', 1, 2]], [['mirror', 1, 3]], [['mirror', 1, 2], ['diva', 1, 1]], [['imp', 2, 3], ['diva', 1, 2]]],
    [[['chorus', 2, 3]], [['conductor', 1, 1], ['chorus', 1, 2]], [['mirror', 1, 2], ['conductor', 1, 1]], [['chorus', 1, 2], ['diva', 1, 2], ['imp', 1, 2]]],
  ],
};
// ルームガーダー・固定敵の編成（floors.js の special.id）
export const FIXED_GROUPS = {
  g1a: [['gatekeeper', 1, 1], ['prop', 2, 3]],
  g1b: [['watcher', 1, 1], ['rat', 2, 4]],
  abi: [['abi', 1, 1]],
  g2a: [['headUsher', 1, 1], ['usher', 2, 2]],
  g2b: [['stageBoss', 1, 1], ['mannequin', 1, 2]],
  understudy: [['understudy', 1, 1]],
  understudy2: [['understudy', 1, 1], ['chorus', 1, 2]],
};
