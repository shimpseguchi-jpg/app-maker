// ぶんしょうだいを つくる
// もんだいは「ぶん（センテンス）」の ならびと、ぶんの なかの「かず（トークン）」で できている。
// こたえの しきは トークンの ばんごうで もつので、どの ぶんの かずを つかったか まで しらべられる。
// おなじ かたちでも、ばめん・いいかた・つなぎことば・ききかた・なまえ・かずの じゅんばんが まいかい かわる。
import { makeRng } from '../util.js';

// ───── かぞえかた ─────
const tail = (n) => n % 10;
const hiki = (n) => ([0, 1, 6, 8].includes(tail(n)) ? 'ぴき' : tail(n) === 3 ? 'びき' : 'ひき');
const hon = (n) => ([0, 1, 6, 8].includes(tail(n)) ? 'ぽん' : tail(n) === 3 ? 'ぼん' : 'ほん');
const satsu = () => 'さつ';
const people = (n) => (n === 1 ? 'ひとり' : n === 2 ? 'ふたり' : null);
const S = (name, emoji, unit, c, word) => ({ name, emoji, unit, c: typeof c === 'function' ? c : () => c, word });
const SUBJ = {
  mouse: S('ねずみ', '🐭', 'ひき', hiki), rabbit: S('うさぎ', '🐰', 'ひき', hiki), frog: S('かえる', '🐸', 'ひき', hiki),
  dragonfly: S('とんぼ', '🦋', 'ひき', hiki), squirrel: S('りす', '🐿️', 'ひき', hiki), dog: S('いぬ', '🐶', 'ひき', hiki),
  cat: S('ねこ', '🐱', 'ひき', hiki), medaka: S('めだか', '🐟', 'ひき', hiki), goldfish: S('きんぎょ', '🐠', 'ひき', hiki),
  snail: S('たにし', '🐌', 'ひき', hiki), ant: S('あり', '🐜', 'ひき', hiki), ladybug: S('てんとうむし', '🐞', 'ひき', hiki),
  bird: S('とり', '🐦', 'わ', 'わ'), duck: S('あひる', '🦆', 'わ', 'わ'), swan: S('はくちょう', '🦢', 'わ', 'わ'), sparrow: S('すずめ', '🐤', 'わ', 'わ'),
  kid: S('こども', '🧒', 'にん', 'にん', people), boy: S('おとこのこ', '👦', 'にん', 'にん', people), girl: S('おんなのこ', '👧', 'にん', 'にん', people),
  adult: S('おとな', '🧑', 'にん', 'にん', people), passenger: S('おきゃくさん', '🧑', 'にん', 'にん', people),
  candy: S('あめ', '🍬', 'こ', 'こ'), gum: S('ガム', '🟩', 'こ', 'こ'), choco: S('チョコレート', '🍫', 'こ', 'こ'), cup: S('コップ', '🥛', 'こ', 'こ'),
  eraser: S('けしゴム', '🧽', 'こ', 'こ'), apple: S('りんご', '🍎', 'こ', 'こ'), orange: S('みかん', '🍊', 'こ', 'こ'),
  acorn: S('どんぐり', '🌰', 'こ', 'こ'), pinecone: S('まつぼっくり', '🌲', 'こ', 'こ'), balloon: S('ふうせん', '🎈', 'こ', 'こ'),
  redballoon: S('あかい ふうせん', '🎈', 'こ', 'こ'), blueballoon: S('あおい ふうせん', '🔵', 'こ', 'こ'),
  car: S('くるま', '🚗', 'だい', 'だい'), bike: S('じてんしゃ', '🚲', 'だい', 'だい'), truck: S('トラック', '🚚', 'だい', 'だい'), bus: S('バス', '🚌', 'だい', 'だい'),
  cookie: S('クッキー', '🍪', 'まい', 'まい'), senbei: S('おせんべい', '🍘', 'まい', 'まい'), sticker: S('シール', '⭐', 'まい', 'まい'), card: S('カード', '🃏', 'まい', 'まい'),
  pencil: S('えんぴつ', '✏️', 'ほん', hon), colorpencil: S('いろえんぴつ', '🖍️', 'ほん', hon), redpencil: S('あかい えんぴつ', '🖍️', 'ほん', hon), bluepencil: S('あおい えんぴつ', '✏️', 'ほん', hon),
  ribbon: S('リボン', '🎀', 'ほん', hon), flower: S('はな', '🌷', 'ほん', hon), redflower: S('あかい はな', '🌹', 'ほん', hon), whiteflower: S('しろい はな', '🤍', 'ほん', hon),
  book: S('ほん', '📕', 'さつ', satsu), picturebook: S('えほん', '📗', 'さつ', satsu), zukan: S('ずかん', '📘', 'さつ', satsu), notebook: S('ノート', '📓', 'さつ', satsu),
};
export const UNITS = ['ひき', 'こ', 'ほん', 'まい', 'にん', 'だい', 'わ', 'さつ'];
const NAMES = ['あおいさん', 'ひなたさん', 'そうたさん', 'ゆいさん', 'はるとさん', 'めいさん', 'りくさん', 'さくらさん', 'こうきさん', 'みおさん'];
export function subjOf(key) { return SUBJ[key]; }
// かずの かきかた（「5ひき」「ひとり」）
export function countWord(subjKey, n) {
  const s = SUBJ[subjKey];
  const w = s.word && s.word(n);
  return w ? { num: w, suf: '' } : { num: String(n), suf: s.c(n) };
}

