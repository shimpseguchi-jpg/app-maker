// シナジー（属性の重複・組み合わせで発動する効果）
//
// kind:
//   count    … tag を持つメンバーが n 人以上（tiers は少ない順。満たす最大の段階だけ発動）
//   combo    … all のタグがそれぞれ「別のメンバー」で満たされる（同じ人が2つ持っていても1人分）
//   distinct … cat のタグが何種類そろったか（例：イメージカラーが5色以上）
//
// effects（全種類共通。js/engine/party.js が解釈する）
//   { type: 'stat', stat, add | pct, to }   能力値の加算（add）／割合（pct, %）
//   { type: 'ability', id, name, text, to } 戦闘・探索で参照する特殊能力（中身は今後の戦闘エンジンで実装）
//   to: party(全員) / holders(条件のタグ持ち) / front(前列) / back(後列)。省略時 party
//   stat: pow vo men sta dan vis（基本）／ hp atk mat def res hit eva spd crit（派生）

export const SYNERGIES = [];
function def(s) { SYNERGIES.push(s); }
const st = (stat, v, to = 'party', isPct = false) => ({ type: 'stat', stat, [isPct ? 'pct' : 'add']: v, to });
const pct = (stat, v, to) => st(stat, v, to, true);
const ab = (id, name, text, to = 'party') => ({ type: 'ability', id, name, text, to });

// ── イメージカラー（同色が重なるほど、その色の得意分野が伸びる） ──
const COLOR_THEME = [
  ['red',    '紅蓮', [pct('atk', 10, 'holders')], [pct('atk', 20, 'holders'), ab('fireEdge', '炎の舞台', '通常攻撃に炎属性が付く', 'holders')]],
  ['blue',   '蒼穹', [pct('mat', 10, 'holders')], [pct('mat', 20, 'holders'), ab('iceVoice', '氷の歌声', '攻撃魔法に氷属性が付く', 'holders')]],
  ['green',  '若葉', [st('res', 4, 'holders')], [st('res', 8, 'holders'), ab('regen', '芽吹き', '毎ターン最大HPの5%回復', 'holders')]],
  ['yellow', '閃光', [st('spd', 4, 'holders')], [st('spd', 8, 'holders'), ab('thunderStep', '雷のステップ', '先制攻撃の確率が上がる', 'party')]],
  ['purple', '夜想', [st('res', 6, 'holders')], [st('res', 12, 'holders'), ab('darkVeil', '夜のヴェール', '闇属性・即死への耐性', 'holders')]],
  ['pink',   '可憐', [st('vis', 2, 'holders')], [st('vis', 4, 'holders'), ab('charm', 'ときめき', '攻撃時、低確率で敵を魅了', 'holders')]],
  ['white',  '純白', [st('eva', 5, 'holders')], [st('eva', 10, 'holders'), ab('holyLight', '白い光', '回復魔法の効果+20%', 'holders')]],
  ['black',  '漆黒', [st('def', 3, 'holders')], [st('def', 6, 'holders'), ab('ironWall', '鉄壁', '前列にいると後列への物理攻撃を肩代わりしやすい', 'holders')]],
];
for (const [tag, name, t2, t3] of COLOR_THEME) {
  def({ id: 'color_' + tag, kind: 'count', tag, name: `${name}のカラー`,
    tiers: [{ n: 2, effects: t2 }, { n: 3, effects: t3 }] });
}

// ── 学年区分 ──
def({ id: 'jhs_group', kind: 'count', tag: 'jhs', name: '育ち盛り',
  tiers: [{ n: 3, effects: [ab('growth', '育ち盛り', '獲得経験値+15%')] }, { n: 4, effects: [ab('growth2', 'ぐんぐん成長', '獲得経験値+30%')] }] });
def({ id: 'hs_group', kind: 'count', tag: 'hs', name: '放課後クラブ',
  tiers: [{ n: 3, effects: [st('spd', 2)] }, { n: 5, effects: [st('spd', 4), st('hit', 5)] }] });
def({ id: 'adult_group', kind: 'count', tag: 'adult', name: '大人の余裕',
  tiers: [{ n: 2, effects: [ab('calm', '大人の余裕', '恐怖・混乱にかかりにくい')] }] });
def({ id: 'age_gap', kind: 'combo', all: ['jhs', 'adult'], name: '年の差ユニット',
  effects: [ab('guardian', '見守り', '中学生メンバーが戦闘不能になる攻撃を、確率で大人メンバーが肩代わり')] });

