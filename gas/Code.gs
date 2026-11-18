// アルカナンバー を Google Apps Script の ウェブアプリとして ひらく
// ・ふつうに ひらく → アルカナンバー
// ・URL の さいごに ?game=kazumaho を つける → かずまほ（kazumaho.html を いれた ときだけ）
// ・URL の さいごに ?game=keisan を つける → けいさんオリパ（keisan.html を いれた ときだけ）
// ・「きょうの ちょうせん」の ランキングを この スクリプトに ほぞんする（スクリプト プロパティ）
// ・けいさんオリパの セーブ（コインと カード）を たんまつごとに ほぞんする（スクリプト プロパティ）
function doGet(e) {
  var want = (e && e.parameter && e.parameter.game) || 'arcanumber';
  var game = (want === 'kazumaho' || want === 'keisan') ? want : 'arcanumber';
  var titles = { arcanumber: 'アルカナンバー', kazumaho: 'かずまほ', keisan: 'けいさんオリパ' };
  var out;
  try {
    out = HtmlService.createHtmlOutputFromFile(game);
  } catch (err) {
    game = 'arcanumber';
    out = HtmlService.createHtmlOutputFromFile(game);
  }
  out.setTitle(titles[game])
    // Google サイトに うめこめる ように する
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  out.addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
  try { out.addMetaTag('apple-mobile-web-app-capable', 'yes'); } catch (err) { /* なくても うごく */ }
  try { out.addMetaTag('apple-mobile-web-app-title', titles[game]); } catch (err) { /* なくても うごく */ }
  return out;
}

// ───── きょうの ちょうせん ランキング ─────
var DAILY_KEEP = 40;   // 1にちに のこす じゅんい
var DAILY_DAYS = 8;    // なんにち ぶん のこすか
var DAILY_SHOW = 30;   // がめんに だす かず

