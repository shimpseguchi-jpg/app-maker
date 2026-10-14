// 地図データの生成：Natural Earth（world-atlas, 110m）の実在の国を、ゲームの46カ国にまとめて SVG パスにする
// 使い方：cd world-game/tools && npm install && node build_map.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as topo from 'topojson-client';

const require = createRequire(import.meta.url);
const world = JSON.parse(readFileSync(require.resolve('world-atlas/countries-110m.json'), 'utf8'));

// 実在の国（Natural Earth の name） → ゲームの国 ID
const GROUPS = {
  M01: ['United States of America', 'Canada'],
  M02: ['Brazil'],
  M03: ['Argentina', 'Chile', 'Falkland Is.'],
  M04: ['United Kingdom', 'Ireland', 'Iceland'],
  M05: ['Germany', 'France', 'Netherlands', 'Belgium', 'Luxembourg', 'Switzerland', 'Austria', 'Czechia', 'Denmark'],
  M06: ['Norway', 'Sweden', 'Finland', 'Greenland', 'Estonia', 'Latvia', 'Lithuania'],
  M07: ['Russia', 'Belarus'],
  M08: ['Saudi Arabia', 'United Arab Emirates', 'Qatar', 'Kuwait', 'Oman'],
  M09: ['Egypt', 'Libya', 'Algeria', 'Tunisia', 'Morocco', 'W. Sahara', 'Mauritania', 'Mali', 'Niger', 'Chad', 'Sudan'],
  M10: ['South Africa', 'Lesotho', 'eSwatini', 'Botswana', 'Namibia'],
  M11: ['India', 'Bangladesh', 'Sri Lanka'],
  M12: ['China', 'North Korea', 'South Korea'],
  M13: ['Japan'],
  M14: ['Malaysia', 'Brunei'],
  M15: ['Indonesia', 'Timor-Leste', 'Papua New Guinea'],
  M16: ['Australia', 'New Zealand'],
  B01: ['Mexico', 'Guatemala', 'Belize', 'El Salvador', 'Honduras'],
  B02: ['Nicaragua', 'Costa Rica', 'Panama'],
  B03: ['Cuba', 'Haiti', 'Dominican Rep.', 'Jamaica', 'Bahamas', 'Puerto Rico', 'Trinidad and Tobago'],
  B04: ['Peru', 'Ecuador', 'Bolivia'],
  B05: ['Paraguay', 'Uruguay'],
  B06: ['Guyana', 'Suriname'],
  B07: ['Venezuela', 'Colombia'],
  B08: ['Spain', 'Portugal'],
  B09: ['Italy', 'Slovenia'],
  B10: ['Greece', 'Cyprus', 'N. Cyprus', 'Bulgaria'],
  B11: ['Poland', 'Ukraine', 'Moldova', 'Slovakia', 'Hungary', 'Romania'],
  B12: ['Croatia', 'Bosnia and Herz.', 'Serbia', 'Montenegro', 'Kosovo', 'Albania', 'Macedonia'],
  B13: ['Iran'],
  B14: ['Syria', 'Lebanon', 'Israel', 'Palestine', 'Jordan', 'Iraq'],
  B15: ['Turkey', 'Georgia', 'Armenia', 'Azerbaijan'],
  B16: ['Yemen'],
  B17: ['S. Sudan', 'Ethiopia', 'Eritrea', 'Uganda'],
  B18: ['Dem. Rep. Congo', 'Congo', 'Central African Rep.', 'Gabon', 'Cameroon', 'Eq. Guinea', 'Rwanda', 'Burundi'],
  B19: ['Somalia', 'Somaliland', 'Djibouti', 'Kenya'],
  B20: ['Ghana', "Côte d'Ivoire", 'Liberia', 'Sierra Leone', 'Guinea', 'Guinea-Bissau', 'Senegal', 'Gambia', 'Togo', 'Benin', 'Burkina Faso'],
  B21: ['Nigeria'],
  B22: ['Tanzania', 'Zambia', 'Malawi', 'Mozambique', 'Zimbabwe', 'Angola'],
  B23: ['Madagascar'],
  B24: ['Nepal', 'Bhutan'],
  B25: ['Vietnam', 'Laos', 'Cambodia', 'Thailand', 'Myanmar'],
  B26: ['Pakistan', 'Afghanistan', 'Tajikistan', 'Uzbekistan', 'Turkmenistan', 'Kyrgyzstan'],
  B27: ['Kazakhstan', 'Mongolia'],
  B28: ['Philippines', 'Taiwan'],
  B29: ['Solomon Is.', 'Vanuatu', 'Fiji'],
  B30: ['New Caledonia', 'Fr. S. Antarctic Lands'],
  ANT: ['Antarctica'],
};

const W = 1000, TOP = 84, BOTTOM = -62;
const H = Math.round(W * (TOP - BOTTOM) / 360);
const px = ([lon, lat]) => [((lon + 180) * W) / 360, ((TOP - lat) * H) / (TOP - BOTTOM)];
const r1 = (v) => Math.round(v * 10) / 10;

const geoms = world.objects.countries.geometries;
const owner = new Map();
for (const [id, names] of Object.entries(GROUPS)) for (const n of names) owner.set(n, id);
const missing = geoms.filter((g) => !owner.has(g.properties.name)).map((g) => g.properties.name);
if (missing.length) { console.error('未割り当て:', missing); process.exit(1); }
for (const [id, names] of Object.entries(GROUPS)) for (const n of names) if (!geoms.some((g) => g.properties.name === n)) { console.error('見つからない:', id, n); process.exit(1); }

