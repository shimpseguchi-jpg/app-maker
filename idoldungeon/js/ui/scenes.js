// 街の施設の背景（エルミナージュの施設画面の背景画の代わり。SVG で描く）と、施設の人のひとこと
// 人物は影絵（シルエット）にして、劇中の街の雰囲気だけを出す

const person = (x, color, hat = '') => `
  <g transform="translate(${x} 0)" opacity=".92">
    <ellipse cx="0" cy="444" rx="70" ry="10" fill="#000" opacity=".35"/>
    <path d="M-62 450 Q-58 300 0 286 Q58 300 62 450 Z" fill="${color}"/>
    <rect x="-13" y="262" width="26" height="30" fill="#2a1c14"/>
    <ellipse cx="0" cy="236" rx="36" ry="42" fill="#2a1c14"/>
    ${hat}
  </g>`;

const bg = (top, bottom) => `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>
  <radialGradient id="glow" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#ffd690" stop-opacity=".35"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>
  <rect width="800" height="450" fill="url(#sky)"/>`;

const lamp = (x, y) => `<circle cx="${x}" cy="${y}" r="38" fill="#ffb84a" opacity=".18"/><circle cx="${x}" cy="${y}" r="9" fill="#ffd98a"/><path d="M${x - 10} ${y - 14} h20 l-4 -10 h-12 Z" fill="#3a2410"/>`;
const shelf = (x, y, w, items) => `<rect x="${x}" y="${y}" width="${w}" height="8" fill="#3d2614"/>` + items.map((c, i) => `<rect x="${x + 10 + i * (w - 20) / items.length}" y="${y - 30}" width="12" height="30" rx="3" fill="${c}" opacity=".8"/>`).join('');

