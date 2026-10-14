// 世界議会の議題：それまでに起きたニュース（の種類）に関係するものを中心に3つが候補になる
// プレイヤーが1つを選んで提出 → 各国が賛成・反対を決める（プレイヤーも）。全会一致で可決＝世界統一
// cats：関係するニュースの種類、likes／dislikes：賛成しやすい／しにくい AI の性格
// lose(c)：可決されると損をする国（反対しやすい。可決されると国力が下がる）、gain(c)：得をする国
// who：損をする国の説明 [おとな, 1ねんせい]
export const AGENDAS = {
  water: {
    name: '水管理法の世界同時撤廃', kid: 'みずを だれでも のめるように する', cats: ['fw'], likes: ['edu', 'trade'], dislikes: ['finance'],
    lose: (c) => c.stats.water >= 75, gain: (c) => c.stats.water <= 35, who: ['水の豊かな国', 'みずが たくさん ある くに'],
  },
  nukes: {
    name: '核兵器の全廃', kid: 'かくへいきを ぜんぶ なくす', cats: ['mil'], likes: ['edu', 'tech'], dislikes: ['ambition', 'order'],
    lose: (c) => c.stats.nuke >= 3, gain: () => false, who: ['核を持つ国', 'かくへいきを もって いる くに'],
  },
  trade: {
    name: '関税の世界的撤廃', kid: 'くにの あいだの ぜいきんを なくす', cats: ['eco'], likes: ['trade', 'finance'], dislikes: ['order'],
    lose: (c) => c.stats.industry < 40, gain: (c) => c.stats.industry >= 70, who: ['産業の弱い国', 'こうじょうが すくない くに'],
  },
  climate: {
    name: '温室効果ガスの一律削減', kid: 'ちきゅうを あたためる けむりを みんなで へらす', cats: ['env'], likes: ['edu', 'tech'], dislikes: ['ambition'],
    lose: (c) => c.stats.co2 >= 60, gain: (c) => c.stats.altE >= 40, who: ['CO₂を多く出す国', 'けむりを たくさん だす くに'],
  },
  refugees: {
    name: '難民の共同受け入れ', kid: 'にげてきた ひとを みんなで うけいれる', cats: ['society', 'dom'], likes: ['edu', 'trade'], dislikes: ['order'],
    lose: (c) => c.stats.stability < 45, gain: () => false, who: ['政情の不安定な国', 'ぐらぐら して いる くに'],
  },
  health: {
    name: '世界保健機関への強い権限', kid: 'びょうきと たたかう せかいの あつまりを つよく する', cats: ['health'], likes: ['edu', 'tech'], dislikes: ['order'],
    lose: (c) => c.stats.capital >= 75, gain: (c) => c.stats.literacy < 85, who: ['費用を多く負担する豊かな国', 'おかねを たくさん だす くに'],
  },
  polar: {
    name: '極地の開発禁止と共同管理', kid: 'なんきょくと ほっきょくを みんなで まもる', cats: ['polar', 'res'], likes: ['edu'], dislikes: ['ambition', 'finance'],
    lose: (c) => !!(c.polar || c.flags?.polar), gain: () => false, who: ['極地に権利を持つ国', 'なんきょくや ほっきょくに ちかい くに'],
  },
  debt: {
    name: '貧しい国の債務の一斉帳消し', kid: 'まずしい くにの しゃっきんを なしに する', cats: ['eco'], likes: ['edu', 'trade'], dislikes: ['finance'],
    lose: (c) => c.stats.capital >= 70, gain: (c) => c.stats.debt >= 150, who: ['お金を貸している国', 'おかねを かして いる くに'],
  },
  army: {
    name: '世界軍の創設と各国軍の縮小', kid: 'せかいの ぐんたいを つくって、くにの ぐんたいを へらす', cats: ['mil', 'dom'], likes: ['edu', 'trade'], dislikes: ['ambition', 'order'],
    lose: (c) => c.stats.bases >= 6 || c.stats.soldiers >= 100, gain: () => false, who: ['大きな軍を持つ国', 'ぐんたいが おおきい くに'],
  },
  tech: {
    name: '先端技術（AI・遺伝子）の共同ルール', kid: 'あたらしい ぎじゅつの きまりを みんなで つくる', cats: ['tech', 'future'], likes: ['edu', 'order'], dislikes: ['tech'],
    lose: (c) => c.stats.tech >= 80, gain: (c) => c.stats.tech < 45, who: ['技術の進んだ国', 'ぎじゅつが すすんだ くに'],
  },
  food: {
    name: '世界食糧備蓄と価格の安定', kid: 'せかいで たべものを ためて わけあう', cats: ['fw', 'disaster'], likes: ['edu', 'order'], dislikes: ['finance'],
    lose: (c) => c.stats.food >= 130, gain: (c) => c.stats.food < 70, who: ['食糧を輸出する国', 'たべものを うって いる くに'],
  },
  rescue: {
    name: '世界災害救助隊の創設', kid: 'さいがいの ときに たすけあう ちーむを つくる', cats: ['disaster', 'env'], likes: ['edu', 'trade', 'order'], dislikes: [],
    lose: (c) => c.stats.fiscal <= -5, gain: () => false, who: ['財政の苦しい国', 'おさいふが くるしい くに'],
  },
};
// いつも候補に入りうる3つ（関係するニュースが少ないときの穴うめ）
export const AGENDA_BASE = ['climate', 'nukes', 'trade'];
// 可決されたときの効果：損をする国・得をする国
export const AGENDA_LOSE_FX = ['self.gnp-m', 'self.stability-s'];
export const AGENDA_GAIN_FX = ['self.gnp+s', 'self.stability+s'];
export const KID_AGENDAS = Object.fromEntries(Object.entries(AGENDAS).map(([k, a]) => [k, a.kid]));
