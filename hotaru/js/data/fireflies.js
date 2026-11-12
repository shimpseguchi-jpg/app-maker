// まいごの ほたる。たすけると ランタンに はいり、1ぴきごとに さいだい HPが ふえる
// from: どこで なかまに なるか（start＝さいしょから / floor＝その かいの かご / boss＝ボスを たおす）
export const FIREFLY_HP = 4; // 1ぴき あたりの さいだい HP
export const FIREFLIES = {
  pikari:  { name: 'ぴかり', hex: '#ffd84a', from: 'start' },
  merara:  { name: 'めらら', hex: '#ff6b5e', from: 'floor', floors: [1, 2] },
  shizuku: { name: 'しずく', hex: '#5aa9ff', from: 'floor', floors: [1, 2] },
  wakaba:  { name: 'わかば', hex: '#5fd67a', from: 'boss', floor: 3 },
  homura:  { name: 'ほむら', hex: '#ff9a4a', from: 'floor', floors: [4, 5] },
  ruri:    { name: 'るり', hex: '#7c8cff', from: 'floor', floors: [4, 5] },
  moegi:   { name: 'もえぎ', hex: '#9be36a', from: 'boss', floor: 6 },
  kogane:  { name: 'こがね', hex: '#ffe98a', from: 'floor', floors: [7, 8] },
  akane:   { name: 'あかね', hex: '#ff7fa8', from: 'floor', floors: [7, 8] },
};
for (const [id, f] of Object.entries(FIREFLIES)) f.id = id;
export const FIREFLY_LIST = Object.values(FIREFLIES);
export const colorOf = (id) => FIREFLIES[id].hex;
