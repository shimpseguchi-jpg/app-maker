// 迷宮探索の画面（ルールは engine/dungeon.js・engine/expedition.js）
import { DUNGEONS } from './data/floors.js';
import { ITEMS } from './data/items.js';
import { IDOLS } from './data/idols.js';
import { CLASSES } from './data/classes.js';
import { CONDITIONS } from './engine/revive.js';
import { getFloor, viewCells, DIR_NAME, isDark, isAntiMagic } from './engine/dungeon.js';
import { newExpedition, move, resolveBattle, rescue, climb, enterDungeon, partyView, inn, temple, shopList, buy, syncParty, keyLabel, INN_FEE } from './engine/expedition.js';
import { drawView } from './ui/view3d.js';
import { drawMap } from './ui/automap.js';

const KEY = 'idoldungeon.expedition';
const PARTY_KEY = 'idoldungeon.proto';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function partySlots() {
  try {
    const s = JSON.parse(localStorage.getItem(PARTY_KEY));
    if (Array.isArray(s) && s.length) return s.filter((x) => IDOLS[x?.idol]).slice(0, 6);
  } catch (e) { /* 初期編成を使う */ }
  return [{ idol: 'makoto' }, { idol: 'hibiki' }, { idol: 'haruka' }, { idol: 'ritsuko' }, { idol: 'ami' }, { idol: 'yukiho' }];
}

let ex = load();
let pending = null;
const log = [];

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s?.ex?.dungeon && DUNGEONS[s.ex.dungeon]) return s;
  } catch (e) { /* 新しく始める */ }
  return newExpedition(partySlots());
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(ex)); } catch (e) { /* 保存できなくても続行 */ } }
function say(msgs) { for (const m of msgs) log.push(m); while (log.length > 40) log.shift(); }

// ── 描画 ──
function render() {
  const town = ex.mode === 'town';
  const st = ex.ex;
  const fl = getFloor(st.dungeon, st.floor);
  $('where').textContent = town ? '街' : `${DUNGEONS[st.dungeon].name} ${fl.id}`;
  const ch = fl.cellAt(st.x, st.y);
  // 座標表示はエルミナージュと同じ X/Y。ダークゾーンでは分からない
  $('pos').textContent = town ? '' : isDark(ch) ? 'X?? Y?? ?向き' : `X${String(st.x).padStart(2, '0')} Y${String(st.y).padStart(2, '0')} ${DIR_NAME[st.dir]}向き`;
  $('zone').textContent = town ? '' : isDark(ch) ? 'ダークゾーン' : isAntiMagic(ch) ? '呪文禁止' : '';
  $('gold').textContent = `${ex.gold}G`;
  $('view').hidden = town; $('town').hidden = !town; $('pad').hidden = town;
  if (town) renderTown();
  else {
    drawView($('view'), st, viewCells(st), { theme: fl.theme });
    const stairs = ch === 'u' || ch === 'd';
    $('stairs-btn').hidden = !stairs;
    $('stairs-btn').textContent = ch === 'd' ? '階段を下りる' : st.floor === 0 ? '街へ戻る' : '階段を上る';
  }
  if (!town && !isDark(ch)) drawMap($('map'), st, { theme: fl.theme });
  else if (town) drawMap($('map'), { ...st, seen: st.seen }, { theme: getFloor(st.dungeon, 0).theme });
  else { const c = $('map').getContext('2d'); c.fillStyle = '#000'; c.fillRect(0, 0, 264, 264); }
  $('log').innerHTML = log.slice(-6).map((m) => `<div>${esc(m)}</div>`).join('');
  renderParty();
  save();
}

function renderParty() {
  $('party').innerHTML = partyView(ex).map((m) => {
    const pct = Math.round((m.hp / m.maxHp) * 100);
    const cond = m.cond !== 'ok' ? `<span class="cond ${m.cond}">${CONDITIONS[m.cond].name}</span>` : '';
    return `<div class="pm" style="--c:${m.idol.color}"><b>${esc(m.idol.name)}</b> <small>${esc(CLASSES[m.cls].name)} Lv${m.level}</small> ${cond}
      <div class="hpbar"><i style="width:${pct}%"></i></div><small>HP ${m.hp}/${m.maxHp}</small></div>`;
  }).join('');
  const items = ex.items.reduce((a, id) => ((a[id] = (a[id] || 0) + 1), a), {});
  const keys = ex.ex.keys.map((k) => `<span class="tag">🔑${esc(keyLabel(k))}</span>`).join('');
  const its = Object.entries(items).map(([id, n]) => `<span class="tag">${esc(ITEMS[id].name)}×${n}</span>`).join('');
  $('bag').innerHTML = keys || its ? `<div class="tags">${keys}${its}</div>` : '<small class="sub">持ち物なし</small>';
}

