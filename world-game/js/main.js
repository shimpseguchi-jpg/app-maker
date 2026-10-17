// 世界統一ゲーム（仮）：画面と進行（おとなモード／1ねんせいモード）
import { watchKid, kidify } from './ui/kidify.js';
import { onGas, cloud, cloudLoad, cloudPush } from './cloud.js';
import { $, $$, el, esc, fmt, newSeed, normSeed, wait } from './util.js';
import * as G from './engine/game.js';
import { POLICIES, BASE, CATS } from './data/policies.js';
import { STAT_INFO, STAT_CATS, NUKE_STAGES, MAJORS, BACKS } from './data/countries.js';
import { GM_NAME } from './data/gm.js';
import { describeFx, STAT_JA } from './engine/effects.js';
import { probability, TIER, rel, allied, C, isSeat, activeSituations } from './engine/core.js';
import { PERSONAS } from './engine/ai.js';
import { flagSvg, mapSvg, plainMapSvg, diceSvg, seatColor } from './ui/art.js';
import { SPARKS } from './engine/sparks.js';
import { OPTION_BY_ID, NEWS_ICON, NEWS_CAT, poolOf } from './data/reactions.js';
import { EVENT_BY_ID } from './data/events.js';
import { SEC_NAME, moodFace, MOOD_WORD } from './data/secretary.js';
import { AGENDAS } from './data/agendas.js';
import { getMood, toneOf } from './engine/secretary.js';
import { voteChance } from './engine/ai.js';
import {
  KID_EVENT, KID_COUNTRY, KID_STATS, kidStats, KID_DANGER, kidFx, KID_MOD, KID_PERSONA, KID_CATS, KID_STAGES, KID_AGENDAS, KID_ENDINGS, KID_TIERS,
  KID_BASE, KID_SPARK, KID_POLICY, KID_GM_NAME, KID_STAT_OF, KID_WORLD, KID_BAD,
} from './data/kid.js';

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
// GAS 版では、学校のアカウントごとに先生のスプレッドシートにも保存する（cloud.js）
let KEY = 'worldgame.save', SKEY = 'worldgame.settings';
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 保存できない環境でも遊べる */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* */ } },
};
const settings = { gm: 'normal', speed: 'normal', mode: 'adult' };
const loadSettings = () => Object.assign(settings, store.get(SKEY) || {});
loadSettings();
const saveSettings = () => { store.set(SKEY, settings); cloudPush({ settings: JSON.stringify(settings) }); };
let g = null;
// 先生の一覧に出す見出し（モード・年・国・状態・点数）
const saveMeta = (x) => ({ mode: x.kid ? '1ねんせい' : 'おとな', year: G.yearLabel(x), country: (x.kid ? kidify : String)(x.majors?.[x.player]?.name || ''), status: x.result ? x.result.type : 'playing', score: x.result?.score ?? '' });
const persist = () => {
  if (!g) return;
  if (g.result) { store.del(KEY); cloudPush({ save: null, meta: saveMeta(g) }); return; }
  g.savedAt = Date.now();
  store.set(KEY, g);
  cloudPush({ save: JSON.stringify(g), meta: saveMeta(g) });
};

// 世界の国の数（モードごとに覚える。はじめは おとな46・1ねんせい20）
const worldSize = () => settings.size?.[settings.mode] ?? (settings.mode === 'kid' ? 20 : G.WORLD_MAX);
// 1ねんせいモードかどうか（ゲーム中はゲームの設定、タイトルでは選んだモード）
const kid = () => (g ? !!g.kid : settings.mode === 'kid');
const K = (adult, k) => (kid() ? k : adult);
const setKidClass = () => stage.classList.toggle('kid', kid());
watchKid(stage, kid); // 1ねんせいモード：カタカナ語と1年生の漢字に置きかえる

const SPEED = { slow: 1100, normal: 550, fast: 180 };
const GM_PRI = { few: 1, normal: 2, many: 3 };
const mount = (node) => { setKidClass(); $$('.screen', stage).forEach((s) => s.remove()); $$('.modal-back, .dice-back', stage).forEach((s) => s.remove()); stage.prepend(node); };
const gmBubble = (text) => `<div class="gm"><div class="face">${K('GM', '🎩')}</div><div class="bubble"><b class="name">${K(GM_NAME, KID_GM_NAME)}</b>${esc(text)}</div></div>`;
// まとまった背景国の、元の国の名前
const memberName = (m) => (kid() ? KID_COUNTRY[m]?.[0] : (MAJORS.find((x) => x.id === m) || BACKS.find((x) => x.id === m))?.name) || m;
const nameOf = (id) => (id ? C(g, id)?.name || '' : '');
const polName = (id) => (kid() ? KID_POLICY[id] : POLICIES[id].name);
const tierName = (t) => (kid() ? KID_TIERS[t] : TIER[t].name);
const personaName = (p) => (kid() ? KID_PERSONA[p] : PERSONAS[p].name);
const baseName = (b) => (kid() ? KID_BASE[b][0] : BASE[b].name);
const sparkName = (t) => (kid() ? KID_SPARK[t][0] : SPARKS[t].name);
const stageNames = () => (kid() ? KID_STAGES : G.STAGES);
const agendaName = (a) => (kid() ? AGENDAS[a].kid : AGENDAS[a].name);
// 補佐官（国民の気持ちを伝える）
const secName = () => SEC_NAME[kid() ? 1 : 0];
const secBubble = (text) => `<div class="gm sec"><div class="face">👩‍💼</div><div class="bubble"><b class="name">${esc(secName())}</b>${esc(text)}</div></div>`;
const moodWord = (m) => MOOD_WORD.find(([v]) => m >= v)[1][kid() ? 1 : 0];
// 国民の気質（教育で変わる）
const TONE_NAME = { emo: ['感情的・目先のこと', 'すぐ かっと なる'], mid: ['ふつう', 'ふつう'], wise: ['理性的・長い目', 'よく かんがえる'] };
const toneName = (c) => TONE_NAME[toneOf(c)][kid() ? 1 : 0];
function moodHelp() {
  const c = g.majors[g.player];
  modal(`<h2>${moodFace(getMood(c))} ${K('国民の気持ち', 'みんなの きもち')}</h2>
    ${secBubble(K('国民はわかりやすいんです。自分の国を優先すれば喜び、よその国を助ければ、たとえ正しくても文句を言います。気持ちが沈むと政情が不安定になり、明るいと落ち着きます。暮らし（政情・治安・食べもの・水・貧富の差）がよければ、少しずつ機嫌も直ります。', 'くにの みんなは とても わかりやすいの。じぶんの くにを たいせつに すると よろこんで、よその くにを たすけると、いい ことでも ぷんぷん するの。きもちが くらいと くにが ぐらぐら して、あかるいと おちつくよ。くらしが よく なると、すこしずつ きげんも なおるよ。'))}
    ${secBubble(K(`ただし、国民の気質は教育で変わります（いまは「${toneName(c)}」）。教育が低い国の国民は感情的で目先のことで動き、喜ぶのも怒るのも大きくなります。教育が高い国の国民は理性的で長い目で考え、選択への反応は小さく、暮らしの実際で判断します。教育・技術の政策で教育を上げると、国民は落ち着いていきます。`, `でもね、みんなの ようすは べんきょうで かわるの（いまは「${toneName(c)}」）。べんきょうが たりない くにの ひとは、すぐ かっと なって、よろこぶのも おこるのも おおきいの。べんきょうが すすんだ くにの ひとは、よく かんがえて、ながい めで みて くれるよ。`))}
    <div class="row"><button class="btn primary" data-close>${K('とじる', 'とじる')}</button></div>`);
}
function moodRow(c) {
  const m = getMood(c);
  const last = g.lastSec?.text;
  return `<div class="moodrow" data-mood><span class="mface">${moodFace(m)}</span><span>${K('国民の気持ち', 'みんなの きもち')}</span><b>${esc(moodWord(m))}</b>${K(`<small class="muted">${m}</small>`, '')}<span class="tone ${toneOf(c)}">${esc(toneName(c))}</span></div>
    ${last ? `<div class="secnote">👩‍💼 ${esc(last)}</div>` : ''}`;
}

// ───── タイトル ─────
function titleScreen() {
  g = null;
  const saved = store.get(KEY);
  const sk = saved && !saved.result ? saved : null;
  const node = el(`<div class="screen title">
    <div class="map-bg">${plainMapSvg()}</div>
    <h1>${K('世界統一ゲーム', 'せかい とういつ げーむ')}<small>${K('WORLD UNIFICATION GAME — 一人用', 'ひとりで あそぶ せかいの げーむ')}</small></h1>
    <div class="menu">
      <div class="modes"><button class="btn small ${settings.mode === 'adult' ? 'primary' : ''}" data-mode="adult">おとな</button><button class="btn small ${settings.mode === 'kid' ? 'primary' : ''}" data-mode="kid">1ねんせい</button></div>
      <div class="sizerow"><span>${K('世界の国の数', 'せかいの くにの かず')}</span><input type="range" data-size min="${G.WORLD_MIN}" max="${G.WORLD_MAX}" step="1" value="${worldSize()}"><b data-sizev>${worldSize()}</b></div>
      ${sk ? `<button class="btn primary" data-cont>${K('つづきから', 'つづきから')}（${sk.kid ? '1ねんせい' : 'おとな'}・${G.yearLabel(sk)}${K('年', 'ねん')}）</button>` : ''}
      <button class="btn ${sk ? '' : 'primary'}" data-new>${K('新しいゲーム', 'あたらしく はじめる')}</button>
      <div class="seedrow"><input data-seed maxlength="12" placeholder="${K('シード値', 'せかいの ばんごう')}" autocomplete="off"><button class="btn" data-seedgo>${K('この世界で', 'この せかいで')}</button></div>
      <button class="btn" data-how>あそびかた</button>
      <button class="btn" data-set>せってい</button>
    </div>
    ${onGas() ? `<div class="cloudnote">${{ ok: K('☁ セーブ：学校のアカウントに自動で保存', '☁ セーブ：がっこうの あかうんとに じどうで ほぞん'), guest: K('セーブ：この端末だけ（アカウントが確認できません）', 'セーブ：この たんまつだけ'), error: K('セーブ：いまは通信できません（この端末には保存）', 'セーブ：いまは この たんまつだけ') }[cloud.state] || ''}</div>` : ''}
    <div class="note">${K('原作：冲方丁『スプライトシュピーゲルIV テンペスト』の作中ゲームをもとにした個人制作のファン作品です。国名・事件名は架空です。', 'くにの なまえや できごとは、つくりものです。')}</div>
  </div>`);
  mount(node);
  $$('[data-mode]', node).forEach((b) => b.addEventListener('click', () => { settings.mode = b.dataset.mode; saveSettings(); titleScreen(); }));
  const sz = $('[data-size]', node);
  sz.addEventListener('input', () => { $('[data-sizev]', node).textContent = sz.value; });
  sz.addEventListener('change', () => { (settings.size ||= {})[settings.mode] = Number(sz.value); saveSettings(); });
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
  return G.attachWorld(sv);
}

