// 世界統一ゲーム（仮）：画面と進行
import { $, $$, el, esc, fmt, newSeed, normSeed, wait } from './util.js';
import * as G from './engine/game.js';
import { POLICIES, BASE, CATS, targetsFor } from './data/policies.js';
import { STAT_INFO, STAT_CATS, NUKE_STAGES, MAJORS } from './data/countries.js';
import { GM_NAME } from './data/gm.js';
import { describeFx, STAT_JA } from './engine/effects.js';
import { probability, TIER, rel, allied, C, isSeat } from './engine/core.js';
import { PERSONAS, AGENDAS } from './engine/ai.js';
import { flagSvg, mapSvg, plainMapSvg, diceSvg, seatColor } from './ui/art.js';
import { SPARKS } from './engine/sparks.js';

const stage = $('#stage');

// ───── 画面の大きさ（iPad 横向き基準） ─────
const DW = 1180, MIN_H = 700, MAX_H = 900;
function fit() {
  const vw = window.innerWidth, vh = window.innerHeight;
  let s = vw / DW, w = DW, h = vh / s;
  if (h < MIN_H) { s = vh / MIN_H; h = MIN_H; w = Math.min(vw / s, 1500); } else if (h > MAX_H) h = MAX_H;
  stage.style.width = w + 'px'; stage.style.height = h + 'px';
  stage.style.transform = `scale(${s})`;
  stage.style.left = Math.max(0, (vw - w * s) / 2) + 'px';
  stage.style.top = Math.max(0, (vh - h * s) / 2) + 'px';
}
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', () => setTimeout(fit, 200));
fit();
document.addEventListener('gesturestart', (e) => e.preventDefault());
$('[data-portrait]')?.addEventListener('click', () => document.body.classList.add('allow-portrait'));

// ───── 保存 ─────
const KEY = 'worldgame.save', SKEY = 'worldgame.settings';
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 保存できない環境でも遊べる */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* */ } },
};
const settings = Object.assign({ gm: 'normal', speed: 'normal' }, store.get(SKEY) || {});
const saveSettings = () => store.set(SKEY, settings);
let g = null;
const persist = () => { if (g) { if (g.result) store.del(KEY); else store.set(KEY, g); } };

const SPEED = { slow: 1100, normal: 550, fast: 180 };
const GM_PRI = { few: 1, normal: 2, many: 3 };
const mount = (node) => { $$('.screen', stage).forEach((s) => s.remove()); $$('.modal-back, .dice-back', stage).forEach((s) => s.remove()); stage.prepend(node); };
const gmBubble = (text) => `<div class="gm"><div class="face">GM</div><div class="bubble"><b class="name">${GM_NAME}</b>${esc(text)}</div></div>`;
const nameOf = (id) => (id ? C(g, id)?.name || '' : '');

// ───── タイトル ─────
function titleScreen() {
  const saved = store.get(KEY);
  const node = el(`<div class="screen title">
    <div class="map-bg">${plainMapSvg()}</div>
    <h1>世界統一ゲーム<small>WORLD UNIFICATION GAME — 一人用</small></h1>
    <div class="menu">
      ${saved && !saved.result ? `<button class="btn primary" data-cont>つづきから（${G.START_YEAR + saved.year - 1}年）</button>` : ''}
      <button class="btn ${saved && !saved.result ? '' : 'primary'}" data-new>新しいゲーム</button>
      <div class="seedrow"><input data-seed maxlength="12" placeholder="シード値" autocomplete="off"><button class="btn" data-seedgo>この世界で</button></div>
      <button class="btn" data-how>あそびかた</button>
      <button class="btn" data-set>せってい</button>
    </div>
    <div class="note">原作：冲方丁『スプライトシュピーゲルIV テンペスト』の作中ゲームをもとにした個人制作のファン作品です。国名・事件名は架空です。</div>
  </div>`);
  mount(node);
  $('[data-cont]', node)?.addEventListener('click', () => { g = migrate(saved); resume(); });
  $('[data-new]', node).addEventListener('click', () => startSetup(newSeed()));
  $('[data-seedgo]', node).addEventListener('click', () => { const s = normSeed($('[data-seed]', node).value); if (s) startSetup(s); });
  $('[data-how]', node).addEventListener('click', howTo);
  $('[data-set]', node).addEventListener('click', openSettings);
}

// 古い版のセーブを今の形にそろえる
function migrate(sv) {
  sv.world.biodiv ??= 70;
  sv.sparks ||= [];
  return sv;
}

