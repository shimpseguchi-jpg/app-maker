// 迷宮探索の画面（ルールは engine/dungeon.js・engine/expedition.js・engine/battle.js）
import { DUNGEONS } from './data/floors.js';
import { ITEMS } from './data/items.js';
import { IDOLS } from './data/idols.js';
import { CLASSES } from './data/classes.js';
import { SPELLS_BY_ID, KIND_TARGET } from './data/spells.js';
import { CONDITIONS } from './engine/revive.js';
import { getFloor, viewCells, DIR_NAME, isDark, isAntiMagic } from './engine/dungeon.js';
import { newExpedition, normalize, move, battleTurn, finishBattle, wipeOut, climb, partyView, syncParty, keyLabel, unitOf } from './engine/expedition.js';
import { renderTown, townAction, townSpeech } from './ui/town.js';
import { portrait, shortName } from './ui/portrait.js';
import { aliveGroups, groupName, reachableGroups, castable, canAct, unitLiveReady, autoCommands } from './engine/battle.js';
import { expForLevel } from './engine/growth.js';
import { drawView } from './ui/view3d.js';
import { drawMap } from './ui/automap.js';
import { chooseCard, cardView, finishCardBattle, returnHome, cardWipe } from './engine/cards.js';

const KEY = 'idoldungeon.expedition';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const has = (m, id) => m.abilities?.some((a) => a.id === id);

// はじめのパーティ（酒場で組み直せる）
const FIRST_PARTY = [{ idol: 'makoto' }, { idol: 'hibiki' }, { idol: 'haruka' }, { idol: 'ritsuko' }, { idol: 'ami' }, { idol: 'yukiho' }];

let ex = load();
let pending = null;
const log = [];
// 戦闘のコマンド入力の途中経過（保存しない）
let cmds = [], cmdIdx = 0, sub = null;
// 決着した戦闘（後始末は済んでいる。結果を見せるあいだだけ持つ）
let battleEnd = null;
// ターンの再生（エルミナージュのように、素早さの順に1人ずつ行動を見せる）。play = { b, idx, pre }
//   b.steps[idx] がいま見せている行動。pre はターンが始まる前の HP（最初の行動の前の見た目）
let play = null, playTimer = 0;
// 敵が現れる動きは、新しい戦闘のときだけ
let foesShown = null;
// カードモード：「街へ戻る」の確認中
let homeAsk = false;

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s?.ex?.dungeon && DUNGEONS[s.ex.dungeon]) return normalize(s);
  } catch (e) { /* 新しく始める */ }
  return newExpedition(FIRST_PARTY);
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(ex)); } catch (e) { /* 保存できなくても続行 */ } }
function say(msgs) { for (const m of msgs) log.push(m); while (log.length > 40) log.shift(); }

// ── 描画 ──
function render() {
  const town = ex.mode === 'town', battle = !!(ex.battle || battleEnd), cards = ex.mode === 'card' && !!ex.card && !battle;
  const st = ex.ex;
  const fl = getFloor(st.dungeon, st.floor);
  const ch = fl.cellAt(st.x, st.y);
  const dark = !town && ex.mode !== 'card' && isDark(ch);
  // 右上の場所名（エルミナージュの細い下線つきの札）。座標は X/Y、ダークゾーンでは分からない
  $('where').textContent = town ? `劇中の街 ― ${townSpeech().place}` : `${DUNGEONS[st.dungeon].name}  ${fl.id}`;
  $('pos').textContent = town || battle || cards ? '' : dark ? 'X?? Y??' : `X${String(st.x).padStart(2, '0')}  Y${String(st.y).padStart(2, '0')}`;
  $('zone').textContent = town || ex.mode === 'card' ? '' : dark ? 'ダークゾーン' : isAntiMagic(ch) ? '呪文禁止' : '';
  $('gold').textContent = `${ex.gold} G`;
  // 画面の切り替え（スマホの並べ方は body の data-mode で決める）
  $('screen').dataset.mode = document.body.dataset.mode = town ? 'town' : battle ? 'battle' : cards ? 'card' : 'dungeon';
  document.body.dataset.play = ex.mode === 'card' || ex.card ? 'card' : 'drpg';
  $('town').hidden = !town; $('battle').hidden = !battle; $('cards').hidden = !cards; $('pad').hidden = town || battle || cards;
  $('hudmap').hidden = town || battle || cards; $('compass').hidden = town || battle || cards;
  if (town) $('town').innerHTML = renderTown(ex);
  else if (cards) renderCards();
  else {
    drawView($('view'), st, viewCells(st), { theme: fl.theme });
    if (battle) renderBattle();
    const stairs = ch === 'u' || ch === 'd';
    $('stairs-btn').hidden = !stairs || battle;
    $('stairs-btn').textContent = ch === 'd' ? '階段を下りる' : st.floor === 0 ? '街へ戻る' : '階段を上る';
    // 方角：針は北を指す（向いている方角が上）。まん中に向いている方角
    $('compass').innerHTML = dark ? '<b>？</b>' : `<i class="needle" style="transform:rotate(${-st.dir * 90}deg)"></i><b>${DIR_NAME[st.dir]}</b>`;
    if (!dark) drawMap($('map'), st, { theme: fl.theme, mini: true });
    else { const c = $('map').getContext('2d'); c.fillStyle = '#000'; c.fillRect(0, 0, $('map').width, $('map').height); }
  }
  renderLog(town, battle);
  renderParty();
  save();
}