function howTo() {
  if (kid()) {
    modal(`<h2>あそびかた</h2>
    <div class="howto">
    <p>きみは ある くにの だいひょうです。まいかい、した に でる かーどから ひとつ えらびます。</p>
    <p>かーどには「でめが 〇〇 いかなら せいこう」と かいて あります。1から100の だいすを ふって、でめが その かず いかなら せいこう。とても ちいさい かずが でたら だいせいこう です。</p>
    <p>👩‍💼 <b>ひしょの リンさん</b>：くにの みんなの きもちを おしえて くれます。みんなは じぶんの くにが だいすき。よその くにを たすけると ぷんぷん します。</p>
    <p>📰 <b>にゅーす</b>：まいかい はじめに、せかいの にゅーすが かーどで でて きます。さわって めくって よもう。かーどを みぎか ひだりに うごかして、きみの くにの こたえを えらびます。どちらにも いい ことと こまる ことが あります。</p>
    <p>ほかの 5つの くにも、それぞれ かーどを えらびます。ある くにが とくを すると、べつの くにが こまる ことも あります。</p>
    <p>🔥 <b>ひだね</b>：ときどき、ある くにで びょうきや けんかの「ひだね」が おきます。みんなで ただしく たすければ おさまります。まちがえたり ほうって おくと、せかいじゅうに ひろがります。どれが ただしいかは かいて ありません。みったーまいやーの ことばを よく きこう。</p>
    <p>😱 <b>おしまい</b>：かくせんそう／ちきゅうが こわれる／ひとつの くにが せかいを のっとる。</p>
    <p>🎉 <b>くりあ</b>：「せかいの ぎかい」まで すすんで、みんなが さんせいしたら くりあ。20かいで じかん ぎれです。</p>
    </div><div class="row"><button class="btn primary" data-close>とじる</button></div>`);
    return;
  }
  modal(`<h2>あそびかた</h2>
  <div style="font-size:14px;line-height:1.8">
  <p>あなたは架空の国の元首です。1年に1回、パネルに出た政策から1つを選びます。どの政策にも<b>成功確率</b>が表示され、<b>100面ダイス</b>で判定します。出目が確率以下なら成功、確率の1/10以下なら大成功です。</p>
  <p>ほかの5カ国は性格の違うAI元首です。ある国の成功が、別の国の破綻を生むこともあります。毎年、世界にはイベントが起き、GM（${GM_NAME}）が「さて、どうする？」と迫ります。</p>
  <p><b>補佐官と国民の気持ち</b>：補佐官のリンが、自国の国民の気持ちを伝えます。国民は短絡的で自国優先です。よその国を助けると、たとえ正しくても不満が出て、気持ちが沈むと政情が揺らぎます。</p>
  <p><b>ニュースのカード</b>：毎年のはじめ、世界のニュースがカードで1枚ずつ届きます。タップしてめくり、多くのニュースではカードを左右にスワイプして自国の態度を2択で決めます。どちらにも得と損があります。</p>
  <p><b>火種</b>：ときどき、ある一国で感染症・銀行破綻・飢饉・内戦などの「火種」が起きます。右上の欄に場所と種類が出ますが、深刻度と、いつ世界に広がるか（期限）は知らされません。様子は毎年の GM の言葉から推し量ってください。各国が正しい支援をすれば封じ込められ（協調の成功例になります）、まちがった対応や放置だと世界規模に広がります。どの支援が正しいかはカードに書かれていません。GM のヒントと、現実の知識で見抜いてください。</p>
  <p><b>ゲームオーバー</b>：核戦争／地球環境の破綻（環境が${G.ENV_LIMIT}以下）／一国による世界征服。自国が崩壊するとパネルがオフになり、数年後に復帰できることがあります。</p>
  <p><b>クリア</b>：国際機関を「国連 → 国連の解体 → 世界政府準備委員会 → 世界総選挙 → 世界議会」と進め、世界議会の最初の議題を全会一致で可決すること。議題は、それまでに起きたニュースに関係する3つの候補から選びます。協調の成功例を3つ積み重ねれば、国連の解体を経ずに準備委員会へ進めます。50年でタイムアップです。</p>
  </div><div class="row"><button class="btn primary" data-close>とじる</button></div>`);
}

