// 劇中の街の画面（施設はタブで切り替え）。ルールは engine/town.js
import { SONGS } from '../data/songs.js';
import { CLASSES, PROMOTE_LEVEL } from '../data/classes.js';
import { IDOLS, IDOL_LIST } from '../data/idols.js';
import { BASE_STATS, STAT_NAME } from '../engine/party.js';
import { SPELL_LIST } from '../data/spells.js';
import { ITEMS } from '../data/items.js';
import { CONDITIONS } from '../engine/revive.js';
import { getFloor } from '../engine/dungeon.js';
import { partyView, unitOf, enterDungeon, openDungeons, cardUnlocked, DRPG_BONUS, newExpedition, FIRST_PARTY } from '../engine/expedition.js';
import { enterCardMode } from '../engine/cards.js';
import { CARD_DUNGEONS } from '../data/cards.js';
import { roster, joinParty, leaveParty, moveMember, equip, appraiseAll, hasAppraiser, ROOMS, roomFee, stay, expToNext,
  shopList, buy, sellList, sell, appraise, unknownList, unknownCount, treat, treatFee, retrieve, retrieveFee, donate, bestiary,
  trainingInfo, doChangeClass, doPromote, prepCheck, dressUp, dressAuto, removeCurse, gearShopRank } from '../engine/town.js';
import { GEAR, GEAR_SLOTS, SLOT_NAME, TYPE_NAME, SETS } from '../data/gear.js';
import { gearName, gearStats, statText, kindText, canWear, isCursed, wornGear, wornUids, wearerOf, setsOf, cursedWorn } from '../engine/gear.js';
import { SLOTS, saveSlot, readSlot, clearSlot, exportText, importText } from '../save.js';
import { BOSSES } from '../data/bosses.js';
import { bossStage, untilNextStage } from '../engine/boss.js';
import { sceneSvg, sceneInfo } from './scenes.js';
import { shortName } from './portrait.js';

export const TABS = [['tavern', '酒場'], ['equip', '装備'], ['inn', '宿屋'], ['shop', '商店'], ['temple', '寺院'], ['training', '訓練所'], ['castle', '城'], ['record', '記録'], ['help', '遊び方'], ['depart', '迷宮へ']];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let tab = 'tavern';
let shopMode = 'buy';
let ioText = '';
let trainee = null;   // 訓練所で選んでいるアイドル
let dresser = null;   // 装備で選んでいるアイドル
let confirm = null;   // 転職・昇格の確認待ち { kind, cls, item }
let wipeAsk = null;   // 記録：消す前の確認 'reset'（今の冒険を最初から）| 記録枠の番号

// エルミナージュの施設画面：背景画の上に、左上の縦メニュー（施設）と、こげ茶の板（中身）。施設の人のひとことは下の窓
export function renderTown(ex) {
  const tabs = TABS.map(([id, nm]) => `<button data-tab="${id}" class="vbar ${id === tab ? 'on' : ''} ${id === 'depart' ? 'go' : ''}">${nm}</button>`).join('');
  const body = (HOWTO[tab] ? `<p class="howto">${HOWTO[tab]}</p>` : '') + { tavern, equip: dress, inn, shop, temple, training, castle, record, help, depart }[tab](ex);
  return `${sceneSvg(tab)}
    <nav class="vmenu town-menu" aria-label="施設">${tabs}</nav>
    <section class="panel town-panel"><h2 class="plate">${esc(sceneInfo(tab).name)}</h2>${body}</section>`;
}
// 施設を開いたときに出す（遊び方の章も参照）
export const openTab = (id) => { if (TABS.some(([t]) => t === id)) tab = id; };
// 各施設でできること（いちばん上に1行で出す）
const HOWTO = {
  tavern: 'パーティを組むところ（6人まで。先頭3人が前列）。名前の横の「装備」で、その子の装備を着せかえられる。',
  equip: '<b>小道具（武器）・衣装（防具）・アクセサリ・楽譜</b>の4つを着せかえる。使える種類はクラスで決まる。迷ったら「おまかせ」。',
  inn: '泊まると<b>呪文とライブの回数が全快</b>し、<b>ためた経験値でレベルが上がる</b>。HP の回復は部屋しだい。',
  shop: '装備・楽譜・昇格アイテムを買う・売る。迷宮で拾った<b>未鑑定</b>の楽譜・装備はここで鑑定できる。',
  temple: '倒れた仲間の<b>治療・蘇生</b>、呪いの装備の<b>解呪</b>、迷宮に取り残された仲間の<b>回収</b>。寄付すると経験値になる。',
  training: '<b>転職</b>（能力が条件を満たせば Lv1 から別のクラスへ）と<b>昇格</b>（Lv10 以上で昇格アイテムを使い上位職へ）。',
  castle: '出会った魔物の記録と、持っている昇格アイテムを見られる。',
};
// 下の窓に出す、施設の人のひとこと
export const townSpeech = () => ({ speaker: sceneInfo(tab).speaker, line: sceneInfo(tab).line, place: sceneInfo(tab).name });

