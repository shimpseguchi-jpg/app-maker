// クラス（職業）。エルミナージュの「転職」と、ファイアーエムブレム 聖魔の光石の「下位職→上位職（2択の昇格）」を合わせた形
// 名前の表記は原作準拠を目指す（docs/DESIGN.md「7. クラス」。要確認のものは verify: true）
//
// tier: 1 下位職 / 2 上位職
// src: elm(エルミナージュ由来) / fe(聖魔の光石由来)。両方にあるものは両方
// req: 転職に必要な基本能力の下限（エルミナージュ式。上位職への昇格には不要）
// promote: 昇格先（下位職のみ。聖魔の光石と同じく2択）
// change: true ならエルミナージュ式の転職で直接なれる（下位職すべて＋エルミナージュの上級職）
// bonus: 昇格したときに基本能力へ足される値（聖魔の光石の昇格ボーナスに相当）
// effects: クラスの特性（synergies.js と同じ形式。to は self）
// role: 戦い方の説明

export const CLASSES = {};
function def(c) { CLASSES[c.id] = { change: c.tier === 1, effects: [], ...c }; }
const st = (stat, v) => ({ type: 'stat', stat, add: v, to: 'self' });
const ab = (id, name, text) => ({ type: 'ability', id, name, text, to: 'self' });

// ── 下位職 ──
def({ id: 'fighter', name: '戦士', elmName: 'ファイター', tier: 1, src: ['elm', 'fe'], req: { pow: 11 },
  promote: ['warrior', 'hero'], effects: [st('hp', 4)], role: '前衛。高いHPと物理攻撃' });
def({ id: 'mercenary', name: '傭兵', tier: 1, src: ['fe'], req: { pow: 10, dan: 10 },
  promote: ['hero', 'ranger'], effects: [st('hit', 5)], role: '前衛。攻守のバランス型' });
def({ id: 'myrmidon', name: '剣士', tier: 1, src: ['fe'], req: { dan: 12 },
  promote: ['swordmaster', 'assassin'], effects: [st('crit', 5)], role: '前衛。素早く会心が出やすい' });
def({ id: 'knight', name: 'アーマーナイト', elmName: 'ナイト', tier: 1, src: ['elm', 'fe'], req: { pow: 10, sta: 12 },
  promote: ['general', 'greatknight'], effects: [st('def', 4), st('spd', -4)], role: '前衛。重装で仲間を守る' });
def({ id: 'cavalier', name: 'ソシアルナイト', tier: 1, src: ['fe'], req: { pow: 10, sta: 10 },
  promote: ['paladin', 'greatknight'], effects: [st('def', 1), st('spd', 2)], role: '前衛。騎馬の万能型' });
def({ id: 'pegasus', name: 'ペガサスナイト', tier: 1, src: ['fe'], req: { dan: 11, vis: 11 },
  promote: ['falcoknight', 'wyvernknight'], effects: [st('eva', 5), ab('flying', '飛行', '落とし穴の影響を受けない')], role: '前衛。回避が高く魔防も強め' });
def({ id: 'wyvern', name: 'ドラゴンナイト', tier: 1, src: ['fe'], req: { pow: 12, sta: 11 },
  promote: ['wyvernlord', 'wyvernknight'], effects: [st('def', 2), ab('flying', '飛行', '落とし穴の影響を受けない')], role: '前衛。硬くて力強いが魔法に弱い' });
def({ id: 'archer', name: 'アーチャー', tier: 1, src: ['fe'], req: { dan: 11 },
  promote: ['sniper', 'ranger'], effects: [ab('bow', '弓', '後列からでも物理攻撃できる')], role: '後衛から物理攻撃' });
def({ id: 'thief', name: '盗賊', elmName: '盗賊', tier: 1, src: ['elm', 'fe'], req: { dan: 11 },
  promote: ['assassin', 'rogue'], effects: [ab('disarm', '罠解除', '宝箱の罠を調べて外せる')], role: '宝箱の罠解除・鍵開け' });
