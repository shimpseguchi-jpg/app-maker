// 迷宮探索の画面（ルールは engine/dungeon.js・engine/expedition.js・engine/battle.js）
import { DUNGEONS } from './data/floors.js';
import { ITEMS } from './data/items.js';
import { IDOLS } from './data/idols.js';
import { CLASSES } from './data/classes.js';
import { SPELLS_BY_ID, KIND_TARGET } from './data/spells.js';
import { CONDITIONS } from './engine/revive.js';
import { getFloor, viewCells, DIR_NAME, isDark, isAntiMagic } from './engine/dungeon.js';
import { newExpedition, move, battleTurn, finishBattle, rescue, climb, enterDungeon, partyView, inn, temple, shopList, buy, syncParty, keyLabel, unitOf, INN_FEE } from './engine/expedition.js';
import { aliveGroups, groupName, reachableGroups, castable, canAct, unitLiveReady, autoCommands } from './engine/battle.js';
import { expForLevel } from './engine/growth.js';
import { drawView } from './ui/view3d.js';
import { drawMap } from './ui/automap.js';

const KEY = 'idoldungeon.expedition';
const PARTY_KEY = 'idoldungeon.proto';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const has = (m, id) => m.abilities?.some((a) => a.id === id);

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
// 戦闘のコマンド入力の途中経過（保存しない）
let cmds = [], cmdIdx = 0, sub = null;
// 決着した戦闘（後始末は済んでいる。結果を見せるあいだだけ持つ）
let battleEnd = null;

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
  const town = ex.mode === 'town', battle = !!(ex.battle || battleEnd);
  const st = ex.ex;
  const fl = getFloor(st.dungeon, st.floor);
  $('where').textContent = town ? '街' : `${DUNGEONS[st.dungeon].name} ${fl.id}`;
  const ch = fl.cellAt(st.x, st.y);
  // 座標表示はエルミナージュと同じ X/Y。ダークゾーンでは分からない
  $('pos').textContent = town ? '' : isDark(ch) ? 'X?? Y?? ?向き' : `X${String(st.x).padStart(2, '0')} Y${String(st.y).padStart(2, '0')} ${DIR_NAME[st.dir]}向き`;
  $('zone').textContent = town ? '' : isDark(ch) ? 'ダークゾーン' : isAntiMagic(ch) ? '呪文禁止' : '';
  $('gold').textContent = `${ex.gold}G`;
  $('view').hidden = town || battle; $('town').hidden = !town; $('battle').hidden = !battle; $('pad').hidden = town || battle;
  if (town) renderTown();
  else if (battle) renderBattle();
  else {
    drawView($('view'), st, viewCells(st), { theme: fl.theme });
    const stairs = ch === 'u' || ch === 'd';
    $('stairs-btn').hidden = !stairs;
    $('stairs-btn').textContent = ch === 'd' ? '階段を下りる' : st.floor === 0 ? '街へ戻る' : '階段を上る';
  }
  if (!isDark(ch) || town) drawMap($('map'), st, { theme: town ? getFloor(st.dungeon, 0).theme : fl.theme });
  else { const c = $('map').getContext('2d'); c.fillStyle = '#000'; c.fillRect(0, 0, 264, 264); }
  $('log').innerHTML = log.slice(-6).map((m) => `<div>${esc(m)}</div>`).join('');
  $('log').hidden = battle;
  renderParty();
  save();
}