function howTo() {
  modal(`<h2>あそびかた</h2>
  <div style="font-size:14px;line-height:1.8">
  <p>あなたは架空の国の元首です。1年に1回、パネルに出た政策から1つを選びます。どの政策にも<b>成功確率</b>が表示され、<b>100面ダイス</b>で判定します。出目が確率以下なら成功、確率の1/10以下なら大成功です。</p>
  <p>ほかの5カ国は性格の違うAI元首です。ある国の成功が、別の国の破綻を生むこともあります。毎年、世界にはイベントが起き、GM（${GM_NAME}）が「さて、どうする？」と迫ります。</p>
  <p><b>火種</b>：ときどき、ある一国で感染症・銀行破綻・飢饉・内戦などの「火種」が起きます。右上の欄に場所と種類が出ますが、深刻度と、いつ世界に広がるか（期限）は知らされません。様子は毎年の GM の言葉から推し量ってください。各国が正しい支援をすれば封じ込められ（協調の成功例になります）、まちがった対応や放置だと世界規模に広がります。どの支援が正しいかはカードに書かれていません。GM のヒントと、現実の知識で見抜いてください。</p>
  <p><b>ゲームオーバー</b>：核戦争／地球環境の破綻（環境が${G.ENV_LIMIT}以下）／一国による世界征服。自国が崩壊するとパネルがオフになり、数年後に復帰できることがあります。</p>
  <p><b>クリア</b>：国際機関を「国連 → 国連の解体 → 世界政府準備委員会 → 世界総選挙 → 世界議会」と進め、世界議会の最初の議題を全会一致で可決すること。協調の成功例を3つ積み重ねれば、国連の解体を経ずに準備委員会へ進めます。50年でタイムアップです。</p>
  </div><div class="row"><button class="btn primary" data-close>とじる</button></div>`);
}

function openSettings() {
  const seg = (k, opts) => `<div style="display:flex;gap:6px">${opts.map(([v, l]) => `<button class="btn small ${settings[k] === v ? 'primary' : ''}" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const m = modal(`<h2>せってい</h2>
    <div>GM の発言の多さ</div>${seg('gm', [['few', '少ない'], ['normal', 'ふつう'], ['many', '多い']])}
    <div>AI の手番の速さ</div>${seg('speed', [['slow', 'ゆっくり'], ['normal', 'ふつう'], ['fast', 'はやい']])}
    <div class="row"><button class="btn primary" data-close>とじる</button></div>`);
  $$('[data-k]', m).forEach((b) => b.addEventListener('click', () => {
    settings[b.dataset.k] = b.dataset.v; saveSettings();
    $$(`[data-k="${b.dataset.k}"]`, m).forEach((x) => x.classList.toggle('primary', x === b));
    if (g && $('.dash', stage)) renderDash();
  }));
}

function modal(html, cls = '') {
  const back = el(`<div class="modal-back"><div class="modal ${cls}">${html}</div></div>`);
  stage.append(back);
  $$('[data-close]', back).forEach((b) => b.addEventListener('click', () => back.remove()));
  return back;
}

// ───── 準備（抽選・基本政策） ─────
function startSetup(seed, rerolled = false) {
  g = G.newGame(seed, { rerolled });
  setupScreen();
}
function setupScreen() {
  const me = g.majors[g.player];
  let picked = [];
  const node = el(`<div class="screen setup">
    <div class="head"><h2>世界の抽選</h2><span class="chip">シード値 <b>${esc(g.seed)}</b></span></div>
    <div class="body">
      <div class="mapbox">
        <div class="mapwrap">${mapSvg(g, { highlight: g.seats })}</div>
        <div class="seats">${g.seats.map((id) => { const c = g.majors[id]; return `<div class="seat ${c.player ? 'mine' : ''}" style="border-left:4px solid ${seatColor(g, id)}">${flagSvg(c.flag, 24, 16)}<div><b>${esc(c.name)}</b><br><span class="muted">${c.player ? 'あなた' : 'AI：' + PERSONAS[c.persona].name}</span></div></div>`; }).join('')}</div>
      </div>
      <div class="side">
        ${gmBubble(g.feed.find((f) => f.k === 'gm')?.text || '')}
        <div class="pane" style="padding:8px 10px;gap:4px">
          <div class="me" style="padding:0"><div class="name">${flagSvg(me.flag, 30, 20)}${esc(me.name)}</div><div class="sub">国力 ${me.power}</div></div>
          <div class="statgrid" style="font-size:12px">${['pop', 'gnp', 'stability', 'literacy', 'oil', 'food', 'water', 'soldiers', 'nuke'].map((k) => `<div class="stat"><span>${STAT_INFO[k].name}</span><b>${statText(me, k)}</b></div>`).join('')}</div>
        </div>
        <div class="muted" style="font-size:12px">基本政策を1〜2個選んでください</div>
        <div class="bases">${Object.entries(BASE).map(([id, b]) => `<button class="base" data-b="${id}"><b>${b.name}</b><small>${b.desc}</small></button>`).join('')}</div>
      </div>
    </div>
    <div class="foot">
      <button class="btn" data-back>タイトルへ</button>
      <button class="btn" data-reroll ${g.rerolled ? 'disabled' : ''}>引き直す（1回だけ）</button>
      <button class="btn primary" data-start disabled>この国で始める</button>
    </div>
  </div>`);
  mount(node);
  $$('[data-b]', node).forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.b;
    if (picked.includes(id)) picked = picked.filter((x) => x !== id);
    else { picked.push(id); if (picked.length > 2) picked.shift(); }
    $$('[data-b]', node).forEach((x) => x.classList.toggle('on', picked.includes(x.dataset.b)));
    $('[data-start]', node).disabled = !picked.length;
  }));
  $('[data-back]', node).addEventListener('click', titleScreen);
  $('[data-reroll]', node).addEventListener('click', () => {
    const s = newSeed();
    g = G.newGame(s, { rerolled: true });
    G.say(g, 'setup.reroll');
    g.feed.reverse();
    setupScreen();
  });
  $('[data-start]', node).addEventListener('click', () => {
    G.startGame(g, picked);
    persist();
    dashScreen();
    run();
  });
}

