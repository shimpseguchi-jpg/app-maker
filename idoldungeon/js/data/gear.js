// 装備品（docs/DESIGN.md「18. 装備」）。部位は 小道具（武器）・衣装（防具）・アクセサリ の3つと、楽譜（songs.js）の4つ
// 作中劇なので、武器は舞台の「小道具」、防具は「衣装」として扱う。名前・数値は仮
//
// slot: weapon 小道具 / armor 衣装 / acc アクセサリ
// type: 小道具は sword 剣・lance 槍・axe 斧・bow 弓・dagger 短剣・staff 杖。衣装は heavy 重い衣装・light 軽い衣装・robe ローブ
//   どのクラスがどれを使えるかは js/data/classes.js の weapons・armor
// rank: 1〜5（出てくる深さと値段の目安）
// stats: 能力値への足し算（party.js の派生ステータス）。強化値（+1〜+3）は main の能力に PLUS_STEP ずつ足される
// set: 衣装セットの id（SETS）。shop: false は店に並ばない（迷宮で見つける物）
// curse: 呪いの装備。装備すると外せない（寺院で解呪すると、装備ごとなくなる）

export const GEAR = {};
function def(g) { GEAR[g.id] = { shop: true, ...g, main: g.main || Object.keys(g.stats)[0] }; }

export const SLOT_NAME = { weapon: '小道具', armor: '衣装', acc: 'アクセサリ' };
export const GEAR_SLOTS = ['weapon', 'armor', 'acc'];
export const TYPE_NAME = {
  sword: '剣', lance: '槍', axe: '斧', bow: '弓', dagger: '短剣', staff: '杖',
  heavy: '重い衣装', light: '軽い衣装', robe: 'ローブ', acc: 'アクセサリ',
};
// 強化値 1 あたりに main の能力へ足す値
export const PLUS_STEP = { weapon: 1, armor: 1, acc: 1 };
// 値段（ランクごと）。売値は半額、未鑑定はさらに半分
export const GEAR_PRICE = [0, 120, 450, 1200, 3000, 7000];

const W = (id, type, rank, name, stats, more = {}) => def({ id, slot: 'weapon', type, rank, name, stats, ...more });
const A = (id, type, rank, name, stats, more = {}) => def({ id, slot: 'armor', type, rank, name, stats, ...more });
const C = (id, rank, name, stats, more = {}) => def({ id, slot: 'acc', type: 'acc', rank, name, stats, ...more });

// ── 小道具（武器） ──
W('woodSword', 'sword', 1, '稽古用の木刀', { atk: 2 });
W('propSword', 'sword', 2, '舞台用の模造刀', { atk: 5 });
W('fightSword', 'sword', 3, '殺陣用の名刀', { atk: 8, crit: 3 });
W('heroSword', 'sword', 4, '主役の聖剣', { atk: 11, hit: 5 });
W('finaleSword', 'sword', 5, '千秋楽の宝剣', { atk: 15, crit: 5 });
W('pole', 'lance', 1, '稽古用の棒', { atk: 2, hit: 3 });
W('paperLance', 'lance', 2, '張りぼての槍', { atk: 5, hit: 3 });
W('knightLance', 'lance', 3, '騎士役の長槍', { atk: 8, hit: 5 }, { set: 'knight', shop: false });
W('silverLance', 'lance', 4, '竜騎士の銀の槍', { atk: 11, hit: 5 });
W('setAxe', 'axe', 1, '大道具の斧', { atk: 3, hit: -5 });
W('woodAxe', 'axe', 2, '木こり役の斧', { atk: 6, hit: -5 });
W('banditAxe', 'axe', 3, '山賊役の大斧', { atk: 10, hit: -5 });
W('oniAxe', 'axe', 4, '鬼の大まさかり', { atk: 14, hit: -5 });
W('practiceBow', 'bow', 1, '稽古用の弓', { atk: 2 });
W('hunterBow', 'bow', 2, '狩人役の弓', { atk: 5, hit: 5 }, { set: 'hunter', shop: false });
W('moonBow', 'bow', 3, '月の長弓', { atk: 7, hit: 5 });
W('skyBow', 'bow', 4, '天の弓', { atk: 10, hit: 10 });
W('paperKnife', 'dagger', 1, 'ペーパーナイフ', { atk: 1, crit: 3 });
W('thiefKnife', 'dagger', 2, '怪盗役の短剣', { atk: 3, crit: 5, spd: 2 }, { set: 'thief', shop: false });
W('shadowKnife', 'dagger', 3, '影の短刀', { atk: 5, crit: 8 });
W('baton', 'staff', 1, '指揮棒', { mat: 3, atk: 1 });
W('wizardStaff', 'staff', 2, '魔法使い役の杖', { mat: 5, atk: 1 });
W('starTact', 'staff', 3, '星のタクト', { mat: 8, res: 2 }, { set: 'star', shop: false });
W('sageStaff', 'staff', 4, '賢者の杖', { mat: 11, res: 3 });
// 呪い：強いが欠点がある。装備すると外せない
W('bloodSword', 'sword', 3, '血塗られた模造刀', { atk: 13, eva: -8 }, { curse: true, shop: false });

