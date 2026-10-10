// たからもの（レリック）
// rar: start / c / u / r / boss
export const RELICS = {};
function def(r) { RELICS[r.id] = r; }

def({ id: 'wand', name: 'まほうの つえ', icon: '🪄', rar: 'start',
  text: 'たたかいの さいしょの ターン、カードを 2{枚|まい} おおく ひく' });

def({ id: 'hat', name: 'とんがりぼうし', icon: '🎩', rar: 'boss',
  text: 'じゅもんの わくが 1つ ふえる' });
def({ id: 'randoseru', name: 'ランドセル', icon: '🎒', rar: 'boss',
  text: 'まいターン カードを 1{枚|まい} おおく ひく' });
def({ id: 'lamp', name: 'ひらめきランプ', icon: '💡', rar: 'boss',
  text: 'よそうが あたった ときの ボーナスが 2{倍|ばい}に なる（いつもは 1.5{倍|ばい}）' });
def({ id: 'star0', name: 'スタートの ほし', icon: '⭐', rar: 'boss',
  text: 'じゅもんの はじまりの {数|かず}が 0では なく 3に なる' });
def({ id: 'shell', name: 'まきがい', icon: '🐚', rar: 'boss',
  text: '{守|まも}りが ターンを こえても なくならない' });

def({ id: 'apple', name: 'まっかな りんご', icon: '🍎', rar: 'c',
  text: 'さいだい HPが 10 ふえる', onGet: (run) => { run.maxHp += 10; run.hp += 10; } });
def({ id: 'alarm', name: 'めざましどけい', icon: '⏰', rar: 'c',
  text: 'まいターンの はじめに {守|まも}り +3' });
def({ id: 'candy', name: 'ぺろぺろキャンディ', icon: '🍭', rar: 'c',
  text: 'たたかいに かつと HPが 5 かいふく' });
def({ id: 'piggy', name: 'ちょきんばこ', icon: '🐷', rar: 'c',
  text: 'たたかいに かつと コインが 10 ふえる' });
def({ id: 'abacus', name: 'そろばん', icon: '🧮', rar: 'c',
  text: 'じゅもんの さいごに +2' });
def({ id: 'bento', name: 'おべんとう', icon: '🍱', rar: 'c',
  text: 'やすみで かいふくする HPが 10 ふえる' });

def({ id: 'magnifier', name: 'むしめがね', icon: '🔍', rar: 'u',
  text: 'こんちゅうの カードが +3 つよくなる' });
def({ id: 'socks', name: 'くつした', icon: '🧦', rar: 'u',
  text: '{足|あし}の ある いきものの カードが +2 つよくなる' });
def({ id: 'setsquare', name: 'つみき', icon: '🧩', rar: 'u',
  text: 'かたちの がったい ボーナスが 2{倍|ばい}に なる' });
def({ id: 'lucky', name: 'よつばの さいころ', icon: '🍀', rar: 'u',
  text: 'さいころの めは 3より ちいさく ならない' });
def({ id: 'seven', name: 'ラッキーセブン', icon: '7️⃣', rar: 'u',
  text: '{攻撃|こうげき}の {数|かず}が 7の だん（7, 14, 21 …）なら +7' });
def({ id: 'darts', name: 'ダーツ', icon: '🎯', rar: 'u',
  text: '🎯ぴったりの ダメージが 3{倍|ばい}に なる' });
def({ id: 'medal', name: 'ひらめきメダル', icon: '🏅', rar: 'u',
  text: 'よそうが あたるたびに HPが 2 かいふく' });
def({ id: 'kukubook', name: '{九九|くく}の ほん', icon: '📕', rar: 'u', grade: 2,
  text: 'かけ{算|ざん}カードを つかうたびに {守|まも}り +2' });
def({ id: 'books', name: 'ぶあつい ずかん', icon: '📚', rar: 'r',
  text: 'カードを えらぶ とき、こうほが 1{枚|まい} ふえる' });
def({ id: 'cape', name: 'ほしの マント', icon: '🧣', rar: 'r',
  text: 'たたかいの はじめに {守|まも}り +10' });
def({ id: 'feather', name: 'ふくろうの はね', icon: '🪶', rar: 'r',
  text: 'ヒントを つかっても、よそうボーナスが もらえる' });
def({ id: 'bell', name: 'まほうの すず', icon: '🔔', rar: 'r',
  text: 'たたかいの はじめに {敵|てき} {全員|ぜんいん}に 5 ダメージ' });

export function relicPool(rar, grade, owned) {
  return Object.values(RELICS).filter((r) => r.rar === rar && (r.grade || 1) <= grade && !owned.includes(r.id));
}