// 出発：迷宮とモードを選ぶ（docs/DESIGN.md 17章）。カードモードはその迷宮のボスを DRPGモードで倒すと解放
function depart(ex) {
  const can = ex.slots.length > 0;
  const checks = prepCheck(ex);
  const todo = checks.filter((c) => !c.ok);
  const list = `<h3>出発前のチェック <small class="sub">${todo.length ? `${todo.length}件` : '準備は万全！'}</small></h3>
    <ul class="prep">${checks.map((c) => `<li class="${c.ok ? 'ok' : 'todo'}"><span>${c.ok ? '✓' : '！'}</span>${esc(c.text)}${c.ok ? '' : `<button data-tab="${c.tab}">${esc(TABS.find(([t]) => t === c.tab)[1])}へ</button>`}</li>`).join('')}</ul>`;
  const dungeons = openDungeons(ex).map((d) => {
    const open = cardUnlocked(ex, d.id);
    const c = CARD_DUNGEONS[d.id];
    const note = !open ? 'この迷宮のボスを DRPGモードで倒すと解放' : `カードを左右に振って進む。${c.floors}階×${c.perFloor}枚＋ボス`;
    return `<div class="depart">
      <h3>${esc(d.name)} <small class="sub">${d.floors.length}階</small></h3>
      <div class="depart-modes">
        <button data-t="enter" data-id="${d.id}" class="mode" ${can ? '' : 'disabled'}><b>DRPGモード</b><small>歩いて地図を埋める。経験値・お金・楽譜 ×${DRPG_BONUS}</small></button>
        <button data-t="enterCard" data-id="${d.id}" class="mode" ${can && open ? '' : 'disabled'}><b>カードモード${open ? '' : '（未解放）'}</b><small>${note}</small></button>
      </div>
    </div>`;
  }).join('');
  return `${list}<h3>迷宮とモードを選ぶ</h3>${dungeons}`;
}

function tavern(ex) {
  const party = partyView(ex);
  const list = roster(ex);
  // 装備の早見：小道具・衣装・アクセサリ・楽譜のうち、つけている数
  const filled = (m) => Object.values(wornGear(ex, m.id)).filter(Boolean).length + (ex.equip[m.id] ? 1 : 0);
  const rows = party.map((m, i) => `${i === 0 ? '<div class="row-label">前列</div>' : i === 3 ? '<div class="row-label">後列</div>' : ''}
    <div class="tv-row" style="--c:${m.idol.color}">
      <b>${esc(m.idol.name)}</b> <small class="sub">${esc(CLASSES[m.cls].name)} Lv${m.level}</small>
      ${m.cond !== 'ok' ? `<span class="cond ${m.cond}">${CONDITIONS[m.cond].name}</span>` : ''}
      <button data-dress="${m.id}" class="dress-btn">装備 ${filled(m)}/4</button>
      <span class="moves"><button data-up="${m.id}" aria-label="前へ">▲</button><button data-down="${m.id}" aria-label="後ろへ">▼</button><button data-leave="${m.id}">外す</button></span>
    </div>`).join('');
  const waiting = list.filter((r) => !r.inParty).map((r) => `<button data-join="${r.id}" ${r.lost ? 'disabled' : ''} style="--c:${r.idol.color}" class="wait">
    ${esc(r.idol.name)} <small>${esc(CLASSES[r.cls].name)} Lv${r.level}${r.lost ? '・迷宮に取り残されている' : r.cond !== 'ok' ? '・' + CONDITIONS[r.cond].name : ''}</small></button>`).join('');
  return `<h3>パーティ <small class="sub">${party.length}/6人。先頭3人が前列</small></h3>
    <div class="tv-party">${rows || '<p class="sub">だれもいない。下から選んで加えよう</p>'}</div>
    <h3>待機中のアイドル</h3><div class="wait-grid">${waiting}</div>
    <h3>鑑定</h3>${appraiseNote(ex)}
    <p class="sub">パーティ編成画面（party.html）はシナジーを試すための場所です。冒険のパーティはこの酒場で組みます。</p>`;
}

// 未鑑定の楽譜・装備と、ビショップのまとめて鑑定（酒場と装備で出す）
function appraiseNote(ex) {
  const n = unknownCount(ex);
  if (!n) return '<p class="sub">未鑑定の楽譜・装備はない</p>';
  return `<p class="sub">未鑑定の楽譜・装備が ${n} つ${hasAppraiser(ex) ? '' : '（ビショップがいれば、ここでまとめて鑑定できる。商店でも有料で鑑定できる）'}</p>
    ${hasAppraiser(ex) ? '<button data-t="appraiseAll">まとめて鑑定</button>' : ''}`;
}

