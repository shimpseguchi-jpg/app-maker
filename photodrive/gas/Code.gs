/**
 * 撮ってDrive の受け口（Google Apps Script ウェブアプリ）
 *
 * アプリから「この名前・大きさのファイルを送りたい」と頼まれたら、
 * 指定フォルダに Google Drive の「再開可能アップロード」の受付を作って、その URL を返す。
 * ファイルの中身はアプリから Drive へ直接送られる（GAS の容量制限を受けないので動画も送れる）。
 */

// ▼ ここを書き換える ------------------------------------------------------
// 保存先フォルダの ID（フォルダを開いたときの URL の …/folders/ 以降の部分）
const FOLDER_ID = 'ここにフォルダIDを貼る';
// 合言葉。アプリの設定にも同じものを入れる（推測されにくい長い文字列にする）
const TOKEN = 'ここに合言葉を書く';
// ------------------------------------------------------------------------

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    if (!TOKEN || TOKEN.indexOf('ここに') === 0 || req.token !== TOKEN) {
      return reply_({ ok: false, error: '合言葉が違います' });
    }
    const folder = DriveApp.getFolderById(FOLDER_ID);
    if (req.action === 'ping') {
      return reply_({ ok: true, folder: folder.getName() });
    }
    if (req.action === 'start') {
      return reply_({ ok: true, uploadUrl: startUpload_(req, folder.getId()) });
    }
    return reply_({ ok: false, error: '不明な操作です' });
  } catch (err) {
    return reply_({ ok: false, error: String(err && err.message || err) });
  }
}

function doGet() {
  return ContentService.createTextOutput('撮ってDrive の受け口です。アプリの設定にこの URL を入れてください。');
}

function startUpload_(req, folderId) {
  const name = String(req.name || '').replace(/[\\/:*?"<>|]/g, '_').slice(0, 200);
  const mimeType = String(req.mimeType || '');
  const size = Number(req.size);
  if (!name || !/^(image|video)\//.test(mimeType) || !(size > 0)) throw new Error('ファイル情報が不正です');

  const res = UrlFetchApp.fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true',
    {
      method: 'post',
      contentType: 'application/json; charset=UTF-8',
      headers: {
        Authorization: 'Bearer ' + ScriptApp.getOAuthToken(),
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': String(size),
      },
      payload: JSON.stringify({ name: name, parents: [folderId] }),
      muteHttpExceptions: true,
    }
  );
  const headers = res.getAllHeaders();
  const location = headers.Location || headers.location;
  if (res.getResponseCode() !== 200 || !location) {
    throw new Error('Drive の受付を作れませんでした（' + res.getResponseCode() + '）');
  }
  return location;
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** 最初に1回、エディタからこれを実行して権限を許可する（フォルダ名が表示されれば OK）。 */
function setup() {
  Logger.log('保存先フォルダ: ' + DriveApp.getFolderById(FOLDER_ID).getName());
  // Drive API を使う権限も一緒に許可させるための呼び出し
  UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
  });
  Logger.log('準備 OK');
}