function statText(c, k) {
  const v = c.stats[k];
  if (k === 'nuke') return NUKE_STAGES[v];
  if (k === 'gnp') return fmt(v, v < 10 ? 2 : 1);
  if (k === 'pop') return fmt(v, v < 10 ? 1 : 0);
  if (k === 'rate' || k === 'fiscal') return fmt(v, 1);
  return fmt(v, 0);
}
function isDanger(c, k) {
  const i = STAT_INFO[k], v = c.stats[k];
  return (i.low != null && v <= i.low) || (i.high != null && v >= i.high);
}

// ───── ダッシュボード ─────
let ui = { sel: null, tgt: {}, busy: false, open: {} };
function dashScreen() {
  mount(el(`<div class="screen dash">
    <div class="top"></div>
    <div class="mid">
      <div class="pane"><h3>自国</h3><div class="me"></div></div>
      <div class="center"><div class="mapwrap"></div><div class="pane"><div class="feed"></div></div></div>
      <div class="pane"><h3>各国の元首</h3><div class="rivals"></div></div>
    </div>
    <div class="bottom"><div class="gmbox"></div><div class="actions"></div></div>
  </div>`));
  renderDash();
}

function renderDash() {
  renderTop(); renderMe(); renderMap(); renderFeed(); renderRivals(); renderBottom();
}

function renderTop() {
  const w = g.world;
  const gauge = (label, val, cls = '') => `<div class="gauge ${cls}"><b>${val}</b><i>${label}</i></div>`;
  const lvl = (v, warn, danger, rev = false) => (rev ? (v <= danger ? 'danger' : v <= warn ? 'warn' : '') : (v >= danger ? 'danger' : v >= warn ? 'warn' : ''));
  $('.top', stage).innerHTML = `
    <div class="year">${G.yearLabel(g)}年<small>${g.year}/${G.MAX_YEARS}年目</small></div>
    <div class="stages">${G.STAGES.map((s, i) => `<span class="${i < w.stage ? 'on' : i === w.stage ? 'now' : ''}">${s}</span>`).join('')}</div>
    <div class="gauges">
      ${gauge('地球環境', w.env, lvl(w.env, 35, 20, true))}
      ${gauge('CO₂', Math.round(w.co2), lvl(w.co2, 60, 75))}
      ${gauge('気温', '+' + fmt(w.temp || 0, 1) + '℃')}
      ${gauge('氷', Math.round(w.ice), lvl(w.ice, 60, 40, true))}
      ${gauge('水資源', Math.round(w.waterRes), lvl(w.waterRes, 50, 35, true))}
      ${gauge('生態系', Math.round(w.biodiv ?? 70), lvl(w.biodiv ?? 70, 50, 35, true))}
      ${gauge('紛争', w.conflicts, lvl(w.conflicts, 90, 130))}
      ${gauge('緊張', Math.round(w.tension), lvl(w.tension, 60, 75))}
      ${gauge('条約有効', Math.round(w.treaty) + '%')}
      ${gauge('破綻国', w.bankrupt ?? 0)}
      ${gauge('協調', g.coop.length + '/3')}
    </div>
    <div class="tools"><button class="btn small" data-chron>年表</button><button class="btn small" data-menu>☰</button></div>`;
  $('[data-chron]', stage).addEventListener('click', showChron);
  $('[data-menu]', stage).addEventListener('click', showMenu);
}

