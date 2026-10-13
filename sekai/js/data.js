// くにの データ
//
// すうじは ぜんぶ stats.js（tools/sekai_data.mjs が 世界銀行の API から つくる）から よむ。
//   births しゅっせいすう / tfr ごうけい とくしゅ しゅっしょうりつ / elec でんき % / water きほんてきな のみみず % /
//   toilet トイレ % / uni だいがくなど（そうしゅうがくりつ、100で うちきり）% / agri のうぎょうで はたらく ひと % /
//   kids 0〜14さい % / urban まちに すむ ひと % / net インターネット % / forest もり % / land りくちの ひろさ km2
// ここに かくのは、こどもが よむ せつめい（しゅと・あいさつ・りょうり・スポーツ・まめちしき）と おとなに なる ねんれい。
// せつめいが ある くに（rich）は クイズが ふえる。ない くにも うまれる ことが できる（すうじの クイズに なる）。

import { STATS, WORLD, FETCHED } from './stats.js';
export { WORLD, FETCHED };
export const WORLD_BIRTHS = WORLD.births; // せかいで 1ねんに うまれる あかちゃん

export const AREA = {
  asia: { name: 'アジア', globe: '🌏' },
  africa: { name: 'アフリカ', globe: '🌍' },
  europe: { name: 'ヨーロッパ', globe: '🌍' },
  namerica: { name: 'きたアメリカ', globe: '🌎' },
  samerica: { name: 'みなみアメリカ', globe: '🌎' },
  oceania: { name: 'オセアニア', globe: '🌏' },
};