// ───── ばめん：ふえたり へったり する おはなし ─────
// start / q / extra は いくつかの いいかたから えらぶ。# に かずが、@ に なまえが はいる。
// plus / minus の v は「ふえる？へる？」で きく ことば、rel は「のって きた ねずみ」の ような いいかた。
// q の only：'plus'＝ふえる だけの とき、'minus'＝へる ことが ある とき だけ つかう
const E = (t, v, rel) => ({ t, v, rel });
const SEQ = [
  { id: 'train', subj: 'mouse', start: ['でんしゃに ねずみが # のって います。', 'ねずみが # でんしゃに のって います。'],
    plus: [E('# のりました。', 'のりました', 'のって きた'), E('えきで # のって きました。', 'のって きました', 'のって きた')],
    minus: [E('# おりました。', 'おりました', 'おりた'), E('えきで # おりました。', 'おりました', 'おりた')],
    now: 'いま でんしゃに のって いる ねずみ', short: 'でんしゃの ねずみ', first: 'はじめに のって いた ねずみ',
    q: [{ t: 'でんしゃの ねずみは なんびきに なりましたか。' }, { t: 'いま でんしゃには ねずみが なんびき のって いますか。' }, { t: 'でんしゃに のこって いる ねずみは なんびきですか。', only: 'minus' }],
    extra: [{ t: 'ホームには うさぎが # います。', subj: 'rabbit', label: 'ホームに いる うさぎ' }, { t: 'えきの まえで りすが # みて います。', subj: 'squirrel', label: 'えきの まえの りす' }] },
  { id: 'bus', subj: 'passenger', start: ['バスに おきゃくさんが # のって います。'],
    plus: [E('バスていで # のって きました。', 'のって きました', 'のって きた'), E('# のりました。', 'のりました', 'のって きた')],
    minus: [E('バスていで # おりました。', 'おりました', 'おりた')],
    now: 'いま バスに のって いる おきゃくさん', short: 'バスの おきゃくさん', first: 'はじめに のって いた おきゃくさん',
    q: [{ t: 'バスの おきゃくさんは なんにんに なりましたか。' }, { t: 'いま バスには なんにん のって いますか。' }],
    extra: [{ t: 'バスの うしろを じてんしゃが # はしって います。', subj: 'bike', label: 'うしろを はしる じてんしゃ' }, { t: 'バスていでは おとなが # バスを みおくりました。', subj: 'adult', label: 'みおくった おとな' }] },
  { id: 'tree', subj: 'bird', start: ['きに とりが #とまって います。', 'とりが # きの えだに とまって います。'],
    plus: [E('# とんで きました。', 'とんで きました', 'とんで きた'), E('# やって きました。', 'やって きました', 'やって きた')],
    minus: [E('# とんで いきました。', 'とんで いきました', 'とんで いった'), E('# とびたちました。', 'とびたちました', 'とびたった')],
    now: 'いま きに とまって いる とり', short: 'きの とり', first: 'はじめに とまって いた とり',
    q: [{ t: 'きに とまって いる とりは なんわに なりましたか。' }, { t: 'きの とりは のこり なんわですか。', only: 'minus' }, { t: 'きの とりは ぜんぶで なんわに なりましたか。', only: 'plus' }],
    extra: [{ t: 'したの いけには あひるが # います。', subj: 'duck', label: 'いけに いる あひる' }, { t: 'でんせんには すずめが #とまって います。', subj: 'sparrow', label: 'でんせんの すずめ' }] },
  { id: 'park', subj: 'kid', start: ['こうえんで こどもが # あそんで います。', 'こどもが # こうえんで あそんで います。'],
    plus: [E('# あそびに きました。', 'あそびに きました', 'あそびに きた'), E('# やって きました。', 'やって きました', 'やって きた')],
    minus: [E('# いえに かえりました。', 'かえりました', 'かえった'), E('# じゅくに いきました。', 'いきました', 'いった')],
    now: 'いま こうえんで あそんで いる こども', short: 'こうえんの こども', first: 'はじめに あそんで いた こども',
    q: [{ t: 'こうえんで あそんで いる こどもは なんにんに なりましたか。' }, { t: 'こうえんに のこって いる こどもは なんにんですか。', only: 'minus' }, { t: 'こどもは ぜんぶで なんにんに なりましたか。', only: 'plus' }],
    extra: [{ t: 'ベンチでは おとなが # みて います。', subj: 'adult', label: 'ベンチに いる おとな' }, { t: 'すなばでは いぬが # あそんで います。', subj: 'dog', label: 'すなばの いぬ' }] },
  { id: 'candy', subj: 'candy', start: ['@は あめを # もって います。', '@の ポケットに あめが # はいって います。'],
    plus: [E('おねえさんから # もらいました。', 'もらいました', 'もらった'), E('おばあさんに # もらいました。', 'もらいました', 'もらった')],
    minus: [E('ともだちに # あげました。', 'あげました', 'あげた'), E('# たべました。', 'たべました', 'たべた'), E('いもうとに # わけて あげました。', 'わけて あげました', 'わけて あげた')],
    now: 'いま もって いる あめ', short: '@の あめ', first: 'はじめに もって いた あめ',
    q: [{ t: '@の あめは なんこに なりましたか。' }, { t: 'あめは なんこ のこって いますか。', only: 'minus' }, { t: 'あめは ぜんぶで なんこに なりましたか。', only: 'plus' }],
    extra: [{ t: 'ガムも # もって います。', subj: 'gum', label: 'もって いる ガム' }, { t: 'チョコレートも # もって います。', subj: 'choco', label: 'もって いる チョコレート' }] },
  { id: 'sticker', subj: 'sticker', start: ['@は シールを # もって います。'],
    plus: [E('せんせいから # もらいました。', 'もらいました', 'もらった'), E('おみせで # かいました。', 'かいました', 'かった')],
    minus: [E('ノートに # はりました。', 'はりました', 'はった'), E('ともだちに # あげました。', 'あげました', 'あげた')],
    now: 'いま もって いる シール', short: '@の シール', first: 'はじめに もって いた シール',
    q: [{ t: '@の シールは なんまいに なりましたか。' }, { t: 'のこりの シールは なんまいですか。', only: 'minus' }],
    extra: [{ t: 'カードも # もって います。', subj: 'card', label: 'もって いる カード' }] },
  { id: 'parking', subj: 'car', start: ['ちゅうしゃじょうに くるまが #とまって います。'],
    plus: [E('# はいって きました。', 'はいって きました', 'はいって きた'), E('# やって きました。', 'やって きました', 'やって きた')],
    minus: [E('# でて いきました。', 'でて いきました', 'でて いった'), E('# でかけて いきました。', 'でかけて いきました', 'でかけた')],
    now: 'いま とまって いる くるま', short: 'ちゅうしゃじょうの くるま', first: 'はじめに とまって いた くるま',
    q: [{ t: 'ちゅうしゃじょうの くるまは なんだいに なりましたか。' }, { t: 'ちゅうしゃじょうに のこって いる くるまは なんだいですか。', only: 'minus' }],
    extra: [{ t: 'じてんしゃも #とまって います。', subj: 'bike', label: 'とまって いる じてんしゃ' }, { t: 'まえの みちを トラックが #とおりました。', subj: 'truck', label: 'みちを とおった トラック' }] },
  { id: 'cookie', subj: 'cookie', start: ['おさらに クッキーが # あります。', 'クッキーが # おさらに のって います。'],
    plus: [E('おかあさんが # のせました。', 'のせました', 'のせた'), E('あたらしく # やけました。', 'やけました', 'あたらしく やけた')],
    minus: [E('みんなで # たべました。', 'たべました', 'たべた'), E('おとうとが # たべました。', 'たべました', 'たべた')],
    now: 'いま おさらに ある クッキー', short: 'おさらの クッキー', first: 'はじめに あった クッキー',
    q: [{ t: 'おさらの クッキーは なんまいに なりましたか。' }, { t: 'クッキーは なんまい のこって いますか。', only: 'minus' }],
    extra: [{ t: 'テーブルには コップが # あります。', subj: 'cup', label: 'テーブルの コップ' }, { t: 'となりの さらには おせんべいが # あります。', subj: 'senbei', label: 'となりの おせんべい' }] },
  { id: 'pencil', subj: 'pencil', start: ['@の ふでばこに えんぴつが # はいって います。'],
    plus: [E('おみせで # かいました。', 'かいました', 'かった'), E('おじいさんから # もらいました。', 'もらいました', 'もらった')],
    minus: [E('ともだちに # かしました。', 'かしました', 'かした'), E('# なくしました。', 'なくしました', 'なくした')],
    now: 'いま ふでばこに ある えんぴつ', short: 'ふでばこの えんぴつ', first: 'はじめに あった えんぴつ',
    q: [{ t: 'ふでばこの えんぴつは なんぼんに なりましたか。' }, { t: 'ふでばこに のこって いる えんぴつは なんぼんですか。', only: 'minus' }],
    extra: [{ t: 'けしゴムも # はいって います。', subj: 'eraser', label: 'ふでばこの けしゴム' }, { t: 'いろえんぴつも # はいって います。', subj: 'colorpencil', label: 'ふでばこの いろえんぴつ' }] },
  { id: 'books', subj: 'book', start: ['ほんだなに ほんが # あります。', '@の へやの ほんだなに ほんが # ならんで います。'],
    plus: [E('としょかんで # かりて きました。', 'かりて きました', 'かりて きた'), E('# かって もらいました。', 'かって もらいました', 'かって もらった')],
    minus: [E('ともだちに # かしました。', 'かしました', 'かした'), E('# としょかんに かえしました。', 'かえしました', 'かえした')],
    now: 'いま ほんだなに ある ほん', short: 'ほんだなの ほん', first: 'はじめに あった ほん',
    q: [{ t: 'ほんだなの ほんは なんさつに なりましたか。' }, { t: 'ほんだなに のこって いる ほんは なんさつですか。', only: 'minus' }],
    extra: [{ t: 'つくえには ノートが # あります。', subj: 'notebook', label: 'つくえの ノート' }] },
  { id: 'acorn', subj: 'acorn', start: ['@は どんぐりを # ひろいました。'],
    plus: [E('また # ひろいました。', 'ひろいました', 'あとから ひろった'), E('ともだちから # もらいました。', 'もらいました', 'もらった')],
    minus: [E('かえりみちで # おとしました。', 'おとしました', 'おとした'), E('おとうとに # あげました。', 'あげました', 'あげた')],
    now: 'いま もって いる どんぐり', short: '@の どんぐり', first: 'はじめに ひろった どんぐり',
    q: [{ t: '@の どんぐりは なんこに なりましたか。' }, { t: 'どんぐりは なんこ のこって いますか。', only: 'minus' }],
    extra: [{ t: 'まつぼっくりも # ひろいました。', subj: 'pinecone', label: 'ひろった まつぼっくり' }] },
  { id: 'balloon', subj: 'balloon', start: ['ふうせんが # あります。', 'へやに ふうせんが # かざって あります。'],
    plus: [E('# ふくらませました。', 'ふくらませました', 'ふくらませた'), E('おみせで # もらいました。', 'もらいました', 'もらった')],
    minus: [E('# われました。', 'われました', 'われた'), E('# そらへ とんで いきました。', 'とんで いきました', 'とんで いった')],
    now: 'いま ある ふうせん', short: 'ふうせん', first: 'はじめに あった ふうせん',
    q: [{ t: 'ふうせんは なんこに なりましたか。' }, { t: 'のこって いる ふうせんは なんこですか。', only: 'minus' }],
    extra: [{ t: 'かざりの リボンも # あります。', subj: 'ribbon', label: 'かざりの リボン' }] },
  { id: 'pond', subj: 'frog', start: ['いけに かえるが # います。'],
    plus: [E('# とびこんで きました。', 'とびこんで きました', 'とびこんで きた'), E('# やって きました。', 'やって きました', 'やって きた')],
    minus: [E('# いけから でて いきました。', 'でて いきました', 'でて いった'), E('# どこかへ はねて いきました。', 'はねて いきました', 'はねて いった')],
    now: 'いま いけに いる かえる', short: 'いけの かえる', first: 'はじめに いた かえる',
    q: [{ t: 'いけの かえるは なんびきに なりましたか。' }, { t: 'いけに のこって いる かえるは なんびきですか。', only: 'minus' }],
    extra: [{ t: 'はすの はには とんぼが #とまって います。', subj: 'dragonfly', label: 'はすの はの とんぼ' }, { t: 'いけの なかで めだかが # およいで います。', subj: 'medaka', label: 'およいで いる めだか' }] },
  { id: 'tank', subj: 'goldfish', start: ['すいそうに きんぎょが # います。', 'きんぎょが # すいそうで およいで います。'],
    plus: [E('おまつりで すくった きんぎょを # いれました。', 'いれました', 'いれた')],
    minus: [E('# べつの すいそうに うつしました。', 'うつしました', 'うつした')],
    now: 'いま すいそうに いる きんぎょ', short: 'すいそうの きんぎょ', first: 'はじめに いた きんぎょ',
    q: [{ t: 'すいそうの きんぎょは なんびきに なりましたか。' }],
    extra: [{ t: 'すいそうには たにしも # います。', subj: 'snail', label: 'すいそうの たにし' }] },
  { id: 'ants', subj: 'ant', start: ['おさとうの まわりに ありが # います。'],
    plus: [E('なかまの ありが # あつまって きました。', 'あつまって きました', 'あつまって きた')],
    minus: [E('# すに かえって いきました。', 'かえって いきました', 'すに かえった')],
    now: 'いま おさとうの まわりに いる あり', short: 'おさとうの まわりの あり', first: 'はじめに いた あり',
    q: [{ t: 'おさとうの まわりの ありは なんびきに なりましたか。' }],
    extra: [{ t: 'ちかくの はっぱには てんとうむしが # います。', subj: 'ladybug', label: 'はっぱの てんとうむし' }] },
];