function renderMe() {
  const c = g.majors[g.player];
  const groups = {};
  for (const [k, info] of Object.entries(STAT_INFO)) if (k !== 'power') (groups[info.cat] ||= []).push(k);
  const allies = g.seats.filter((x) => x !== c.id && allied(g, c.id, x));
  $('.me', stage).innerHTML = `
    <div class="name">${flagSvg(c.flag, 30, 20)}<span>${esc(c.name)}</span></div>
    <div class="sub">基本政策：${c.bases.map((b) => BASE[b].name).join('・')}</div>
    <div class="sub">国力 <b style="color:var(--gold)">${c.power}</b>　提携 ${allies.length ? allies.map(nameOf).join('・') : 'なし'}${g.bloc.includes(c.id) ? '　経済圏' : ''}</div>
    <div class="powerbar"><i style="width:${c.power}%"></i></div>
    ${c.panel ? '' : `<div class="offline">パネルがオフです（${G.START_YEAR + c.collapsedYear - 1}年に崩壊）。3年たつと毎年、新政権が立つかを判定します。他国の支援で早まります。</div>`}
    <div class="stats">${STAT_CATS.filter((cat) => groups[cat]).map((cat) => {
      const ks = groups[cat];
      const alerts = ks.filter((k) => isDanger(c, k)).length;
      const open = ui.open[cat] ?? (cat === '経済' || cat === '社会' || alerts > 0);
      return `<details data-cat="${cat}" ${open ? 'open' : ''}><summary><span>${cat}</span>${alerts ? `<span class="alert">⚠${alerts}</span>` : ''}</summary>
        ${ks.map((k) => `<div class="stat ${isDanger(c, k) ? 'danger' : ''}"><span>${STAT_INFO[k].name}</span><b>${statText(c, k)}${STAT_INFO[k].unit && k !== 'nuke' ? `<small class="muted"> ${STAT_INFO[k].unit}</small>` : ''}</b></div>`).join('')}</details>`;
    }).join('')}</div>`;
  $$('details', $('.me', stage)).forEach((d) => d.addEventListener('toggle', () => { ui.open[d.dataset.cat] = d.open; }));
}

function renderMap() {
  const box = $('.mapwrap', stage);
  box.innerHTML = mapSvg(g) + `<div class="legend"><span>● 紛争</span><span>☢ 核保有</span><span>--- 提携</span><span>🔥 火種</span></div><div class="seedtag">SEED ${esc(g.seed)}</div>`;
  $$('[data-id]', box).forEach((p) => p.addEventListener('click', () => countryInfo(p.dataset.id)));
}

function feedHtml(f) {
  const pri = GM_PRI[settings.gm];
  switch (f.k) {
    case 'gm': return f.pri <= pri ? `<div class="gmline">${esc(f.text)}</div>` : '';
    case 'event': return `<div class="ev"><b>📰 ${esc(f.name)}${f.who ? `（${esc(nameOf(f.who))}）` : ''}</b>${esc(f.text)}</div>`;
    case 'act': {
      const pol = POLICIES[f.pol];
      return `<div class="act"><span class="who" style="color:${seatColor(g, f.id)}">${esc(nameOf(f.id))}</span><span class="pol">${esc(pol.name)}${f.tgt ? `<span class="muted">→${esc(nameOf(f.tgt))}</span>` : ''}</span><span class="roll">${f.p}% / 出目${f.roll}</span><span class="tier ${f.tier}">${TIER[f.tier].name}</span></div>`;
    }
    case 'ai': return pri >= 3 ? `<div class="ailine">${esc(nameOf(f.id))}「${esc(f.text)}」</div>` : '';
    case 'sys': return `<div class="sys ${f.cls || ''}">${esc(f.text)}</div>`;
    case 'spark': return `<div class="ev spark"><b>${SPARKS[f.type].icon} 火種：${esc(nameOf(f.where))}で${esc(SPARKS[f.type].name)}</b>${esc(SPARKS[f.type].hint)}</div>`;
    case 'vote': return `<div class="vote"><b>世界議会の投票：「${esc(f.name)}」</b><br>${f.votes.map((v) => `${esc(nameOf(v.id))} ${v.yes ? '<span class="good">賛成</span>' : '<span class="bad">反対</span>'}`).join('　')}</div>`;
    default: return '';
  }
}
function renderFeed() {
  const box = $('.feed', stage);
  box.innerHTML = g.feed.map(feedHtml).join('');
  box.scrollTop = box.scrollHeight;
}

