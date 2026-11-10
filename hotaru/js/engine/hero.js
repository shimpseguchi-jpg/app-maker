// しゅじんこうの つよさ（きろく P から けいさんする）
import { FIREFLY_HP } from '../data/fireflies.js';
import { WEAPONS, SHIELDS } from '../data/items.js';
import { newLearn } from './learn.js';

export function newProfile(grade = 1, subjects = ['math', 'ja', 'en']) {
  return {
    v: 2, level: 1, exp: 0, gold: 30,
    seeds: { atk: 0, def: 0, hp: 0 },
    weapon: 0, shield: 0,
    bag: ['herb', 'herb', 'herb'],
    fireflies: ['pikari'],
    deepest: 0, bosses: [], clears: 0, runs: 0, falls: 0,
    seen: {}, // であった まもの
    tips: {},
    learn: newLearn(grade, subjects), // まなびの きろく
  };
}

export const expNeed = (lv) => 6 + 5 * lv + 2 * lv * lv;
export const MAX_LEVEL = 30;

export function heroStats(P) {
  const lv = P.level;
  return {
    maxHp: 26 + 6 * (lv - 1) + P.seeds.hp + FIREFLY_HP * P.fireflies.length,
    atk: 3 + lv + WEAPONS[P.weapon].atk + P.seeds.atk,
    def: Math.floor(lv / 2) + SHIELDS[P.shield].def + P.seeds.def,
    light: 4, crit: 5, regenEvery: 7,
  };
}

// けいけんちを くわえる。あがった レベルの かずを かえす
export function gainExp(P, n) {
  P.exp += n;
  let ups = 0;
  while (P.level < MAX_LEVEL && P.exp >= expNeed(P.level)) { P.exp -= expNeed(P.level); P.level++; ups++; }
  return ups;
}