// ───── ばめん：2つの なかまを くらべたり あわせたり する おはなし ─────
// text は A の かず → B の かず の じゅん。qSum は いくつかの いいかたから えらぶ
const GRP = [
  { id: 'flowers', subj: 'flower', a: 'redflower', b: 'whiteflower', text: ['はなだんに あかい はなが #、しろい はなが # さいて います。', 'あかい はなが #と、しろい はなが # さいて います。', 'あかい はなが # さいて います。しろい はなも # さいて います。'],
    A: 'あかい はな', B: 'しろい はな', all: 'はな',
    qSum: ['はなは あわせて なんぼん さいて いますか。', 'はなは ぜんぶで なんぼん ありますか。'],
    minus: [E('そのあと # つみました。', 'つみました', 'つんだ'), E('そのあと # かれました。', 'かれました', 'かれた')],
    now: 'いま さいて いる はな', qLeft: ['さいて いる はなは なんぼんに なりましたか。', 'のこりは なんぼんですか。'] },
  { id: 'cars', subj: 'mouse', a: 'mouse', b: 'mouse', text: ['でんしゃの ひだりの しゃりょうに ねずみが #、みぎの しゃりょうに # のって います。', 'ひだりの しゃりょうには ねずみが # のって います。みぎの しゃりょうには # のって います。'],
    A: 'ひだりの しゃりょうの ねずみ', B: 'みぎの しゃりょうの ねずみ', all: 'ねずみ',
    qSum: ['ねずみは ぜんぶで なんびき のって いますか。', 'ねずみは あわせて なんびきですか。'],
    minus: [E('えきで # おりました。', 'おりました', 'おりた'), E('つぎの えきで # おりました。', 'おりました', 'おりた')],
    now: 'いま でんしゃに のって いる ねずみ', qLeft: ['でんしゃに のって いる ねずみは なんびきに なりましたか。', 'のこりは なんびきですか。'] },
  { id: 'kids', subj: 'kid', a: 'boy', b: 'girl', text: ['こうていに おとこのこが #、おんなのこが # います。', 'すなばで おとこのこが #、おんなのこが # あそんで います。', 'おとこのこが # います。おんなのこも # います。'],
    A: 'おとこのこ', B: 'おんなのこ', all: 'こども',
    qSum: ['こどもは ぜんぶで なんにん いますか。', 'みんなで なんにん いますか。'],
    minus: [E('そのあと # かえりました。', 'かえりました', 'かえった'), E('そのあと # きょうしつに もどりました。', 'もどりました', 'もどった')],
    now: 'いま いる こども', qLeft: ['のこって いる こどもは なんにんに なりましたか。', 'のこりは なんにんですか。'] },
  { id: 'fruits', subj: 'apple', a: 'apple', b: 'orange', text: ['かごに りんごが #、みかんが # はいって います。', 'りんごが #と みかんが # あります。', 'りんごが # あります。みかんも # あります。'],
    A: 'りんご', B: 'みかん', all: 'くだもの',
    qSum: ['くだものは ぜんぶで なんこ ありますか。', 'りんごと みかんは あわせて なんこですか。'],
    minus: [E('そのあと # たべました。', 'たべました', 'たべた'), E('おともだちに # あげました。', 'あげました', 'あげた')],
    now: 'いま ある くだもの', qLeft: ['くだものは なんこに なりましたか。', 'のこりは なんこですか。'] },
  { id: 'lake', subj: 'duck', a: 'duck', b: 'swan', text: ['みずうみに あひるが #、はくちょうが # います。', 'みずうみに あひるが # います。はくちょうも # います。'],
    A: 'あひる', B: 'はくちょう', all: 'とり',
    qSum: ['とりは ぜんぶで なんわ いますか。', 'あひると はくちょうは あわせて なんわですか。'],
    minus: [E('そのあと #とんで いきました。', 'とんで いきました', 'とんで いった'), E('そのあと # およいで いきました。', 'およいで いきました', 'およいで いった')],
    now: 'いま みずうみに いる とり', qLeft: ['みずうみに いる とりは なんわに なりましたか。', 'のこりは なんわですか。'] },
  { id: 'pets', subj: 'dog', a: 'dog', b: 'cat', text: ['ひろばに いぬが #、ねこが # います。', 'いぬが #と ねこが # ひなたぼっこを して います。', 'ひろばに いぬが # います。ねこも # います。'],
    A: 'いぬ', B: 'ねこ', all: 'どうぶつ',
    qSum: ['どうぶつは ぜんぶで なんびき いますか。', 'いぬと ねこは あわせて なんびきですか。'],
    minus: [E('そのあと # いえに かえりました。', 'かえりました', 'かえった'), E('そのあと # どこかへ いきました。', 'いきました', 'いった')],
    now: 'いま いる どうぶつ', qLeft: ['のこって いる どうぶつは なんびきに なりましたか。', 'のこりは なんびきですか。'] },
  { id: 'balloons', subj: 'balloon', a: 'redballoon', b: 'blueballoon', text: ['あかい ふうせんが #、あおい ふうせんが # あります。', 'あかい ふうせんが # あります。あおい ふうせんも # あります。'],
    A: 'あかい ふうせん', B: 'あおい ふうせん', all: 'ふうせん',
    qSum: ['ふうせんは ぜんぶで なんこ ありますか。', 'ふうせんは あわせて なんこですか。'],
    minus: [E('そのあと # われました。', 'われました', 'われた'), E('そのあと #とんで いきました。', 'とんで いきました', 'とんで いった')],
    now: 'いま ある ふうせん', qLeft: ['ふうせんは なんこに なりましたか。', 'のこりは なんこですか。'] },
  { id: 'shelf', subj: 'book', a: 'picturebook', b: 'zukan', text: ['ほんだなに えほんが #、ずかんが # あります。', 'がっこうの ほんだなに えほんが #と ずかんが # ならんで います。'],
    A: 'えほん', B: 'ずかん', all: 'ほん',
    qSum: ['ほんは ぜんぶで なんさつ ありますか。', 'えほんと ずかんは あわせて なんさつですか。'],
    minus: [E('そのあと # かしだしました。', 'かしだしました', 'かしだした'), E('そのあと # かたづけました。', 'かたづけました', 'かたづけた')],
    now: 'いま ほんだなに ある ほん', qLeft: ['ほんだなの ほんは なんさつに なりましたか。', 'のこりは なんさつですか。'] },
  { id: 'road', subj: 'car', a: 'bus', b: 'truck', text: ['どうろに バスが #、トラックが #とまって います。', 'どうろに バスが #とまって います。トラックも #とまって います。'],
    A: 'バス', B: 'トラック', all: 'くるま',
    qSum: ['くるまは ぜんぶで なんだい とまって いますか。', 'バスと トラックは あわせて なんだいですか。'],
    minus: [E('そのあと # はしって いきました。', 'はしって いきました', 'はしって いった'), E('そのあと # でて いきました。', 'でて いきました', 'でて いった')],
    now: 'いま とまって いる くるま', qLeft: ['とまって いる くるまは なんだいに なりましたか。', 'のこりは なんだいですか。'] },
  { id: 'pencils', subj: 'pencil', a: 'redpencil', b: 'bluepencil', text: ['@の ふでばこに あかい えんぴつが #、あおい えんぴつが # はいって います。', 'ふでばこに あかい えんぴつが # あります。あおい えんぴつも # あります。'],
    A: 'あかい えんぴつ', B: 'あおい えんぴつ', all: 'えんぴつ',
    qSum: ['えんぴつは ぜんぶで なんぼん ありますか。', 'えんぴつは あわせて なんぼんですか。'],
    minus: [E('そのあと #ともだちに かしました。', 'かしました', 'かした'), E('そのあと # なくしました。', 'なくしました', 'なくした')],
    now: 'いま ふでばこに ある えんぴつ', qLeft: ['ふでばこの えんぴつは なんぼんに なりましたか。', 'のこりは なんぼんですか。'] },
];