// 下の窓：街では施設の人のひとこと、戦闘中は戦闘の記録、迷宮ではできごと
function renderLog(town, battle) {
  let lines, speaker = '';
  if (battle && play) { const s = play.b.steps[play.idx]; lines = play.b.log.slice(s.from, s.to).slice(-5); }
  else if (battle) lines = (ex.battle || battleEnd.battle).log.slice(-5);
  else if (town) { const t = townSpeech(); speaker = t.speaker; lines = [`「${t.line}」`, ...log.slice(-2)]; }
  else if (ex.mode === 'card') lines = log.slice(-3);
  else lines = log.slice(-4);
  $('log').innerHTML = (speaker ? `<div class="speaker">${esc(speaker)}</div>` : '') + lines.map((m) => `<div>${esc(m)}</div>`).join('');
}

// 6人の顔（エルミナージュの下の列：名前・顔・レベル・大きな HP・ゲージ）
function renderParty() {
  const bt = ex.battle || play?.b;
  const view = bt && viewOf(bt);
  const step = play && play.b.steps[play.idx];
  const actor = step && play.b.order[step.k];
  const list = bt ? bt.party.map((m, i) => ({ ...m, ...view.party[i], idol: IDOLS[m.id] })) : partyView(ex);
  const tiles = list.map((m, i) => {
    const pct = Math.max(0, Math.round((m.hp / m.maxHp) * 100));
    const flags = [];
    if (m.cond !== 'ok') flags.push(CONDITIONS[m.cond].name);
    if (m.poison) flags.push('毒');
    if (m.sleep) flags.push('睡眠');
    if (m.silence) flags.push('沈黙');
    if (m.fled) flags.push('逃走');
    const u = unitOf(ex, m.id);
    const mp = ex.battle ? m.mp : ex.mp[m.id];
    const live = ex.battle ? m.live?.left : ex.live[m.id]?.left;
    const active = !play && ex.battle && !ex.battle.result && i === cmdIdx ? ' active' : '';
    const acting = actor?.side === 'p' && actor.i === i ? ' acting' : '';
    const hits = step ? step.hits.filter((h) => h.side === 'p' && h.i === i) : [];
    const down = ['dead', 'ash', 'stone', 'paralyze'].includes(m.cond) || m.fled ? ' down' : '';
    const tip = `${m.idol.name}（${CLASSES[m.cls].name} Lv${u.level}）HP ${m.hp}/${m.maxHp}${m.stats ? ` 素早さ${m.stats.spd}` : ''}${mp && Object.keys(mp).length ? ' 呪文' + Object.values(mp).join('/') : ''}${live != null ? ` 歌${live}` : ''} 次のLvまで ${Math.max(0, expForLevel(u.level + 1) - u.exp)}`;
    return `<div class="pt${active}${acting}${down}${hits.some((h) => h.dmg) ? ' hit' : ''}" style="--c:${m.idol.color}" title="${esc(tip)}">
      ${popOf(hits)}
      <div class="pt-name">${esc(shortName(m.id))}</div>
      <div class="pt-face">${portrait(m.id)}</div>
      ${flags.length ? `<div class="pt-cond">${esc(flags[0])}</div>` : ''}
      <div class="pt-lv">${u.level}</div><div class="pt-hp">${m.hp}</div>
      <div class="pt-gauge"><i style="width:${pct}%" class="${pct < 30 ? 'low' : ''}"></i></div>
    </div>`;
  });
  for (let i = list.length; i < 6; i++) tiles.push('<div class="pt empty"></div>');
  $('party').innerHTML = tiles.join('');
  const items = ex.items.reduce((a, id) => ((a[id] = (a[id] || 0) + 1), a), {});
  const keys = ex.ex.keys.map((k) => `<span class="tag">🔑 ${esc(keyLabel(k))}</span>`).join('');
  const its = Object.entries(items).map(([id, n]) => `<span class="tag">${esc(ITEMS[id].name)}×${n}</span>`).join('');
  $('bag').innerHTML = keys || its ? `<div class="tags">${keys}${its}</div>` : '<small class="sub">持ち物なし</small>';
}

