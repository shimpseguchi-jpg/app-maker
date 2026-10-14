// 「せかいの どこかに うまれたら」の くにの とうけいを 世界銀行の API から つくる
// つかいかた：node tools/sekai_data.mjs   → sekai/js/stats.js が できる（まいとし 1かい くらい やりなおすと さいしんに なる）
//
// 世界銀行 World Development Indicators（https://data.worldbank.org/）の それぞれの くにの
// いちばん あたらしい 値（mrnev=1）を つかう（2010ねんより ふるい 値は すてる）。国連・WHO/UNICEF・UNESCO・ILO の 値も ここに まとまっている。
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://api.worldbank.org/v2';

// ゲームで つかう しひょう
const IND = {
  pop: 'SP.POP.TOTL', // じんこう
  cbr: 'SP.DYN.CBRT.IN', // 1000にんあたりの 1ねんの しゅっせい → births を けいさん
  tfr: 'SP.DYN.TFRT.IN', // ごうけい とくしゅ しゅっしょうりつ
  elec: 'EG.ELC.ACCS.ZS', // でんきが つかえる %
  water: 'SH.H2O.BASW.ZS', // きほんてきな のみみず %
  toilet: 'SH.STA.BASS.ZS', // きほんてきな トイレ %
  uni: 'SE.TER.ENRR', // こうとうきょういく そうしゅうがくりつ %
  agri: 'SL.AGR.EMPL.ZS', // のうぎょうで はたらく ひと %（はたらく ひとの うち）
  kids: 'SP.POP.0014.TO.ZS', // 0〜14さいの わりあい %
  urban: 'SP.URB.TOTL.IN.ZS', // まちに すむ ひと %
  net: 'IT.NET.USER.ZS', // インターネットを つかう ひと %
  forest: 'AG.LND.FRST.ZS', // りくちの うち もりの %
  land: 'AG.LND.TOTL.K2', // りくちの ひろさ km2
  lem: 'SP.DYN.LE00.MA.IN', // へいきん じゅみょう（おとこ）… としを とった ときの ねんれいの めやすに つかう
  lef: 'SP.DYN.LE00.FE.IN', // へいきん じゅみょう（おんな）
  // いのち（1000にんあたり）… 生命表の もとに する
  imr: 'SP.DYN.IMRT.IN', // 1さいまでに なくなる
  u5: 'SH.DYN.MORT', // 5さいまでに なくなる
  m0509: 'SH.DYN.0509', // 5〜9さいの あいだに なくなる
  m1014: 'SH.DYN.1014', // 10〜14さい
  m1519: 'SH.DYN.1519', // 15〜19さい
  m2024: 'SH.DYN.2024', // 20〜24さい
  amm: 'SP.DYN.AMRT.MA', // 15〜60さいの あいだに なくなる（おとこ）
  amf: 'SP.DYN.AMRT.FE', // 15〜60さい（おんな）
  // がっこう・くらし（%）
  prim: 'SE.PRM.CMPT.ZS', // しょうがっこうを さいごまで おえる（100で うちきり）
  lsec: 'SE.SEC.CMPT.LO.ZS', // ちゅうがっこうを さいごまで おえる（100で うちきり）
  pov3: 'SI.POV.DDAY', // 1にち 3ドル（2021 PPP）みまんで くらす ひと
  pov8: 'SI.POV.UMIC', // 1にち 8.30ドル みまんで くらす ひと
  cm18: 'SP.M18.2024.FE.ZS', // 18さいまでに けっこんした じょせい（20〜24さいの うち）
  clab: 'SL.TLF.0714.ZS', // はたらいて いる こども（7〜14さい）
  wage: 'SL.EMP.WORK.ZS', // おきゅうりょうを もらって はたらく ひと（はたらく ひとの うち）
  // まいとしの できごと よう
  brtc: 'SH.STA.BRTC.ZS', // いしゃや じょさんしが たちあった しゅっさん %
  breg: 'SP.REG.BRTH.ZS', // しゅっせいとどけが だされた こども %
  meas: 'SH.IMM.MEAS', // はしかの ワクチンを うった こども %
  mal: 'SH.MLR.INCD.P3', // マラリアに かかる ひと（1000にんあたり 1ねん）
  stunt: 'SH.STA.STNT.ZS', // えいようが たりず せが のびにくい こども %
  hunger: 'SN.ITK.DEFC.ZS', // たべものが たりない ひと %
  pre: 'SE.PRE.ENRR', // ようちえん・ほいくえん %（100で うちきり）
  cook: 'EG.CFT.ACCS.ZS', // ガスや でんきで りょうりが できる %
  mob: 'IT.CEL.SETS.P2', // けいたいでんわの けいやく（100にんあたり）
  lit: 'SE.ADT.LITR.ZS', // じが よめる おとな %
  bank: 'FX.OWN.TOTL.ZS', // ぎんこうなどの こうざを もつ おとな %
  unemp: 'SL.UEM.TOTL.ZS', // しつぎょうりつ %
  yunemp: 'SL.UEM.1524.ZS', // わかもの（15〜24さい）の しつぎょうりつ %
  depart: 'ST.INT.DPRT', // がいこくへ でかけた かいすう（1ねん）→ ひとりあたりに なおす
  pm25: 'EN.ATM.PM25.MC.M3', // くうきの よごれ PM2.5（µg/m³）
  flab: 'SL.TLF.CACT.FE.ZS', // はたらく じょせいの わりあい %
  phys: 'SH.MED.PHYS.ZS', // いしゃの かず（1000にんあたり）
  slum: 'EN.POP.SLUM.UR.ZS', // まちの なかで せまく まずしい ちいきに すむ ひと %
  migr: 'SM.POP.TOTL.ZS', // がいこくから きて くらす ひと %
};