function ringArea(ring) { let a = 0; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]); return a / 2; }
function ringCentroid(ring) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    a += f; cx += (ring[j][0] + ring[i][0]) * f; cy += (ring[j][1] + ring[i][1]) * f;
  }
  return a ? [cx / (3 * a), cy / (3 * a)] : ring[0];
}

const shapes = {}, centers = {}, areas = {};
for (const id of Object.keys(GROUPS)) {
  const members = geoms.filter((g) => owner.get(g.properties.name) === id);
  const merged = topo.merge(world, members);
  const polys = merged.type === 'MultiPolygon' ? merged.coordinates : [merged.coordinates];
  let d = '', best = null, bestA = 0;
  for (const poly of polys) {
    for (const ring of poly) {
      // 日付変更線をまたぐ輪は経度をつなげて描く（はみ出した分は画面外で切れる）
      const crosses = ring.some((p, i) => i && Math.abs(p[0] - ring[i - 1][0]) > 180);
      const pts = (crosses ? ring.map(([lon, lat]) => [lon < 0 ? lon + 360 : lon, lat]) : ring).map(px);
      d += 'M' + pts.map((p) => r1(p[0]) + ' ' + r1(Math.min(H + 2, p[1]))).join('L') + 'Z';
    }
    const outer = poly[0].map(px), a = Math.abs(ringArea(outer));
    if (a > bestA) { bestA = a; best = outer; }
  }
  shapes[id] = d;
  centers[id] = ringCentroid(best).map(r1);
  areas[id] = Math.round(polys.reduce((sum, poly) => sum + Math.abs(ringArea(poly[0].map(px))), 0));
}
// 見た目の調整：ラベル位置（重心が海に落ちる・極端に寄る国）
const CENTER_FIX = { M01: [205, 120], M06: [520, 62], M07: [700, 68], M15: [820, 232], M03: [300, 340], M04: [488, 85] };
Object.assign(centers, CENTER_FIX);

// 陸続きの隣接（ゲームの国どうし）。海外領土でつながってしまう組は除く（仏領ギアナ）
const IGNORE = new Set(['M05M02', 'M05B06']);
const nbIdx = topo.neighbors(geoms);
const land = {};
geoms.forEach((g, i) => {
  const a = owner.get(g.properties.name);
  for (const j of nbIdx[i]) {
    const b = owner.get(geoms[j].properties.name);
    if (a === b || a === 'ANT' || b === 'ANT') continue;
    if (IGNORE.has(a + b) || IGNORE.has(b + a)) continue;
    (land[a] ||= new Set()).add(b);
  }
});
const landNb = Object.fromEntries(Object.entries(land).map(([k, v]) => [k, [...v].sort()]));

// 境界線：国と国（または海岸線）の線を、どの2国の間の線かといっしょに出す。
// 背景国をまとめたときは、同じまとまりの中の線を描かないことで、大きな地域に見せる（js/ui/art.js）
const lineD = (lines) => lines.map((line) => {
  const crosses = line.some((p, i) => i && Math.abs(p[0] - line[i - 1][0]) > 180);
  const pts = (crosses ? line.map(([lon, lat]) => [lon < 0 ? lon + 360 : lon, lat]) : line).map(px);
  return 'M' + pts.map((p) => r1(p[0]) + ' ' + r1(Math.min(H + 2, p[1]))).join('L');
}).join('');
const borders = [];
const unitIds = Object.keys(GROUPS).filter((id) => id !== 'ANT');
const nameOwner = (geo) => owner.get(geo.properties.name);
for (const a of unitIds) {
  const coast = topo.mesh(world, world.objects.countries, (x, y) => x === y && nameOwner(x) === a);
  if (coast.coordinates.length) borders.push([a, '', lineD(coast.coordinates)]);
  for (const b of unitIds) {
    if (b <= a) continue;
    const m = topo.mesh(world, world.objects.countries, (x, y) => x !== y && ((nameOwner(x) === a && nameOwner(y) === b) || (nameOwner(x) === b && nameOwner(y) === a)));
    if (m.coordinates.length) borders.push([a, b, lineD(m.coordinates)]);
  }
}

const out = `// 自動生成：tools/build_map.mjs（Natural Earth 110m をもとに 46 カ国へまとめたもの）。手で編集しない
export const MAP_W = ${W}, MAP_H = ${H};
export const SHAPES = ${JSON.stringify(shapes)};
export const CENTERS = ${JSON.stringify(centers)};
export const LAND_NEIGHBORS = ${JSON.stringify(landNb)};
// 面積（画面上の大きさ）：背景国をまとめるときの代表選びに使う
export const AREAS = ${JSON.stringify(areas)};
// 境界線 [国A, 国B（海岸線は ''）, パス]
export const BORDERS = ${JSON.stringify(borders)};
`;
writeFileSync(new URL('../js/data/mapdata.js', import.meta.url), out);
console.log('mapdata.js', (out.length / 1024).toFixed(0) + 'KB', 'H=' + H);
for (const [k, v] of Object.entries(landNb)) console.log(k, v.join(' '));
