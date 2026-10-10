// アイコンの PNG を つくる
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const svg = readFileSync(new URL('../icons/icon.svg', import.meta.url), 'utf8');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const n of [180, 192, 512]) {
  const page = await browser.newPage({ viewport: { width: n, height: n } });
  await page.setContent(`<html><body style="margin:0">${svg.replace('<svg ', `<svg width="${n}" height="${n}" `)}</body></html>`);
  await page.screenshot({ path: new URL(`../icons/icon-${n}.png`, import.meta.url).pathname, omitBackground: true });
  await page.close();
}
await browser.close();