// 装備：小道具・衣装・アクセサリ・楽譜の4部位（docs/DESIGN.md 18章）
const setTag = (g) => (g.known && GEAR[g.item].set ? `［${SETS[GEAR[g.item].set].name}］` : '');
const SHOW_STATS = ['hp', 'atk', 'mat', 'def', 'res', 'hit', 'eva', 'spd', 'crit'];
function dress(ex) {
  const party = partyView(ex);
  if (!party.length) return '<p class="sub">パーティがいない。酒場で組もう</p>';
  if (!party.some((m) => m.id === dresser)) dresser = party[0].id;
  const pick = party.map((m) => `<button data-dresser="${m.id}" class="chip ${m.id === dresser ? 'on' : ''}" style="--c:${m.idol.color}">${esc(shortName(m.id))}</button>`).join('');
  const m = party.find((x) => x.id === dresser), c = CLASSES[m.cls];
  const worn = wornGear(ex, m.id), list = Object.values(worn).filter(Boolean);
  const gearRow = (slot) => {
    const cur = worn[slot], locked = cur && isCursed(cur);
    const opts = ex.gear.filter((g) => GEAR[g.item].slot === slot && canWear(m.cls, g.item)).map((g) => {
      const who = wearerOf(ex, g.uid), other = who && who !== m.id;
      return `<option value="${g.uid}" ${cur?.uid === g.uid ? 'selected' : ''} ${other && isCursed(g) ? 'disabled' : ''}>${esc(gearName(g))}${setTag(g)}${g.known ? '　' + esc(statText(gearStats(g))) : ''}${other ? `（${esc(IDOLS[who].name)}）` : ''}</option>`;
    }).join('');
    return `<label class="eq-row"><span>${SLOT_NAME[slot]}</span><select data-wear="${slot}" ${locked ? 'disabled' : ''} aria-label="${SLOT_NAME[slot]}"><option value="">（なし）</option>${opts}</select></label>
      ${locked ? '<small class="cond eq-note">呪われていて外せない（寺院で解呪できる）</small>' : ''}`;
  };
  const songWorn = new Set(Object.values(ex.equip));
  const songOpts = ex.scores.filter((sc) => sc.known).map((sc) => { const other = songWorn.has(sc.uid) && ex.equip[m.id] !== sc.uid;
    return `<option value="${sc.uid}" ${ex.equip[m.id] === sc.uid ? 'selected' : ''} ${other ? 'disabled' : ''}>★${SONGS[sc.song].rank} ${esc(SONGS[sc.song].title)}${other ? '（装備中）' : ''}</option>`; }).join('');
  const song = ex.equip[m.id] && ex.scores.find((sc) => sc.uid === ex.equip[m.id]);
  // 装備で増えている値（強化値・衣装セット込み）
  const plus = {};
  for (const g of list) for (const [k, v] of Object.entries(gearStats(g))) plus[k] = (plus[k] || 0) + v;
  const sets = setsOf(list);
  for (const st of sets) for (const e of st.effects) if (e.type === 'stat' && e.add) plus[e.stat] = (plus[e.stat] || 0) + e.add;
  const stats = SHOW_STATS.map((k) => `<span>${STAT_NAME[k]}<b>${k === 'hp' ? m.maxHp : m.stats[k]}${plus[k] ? `<small class="${plus[k] > 0 ? 'up' : 'down'}">${plus[k] > 0 ? '+' : ''}${plus[k]}</small>` : ''}</b></span>`).join('');
  const setLine = sets.length ? sets.map((st) => `<b>${esc(st.name)}セット ${st.count}/${st.of}</b>：${esc(st.effects.map((e) => e.type === 'stat' ? `${STAT_NAME[e.stat]}${e.pct ? `+${e.pct}%` : `+${e.add}`}` : e.name).join(' '))}`).join('<br>') : '';
  const can = `小道具：${c.weapons.map((t) => TYPE_NAME[t]).join('・') || 'なし'}　衣装：${{ heavy: '重い衣装まで', light: '軽い衣装まで', robe: 'ローブだけ' }[c.armor]}　アクセサリ：だれでも`;
  // 持ち物の装備（だれが着ているか・パーティのだれが着られるか）
  const taken = wornUids(ex);
  const bag = ex.gear.slice().sort((a, b) => GEAR_SLOTS.indexOf(GEAR[a.item].slot) - GEAR_SLOTS.indexOf(GEAR[b.item].slot) || GEAR[b.item].rank - GEAR[a.item].rank).map((g) => {
    const who = wearerOf(ex, g.uid);
    const fit = party.filter((p) => canWear(p.cls, g.item)).map((p) => shortName(p.id));
    return `<li><b>${esc(gearName(g))}</b>${setTag(g)} <small class="sub">${esc(kindText(g.item))}${g.known ? '・' + esc(statText(gearStats(g))) : ''}・${who ? `${esc(IDOLS[who].name)}が装備中` : fit.length ? `着られる：${esc(fit.join('・'))}` : 'パーティのだれも着られない'}</small></li>`;
  }).join('');
  return `<div class="chips" role="group" aria-label="だれの装備">${pick}</div>
    <div class="tr-head" style="--c:${m.idol.color}"><b>${esc(m.idol.name)}</b>
      <span>${esc(c.name)} Lv${m.level}・${m.row === 'front' ? '前列' : '後列'}・射程${c.range}</span>
      <small class="sub">${esc(can)}</small>
      <div class="stats">${stats}</div>
      ${setLine ? `<small class="sub">${setLine}</small>` : ''}</div>
    <div class="eq">
      ${GEAR_SLOTS.map(gearRow).join('')}
      <label class="eq-row"><span>楽譜</span><select data-equip="${m.id}" aria-label="楽譜"><option value="">（なし）</option>${songOpts}</select></label>
      ${song ? `<small class="sub eq-note">${esc(songNote(song.song))}</small>` : ''}
    </div>
    <div class="row"><button data-t="dressAuto">おまかせ（${esc(m.idol.name)}）</button><button data-t="dressAll">全員おまかせ</button></div>
    <p class="sub">おまかせは、鑑定済みで呪われていない装備から選ぶ（楽譜は自分で選ぶ）。未鑑定の装備も着られるが、呪われていると外せなくなる。</p>
    <h3>持ち物の装備 <small class="sub">${ex.gear.length}個・装備中 ${taken.size}</small></h3>
    ${bag ? `<ul class="plain bag">${bag}</ul>` : '<p class="sub">装備を持っていない。商店で買うか、迷宮で見つけよう</p>'}
    <h3>鑑定</h3>${appraiseNote(ex)}`;
}

