// 国旗・地図・ダイスの絵（SVG）
import { SHAPES, CENTERS, MAP_W, MAP_H, BORDERS } from '../data/mapdata.js';
import { isSeat, neighbors } from '../engine/core.js';

export function flagSvg(f, w = 30, h = 20) {
  const [a, b, c] = f.c;
  let body = '';
  switch (f.k) {
    case 'h': body = `<rect width="30" height="7" fill="${a}"/><rect y="6.6" width="30" height="7" fill="${b}"/><rect y="13.3" width="30" height="6.7" fill="${c}"/>`; break;
    case 'h2': body = `<rect width="30" height="10" fill="${a}"/><rect y="10" width="30" height="10" fill="${b}"/>`; break;
    case 'v': body = `<rect width="10" height="20" fill="${a}"/><rect x="10" width="10" height="20" fill="${b}"/><rect x="20" width="10" height="20" fill="${c}"/>`; break;
    case 'cross': body = `<rect width="30" height="20" fill="${a}"/><path d="M0 0L30 20M30 0L0 20" stroke="${b}" stroke-width="4"/><path d="M15 0V20M0 10H30" stroke="${b}" stroke-width="6"/><path d="M15 0V20M0 10H30" stroke="${c}" stroke-width="3"/>`; break;
    case 'nordic': body = `<rect width="30" height="20" fill="${a}"/><path d="M11 0V20M0 10H30" stroke="${b}" stroke-width="5"/><path d="M11 0V20M0 10H30" stroke="${c}" stroke-width="2.4"/>`; break;
    case 'canton': body = `<rect width="30" height="20" fill="${a}"/>${f.stars ? '' : [2, 6, 10, 14, 18].map((y) => `<rect y="${y}" width="30" height="2" fill="${b}"/>`).join('')}<rect width="13" height="11" fill="${c === '#fff' ? b : c}"/><circle cx="6.5" cy="5.5" r="2.2" fill="${f.stars || '#fff'}"/>${f.stars ? `<circle cx="22" cy="6" r="1.2" fill="#fff"/><circle cx="25" cy="12" r="1.2" fill="#fff"/><circle cx="20" cy="15" r="1.2" fill="#fff"/>` : ''}`; break;
    case 'disc': body = `<rect width="30" height="20" fill="${a}"/><circle cx="15" cy="10" r="${a === '#fff' ? 6 : 6.5}" fill="${b}"/>${c && c !== b ? `<circle cx="15" cy="10" r="3.5" fill="${c}"/>` : ''}`; break;
    case 'band': body = `<rect width="30" height="20" fill="${a}"/><rect width="8" height="20" fill="${b}"/><rect x="12" y="8" width="14" height="2" fill="${b}"/>`; break;
    case 'tri': body = `<rect width="30" height="20" fill="${a}"/><rect y="10" width="30" height="10" fill="${c}"/><path d="M0 0L14 10L0 20Z" fill="${b}"/>`; break;
    case 'stars': body = `<rect width="30" height="20" fill="${a}"/><circle cx="6" cy="6" r="3" fill="${b}"/>${[[12, 3], [14, 6], [14, 9], [12, 12]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1" fill="${b}"/>`).join('')}`; break;
    default: body = `<rect width="30" height="20" fill="${a}"/>`;
  }
  if (f.sun) body += `<circle cx="15" cy="10" r="2.6" fill="${f.sun}"/>`;
  if (f.wheel) body += `<circle cx="15" cy="10" r="2.6" fill="none" stroke="${f.wheel}" stroke-width=".8"/>`;
  if (f.moon) body += `<circle cx="6" cy="5" r="3" fill="${f.moon}"/><circle cx="7.3" cy="5" r="2.6" fill="${a}"/>`;
  return `<svg class="flag" width="${w}" height="${h}" viewBox="0 0 30 20">${body}</svg>`;
}

export const SEAT_COLORS = ['#4f8fd6', '#d8574a', '#4caf7a', '#a676d6', '#e07b39', '#3bb3c3'];
export function seatColor(g, id) {
  if (id === g.player) return '#f2b632';
  const others = g.seats.filter((x) => x !== g.player);
  return SEAT_COLORS[others.indexOf(id) % SEAT_COLORS.length];
}

// 背景国の塗り分け：となりあう背景国がちがう色になるように、くすんだ色を順にあてる（まとまって大きくなっても見分けられるように）
const BG_SHADES = ['#3a4558', '#4a4560', '#384f57', '#4d4b44', '#44506a'];
function bgShades(g) {
  const ids = Object.keys(g.backs).sort();
  const out = {};
  for (const id of ids) {
    const used = new Set(neighbors(id).map((n) => out[n]).filter((x) => x != null));
    let k = 0;
    while (used.has(k)) k++;
    out[id] = k % BG_SHADES.length;
  }
  return out;
}

// 地図。opts.highlight：強調する国（準備画面）
export function mapSvg(g, opts = {}) {
  const parts = [];
  parts.push(`<rect width="${MAP_W}" height="${MAP_H}" fill="#0b1a2c"/>`);
  parts.push(`<g opacity=".08" stroke="#9cc" stroke-width=".5">${[1, 2, 3, 4, 5, 6, 7, 8].map((i) => `<path d="M${(i * MAP_W) / 9} 0V${MAP_H}"/>`).join('')}${[1, 2, 3].map((i) => `<path d="M0 ${(i * MAP_H) / 4}H${MAP_W}"/>`).join('')}</g>`);
  // 背景国がまとまっているときは、元の国（地図の形）をまとまりの代表の色で塗り、まとまりの中の境界線は描かない
  const U = (id) => (g.unitOf && g.unitOf[id]) || id;
  const shade = bgShades(g);
  for (const [sid, d] of Object.entries(SHAPES)) {
    if (sid === 'ANT') { parts.push(`<path class="land ant" d="${d}" opacity="${0.35 + g.world.ice / 200}"/>`); continue; }
    const id = U(sid);
    let fill = '', cls = 'land';
    if (isSeat(g, id)) {
      const c = g.majors[id];
      const owner = c.annexedBy;
      fill = owner ? seatColor(g, owner) : seatColor(g, id);
      if (!c.panel) cls += ' off';
    } else {
      const b = g.backs[id];
      cls += ' bg';
      if (b?.owner) { fill = seatColor(g, b.owner); cls += ' owned'; }
      else if (b?.sunk) cls += ' sunk';
      else fill = BG_SHADES[shade[id] ?? 0];
    }
    if (opts.highlight && !opts.highlight.includes(id)) { fill = g.backs[id] ? BG_SHADES[shade[id] ?? 0] : ''; cls = 'land bg'; }
    parts.push(`<path class="${cls}" data-id="${id}" d="${d}"${fill ? ` style="fill:${fill};stroke:${fill}"` : ''}/>`);
  }
  parts.push(`<g class="borders">${BORDERS.filter(([a, b]) => !b || U(a) !== U(b)).map(([, , d]) => `<path d="${d}"/>`).join('')}</g>`);
  // 提携の線
  for (const k of g.allies || []) {
    const [a, b] = k.split('-');
    const [x1, y1] = CENTERS[a], [x2, y2] = CENTERS[b];
    parts.push(`<path class="mk" d="M${x1} ${y1}L${x2} ${y2}" stroke="#8fe0b4" stroke-width="1.4" stroke-dasharray="4 3" opacity=".7" fill="none"/>`);
  }
  // 紛争・核・極地の石油
  const marks = [];
  for (const b of Object.values(g.backs)) if (!b.owner && !b.sunk && b.stats.stability <= 22) marks.push(`<circle class="mk" cx="${CENTERS[b.id][0]}" cy="${CENTERS[b.id][1]}" r="4" fill="#e5534b" opacity=".85"><animate attributeName="r" values="3;6;3" dur="1.6s" repeatCount="indefinite"/></circle>`);
  for (const id of g.seats) {
    const c = g.majors[id];
    if (c.annexedBy) continue;
    const [x, y] = CENTERS[id];
    if (c.panel && c.stats.stability <= 30) marks.push(`<circle class="mk" cx="${x + 14}" cy="${y - 10}" r="4" fill="#e5534b"/>`);
    if (c.stats.nuke >= 4) marks.push(`<text class="mk" x="${x - 26}" y="${y - 6}" font-size="13">☢</text>`);
  }
  for (const s of g.sparks || []) { const [x, y] = CENTERS[s.where]; marks.push(`<circle class="mk" cx="${x}" cy="${y}" r="9" fill="none" stroke="#ff7a3a" stroke-width="2.5"><animate attributeName="r" values="7;13;7" dur="1.2s" repeatCount="indefinite"/></circle><text class="mk" x="${x - 7}" y="${y - 12}" font-size="13">🔥</text>`); }
  if (g.flags?.polarOil != null) marks.push(`<text class="mk" x="${MAP_W / 2 - 8}" y="${MAP_H - 6}" font-size="14">🛢</text><text class="mk" x="${MAP_W / 2 - 8}" y="16" font-size="14">🛢</text>`);
  parts.push(marks.join(''));
  // 国名
  for (const id of g.seats) {
    const c = g.majors[id];
    if (c.annexedBy) continue;
    const [x, y] = CENTERS[id];
    parts.push(`<text class="maplabel${id === g.player ? ' me' : ''}" x="${x}" y="${y + 4}" text-anchor="middle">${c.name.replace(/(共和国|連邦|王国|首長国|人民共和国|連合王国|市国|群島連邦|連合|同盟|国)$/, '').replace(/の くに$|の しま$/, '')}${c.panel ? '' : g.kid ? '（おやすみ）' : '（崩壊）'}</text>`);
  }
  return `<svg viewBox="0 0 ${MAP_W} ${MAP_H}" preserveAspectRatio="xMidYMid meet">${parts.join('')}</svg>`;
}

// タイトル用：国境だけの地図
export function plainMapSvg() {
  return `<svg viewBox="0 0 ${MAP_W} ${MAP_H}">${Object.values(SHAPES).map((d) => `<path d="${d}" fill="#9fb6d6" stroke="#0d121c" stroke-width=".6"/>`).join('')}</svg>`;
}

// 多面体ダイス（正二十面体の見た目）
export function diceSvg() {
  return `<svg viewBox="0 0 100 100"><polygon points="50,4 90,27 90,73 50,96 10,73 10,27" fill="#f2b632" stroke="#7a5a10" stroke-width="2"/>
  <polygon points="50,20 76,64 24,64" fill="#ffd772" stroke="#7a5a10" stroke-width="1.5"/>
  <path d="M50 4L50 20M90 27L76 64M90 73L76 64M50 96L76 64M50 96L24 64M10 73L24 64M10 27L24 64M10 27L50 20M90 27L50 20" stroke="#7a5a10" stroke-width="1.5" fill="none"/></svg>`;
}

export { neighbors };