// 大きい地図（エルミナージュの地図画面：方眼と座標）
function showBigMap() {
  if (ex.mode !== 'dungeon' || ex.battle || battleEnd) return;
  const st = ex.ex, fl = getFloor(st.dungeon, st.floor), dark = isDark(fl.cellAt(st.x, st.y));
  $('bigmap-title').textContent = `${DUNGEONS[st.dungeon].name}  ${fl.id}`;
  $('bigmap-coord').textContent = dark ? '現在地：X?? Y??' : `現在地：X ${st.x}  Y ${st.y}  ${DIR_NAME[st.dir]}向き`;
  drawMap($('mapfull'), st, { full: true });
  $('bigmap').hidden = false;
}

// ── 戦闘 ──
function nextActor(from) {
  const b = ex.battle;
  for (let i = from; i < b.party.length; i++) if (canAct(b.party[i])) return i;
  return b.party.length;
}
function resetCommands() { cmds = []; sub = null; cmdIdx = nextActor(0); }

// 戦闘：敵は画面の中央に大きく、右上に敵グループの小窓、左上に行動する人と縦のコマンド
function renderBattle() {
  const b = ex.battle || battleEnd.battle;
  const view = viewOf(b);
  const step = play && play.b === b ? b.steps[play.idx] : null;
  const actor = step && b.order[step.k];
  // 再生中は、この行動の前に生きていたグループまで出す（倒れたグループは消えていく）
  const before = step ? (play.idx ? b.steps[play.idx - 1] : play.pre) : view;
  const alive = (v, g) => v.foes[g.gi].filter((hp) => hp > 0).length;
  const groups = step ? b.groups.filter((g) => alive(before, g) > 0) : aliveGroups(b);
  const first = foesShown !== b;
  foesShown = b;
  const stage = groups.map((g) => {
    const n = alive(view, g);
    const status = [g.members.some((e) => !e.dead && e.sleep) && '睡眠', g.members.some((e) => !e.dead && e.confuse) && '混乱', g.members.some((e) => !e.dead && e.silence) && '沈黙'].filter(Boolean).join('・');
    const icon = g.identified ? g.def.icon : '❔';
    const hits = step ? step.hits.filter((h) => h.side === 'e' && h.gi === g.gi) : [];
    const cls = [g.def.traits && 'boss', actor?.side === 'e' && actor.gi === g.gi && 'acting', hits.some((h) => h.dmg) && 'hit', n === 0 && 'dying'].filter(Boolean).join(' ');
    return `<div class="foe ${cls}">${popOf(hits)}<div class="foe-art">${Array.from({ length: Math.max(1, Math.min(n, 3)) }, () => `<span>${icon}</span>`).join('')}</div>
      <div class="foe-name">${esc(groupName(g))}${status && !step ? ` <em>${status}</em>` : ''}</div></div>`;
  }).join('');
  const box = groups.map((g, i) => {
    const n = alive(view, g);
    return `<div><span class="gi">${i + 1}</span>${esc(groupName(g))}<span class="dots">${'●'.repeat(Math.min(n, 9))}</span></div>`;
  }).join('');
  let ctl = '';
  if (step) ctl = orderStrip(b, step);
  else if (battleEnd) {
    ctl = `<div class="who">${{ win: '勝利！', flee: '逃げ切った', lose: '全滅……' }[b.result]}</div>
      <div class="bres">${battleEnd.msgs.map((m) => `<div>${esc(m)}</div>`).join('')}</div>
      <div class="vmenu"><button data-b="end" class="vbar on">探索に戻る</button></div>`;
  } else if (b.turn === 0 && b.surprise === 'enemy') {
    ctl = '<div class="who">不意を突かれた！</div><div class="vmenu"><button data-b="go" class="vbar on">次へ</button></div>';
  } else if (cmdIdx >= b.party.length) {
    ctl = '<div class="vmenu"><button data-b="go" class="vbar on">実行</button></div>';
  } else ctl = commandMenu(b, b.party[cmdIdx], groups);
  $('battle').innerHTML = `<div class="foes${first ? ' first' : ''}">${stage || ''}</div>
    <div class="groupbox">${box}</div>
    <div class="cmdwin">${ctl}</div>`;
}

