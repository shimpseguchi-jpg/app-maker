// スコアアタックの とくしゅルール（Slay the Spire の カスタムモードを もとに）
// kind: good（らくに なる）/ bad（むずかしく なる）/ mix（いいことも わるいことも）
// score: スコアの ボーナス（+0.2 = +20%）
// group: おなじ group は いっしょに えらばれない
export const MODS = {
  draft: { name: 'ドラフト', icon: '🃏', kind: 'mix', score: 0.1, group: 'start', text: 'パックの かわりに「3{枚|まい}から 1{枚|まい} えらぶ」を 15{回|かい} くりかえして デッキを つくる（はじめの カードは なし）' },
  sealed: { name: 'シールド', icon: '📦', kind: 'mix', score: 0.05, group: 'start', text: 'パックを 6つ あけて、その 30{枚|まい}だけで 10〜14{枚|まい}の デッキを つくる（はじめの カードは なし）' },
  insanity: { name: 'きょうきの さた', icon: '🌀', kind: 'mix', score: 0.1, group: 'start', text: 'ランダムな 25{枚|まい}の デッキで スタート（パックも デッキづくりも なし）' },
  chimera: { name: 'キメラ', icon: '🐲', kind: 'good', score: 0, group: 'start', text: '3にんの はじめの カードを ぜんぶ まぜて、パックと いっしょに デッキを つくる' },
  starter: { name: 'はじめの デッキだけ', icon: '🎒', kind: 'bad', score: 0.25, group: 'start', text: 'パックも カードの ほうしゅうも なし。かわりに レアの アルカナを 2つ もらって スタート' },
  hoarder: { name: 'しゅうしゅうへき', icon: '🧺', kind: 'mix', score: 0.2, text: 'カードを もらう たびに、おなじ カードが あと 2{枚|まい} ふえる。おみせで カードを わすれられない' },
  shiny: { name: 'ピカピカ', icon: '💎', kind: 'good', score: -0.1, text: 'はじめの スペルが ぜんぶ レアカードに かわる（{守|まも}りの じゅもんは のこる）' },
  specialized: { name: 'とっか', icon: '5️⃣', kind: 'mix', score: 0, text: 'おなじ カードを 5{枚|まい} もって スタート' },
  vintage: { name: 'ヴィンテージ', icon: '🏺', kind: 'good', score: -0.05, text: 'ふつうの たたかいで、カードの かわりに アルカナが もらえる' },
  allstar: { name: 'オールスター', icon: '⭐', kind: 'good', score: -0.05, text: 'むしょくの カードを 5{枚|まい} もって スタート' },
  diverse: { name: 'たようせい', icon: '🌈', kind: 'mix', score: 0, text: 'ほうしゅうや おみせに、どの ぞくせいの カードも おなじくらい でる' },
  heirloom: { name: 'かほう', icon: '👑', kind: 'good', score: -0.1, text: 'レアの アルカナを 1つ もって スタート' },
  slow: { name: 'じかんの おくれ', icon: '🐢', kind: 'good', score: -0.1, text: '{敵|てき}は たたかいの さいしょの 2ターン「よわり」（{攻撃|こうげき}が はんぶん）' },
  flight: { name: 'ひしょう', icon: '🪽', kind: 'good', score: -0.1, text: 'マップの みちを むしして、{次|つぎ}の れつの どの マスへも すすめる' },
  spirits: { name: 'せいれいの すがた', icon: '🧚', kind: 'good', score: -0.15, text: '5つの ぞくせいの けっかいを 1{枚|まい}ずつ もって スタート' },
  deadly: { name: 'いのちがけの なぞ', icon: '☠️', kind: 'mix', score: 0.2, text: 'なぞの マスで つよい {敵|てき}が でる ことが ある。たからばこが ふえる' },
  binary: { name: 'にしゃたくいつ', icon: '✌️', kind: 'bad', score: 0.1, text: 'カードの ほうしゅうが 2{枚|まい}から えらぶ ように なる' },
  glass: { name: 'ガラスの からだ', icon: '🫙', kind: 'bad', score: 0.25, text: 'さいだい HPが 3わり へる' },
  cursed: { name: 'のろわれた みち', icon: '⚫', kind: 'bad', score: 0.2, text: 'きえない のろいカードを 1{枚|まい} もって スタート。ボスを たおすたびに 2{枚|まい} ふえる' },
  swarm: { name: 'おおものねらい', icon: '💀', kind: 'mix', score: 0.2, text: 'つよい {敵|てき}の マスが ふえる。つよい {敵|てき}の カードほうしゅうは ぜんぶ レア' },
  lethal: { name: 'ちめいしょう', icon: '🗡️', kind: 'mix', score: 0.15, text: '{敵|てき}は たたかいの はじめに ちから +3。きみは まいターン {倍率|ばいりつ} +3' },
  midas: { name: 'ミダス', icon: '🪙', kind: 'good', score: -0.05, text: 'もらえる コインが 2{倍|ばい}。でも たきびで カードを きたえられない' },
  night: { name: 'よるの きょうふ', icon: '🌙', kind: 'mix', score: 0.05, text: 'たきびで やすむと HPが ぜんぶ かいふく。でも さいだい HPが 5 へる' },
  terminal: { name: 'ターミナル', icon: '⌛', kind: 'mix', score: 0.05, text: 'マスに はいる たびに さいだい HPが 1 へる。たたかいでは まいターン {守|まも}り +3' },
  certain: { name: 'かくてい みらい', icon: '➡️', kind: 'bad', score: 0.15, text: 'マップが 1ぽんみちに なる' },
  snecko: { name: 'へびの め', icon: '🐍', kind: 'mix', score: 0, text: '{手札|てふだ} +1{枚|まい}。ひいた カードの マナコストが 0〜3の ランダムに なる' },
};
export const MOD_LIST = Object.keys(MODS);

// 3つ えらぶ（おなじ group は 1つまで）
export function pickMods(rng, n = 3) {
  const out = [];
  const pool = rng.shuffle([...MOD_LIST]);
  for (const id of pool) {
    if (out.length >= n) break;
    const g = MODS[id].group;
    if (g && out.some((x) => MODS[x].group === g)) continue;
    out.push(id);
  }
  return out;
}
export function modScore(mods = []) { return mods.reduce((s, id) => s + (MODS[id]?.score || 0), 0); }
export const hasMod = (run, id) => !!(run && run.mods && run.mods.includes(id));
