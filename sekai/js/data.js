// くにの データ（こどもむけに まるめた だいたいの かず）
//
// births : 1ねんに うまれる あかちゃんの かず（せんにん）… 国連「世界人口推計 2024」の 2023年ごろの 値を まるめたもの
// tfr    : ひとりの おかあさんが うむ こどもの へいきん（合計特殊出生率）… 同上
// elec   : でんきが つかえる ひとの わりあい（%）… 世界銀行 2022年
// water  : いえか いえの ちかく（おうふく 30ぷん いない）で きれいな みずが てに はいる ひとの わりあい（%）
//          … WHO/UNICEF JMP 2022年（basic 以上）
// adult  : おとな（成年）に なる ねんれい … 各国の 民法などの 成年年齢（州や きまりで ちがう くには いちばん おおい もの）
// uni    : だいがくなどで まなぶ わかものの わりあい（%）… UNESCO 高等教育総就学率（100を こえる くには 100）
// agri   : はたらく おとなの うち、のうぎょう（はたけ・ぼくじょう・りょう）で はたらく ひとの わりあい（%）… ILO（世界銀行）2022年ごろ
// ほかの もじ（あいさつ・りょうり・まめちしき）は こどもが よむ ための かんたんな せつめい。
//
// このゲームで うまれる くには ここに ある 40か国。せかいの あかちゃんの やく 4ぶんの 3が この 40か国で うまれる。

export const WORLD_BIRTHS = 132000; // せかいで 1ねんに うまれる あかちゃん（せんにん）

export const AREA = {
  asia: { name: 'アジア', globe: '🌏' },
  africa: { name: 'アフリカ', globe: '🌍' },
  europe: { name: 'ヨーロッパ', globe: '🌍' },
  namerica: { name: 'きたアメリカ', globe: '🌎' },
  samerica: { name: 'みなみアメリカ', globe: '🌎' },
  oceania: { name: 'オセアニア', globe: '🌏' },
};

