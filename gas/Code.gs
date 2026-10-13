// アルカナンバー／かずまほ を Google Apps Script の ウェブアプリとして ひらく
// ・ふつうに ひらく → アルカナンバー
// ・URL の さいごに ?game=kazumaho を つける → かずまほ（kazumaho.html を いれた ときだけ）
function doGet(e) {
  var want = (e && e.parameter && e.parameter.game) || 'arcanumber';
  var game = want === 'kazumaho' ? 'kazumaho' : 'arcanumber';
  var titles = { arcanumber: 'アルカナンバー', kazumaho: 'かずまほ' };
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
