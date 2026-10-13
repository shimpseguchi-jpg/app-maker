// 世界イベント（POLICIES_EVENTS.md の 4 章）
// cond：起きる条件、who：対象の国を選ぶ、fx：効果（scope 'who' は対象国）、run：特別な処理
// ins：その年に差し込む政策、next：連鎖先（起きやすくなる）、coop：協調の成功例、repeat：何年おきに再発しうるか
// text：GM（ミッターマイヤー）の語り。{who} は対象国の名前
import { neighbors, isSeat, rel } from '../engine/core.js';

const act = (g) => g.seats.filter((id) => g.majors[id].panel).map((id) => g.majors[id]);
const bgs = (g) => Object.values(g.backs).filter((b) => !b.owner);
const avg = (g, k) => { const a = act(g); return a.length ? a.reduce((s, c) => s + c.stats[k], 0) / a.length : 0; };
const fired = (g, id) => g.fired[id] != null;
const since = (g, id) => (fired(g, id) ? g.year - g.fired[id] : 99);
const flagSince = (g, f) => (g.flags[f] != null ? g.year - g.flags[f] : 99);
const best = (arr, f) => arr.reduce((a, b) => (f(b) > f(a) ? b : a), arr[0]);
const ai = (g) => act(g).filter((c) => !c.player);

