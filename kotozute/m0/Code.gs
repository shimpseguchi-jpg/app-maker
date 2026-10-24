// ことづてむら 試作（M0）
// 学校の iPad で「できるかどうか」を確かめるための小さなウェブアプリ。
// 先生の学校アカウントで公開する（次のユーザーとして実行：自分／アクセスできるユーザー：学校のドメイン内の全員）。
// 結果は、このスクリプトが作るスプレッドシートに1行ずつたまる。子どものメールアドレスは一部だけ残す。

var SHEET_NAME = 'ことづてむら 試作（M0）けっか';
var FOLDER_NAME = 'ことづてむら 試作（M0）しゃしん';
var HEADERS = {
  'けっか': ['日時', 'アカウント（一部）', 'iPad の番号', '項目', '結果', 'くわしく', 'iPad の情報'],
  'どうじ': ['日時', 'アカウント（一部）', 'iPad の番号', '何番目', '何回目でとどいたか']
};
var MAX_TEXT = 500;
var MAX_IMAGE_B64 = 8 * 1024 * 1024;

function doGet() {
  return HtmlService.createHtmlOutputFromFile('m0')
    .setTitle('ことづてむら しさく')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
}

// 公開の前に、エディタで1回だけ実行する（スプレッドシートとフォルダを作り、許可をもらう）
function setup() {
  var s = store_();
  Logger.log('スプレッドシート：' + s.ss.getUrl());
  Logger.log('しゃしんのフォルダ：' + s.folder.getUrl());
}

// ---- 画面から呼ぶもの（名前の最後に _ がないもの） ----

// 開いた人のアカウント。同じ学校のドメインかどうかも返す
function whoami() {
  var email = Session.getActiveUser().getEmail();
  var owner = Session.getEffectiveUser().getEmail();
  return { email: email, sameDomain: !!email && domain_(email) === domain_(owner), ownerDomain: domain_(owner) };
}

// 1つの項目の結果を残す
function saveCheck(rec) {
  rec = rec || {};
  append_('けっか', [new Date(), who_(), text_(rec.device), text_(rec.item), rec.ok ? 'できた' : 'できない', text_(rec.detail), text_(rec.ua)]);
  return { ok: true };
}

// 写真や手書きの画像をフォルダに入れる
function saveImage(p) {
  p = p || {};
  var m = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+\/=]+)$/.exec(String(p.dataUrl || ''));
  if (!m) throw new Error('画像の形がちがいます');
  if (m[2].length > MAX_IMAGE_B64) throw new Error('画像が大きすぎます');
  var started = Date.now();
  var kind = p.kind === 'hand' ? 'てがき' : 'カメラ';
  var ext = m[1] === 'image/png' ? '.png' : '.jpg';
  var name = kind + '_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss') + '_' + text_(p.device) + ext;
  var blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], name);
  var file = store_().folder.createFile(blob);
  var kb = Math.round(blob.getBytes().length / 1024);
  return { url: file.getUrl(), kb: kb, serverMs: Date.now() - started };
}

// 「いっせいに おくる」の1件
function burst(p) {
  p = p || {};
  append_('どうじ', [new Date(), who_(), text_(p.device), Number(p.seq) || 0, Number(p.attempt) || 0]);
  return { ok: true, at: Date.now() };
}

// さいごの minutes 分間に「いっせいに おくる」でとどいた数
function burstSummary(minutes) {
  var since = Date.now() - (Number(minutes) || 3) * 60 * 1000;
  var sh = sheet_('どうじ');
  var rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 5).getValues() : [];
  var devices = {}, n = 0, retried = 0, maxAttempt = 0;
  rows.forEach(function (r) {
    if (!(r[0] instanceof Date) || r[0].getTime() < since) return;
    n++;
    devices[r[2]] = true;
    if (r[4] > 1) retried++;
    if (r[4] > maxAttempt) maxAttempt = r[4];
  });
  return { rows: n, devices: Object.keys(devices).length, retried: retried, maxAttempt: maxAttempt };
}

// ---- 中だけで使うもの ----

function store_() {
  var props = PropertiesService.getScriptProperties();
  var found = open_(props);
  if (found) return found;
  // 何人も同時に開いたときに、2つ作ってしまわないようにする
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    found = open_(props);
    if (found) return found;
    var ss = SpreadsheetApp.create(SHEET_NAME);
    Object.keys(HEADERS).forEach(function (name, i) {
      var sh = i === 0 ? ss.getSheets()[0].setName(name) : ss.insertSheet(name);
      sh.appendRow(HEADERS[name]);
      sh.setFrozenRows(1);
    });
    var folder = DriveApp.createFolder(FOLDER_NAME);
    props.setProperty('ssId', ss.getId());
    props.setProperty('folderId', folder.getId());
    return { ss: ss, folder: folder };
  } finally {
    lock.releaseLock();
  }
}

function open_(props) {
  var ssId = props.getProperty('ssId'), folderId = props.getProperty('folderId');
  if (!ssId || !folderId) return null;
  return { ss: SpreadsheetApp.openById(ssId), folder: DriveApp.getFolderById(folderId) };
}

function sheet_(name) {
  return store_().ss.getSheetByName(name);
}

function append_(name, row) {
  var sh = sheet_(name);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    sh.appendRow(row);
  } finally {
    lock.releaseLock();
  }
}

// メールアドレスは「先頭2文字…@ドメイン」だけ残す（見分けられたかどうかが分かれば足りる）
function who_() {
  var email = Session.getActiveUser().getEmail();
  if (!email) return '（とれない）';
  return email.slice(0, 2) + '…@' + domain_(email);
}

function domain_(email) {
  return email ? String(email).split('@')[1] || '' : '';
}

function text_(v) {
  return String(v == null ? '' : v).slice(0, MAX_TEXT);
}
