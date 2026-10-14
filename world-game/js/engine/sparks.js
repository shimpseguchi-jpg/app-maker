// 火種：ある一国で起きた問題。世界が正しく支援すれば封じ込められ、まちがえれば世界規模に広がる
// sev：深刻度（0 で封じ込め、100 で拡大）。毎年 grow ずつ悪化し、deadline 年たっても残っていれば拡大する
// 期限と悪化の速さは火種ごとにランダムで、プレイヤーには見せない（現実と同じく、いつ広がるかはわからない）
// fx：政策ごとの深刻度の変化（マイナスが正しい支援）。カードには正解を表示しない
import { applyFx } from './effects.js';

export const SPARKS = {
  disease: {
    name: '未知の感染症', icon: '🦠', grow: 10, deadline: 3,
    hint: '感染症は国境で止まらない。止められるのは発生した場所だけだ。隠せば広がり、閉じこもっても時間稼ぎにしかならない。',
    fx: { P110: -25, P111: -20, P81: -25, P31: -8, P80: -5, P82: 10, P88: 15 },
    contain: ['world.trust+m'],
    outbreak: (g, H) => { g.flags.sparkPandemic = g.year; g.boost.E43 = 50; H.deaths(6); H.fx(['majors.gnp-m', 'majors.mobility-m'], {}); },
    outText: '封じ込めに失敗した。感染症は世界中に広がっていく。',
  },
  finance: {
    name: '銀行の連鎖破綻', icon: '🏦', grow: 7, deadline: 3,
    hint: '一つの銀行の破綻は、貸し借りの糸をたどって世界中に伝わる。資本を引き揚げれば自国は守れるが、そのぶん穴は深くなる。',
    fx: { P112: -25, P84: -20, P120: -15, P53: -10, P113: 12, P54: 6 },
    contain: ['world.trust+s'],
    outbreak: (g, H) => { g.flags.finCrisis = g.year; H.fx(['majors.gnp-l', 'majors.capital-m', 'bgAll.econ-m', 'world.treaty-m'], {}); },
    outText: '破綻は止まらなかった。世界中の銀行が貸し渋り、恐慌が始まった。',
  },
  famine: {
    name: '大飢饉', icon: '🌾', grow: 8, deadline: 3,
    hint: '飢えた人は待ってくれない。食べ物を届けるか、作れるようにするか。自国の食卓を守るために輸出を止めれば、値段はさらに跳ね上がる。',
    fx: { P31: -25, P114: -20, P53: -10, P30: -5, P115: 15 },
    contain: ['world.trust+s'],
    outbreak: (g, H, s) => { H.deaths(3); H.fx(['world.refugees+l', 'world.foodPrice+m', 'tgtNb.stability-m'], { tgt: s.where }); },
    outText: '飢饉は国境を越えた。数百万人が食べ物を求めて歩き出している。',
  },
  civilwar: {
    name: '内戦', icon: '🔥', grow: 7, deadline: 4,
    hint: '内戦に外から武器を入れれば、戦いは長引く。爆弾で終わる内戦もない。必要なのは停戦の席と、逃げてくる人の行き先だ。',
    fx: { P116: -25, P61: -15, P42: -10, P56: -10, P117: 20, P62: 15, P63: 20 },
    contain: ['world.conflicts-m', 'world.trust+s'],
    outbreak: (g, H, s) => { H.deaths(2); H.fx(['world.refugees+l', 'world.conflicts+l', 'tgtNb.stability-l', 'tgtNb.guerrilla+m'], { tgt: s.where }); },
    outText: '内戦は周りの国を巻き込み、地域全体の戦争になった。',
  },
  meltdown: {
    name: '放射能汚染', icon: '☢', grow: 8, deadline: 3,
    hint: '事故そのものより、隠すことのほうが被害を広げる。専門家を送れる国が、どれだけ手を貸すかだ。',
    fx: { P118: -30, P111: -20, P86: -10, P88: 20 },
    contain: ['world.trust+s'],
    outbreak: (g, H, s) => { H.deaths(0.5); H.fx(['tgtNb.food-l', 'world.biodiv-m', 'world.tension+s'], { tgt: s.where }); },
    outText: '汚染は風と海流に乗って広がった。周辺の国の畑と漁場が使えなくなった。',
  },
  looseNuke: {
    name: '核物質の流出', icon: '⚛', grow: 8, deadline: 3,
    hint: '持ち主のいなくなった核物質は、いちばん欲しがっている者の手に渡る。誰かが先に回収しなければならない。',
    fx: { P119: -30, P118: -10, P24: -10, P117: 15 },
    contain: ['world.tension-m', 'world.trust+s'],
    outbreak: (g, H) => { H.deaths(0.3); g.flags.nukeTerror = g.year; g.boost.E14 = 20; H.fx(['world.tension+l', 'majors.guerrilla+m', 'majors.stability-s'], {}); },
    outText: '流出した核物質がテロ組織の手に渡り、ある都市で炸裂した。',
  },
  dam: {
    name: '大河のダム争い', icon: '🌊', grow: 6, deadline: 4,
    hint: '上流がダムを造れば、下流の水が減る。力で押さえつければ、川をめぐる戦争になる。話し合いの席を用意できる国はあるかね？',
    fx: { P116: -25, P53: -10, P32: -5, P61: 15, P54: 10, P117: 15 },
    contain: ['world.trust+s', 'world.waterRes+s'],
    outbreak: (g, H, s) => { H.deaths(0.5); H.fx(['tgtNb.water-l', 'world.conflicts+m', 'world.waterRes-m'], { tgt: s.where }); },
    outText: '川をめぐる対立は戦争になった。下流の国々の水が奪われていく。',
  },
  debt: {
    name: '債務の連鎖', icon: '📉', grow: 8, deadline: 3,
    hint: '返せない借金を取り立てても、何も戻ってこない。高い金利で貸し直せば、次の破綻を早めるだけだ。',
    fx: { P120: -25, P53: -20, P112: -15, P52: 20, P113: 15 },
    contain: ['world.trust+s'],
    outbreak: (g, H) => {
      for (const b of Object.values(g.backs)) if (!b.owner && b.stats.debt >= 65) { b.stats.econ = Math.max(0, b.stats.econ - 15); b.stats.stability = Math.max(0, b.stats.stability - 12); }
      H.fx(['world.wrate+m', 'world.refugees+m'], {});
    },
    outText: '借金の踏み倒しが連鎖した。同じように借りていた国々が、次々と破綻していく。',
  },
};