export const COUNTRIES = [
  { id: 'in', flag: '🇮🇳', name: 'インド', area: 'asia', capital: 'ニューデリー', births: 23200, tfr: 2.0, elec: 99, water: 93,
    hello: 'ナマステ', lang: 'ヒンディーご', food: 'カレー', foodEmoji: '🍛', sport: 'クリケット',
    fact: 'せかいで いちばん ひとが おおい くに。ぞうや トラも すんで いるよ。' },
  { id: 'cn', flag: '🇨🇳', name: 'ちゅうごく', area: 'asia', capital: 'ペキン', births: 9000, tfr: 1.0, elec: 100, water: 96,
    hello: 'ニーハオ', lang: 'ちゅうごくご', food: 'ぎょうざ', foodEmoji: '🥟', sport: 'たっきゅう',
    fact: 'パンダの ふるさと。「ばんりの ちょうじょう」という ながーい かべが あるよ。' },
  { id: 'ng', flag: '🇳🇬', name: 'ナイジェリア', area: 'africa', capital: 'アブジャ', births: 7900, tfr: 4.5, elec: 61, water: 79,
    hello: 'ハロー', lang: 'えいご', food: 'ジョロフライス', foodEmoji: '🍚', sport: 'サッカー',
    fact: 'アフリカで いちばん ひとが おおい くに。500いじょうの ことばが はなされて いるよ。' },
  { id: 'pk', flag: '🇵🇰', name: 'パキスタン', area: 'asia', capital: 'イスラマバード', births: 6900, tfr: 3.5, elec: 95, water: 93,
    hello: 'アッサラーム・アライクム', lang: 'ウルドゥーご', food: 'ビリヤニ', foodEmoji: '🍗', sport: 'クリケット',
    fact: 'せかいで 2ばんめに たかい やま「K2」が あるよ。' },
  { id: 'cd', flag: '🇨🇩', name: 'コンゴみんしゅきょうわこく', area: 'africa', capital: 'キンシャサ', births: 4600, tfr: 6.0, elec: 22, water: 46,
    hello: 'ボンジュール', lang: 'フランスご', food: 'フフ', foodEmoji: '🍲', sport: 'サッカー',
    fact: 'おおきな コンゴがわと、ゴリラや ボノボが すむ ふかい もりが あるよ。' },
  { id: 'id', flag: '🇮🇩', name: 'インドネシア', area: 'asia', capital: 'ジャカルタ', births: 4400, tfr: 2.1, elec: 99, water: 93,
    hello: 'スラマッ シアン', lang: 'インドネシアご', food: 'ナシゴレン', foodEmoji: '🍳', sport: 'バドミントン',
    fact: '1まん7せんいじょうの しまが ある くに。コモドドラゴンが すんで いるよ。' },
  { id: 'et', flag: '🇪🇹', name: 'エチオピア', area: 'africa', capital: 'アディスアベバ', births: 4100, tfr: 4.0, elec: 55, water: 60,
    hello: 'セラム', lang: 'アムハラご', food: 'インジェラ', foodEmoji: '🫓', sport: 'マラソン',
    fact: 'コーヒーの ふるさとと いわれて いるよ。1ねんが 13かげつ ある こよみを つかうよ。' },
  { id: 'us', flag: '🇺🇸', name: 'アメリカ', area: 'namerica', capital: 'ワシントン', births: 3600, tfr: 1.6, elec: 100, water: 100,
    hello: 'ハロー', lang: 'えいご', food: 'ハンバーガー', foodEmoji: '🍔', sport: 'バスケットボール',
    fact: '50の しゅうが あつまって できた くに。「じゆうの めがみ」の ぞうが あるよ。' },
  { id: 'bd', flag: '🇧🇩', name: 'バングラデシュ', area: 'asia', capital: 'ダッカ', births: 3000, tfr: 1.9, elec: 99, water: 98,
    hello: 'アッサラーム・アライクム', lang: 'ベンガルご', food: 'さかなの カレー', foodEmoji: '🐟', sport: 'クリケット',
    fact: 'かわが たくさん ながれる くに。ベンガルトラが すんで いるよ。' },
  { id: 'br', flag: '🇧🇷', name: 'ブラジル', area: 'samerica', capital: 'ブラジリア', births: 2500, tfr: 1.6, elec: 100, water: 99,
    hello: 'オラ', lang: 'ポルトガルご', food: 'フェイジョアーダ', foodEmoji: '🫘', sport: 'サッカー',
    fact: 'せかいで いちばん おおきな もり「アマゾン」が ある くに。' },
  { id: 'tz', flag: '🇹🇿', name: 'タンザニア', area: 'africa', capital: 'ドドマ', births: 2300, tfr: 4.6, elec: 46, water: 63,
    hello: 'ジャンボ', lang: 'スワヒリご', food: 'ウガリ', foodEmoji: '🌽', sport: 'サッカー',
    fact: 'アフリカで いちばん たかい やま「キリマンジャロ」が あるよ。' },
  { id: 'eg', flag: '🇪🇬', name: 'エジプト', area: 'africa', capital: 'カイロ', births: 2100, tfr: 2.8, elec: 100, water: 99,
    hello: 'アハラン', lang: 'アラビアご', food: 'コシャリ', foodEmoji: '🍝', sport: 'サッカー',
    fact: 'ピラミッドと スフィンクスが ある くに。ナイルがわが ながれて いるよ。' },
  { id: 'ph', flag: '🇵🇭', name: 'フィリピン', area: 'asia', capital: 'マニラ', births: 1900, tfr: 1.9, elec: 97, water: 96,
    hello: 'クムスタ', lang: 'フィリピノご', food: 'アドボ', foodEmoji: '🍖', sport: 'バスケットボール',
    fact: '7せんいじょうの しまが ある くに。あたたかい うみが きれいだよ。' },
  { id: 'mx', flag: '🇲🇽', name: 'メキシコ', area: 'namerica', capital: 'メキシコシティ', births: 1800, tfr: 1.8, elec: 100, water: 100,
    hello: 'オラ', lang: 'スペインご', food: 'タコス', foodEmoji: '🌮', sport: 'サッカー',
    fact: 'とうもろこしの ふるさと。タコスの かわも とうもろこしで つくるよ。' },
  { id: 'ug', flag: '🇺🇬', name: 'ウガンダ', area: 'africa', capital: 'カンパラ', births: 1600, tfr: 4.4, elec: 47, water: 57,
    hello: 'オリ オチャ', lang: 'ルガンダご', food: 'マトケ（バナナの りょうり）', foodEmoji: '🍌', sport: 'サッカー',
    fact: 'おおきな みずうみ「ビクトリアこ」から ナイルがわが ながれだすよ。' },
  { id: 'ke', flag: '🇰🇪', name: 'ケニア', area: 'africa', capital: 'ナイロビ', births: 1500, tfr: 3.2, elec: 76, water: 67,
    hello: 'ジャンボ', lang: 'スワヒリご', food: 'ニャマチョマ（やきにく）', foodEmoji: '🍖', sport: 'マラソン',
    fact: 'ライオンや キリンが くらす くさはらが あるよ。マラソンの つよい くに。' },
  { id: 'sd', flag: '🇸🇩', name: 'スーダン', area: 'africa', capital: 'ハルツーム', births: 1500, tfr: 4.3, elec: 62, water: 61,
    hello: 'アッサラーム・アライクム', lang: 'アラビアご', food: 'フール（まめの にこみ）', foodEmoji: '🫘', sport: 'サッカー',
    fact: 'じつは エジプトより たくさんの ピラミッドが あるよ。' },
  { id: 'af', flag: '🇦🇫', name: 'アフガニスタン', area: 'asia', capital: 'カブール', births: 1400, tfr: 4.8, elec: 85, water: 82,
    hello: 'サラーム', lang: 'ダリーご', food: 'カブリ・パラウ', foodEmoji: '🍚', sport: 'クリケット',
    fact: 'たかい やまに かこまれた くに。ざくろや ぶどうが おいしいよ。' },
  { id: 'vn', flag: '🇻🇳', name: 'ベトナム', area: 'asia', capital: 'ハノイ', births: 1400, tfr: 1.9, elec: 100, water: 98,
    hello: 'シン チャオ', lang: 'ベトナムご', food: 'フォー', foodEmoji: '🍜', sport: 'サッカー',
    fact: 'ほそながい かたちの くに。まちには バイクが とても おおいよ。' },
  { id: 'ao', flag: '🇦🇴', name: 'アンゴラ', area: 'africa', capital: 'ルアンダ', births: 1400, tfr: 5.0, elec: 48, water: 58,
    hello: 'オラ', lang: 'ポルトガルご', food: 'フンジ', foodEmoji: '🍲', sport: 'バスケットボール',
    fact: 'アフリカで とても おおきな たき「カランドゥーラの たき」が あるよ。' },
  { id: 'ru', flag: '🇷🇺', name: 'ロシア', area: 'europe', capital: 'モスクワ', births: 1260, tfr: 1.4, elec: 100, water: 97,
    hello: 'ズドラーストヴィチェ', lang: 'ロシアご', food: 'ブリヌイ（うすい パンケーキ）', foodEmoji: '🥞', sport: 'アイスホッケー',
    fact: 'せかいで いちばん ひろい くに。ふゆは とても さむいよ。' },
  { id: 'ne', flag: '🇳🇪', name: 'ニジェール', area: 'africa', capital: 'ニアメ', births: 1200, tfr: 6.1, elec: 20, water: 51,
    hello: 'ボンジュール', lang: 'フランスご', food: 'トゥオ（きびの おもち）', foodEmoji: '🥣', sport: 'サッカー',
    fact: 'くにの おおくが サハラさばく。ニジェールがわが ながれて いるよ。' },
  { id: 'mz', flag: '🇲🇿', name: 'モザンビーク', area: 'africa', capital: 'マプト', births: 1200, tfr: 4.6, elec: 33, water: 65,
    hello: 'オラ', lang: 'ポルトガルご', food: 'エビの りょうり', foodEmoji: '🦐', sport: 'サッカー',
    fact: 'インドようの ながい うみべが ある くに。カシューナッツが とれるよ。' },
  { id: 'ir', flag: '🇮🇷', name: 'イラン', area: 'asia', capital: 'テヘラン', births: 1050, tfr: 1.7, elec: 100, water: 97,
    hello: 'サラーム', lang: 'ペルシャご', food: 'チェロウケバブ', foodEmoji: '🍢', sport: 'サッカー',
    fact: 'ペルシャじゅうたんで ゆうめい。きれいな タイルの たてものが あるよ。' },
  { id: 'tr', flag: '🇹🇷', name: 'トルコ', area: 'asia', capital: 'アンカラ', births: 960, tfr: 1.6, elec: 100, water: 97,
    hello: 'メルハバ', lang: 'トルコご', food: 'ドネルケバブ', foodEmoji: '🥙', sport: 'サッカー',
    fact: 'アジアと ヨーロッパの りょうほうに またがる くに。' },
  { id: 'mg', flag: '🇲🇬', name: 'マダガスカル', area: 'africa', capital: 'アンタナナリボ', births: 950, tfr: 3.8, elec: 36, water: 54,
    hello: 'サラマ', lang: 'マダガスカルご', food: 'ごはんと おかず', foodEmoji: '🍚', sport: 'ラグビー',
    fact: 'キツネザルの なかまは、しぜんの なかでは この しまにしか いないよ。' },
  { id: 'mm', flag: '🇲🇲', name: 'ミャンマー', area: 'asia', capital: 'ネピドー', births: 850, tfr: 2.1, elec: 73, water: 85,
    hello: 'ミンガラーバー', lang: 'ビルマご', food: 'モヒンガー', foodEmoji: '🍜', sport: 'チンロン',
    fact: 'きんいろに かがやく とう「パゴダ」が たくさん あるよ。' },
  { id: 'jp', flag: '🇯🇵', name: 'にほん', area: 'asia', capital: 'とうきょう', births: 730, tfr: 1.2, elec: 100, water: 99,
    hello: 'こんにちは', lang: 'にほんご', food: 'おにぎり', foodEmoji: '🍙', sport: 'やきゅう',
    fact: 'ふじさんが ある しまの くに。じしんや おんせんが おおいよ。' },
  { id: 'de', flag: '🇩🇪', name: 'ドイツ', area: 'europe', capital: 'ベルリン', births: 690, tfr: 1.4, elec: 100, water: 100,
    hello: 'グーテン ターク', lang: 'ドイツご', food: 'ソーセージ', foodEmoji: '🌭', sport: 'サッカー',
    fact: 'パンの しゅるいが とても おおい くに。クリスマスマーケットが ゆうめい。' },
  { id: 'fr', flag: '🇫🇷', name: 'フランス', area: 'europe', capital: 'パリ', births: 680, tfr: 1.7, elec: 100, water: 100,
    hello: 'ボンジュール', lang: 'フランスご', food: 'クロワッサン', foodEmoji: '🥐', sport: 'サッカー',
    fact: 'エッフェルとうが ある くに。パンや チーズが だいすき。' },
  { id: 'gb', flag: '🇬🇧', name: 'イギリス', area: 'europe', capital: 'ロンドン', births: 680, tfr: 1.5, elec: 100, water: 100,
    hello: 'ハロー', lang: 'えいご', food: 'フィッシュ・アンド・チップス', foodEmoji: '🐟', sport: 'サッカー',
    fact: 'サッカーが うまれた くに。2かいだての あかい バスが はしって いるよ。' },
  { id: 'sa', flag: '🇸🇦', name: 'サウジアラビア', area: 'asia', capital: 'リヤド', births: 560, tfr: 2.3, elec: 100, water: 100,
    hello: 'アッサラーム・アライクム', lang: 'アラビアご', food: 'カブサ', foodEmoji: '🍛', sport: 'サッカー',
    fact: 'おおきな さばくが ひろがる くに。ラクダが たくさん いるよ。' },
  { id: 'th', flag: '🇹🇭', name: 'タイ', area: 'asia', capital: 'バンコク', births: 520, tfr: 1.2, elec: 100, water: 100,
    hello: 'サワッディー', lang: 'タイご', food: 'トムヤムクン', foodEmoji: '🦐', sport: 'ムエタイ',
    fact: 'ぞうが くにの どうぶつ。きんいろの おてらが たくさん あるよ。' },
  { id: 'co', flag: '🇨🇴', name: 'コロンビア', area: 'samerica', capital: 'ボゴタ', births: 520, tfr: 1.6, elec: 100, water: 98,
    hello: 'オラ', lang: 'スペインご', food: 'アレパ', foodEmoji: '🫓', sport: 'サッカー',
    fact: 'コーヒーと おはなが たくさん とれる くに。とりの しゅるいが せかいで いちばん おおいよ。' },
  { id: 'ar', flag: '🇦🇷', name: 'アルゼンチン', area: 'samerica', capital: 'ブエノスアイレス', births: 460, tfr: 1.4, elec: 100, water: 100,
    hello: 'オラ', lang: 'スペインご', food: 'アサード（やきにく）', foodEmoji: '🥩', sport: 'サッカー',
    fact: 'タンゴという ダンスの ふるさと。みなみの はしには ペンギンも いるよ。' },
  { id: 'it', flag: '🇮🇹', name: 'イタリア', area: 'europe', capital: 'ローマ', births: 380, tfr: 1.2, elec: 100, water: 100,
    hello: 'ボンジョルノ', lang: 'イタリアご', food: 'ピザ', foodEmoji: '🍕', sport: 'サッカー',
    fact: 'ながぐつの かたちを した くに。ピザや パスタの ふるさと。' },
  { id: 'ca', flag: '🇨🇦', name: 'カナダ', area: 'namerica', capital: 'オタワ', births: 350, tfr: 1.3, elec: 100, water: 99,
    hello: 'ハロー', lang: 'えいご・フランスご', food: 'メープルシロップの パンケーキ', foodEmoji: '🥞', sport: 'アイスホッケー',
    fact: 'せかいで 2ばんめに ひろい くに。こっきに かえでの はっぱが あるよ。' },
  { id: 'es', flag: '🇪🇸', name: 'スペイン', area: 'europe', capital: 'マドリード', births: 320, tfr: 1.2, elec: 100, water: 100,
    hello: 'オラ', lang: 'スペインご', food: 'パエリア', foodEmoji: '🥘', sport: 'サッカー',
    fact: 'フラメンコという おどりで ゆうめい。おひるごはんが おそい じかんなんだって。' },
  { id: 'au', flag: '🇦🇺', name: 'オーストラリア', area: 'oceania', capital: 'キャンベラ', births: 290, tfr: 1.6, elec: 100, water: 100,
    hello: 'ハロー', lang: 'えいご', food: 'ミートパイ', foodEmoji: '🥧', sport: 'クリケット',
    fact: 'カンガルーや コアラが すんで いるよ。にほんが ふゆの とき、なつに なるよ。' },
  { id: 'kr', flag: '🇰🇷', name: 'かんこく', area: 'asia', capital: 'ソウル', births: 230, tfr: 0.7, elec: 100, water: 100,
    hello: 'アンニョンハセヨ', lang: 'かんこくご', food: 'キムチ', foodEmoji: '🥬', sport: 'やきゅう',
    fact: 'にほんの おとなりの くに。ハングルという もじを つかうよ。' },
];