const SCENES = {
  tavern: {
    name: '酒場', speaker: '酒場の主人', line: 'いらっしゃい。今日はどの子たちで舞台に立つんだい？',
    svg: () => `${bg('#4a2a16', '#1a0e08')}
      <rect y="320" width="800" height="130" fill="#2a170c"/>
      ${[60, 160, 260, 560, 660].map((x) => `<rect x="${x}" y="40" width="70" height="250" fill="#3a2212" stroke="#24140a" stroke-width="4"/>`).join('')}
      ${shelf(560, 120, 180, ['#7a2a2a', '#3a6a3a', '#c9a24a', '#5a3a7a', '#7a2a2a'])}${shelf(560, 200, 180, ['#c9a24a', '#3a6a3a', '#7a2a2a', '#3a3a6a'])}
      ${lamp(330, 90)}${lamp(480, 90)}
      <rect x="0" y="330" width="800" height="22" fill="#5a3418"/><rect x="0" y="352" width="800" height="98" fill="#3a2010"/>
      <rect width="800" height="450" fill="url(#glow)"/>${person(400, '#5a2030')}`,
  },
  inn: {
    name: '宿屋', speaker: '宿屋の女将', line: 'お疲れさま。ゆっくり休めば、次の舞台もきっとうまくいくわ。',
    svg: () => `${bg('#16182e', '#0b0a14')}
      <rect x="520" y="60" width="200" height="170" fill="#0d1430" stroke="#4a3418" stroke-width="10"/>
      <circle cx="650" cy="120" r="34" fill="#f6e7b0" opacity=".9"/><circle cx="636" cy="112" r="34" fill="#0d1430"/>
      ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<circle cx="${540 + i * 26}" cy="${200 - (i % 3) * 30}" r="1.8" fill="#fff"/>`).join('')}
      <path d="M620 60 v170 M520 145 h200" stroke="#4a3418" stroke-width="6"/>
      <rect x="60" y="300" width="240" height="70" rx="10" fill="#6a3a3a"/><rect x="60" y="280" width="70" height="40" rx="8" fill="#e8dcc8"/>
      <rect y="380" width="800" height="70" fill="#24160c"/>${lamp(380, 110)}
      <rect width="800" height="450" fill="url(#glow)"/>${person(420, '#3a3a5a')}`,
  },
  shop: {
    name: '商店', speaker: '道具屋の店主', line: '昇格の証も楽譜もそろってるよ。鑑定もまかせておくれ。',
    svg: () => `${bg('#3a2a16', '#140c06')}
      ${[70, 150, 230].map((y) => shelf(40, y, 280, ['#c9a24a', '#7a2a2a', '#3a6a7a', '#c9a24a', '#5a3a7a', '#3a6a3a'])).join('')}
      ${[70, 150, 230].map((y) => shelf(480, y, 280, ['#3a6a7a', '#c9a24a', '#7a2a2a', '#3a6a3a', '#c9a24a'])).join('')}
      <rect x="0" y="330" width="800" height="120" fill="#4a2c14"/><rect x="0" y="322" width="800" height="14" fill="#6a4020"/>
      <path d="M340 330 l20 -24 h80 l20 24 Z" fill="#c9a24a" opacity=".6"/>${lamp(400, 70)}
      <rect width="800" height="450" fill="url(#glow)"/>${person(400, '#3a5030', '<path d="M-40 206 Q0 170 40 206 Z" fill="#3a2410"/>')}`,
  },
  temple: {
    name: '寺院', speaker: '寺院の司祭', line: '迷える者たちよ。倒れた仲間も、ここでは必ず迎え入れましょう。',
    svg: () => `${bg('#1e1a2e', '#0a0812')}
      ${[140, 400, 660].map((x) => `<path d="M${x - 70} 330 V120 Q${x} 20 ${x + 70} 120 V330 Z" fill="#14101e" stroke="#4a3a5a" stroke-width="6"/>
        <path d="M${x - 46} 300 V130 Q${x} 60 ${x + 46} 130 V300 Z" fill="#2a3a6a" opacity=".8"/>
        <path d="M${x} 70 V300 M${x - 46} 180 H${x + 46} M${x - 46} 240 H${x + 46}" stroke="#14101e" stroke-width="4"/>
        <circle cx="${x}" cy="140" r="18" fill="#c94a4a" opacity=".7"/>`).join('')}
      <rect y="330" width="800" height="120" fill="#16121c"/>
      ${[250, 550].map((x) => `<rect x="${x - 4}" y="300" width="8" height="40" fill="#e8dcc8"/><circle cx="${x}" cy="294" r="6" fill="#ffd27a"/><circle cx="${x}" cy="294" r="26" fill="#ffd27a" opacity=".15"/>`).join('')}
      <rect width="800" height="450" fill="url(#glow)"/>${person(400, '#e8dcc8', '<path d="M-26 200 L0 160 L26 200 Z" fill="#c9a24a"/>')}`,
  },
  training: {
    name: '訓練所', speaker: '教官', line: '役を変えるのも、上の役に進むのも、ここで決めな。覚悟はいいか？',
    svg: () => `${bg('#2e2216', '#120c06')}
      ${[100, 300, 500, 700].map((x, i) => `<path d="M${x - 40} 40 h80 v150 l-40 -24 l-40 24 Z" fill="${['#7a2a2a', '#2a3a6a', '#3a6a3a', '#6a4a8a'][i]}" opacity=".85"/><circle cx="${x}" cy="100" r="16" fill="#c9a24a" opacity=".7"/>`).join('')}
      <rect y="320" width="800" height="130" fill="#3a2614"/>
      ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<path d="M${i * 100} 450 L${400 + (i * 100 - 400) * 0.4} 320" stroke="#24160a" stroke-width="2"/>`).join('')}
      <path d="M60 330 l30 -110 M100 330 l-10 -120 M720 330 l-20 -110" stroke="#9a8a7a" stroke-width="6"/>
      <rect width="800" height="450" fill="url(#glow)"/>${person(400, '#4a3a2a')}`,
  },
  castle: {
    name: '城', speaker: '書記官', line: 'これまでに出会った魔物の記録です。どうぞご覧ください。',
    svg: () => `${bg('#3a0e14', '#120406')}
      ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<path d="M${i * 100} 0 q50 40 100 0 v330 q-50 -20 -100 0 Z" fill="${i % 2 ? '#6a1a24' : '#5a1420'}"/>`).join('')}
      <path d="M300 330 h200 l30 40 h-260 Z" fill="#7a5a2a"/><rect x="350" y="200" width="100" height="130" fill="#8a1a24" stroke="#c9a24a" stroke-width="5"/>
      <path d="M350 200 q50 -60 100 0" fill="#c9a24a"/>
      <rect y="370" width="800" height="80" fill="#2a0a0e"/>
      <rect width="800" height="450" fill="url(#glow)"/>${person(600, '#2a2a4a')}`,
  },
  record: {
    name: '記録所', speaker: '記録係', line: '冒険の記録を残しておきましょう。いつでも続きから再開できますよ。',
    svg: () => `${bg('#2a2014', '#0e0a06')}
      <rect x="120" y="260" width="560" height="40" fill="#5a3a1a"/><rect x="150" y="300" width="20" height="120" fill="#3a2410"/><rect x="630" y="300" width="20" height="120" fill="#3a2410"/>
      <path d="M260 258 l120 -20 l120 20 l-120 14 Z" fill="#e8d8b0"/><path d="M380 238 v34" stroke="#a08a60"/>
      <rect x="560" y="200" width="10" height="60" fill="#e8dcc8"/><circle cx="565" cy="194" r="6" fill="#ffd27a"/><circle cx="565" cy="194" r="40" fill="#ffd27a" opacity=".15"/>
      ${shelf(60, 120, 200, ['#7a2a2a', '#2a3a6a', '#3a6a3a', '#7a5a2a', '#5a3a7a'])}${shelf(540, 120, 200, ['#2a3a6a', '#7a2a2a', '#7a5a2a', '#3a6a3a'])}
      <rect width="800" height="450" fill="url(#glow)"/>`,
  },
  depart: {
    name: '舞台袖', speaker: '舞台監督', line: '出番だよ。じっくり歩くか、カードで駆け抜けるか。今日はどっちの舞台にする？',
    svg: () => `${bg('#2a0a10', '#0a0204')}
      ${[0, 1, 2, 3].map((i) => `<path d="M${i * 60} 0 q30 30 60 0 v380 q-30 -16 -60 0 Z" fill="${i % 2 ? '#6a1020' : '#5a0c1a'}"/>`).join('')}
      ${[0, 1, 2, 3].map((i) => `<path d="M${560 + i * 60} 0 q30 30 60 0 v380 q-30 -16 -60 0 Z" fill="${i % 2 ? '#6a1020' : '#5a0c1a'}"/>`).join('')}
      <path d="M0 0 h800 v46 q-400 30 -800 0 Z" fill="#7a1424"/><path d="M0 40 q400 30 800 0" stroke="#c9a24a" stroke-width="4" fill="none"/>
      <path d="M330 0 L250 380 h300 L470 0 Z" fill="#fff3c8" opacity=".08"/><ellipse cx="400" cy="380" rx="150" ry="22" fill="#fff3c8" opacity=".14"/>
      <rect y="380" width="800" height="70" fill="#2a1a10"/><path d="M0 380 h800" stroke="#5a3a1a" stroke-width="4"/>
      <rect width="800" height="450" fill="url(#glow)"/>${person(660, '#3a2a1a', '<path d="M-38 214 h76 v-10 h-76 Z M-20 204 v-14 h40 v14" fill="#1a1410"/>')}`,
  },
};

export function sceneSvg(tab) {
  const s = SCENES[tab] || SCENES.tavern;
  return `<svg class="scene" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${s.svg()}</svg>`;
}
export const sceneInfo = (tab) => SCENES[tab] || SCENES.tavern;
