// できごと：おでかけ・きゅうけい・ライバル・ふしめ
// { id, kind: 'outing'|'rest'|'rival'|'term', who?, text: [...], choices?: [{ label, eff, say }] }
// eff: { math, ja, en, stamina, mood, card }
export const EVENTS = [
  { id: 'out_shop', kind: 'outing', text: ['おかいものに きた。', 'おかしを 2つ かうと 150えん。 さいふには 200えんある。'], choices: [
    { label: 'おつりは 50えん！', eff: { math: 15, mood: 1 }, say: 'せいかい！ けいさんが はやいね' }, { label: 'おつりは 100えん！', eff: { math: 5 }, say: 'ざんねん、200 − 150 = 50えん だよ' }, { label: 'おかしは がまんする', eff: { stamina: 10 }, say: 'えらい！ たいりょくが ちょっと もどった' }] },
  { id: 'out_sign', kind: 'outing', text: ['こうえんの かんばんに「入口」と かいてある。'], choices: [
    { label: '「いりぐち」だ！', eff: { ja: 15, mood: 1 }, say: 'よめたね！ 入口＝いりぐち' }, { label: '「でぐち」かな？', eff: { ja: 5 }, say: '「出口」が でぐち。「入口」は いりぐち だよ' }] },
  { id: 'out_tourist', kind: 'outing', text: ['えきで がいこくの ひとに「Hello!」と こえを かけられた。'], choices: [
    { label: 'Hello! と こたえる', eff: { en: 15, mood: 1 }, say: 'Nice! えがおで あいさつ できた' }, { label: 'Good night! と こたえる', eff: { en: 5 }, say: 'Good night は「おやすみ」だよ。でも はなせて えらい！' }, { label: 'てを ふる', eff: { mood: 1 }, say: 'てを ふるのも りっぱな あいさつ' }] },
  { id: 'out_library', kind: 'outing', text: ['としょかんに きた。どの ほんを よむ？'], choices: [
    { label: 'ずかん', eff: { math: 8, ja: 8 }, say: 'かずと ことばを いっしょに おぼえた' }, { label: 'えいごの えほん', eff: { en: 12 }, say: 'おとを まねして よんでみた' }, { label: 'ものがたり', eff: { ja: 12 }, say: 'さいごまで よみきった！' }] },
  { id: 'out_park', kind: 'outing', text: ['こうえんで おもいきり あそんだ！'], choices: [{ label: 'たのしかった！', eff: { mood: 2, stamina: -10 }, say: 'やるきが ぐんと あがった' }] },
  { id: 'out_rain', kind: 'outing', text: ['でかけようと したら あめ。 おうちで なにを する？'], choices: [
    { label: 'ごろごろ する', eff: { stamina: 30 }, say: 'たいりょくが もどった' }, { label: 'ドリルを やる', eff: { math: 10, ja: 10, en: 10 }, say: 'えらい！ 3きょうか すこしずつ' }] },
  { id: 'out_cards', kind: 'outing', text: ['おまつりの くじびきで あたりが でた！'], choices: [{ label: 'やった！', eff: { card: true, mood: 1 }, say: 'スキルカードを 1まい もらった' }] },
  { id: 'out_dog', kind: 'outing', text: ['いぬが 3びき、ねこが 2ひき あそんでいる。 あしは ぜんぶで なんぼん？'], choices: [
    { label: '20ぼん', eff: { math: 15, mood: 1 }, say: '4×3 + 4×2 = 20。せいかい！' }, { label: '10ぽん', eff: { math: 5 }, say: 'いぬも ねこも あしは 4ほん。 20ぼん だよ' }] },
  { id: 'out_lost', kind: 'outing', text: ['みちに まよった…。 でも なんとか かえれた。'], choices: [{ label: 'つかれた…', eff: { stamina: -15, mood: -1 }, say: 'つぎは ちずを もっていこう' }] },
  { id: 'out_music', kind: 'outing', text: ['えいごの うたが ながれてきた。「ABCDEFG…」'], choices: [{ label: 'いっしょに うたう', eff: { en: 12, mood: 1 }, say: 'アルファベットの うたを ぜんぶ うたえた！' }] },
  { id: 'out_shiritori', kind: 'outing', text: ['かえりみち、ともだちと しりとり。「りんご」の つぎは？'], choices: [
    { label: 'ごりら', eff: { ja: 12, mood: 1 }, say: 'ご→ごりら！ つづいた' }, { label: 'みかん', eff: { ja: 3 }, say: '「ご」から はじめないと…。 でも たのしかった' }] },
  { id: 'out_bakery', kind: 'outing', text: ['パンやさんで 1こ 80えんの パンを 3こ かった。'], choices: [
    { label: '240えん', eff: { math: 15, mood: 1 }, say: '80×3 = 240。 せいかい！' }, { label: '210えん', eff: { math: 5 }, say: '80×3 = 240えん だよ' }] },
  // きゅうけい
  { id: 'rest_nap', kind: 'rest', text: ['ぐっすり おひるね。 いい ゆめを みた。'], choices: [{ label: 'すっきり！', eff: { mood: 1 }, say: 'やるきが あがった' }] },
  { id: 'rest_snack', kind: 'rest', text: ['おやつは ドーナツ。 1つ 4とうぶんに すると？'], choices: [{ label: '4分の1 ずつ', eff: { math: 8 }, say: 'ぶんすうの かんがえかた、いいね' }, { label: 'ぜんぶ たべる', eff: { stamina: 10 }, say: 'おいしかった！' }] },
  { id: 'rest_tv', kind: 'rest', text: ['テレビで えいごの ばんぐみを みた。'], choices: [{ label: 'ききとれた！', eff: { en: 8 }, say: '「apple」「cat」が きこえた' }] },
  { id: 'rest_book', kind: 'rest', text: ['ベッドで えほんを よんだ。'], choices: [{ label: 'おもしろかった', eff: { ja: 8 }, say: 'あたらしい ことばを おぼえた' }] },
  { id: 'rest_stretch', kind: 'rest', text: ['ストレッチを したら からだが かるい。'], choices: [{ label: 'のびのび', eff: { stamina: 10 }, say: 'たいりょくが さらに もどった' }] },
  { id: 'rest_sleepy', kind: 'rest', text: ['ねすぎて あたまが ぼんやり…'], choices: [{ label: 'うーん', eff: { mood: -1 }, say: 'つぎは ほどほどに' }] },
  // ライバル（who は じぶん いがいの とき だけ）
  { id: 'riv_ken', kind: 'rival', who: 'ken', text: ['ケン「けいさんの コツ、おしえてやるよ！ 10の まとまりを つくるんだ」'], choices: [{ label: 'ありがとう！', eff: { math: 15 }, say: 'さんすうが あがった' }, { label: 'じぶんで できるよ', eff: { mood: 1 }, say: 'ケン「おっ、やる気だな！」' }] },
  { id: 'riv_momo', kind: 'rival', who: 'momo', text: ['モモ「この かんじ よめる？ いっしょに れんしゅう しよう」'], choices: [{ label: 'いっしょに やる', eff: { ja: 15 }, say: 'こくごが あがった' }, { label: 'あとで ね', eff: { stamina: 10 }, say: 'モモ「じゃあ またね」' }] },
  { id: 'riv_lily', kind: 'rival', who: 'lily', text: ['リリー「えいごで じこしょうかい してみて！ I\'m …」'], choices: [{ label: 'やってみる', eff: { en: 15 }, say: 'えいごが あがった' }, { label: 'はずかしい…', eff: { mood: -1 }, say: 'リリー「つぎは いっしょに いおう！」' }] },
  { id: 'riv_sora', kind: 'rival', who: 'sora', text: ['ソラ「テストって きんちょう するよね。 でも たのしもう！」'], choices: [{ label: 'そうだね！', eff: { mood: 2 }, say: 'やるきが あがった' }] },
  { id: 'riv_ken2', kind: 'rival', who: 'ken', text: ['ケン「つぎの テスト、おれが いちばん とるからな！」'], choices: [{ label: 'まけないよ！', eff: { mood: 1 }, say: 'ライバルが いると がんばれる' }] },
  { id: 'riv_momo2', kind: 'rival', who: 'momo', text: ['モモ「ステージで ボールを なげるの、じつは とくい なの」'], choices: [{ label: 'きを つけよう…', eff: { card: true }, say: 'モモから カードを 1まい もらった！' }] },
  { id: 'riv_lily2', kind: 'rival', who: 'lily', text: ['リリー「あなの まえでは あせらず ジャンプ、よ」'], choices: [{ label: 'おぼえた', eff: { mood: 1 }, say: 'ステージの コツを きいた' }] },
  { id: 'riv_sora2', kind: 'rival', who: 'sora', text: ['ソラ「きょうは みんなで おにごっこ しよう！」'], choices: [{ label: 'あそぶ！', eff: { mood: 1, stamina: -10 }, say: 'たのしかった！' }, { label: 'べんきょうする', eff: { math: 5, ja: 5, en: 5 }, say: 'ソラ「えらいなあ」' }] },
];
export const eventsOf = (kind) => EVENTS.filter((e) => e.kind === kind);
