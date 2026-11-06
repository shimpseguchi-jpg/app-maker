// だっしゅつ せいこう → けっか（REQUIREMENTS.md F-604・F-605・F-702・F-704）と、きろく（F-702〜F-704）
import { T, $, $$, el, esc, modal, play, speak, wait, hon, clock, minText } from './common.js';
import { playBgm, stopBgm } from '../../../js/audio.js';
import { THEMES, fill, themeById } from '../data/themes.js';
import { PANEL_BY_ID } from '../data/panels.js';
import { profile, record, recent, saveRecord, saveRecent, compactRecord, dayKey, custom } from '../save.js';

const panelOf = (id) => PANEL_BY_ID[id] || custom.find((p) => p.id === id) || { emoji: '⭐', obj: id };

// ミッションの けっかを きろくに いれる（1かい だけ）。かえりち：{ newStamp, unlocks }
export function applyResult(m) {
  const r = m.result;
  if (!r || record.missions.some((x) => x.id === m.id)) return { newStamp: false, unlocks: [] };
  const k = dayKey(r.at);
  const d = record.days[k] || { stars: 0, items: [], focusMin: 0, rewardMin: 0, stamp: false, missions: 0 };
  // F-702 スタンプ：カギを 1つ いじょう あつめた ミッションが あった ひに 1こ（「しっぱい」の ひは つくらない）
  const newStamp = !d.stamp && r.keys >= 1;
  d.stars += r.stars; d.items.push(...r.panels); d.focusMin += r.focusMin; d.rewardMin += r.rewardMin; d.missions++;
  if (r.keys >= 1) d.stamp = true;
  record.days[k] = d;
  const before = record.totalStars;
  record.totalStars += r.stars;                                                   // F-701 へることは ない
  record.missions.unshift({ id: m.id, at: r.at, reason: r.reason, keys: r.keys, total: r.total, stars: r.stars, theme: m.theme, clearMin: r.clearMin });
  for (const id of [...new Set(m.tt.items.filter((it) => !it.auto).map((it) => it.panel))].reverse()) {   // F-301 さいきん つかった
    const i = recent.indexOf(id); if (i >= 0) recent.splice(i, 1); recent.unshift(id);
  }
  recent.length = Math.min(recent.length, 12);
  compactRecord(r.at); saveRecord(); saveRecent();
  return { newStamp, unlocks: THEMES.filter((t) => t.unlock > before && t.unlock <= record.totalStars) };
}

export function streak(now = Date.now()) {
  let n = 0;
  for (let t = now; record.days[dayKey(t)]?.stamp; t -= 86400000) n++;
  return n;
}

export function renderResult(root, app, m, gained) {
  const theme = themeById(m.theme);
  const r = m.result;
  const success = r.reason === 'success';
  const name = profile.name || 'きみ';
  root.innerHTML = '';
  // F-604 だっしゅつ せいこう：とびらが ひらく・かみふぶき・ファンファーレ（10びょう いない）
  const show = el(`<div class="screen escape ${success ? 'win' : ''}">
    <div class="door-big"><span class="closed">${theme.door.closed}</span><span class="open">${theme.door.open}</span></div>
    <h1>${T(success ? theme.announce.success : fill(theme.announce.timeup, { keys: hon(r.keys) }))}</h1>
    <div class="esc-sub">${success ? `${T('クリアタイム')} <b>${minText(r.clearMin)}</b>` : T('だいじょうぶ！ また あした ちょうせん しよう')}</div>
    <div class="esc-stars">⭐ +${r.stars}</div>
    ${success ? `<div class="confetti">${Array.from({ length: 36 }, (_, i) => `<i style="--x:${(i * 37) % 100};--d:${(i % 7) * 0.18}s;--r:${(i * 53) % 360}deg">${['🎉', '⭐', '✨', '🎊', theme.key][i % 5]}</i>`).join('')}</div>` : ''}
    <button class="btn big" data-next>${T('けっかを みる')} ▶</button>
  </div>`);
  root.appendChild(show);
  if (success) { play('open'); setTimeout(() => play('win'), 500); if (profile.drama === 'dramatic') setTimeout(() => playBgm('victory'), 2200); }
  else play('upgrade');
  speak(success ? theme.announce.success : fill(theme.announce.timeup, { keys: hon(r.keys) }));
  const t = setTimeout(summary, 9000);
  $('[data-next]', show).addEventListener('click', () => { play('tap'); summary(); });

  function summary() {
    clearTimeout(t); stopBgm();
    if (!root.isConnected) return;
    const rows = m.tt.items.filter((it) => !it.auto).map((it) => `<div class="res-row ${it.state === 'done' ? 'ok' : ''}"><span class="mk">${it.state === 'done' ? '✓' : '・'}</span><span class="em">${it.emoji}</span><span>${T(it.obj)}</span><b>${it.state === 'done' ? `⭐${it.star}` : ''}</b></div>`).join('');
    root.innerHTML = '';
    const node = el(`<div class="screen result">
      <header class="bar"><h1>${T('けっか')}</h1></header>
      <div class="res-body">
        <section class="card">
          <div class="res-head"><span class="dr">${success ? theme.door.open : theme.door.closed}</span><div><b>${theme.key} ${hon(r.keys)} / ${hon(r.total)}</b><br>⭐ +${r.stars} <small>（${T('ぜんぶで')} ${record.totalStars}）</small></div></div>
          <div class="res-rows">${rows}</div>
        </section>
        <section class="card">
          ${gained.newStamp ? `<div class="stamp-get"><span class="stamp">💮</span>${T('{今日|きょう}の スタンプを もらったよ！')}</div>` : ''}
          <div class="res-streak">${T('れんぞく')} <b>${streak()}</b> ${T('にち')}</div>
          ${gained.unlocks.map((u) => `<div class="unlock">🔓 ${T('あたらしい テーマ')}「${T(u.name)}」${T('が ひらいた！')}</div>`).join('')}
          <div class="col"><button class="btn" data-show>👀 ${T('おうちの ひとに みせる')}</button><button class="btn gray" data-home>🏠 ${T('ホームへ')}</button></div>
        </section>
      </div>
    </div>`);
    root.appendChild(node);
    $('[data-home]', node).addEventListener('click', () => { play('tap'); app.go('home'); });
    $('[data-show]', node).addEventListener('click', () => {
      play('tap');
      modal(`<div class="show-card"><div class="big">${success ? '🏆' : '💪'}</div><h2>${esc(name)}${T('の ミッション')}</h2>
        <p class="lead">${T(`カギ ${hon(r.keys)} / ${hon(r.total)}`)}　⭐ ${r.stars}</p>
        <div class="res-rows">${m.tt.items.filter((it) => !it.auto).map((it) => `<div class="res-row ${it.state === 'done' ? 'ok' : ''}"><span class="mk">${it.state === 'done' ? '✓' : '・'}</span><span class="em">${it.emoji}</span><span>${T(it.obj)}</span></div>`).join('')}</div>
        <p>${T('しゅうちゅうした じかん')} <b>${minText(r.focusMin)}</b></p><button class="btn" data-close>${T('とじる')}</button></div>`, { cls: 'wide' });
    });
  }
  return () => { clearTimeout(t); stopBgm(); };
}