// くにでは ない ちいき（ずかんに でると こどもが まよう）
const SKIP = new Set(['AW', 'AS', 'BM', 'VG', 'KY', 'CW', 'FO', 'GI', 'GL', 'GU', 'HK', 'IM', 'MO', 'MF', 'MP', 'NC', 'PF', 'PR', 'SX', 'TC', 'VI', 'JG']);

// たいりく（世界銀行の ちいき わけを こどもが ならう たいりくに なおす）
const SAMERICA = new Set(['AR', 'BO', 'BR', 'CL', 'CO', 'EC', 'GY', 'PY', 'PE', 'SR', 'UY', 'VE']);
const OCEANIA = new Set(['AU', 'NZ', 'PG', 'FJ', 'SB', 'VU', 'WS', 'TO', 'KI', 'FM', 'MH', 'PW', 'NR', 'TV']);
const NAFRICA = new Set(['DZ', 'EG', 'LY', 'MA', 'TN', 'DJ']);
const CASIA = new Set(['KZ', 'KG', 'TJ', 'TM', 'UZ', 'AZ', 'AM', 'GE', 'TR']);
function areaOf(iso2, region) {
  if (region.startsWith('North America')) return 'namerica';
  if (region.startsWith('Latin America')) return SAMERICA.has(iso2) ? 'samerica' : 'namerica';
  if (region.startsWith('Sub-Saharan')) return 'africa';
  if (region.startsWith('Middle East')) return NAFRICA.has(iso2) ? 'africa' : iso2 === 'MT' ? 'europe' : 'asia';
  if (region.startsWith('Europe')) return CASIA.has(iso2) ? 'asia' : 'europe';
  if (region.startsWith('East Asia')) return OCEANIA.has(iso2) ? 'oceania' : 'asia';
  return 'asia'; // South Asia
}

// にほんごの くにの なまえ（ひらがな・カタカナだけに する）
const NAME = {
  JP: 'にほん', CN: 'ちゅうごく', KR: 'かんこく', KP: 'きたちょうせん', US: 'アメリカ', GB: 'イギリス',
  CD: 'コンゴみんしゅきょうわこく', CG: 'コンゴきょうわこく', PS: 'パレスチナ', AE: 'アラブしゅちょうこくれんぽう',
  DM: 'ドミニカこく', VC: 'セントビンセント・グレナディーン', KN: 'セントクリストファー・ネイビス', XK: 'コソボ',
};
const KANA = [
  ['共和国', 'きょうわこく'], ['民主', 'みんしゅ'], ['首長国', 'しゅちょうこく'], ['連邦', 'れんぽう'], ['諸島', 'しょとう'],
  ['中央', 'ちゅうおう'], ['赤道', 'せきどう'], ['南', 'みなみ'], ['北', 'きた'], ['東', 'ひがし'], ['西', 'にし'],
  ['自治区', ''], ['及び', '・'], ['島', 'とう'],
];
const dn = new Intl.DisplayNames('ja', { type: 'region' });
function jaName(iso2) {
  if (NAME[iso2]) return NAME[iso2];
  let s = dn.of(iso2).replace(/\(.*\)/, '').trim();
  for (const [k, v] of KANA) s = s.split(k).join(v);
  if (/[一-鿿]/.test(s)) throw new Error(`かんじが のこった：${iso2} ${s}`);
  return s;
}

const flag = (iso2) => String.fromCodePoint(...[...iso2].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));

async function get(path) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(`${API}/${path}${path.includes('?') ? '&' : '?'}format=json&per_page=20000`, { signal: AbortSignal.timeout(180000) });
      if (r.ok) return (await r.json())[1] || [];
    } catch (e) { /* もう いちど */ }
    await new Promise((res) => setTimeout(res, 2000 * 2 ** i));
  }
  throw new Error(`よみこめない：${path}`);
}