SPARKS.asteroid = {
  name: '小惑星の衝突', icon: '☄', grow: 0, deadline: 3, startSev: 60,
  hint: '一国の技術では軌道を変えられない。技術を持つ国が何カ国、手を組めるかだ。',
  fx: { P105: -20, P90: -8 },
  contain: ['world.trust+l', 'world.tension-m'],
  outbreak: (g, H, s) => {
    H.deaths(30);
    const b = g.backs[s.where];
    if (b) { b.sunk = true; b.stats.stability = 0; b.stats.econ = 0; }
    H.fx(['world.foodPrice+l', 'majors.food-m', 'world.refugees+l', 'world.biodiv-m'], {});
  },
  outText: '小惑星が落ちた。落下地点の国は消え、舞い上がった塵で世界の作物が育たない。',
};

export const SPARK_POLICY_IDS = [...new Set(Object.values(SPARKS).flatMap((t) => Object.keys(t.fx)))];

export function startSpark(g, H, type, where) {
  if (!where || !SPARKS[type]) return null;
  g.sparks ||= [];
  if (g.sparks.some((s) => s.where === where)) return null;
  if (g.sparks.length >= 2) return null;
  const t = SPARKS[type];
  const deadline = Math.max(2, t.deadline - 1 + Math.floor(H.rng() * 4)); // 基準 -1〜+2 年
  const grow = Math.round(t.grow * (0.7 + H.rng() * 0.7));
  const s = { n: (g.sparkCount = (g.sparkCount || 0) + 1), type, where, sev: t.startSev || 35, start: g.year, deadline, grow, helpers: [], log: [] };
  g.sparks.push(s);
  const name = (g.majors[where] || g.backs[where]).name;
  g.feed.push({ k: 'spark', type, where, text: `火種：${name}で${SPARKS[type].name}。${SPARKS[type].hint}` });
  H.chron(`火種：${name}で${SPARKS[type].name}`);
  return s;
}

// 政策が火種に効くか。pol.tgt がある政策は、火種の国を対象にしたときだけ効く
export function sparkEffect(g, actor, pol, tgt, tier) {
  const out = [];
  for (const s of g.sparks || []) {
    const d0 = SPARKS[s.type].fx[pol.id];
    if (d0 == null) continue;
    if (pol.tgt && tgt !== s.where) continue;
    if (!pol.tgt && ['P86', 'P88'].includes(pol.id) && actor !== s.where) continue;
    const succ = tier === 'crit' || tier === 'ok' || tier === 'partial';
    const f = tier === 'crit' ? 2 : tier === 'ok' ? 1 : tier === 'partial' ? 0.5 : 0;
    let d = succ ? d0 * f : tier === 'fumble' && d0 < 0 ? 5 : 0;
    if (!d) continue;
    s.sev = Math.max(0, Math.min(100, s.sev + d));
    if (d < 0 && !s.helpers.includes(actor)) s.helpers.push(actor);
    s.log.push({ year: g.year, actor, pol: pol.id, d });
    out.push({ n: s.n, d });
  }
  return out;
}

// 年末：悪化 → 封じ込め／拡大の判定
export function tickSparks(g, H, say) {
  const keep = [];
  for (const s of g.sparks || []) {
    const t = SPARKS[s.type];
    const name = (g.majors[s.where] || g.backs[s.where]).name;
    if (s.sev <= 0) {
      applyFx(g, t.contain, { tgt: s.where });
      for (const a of s.helpers) for (const b of s.helpers) if (a < b) H.addRel(a, b, 8);
      for (const a of s.helpers) if (g.majors[a]) H.fx(['who.rep+s'], { who: a });
      g.coop.push(`S${s.n}`);
      g.feed.push({ k: 'sys', cls: 'good', text: `${name}の${t.name}を封じ込めた（協調の成功例 ${Math.min(g.coop.length, 3)}/3）` });
      H.chron(`${name}の${t.name}、各国の支援で封じ込め`);
      say('spark.contain', { name, what: t.name });
      continue;
    }
    s.sev = Math.min(100, s.sev + (s.grow ?? t.grow));
    if (s.sev >= 100 || g.year - s.start + 1 >= (s.deadline ?? t.deadline)) {
      t.outbreak(g, H, s);
      g.feed.push({ k: 'sys', cls: 'bad', text: `${name}の${t.name}：${t.outText}` });
      H.chron(`${name}の${t.name}が世界に拡大`);
      say('spark.outbreak', { name, what: t.name });
      continue;
    }
    keep.push(s);
  }
  g.sparks = keep;
}