function openSettings() {
  const seg = (k, opts) => `<div style="display:flex;gap:6px">${opts.map(([v, l]) => `<button class="btn small ${settings[k] === v ? 'primary' : ''}" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const m = modal(`<h2>せってい</h2>
    <div>${K('GM の発言の多さ', 'みったーまいやーの おしゃべり')}</div>${seg('gm', [['few', K('少ない', 'すくない')], ['normal', 'ふつう'], ['many', K('多い', 'おおい')]])}
    <div>${K('AI の手番の速さ', 'ほかの くにの はやさ')}</div>${seg('speed', [['slow', 'ゆっくり'], ['normal', 'ふつう'], ['fast', 'はやい']])}
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

// ───── タップで拡大 ─────
// html を大きく表示する。どこかをタップすると とじる（中のボタンは そのまま動く）
function zoomView(html, cls = '') {
  const back = el(`<div class="zoom-back"><div class="zoom-box ${cls}">${html}</div><div class="zoom-hint">${K('タップで閉じる', 'さわると とじる')}</div></div>`);
  stage.append(back);
  back.addEventListener('click', (e) => { if (!e.target.closest('button, [data-id]')) back.remove(); });
  return back;
}
const zbtn = (attr) => `<button class="zbtn" ${attr} aria-label="${K('拡大', 'おおきく')}">🔍</button>`;

// ───── 準備（抽選・基本政策） ─────
function startSetup(seed) {
  g = G.newGame(seed, { kid: settings.mode === 'kid', size: worldSize() });
  setupScreen();
}
function kidBars(c, small = false) {
  const ks = kidStats(c);
  return `<div class="kidstats ${small ? 'small' : ''}">${KID_STATS.map((s) => `<div class="kstat ${ks[s.key] <= KID_DANGER ? 'danger' : ''}"><span>${s.icon} ${s.name}</span><span class="kbar"><i style="width:${ks[s.key]}%"></i></span></div>`).join('')}</div>`;
}
function setupScreen() {
  const me = g.majors[g.player];
  let picked = [];
  const node = el(`<div class="screen setup">
    <div class="head"><h2>${K('世界の抽選', 'せかいの くじびき')}</h2><span class="chip">${K('シード値', 'せかいの ばんごう')} <b>${esc(g.seed)}</b></span></div>
    <div class="body">
      <div class="mapbox">
        <div class="mapwrap">${mapSvg(g, { highlight: g.seats })}</div>
        <div class="seats">${g.seats.map((id) => { const c = g.majors[id]; return `<div class="seat ${c.player ? 'mine' : ''}" style="border-left:4px solid ${seatColor(g, id)}">${flagSvg(c.flag, 24, 16)}<div><b>${esc(c.name)}</b><br><span class="muted">${c.player ? K('あなた', 'きみの くに') : K('AI：', '') + personaName(c.persona)}</span></div></div>`; }).join('')}</div>
      </div>
      <div class="side">
        ${gmBubble(g.feed.find((f) => f.k === 'gm')?.text || '')}
        <div class="pane" style="padding:8px 10px;gap:4px">
          <div class="me" style="padding:0"><div class="name">${flagSvg(me.flag, 30, 20)}${esc(me.name)}</div>${K(`<div class="sub">国力 ${me.power}</div>`, '')}</div>
          ${kid() ? kidBars(me, true) : `<div class="statgrid" style="font-size:12px">${['pop', 'gnp', 'stability', 'literacy', 'oil', 'food', 'water', 'soldiers', 'nuke'].map((k) => `<div class="stat"><span>${STAT_INFO[k].name}</span><b>${statText(me, k)}</b></div>`).join('')}</div>`}
        </div>
        <div class="muted" style="font-size:12px">${K('基本政策を1〜2個選んでください', 'くにの やりかたを 1つか 2つ えらんでね')}</div>
        <div class="bases">${Object.keys(BASE).map((id) => `<button class="base" data-b="${id}"><b>${esc(baseName(id))}</b><small>${esc(kid() ? KID_BASE[id][1] : BASE[id].desc)}</small></button>`).join('')}</div>
      </div>
    </div>
    <div class="foot">
      <button class="btn" data-back>${K('タイトルへ', 'もどる')}</button>
      <button class="btn" data-reroll ${g.rerolled ? 'disabled' : ''}>${K('引き直す（1回だけ）', 'くじを ひきなおす（1かい だけ）')}</button>
      <button class="btn primary" data-start disabled>${K('この国で始める', 'この くにで はじめる')}</button>
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
    g = G.newGame(newSeed(), { rerolled: true, kid: g.kid, size: g.worldSize });
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
  feedFollow = true;
  mount(el(`<div class="screen dash">
    <div class="top"></div>
    <div class="mid">
      <div class="pane"><h3 class="hz">${K('自国', 'きみの くに')}${zbtn('data-zme')}</h3><div class="me"></div></div>
      <div class="center"><div class="mapwrap"></div><div class="pane"><div class="feed"></div><button class="newpill">${K('▼ 新しいできごと', '▼ あたらしい できごと')}</button></div></div>
      <div class="pane"><h3>${K('各国の元首', 'ほかの くに')}</h3><div class="rivals"></div></div>
    </div>
    <div class="bottom"><div class="gmbox"></div><div class="actions"></div></div>
  </div>`));
  renderDash();
}

function renderDash() {
  renderTop(); renderMe(); renderMap(); renderFeed(); renderRivals(); renderBottom();
  const d = $('.dash', stage);
  if (d && !d._zoom) {
    d._zoom = true;
    // ニュースと GM の吹き出しは、タップすると大きく読める
    $('.newpill', d).addEventListener('click', () => renderFeed(true));
    $('.feed', d).addEventListener('scroll', onFeedScroll);
    for (const ev of ['wheel', 'touchstart', 'touchmove', 'pointerdown', 'keydown']) $('.feed', d).addEventListener(ev, () => { feedTouch = performance.now(); }, { passive: true });
    // 上に戻そうとした時点で、新しいできごとに合わせて送るのをやめる（スクロールが終わるのを待たない）
    $('.feed', d).addEventListener('wheel', (e) => { if (e.deltaY < 0) { feedFollow = false; feedUp = performance.now(); } }, { passive: true });
    $('.feed', d).addEventListener('touchmove', () => { feedFollow = false; feedUp = performance.now(); }, { passive: true });
    $('.feed', d).addEventListener('click', (e) => { const it = e.target.closest('.ev, .act, .vote, .sys, .gmline, .ailine'); if (it) zoomView(`<div class="feed">${it.outerHTML}</div>`, 'text'); });
    $('.gmbox', d).addEventListener('click', () => zoomView($('.gmbox', d).innerHTML, 'text'));
    $('[data-zme]', d).addEventListener('click', () => zoomView(`<div class="me">${$('.me', d).innerHTML}</div>`, 'me'));
  }
}

function renderTop() {
  const w = g.world;
  const gauge = (label, val, cls = '') => `<div class="gauge ${cls}"><b>${val}</b><i>${label}</i></div>`;
  const lvl = (v, warn, danger, rev = false) => (rev ? (v <= danger ? 'danger' : v <= warn ? 'warn' : '') : (v >= danger ? 'danger' : v >= warn ? 'warn' : ''));
  const stages = `<div class="stages">${stageNames().map((s, i) => `<span class="${i < w.stage ? 'on' : i === w.stage ? 'now' : ''}">${s}</span>`).join('')}</div>`;
  const tools = `<div class="tools"><button class="btn small" data-chron>${K('年表', 'ねんぴょう')}</button><button class="btn small" data-menu>☰</button></div>`;
  if (kid()) {
    $('.top', stage).innerHTML = `
      <div class="year">${G.yearLabel(g)}ねん<small>${g.year}／${G.maxYears(g)}かいめ</small></div>${stages}
      <div class="gauges">
        ${gauge('🌏 ちきゅう', w.env, lvl(w.env, 35, 20, true))}
        ${gauge('⚔ けんか', Math.round(w.conflicts), lvl(w.conflicts, 90, 130))}
        ${gauge('⚡ ぴりぴり', Math.round(w.tension), lvl(w.tension, 60, 75))}
        ${gauge('🤝 きょうりょく', g.coop.length + '／3')}
      </div>${tools}`;
  } else {
    $('.top', stage).innerHTML = `
      <div class="year">${G.yearLabel(g)}年<small>${g.year}/${G.maxYears(g)}年目</small></div>${stages}
      <div class="gauges">
        ${gauge('地球環境', w.env, lvl(w.env, 35, 20, true))}
        ${gauge('CO₂', Math.round(w.co2), lvl(w.co2, 60, 75))}
        ${gauge('気温', '+' + fmt(w.temp || 0, 1) + '℃')}
        ${gauge('氷', Math.round(w.ice), lvl(w.ice, 60, 40, true))}
        ${gauge('水資源', Math.round(w.waterRes), lvl(w.waterRes, 50, 35, true))}
        ${gauge('生態系', Math.round(w.biodiv ?? 70), lvl(w.biodiv ?? 70, 50, 35, true))}
        ${gauge('紛争', Math.round(w.conflicts), lvl(w.conflicts, 90, 130))}
        ${gauge('緊張', Math.round(w.tension), lvl(w.tension, 60, 75))}
        ${gauge('条約有効', Math.round(w.treaty) + '%')}
        ${gauge('破綻国', w.bankrupt ?? 0)}
        ${gauge('協調', g.coop.length + '/3')}
      </div>${tools}`;
  }
  $('[data-chron]', stage).addEventListener('click', showChron);
  $('[data-menu]', stage).addEventListener('click', showMenu);
}

function renderMe() {
  const c = g.majors[g.player];
  const allies = g.seats.filter((x) => x !== c.id && allied(g, c.id, x));
  if (kid()) {
    $('.me', stage).innerHTML = `
      <div class="name">${flagSvg(c.flag, 30, 20)}<span>${esc(c.name)}</span></div>
      <div class="sub">やりかた：${c.bases.map((b) => esc(baseName(b))).join('、')}</div>
      <div class="sub">てを くんだ くに：${allies.length ? allies.map((x) => esc(nameOf(x))).join('、') : 'まだ ない'}</div>
      ${c.panel ? moodRow(c) : '<div class="offline">きみの くには たおれて しまった。しばらく おやすみ。ほかの くにが たすけて くれると、はやく もどれる。</div>'}
      ${kidBars(c)}`;
    $('[data-mood]', stage)?.addEventListener('click', moodHelp);
    return;
  }
  const groups = {};
  for (const [k, info] of Object.entries(STAT_INFO)) if (k !== 'power') (groups[info.cat] ||= []).push(k);
  $('.me', stage).innerHTML = `
    <div class="name">${flagSvg(c.flag, 30, 20)}<span>${esc(c.name)}</span></div>
    <div class="sub">基本政策：${c.bases.map((b) => BASE[b].name).join('・')}</div>
    <div class="sub">国力 <b style="color:var(--gold)">${c.power}</b>　提携 ${allies.length ? allies.map(nameOf).join('・') : 'なし'}${g.bloc.includes(c.id) ? '　経済圏' : ''}</div>
    <div class="powerbar"><i style="width:${c.power}%"></i></div>
    ${c.panel ? moodRow(c) : ''}
    ${c.panel ? '' : `<div class="offline">パネルがオフです（${G.START_YEAR + c.collapsedYear - 1}年に崩壊）。3年たつと毎年、新政権が立つかを判定します。他国の支援で早まります。</div>`}
    <div class="stats">${STAT_CATS.filter((cat) => groups[cat]).map((cat) => {
      const ks = groups[cat];
      const alerts = ks.filter((k) => isDanger(c, k)).length;
      const open = ui.open[cat] ?? (cat === '経済' || cat === '社会' || alerts > 0);
      return `<details data-cat="${cat}" ${open ? 'open' : ''}><summary><span>${cat}</span>${alerts ? `<span class="alert">⚠${alerts}</span>` : ''}</summary>
        ${ks.map((k) => `<div class="stat ${isDanger(c, k) ? 'danger' : ''}"><span>${STAT_INFO[k].name}</span><b>${statText(c, k)}${STAT_INFO[k].unit && k !== 'nuke' ? `<small class="muted"> ${STAT_INFO[k].unit}</small>` : ''}</b></div>`).join('')}</details>`;
    }).join('')}</div>`;
  $$('details', $('.me', stage)).forEach((d) => d.addEventListener('toggle', () => { ui.open[d.dataset.cat] = d.open; }));
  $('[data-mood]', stage)?.addEventListener('click', moodHelp);
}

function renderMap() {
  const box = $('.mapwrap', stage);
  box.innerHTML = mapSvg(g) + `<div class="legend">${K('<span>● 紛争</span><span>☢ 核保有</span><span>--- 提携</span><span>🔥 火種</span>', '<span>● けんか</span><span>☢ かくへいき</span><span>--- てを くんだ</span><span>🔥 ひだね</span>')}</div><div class="seedtag">SEED ${esc(g.seed)}</div>`;
  $$('[data-id]', box).forEach((p) => p.addEventListener('click', () => countryInfo(p.dataset.id)));
  box.insertAdjacentHTML('beforeend', zbtn('data-zmap'));
  $('[data-zmap]', box).addEventListener('click', () => {
    const z = zoomView(`<div class="mapwrap">${mapSvg(g)}</div><div class="muted">${K('国をタップすると情報が見られます', 'くにを さわると ようすが みられるよ')}</div>`, 'map');
    $$('[data-id]', z).forEach((p) => p.addEventListener('click', () => { z.remove(); countryInfo(p.dataset.id); }));
  });
}

// ニュースで動いた数値（engine/game.js の summarizeChanges）
const BG_JA = { econ: '経済', stability: '政情', water: '水', food: '食糧', debt: '負債' };
const BG_KID = { econ: ['💰'], stability: ['🏠'], water: ['💧'], food: ['🍚'], debt: ['💰', true] };
const KID_ICON = Object.fromEntries(KID_STATS.map((s) => [s.key, s.icon]));
Object.assign(KID_ICON, { earth: '🌏', fight: '⚔', world: '🕊' });
function resHtml(res) {
  if (!res || !res.length) return '';
  const groups = new Map();
  for (const r of res) {
    const who = r.id === 'world' ? K('世界', 'せかい') : r.id === 'bg' ? K(`小国${r.n}カ国`, `ちいさな くに ${r.n}こ`) : r.id === 'majors' ? K('各国', 'みんなの くに') : nameOf(r.id);
    let label, up = r.a > 0;
    if (kid()) {
      let icon, bad = false;
      if (r.id === 'world') { const w = KID_WORLD[r.stat]; if (!w) continue; icon = KID_ICON[w[0]]; bad = !!w[1]; }
      else if (BG_KID[r.stat] && !isSeat(g, r.id) && r.id !== 'majors') { [icon, bad] = BG_KID[r.stat]; }
      else { const k = KID_STAT_OF[r.stat]; if (!k) continue; icon = KID_ICON[k]; bad = KID_BAD.has(r.stat); }
      if (bad) up = !up;
      label = `${icon}${(up ? '↑' : '↓').repeat(Math.abs(r.a))}`;
    } else {
      const name = r.id !== 'world' && r.id !== 'majors' && !isSeat(g, r.id) && BG_JA[r.stat] ? BG_JA[r.stat] : STAT_INFO[r.stat]?.name || STAT_JA[r.stat] || BG_JA[r.stat] || r.stat;
      label = `${name}${(up ? '↑' : '↓').repeat(Math.abs(r.a))}`;
    }
    (groups.get(who) || groups.set(who, []).get(who)).push(label);
  }
  if (!groups.size) return '';
  return `<div class="evres">→ ${[...groups].map(([w, ls]) => `<span>${esc(w)}：${ls.join(' ')}</span>`).join('　')}</div>`;
}

// ニュースのつながり：きっかけになったニュースと、このあと起きやすくなるニュース
function linkHtml(f) {
  const out = [];
  if (f.why) out.push(`<div class="evfrom">📊 ${K('あなたの国の状態で起きやすくなっていた', 'きみの くにの ようすで おきやすく なって いた')}：${esc(f.why)}</div>`);
  if (f.from) out.push(`<div class="evfrom">🔗 ${K('きっかけ', 'きっかけ')}：${f.from.year}${K('年', 'ねん')}の「${esc(f.from.name)}」</div>`);
  const nx = (f.next || []).map(evName).filter(Boolean);
  if (nx.length) out.push(`<div class="evnext">➜ ${K('このあと起きやすくなる', 'このあと おきやすく なる')}：${nx.map((n) => `「${esc(n)}」`).join('')}</div>`);
  return out.join('');
}
// 国の崩壊の波紋（大きな国ほど世界中に）
function shockText(f) {
  const nm = nameOf(f.id);
  const t = f.failed ? K(`${nm}が国として立ち行かなくなった`, `${nm}が くにとして なりたたなく なった`) : K(`${nm}の崩壊の波紋`, `${nm}が たおれた えいきょう`);
  const lv = [null, K('おもに となりの国に影響', 'となりの くにに えいきょう'), K('地域に大きな影響', 'まわりの くにぐにに おおきな えいきょう'), K('世界中に衝撃', 'せかいじゅうが ゆれた')][f.lv];
  return [t, lv];
}
function feedHtml(f) {
  const pri = GM_PRI[settings.gm];
  switch (f.k) {
    case 'gm': return f.pri <= pri ? `<div class="gmline">${esc(f.text)}</div>` : '';
    case 'event': return `<div class="ev"><b>${NEWS_ICON[f.cat] || '📰'} ${esc(f.name)}${f.who ? `（${esc(nameOf(f.who))}）` : ''}</b>${esc(f.text)}${resHtml(f.res)}${sitHtml(f.id)}${reactLine(f)}${linkHtml(f)}</div>`;
    case 'act': return `<div class="act"><span class="who" style="color:${seatColor(g, f.id)}">${esc(nameOf(f.id))}</span><span class="pol">${esc(polName(f.pol))}${f.tgt ? `<span class="muted">→${esc(nameOf(f.tgt))}</span>` : ''}</span><span class="roll">${K(`${f.p}% / 出目${f.roll}`, `${f.p}いか／でめ ${f.roll}`)}</span><span class="tier ${f.tier}">${tierName(f.tier)}</span></div>`;
    case 'ai': return pri >= 3 ? `<div class="ailine">${esc(nameOf(f.id))}「${esc(f.text)}」</div>` : '';
    case 'sys': return `<div class="sys ${f.cls || ''}">${esc(f.text)}</div>`;
    case 'shock': { const [t, lv] = shockText(f); return `<div class="ev shock"><b>💥 ${esc(t)}<span class="lv lv${f.lv}">${esc(lv)}</span></b>${resHtml(f.res)}</div>`; }
    case 'sec': return `<div class="secline">👩‍💼 <b>${esc(secName())}</b>${esc(f.text)}</div>`;
    case 'spark': return `<div class="ev spark"><b>${SPARKS[f.type].icon} ${K('火種', 'ひだね')}：${esc(nameOf(f.where))}${K('で', 'で ')}${esc(sparkName(f.type))}</b>${esc(kid() ? KID_SPARK[f.type][1] : SPARKS[f.type].hint)}</div>`;
    case 'vote': return `<div class="vote"><b>${K('世界議会の投票', 'せかいの ぎかいの きめごと')}：「${esc(f.name)}」</b><br>${f.votes.map((v) => `${esc(nameOf(v.id))} ${v.yes ? `<span class="good">${K('賛成', 'さんせい')}</span>` : `<span class="bad">${K('反対', 'はんたい')}</span>`}`).join('　')}</div>`;
    default: return '';
  }
}
// 下まで見ているときだけ、新しいできごとに合わせて下へ送る。読み返しているときは動かさず「▼ 新しいできごと」を出す
// （高さで判断すると、文字の読みこみで高さが変わったときに「読み返している」とまちがえるので、プレイヤーがスクロールしたかで決める）
let feedFollow = true, feedTouch = 0, feedUp = 0;
function renderFeed(force = false) {
  const box = $('.feed', stage);
  if (force) feedFollow = true;
  const before = box.childElementCount;
  box.innerHTML = g.feed.map(feedHtml).join('');
  const pill = $('.newpill', stage);
  if (feedFollow) { box.scrollTop = box.scrollHeight; pill?.classList.remove('on'); }
  else if (box.childElementCount > before) pill?.classList.add('on');
}
function onFeedScroll(e) {
  const now = performance.now();
  if (now - feedTouch > 1500) return; // プレイヤーが動かしたスクロールだけを見る（ホイール・指・バー）
  const b = e.target;
  const near = b.scrollHeight - b.scrollTop - b.clientHeight < 40;
  // 上へ戻している最中は、まだ下の近くにいても「読み返し中」のまま（スクロールの途中で送り直さない）
  if (near && now - feedUp > 500) { feedFollow = true; $('.newpill', stage)?.classList.remove('on'); }
  else if (!near) feedFollow = false;
}

function renderRivals() {
  const me = g.player;
  const sparks = (g.sparks || []).map((s) => {
    const t = SPARKS[s.type];
    // 深刻度と期限は秘匿。見えるのは場所・種類・経過年数だけで、様子は GM の言葉から推し量る
    return `<div class="sparkcard" data-id="${s.where}"><div class="row"><b>${t.icon} ${esc(nameOf(s.where))}</b><span class="chip">${g.year - s.start + 1}${K('年目', 'かいめ')}</span></div>
      <div class="meta">${esc(sparkName(s.type))}</div><div class="meta">${K('状況は不明。いつ世界に広がるかもわからない', 'ようすは わからない。いつ ひろがるかも わからない')}</div></div>`;
  }).join('');
  const sits = sitList();
  $('.rivals', stage).innerHTML = (sparks ? `<div class="sparks"><h3>🔥 ${K('火種', 'ひだね')}</h3>${sparks}</div>` : '') + (sits ? `<div class="sits"><h3>📰 ${K('情勢', 'いまの ようす')}</h3>${sits}</div>` : '') + g.seats.filter((id) => id !== me).map((id) => {
    const c = g.majors[id];
    const r = rel(g, me, id);
    const last = c.lastAct && c.lastAct.year === g.year ? `${esc(polName(c.lastAct.pol))} <span class="tier ${c.lastAct.tier}">${tierName(c.lastAct.tier)}</span>` : c.lastAct ? `<span class="muted">${K('昨年', 'まえ')}：${esc(polName(c.lastAct.pol))}</span>` : '';
    const status = c.annexedBy ? K(`${nameOf(c.annexedBy)}に併合`, `${nameOf(c.annexedBy)}に とられた`) : c.panel ? '' : K('パネル オフ', 'おやすみ ちゅう');
    return `<div class="rival ${c.panel ? '' : 'off'}" style="--c:${seatColor(g, id)}" data-id="${id}">
      <div class="row">${flagSvg(c.flag, 24, 16)}<b>${esc(c.name)}</b>${K(`<span class="chip">${c.power}</span>`, '')}</div>
      <div class="meta"><span>${esc(personaName(c.persona))}</span>${allied(g, me, id) ? `<span class="good">${K('提携', 'てを くんだ')}</span>` : ''}${c.stats.nuke >= 4 ? '<span>☢</span>' : ''}<span>${K('関係', 'なかよし')}</span><span class="relbar"><i style="width:${r}%;background:${r >= 60 ? 'var(--green)' : r <= 30 ? 'var(--red)' : 'var(--gold)'}"></i></span>${status ? `<span class="bad">${status}</span>` : ''}</div>
      <div class="last">${last}</div>
    </div>`;
  }).join('');
  $$('.rival, .sparkcard', stage).forEach((n) => n.addEventListener('click', () => countryInfo(n.dataset.id)));
}

// 情勢：どの政策が上下するかの説明
function sitTarget(s) {
  const cats = (s.cats || []).map((c) => (kid() ? KID_CATS[c] : CATS[c]));
  const pols = (s.pols || []).slice(0, 2).map((p) => polName(p)) ;
  const more = (s.pols || []).length > 2 ? K('など', 'など') : '';
  return [...cats.map((c) => K(`${c}の政策`, `${c}の かーど`)), pols.length ? `「${pols.join('」「')}」${more}` : ''].filter(Boolean).join(K('・', '、'));
}
function sitScope(s) {
  if (s.scope === 'who') return K(`${nameOf(s.who)}だけ`, `${nameOf(s.who)}だけ`);
  if (s.scope === 'others') return K(`${nameOf(s.who)}以外`, `${nameOf(s.who)}いがい`);
  return '';
}
function sitLeft(s) {
  const left = s.until - (g.cal ?? g.year - 1);
  return kid() ? `あと ${Math.max(1, Math.ceil(left / 2.5))}かい` : `あと${left}年`;
}
// 「経済の政策の成功率 −10（〇〇だけ）」／「おかねの かーどが せいこう しにくく なる（−10）」
function sitLine(s) {
  const n = `<b class="${s.mod > 0 ? 'good' : 'bad'}">${s.mod > 0 ? '+' : ''}${s.mod}</b>`;
  const sc = sitScope(s) ? `（${esc(sitScope(s))}）` : '';
  return kid()
    ? `${esc(sitTarget(s))}が せいこう ${s.mod > 0 ? 'しやすく' : 'しにくく'} なる（${n}）${sc}`
    : `${esc(sitTarget(s))}の成功率 ${n}${sc}`;
}
function sitHtml(evId) {
  const list = activeSituations(g).filter((s) => s.ev === evId);
  if (!list.length) return '';
  return `<div class="evsit">${list.map((s) => `📰 ${sitLine(s)}　${sitLeft(s)}`).join('<br>')}</div>`;
}
function sitList() {
  return activeSituations(g).map((s) => `<div class="sitcard"><div class="row"><b>${esc(kid() ? s.kname : s.name)}</b><span class="chip">${sitLeft(s)}</span></div>
    <div class="meta">${sitLine(s)}</div></div>`).join('');
}

function lastGmLine() {
  const pri = GM_PRI[settings.gm];
  for (let i = g.feed.length - 1; i >= 0; i--) {
    const f = g.feed[i];
    if (f.k === 'gm' && f.pri <= pri) return f.text;
    if (f.k === 'event') return f.text;
  }
  return K('さて、どうする？', 'さて、どうする？');
}

function renderBottom() {
  $('.gmbox', stage).innerHTML = gmBubble(lastGmLine());
  const box = $('.actions', stage);
  if (g.phase === 'player') return renderChoices(box);
  if (g.phase === 'yearEnd') return renderYearEnd(box);
  const me = g.majors[g.player];
  const head = me.panel ? K('各国が政策を選んでいます……', 'ほかの くにが かんがえて いるよ……') : K('あなたの国のパネルはオフです。世界の動きを見守っています……', 'きみの くには おやすみ ちゅう。せかいを みまもろう……');
  const acts = g.yearActs || [];
  box.innerHTML = `<div class="turnlog"><div class="tlhead">${head}</div><div class="tlrows">${acts.map((r, i) => actRow(r, i === acts.length - 1)).join('') || `<div class="muted">${K('（まだ動きはありません）', '（まだ なにも ない）')}</div>`}</div></div>`;
}
// 今年の各国の動き（1行）
function actRow(r, isNew = false) {
  return `<div class="tlrow ${isNew ? 'new' : ''} ${r.id === g.player ? 'mine' : ''}"><span class="who" style="color:${seatColor(g, r.id)}">${esc(nameOf(r.id).replace(/の くに$|の しま$/, ''))}</span><span class="pol">${esc(polName(r.pol))}${r.tgt ? `<span class="muted"> → ${esc(nameOf(r.tgt).replace(/の くに$|の しま$/, ''))}</span>` : ''}</span><span class="tier ${r.tier}">${tierName(r.tier)}</span></div>`;
}
// 今年のふりかえり（ニュースと、きみの こたえ）
function newsRow(f) {
  const o = f.choice ? OPTION_BY_ID[f.choice] : f.react && f.chosen != null ? poolOf(f.react)?.[f.chosen] : null;
  return `<div class="tlrow news"><span class="who">${NEWS_ICON[f.cat] || '📰'}</span><span class="pol">${esc(f.name)}${f.who ? `<span class="muted">（${esc(nameOf(f.who).replace(/の くに$|の しま$/, ''))}）</span>` : ''}${f.from ? `<span class="muted"> ← 「${esc(f.from.name)}」</span>` : ''}${o ? `<span class="mychoice">✋ ${esc(reactName(o))}</span>` : ''}</span></div>`;
}

function renderChoices(box) {
  const c = g.majors[g.player];
  const list = g.offers.list;
  box.innerHTML = list.map((o) => {
    const pol = POLICIES[o.id];
    const sparkTgt = (g.sparks || []).map((s) => s.where).find((w) => o.tgts.includes(w));
    const tg = o.tgts[0] == null ? null : (ui.tgt[o.id] && o.tgts.includes(ui.tgt[o.id]) ? ui.tgt[o.id] : sparkTgt || o.tgts[0]);
    ui.tgt[o.id] = tg;
    const pr = probability(g, c, pol, tg);
    const okFx = (kid() ? kidFx(pol.ok) : describeFx(pol.ok)).slice(0, kid() ? 3 : 5).join('　');
    const ngFx = (kid() ? kidFx(pol.ng) : describeFx(pol.ng)).slice(0, kid() ? 2 : 3).join('　');
    const isSpark = (g.sparks || []).some((s) => SPARKS[s.type].fx[o.id] != null);
    const tag = isSpark ? `<span class="ins">🔥 ${K('火種', 'ひだね')}</span>` : g.inserts.includes(o.id) ? `<span class="ins">📰 ${K('情勢', 'にゅーす')}</span>` : '';
    const sitSum = pr.parts.filter((x) => x[3] === 'sit').reduce((a, x) => a + x[1], 0);
    const sitTag = sitSum ? `<div class="cardsit ${sitSum > 0 ? 'good' : 'bad'}">📰 ${K('情勢', 'いまの ようす')} ${sitSum > 0 ? '+' : ''}${sitSum}</div>` : '';
    const prob = kid()
      ? `<div class="prob kidprob"><small>でめが</small><b>${pr.p}</b><small>いかなら<br>せいこう</small></div>`
      : `<div class="prob"><b>${pr.p}%</b><small>大成功 ${pr.crit}%<br>大失敗 ${pr.fumble}%</small></div>`;
    return `<div class="card ${ui.sel === o.id ? 'sel' : ''}" style="--cc:var(--${pol.cat})" data-pol="${o.id}">
      <div class="cat"><span>${kid() ? KID_CATS[pol.cat] : CATS[pol.cat]}</span><span>${tag}${zbtn('data-zcard')}</span></div>
      <h4>${esc(polName(o.id))}</h4>
      ${prob}${sitTag}
      <div class="fx">${K('成功', 'せいこう')}：${okFx || '—'}</div>
      ${ngFx ? `<div class="fx ng">${K('失敗', 'しっぱい')}：${ngFx}</div>` : ''}
      ${tg ? `<div class="tg">${[...new Set([tg, ...o.tgts])].slice(0, 6).map((t) => `<button data-t="${t}" class="${t === tg ? 'on' : ''}">${esc(nameOf(t).replace(/の くに$|の しま$/, '').slice(0, 7))}</button>`).join('')}</div>` : '<div class="tg"></div>'}
      <button class="btn small ${ui.sel === o.id ? 'primary' : ''} go" data-go>${ui.sel === o.id ? K('ダイスを振る', 'だいすを ふる') : K('これにする', 'これに する')}</button>
    </div>`;
  }).join('');
  $$('.card', box).forEach((card) => {
    const id = card.dataset.pol;
    $$('[data-t]', card).forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); ui.tgt[id] = b.dataset.t; ui.sel = id; renderChoices(box); }));
    card.querySelector('.prob').addEventListener('click', (e) => { e.stopPropagation(); probDetail(id); });
    $('[data-zcard]', card).addEventListener('click', (e) => {
      e.stopPropagation();
      const clone = card.cloneNode(true);
      $$('.tg, .go, .zbtn', clone).forEach((n) => n.remove());
      const z = zoomView(`${clone.outerHTML}<div class="row"><button class="btn primary" data-pick>${K('これにする', 'これに する')}</button></div>`, 'card');
      $('[data-pick]', z).addEventListener('click', () => { z.remove(); ui.sel = id; renderChoices(box); });
    });
    $('[data-go]', card).addEventListener('click', (e) => { e.stopPropagation(); if (ui.sel === id) choose(id); else { ui.sel = id; renderChoices(box); } });
    card.addEventListener('click', () => { if (ui.sel !== id) { ui.sel = id; renderChoices(box); } });
  });
}

