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
  hp: 35, atk: 13, mat: 0, def: 1, res: 1, spd: 24, hit: 70, eva: 18, exp: 12, gold: 6 });
def({ id: 'prop', name: '動く小道具', uname: '動く物体', icon: '📦', level: 1,
  hp: 55, atk: 15, mat: 0, def: 4, res: 0, spd: 10, hit: 65, eva: 4, exp: 15, gold: 10, resist: ['sleep'] });
def({ id: 'kuroko', name: '黒子の影', uname: '黒い人影', icon: '👤', level: 2,
  hp: 50, atk: 14, mat: 14, def: 2, res: 4, spd: 18, hit: 72, eva: 10, exp: 20, gold: 12,
  acts: [{ kind: 'attack', w: 3 }, { kind: 'sleepGroup', w: 1, name: '子守唄' }] });
// B1F
def({ id: 'rat', name: '奈落の大ネズミ', uname: '小さな獣', icon: '🐀', level: 3,
  hp: 75, atk: 16, mat: 0, def: 3, res: 2, spd: 22, hit: 75, eva: 12, exp: 30, gold: 14, poison: 30 });
def({ id: 'critic', name: '辛口の批評家', uname: 'ローブ姿の人物', icon: '🧐', level: 4,
  hp: 85, atk: 12, mat: 18, def: 3, res: 8, spd: 16, hit: 70, eva: 8, exp: 45, gold: 30,
  acts: [{ kind: 'attack', w: 1 }, { kind: 'dmgOne', power: 1.2, w: 2, name: '酷評' }, { kind: 'silenceGroup', w: 1, name: '野次' }] });
def({ id: 'curtain', name: '暗幕の亡霊', uname: 'ゆらめく布', icon: '👻', level: 4,
  hp: 80, atk: 19, mat: 18, def: 5, res: 6, spd: 14, hit: 72, eva: 14, exp: 50, gold: 24, resist: ['sleep', 'death'],
  acts: [{ kind: 'attack', w: 2 }, { kind: 'dmgAll', power: 0.5, w: 1, name: '暗転' }] });
// B2F
def({ id: 'spotlight', name: 'さまようスポットライト', uname: '光る何か', icon: '🔦', level: 5,
  hp: 112, atk: 20, mat: 24, def: 6, res: 10, spd: 26, hit: 78, eva: 16, exp: 70, gold: 30, resist: ['sleep'],
  acts: [{ kind: 'attack', w: 1 }, { kind: 'dmgGroup', power: 0.8, w: 1, name: '強い光' }] });
def({ id: 'stagehand', name: '荒くれ大道具', uname: '大柄な人影', icon: '🪓', level: 6,
  hp: 150, atk: 25, mat: 0, def: 8, res: 3, spd: 12, hit: 75, eva: 6, exp: 90, gold: 45 });
// ルームガーダー・固定敵
def({ id: 'gatekeeper', name: '楽屋の番人', uname: '鎧を着た人影', icon: '🛡️', level: 3,
  hp: 160, atk: 25, mat: 0, def: 6, res: 4, spd: 14, hit: 75, eva: 6, exp: 60, gold: 40, resist: ['sleep'] });
def({ id: 'watcher', name: '奈落の見張り', uname: '目の多い何か', icon: '👁️', level: 5,
  hp: 190, atk: 28, mat: 22, def: 6, res: 8, spd: 18, hit: 78, eva: 10, exp: 110, gold: 60,
  acts: [{ kind: 'attack', w: 2 }, { kind: 'sleepGroup', w: 1, name: 'にらみ' }] });
def({ id: 'abi', name: '居残りの亡霊', uname: '透けた人影', icon: '🕯️', level: 6,
  hp: 150, atk: 22, mat: 20, def: 6, res: 10, spd: 16, hit: 75, eva: 14, exp: 150, gold: 20, resist: ['death'],
  acts: [{ kind: 'attack', w: 2 }, { kind: 'dmgGroup', power: 0.7, w: 1, name: '恨み節' }] });

// ボスの取り巻き（初戦から黒子を連れている。再戦3回目からは大道具も呼ぶ）
export const BOSS_ESCORT = ['kuroko', 2];
export const BOSS_GUARD = 'stagehand';

// 階ごとの出現パターン（[敵, 最少, 最多] のグループを1〜4つ）
export const ENCOUNTERS = {
  d1: [
    [[['bat', 1, 3]], [['prop', 1, 2]], [['bat', 1, 2], ['prop', 1, 2]], [['kuroko', 1, 2]], [['prop', 1, 2], ['kuroko', 1, 1]]],
    [[['rat', 2, 3]], [['critic', 1, 1], ['rat', 1, 3]], [['curtain', 1, 2]], [['rat', 1, 2], ['curtain', 1, 1]], [['kuroko', 2, 3], ['critic', 1, 1]]],
    [[['spotlight', 1, 3]], [['stagehand', 1, 2]], [['stagehand', 1, 1], ['spotlight', 1, 2]], [['curtain', 1, 2], ['critic', 1, 1], ['rat', 1, 3]]],
  ],
};
// ルームガーダー・固定敵の編成（floors.js の special.id）
export const FIXED_GROUPS = {
  g1a: [['gatekeeper', 1, 1], ['prop', 2, 3]],
  g1b: [['watcher', 1, 1], ['rat', 2, 4]],
  abi: [['abi', 1, 1]],
};
