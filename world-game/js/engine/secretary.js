// 補佐官（秘書）と国民の気持ち
// 国民の気持ち（c.mood、0〜100）は短絡的で自国優先：自国を優先する選択で上がり、よその国を助ける選択で下がる。
// 毎年、暮らしの満足度に少し寄っていき、政情の落ち着く先（tick.js）を上下させる
// 教育で国民の話し方と気持ちの動き方が変わる：教育が低い国は感情的・目先のこと（選択への反応が大きい）、
// 教育が高い国は理性的・長い目（選択への反応は小さく、暮らしの実際で判断する）
import { SEC_REACT, SEC_DANGER, SEC_DANGER_ORDER, SEC_MOOD, SEC_POP, SEC_TONE, TONE_POP, TONE_LIVING, livingMood } from '../data/secretary.js';
import { STAT_INFO } from '../data/countries.js';
import { eduLevel, EDU_LOW, EDU_HIGH } from './core.js';
import { clamp } from '../util.js';

// 国民の話し方：emo（教育が低い）／mid／wise（教育が高い）
export const toneOf = (c) => { const e = eduLevel(c); return e < EDU_LOW ? 'emo' : e >= EDU_HIGH ? 'wise' : 'mid'; };
const toned = (c, kind, key, fallback) => SEC_TONE[toneOf(c)]?.[kind]?.[key] || fallback;

const pickT = (g, pair) => pair[g.kid ? 1 : 0];

// 暮らしの満足度は半分だけ効かせる（25〜75）。貧しい国が最初から怒っていて崩れやすくならないように。気持ちを大きく動かすのは選択
const moodTarget = (c) => 25 + livingMood(c) / 2;
export const getMood = (c) => (c.mood ?? (c.mood = Math.round(moodTarget(c))));
export function addMood(c, d) { c.mood = clamp(getMood(c) + d, 0, 100); }
// 政策のタグで気持ちが動く（自国優先・強硬は喜ばれ、協調は不満）
export const POL_MOOD = { selfish: 4, aggr: 2, coop: -2 };
export function moodFromPolicy(c, tags = []) {
  let d = 0;
  for (const t of tags) d += POL_MOOD[t] || 0;
  if (d) addMood(c, d * TONE_POP[toneOf(c)]);
  return d;
}
// ニュースの選択で気持ちが動く（教育で大きさが変わる）
export function moodFromReaction(c, pop) { if (pop) addMood(c, pop * 2 * TONE_POP[toneOf(c)]); }

// ニュースへの反応のあと：自国優先なら喝采、よその国を助けたら不満。どちらでもなければ、いちばん動いた数値の「街の声」
function popLine(g, pop) {
  const dir = pop > 0 ? 'up' : 'down';
  const list = toned(g.majors[g.player], 'pop', dir, SEC_POP[dir]);
  return pickT(g, list[(g.year + Math.abs(pop)) % list.length]);
}
export function secAfterReact(g, rres, pop = 0) {
  if (pop) return popLine(g, pop);
  const mine = (rres || []).filter((r) => r.id === g.player && SEC_REACT[`up.${r.stat}`]);
  if (!mine.length) return pickT(g, SEC_REACT.calm);
  const top = mine.reduce((m, x) => (Math.abs(x.a) > Math.abs(m.a) ? x : m));
  const key = `${top.a > 0 ? 'up' : 'down'}.${top.stat}`;
  return pickT(g, toned(g.majors[g.player], 'react', key, SEC_REACT[key]));
}

// 年のおわり（すべての国）：気持ちが暮らしの満足度に少し寄る
export function moodYearEnd(c) { const w = TONE_LIVING[toneOf(c)]; c.mood = Math.round(getMood(c) * (1 - w) + moodTarget(c) * w); }

// 年のおわりの補佐官のせりふ：あぶない数値（同じ注意が2年続いたら次のもの）→ 気持ちの変化 → 気持ちの高さ
export function secYearEnd(g) {
  const c = g.majors[g.player];
  if (!c?.panel || c.secSkip === g.year) return null;
  const m = getMood(c);
  const prev = c.moodPrev;
  c.moodPrev = m;
  const dangers = SEC_DANGER_ORDER.filter((k) => {
    const i = STAT_INFO[k], v = c.stats[k];
    return i && v != null && ((i.low != null && v <= i.low) || (i.high != null && v >= i.high));
  });
  let key = dangers.find((k) => k !== c.secLast);
  let text;
  if (key) text = pickT(g, SEC_DANGER[key]);
  else {
    key = prev != null && m - prev >= 6 ? 'up' : prev != null && m - prev <= -6 ? 'down' : m >= 62 ? 'high' : m >= 42 ? 'mid' : 'low';
    text = pickT(g, toned(c, 'mood', key, SEC_MOOD[key]));
  }
  c.secLast = key;
  return text;
}
export const secBack = (g) => pickT(g, SEC_MOOD.back);
export const secPolicy = (g, d) => (d ? popLine(g, d) : null);