function renderRivals() {
  const me = g.player;
  const sparks = (g.sparks || []).map((s) => {
    const t = SPARKS[s.type];
    // 深刻度と期限は秘匿。見えるのは場所・種類・経過年数だけで、様子は GM の言葉から推し量る
    return `<div class="sparkcard" data-id="${s.where}"><div class="row"><b>${t.icon} ${esc(nameOf(s.where))}</b><span class="chip">${g.year - s.start + 1}年目</span></div>
      <div class="meta">${esc(t.name)}</div><div class="meta">状況は不明。いつ世界に広がるかもわからない</div></div>`;
  }).join('');
  $('.rivals', stage).innerHTML = (sparks ? `<div class="sparks"><h3>🔥 火種</h3>${sparks}</div>` : '') + g.seats.filter((id) => id !== me).map((id) => {
    const c = g.majors[id];
    const r = rel(g, me, id);
    const last = c.lastAct && c.lastAct.year === g.year ? `${POLICIES[c.lastAct.pol].name} <span class="tier ${c.lastAct.tier}">${TIER[c.lastAct.tier].name}</span>` : c.lastAct ? `<span class="muted">昨年：${POLICIES[c.lastAct.pol].name}</span>` : '';
    const status = c.annexedBy ? `${nameOf(c.annexedBy)}に併合` : c.panel ? '' : 'パネル オフ';
    return `<div class="rival ${c.panel ? '' : 'off'}" style="--c:${seatColor(g, id)}" data-id="${id}">
      <div class="row">${flagSvg(c.flag, 24, 16)}<b>${esc(c.name)}</b><span class="chip">${c.power}</span></div>
      <div class="meta"><span>${PERSONAS[c.persona].name}</span>${allied(g, me, id) ? '<span class="good">提携</span>' : ''}${c.stats.nuke >= 4 ? '<span>☢</span>' : ''}<span>関係</span><span class="relbar"><i style="width:${r}%;background:${r >= 60 ? 'var(--green)' : r <= 30 ? 'var(--red)' : 'var(--gold)'}"></i></span>${status ? `<span class="bad">${status}</span>` : ''}</div>
      <div class="last">${last}</div>
    </div>`;
  }).join('');
  $$('.rival, .sparkcard', stage).forEach((n) => n.addEventListener('click', () => countryInfo(n.dataset.id)));
}

function lastGmLine() {
  const pri = GM_PRI[settings.gm];
  for (let i = g.feed.length - 1; i >= 0; i--) {
    const f = g.feed[i];
    if (f.k === 'gm' && f.pri <= pri) return f.text;
    if (f.k === 'event') return f.text;
  }
  return 'さて、どうする？';
}

function renderBottom() {
  $('.gmbox', stage).innerHTML = gmBubble(lastGmLine());
  const box = $('.actions', stage);
  if (g.phase === 'player') return renderChoices(box);
  if (g.phase === 'yearEnd') return renderYearEnd(box);
  const me = g.majors[g.player];
  box.innerHTML = `<div class="waiting">${me.panel ? '各国が政策を選んでいます……' : 'あなたの国のパネルはオフです。世界の動きを見守っています……'}</div>`;
}

function renderChoices(box) {
  const c = g.majors[g.player];
  const list = g.offers.list;
  box.innerHTML = list.map((o, i) => {
    const pol = POLICIES[o.id];
    const sparkTgt = (g.sparks || []).map((s) => s.where).find((w) => o.tgts.includes(w));
    const tg = o.tgts[0] == null ? null : (ui.tgt[o.id] && o.tgts.includes(ui.tgt[o.id]) ? ui.tgt[o.id] : sparkTgt || o.tgts[0]);
    ui.tgt[o.id] = tg;
    const pr = probability(g, c, pol, tg);
    const okFx = describeFx(pol.ok).slice(0, 5).join('　');
    const ngFx = describeFx(pol.ng).slice(0, 3).join('　');
    return `<div class="card ${ui.sel === o.id ? 'sel' : ''}" style="--cc:var(--${pol.cat})" data-pol="${o.id}">
      <div class="cat"><span>${CATS[pol.cat]}</span>${(g.sparks || []).some((s) => SPARKS[s.type].fx[o.id] != null) ? '<span class="ins">🔥 火種</span>' : g.inserts.includes(o.id) ? '<span class="ins">📰 情勢</span>' : ''}</div>
      <h4>${esc(pol.name)}</h4>
      <div class="prob"><b>${pr.p}%</b><small>大成功 ${pr.crit}%<br>大失敗 ${pr.fumble}%</small></div>
      <div class="fx">成功：${okFx || '—'}</div>
      ${ngFx ? `<div class="fx ng">失敗：${ngFx}</div>` : ''}
      ${tg ? `<div class="tg">${[...new Set([tg, ...o.tgts])].slice(0, 6).map((t) => `<button data-t="${t}" class="${t === tg ? 'on' : ''}">${esc(nameOf(t).slice(0, 6))}</button>`).join('')}</div>` : '<div class="tg"></div>'}
      <button class="btn small ${ui.sel === o.id ? 'primary' : ''} go" data-go>${ui.sel === o.id ? 'ダイスを振る' : 'これにする'}</button>
    </div>`;
  }).join('');
  $$('.card', box).forEach((card) => {
    const id = card.dataset.pol;
    $$('[data-t]', card).forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); ui.tgt[id] = b.dataset.t; ui.sel = id; renderChoices(box); }));
    card.querySelector('.prob').addEventListener('click', (e) => { e.stopPropagation(); probDetail(id); });
    $('[data-go]', card).addEventListener('click', (e) => { e.stopPropagation(); if (ui.sel === id) choose(id); else { ui.sel = id; renderChoices(box); } });
    card.addEventListener('click', () => { if (ui.sel !== id) { ui.sel = id; renderChoices(box); } });
  });
}