function inn(ex) {
  const party = partyView(ex);
  return `<p class="sub">泊まると、ためた経験値でレベルが上がる。呪文とライブスキルの回数はどの部屋でも全快する。</p>
    <div class="town-grid">${ROOMS.map((r) => `<button data-t="stay" data-id="${r.id}">${r.name} <small>${roomFee(ex, r)}G（1人${r.fee}G）・${r.text}</small></button>`).join('')}</div>
    <h3>次のレベルまで</h3>
    <ul class="plain">${party.map((m) => { const u = unitOf(ex, m.id), n = expToNext(u); return `<li>${esc(m.idol.name)} Lv${u.level}：${n ? `あと ${n}` : '<b class="ok">泊まればレベルアップ！</b>'}</li>`; }).join('')}</ul>`;
}

function shop(ex) {
  const modes = [['buy', '買う'], ['sell', '売る'], ['appraise', '鑑定']].map(([id, nm]) => `<button data-shop="${id}" class="${id === shopMode ? 'on' : ''}">${nm}</button>`).join('');
  let body;
  if (shopMode === 'buy') {
    const party = partyView(ex);
    const note = (it) => it.kind === 'song' ? '・' + esc(songNote(it.id))
      : it.kind === 'gear' ? `・${esc(kindText(it.id))}・${esc(statText(GEAR[it.id].stats))}・${(() => { const fit = party.filter((p) => canWear(p.cls, it.id)).map((p) => shortName(p.id)); return fit.length ? `着られる：${esc(fit.join('・'))}` : 'パーティのだれも着られない'; })()}` : '';
    const btn = (it) => `<button data-t="buy" data-id="${it.id}" ${it.stock <= 0 || ex.gold < it.price ? 'disabled' : ''}>${esc(it.name)} <small>${it.price}G${it.stock === Infinity ? '' : ` 残り${it.stock}`}${note(it)}</small></button>`;
    const all = shopList(ex), gear = all.filter((it) => it.kind === 'gear');
    body = `<h3>装備 <small class="sub">ランク${gearShopRank(ex)}まで（迷宮のボスを倒すと品ぞろえが増える）</small></h3>
      <div class="shop">${gear.map(btn).join('')}</div>
      <h3>楽譜・昇格アイテム</h3><div class="shop">${all.filter((it) => it.kind !== 'gear').map(btn).join('')}</div>`;
  } else if (shopMode === 'sell') {
    const list = sellList(ex);
    body = list.length ? `<div class="shop">${list.map((it) => `<button data-t="sell" data-kind="${it.kind}" data-id="${it.ref}">${esc(it.name)} <small>${it.price}G で売る</small></button>`).join('')}</div>` : '<p class="sub">売れるものがない（装備中の楽譜・装備は売れない）</p>';
  } else {
    const list = unknownList(ex);
    body = list.length ? `<div class="shop">${list.map((x) => `<button data-t="appraise" data-id="${x.uid}" ${ex.gold < x.fee ? 'disabled' : ''}>${esc(x.name)} <small>${x.fee}G</small></button>`).join('')}</div>` : '<p class="sub">未鑑定の楽譜・装備はない</p>';
  }
  return `<div class="tabs sub-tabs">${modes}</div>${body}`;
}
const songNote = (id) => SONGS[id].effects.map((e) => e.name || '').filter(Boolean).join('・') || (SONGS[id].live ? `ライブ「${SONGS[id].live.name}」` : '能力アップ');