// 戦闘の見た目に使う HP など（再生中はその行動のあと、ふだんは今の状態）
function viewOf(b) {
  if (play && play.b === b) return b.steps[play.idx];
  return snapOf(b);
}
function snapOf(b) {
  return { party: b.party.map((m) => ({ hp: m.hp, cond: m.cond, fled: m.fled, poison: m.poison, sleep: m.sleep, silence: m.silence })),
    foes: b.groups.map((g) => g.members.map((e) => (e.dead ? 0 : e.hp))) };
}
// 当たった数字（ダメージは合計、回復は緑、外れは MISS）
function popOf(hits) {
  if (!hits.length) return '';
  const dmg = hits.reduce((s, h) => s + (h.dmg || 0), 0), heal = hits.reduce((s, h) => s + (h.heal || 0), 0);
  if (dmg) return `<div class="pop">${dmg}</div>`;
  if (heal) return `<div class="pop heal">+${heal}</div>`;
  return '<div class="pop miss">MISS</div>';
}
// 行動順（素早さ＋運で毎ターン決まる）。済んだ人は暗く、いま動いている人は明るく
function orderStrip(b, step) {
  const chips = b.order.map((o, k) => {
    const st = step.k === -1 || k < step.k ? ' done' : k === step.k ? ' now' : '';
    if (o.side === 'p') { const m = b.party[o.i]; return `<span class="oc${st}" style="--c:${IDOLS[m.id].color}">${esc(shortName(m.id))}</span>`; }
    const g = b.groups[o.gi];
    return `<span class="oc e${st}" title="${esc(groupName(g))}">${g.identified ? g.def.icon : '❔'}</span>`;
  }).join('');
  return `<div class="who">ターン ${b.turn}<small>行動順（素早さ順）</small></div><div class="order">${chips}</div>
    <div class="vmenu minor-row"><button data-b="next" class="vbar on">次へ ▶</button><button data-b="skip" class="vbar minor">とばす</button></div>`;
}

