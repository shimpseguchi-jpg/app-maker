// 呪文（エルミナージュ式の回数制。系統ごとに回数があり、宿屋で休むと全快する）
// family: arcane 理魔法 / heal 回復魔法 / dark 闇魔法 / alchemy 錬金術（js/data/classes.js の能力 id と同じ）
// lv: 覚えるレベル / kind: 効果の種類（js/engine/battle.js）/ power: 威力の倍率
// target: enemy(敵1体) group(敵1グループ) enemies(敵全体) ally(味方1人) allies(味方全体) self / none
// 名前は本作オリジナル

export const SPELL_LIST = [
  { id: 'flameArrow', family: 'arcane', lv: 1, name: '炎の矢', kind: 'dmgOne', power: 1.3, target: 'enemy', text: '敵1体に炎のダメージ' },
  { id: 'blizzard', family: 'arcane', lv: 3, name: '吹雪', kind: 'dmgGroup', power: 0.9, target: 'group', text: '敵1グループに氷のダメージ' },
  { id: 'starfall', family: 'arcane', lv: 7, name: '流星', kind: 'dmgAll', power: 0.9, target: 'enemies', text: '敵全体にダメージ' },
  { id: 'heal1', family: 'heal', lv: 1, name: '癒やし', kind: 'healOne', power: 1.0, target: 'ally', text: '味方1人のHPを回復' },
  { id: 'cure', family: 'heal', lv: 2, name: '浄化', kind: 'cure', target: 'ally', text: '味方1人の毒・麻痺・睡眠・沈黙を治す' },
  { id: 'heal2', family: 'heal', lv: 5, name: '祝福の光', kind: 'healAll', power: 0.8, target: 'allies', text: '味方全体のHPを回復' },
  { id: 'raise', family: 'heal', lv: 9, name: '蘇生', kind: 'revive', target: 'ally', text: '死亡した味方を生き返らせる（失敗すると灰）' },
  { id: 'shadowBolt', family: 'dark', lv: 1, name: '闇の矢', kind: 'dmgOne', power: 1.2, target: 'enemy', text: '敵1体に闇のダメージ' },
  { id: 'sleepMist', family: 'dark', lv: 2, name: '眠りの霧', kind: 'sleepGroup', target: 'group', text: '敵1グループを眠らせる' },
  { id: 'silence', family: 'dark', lv: 4, name: '沈黙の帳', kind: 'silenceGroup', target: 'group', text: '敵1グループの呪文を封じる' },
  { id: 'poisonGas', family: 'alchemy', lv: 1, name: '毒ガス', kind: 'dmgGroup', power: 0.6, poison: true, target: 'group', text: '敵1グループにダメージと毒' },
  { id: 'retreat', family: 'alchemy', lv: 3, name: '撤収の煙', kind: 'escape', target: 'none', text: '全員を確実に戦闘から逃がす（ボス戦では効かない）' },
  { id: 'acidRain', family: 'alchemy', lv: 6, name: '酸の雨', kind: 'dmgAll', power: 0.8, target: 'enemies', text: '敵全体にダメージ' },
];
export const SPELLS_BY_ID = Object.fromEntries(SPELL_LIST.map((s) => [s.id, s]));

// ライブスキル（楽曲）と呪文で共通の対象
export const KIND_TARGET = {
  dmgOne: 'enemy', dmgGroup: 'group', dmgAll: 'enemies', healOne: 'ally', healAll: 'allies', fullHealAll: 'allies',
  cure: 'ally', revive: 'ally', sleepGroup: 'group', silenceGroup: 'group', confuseGroup: 'group',
  buffAlly: 'ally', shieldSelf: 'self', escape: 'none',
};

// 系統ごとの呪文の回数（休むまで）。レベルが上がると増え、能力が高いと1回多い
export function spellPool(family, level, base) {
  const stat = family === 'heal' ? base.men : base.vo;
  return Math.min(9, 1 + Math.floor(level / 2) + (stat >= 15 ? 1 : 0));
}
