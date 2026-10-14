/**
 * 世界統一ゲーム GAS 版（ウェブアプリ）
 * - doGet で index.html（ゲーム本体を1つにまとめたもの）を返す
 * - セーブは「学校のアカウント1つにつき1つ」。先生のスプレッドシートに保存する
 *
 * デプロイ：実行するユーザー＝自分（先生）／アクセスできるユーザー＝（学校のドメイン）内の全員
 * はじめに一度、エディタで setup を実行して許可を出しておく（保存先のスプレッドシートができる）
 */
const SHEET = 'セーブ';
const HEAD = ['アカウント', '更新', 'モード', '年', '国', 'じょうたい', '点数', '設定', 'セーブ1', 'セーブ2', 'セーブ3', 'セーブ4', 'セーブ5', 'セーブ6', 'セーブ7', 'セーブ8'];
const SAVE_COL = 9;   // セーブ1 の列（I）
const CHUNK = 40000;  // 1セルに入れる文字数（セルの上限は5万字）
const MAX_CHUNKS = HEAD.length - SAVE_COL + 1;
const STATUS = { playing: 'プレイ中', clear: 'クリア', timeup: 'タイムアップ', env: '環境の破綻', nuke: '核戦争', conquest: '世界征服', annexed: '併合された' };

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('世界統一ゲーム')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
}

// 先生がエディタで一度だけ実行する：許可を出し、保存用スプレッドシートを作ってURLをログに出す
function setup() {
  const sh = sheet_();
  Logger.log('セーブの保存先：' + sh.getParent().getUrl());
}

// ゲームが最初に呼ぶ：このアカウントのセーブを返す
function wgLoad() {
  const email = who_();
  if (!email) return { user: null };
  const sh = sheet_();
  const r = findRow_(sh, email);
  const out = { user: uid_(email), save: null, settings: null, updated: 0 };
  if (!r) return out;
  const row = sh.getRange(r, 1, 1, HEAD.length).getValues()[0];
  out.updated = row[1] instanceof Date ? row[1].getTime() : 0;
  out.settings = unpackData_(row[7]) || null;
  out.save = row.slice(SAVE_COL - 1).map(unpackData_).join('') || null;
  return out;
}

// ゲームが保存のたびに呼ぶ：p = { save?: 文字列|null, settings?: 文字列, meta?: {...} }
// 一人一行なので、ふだんはロックしない（クラスみんなが同時に保存しても待たせない）。行を新しく作るときだけロックする
function wgSave(p) {
  const email = who_();
  if (!email) throw new Error('アカウントが確認できません');
  if (p.save && p.save.length > CHUNK * MAX_CHUNKS) throw new Error('セーブが大きすぎます');
  const sh = sheet_();
  const r = findRow_(sh, email) || addRow_(sh, email);
  const range = sh.getRange(r, 1, 1, HEAD.length);
  const row = range.getValues()[0].map(function (v, i) { return i === 1 ? v : i >= 7 ? packData_(unpackData_(v)) : pack_(unpack_(v)); });
  const now = new Date();
  row[0] = pack_(email);
  row[1] = now;
  if (p.meta) {
    const m = p.meta;
    row[2] = pack_(m.mode); row[3] = pack_(String(m.year)); row[4] = pack_(m.country);
    row[5] = pack_(STATUS[m.status] || m.status); row[6] = m.score === '' ? '' : Number(m.score) || 0;
  } else {
    row[6] = unpack_(row[6]) === '' ? '' : Number(unpack_(row[6])) || 0;
  }
  if (p.settings !== undefined) row[7] = packData_(p.settings);
  if (p.save !== undefined) {
    for (let i = 0; i < MAX_CHUNKS; i++) row[SAVE_COL - 1 + i] = p.save ? packData_(p.save.slice(i * CHUNK, (i + 1) * CHUNK)) : '';
  }
  range.setValues([row]);
  return now.getTime();
}

function addRow_(sh, email) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const r = findRow_(sh, email);
    if (r) return r;
    sh.appendRow([pack_(email)]);
    SpreadsheetApp.flush();
    return sh.getLastRow();
  } finally {
    lock.releaseLock();
  }
}

// ───── ここから下は内部用 ─────
function who_() {
  return (Session.getActiveUser().getEmail() || '').toLowerCase();
}

// 端末に保存するときの名前（メールアドレスそのものは端末に置かない）
function uid_(email) {
  const d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, email, Utilities.Charset.UTF_8);
  return d.slice(0, 8).map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}

// セルに入れる文字列は先頭に ' をつけて、数式・数字・日付に化けないようにする
function pack_(s) { return s == null || s === '' ? '' : "'" + s; }
function unpack_(v) { return v == null ? '' : String(v).replace(/^'/, ''); }
// セーブ・設定は先頭に ~ もつける（中身が ' で始まっても、こわれずに戻すため）
function packData_(s) { return s ? "'~" + s : ''; }
function unpackData_(v) { const t = v == null ? '' : String(v).replace(/^'/, ''); return t.charAt(0) === '~' ? t.slice(1) : t; }

function sheet_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SHEET_ID');
  if (id) {
    try { return SpreadsheetApp.openById(id).getSheetByName(SHEET); } catch (e) { /* 消されていたら作り直す */ }
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const again = props.getProperty('SHEET_ID');
    if (again && again !== id) return SpreadsheetApp.openById(again).getSheetByName(SHEET);
    const ss = SpreadsheetApp.create('世界統一ゲーム セーブ');
    const sh = ss.getSheets()[0];
    sh.setName(SHEET);
    sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange(2, 2, sh.getMaxRows() - 1, 1).setNumberFormat('yyyy/mm/dd hh:mm');
    sh.hideColumns(8, HEAD.length - 7);
    props.setProperty('SHEET_ID', ss.getId());
    return sh;
  } finally {
    lock.releaseLock();
  }
}

function findRow_(sh, email) {
  const n = sh.getLastRow();
  if (n < 2) return 0;
  const col = sh.getRange(2, 1, n - 1, 1).getValues();
  for (let i = 0; i < col.length; i++) if (unpack_(col[i][0]).toLowerCase() === email) return i + 2;
  return 0;
}