// ── 衣装（防具） ──
A('cardboard', 'heavy', 1, 'ダンボールの鎧', { def: 2, spd: -2 });
A('armorCostume', 'heavy', 2, '甲冑の衣装', { def: 4, spd: -2 });
A('knightCostume', 'heavy', 3, '騎士団の衣装', { def: 6, spd: -3 }, { set: 'knight', shop: false });
A('kingArmor', 'heavy', 4, '王の甲冑', { def: 8, spd: -3 });
A('jersey', 'light', 1, 'ジャージ', { def: 1, eva: 1 });
A('lessonWear', 'light', 2, 'レッスン着', { def: 3, eva: 2 });
A('hunterCostume', 'light', 2, '狩人の衣装', { def: 3, hit: 3 }, { set: 'hunter', shop: false });
A('thiefCostume', 'light', 2, '怪盗の衣装', { def: 3, eva: 4 }, { set: 'thief', shop: false });
A('adventurer', 'light', 3, '冒険者の衣装', { def: 4, eva: 4 });
A('stageDress', 'light', 4, 'ステージ衣装', { def: 6, eva: 6 });
A('uniform', 'robe', 1, '制服', { def: 1, res: 1 });
A('wizardRobe', 'robe', 2, '魔法使いのローブ', { def: 1, res: 3 });
A('starDress', 'robe', 3, '星空のドレス', { def: 2, res: 5 }, { set: 'star', shop: false });
A('saintRobe', 'robe', 4, '聖女のローブ', { def: 3, res: 7 });
A('heavyArmor', 'heavy', 2, '重すぎる甲冑', { def: 8, spd: -12, eva: -6 }, { curse: true, shop: false });
A('sorrowDress', 'robe', 3, '嘆きのドレス', { mat: 6, res: 8, spd: -8 }, { curse: true, shop: false, main: 'res' });

// ── アクセサリ（だれでも使える） ──
C('charm', 1, 'お守り', { res: 2 });
C('ribbon', 1, 'リボン', { eva: 3 });
C('watch', 1, '腕時計', { spd: 3 });
C('wristband', 2, '力のリストバンド', { atk: 3 });
C('brooch', 2, '星のブローチ', { mat: 3 });
C('hairpin', 2, '銀の髪飾り', { hit: 5, crit: 2 });
C('thiefMask', 2, '怪盗の仮面', { eva: 3 }, { set: 'thief', shop: false });
C('feather', 2, '羽根飾り', { hit: 5 }, { set: 'hunter', shop: false });
C('knightCrestAcc', 3, '騎士団の紋章', { def: 2 }, { set: 'knight', shop: false });
C('starPin', 3, '星の髪飾り', { mat: 3 }, { set: 'star', shop: false });
C('angelWing', 3, '天使の羽根', { eva: 6, res: 3 });
C('clover', 3, '幸運のクローバー', { crit: 6 });
C('crown', 4, '王冠', { atk: 3, mat: 3, def: 2, res: 2 });
C('cursedMask', 2, '呪いの仮面', { atk: 6, mat: 6, spd: -6 }, { curse: true, shop: false });

// ── 衣装セット：同じシリーズを2つ・3つそろえると効果が出る（アイマスらしい独自要素） ──
// bonus の形は synergies.js と同じ（stat / ability。to は self）
const st = (stat, v) => ({ type: 'stat', stat, add: v, to: 'self' });
const pct = (stat, v) => ({ type: 'stat', stat, pct: v, to: 'self' });
const ab = (id, name, text) => ({ type: 'ability', id, name, text, to: 'self' });
export const SETS = {
  knight: { name: '騎士団', bonus: { 2: [st('def', 3)], 3: [st('def', 3), pct('hp', 10)] } },
  thief: { name: '怪盗', bonus: { 2: [st('eva', 5)], 3: [st('eva', 5), st('crit', 8), ab('doubleHit', '早業', 'ときどき2回攻撃する')] } },
  star: { name: '星空', bonus: { 2: [st('mat', 4)], 3: [st('mat', 4), pct('mat', 10), st('res', 5)] } },
  hunter: { name: '狩人', bonus: { 2: [st('hit', 8)], 3: [st('hit', 8), st('atk', 4), ab('ambush', '索敵', '不意打ちを受けにくい')] } },
};
for (const [id, s] of Object.entries(SETS)) s.pieces = Object.values(GEAR).filter((g) => g.set === id).map((g) => g.id);

// 最初に持っている装備（鑑定済み）。はじめのパーティ全員が小道具と衣装を1つずつ着られるだけある
export const STARTER_GEAR = ['woodSword', 'woodSword', 'pole', 'baton', 'baton', 'paperKnife', 'cardboard', 'cardboard', 'cardboard', 'jersey', 'jersey', 'uniform'];
