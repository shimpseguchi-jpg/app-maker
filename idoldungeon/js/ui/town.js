// 劇中の街の画面（施設はタブで切り替え）。ルールは engine/town.js
import { SONGS } from '../data/songs.js';
import { CLASSES, PROMOTE_LEVEL } from '../data/classes.js';
import { IDOLS, IDOL_LIST } from '../data/idols.js';
import { BASE_STATS, STAT_NAME } from '../engine/party.js';
import { SPELL_LIST } from '../data/spells.js';
import { ITEMS } from '../data/items.js';
import { CONDITIONS } from '../engine/revive.js';
import { getFloor } from '../engine/dungeon.js';
import { partyView, scoreName, unitOf, enterDungeon, openDungeons } from '../engine/expedition.js';
import { roster, joinParty, leaveParty, moveMember, equip, appraiseAll, hasAppraiser, ROOMS, roomFee, stay, expToNext,
  shopList, buy, sellList, sell, appraise, appraiseFee, treat, treatFee, retrieve, retrieveFee, donate, bestiary,
  trainingInfo, doChangeClass, doPromote } from '../engine/town.js';
import { SLOTS, saveSlot, readSlot, exportText, importText } from '../save.js';

export const TABS = [['tavern', '酒場'], ['inn', '宿屋'], ['shop', '商店'], ['temple', '寺院'], ['training', '訓練所'], ['castle', '城'], ['record', '記録']];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let tab = 'tavern';
let shopMode = 'buy';
let ioText = '';
let trainee = null;   // 訓練所で選んでいるアイドル
let confirm = null;   // 転職・昇格の確認待ち { kind, cls, item }

export function renderTown(ex) {
  const tabs = TABS.map(([id, nm]) => `<button data-tab="${id}" class="${id === tab ? 'on' : ''}">${nm}</button>`).join('');
  const body = { tavern, inn, shop, temple, training, castle, record }[tab](ex);
  return `<div class="tabs town-tabs">${tabs}</div><div class="town-body">${body}</div>
    <div class="town-go">${openDungeons(ex).map((d) => `<button data-t="enter" data-id="${d.id}" ${ex.slots.length ? '' : 'disabled'}>${esc(d.name)}へ <small>${d.floors.length}階</small></button>`).join('')}</div>`;
}