// ───────────── きろく（F-702 スタンプの カレンダー・F-703 しゅうの いちらん と がんばりカード・F-704 かいほう）
export function renderRecord(root, app) {
  const now = new Date();
  const y = now.getFullYear(), mo = now.getMonth();
  const first = new Date(y, mo, 1).getDay(), days = new Date(y, mo + 1, 0).getDate();
  const cells = [...Array(first).fill('<i></i>'), ...Array.from({ length: days }, (_, i) => {
    const k = dayKey(new Date(y, mo, i + 1).getTime());
    return `<i class="${record.days[k]?.stamp ? 'st' : ''} ${i + 1 === now.getDate() ? 'today' : ''}"><b>${i + 1}</b>${record.days[k]?.stamp ? '💮' : ''}</i>`;
  })].join('');
  const week = Array.from({ length: 7 }, (_, i) => { const t = Date.now() - i * 86400000; return [dayKey(t), new Date(t)]; });
  const weekRows = week.map(([k, d]) => { const r = record.days[k]; return `<div class="wk-row"><span>${d.getMonth() + 1}/${d.getDate()}</span><span class="ems">${r ? [...new Set(r.items)].map((id) => panelOf(id).emoji).join('') : '−'}</span><span>${r ? minText(r.focusMin) : ''}</span><b>${r ? '⭐' + r.stars : ''}</b></div>`; }).join('');
  const node = el(`<div class="screen record">
    <header class="bar"><button class="btn ghost" data-home>← ${T('ホーム')}</button><h1>${T('きろく')}</h1><span class="stars">⭐ ${record.totalStars}</span></header>
    <div class="rec-body">
      <section class="card"><h2>${y}${T('ねん')} ${mo + 1}${T('がつ')} <small>${T('れんぞく')} ${streak()} ${T('にち')}</small></h2>
        <div class="cal">${['にち', 'げつ', 'か', 'すい', 'もく', 'きん', 'ど'].map((w) => `<i class="wd">${w}</i>`).join('')}${cells}</div></section>
      <section class="card"><h2>${T('この 1しゅうかん')}</h2><div class="wk">${weekRows}</div>
        <button class="btn" data-card>🏅 ${T('がんばりカード')}</button></section>
      <section class="card"><h2>${T('テーマ')}</h2><div class="unl">${THEMES.map((t) => `<div class="${record.totalStars >= t.unlock ? 'on' : ''}"><span class="em">${t.emoji}</span>${T(t.name)} <small>${record.totalStars >= t.unlock ? '✓' : `⭐${t.unlock} ${T('で ひらく')}`}</small></div>`).join('')}</div></section>
    </div>
  </div>`);
  root.innerHTML = ''; root.appendChild(node);
  $('[data-home]', node).addEventListener('click', () => { play('tap'); app.go('home'); });
  $('[data-card]', node).addEventListener('click', () => {
    play('tap');
    const ks = week.map(([k]) => record.days[k]).filter(Boolean);
    const stars = ks.reduce((s, r) => s + r.stars, 0);
    const count = {};
    for (const r of ks) for (const id of r.items) count[id] = (count[id] || 0) + 1;
    const best = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
    modal(`<div class="cert"><div class="cert-in"><h2>🏅 ${T('がんばりカード')}</h2><p class="lead">${esc(profile.name || 'きみ')}${T('さん')}</p>
      <p>${T('この 1しゅうかんで スターを')} <b>${stars}</b> ${T('こ あつめました')}</p>
      ${best ? `<p>${T('いちばん がんばった こと')}：<b>${panelOf(best[0]).emoji} ${T(panelOf(best[0]).obj)}</b></p>` : ''}
      <p>${T('スタンプ')} ${ks.filter((r) => r.stamp).length} ${T('こ')}</p><p class="sign">${T('よく がんばりました！')}</p></div>
      <button class="btn" data-close>${T('とじる')}</button></div>`, { cls: 'wide' });
  });
}
