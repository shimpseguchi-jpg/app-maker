// SVG の え（かたち・さいころ・とけい・モンスター）
const S = (vb, body, cls = '') => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" class="${cls}">${body}</svg>`;

function poly(n, r = 40, cx = 50, cy = 52, rot = -90) {
  const pts = [];
  for (let i = 0; i < n; i++) { const a = (rot + (360 / n) * i) * Math.PI / 180; pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`); }
  return pts.join(' ');
}
function star(r1 = 44, r2 = 19, cx = 50, cy = 54) {
  const pts = [];
  for (let i = 0; i < 10; i++) { const r = i % 2 ? r2 : r1; const a = (-90 + 36 * i) * Math.PI / 180; pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`); }
  return pts.join(' ');
}
const ST = 'stroke="#fff" stroke-width="5" stroke-linejoin="round"';
export const SHAPES = {
  tri: () => S('0 0 100 100', `<polygon points="50,10 92,86 8,86" fill="#ff6fd0" ${ST}/>`),
  sqr: () => S('0 0 100 100', `<rect x="14" y="14" width="72" height="72" rx="3" fill="#ff9a3d" ${ST}/>`),
  rect: () => S('0 0 100 100', `<rect x="4" y="28" width="92" height="46" rx="3" fill="#ffb03d" ${ST}/>`),
  house: () => S('0 0 100 100', `<polygon points="50,6 92,44 92,92 8,92 8,44" fill="#ff7a6b" ${ST}/>`),
  hex: () => S('0 0 100 100', `<polygon points="${poly(6, 42, 50, 50, 0)}" fill="#ffc21a" ${ST}/>`),
  star: () => S('0 0 100 100', `<polygon points="${star()}" fill="#ffd84d" ${ST}/>`),
  circle: () => S('0 0 100 100', `<circle cx="50" cy="50" r="40" fill="#5ac8ff" ${ST}/>`),
  cube: () => S('0 0 100 100', `<polygon points="20,34 56,34 56,90 20,90" fill="#7ad37a" ${ST}/><polygon points="20,34 40,16 76,16 56,34" fill="#a6ec9e" ${ST}/><polygon points="56,34 76,16 76,72 56,90" fill="#4fb35a" ${ST}/>`),
};
export function shapeSvg(name) { return (SHAPES[name] || SHAPES.circle)(); }