function tavern(ex) {
  const party = partyView(ex);
  const list = roster(ex);
  const worn = new Set(Object.values(ex.equip));
  const known = ex.scores.filter((sc) => sc.known);
  const songOpts = (id) => `<option value="">（楽譜なし）</option>` + known.map((sc) =>
    `<option value="${sc.uid}" ${ex.equip[id] === sc.uid ? 'selected' : ''} ${worn.has(sc.uid) && ex.equip[id] !== sc.uid ? 'disabled' : ''}>★${SONGS[sc.song].rank} ${esc(SONGS[sc.song].title)}</option>`).join('');
  const rows = party.map((m, i) => `${i === 0 ? '<div class="row-label">前列</div>' : i === 3 ? '<div class="row-label">後列</div>' : ''}
    <div class="tv-row" style="--c:${m.idol.color}">
      <b>${esc(m.idol.name)}</b> <small class="sub">${esc(CLASSES[m.cls].name)} Lv${m.level}</small>
      ${m.cond !== 'ok' ? `<span class="cond ${m.cond}">${CONDITIONS[m.cond].name}</span>` : ''}
      <select data-equip="${m.id}" aria-label="楽譜">${songOpts(m.id)}</select>
      <span class="moves"><button data-up="${m.id}" aria-label="前へ">▲</button><button data-down="${m.id}" aria-label="後ろへ">▼</button><button data-leave="${m.id}">外す</button></span>
    </div>`).join('');
  const waiting = list.filter((r) => !r.inParty).map((r) => `<button data-join="${r.id}" ${r.lost ? 'disabled' : ''} style="--c:${r.idol.color}" class="wait">
    ${esc(r.idol.name)} <small>${esc(CLASSES[r.cls].name)} Lv${r.level}${r.lost ? '・迷宮に取り残されている' : r.cond !== 'ok' ? '・' + CONDITIONS[r.cond].name : ''}</small></button>`).join('');
  const unknown = ex.scores.filter((sc) => !sc.known).length;
  return `<h3>パーティ <small class="sub">${party.length}/6人。先頭3人が前列</small></h3>
    <div class="tv-party">${rows || '<p class="sub">だれもいない。下から選んで加えよう</p>'}</div>
    <h3>待機中のアイドル</h3><div class="wait-grid">${waiting}</div>
    <h3>楽譜</h3>
    <p class="sub">鑑定済み ${known.length}・未鑑定 ${unknown}${unknown ? (hasAppraiser(ex) ? '' : '（ビショップがいれば、ここでまとめて鑑定できる。商店でも有料で鑑定できる）') : ''}</p>
    ${unknown && hasAppraiser(ex) ? '<button data-t="appraiseAll">まとめて鑑定</button>' : ''}
    <p class="sub">パーティ編成画面（party.html）はシナジーを試すための場所です。冒険のパーティはこの酒場で組みます。</p>`;
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
    body = `<div class="shop">${shopList(ex).map((it) => `<button data-t="buy" data-id="${it.id}" ${it.stock <= 0 || ex.gold < it.price ? 'disabled' : ''}>${esc(it.name)} <small>${it.price}G${it.stock === Infinity ? '' : ` 残り${it.stock}`}${it.kind === 'song' ? '・' + esc(songNote(it.id)) : ''}</small></button>`).join('')}</div>`;
  } else if (shopMode === 'sell') {
    const list = sellList(ex);
    body = list.length ? `<div class="shop">${list.map((it) => `<button data-t="sell" data-kind="${it.kind}" data-id="${it.ref}">${esc(it.name)} <small>${it.price}G で売る</small></button>`).join('')}</div>` : '<p class="sub">売れるものがない（装備中の楽譜は売れない）</p>';
  } else {
    const list = ex.scores.filter((sc) => !sc.known);
    body = list.length ? `<div class="shop">${list.map((sc) => `<button data-t="appraise" data-id="${sc.uid}" ${ex.gold < appraiseFee(sc.song) ? 'disabled' : ''}>${esc(scoreName(sc))} <small>${appraiseFee(sc.song)}G</small></button>`).join('')}</div>` : '<p class="sub">未鑑定の楽譜はない</p>';
  }
  return `<div class="tabs sub-tabs">${modes}</div>${body}`;
}
const songNote = (id) => SONGS[id].effects.map((e) => e.name || '').filter(Boolean).join('・') || (SONGS[id].live ? `ライブ「${SONGS[id].live.name}」` : '能力アップ');

function temple(ex) {
  const list = roster(ex);
  const sick = list.filter((r) => ['dead', 'ash', 'paralyze', 'stone', 'poison'].includes(r.cond) && !r.lost);
  const lost = list.filter((r) => r.lost);
  return `<h3>治療・蘇生 <small class="sub">料金はレベルに応じる。灰の蘇生に失敗しても灰のまま</small></h3>
    ${sick.length ? `<div class="town-grid">${sick.map((r) => `<button data-t="treat" data-id="${r.id}">${esc(r.idol.name)} <small>${CONDITIONS[r.cond].name}・${treatFee(ex, r.id)}G</small></button>`).join('')}</div>` : '<p class="sub">治療が必要な仲間はいない</p>'}
    <h3>死体の回収</h3>
    ${lost.length ? `<div class="town-grid">${lost.map((r) => { const at = ex.lost[r.id]; return `<button data-t="retrieve" data-id="${r.id}">${esc(r.idol.name)} <small>${retrieveFee(ex, r.id)}G・${getFloor(at.dungeon || 'd1', at.floor).name} X${at.x} Y${at.y}</small></button>`; }).join('')}</div>
      <p class="sub">自分たちで探しに行けば無料（そのマスに行くと連れて帰る。パーティに空きが必要）</p>` : '<p class="sub">迷宮に取り残された仲間はいない</p>'}
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
    ${Object.keys(clears).length ? `<p class="sub">ボス撃破：${Object.values(clears).map((c) => `${c}回`).join('、')}（倒したボスは強化されて再出現する）</p>` : ''}
    <p class="sub">${ex.items.length ? '持っている昇格アイテム：' + [...new Set(ex.items)].map((id) => `${ITEMS[id].name}×${ex.items.filter((x) => x === id).length}`).join('、') : ''}</p>`;
}