def({ id: 'mage', name: '魔道士', elmName: '魔術師', tier: 1, src: ['elm', 'fe'], req: { vo: 11 },
  promote: ['sage', 'mageknight'], effects: [ab('arcane', '理魔法', '攻撃魔法を覚える')], role: '後衛。攻撃魔法' });
def({ id: 'shaman', name: 'シャーマン', elmName: '精霊使い', tier: 1, src: ['elm', 'fe'], req: { vo: 10, men: 10 }, verify: true,
  promote: ['druid', 'summoner'], effects: [ab('dark', '闇魔法', '状態異常を伴う攻撃魔法を覚える')], role: '後衛。闇魔法・状態異常' });
def({ id: 'priest', name: '僧侶', elmName: '僧侶', tier: 1, src: ['elm', 'fe'], req: { men: 11 },
  promote: ['bishop', 'sage'], effects: [ab('heal', '回復魔法', '回復・解毒の魔法を覚える')], role: '後衛。回復' });
def({ id: 'troubadour', name: 'トルバドール', tier: 1, src: ['fe'], req: { men: 10, vis: 11 },
  promote: ['valkyrie', 'mageknight'], effects: [st('spd', 2), ab('heal', '回復魔法', '回復・解毒の魔法を覚える')], role: '騎馬の回復役' });
def({ id: 'alchemist', name: '錬金術師', tier: 1, src: ['elm'], req: { vo: 12, men: 10 },
  promote: ['sage', 'summoner'], effects: [ab('alchemy', '錬金術', '毒・ガス系の魔法を覚える。装備の合成ができる')], role: '後衛。錬金魔法と合成' });
def({ id: 'dancer', name: '踊り子', tier: 1, src: ['fe'], req: { dan: 14, vis: 13 },
  promote: [], effects: [ab('dance', '踊る', '行動済みの味方1人をもう一度行動させる')], role: '昇格しない特別職。味方の再行動' });

