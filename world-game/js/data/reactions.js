// ニュースへの反応：ニュースのカードをめくったら、Reigns のようにカードをふって自国の態度を決める
// ニュースは「状況の種類」（KIND_OF）に分け、種類ごとに、その状況に文意が合う選択肢の山（REACTIONS）を持つ。
// 毎回「自国優先（pop が＋）」から1つと「よその国を助ける・がまんする（pop が0以下）」から1つを引き、左右はランダムに置く。
// 状況しだいで3つめ（▲ 上にふる）・4つめ（▼ 下にふる）が出る：SPECIAL の when が当てはまるとき
// id：選択肢の名前（セーブに残す）、n：おとな向け、k：1ねんせい向け（ひらがな）、fx：効果（self：自国、who：ニュースの対象国、rel.tgt：対象国との関係）
// pop：国民の気持ち（短絡的で自国優先）。＋は自国を優先する選択、−はよその国を助ける・がまんする選択
// どの選択肢にも得と損がある（1ねんせいの絵の表示でも ↑ と ↓ が両方出る）
// self：ニュースの対象が自国のときに使う山
export const REACTIONS = {
  // 経済の混乱（恐慌・通貨危機・破綻）
  crisis: [
    { id: 'eco_protect', pop: 3, n: '自国の市場を守る', k: 'じぶんの くにの おみせを まもる', fx: ['self.capital+s', 'self.rep-s', 'world.trust-s'] },
    { id: 'eco_support', pop: -3, n: '各国と協調して支える', k: 'みんなで ささえる', fx: ['self.fiscal-s', 'self.rep+s', 'world.trust+s'] },
    { id: 'eco_buy', pop: 3, n: '安くなった外国の資産を買う', k: 'やすく なった よその くにの ものを かう', fx: ['self.capital+s', 'self.gnp+s', 'self.rep-m', 'world.tension+s'] },
    { id: 'eco_loan', pop: -2, n: '困っている国に緊急融資する', k: 'こまって いる くにに おかねを かす', fx: ['self.capital-s', 'who.gnp+s', 'rel.tgt+s', 'self.rep+s'] },
  ],
  // ブーム・過熱
  boom: [
    { id: 'bm_ride', pop: 3, n: '波に乗って投資する', k: 'ぶーむに のって おかねを だす', fx: ['self.capital+s', 'self.gnp+s', 'self.stability-s'] },
    { id: 'bm_warn', pop: -1, n: '行き過ぎに警告する', k: '「やりすぎだよ」と ちゅうい する', fx: ['self.rep+s', 'self.gnp-s'] },
    { id: 'bm_tax', pop: 2, n: 'もうけに税をかけて国の財布に入れる', k: 'もうけに ぜいきんを かける', fx: ['self.fiscal+s', 'self.stability-s'] },
    { id: 'bm_share', pop: -3, n: 'もうけを貧しい国の支援に回す', k: 'もうけを まずしい くにに わける', fx: ['self.fiscal-s', 'self.rep+s', 'poorBg.econ+s'] },
  ],
  // 品不足・流れが止まる（禁輸・部品不足・運河）
  supply: [
    { id: 'su_stock', pop: 3, n: '自国の分を先に確保する', k: 'じぶんの くにの ぶんを さきに あつめる', fx: ['self.industry+s', 'self.rep-s', 'world.trust-s'] },
    { id: 'su_share', pop: -3, n: '足りない国に回す', k: 'たりない くにに わける', fx: ['self.industry-s', 'self.rep+s', 'world.trust+s'] },
    { id: 'su_make', pop: 2, n: '自国で作れるように研究を急ぐ', k: 'じぶんの くにで つくれるように けんきゅう する', fx: ['self.fiscal-m', 'self.tech+s'] },
    { id: 'su_route', pop: -2, n: '別の運び方を各国と探す', k: 'ほかの はこびかたを みんなで さがす', fx: ['self.fiscal-s', 'self.rep+s', 'world.tension-s'] },
  ],
  // 貿易のもめごと（関税・経済圏・ルール）
  trade: [
    { id: 'tr_tariff', pop: 3, n: '関税で自国の産業を守る', k: 'ぜいきんで じぶんの くにの こうじょうを まもる', fx: ['self.industry+s', 'self.rep-s', 'world.trust-s'] },
    { id: 'tr_open', pop: -2, n: '自由な貿易を呼びかける', k: 'じゆうに うりかいしようと よびかける', fx: ['self.industry-s', 'self.rep+s', 'world.trust+s'] },
    { id: 'tr_deal', pop: 3, n: 'こっそり有利な取引を結ぶ', k: 'こっそり とくな やくそくを する', fx: ['self.capital+s', 'rel.all-s'] },
    { id: 'tr_rule', pop: -2, n: '新しいルール作りをまとめる', k: 'あたらしい きまりを みんなで つくる', fx: ['self.fiscal-s', 'self.rep+s', 'world.trust+s'] },
  ],
  // お金の流れ（税の抜け道・通貨）
  money: [
    { id: 'mn_lure', pop: 3, n: '自国も税を安くしてお金を呼びこむ', k: 'じぶんの くにも ぜいきんを やすく して おかねを よぶ', fx: ['self.capital+s', 'self.rep-s', 'world.trust-s'] },
    { id: 'mn_close', pop: -2, n: '各国で抜け道をふさぐ', k: 'みんなで ぬけみちを ふさぐ', fx: ['self.capital-s', 'self.rep+s', 'world.trust+s'] },
    { id: 'mn_guard', pop: 2, n: '自国のお金を守る手を打つ', k: 'じぶんの くにの おかねを まもる', fx: ['self.capital+s', 'world.trust-s'] },
    { id: 'mn_align', pop: -1, n: '各国と足並みをそろえる', k: 'みんなと あわせる', fx: ['self.fiscal-s', 'world.trust+s', 'world.tension-s'] },
  ],
  // 国どうしの争い
  war: [
    { id: 'mil_mediate', pop: -2, n: '仲裁に入る', k: 'なかなおりを てつだう', fx: ['self.fiscal-s', 'self.rep+s', 'world.tension-s'] },
    { id: 'mil_arm', pop: 3, n: '軍備を固める', k: 'ぐんたいを ふやす', fx: ['self.soldiers+s', 'self.security+s', 'world.tension+s'] },
    { id: 'mil_sell', pop: 3, n: '武器を売り込む', k: 'ぶきを うる', fx: ['self.capital+s', 'self.rep-s', 'world.conflicts+s'] },
    { id: 'mil_refuge', pop: -3, n: '戦火を逃れた人を受け入れる', k: 'にげて きた ひとを うけいれる', fx: ['self.stability-s', 'self.rep+s', 'world.refugees-s'] },
  ],
  // 軍拡・にらみあい（要塞・軍事化・新兵器）
  tension: [
    { id: 'tn_talks', pop: -2, n: '話し合いを呼びかける', k: 'はなしあおうと よびかける', fx: ['self.fiscal-s', 'self.rep+s', 'world.tension-s'] },
    { id: 'tn_arm', pop: 3, n: '負けずに軍備を固める', k: 'まけずに ぐんたいを ふやす', fx: ['self.soldiers+s', 'self.security+s', 'world.tension+s'] },
    { id: 'tn_ally', pop: 2, n: '強い国と手を組んで備える', k: 'つよい くにと てを くんで そなえる', fx: ['self.security+m', 'self.rep-s', 'world.tension+s'] },
    { id: 'tn_watch', pop: -1, n: 'たがいに見張る仕組みを提案する', k: 'おたがいに みはる しくみを ていあん する', fx: ['self.fiscal-s', 'world.trust+s', 'world.tension-s'] },
  ],
  // 核の危機
  nuke: [
    { id: 'nk_talks', pop: -2, n: '核をなくす話し合いを呼びかける', k: 'かくへいきを なくそうと よびかける', fx: ['self.fiscal-s', 'self.rep+s', 'world.tension-s'] },
    { id: 'nk_shield', pop: 3, n: '自国の守りを固める', k: 'じぶんの くにの まもりを かためる', fx: ['self.soldiers+s', 'self.security+s', 'world.tension+s'] },
    { id: 'nk_sanction', pop: -1, n: '各国といっしょに制裁する', k: 'みんなで こらしめる', fx: ['self.capital-s', 'rel.tgt-m', 'world.trust+s'] },
    { id: 'nk_quiet', pop: 2, n: '関わらずに様子を見る', k: 'かかわらないで ようすを みる', fx: ['self.fiscal+s', 'self.rep-s'] },
  ],
  // 武装集団・テロ・海賊・傭兵
  armed: [
    { id: 'ar_crack', pop: 3, n: '強硬に取り締まる', k: 'つよく とりしまる', fx: ['self.security+s', 'self.soldiers-s', 'self.stability+s'] },
    { id: 'ar_root', pop: -2, n: '貧しさという根っこに手を打つ', k: 'まずしさを なくす てつだいを する', fx: ['self.fiscal-s', 'poorBg.econ+s', 'self.rep+s'] },
    { id: 'ar_wall', pop: 2, n: '国境と港の警備を固める', k: 'くにの さかいと みなとを まもる', fx: ['self.security+s', 'self.capital-s'] },
    { id: 'ar_joint', pop: -1, n: '各国と合同で対処する', k: 'みんなで いっしょに たいしょ する', fx: ['self.fiscal-s', 'self.rep+s', 'world.conflicts-s'] },
  ],
  // よその国の内乱・弾圧・政情不安
  unrest: [
    { id: 'dom_aid', pop: -3, n: '人道支援を送る', k: 'たすけを おくる', fx: ['self.fiscal-s', 'who.stability+s', 'rel.tgt+s'] },
    { id: 'dom_ignore', pop: 2, n: 'よその国の内政には関わらない', k: 'よその くにの ことには かかわらない', fx: ['self.security+s', 'self.rep-s', 'rel.tgt-s'] },
    { id: 'dom_talks', pop: -2, n: '話し合いの場を用意する', k: 'はなしあいの ばしょを つくる', fx: ['self.fiscal-s', 'self.rep+s', 'world.tension-s'] },
    { id: 'dom_blame', pop: 3, n: 'その国の政府を非難する', k: 'その くにを わるく いう', fx: ['self.stability+s', 'rel.tgt-m', 'self.rep-s'] },
  ],
  // 難民
  refugee: [
    { id: 'rf_accept', pop: -3, n: '受け入れる', k: 'うけいれる', fx: ['self.rep+s', 'self.stability-s', 'world.refugees-s'] },
    { id: 'rf_close', pop: 3, n: '国境を閉じる', k: 'くにの もんを しめる', fx: ['self.stability+s', 'self.rep-s'] },
    { id: 'rf_fund', pop: -1, n: '受け入れる国にお金を出す', k: 'うけいれる くにに おかねを だす', fx: ['self.fiscal-s', 'self.rep+s'] },
    { id: 'rf_select', pop: 2, n: '働ける人だけ受け入れる', k: 'はたらける ひとだけ うけいれる', fx: ['self.industry+s', 'self.rep-s', 'self.ethnic+s'] },
  ],
  // よい変化（民主化・差別の撤廃・壁の崩壊）
  reform: [
    { id: 'rm_cheer', pop: -1, n: '歓迎して後押しする', k: 'よかったねと おうえん する', fx: ['self.fiscal-s', 'self.rep+s', 'rel.tgt+s', 'world.tension-s'] },
    { id: 'rm_wait', pop: 1, n: '混乱しないか様子を見る', k: 'ようすを みる', fx: ['self.security+s', 'self.rep-s'] },
    { id: 'rm_sell', pop: 2, n: '新しい市場として売り込む', k: 'あたらしい おきゃくさんに ものを うる', fx: ['self.capital+s', 'self.rep-s'] },
    { id: 'rm_follow', pop: -2, n: '同じ改革を自国でも進める', k: 'じぶんの くにでも おなじように かえる', fx: ['self.stability-s', 'self.rep+s'] },
  ],
  // 食べもの
  food: [
    { id: 'fw_send', pop: -3, n: '食糧を送る', k: 'たべものを おくる', fx: ['self.food-s', 'self.rep+s', 'poorBg.food+s'] },
    { id: 'fd_stock', pop: 3, n: '自国の備蓄を増やす', k: 'じぶんの くにに ためて おく', fx: ['self.food+s', 'self.fiscal-s', 'self.rep-s'] },
    { id: 'fw_sell', pop: 3, n: '値上がりした食糧を高く売る', k: 'ねあがり した たべものを たかく うる', fx: ['self.capital+s', 'self.food-s', 'self.rep-s', 'world.foodPrice+s'] },
    { id: 'fd_seed', pop: -2, n: '育て方と種を分け合う', k: 'そだてかたと たねを わけあう', fx: ['self.fiscal-s', 'self.rep+s', 'poorBg.food+s'] },
  ],
  // 水
  water: [
    { id: 'wt_share', pop: -3, n: '水を分け合う約束を呼びかける', k: 'みずを わけあう やくそくを よびかける', fx: ['self.water-s', 'self.rep+s', 'world.tension-s'] },
    { id: 'wt_secure', pop: 3, n: '自国の水源を押さえる', k: 'じぶんの くにの みずを まもる', fx: ['self.water+s', 'self.rep-s', 'world.tension+s'] },
    { id: 'wt_sell', pop: 2, n: '水を高く売る', k: 'みずを たかく うる', fx: ['self.capital+s', 'self.water-s', 'self.rep-s'] },
    { id: 'wt_tech', pop: -2, n: '節水と浄水の技術を教える', k: 'みずを きれいに する ぎじゅつを おしえる', fx: ['self.fiscal-s', 'self.rep+s', 'poorBg.water+s'] },
  ],
  // よい発見・成功（新しい技術・病気の根絶・環境の回復）
  good: [
    { id: 'gd_share', pop: -2, n: '世界中に広める', k: 'せかいじゅうに ひろめる', fx: ['self.tech-s', 'self.rep+s', 'world.trust+s'] },
    { id: 'gd_keep', pop: 3, n: '自国の得になるよう独り占めする', k: 'じぶんの くにだけで つかう', fx: ['self.tech+s', 'self.rep-s', 'world.trust-s'] },
    { id: 'gd_invest', pop: 1, n: '自国の研究にお金を出す', k: 'じぶんの くにの けんきゅうに おかねを だす', fx: ['self.fiscal-s', 'self.tech+s'] },
    { id: 'gd_poor', pop: -3, n: '貧しい国から先に届ける', k: 'まずしい くにから さきに とどける', fx: ['self.fiscal-s', 'self.rep+s', 'poorBg.econ+s'] },
  ],
  // 気候の危機
  climate: [
    { id: 'env_budget', pop: -3, n: '対策に予算を出す', k: 'ちきゅうの ために おかねを だす', fx: ['self.fiscal-s', 'self.co2-s', 'world.co2-s'] },
    { id: 'env_econ', pop: 3, n: '経済を優先する', k: 'おかねもうけを さきに する', fx: ['self.gnp+s', 'self.co2+s', 'world.co2+s'] },
    { id: 'env_green', pop: -2, n: '自然エネルギーに切り替える', k: 'しぜんの えねるぎーに かえる', fx: ['self.capital-s', 'self.altE+s', 'world.co2-s'] },
    { id: 'env_wait', pop: 2, n: '他国が先にやるまで待つ', k: 'よその くにが さきに やるまで まつ', fx: ['self.fiscal+s', 'self.rep-s', 'world.co2+s'] },
  ],
  // 自然の破壊（森・海・生きもの・砂漠・公害）
  nature: [
    { id: 'nt_protect', pop: -2, n: '守る地域を決める', k: 'まもる ばしょを きめる', fx: ['self.industry-s', 'self.rep+s', 'world.biodiv+s'] },
    { id: 'nt_use', pop: 3, n: '開発を続ける', k: 'かいはつを つづける', fx: ['self.gnp+s', 'world.biodiv-s', 'world.forestRes-s'] },
    { id: 'nt_fund', pop: -2, n: '元に戻すためにお金を出す', k: 'もとに もどす ために おかねを だす', fx: ['self.fiscal-s', 'world.forestRes+s'] },
    { id: 'nt_blame', pop: 2, n: 'よその国のせいだと言う', k: 'よその くにの せいだと いう', fx: ['self.stability+s', 'self.rep-s', 'world.biodiv-s'] },
  ],
  // 資源の奪い合い・開発ラッシュ（極地・月・海底）
  rush: [
    { id: 'res_share', pop: -3, n: '共同管理を提案する', k: 'みんなで わけようと いう', fx: ['self.oil-s', 'self.rep+s', 'world.tension-s'] },
    { id: 'res_grab', pop: 3, n: '確保に動く', k: 'じぶんの ものに する', fx: ['self.oil+s', 'self.capital+s', 'self.rep-s', 'world.tension+s'] },
    { id: 'rs_protect', pop: -2, n: '開発しないよう呼びかける', k: 'ほらないで おこうと いう', fx: ['self.fiscal-s', 'self.rep+s', 'world.tension-s'] },
    { id: 'polar_claim', pop: 3, n: '自国の権利を主張する', k: '「じぶんの くにの ものだ」と いう', fx: ['self.stability+s', 'self.rep-s', 'world.tension+s'] },
  ],
  // 感染症・薬・食の安全
  outbreak: [
    { id: 'health_team', pop: -3, n: '医療チームを送る', k: 'おいしゃさんを おくる', fx: ['self.fiscal-s', 'self.rep+s', 'who.stability+s', 'rel.tgt+s'] },
    { id: 'health_close', pop: 2, n: '国境を閉じる', k: 'くにの もんを しめる', fx: ['self.capital-s', 'self.stability+s'] },
    { id: 'health_open', pop: -2, n: '薬の作り方を公開する', k: 'くすりの つくりかたを みんなに おしえる', fx: ['self.tech-s', 'self.rep+m', 'world.trust+s'] },
    { id: 'health_hoard', pop: 3, n: '薬を自国の分だけ確保する', k: 'くすりを じぶんの くにの ぶんだけ あつめる', fx: ['self.fiscal-s', 'self.stability+s', 'self.rep-m'] },
  ],
  // 自然災害・復興
  disaster: [
    { id: 'dis_rescue', pop: -3, n: '救援を送る', k: 'たすけに いく', fx: ['self.fiscal-s', 'self.rep+s', 'who.stability+s', 'rel.tgt+s'] },
    { id: 'dis_prepare', pop: 2, n: '自国の備えを固める', k: 'じぶんの くにの そなえを する', fx: ['self.security+s', 'self.fiscal-s', 'self.stability+s'] },
    { id: 'dis_donate', pop: -1, n: '国民に募金を呼びかける', k: 'みんなに ぼきんを よびかける', fx: ['self.capital-s', 'self.rep+s', 'who.stability+s'] },
    { id: 'dis_contract', pop: 3, n: '復興の工事を自国の企業で請け負う', k: 'たてなおしの しごとを じぶんの くにの かいしゃが もらう', fx: ['self.capital+s', 'self.gnp+s', 'self.rep-s', 'rel.tgt-s'] },
  ],
  // 事故（原発・工場・システム）
  accident: [
    { id: 'ac_help', pop: -2, n: '専門家を送る', k: 'せんもんかを おくる', fx: ['self.fiscal-s', 'self.rep+s', 'who.stability+s'] },
    { id: 'ac_ban', pop: 3, n: 'その国からの輸入を止める', k: 'その くにの ものを かわない', fx: ['self.stability+s', 'rel.tgt-s', 'self.rep-s'] },
    { id: 'ac_check', pop: 2, n: '自国の施設を総点検する', k: 'じぶんの くにを ぜんぶ てんけん する', fx: ['self.fiscal-s', 'self.security+s'] },
    { id: 'ac_rule', pop: -1, n: '安全の国際ルールを作る', k: 'あんぜんの きまりを みんなで つくる', fx: ['self.industry-s', 'self.rep+s', 'world.trust+s'] },
  ],
  // サイバー・情報
  cyber: [
    { id: 'cy_guard', pop: 2, n: '自国のネットの守りを固める', k: 'じぶんの くにの ねっとを まもる', fx: ['self.fiscal-s', 'self.security+s'] },
    { id: 'cy_rule', pop: -2, n: '各国でネットのルールを作る', k: 'みんなで ねっとの きまりを つくる', fx: ['self.security-s', 'self.rep+s', 'world.trust+s'] },
    { id: 'cy_counter', pop: 3, n: 'やり返す力を持つ', k: 'やりかえす ちからを もつ', fx: ['self.tech+s', 'self.rep-s', 'world.tension+s'] },
    { id: 'cy_open', pop: -1, n: '情報を公開して説明する', k: 'ほんとうの ことを みんなに はなす', fx: ['self.rep+s', 'self.stability-s'] },
  ],
  // 新しい技術（AI・遺伝子・自動化・特許）
  frontier: [
    { id: 'tech_invest', pop: -1, n: '研究に投資する', k: 'けんきゅうに おかねを だす', fx: ['self.fiscal-s', 'self.tech+s'] },
    { id: 'tech_rule', pop: 1, n: 'ルールを作って慎重に', k: 'きまりを つくって ようじんする', fx: ['self.stability+s', 'self.industry-s'] },
    { id: 'tech_secret', pop: 2, n: '技術を国の秘密にする', k: 'ぎじゅつを くにの ひみつに する', fx: ['self.tech+s', 'self.rep-s', 'world.trust-s'] },
    { id: 'tech_share', pop: -2, n: '技術を世界と共有する', k: 'ぎじゅつを せかいと わけあう', fx: ['self.tech-s', 'self.rep+s', 'world.trust+s'] },
  ],
  // 宇宙
  space: [
    { id: 'spc_race', pop: 3, n: '負けじと宇宙開発を急ぐ', k: 'まけずに うちゅうを めざす', fx: ['self.fiscal-m', 'self.tech+s', 'world.tension+s'] },
    { id: 'spc_joint', pop: -2, n: '共同の計画を提案する', k: 'みんなで いっしょに やろうと いう', fx: ['self.fiscal-s', 'self.rep+s', 'world.tension-s'] },
    { id: 'spc_guard', pop: 2, n: '宇宙の守りを固める', k: 'うちゅうの まもりを かためる', fx: ['self.soldiers+s', 'self.rep-s', 'world.tension+s'] },
    { id: 'spc_rule', pop: -1, n: '宇宙のルール作りを呼びかける', k: 'うちゅうの きまりを よびかける', fx: ['self.capital-s', 'self.rep+s', 'world.trust+s'] },
  ],
  // 人口・都市・人の流れ
  population: [
    { id: 'soc_open', pop: -2, n: '外国から来る人に門を開く', k: 'よその くにから くる ひとを むかえる', fx: ['self.gnp+s', 'self.stability-s', 'self.ethnic+s'] },
    { id: 'soc_fund', pop: 2, n: '国内の暮らしの支えに予算を出す', k: 'じぶんの くにの くらしに おかねを だす', fx: ['self.fiscal-s', 'self.stability+s', 'self.inequality-s'] },
    { id: 'pp_aid', pop: -2, n: '困っている国を手伝う', k: 'こまって いる くにを てつだう', fx: ['self.fiscal-s', 'self.rep+s', 'who.stability+s'] },
    { id: 'soc_careful', pop: 2, n: '慎重に構える', k: 'ようすを みる', fx: ['self.stability+s', 'self.rep-s'] },
  ],
  // 犯罪（麻薬・人身売買）
  crime: [
    { id: 'cm_crack', pop: 3, n: '強硬に取り締まる', k: 'つよく とりしまる', fx: ['self.security+s', 'self.rep-s'] },
    { id: 'cm_joint', pop: -1, n: '各国と合同で捜査する', k: 'みんなで いっしょに しらべる', fx: ['self.fiscal-s', 'self.rep+s', 'world.conflicts-s'] },
    { id: 'cm_root', pop: -2, n: '貧しさという根っこに手を打つ', k: 'まずしさを なくす てつだいを する', fx: ['self.fiscal-s', 'poorBg.econ+s', 'self.rep+s'] },
    { id: 'cm_wall', pop: 2, n: '国境の警備を固める', k: 'くにの さかいを まもる', fx: ['self.security+s', 'self.capital-s'] },
  ],
  // 国際機関・条約
  un: [
    { id: 'intl_support', pop: -2, n: '支持する', k: 'さんせいする', fx: ['self.fiscal-s', 'self.rep+s', 'world.trust+s'] },
    { id: 'intl_distance', pop: 2, n: '距離を置く', k: 'はんたいする', fx: ['self.fiscal+s', 'self.rep-s', 'world.trust-s'] },
    { id: 'intl_lead', pop: -3, n: '議論のまとめ役を買って出る', k: 'みんなの まとめやくに なる', fx: ['self.fiscal-m', 'self.rep+m', 'world.trust+s'] },
    { id: 'intl_terms', pop: 3, n: '自国に有利な条件をつける', k: 'じぶんの くにに いい じょうけんを つける', fx: ['self.capital+s', 'world.trust-s', 'rel.all-s'] },
  ],
  // 国の集まりができる・まとまる
  bloc: [
    { id: 'dip_welcome', pop: -1, n: '歓迎の声明を出す', k: 'よかったねと いう', fx: ['self.security-s', 'self.rep+s', 'rel.tgt+s', 'world.tension-s'] },
    { id: 'dip_guard', pop: 2, n: '警戒する', k: 'ようじんする', fx: ['self.soldiers+s', 'self.security+s', 'rel.tgt-s'] },
    { id: 'dip_join', pop: -2, n: '自分も輪に加わる', k: 'じぶんも なかまに いれて もらう', fx: ['self.fiscal-s', 'rel.tgt+m', 'world.tension-s'] },
    { id: 'dip_both', pop: 2, n: 'どちらともうまく付き合って得をする', k: 'どちらとも なかよく して とくを する', fx: ['self.capital+s', 'self.rep-s'] },
  ],
  // ニュースの対象が自国のとき
  self: [
    { id: 'self_listen', pop: 3, n: '国民に寄りそう', k: 'みんなの はなしを きく', fx: ['self.stability+s', 'self.fiscal-s'] },
    { id: 'self_strong', pop: 1, n: '強い態度で乗り切る', k: 'つよい たいどで のりきる', fx: ['self.security+s', 'self.rep-s'] },
    { id: 'self_help', pop: -2, n: '外国に助けを求める', k: 'よその くにに たすけて もらう', fx: ['self.capital+s', 'self.rep-s', 'self.stability-s'] },
    { id: 'self_sorry', pop: -1, n: '失敗を認めて謝る', k: 'まちがいを みとめて あやまる', fx: ['self.rep+s', 'self.stability-s'] },
  ],
};