// つなぎことば（3つの かずの とき）
const LINK1 = ['つぎに ', 'しばらく して ', 'すこし たって '];
const LINK2 = ['その つぎに ', 'それから ', 'そのあと '];
// 2つの かずの ときの つなぎ（なし も ある）
const LINK_PLUS = ['', '', 'そこへ ', 'しばらく して '];
const LINK_MINUS = ['', '', 'しばらく して '];

// ───── もんだいの しゅるい ─────
export const KINDS = {
  zoka: { level: 1, name: 'ふえると いくつ', icon: '⬆️', memo: 'のりました・もらいました など、ふえる おはなし' },
  genshou: { level: 1, name: 'へると いくつ', icon: '⬇️', memo: 'おりました・たべました など、へる おはなし' },
  gappei: { level: 1, name: 'あわせて いくつ', icon: '🤝', memo: '2つの なかまを あわせる おはなし' },
  kyusa: { level: 2, name: 'ちがいは いくつ', icon: '⚖️', memo: '「なんこ おおい」「すくない」を くらべる おはなし' },
  mittsu_pp: { level: 2, name: '3つの かず（ふえる・ふえる）', icon: '3️⃣', memo: '2かい ふえる おはなし' },
  mittsu_mm: { level: 2, name: '3つの かず（へる・へる）', icon: '3️⃣', memo: '2かい へる おはなし' },
  mittsu_mix: { level: 2, name: '3つの かず（ふえる・へる）', icon: '🔀', memo: 'ふえたり へったり する おはなし' },
  extra: { level: 3, name: 'つかわない かずが ある', icon: '🙈', memo: 'もんだいに かんけい ない かずが まじって いる' },
  twocar: { level: 3, name: 'あわせて から へる', icon: '🚃', memo: '2つの なかまを あわせて、そこから へる おはなし' },
  asks: { level: 3, name: 'きかれて いる ことに ちゅうい', icon: '❓', memo: '「おりたのは あわせて なんびき？」など、とちゅうの かずを きく' },
};
export const KIND_IDS = Object.keys(KINDS);
export const MAX_LEVEL = 3;