function probDetail(polId) {
  const c = g.majors[g.player];
  const pol = POLICIES[polId];
  const pr = probability(g, c, pol, ui.tgt[polId]);
  modal(`<h2>${esc(pol.name)}：成功確率 ${pr.p}%</h2>
    <div class="chron">${pr.parts.map(([l, v]) => `<div><span>${v > 0 && l !== '基本' ? '+' : ''}${v}</span><span>${esc(l)}</span></div>`).join('')}</div>
    <div class="muted" style="font-size:12px">上限95%・下限1%。出目が確率の1/10以下なら大成功、96以上で失敗すると大失敗。</div>
    <div style="font-size:13px">成功：${describeFx(pol.ok).join('　')}<br><span class="bad">失敗：${describeFx(pol.ng).join('　') || 'なし'}</span></div>
    <div class="row"><button class="btn primary" data-close>とじる</button></div>`);
}

async function choose(polId) {
  if (ui.busy) return;
  ui.busy = true;
  const tgt = ui.tgt[polId] ?? null;
  const rec = G.playerAct(g, polId, tgt);
  ui.sel = null; ui.tgt = {};
  persist();
  await diceShow(rec);
  ui.busy = false;
  renderDash();
  run();
}

function changeText(rec) {
  const out = [];
  for (const ch of rec.changes.slice(0, 8)) {
    const who = ch.id === 'world' ? '世界' : ch.id === rec.id ? '自国' : ['all', 'nb'].includes(ch.id) ? '各国' : nameOf(ch.id);
    const name = ch.stat === 'rel' ? '関係' : STAT_INFO[ch.stat]?.name || STAT_JA[ch.stat] || ch.stat;
    const d = ch.stat === 'gnp' ? fmt(ch.d, 2) : Math.abs(ch.d) < 1 ? fmt(ch.d, 1) : fmt(ch.d, 0);
    out.push(`${who}・${name} ${ch.d > 0 ? '+' : ''}${d}`);
  }
  return out.join('　');
}

async function diceShow(rec) {
  const back = el(`<div class="dice-back"><div class="dice-box">
    <div class="need">${esc(POLICIES[rec.pol].name)}　成功 ${rec.p}% 以下</div>
    <div class="dice spin">${diceSvg()}<div class="num">--</div></div>
    <div class="res"></div><div class="changes"></div>
    <button class="btn primary" data-ok style="visibility:hidden">つづける</button>
  </div></div>`);
  stage.append(back);
  const num = $('.num', back);
  const t0 = performance.now();
  while (performance.now() - t0 < 900) { num.textContent = 1 + Math.floor(Math.random() * 100); await wait(55); }
  $('.dice', back).classList.remove('spin');
  num.textContent = rec.roll;
  const res = $('.res', back);
  res.textContent = TIER[rec.tier].name; res.className = 'res ' + rec.tier;
  $('.changes', back).textContent = changeText(rec);
  const ok = $('[data-ok]', back);
  ok.style.visibility = 'visible';
  await new Promise((r) => { ok.addEventListener('click', r); back.addEventListener('click', (e) => { if (e.target === back) r(); }); });
  back.remove();
}

function renderYearEnd(box) {
  const me = g.majors[g.player];
  const h = g.hist[g.hist.length - 1];
  const prev = g.hist[g.hist.length - 2];
  const diff = (k) => (prev ? h[k] - prev[k] : 0);
  const sign = (v, rev) => (v === 0 ? '±0' : `<span class="${(v > 0) !== !!rev ? 'good' : 'bad'}">${v > 0 ? '+' : ''}${v}</span>`);
  box.innerHTML = `<div class="yearend"><div class="sum">
    <b style="color:var(--text);font-size:15px">${G.yearLabel(g)}年が終わった</b><br>
    自国の国力 ${me.power}（${sign(diff('power'))}）　GNP成長率 ${fmt(me.growth || 0, 1)}%　地球環境 ${h.env}（${sign(diff('env'))}）　紛争 ${h.conflicts}カ所（${sign(diff('conflicts'), true)}）
  </div><button class="btn primary" data-next>次の年へ ▶</button></div>`;
  $('[data-next]', box).addEventListener('click', () => { G.beginYear(g); persist(); renderDash(); run(); });
}