function temple(ex) {
  const list = roster(ex);
  const sick = list.filter((r) => ['dead', 'ash', 'paralyze', 'stone', 'poison'].includes(r.cond) && !r.lost);
  const lost = list.filter((r) => r.lost);
  const cursed = cursedWorn(ex);
  return `<h3>治療・蘇生 <small class="sub">料金はレベルに応じる。灰の蘇生に失敗しても灰のまま</small></h3>
    ${sick.length ? `<div class="town-grid">${sick.map((r) => `<button data-t="treat" data-id="${r.id}">${esc(r.idol.name)} <small>${CONDITIONS[r.cond].name}・${treatFee(ex, r.id)}G</small></button>`).join('')}</div>` : '<p class="sub">治療が必要な仲間はいない</p>'}
    <h3>解呪 <small class="sub">呪いを解くと、その装備は崩れてなくなる</small></h3>
    ${cursed.length ? `<div class="town-grid">${cursed.map((x) => `<button data-t="uncurse" data-id="${x.id}" data-slot="${x.slot}" ${ex.gold < x.fee ? 'disabled' : ''}>${esc(IDOLS[x.id].name)}の${esc(gearName(x.g))} <small>${x.fee}G</small></button>`).join('')}</div>` : '<p class="sub">呪われた装備をつけている仲間はいない</p>'}
    <h3>死体の回収</h3>
    ${lost.length ? `<div class="town-grid">${lost.map((r) => { const at = ex.lost[r.id]; return `<button data-t="retrieve" data-id="${r.id}">${esc(r.idol.name)} <small>${retrieveFee(ex, r.id)}G・${getFloor(at.dungeon || 'd1', at.floor).name}${at.card ? '（カードモード）' : ` X${at.x} Y${at.y}`}</small></button>`; }).join('')}</div>
      <p class="sub">自分たちで探しに行けば無料（DRPGモードはそのマスに行く、カードモードはその階の「仲間の死体」カードで連れて帰る。パーティに空きが必要）</p>` : '<p class="sub">迷宮に取り残された仲間はいない</p>'}
    <h3>寄付 <small class="sub">寄付した額と同じ経験値</small></h3>
    <div class="town-grid">${partyView(ex).map((m) => `<button data-t="donate" data-id="${m.id}" ${ex.gold < 100 ? 'disabled' : ''}>${esc(m.idol.name)}のために 100G</button>`).join('')}</div>`;
}

function training(ex) {
  trainee ||= ex.slots[0]?.idol || IDOL_LIST[0];
  const pick = IDOL_LIST.map((id) => { const u = unitOf(ex, id); return `<button data-trainee="${id}" class="wait ${id === trainee ? 'on' : ''}" style="--c:${IDOLS[id].color}">
    ${esc(IDOLS[id].name)} <small>${esc(CLASSES[u.cls].name)} Lv${u.level}</small></button>`; }).join('');
  const info = trainingInfo(ex, trainee);
  const u = info.unit, c = info.cls;
  const stats = BASE_STATS.map((k) => `<span>${STAT_NAME[k]}<b>${u.base[k]}</b></span>`).join('');
  const spells = SPELL_LIST.filter((s) => (u.learned || []).includes(s.family) || c.effects.some((e) => e.id === s.family)).filter((s) => s.lv <= u.level).map((s) => s.name);
  const head = `<div class="tr-head" style="--c:${IDOLS[trainee].color}"><b>${esc(IDOLS[trainee].name)}</b>
      <span>${esc(c.name)}（${c.tier === 1 ? '下位職' : '上位職'}・射程${c.range}）Lv${u.level}</span>
      <small class="sub">${esc(c.role || '')}${u.history?.length ? `　これまで：${u.history.map((h) => CLASSES[h].name).join('→')}` : ''}</small>
      <div class="stats">${stats}</div>
      ${spells.length ? `<small class="sub">使える呪文：${spells.map(esc).join('・')}</small>` : ''}
      ${info.blocked ? `<p class="cond">${esc(info.blocked)}</p>` : ''}</div>`;
  if (confirm) {
    const target = CLASSES[confirm.cls];
    const warn = confirm.kind === 'change'
      ? 'Lv1・経験値0 に戻り、能力はアイドル本来の値に戻ります。覚えた魔法は残ります。'
      : `「${ITEMS[confirm.item].name}」を使います。Lv1・経験値0 に戻りますが、能力は残り、昇格ボーナスが足されます。`;
    return `${head}<div class="confirm"><b>${esc(target.name)}に${confirm.kind === 'change' ? '転職' : '昇格'}しますか？</b><p class="sub">${warn}</p>
      <div class="row"><button data-t="trainYes">決定</button><button data-t="trainNo">やめる</button></div></div>`;
  }
  const promo = info.promotions.length ? `<h3>昇格 <small class="sub">Lv${PROMOTE_LEVEL} 以上・昇格アイテムを使って2つの上位職から1つ</small></h3>
    <div class="promo-grid">${info.promotions.map((p) => `<div class="slot"><b>${esc(p.cls.name)}</b> <small class="sub">${esc(p.cls.role)}・ボーナス ${BASE_STATS.filter((k) => p.cls.bonus?.[k]).map((k) => `${STAT_NAME[k]}+${p.cls.bonus[k]}`).join(' ')}</small>
      ${p.ok ? `<div class="row">${p.items.map((it) => `<button data-t="promote" data-cls="${p.cls.id}" data-item="${it}">${esc(ITEMS[it].name)}で昇格</button>`).join('')}</div>` : `<small class="cond">${esc(p.reason)}</small>`}</div>`).join('')}</div>`
    : c.tier === 2 ? '<p class="sub">上位職です（これ以上の昇格はない）</p>' : '<p class="sub">踊り子は昇格しない特別職です</p>';
  const row = (x) => `<button data-t="change" data-cls="${x.cls.id}" ${x.ok ? '' : 'disabled'} title="${esc(x.cls.role)}">${esc(x.cls.name)}
    <small>${x.reqs.map((r) => `<span class="${r.ok ? 'ok' : 'ng'}">${STAT_NAME[r.stat]}${r.need}</span>`).join(' ')}</small></button>`;
  const lower = info.changes.filter((x) => x.cls.tier === 1), upper = info.changes.filter((x) => x.cls.tier === 2);
  return `<div class="wait-grid">${pick}</div>${head}${promo}
    <h3>転職 <small class="sub">能力が条件を満たしていれば、どのクラスにもなれる（Lv1 から）</small></h3>
    <div class="shop">${lower.map(row).join('')}</div>
    <h3>エルミナージュの上級職 <small class="sub">転職で直接なる</small></h3>
    <div class="shop">${upper.map(row).join('')}</div>`;
}

