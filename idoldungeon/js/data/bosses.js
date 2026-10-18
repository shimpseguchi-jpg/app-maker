// ボス。ダンジョンの最深部にいて、クリア後も強化されて再出現する（docs/DESIGN.md「9. ボスと再戦」）
// 敵データの形は戦闘エンジンを作るときに決め直す。ここでは再戦の強化とドロップに要る分だけ
// base: hp atk mat def res spd（強化前） / level / gold / songRank: ドロップする楽曲のランク
// drops.crests: 確定で落とす系統別昇格アイテムの候補（1つを抽選）
// rematch: 再戦ごとに足される特性（n 回目以降に追加）
// escort: 初戦から連れている取り巻き [敵, 数] / guard: 再戦3回目（取り巻き）から呼ぶ護衛 [敵, 数]
// uname icon hit eva exp acts: 戦闘用（省略すると共通の値）

export const BOSSES = {};
function def(b) { BOSSES[b.id] = b; }

// 仮のボス（第1ダンジョン）。名前・見た目は今後決める
def({ id: 'b1', dungeon: 'd1', name: '迷宮の番人（仮）', level: 12, gold: 1500, songRank: 2,
  base: { hp: 800, atk: 58, mat: 40, def: 10, res: 10, spd: 26 },
  drops: { crests: ['heroCrest', 'knightCrest', 'orionBolt', 'elysianWhip', 'guidingRing', 'oceanSeal'] },
  escort: ['kuroko', 2], guard: ['stagehand', 2],
  rematch: [
    { from: 1, id: 'twoActions', name: '連続行動', text: '1ターンに2回行動する' },
    { from: 2, id: 'resistAll', name: '強化外殻', text: '状態異常と即死が効かない' },
    { from: 3, id: 'summonGuard', name: '取り巻き', text: '戦闘開始時に護衛を呼ぶ' },
  ] });

// 奈落の大劇場（d2）のボス。名前・見た目は仮
def({ id: 'b2', dungeon: 'd2', name: '奈落の怪人（仮）', uname: '仮面の巨影', icon: '🎭', level: 18, gold: 4000, songRank: 4,
  base: { hp: 3400, atk: 104, mat: 84, def: 22, res: 22, spd: 44 }, hit: 94, eva: 16, exp: 3000,
  acts: [{ kind: 'attack', w: 3 }, { kind: 'dmgAll', power: 0.8, w: 1, name: '奈落の独唱' }, { kind: 'silenceGroup', w: 1, name: '仮面の微笑' }],
  drops: { crests: ['heroCrest', 'knightCrest', 'orionBolt', 'elysianWhip', 'guidingRing', 'oceanSeal'] },
  escort: ['chorus', 2], guard: ['conductor', 1],
  rematch: [
    { from: 1, id: 'twoActions', name: '連続行動', text: '1ターンに2回行動する' },
    { from: 2, id: 'resistAll', name: '強化外殻', text: '状態異常と即死が効かない' },
    { from: 3, id: 'summonGuard', name: '取り巻き', text: '戦闘開始時に指揮者を呼ぶ' },
  ] });
