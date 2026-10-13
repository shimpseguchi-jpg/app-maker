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

// base64 を もどして CSS と JS を うごかす（この なかには「+」を つかわない）
const LOADER = `(function () {
  function unpack(id) {
    var el = document.getElementById(id);
    var t = el.textContent.replace(/[\\r\\n\\t]/g, '').replace(/ /g, '\\x2b');
    el.parentNode.removeChild(el);
    var bin = atob(t), n = bin.length, u = new Uint8Array(n);
    for (var i = 0; i < n; i = i - (-1)) u[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8').decode(u);
  }
  var st = document.createElement('style');
  st.textContent = unpack('pack-css');
  document.head.appendChild(st);
  var code = 'window.__packRan = 1;'.concat(code0());
  function code0() { return unpack('pack-js'); }
  var sc = document.createElement('script');
  sc.text = code;
  document.body.appendChild(sc);
  // まんいち うごかなかった ときの よびだし
  if (!window.__packRan) { try { (0, eval)(code); } catch (e) { /* エラーは がめんに でる */ } }
})();
`;
mkdirSync(OUT, { recursive: true });
const sizes = [];
for (const g of GAMES) {
  const base = join(ROOT, g.dir);
  let html = readFileSync(join(base, 'index.html'), 'utf8');
  // JS：モジュールを 1つに まとめる（ふるい iPad でも うごくように safari14 むけ）
  const js = esbuild([join(g.dir, 'js/main.js'), '--bundle', '--format=iife', '--minify', '--target=safari14', '--charset=utf8', '--legal-comments=none']);
  const css = esbuild([join(g.dir, 'css/style.css'), '--minify', '--target=safari14', '--charset=utf8']);
  // GAS は くばる ときに おおきな スクリプトを こわす ことが あるので、JS と CSS は
  // 英数字だけの base64 にして いれておき、ブラウザの なかで もとに もどして うごかす
  const b64 = (str) => Buffer.from(str, 'utf8').toString('base64').replace(/.{1,100}/g, '$&\n');
  // ファイルを よみこむ タグは GAS では つかえないので はずす（アイコン・マニフェスト）
  html = html
    .replace(/<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\n?/g, '')
    .replace(/<meta name="viewport"[^>]*>\n?/, '') // GAS では Code.gs の addMetaTag で つける
    .replace(/<link rel="stylesheet" href="css\/style\.css">\n?/, '')
    .replace(/<script type="module" src="js\/main\.js"><\/script>/, () => `<div id="pack-css" hidden>\n${b64(css)}</div>\n<div id="pack-js" hidden>\n${b64(js)}</div>\n<script>\n${LOADER}</script>`)
    .replace('<head>', '<head>\n<base target="_top">');
  if (html.includes('src="js/') || html.includes('href="css/')) throw new Error(`${g.id}: のこった ファイル よみこみが ある`);
  writeFileSync(join(OUT, `${g.id}.html`), html);
  sizes.push(`${g.id}.html ${(Buffer.byteLength(html) / 1024).toFixed(0)}KB`);
}

// Code.gs は tools/gas_Code.gs を そのまま つかう（ランキングの サーバーも はいっている）
writeFileSync(join(OUT, 'Code.gs'), readFileSync(join(ROOT, 'tools/gas_Code.gs'), 'utf8'));
writeFileSync(join(OUT, 'appsscript.json'), JSON.stringify({
  timeZone: 'Asia/Tokyo',
  exceptionLogging: 'STACKDRIVER',
  runtimeVersion: 'V8',
  webapp: { executeAs: 'USER_DEPLOYING', access: 'ANYONE_ANONYMOUS' },
}, null, 2) + '\n');
console.log('gas/ に できた：', sizes.join(', '));