function commandMenu(b, m, groups) {
  const head = `<div class="who">${esc(m.name)}<small>${m.row === 'front' ? '前列' : '後列'}・射程${m.range}・素早さ${m.stats.spd}</small></div>`;
  const back = cmdIdx > nextActor(0) || sub ? '<button data-b="back" class="vbar minor">戻る</button>' : '';
  const auto = '<button data-b="auto" class="vbar minor">おまかせ</button>';
  if (!sub && ex.card) return commandCard(b, m, groups, back, auto);
  if (sub?.type === 'magic') {
    const live = m.live ? `<button class="vbar" data-b="live" ${m.live.left > 0 ? '' : 'disabled'}>ライブ「${esc(m.live.name)}」×${m.live.left}</button>` : '';
    return `${head}<div class="vmenu">${castable(b, m).map((s) => `<button class="vbar" data-sp="${s.id}" title="${esc(s.text)}">${esc(s.name)} <small>${m.mp[s.family]}回</small></button>`).join('')}${live}</div><div class="vmenu minor-row">${back}</div>`;
  }
  if (!sub || sub.type === 'more') {
    const reach = reachableGroups(b, m);
    const spells = castable(b, m);
    const btns = [
      `<button class="vbar" data-b="attack" ${reach.length ? '' : 'disabled'}>戦う${reach.length ? '' : '（届かない）'}</button>`,
      `<button class="vbar" data-b="spell" ${spells.length ? '' : 'disabled'}>呪文</button>`,
      m.live ? `<button class="vbar" data-b="live" ${m.live.left > 0 ? '' : 'disabled'}>ライブ「${esc(m.live.name)}」×${m.live.left}</button>` : '',
      has(m, 'dance') ? '<button class="vbar" data-b="dance">踊る</button>' : '',
      has(m, 'unitLive') && unitLiveReady(b) ? '<button class="vbar" data-b="unitLive">ユニットライブ</button>' : '',
      '<button class="vbar" data-b="defend">守る</button>',
      '<button class="vbar" data-b="guard">かばう</button>',
      b.canFlee ? '<button class="vbar" data-b="flee">逃げる</button>' : '',
    ];
    return `${head}<div class="vmenu">${btns.join('')}</div><div class="vmenu minor-row">${back}${auto}</div>`;
  }
  if (sub.type === 'attack') {
    const reach = reachableGroups(b, m);
    return `${head}<div class="ask">どのグループを攻撃する？</div><div class="vmenu">${groups.map((g, i) => `<button class="vbar" data-tg="${i}" ${reach.includes(g) ? '' : 'disabled'}>${i + 1}）${esc(groupName(g))}</button>`).join('')}</div><div class="vmenu minor-row">${back}</div>`;
  }
  if (sub.type === 'spell') {
    return `${head}<div class="vmenu">${castable(b, m).map((s) => `<button class="vbar" data-sp="${s.id}" title="${esc(s.text)}">${esc(s.name)} <small>${m.mp[s.family]}回</small></button>`).join('')}</div><div class="vmenu minor-row">${back}</div>`;
  }
  // 対象を選ぶ（呪文・ライブ・かばう・踊る）
  const kind = sub.kind;
  const tgt = kind ? KIND_TARGET[kind] : 'ally';
  if (tgt === 'enemy' || tgt === 'group') {
    return `${head}<div class="ask">${esc(sub.label)}：どの敵に？</div><div class="vmenu">${groups.map((g, i) => `<button class="vbar" data-tg="${i}">${i + 1}）${esc(groupName(g))}</button>`).join('')}</div><div class="vmenu minor-row">${back}</div>`;
  }
  const allies = b.party.map((t, i) => [t, i]).filter(([t]) => (kind === 'revive' ? t.cond === 'dead' : !t.fled && t.hp > 0 && t.cond !== 'dead' && t.cond !== 'ash') && (sub.type === 'guard' || sub.type === 'dance' ? t !== m : true));
  return `${head}<div class="ask">${esc(sub.label)}：だれに？</div><div class="vmenu">${allies.map(([t, i]) => `<button class="vbar" data-ta="${i}">${esc(t.name)} <small>HP${t.hp}</small></button>`).join('')}</div><div class="vmenu minor-row">${back}</div>`;
}

