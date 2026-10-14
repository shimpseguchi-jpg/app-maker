// 情勢：ニュース（世界イベント）が起きると、しばらくのあいだ関係する政策の成功率が上下する
// cats：政策のカテゴリ、pols：個別の政策、mod：成功率の増減、years：続く年数（暦の年）
// scope：all＝すべての国、who＝ニュースの対象国だけ、others＝対象国以外
export const SITUATIONS = {
  // 経済
  E32: [{ cats: ['eco'], mod: -10, years: 3, scope: 'all' }],
  E116: [{ cats: ['eco'], pols: ['P05', 'P51'], mod: -15, years: 4, scope: 'all' }],
  E37: [{ pols: ['P05', 'P06', 'P51'], mod: -10, years: 3, scope: 'all' }],
  E31: [{ pols: ['P13', 'P85', 'P20'], mod: 10, years: 3, scope: 'all' }, { cats: ['eco'], mod: -5, years: 3, scope: 'all' }],
  E41: [{ pols: ['P20', 'P24'], mod: -10, years: 4, scope: 'all' }],
  E34: [{ cats: ['eco'], mod: -10, years: 3, scope: 'who' }],
  E35: [{ cats: ['eco'], mod: -15, years: 3, scope: 'who' }],
  // 健康
  E43: [{ pols: ['P81', 'P110', 'P111'], mod: 10, years: 3, scope: 'all' }, { pols: ['P05', 'P06', 'P11', 'P42', 'P51'], mod: -10, years: 3, scope: 'all' }],
  E100: [{ pols: ['P99', 'P81'], mod: 10, years: 4, scope: 'all' }],
  // 食糧・水・環境
  E04: [{ pols: ['P31', 'P14'], mod: 10, years: 2, scope: 'all' }],
  E22: [{ pols: ['P30', 'P32'], mod: -10, years: 3, scope: 'all' }, { pols: ['P33', 'P91'], mod: 10, years: 3, scope: 'all' }],
  E23: [{ pols: ['P30', 'P32', 'P35'], mod: -10, years: 3, scope: 'all' }],
  E86: [{ cats: ['fw'], mod: -5, years: 4, scope: 'all' }, { pols: ['P91', 'P97'], mod: 10, years: 4, scope: 'all' }],
  E94: [{ pols: ['P97', 'P98'], mod: 10, years: 4, scope: 'all' }],
  // 紛争・治安
  E12: [{ pols: ['P55', 'P116'], mod: 10, years: 3, scope: 'all' }],
  E13: [{ pols: ['P55', 'P116', 'P66'], mod: 10, years: 3, scope: 'all' }, { cats: ['eco'], mod: -5, years: 3, scope: 'all' }],
  E14: [{ pols: ['P44', 'P40'], mod: 10, years: 3, scope: 'who' }, { pols: ['P42', 'P05'], mod: -10, years: 3, scope: 'who' }],
  E17: [{ pols: ['P55', 'P116', 'P56'], mod: 10, years: 3, scope: 'all' }],
  E62: [{ cats: ['dom'], mod: -10, years: 3, scope: 'who' }],
  E66: [{ cats: ['dip'], mod: -15, years: 4, scope: 'who' }, { pols: ['P54', 'P64'], mod: 10, years: 4, scope: 'others' }],
  E106: [{ cats: ['dom', 'intl'], mod: -5, years: 3, scope: 'all' }, { pols: ['P101'], mod: 10, years: 3, scope: 'all' }],
  // 災害・事故
  E48: [{ cats: ['eco'], mod: -10, years: 3, scope: 'who' }],
  E49: [{ pols: ['P85'], mod: -20, years: 5, scope: 'all' }, { pols: ['P86'], mod: 10, years: 5, scope: 'all' }],
  // 国際機関
  E26: [{ pols: ['P70', 'P71', 'P56'], mod: -10, years: 4, scope: 'all' }, { pols: ['P72'], mod: 10, years: 4, scope: 'all' }],
  // 協調の成功例（協調ムード）
  E47: [{ cats: ['dip', 'intl'], mod: 10, years: 5, scope: 'all' }],
  E56: [{ cats: ['dip', 'intl'], mod: 10, years: 5, scope: 'all' }],
  E80: [{ cats: ['dip', 'intl'], mod: 10, years: 5, scope: 'all' }],
  E84: [{ cats: ['dip', 'intl'], mod: 10, years: 5, scope: 'all' }],
  E123: [{ cats: ['fw'], mod: 10, years: 5, scope: 'all' }],
  E125: [{ cats: ['dip'], mod: 10, years: 5, scope: 'all' }],
  // 技術
  E73: [{ cats: ['edu'], mod: 5, years: 5, scope: 'all' }, { pols: ['P88'], mod: -10, years: 5, scope: 'all' }],
  E131: [{ cats: ['edu'], mod: 15, years: 5, scope: 'who' }],
  E138: [{ cats: ['res'], mod: 10, years: 5, scope: 'all' }],
};
