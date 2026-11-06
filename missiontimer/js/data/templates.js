// テンプレ（REQUIREMENTS.md F-106）。ほごしゃモードで じさくの テンプレも ほぞん できる（save.js）
// minutes … はじまりからの ながさ（おわりの しょきち）。mode … おまかせの ほうしき
// 9.2 の 8 の いまの あん：あさは「おわり（しゅっぱつ）」が ぜったいで パネルが みじかいので、あさの したく だけ おなじ を ひょうじゅんに する
export const TEMPLATES = [
  { id: 'afterschool', name: 'ほうかご', emoji: '🏫', minutes: 60, mode: 'ratio', items: [{ panel: 'homework' }, { panel: 'book' }, { panel: 'game' }] },
  { id: 'morning', name: 'あさの したく', emoji: '🌅', minutes: 45, mode: 'equal', items: [{ panel: 'change' }, { panel: 'meal' }, { panel: 'teeth' }, { panel: 'prepare' }] },
  { id: 'bedtime', name: 'ねるまえ', emoji: '🌙', minutes: 45, mode: 'ratio', items: [{ panel: 'bath' }, { panel: 'teeth' }, { panel: 'book' }] },
  { id: 'holiday', name: 'きゅうじつの あさ', emoji: '☀️', minutes: 120, mode: 'ratio', items: [{ panel: 'drill' }, { panel: 'outside' }, { panel: 'free' }] },
];