// カードモードの戦闘：1人1枚のコマンドカード。右＝戦う（届くいちばん前のグループ）・左＝守る・上＝呪文とライブ・下＝その他
function commandCard(b, m, groups, back, auto) {
  const tg = reachableGroups(b, m)[0];
  const magic = castable(b, m).length > 0 || (m.live && m.live.left > 0);
  const actors = b.party.map((t, i) => i).filter((i) => canAct(b.party[i]));
  return `<div class="cmd-card" data-swipe-root>
      <article class="ccard small" data-card tabindex="0" aria-label="${esc(m.name)}のコマンド">
        <div class="cc-tag">コマンド<span>${actors.indexOf(cmdIdx) + 1} / ${actors.length}人目</span></div>
        <p class="cc-text"><b>${esc(m.name)}</b><br><small>HP ${m.hp}/${m.maxHp}・${m.row === 'front' ? '前列' : '後列'}・射程${m.range}・素早さ${m.stats.spd}</small></p>
        <div class="cc-label"></div>
      </article>
      <div class="cmd4">
        <button class="vbar" data-swipe="left" data-label="守る" data-b="defend">← 守る</button>
        <button class="vbar" data-swipe="right" data-label="戦う" ${tg ? `data-tg="${groups.indexOf(tg)}"` : 'disabled'}>戦う${tg ? `：${esc(groupName(tg))}` : '（届かない）'} →</button>
        <button class="vbar" data-swipe="up" data-label="呪文・ライブ" data-b="magic" ${magic ? '' : 'disabled'}>↑ 呪文・ライブ</button>
        <button class="vbar" data-swipe="down" data-label="その他" data-b="more">↓ その他</button>
      </div>
    </div>
    <div class="vmenu minor-row">${back}${auto}</div>`;
}

function setCommand(c) {
  cmds[cmdIdx] = c; sub = null;
  cmdIdx = nextActor(cmdIdx + 1);
  if (cmdIdx >= ex.battle.party.length) runBattleTurn();
  else render();
}

function runBattleTurn() {
  const bt = ex.battle, pre = snapOf(bt);
  battleTurn(ex, cmds);
  if (bt.result) {
    const r = ex.card ? finishCardBattle(ex) : finishBattle(ex);
    battleEnd = { battle: bt, msgs: r.msgs, wiped: r.wiped };
  } else resetCommands();
  clearTimeout(playTimer);
  play = bt.steps?.length ? { b: bt, idx: 0, pre } : null;
  render();
  if (play) playTimer = setTimeout(nextStep, stepDelay());
}
// 1人の行動を見せる時間（メッセージが多いほど長く）。押せばすぐ次へ
function stepDelay() {
  const s = play.b.steps[play.idx];
  return 750 + 250 * Math.min(5, s.to - s.from);
}
function nextStep() {
  clearTimeout(playTimer);
  if (!play) return;
  play.idx++;
  if (play.idx >= play.b.steps.length) play = null;
  render();
  if (play) playTimer = setTimeout(nextStep, stepDelay());
}
function skipPlay() { clearTimeout(playTimer); play = null; render(); }