function probDetail(polId) {
  const c = g.majors[g.player];
  const pol = POLICIES[polId];
  const pr = probability(g, c, pol, ui.tgt[polId]);
  const parts = `<div class="chron">${pr.parts.map(([l, v]) => `<div><span>${v > 0 && l !== '基本' ? '+' : ''}${v}</span><span>${esc(kid() ? (pr.parts.find((x) => x[0] === l)?.[2] || KID_MOD[l] || l) : l)}</span></div>`).join('')}</div>`;
  if (kid()) {
    modal(`<h2>${esc(polName(polId))}：でめ ${pr.p} いかで せいこう</h2>${parts}
      <div class="muted">でめが ${pr.crit} いかなら だいせいこう。96 いじょうで しっぱいすると だいしっぱい。</div>
      <div>せいこう：${kidFx(pol.ok).join('　')}<br><span class="bad">しっぱい：${kidFx(pol.ng).join('　') || 'なし'}</span></div>
      <div class="row"><button class="btn primary" data-close>とじる</button></div>`);
    return;
  }
  modal(`<h2>${esc(pol.name)}：成功確率 ${pr.p}%</h2>${parts}
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
  if (kid()) {
    // じぶんの くにの 8つの すうじが どう かわったか
    const acc = {};
    for (const ch of rec.changes) {
      if (ch.id !== rec.id) continue;
      const k = KID_STAT_OF[ch.stat];
      if (!k || k === 'earth') continue;
      const bad = ['inequality', 'ethnic', 'guerrilla', 'debt'].includes(ch.stat);
      acc[k] = (acc[k] || 0) + ((ch.d > 0) !== bad ? 1 : -1);
    }
    const s = KID_STATS.filter((x) => acc[x.key]).map((x) => `${x.icon} ${x.name} ${acc[x.key] > 0 ? 'あがった' : 'さがった'}`);
    return s.length ? 'きみの くに：' + s.join('　') : '';
  }
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
    <div class="need">${esc(polName(rec.pol))}　${K(`成功 ${rec.p}% 以下`, `でめが ${rec.p} いかなら せいこう`)}</div>
    <div class="dice spin">${diceSvg()}<div class="num">--</div></div>
    <div class="res"></div><div class="changes"></div>
    <button class="btn primary" data-ok style="visibility:hidden">${K('つづける', 'つぎへ')}</button>
  </div></div>`);
  stage.append(back);
  const num = $('.num', back);
  const t0 = performance.now();
  while (performance.now() - t0 < 900) { num.textContent = 1 + Math.floor(Math.random() * 100); await wait(55); }
  $('.dice', back).classList.remove('spin');
  num.textContent = rec.roll;
  const res = $('.res', back);
  res.textContent = tierName(rec.tier); res.className = 'res ' + rec.tier;
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
  const sum = kid()
    ? `<b style="color:var(--text);font-size:17px">${g.year}かいめが おわった（${G.yearLabel(g)}ねん）</b><br>🌏 ちきゅうの げんき ${h.env}（${sign(diff('env'))}）　⚔ せかいの けんか ${h.conflicts}（${sign(diff('conflicts'), true)}）`
    : `<b style="color:var(--text);font-size:15px">${G.yearLabel(g)}年が終わった</b><br>自国の国力 ${me.power}（${sign(diff('power'))}）　GNP成長率 ${fmt(me.growth || 0, 1)}%　地球環境 ${h.env}（${sign(diff('env'))}）　紛争 ${h.conflicts}カ所（${sign(diff('conflicts'), true)}）`;
  // ふりかえり：今年のニュース（きみの こたえ・きっかけ）と、各国の動き。ここで落ち着いて読み返せる
  const news = g.feed.filter((f) => f.k === 'event');
  const shocks = g.feed.filter((f) => f.k === 'shock').map((f) => { const [t, lv] = shockText(f); return `<div class="tlrow news"><span class="who">💥</span><span class="pol">${esc(t)}<span class="mychoice bad">${esc(lv)}</span></span></div>`; }).join('');
  const review = `<div class="review"><div class="rvcol"><h5>📰 ${K('今年のニュース', 'ことしの ニュース')}</h5>${news.map(newsRow).join('')}${shocks}${news.length || shocks ? '' : '<div class="muted">—</div>'}</div>
    <div class="rvcol"><h5>🗳 ${K('各国の動き', 'みんなの くにの うごき')}</h5>${(g.yearActs || []).map((r) => actRow(r)).join('') || '<div class="muted">—</div>'}</div></div>`;
  box.innerHTML = `<div class="yearend"><div class="sum">${sum}<div class="row"><button class="btn primary" data-next>${K('次の年へ ▶', 'つぎへ ▶')}</button></div></div>${review}</div>`;
  // 自国が崩壊中は自動で進むので、ボタンは出さない（二重に年が進まないように）
  if (!me.panel) { box.innerHTML = `<div class="waiting">${K('世界の動きを見守っています……', 'せかいを みまもろう……')}</div>`; return; }
  $('[data-next]', box).addEventListener('click', () => { if (g.phase !== 'yearEnd') return; feedFollow = true; G.beginYear(g); persist(); renderDash(); run(); });
}