const countries = (await get('country')).filter((c) => c.region.value !== 'Aggregates' && !SKIP.has(c.iso2Code));
const vals = {}; // vals[key][iso3] = { v, y }
const world = {};
const sources = {}; // しひょうごとの しゅってん（だれが あつめた とうけいか）
// 4つずつ ならべて よみこむ
const keys = Object.entries(IND);
for (let i = 0; i < keys.length; i += 4) {
  await Promise.all(keys.slice(i, i + 4).map(async ([key, code]) => {
    vals[key] = {};
    // がいこく りょこうは コロナの としを さけて 2017〜2019ねんの いちばん あたらしい 値
    const q = key === 'depart' ? `country/all/indicator/${code}?date=2017:2019` : `country/all/indicator/${code}?mrnev=1`;
    const rows = await get(q);
    rows.sort((a, b) => +a.date - +b.date); // ふるい じゅん → あたらしい 値で うわがき
    for (const row of rows) {
      if (row.value == null || +row.date < 2010) continue; // ふるすぎる 値は つかわない
      if (row.countryiso3code === 'WLD') world[key] = { v: row.value, y: +row.date };
      vals[key][row.countryiso3code] = { v: row.value, y: +row.date };
    }
    const meta = (await get(`indicator/${code}`))[0] || {};
    sources[key] = { code, name: meta.name || code, org: (meta.sourceOrganization || '').replace(/\s+/g, ' ').trim().slice(0, 160) };
    console.log('  ', key, Object.keys(vals[key]).length);
  }));
}

const r1 = (x) => Math.round(x * 10) / 10;
const out = [];
const years = {};
for (const c of countries) {
  const g = (k) => vals[k][c.id]?.v;
  const pop = g('pop'), cbr = g('cbr');
  // うまれる くにに なるには じんこう・しゅっせい・でんき・みずが ひつよう
  if (!(pop && cbr && g('tfr') != null && g('elec') != null && g('water') != null)) continue;
  for (const k of Object.keys(IND)) if (vals[k][c.id]) (years[k] ||= new Set()).add(vals[k][c.id].y);
  out.push({
    id: c.iso2Code.toLowerCase(),
    flag: flag(c.iso2Code),
    name: jaName(c.iso2Code),
    area: areaOf(c.iso2Code, c.region.value),
    region: c.region.id,
    income: c.incomeLevel.id, // HIC/UMC/LMC/LIC
    pop: Math.round(pop),
    births: Math.round((pop * cbr) / 1000),
    tfr: r1(g('tfr')),
    elec: r1(g('elec')),
    water: r1(g('water')),
    toilet: g('toilet') != null ? r1(g('toilet')) : null,
    uni: g('uni') != null ? r1(Math.min(100, g('uni'))) : null,
    agri: g('agri') != null ? r1(g('agri')) : null,
    kids: g('kids') != null ? r1(g('kids')) : null,
    urban: g('urban') != null ? r1(g('urban')) : null,
    net: g('net') != null ? r1(g('net')) : null,
    forest: g('forest') != null ? r1(g('forest')) : null,
    land: g('land') != null ? Math.round(g('land')) : null,
    lem: g('lem') != null ? Math.round(g('lem')) : null,
    lef: g('lef') != null ? Math.round(g('lef')) : null,
    ...Object.fromEntries(['imr', 'u5', 'm0509', 'm1014', 'm1519', 'm2024', 'amm', 'amf', 'pov3', 'pov8', 'cm18', 'clab', 'wage']
      .map((k) => [k, g(k) != null ? r1(g(k)) : null])),
    ...Object.fromEntries(['brtc', 'breg', 'meas', 'mal', 'stunt', 'hunger', 'cook', 'mob', 'lit', 'bank', 'unemp', 'yunemp', 'pm25', 'flab', 'phys', 'slum', 'migr']
      .map((k) => [k, g(k) != null ? r1(g(k)) : null])),
    pre: g('pre') != null ? r1(Math.min(100, g('pre'))) : null,
    trips: g('depart') != null ? Math.round((g('depart') / pop) * 1000) / 1000 : null, // ひとり 1ねんあたりの がいこく りょこう
    prim: g('prim') != null ? r1(Math.min(100, g('prim'))) : null,
    lsec: g('lsec') != null ? r1(Math.min(100, g('lsec'))) : null,
  });
}
out.sort((a, b) => b.births - a.births);
const W = Object.fromEntries(Object.entries(world).map(([k, x]) => [k, k === 'pop' || k === 'land' ? Math.round(x.v) : r1(x.v)]));
W.births = Math.round((world.pop.v * world.cbr.v) / 1000);
delete W.cbr;
const span = Object.fromEntries(Object.entries(years).map(([k, s]) => [k, [Math.min(...s), Math.max(...s)]]));

const today = new Date().toISOString().slice(0, 10);
const js = `// この ファイルは tools/sekai_data.mjs が 世界銀行の API から つくりました（${today}）。てで なおさないでね。
// それぞれの くにの いちばん あたらしい 値。ねん（しひょうごとの ふるい〜あたらしい）：${JSON.stringify(span)}
export const FETCHED = '${today}';
export const WORLD = ${JSON.stringify(W)};
export const SOURCES = ${JSON.stringify(sources)};
export const STATS = [
${out.map((o) => '  ' + JSON.stringify(o)).join(',\n')},
];
`;
writeFileSync(join(ROOT, 'sekai/js/stats.js'), js);
console.log(`${out.length} か国（すてた くに：${countries.length - out.length}）・せかいの しゅっせい ${W.births}`);
console.log('world', W);