function battleClick(b) {
  const bt = ex.battle || battleEnd?.battle;
  const m = bt.party[cmdIdx];
  const d = b.dataset;
  if (d.b === 'next') { nextStep(); return; }
  if (d.b === 'skip') { skipPlay(); return; }
  if (play) return;
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
  if (d.b === 'magic') { sub = { type: 'magic' }; render(); return; }
  if (d.b === 'more') { sub = { type: 'more' }; render(); return; }
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
    if (!sub || sub.type === 'attack' || sub.type === 'more') setCommand({ type: 'attack', group: g });
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

// ── カードモード（docs/DESIGN.md 17.3）：テキストのカードを左右に振って進む ──
function renderCards() {
  const v = cardView(ex), c = v.card;
  const zone = [v.dark && `ダークゾーン あと${v.dark}枚`, v.anti && `呪文禁止 あと${v.anti}枚`].filter(Boolean).join('・');
  const l = v.loot, loot = [`${l.gold}G`, l.scores.length && `楽譜${l.scores.length}`, l.items.length && `アイテム${l.items.length}`].filter(Boolean).join('・');
  const foot = homeAsk
    ? `<span>拾った物（${loot}）の半分を失います。街へ戻りますか？</span><button data-c="homeYes">戻る</button><button data-c="homeNo">続ける</button>`
    : `<span>拾った物：${loot}</span><button data-c="home">街へ戻る<small>拾った物の半分を失う</small></button>`;
  $('cards').innerHTML = `<div class="cm" data-swipe-root>
    <div class="cm-top">
      <div class="cm-hp" title="パーティの残り HP"><span>HP</span><div class="cm-bar"><i style="width:${v.hp}%" class="${v.hp < 30 ? 'low' : ''}"></i><span class="cm-dot" id="cmdot" data-size="0"></span></div><b>${v.hp}%</b></div>
      <div class="cm-where">${esc(DUNGEONS[ex.card.dungeon].name)}　${v.floor}<small>${c.kind === 'boss' ? '最深部' : `${v.step} / ${v.perFloor}`}</small>${zone ? `<em>${zone}</em>` : ''}</div>
    </div>
    <div class="cm-stage">
      <article class="ccard kind-${c.kind}" data-card tabindex="0" aria-label="${esc(c.title)}">
        <div class="cc-tag">${esc(c.tag)}<span>${esc(c.title)}</span></div>
        <p class="cc-text">${esc(c.text)}</p>
        <div class="cc-label"></div>
      </article>
    </div>
    <div class="cm-choices">
      <button data-c="left" data-swipe="left" data-hp="${c.left.hp}" data-label="${esc(c.left.label)}">← ${esc(c.left.label)}</button>
      <button data-c="right" data-swipe="right" data-hp="${c.right.hp}" data-label="${esc(c.right.label)}">${esc(c.right.label)} →</button>
    </div>
    <div class="cm-foot">${foot}</div>
  </div>`;
}

function cardClick(b) {
  const d = b.dataset;
  if (d.c === 'home') { homeAsk = true; render(); return; }
  if (d.c === 'homeNo') { homeAsk = false; render(); return; }
  if (d.c === 'homeYes') { homeAsk = false; say(returnHome(ex)); render(); return; }
  if (d.c !== 'left' && d.c !== 'right') return;
  homeAsk = false;
  const r = chooseCard(ex, d.c);
  say(r.msgs);
  if (r.battle) resetCommands();
  if (r.wiped) { pending = { type: 'wiped' }; render(); showPending(); return; }
  render();
}

// カードを指（マウス）で振る：ドラッグして離すと、その向きのボタン（data-swipe）を押したことになる。傾けているあいだは答えを出す
let drag = null;
const swipeDir = (dx, dy, min, root) => {
  const ax = Math.abs(dx), ay = Math.abs(dy);
  if (ax >= ay && ax >= min) return dx > 0 ? 'right' : 'left';
  if (ay > ax && ay >= min && root?.querySelector('[data-swipe="up"]')) return dy < 0 ? 'up' : 'down';
  return null;
};
function showChoice(root, dir) {
  const btn = dir ? root?.querySelector(`[data-swipe="${dir}"]`) : null;
  const label = root?.querySelector('.cc-label');
  if (label) { label.textContent = btn && !btn.disabled ? btn.dataset.label : ''; label.dataset.dir = dir || ''; }
  root?.querySelectorAll('[data-swipe]').forEach((x) => x.classList.toggle('hot', x === btn));
  preview(btn);
}
// 答えで HP が動くなら、ゲージの上に点を出す（大きさ＝動く量。増えるか減るかは出さない）
function preview(btn) { const dot = $('cmdot'); if (dot) dot.dataset.size = btn?.dataset.hp || '0'; }
document.addEventListener('pointerdown', (ev) => {
  const card = ev.target.closest('[data-card]');
  if (!card || play) return;
  drag = { card, root: card.closest('[data-swipe-root]'), x: ev.clientX, y: ev.clientY, dx: 0, dy: 0 };
  card.classList.add('dragging');
});
document.addEventListener('pointermove', (ev) => {
  if (!drag) return;
  drag.dx = ev.clientX - drag.x; drag.dy = ev.clientY - drag.y;
  drag.card.style.transform = `translate(${drag.dx}px, ${drag.dy * 0.35}px) rotate(${drag.dx / 16}deg)`;
  showChoice(drag.root, swipeDir(drag.dx, drag.dy, 24, drag.root));
});
function endDrag(ev) {
  if (!drag) return;
  const { card, root, dx, dy } = drag;
  drag = null;
  card.classList.remove('dragging');
  card.style.transform = '';
  showChoice(root, null);
  const dir = ev.type === 'pointerup' ? swipeDir(dx, dy, 80, root) : null;
  if (dir) root.querySelector(`[data-swipe="${dir}"]:not(:disabled)`)?.click();
}
document.addEventListener('pointerup', endDrag);
document.addEventListener('pointercancel', endDrag);
document.addEventListener('pointerover', (ev) => { const b = ev.target.closest?.('#cards [data-swipe]'); if (b) preview(b); });
document.addEventListener('pointerout', (ev) => { if (ev.target.closest?.('#cards [data-swipe]')) preview(null); });
document.addEventListener('focusin', (ev) => { if (ev.target.closest?.('#cards [data-swipe]')) preview(ev.target); });
const visibleSwipeRoot = () => [...document.querySelectorAll('[data-swipe-root]')].find((e) => e.offsetParent !== null);

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
  render();
}

