// もじの ひょうじ：ひらがな / かんじ（ふりがなつき） / かんじ
// 文字列の中の {漢字|かな} を モードに あわせて おきかえる。
let mode = 'hira';
const RE = /\{([^|{}]+)\|([^{}]+)\}/g;

export function setTextMode(m) { mode = m; }
export function getTextMode() { return mode; }

// HTML として つかう もじれつ
export function T(s) {
  if (s == null) return '';
  s = String(s);
  if (mode === 'hira') return s.replace(RE, '$2');
  if (mode === 'kanji') return s.replace(RE, '$1');
  return s.replace(RE, '<ruby>$1<rt>$2</rt></ruby>');
}

// ルビなしの プレーンテキスト（aria-label など）
export function P(s) {
  if (s == null) return '';
  s = String(s);
  return mode === 'hira' ? s.replace(RE, '$2') : s.replace(RE, '$1');
}