function renderTown() {
  const party = partyView(ex);
  const hurt = party.filter((m) => ['dead', 'ash', 'paralyze', 'stone'].includes(m.cond));
  const clears = ex.ex.bossClears;
  $('town').innerHTML = `
    <h2>劇中の街</h2>
    <div class="town-grid">
      <button data-t="enter">迷宮へ入る</button>
      <button data-t="inn">宿屋に泊まる <small>${INN_FEE}G・HPと状態異常を回復</small></button>
      <a class="btn" href="party.html">パーティを組み直す</a>
    </div>
    <h3>寺院</h3>
    ${hurt.length ? hurt.map((m) => `<button data-t="temple" data-id="${m.id}">${esc(m.idol.name)}を治す <small>${CONDITIONS[m.cond].name}</small></button>`).join('') : '<p class="sub">治療が必要な仲間はいない</p>'}
    <h3>店 <small class="sub">昇格アイテム</small></h3>
    <div class="shop">${shopList(ex).map((it) => `<button data-t="buy" data-id="${it.id}" ${it.stock <= 0 ? 'disabled' : ''}>${esc(it.name)} <small>${it.price}G${it.stock === Infinity ? '' : ` 残り${it.stock}`}</small></button>`).join('')}</div>
    ${Object.keys(clears).length ? `<p class="sub">ボス撃破：${Object.entries(clears).map(([id, n]) => `${n}回`).join('、')}（倒したボスは強化されて再出現する）</p>` : ''}`;
}

// ── 入力 ──
function doAction(a) {
  if (pending || ex.mode !== 'dungeon') return;
  if (a === 'stairs') { askStairs(); return; }
  const r = move(ex, a);
  say(r.msgs);
  if (r.pending?.type === 'stairs') { render(); return; } // 階段はボタンで使う
  pending = r.pending;
  render();
  if (pending) showPending();
}

function askStairs() {
  const st = ex.ex, ch = getFloor(st.dungeon, st.floor).cellAt(st.x, st.y);
  if (ch !== 'u' && ch !== 'd') return;
  say(climb(ex));
  if (ex.mode === 'dungeon') say([`${getFloor(st.dungeon, st.floor).id}に${ch === 'd' ? '下りた' : '上った'}`]);
  else { syncSlots(); }
  render();
}

// 街にいるあいだは、パーティ編成画面で組んだメンバーを反映する
function syncSlots() {
  const slots = partySlots();
  const same = JSON.stringify(slots.map((s) => s.idol)) === JSON.stringify(ex.slots.map((s) => s.idol));
  if (!same) ex.slots = slots;
  syncParty(ex);
}

function showPending() {
  const p = pending;
  let html = '';
  if (p.type === 'battle') {
    const b = p.boss;
    html = `<h2>${esc(p.name)}</h2>
      ${b ? `<p>Lv${b.level} ／ HP ${b.stats.hp} ／ 攻撃 ${b.stats.atk} ／ 防御 ${b.stats.def}${b.clears ? `（再戦${b.clears}回目）` : ''}</p>
        ${b.traits.length ? `<ul>${b.traits.map((t) => `<li>${esc(t.name)}：${esc(t.text)}</li>`).join('')}</ul>` : ''}` : ''}
      <p class="sub">戦闘はまだ作っていません。結果を選んでください。</p>
      <div class="row"><button data-m="win">勝ったことにする（仮）</button><button data-m="flee">逃げる</button></div>`;
  } else if (p.type === 'wiped') {
    html = `<h2>全滅</h2><p>パーティは迷宮で倒れた……</p><div class="row"><button data-m="rescue">回収してもらう</button></div>`;
  }
  $('modal-box').innerHTML = html;
  $('modal').hidden = false;
}

function closeModal(choice) {
  const p = pending;
  pending = null;
  $('modal').hidden = true;
  if (p.type === 'battle') say(resolveBattle(ex, p, choice));
  if (p.type === 'wiped') say(rescue(ex));
  render();
}

document.addEventListener('click', (ev) => {
  const b = ev.target.closest('button');
  if (!b) return;
  if (b.dataset.a) doAction(b.dataset.a);
  else if (b.dataset.m) closeModal(b.dataset.m);
  else if (b.dataset.t) {
    const t = b.dataset.t;
    if (t === 'enter') { syncSlots(); say(enterDungeon(ex)); }
    else if (t === 'inn') say(inn(ex));
    else if (t === 'temple') say(temple(ex, b.dataset.id));
    else if (t === 'buy') say(buy(ex, b.dataset.id));
    render();
  }
});

const KEYMAP = { ArrowUp: 'forward', w: 'forward', ArrowLeft: 'turnL', a: 'turnL', ArrowRight: 'turnR', d: 'turnR',
  ArrowDown: 'turnBack', s: 'turnBack', q: 'strafeL', e: 'strafeR', ' ': 'search', f: 'search', Enter: 'stairs' };
document.addEventListener('keydown', (ev) => {
  const a = KEYMAP[ev.key];
  if (!a || ev.target.closest('input, select, textarea')) return;
  ev.preventDefault();
  doAction(a);
});

if (ex.mode === 'town') { syncSlots(); say(['街にいる。準備ができたら迷宮へ']); }
render();
