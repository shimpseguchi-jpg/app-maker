// くにの データ
//
// すうじは ぜんぶ stats.js（tools/sekai_data.mjs が 世界銀行の API から つくる）から よむ。
//   births しゅっせいすう / tfr ごうけい とくしゅ しゅっしょうりつ / elec でんき % / water きほんてきな のみみず % /
//   toilet トイレ % / uni だいがくなど（そうしゅうがくりつ、100で うちきり）% / agri のうぎょうで はたらく ひと % /
//   kids 0〜14さい % / urban まちに すむ ひと % / net インターネット % / forest もり % / land りくちの ひろさ km2
// ここに かくのは、こどもが よむ せつめい（しゅと・あいさつ・りょうり・スポーツ・まめちしき）と おとなに なる ねんれい。
// せつめいが ある くに（rich）は 3さいの「いえの くらし」に りょうりや あいさつが でる。ない くには すうじから まめちしきを つくる。

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
// ない 値の うめかた：くらしの すうじは おなじ たいりく、がっこう・まずしさは おなじ しょとくの グループ（世界銀行の くわけ）の へいきん
const meanBy = (keys, groupOf) => {
  const m = {};
  for (const k of keys) {
    m[k] = {};
    for (const c of STATS) {
      if (c[k] == null) continue;
      const g = groupOf(c);
      m[k][g] ||= [0, 0];
      m[k][g][0] += c[k] * c.pop; m[k][g][1] += c.pop;
    }
  }
  return (k, c) => { const x = m[k][groupOf(c)]; return x ? x[0] / x[1] : WORLD[k] ?? 0; };
};
const byArea = meanBy(['wage', 'uni', 'agri', 'toilet', 'net', 'kids', 'urban', 'forest', 'lem', 'lef', 'imr', 'u5', 'm0509', 'm1014', 'm1519', 'm2024', 'amm', 'amf'], (c) => c.area);
const byIncome = meanBy(['prim', 'lsec', 'pov3', 'pov8', 'cm18', 'clab'], (c) => c.income);
export const COUNTRIES = STATS.map((st) => {
  const c = { ...st, ...(CONTENT[st.id] || {}), rich: !!CONTENT[st.id], adult: ADULT[st.id] || 18 };
  // ない 値を うめる（estimated に しるしを つける）。ゆたかな くにの こどもの けっこん・こどもの しごとは 0 と みなす
  c.estimated = [];
  for (const k of ['wage', 'uni', 'agri', 'toilet', 'net', 'kids', 'urban', 'forest', 'lem', 'lef', 'imr', 'u5', 'm0509', 'm1014', 'm1519', 'm2024', 'amm', 'amf']) {
    if (c[k] == null) { c[k] = Math.round(byArea(k, c) * 10) / 10; c.estimated.push(k); }
  }
  for (const k of ['prim', 'lsec', 'pov3', 'pov8', 'cm18', 'clab']) {
    if (c[k] == null) { c[k] = (k === 'cm18' || k === 'clab') && c.income === 'HIC' ? 0 : Math.round(byIncome(k, c) * 10) / 10; c.estimated.push(k); }
  }
  return c;
});

