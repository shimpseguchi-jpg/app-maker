// 属性タグ（アイドルが持つ「属性」。単体では効果なし。パーティ内の重複・組み合わせでシナジーが発生する）
// cat: color(イメージカラー) / school(学年区分) / trait(性格・趣味) / origin(出身) / unit(ユニット)

export const TAG_CATS = {
  color:  { name: 'イメージカラー', order: 0 },
  school: { name: '学年区分', order: 1 },
  trait:  { name: '性格・趣味', order: 2 },
  origin: { name: '出身', order: 3 },
  unit:   { name: 'ユニット', order: 4 },
};

export const TAGS = {};
function def(id, cat, name, extra = {}) { TAGS[id] = { id, cat, name, ...extra }; }

// イメージカラー（hex はシナジー表示用の代表色）
def('red',    'color', '赤系',  { hex: '#e22b30' });
def('blue',   'color', '青系',  { hex: '#2743d2' });
def('green',  'color', '緑系',  { hex: '#3fb34f' });
def('yellow', 'color', '黄系',  { hex: '#f5c400' });
def('purple', 'color', '紫系',  { hex: '#9238be' });
def('pink',   'color', '桃系',  { hex: '#fd99e1' });
def('white',  'color', '白系',  { hex: '#d3dde9' });
def('black',  'color', '黒系',  { hex: '#515558' });

// 学年区分
def('jhs',   'school', '中学生');
def('hs',    'school', '高校生');
def('adult', 'school', '大人');

// 性格・趣味
def('genki',      'trait', '元気');
def('cool',       'trait', 'クール');
def('mysterious', 'trait', 'ミステリアス');
def('hardworker', 'trait', 'がんばり屋');
def('cook',       'trait', '料理上手');
def('singer',     'trait', '歌好き');
def('shy',        'trait', '控えめ');
def('japanese',   'trait', '和風');
def('reliable',   'trait', 'しっかり者');
def('intelli',    'trait', 'インテリ');
def('glasses',    'trait', 'メガネ');
def('oneesan',    'trait', 'お姉さん');
def('lost',       'trait', '方向音痴');
def('airhead',    'trait', '天然');
def('ojou',       'trait', 'お嬢様');
def('tsundere',   'trait', 'ツンデレ');
def('sporty',     'trait', 'スポーツ好き');
def('boyish',     'trait', 'ボーイッシュ');
def('twin',       'trait', '双子');
def('prankster',  'trait', 'いたずら好き');
def('genius',     'trait', '天才肌');
def('mypace',     'trait', 'マイペース');
def('animal',     'trait', '動物好き');
def('gourmet',    'trait', '食いしん坊');
def('homey',      'trait', '家庭的');

// 出身
def('southern', 'origin', '南国育ち');

// ユニット
def('ryugu', 'unit', '竜宮小町');

export const COLOR_TAGS = Object.values(TAGS).filter((t) => t.cat === 'color').map((t) => t.id);