// ニュースごとの状況の種類（ここにないニュースは CAT_KIND で決める）
export const KIND_OF = {
  // 軍事
  E02: 'nuke', E61: 'nuke', E68: 'nuke', E12: 'war', E13: 'war', E28: 'war', E66: 'war', E67: 'war', E71: 'war', E120: 'war',
  E58: 'tension', E69: 'tension', E87: 'tension', E109: 'tension', E135: 'tension', E15: 'armed', E70: 'armed', E110: 'armed', E14: 'armed',
  // 経済
  E03: 'boom', E07: 'boom', E40: 'boom', E08: 'crisis', E16: 'crisis', E32: 'crisis', E33: 'crisis', E34: 'crisis', E35: 'crisis', E36: 'crisis',
  E102: 'crisis', E116: 'crisis', E119: 'crisis', E148: 'crisis', E31: 'supply', E38: 'supply', E39: 'supply', E42: 'supply',
  E37: 'trade', E104: 'trade', E64: 'trade', E103: 'money', E117: 'money', E118: 'money', E142: 'money',
  // 食べもの・水
  E04: 'food', E122: 'food', E101: 'food', E05: 'frontier', E23: 'water', E24: 'water', E25: 'water', E27: 'water', E53: 'water', E114: 'water',
  // よい知らせ
  E123: 'good', E47: 'good', E56: 'good', E73: 'good', E80: 'good', E138: 'good', E41: 'rush',
  // 環境
  E22: 'climate', E55: 'climate', E82: 'climate', E86: 'climate', E98: 'climate', E115: 'climate', E133: 'climate',
  E06: 'nature', E57: 'nature', E89: 'nature', E94: 'nature', E95: 'nature', E96: 'nature', E97: 'nature', E105: 'nature', E126: 'nature', E127: 'nature',
  E99: 'refugee', E19: 'refugee', E65: 'refugee',
  // 内政
  E09: 'unrest', E17: 'unrest', E60: 'unrest', E63: 'unrest', E121: 'unrest', E124: 'unrest', E149: 'unrest',
  E62: 'reform', E72: 'reform', E59: 'reform',
  // 資源・極地・宇宙
  E11: 'rush', E81: 'rush', E85: 'rush', E88: 'rush', E134: 'space', E136: 'rush', E83: 'un', E84: 'un', E79: 'space', E108: 'space',
  // 健康・災害・技術
  E43: 'outbreak', E44: 'outbreak', E45: 'outbreak', E46: 'outbreak', E100: 'outbreak', E129: 'outbreak', E144: 'outbreak',
  E48: 'disaster', E50: 'disaster', E51: 'disaster', E52: 'disaster', E54: 'disaster', E145: 'disaster', E146: 'disaster', E147: 'disaster', E125: 'disaster',
  E49: 'accident', E128: 'accident', E130: 'accident',
  E74: 'cyber', E75: 'cyber', E76: 'cyber', E106: 'cyber', E107: 'cyber', E137: 'cyber',
  E77: 'frontier', E78: 'frontier', E131: 'frontier', E132: 'frontier', E139: 'frontier', E140: 'frontier',
  // 社会・国際
  E90: 'population', E91: 'population', E111: 'population', E92: 'population', E93: 'population', E141: 'population', E143: 'population', E112: 'crime', E113: 'crime',
  E18: 'un', E21: 'un', E26: 'un', E20: 'bloc',
};
export const CAT_KIND = { eco: 'crisis', fw: 'food', env: 'climate', polar: 'rush', res: 'rush', health: 'outbreak', disaster: 'disaster', mil: 'war', dom: 'unrest', dip: 'bloc', intl: 'un', tech: 'frontier', future: 'frontier', society: 'population' };
export const kindOf = (ev) => KIND_OF[ev.id] || CAT_KIND[ev.cat] || null;

