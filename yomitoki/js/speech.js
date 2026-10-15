// よみあげ（ブラウザの おんせい）
let voice = null;
function pickVoice() {
  if (!window.speechSynthesis) return null;
  const vs = speechSynthesis.getVoices().filter((v) => /^ja/i.test(v.lang));
  voice = vs.find((v) => /kyoko|o-ren|nanami|haruka|google/i.test(v.name)) || vs[0] || null;
  return voice;
}
if (window.speechSynthesis) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
export const canSpeak = () => !!window.speechSynthesis;
export function speak(text, { rate = 0.85, onend } = {}) {
  if (!window.speechSynthesis) { onend && onend(); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[＋+]/g, ' たす ').replace(/[−-]/g, ' ひく '));
  u.lang = 'ja-JP'; u.rate = rate; u.pitch = 1.05;
  if (voice || pickVoice()) u.voice = voice;
  if (onend) u.onend = onend;
  speechSynthesis.speak(u);
}
export function stopSpeak() { try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) { /* */ } }