// ───── いのちの ひょう（生命表） ─────
// 世界銀行の「なんさいまでに 1000にんの うち なんにん なくなるか」と へいきんじゅみょうから、
// ねんれいごとの 1ねんで なくなる かくりつ q[0..110] を つくる。
// 0さい：乳児死亡率 / 1〜4さい：5さい未満死亡率の のこり / 5〜24さい：5さいきざみの 死亡確率 /
// 25〜59さい：成人死亡率（15〜60さい）の のこりを ねんれいと ともに ふえる かたち（ゴンペルツ）で わける /
// 60さい〜：ゴンペルツで のばし、へいきんじゅみょうが 世界銀行の 値に あうように ちょうせい する。
function spread(p, years) { return 1 - Math.pow(1 - Math.min(p, 0.999), 1 / years); }
const cache = {};
export function lifeTable(c, g) {
  const key = c.id + g;
  if (cache[key]) return cache[key];
  const q = new Array(111).fill(0);
  const imr = c.imr / 1000, u5 = Math.max(c.u5, c.imr) / 1000;
  q[0] = imr;
  const q14 = spread(1 - (1 - u5) / (1 - imr), 4);
  for (let a = 1; a <= 4; a++) q[a] = q14;
  [[5, c.m0509], [10, c.m1014], [15, c.m1519], [20, c.m2024]].forEach(([a0, p]) => {
    const qa = spread(p / 1000, 5);
    for (let a = a0; a < a0 + 5; a++) q[a] = qa;
  });
  const am = (g === 'm' ? c.amm : c.amf) / 1000;
  const s1525 = (1 - c.m1519 / 1000) * (1 - c.m2024 / 1000);
  const s2560 = Math.min(0.999, Math.max(0.05, (1 - am) / s1525));
  const B = 0.08, H = -Math.log(s2560);
  const k = (H * B) / (Math.exp(35 * B) - 1);
  for (let a = 25; a < 60; a++) q[a] = 1 - Math.exp(-(k / B) * (Math.exp(B * (a + 1 - 25)) - Math.exp(B * (a - 25))));
  const le = g === 'm' ? c.lem : c.lef;
  const B2 = 0.1;
  const fill = (h60) => {
    for (let a = 60; a <= 110; a++) q[a] = a === 110 ? 1 : Math.min(1, 1 - Math.exp(-(h60 / B2) * (Math.exp(B2 * (a + 1 - 60)) - Math.exp(B2 * (a - 60)))));
    let alive = 1, e = 0;
    for (let a = 0; a <= 110; a++) { e += alive * (1 - q[a] / 2); alive *= 1 - q[a]; }
    return e;
  };
  // h60 を にぶんたんさくで きめる
  let lo = 1e-4, hi = 1;
  for (let it = 0; it < 40; it++) { const mid = Math.sqrt(lo * hi); if (fill(mid) > le) lo = mid; else hi = mid; }
  fill(Math.sqrt(lo * hi));
  return (cache[key] = q);
}
// なくなる ねんれいを きめる（minAge より まえには なくならない ように できる）
export function deathAge(c, g, minAge = 0) {
  const q = lifeTable(c, g);
  for (let a = minAge; a <= 110; a++) if (Math.random() < q[a]) return a;
  return 110;
}

