// とくしゅルール・うでだめし・スコアの テスト
import * as R from '../js/engine/run.js';
import * as B from '../js/engine/battle.js';
import { runScore } from '../js/engine/runscore.js';
import { MODS, MOD_LIST, pickMods, modScore } from '../js/data/mods.js';
import { placementQuestion, judgePlacement, nextLevel } from '../js/data/placement.js';
import { cardCost, CARDS } from '../js/data/cards.js';
import { makeRng } from '../js/util.js';

let fail = 0;
const ok = (c, msg) => { if (!c) { fail++; console.log('NG', msg); } else console.log('ok', msg); };
const mk = (mods, extra = {}) => R.newRun({ hero: 0, grade: 2, diff: 'normal', seed: 99, mode: 'random', mods, ...extra });

// pickMods：3つ、おなじ group は 1つまで
const rng = makeRng(1);
let good = true;
for (let i = 0; i < 500; i++) { const m = pickMods(rng); if (m.length !== 3 || new Set(m).size !== 3 || m.filter((x) => MODS[x].group === 'start').length > 1) good = false; }
ok(good, 'pickMods: 3つ・かさならない・はじまりルールは1つまで');
ok(MOD_LIST.length === 26, `とくしゅルールは 26しゅるい（${MOD_LIST.length}）`);
ok(Math.abs(modScore(['glass', 'midas']) - 0.2) < 1e-9, 'modScore の ごうけい');

// マップ
const c = mk(['certain']);
const nodes = Object.values(c.map.nodes);
ok(nodes.length === 8 && nodes.every((n) => n.next.length <= 1), 'かくてい みらい：1ぽんみち');
const f = mk(['flight']);
const n0 = Object.values(f.map.nodes).find((n) => n.col === 0);
f.pos = n0.id;
const col1 = Object.values(f.map.nodes).filter((n) => n.col === 1).map((n) => n.id);
ok(R.availableNodes(f).length === col1.length, 'ひしょう：つぎの れつ ぜんぶ');
const last = Object.values(f.map.nodes).find((n) => n.col === 6); f.pos = last.id;
ok(R.availableNodes(f).join() === 'boss', 'ひしょう：さいごは ボス');

// カード・コイン
const h = mk(['hoarder']);
const n = h.deck.length; R.gainCard(h, R.makeCard('spark'));
ok(h.deck.length === n + 3, 'しゅうしゅうへき：3{枚|まい}');
const m = mk(['midas']); m.coins = 10;
ok(R.battleCoins(m, 'battle').total === (4 + 2) * 2, 'ミダス：コイン 2ばい');
R.addCoins(m, 7); ok(m.stats.coinsEarned === 7, 'あつめた コインを かぞえる');
const g = mk(['glass']); ok(g.maxHp === Math.round(95 * 0.7), 'ガラスの からだ：HP 3わり へる');

// たたかい
const L = mk(['lethal', 'terminal', 'snecko', 'slow']);
const b = B.createBattle(L, ['wolf'], 'battle', makeRng(5));
ok(b.enemies[0].str === 3 && b.enemies[0].weak === 2, 'ちめいしょう＋じかんの おくれ：てきの じょうたい');
B.startTurn(b);
ok(b.buff.mult === 3 && b.pBlock === 3, 'ちめいしょう：ばいりつ+3、ターミナル：まもり+3');
ok(b.hand.length === Math.min(L.deck.length, 8), `へびの め：てふだ +1（${b.hand.length}）`);
ok(b.hand.filter((x) => CARDS[x.id].type !== 'rune').every((x) => x.costR >= 0 && x.costR <= 3 && cardCost(x) === x.costR), 'へびの め：コスト 0〜3');

