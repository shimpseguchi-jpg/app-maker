// 昇格アイテム（聖魔の光石と同じく、系統ごとのアイテム＋どの下位職にも使えるマスタープルフ）
// 入手：ボスのドロップと店売り（docs/DESIGN.md「7.5 昇格アイテム」）
// for: 使える下位職（'*' はすべて）
// shop: 店での扱い。always＝いつでも買える ／ perClear＝ボスを倒すたびに在庫が1つ入荷
// 名前は聖魔の光石準拠（verify: 要確認）

export const ITEMS = {};
function def(i) { ITEMS[i.id] = { kind: 'promote', ...i }; }

def({ id: 'heroCrest',   name: 'ヒーローの証',   for: ['fighter', 'mercenary', 'myrmidon'], price: 3000, shop: 'always', verify: true });
def({ id: 'knightCrest', name: 'ナイトプルフ',   for: ['knight', 'cavalier'], price: 3000, shop: 'always', verify: true });
def({ id: 'orionBolt',   name: 'オリオンの矢',   for: ['archer'], price: 3000, shop: 'always', verify: true });
def({ id: 'elysianWhip', name: '天空のムチ',     for: ['pegasus', 'wyvern'], price: 3000, shop: 'always', verify: true });
def({ id: 'guidingRing', name: '導きの指輪',     for: ['mage', 'shaman', 'priest', 'troubadour', 'alchemist'], price: 3000, shop: 'always', verify: true });
def({ id: 'oceanSeal',   name: 'オーシャンシール', for: ['thief'], price: 3000, shop: 'always', verify: true });
def({ id: 'masterSeal',  name: 'マスタープルフ', for: ['*'], price: 8000, shop: 'perClear', verify: true });

export const PROMOTE_ITEMS = Object.values(ITEMS).filter((i) => i.kind === 'promote');
export const itemFits = (itemId, clsId) => { const it = ITEMS[itemId]; return !!it && (it.for.includes('*') || it.for.includes(clsId)); };
// その下位職に使える系統別アイテム（マスタープルフ以外）
export const crestFor = (clsId) => PROMOTE_ITEMS.find((i) => !i.for.includes('*') && i.for.includes(clsId))?.id || null;
