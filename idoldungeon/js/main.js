// パーティ編成プロトタイプ（シナジーと楽曲装備の確認用。ゲーム本体の画面は今後作る）
import { IDOLS, IDOL_LIST } from './data/idols.js';
import { TAGS } from './data/tags.js';
import { SONGS } from './data/songs.js';
import { CLASSES } from './data/classes.js';
import { buildMembers, computeParty, BASE_STATS, DERIVED_STATS, STAT_NAME, FRONT_SIZE, PARTY_SIZE } from './engine/party.js';

const KEY = 'idoldungeon.proto';
let slots = load();

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (Array.isArray(s)) return s.filter((x) => IDOLS[x?.idol]);
  } catch (e) { /* 読めなければ初期編成 */ }
  return [{ idol: 'makoto' }, { idol: 'hibiki' }, { idol: 'haruka' }, { idol: 'ritsuko' }, { idol: 'chihaya' }, { idol: 'yukiho' }];
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(slots)); } catch (e) { /* 保存できなくても続行 */ } }

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const effectText = (e) => (e.type === 'stat'
  ? `${STAT_NAME[e.stat]} ${e.add ? (e.add > 0 ? '+' : '') + e.add : '+' + e.pct + '%'}`
  : `${e.name}：${e.text}`) + ({ holders: '（該当者）', front: '（前列）', back: '（後列）', self: '' }[e.to] ?? '（全員）');

function render() {
  const { members, synergies } = computeParty(buildMembers(slots));
  const solo = members.map((m) => computeParty([{ ...m, row: m.row }]).members[0].stats);
  const hitTags = new Set(synergies.active.flatMap((a) => (a.syn.tag ? [a.syn.tag] : a.syn.all || [])));

  document.getElementById('roster').innerHTML = IDOL_LIST.map((id) => {
    const i = IDOLS[id];
    const on = slots.some((s) => s.idol === id);
    return `<button class="idol" style="--c:${i.color}" data-idol="${id}" aria-pressed="${on}">
      <b>${esc(i.name)} <small class="cls">${esc(CLASSES[i.cls].name)}</small></b><div class="tags">${i.tags.map((t) => `<span class="tag ${on && hitTags.has(t) ? 'hit' : ''}">${esc(TAGS[t].name)}</span>`).join('')}</div></button>`;
  }).join('');

  const songOpts = (cur) => `<option value="">（楽曲なし）</option>` + Object.values(SONGS)
    .map((s) => `<option value="${s.id}" ${s.id === cur ? 'selected' : ''}>★${s.rank} ${esc(s.title)}</option>`).join('');
  const html = members.map((m, i) => {
    const own = m.abilities.filter((a) => a.to !== 'party'); // 全員にかかる能力はシナジー欄・楽曲欄で見せる
    const stat = (k) => `<span class="${m.stats[k] > solo[i][k] ? 'up' : ''}">${STAT_NAME[k]}<b>${m.stats[k]}</b></span>`;
    return `${i === 0 ? '<div class="row-label">前列</div>' : i === FRONT_SIZE ? '<div class="row-label">後列</div>' : ''}
    <div class="member" style="--c:${m.idol.color}">
      <header><b>${esc(m.idol.name)} <small class="cls">${esc(CLASSES[m.cls].name)}</small></b>
        <select data-song="${i}">${songOpts(m.song)}</select>
        <span class="moves"><button data-up="${i}" aria-label="前へ">▲</button><button data-down="${i}" aria-label="後ろへ">▼</button></span>
      </header>
      ${m.song ? `<div class="row-label">楽曲：${esc(SONGS[m.song].effects.map(effectText).join(' ／ '))}</div>` : ''}
      <div class="stats">${BASE_STATS.map(stat).join('')}</div>
      <div class="stats">${DERIVED_STATS.map(stat).join('')}</div>
      ${own.length || m.live ? `<ul class="abil">${own.map((a) => `<li>${esc(a.name)}：${esc(a.text)} <small>← ${esc(a.source)}</small></li>`).join('')}
        ${m.live ? `<li>ライブスキル「${esc(m.live.name)}」×${m.live.uses}：${esc(m.live.text)}</li>` : ''}</ul>` : ''}
    </div>`;
  }).join('');
  document.getElementById('party').innerHTML = html || '<p class="empty">アイドルを選んでください</p>';

  const synHtml = synergies.active.map((a) => `<div class="syn"><b>${esc(a.syn.name)}</b>${a.tier ? ` <small>${a.count}/${a.tier}</small>` : ''}
    <ul>${a.effects.map((e) => `<li>${esc(effectText(e))}</li>`).join('')}</ul></div>`).join('')
    + synergies.near.map((n) => `<div class="syn near">あと少し：<b>${esc(n.syn.name)}</b> ${n.missing ? `（${n.missing.map((t) => esc(TAGS[t].name)).join('・')}が必要）` : `（${n.count}/${n.tier}）`}</div>`).join('');
  document.getElementById('synergies').innerHTML = synHtml || '<p class="empty">発動中のシナジーはありません</p>';
}

document.addEventListener('click', (ev) => {
  const b = ev.target.closest('button');
  if (!b) return;
  if (b.dataset.idol) {
    const id = b.dataset.idol;
    const at = slots.findIndex((s) => s.idol === id);
    if (at >= 0) slots.splice(at, 1);
    else if (slots.length < PARTY_SIZE) slots.push({ idol: id });
  } else if (b.dataset.up != null || b.dataset.down != null) {
    const i = Number(b.dataset.up ?? b.dataset.down), j = b.dataset.up != null ? i - 1 : i + 1;
    if (j < 0 || j >= slots.length) return;
    [slots[i], slots[j]] = [slots[j], slots[i]];
  } else return;
  save(); render();
});
document.addEventListener('change', (ev) => {
  const sel = ev.target.closest('[data-song]');
  if (!sel) return;
  slots[Number(sel.dataset.song)].song = sel.value || null;
  save(); render();
});

render();