// ───── つくる ─────
// gen(kind, seed, { level, scene }) → もんだい
export function gen(kind, seed, opt = {}) {
  const rng = makeRng(seed);
  for (let i = 0; i < 60; i++) {
    const p = build(kind, rng, opt);
    if (p && distinct(p)) { p.kind = kind; p.seed = seed; return p; }
  }
  throw new Error('もんだいが つくれない: ' + kind);
}
function distinct(p) { const vs = p.tokens.map((t) => t.v); return new Set(vs).size === vs.length; }

const lim = (lv) => (lv >= 2 ? 20 : 10);

function build(kind, rng, opt) {
  const lv = opt.level || KINDS[kind].level;
  const big = lim(lv);
  const seqScene = () => (opt.scene && SEQ.find((s) => s.id === opt.scene)) || rng.pick(SEQ);
  const grpScene = () => (opt.scene && GRP.find((s) => s.id === opt.scene)) || rng.pick(GRP);
  switch (kind) {
    case 'zoka': {
      const a = rng.int(1, big - 2), b = rng.int(1, Math.min(9, big - a));
      if (a + b > big || a + b < 3) return null;
      return seq(seqScene(), rng, a, [+b], {});
    }
    case 'genshou': {
      const a = rng.int(3, big === 10 ? 10 : 18), b = rng.int(1, Math.min(9, a - 1));
      return seq(seqScene(), rng, a, [-b], {});
    }
    case 'extra': {
      const s = seqScene();
      const plus = rng.chance(0.5);
      const a = plus ? rng.int(2, 12) : rng.int(5, 18);
      const b = plus ? rng.int(1, Math.min(9, 20 - a)) : rng.int(1, Math.min(9, a - 1));
      return seq(s, rng, a, [plus ? b : -b], { extra: rng.int(2, 9) });
    }
    case 'mittsu_pp': {
      const a = rng.int(1, 10), b = rng.int(1, 9), c = rng.int(1, 9);
      if (a + b + c > 20) return null;
      return seq(seqScene(), rng, a, [b, c], {});
    }
    case 'mittsu_mm': {
      // 10の まとまりを つかう かたちも まぜる（13−3−4 など）
      let a = rng.int(6, 18), b = rng.int(1, 9);
      if (a > 10 && rng.chance(0.5)) b = a - 10;
      const c = rng.int(1, 9);
      if (b < 1 || a - b - c < 1) return null;
      return seq(seqScene(), rng, a, [-b, -c], {});
    }
    case 'mittsu_mix': {
      const a = rng.int(3, 15), b = rng.int(1, 9), c = rng.int(1, 9);
      const ops = rng.pick([[-b, c], [b, -c]]);
      const mid = a + ops[0], end = mid + ops[1];
      if (mid < 1 || mid > 20 || end < 1 || end > 20) return null;
      return seq(seqScene(), rng, a, ops, {});
    }
    case 'asks': {
      // 2かい おなじ むきに うごいて、うごいた かずの あわせを きく
      const s = seqScene();
      const down = rng.chance(0.6);
      const b = rng.int(1, 8), c = rng.int(1, 8);
      const a = down ? rng.int(b + c + 1, 18) : rng.int(1, 18 - b - c);
      if (a < 1 || a > 20) return null;
      return seq(s, rng, a, down ? [-b, -c] : [b, c], { askMoved: true });
    }
    case 'gappei': {
      const s = grpScene();
      const a = rng.int(1, big - 2), b = rng.int(1, Math.min(9, big - a));
      if (a + b > big || a + b < 3) return null;
      return grp(s, rng, a, b, 'sum');
    }
    case 'kyusa': {
      const s = grpScene();
      const a = rng.int(3, lv >= 3 ? 18 : 10), b = rng.int(1, a - 1);
      // おおい ほうが あとに でて くる ぶんも まぜる（「さきの かず − あとの かず」と おぼえない ように）
      const flip = rng.chance(lv >= 3 ? 0.5 : 0.35);
      const mode = rng.weighted([['more', 5], ['less', lv >= 3 ? 3 : 2], ['diff', 2]]);
      return grp(s, rng, flip ? b : a, flip ? a : b, mode);
    }
    case 'twocar': {
      const s = grpScene();
      const a = rng.int(2, 12), b = rng.int(2, 9), c = rng.int(2, 9);
      if (a + b > 20 || c >= a + b || c <= Math.min(a, b)) return null;
      return grp(s, rng, a, b, 'left', c);
    }
  }
  return null;
}

