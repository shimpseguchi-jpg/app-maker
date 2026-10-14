// イベントの条件・効果で使う小さな道具
import { rel } from '../engine/core.js';

export const act = (g) => g.seats.filter((id) => g.majors[id].panel).map((id) => g.majors[id]);
export const bgs = (g) => Object.values(g.backs).filter((b) => !b.owner && !b.sunk);
export const avg = (g, k) => { const a = act(g); return a.length ? a.reduce((s, c) => s + c.stats[k], 0) / a.length : 0; };
export const fired = (g, id) => g.fired[id] != null;
export const since = (g, id) => (fired(g, id) ? g.year - g.fired[id] : 99);
export const flagSince = (g, f) => (g.flags[f] != null ? g.year - g.flags[f] : 99);
export const best = (arr, f) => arr.reduce((a, b) => (f(b) > f(a) ? b : a), arr[0]);
export const ai = (g) => act(g).filter((c) => !c.player);
export const live = (g, id) => (g.majors[id] ? g.majors[id].panel : g.backs[id] && !g.backs[id].owner && !g.backs[id].sunk);

// 核を持つ国どうしで、関係が冷え切った組
export function nukePair(g, th = 20) {
  const n = act(g).filter((c) => c.stats.nuke >= 4);
  let pair = null, low = th;
  for (const a of n) for (const b of n) if (a.id < b.id && rel(g, a.id, b.id) < low) { low = rel(g, a.id, b.id); pair = [a.id, b.id]; }
  return pair;
}
export function spaceRivals(g) {
  const t = act(g).filter((c) => c.stats.tech >= 80);
  for (const a of t) for (const b of t) if (a.id < b.id && rel(g, a.id, b.id) < 45) return [a.id, b.id];
  return null;
}
