// しゅじんこう
export const HEROES = [
  { id: 'akari', name: 'アカリ', title: 'ほのおの まどうし', art: '🧙‍♀️', els: ['fire', 'thunder'], hp: 95,
    desc: '{倍率|ばいりつ}を ぐんぐん ふやす こうげき タイプ。ほのおと いかずち。',
    deck: [['fire', 2], ['fire', 3], ['fire', 3], ['fire', 5], ['fire', 7], ['thunder', 4], ['thunder', 5], ['thunder', 6], 'flameSpear', 'focus', 'guard', 'guard'],
    arcana: 'sigil_fire' },
  { id: 'sou', name: 'ソウ', title: 'みずの けんじゃ', art: '🧝', els: ['water', 'wood'], hp: 95,
    desc: '{守|まも}りが かたく、じゅうの わで {力|ちから}を ためる。みずと もり。',
    deck: [['water', 1], ['water', 4], ['water', 6], ['water', 9], ['wood', 2], ['wood', 5], ['wood', 5], ['wood', 8], 'wave', 'sprout', 'guard', 'guard'],
    arcana: 'tenRing' },
  { id: 'kuro', name: 'クロ', title: 'かげの ぬすびと', art: '🥷', els: ['shadow', 'thunder'], hp: 90,
    desc: 'ペアと くりかえしで おおわざを ねらう。やみと いかずち。',
    deck: [['shadow', 2], ['shadow', 2], ['shadow', 4], ['shadow', 4], ['shadow', 8], ['thunder', 3], ['thunder', 6], ['thunder', 7], 'clone', 'chain', 'guard', 'eclipse'],
    arcana: 'pairCharm' },
];