const CONTENT = {
  in: { capital: 'ニューデリー',
    hello: 'ナマステ', lang: 'ヒンディーご', food: 'カレー', foodEmoji: '🍛', sport: 'クリケット',
    fact: 'せかいで いちばん ひとが おおい くに。ぞうや トラも すんで いるよ。' },
  cn: { capital: 'ペキン',
    hello: 'ニーハオ', lang: 'ちゅうごくご', food: 'ぎょうざ', foodEmoji: '🥟', sport: 'たっきゅう',
    fact: 'パンダの ふるさと。「ばんりの ちょうじょう」という ながーい かべが あるよ。' },
  ng: { capital: 'アブジャ',
    hello: 'ハロー', lang: 'えいご', food: 'ジョロフライス', foodEmoji: '🍚', sport: 'サッカー',
    fact: 'アフリカで いちばん ひとが おおい くに。500いじょうの ことばが はなされて いるよ。' },
  pk: { capital: 'イスラマバード',
    hello: 'アッサラーム・アライクム', lang: 'ウルドゥーご', food: 'ビリヤニ', foodEmoji: '🍗', sport: 'クリケット',
    fact: 'せかいで 2ばんめに たかい やま「K2」が あるよ。' },
  cd: { capital: 'キンシャサ',
    hello: 'ボンジュール', lang: 'フランスご', food: 'フフ', foodEmoji: '🍲', sport: 'サッカー',
    fact: 'おおきな コンゴがわと、ゴリラや ボノボが すむ ふかい もりが あるよ。' },
  id: { capital: 'ジャカルタ',
    hello: 'スラマッ シアン', lang: 'インドネシアご', food: 'ナシゴレン', foodEmoji: '🍳', sport: 'バドミントン',
    fact: '1まん7せんいじょうの しまが ある くに。コモドドラゴンが すんで いるよ。' },
  et: { capital: 'アディスアベバ',
    hello: 'セラム', lang: 'アムハラご', food: 'インジェラ', foodEmoji: '🫓', sport: 'マラソン',
    fact: 'コーヒーの ふるさとと いわれて いるよ。1ねんが 13かげつ ある こよみを つかうよ。' },
  us: { capital: 'ワシントン',
    hello: 'ハロー', lang: 'えいご', food: 'ハンバーガー', foodEmoji: '🍔', sport: 'バスケットボール',
    fact: '50の しゅうが あつまって できた くに。「じゆうの めがみ」の ぞうが あるよ。' },
  bd: { capital: 'ダッカ',
    hello: 'アッサラーム・アライクム', lang: 'ベンガルご', food: 'さかなの カレー', foodEmoji: '🐟', sport: 'クリケット',
    fact: 'かわが たくさん ながれる くに。ベンガルトラが すんで いるよ。' },
  br: { capital: 'ブラジリア',
    hello: 'オラ', lang: 'ポルトガルご', food: 'フェイジョアーダ', foodEmoji: '🫘', sport: 'サッカー',
    fact: 'せかいで いちばん おおきな もり「アマゾン」が ある くに。' },
  tz: { capital: 'ドドマ',
    hello: 'ジャンボ', lang: 'スワヒリご', food: 'ウガリ', foodEmoji: '🌽', sport: 'サッカー',
    fact: 'アフリカで いちばん たかい やま「キリマンジャロ」が あるよ。' },
  eg: { capital: 'カイロ',
    hello: 'アハラン', lang: 'アラビアご', food: 'コシャリ', foodEmoji: '🍝', sport: 'サッカー',
    fact: 'ピラミッドと スフィンクスが ある くに。ナイルがわが ながれて いるよ。' },
  ph: { capital: 'マニラ',
    hello: 'クムスタ', lang: 'フィリピノご', food: 'アドボ', foodEmoji: '🍖', sport: 'バスケットボール',
    fact: '7せんいじょうの しまが ある くに。あたたかい うみが きれいだよ。' },
  mx: { capital: 'メキシコシティ',
    hello: 'オラ', lang: 'スペインご', food: 'タコス', foodEmoji: '🌮', sport: 'サッカー',
    fact: 'とうもろこしの ふるさと。タコスの かわも とうもろこしで つくるよ。' },
  ug: { capital: 'カンパラ',
    hello: 'オリ オチャ', lang: 'ルガンダご', food: 'マトケ（バナナの りょうり）', foodEmoji: '🍌', sport: 'サッカー',
    fact: 'おおきな みずうみ「ビクトリアこ」から ナイルがわが ながれだすよ。' },
  ke: { capital: 'ナイロビ',
    hello: 'ジャンボ', lang: 'スワヒリご', food: 'ニャマチョマ（やきにく）', foodEmoji: '🍖', sport: 'マラソン',
    fact: 'ライオンや キリンが くらす くさはらが あるよ。マラソンの つよい くに。' },
  sd: { capital: 'ハルツーム',
    hello: 'アッサラーム・アライクム', lang: 'アラビアご', food: 'フール（まめの にこみ）', foodEmoji: '🫘', sport: 'サッカー',
    fact: 'じつは エジプトより たくさんの ピラミッドが あるよ。' },
  af: { capital: 'カブール',
    hello: 'サラーム', lang: 'ダリーご', food: 'カブリ・パラウ', foodEmoji: '🍚', sport: 'クリケット',
    fact: 'たかい やまに かこまれた くに。ざくろや ぶどうが おいしいよ。' },
  vn: { capital: 'ハノイ',
    hello: 'シン チャオ', lang: 'ベトナムご', food: 'フォー', foodEmoji: '🍜', sport: 'サッカー',
    fact: 'ほそながい かたちの くに。まちには バイクが とても おおいよ。' },
  ao: { capital: 'ルアンダ',
    hello: 'オラ', lang: 'ポルトガルご', food: 'フンジ', foodEmoji: '🍲', sport: 'バスケットボール',
    fact: 'アフリカで とても おおきな たき「カランドゥーラの たき」が あるよ。' },
  ru: { capital: 'モスクワ',
    hello: 'ズドラーストヴィチェ', lang: 'ロシアご', food: 'ブリヌイ（うすい パンケーキ）', foodEmoji: '🥞', sport: 'アイスホッケー',
    fact: 'せかいで いちばん ひろい くに。ふゆは とても さむいよ。' },
  ne: { capital: 'ニアメ',
    hello: 'ボンジュール', lang: 'フランスご', food: 'トゥオ（きびの おもち）', foodEmoji: '🥣', sport: 'サッカー',
    fact: 'くにの おおくが サハラさばく。ニジェールがわが ながれて いるよ。' },
  mz: { capital: 'マプト',
    hello: 'オラ', lang: 'ポルトガルご', food: 'エビの りょうり', foodEmoji: '🦐', sport: 'サッカー',
    fact: 'インドようの ながい うみべが ある くに。カシューナッツが とれるよ。' },
  ir: { capital: 'テヘラン',
    hello: 'サラーム', lang: 'ペルシャご', food: 'チェロウケバブ', foodEmoji: '🍢', sport: 'サッカー',
    fact: 'ペルシャじゅうたんで ゆうめい。きれいな タイルの たてものが あるよ。' },
  tr: { capital: 'アンカラ',
    hello: 'メルハバ', lang: 'トルコご', food: 'ドネルケバブ', foodEmoji: '🥙', sport: 'サッカー',
    fact: 'アジアと ヨーロッパの りょうほうに またがる くに。' },
  mg: { capital: 'アンタナナリボ',
    hello: 'サラマ', lang: 'マダガスカルご', food: 'ごはんと おかず', foodEmoji: '🍚', sport: 'ラグビー',
    fact: 'キツネザルの なかまは、しぜんの なかでは この しまにしか いないよ。' },
  mm: { capital: 'ネピドー',
    hello: 'ミンガラーバー', lang: 'ビルマご', food: 'モヒンガー', foodEmoji: '🍜', sport: 'チンロン',
    fact: 'きんいろに かがやく とう「パゴダ」が たくさん あるよ。' },
  jp: { capital: 'とうきょう',
    hello: 'こんにちは', lang: 'にほんご', food: 'おにぎり', foodEmoji: '🍙', sport: 'やきゅう',
    fact: 'ふじさんが ある しまの くに。じしんや おんせんが おおいよ。' },
  de: { capital: 'ベルリン',
    hello: 'グーテン ターク', lang: 'ドイツご', food: 'ソーセージ', foodEmoji: '🌭', sport: 'サッカー',
    fact: 'パンの しゅるいが とても おおい くに。クリスマスマーケットが ゆうめい。' },
  fr: { capital: 'パリ',
    hello: 'ボンジュール', lang: 'フランスご', food: 'クロワッサン', foodEmoji: '🥐', sport: 'サッカー',
    fact: 'エッフェルとうが ある くに。パンや チーズが だいすき。' },
  gb: { capital: 'ロンドン',
    hello: 'ハロー', lang: 'えいご', food: 'フィッシュ・アンド・チップス', foodEmoji: '🐟', sport: 'サッカー',
    fact: 'サッカーが うまれた くに。2かいだての あかい バスが はしって いるよ。' },
  sa: { capital: 'リヤド',
    hello: 'アッサラーム・アライクム', lang: 'アラビアご', food: 'カブサ', foodEmoji: '🍛', sport: 'サッカー',
    fact: 'おおきな さばくが ひろがる くに。ラクダが たくさん いるよ。' },
  th: { capital: 'バンコク',
    hello: 'サワッディー', lang: 'タイご', food: 'トムヤムクン', foodEmoji: '🦐', sport: 'ムエタイ',
    fact: 'ぞうが くにの どうぶつ。きんいろの おてらが たくさん あるよ。' },
  co: { capital: 'ボゴタ',
    hello: 'オラ', lang: 'スペインご', food: 'アレパ', foodEmoji: '🫓', sport: 'サッカー',
    fact: 'コーヒーと おはなが たくさん とれる くに。とりの しゅるいが せかいで いちばん おおいよ。' },
  ar: { capital: 'ブエノスアイレス',
    hello: 'オラ', lang: 'スペインご', food: 'アサード（やきにく）', foodEmoji: '🥩', sport: 'サッカー',
    fact: 'タンゴという ダンスの ふるさと。みなみの はしには ペンギンも いるよ。' },
  it: { capital: 'ローマ',
    hello: 'ボンジョルノ', lang: 'イタリアご', food: 'ピザ', foodEmoji: '🍕', sport: 'サッカー',
    fact: 'ながぐつの かたちを した くに。ピザや パスタの ふるさと。' },
  ca: { capital: 'オタワ',
    hello: 'ハロー', lang: 'えいご・フランスご', food: 'メープルシロップの パンケーキ', foodEmoji: '🥞', sport: 'アイスホッケー',
    fact: 'せかいで 2ばんめに ひろい くに。こっきに かえでの はっぱが あるよ。' },
  es: { capital: 'マドリード',
    hello: 'オラ', lang: 'スペインご', food: 'パエリア', foodEmoji: '🥘', sport: 'サッカー',
    fact: 'フラメンコという おどりで ゆうめい。おひるごはんが おそい じかんなんだって。' },
  au: { capital: 'キャンベラ',
    hello: 'ハロー', lang: 'えいご', food: 'ミートパイ', foodEmoji: '🥧', sport: 'クリケット',
    fact: 'カンガルーや コアラが すんで いるよ。にほんが ふゆの とき、なつに なるよ。' },
  kr: { capital: 'ソウル',
    hello: 'アンニョンハセヨ', lang: 'かんこくご', food: 'キムチ', foodEmoji: '🥬', sport: 'やきゅう',
    fact: 'にほんの おとなりの くに。ハングルという もじを つかうよ。' },
};