// 状況しだいの3つめ（▲ 上にふる）・4つめ（▼ 下にふる）。当てはまったものから最大2つ（上から順）
// when(g, me, e, h)：me＝自国、e＝ニュースのカード（react＝状況の種類）、h＝{ allied, rel, isSeat, neighbors }
// chance：当てはまっても出る確率（なければ必ず出る）
const K = (...kinds) => (e) => kinds.includes(e.react);
const B = (me, base) => (me.bases || []).includes(base);
export const SPECIAL = [
  { id: 'sp_ally', pop: -2, n: '同盟国として全面支援する', k: 'なかまの くにとして ぜんりょくで たすける', fx: ['self.fiscal-m', 'who.stability+m', 'rel.tgt+m'],
    when: (g, me, e, h) => e.react !== 'self' && e.who && e.who !== me.id && h.isSeat(g, e.who) && h.allied(g, me.id, e.who) },
  { id: 'sp_rival', pop: 3, n: 'この機に乗じる', k: 'この すきに とくを する', fx: ['self.capital+m', 'rel.tgt-m', 'self.rep-m', 'world.tension+s'],
    when: (g, me, e, h) => e.react !== 'self' && e.who && e.who !== me.id && h.isSeat(g, e.who) && h.rel(g, me.id, e.who) <= 30 },
  { id: 'sp_border', pop: 2, n: '国境の守りを固める', k: 'くにの さかいの まもりを かためる', fx: ['self.security+m', 'self.soldiers+s', 'self.fiscal-s', 'rel.tgt-s'], chance: 0.6,
    when: (g, me, e, h) => K('war', 'unrest', 'refugee', 'armed', 'outbreak', 'tension', 'crime')(e) && e.who && e.who !== me.id && h.neighbors(me.id).includes(e.who) },
  { id: 'sp_home', pop: 3, n: 'いまは国内で手一杯だと言う', k: 'いまは じぶんの くにで せいいっぱいと いう', fx: ['self.stability+s', 'self.rep-s'],
    when: (g, me, e) => e.react !== 'self' && me.stats.stability < 35 },
  { id: 'sp_mood', pop: 4, n: '国民の機嫌を取る手を優先する', k: 'くにの みんなの きげんを とる', fx: ['self.fiscal-m', 'self.stability+s', 'self.rep-s'],
    when: (g, me) => (me.mood ?? 50) <= 35 },
  { id: 'sp_nuke', pop: 3, n: '核の抑止をちらつかせる', k: '「かくへいきが あるぞ」と いう', fx: ['self.security+s', 'self.rep-m', 'world.tension+m'],
    when: (g, me, e) => K('war', 'nuke', 'tension')(e) && me.stats.nuke >= 4 },
  { id: 'sp_army', pop: 2, n: '軍を送って鎮める', k: 'ぐんたいを おくって しずめる', fx: ['self.soldiers-s', 'who.stability+s', 'rel.tgt-s', 'world.tension+s'], chance: 0.5,
    when: (g, me, e) => K('war', 'unrest', 'armed', 'disaster')(e) && e.who && e.who !== me.id && (me.stats.soldiers >= 100 || me.stats.bases >= 6) },
  { id: 'sp_oil', pop: 3, n: '資源を武器に交渉する', k: 'しげんを つかって こうしょう する', fx: ['self.capital+m', 'self.rep-s', 'world.tension+s'], chance: 0.6,
    when: (g, me, e) => K('crisis', 'supply', 'rush', 'trade')(e) && me.stats.oil >= 70 },
  // 自国の基本政策（国のやりかた）に合った選択肢。基本政策を持っていて、ニュースの状況が合うとき
  { id: 'bs_tech', pop: 1, n: 'わが国の技術で手を打つ', k: 'じぶんの くにの ぎじゅつで てを うつ', fx: ['self.fiscal-s', 'self.tech+s', 'self.rep+s'], chance: 0.7,
    when: (g, me, e) => B(me, 'B01') && K('climate', 'nature', 'outbreak', 'frontier', 'good', 'water', 'food', 'accident', 'cyber', 'space', 'supply')(e) },
  { id: 'bs_edu', pop: -1, n: '学ぶ機会を広げて、長い目で手を打つ', k: 'まなぶ ばしょを ふやして、ながい めで てを うつ', fx: ['self.fiscal-s', 'self.literacy+s', 'self.rep+s'], chance: 0.7,
    when: (g, me, e) => B(me, 'B02') && K('unrest', 'refugee', 'population', 'crime', 'armed', 'food', 'good', 'frontier')(e) },
  { id: 'bs_trade', pop: 2, n: '物の流れを仕切ってかせぐ', k: 'ものの ながれを まとめて かせぐ', fx: ['self.capital+s', 'rel.all-s', 'world.tension+s'], chance: 0.7,
    when: (g, me, e) => B(me, 'B03') && K('crisis', 'supply', 'trade', 'money', 'bloc', 'rush')(e) },
  { id: 'bs_order', pop: 2, n: '警察と見回りを増やす', k: 'おまわりさんを ふやす', fx: ['self.security+m', 'self.fiscal-s'], chance: 0.7,
    when: (g, me, e) => B(me, 'B04') && K('armed', 'crime', 'unrest', 'refugee', 'outbreak', 'disaster', 'cyber')(e) },
  { id: 'bs_firm', pop: 2, n: '企業を呼びこむ好機にする', k: 'かいしゃを よびこむ いい きかいに する', fx: ['self.industry+s', 'self.inequality+s'], chance: 0.7,
    when: (g, me, e) => B(me, 'B05') && K('crisis', 'boom', 'trade', 'money', 'reform', 'frontier', 'supply')(e) },
  { id: 'bs_rate', pop: 2, n: '金利を上げてお金を集める', k: 'りしを あげて おかねを あつめる', fx: ['self.capital+m', 'self.rep-s'], chance: 0.7,
    when: (g, me, e) => B(me, 'B06') && K('crisis', 'boom', 'money')(e) },
  { id: 'bs_diplo', pop: -1, n: '外交で橋わたしをする', k: 'あいだに はいって なかを とりもつ', fx: ['self.fiscal-s', 'self.rep+m', 'world.tension-s'], chance: 0.7,
    when: (g, me, e) => B(me, 'B07') && K('war', 'tension', 'nuke', 'unrest', 'bloc', 'un', 'trade')(e) },
  { id: 'bs_farm', pop: -1, n: '自慢の農業で力を貸す', k: 'じまんの はたけで ちからを かす', fx: ['self.food-s', 'self.rep+m', 'poorBg.food+s'], chance: 0.7,
    when: (g, me, e) => B(me, 'B08') && K('food', 'water', 'climate', 'disaster', 'refugee', 'nature')(e) },
  { id: 'bs_dig', pop: 3, n: '自国の資源を増産する', k: 'じぶんの くにの しげんを たくさん ほる', fx: ['self.oil+s', 'self.gnp+s', 'self.co2+s'], chance: 0.7,
    when: (g, me, e) => B(me, 'B09') && K('crisis', 'supply', 'rush', 'climate', 'trade')(e) },
  { id: 'sp_rich', pop: -1, n: 'お金で片をつける', k: 'おかねで かいけつする', fx: ['self.capital-m', 'self.rep+s', 'world.trust+s'], chance: 0.5,
    when: (g, me, e) => e.react !== 'self' && me.stats.capital >= 85 },
];