// ───── ニュースのカード（Reigns のように めくって、左右に ふって 自国の態度を決める） ─────
const reactName = (o) => (kid() ? o.k : o.n);
// 対象国がない・小国のときは、対象国への効果を出さない
function reactFx(f, o) {
  return o.fx.filter((x) => (!x.startsWith('who.') || f.who) && (!x.startsWith('rel.') || (f.who && isSeat(g, f.who) && f.who !== g.player)));
}
function reactFxText(f, o) {
  const who = f.who ? nameOf(f.who).replace(/の くに$|の しま$/, '') : '';
  const list = kid() ? kidFx(reactFx(f, o)) : describeFx(reactFx(f, o));
  return list.map((t) => (kid() ? t.replace(/^あいて/, who || 'あいて') : t.replace(/^対象 /, `${who} `).replace(/^相手との/, `${who}との`))).join('　');
}
function reactLine(f) {
  if (f.chosen == null) return '';
  const o = OPTION_BY_ID[f.choice] || poolOf(f.react)?.[f.chosen];
  if (!o) return '';
  return `<div class="evreact">✋ ${K('自国の反応', 'きみの こたえ')}：<b>${esc(reactName(o))}</b>${resHtml(f.rres)}</div>`;
}
const unseenNews = () => g.feed.map((f, i) => [f, i]).filter(([f]) => f.k === 'event' && !f.seen);