// おとな（成年）に なる ねんれい … 各国の 民法などの 成年年齢。かいて いない くには 18さい
const ADULT = { id: 21, eg: 21, th: 20, kr: 19 };

// せかいぎんこうの すうじと、かいた せつめいを あわせる
const areaMean = {};
for (const k of ['uni', 'agri', 'toilet', 'net', 'kids', 'urban', 'forest']) {
  areaMean[k] = {};
  for (const a of Object.keys(AREA)) {
    const xs = STATS.filter((c) => c.area === a && c[k] != null);
    const w = xs.reduce((t, c) => t + c.pop, 0);
    areaMean[k][a] = w ? xs.reduce((t, c) => t + c[k] * c.pop, 0) / w : WORLD[k];
  }
}
export const COUNTRIES = STATS.map((st) => {
  const c = { ...st, ...(CONTENT[st.id] || {}), rich: !!CONTENT[st.id], adult: ADULT[st.id] || 18 };
  // ない 値は おなじ たいりくの へいきんで うめる（estimated に しるしを つける）
  c.estimated = [];
  for (const k of Object.keys(areaMean)) if (c[k] == null) { c[k] = Math.round(areaMean[k][c.area]); c.estimated.push(k); }
  return c;
});
export const JAPAN = COUNTRIES.find((c) => c.id === 'jp');

