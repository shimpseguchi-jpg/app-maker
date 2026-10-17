// アイドル（プレイアブルキャラクター）
// 最初は 765PRO ALLSTARS の13人。年齢・学年区分は『アイドルマスター2』／TVアニメ準拠（verify: true は要確認）
// base: 基本能力（エルミナージュの 力/知恵/信仰/生命力/素早さ/運 に対応。docs/DESIGN.md 参照）
//   pow パワー / vo ボーカル / men メンタル / sta スタミナ / dan ダンス / vis ビジュアル
// cls: 初期クラス（js/data/classes.js の下位職。転職で変えられる）

export const IDOLS = {};
function def(i) { IDOLS[i.id] = i; }

def({ id: 'haruka', name: '天海春香', kana: 'あまみ はるか', age: 17, color: '#e22b30',
  tags: ['red', 'hs', 'genki', 'hardworker', 'cook'],
  base: { pow: 11, vo: 12, men: 13, sta: 12, dan: 11, vis: 12 }, cls: 'cavalier' });
def({ id: 'chihaya', name: '如月千早', kana: 'きさらぎ ちはや', age: 16, color: '#2743d2',
  tags: ['blue', 'hs', 'cool', 'singer', 'hardworker'],
  base: { pow: 8, vo: 18, men: 13, sta: 10, dan: 10, vis: 10 }, cls: 'mage' });
def({ id: 'yukiho', name: '萩原雪歩', kana: 'はぎわら ゆきほ', age: 17, color: '#d3dde9',
  tags: ['white', 'hs', 'shy', 'japanese'],
  base: { pow: 9, vo: 12, men: 15, sta: 9, dan: 10, vis: 13 }, cls: 'priest' });
def({ id: 'yayoi', name: '高槻やよい', kana: 'たかつき やよい', age: 14, color: '#f39939',
  tags: ['yellow', 'jhs', 'genki', 'homey', 'cook'],
  base: { pow: 11, vo: 10, men: 12, sta: 14, dan: 13, vis: 10 }, cls: 'archer' });
def({ id: 'ritsuko', name: '秋月律子', kana: 'あきづき りつこ', age: 19, color: '#01a860', verify: true,
  tags: ['green', 'adult', 'intelli', 'glasses', 'reliable'],
  base: { pow: 9, vo: 16, men: 14, sta: 10, dan: 9, vis: 12 }, cls: 'alchemist' });
def({ id: 'azusa', name: '三浦あずさ', kana: 'みうら あずさ', age: 21, color: '#9238be',
  tags: ['purple', 'adult', 'oneesan', 'lost', 'airhead', 'ryugu'],
  base: { pow: 9, vo: 14, men: 15, sta: 12, dan: 8, vis: 15 }, cls: 'troubadour' });
def({ id: 'iori', name: '水瀬伊織', kana: 'みなせ いおり', age: 15, color: '#fd99e1', verify: true,
  tags: ['pink', 'jhs', 'ojou', 'tsundere', 'ryugu'],
  base: { pow: 9, vo: 15, men: 11, sta: 9, dan: 11, vis: 15 }, cls: 'pegasus' });
def({ id: 'makoto', name: '菊地真', kana: 'きくち まこと', age: 17, color: '#515558',
  tags: ['black', 'hs', 'sporty', 'boyish', 'genki'],
  base: { pow: 17, vo: 9, men: 10, sta: 14, dan: 15, vis: 9 }, cls: 'fighter' });
def({ id: 'ami', name: '双海亜美', kana: 'ふたみ あみ', age: 13, color: '#ffe43f',
  tags: ['yellow', 'jhs', 'twin', 'prankster', 'genki', 'ryugu'],
  base: { pow: 10, vo: 10, men: 9, sta: 11, dan: 15, vis: 13 }, cls: 'thief' });
def({ id: 'mami', name: '双海真美', kana: 'ふたみ まみ', age: 13, color: '#ffe43f',
  tags: ['yellow', 'jhs', 'twin', 'prankster', 'genki'],
  base: { pow: 10, vo: 11, men: 9, sta: 11, dan: 14, vis: 13 }, cls: 'thief' });
def({ id: 'miki', name: '星井美希', kana: 'ほしい みき', age: 15, color: '#b4e04b', verify: true,
  tags: ['green', 'jhs', 'genius', 'mypace', 'airhead'],
  base: { pow: 12, vo: 13, men: 9, sta: 10, dan: 15, vis: 16 }, cls: 'myrmidon' });
def({ id: 'hibiki', name: '我那覇響', kana: 'がなは ひびき', age: 16, color: '#01adb9',
  tags: ['blue', 'hs', 'sporty', 'animal', 'southern', 'genki'],
  base: { pow: 14, vo: 10, men: 11, sta: 13, dan: 16, vis: 10 }, cls: 'wyvern' });
def({ id: 'takane', name: '四条貴音', kana: 'しじょう たかね', age: 18, color: '#a6126a', verify: true,
  tags: ['red', 'hs', 'mysterious', 'gourmet', 'japanese'],
  base: { pow: 11, vo: 14, men: 16, sta: 11, dan: 9, vis: 14 }, cls: 'shaman' });

export const IDOL_LIST = Object.keys(IDOLS);