// ───── 進行ループ ─────
let running = false;
async function run() {
  if (running) return;
  running = true;
  try {
    while (true) {
      if (g.result) { persist(); await wait(600); endingScreen(); return; }
      if (g.pending) { renderDash(); await handlePending(); persist(); continue; }
      if (g.phase === 'yearEnd') { renderDash(); persist(); return; }
      if (g.phase === 'player') { renderDash(); persist(); return; }
      const r = G.step(g);
      if (r.type === 'ai') {
        renderFeed(); renderRivals(); renderMap(); renderTop(); renderMe();
        $('.gmbox', stage).innerHTML = gmBubble(lastGmLine());
        await wait(SPEED[settings.speed]);
      } else if (r.type === 'yearEnd') {
        renderDash();
        // 自国が崩壊中は自動で進める（早送り）
        if (!g.majors[g.player].panel && !g.result) { await wait(SPEED[settings.speed] * 2); G.beginYear(g); continue; }
      }
    }
  } finally { running = false; }
}

function resume() {
  dashScreen();
  run();
}

function handlePending() {
  const p = g.pending;
  return new Promise((resolve) => {
    if (p.type === 'nuke') {
      const m = modal(`<h2>☢ 核のボタン</h2>
        ${gmBubble(`${nameOf(p.foe)}との緊張が限界を超えた。国民は「撃て」と叫んでいる。核を使えば、そこでゲームオーバーだ。……さて、どうする？`)}
        <div class="row"><button class="btn danger" data-fire>核を使う</button><button class="btn primary" data-hold>撃たない</button></div>`, 'nuke');
      $('[data-fire]', m).addEventListener('click', () => { m.remove(); G.resolvePending(g, 'fire'); resolve(); });
      $('[data-hold]', m).addEventListener('click', () => { m.remove(); G.resolvePending(g, 'hold'); resolve(); });
    } else if (p.type === 'vote') {
      const m = modal(`<h2>世界議会：最初の議題</h2>
        ${gmBubble('こぎ着けたな。世界議会の最初の議題を選びたまえ。全会一致で可決されれば、世界は統一的に運営される。')}
        <div class="opts">${p.options.map((a) => `<button class="opt" data-a="${a}">${esc(AGENDAS[a].name)}</button>`).join('')}</div>`);
      $$('[data-a]', m).forEach((b) => b.addEventListener('click', () => { m.remove(); G.resolvePending(g, b.dataset.a); renderFeed(); resolve(); }));
    } else if (p.type === 'rename') {
      const c = g.majors[p.id];
      const m = modal(`<h2>国号を改める</h2>
        ${gmBubble(`${c.name}の新しい国名を選びたまえ。`)}
        <div class="opts">${p.options.map((n) => `<button class="opt" data-n="${esc(n)}">${esc(n)}</button>`).join('')}<button class="opt" data-n="">いまの国名のままにする</button></div>`);
      $$('[data-n]', m).forEach((b) => b.addEventListener('click', () => { m.remove(); G.resolvePending(g, b.dataset.n || null); resolve(); }));
    } else { G.resolvePending(g, null); resolve(); }
  });
}

// ───── 情報 ─────
function countryInfo(id) {
  const c = C(g, id);
  if (!c) return;
  if (isSeat(g, id)) {
    const keys = Object.keys(STAT_INFO).filter((k) => k !== 'power');
    modal(`<h2>${flagSvg(c.flag, 36, 24)} ${esc(c.name)}</h2>
      <div class="muted">${c.player ? 'あなたの国' : 'AI：' + PERSONAS[c.persona].name}　基本政策：${c.bases.map((b) => BASE[b].name).join('・')}　国力 ${c.power}${c.player ? '' : `　あなたとの関係 ${Math.round(rel(g, g.player, id))}`}</div>
      ${c.origName !== c.name ? `<div class="muted">旧国名：${esc(c.origName)}</div>` : ''}
      <div class="statgrid">${keys.map((k) => `<div class="stat ${isDanger(c, k) ? 'danger' : ''}"><span>${STAT_INFO[k].name}</span><b>${statText(c, k)}</b></div>`).join('')}</div>
      <div class="row"><button class="btn primary" data-close>とじる</button></div>`);
  } else {
    const s = c.stats;
    modal(`<h2>${flagSvg(c.flag, 36, 24)} ${esc(c.name)}</h2>
      <div class="muted">${esc(c.role || '')}${c.owner ? `　${esc(nameOf(c.owner))}に併合` : ''}${c.sunk ? '　海面上昇で国土を失った' : ''}</div>
      <div class="statgrid">${[['経済', s.econ], ['政情', s.stability], ['水', s.water], ['食糧', s.food], ['負債', s.debt]].map(([l, v]) => `<div class="stat ${(l === '負債' ? v >= 90 : v <= 20) ? 'danger' : ''}"><span>${l}</span><b>${fmt(v, 0)}</b></div>`).join('')}</div>
      <div class="row"><button class="btn primary" data-close>とじる</button></div>`);
  }
}