// ゆめ（12さいで えらぶ）
export const DREAMS = [
  { emoji: '🩺', name: 'おいしゃさん', uni: true, study: 'いがく', end: 'びょうきの ひとを たくさん たすけたよ。' },
  { emoji: '👩‍🏫', name: 'せんせい', uni: true, study: 'きょういく', end: 'こどもたちに いろんな ことを おしえたよ。' },
  { emoji: '🧑‍🌾', name: 'のうか', uni: false, study: 'のうぎょう', end: 'おいしい やさいや くだものを そだてたよ。' },
  { emoji: '🧑‍🍳', name: 'コック', uni: false, study: 'りょうり', end: 'まちで いちばん おいしい おみせを ひらいたよ。' },
  { emoji: '🧑‍🚀', name: 'うちゅうひこうし', uni: true, study: 'うちゅうの かがく', end: 'うちゅうから ちきゅうを みたよ。とても きれいだった！' },
  { emoji: '🧑‍🔬', name: 'かがくしゃ', uni: true, study: 'かがく', end: 'あたらしい ことを たくさん はっけんしたよ。' },
  { emoji: '🎨', name: 'えかき', uni: false, study: 'びじゅつ', end: 'せかいじゅうの ひとが みにくる えを かいたよ。' },
  { emoji: '🏗️', name: 'だいく', uni: false, study: 'けんちく', end: 'みんなが すむ いえや はしを つくったよ。' },
];

// ゆめと ちがう しごとに なった とき
export const JOBS_FARM = [
  { emoji: '🧑‍🌾', name: 'のうか', end: 'かぞくの はたけで、まいにち やさいや こくもつを そだてたよ。' },
  { emoji: '🐄', name: 'ぼくじょうの しごと', end: 'うしや やぎの せわを して、ミルクを まちに とどけたよ。' },
  { emoji: '🎣', name: 'りょうし', end: 'ふねで さかなを とって、まちの ひとに とどけたよ。' },
];
export const JOBS_TOWN = [
  { emoji: '🏪', name: 'おみせやさん', end: 'まちの おみせで、たくさんの おきゃくさんと なかよく なったよ。' },
  { emoji: '🏭', name: 'こうじょうの しごと', end: 'こうじょうで、みんなが つかう ものを つくったよ。' },
  { emoji: '🚌', name: 'うんてんしゅ', end: 'バスや トラックで、ひとや にもつを はこんだよ。' },
  { emoji: '🧵', name: 'したてやさん', end: 'ミシンで、きれいな ふくを たくさん ぬったよ。' },
];

export const PLAYS = ['かくれんぼ', 'おにごっこ', 'なわとび', 'たこあげ', 'ボールあそび', 'おえかき'];
