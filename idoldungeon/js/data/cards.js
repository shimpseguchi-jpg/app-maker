// カードモードのカード（docs/DESIGN.md 17.3）。絵は使わず、テキストだけで見せる
// 台詞はイベントごとに1つ。{name} に相談を持ってきたアイドルの名前が入る
// hp：その答えでパーティの HP が動く大きさ（0 なし・1 少し・2 大きく）。画面ではゲージの上の点の大きさになる（増えるか減るかは見せない）

// 迷宮ごとの設定。階の数・1階あたりの枚数・番人（その階のルームガーダー・固定敵。DRPG と同じ強さ）・ボス
export const CARD_DUNGEONS = {
  d1: { floors: 3, perFloor: 7, guardians: ['g1a', 'g1b', 'abi'], boss: 'b1', loot: 1 },
  d2: { floors: 5, perFloor: 7, guardians: ['g2a', 'g2b', 'g2b', 'understudy', 'understudy2'], boss: 'b2', loot: 3 },
};
// 「この階をもっと探る」で増える枚数
export const EXTRA_CARDS = 3;
// ダークゾーン・呪文禁止が続く枚数
export const ZONE_CARDS = 3;
// カードモードのボスが昇格アイテムを落とす確率（DRPGモードは必ず落とす）
export const CARD_PROMO_RATE = 1 / 3;

// 道順カードの手がかり。選んだ道の手がかりに合うカードが、次に出やすくなる
export const HINTS = {
  water: { name: '水の音', kinds: ['fountain', 'pit', 'kitchen'] },
  steps: { name: '足音', kinds: ['enemy', 'guardian'] },
  light: { name: 'かすかな光', kinds: ['chest', 'rest', 'stage'] },
  wind: { name: '冷たい風', kinds: ['warp', 'dark', 'anti'] },
  voice: { name: '話し声', kinds: ['lost', 'riddle', 'cat'] },
  rubble: { name: '崩れる音', kinds: ['rubble', 'door', 'pit'] },
};

// どのカードが出やすいか（重み）。道順カードの手がかりに合うものは HINT_BOOST 倍
export const WEIGHTS = {
  route: 16, enemy: 30, guardian: 5, chest: 9, fountain: 5, pit: 5, door: 5, rest: 5, dark: 3, anti: 3, warp: 3,
  rubble: 3, lost: 2, riddle: 3, stage: 2, kitchen: 2, cat: 2,
};
export const HINT_BOOST = 5;

// 相談に来やすいアイドル（クラス・属性タグ）。合う子がいなければパーティの誰か
// need：右を選んだときにうまくいく条件（engine/cards.js が判定する）
export const EVENTS = {
  chest: { kind: 'イベント', title: '宝箱', text: '宝箱がある。{name}「開けてみる？」',
    left: { label: 'そっとしておく', hp: 0 }, right: { label: '開ける', hp: 1 }, who: { cls: ['thief', 'assassin', 'rogue', 'ninja', 'ranger'] } },
  fountain: { kind: 'イベント', title: '泉', text: '水が湧いている。{name}「飲んでみる？」',
    left: { label: '飲まない', hp: 0 }, right: { label: '飲む', hp: 2 }, who: { cls: ['priest', 'bishop', 'shaman', 'druid', 'troubadour', 'valkyrie'] } },
  pit: { kind: '仕掛け', title: '穴', text: '床に暗い穴が口を開けている。{name}「飛び越えられるかな」',
    left: { label: '回り道する', hp: 0 }, right: { label: '飛び越える', hp: 2 }, who: { cls: ['pegasus', 'falcoknight', 'wyvern', 'wyvernknight', 'wyvernlord'] } },
  door: { kind: '仕掛け', title: '鍵の扉', text: '鍵のかかった扉がある。{name}「開けられるかも」',
    left: { label: '通り過ぎる', hp: 0 }, right: { label: '鍵を開ける', hp: 1 }, who: { cls: ['thief', 'assassin', 'rogue', 'ninja', 'ranger'] } },
  rest: { kind: 'イベント', title: '小部屋', text: '静かな小部屋を見つけた。{name}「ちょっと休もうよ」',
    left: { label: '先を急ぐ', hp: 0 }, right: { label: '休む', hp: 2 }, who: {} },
  dark: { kind: '仕掛け', title: 'ダークゾーン', text: 'この先は真っ暗だ。{name}「歌で照らしてみる？」',
    left: { label: '手探りで進む', hp: 0 }, right: { label: '歌で照らす', hp: 0 }, who: { tags: ['singer'] } },
  anti: { kind: '仕掛け', title: '呪文禁止の場所', text: '空気が重い。呪文が封じられる場所のようだ。{name}「どうする？」',
    left: { label: '回り道する', hp: 0 }, right: { label: '突っ切る', hp: 0 }, who: { cls: ['mage', 'sage', 'shaman', 'druid', 'summoner', 'alchemist'] } },
  warp: { kind: '仕掛け', title: '光る紋様', text: '床に光る紋様がある。{name}「乗ってみる？」',
    left: { label: '避ける', hp: 0 }, right: { label: '乗る', hp: 0 }, who: { tags: ['airhead', 'mypace'] } },
  rubble: { kind: 'イベント', title: '瓦礫', text: '瓦礫で道がふさがれている。{name}「押せば動きそう！」',
    left: { label: '回り道する', hp: 0 }, right: { label: '押し通る', hp: 1 }, who: { tags: ['sporty', 'genki'] }, need: { tags: ['sporty', 'genki'], count: 2 } },
  lost: { kind: 'イベント', title: '迷子', text: '迷子の小道具係が泣いている。{name}「放っておけないよ」',
    left: { label: '先を急ぐ', hp: 0 }, right: { label: '送り届ける', hp: 1 }, who: { tags: ['oneesan', 'homey', 'reliable'] }, need: { tags: ['oneesan', 'homey', 'reliable'], count: 1 } },
  riddle: { kind: 'イベント', title: '謎かけの扉', text: '扉に謎かけが刻まれている。{name}「解いてみる？」',
    left: { label: 'やめておく', hp: 0 }, right: { label: '解く', hp: 1 }, who: { tags: ['intelli', 'genius', 'glasses'] }, need: { tags: ['intelli', 'genius', 'glasses'], count: 1 } },
  stage: { kind: 'イベント', title: '小さな舞台', text: '埃をかぶった小さな舞台がある。{name}「歌ってみる？」',
    left: { label: '通り過ぎる', hp: 0 }, right: { label: '歌う', hp: 1 }, who: { tags: ['singer'] }, need: { tags: ['singer'], count: 1 } },
  kitchen: { kind: 'イベント', title: '食材', text: '食材の入った木箱を見つけた。{name}「何か作れそう」',
    left: { label: 'やめておく', hp: 0 }, right: { label: '料理する', hp: 2 }, who: { tags: ['cook', 'homey', 'gourmet'] }, need: { tags: ['cook', 'homey'], count: 1 } },
  cat: { kind: 'イベント', title: '猫', text: '迷い込んだ猫がこちらを見ている。{name}「ついていってみる？」',
    left: { label: '放っておく', hp: 0 }, right: { label: 'ついていく', hp: 1 }, who: { tags: ['animal'] }, need: { tags: ['animal'], count: 1 } },
};