// 前の版のセーブ（状況の種類ではなく、ニュースの種類で山を持っていた）
const LEGACY = { eco: 'crisis', fw: 'food', env: 'climate', polar: 'rush', res: 'rush', health: 'outbreak', mil: 'war', dom: 'unrest', dip: 'bloc', intl: 'un', tech: 'frontier', future: 'frontier', society: 'population' };
export const poolOf = (react) => REACTIONS[react] || REACTIONS[LEGACY[react]] || null;

export const OPTION_BY_ID = Object.fromEntries([...new Set(Object.values(REACTIONS).flat()), ...SPECIAL].map((o) => [o.id, o]));

// ニュースの種類の見た目
export const NEWS_ICON = { eco: '💹', fw: '🌾', env: '🌳', polar: '🧊', res: '🛢', health: '🏥', disaster: '🌋', mil: '⚔', dom: '🏛', dip: '🤝', intl: '🇺🇳', tech: '🔬', future: '🚀', society: '👥', start: '🌏', misc: '📰' };
export const NEWS_CAT = {
  eco: ['経済', 'おかね'], fw: ['食糧・水', 'たべもの・みず'], env: ['環境', 'しぜん'], polar: ['極地', 'なんきょく・ほっきょく'], res: ['資源', 'しげん'],
  health: ['健康', 'びょうき'], disaster: ['災害', 'さいがい'], mil: ['紛争', 'けんか'], dom: ['内政', 'くにの なか'], dip: ['外交', 'なかよし'],
  intl: ['国際機関', 'せかいの あつまり'], tech: ['技術', 'ぎじゅつ'], future: ['未来', 'みらい'], society: ['社会', 'くらし'], start: ['はじまり', 'はじまり'], misc: ['報道', 'にゅーす'],
};
