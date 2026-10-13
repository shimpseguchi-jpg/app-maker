// ぼうけんの スコア（Slay the Spire の スコアを もとに、この ゲーム むけに）
import { CARDS } from '../data/cards.js';
import { MODS, modScore } from '../data/mods.js';

const BOSS_PTS = [0, 50, 150, 300];
export const DIFF_BONUS = { easy: 0, normal: 0.2 };
export const OVERKILL = [30000, 10000];

// 1つの アイテム：{ id, icon, name, desc, pts }
export function runScore(run, win) {
  const s = run.stats || {};
  const items = [];
  const add = (id, icon, name, desc, pts) => { if (pts) items.push({ id, icon, name, desc, pts }); };
  const deck = run.deck || [];
  const nonStarter = deck.filter((c) => !c.st && c.id !== 'rune' && CARDS[c.id] && CARDS[c.id].type !== 'curse');

  add('floors', '🗺️', 'すすんだ マス', `${s.floors || 0}マス × 5`, (s.floors || 0) * 5);
  add('kills', '👾', 'たおした モンスター', `${s.kills || 0}たい × 2`, (s.kills || 0) * 2);
  for (const act of [1, 2, 3]) { const n = (s.elites || [])[act] || 0; add('elite' + act, '💀', `つよい {敵|てき} ${act}しょう`, `${n}たい × ${act * 10}`, n * act * 10); }
  add('bosses', '👑', 'たおした ボス', `${s.bosses || 0}たい`, BOSS_PTS[Math.min(3, s.bosses || 0)]);
  add('champion', '🏅', 'チャンピオン', `つよい {敵|てき}に ノーダメージで かった ×${s.champion || 0}`, (s.champion || 0) * 25);
  if ((s.perfect || 0) >= 3) add('beyond', '🌟', 'ちょうえつ', 'ボス 3たいに ノーダメージで かった', 200);
  else add('perfect', '✨', 'パーフェクト', `ボスに ノーダメージで かった ×${s.perfect || 0}`, (s.perfect || 0) * 50);
  if ((s.best || 0) >= OVERKILL[0]) add('overkill2', '💥', 'ちょう オーバーキル', `1かいで ${OVERKILL[0]} いじょうの ダメージ`, 50);
  else if ((s.best || 0) >= OVERKILL[1]) add('overkill', '💥', 'オーバーキル', `1かいで ${OVERKILL[1]} いじょうの ダメージ`, 25);
  const handKinds = Object.keys(s.hands || {}).filter((h) => h !== 'none' && h !== 'high').length;
  if (handKinds >= 10) add('hands', '🃏', '{役|やく}の はかせ', `${handKinds}しゅるいの {役|やく}を つかった`, 50);
  else if (handKinds >= 7) add('hands', '🃏', '{役|やく}あつめ', `${handKinds}しゅるいの {役|やく}を つかった`, 25);
  // まなび
  add('calc', '🔮', 'ひらめき', `けいさん チャレンジ せいかい ${s.challengeOk || 0}かい × 2`, (s.challengeOk || 0) * 2);
  if ((s.challengeTry || 0) >= 10 && s.challengeOk === s.challengeTry) add('calcPerfect', '🎓', 'けいさん はかせ', `チャレンジを ${s.challengeTry}かい ぜんぶ せいかい`, 50);
  add('quiz', '📜', 'なぞとき', `せいかい ${s.quizOk || 0}かい × 5`, (s.quizOk || 0) * 5);
  // はやさ
  const min = (s.playMs || 0) / 60000;
  if (win && min > 0 && min < 45) add('light', '⚡', 'ひかりの はやさ', '45ふん いないに クリア', 50);
  else if (win && min > 0 && min < 60) add('speed', '🏃', 'スピードスター', '60ぷん いないに クリア', 25);
  // デッキ
  const ids = nonStarter.map((c) => c.id);
  const counts = {};
  ids.forEach((id) => { counts[id] = (counts[id] || 0) + 1; });
  const sets = Object.values(counts).filter((n) => n >= 4).length;
  if (win && ids.length && sets === 0 && Object.values(counts).every((n) => n === 1)) add('highlander', '🗡️', 'ハイランダー', 'おなじ カードが 1{枚|まい}ずつ（はじめの カードと ルーンは のぞく）', 100);
  add('collector', '🧺', 'コレクター', `おなじ カードを 4{枚|まい} いじょう ×${sets}しゅるい`, sets * 25);
  if (win && !deck.some((c) => c.id !== 'rune' && CARDS[c.id] && CARDS[c.id].rar === 'r')) add('pauper', '🪵', 'パウパー', 'レアカードを 1{枚|まい}も もたずに クリア', 50);
  if (deck.filter((c) => CARDS[c.id] && CARDS[c.id].type === 'curse').length >= 5) add('curses', '⚫', 'のろわれた！', 'のろいの カードが 5{枚|まい} いじょう', 100);
  if (deck.length >= 40) add('encyclopedia', '📚', 'ひゃっかじてん', `デッキが ${deck.length}{枚|まい}`, 50);
  else if (deck.length >= 30) add('librarian', '📖', 'としょかん', `デッキが ${deck.length}{枚|まい}`, 25);
  // あつめた もの
  if ((s.arcanaGot || 0) >= 8) add('shiny', '🔮', 'アルカナ だいすき', `アルカナを ${s.arcanaGot}こ てに いれた`, 50);
  const coins = s.coinsEarned || 0;
  if (coins >= 300) add('gold', '🪙', 'コイン だいすき', `コインを ${coins}まい あつめた`, 75);
  else if (coins >= 200) add('rain', '🪙', 'コインの あめ', `コインを ${coins}まい あつめた`, 50);
  else if (coins >= 120) add('money', '🪙', 'マネー マネー', `コインを ${coins}まい あつめた`, 25);
  if ((s.events || 0) >= 7) add('mystery', '❔', 'ミステリー マシン', `なぞの マスに ${s.events}かい はいった`, 25);

  const subtotal = items.reduce((t, x) => t + x.pts, 0);
  const mults = [];
  const db = DIFF_BONUS[run.diff] || 0;
  if (db) mults.push({ icon: '🔥', name: 'むずかしさ「ふつう」', v: db });
  for (const id of run.mods || []) if (MODS[id] && MODS[id].score) mults.push({ icon: MODS[id].icon, name: MODS[id].name, v: MODS[id].score });
  const mult = Math.max(0.5, Math.round((1 + db + modScore(run.mods)) * 100) / 100);
  return { items, subtotal, mults, mult, total: Math.round(subtotal * mult) };
}
