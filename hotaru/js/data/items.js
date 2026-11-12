// どうぐ・そうび
export const ITEMS = {
  herb:    { name: 'やくそう', emo: '🌿', price: 15, text: 'HPを 25 かいふく。どくも なおる。', use: 'heal', n: 25 },
  bigherb: { name: 'おおきな やくそう', emo: '🥬', price: 45, text: 'HPを 70 かいふく。どくも なおる。', use: 'heal', n: 70 },
  bomb:    { name: 'ばくだん どんぐり', emo: '🌰', price: 30, text: 'まわり 8マスの まものに {大|おお}ダメージ。', use: 'bomb' },
  sleep:   { name: 'ねむりの こな', emo: '💤', price: 30, text: '{見|み}えている まものを ぜんぶ ねむらせる。', use: 'sleep' },
  wing:    { name: 'ワープの はっぱ', emo: '🍃', price: 20, text: 'この かいの どこかへ ワープする。', use: 'warp' },
  map:     { name: 'ちずの まきもの', emo: '📜', price: 20, text: 'この かいの ちずが ぜんぶ わかる。', use: 'map' },
  flute:   { name: 'かえりの ふえ', emo: '🎵', price: 40, text: 'キャンプへ かえる。もちものは ぜんぶ もちかえれる。', use: 'return' },
  powseed: { name: 'ちからの {実|み}', emo: '🍎', price: 0, text: 'こうげきが ずっと +1。', use: 'seed', stat: 'atk', n: 1 },
  defseed: { name: 'まもりの {実|み}', emo: '🍐', price: 0, text: 'ぼうぎょが ずっと +1。', use: 'seed', stat: 'def', n: 1 },
  lifeseed:{ name: 'いのちの {実|み}', emo: '🍑', price: 0, text: 'さいだい HPが ずっと +5。', use: 'seed', stat: 'hp', n: 5 },
};
for (const [id, it] of Object.entries(ITEMS)) it.id = id;
export const BAG_MAX = 12;
export const SHOP_ITEMS = ['herb', 'bigherb', 'bomb', 'sleep', 'wing', 'map', 'flute'];

// ゆかに おちる どうぐ [id, おもみ]
export const FLOOR_ITEMS = [['herb', 10], ['bigherb', 3], ['bomb', 3], ['sleep', 2], ['wing', 2], ['map', 2], ['flute', 1], ['powseed', 1], ['defseed', 1], ['lifeseed', 1]];

// そうび（だんだん つよく なる。たからばこ か おみせで てに はいる）
export const WEAPONS = [
  { name: '{木|き}の えだ', emo: '🌱', atk: 1, price: 0 },
  { name: 'どうの つるぎ', emo: '🗡️', atk: 3, price: 60 },
  { name: 'てつの つるぎ', emo: '⚔️', atk: 6, price: 180 },
  { name: 'ぎんの つるぎ', emo: '🔱', atk: 9, price: 400 },
  { name: 'ひかりの つるぎ', emo: '✨', atk: 13, price: 0 },
];
export const SHIELDS = [
  { name: 'なべの ふた', emo: '🍳', def: 1, price: 0 },
  { name: '{木|き}の たて', emo: '🎯', def: 2, price: 50 },
  { name: 'てつの たて', emo: '🛡️', def: 4, price: 160 },
  { name: 'ぎんの たて', emo: '🔰', def: 6, price: 360 },
  { name: 'ひかりの たて', emo: '🌟', def: 9, price: 0 },
];
