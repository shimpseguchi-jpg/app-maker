// GAS 版をつくる：JS と CSS を1つの gas/index.html にまとめる（GAS のウェブアプリは複数ファイルの ES Modules を読めないため）
// 使い方：(cd world-game/tools && npm i) ; node world-game/tools/build_gas.mjs
import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const r = await build({ entryPoints: [path.join(root, 'js/main.js')], bundle: true, minify: true, format: 'iife', target: 'es2020', write: false, charset: 'utf8', legalComments: 'none' });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
const icon = 'data:image/svg+xml,' + encodeURIComponent(fs.readFileSync(path.join(root, 'icons/icon.svg'), 'utf8'));
const body = fs.readFileSync(path.join(root, 'index.html'), 'utf8').match(/<body>([\s\S]*?)<script/)[1];
const html = `<!doctype html>
<html lang="ja">
<head>
<base target="_top">
<meta charset="utf-8">
<link rel="icon" href="${icon}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@500;700;900&display=swap" rel="stylesheet">
<style>
${css}
</style>
</head>
<body>${body}<script>
${js}
</script>
</body>
</html>
`;
fs.mkdirSync(path.join(root, 'gas'), { recursive: true });
fs.writeFileSync(path.join(root, 'gas/index.html'), html);
console.log(`gas/index.html ${(html.length / 1024).toFixed(0)} KB`);
