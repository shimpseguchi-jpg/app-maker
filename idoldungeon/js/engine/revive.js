// 戦闘不能と蘇生（エルミナージュ式。ただしロストはなし）
//   死亡 →（寺院で蘇生）成功：復帰 ／ 失敗：灰
//   灰   →（寺院で蘇生）成功：復帰 ／ 失敗：灰のまま（ロストしない。お金だけ失う）
// 成功率はスタミナ（エルミナージュの生命力）で上がる。数値は仮

export const CONDITIONS = {
  ok:       { name: '正常' },
  poison:   { name: '毒',   cure: '解毒の魔法・薬。戦闘後も歩くたびにHPが減る' },
  sleep:    { name: '睡眠', cure: '攻撃を受ける・時間経過' },
  paralyze: { name: '麻痺', cure: '回復魔法・寺院' },
  stone:    { name: '石化', cure: '回復魔法・寺院' },
  dead:     { name: '死亡', cure: '蘇生魔法・寺院（失敗すると灰）' },
  ash:      { name: '灰',   cure: '寺院（失敗しても灰のまま）' },
};
// 戦えない状態（全員がこれになると全滅：迷宮に残されたメンバーは、別のパーティで回収しに行く）
export const DOWN = new Set(['paralyze', 'stone', 'dead', 'ash']);

export const REVIVE_FEE = { dead: 100, ash: 250 }; // × レベル（仮）

export function reviveChance(unit, state) {
  const sta = unit.base.sta;
  if (state === 'dead') return Math.min(95, 50 + sta * 3);
  if (state === 'ash') return Math.min(90, 35 + sta * 3);
  return 100;
}

// rng: 0以上1未満を返す関数。戻り値は蘇生後の状態（ok / ash）
export function tryRevive(unit, state, rng = Math.random) {
  if (state !== 'dead' && state !== 'ash') return state;
  return rng() * 100 < reviveChance(unit, state) ? 'ok' : 'ash';
}

export const isWiped = (states) => states.length > 0 && states.every((s) => DOWN.has(s));