// なまえ（その くにで よく ある なまえの れい。「おとこのこ / おんなのこ」）
const NAMES = {
  in: 'アーラヴ ラーフル アルジュン / プリヤ アナニャ ディヴィヤ', cn: 'ハオラン ズーハン ウェイ / シンイー ユートン メイ',
  ng: 'チネドゥ イブラヒム トゥンデ / アミナ ンゴジ フンミラヨ', pk: 'アリ ムハンマド ハムザ / アイシャ ファーティマ ザイナブ',
  cd: 'ジョゼフ パトリス エマニュエル / グラース エステル ミレイユ', id: 'ブディ アディティヤ リズキ / シティ プトゥリ デウィ',
  et: 'アベベ ダウィット ヨナス / ハナ メロン ティギスト', us: 'リアム ノア イーサン / オリビア エマ エイヴァ',
  bd: 'ラヒム タンヴィル アリフ / ファーティマ ナスリン ヌスラト', br: 'ミゲル アルトゥール ガブリエル / ヘレナ アリス ラウラ',
  tz: 'バラカ ジュマ イッサ / ネマ ザワディ ルース', eg: 'モハメド アフマド ユーセフ / マリアム ファーティマ ヌール',
  ph: 'ホセ マーク ジョン / マリア エンジェル プリンセス', mx: 'サンティアゴ マテオ セバスティアン / ソフィア ヴァレンティナ レヒナ',
  ug: 'ジョゼフ ブライアン イヴァン / エスター ナカト ジョイ', ke: 'ブライアン ケヴィン キプロノ / フェイス マーシー ワンジク',
  sd: 'モハメド オスマン アフマド / ファーティマ アーミナ サラ', af: 'アフマド ムスタファ ハミド / ファーティマ マリアム ザフラ',
  vn: 'ミン フイ ナム / リン マイ アン', ao: 'ジョアン ペドロ マヌエル / アナ マリア ジョアナ',
  ru: 'アレクサンドル ミハイル イワン / アナスタシア ソフィア マリア', ne: 'アブドゥ イブラヒム ムーサ / アイシャ ハディジャ ファティ',
  mz: 'ジョアン ジョゼ ペドロ / マリア アナ ルイーザ', ir: 'アリ ホセイン レザー / ファーテメ ザフラ マルヤム',
  tr: 'ユスフ ミラチ エミル / ゼイネプ エリフ アスヤ', mg: 'アンドリ ティアナ ジャン / ノロ ファラ ミアランゴ',
  mm: 'アウン ミン チョー / エイ スー ティダ', jp: 'はると そうた れん / ひまり めい ゆい',
  de: 'ノア エミル パウル / エミリア ゾフィア ハンナ', fr: 'ガブリエル ラファエル レオ / ジャド ルイーズ アンブル',
  gb: 'ノア オリヴァー ジョージ / オリヴィア アメリア アイラ', sa: 'モハメド アブドゥッラー ファイサル / ヌーラ サラ ラーマ',
  th: 'ソムチャイ アナン アーティット / ニチャパ ナリン マリ', co: 'サンティアゴ マティアス サムエル / サロメ マリアナ イサベラ',
  ar: 'マテオ ベンハミン バウティスタ / イサベラ エンマ オリビア', it: 'レオナルド フランチェスコ トンマーゾ / ソフィア アウローラ ジュリア',
  ca: 'ノア リアム ウィリアム / オリヴィア シャーロット エマ', es: 'ウーゴ マルティン マテオ / ルシア ソフィア マルティナ',
  au: 'オリヴァー ノア ジャック / シャーロット アメリア アイラ', kr: 'ミンジュン ソジュン ドユン / ソア ハユン ジウ',
  // せつめいの ない くにでも、よく ある なまえが わかる ところ
  kz: 'ヌルラン ティムール アルマン / アイゲリム マディナ アルア', uz: 'ティムール ルスタム ジャスル / ディルノザ マディナ ゼブニソ',
  kg: 'ヌルラン アイベク エルラン / アイゲリム アイダ ベギマイ', tj: 'ルスタム ファルホド ソム / マディナ ニゴラ ゾリナ',
  tm: 'メレト ダヴレト セルダル / アイナ ギュルナラ マヤ', az: 'アリ ユスフ ムラド / ゼフラ ファティマ ニギャル',
  my: 'アフマド ムハンマド アダム / ヌール シティ アイシャ', kh: 'ソファル ダラ ヴィチェト / スレイ ソピア チャンタ',
  mn: 'バトバヤル テムージン ガンバト / サランゲレル ノミン オユン', la: 'ソムサック カムペーン ブンミー / ノイ ケオ チャンシー',
  np: 'アーユシュ ビカシュ ラム / スニタ プージャ アンジャリ', lk: 'カミンドゥ ニプン サンダル / ニムニ セヌリ ディニシャ',
  ua: 'オレクサンドル アンドリイ マクシム / ソフィア アナスタシア オレナ', pl: 'アントニ ヤン フランチシェク / ゾフィア ハンナ ズザンナ',
};
// ちいき（世界銀行の くわけ）ごとの よく ある なまえ
const REGION_NAMES = {
  MEA: 'アフマド オマル ユーセフ アリ / ファーティマ マリアム ライラ ヌール',
  SSF: 'ムサ ジョゼフ イブラヒム ダニエル / アミナ グレース ファトゥ エスター',
  LCN: 'マテオ サンティアゴ ルイス ガブリエル / ソフィア ヴァレンティナ イサベラ マリア',
  ECS: 'アレクサンダー ルカ ダヴィド トマス / アナ マリア エレナ ニーナ',
  SAS: 'アルジュン ラヴィ ラフル / プリヤ アニタ スニタ',
  NAC: 'リアム ノア イーサン / オリビア エマ エイヴァ',
};
const nameList = (str, g) => str.split('/')[g === 'm' ? 0 : 1].trim().split(/\s+/);
// なまえが きめられない ときは null（「あなた」と よぶ）
export function nameFor(c, g) {
  const src = NAMES[c.id] || REGION_NAMES[c.region];
  if (!src) return null;
  const xs = nameList(src, g);
  return xs[Math.floor(Math.random() * xs.length)];
}

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