function renderParty() {
  const list = ex.battle ? ex.battle.party.map((m) => ({ ...m, idol: IDOLS[m.id] })) : partyView(ex);
  $('party').innerHTML = list.map((m, i) => {
    const pct = Math.round((m.hp / m.maxHp) * 100);
    const flags = [];
    if (m.cond !== 'ok') flags.push(`<span class="cond ${m.cond}">${CONDITIONS[m.cond].name}</span>`);
    if (m.poison) flags.push('<span class="cond poison">毒</span>');
    if (m.sleep) flags.push('<span class="cond">睡眠</span>');
    if (m.silence) flags.push('<span class="cond">沈黙</span>');
    if (m.fled) flags.push('<span class="cond">逃走</span>');
    const u = unitOf(ex, m.id);
    const mp = ex.battle ? m.mp : ex.mp[m.id];
    const mpText = mp && Object.keys(mp).length ? ' 呪' + Object.values(mp).join('/') : '';
    const live = ex.battle ? m.live?.left : ex.live[m.id]?.left;
    const active = ex.battle && !ex.battle.result && i === cmdIdx ? ' active' : '';
    return `<div class="pm${active}" style="--c:${m.idol.color}"><b>${esc(m.idol.name)}</b> <small>${esc(CLASSES[m.cls].name)} Lv${u.level}</small> ${flags.join('')}
      <div class="hpbar"><i style="width:${pct}%"></i></div><small>HP ${m.hp}/${m.maxHp}${mpText}${live != null ? ` 歌${live}` : ''} ・ 次Lvまで ${Math.max(0, expForLevel(u.level + 1) - u.exp)}</small></div>`;
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
      <button data-t="inn">宿屋に泊まる <small>${INN_FEE}G・HP・状態異常・呪文の回数を回復</small></button>
      <a class="btn" href="party.html">パーティを組み直す</a>
    </div>
    <h3>寺院</h3>
    ${hurt.length ? hurt.map((m) => `<button data-t="temple" data-id="${m.id}">${esc(m.idol.name)}を治す <small>${CONDITIONS[m.cond].name}</small></button>`).join('') : '<p class="sub">治療が必要な仲間はいない</p>'}
    <h3>店 <small class="sub">昇格アイテム</small></h3>
    <div class="shop">${shopList(ex).map((it) => `<button data-t="buy" data-id="${it.id}" ${it.stock <= 0 ? 'disabled' : ''}>${esc(it.name)} <small>${it.price}G${it.stock === Infinity ? '' : ` 残り${it.stock}`}</small></button>`).join('')}</div>
    ${Object.keys(clears).length ? `<p class="sub">ボス撃破：${Object.values(clears).map((n) => `${n}回`).join('、')}（倒したボスは強化されて再出現する）</p>` : ''}`;
}

// ── 戦闘 ──
function nextActor(from) {
  const b = ex.battle;
  for (let i = from; i < b.party.length; i++) if (canAct(b.party[i])) return i;
  return b.party.length;
}
function resetCommands() { cmds = []; sub = null; cmdIdx = nextActor(0); }

function renderBattle() {
  const b = ex.battle || battleEnd.battle;
  const groups = aliveGroups(b);
  const enemyHtml = b.groups.map((g) => {
    const n = g.members.filter((e) => !e.dead).length;
    if (!n) return '';
    const status = [g.members.some((e) => !e.dead && e.sleep) && '睡眠', g.members.some((e) => !e.dead && e.confuse) && '混乱', g.members.some((e) => !e.dead && e.silence) && '沈黙'].filter(Boolean).join('・');
    return `<div class="eg"><span class="eicon">${g.identified ? g.def.icon : '❔'}</span>
      <b>${groups.indexOf(g) + 1}）${esc(groupName(g))}</b> <span class="sub">×${n}</span> ${status ? `<span class="cond">${status}</span>` : ''}</div>`;
  }).join('');
  let ctl = '';
  if (battleEnd) {
    ctl = `<div class="bres"><b>${{ win: '勝利！', flee: '逃げ切った', lose: '全滅……' }[b.result]}</b>
      ${battleEnd.msgs.map((m) => `<div>${esc(m)}</div>`).join('')}
      <button data-b="end">探索に戻る</button></div>`;
  } else if (b.turn === 0 && b.surprise === 'enemy') {
    ctl = '<button data-b="go">不意を突かれた！（次へ）</button>';
  } else if (cmdIdx >= b.party.length) {
    ctl = '<button data-b="go">実行</button>';
  } else ctl = commandMenu(b, b.party[cmdIdx], groups);
  $('battle').innerHTML = `
    <div class="enemies">${enemyHtml || '<span class="sub">敵はいない</span>'}</div>
    <div class="blog">${b.log.slice(-9).map((m) => `<div>${esc(m)}</div>`).join('')}</div>
    <div class="bctl">${ctl}</div>`;
  const bl = $('battle').querySelector('.blog'); if (bl) bl.scrollTop = bl.scrollHeight;
}

function commandMenu(b, m, groups) {
  const head = `<div class="who"><b>${esc(m.name)}</b>の行動 <small class="sub">${m.row === 'front' ? '前列' : '後列'}・射程${m.range}</small></div>`;
  const back = cmdIdx > nextActor(0) || sub ? '<button data-b="back" class="minor">戻る</button>' : '';
  const auto = '<button data-b="auto" class="minor">おまかせ（残り全員）</button>';
  if (!sub) {
    const reach = reachableGroups(b, m);
    const spells = castable(b, m);
    const btns = [
      `<button data-b="attack" ${reach.length ? '' : 'disabled'}>戦う${reach.length ? '' : '（届かない）'}</button>`,
      `<button data-b="spell" ${spells.length ? '' : 'disabled'}>呪文</button>`,
      m.live ? `<button data-b="live" ${m.live.left > 0 ? '' : 'disabled'}>ライブ「${esc(m.live.name)}」×${m.live.left}</button>` : '',
      has(m, 'dance') ? '<button data-b="dance">踊る</button>' : '',
      has(m, 'unitLive') && unitLiveReady(b) ? '<button data-b="unitLive">ユニットライブ</button>' : '',
      '<button data-b="defend">守る</button>',
      '<button data-b="guard">かばう</button>',
      b.canFlee ? '<button data-b="flee">逃げる</button>' : '',
    ];
    return `${head}<div class="cmds">${btns.join('')}</div><div class="cmds2">${back}${auto}</div>`;
  }
  if (sub.type === 'attack') {
    const reach = reachableGroups(b, m);
    return `${head}<div class="sub">どのグループを攻撃する？</div><div class="cmds">${groups.map((g, i) => `<button data-tg="${i}" ${reach.includes(g) ? '' : 'disabled'}>${i + 1}）${esc(groupName(g))}</button>`).join('')}</div><div class="cmds2">${back}</div>`;
  }
  if (sub.type === 'spell') {
    return `${head}<div class="cmds">${castable(b, m).map((s) => `<button data-sp="${s.id}" title="${esc(s.text)}">${esc(s.name)} <small>${m.mp[s.family]}回</small></button>`).join('')}</div><div class="cmds2">${back}</div>`;
  }
  // 対象を選ぶ（呪文・ライブ・かばう・踊る）
  const kind = sub.kind;
  const tgt = kind ? KIND_TARGET[kind] : 'ally';
  if (tgt === 'enemy' || tgt === 'group') {
    return `${head}<div class="sub">${esc(sub.label)}：どの敵に？</div><div class="cmds">${groups.map((g, i) => `<button data-tg="${i}">${i + 1}）${esc(groupName(g))}</button>`).join('')}</div><div class="cmds2">${back}</div>`;
  }
  const allies = b.party.map((t, i) => [t, i]).filter(([t]) => (kind === 'revive' ? t.cond === 'dead' : !t.fled && t.hp > 0 && t.cond !== 'dead' && t.cond !== 'ash') && (sub.type === 'guard' || sub.type === 'dance' ? t !== m : true));
  return `${head}<div class="sub">${esc(sub.label)}：だれに？</div><div class="cmds">${allies.map(([t, i]) => `<button data-ta="${i}">${esc(t.name)} <small>HP${t.hp}</small></button>`).join('')}</div><div class="cmds2">${back}</div>`;
}

function setCommand(c) {
  cmds[cmdIdx] = c; sub = null;
  cmdIdx = nextActor(cmdIdx + 1);
  if (cmdIdx >= ex.battle.party.length) runBattleTurn();
  else render();
}

function runBattleTurn() {
  battleTurn(ex, cmds);
  if (ex.battle.result) {
    const bt = ex.battle;
    const r = finishBattle(ex);
    battleEnd = { battle: bt, msgs: r.msgs, wiped: r.wiped };
  } else resetCommands();
  render();
}

function battleClick(b) {
  const bt = ex.battle || battleEnd?.battle;
  const m = bt.party[cmdIdx];
  const d = b.dataset;
  if (d.b === 'end') {
    say(battleEnd.msgs);
    const wiped = battleEnd.wiped;
    battleEnd = null;
    if (wiped) { pending = { type: 'wiped' }; showPending(); }
    render();
    return;
  }
  if (d.b === 'go') { runBattleTurn(); return; }
  if (d.b === 'auto') {
    const auto = autoCommands(bt);
    for (let i = cmdIdx; i < bt.party.length; i++) if (canAct(bt.party[i])) cmds[i] = auto[i];
    runBattleTurn();
    return;
  }
  if (d.b === 'back') {
    if (sub) { sub = null; render(); return; }
    let i = cmdIdx - 1;
    while (i >= 0 && !canAct(bt.party[i])) i--;
    if (i >= 0) { cmdIdx = i; cmds[i] = null; }
    render();
    return;
  }
  if (d.b === 'attack') { sub = { type: 'attack' }; render(); return; }
  if (d.b === 'spell') { sub = { type: 'spell' }; render(); return; }
  if (d.b === 'defend') { setCommand({ type: 'defend' }); return; }
  if (d.b === 'flee') { setCommand({ type: 'flee' }); return; }
  if (d.b === 'unitLive') { setCommand({ type: 'unitLive' }); return; }
  if (d.b === 'guard') { sub = { type: 'guard', label: 'かばう' }; render(); return; }
  if (d.b === 'dance') { sub = { type: 'dance', label: '踊る' }; render(); return; }
  if (d.b === 'live') {
    const t = KIND_TARGET[m.live.kind];
    if (t === 'enemies' || t === 'allies' || t === 'self' || t === 'none') setCommand({ type: 'live' });
    else { sub = { type: 'live', kind: m.live.kind, label: m.live.name }; render(); }
    return;
  }
  if (d.sp) {
    const s = SPELLS_BY_ID[d.sp], t = s.target;
    if (t === 'enemies' || t === 'allies' || t === 'self' || t === 'none') setCommand({ type: 'spell', spell: s.id });
    else { sub = { type: 'spellTarget', spell: s.id, kind: s.kind, label: s.name }; render(); }
    return;
  }
  if (d.tg != null) {
    const g = Number(d.tg);
    if (!sub || sub.type === 'attack') setCommand({ type: 'attack', group: g });
    else if (sub.type === 'spellTarget') setCommand({ type: 'spell', spell: sub.spell, target: g });
    else if (sub.type === 'live') setCommand({ type: 'live', target: g });
    return;
  }
  if (d.ta != null) {
    const a = Number(d.ta);
    if (sub.type === 'guard') setCommand({ type: 'guard', ally: a });
    else if (sub.type === 'dance') setCommand({ type: 'dance', ally: a });
    else if (sub.type === 'spellTarget') setCommand({ type: 'spell', spell: sub.spell, target: a });
    else if (sub.type === 'live') setCommand({ type: 'live', target: a });
  }
}

// ── 入力 ──
function doAction(a) {
  if (pending || ex.battle || battleEnd || ex.mode !== 'dungeon') return;
  if (a === 'stairs') { askStairs(); return; }
  const r = move(ex, a);
  say(r.msgs);
  if (r.pending?.type === 'battle') { resetCommands(); render(); return; }
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
  else syncSlots();
  render();
}

// 街にいるあいだは、パーティ編成画面で組んだメンバーを反映する
function syncSlots() {
  const slots = partySlots();
  const same = JSON.stringify(slots.map((s) => [s.idol, s.song])) === JSON.stringify(ex.slots.map((s) => [s.idol, s.song]));
  if (!same) ex.slots = slots;
  syncParty(ex);
}

function showPending() {
  if (pending.type === 'wiped') {
    $('modal-box').innerHTML = '<h2>全滅</h2><p>パーティは迷宮で倒れた……</p><div class="row"><button data-m="rescue">回収してもらう</button></div>';
    $('modal').hidden = false;
  }
}

function closeModal() {
  const p = pending;
  pending = null;
  $('modal').hidden = true;
  if (p.type === 'wiped') say(rescue(ex));
  render();
}

document.addEventListener('click', (ev) => {
  const b = ev.target.closest('button');
  if (!b || b.disabled) return;
  if (b.closest('#battle')) { battleClick(b); return; }
  if (b.dataset.a) doAction(b.dataset.a);
  else if (b.dataset.m) closeModal();
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
if (ex.battle) resetCommands();
render();