function record() {
  return `<p class="sub">冒険は自動で保存されています。ここでは、別の記録枠に残したり、文字列で書き出したりできます。</p>
    <div class="town-grid">${SLOTS.map((n) => { const r = readSlot(n); return `<div class="slot"><b>記録 ${n}</b> <small class="sub">${r ? `${esc(r.summary)}<br>${new Date(r.savedAt).toLocaleString('ja-JP')}` : '空き'}</small>
      <div class="row"><button data-t="save" data-id="${n}">ここに記録</button><button data-t="load" data-id="${n}" ${r ? '' : 'disabled'}>読み込む</button></div></div>`; }).join('')}</div>
    <h3>書き出し・読み込み</h3>
    <div class="row"><button data-t="export">書き出す</button><button data-t="import">貼り付けた文字列を読み込む</button></div>
    <textarea id="io" rows="3" placeholder="ここに記録の文字列">${esc(ioText)}</textarea>`;
}

// クリック・変更の処理。戻り値 { msgs, replace?: 新しい冒険データ }
export function townAction(ex, el, rng = Math.random) {
  const d = el.dataset;
  if (d.tab) { tab = d.tab; return { msgs: [] }; }
  if (d.shop) { shopMode = d.shop; return { msgs: [] }; }
  if (d.trainee) { trainee = d.trainee; confirm = null; return { msgs: [] }; }
  if (d.join) return { msgs: joinParty(ex, d.join) };
  if (d.leave) return { msgs: leaveParty(ex, d.leave) };
  if (d.up) return { msgs: moveMember(ex, d.up, -1) };
  if (d.down) return { msgs: moveMember(ex, d.down, 1) };
  if (d.equip) return { msgs: equip(ex, d.equip, el.value ? Number(el.value) : null) };
  switch (d.t) {
    case 'enter': return { msgs: enterDungeon(ex, d.id) };
    case 'appraiseAll': return { msgs: appraiseAll(ex) };
    case 'change': confirm = { kind: 'change', cls: d.cls }; return { msgs: [] };
    case 'promote': confirm = { kind: 'promote', cls: d.cls, item: d.item }; return { msgs: [] };
    case 'trainNo': confirm = null; return { msgs: [] };
    case 'trainYes': {
      const c = confirm; confirm = null;
      return { msgs: c.kind === 'change' ? doChangeClass(ex, trainee, c.cls) : doPromote(ex, trainee, c.cls, c.item) };
    }
    case 'stay': return { msgs: stay(ex, d.id, rng) };
    case 'buy': return { msgs: buy(ex, d.id) };
    case 'sell': return { msgs: sell(ex, d.kind, d.kind === 'score' ? Number(d.id) : d.id) };
    case 'appraise': return { msgs: appraise(ex, Number(d.id)) };
    case 'treat': return { msgs: treat(ex, d.id, rng) };
    case 'retrieve': return { msgs: retrieve(ex, d.id) };
    case 'donate': return { msgs: donate(ex, d.id, 100) };
    case 'save': saveSlot(Number(d.id), ex); return { msgs: [`記録 ${d.id} に記録した`] };
    case 'load': { const r = readSlot(Number(d.id)); return r ? { msgs: [`記録 ${d.id} を読み込んだ`], replace: r.data } : { msgs: [] }; }
    case 'export': ioText = exportText(ex); return { msgs: ['記録を書き出した。下の文字列をコピーして保管しよう'] };
    case 'import': {
      try { const data = importText(document.getElementById('io').value); ioText = ''; return { msgs: ['記録を読み込んだ'], replace: data }; }
      catch (e) { return { msgs: [`読み込めなかった：${e.message}`] }; }
    }
    default: return { msgs: [] };
  }
}