function newsDeck() {
  return new Promise((resolve) => {
    const list = unseenNews();
    if (!list.length) return resolve();
    const back = el(`<div class="news-back"><div class="news-last"></div><div class="news-deck"></div><div class="news-ctl"></div></div>`);
    stage.append(back);
    const deck = $('.news-deck', back), ctl = $('.news-ctl', back), last = $('.news-last', back);
    let n = 0, card = null, flipped = false, done = false;
    const onKey = (e) => {
      if (!card || done) return;
      if (!flipped && (e.key === 'Enter' || e.key === ' ')) { flip(); e.preventDefault(); return; }
      if (!flipped) return;
      const f = list[n][0];
      if (e.key === 'ArrowLeft') pick(f.react ? 0 : -1);
      else if (e.key === 'ArrowRight' || (!f.react && e.key === 'Enter')) pick(f.react ? 1 : -1);
      else if (e.key === 'ArrowUp' && f.react && G.newsOpts(f)[2]) pick(2);
      else if (e.key === 'ArrowDown' && f.react && G.newsOpts(f)[3]) pick(3);
    };
    addEventListener('keydown', onKey);
    const finish = () => { removeEventListener('keydown', onKey); back.remove(); persist(); renderDash(); resolve(); };
    function show() {
      if (n >= list.length) { finish(); return; }
      const [f] = list[n];
      flipped = false; done = false;
      const total = list.length;
      const head = `${NEWS_ICON[f.cat] || '📰'} ${esc(NEWS_CAT[f.cat]?.[kid() ? 1 : 0] || K('ニュース', 'ニュース'))}`;
      card = el(`<div class="ncard" >
        <div class="ninner">
          <div class="nface nback"><div class="nlogo">📰</div><b>${K('ワールド ニュース', 'せかいの ニュース')}</b><span>${G.yearLabel(g)}${K('年', 'ねん')}　${n + 1} / ${total}</span><small>${K('タップしてめくる', 'さわって めくろう')}</small></div>
          <div class="nface nfront">
            <div class="ncat"><span>${head}</span><span>${n + 1} / ${total}</span></div>
            <h3>${esc(f.name)}${f.who ? `<small>${esc(nameOf(f.who))}</small>` : ''}</h3>
            ${f.why ? `<div class="nwhy">📊 ${K('あなたの国の状態で起きやすくなっていた', 'きみの くにの ようすで おきやすく なって いた')}：${esc(f.why)}</div>` : ''}
            ${f.from ? `<div class="nfrom">🔗 ${K('きっかけ', 'きっかけ')}：${f.from.year}${K('年', 'ねん')}の「${esc(f.from.name)}」</div>` : ''}
            <p class="ntext">${esc(f.text)}</p>
            <div class="nby">— ${esc(K(GM_NAME, KID_GM_NAME))}</div>
            ${resHtml(f.res)}${sitHtml(f.id)}
            ${(f.next || []).length ? `<div class="nnext">➜ ${K('このあと起きやすくなる', 'このあと おきやすく なる')}：${f.next.map(evName).filter(Boolean).map((n) => `「${esc(n)}」`).join('')}</div>` : ''}
            <div class="nlabel l"></div><div class="nlabel r"></div><div class="nlabel u"></div><div class="nlabel d"></div>
          </div>
        </div></div>`);
      deck.innerHTML = '';
      deck.append(card);
      ctl.innerHTML = '';
      drag();
      card.addEventListener('click', () => { if (!flipped) flip(); });
    }
    function flip() {
      if (flipped) return;
      flipped = true;
      card.classList.add('flipped');
      const [f] = list[n];
      if (f.react) {
        const [a, b, c, d] = G.newsOpts(f).map((id) => OPTION_BY_ID[id]);
        const btn = (o, side, cls, label) => `<button class="nopt ${cls}" data-side="${side}"><b>${label}</b><small>${reactFxText(f, o)}</small></button>`;
        const mid = c ? `<div class="nmid">${btn(c, 2, 'u', `▲ ${esc(reactName(c))}`)}${d ? btn(d, 3, 'dn', `▼ ${esc(reactName(d))}`) : ''}</div>` : '';
        const hint = d ? K('カードを左・右・上・下にスワイプしても選べます（上と下は、いまの状況だから出た選択肢）', 'カードを ひだり・みぎ・うえ・したに うごかしても えらべるよ（うえと したは とくべつな こたえ）')
          : c ? K('カードを左・右・上にスワイプしても選べます（上は、いまの状況だから出た選択肢）', 'カードを ひだり・みぎ・うえに うごかしても えらべるよ（うえは とくべつな こたえ）')
          : K('カードを左右にスワイプしても選べます', 'カードを みぎか ひだりに うごかしても えらべるよ');
        ctl.innerHTML = `<div class="nq">${K('あなたの国は、どうする？', 'きみの くには、どうする？')}</div>
          <div class="nopts ${c ? 'three' : ''}">${btn(a, 0, 'l', `◀ ${esc(reactName(a))}`)}${mid}${btn(b, 1, 'r', `${esc(reactName(b))} ▶`)}</div>
          <div class="nhint">${hint}</div>`;
        $('.nlabel.l', card).textContent = reactName(a);
        $('.nlabel.r', card).textContent = reactName(b);
        $('.nlabel.u', card).textContent = c ? reactName(c) : '';
        $('.nlabel.d', card).textContent = d ? reactName(d) : '';
      } else {
        ctl.innerHTML = `<div class="nopts one"><button class="nopt next" data-side="-1"><b>${n + 1 < list.length ? K('次のニュース ▶', 'つぎの ニュース ▶') : K('とじる ▶', 'とじる ▶')}</b></button></div>`;
      }
      $$('[data-side]', ctl).forEach((b) => b.addEventListener('click', () => pick(Number(b.dataset.side))));
    }
    function pick(side) {
      if (done || !flipped) return;
      done = true;
      const [f, i] = list[n];
      f.seen = true;
      if (side >= 0 && f.react) {
        G.reactNews(g, i, side);
        last.innerHTML = reactLine(f) + (f.sec ? secBubble(f.sec) : '');
      }
      card.classList.add(side === 0 ? 'out-l' : side === 2 ? 'out-u' : side === 3 ? 'out-d' : 'out-r');
      ctl.innerHTML = '';
      renderMe(); renderTop(); renderRivals(); renderFeed();
      setTimeout(() => { n++; show(); }, 380);
    }
    // ドラッグ（スワイプ）：めくる前はめくるだけ、めくった後は左右（3つめがあれば上も）に出しきると選ぶ
    function drag() {
      let x0 = null, y0 = 0, dx = 0, dy = 0, moved = false;
      const scale = () => stage.getBoundingClientRect().width / stage.offsetWidth || 1;
      const hasUp = () => { const f = list[n][0]; return !!(f.react && G.newsOpts(f)[2]); };
      const hasDown = () => { const f = list[n][0]; return !!(f.react && G.newsOpts(f)[3]); };
      // 上（下）にふった：縦の動きが横より大きく、3つめ（4つめ）があるとき
      const isUp = () => hasUp() && dy < 0 && -dy > Math.abs(dx);
      const isDown = () => hasDown() && dy > 0 && dy > Math.abs(dx);
      const isVert = () => isUp() || isDown();
      card.addEventListener('pointerdown', (e) => { x0 = e.clientX; y0 = e.clientY; dx = 0; dy = 0; moved = false; card.setPointerCapture?.(e.pointerId); });
      card.addEventListener('pointermove', (e) => {
        if (x0 == null || !flipped || done) return;
        dx = (e.clientX - x0) / scale();
        dy = (e.clientY - y0) / scale();
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true;
        const f = list[n][0];
        if (isVert()) card.style.transform = `translateY(${dy}px)`;
        else card.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
        card.classList.toggle('lean-u', isUp() && dy < -50);
        card.classList.toggle('lean-d', isDown() && dy > 50);
        card.classList.toggle('lean-l', !isVert() && dx < -50 && !!f.react);
        card.classList.toggle('lean-r', !isVert() && dx > 50 && !!f.react);
      });
      const up = () => {
        if (x0 == null) return;
        x0 = null;
        if (!flipped || done) return;
        const f = list[n][0];
        if (isUp() && dy < -100) { card.style.transform = ''; pick(2); return; }
        if (isDown() && dy > 100) { card.style.transform = ''; pick(3); return; }
        if (!isVert() && Math.abs(dx) > 110) { card.style.transform = ''; pick(f.react ? (dx < 0 ? 0 : 1) : -1); return; }
        card.style.transform = '';
        card.classList.remove('lean-l', 'lean-r', 'lean-u', 'lean-d');
        if (moved) card.addEventListener('click', (e) => e.stopPropagation(), { once: true, capture: true });
      };
      card.addEventListener('pointerup', up);
      card.addEventListener('pointercancel', up);
    }
    show();
  });
}