// トークン（ぶんの なかの かず）を ぶんに うめる
function fill(t, sIdx, toks, vals, subjs) {
  let k = 0;
  return t.replace(/#/g, () => {
    const id = toks.length;
    toks.push({ v: vals[k], s: sIdx, subj: subjs[k] });
    k++;
    return '#' + id;
  });
}

// ふえたり へったり する おはなし
function seq(s0, rng, a, moves, o) {
  const s = named(s0, rng);
  const toks = [], sentences = [];
  const subj = s.subj, SB = SUBJ[subj];
  const three = moves.length >= 2;
  const allPlus = moves.every((m) => m > 0), anyMinus = moves.some((m) => m < 0);
  // ぶんの ならび：はじめ → できごと …。つかわない かずの ぶんは どこかに はさまる
  const order = ['start', ...moves.map((_, i) => i)];
  if (o.extra != null) order.splice(rng.int(1, order.length), 0, 'extra');
  const events = [];
  let extraTok = -1, extra = null;
  order.forEach((it) => {
    const idx = sentences.length;
    if (it === 'start') {
      sentences.push({ role: 'start', text: (three ? 'はじめに ' : '') + fill(rng.pick(s.start), idx, toks, [a], [subj]) });
    } else if (it === 'extra') {
      extra = rng.pick(s.extra);
      sentences.push({ role: 'extra', text: fill(extra.t, idx, toks, [o.extra], [extra.subj]) });
      extraTok = toks.length - 1;
    } else {
      const m = moves[it];
      // 「おりたのは あわせて」と きく ときは、2かいとも おなじ うごきに する
      const e = o.askMoved && events.length ? events[0].ev : rng.pick(m > 0 ? s.plus : s.minus);
      const pre = three ? rng.pick(it === 0 ? LINK1 : LINK2) : rng.pick(m > 0 ? LINK_PLUS : LINK_MINUS);
      sentences.push({ role: 'event', sign: m > 0 ? 1 : -1, verb: e.v, text: pre + fill(e.t, idx, toks, [Math.abs(m)], [subj]) });
      events.push({ tok: toks.length - 1, sign: m > 0 ? 1 : -1, ev: e, s: idx });
    }
  });
  const startTok = 0;
  const rel = events[0].ev.rel;
  const qw = qWord(subj);
  let question, expr, answer, ask, why;
  if (o.askMoved) {
    question = rng.pick([`${rel} ${SB.name}は あわせて ${qw}ですか。`, `${rel} ${SB.name}は ぜんぶで ${qw}ですか。`, `${rel}のは あわせて ${qw}ですか。`]);
    expr = events.map((e) => ({ t: e.tok, sign: 1 }));
    answer = events.reduce((sum, e) => sum + toks[e.tok].v, 0);
    ask = askSet(rng, `${rel} ${SB.name}を あわせた かず`, [`${s.now}の かず`, `${s.first}の かず`]);
    why = [`きかれて いるのは「${rel} ${SB.name}」の かず。`, `${events.map((e) => say(toks[e.tok])).join('と ')}を あわせるので たしざん。`, `はじめの ${say(toks[0])}は つかわないよ。`];
  } else {
    const qs = s.q.filter((q) => !q.only || (q.only === 'plus' ? allPlus : anyMinus));
    question = rng.pick(qs).t;
    expr = [{ t: startTok, sign: 1 }, ...events.map((e) => ({ t: e.tok, sign: e.sign }))];
    answer = a + moves.reduce((x, y) => x + y, 0);
    const pool = [`${s.first}の かず`, ...new Set(events.map((e) => `${e.ev.rel} ${SB.name}の かず`))];
    if (extra) pool.unshift(`${extra.label}の かず`);
    ask = askSet(rng, `${s.now}の かず`, pool);
    why = [`はじめは ${say(toks[0])}。`, ...events.map((e) => `「${e.ev.v}」→ ${e.sign > 0 ? 'ふえる → たしざん（＋）' : 'へる → ひきざん（−）'}`)];
    if (extra) why.push(`${extra.label}は きかれて いる ${SB.name}では ないので つかわない。`);
  }
  // ふえる？へる？ の ミニクイズ（しきの きごうを まちがえた とき）
  const quiz = {};
  events.forEach((e) => {
    quiz[e.tok] = o.askMoved
      ? { q: `「${rel} ${SB.name}を あわせた かず」を しらべるのは？`, choices: ['たしざん', 'ひきざん'], correct: 0, word: e.ev.v, s: e.s }
      : { q: `「${e.ev.v}」で、${s.short}は？`, choices: ['ふえる', 'へる'], correct: e.sign > 0 ? 0 : 1, word: e.ev.v, s: e.s };
  });
  const stages = [{ n: a, kind: 'start' }, ...events.map((e) => ({ n: toks[e.tok].v, kind: e.sign > 0 ? 'in' : 'out', focus: !!o.askMoved }))];
  return finish({ scene: s.id, subj, sentences, toks, question, expr, answer, ask, quiz, why, rng,
    diagram: { type: 'seq', emoji: SB.emoji, stages, moved: !!o.askMoved }, extraTok, extraSubj: extra ? extra.subj : null });
}

