// まもの。え は えもじ
// speed: 1＝ふつう / 2＝はやい（1ターンに 2かい） / 0.5＝おそい（2ターンに 1かい）
// ai: chase（おいかける） / still（うごかない） / ranged（まっすぐ ならぶと とおくから こうげき）
// nap: さいしょ ねている わりあい　poison: こうげきに どく
export const MOBS = {
  // ── こけの どうくつ（1〜3かい）
  imomu:   { name: 'いもむん', emo: '🐛', hp: 7, atk: 3, def: 0, exp: 4, gold: 2, speed: 0.5, ai: 'chase', nap: 0.3, text: 'のんびり {歩|ある}く いもむし。うごきが おそい。' },
  bata:    { name: 'ばたこうもり', emo: '🦇', hp: 7, atk: 4, def: 0, exp: 5, gold: 3, speed: 1, ai: 'chase', nap: 0.3, text: 'どうくつの てんじょうに すむ こうもり。' },
  choro:   { name: 'ちょろねずみ', emo: '🐀', hp: 9, atk: 4, def: 0, exp: 7, gold: 4, speed: 2, ai: 'chase', nap: 0.2, text: 'すばしっこい ねずみ。1ターンに 2かい うごく。' },
  kinoko:  { name: 'どくきのこ', emo: '🍄', hp: 14, atk: 4, def: 0, exp: 8, gold: 5, speed: 1, ai: 'still', nap: 0, poison: 4, text: 'うごかない きのこ。さわると どくに なる。' },
  hasami:  { name: 'はさみ おやぶん', emo: '🦀', hp: 64, atk: 9, def: 1, exp: 45, gold: 60, speed: 1, ai: 'chase', nap: 0, boss: true, big: true, text: 'こけの どうくつの おやぶん。おおきな はさみが じまん。' },
  // ── すいしょうの どうくつ（4〜6かい）
  kumo:    { name: 'あみぐも', emo: '🕷️', hp: 24, atk: 13, def: 1, exp: 16, gold: 8, speed: 1, ai: 'chase', nap: 0.3, text: 'すいしょうの かげに あみを はる くも。' },
  nyoro:   { name: 'にょろへび', emo: '🐍', hp: 20, atk: 13, def: 0, exp: 17, gold: 8, speed: 1, ai: 'chase', nap: 0.2, poison: 5, text: 'かまれると どくに なる へび。' },
  tokage:  { name: 'ひかりとかげ', emo: '🦎', hp: 18, atk: 12, def: 0, exp: 18, gold: 9, speed: 1, ai: 'ranged', range: 4, nap: 0.2, text: 'まっすぐ ならぶと、とおくから ひかりの つぶを とばす。' },
  ishi:    { name: 'いしころん', emo: '🗿', hp: 40, atk: 16, def: 4, exp: 26, gold: 14, speed: 0.5, ai: 'chase', nap: 0.4, text: 'とても かたい いしの まもの。うごきは おそい。' },
  ryu:     { name: 'すいしょう りゅう', emo: '🐲', hp: 200, atk: 18, def: 3, exp: 170, gold: 200, speed: 1, ai: 'ranged', range: 3, cool: 3, nap: 0, boss: true, big: true, text: 'すいしょうを たべて おおきく なった りゅう。ブレスに ちゅうい。' },
  // ── やみの そこ（7〜9かい）
  hyudoro: { name: 'ひゅーどろ', emo: '👻', hp: 40, atk: 23, def: 2, exp: 32, gold: 12, speed: 1, ai: 'chase', nap: 0.2, text: 'やみの なかを ふわふわ ただよう おばけ。' },
  hone:    { name: 'ほねほね', emo: '💀', hp: 54, atk: 26, def: 5, exp: 40, gold: 16, speed: 1, ai: 'chase', nap: 0.3, text: 'カタカタ {歩|ある}く ほね。かたくて つよい。' },
  hinotama:{ name: 'ひのたま', emo: '🔥', hp: 34, atk: 23, def: 1, exp: 36, gold: 14, speed: 1, ai: 'ranged', range: 4, nap: 0.1, text: 'まっすぐ ならぶと ひのこを とばして くる。' },
  sasori:  { name: 'さそりん', emo: '🦂', hp: 46, atk: 25, def: 3, exp: 42, gold: 16, speed: 1, ai: 'chase', nap: 0.2, poison: 6, text: 'しっぽの はりに どくが ある。' },
  ookami:  { name: 'かげおおかみ', emo: '🐺', hp: 40, atk: 22, def: 2, exp: 42, gold: 18, speed: 2, ai: 'chase', nap: 0.2, text: 'かげの ように はやい おおかみ。1ターンに 2かい うごく。' },
  nushi:   { name: 'やみの ぬし', emo: '🌚', hp: 300, atk: 26, def: 4, exp: 0, gold: 500, speed: 1, ai: 'chase', nap: 0, boss: true, big: true, summon: 'hyudoro', text: 'どうくつの ひかりを のみこんだ やみの かたまり。なかまを よびだす。' },
};
for (const [id, m] of Object.entries(MOBS)) m.id = id;

// エリア（3かい ごと）。さいごの かいに ボス
export const AREAS = [
  { id: 0, name: 'こけの どうくつ', floors: [1, 2, 3], boss: 'hasami', bgm: 'map',
    floor: ['#4f6b3c', '#587642'], wall: ['#2c3a26', '#3d5233'], dark: '#141c12' },
  { id: 1, name: 'すいしょうの どうくつ', floors: [4, 5, 6], boss: 'ryu', bgm: 'map',
    floor: ['#3f5a86', '#476494'], wall: ['#27305c', '#5a6fc4'], dark: '#10142a' },
  { id: 2, name: 'やみの そこ', floors: [7, 8, 9], boss: 'nushi', bgm: 'map',
    floor: ['#4a3a66', '#544273'], wall: ['#221a36', '#40305f'], dark: '#0c0916' },
];
export const LAST_FLOOR = 9;
export const areaOf = (floor) => AREAS[Math.min(2, Math.floor((floor - 1) / 3))];
export const isBossFloor = (floor) => floor % 3 === 0;

// かいごとに でる まもの [id, おもみ]
export const SPAWN = {
  1: [['imomu', 5], ['bata', 3]],
  2: [['imomu', 3], ['bata', 4], ['choro', 2], ['kinoko', 2]],
  3: [['bata', 3], ['choro', 3], ['kinoko', 2]],
  4: [['kumo', 4], ['nyoro', 3], ['choro', 1]],
  5: [['kumo', 3], ['nyoro', 3], ['tokage', 3], ['ishi', 1]],
  6: [['kumo', 2], ['tokage', 3], ['ishi', 2]],
  7: [['hyudoro', 4], ['hone', 2], ['hinotama', 2]],
  8: [['hyudoro', 2], ['hone', 3], ['hinotama', 2], ['sasori', 3], ['ookami', 2]],
  9: [['hone', 3], ['sasori', 2], ['ookami', 3]],
};