function showChron() {
  modal(`<h2>年表</h2><div class="chron">${g.chron.map((x) => `<div><span>${x.year}</span><span>${esc(x.text)}</span></div>`).join('')}</div>
    <div class="row"><button class="btn primary" data-close>とじる</button></div>`);
}

function showMenu() {
  const m = modal(`<h2>メニュー</h2>
    <div class="muted">シード値：<b style="color:var(--text);letter-spacing:.1em">${esc(g.seed)}</b>（同じ組み合わせで遊び直せます）</div>
    <div class="opts">
      <button class="opt" data-how>あそびかた</button>
      <button class="opt" data-set>せってい</button>
      <button class="opt" data-title>タイトルへ（自動で保存されています）</button>
    </div><div class="row"><button class="btn primary" data-close>とじる</button></div>`);
  $('[data-how]', m).addEventListener('click', () => { m.remove(); howTo(); });
  $('[data-set]', m).addEventListener('click', () => { m.remove(); openSettings(); });
  $('[data-title]', m).addEventListener('click', () => { m.remove(); persist(); titleScreen(); });
}

// ───── 結末 ─────
function sparkline(key, color, label, max = 100) {
  const h = g.hist;
  if (h.length < 2) return '';
  const W = 520, Hh = 70;
  const vals = h.map((x) => x[key]);
  const lo = Math.min(...vals), hi = Math.max(...vals), span = Math.max(10, hi - lo);
  const pts = vals.map((v, i) => `${(i / (h.length - 1)) * W},${Hh - 4 - ((v - lo) / span) * (Hh - 8)}`).join(' ');
  return `<div style="font-size:11px;color:var(--muted)">${label}　${Math.round(vals[0])} → <b style="color:var(--text)">${Math.round(vals[vals.length - 1])}</b></div><svg viewBox="0 0 ${W} ${Hh}" style="width:100%;height:60px"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2"/></svg>`;
}
function endingScreen() {
  const r = g.result;
  const me = g.majors[g.player];
  const good = r.type === 'clear';
  let title = G.ENDINGS[r.type].name, sub = '';
  if (r.type === 'clear') sub = `世界議会の最初の議題「${AGENDAS[r.agenda].name}」が全会一致で可決された。`;
  if (r.type === 'timeup') sub = `${G.timeupGrade(g)}。`;
  if (r.type === 'conquest') sub = `${nameOf(r.conqueror)}が世界を征服した。`;
  const lastGm = [...g.feed].reverse().find((f) => f.k === 'gm')?.text || '';
  mount(el(`<div class="screen ending ${good ? '' : 'badend'}">
    <div style="display:flex;justify-content:space-between;align-items:flex-end">
      <div><div class="muted">${r.calYear}年（${r.year}年目）</div><h1>${title}</h1><div>${esc(sub)}</div></div>
      <div style="text-align:right"><div class="muted">スコア</div><div style="font-size:40px;font-weight:900;color:var(--gold)">${r.score.toLocaleString()}</div></div>
    </div>
    ${gmBubble(lastGm)}
    <div class="nums">
      <div class="num"><b>${flagSvg(me.flag, 24, 16)} ${esc(me.name)}</b><i>あなたの国（国力 ${me.power}）</i></div>
      <div class="num"><b>${G.STAGES[g.world.stage]}</b><i>国際機関の段階</i></div>
      <div class="num"><b>${g.world.env}</b><i>地球環境</i></div>
      <div class="num"><b>${fmt(g.counters.deaths, 1)}百万人</b><i>犠牲になった人々（推計）</i></div>
    </div>
    <div class="grid">
      <div class="spark">${sparkline('env', '#46b37b', '地球環境')}${sparkline('conflicts', '#e5534b', '紛争の数', 200)}${sparkline('power', '#f2b632', '自国の国力')}</div>
      <div class="chron">${g.chron.map((x) => `<div><span>${x.year}</span><span>${esc(x.text)}</span></div>`).join('')}</div>
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end;align-items:center">
      <span class="muted">シード値 <b style="color:var(--text);letter-spacing:.1em">${esc(g.seed)}</b></span>
      <button class="btn" data-same>同じ世界でもう一度</button>
      <button class="btn primary" data-new>新しいゲーム</button>
      <button class="btn" data-title>タイトルへ</button>
    </div>
  </div>`));
  $('[data-same]', stage).addEventListener('click', () => startSetup(g.seed));
  $('[data-new]', stage).addEventListener('click', () => startSetup(newSeed()));
  $('[data-title]', stage).addEventListener('click', titleScreen);
}

// 開発・テスト用
window.WG = { get g() { return g; }, G, settings };

titleScreen();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
