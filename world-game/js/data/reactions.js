// ニュースへの反応：ニュースのカードをめくったら、Reigns のように左右の2択で自国の態度を決める
// ニュースの種類（cat）ごとに [左, 右]。n：おとな向けの名前、k：1ねんせい向け、fx：効果（self：自国、who：ニュースの対象国、rel.tgt：対象国との関係）
// どちらにも得と損があり、合計はおおむね釣り合う（ニュースを読んで、いまの自国に合うほうを選ぶ）
// self：ニュースの対象が自国のときに使う組
export const REACTIONS = {
  eco: [
    { n: '自国の市場を守る', k: 'じぶんの くにを まもる', fx: ['self.capital+s', 'self.rep-s', 'world.trust-s'] },
    { n: '各国と協調して支える', k: 'みんなで ささえる', fx: ['self.fiscal-s', 'self.rep+s', 'world.trust+s'] },
  ],
  fw: [
    { n: '食糧と水を送る', k: 'たべものと みずを おくる', fx: ['self.food-s', 'self.rep+s', 'poorBg.food+s'] },
    { n: '自国の備蓄を増やす', k: 'じぶんの くにに ためて おく', fx: ['self.food+s', 'self.water+s', 'self.rep-s'] },
  ],
  env: [
    { n: '対策に予算を出す', k: 'ちきゅうの ために おかねを だす', fx: ['self.fiscal-s', 'self.co2-s', 'world.co2-s'] },
    { n: '経済を優先する', k: 'おかねもうけを さきに する', fx: ['self.gnp+s', 'self.co2+s', 'world.co2+s'] },
  ],
  polar: [
    { n: '保護を呼びかける', k: 'そっと して おこうと いう', fx: ['self.fiscal-s', 'self.rep+s', 'world.tension-s'] },
    { n: '開発に名乗りをあげる', k: 'じぶんも ほりに いく', fx: ['self.oil+s', 'self.rep-s', 'world.tension+s'] },
  ],
  res: [
    { n: '共同管理を提案する', k: 'みんなで わけようと いう', fx: ['self.oil-s', 'self.rep+s', 'world.tension-s'] },
    { n: '確保に動く', k: 'じぶんの ものに する', fx: ['self.oil+s', 'self.capital+s', 'self.rep-s', 'world.tension+s'] },
  ],
  health: [
    { n: '医療チームを送る', k: 'おいしゃさんを おくる', fx: ['self.fiscal-s', 'self.rep+s', 'who.stability+s', 'rel.tgt+s'] },
    { n: '国境を閉じる', k: 'くにの もんを しめる', fx: ['self.capital-s', 'self.stability+s'] },
  ],
  disaster: [
    { n: '救援を送る', k: 'たすけに いく', fx: ['self.fiscal-s', 'self.rep+s', 'who.stability+s', 'rel.tgt+s'] },
    { n: '自国の備えを固める', k: 'じぶんの くにの そなえを する', fx: ['self.security+s', 'self.fiscal-s', 'self.stability+s'] },
  ],
  mil: [
    { n: '仲裁に入る', k: 'なかなおりを てつだう', fx: ['self.fiscal-s', 'self.rep+s', 'world.tension-s'] },
    { n: '軍備を固める', k: 'ぐんたいを ふやす', fx: ['self.soldiers+s', 'self.security+s', 'world.tension+s'] },
  ],
  dom: [
    { n: '支援を申し出る', k: 'たすけに いく', fx: ['self.fiscal-s', 'who.stability+s', 'rel.tgt+s'] },
    { n: '関わらない', k: 'かかわらない', fx: ['self.security+s', 'rel.tgt-s'] },
  ],
  dip: [
    { n: '歓迎の声明を出す', k: 'よかったねと いう', fx: ['self.security-s', 'self.rep+s', 'rel.tgt+s', 'world.tension-s'] },
    { n: '警戒する', k: 'ようじんする', fx: ['self.soldiers+s', 'self.security+s', 'rel.tgt-s'] },
  ],
  intl: [
    { n: '支持する', k: 'さんせいする', fx: ['self.fiscal-s', 'self.rep+s', 'world.trust+s'] },
    { n: '距離を置く', k: 'はんたいする', fx: ['self.fiscal+s', 'self.rep-s', 'world.trust-s'] },
  ],
  tech: [
    { n: '研究に投資する', k: 'けんきゅうに おかねを だす', fx: ['self.fiscal-s', 'self.tech+s'] },
    { n: 'ルールを作って慎重に', k: 'きまりを つくって ようじんする', fx: ['self.stability+s', 'self.industry-s'] },
  ],
  society: [
    { n: '受け入れる', k: 'うけいれる', fx: ['self.rep+s', 'self.stability-s'] },
    { n: '慎重に構える', k: 'ようすを みる', fx: ['self.stability+s', 'self.rep-s'] },
  ],
  self: [
    { n: '国民に寄りそう', k: 'みんなの はなしを きく', fx: ['self.stability+s', 'self.fiscal-s'] },
    { n: '強い態度で乗り切る', k: 'つよい たいどで のりきる', fx: ['self.security+s', 'self.rep-s'] },
  ],
};
REACTIONS.future = REACTIONS.tech;

// ニュースの種類の見た目
export const NEWS_ICON = { eco: '💹', fw: '🌾', env: '🌳', polar: '🧊', res: '🛢', health: '🏥', disaster: '🌋', mil: '⚔', dom: '🏛', dip: '🤝', intl: '🇺🇳', tech: '🔬', future: '🚀', society: '👥', start: '🌏', misc: '📰' };
export const NEWS_CAT = {
  eco: ['経済', 'おかね'], fw: ['食糧・水', 'たべもの・みず'], env: ['環境', 'しぜん'], polar: ['極地', 'なんきょく・ほっきょく'], res: ['資源', 'しげん'],
  health: ['健康', 'びょうき'], disaster: ['災害', 'さいがい'], mil: ['紛争', 'けんか'], dom: ['内政', 'くにの なか'], dip: ['外交', 'なかよし'],
  intl: ['国際機関', 'せかいの あつまり'], tech: ['技術', 'ぎじゅつ'], future: ['未来', 'みらい'], society: ['社会', 'くらし'], start: ['はじまり', 'はじまり'], misc: ['報道', 'にゅーす'],
};