const PIPS = { 1: [[50, 50]], 2: [[28, 28], [72, 72]], 3: [[28, 28], [50, 50], [72, 72]], 4: [[28, 28], [72, 28], [28, 72], [72, 72]], 5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]], 6: [[28, 26], [72, 26], [28, 50], [72, 50], [28, 74], [72, 74]] };
export function diceSvg(v) {
  if (!v) return S('0 0 100 100', `<rect x="8" y="8" width="84" height="84" rx="18" fill="#fff" stroke="#c48a3a" stroke-width="5"/><text x="50" y="68" text-anchor="middle" font-size="52" font-weight="700" fill="#c48a3a" font-family="Fredoka, sans-serif">?</text>`);
  const pips = PIPS[v].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="${v === 1 ? '#ff3b4f' : '#2b2140'}"/>`).join('');
  return S('0 0 100 100', `<rect x="8" y="8" width="84" height="84" rx="18" fill="#fff" stroke="#c48a3a" stroke-width="5"/>${pips}`);
}

export function clockSvg(h, m) {
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30 - 60) * Math.PI / 180;
    return `<text x="${(100 + 70 * Math.cos(a)).toFixed(1)}" y="${(100 + 70 * Math.sin(a) + 8).toFixed(1)}" text-anchor="middle" font-size="22" font-weight="700" font-family="Fredoka, sans-serif" fill="#2b2140">${i + 1}</text>`;
  }).join('');
  const minor = Array.from({ length: 60 }, (_, i) => { const a = i * 6 * Math.PI / 180; const r1 = i % 5 ? 88 : 84; return `<line x1="${100 + r1 * Math.sin(a)}" y1="${100 - r1 * Math.cos(a)}" x2="${100 + 92 * Math.sin(a)}" y2="${100 - 92 * Math.cos(a)}" stroke="#8a7fa8" stroke-width="${i % 5 ? 1.5 : 3}"/>`; }).join('');
  const ha = ((h % 12) * 30 + m * 0.5) * Math.PI / 180, ma = m * 6 * Math.PI / 180;
  return S('0 0 200 200', `<circle cx="100" cy="100" r="96" fill="#fff" stroke="#ff7a45" stroke-width="7"/>${minor}${ticks}
    <line x1="100" y1="100" x2="${100 + 46 * Math.sin(ha)}" y2="${100 - 46 * Math.cos(ha)}" stroke="#2b2140" stroke-width="9" stroke-linecap="round"/>
    <line x1="100" y1="100" x2="${100 + 74 * Math.sin(ma)}" y2="${100 - 74 * Math.cos(ma)}" stroke="#ff4f5e" stroke-width="5" stroke-linecap="round"/>
    <circle cx="100" cy="100" r="7" fill="#2b2140"/>`, 'clock-svg');
}

export function gridSvg({ W, H, start, goal, rocks }) {
  const c = 70;
  let body = '';
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) body += `<rect x="${x * c + 2}" y="${y * c + 2}" width="${c - 4}" height="${c - 4}" rx="10" fill="${(x + y) % 2 ? '#c8f0b8' : '#b2e6a0'}"/>`;
  const em = (x, y, e) => `<text x="${x * c + c / 2}" y="${y * c + c / 2 + 16}" text-anchor="middle" font-size="44">${e}</text>`;
  for (const [x, y] of rocks) body += em(x, y, '🪨');
  body += em(goal[0], goal[1], '🏠');
  body += em(start[0], start[1], '🐤');
  return S(`0 0 ${W * c} ${H * c}`, body, 'grid-svg');
}

export function coinsSvg(c10, c1) {
  let body = '', x = 10;
  for (let i = 0; i < c10; i++) { body += `<circle cx="${x + 26}" cy="40" r="26" fill="#d98b3a" stroke="#a85f1a" stroke-width="4"/><text x="${x + 26}" y="49" text-anchor="middle" font-size="24" font-weight="700" fill="#fff" font-family="Fredoka, sans-serif">10</text>`; x += 60; }
  x += 10;
  for (let i = 0; i < c1; i++) { body += `<circle cx="${x + 20}" cy="40" r="20" fill="#e6e6ee" stroke="#a9a9bf" stroke-width="4"/><text x="${x + 20}" y="48" text-anchor="middle" font-size="22" font-weight="700" fill="#7a7a90" font-family="Fredoka, sans-serif">1</text>`; x += 46; }
  return S(`0 0 ${x + 10} 80`, body);
}

// ───── モンスター ─────
function slimeBody(color, dark, { crown = false, small = false } = {}) {
  const eyes = `<ellipse cx="44" cy="62" rx="7" ry="10" fill="#1b1036"/><ellipse cx="76" cy="62" rx="7" ry="10" fill="#1b1036"/>
    <circle cx="46" cy="58" r="3" fill="#fff"/><circle cx="78" cy="58" r="3" fill="#fff"/>
    <path d="M52 80 Q60 88 68 80" stroke="#1b1036" stroke-width="4" fill="none" stroke-linecap="round"/>
    <ellipse cx="34" cy="76" rx="7" ry="4" fill="#ff8fb8" opacity=".7"/><ellipse cx="86" cy="76" rx="7" ry="4" fill="#ff8fb8" opacity=".7"/>`;
  const c = crown ? `<polygon points="38,22 46,6 56,20 60,2 66,20 76,6 82,22" fill="#ffd84d" stroke="#e09a00" stroke-width="3" stroke-linejoin="round"/><circle cx="60" cy="10" r="3" fill="#ff4f7b"/>` : '';
  return S('0 0 120 110', `${c}<path d="M10 100 C6 60 26 22 60 22 C94 22 114 60 110 100 Z" fill="${color}" stroke="${dark}" stroke-width="4"/>
    <ellipse cx="40" cy="40" rx="12" ry="7" fill="#fff" opacity=".55" transform="rotate(-30 40 40)"/>${eyes}`, small ? 'small' : '');
}
export const MONSTERS = {
  slime: () => slimeBody('#7be07b', '#3e9e46'),
  slimeS: () => slimeBody('#9be6ff', '#3c9ec4', { small: true }),
  slimeKing: () => slimeBody('#b28cff', '#6a3fd0', { crown: true }),
  target: () => S('0 0 120 120', `<circle cx="60" cy="60" r="52" fill="#fff" stroke="#c4122b" stroke-width="4"/><circle cx="60" cy="60" r="40" fill="#ff4f5e"/><circle cx="60" cy="60" r="28" fill="#fff"/><circle cx="60" cy="60" r="16" fill="#ff4f5e"/>
    <ellipse cx="48" cy="56" rx="5" ry="7" fill="#1b1036"/><ellipse cx="72" cy="56" rx="5" ry="7" fill="#1b1036"/><path d="M50 70 Q60 76 70 70" stroke="#1b1036" stroke-width="3" fill="none"/>
    <rect x="54" y="108" width="12" height="12" fill="#a8743a"/>`),
  zeroKing: () => S('0 0 200 190', `
    <defs><radialGradient id="zk" cx="40%" cy="35%"><stop offset="0" stop-color="#8a6cff"/><stop offset=".6" stop-color="#3a1c8a"/><stop offset="1" stop-color="#14062e"/></radialGradient></defs>
    <path d="M30 120 Q10 160 40 180 L60 150 Z" fill="#2a1260"/><path d="M170 120 Q190 160 160 180 L140 150 Z" fill="#2a1260"/>
    <ellipse cx="100" cy="108" rx="78" ry="74" fill="url(#zk)" stroke="#ffd84d" stroke-width="5"/>
    <ellipse cx="100" cy="108" rx="40" ry="50" fill="none" stroke="#ffd84d" stroke-width="12" opacity=".9"/>
    <polygon points="58,40 70,8 86,32 100,0 114,32 130,8 142,40" fill="#ffd84d" stroke="#e09a00" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="100" cy="16" r="5" fill="#ff4f7b"/>
    <path d="M62 88 L86 98" stroke="#ff4f7b" stroke-width="7" stroke-linecap="round"/><path d="M138 88 L114 98" stroke="#ff4f7b" stroke-width="7" stroke-linecap="round"/>
    <circle cx="78" cy="104" r="8" fill="#ff4f7b"/><circle cx="122" cy="104" r="8" fill="#ff4f7b"/>
    <path d="M80 136 Q100 124 120 136" stroke="#ffd84d" stroke-width="5" fill="none" stroke-linecap="round"/>`),
};
export function enemyArt(art) {
  if (art && art.startsWith('svg:')) return (MONSTERS[art.slice(4)] || MONSTERS.slime)();
  return `<span>${art}</span>`;
}
