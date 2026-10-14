// ニュースへの反応：ニュースのカードをめくったら、Reigns のようにカードをふって自国の態度を決める
// ニュースの種類（cat）ごとに選択肢の山がある。毎回「自国優先（pop が＋）」から1つと「よその国を助ける・がまんする（pop が0以下）」から1つを引き、
// 左右はランダムに置く（いつも同じ向きにふるだけにならないように）
// 状況しだいで3つめ（↑ 前にふる）が出る：SPECIAL の when が当てはまるとき（対象国が同盟国／仲の悪い国、自国が大変なとき など）
// id：選択肢の名前（セーブに残す）、n：おとな向け、k：1ねんせい向け（ひらがな）、fx：効果（self：自国、who：ニュースの対象国、rel.tgt：対象国との関係）
// pop：国民の気持ち（短絡的で自国優先）。＋は自国を優先する選択、−はよその国を助ける選択
// どの選択肢にも得と損がある（1ねんせいの絵の表示でも ↑ と ↓ が両方出る）。山の最初の2つは前の版の2択と同じ
// self：ニュースの対象が自国のときに使う山
export const REACTIONS = {
  eco: [
    { id: 'eco_protect', pop: 3, n: '自国の市場を守る', k: 'じぶんの くにを まもる', fx: ['self.capital+s', 'self.rep-s', 'world.trust-s'] },
    { id: 'eco_support', pop: -3, n: '各国と協調して支える', k: 'みんなで ささえる', fx: ['self.fiscal-s', 'self.rep+s', 'world.trust+s'] },
    { id: 'eco_buy', pop: 3, n: '安くなった外国の資産を買いあさる', k: 'やすく なった よその くにの ものを かいあつめる', fx: ['self.capital+s', 'self.gnp+s', 'self.rep-m', 'world.tension+s'] },
    { id: 'eco_loan', pop: -2, n: '困っている国に緊急融資する', k: 'こまって いる くにに おかねを かす', fx: ['self.capital-s', 'who.gnp+s', 'rel.tgt+s', 'self.rep+s'] },
  ],
  fw: [
    { id: 'fw_send', pop: -3, n: '食糧と水を送る', k: 'たべものと みずを おくる', fx: ['self.food-s', 'self.rep+s', 'poorBg.food+s'] },
    { id: 'fw_stock', pop: 3, n: '自国の備蓄を増やす', k: 'じぶんの くにに ためて おく', fx: ['self.food+s', 'self.water+s', 'self.rep-s'] },
    { id: 'fw_sell', pop: 3, n: '値上がりした食糧を高く売る', k: 'ねあがり した たべものを たかく うる', fx: ['self.capital+s', 'self.food-s', 'self.rep-s', 'world.foodPrice+s'] },
    { id: 'fw_teach', pop: -2, n: '節水と農業の技術を教える', k: 'みずと はたけの ぎじゅつを おしえる', fx: ['self.fiscal-s', 'self.rep+s', 'poorBg.water+s'] },
  ],
  env: [
    { id: 'env_budget', pop: -3, n: '対策に予算を出す', k: 'ちきゅうの ために おかねを だす', fx: ['self.fiscal-s', 'self.co2-s', 'world.co2-s'] },
    { id: 'env_econ', pop: 3, n: '経済を優先する', k: 'おかねもうけを さきに する', fx: ['self.gnp+s', 'self.co2+s', 'world.co2+s'] },
    { id: 'env_green', pop: -2, n: '自然エネルギーに切り替える', k: 'しぜんの えねるぎーに かえる', fx: ['self.capital-s', 'self.altE+s', 'world.co2-s'] },
    { id: 'env_wait', pop: 2, n: '他国が先にやるまで待つ', k: 'よその くにが さきに やるまで まつ', fx: ['self.fiscal+s', 'self.rep-s', 'world.co2+s'] },
  ],
  polar: [
    { id: 'polar_protect', pop: -2, n: '保護を呼びかける', k: 'そっと して おこうと いう', fx: ['self.fiscal-s', 'self.rep+s', 'world.tension-s'] },
    { id: 'polar_dev', pop: 3, n: '開発に名乗りをあげる', k: 'じぶんも ほりに いく', fx: ['self.oil+s', 'self.rep-s', 'world.tension+s'] },
    { id: 'polar_lab', pop: -1, n: '共同の研究基地をつくる', k: 'みんなで しらべる きちを つくる', fx: ['self.fiscal-s', 'self.tech+s', 'world.tension-s'] },
    { id: 'polar_claim', pop: 3, n: '領有権を主張する', k: '「ここは じぶんの くにの ものだ」と いう', fx: ['self.stability+s', 'self.rep-s', 'world.tension+s'] },
  ],
  res: [
    { id: 'res_share', pop: -3, n: '共同管理を提案する', k: 'みんなで わけようと いう', fx: ['self.oil-s', 'self.rep+s', 'world.tension-s'] },
    { id: 'res_grab', pop: 3, n: '確保に動く', k: 'じぶんの ものに する', fx: ['self.oil+s', 'self.capital+s', 'self.rep-s', 'world.tension+s'] },
    { id: 'res_save', pop: -2, n: '省エネで使う量を減らす', k: 'つかう りょうを へらす', fx: ['self.gnp-s', 'self.oil+s', 'self.co2-s'] },
    { id: 'res_hoard', pop: 2, n: '値上がり前に買いだめする', k: 'たかく なる まえに かいだめ する', fx: ['self.capital-s', 'self.oil+m', 'self.rep-s'] },
  ],
  health: [
    { id: 'health_team', pop: -3, n: '医療チームを送る', k: 'おいしゃさんを おくる', fx: ['self.fiscal-s', 'self.rep+s', 'who.stability+s', 'rel.tgt+s'] },
    { id: 'health_close', pop: 2, n: '国境を閉じる', k: 'くにの もんを しめる', fx: ['self.capital-s', 'self.stability+s'] },
    { id: 'health_open', pop: -2, n: '薬の作り方を公開する', k: 'くすりの つくりかたを みんなに おしえる', fx: ['self.tech-s', 'self.rep+m', 'world.trust+s'] },
    { id: 'health_hoard', pop: 3, n: '薬を自国の分だけ確保する', k: 'くすりを じぶんの くにの ぶんだけ あつめる', fx: ['self.fiscal-s', 'self.stability+s', 'self.rep-m'] },
  ],
  disaster: [
    { id: 'dis_rescue', pop: -3, n: '救援を送る', k: 'たすけに いく', fx: ['self.fiscal-s', 'self.rep+s', 'who.stability+s', 'rel.tgt+s'] },
    { id: 'dis_prepare', pop: 2, n: '自国の備えを固める', k: 'じぶんの くにの そなえを する', fx: ['self.security+s', 'self.fiscal-s', 'self.stability+s'] },
    { id: 'dis_donate', pop: -1, n: '国民に募金を呼びかける', k: 'みんなに ぼきんを よびかける', fx: ['self.capital-s', 'self.rep+s', 'who.stability+s'] },
    { id: 'dis_contract', pop: 3, n: '復興工事を自国の企業で請け負う', k: 'たてなおしの しごとを じぶんの くにの かいしゃが もらう', fx: ['self.capital+s', 'self.gnp+s', 'self.rep-s', 'rel.tgt-s'] },
  ],
  mil: [
    { id: 'mil_mediate', pop: -2, n: '仲裁に入る', k: 'なかなおりを てつだう', fx: ['self.fiscal-s', 'self.rep+s', 'world.tension-s'] },
    { id: 'mil_arm', pop: 3, n: '軍備を固める', k: 'ぐんたいを ふやす', fx: ['self.soldiers+s', 'self.security+s', 'world.tension+s'] },
    { id: 'mil_sell', pop: 3, n: '武器を売り込む', k: 'ぶきを うる', fx: ['self.capital+s', 'self.rep-s', 'world.conflicts+s'] },
    { id: 'mil_refuge', pop: -3, n: '戦火を逃れた人を受け入れる', k: 'にげて きた ひとを うけいれる', fx: ['self.stability-s', 'self.rep+s', 'world.refugees-s'] },
  ],
  dom: [
    { id: 'dom_aid', pop: -3, n: '支援を申し出る', k: 'たすけに いく', fx: ['self.fiscal-s', 'who.stability+s', 'rel.tgt+s'] },
    { id: 'dom_ignore', pop: 2, n: '関わらない', k: 'かかわらない', fx: ['self.security+s', 'rel.tgt-s'] },
    { id: 'dom_talks', pop: -2, n: '話し合いの場を用意する', k: 'はなしあいの ばしょを つくる', fx: ['self.fiscal-s', 'self.rep+s', 'world.tension-s'] },
    { id: 'dom_blame', pop: 3, n: '相手の政府を非難する', k: 'あいての くにを わるく いう', fx: ['self.stability+s', 'rel.tgt-m', 'self.rep-s'] },
  ],
  dip: [
    { id: 'dip_welcome', pop: -1, n: '歓迎の声明を出す', k: 'よかったねと いう', fx: ['self.security-s', 'self.rep+s', 'rel.tgt+s', 'world.tension-s'] },
    { id: 'dip_guard', pop: 2, n: '警戒する', k: 'ようじんする', fx: ['self.soldiers+s', 'self.security+s', 'rel.tgt-s'] },
    { id: 'dip_join', pop: -2, n: '自分も輪に加わる', k: 'じぶんも なかまに いれて もらう', fx: ['self.fiscal-s', 'rel.tgt+m', 'world.tension-s'] },
    { id: 'dip_both', pop: 2, n: 'どちらともうまく付き合って得をする', k: 'どちらとも なかよく して とくを する', fx: ['self.capital+s', 'self.rep-s'] },
  ],
  intl: [
    { id: 'intl_support', pop: -2, n: '支持する', k: 'さんせいする', fx: ['self.fiscal-s', 'self.rep+s', 'world.trust+s'] },
    { id: 'intl_distance', pop: 2, n: '距離を置く', k: 'はんたいする', fx: ['self.fiscal+s', 'self.rep-s', 'world.trust-s'] },
    { id: 'intl_lead', pop: -3, n: '議論をまとめ役として引っぱる', k: 'みんなの まとめやくに なる', fx: ['self.fiscal-m', 'self.rep+m', 'world.trust+s'] },
    { id: 'intl_terms', pop: 3, n: '自国に有利な条件をつける', k: 'じぶんの くにに いい じょうけんを つける', fx: ['self.capital+s', 'world.trust-s', 'rel.all-s'] },
  ],
  tech: [
    { id: 'tech_invest', pop: -1, n: '研究に投資する', k: 'けんきゅうに おかねを だす', fx: ['self.fiscal-s', 'self.tech+s'] },
    { id: 'tech_rule', pop: 1, n: 'ルールを作って慎重に', k: 'きまりを つくって ようじんする', fx: ['self.stability+s', 'self.industry-s'] },
    { id: 'tech_secret', pop: 2, n: '技術を国の秘密にする', k: 'ぎじゅつを くにの ひみつに する', fx: ['self.tech+s', 'self.rep-s', 'world.trust-s'] },
    { id: 'tech_share', pop: -2, n: '技術を世界と共有する', k: 'ぎじゅつを せかいと わけあう', fx: ['self.tech-s', 'self.rep+s', 'world.trust+s'] },
  ],
  society: [
    { id: 'soc_accept', pop: -3, n: '受け入れる', k: 'うけいれる', fx: ['self.rep+s', 'self.stability-s'] },
    { id: 'soc_careful', pop: 2, n: '慎重に構える', k: 'ようすを みる', fx: ['self.stability+s', 'self.rep-s'] },
    { id: 'soc_open', pop: -2, n: '外国から来る人に門を開く', k: 'よその くにから くる ひとを むかえる', fx: ['self.gnp+s', 'self.stability-s', 'self.ethnic+s'] },
    { id: 'soc_fund', pop: 2, n: '国内の生活支援に予算を出す', k: 'じぶんの くにの くらしに おかねを だす', fx: ['self.fiscal-s', 'self.stability+s', 'self.inequality-s'] },
  ],
  self: [
    { id: 'self_listen', pop: 3, n: '国民に寄りそう', k: 'みんなの はなしを きく', fx: ['self.stability+s', 'self.fiscal-s'] },
    { id: 'self_strong', pop: 1, n: '強い態度で乗り切る', k: 'つよい たいどで のりきる', fx: ['self.security+s', 'self.rep-s'] },
    { id: 'self_help', pop: -2, n: '外国に助けを求める', k: 'よその くにに たすけて もらう', fx: ['self.capital+s', 'self.rep-s', 'self.stability-s'] },
    { id: 'self_sorry', pop: -1, n: '失敗を認めて謝る', k: 'まちがいを みとめて あやまる', fx: ['self.rep+s', 'self.stability-s'] },
  ],
};
REACTIONS.future = REACTIONS.tech;