// 2つの なかまの おはなし
// x, y：ぶんに でてくる じゅん（A, B）の かず
function grp(s0, rng, x, y, mode, c) {
  const s = named(s0, rng);
  const toks = [], sentences = [];
  sentences.push({ role: 'group', text: fill(rng.pick(s.text), 0, toks, [x, y], [s.a, s.b]) });
  let question, expr, answer, ask, why, diagram;
  const quiz = {};
  const unitSubj = s.subj, qw = qWord(unitSubj);
  if (mode === 'sum') {
    question = rng.pick(s.qSum);
    expr = [{ t: 0, sign: 1 }, { t: 1, sign: 1 }];
    answer = x + y;
    ask = askSet(rng, `${s.A}と ${s.B}を あわせた かず`, [`${s.A}と ${s.B}の かずの ちがい`, `${s.A}の かず`, `${s.B}の かず`]);
    const w = question.includes('あわせて') ? 'あわせて' : 'ぜんぶで';
    quiz[1] = { q: `「${w}」の かずを しらべるのは？`, choices: ['たしざん', 'ひきざん'], correct: 0, word: w, s: 1 };
    why = [`${s.A}と ${s.B}を あわせる → たしざん（＋）`];
    diagram = { type: 'grp', mode, a: x, b: y, ea: SUBJ[s.a].emoji, eb: SUBJ[s.b].emoji };
  } else if (mode === 'more' || mode === 'less' || mode === 'diff') {
    // おおい ほうが さきに でるとは かぎらない
    const bigT = x > y ? 0 : 1, smallT = 1 - bigT;
    const big = bigT === 0 ? s.A : s.B, small = bigT === 0 ? s.B : s.A;
    question = mode === 'more' ? `${big}は ${small}より ${qw} おおいですか。`
      : mode === 'less' ? `${small}は ${big}より ${qw} すくないですか。`
        : `${s.A}と ${s.B}の かずの ちがいは ${qw}ですか。`;
    expr = [{ t: bigT, sign: 1 }, { t: smallT, sign: -1 }];
    answer = Math.abs(x - y);
    ask = askSet(rng, `${s.A}と ${s.B}の かずの ちがい`, [`${s.A}と ${s.B}を あわせた かず`, `${s.A}の かず`, `${s.B}の かず`]);
    const w = mode === 'more' ? 'おおい' : mode === 'less' ? 'すくない' : 'ちがい';
    quiz[smallT] = { q: `「${w}」と、かずの ちがいを しらべるのは？`, choices: ['たしざん', 'ひきざん'], correct: 1, word: w, s: 1 };
    why = [`「${w}」→ ${s.A}と ${s.B}の ちがいを くらべる。`, `ちがいは ひきざん。おおきい かず（${big}）から ちいさい かずを ひく。`];
    if (mode === 'less') why.push('「すくない」と きかれても、ちがいを だすのは ひきざんだよ。');
    if (bigT === 1) why.push('ぶんに さきに でて くる かずから ひくとは かぎらないよ。');
    diagram = { type: 'grp', mode: 'diff', a: Math.max(x, y), b: Math.min(x, y), ea: SUBJ[bigT === 0 ? s.a : s.b].emoji, eb: SUBJ[bigT === 0 ? s.b : s.a].emoji };
  } else {
    const mv = rng.pick(s.minus);
    sentences.push({ role: 'event', sign: -1, verb: mv.v, text: fill(mv.t, 1, toks, [c], [s.subj]) });
    question = rng.pick(s.qLeft);
    expr = [{ t: 0, sign: 1 }, { t: 1, sign: 1 }, { t: 2, sign: -1 }];
    answer = x + y - c;
    ask = askSet(rng, `${s.now}の かず`, [`${s.A}と ${s.B}を あわせた かず`, `${mv.rel} ${s.all}の かず`]);
    quiz[1] = { q: `${s.A}と ${s.B}を ぜんぶ あわせるのは？`, choices: ['たしざん', 'ひきざん'], correct: 0, word: null, s: 0 };
    quiz[2] = { q: `「${mv.v}」で、${s.all}は？`, choices: ['ふえる', 'へる'], correct: 1, word: mv.v, s: 1 };
    why = [`まず ${s.A}と ${s.B}を あわせる → たしざん（＋）`, `「${mv.v}」→ へる → ひきざん（−）`];
    diagram = { type: 'seq', emoji: SUBJ[s.a].emoji, stages: [{ n: x, kind: 'start' }, { n: y, kind: 'in', pair: true }, { n: c, kind: 'out' }] };
  }
  return finish({ scene: s.id, subj: unitSubj, sentences, toks, question, expr, answer, ask, quiz, why, rng, diagram, extraTok: -1, extraSubj: null });
}

// ばめんの なかの @ を なまえに おきかえる
function named(s, rng) {
  const n = rng.pick(NAMES);
  const R = (v) => (typeof v === 'string' ? v.replace(/@/g, n) : Array.isArray(v) ? v.map(R) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, R(x)])) : v);
  return R(s);
}