function dailyDate_(offsetDays) {
  return Utilities.formatDate(new Date(Date.now() + (offsetDays || 0) * 86400000), 'Asia/Tokyo', 'yyyy-MM-dd');
}
function dailyLoad_(props, date) {
  var v = props.getProperty('daily:' + date);
  return v ? JSON.parse(v) : [];
}
function dailyTags_(props, date) {
  var v = props.getProperty('dailytags:' + date);
  return v ? v.split(',') : [];
}
function dailyClean_(e) {
  var num = function (v, lo, hi) { v = Math.floor(Number(v) || 0); return Math.max(lo, Math.min(hi, v)); };
  var name = String(e.n || '').replace(/[<>&"'`\\\u0000-\u001f]/g, '').slice(0, 16);
  return {
    n: name || 'なまえなし',
    g: String(e.g || '').replace(/[^0-9a-z]/g, '').slice(0, 8),
    h: num(e.h, 0, 2),
    s: num(e.s, 0, 99999),
    w: e.w ? 1 : 0,
    a: num(e.a, 1, 3),
    df: e.df === 'easy' ? 'easy' : 'normal',
    t: Date.now()
  };
}

// その ひの ランキングを みる
function getDaily(date) {
  date = String(date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('ひづけが おかしいよ');
  var props = PropertiesService.getScriptProperties();
  return { list: dailyLoad_(props, date).slice(0, DAILY_SHOW), total: dailyTags_(props, date).length };
}

// スコアを のせる（おなじ ひとは いちばん いい スコアだけ のこす）
function submitDaily(entry) {
  var date = String((entry && entry.d) || '');
  if (date !== dailyDate_(0) && date !== dailyDate_(-1)) throw new Error('この ひの ちょうせんは もう おわったよ');
  var e = dailyClean_(entry);
  if (!e.g) throw new Error('なまえの ばんごうが ないよ');
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var props = PropertiesService.getScriptProperties();
    var list = dailyLoad_(props, date);
    var tags = dailyTags_(props, date);
    if (tags.indexOf(e.g) < 0) { tags.push(e.g); props.setProperty('dailytags:' + date, tags.slice(-1500).join(',')); }
    var mine = -1;
    for (var i = 0; i < list.length; i++) if (list[i].g === e.g) mine = i;
    if (mine < 0) list.push(e);
    else if (list[mine].s < e.s) list[mine] = e;
    list.sort(function (a, b) { return b.s - a.s || a.t - b.t; });
    list = list.slice(0, DAILY_KEEP);
    props.setProperty('daily:' + date, JSON.stringify(list));
    // ふるい ひの ランキングを けす
    var oldest = dailyDate_(-DAILY_DAYS);
    props.getKeys().forEach(function (k) {
      var m = /^daily(?:tags)?:(\d{4}-\d{2}-\d{2})$/.exec(k);
      if (m && m[1] < oldest) props.deleteProperty(k);
    });
  } finally {
    lock.releaseLock();
  }
  var rank = 0;
  for (var j = 0; j < list.length; j++) if (list[j].g === e.g) rank = j + 1;
  return { rank: rank, total: tags.length, list: list.slice(0, DAILY_SHOW) };
}

// ───── けいさんオリパの セーブ（たんまつごとに 1つ） ─────
var KEISAN_MAX = 8192;   // セーブ（JSON）の おおきさの うわげん
var KEISAN_BOX = { N: 50, R: 30, SR: 15, SSR: 4, UR: 1 };   // 1はこ 100くちの なかみ

function keisanKey_(devId) {
  devId = String(devId || '');
  if (!/^[0-9a-z]{12}$/.test(devId)) throw new Error('たんまつIDが おかしいよ');
  return 'keisan:' + devId;
}
function keisanClean_(o) {
  if (!o || typeof o !== 'object') throw new Error('セーブが おかしいよ');
  var num = function (v, lo, hi) { v = Math.floor(Number(v) || 0); return Math.max(lo, Math.min(hi, v)); };
  var cards = {}, n = 0, src = (o.cards && typeof o.cards === 'object') ? o.cards : {};
  for (var k in src) {
    if (!/^(?:(?:N|R|SR|SSR|UR)\d{1,2}|LAST)$/.test(k)) continue;
    var c = num(src[k], 0, 99999);
    if (c > 0 && n < 60) { cards[k] = c; n++; }
  }
  var box = {}, left = 0, bsrc = (o.box && typeof o.box === 'object') ? o.box : {};
  for (var r in KEISAN_BOX) { box[r] = num(bsrc[r], 0, KEISAN_BOX[r]); left += box[r]; }
  if (!left) box = JSON.parse(JSON.stringify(KEISAN_BOX));   // からの はこは ない（ひききったら あたらしい はこに なる）
  var last = String(o.last || '');
  return {
    coins: num(o.coins, 0, 9999999),
    cards: cards,
    box: box,
    boxNo: num(o.boxNo, 1, 99999),
    last: /^\d{4}-\d{1,2}-\d{1,2}$/.test(last) ? last : '',
    mute: !!o.mute,
    combo: num(o.combo, 0, 9999),   // れんぞく せいかいの かず（ふるい セーブは 0）
    updatedAt: num(o.updatedAt, 0, Date.now() + 86400000)
  };
}

// セーブを よむ（ない ときは ''）
function loadKeisan(devId) {
  var key = keisanKey_(devId);
  return PropertiesService.getScriptProperties().getProperty(key) || '';
}

// セーブを かく
function saveKeisan(devId, json) {
  var key = keisanKey_(devId);
  json = String(json || '');
  if (json.length > KEISAN_MAX) throw new Error('セーブが おおきすぎるよ');
  var o = keisanClean_(JSON.parse(json));
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    PropertiesService.getScriptProperties().setProperty(key, JSON.stringify(o));
  } finally {
    lock.releaseLock();
  }
  return { ok: true, updatedAt: o.updatedAt };
}