// 状況しだいの3つめ（↑ 前にふる）。上から順に、当てはまった最初の1つが出る
// when(g, me, e, h)：me＝自国、e＝ニュースのカード、h＝{ allied, rel, isSeat }（core.js の関数）
// chance：当てはまっても出る確率（なければ必ず出る）。3つめが出るのは、カードの2〜3割くらいにする
export const SPECIAL = [
  { id: 'sp_ally', pop: -2, n: '同盟国として全面支援する', k: 'なかまの くにとして ぜんりょくで たすける', fx: ['self.fiscal-m', 'who.stability+m', 'rel.tgt+m'],
    when: (g, me, e, h) => e.react !== 'self' && e.who && e.who !== me.id && h.isSeat(g, e.who) && h.allied(g, me.id, e.who) },
  { id: 'sp_rival', pop: 3, n: 'この機に乗じる', k: 'この すきに とくを する', fx: ['self.capital+m', 'rel.tgt-m', 'self.rep-m', 'world.tension+s'],
    when: (g, me, e, h) => e.react !== 'self' && e.who && e.who !== me.id && h.isSeat(g, e.who) && h.rel(g, me.id, e.who) <= 30 },
  { id: 'sp_home', pop: 3, n: 'いまは国内で手一杯だと言う', k: 'いまは じぶんの くにで せいいっぱいと いう', fx: ['self.stability+s', 'self.rep-s'],
    when: (g, me, e) => e.react !== 'self' && me.stats.stability < 35 },
  { id: 'sp_army', pop: 2, chance: 0.5, n: '軍を送って鎮める', k: 'ぐんたいを おくって しずめる', fx: ['self.soldiers-s', 'who.stability+s', 'rel.tgt-s', 'world.tension+s'],
    when: (g, me, e) => ['mil', 'dom', 'disaster'].includes(e.react) && e.who && e.who !== me.id && (me.stats.soldiers >= 100 || me.stats.bases >= 6) },
  { id: 'sp_tech', pop: 0, chance: 0.5, n: '技術で解決策を示す', k: 'ぎじゅつで かいけつする', fx: ['self.fiscal-m', 'self.rep+s', 'self.tech+s'],
    when: (g, me, e) => ['env', 'health', 'tech', 'future'].includes(e.react) && me.stats.tech >= 85 },
  { id: 'sp_rich', pop: -1, chance: 0.5, n: 'お金で片をつける', k: 'おかねで かいけつする', fx: ['self.capital-m', 'self.rep+s', 'world.trust+s'],
    when: (g, me, e) => e.react !== 'self' && me.stats.capital >= 85 },
];

export const OPTION_BY_ID = Object.fromEntries([...Object.values(REACTIONS).flat(), ...SPECIAL].map((o) => [o.id, o]));

// ニュースの種類の見た目
export const NEWS_ICON = { eco: '💹', fw: '🌾', env: '🌳', polar: '🧊', res: '🛢', health: '🏥', disaster: '🌋', mil: '⚔', dom: '🏛', dip: '🤝', intl: '🇺🇳', tech: '🔬', future: '🚀', society: '👥', start: '🌏', misc: '📰' };
export const NEWS_CAT = {
  eco: ['経済', 'おかね'], fw: ['食糧・水', 'たべもの・みず'], env: ['環境', 'しぜん'], polar: ['極地', 'なんきょく・ほっきょく'], res: ['資源', 'しげん'],
  health: ['健康', 'びょうき'], disaster: ['災害', 'さいがい'], mil: ['紛争', 'けんか'], dom: ['内政', 'くにの なか'], dip: ['外交', 'なかよし'],
  intl: ['国際機関', 'せかいの あつまり'], tech: ['技術', 'ぎじゅつ'], future: ['未来', 'みらい'], society: ['社会', 'くらし'], start: ['はじまり', 'はじまり'], misc: ['報道', 'にゅーす'],
};