function qWord(subj) { return { ひき: 'なんびき', こ: 'なんこ', ほん: 'なんぼん', まい: 'なんまい', にん: 'なんにん', だい: 'なんだい', わ: 'なんわ', さつ: 'なんさつ' }[SUBJ[subj].unit]; }
function say(tok) { const w = countWord(tok.subj, tok.v); return w.num + w.suf; }
function askSet(rng, correct, pool) {
  const wrong = rng.shuffle([...new Set(pool)].filter((x) => x !== correct)).slice(0, 2);
  const options = rng.shuffle([correct, ...wrong]);
  return { options, correct: options.indexOf(correct) };
}

function finish(p) {
  const { rng } = p;
  p.sentences.push({ role: 'question', text: p.question });
  const unit = SUBJ[p.subj].unit;
  // たんいの えらびかた：まぎらわしい ものを いれる（つかわない かずの たんい など）
  const pool = UNITS.filter((u) => u !== unit);
  const near = p.extraSubj && SUBJ[p.extraSubj].unit !== unit ? [SUBJ[p.extraSubj].unit] : [];
  const others = rng.shuffle(pool.filter((u) => !near.includes(u)));
  p.units = rng.shuffle([unit, ...near, ...others].slice(0, 3));
  p.unit = unit;
  p.tokens = p.toks; delete p.toks; delete p.rng;
  return p;
}

// ───── しきを しらべる ─────
// child: [{t, sign}] こどもが つくった しき（さいしょの かずの sign は +1）
// かえりち：{ ok } か { ok:false, cat, tok, msg }
export function evalExpr(p, child) {
  let v = 0, neg = false;
  child.forEach((c, i) => { v += (i === 0 ? 1 : c.sign) * p.tokens[c.t].v; if (v < 0) neg = true; });
  return { v, neg };
}
export function checkExpr(p, child) {
  if (child.length < 2) return { ok: false, cat: 'short', msg: 'しきが まだ とちゅうだよ。かずを 2つ いじょう つかおう。' };
  const want = p.expr.map((e) => e.t);
  const used = child.map((c) => c.t);
  const dup = used.find((t, i) => used.indexOf(t) !== i);
  if (dup != null) return { ok: false, cat: 'dup', tok: dup, msg: 'おなじ かずを 2かい つかって いるよ。' };
  const extra = used.find((t) => !want.includes(t));
  if (extra != null) {
    const isExtraSentence = p.extraTok === extra;
    return { ok: false, cat: 'extra', tok: extra,
      msg: isExtraSentence ? 'その かずは、きかれて いる ことと かんけい ある？ もんだいの さいごの ぶんを よもう。'
        : 'その かずは つかうかな？ なにを きかれて いるか、もういちど よもう。' };
  }
  const miss = want.find((t) => !used.includes(t));
  if (miss != null) return { ok: false, cat: 'missing', tok: miss, msg: 'つかって いない かずが あるよ。ぶんを ぜんぶ よんだかな？' };
  const { v, neg } = evalExpr(p, child);
  if (v === p.answer && !neg) return { ok: true };
  if (neg) return { ok: false, cat: 'order', tok: child[0].t, msg: 'とちゅうで ひけなく なって いるよ。はじめの かずは どれかな？' };
  // きごうを まちがえた ところを さがす
  const signOf = (list, t) => { const i = list.findIndex((c) => c.t === t); return i === 0 ? 1 : list[i].sign; };
  const bad = p.expr.find((e) => signOf(child, e.t) !== e.sign && p.quiz[e.t]) || p.expr.find((e) => signOf(child, e.t) !== e.sign);
  return { ok: false, cat: 'op', tok: bad ? bad.t : child[1].t, msg: '＋と −は あって いるかな？' };
}

// もんだいの こたえを みせる しき（"5 + 3 + 2"）
export function exprText(p, list = p.expr) {
  return list.map((e, i) => (i === 0 ? '' : e.sign > 0 ? ' ＋ ' : ' − ') + p.tokens[e.t].v).join('');
}

// ───── ことばしわけ（たしざん？ ひきざん？）─────
export const PHRASES = [
  ['3びき のりました', 1, 1, 'のる → ふえる'], ['2ひき おりました', -1, 1, 'おりる → へる'], ['4こ もらいました', 1, 1, 'もらう → ふえる'],
  ['3こ たべました', -1, 1, 'たべる → へる'], ['5わ とんで きました', 1, 1, 'くる → ふえる'], ['2わ とんで いきました', -1, 1, 'いく → へる'],
  ['ともだちに 2こ あげました', -1, 1, 'あげる → へる'], ['3にん あそびに きました', 1, 1, 'くる → ふえる'], ['ふたり かえりました', -1, 1, 'かえる → へる'],
  ['あわせて なんこ', 1, 1, 'あわせる → たしざん'], ['ぜんぶで なんぼん', 1, 1, 'ぜんぶ → たしざん'], ['のこりは なんまい', -1, 1, 'のこり → ひきざん'],
  ['2だい はいって きました', 1, 1, 'はいって くる → ふえる'], ['3だい でて いきました', -1, 1, 'でて いく → へる'],
  ['おみせで 2ほん かいました', 1, 2, 'かう → ふえる'], ['ともだちに 1ぽん かしました', -1, 2, 'かす → へる'],
  ['ちがいは なんこ', -1, 2, 'ちがい → ひきざん'], ['どちらが なんびき おおい', -1, 2, 'くらべる → ひきざん'],
  ['なんにん すくない', -1, 2, '「すくない」も くらべる → ひきざん'], ['4ひき とびこんで きました', 1, 2, 'くる → ふえる'],
  ['おりたのは あわせて なんびき', 1, 3, '「おりた」でも、おりた かずを あわせる → たしざん'],
  ['たべたのは ぜんぶで なんこ', 1, 3, '「たべた」でも、たべた かずを あわせる → たしざん'],
  ['しろい はなは あかい はなより なんぼん すくない', -1, 3, 'ちがいを くらべる → ひきざん'],
  ['5ひき のって いて、2ひき おりると', -1, 3, 'おりると へる → ひきざん'],
  ['2ひき おりて、3びき のって くると', 1, 3, 'のって くると ふえる → たしざん'],
].map(([text, sign, level, why]) => ({ text, sign, level, why }));