// ───── 進行ループ ─────
let running = false;
async function run() {
  if (running) return;
  running = true;
  try {
    while (true) {
      if (g.result) { persist(); await wait(600); endingScreen(); return; }
      // 年のはじめのニュースは、カードで1枚ずつ読んでから（自国が おやすみ中は読まずに進む）
      if (unseenNews().length) {
        if (g.majors[g.player].panel) { renderDash(); await newsDeck(); } else for (const [f] of unseenNews()) f.seen = true;
        continue;
      }
      if (g.pending) { renderDash(); await handlePending(); persist(); continue; }
      if (g.phase === 'yearEnd') {
        renderDash(); persist();
        // 自国が崩壊中なら自動で次の年へ（つづきから再開したときも）
        if (!g.majors[g.player].panel) { await wait(SPEED[settings.speed] * 2); if (g.phase === 'yearEnd') G.beginYear(g); continue; }
        return;
      }
      if (g.phase === 'player') { renderDash(); persist(); return; }
      const r = G.step(g);
      if (r.type === 'ai') {
        renderFeed(); renderRivals(); renderMap(); renderTop(); renderMe(); renderBottom();
        await wait(SPEED[settings.speed]);
      } else if (r.type === 'yearEnd') {
        renderDash();
        // 自国が崩壊中は自動で進める（早送り）
        if (!g.majors[g.player].panel && !g.result) { await wait(SPEED[settings.speed] * 2); if (g.phase === 'yearEnd') G.beginYear(g); continue; }
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
      const m = modal(`<h2>☢ ${K('核のボタン', 'かくへいきの ぼたん')}</h2>
        ${gmBubble(K(`${nameOf(p.foe)}との緊張が限界を超えた。国民は「撃て」と叫んでいる。核を使えば、そこでゲームオーバーだ。……さて、どうする？`, `${nameOf(p.foe)}と ものすごく ぴりぴり して いる。みんなが「うて」と さけんで いる。かくへいきを つかったら、そこで おしまいだ。……さて、どうする？`))}
        <div class="row"><button class="btn danger" data-fire>${K('核を使う', 'つかう')}</button><button class="btn primary" data-hold>${K('撃たない', 'つかわない')}</button></div>`, 'nuke');
      $('[data-fire]', m).addEventListener('click', () => { m.remove(); G.resolvePending(g, 'fire'); resolve(); });
      $('[data-hold]', m).addEventListener('click', () => { m.remove(); G.resolvePending(g, 'hold'); resolve(); });
    } else if (p.type === 'vote') {
      voteFlow(p).then((choice) => { G.resolvePending(g, choice); renderFeed(); resolve(); });
    } else if (p.type === 'rename') {
      const c = g.majors[p.id];
      const m = modal(`<h2>${K('国号を改める', 'くにの なまえを かえる')}</h2>
        ${gmBubble(K(`${c.name}の新しい国名を選びたまえ。`, `${c.name}の あたらしい なまえを えらびなさい。`))}
        <div class="opts">${p.options.map((n) => `<button class="opt" data-n="${esc(n)}">${esc(n)}</button>`).join('')}<button class="opt" data-n="">${K('いまの国名のままにする', 'いまの なまえの まま')}</button></div>`);
      $$('[data-n]', m).forEach((b) => b.addEventListener('click', () => { m.remove(); G.resolvePending(g, b.dataset.n || null); resolve(); }));
    } else { G.resolvePending(g, null); resolve(); }
  });
}

// 世界議会：3つの候補から議題を選ぶ → 自国の賛成・反対を決める
const evName = (id) => (kid() ? KID_EVENT[id]?.[0] : EVENT_BY_ID[id]?.name) || '';
function agendaInfo(a) {
  const ag = AGENDAS[a];
  const me = g.majors[g.player];
  const others = g.seats.filter((id) => id !== g.player && g.majors[id].panel);
  const est = others.map((id) => ({ id, p: voteChance(g, g.majors[id], a) }));
  const losers = g.seats.filter((id) => g.majors[id].panel && ag.lose(g.majors[id]));
  const mine = ag.lose(me) ? 'lose' : ag.gain(me) ? 'gain' : 'even';
  return { ag, est, likely: est.filter((x) => x.p >= 50).length, n: others.length, losers, mine };
}
const MINE_TXT = { lose: ['損をする（国力↓）', 'そんを する'], gain: ['得をする（国力↑）', 'とくを する'], even: ['ほとんど変わらない', 'あまり かわらない'] };
function voteFlow(p) {
  return new Promise((done) => {
    const pickStep = () => {
      const cards = p.options.map((a) => {
        const x = agendaInfo(a);
        const why = (p.why?.[a] || []).map(evName).filter(Boolean);
        return `<button class="agenda" data-a="${a}">
          <b>${esc(agendaName(a))}</b>
          ${why.length ? `<div class="from">📰 ${K('きっかけ', 'きっかけ')}：${why.map((w) => `「${esc(w)}」`).join('')}</div>` : ''}
          <div class="lose">${K('損をする国', 'そんを する くに')}：${esc(x.ag.who[kid() ? 1 : 0])}${x.losers.length ? `（${x.losers.map((id) => esc(nameOf(id).replace(/の くに$|の しま$/, ''))).join(K('・', '、'))}）` : K('（いまは なし）', '（いまは ない）')}</div>
          <div class="mine ${x.mine}">${K('あなたの国', 'きみの くに')}：${MINE_TXT[x.mine][kid() ? 1 : 0]}</div>
          <div class="est">${K('賛成しそうな国', 'さんせい しそうな くに')}：${x.likely} / ${x.n}</div>
        </button>`;
      }).join('');
      const m = modal(`<h2>${K('世界議会：最初の議題を選ぶ', 'せかいの ぎかい：はじめの ぎだいを えらぶ')}</h2>
        ${gmBubble(K('こぎ着けたな。これまでに世界で起きたことから、議題の候補が3つ挙がっている。どれを議会に出す？ 全会一致で可決されれば、世界は統一的に運営される。', 'ここまで きたな。これまで せかいで おきた ことから、ぎだいの こうほが 3つ ある。どれを だす？ ぜんいんが さんせい したら、せかいは ひとつに なる。'))}
        <div class="agendas">${cards}</div>`, 'vote');
      $$('[data-a]', m).forEach((b) => b.addEventListener('click', () => { m.remove(); voteStep(b.dataset.a); }));
    };
    const voteStep = (a) => {
      const x = agendaInfo(a);
      const secTxt = {
        lose: K('国民は反対しています。「自分たちが損をする約束なんて、とんでもない」と。', 'みんな はんたい して います。「わたしたちが そんを するのは いやだ」って。'),
        gain: K('国民は賛成です。「うちが得をするなら大歓迎だ」と。', 'みんな さんせい です。「とくを するなら いいね」って。'),
        even: K('国民の関心は薄いようです。「うちに関係あるの？」と。', 'みんな あまり きょうみが ない みたい です。'),
      }[x.mine];
      const m = modal(`<h2>${K('投票', 'とうひょう')}：「${esc(agendaName(a))}」</h2>
        ${gmBubble(K('議題は出た。あとは各国の票だ。一国でも反対すれば否決になる。あなたの国は、賛成か、反対か。', 'ぎだいが でた。あとは みんなの とうひょうだ。ひとつでも はんたいが あれば だめに なる。きみの くには、さんせい？ はんたい？'))}
        ${secBubble(secTxt)}
        <div class="voteest">${x.est.map((e) => `<span>${esc(nameOf(e.id).replace(/の くに$|の しま$/, ''))} <b class="${e.p >= 60 ? 'good' : e.p < 45 ? 'bad' : ''}">${kid() ? (e.p >= 60 ? 'さんせい しそう' : e.p < 45 ? 'はんたい しそう' : 'わからない') : `賛成 ${e.p}%`}</b></span>`).join('')}</div>
        <div class="row"><button class="btn" data-back>${K('← 議題を選び直す', '← えらびなおす')}</button><button class="btn danger" data-no>${K('反対する', 'はんたい')}</button><button class="btn primary" data-yes>${K('賛成する', 'さんせい')}</button></div>`, 'vote');
      $('[data-back]', m).addEventListener('click', () => { m.remove(); pickStep(); });
      $('[data-yes]', m).addEventListener('click', () => { m.remove(); done({ agenda: a, yes: true }); });
      $('[data-no]', m).addEventListener('click', () => { m.remove(); done({ agenda: a, yes: false }); });
    };
    pickStep();
  });
}

// ───── 情報 ─────
// 仲のよさで、見える情報の くわしさが かわる（提携か関係70以上：くわしい／40以上：おおまか／それ未満：表向きのことだけ）
function intel(id) {
  if (id === g.player) return 'full';
  const r = rel(g, g.player, id);
  if (allied(g, g.player, id) || r >= 70) return 'full';
  return r >= 40 ? 'some' : 'little';
}
const INTEL_TEXT = {
  full: ['くわしく分かる（提携・関係が良い）', 'なかよしなので、くわしく わかる'],
  some: ['おおまかにしか分からない（関係がふつう）。関係が70以上か提携すると、くわしく分かる', 'すこし だけ わかる。もっと なかよく なると、くわしく わかるよ'],
  little: ['表向きのことしか分からない（関係が悪い）。関係が40以上でおおまかに分かる', 'ほとんど わからない。なかよく なると、わかるように なるよ'],
};
// おとな：見える値（some はおおまか、little は表向きの数字だけ）
const PUBLIC = new Set(['pop', 'gnp', 'soldiers']);
function intelText(c, k, lv) {
  if (lv === 'full') return statText(c, k);
  const v = c.stats[k];
  if (k === 'nuke') return v >= 4 ? NUKE_STAGES[4] : '不明';
  if (k === 'gnp') return '約' + fmt(v, v < 10 ? 1 : 0);
  if (k === 'pop') return '約' + fmt(Math.round(v / (v >= 100 ? 50 : 5)) * (v >= 100 ? 50 : 5), 0);
  if (k === 'soldiers') return '約' + fmt(Math.max(5, Math.round(v / 10) * 10), 0);
  if (lv === 'little') return '？';
  if (['fiscal', 'debt', 'capital', 'patents', 'guerrilla', 'rate', 'bases', 'uranium'].includes(k)) return '？';
  if (k === 'literacy') return '約' + Math.round(v / 10) * 10 + '%';
  const x = k === 'food' ? v / 2 : v;
  return x >= 67 ? '高い' : x >= 34 ? 'ふつう' : '低い';
}
// 1ねんせい：バーの くわしさ
function kidIntelBars(c, lv) {
  if (lv === 'full') return kidBars(c);
  const ks = kidStats(c);
  const open = lv === 'some' ? null : new Set(['money', 'army']);
  return `<div class="kidstats">${KID_STATS.map((s) => {
    if (open && !open.has(s.key)) return `<div class="kstat unknown"><span>${s.icon} ${s.name}</span><span class="kbar"><i style="width:100%"></i></span><span class="kq">？</span></div>`;
    const q = ks[s.key] >= 67 ? 100 : ks[s.key] >= 34 ? 60 : 25;
    return `<div class="kstat"><span>${s.icon} ${s.name}　<b>${q === 100 ? 'おおい' : q === 60 ? 'ふつう' : 'すくない'}</b></span><span class="kbar rough"><i style="width:${q}%"></i></span></div>`;
  }).join('')}</div>`;
}