function showPending() {
  if (pending.type === 'wiped') {
    $('modal-box').innerHTML = '<h2>全滅</h2><p>パーティは迷宮で倒れた……<br>死体はその場に残る。寺院で回収してもらうか、別のパーティで探しに行こう。</p><div class="row"><button data-m="rescue">街へ</button></div>';
    $('modal').hidden = false;
  }
}

function closeModal() {
  const p = pending;
  pending = null;
  $('modal').hidden = true;
  if (p.type === 'wiped') say(ex.card ? cardWipe(ex) : wipeOut(ex));
  render();
}

document.addEventListener('click', (ev) => {
  // 再生中は、画面やメッセージを押すと次の行動へ
  if (play && ev.target.closest('#screen, #log') && !ev.target.closest('button')) { nextStep(); return; }
  const b = ev.target.closest('button');
  if (!b || b.disabled) return;
  if (!$('bigmap').hidden && b.dataset.x !== 'mapclose') return;
  if (b.closest('#battle')) { battleClick(b); return; }
  if (b.closest('#cards')) { cardClick(b); return; }
  if (b.id === 'hudmap' || b.dataset.x === 'map') { showBigMap(); return; }
  if (b.dataset.x === 'mapclose') { $('bigmap').hidden = true; return; }
  if (b.dataset.a) doAction(b.dataset.a);
  else if (b.dataset.m) closeModal();
  else if (b.closest('#town')) townDo(b);
});
document.addEventListener('change', (ev) => {
  const el = ev.target.closest('#town select');
  if (el) townDo(el);
});
function townDo(el) {
  const r = townAction(ex, el);
  say(r.msgs);
  if (r.replace) ex = normalize(r.replace);
  render();
}

const KEYMAP = { ArrowUp: 'forward', w: 'forward', ArrowLeft: 'turnL', a: 'turnL', ArrowRight: 'turnR', d: 'turnR',
  ArrowDown: 'turnBack', s: 'turnBack', q: 'strafeL', e: 'strafeR', ' ': 'search', f: 'search', Enter: 'stairs' };
document.addEventListener('keydown', (ev) => {
  if (play && (ev.key === ' ' || ev.key === 'Enter')) { ev.preventDefault(); nextStep(); return; }
  if (play && ev.key === 'Escape') { skipPlay(); return; }
  if (ev.key === 'm' || ev.key === 'M' || (ev.key === 'Escape' && !$('bigmap').hidden)) {
    if (ev.target.closest('input, select, textarea')) return;
    if ($('bigmap').hidden) showBigMap(); else $('bigmap').hidden = true;
    return;
  }
  // カード：矢印キーで振る
  const swipe = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }[ev.key];
  const root = swipe && !play && pending == null && visibleSwipeRoot();
  if (root) {
    const btn = root.querySelector(`[data-swipe="${swipe}"]:not(:disabled)`);
    if (btn) { ev.preventDefault(); btn.click(); }
    return;
  }
  const a = KEYMAP[ev.key];
  if (!a || ev.target.closest('input, select, textarea')) return;
  ev.preventDefault();
  doAction(a);
});

if (ex.mode === 'town') { syncParty(ex); say(['劇中の街にいる。酒場でパーティを組んで、迷宮へ']); }
if (ex.battle) resetCommands();
render();
