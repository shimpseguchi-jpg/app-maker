// ブリーフィング（REQUIREMENTS.md F-601・F-602・F-610）
// ① せかいせってい ② やくわり ③ ミッションの よみあげ（1つ 1.5びょう）④ せいげんじかん ⑤ 3・2・1 ⑥ かいしの あいず。みぎうえで スキップ
// 9.2 の 5 の いまの あん：はじめて は ぜんぶ（やく 20びょう）、2かいめ から と「しずか」は ①② を はぶく（やく 10びょう）
import { T, $, el, play, speak, hush, wait, minText } from './common.js';
import { missionText } from '../engine/mission.js';
import { fill } from '../data/themes.js';
import { profile } from '../save.js';

export function runBriefing(root, { theme, mission, onDone }) {
  const items = mission.tt.items.filter((it) => !it.auto);
  const T0 = mission.tt.end - mission.tt.start;
  const day = Math.floor(Date.now() / 86400000);
  const pat = theme.briefing[day % theme.briefing.length];                       // F-602 ひがわり
  const vars = { count: items.length, minutes: minText(T0) };
  const short = profile.briefings > 0 || profile.drama === 'quiet';
  const quiet = profile.drama === 'quiet';
  let skipped = false, finished = false;

  const node = el(`<div class="screen briefing">
    <button class="btn ghost skip" data-skip>${T('スキップ')} ⏭</button>
    <div class="b-mascot">${theme.mascot.emoji}</div>
    <div class="b-lines" data-lines></div>
    <div class="b-big" data-big></div>
  </div>`);
  root.innerHTML = '';
  root.appendChild(node);
  const lines = $('[data-lines]', node), big = $('[data-big]', node);
  const done = () => { if (finished) return; finished = true; hush(); onDone(); };
  $('[data-skip]', node).addEventListener('click', () => { play('tap'); skipped = true; done(); });

  // 1もじずつ おくる（ルビは ひとかたまりで）
  async function typeLine(text, cls = '') {
    if (skipped) return;
    const p = el(`<p class="${cls}"></p>`);
    lines.appendChild(p);
    while (lines.children.length > 4) lines.firstElementChild.remove();
    speak(text);
    const html = T(text);
    if (quiet) { p.innerHTML = html; await wait(900); return; }
    const tokens = html.match(/<ruby>.*?<\/ruby>|<[^>]+>|[\s\S]/g) || [];
    let out = '';
    for (const tk of tokens) { if (skipped) return; out += tk; p.innerHTML = out; if (!tk.startsWith('<') || tk.startsWith('<ruby')) await wait(45); }
    await wait(500);
  }

  (async () => {
    await wait(300);
    if (!short) {
      for (const s of pat.world) await typeLine(fill(s, vars));
      await typeLine(fill(pat.role, vars));
    }
    await typeLine(fill(pat.intro, vars));
    for (const it of items) {                                                    // ③ ミッション文（F-303）
      if (skipped) return;
      const p = el(`<p class="mission-line"><span class="em">${it.emoji}</span>${T(missionText(it, minText))}</p>`);
      lines.appendChild(p);
      while (lines.children.length > 4) lines.firstElementChild.remove();
      play('page'); speak(missionText(it, minText));
      await wait(1500);
    }
    await typeLine(fill(pat.limit, vars));
    if (skipped) return;
    big.innerHTML = `<b>${T0}</b>${minText(T0).slice(String(T0).length)}`;     // ④ せいげんじかん を おおきく
    await wait(1200);
    for (const n of [3, 2, 1]) { if (skipped) return; big.innerHTML = `<b class="count">${n}</b>`; play('select'); speak(String(n)); await wait(900); }   // ⑤
    if (skipped) return;
    big.innerHTML = `<b class="go">${T(fill(pat.go, vars))}</b>`;              // ⑥
    play('block'); setTimeout(() => play('open'), 150); speak(fill(pat.go, vars));
    await wait(1300);
    done();
  })();
  return () => { skipped = true; hush(); };
}