// ── 性格・趣味 ──
def({ id: 'genki_group', kind: 'count', tag: 'genki', name: '元気100倍',
  tiers: [{ n: 3, effects: [st('hp', 5)] }, { n: 4, effects: [st('hp', 10), ab('cheer', '元気印', '戦闘開始時、全員の恐怖を解除')] }] });
def({ id: 'sporty_group', kind: 'count', tag: 'sporty', name: '部活動',
  tiers: [{ n: 2, effects: [pct('atk', 15, 'front')] }] });
def({ id: 'twins', kind: 'count', tag: 'twin', name: 'ふたりはいたずら天使',
  tiers: [{ n: 2, effects: [ab('twinAttack', 'ツインアタック', '双子が同じ敵を狙うと連携攻撃が発生', 'holders')] }] });
def({ id: 'bunbu', kind: 'combo', all: ['sporty', 'intelli'], name: '文武両道',
  effects: [st('hit', 10), st('crit', 5)] });
def({ id: 'boke_tsukkomi', kind: 'combo', all: ['airhead', 'reliable'], name: 'ボケとツッコミ',
  effects: [ab('wakeUp', 'ツッコミ', '混乱した味方が毎ターン50%で正気に戻る')] });
def({ id: 'friendship', kind: 'combo', all: ['ojou', 'homey'], name: '身分違いの友情',
  effects: [ab('goldUp', 'お小遣い', '戦闘後の獲得ゴールド+20%')] });
def({ id: 'monochrome', kind: 'combo', all: ['white', 'black'], name: 'モノクローム',
  effects: [st('eva', 10, 'holders'), st('def', 2, 'holders')] });
def({ id: 'makanai', kind: 'combo', all: ['gourmet', 'cook'], name: 'まかない',
  effects: [ab('campHeal', 'まかない', '野営・宿屋での回復量+50%')] });
def({ id: 'lost_mypace', kind: 'combo', all: ['lost', 'mypace'], name: '迷子の達人',
  effects: [ab('secretDoor', '迷子の達人', '隠し扉・隠し通路を見つけやすい。テレポーターの罠で壁の中に飛ばされない')] });
def({ id: 'dream_step', kind: 'combo', all: ['singer', 'hardworker'], name: '夢へのステップ',
  effects: [st('vo', 2, 'holders'), st('men', 2, 'holders')] });
def({ id: 'prince_princess', kind: 'combo', all: ['boyish', 'ojou'], name: '王子様とお姫様',
  effects: [ab('cover', 'かばう', 'お嬢様メンバーへの攻撃をボーイッシュなメンバーが代わりに受ける', 'holders'), st('def', 3, 'holders')] });
def({ id: 'wonderland', kind: 'combo', all: ['mysterious', 'airhead'], name: '不思議空間',
  effects: [ab('seal', '不思議空間', '戦闘開始時、敵1グループの行動を確率で1ターン封じる')] });
def({ id: 'nankuru', kind: 'combo', all: ['southern', 'genki'], name: 'なんくるないさー',
  effects: [st('men', 2), ab('noPanic', 'なんくるないさー', '戦闘開始時、恐怖状態の味方を1人立ち直らせる')] });
def({ id: 'ikimono', kind: 'combo', all: ['animal', 'homey'], name: 'いきものがかり',
  effects: [ab('petCall', 'ペット召喚', '戦闘中、動物の仲間を1体呼び出せる（エルミナージュの召喚に相当）', 'holders')] });
def({ id: 'tea_time', kind: 'combo', all: ['japanese', 'shy', 'oneesan'], name: 'お茶会',
  effects: [st('men', 2), ab('mpSave', 'ひと休み', '休憩時にスキル回数が1回分戻る')] });

// ── ユニット ──
def({ id: 'unit_ryugu', kind: 'count', tag: 'ryugu', name: '竜宮小町',
  tiers: [{ n: 3, effects: [pct('mat', 20), ab('unitLive', 'ユニットライブ', '3人の行動を消費して全体攻撃の大技を放つ', 'holders')] }] });

// ── 多様性（同色シナジーと逆向きの選択肢） ──
def({ id: 'rainbow', kind: 'distinct', cat: 'color', name: '虹色ステージ',
  tiers: [{ n: 5, effects: [st('pow', 1), st('vo', 1), st('men', 1), st('sta', 1), st('dan', 1), st('vis', 1)] },
          { n: 6, effects: [st('pow', 2), st('vo', 2), st('men', 2), st('sta', 2), st('dan', 2), st('vis', 2), ab('prism', 'プリズム', '全属性への耐性+10%')] }] });
