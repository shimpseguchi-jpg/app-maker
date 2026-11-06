// パネルの しょき カタログ（REQUIREMENTS.md 4.2・仮）
// すべて 5ふん きざみ。きじゅん じかんの こんきょは RESEARCH.md 3章（学年×10分、読書10分以上、15分単位）。
//
// { id, obj, verb, emoji, kind, base, min, max, finish, unit?, unitOptional?, byGrade?, capped? }
//   obj / verb … もの／どうする（{漢字|かな} きほう。F-303 の ミッション文に つかう）
//   kind       … 'focus'（しゅうちゅう）| 'life'（せいかつ）| 'reward'（ごほうび）| 'rest'（きゅうけい）
//   base       … きじゅん じかん（分）。unit が あるものは 1つ あたり（プリント 1まい＝10分）
//   min / max  … おまかせが うごかせる はんい（分）。unit が あるものは 1つ あたり（すうりょう ばい）
//   finish     … 'timed'（じかんで おわる）| 'done'（できた！で おわる）
//   unit       … すうりょうの たんい（'まい' 'ページ'）。unitOptional … すうりょうは なくても よい
//   byGrade    … きじゅん ＝ 学年 × byGrade（しゅくだい は 学年×10）。base は 学年が わからないときの めやす
//   capped     … max は ほごしゃモードの ごほうび じょうげん（F-801）に したがう（ゲーム・どうが）
//
// ほごしゃモードの うわがき（F-802）は { ...panel, base, min, max, finish, fixed } の かたちで わたす。
//   fixed … finish が 'timed' の パネルを ほごしゃが きめた ながさで こてい する（4.3 の 2）

export const KINDS = {
  focus: { id: 'focus', name: 'しゅうちゅう' },
  life: { id: 'life', name: 'せいかつ' },
  reward: { id: 'reward', name: 'ごほうび' },
  rest: { id: 'rest', name: 'きゅうけい' },
};

// ごほうび（capped）の 1にちの じょうげん（分）の しょきち（仮。F-801）
export const DEFAULT_REWARD_CAP = 30;

export const PANELS = [
  // ── しゅうちゅう
  { id: 'homework', obj: '{宿題|しゅくだい}', verb: '{終|お}わらせる', emoji: '📝', kind: 'focus', base: 20, byGrade: 10, min: 10, max: 60, finish: 'done' },
  { id: 'print', obj: 'プリント', verb: '{終|お}わらせる', emoji: '📄', kind: 'focus', base: 10, min: 5, max: 40, unit: 'まい', finish: 'done' },
  { id: 'drill', obj: 'ドリル', verb: '{進|すす}める', emoji: '✏️', kind: 'focus', base: 10, min: 5, max: 30, unit: 'ページ', unitOptional: true, finish: 'done' },
  { id: 'kanji', obj: '{漢字|かんじ}', verb: '{練習|れんしゅう}する', emoji: '🈷️', kind: 'focus', base: 10, min: 5, max: 20, finish: 'done' },
  { id: 'calc', obj: '{計算|けいさん}', verb: '{解|と}く', emoji: '➕', kind: 'focus', base: 10, min: 5, max: 20, finish: 'done' },
  { id: 'ondoku', obj: '{音読|おんどく}', verb: '{読|よ}む', emoji: '📖', kind: 'focus', base: 5, min: 5, max: 10, finish: 'done' },
  { id: 'book', obj: '{本|ほん}', verb: '{読|よ}む', emoji: '📚', kind: 'focus', base: 15, min: 10, max: 30, finish: 'timed' },
  { id: 'tablet', obj: 'タブレット{学習|がくしゅう}', verb: 'やる', emoji: '💻', kind: 'focus', base: 15, min: 10, max: 30, finish: 'timed' },
  { id: 'practice', obj: 'ピアノなどの {練習|れんしゅう}', verb: 'する', emoji: '🎹', kind: 'focus', base: 15, min: 10, max: 30, finish: 'timed' },
  // ── せいかつ
  { id: 'prepare', obj: '{明日|あした}の {準備|じゅんび}', verb: 'する', emoji: '🎒', kind: 'life', base: 10, min: 5, max: 15, finish: 'done' },
  { id: 'tidy', obj: '{片|かた}づけ', verb: 'する', emoji: '🧹', kind: 'life', base: 10, min: 5, max: 20, finish: 'done' },
  { id: 'chores', obj: 'お{手伝|てつだ}い', verb: 'する', emoji: '🧺', kind: 'life', base: 10, min: 5, max: 20, finish: 'done' },
  { id: 'bath', obj: 'お{風呂|ふろ}', verb: '{入|はい}る', emoji: '🛁', kind: 'life', base: 20, min: 15, max: 30, finish: 'done' },
  { id: 'teeth', obj: '{歯|は}みがき', verb: 'する', emoji: '🪥', kind: 'life', base: 5, min: 5, max: 5, finish: 'timed' },
  { id: 'meal', obj: 'ご{飯|はん}', verb: '{食|た}べる', emoji: '🍚', kind: 'life', base: 30, min: 20, max: 40, finish: 'done' },
  { id: 'change', obj: '{着替|きが}え', verb: 'する', emoji: '👕', kind: 'life', base: 5, min: 5, max: 10, finish: 'done' },
  // ── ごほうび
  { id: 'game', obj: 'ゲーム', verb: '{楽|たの}しむ', emoji: '🎮', kind: 'reward', base: 20, min: 10, max: 180, capped: true, finish: 'timed' },
  { id: 'video', obj: '{動画|どうが}・テレビ', verb: '{見|み}る', emoji: '📺', kind: 'reward', base: 20, min: 10, max: 180, capped: true, finish: 'timed' },
  { id: 'art', obj: 'お{絵|え}かき・{工作|こうさく}', verb: 'する', emoji: '🎨', kind: 'reward', base: 20, min: 10, max: 40, finish: 'timed' },
  { id: 'outside', obj: '{外|そと}あそび', verb: 'する', emoji: '⚽', kind: 'reward', base: 30, min: 15, max: 60, finish: 'timed' },
  { id: 'free', obj: '{自由|じゆう}{時間|じかん}', verb: '{好|す}きにする', emoji: '🌈', kind: 'reward', base: 15, min: 5, max: 60, finish: 'timed' },
  // ── きゅうけい
  { id: 'rest', obj: '{休憩|きゅうけい}', verb: '{休|やす}む', emoji: '☕', kind: 'rest', base: 5, min: 5, max: 10, finish: 'timed' },
];

export const PANEL_BY_ID = Object.fromEntries(PANELS.map((p) => [p.id, p]));

export function panelById(id) { return PANEL_BY_ID[id] || null; }