function castle(ex) {
  const list = bestiary(ex);
  const n = list.filter((x) => x.known).length;
  const clears = ex.ex.bossClears;
  return `<h3>モンスター図鑑 <small class="sub">${n}/${list.length}</small></h3>
    <div class="book">${list.map((x) => x.known
      ? `<div class="bk"><span class="eicon">${x.enemy.icon}</span><b>${esc(x.enemy.name)}</b> <small class="sub">Lv${x.enemy.level}・HP${x.enemy.hp}・攻撃${x.enemy.atk}・防御${x.enemy.def}・経験値${x.enemy.exp}・倒した数 ${x.kills}</small></div>`
      : `<div class="bk unknown"><span class="eicon">❔</span><b>？？？</b> <small class="sub">${x.kills ? `倒した数 ${x.kills}` : 'まだ出会っていない'}</small></div>`).join('')}</div>
    ${Object.keys(clears).length ? `<h3>ボス <small class="sub">5回倒すごとに1段階強くなって再出現する</small></h3>
      <ul class="plain">${Object.entries(clears).map(([id, n]) => `<li>${esc(BOSSES[id].name)}：${n}回撃破・いまは第${bossStage(n) + 1}段階（あと${untilNextStage(n)}回倒すと第${bossStage(n) + 2}段階）</li>`).join('')}</ul>` : ''}
    <p class="sub">${ex.items.length ? '持っている昇格アイテム：' + [...new Set(ex.items)].map((id) => `${ITEMS[id].name}×${ex.items.filter((x) => x === id).length}`).join('、') : ''}</p>`;
}