// ── 上位職（聖魔の光石の昇格先） ──
def({ id: 'warrior', name: 'ウォーリア', tier: 2, src: ['fe'], bonus: { pow: 2, sta: 3 }, effects: [st('hp', 8), ab('bow', '弓', '後列からでも物理攻撃できる')], role: '斧と弓の重戦士' });
def({ id: 'hero', name: '勇者', tier: 2, src: ['fe'], bonus: { pow: 2, dan: 2, sta: 1 }, effects: [st('hit', 8), st('hp', 4)], role: '剣と斧のバランス型' });
def({ id: 'swordmaster', name: 'ソードマスター', tier: 2, src: ['fe'], bonus: { pow: 1, dan: 3 }, effects: [st('crit', 15)], role: '会心特化の剣士' });
def({ id: 'assassin', name: 'アサシン', tier: 2, src: ['fe'], bonus: { pow: 1, dan: 2, vis: 1 }, effects: [ab('silencer', '瞬殺', '物理攻撃で低確率に即死'), ab('disarm', '罠解除', '宝箱の罠を調べて外せる')], role: '即死攻撃と罠解除' });
def({ id: 'general', name: 'ジェネラル', tier: 2, src: ['fe'], bonus: { pow: 2, sta: 4 }, effects: [st('def', 8), st('spd', -4)], role: '鉄壁の盾役' });
def({ id: 'greatknight', name: 'グレートナイト', tier: 2, src: ['fe'], bonus: { pow: 2, sta: 3 }, effects: [st('def', 5)], role: '重装騎馬。剣・槍・斧' });
def({ id: 'paladin', name: 'パラディン', tier: 2, src: ['fe'], bonus: { pow: 1, sta: 2, men: 1 }, effects: [st('def', 3), st('spd', 4)], role: '騎馬の万能前衛' });
def({ id: 'falcoknight', name: 'ファルコンナイト', tier: 2, src: ['fe'], bonus: { dan: 2, men: 2 }, effects: [st('eva', 10), ab('flying', '飛行', '落とし穴の影響を受けない')], role: '高回避の天馬騎士' });
def({ id: 'wyvernknight', name: 'ワイバーンナイト', tier: 2, src: ['fe'], bonus: { pow: 1, dan: 2, sta: 1 }, effects: [ab('pierce', '貫通', '低確率で敵の防御を無視'), ab('flying', '飛行', '落とし穴の影響を受けない')], role: '防御無視の一撃' });
def({ id: 'wyvernlord', name: 'ドラゴンマスター', tier: 2, src: ['fe'], bonus: { pow: 2, sta: 2 }, effects: [st('def', 4), ab('flying', '飛行', '落とし穴の影響を受けない')], role: '竜騎士の上位。剣と槍' });
def({ id: 'sniper', name: 'スナイパー', tier: 2, src: ['fe'], bonus: { pow: 2, dan: 2 }, effects: [st('crit', 10), ab('bow', '弓', '後列からでも物理攻撃できる')], role: '必中に近い弓' });
def({ id: 'ranger', name: 'レンジャー', elmName: 'レンジャー', tier: 2, src: ['elm', 'fe'], bonus: { pow: 1, dan: 2, sta: 1 }, effects: [ab('bow', '弓', '後列からでも物理攻撃できる'), ab('ambush', '索敵', '不意打ちを受けにくい')], role: '騎馬弓兵。探索に強い' });
def({ id: 'rogue', name: 'ローグ', tier: 2, src: ['fe'], bonus: { dan: 2, vis: 2 }, effects: [ab('disarm', '罠解除', '宝箱の罠を調べて外せる'), ab('unlock', '鍵開け', '鍵のかかった扉と宝箱を開けられる')], role: '探索特化の盗賊' });
def({ id: 'sage', name: 'セイジ', tier: 2, src: ['fe'], bonus: { vo: 2, men: 2 }, effects: [ab('arcane', '理魔法', '攻撃魔法を覚える'), ab('heal', '回復魔法', '回復・解毒の魔法を覚える')], role: '攻撃と回復の魔法' });
def({ id: 'mageknight', name: 'マージナイト', tier: 2, src: ['fe'], bonus: { vo: 2, sta: 2 }, effects: [st('spd', 4), ab('arcane', '理魔法', '攻撃魔法を覚える')], role: '騎馬の魔法戦士' });
def({ id: 'druid', name: 'ドルイド', tier: 2, src: ['fe'], bonus: { vo: 3, men: 1 }, effects: [ab('dark', '闇魔法', '状態異常を伴う攻撃魔法を覚える'), ab('sleepStaff', '眠りの杖', '敵1体を眠らせる')], role: '強力な闇魔法' });
def({ id: 'summoner', name: 'サマナー', tier: 2, src: ['fe'], bonus: { vo: 2, men: 2 }, effects: [ab('summon', '召喚', '戦闘中に幻影を1体呼び出す（エルミナージュの召喚に相当）')], role: '召喚' });
def({ id: 'bishop', name: 'ビショップ', elmName: '司教', tier: 2, src: ['elm', 'fe'], bonus: { vo: 1, men: 3 }, effects: [ab('heal', '回復魔法', '回復・解毒の魔法を覚える'), ab('identify', '鑑定', '未鑑定の楽譜・装備を鑑定できる')], role: '回復と鑑定' });
def({ id: 'valkyrie', name: 'ヴァルキュリア', elmName: 'ヴァルキリー', tier: 2, src: ['elm', 'fe'], bonus: { vo: 2, men: 2 }, effects: [st('spd', 4), ab('heal', '回復魔法', '回復・解毒の魔法を覚える')], role: '騎馬の回復・魔法' });

// ── エルミナージュの上級職（昇格ではなく、転職の能力条件を満たせば直接なれる） ──
def({ id: 'samurai', name: '侍', tier: 2, src: ['elm'], change: true, req: { pow: 15, vo: 11, dan: 14 }, effects: [st('crit', 10), ab('arcane', '理魔法', '攻撃魔法を覚える（遅め）')], role: '剣技と魔法' });
def({ id: 'ninja', name: '忍者', tier: 2, src: ['elm'], change: true, req: { pow: 15, dan: 16, vis: 13 }, effects: [ab('silencer', '首切り', '物理攻撃で低確率に即死'), ab('disarm', '罠解除', '宝箱の罠を調べて外せる')], role: '素手の即死と罠解除' });
def({ id: 'lord', name: 'ロード', tier: 2, src: ['elm'], change: true, req: { pow: 14, men: 14, sta: 14, vis: 14 }, effects: [st('def', 3), ab('heal', '回復魔法', '回復・解毒の魔法を覚える（遅め）')], role: '前衛と回復を兼ねる' });

