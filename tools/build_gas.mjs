// Google Apps Script（GAS）で くばる ための「1ファイル版」を つくる
// つかいかた：node tools/build_gas.mjs   → gas/ に Code.gs・arcanumber.html・kazumaho.html が できる
import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'gas');
const ESBUILD = ['-y', 'esbuild@0.24.0'];
const esbuild = (args) => execFileSync('npx', [...ESBUILD, ...args], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 }).toString();

const GAMES = [
  { id: 'arcanumber', dir: 'arcanumber' },
  { id: 'kazumaho', dir: '.' },
];

mkdirSync(OUT, { recursive: true });
const sizes = [];
for (const g of GAMES) {
  const base = join(ROOT, g.dir);
  let html = readFileSync(join(base, 'index.html'), 'utf8');
  // JS：モジュールを 1つに まとめる（ふるい iPad でも うごくように safari14 むけ）
  let js = esbuild([join(g.dir, 'js/main.js'), '--bundle', '--format=iife', '--minify', '--target=safari14', '--charset=utf8', '--legal-comments=none']);
  js = js.replace(/<\/script/gi, '<\\/script');
  const css = esbuild([join(g.dir, 'css/style.css'), '--minify', '--target=safari14', '--charset=utf8']);
  // ファイルを よみこむ タグは GAS では つかえないので はずす（アイコン・マニフェスト）
  html = html
    .replace(/<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\n?/g, '')
    .replace(/<meta name="viewport"[^>]*>\n?/, '') // GAS では Code.gs の addMetaTag で つける
    .replace(/<link rel="stylesheet" href="css\/style\.css">/, () => `<style>\n${css}</style>`)
    .replace(/<script type="module" src="js\/main\.js"><\/script>/, () => `<script>\n${js}</script>`)
    .replace('<head>', '<head>\n<base target="_top">');
  if (html.includes('src="js/') || html.includes('href="css/')) throw new Error(`${g.id}: のこった ファイル よみこみが ある`);
  writeFileSync(join(OUT, `${g.id}.html`), html);
  sizes.push(`${g.id}.html ${(Buffer.byteLength(html) / 1024).toFixed(0)}KB`);
}

writeFileSync(join(OUT, 'Code.gs'), `// アルカナンバー／かずまほ を Google Apps Script の ウェブアプリとして ひらく
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
`);
writeFileSync(join(OUT, 'appsscript.json'), JSON.stringify({
  timeZone: 'Asia/Tokyo',
  exceptionLogging: 'STACKDRIVER',
  runtimeVersion: 'V8',
  webapp: { executeAs: 'USER_DEPLOYING', access: 'ANYONE_ANONYMOUS' },
}, null, 2) + '\n');
console.log('gas/ に できた：', sizes.join(', '));