// 遊び方：準備のしかたと、迷宮・戦闘の基本
function help() {
  return `<h3>冒険の流れ</h3>
    <ol class="plain">
      <li><b>酒場</b>でパーティを組み、<b>装備</b>で小道具・衣装・アクセサリ・楽譜を着せる</li>
      <li><b>迷宮へ</b>から出発。「出発前のチェック」で準備の抜けを確かめられる</li>
      <li>迷宮で戦って経験値・お金・装備・楽譜を集め、階段で街に戻る</li>
      <li><b>宿屋</b>に泊まる（ここでレベルが上がる）。倒れた仲間は<b>寺院</b>へ</li>
      <li>ボスを倒すと次の迷宮と、その迷宮のカードモードが開く。倒したボスは街に戻ると復活し、<b>5回倒すごとに1段階強くなる</b>（城で段階を確かめられる）</li>
    </ol>
    <h3>装備（4つの部位）</h3>
    <ul class="plain">
      <li>部位は<b>小道具</b>（武器）・<b>衣装</b>（防具）・<b>アクセサリ</b>・<b>楽譜</b>の4つ。街の「<b>装備</b>」（酒場の名前の横の「装備」からも行ける）で、1人ずつ着せかえる</li>
      <li>使える種類は<b>クラスで決まる</b>。小道具は剣・槍・斧・弓・短剣・杖、衣装は重い衣装・軽い衣装・ローブ（魔法職はローブだけ）。アクセサリはだれでも使える。転職・昇格で使えなくなった物は外れる</li>
      <li>迷ったら「<b>おまかせ</b>」。持っている装備から、そのクラスにいちばん合う物を着せる</li>
      <li>名前の後ろの <b>+1〜+3</b> は強化値で、数字のぶん強い。深い階ほど出やすい</li>
      <li>迷宮で拾った装備は「？？？の剣」のような<b>未鑑定</b>。そのまま着られるが、<b>呪われていると外せなくなる</b>（−1・−2 や「（呪）」の付いた物）。寺院で<b>解呪</b>すると外れるが、その装備は崩れてなくなる。商店かビショップに鑑定してもらうと安心</li>
      <li><b>衣装セット</b>：同じシリーズ（騎士団・怪盗・星空・狩人）の小道具・衣装・アクセサリを<b>2つそろえると効果</b>が出て、<b>3つで大きな効果</b>。セットの装備は店になく、迷宮で見つかる</li>
      <li><b>楽譜</b>（アイドルの曲）は1人1枚。能力が上がったり、戦闘で使える<b>ライブスキル</b>（曲ごとの必殺技。泊まると回数が戻る）が使えるようになる。楽譜だけは鑑定するまで装備できない</li>
      <li>装備・楽譜は商店でも買える（迷宮のボスを倒すと品ぞろえが増える）</li>
    </ul>
    <h3>昇格アイテム</h3>
    <ul class="plain">
      <li>ボスが落とす・商店で買える。装備するものではなく、<b>訓練所の「昇格」で使う</b></li>
      <li>Lv10 以上の下位職が、クラスに合うアイテムを使うと上位職になれる（Lv1 に戻るが、能力は残り、ボーナスが足される）</li>
    </ul>
    <h3>パーティの組み方</h3>
    <ul class="plain">
      <li>先頭3人が前列、残りが後列。敵の攻撃は主に前列に来る</li>
      <li>射程：S は目の前の敵グループだけ、M は2つ先まで、L はどこへでも届く。<b>後列だと1つ短くなる</b>（射程 S の子は後列から攻撃できない）。戦士系は前列、弓や魔法の子は後列へ</li>
      <li>アイドルは「赤系」「高校生」「スポーツ好き」などの<b>属性</b>を持つ。同じ属性が重なったり組み合わさったりすると、パーティ全体に効果が出る（タイトルの「パーティ編成」で試せる）</li>
    </ul>
    <h3>迷宮の2つのモード</h3>
    <ul class="plain">
      <li><b>DRPGモード</b>：歩いて地図を埋める。↑ 前へ・← → 向きを変える・↓ 振り返る・Q / E 横歩き・Space 調べる・M 地図（スマホは画面のボタン）。経験値・お金・楽譜が 1.5倍</li>
      <li><b>カードモード</b>：その迷宮のボスを DRPGモードで倒すと遊べる。カードを左右に振って（ボタンや ← → キーでも）ボスまで進む。いつでも街に戻れるが、拾った物の半分を失う</li>
    </ul>
    <h3>戦闘</h3>
    <ul class="plain">
      <li>全員のコマンドを決めると、<b>素早さの順</b>に1人ずつ動く。「おまかせ」で残り全員を自動で決められる</li>
      <li>呪文とライブスキルは回数制。宿屋に泊まると戻る</li>
      <li>「逃げる」は選んだ人だけが逃げる。ボスからは逃げられない</li>
    </ul>
    <h3>全滅しても</h3>
    <ul class="plain">
      <li>仲間がいなくなることはない（ロストなし）。死体が迷宮に残るので、寺院でお金を払って回収するか、別のパーティで迎えに行く</li>
      <li>みんな倒れてお金もないときは、寺院がただで助けてくれる</li>
    </ul>
    <h3>記録</h3>
    <ul class="plain">
      <li>冒険は自動で保存される。<b>記録</b>では3つの記録枠に残したり、文字列で書き出したりできる</li>
      <li>はじめから遊びたいときは、記録の「<b>最初からやり直す</b>」（記録枠に残したものは消えない）</li>
    </ul>`;
}

function record() {
  const ask = (what, yes) => `<div class="confirm"><b>${what}</b><div class="row"><button data-t="${yes}">消す</button><button data-t="wipeNo">やめる</button></div></div>`;
  return `<p class="sub">冒険は自動で保存されています。ここでは、別の記録枠に残したり、文字列で書き出したりできます。</p>
    <div class="town-grid">${SLOTS.map((n) => { const r = readSlot(n); return `<div class="slot"><b>記録 ${n}</b> <small class="sub">${r ? `${esc(r.summary)}<br>${new Date(r.savedAt).toLocaleString('ja-JP')}` : '空き'}</small>
      ${wipeAsk === n ? ask(`記録 ${n} を消しますか？（今の冒険はそのまま）`, 'clearYes') : `<div class="row"><button data-t="save" data-id="${n}">ここに記録</button><button data-t="load" data-id="${n}" ${r ? '' : 'disabled'}>読み込む</button><button data-t="clearAsk" data-id="${n}" ${r ? '' : 'disabled'}>消す</button></div>`}</div>`; }).join('')}</div>
    <h3>最初からやり直す</h3>
    ${wipeAsk === 'reset' ? ask('今の冒険を消して、最初からやり直しますか？ 元には戻せません。（記録 1〜3 に残したものは消えません）', 'resetYes')
      : '<p class="sub">今の冒険（アイドルの育成・お金・楽譜・迷宮の地図）を消して、はじめから遊びます。残しておきたいときは、先に記録枠に記録するか書き出しておこう。</p><div class="row"><button data-t="resetAsk">最初からやり直す</button></div>'}
    <h3>書き出し・読み込み</h3>
    <div class="row"><button data-t="export">書き出す</button><button data-t="import">貼り付けた文字列を読み込む</button></div>
    <textarea id="io" rows="3" placeholder="ここに記録の文字列">${esc(ioText)}</textarea>`;
}