export const EVENTS = [
  // ───── 序盤：自国を豊かにする時代 ─────
  { id: 'E01', name: '危機の世界', cat: 'start', w: 0, cond: (g) => g.year === 1,
    text: '{year}年。世界の七十カ所で紛争が続き、エネルギー資源の枯渇は目前。条約の六割はとうに賞味期限切れだ。まずは自分の国を豊かにしてみたまえ。さて、どうする？' },
  { id: 'E02', name: '核開発国の出現', cat: 'mil', w: 50, repeat: 4, cond: (g) => flagSince(g, 'newNuke') <= 1,
    who: (g) => g.newNukeId, fx: ['world.tension+l', 'who.rep-m'], run: (g, H, who) => { for (const c of act(g)) if (c.id !== who) H.addRel(c.id, who, -15); },
    ins: ['P54', 'P24', 'P65'], next: ['E29', 'E58'],
    text: '{who}が核を手にした。お隣が持てば、自分も欲しくなる。そういうふうに世界はできている。さて、どうする？' },
  { id: 'E03', name: '代替エネルギーブーム', cat: 'eco', w: 30, cond: (g) => flagSince(g, 'altE') <= 3,
    fx: ['world.foodPrice+l', 'bgAll.food-s'], ins: ['P22', 'P30'], next: ['E04', 'E06'],
    text: '新エネルギーのおかげで、大豆やトウモロコシ、パームの需要が倍増した。燃料になる作物は、食べ物でもあるのだがね。' },
  { id: 'E04', name: '食糧危機', cat: 'fw', w: 20, repeat: 10, cond: (g) => g.world.foodPrice >= 75,
    fx: ['poorBg.food-m', 'poorBg.stability-m', 'world.refugees+m'], run: (g, H) => H.deaths(1.5),
    ins: ['P31', 'P14'], next: ['E05', 'E09'],
    text: '貧しい国の主食が、豊かな国の燃料に変わった。食べ物の値段が跳ね上がり、飢えが広がっている。さて、どうする？' },
  { id: 'E05', name: '食糧特許問題', cat: 'fw', w: 30, cond: (g) => g.flags.gmo != null,
    who: (g) => best(act(g), (c) => c.stats.patents).id, fx: ['who.gnp+s', 'who.rep-s', 'poorBg.econ-s'], ins: ['P53', 'P71'], next: ['E23'],
    text: '{who}の改良穀物には特許が付いている。畑に植えるたびに使用料が要る。昔から育ててきた作物まで、気づけば他国の権利になっていた。' },
  { id: 'E06', name: '森林の枯渇', cat: 'env', w: 20, cond: (g) => g.world.forestRes <= 50,
    fx: ['world.co2+s', 'bgAll.econ-s'], ins: ['P91'], next: ['E22', 'E51'],
    text: '森がものすごい速さで消えている。木材も紙も足りなくなり、森に棲んでいた生き物は、名前だけが図鑑に残った。' },
  { id: 'E07', name: '開発援助バブル', cat: 'eco', w: 25, cond: (g) => (g.counters.aidHigh || 0) >= 2,
    fx: ['world.wrate+m', 'majors.capital+s'], ins: ['P01', 'P52'], next: ['E08'],
    text: '高い金利の開発援助に、世界中の資本が群がっている。泡は、ふくらんでいる間がいちばん美しい。' },
  { id: 'E08', name: '援助先の連鎖破綻', cat: 'eco', w: 30, cond: (g) => fired(g, 'E07') && bgs(g).filter((b) => b.stats.debt >= 80).length >= 3,
    run: (g, H) => {
      for (const b of bgs(g)) if (b.stats.debt >= 80) { b.stats.econ = Math.max(0, b.stats.econ - 15); b.stats.stability = Math.max(0, b.stats.stability - 15); }
      for (const c of act(g)) if (c.stats.capital >= 70) H.fx(['who.capital-m', 'who.rep-s'], { who: c.id });
      g.flags.hate = g.year; H.deaths(0.5);
    },
    fx: ['world.refugees+m', 'world.tension+s'], ins: ['P53'], next: ['E09', 'E14'],
    text: '高金利で貸し付けた国々が、ばたばたと破綻した。返せない借金と一緒に残ったのは、貸した国への憎しみだ。' },
  { id: 'E09', name: '内乱と宗教戦争', cat: 'dom', w: 15, repeat: 6, cond: (g) => act(g).some((c) => c.stats.stability <= 35),
    who: (g) => best(act(g), (c) => -c.stats.stability).id, fx: ['who.stability-m', 'who.guerrilla+m', 'world.conflicts+m'],
    run: (g, H, who) => { if (g.majors[who].stats.stability < 18 && H.rng() < 0.5) H.collapse(who, '軍事クーデター'); },
    ins: ['P44', 'P43'], next: ['E15', 'E17'],
    text: '{who}で経済の不安が内乱に、内乱が宗教戦争に変わりつつある。政情不安を呼べば、軍が動く。さて、どうする？' },
  { id: 'E10', name: '報道', cat: 'misc', w: 0, repeat: 10, cond: (g) => g.year % 10 === 0,
    run: (g, H) => { const a = act(g); if (!a.length) return; const x = H.pick(a), y = H.pick(a); H.fx(['who.gnp+m'], { who: x.id }); H.fx(['who.stability-m'], { who: y.id }); H.say(`希望の知らせは${x.name}に、失望の知らせは${y.name}に届いた。`); },
    text: '十年ぶりの総括報道だ。希望と失望が、同時にやってくる。' },

  // ───── 中盤：資源をめぐる戦争 ─────
  { id: 'E11', name: '極地の地下資源', cat: 'res', w: 40, cond: (g) => g.world.ice <= 66,
    run: (g) => { g.flags.polarOil = g.year; }, ins: ['P21', 'P20'], next: ['E12'],
    text: '氷が解けて、その下から巨大な石油資源が顔を出した。誰のものでもない土地に、誰もが欲しがるものが現れたわけだ。さあ、どうする？' },
  { id: 'E12', name: '南極戦争', cat: 'mil', w: 40, cond: (g) => act(g).some((c) => c.flags.polar) && act(g).filter((c) => c.polar).length >= 2,
    run: (g, H) => {
      const cl = act(g).filter((c) => c.flags.polar || c.polar);
      for (const c of cl) { H.fx(['who.soldiers-m', 'who.fiscal-m'], { who: c.id }); for (const d of cl) if (d.id < c.id) H.addRel(c.id, d.id, -20); }
      g.flags.polarWar = g.year; H.deaths(0.3);
    },
    fx: ['world.conflicts+l', 'world.tension+l'], ins: ['P61', 'P55', 'P63'], next: ['E13'],
    text: '極地の石油をめぐって、ついに撃ち合いが始まった。氷の上の戦争は、補給が続くかぎり終わらない。さて、どうする？' },
  { id: 'E13', name: '双極戦争', cat: 'mil', w: 30, cond: (g) => since(g, 'E12') >= 2 && since(g, 'E12') < 10 && g.world.tension >= 60,
    run: (g, H) => { for (const c of act(g).filter((c) => c.flags.polar || c.polar)) H.fx(['who.fiscal-l', 'who.stability-s'], { who: c.id }); g.flags.twinWar = g.year; H.deaths(1); },
    fx: ['world.co2+m', 'world.conflicts+m'], ins: ['P64', 'P66', 'P55'], next: ['E14', 'E21', 'E16'],
    text: '北極でも撃ち合いが始まった。南と北、両方の極で同時に戦争だ。〝双極戦争〟と呼ばれることになるだろう。' },
  { id: 'E14', name: '同時多発テロ', cat: 'dom', w: 12, repeat: 12, cond: (g) => avg(g, 'guerrilla') >= 30 || flagSince(g, 'hate') <= 5 || flagSince(g, 'immigCut') <= 3,
    who: (g) => best(act(g), (c) => c.power).id, fx: ['who.stability-m', 'who.fiscal-m', 'who.gnp-s', 'world.tension+m'], run: (g, H) => H.deaths(0.003),
    ins: ['P44', 'P41', 'P87'], next: ['E19'],
    text: '{who}の象徴だった塔が崩れた。世界中の憎しみの矛先は、いちばん目立つ国に向かう。さて、どうする？' },
  { id: 'E15', name: 'ゲリラ軍の編制', cat: 'mil', w: 12, repeat: 8, cond: (g) => g.world.conflicts >= 55 && act(g).some((c) => c.stats.stability < 45),
    who: (g) => best(act(g), (c) => c.stats.guerrilla).id, fx: ['who.guerrilla+l', 'world.conflicts+s'], ins: ['P56', 'P61'], next: ['E12'],
    text: '{who}の周辺で、反政府組織がゲリラ軍を編制した。国が弱れば、銃を持つ者が増える。' },
  { id: 'E16', name: '双子の赤字', cat: 'eco', w: 15, repeat: 10, cond: (g) => act(g).some((c) => c.stats.fiscal <= -9),
    who: (g) => best(act(g), (c) => -c.stats.fiscal).id, fx: ['who.capital-m', 'who.debt+m'], ins: ['P04', 'P07'], next: ['E09'],
    text: '{who}のせっかくの黒字は、いまや〝双子の赤字〟だ。国債を出せば各国が買ってくれるうちは、まだ大丈夫だがね。' },
  { id: 'E17', name: '民族紛争と虐殺', cat: 'dom', w: 15, cond: (g) => bgs(g).some((b) => b.stats.stability <= 20) || act(g).some((c) => c.stats.ethnic >= 75),
    who: (g) => (g.backs.B12 && !g.backs.B12.owner ? 'B12' : best(bgs(g), (b) => -b.stats.stability).id),
    fx: ['who.stability-l', 'world.refugees+l', 'world.conflicts+m'], run: (g, H) => H.deaths(0.3), ins: ['P62', 'P55', 'P61'], next: ['E18'],
    text: '{who}で、止めようのない分裂と憎悪が虐殺に変わった。テロリストと差別団体が、そろって叫び声を上げている。さて、どうする？' },
  { id: 'E18', name: '人道介入と安保理決議', cat: 'intl', w: 40, cond: (g) => flagSince(g, 'airstrike') <= 2,
    fx: ['world.trust-s'], ins: ['P70', 'P71'],
    text: '安保理の決議を待たずに空爆が行われた。人を救うための爆弾は、法の上ではどう扱われるのか。議論は何年も続くだろう。' },
  { id: 'E19', name: '難民と差別団体', cat: 'dom', w: 15, cond: (g) => g.flags.immigCut != null && g.world.refugees >= 45,
    who: (g) => best(act(g), (c) => c.stats.ethnic).id, fx: ['who.ethnic+m', 'who.stability-s'], ins: ['P42', 'P43'], next: ['E17'],
    text: '移民の規制が、そのまま人種差別団体の看板になった。{who}の街角で、異なる民族同士の暴力が始まっている。' },
  { id: 'E20', name: '経済圏統一の気運', cat: 'dip', w: 20, cond: (g) => g.allies.length >= 3 && !g.bloc.length,
    run: (g, H) => {
      const m = act(g).filter((c) => g.allies.some((k) => k.split('-').includes(c.id))).map((c) => c.id);
      if (m.length >= 3) { g.bloc = m; for (const id of m) H.fx(['who.gnp+s'], { who: id }); H.chron(`経済圏が発足（${m.map((x) => g.majors[x].name).join('・')}）`); }
    },
    ins: ['P50', 'P05'], next: ['E26', 'E33', 'E64'],
    text: '手を結んだ国々の間に、経済圏統一の気運が高まっている。統一と離反、利害が錯綜するのはこれからだ。' },

  // ───── 終盤：水と統一 ─────
  { id: 'E21', name: '永久中立地帯', cat: 'intl', w: 30, cond: (g) => g.flags.twinWar != null && since(g, 'E13') >= 2 && g.world.tension < 65,
    fx: ['world.tension-l', 'world.conflicts-m', 'world.trust+s'], run: (g) => { g.flags.neutralPole = g.year; for (const c of act(g)) delete c.flags.polar; },
    next: ['E26'], text: '双極戦争は終わった。南極は以後、永久中立地帯として、どの国の国境線も引かれることはない。' },
  { id: 'E22', name: '二酸化炭素の夏', cat: 'env', w: 18, repeat: 8, cond: (g) => g.world.co2 >= 58,
    fx: ['world.rain-m', 'world.waterRes-m', 'majors.water-s', 'bgAll.water-s', 'world.foodPrice+m'], ins: ['P32', 'P33'], next: ['E23'],
    text: '〝二酸化炭素の夏〟だ。暑さで川が細り、飲み水が減っている。水の値段は、これから財布の厚さで決まるようになる。' },
  { id: 'E23', name: '水危機', cat: 'env', w: 20, repeat: 10, cond: (g) => g.world.waterRes <= 55 && g.world.rain <= 52,
    fx: ['majors.water-m', 'poorBg.stability-m', 'world.refugees+m'], run: (g, H) => { g.flags.waterCrisis = g.year; H.deaths(2); },
    ins: ['P33', 'P35'], next: ['E24'],
    text: '水が石油より高くなった。貧困層は泥水をすすり、疫病が大流行している。さて、どうする？' },
  { id: 'E24', name: '水管理法の世界化', cat: 'fw', w: 30, cond: (g) => act(g).filter((c) => c.laws?.water).length >= 3,
    run: (g, H) => { g.flags.waterLawWorld = g.year; for (const c of act(g)) if (!c.laws?.water) H.fx(['who.rep-m'], { who: c.id }); },
    ins: ['P33', 'P34'], next: ['E25', 'E28'],
    text: '〝水管理法〟を採る国が多数派になった。逆らう国は、たちまち国際社会で浮いてしまう。管理された水は、誰のための水なのだろうね。' },
  { id: 'E25', name: '水輸出国の台頭', cat: 'fw', w: 30, cond: (g) => g.flags.waterExport != null,
    who: (g) => best(act(g), (c) => c.stats.water).id, fx: ['who.gnp+m', 'majors.inequality+s'], ins: ['P34'], next: ['E28'],
    text: '{who}は水を売って、とてつもない富を集めている。水を持つ国と持たない国の格差は、かつてないほどだ。' },
  { id: 'E26', name: '国連の機能不全・解体', cat: 'intl', w: 25,
    cond: (g) => g.world.stage === 0 && g.year >= 12 && (g.world.conflicts >= 85 || (g.counters.unFail || 0) >= 2 || g.world.trust <= 40),
    run: (g, H) => H.stage(1), next: ['E27'],
    text: '国連が機能を失い、解体された。混乱の時代の終わりか、始まりか。世界統一の第一歩でもある。' },
  { id: 'E27', name: '真水の時代', cat: 'fw', w: 40, cond: (g) => g.flags.pureWater != null,
    who: (g) => best(act(g), (c) => c.stats.patents).id, fx: ['who.gnp+l', 'world.waterRes+l', 'majors.water+m'], ins: ['P35'],
    text: '{who}が真水を大量に作れるようになった。昨日まで金より高かった水が、急に値崩れしていく。この急変に、世界はついていけるかね？' },
  { id: 'E28', name: '水戦争', cat: 'mil', w: 20, repeat: 8,
    cond: (g) => (g.flags.waterLawWorld != null || g.flags.waterCrisis != null) && act(g).some((c) => c.stats.water <= 12),
    who: (g) => best(act(g), (c) => -c.stats.water).id,
    run: (g, H, who) => {
      const nb = neighbors(who).filter((id) => (isSeat(g, id) ? g.majors[id]?.panel : !g.backs[id].owner));
      const wet = best(nb.map((id) => ({ id, w: (isSeat(g, id) ? g.majors[id] : g.backs[id]).stats.water })), (x) => x.w);
      if (wet && !g.majors[who].player) H.war(who, wet.id, H.rng() < 0.4 ? 'ok' : 'ng');
      H.deaths(0.5);
    },
    fx: ['world.conflicts+m', 'world.tension+m'], ins: ['P61', 'P55'],
    text: '{who}が隣国の地下水を汲み上げ始めた。水をめぐる争いには、敵と味方のわかりやすい線が引けない。だから、終わらせ方も見えない。' },
  { id: 'E29', name: '核のボタン', cat: 'mil', w: 100, repeat: 4, special: 'nuke',
    cond: (g) => g.world.tension >= 72 && nukePair(g, 25) != null,
    text: '核保有国どうしの緊張が限界を超えた。国民は「撃て」と叫んでいる。' },
  { id: 'E30', name: '世界議会の最初の議題', cat: 'intl', w: 100, repeat: 1, special: 'vote', cond: (g) => g.world.stage === 4,
    text: 'こぎ着けたな。世界議会の最初の議題を選び、全会一致を目指してもらおう。' },

  // ───── 現実モチーフ：経済・金融 ─────
  { id: 'E31', name: '石油禁輸ショック', cat: 'eco', w: 40, repeat: 10, cond: (g) => flagSince(g, 'embargo') <= 1,
    run: (g, H) => { for (const c of act(g)) if (c.stats.oil < 30) H.fx(['who.gnp-m', 'who.fiscal-s'], { who: c.id }); },
    fx: ['world.foodPrice+s'], ins: ['P13', 'P85'], text: '石油の輸出が止まった。値段は数倍だ。石油を持たない国は、いまさら自分の弱みに気づいている。さて、どうする？' },
  { id: 'E32', name: '住宅債券ショック', cat: 'eco', w: 10, cond: (g) => g.year >= 6 && g.world.wrate <= 5 && avg(g, 'capital') >= 60,
    fx: ['majors.gnp-m', 'majors.capital-m', 'bgAll.econ-s'], run: (g) => { g.flags.finCrisis = g.year; },
    ins: ['P83', 'P84'], next: ['E33', 'E09'], text: '住宅を担保にした債券が紙くずになり、金融機関が連鎖破綻した。誰も止めなかった泡が、全員の足元で弾けたわけだ。' },
  { id: 'E33', name: '共通通貨圏の債務危機', cat: 'eco', w: 25, cond: (g) => g.bloc.length >= 3 && g.backs.B10 && g.backs.B10.stats.debt >= 80,
    who: () => 'B10', fx: ['who.econ-l', 'who.stability-m'], run: (g, H) => { for (const id of g.bloc) H.fx(['who.gnp-s'], { who: id }); },
    ins: ['P53', 'P07', 'P89'], next: ['E64'], text: '経済圏の弱い加盟国、{who}が破綻寸前だ。救うか、見捨てるか。共通の財布は、共通の痛みでもある。' },
  { id: 'E34', name: '通貨の空売り攻撃', cat: 'eco', w: 12, cond: (g) => act(g).some((c) => c.stats.rate >= 8 && c.stats.capital >= 45),
    who: (g) => best(act(g).filter((c) => c.stats.rate >= 8), (c) => c.stats.capital).id, fx: ['who.capital-l', 'who.gnp-m'], run: (g) => { g.flags.currency = g.year; },
    ins: ['P01', 'P84'], next: ['E09'], text: '{who}の通貨が投機筋に売り浴びせられている。集まった資本は、来たときより速く逃げていく。' },
  { id: 'E35', name: '札束が紙くずに', cat: 'eco', w: 15, cond: (g) => act(g).some((c) => c.stats.debt >= 150 && c.stats.fiscal <= -8 && c.stats.capital <= 45) || (g.backs.B07 && g.backs.B07.stats.debt >= 95),
    who: (g) => { const m = act(g).filter((c) => c.stats.debt >= 150 && c.stats.fiscal <= -8 && c.stats.capital <= 45); return m.length ? m[0].id : 'B07'; },
    fx: ['who.stability-l', 'who.gnp-m', 'who.guerrilla+m'], ins: ['P07'], next: ['E09', 'E62'],
    text: '{who}の物価が毎日倍になっている。パン一つ買うのに札束が要る。こういうとき、過激な者ほど声が大きくなる。' },
  { id: 'E36', name: '国家のデフォルト', cat: 'eco', w: 15, repeat: 8, cond: (g) => bgs(g).some((b) => b.stats.debt >= 95),
    who: (g) => best(bgs(g), (b) => b.stats.debt).id, fx: ['who.econ-l', 'who.stability-m'], run: (g, H) => { for (const c of act(g)) if (c.stats.capital >= 70) H.fx(['who.capital-s'], { who: c.id }); },
    ins: ['P53'], next: ['E08'], text: '{who}が借金を踏み倒した。貸した側は、貸したときの笑顔を思い出しているだろう。' },
  { id: 'E37', name: '関税戦争', cat: 'eco', w: 15, cond: (g) => { const a = act(g).sort((x, y) => y.stats.gnp - x.stats.gnp); return a.length >= 2 && rel(g, a[0].id, a[1].id) < 45; },
    run: (g, H) => { const a = act(g).sort((x, y) => y.stats.gnp - x.stats.gnp); H.fx(['who.gnp-s'], { who: a[0].id }); H.fx(['who.gnp-s'], { who: a[1].id }); H.addRel(a[0].id, a[1].id, -15); H.say(`${a[0].name}と${a[1].name}が、互いに関税を上げ合っている。`); },
    fx: ['world.treaty-s', 'bgAll.econ-s'], ins: ['P05', 'P54'], next: ['E38'], text: '世界の二大経済国が、関税の殴り合いを始めた。巻き添えになるのは、いつも周りの国だ。' },
  { id: 'E38', name: '半導体が足りない', cat: 'eco', w: 8, cond: (g) => fired(g, 'E37') || g.year >= 10,
    fx: ['majors.industry-s'], run: (g, H) => H.fx(['who.gnp+s'], { who: best(act(g), (c) => c.stats.tech).id }),
    ins: ['P12', 'P06'], text: '小さな部品が足りないだけで、世界中の工場が止まった。作れる国は、急に発言力を持つ。' },
  { id: 'E39', name: '運河の座礁', cat: 'eco', w: 6, cond: (g) => g.year >= 5,
    run: (g, H) => { for (const c of act(g)) if (c.stats.mobility >= 70) H.fx(['who.gnp-s'], { who: c.id }); }, ins: ['P50'],
    text: '大型船が一隻、運河で横向きに座礁した。それだけで世界の物流が数週間止まる。世界は案外、細い糸でつながっている。' },
  { id: 'E40', name: '電子通貨バブル', cat: 'eco', w: 8, cond: (g) => g.world.wrate <= 5 && avg(g, 'tech') >= 70,
    fx: ['majors.capital+s', 'majors.security-s'], next: ['E32'], text: '電子の通貨に投機マネーが殺到している。価値の裏付けは「みんなが欲しがること」だけだ。' },
  { id: 'E41', name: '新しい資源の革命', cat: 'res', w: 10, cond: (g) => avg(g, 'tech') >= 70 && g.year >= 10 && g.world.oilRes <= 65,
    fx: ['world.oilRes+m'], run: (g, H) => { for (const c of act(g)) if (c.stats.oil >= 80) H.fx(['who.fiscal-m', 'who.gnp-s'], { who: c.id }); },
    ins: ['P06'], next: ['E35'], text: '新しい採掘技術で、石油が急に余り始めた。石油に頼ってきた国の財政は、真っ青だ。' },
  { id: 'E42', name: '希少金属の禁輸', cat: 'res', w: 8, cond: (g) => g.year >= 8 && g.world.tension >= 50,
    who: (g) => best(act(g), (c) => c.stats.uranium + c.stats.industry / 2).id,
    run: (g, H, who) => { for (const c of act(g)) if (c.id !== who) { H.fx(['who.industry-s'], { who: c.id }); H.addRel(who, c.id, -8); } },
    ins: ['P24', 'P12'], next: ['E37'], text: '{who}が希少金属の輸出を止めた。ハイテク製品の心臓部が、他国の手の内にあったということだ。' },

  // ───── 現実モチーフ：感染症・健康 ─────
  { id: 'E43', name: '世界的大流行', cat: 'health', w: 6, cond: (g) => g.year >= 6 && !g.flags.pandemic && !fired(g, 'E43'),
    run: (g, H) => { g.flags.pandemic = g.year; H.deaths(4); }, fx: ['majors.gnp-m', 'majors.pop-s', 'majors.mobility-m'],
    ins: ['P80', 'P81', 'P82'], next: ['E44'], text: '未知の感染症が世界中に広がっている。人の往来が多い国ほど早く、深く。国境を閉じるか、手を取り合うか。さて、どうする？' },
  { id: 'E44', name: '治療薬の奪い合い', cat: 'health', w: 30, cond: (g) => g.flags.pandemic != null && since(g, 'E43') >= 1,
    fx: ['poorBg.stability-m'], run: (g, H) => H.deaths(1), ins: ['P81', 'P82', 'P31'], next: ['E47'],
    text: '治療薬ができた。だが豊かな国が買い占め、貧しい国では流行が終わらない。感染症は国境を気にしないのだがね。' },
  { id: 'E45', name: '致死性の高い風土病', cat: 'health', w: 8, cond: (g) => g.year >= 4 && bgs(g).some((b) => b.stats.stability <= 30 && b.stats.water <= 40),
    who: (g) => best(bgs(g).filter((b) => b.stats.water <= 40), (b) => -b.stats.stability).id, fx: ['who.stability-m'], run: (g, H) => H.deaths(0.1),
    ins: ['P31', 'P80'], next: ['E43'], text: '{who}で致死性の高い風土病が流行している。人が行き来すれば、病も行き来する。' },
  { id: 'E46', name: '食の安全パニック', cat: 'health', w: 5, cond: (g) => g.year >= 5 && act(g).some((c) => c.stats.food >= 120),
    who: (g) => best(act(g), (c) => c.stats.food).id, fx: ['who.gnp-s', 'world.foodPrice+s'], ins: ['P30'],
    text: '{who}産の食肉から病原体が見つかった。各国が一斉に輸入を止めている。' },
  { id: 'E47', name: '天然痘の根絶', cat: 'health', w: 40, coop: true, cond: (g) => g.flags.vaccineCoop != null && g.allies.length >= 2,
    fx: ['world.trust+l', 'majors.rep+s', 'majors.pop+s'],
    text: '各国が手を取り合い、ひとつの病を地上から根絶した。人類が協調して勝ち取った、数少ない完全勝利だ。' },

  // ───── 現実モチーフ：環境・災害 ─────
  { id: 'E48', name: '巨大地震と津波', cat: 'disaster', w: 6, repeat: 12, cond: (g) => g.year >= 3,
    who: (g) => { const q = act(g).filter((c) => c.quake); return q.length ? q[Math.floor(g.year * 7) % q.length].id : 'B28'; },
    fx: ['who.industry-m', 'who.pop-s', 'who.gnp-m', 'who.stability-s'],
    run: (g, H, who) => { H.deaths(0.05); if (isSeat(g, who) && g.majors[who].flags.plant) { g.flags.quakePlant = g.year; g.quakePlantId = who; } },
    ins: ['P31', 'P64'], next: ['E49'], text: '{who}を巨大地震と津波が襲った。自然は、国力の順番を考慮してくれない。' },
  { id: 'E49', name: '原子力発電所の事故', cat: 'disaster', w: 10, cond: (g) => flagSince(g, 'quakePlant') <= 1 || act(g).some((c) => c.flags.plant && c.stats.tech < 60),
    who: (g) => (flagSince(g, 'quakePlant') <= 1 ? g.quakePlantId : act(g).find((c) => c.flags.plant && c.stats.tech < 60).id),
    fx: ['who.stability-m', 'who.altE-m', 'who.rep-s', 'who.gnp-s'], run: (g) => { g.flags.nukeAccident = g.year; },
    ins: ['P86'], next: ['E31'], text: '{who}の原子力発電所で事故が起きた。周辺の土地は、長いあいだ使えなくなる。各国で脱原発の声が上がっている。' },
  { id: 'E50', name: '巨大ハリケーン', cat: 'disaster', w: 8, repeat: 10, cond: (g) => g.world.co2 >= 50,
    who: (g) => (g.majors.M01?.panel ? 'M01' : 'B03'), fx: ['who.gnp-s', 'who.inequality+s', 'who.stability-s'], run: (g, H) => H.deaths(0.002),
    ins: ['P40', 'P31'], text: '巨大ハリケーンが{who}の沿岸都市を水没させた。逃げられなかったのは、車を持たない人々だった。' },
  { id: 'E51', name: '大森林の火災', cat: 'disaster', w: 10, repeat: 10, cond: (g) => g.world.forestRes <= 60 && g.world.co2 >= 50,
    who: (g) => best(act(g), (c) => c.stats.forest).id, fx: ['who.forest-l', 'world.forestRes-m', 'world.co2+m'],
    ins: ['P91', 'P54'], next: ['E22'], text: '{who}の大森林が燃えている。燃えた森は、二酸化炭素になって世界中に配られる。' },
  { id: 'E52', name: '火山の冬', cat: 'disaster', w: 4, cond: (g) => g.year >= 3,
    fx: ['world.foodPrice+m', 'majors.food-s', 'world.co2-s'], ins: ['P31'], next: ['E04'],
    text: '巨大な火山の噴火で、空が灰に覆われた。夏が来ない。作物が育たない。' },
  { id: 'E53', name: '消えた内海', cat: 'env', w: 10, cond: (g) => g.world.waterRes <= 58 && g.backs.B26 && !g.backs.B26.owner,
    who: () => 'B26', fx: ['who.water-l', 'who.stability-m'], ins: ['P33'],
    text: '灌漑で水を引きすぎた結果、{who}の巨大な内海が干上がった。漁業も人々の健康も、湖と一緒に消えた。' },
  { id: 'E54', name: '空を覆うバッタ', cat: 'disaster', w: 6, cond: (g) => g.world.rain <= 55 && g.year >= 4,
    who: (g) => (g.backs.B22 && !g.backs.B22.owner ? 'B22' : best(bgs(g), (b) => -b.stats.food).id), fx: ['who.food-l', 'poorBg.food-s'], run: (g, H) => H.deaths(0.2),
    ins: ['P31'], next: ['E04'], text: '空を覆うほどのバッタの群れが、{who}の畑を食い尽くした。飢饉はすぐそこだ。' },
  { id: 'E55', name: '沈む島国', cat: 'env', w: 15, cond: (g) => g.world.ice <= 60,
    who: (g) => (g.backs.B29 && !g.backs.B29.sunk ? 'B29' : 'B30'), run: (g, H, who) => { const b = g.backs[who]; b.sunk = true; b.stats.stability = 0; b.stats.econ = 0; H.chron(`${b.name}、海面上昇で国土を失う`); },
    fx: ['world.refugees+l'], ins: ['P42', 'P91'], next: ['E19'], text: '海面上昇で、{who}が国土を失った。国がなくなっても、国民はなくならない。' },
  { id: 'E56', name: '空の穴の修復', cat: 'env', w: 40, coop: true, cond: (g) => act(g).filter((c) => c.laws?.envTreaty).length >= 3,
    fx: ['world.co2-m', 'world.trust+m'], text: '環境条約を結んだ国々の努力で、空に開いた穴がふさがり始めた。やればできるという証拠だよ。' },
  { id: 'E57', name: '海を覆うプラスチック', cat: 'env', w: 6, cond: (g) => avg(g, 'industry') >= 62 && g.year >= 8,
    fx: ['majors.food-s', 'bgAll.food-s'], ins: ['P91'], text: '海の魚の腹の中から、ゴミが見つかるようになった。規制するか、見なかったことにするか。' },

  // ───── 現実モチーフ：政治・紛争 ─────
  { id: 'E58', name: '島の海峡危機', cat: 'mil', w: 15, cond: (g) => g.world.tension >= 52 && nukePair(g, 35) != null,
    fx: ['world.tension+l'], ins: ['P55', 'P54'], next: ['E29'],
    text: '核保有国が、敵の目と鼻の先に核を運び込んだ。十三日間のにらみ合いになるぞ。外交で回避できるかね？' },
  { id: 'E59', name: '壁の崩壊', cat: 'dip', w: 8, cond: (g) => g.year >= 8 && act(g).some((c) => c.region === 'eu' && c.stats.stability >= 60),
    who: (g) => best(act(g).filter((c) => c.region === 'eu'), (c) => c.stats.stability).id, fx: ['who.fiscal-m', 'who.stability+m', 'who.gnp+s'],
    run: (g, H, who) => H.rename(who, 'unify'), ins: ['P50'], next: ['E20'],
    text: '分断の象徴だった壁が崩れ、{who}は一つになった。統一の喜びと、統一の請求書が、同時に届く。' },
  { id: 'E60', name: '超大国の解体', cat: 'dom', w: 20, cond: (g) => act(g).some((c) => c.stats.nuke >= 4 && c.stats.stability <= 28 && c.stats.fiscal <= -6),
    who: (g) => act(g).find((c) => c.stats.nuke >= 4 && c.stats.stability <= 28 && c.stats.fiscal <= -6).id,
    fx: ['who.soldiers-l', 'who.gnp-m'], run: (g, H, who) => { g.flags.looseNukes = g.year; H.rename(who, 'breakup'); },
    next: ['E61'], text: '{who}が解体した。地図は描き直され、核のありかは曖昧になった。' },
  { id: 'E61', name: '行方不明の核', cat: 'mil', w: 40, cond: (g) => flagSince(g, 'looseNukes') <= 2,
    fx: ['world.tension+l', 'majors.guerrilla+s'], ins: ['P24'], next: ['E14', 'E29'],
    text: '解体のどさくさで、核物質が闇市場に流れた。テロ組織が核を持つ。最悪の想像が、最悪の現実になりかけている。' },
  { id: 'E62', name: '民主化の連鎖', cat: 'dom', w: 15, cond: (g) => act(g).some((c) => (c.flags.censor || 0) >= 2 && c.stats.inequality >= 55),
    who: (g) => act(g).find((c) => (c.flags.censor || 0) >= 2 && c.stats.inequality >= 55).id,
    run: (g, H, who) => {
      if (H.rng() < 0.5) { H.fx(['who.stability-m', 'who.rep+m'], { who }); H.rename(who, 'reform'); H.say('体制が倒れ、新しい政府ができた。'); }
      else { H.fx(['who.stability-l', 'who.guerrilla+l', 'world.conflicts+m'], { who }); H.say('抗議は鎮まらず、内戦に変わった。'); }
      g.majors[who].flags.censor = 0;
    },
    ins: ['P88', 'P43'], next: ['E09', 'E65'], text: '{who}で、情報網を通じて抗議が連鎖している。統制しても、言葉は網目をすり抜ける。' },
  { id: 'E63', name: '広場の弾圧', cat: 'dom', w: 10, cond: (g) => act(g).some((c) => (c.flags.censor || 0) >= 1 && c.stats.stability <= 50),
    who: (g) => act(g).find((c) => (c.flags.censor || 0) >= 1 && c.stats.stability <= 50).id, fx: ['who.rep-l', 'who.stability+s'], ins: ['P44'],
    text: '{who}の広場に戦車が入った。国内は静かになった。世界はその静けさを忘れないだろう。' },
  { id: 'E64', name: '経済圏からの離脱', cat: 'dip', w: 12, cond: (g) => g.bloc.length >= 3 && g.world.refugees >= 45 && g.bloc.some((id) => g.majors[id].panel && g.majors[id].stats.stability <= 60),
    who: (g) => best(g.bloc.map((id) => g.majors[id]).filter((c) => c.panel), (c) => -c.stats.stability).id,
    run: (g, H, who) => { if (!g.majors[who].player) { g.bloc = g.bloc.filter((x) => x !== who); H.fx(['who.gnp-s'], { who }); H.chron(`${g.majors[who].name}、国民投票で経済圏から離脱`); } },
    ins: ['P89'], next: ['E33'], text: '{who}で、経済圏からの離脱を問う国民投票が行われた。移民と規制への不満が、結束より強かった。' },
  { id: 'E65', name: '大量難民', cat: 'dom', w: 12, repeat: 8, cond: (g) => g.world.conflicts >= 50 && bgs(g).some((b) => b.stats.stability <= 18),
    who: (g) => best(bgs(g), (b) => -b.stats.stability).id,
    run: (g, H, who) => { for (const c of act(g)) if (c.region === 'eu' || c.region === 'me') H.fx(['who.ethnic+s', 'who.stability-s'], { who: c.id }); },
    fx: ['world.refugees+l'], ins: ['P42', 'P41'], next: ['E19'], text: '{who}の内戦から、数百万人が逃げ出した。受け入れるか、門を閉ざすか。どちらにしても国は割れる。' },
  { id: 'E66', name: '隣国への侵攻と併合', cat: 'mil', w: 10, repeat: 8,
    cond: (g) => ai(g).some((c) => c.stats.soldiers >= 60 && ['ambition', 'order'].includes(c.persona) && neighbors(c.id).some((id) => !isSeat(g, id) && g.backs[id] && !g.backs[id].owner && g.backs[id].stats.stability <= 50)),
    who: (g) => ai(g).find((c) => c.stats.soldiers >= 60 && ['ambition', 'order'].includes(c.persona) && neighbors(c.id).some((id) => !isSeat(g, id) && g.backs[id] && !g.backs[id].owner && g.backs[id].stats.stability <= 50)).id,
    run: (g, H, who) => {
      const v = neighbors(who).filter((id) => !isSeat(g, id) && g.backs[id] && !g.backs[id].owner && g.backs[id].stats.stability <= 50);
      const t = best(v, (id) => -g.backs[id].stats.stability);
      H.war(who, t, H.rng() < 0.55 ? 'ok' : 'ng');
    },
    fx: ['world.foodPrice+m'], ins: ['P54', 'P64', 'P55'], next: ['E31', 'E04'],
    text: '{who}が隣国に軍を進めた。制裁か、武器の支援か、停戦の仲介か。さて、どうする？' },
  { id: 'E67', name: '油田の炎上', cat: 'mil', w: 30, cond: (g) => flagSince(g, 'oilWar') <= 1,
    fx: ['world.co2+m', 'world.oilRes-s'], ins: ['P61'], next: ['E22'], text: '撤退する軍が、油田に火を放っていった。黒い煙が空を覆い、石油が空に燃えていく。' },
  { id: 'E68', name: '存在しない兵器', cat: 'mil', w: 8, cond: (g) => g.world.tension >= 55 && ai(g).some((c) => c.stats.soldiers >= 80),
    who: (g) => best(ai(g), (c) => c.stats.soldiers).id, fx: ['world.tension+m', 'who.rep-s'], run: (g) => { g.flags.wmd = g.year; },
    ins: ['P70', 'P71'], text: '{who}が「あの国は大量破壊兵器を隠している」と言い出した。証拠はまだない。疑惑だけで戦争を始めた国は、歴史上いくつもあるがね。' },
  { id: 'E69', name: '海の上の要塞', cat: 'mil', w: 8, cond: (g) => g.world.tension >= 45 && g.year >= 6 && act(g).some((c) => c.region === 'as'),
    who: (g) => (g.majors.M12?.panel ? 'M12' : best(act(g).filter((c) => c.region === 'as'), (c) => c.stats.soldiers).id),
    fx: ['who.bases+s', 'world.tension+m'], ins: ['P71', 'P61'], next: ['E21'],
    text: '{who}が海の上に人工の島を造り、基地を置いた。地図に載っていない島をめぐって、周辺国が衝突寸前だ。' },
  { id: 'E70', name: '海賊の海', cat: 'mil', w: 10, repeat: 10, cond: (g) => g.backs.B19 && g.backs.B19.stats.stability <= 20,
    run: (g, H) => { for (const c of act(g)) if (c.stats.mobility >= 60) H.fx(['who.gnp-s'], { who: c.id }); },
    ins: ['P61', 'P53'], text: '破綻した国の沖で、海賊が輸送船を襲っている。食えない国の若者が、銃を持って海に出た結果だ。' },
  { id: 'E71', name: '球技の戦争', cat: 'mil', w: 3, cond: (g) => g.year >= 5,
    run: (g, H) => { const b = H.pick(bgs(g)); H.fx(['who.stability-m'], { who: b.id }); H.say(`発端は${b.name}と隣国のサッカーの試合だった。`); },
    fx: ['world.conflicts+s'], ins: ['P55'], text: '国際大会の試合をきっかけに、本当の戦争が始まった。冗談のようだが、冗談ではない。' },
  { id: 'E72', name: '差別政策の撤廃', cat: 'dom', w: 40, coop: true, cond: (g) => (g.counters.sanction || 0) >= 2 && g.flags.harmony != null,
    fx: ['world.trust+m', 'majors.ethnic-s'], text: '長い制裁と融和の努力の末に、一つの国が差別の制度を捨てた。世界は、ときどき良い方へ動く。' },

  // ───── 現実モチーフ：技術・情報 ─────
  { id: 'E73', name: '世界をつなぐ網', cat: 'tech', w: 15, cond: (g) => g.year >= 4 && act(g).filter((c) => c.stats.tech >= 80).length >= 3,
    run: (g) => { g.flags.internet = g.year; }, fx: ['majors.literacy+s', 'majors.mobility+s'], next: ['E62', 'E74'],
    text: '世界中の端末が一つの網でつながった。知識は速く広がり、統制は効きにくくなる。良くも悪くも。' },
  { id: 'E74', name: '見えない攻撃', cat: 'tech', w: 10, repeat: 8, cond: (g) => g.flags.internet != null && g.world.tension >= 45,
    who: (g) => { const v = act(g).filter((c) => !c.flags.cyber); return (v.length ? best(v, (c) => c.stats.gnp) : best(act(g), (c) => c.stats.gnp)).id; },
    fx: ['who.gnp-s', 'who.security-s'], ins: ['P87', 'P54'], text: '{who}の電力網と病院が止まった。攻撃したのが誰なのか、どこにも証拠はない。' },
  { id: 'E75', name: '暴かれた機密', cat: 'tech', w: 8, cond: (g) => g.flags.internet != null && g.year >= 10,
    who: (g) => best(act(g), (c) => c.stats.tech).id, fx: ['who.rep-m'], run: (g, H, who) => { for (const c of act(g)) if (c.id !== who) H.addRel(who, c.id, -10); },
    text: '{who}が同盟国まで盗聴していたことが暴露された。信頼は、築くのに十年、失うのに一日だ。' },
  { id: 'E76', name: '選挙への介入', cat: 'tech', w: 8, cond: (g) => g.flags.internet != null && g.world.tension >= 50,
    who: (g) => best(act(g), (c) => c.stats.mobility).id, fx: ['who.stability-m'], ins: ['P87'], next: ['E62'],
    text: '{who}の選挙に、外国からの介入があったらしい。結果が正しかったのかどうか、もう誰にもわからない。' },
  { id: 'E77', name: '考える機械', cat: 'tech', w: 10, cond: (g) => g.year >= 12 && (avg(g, 'tech') >= 72 || act(g).some((c) => c.stats.tech >= 97)),
    run: (g, H) => { for (const c of act(g)) if (c.stats.tech >= 70) H.fx(['who.industry+m', 'who.inequality+m'], { who: c.id }); }, ins: ['P12'],
    text: '考える機械が急速に広まった。生産は伸び、同時に仕事を失う人も増えている。' },
  { id: 'E78', name: '命の設計図', cat: 'tech', w: 10, cond: (g) => act(g).reduce((s, c) => s + c.stats.patents, 0) >= 120,
    fx: ['majors.tech+s'], ins: ['P71'], next: ['E05'], text: '人間の設計図が読み解かれた。医療は進む。だが、命に特許を付けてよいのかで、世界は割れている。' },
  { id: 'E79', name: '宇宙を目指す競争', cat: 'tech', w: 10, cond: (g) => spaceRivals(g) != null,
    run: (g, H) => { const [a, b] = spaceRivals(g); for (const id of [a, b]) H.fx(['who.tech+m', 'who.fiscal-s'], { who: id }); H.say(`${g.majors[a].name}と${g.majors[b].name}が、競って宇宙を目指している。`); },
    fx: ['world.tension+s'], ins: ['P90'], next: ['E80'], text: '空の向こうも、競争の舞台になった。ロケットとミサイルは、作り方がよく似ている。' },
  { id: 'E80', name: '国境のない研究所', cat: 'tech', w: 40, coop: true, cond: (g) => (g.counters.space || 0) >= 3,
    fx: ['world.trust+m'], run: (g, H) => { const a = act(g); for (const x of a) for (const y of a) if (x.id < y.id) H.addRel(x.id, y.id, 5); },
    text: '国境のない研究所が完成した。宇宙からは、地図の国境線は見えない。' },
];

// 核を持つ国どうしで、関係が冷え切った組
export function nukePair(g, th = 20) {
  const n = act(g).filter((c) => c.stats.nuke >= 4);
  let pair = null, low = th;
  for (const a of n) for (const b of n) if (a.id < b.id && rel(g, a.id, b.id) < low) { low = rel(g, a.id, b.id); pair = [a.id, b.id]; }
  return pair;
}
function spaceRivals(g) {
  const t = act(g).filter((c) => c.stats.tech >= 80);
  for (const a of t) for (const b of t) if (a.id < b.id && rel(g, a.id, b.id) < 45) return [a.id, b.id];
  return null;
}

export const EVENT_BY_ID = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
