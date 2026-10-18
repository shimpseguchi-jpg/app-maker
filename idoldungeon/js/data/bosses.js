// ボス。ダンジョンの最深部にいて、クリア後も強化されて再出現する（docs/DESIGN.md「9. ボスと再戦」）
// 敵データの形は戦闘エンジンを作るときに決め直す。ここでは再戦の強化とドロップに要る分だけ
// base: hp atk mat def res spd（強化前） / level / gold / songRank: ドロップする楽曲のランク
// drops.crests: 確定で落とす系統別昇格アイテムの候補（1つを抽選）
// rematch: 再戦ごとに足される特性（n 回目以降に追加）

export const BOSSES = {};
function def(b) { BOSSES[b.id] = b; }

// 仮のボス（第1ダンジョン）。名前・見た目は今後決める
def({ id: 'b1', dungeon: 'd1', name: '迷宮の番人（仮）', level: 12, gold: 1500, songRank: 2,
  base: { hp: 650, atk: 50, mat: 36, def: 10, res: 10, spd: 26 },
  drops: { crests: ['heroCrest', 'knightCrest', 'orionBolt', 'elysianWhip', 'guidingRing', 'oceanSeal'] },
  rematch: [
    { from: 1, id: 'twoActions', name: '連続行動', text: '1ターンに2回行動する' },
    { from: 2, id: 'resistAll', name: '強化外殻', text: '状態異常と即死が効かない' },
    { from: 3, id: 'summonGuard', name: '取り巻き', text: '戦闘開始時に護衛を呼ぶ' },
  ] });