// [adult, uni, agri]
const GROWN = {
  in: [18, 31, 44], cn: [18, 72, 23], ng: [18, 12, 35], pk: [18, 12, 37], cd: [18, 7, 55], id: [21, 43, 29],
  et: [18, 10, 63], us: [18, 88, 2], bd: [18, 23, 37], br: [18, 57, 9], tz: [18, 8, 65], eg: [21, 37, 19],
  ph: [18, 35, 24], mx: [18, 46, 12], ug: [18, 5, 63], ke: [18, 11, 33], sd: [18, 17, 40], af: [18, 10, 43],
  vn: [18, 42, 27], ao: [18, 10, 54], ru: [18, 85, 6], ne: [18, 4, 70], mz: [18, 7, 70], ir: [18, 58, 15],
  tr: [18, 100, 16], mg: [18, 6, 74], mm: [18, 19, 46], jp: [18, 65, 3], de: [18, 75, 1], fr: [18, 70, 2],
  gb: [18, 70, 1], sa: [18, 71, 3], th: [20, 49, 30], co: [18, 60, 15], ar: [18, 100, 7], it: [18, 70, 4],
  ca: [18, 75, 1], es: [18, 100, 4], au: [18, 100, 2], kr: [19, 100, 5],
};
for (const c of COUNTRIES) [c.adult, c.uni, c.agri] = GROWN[c.id];

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