// クリック・変更の処理。戻り値 { msgs, replace?: 新しい冒険データ }
export function townAction(ex, el, rng = Math.random) {
  const d = el.dataset;
  if (d.tab) { tab = d.tab; wipeAsk = null; return { msgs: [] }; }
  if (d.shop) { shopMode = d.shop; return { msgs: [] }; }
  if (d.trainee) { trainee = d.trainee; confirm = null; return { msgs: [] }; }
  if (d.dresser) { dresser = d.dresser; return { msgs: [] }; }
  if (d.dress) { dresser = d.dress; tab = 'equip'; return { msgs: [] }; }
  if (d.wear) return { msgs: dressUp(ex, dresser, d.wear, el.value ? Number(el.value) : null) };
  if (d.join) return { msgs: joinParty(ex, d.join) };
  if (d.leave) return { msgs: leaveParty(ex, d.leave) };
  if (d.up) return { msgs: moveMember(ex, d.up, -1) };
  if (d.down) return { msgs: moveMember(ex, d.down, 1) };
  if (d.equip) return { msgs: equip(ex, d.equip, el.value ? Number(el.value) : null) };
  switch (d.t) {
    case 'enter': return { msgs: enterDungeon(ex, d.id) };
    case 'enterCard': return { msgs: enterCardMode(ex, d.id, rng) };
    case 'appraiseAll': return { msgs: appraiseAll(ex) };
    case 'dressAuto': return { msgs: dressAuto(ex, [dresser]) };
    case 'dressAll': return { msgs: dressAuto(ex, ex.slots.map((s) => s.idol)) };
    case 'uncurse': return { msgs: removeCurse(ex, d.id, d.slot) };
    case 'change': confirm = { kind: 'change', cls: d.cls }; return { msgs: [] };
    case 'promote': confirm = { kind: 'promote', cls: d.cls, item: d.item }; return { msgs: [] };
    case 'trainNo': confirm = null; return { msgs: [] };
    case 'trainYes': {
      const c = confirm; confirm = null;
      return { msgs: c.kind === 'change' ? doChangeClass(ex, trainee, c.cls) : doPromote(ex, trainee, c.cls, c.item) };
    }
    case 'stay': return { msgs: stay(ex, d.id, rng) };
    case 'buy': return { msgs: buy(ex, d.id) };
    case 'sell': return { msgs: sell(ex, d.kind, d.kind === 'item' ? d.id : Number(d.id)) };
    case 'appraise': return { msgs: appraise(ex, Number(d.id)) };
    case 'treat': return { msgs: treat(ex, d.id, rng) };
    case 'retrieve': return { msgs: retrieve(ex, d.id) };
    case 'donate': return { msgs: donate(ex, d.id, 100) };
    case 'save': saveSlot(Number(d.id), ex); return { msgs: [`記録 ${d.id} に記録した`] };
    case 'clearAsk': wipeAsk = Number(d.id); return { msgs: [] };
    case 'resetAsk': wipeAsk = 'reset'; return { msgs: [] };
    case 'wipeNo': wipeAsk = null; return { msgs: [] };
    case 'clearYes': { const n = wipeAsk; wipeAsk = null; clearSlot(n); return { msgs: [`記録 ${n} を消した`] }; }
    case 'resetYes': wipeAsk = null; tab = 'tavern'; return { msgs: ['冒険を最初からやり直した。酒場でパーティを組もう'], replace: newExpedition(FIRST_PARTY) };
    case 'load': { const r = readSlot(Number(d.id)); return r ? { msgs: [`記録 ${d.id} を読み込んだ`], replace: r.data } : { msgs: [] }; }
    case 'export': ioText = exportText(ex); return { msgs: ['記録を書き出した。下の文字列をコピーして保管しよう'] };
    case 'import': {
      try { const data = importText(document.getElementById('io').value); ioText = ''; return { msgs: ['記録を読み込んだ'], replace: data }; }
      catch (e) { return { msgs: [`読み込めなかった：${e.message}`] }; }
    }
    default: return { msgs: [] };
  }
}