// はじまりの デッキ
const s = mk(['spirits', 'cursed', 'allstar', 'specialized', 'heirloom']);
const gifts = R.applyStartMods(s, makeRng(3));
ok(gifts.filter((x) => CARDS[x.id].type === 'aura').length >= 5 && gifts.some((x) => x.id === 'zeroMark') && gifts.length === 5 + 1 + 5 + 5, 'おくりものの カード');
ok(s.arcana.length === 2, 'かほう：アルカナ +1');
ok(R.startMode(mk(['draft'])) === 'draft' && R.startMode(mk([])) === 'packs', 'はじめかたの ルール');
ok(R.draftOffer(s, makeRng(8)).length === 3 && R.insanityDeck(s, makeRng(8)).length === 25, 'ドラフト 3まい・きょうき 25まい');
const cu = mk(['cursed']); ok(R.bossCurse(cu) === 2 && cu.deck.filter((x) => x.id === 'zeroMark').length === 2, 'のろわれた みち：ボスの あと 2まい');

// うでだめし
const pr = makeRng(2);
let qok = true;
for (let lv = 1; lv <= 6; lv++) for (let i = 0; i < 300; i++) { const q = placementQuestion(lv, pr); const e = q.q.replace('×', '*').replace('÷', '/').replace('−', '-'); if (eval(e) !== q.a || q.a < 0 || !Number.isInteger(q.a)) qok = false; }
ok(qok, 'うでだめしの こたえが ただしい（せいの せいすう）');
ok(nextLevel(6, true) === 6 && nextLevel(1, false) === 1, 'レベルは 1〜6');
ok(judgePlacement([{ lv: 3, ok: true, sec: 4 }, { lv: 4, ok: true, sec: 5 }, { lv: 5, ok: true, sec: 7 }, { lv: 6, ok: false, sec: 30 }, { lv: 5, ok: true, sec: 6 }]).grade === 3, '3ねんせい はんてい');
ok(judgePlacement([{ lv: 3, ok: false, sec: 20 }, { lv: 2, ok: false, sec: 20 }, { lv: 1, ok: true, sec: 9 }, { lv: 2, ok: false, sec: 20 }, { lv: 1, ok: true, sec: 8 }]).diff === 'easy', 'かんたん はんてい');
ok(judgePlacement([{ lv: 3, ok: true, sec: 30 }, { lv: 4, ok: false, sec: 30 }, { lv: 3, ok: true, sec: 30 }, { lv: 4, ok: true, sec: 30 }, { lv: 5, ok: false, sec: 30 }]).grade === 2, '2ねんせい はんてい');

// スコア
const r = mk(['glass', 'draft', 'midas']);
Object.assign(r.stats, { floors: 24, kills: 10, elites: [0, 1, 1, 1], bosses: 3, champion: 1, perfect: 3, best: 12000, challengeOk: 10, challengeTry: 10, quizOk: 2, playMs: 40 * 60000 });
const sc = runScore(r, true);
const has = (id) => sc.items.some((x) => x.id === id);
ok(has('beyond') && !has('perfect') && has('light') && !has('speed') && has('overkill') && has('calcPerfect'), 'うえの こうもくが したの こうもくを うわがき');
ok(sc.subtotal === 120 + 20 + 10 + 20 + 30 + 300 + 25 + 200 + 25 + 20 + 50 + 10 + 50 + (sc.items.find((x) => x.id === 'highlander')?.pts || 0) + (sc.items.find((x) => x.id === 'pauper')?.pts || 0), `ごうけい ${sc.subtotal}`);
ok(sc.mult === 1.5 && sc.total === Math.round(sc.subtotal * 1.5), `ばいりつ ×${sc.mult}（ふつう+20% ガラス+25% ドラフト+10% ミダス−5%）`);
const e = runScore(R.newRun({ hero: 1, grade: 1, diff: 'easy', seed: 3 }), false);
ok(e.mult === 1 && e.total === 0, 'はじめた ばかりは 0てん');
console.log(fail ? `\n${fail} NG` : '\nall ok');
process.exit(fail ? 1 : 0);