// 転職・昇格しても引き継がれる「魔法」（エルミナージュでは覚えた呪文は転職後も残る。罠解除などのクラス技能は残らない）
export const SPELLS = new Set(['arcane', 'heal', 'dark', 'alchemy', 'summon', 'sleepStaff']);
// 魔法の系統（呪文の回数は系統ごと。js/data/spells.js）
export const SPELL_FAMILIES = ['arcane', 'heal', 'dark', 'alchemy'];

// 攻撃の射程（エルミナージュ準拠。武器を実装するまではクラスで決める）
//   S：目の前の敵の列だけ ／ M：2列先まで ／ L：どこからでも全部の敵。後列からは1列ぶん短くなる
const RANGE_M = ['knight', 'cavalier', 'pegasus', 'wyvern', 'general', 'greatknight', 'paladin', 'falcoknight', 'wyvernknight', 'wyvernlord'];
const RANGE_L = ['archer', 'warrior', 'sniper', 'ranger'];
for (const c of Object.values(CLASSES)) c.range = RANGE_L.includes(c.id) ? 'L' : RANGE_M.includes(c.id) ? 'M' : 'S';

// 装備できる小道具（武器）の種類と、衣装の重さ（js/data/gear.js。docs/DESIGN.md「18. 装備」）
//   聖魔の光石の武器の種類をもとに、魔法職は杖、盗賊の系統は短剣。アクセサリはだれでも使える
//   衣装：heavy は重い衣装まで（軽い衣装・ローブも着られる）、light は軽い衣装まで、robe はローブだけ
const WEAPONS = {
  fighter: ['sword', 'axe'], mercenary: ['sword'], myrmidon: ['sword'], knight: ['lance'], cavalier: ['sword', 'lance'],
  pegasus: ['lance'], wyvern: ['lance'], archer: ['bow'], thief: ['dagger'], mage: ['staff', 'dagger'], shaman: ['staff', 'dagger'],
  priest: ['staff'], troubadour: ['staff'], alchemist: ['staff', 'dagger'], dancer: ['dagger'],
  warrior: ['axe', 'bow'], hero: ['sword', 'axe'], swordmaster: ['sword'], assassin: ['sword', 'dagger'], general: ['lance', 'axe'],
  greatknight: ['sword', 'lance', 'axe'], paladin: ['sword', 'lance', 'axe'], falcoknight: ['sword', 'lance'], wyvernknight: ['lance'],
  wyvernlord: ['sword', 'lance'], sniper: ['bow'], ranger: ['sword', 'bow'], rogue: ['dagger'], sage: ['staff', 'dagger'],
  mageknight: ['sword', 'staff'], druid: ['staff', 'dagger'], summoner: ['staff', 'dagger'], bishop: ['staff'], valkyrie: ['staff'],
  samurai: ['sword'], ninja: ['dagger'], lord: ['sword', 'lance'],
};
const ARMOR_HEAVY = ['fighter', 'mercenary', 'knight', 'cavalier', 'wyvern', 'warrior', 'hero', 'general', 'greatknight', 'paladin',
  'wyvernknight', 'wyvernlord', 'samurai', 'lord'];
const ARMOR_ROBE = ['mage', 'shaman', 'alchemist', 'sage', 'druid', 'summoner'];
for (const c of Object.values(CLASSES)) {
  c.weapons = WEAPONS[c.id] || [];
  c.armor = ARMOR_HEAVY.includes(c.id) ? 'heavy' : ARMOR_ROBE.includes(c.id) ? 'robe' : 'light';
}

export const CLASS_LIST = Object.keys(CLASSES);
export const PROMOTE_LEVEL = 10; // 昇格できるレベル（聖魔の光石と同じく Lv10 から）
