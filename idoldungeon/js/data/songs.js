// 楽曲（装備品）。各アイドルは「楽曲スロット」に1曲装備できる
// 曲名のイメージに合わせた特殊能力が付く。歌詞は扱わない（曲名のみ）
//
// rank: 1〜5（ダンジョンの深さと店売り価格の目安）
// effects: synergies.js と同じ形式。to は self(装備者) / party / front / back
// live: 戦闘中に使える「ライブスキル」（エルミナージュの呪文回数制に相当：uses は休むまでの回数）
// TODO: 原曲の歌唱メンバーが装備したときの「持ち歌ボーナス」（クレジットを確認してから追加）

export const SONGS = {};
function def(s) { SONGS[s.id] = s; }
const st = (stat, v, to = 'self', isPct = false) => ({ type: 'stat', stat, [isPct ? 'pct' : 'add']: v, to });
const pct = (stat, v, to) => st(stat, v, to, true);
const ab = (id, name, text, to = 'self') => ({ type: 'ability', id, name, text, to });

def({ id: 'ready', title: 'READY!!', rank: 1,
  effects: [ab('ready', 'スタンバイOK', '戦闘1ターン目の行動が必ず先手になる')] });
def({ id: 'go_my_way', title: 'GO MY WAY!!', rank: 1,
  effects: [st('spd', 5), ab('dash', 'わが道', '逃走の成功率+25%', 'party')] });
def({ id: 'ohayo', title: 'おはよう!!朝ご飯', rank: 1,
  effects: [ab('breakfast', '朝ご飯', '宿屋・野営明けに全員のHPが最大値の10%上乗せされる', 'party')] });
def({ id: 'kirameki', title: 'キラメキラリ', rank: 1,
  effects: [st('vis', 2), ab('sparkle', 'キラキラ', '戦闘後の獲得ゴールド+10%', 'party')] });
def({ id: 'positive', title: 'ポジティブ！', rank: 1,
  effects: [ab('noFear', 'ポジティブ', '恐怖・眠りにかからない')] });
def({ id: 'start_start', title: 'スタ→トスタ→', rank: 2,
  effects: [pct('spd', 10), ab('quickStart', 'スタートダッシュ', '戦闘開始時に素早さが一時的に倍')] });
def({ id: 'aoi_tori', title: '蒼い鳥', rank: 2,
  effects: [st('eva', 10), ab('fly', '空を舞う', '落とし穴・ダメージ床の影響を受けない')],
  live: { name: '羽ばたき', uses: 3, text: '自分の次の被ダメージを0にする' } });
def({ id: 'taiyo', title: '太陽のジェラシー', rank: 2,
  effects: [ab('sunFire', '真夏の太陽', '通常攻撃に炎属性が付く')],
  live: { name: '灼熱', uses: 2, text: '敵1グループに炎属性の魔法ダメージ' } });
def({ id: 'mahou', title: '魔法をかけて！', rank: 2,
  effects: [pct('mat', 15)],
  live: { name: '魔法をかけて', uses: 3, text: '味方1人の攻撃力・魔力を3ターン上げる' } });
def({ id: 'megaau', title: '目が逢う瞬間', rank: 2,
  effects: [ab('eyeContact', '目が逢う瞬間', '先制攻撃時、敵1体を確率で魅了')] });
def({ id: 'agent', title: 'エージェント夜を往く', rank: 3,
  effects: [ab('stealth', '夜を往く', '暗闇エリアで不意打ちされない。宝箱の罠解除率+20%')] });
def({ id: 'meiso', title: '迷走Mind', rank: 3,
  effects: [st('dan', 2)],
  live: { name: '迷走', uses: 3, text: '敵1グループを混乱させる' } });
def({ id: 'relations', title: 'relations', rank: 3,
  effects: [ab('bond', 'つながり', '装備者が戦闘不能になると、仲間全員の攻撃力が3ターン上がる')] });
def({ id: 'tonari', title: '隣に…', rank: 3,
  effects: [st('def', 3), ab('coverNext', 'となりで', '隊列で隣のメンバーへの攻撃を確率で代わりに受ける')] });
def({ id: 'furufuru', title: 'ふるふるフューチャー☆', rank: 3,
  effects: [ab('doubleHit', 'ふるふる', '通常攻撃が確率で2回攻撃になる')] });
def({ id: 'shiny_smile', title: 'shiny smile', rank: 3,
  effects: [st('men', 2)],
  live: { name: 'スマイル', uses: 4, text: '味方全体のHPを小回復' } });
def({ id: 'kosmos', title: 'Kosmos, Cosmos', rank: 4,
  effects: [pct('mat', 20)],
  live: { name: '星屑', uses: 2, text: '敵全体に光属性の魔法ダメージ' } });
def({ id: 'change', title: 'CHANGE!!!!', rank: 4,
  effects: [ab('formation', 'チェンジ', '1戦闘に1回、行動を消費せずに隊列を入れ替えられる', 'party')] });
def({ id: 'jibun_restart', title: '自分REST@RT', rank: 4,
  effects: [ab('revive', 'リスタート', '1回の探索につき1度だけ、戦闘不能から自動でHP1で復活')] });
def({ id: 'masterpiece', title: 'M@STERPIECE', rank: 5,
  effects: [st('pow', 2), st('vo', 2), st('men', 2), st('sta', 2), st('dan', 2), st('vis', 2)],
  live: { name: 'マスターピース', uses: 1, text: '味方全員のHPを全回復し、状態異常を治す' } });
def({ id: 'the_idolmaster', title: 'THE IDOLM@STER', rank: 5,
  effects: [ab('synergyUp', 'アイドルマスター', 'パーティで発動中の「人数で段階が上がる」シナジーを1人分多く数える', 'party')] });
