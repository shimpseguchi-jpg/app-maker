// 道の駅チェック：2人で記録を共有するための保存係（Google Apps Script のウェブアプリ）
// ・アプリ本体（GitHub Pages）から 合言葉クイズの答え と 記録 が送られてくる
// ・答えが合っていれば、記録を この スクリプトのプロパティ に保存し、まとめた結果を返す
// ・アプリには正解を書いていない（ここでだけ判定する）。本当のカギはこのウェブアプリの URL なので、URL は2人以外に教えない

var ANSWER = 'ノクチル'; // 合言葉クイズ「THE虎牙道」の正解（変えるときはアプリ側の選択肢も合わせる）
var MAX_ITEMS = 300;    // 1つの合言葉で保存する駅の数の上限（いまは103駅）
var MAX_BYTES = 9000;   // スクリプトプロパティ1件の上限（約9KB）に収める

function doGet() {
  return ContentService.createTextOutput('道の駅チェックの同期サーバーです。アプリの「2人で共有」にこのURLを入れてください。');
}

function doPost(e) {
  var out;
  try {
    var req = JSON.parse(e.postData.contents);
    var pass = String(req.pass || '');
    if (pass !== ANSWER) return json_({ ok: false, error: 'pass' });
    var key = 'room:' + hash_(pass);
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var props = PropertiesService.getScriptProperties();
      var cur = JSON.parse(props.getProperty(key) || '{}');
      if (mergeItems_(cur, req.items || {})) {
        var text = JSON.stringify(cur);
        if (text.length > MAX_BYTES) return json_({ ok: false, error: 'full' });
        props.setProperty(key, text);
      }
      out = { ok: true, items: cur };
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    out = { ok: false, error: String(err) };
  }
  return json_(out);
}

// 駅ごとに「あとから変えたほう」を残す。items は { 駅ID: [状態, 日付, 変えた時刻] }
// 状態は 'done'（行った）・'plan'（行く予定）・''（どちらでもない）
function mergeItems_(cur, incoming) {
  var changed = false;
  var count = Object.keys(cur).length;
  for (var id in incoming) {
    var v = incoming[id];
    if (!/^[^\s-]{1,6}-\d{2}$/.test(id) || !Array.isArray(v) || v.length !== 3) continue;
    var s = v[0], d = v[1], t = v[2];
    if (['done', 'plan', ''].indexOf(s) < 0 || typeof d !== 'string' || d.length > 10 || typeof t !== 'number') continue;
    if (!cur[id]) {
      if (count >= MAX_ITEMS) continue;
      count++;
    } else if (cur[id][2] >= t) {
      continue;
    }
    cur[id] = [s, d, t];
    changed = true;
  }
  return changed;
}

function hash_(pass) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'michinoeki:' + pass, Utilities.Charset.UTF_8);
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