function countryInfo(id) {
  const c = C(g, id);
  if (!c) return;
  if (isSeat(g, id)) {
    const lv = intel(id);
    const note = `<div class="intel ${lv}">🔎 ${esc(K(INTEL_TEXT[lv][0], INTEL_TEXT[lv][1]))}</div>`;
    if (kid()) {
      modal(`<h2>${flagSvg(c.flag, 36, 24)} ${esc(c.name)}</h2>
        <div class="muted">${c.player ? 'きみの くに' : esc(personaName(c.persona))}${lv === 'little' ? '' : `　やりかた：${c.bases.map((b) => esc(baseName(b))).join('、')}`}${c.player ? '' : `　きみと なかよし ${Math.round(rel(g, g.player, id))}`}</div>
        ${c.player ? '' : note}
        ${kidIntelBars(c, lv)}
        <div class="row"><button class="btn primary" data-close>とじる</button></div>`, 'big');
      return;
    }
    const keys = Object.keys(STAT_INFO).filter((k) => k !== 'power');
    modal(`<h2>${flagSvg(c.flag, 36, 24)} ${esc(c.name)}</h2>
      <div class="muted">${c.player ? 'あなたの国' : 'AI：' + PERSONAS[c.persona].name}${lv === 'little' ? '' : `　基本政策：${c.bases.map((b) => BASE[b].name).join('・')}`}　国力 ${lv === 'full' ? c.power : '約' + Math.round(c.power / 10) * 10}${c.player ? '' : `　あなたとの関係 ${Math.round(rel(g, g.player, id))}`}</div>
      ${c.origName !== c.name ? `<div class="muted">旧国名：${esc(c.origName)}</div>` : ''}
      ${c.player ? '' : note}
      <div class="statgrid">${keys.map((k) => `<div class="stat ${lv === 'full' && isDanger(c, k) ? 'danger' : ''} ${intelText(c, k, lv) === '？' ? 'unknown' : ''}"><span>${STAT_INFO[k].name}</span><b>${intelText(c, k, lv)}</b></div>`).join('')}</div>
      <div class="row"><button class="btn primary" data-close>とじる</button></div>`, 'big');
  } else {
    const s = c.stats;
    const rows = kid()
      ? [['💰 おかね', s.econ], ['🏠 あんしん', s.stability], ['💧 みず', s.water], ['🍚 たべもの', s.food], ['📉 しゃっきん', s.debt]]
      : [['経済', s.econ], ['政情', s.stability], ['水', s.water], ['食糧', s.food], ['負債', s.debt]];
    modal(`<h2>${flagSvg(c.flag, 36, 24)} ${esc(c.name)}</h2>
      ${c.merged ? `<div class="muted">${K('まとまっている地域', 'まとまって いる ところ')}：${c.merged.filter((m) => m !== c.id).map((m) => esc(memberName(m))).join(K('・', '、'))}</div>` : ''}
      <div class="muted">${kid() ? '' : esc(c.role || '')}${c.owner ? K(`　${esc(nameOf(c.owner))}に併合`, `　${esc(nameOf(c.owner))}に とられた`) : ''}${c.sunk ? K('　海面上昇で国土を失った', '　うみに しずんで しまった') : ''}</div>
      <div class="statgrid">${rows.map(([l, v], i) => `<div class="stat ${(i === 4 ? v >= 90 : v <= 20) ? 'danger' : ''}"><span>${l}</span><b>${fmt(v, 0)}</b></div>`).join('')}</div>
      <div class="row"><button class="btn primary" data-close>とじる</button></div>`, 'big');
  }
}

function showChron() {
  modal(`<h2>${K('年表', 'ねんぴょう')}</h2><div class="chron">${g.chron.map((x) => `<div><span>${x.year}</span><span>${esc(x.text)}</span></div>`).join('')}</div>
    <div class="row"><button class="btn primary" data-close>とじる</button></div>`);
}

function showMenu() {
  const m = modal(`<h2>${K('メニュー', 'めにゅー')}</h2>
    <div class="muted">${K('シード値', 'せかいの ばんごう')}：<b style="color:var(--text);letter-spacing:.1em">${esc(g.seed)}</b>${K('（同じ組み合わせで遊び直せます）', '（おなじ せかいで また あそべる）')}</div>
    <div class="opts">
      <button class="opt" data-how>あそびかた</button>
      <button class="opt" data-set>せってい</button>
      <button class="opt" data-title>${K('タイトルへ（自動で保存されています）', 'さいしょの がめんへ（とちゅうから また あそべる）')}</button>
    </div><div class="row"><button class="btn primary" data-close>とじる</button></div>`);
  $('[data-how]', m).addEventListener('click', () => { m.remove(); howTo(); });
  $('[data-set]', m).addEventListener('click', () => { m.remove(); openSettings(); });
  $('[data-title]', m).addEventListener('click', () => { m.remove(); persist(); titleScreen(); });
}

// ───── 結末 ─────
function sparkline(key, color, label) {
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
  const title = kid() ? KID_ENDINGS[r.type] : G.ENDINGS[r.type].name;
  let sub = '';
  if (r.type === 'clear') sub = K(`世界議会の最初の議題「${AGENDAS[r.agenda].name}」が全会一致で可決された。`, `せかいの ぎかいで「${KID_AGENDAS[r.agenda]}」が ぜんいん さんせいで きまった。`);
  if (r.type === 'timeup') sub = `${G.timeupGrade(g)}。`;
  if (r.type === 'conquest') sub = K(`${nameOf(r.conqueror)}が世界を征服した。`, `${nameOf(r.conqueror)}が せかいを のっとった。`);
  const lastGm = [...g.feed].reverse().find((f) => f.k === 'gm')?.text || '';
  mount(el(`<div class="screen ending ${good ? '' : 'badend'}">
    <div style="display:flex;justify-content:space-between;align-items:flex-end">
      <div><div class="muted">${K(`${r.calYear}年（${r.year}年目）`, `${r.calYear}ねん（${r.year}かいめ）`)}</div><h1>${good && kid() ? '🎉 ' : ''}${title}</h1><div>${esc(sub)}</div></div>
      <div style="text-align:right"><div class="muted">${K('スコア', 'てんすう')}</div><div style="font-size:40px;font-weight:900;color:var(--gold)">${r.score.toLocaleString()}</div></div>
    </div>
    ${gmBubble(lastGm)}
    <div class="nums">
      <div class="num"><b>${flagSvg(me.flag, 24, 16)} ${esc(me.name)}</b><i>${K(`あなたの国（国力 ${me.power}）`, 'きみの くに')}</i></div>
      <div class="num"><b>${stageNames()[g.world.stage]}</b><i>${K('国際機関の段階', 'どこまで すすんだか')}</i></div>
      <div class="num"><b>${g.world.env}</b><i>${K('地球環境', 'ちきゅうの げんき')}</i></div>
      <div class="num"><b>${K(`${fmt(g.counters.deaths, 1)}百万人`, `${Math.round(g.counters.deaths * 100)}まんにん`)}</b><i>${K('犠牲になった人々（推計）', 'なくなった ひと（だいたい）')}</i></div>
    </div>
    <div class="grid">
      <div class="spark">${sparkline('env', '#46b37b', K('地球環境', 'ちきゅうの げんき'))}${sparkline('conflicts', '#e5534b', K('紛争の数', 'せかいの けんか'))}${kid() ? '' : sparkline('power', '#f2b632', '自国の国力')}</div>
      <div class="chron">${g.chron.map((x) => `<div><span>${x.year}</span><span>${esc(x.text)}</span></div>`).join('')}</div>
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end;align-items:center">
      <span class="muted">${K('シード値', 'せかいの ばんごう')} <b style="color:var(--text);letter-spacing:.1em">${esc(g.seed)}</b></span>
      <button class="btn" data-same>${K('同じ世界でもう一度', 'おなじ せかいで もういちど')}</button>
      <button class="btn primary" data-new>${K('新しいゲーム', 'あたらしく はじめる')}</button>
      <button class="btn" data-title>${K('タイトルへ', 'さいしょの がめんへ')}</button>
    </div>
  </div>`));
  const wasKid = g.kid;
  $('[data-same]', stage).addEventListener('click', () => { settings.mode = wasKid ? 'kid' : 'adult'; startSetup(g.seed); });
  $('[data-new]', stage).addEventListener('click', () => { settings.mode = wasKid ? 'kid' : 'adult'; startSetup(newSeed()); });
  $('[data-title]', stage).addEventListener('click', titleScreen);
}

// 開発・テスト用
window.WG = { get g() { return g; }, G, settings };

// はじめに：GAS 版ならクラウドのセーブを読みこみ、この端末のものと新しいほうを使う
async function boot() {
  if (onGas()) {
    mount(el(`<div class="screen title"><div class="menu"><p class="loading">${K('セーブを読みこみ中…', 'セーブを よみこみちゅう…')}</p></div></div>`));
    const r = await cloudLoad();
    if (r) {
      KEY += '.' + r.user; SKEY += '.' + r.user;
      const parse = (t) => { try { return JSON.parse(t); } catch (e) { return null; } };
      const local = store.get(KEY), remote = r.save ? parse(r.save) : null;
      if (local && !local.result && (local.savedAt || 0) > (r.updated || 0)) cloudPush({ save: JSON.stringify(local), meta: saveMeta(local) });
      else if (remote) store.set(KEY, remote);
      else store.del(KEY);
      if (r.settings) { const st = parse(r.settings); if (st) store.set(SKEY, st); }
      loadSettings();
    }
  }
  titleScreen();
}
boot();
if (!onGas() && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
