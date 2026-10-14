// 追加の世界イベント（POLICIES_EVENTS.md の 4.5〜4.9）：南極・北極、いまの問題、過去の問題、未来の問題、火種
// 書き方は events.js と同じ。「モチーフ」はコメントに書き、ゲーム画面には出さない
import { neighbors, isSeat, rel } from '../engine/core.js';
import { act, bgs, avg, fired, since, flagSince, best, ai, live } from './evhelp.js';

const north = (g) => act(g).filter((c) => c.polar === 'N');
const coastalBig = (g) => act(g).filter((c) => ['M13', 'M15', 'M14', 'M01', 'M12', 'M11', 'M04'].includes(c.id));
const pickBg = (g, f) => { const a = bgs(g).filter(f); return a.length ? a[Math.floor((g.year * 13) % a.length)].id : null; };

export const EVENTS_MORE = [
  // ───── 南極・北極 ─────
  // モチーフ：北極海航路（北東航路・北西航路）
  { id: 'E81', name: '北極海航路の開通', cat: 'polar', w: 25, cond: (g) => g.world.ice <= 62,
    run: (g, H) => { g.flags.arcticRoute = g.year; for (const c of act(g)) H.fx([c.polar === 'N' ? 'who.gnp+s' : c.stats.mobility >= 80 ? 'who.gnp-s' : 'who.mobility+s'], { who: c.id }); },
    fx: ['world.biodiv-s'], ins: ['P93'], text: '北極の氷が夏のあいだ消えて、新しい航路が開いた。北の国には近道ができ、南の海峡で稼いでいた国は客を失う。' },
  // モチーフ：永久凍土の融解とメタン
  { id: 'E82', name: '永久凍土の融解', cat: 'polar', w: 15, cond: (g) => g.world.co2 >= 56,
    run: (g, H) => { for (const c of north(g)) H.fx(['who.gnp-s', 'who.fiscal-s'], { who: c.id }); }, fx: ['world.co2+m'],
    ins: ['P91'], text: '凍った大地が解け始めた。閉じ込められていたメタンが空に出て、温暖化をさらに早める。北の国では道路とパイプラインが傾いている。' },
  // モチーフ：南極条約の環境保護議定書の見直し（2048年以降に可能）
  { id: 'E83', name: '南極条約の見直し', cat: 'polar', w: 30, cond: (g) => g.year >= 20,
    run: (g) => { g.flags.antarcticReview = g.year; g.counters.antKeep = 0; g.counters.antOpen = 0; }, ins: ['P94', 'P95'], next: ['E84', 'E85'],
    text: '南極の鉱物資源の開発禁止を続けるかどうか、見直しの時期が来た。資源を取るか、最後の手つかずの大陸を残すか。さて、どうする？' },
  { id: 'E84', name: '南極条約の延長', cat: 'polar', w: 40, coop: true, cond: (g) => g.flags.antarcticReview != null && (g.counters.antKeep || 0) >= 3,
    fx: ['world.trust+m', 'world.tension-s'], text: '南極の開発禁止が延長された。どの国も手を付けないと約束した土地が、地球に一つ残った。' },
  { id: 'E85', name: '南極の資源開発ラッシュ', cat: 'polar', w: 40, cond: (g) => g.flags.antarcticReview != null && (g.counters.antOpen || 0) >= 2,
    fx: ['world.biodiv-l', 'world.tension+m', 'world.co2+s'], next: ['E12'], text: '南極の開発が解禁された。掘削船が殺到し、氷の大陸に油の染みが広がっていく。' },
  // モチーフ：西南極氷床の崩壊（未来）
  { id: 'E86', name: '西南極の氷床崩壊', cat: 'polar', w: 30, cond: (g) => g.world.ice <= 40,
    run: (g, H) => { H.deaths(1); for (const c of coastalBig(g)) H.fx(['who.gnp-m', 'who.stability-s'], { who: c.id }); for (const id of ['B29', 'B30', 'B03']) if (g.backs[id] && !g.backs[id].sunk) { g.backs[id].sunk = true; g.backs[id].stats.stability = 0; } },
    fx: ['world.refugees+l', 'world.ice-l'], ins: ['P42', 'P91'], next: ['E99'], text: '南極の巨大な氷床が海に滑り落ちた。海面が一気に上がり、世界中の沿岸都市が水に浸かっている。' },
  { id: 'E87', name: '北極の軍事化', cat: 'polar', w: 12, cond: (g) => north(g).length >= 2 && (g.flags.polarOil != null || g.flags.arcticRoute != null),
    run: (g, H) => { const n = north(g); for (const c of n) H.fx(['who.bases+s', 'who.fiscal-s'], { who: c.id }); for (const a of n) for (const b of n) if (a.id < b.id) H.addRel(a.id, b.id, -10); },
    fx: ['world.tension+m'], ins: ['P102', 'P60'], text: '北極の海に、潜水艦と基地が集まり始めた。氷が消えた場所は、国境線の引き直しの場になる。' },
  // モチーフ：グリーンランド買収騒動
  { id: 'E88', name: '巨大な島の買収騒動', cat: 'polar', w: 8, cond: (g) => g.year >= 8 && act(g).some((c) => c.id === 'M06') && act(g).some((c) => c.id !== 'M06' && c.power >= 80),
    who: (g) => best(act(g).filter((c) => c.id !== 'M06'), (c) => c.power).id, run: (g, H, who) => { H.addRel(who, 'M06', -20); H.say(`${g.majors[who].name}が、${g.majors.M06.name}の北の島を丸ごと買い取りたいと言い出した。`); },
    fx: ['who.rep-s'], text: '国を、お金で買う。冗談に聞こえるが、本気で言っている元首がいる。' },
  { id: 'E89', name: '南極海のオキアミ漁', cat: 'polar', w: 10, cond: (g) => g.world.foodPrice >= 65,
    fx: ['world.biodiv-m', 'world.foodPrice-s'], ins: ['P98', 'P97'], text: '南極の海で、小さなエビの奪い合いが始まった。クジラもペンギンも、同じエビを食べて生きているのだがね。' },

  // ───── いまの問題：人口・社会 ─────
  { id: 'E90', name: '少子高齢化と年金', cat: 'society', w: 12, repeat: 15, cond: (g) => g.year >= 8 && act(g).some((c) => c.stats.literacy >= 98 && !c.flags.aging),
    who: (g) => act(g).find((c) => c.stats.literacy >= 98 && !c.flags.aging).id, run: (g, H, who) => { g.majors[who].flags.aging = g.year; },
    fx: ['who.fiscal-m', 'who.industry-s'], ins: ['P96', 'P42'], text: '{who}では、子どもが減り、お年寄りが増え続けている。年金を払う人より、受け取る人のほうが多くなる日が近い。' },
  { id: 'E91', name: '人口爆発', cat: 'society', w: 10, cond: (g) => act(g).some((c) => c.stats.literacy < 85),
    who: (g) => best(act(g), (c) => -c.stats.literacy).id, fx: ['who.pop+s', 'who.food-m', 'who.water-s', 'who.inequality+s'], ins: ['P10', 'P30'],
    text: '{who}の人口が爆発的に増えている。若い国には勢いがある。食べ物と仕事が足りればの話だが。' },
  { id: 'E92', name: '巨大都市のスラム化', cat: 'society', w: 10, repeat: 12, cond: (g) => act(g).some((c) => c.stats.inequality >= 65),
    who: (g) => best(act(g), (c) => c.stats.inequality).id, fx: ['who.security-m', 'who.guerrilla+s'], ins: ['P40', 'P10'],
    text: '{who}の首都の周りに、地図に載らない街が広がっている。上下水道も、警察も届かない。' },
  { id: 'E93', name: '頭脳流出', cat: 'society', w: 10, cond: (g) => act(g).some((c) => c.stats.literacy >= 90 && c.stats.gnp / c.stats.pop < 0.01) && act(g).some((c) => c.stats.tech >= 85),
    who: (g) => act(g).find((c) => c.stats.literacy >= 90 && c.stats.gnp / c.stats.pop < 0.01).id,
    run: (g, H, who) => { H.fx(['who.tech-m'], { who }); H.fx(['who.tech+s'], { who: best(act(g), (c) => c.stats.tech).id }); }, ins: ['P11', 'P03'],
    text: '{who}で育った技術者が、給料の高い国へ次々と出ていく。教育にかけたお金は、他国の利益になった。' },

  // ───── いまの問題：環境 ─────
  { id: 'E94', name: '生物の大量絶滅', cat: 'env', w: 15, cond: (g) => g.world.biodiv <= 50,
    fx: ['majors.food-s', 'world.trust-s'], ins: ['P97', 'P91'], text: '一年に何千もの生き物が姿を消している。地球の歴史で六度目の大量絶滅だと言われている。' },
  { id: 'E95', name: '海の酸性化とサンゴの白化', cat: 'env', w: 12, cond: (g) => g.world.co2 >= 54,
    run: (g, H) => { for (const c of coastalBig(g)) H.fx(['who.food-s'], { who: c.id }); }, fx: ['world.biodiv-m', 'bgAll.food-s'], ins: ['P91', 'P97'],
    text: '海が二酸化炭素を吸って酸っぱくなり、サンゴが真っ白に死んでいく。海の生き物の四分の一が、サンゴ礁で暮らしているのだがね。' },
  { id: 'E96', name: '漁業資源の枯渇', cat: 'env', w: 12, cond: (g) => g.world.biodiv <= 58,
    run: (g) => { g.flags.fishCrisis = g.year; }, fx: ['majors.food-s', 'world.foodPrice+s'], ins: ['P98', 'P97'],
    text: '網を投げても魚が上がらない。獲れるだけ獲った結果だ。漁獲を減らす約束が、どの国にできるかね？' },
  { id: 'E97', name: '砂漠化', cat: 'env', w: 10, repeat: 12, cond: (g) => g.world.rain <= 52,
    run: (g, H) => { for (const id of ['M09', 'B26', 'B22', 'B19']) if (live(g, id)) H.fx(['who.food-m', 'who.stability-s'], { who: id }); }, ins: ['P97', 'P31'],
    text: '砂漠が毎年、畑を飲み込んでいく。土地を失った農民は、都市か国境の向こうへ向かう。' },
  { id: 'E98', name: '殺人的な熱波', cat: 'env', w: 12, repeat: 6, cond: (g) => g.world.co2 >= 58,
    run: (g, H) => { H.deaths(0.2 + (g.world.co2 - 58) / 50); for (const c of act(g)) if (c.stats.gnp / c.stats.pop < 0.02) H.fx(['who.stability-s'], { who: c.id }); },
    ins: ['P91'], text: '気温が五十度を超えた。冷房のない家で、お年寄りから倒れていく。' },
  { id: 'E99', name: '気候難民', cat: 'env', w: 15, repeat: 8, cond: (g) => g.world.env <= 42,
    fx: ['world.refugees+l'], run: (g, H) => { for (const c of act(g)) if (c.region === 'eu' || c.region === 'na') H.fx(['who.ethnic+s'], { who: c.id }); },
    ins: ['P42', 'P41'], next: ['E19'], text: '住めなくなった土地から、人々が移り始めた。戦争からではなく、天気から逃げる難民だ。' },

  // ───── いまの問題：健康 ─────
  { id: 'E100', name: '耐性菌の拡大', cat: 'health', w: 8, cond: (g) => g.year >= 10,
    run: (g, H) => { g.flags.amr = g.year; H.deaths(0.5); }, fx: ['majors.pop-s'], ins: ['P99', 'P81'],
    text: '抗生物質が効かない細菌が広がっている。家畜にも人にも薬を使いすぎた結果だ。かすり傷が命取りになる時代が戻ってくる。' },
  { id: 'E101', name: '飢餓と肥満', cat: 'health', w: 6, cond: (g) => g.year >= 6 && act(g).some((c) => c.stats.food >= 110),
    run: (g, H) => { for (const c of act(g)) if (c.stats.food >= 110) H.fx(['who.fiscal-s'], { who: c.id }); }, fx: ['poorBg.food-s'], ins: ['P31'],
    text: 'ある国では食べすぎで病気になり、別の国では食べられずに死んでいく。食べ物の量は、足りているはずなのだがね。' },

  // ───── いまの問題：経済 ─────
  // モチーフ：インフラ融資と港の接収（債務の罠）
  { id: 'E102', name: '債務の罠', cat: 'eco', w: 15, cond: (g) => (g.counters.aidHigh || 0) >= 3,
    who: (g) => best(act(g), (c) => c.stats.capital).id, run: (g, H, who) => { const b = pickBg(g, (x) => x.stats.debt >= 70); if (b) { g.backs[b].stats.stability -= 10; H.say(`返済できなくなった${g.backs[b].name}の港が、担保として取り上げられた。`); } },
    fx: ['who.bases+s', 'who.rep-m'], ins: ['P120', 'P53'], text: '{who}が貸した道路と港の代金が、返ってこない。代わりに受け取ったのは、その港そのものだった。' },
  { id: 'E103', name: '租税回避地', cat: 'eco', w: 10, cond: (g) => g.year >= 6,
    run: (g, H) => { g.flags.taxHaven = g.year; const h = act(g).find((c) => c.id === 'M14'); for (const c of act(g)) H.fx([c === h ? 'who.capital+m' : 'who.fiscal-s'], { who: c.id }); },
    ins: ['P100'], text: '大企業と大富豪の資産が、税金のほとんどかからない小さな島や都市に流れている。ほかの国の税収は、そのぶん減る。' },
  { id: 'E104', name: '貿易ルールの機能停止', cat: 'eco', w: 10, cond: (g) => g.world.treaty <= 40 && g.year >= 8,
    fx: ['world.treaty-m', 'majors.gnp-s'], ins: ['P05', 'P51'], text: '貿易の揉め事を裁く国際機関が、判事を選べずに止まった。ルールを守らない国を、誰も止められない。' },
  { id: 'E105', name: '電子ゴミの押し付け', cat: 'eco', w: 8, cond: (g) => avg(g, 'tech') >= 65,
    run: (g, H) => { for (const c of act(g)) if (c.stats.tech >= 80) H.fx(['who.rep-s'], { who: c.id }); }, fx: ['poorBg.stability-s', 'world.biodiv-s'], ins: ['P91'],
    text: '豊かな国で捨てられた電子機器が、貧しい国のゴミ山で燃やされている。子どもたちが、煙の中で金属を拾っている。' },

  // ───── いまの問題：情報・技術・安全保障 ─────
  { id: 'E106', name: '偽情報の拡散', cat: 'tech', w: 12, repeat: 8, cond: (g) => g.flags.internet != null,
    fx: ['majors.stability-s', 'world.trust-m'], ins: ['P101', 'P88', 'P87'], text: '誰が書いたかもわからない嘘が、真実より速く広がっている。人々は、信じたいものを信じる。' },
  { id: 'E107', name: '監視社会', cat: 'tech', w: 8, cond: (g) => act(g).some((c) => (c.flags.censor || 0) >= 1 && c.stats.tech >= 70),
    who: (g) => act(g).find((c) => (c.flags.censor || 0) >= 1 && c.stats.tech >= 70).id, fx: ['who.security+m', 'who.rep-m', 'who.mobility-s'], ins: ['P101'],
    text: '{who}の街角のカメラが、すべての国民の顔を覚えている。犯罪は減った。不満を口にする人も減った。' },
  // モチーフ：ケスラーシンドローム
  { id: 'E108', name: '宇宙ゴミの連鎖衝突', cat: 'tech', w: 10, cond: (g) => (g.counters.space || 0) >= 2 || g.year >= 25,
    run: (g, H) => { for (const c of act(g)) if (c.stats.tech >= 70) H.fx(['who.tech-s', 'who.gnp-s'], { who: c.id }); }, ins: ['P90'],
    text: '軌道上のゴミが衛星にぶつかり、その破片がまた別の衛星を壊していく。天気予報も、位置情報も、しばらく使えない。' },
  { id: 'E109', name: '自律型兵器の戦争', cat: 'mil', w: 10, cond: (g) => avg(g, 'tech') >= 72 && g.world.tension >= 45,
    run: (g) => { g.flags.drones = g.year; }, fx: ['world.tension+m', 'world.conflicts+m'], ins: ['P102', 'P60'],
    text: '人間の判断を待たずに標的を選ぶ兵器が、戦場に投入された。安くて、疲れず、命令を疑わない。' },
  { id: 'E110', name: '民間軍事会社', cat: 'mil', w: 8, cond: (g) => g.world.conflicts >= 70,
    run: (g, H) => { const b = pickBg(g, (x) => x.stats.stability <= 30); if (b) H.fx(['who.stability-m'], { who: b }); }, fx: ['world.conflicts+s'], ins: ['P56', 'P116'],
    text: '国の軍隊ではなく、会社が戦争を請け負っている。彼らに国際法は届きにくい。' },
  { id: 'E111', name: 'ポピュリズムの台頭', cat: 'society', w: 12, repeat: 10, cond: (g) => act(g).some((c) => c.stats.inequality >= 60 && c.stats.stability <= 65),
    who: (g) => best(act(g).filter((c) => c.stats.inequality >= 60), (c) => c.stats.inequality).id,
    run: (g, H, who) => { for (const c of act(g)) if (c.id !== who) H.addRel(who, c.id, -8); }, fx: ['who.stability-s', 'who.rep-s'], ins: ['P41', 'P43'],
    text: '{who}で、「悪いのは外国だ」と叫ぶ候補が支持を集めている。わかりやすい答えほど、よく売れる。' },
  { id: 'E112', name: '麻薬カルテル', cat: 'society', w: 10, cond: (g) => ['B01', 'B07', 'B04'].some((id) => live(g, id) && g.backs[id].stats.stability <= 45),
    who: (g) => ['B01', 'B07', 'B04'].find((id) => live(g, id) && g.backs[id].stats.stability <= 45),
    run: (g, H, who) => { for (const id of neighbors(who)) if (g.majors[id]?.panel) H.fx(['who.security-s'], { who: id }); }, fx: ['who.stability-m'], ins: ['P40', 'P53'],
    text: '{who}では、麻薬組織が軍隊より強い武器を持っている。役人も警察も、組織に給料をもらっている。' },
  { id: 'E113', name: '人身売買', cat: 'society', w: 8, cond: (g) => g.world.refugees >= 55,
    fx: ['majors.security-s', 'world.trust-s'], ins: ['P42', 'P40'], text: '逃げてきた人々を、売り買いする者たちがいる。国境が閉じられるほど、彼らの商売は繁盛する。' },
  // モチーフ：ナイル川・メコン川のダム
  { id: 'E114', name: '大河のダム争い', cat: 'fw', w: 6, repeat: 20, cond: (g) => g.year >= 6 && ['B17', 'B24'].some((id) => live(g, id)),
    who: (g) => ['B17', 'B24'].find((id) => live(g, id)), run: (g, H, who) => H.spark('dam', who), ins: ['P116', 'P53'],
    text: '大河の上流の{who}が巨大なダムを造った。下流の国々にとって、川の水は命そのものだ。' },
  // モチーフ：ジャカルタの水没と首都移転
  { id: 'E115', name: '首都の水没と移転', cat: 'env', w: 12, cond: (g) => g.world.ice <= 58 && act(g).some((c) => ['M15', 'M13', 'M11'].includes(c.id)),
    who: (g) => act(g).find((c) => ['M15', 'M13', 'M11'].includes(c.id)).id, fx: ['who.fiscal-l', 'who.gnp-s', 'who.stability-s'],
    text: '{who}の首都が、毎年数センチずつ沈んでいる。首都を丸ごと別の島に移す計画が動き出した。' },

  // ───── 過去の問題 ─────
  // モチーフ：世界恐慌（1929年）
  { id: 'E116', name: '世界恐慌', cat: 'eco', w: 40, cond: (g) => g.flags.finCrisis != null && fired(g, 'E37') && !fired(g, 'E116'),
    fx: ['majors.gnp-l', 'majors.stability-m', 'bgAll.econ-m', 'world.treaty-m'], run: (g, H) => H.deaths(1), ins: ['P84', 'P05'], next: ['E111'],
    text: '金融の崩壊と関税の殴り合いが重なって、世界中の経済が止まった。失業者の列が、どの国の街角にもできている。' },
  // モチーフ：ニクソン・ショック
  { id: 'E117', name: '通貨と金の交換停止', cat: 'eco', w: 8, cond: (g) => g.year >= 10 && act(g).some((c) => c.stats.gnp >= 15 && c.stats.fiscal <= -6),
    fx: ['world.wrate+m', 'world.trust-s'], text: '世界の基軸通貨を、金と交換するという約束がなくなった。お金の価値は、信用だけが支えるものになった。' },
  // モチーフ：プラザ合意
  { id: 'E118', name: '通貨の協調介入', cat: 'eco', w: 30, cond: (g) => g.flags.currency != null && g.allies.length >= 2,
    fx: ['majors.gnp+s', 'world.trust+s'], text: '大国の財務大臣たちが、ホテルの一室で通貨の値段を決めた。うまくいったかどうかは、十年後にわかる。' },
  { id: 'E119', name: 'ネットバブルの崩壊', cat: 'eco', w: 10, cond: (g) => g.flags.internet != null && avg(g, 'capital') >= 60,
    fx: ['majors.capital-m', 'majors.gnp-s'], text: '名前に「ネット」と付けば株価が上がった時代が、あっけなく終わった。' },
  // モチーフ：冷戦期の代理戦争
  { id: 'E120', name: '代理戦争', cat: 'mil', w: 10, cond: (g) => { const a = act(g); return a.some((x) => a.some((y) => x.id < y.id && rel(g, x.id, y.id) < 30)) && bgs(g).some((b) => b.stats.stability <= 35); },
    run: (g, H) => { const a = act(g); let p = null; for (const x of a) for (const y of a) if (!p && x.id < y.id && rel(g, x.id, y.id) < 30) p = [x, y]; const b = pickBg(g, (q) => q.stats.stability <= 35); if (b) { H.fx(['who.stability-l'], { who: b }); H.spark('civilwar', b); } for (const c of p) H.fx(['who.fiscal-s'], { who: c.id }); H.say(`${p[0].name}と${p[1].name}が、それぞれ別の勢力に武器を送っている。`); },
    ins: ['P116', 'P117'], text: '大国どうしは直接戦わない。代わりに、小さな国の中で、それぞれの味方に戦わせる。' },
  // モチーフ：植民地の独立
  { id: 'E121', name: '独立運動', cat: 'dom', w: 15, cond: (g) => Object.values(g.backs).some((b) => b.owner),
    who: (g) => Object.values(g.backs).find((b) => b.owner).owner,
    run: (g, H, who) => { const b = Object.values(g.backs).find((x) => x.owner === who); H.fx(['who.stability-m', 'who.guerrilla+m'], { who }); if (H.rng() < 0.5) { b.owner = null; b.stats.stability = 40; H.chron(`${b.name}、${g.majors[who].name}から独立`); } },
    ins: ['P106', 'P44'], text: '{who}に併合された土地で、独立を求める声が上がっている。力で手に入れたものは、力で取り返される。' },
  { id: 'E122', name: '大飢饉', cat: 'fw', w: 6, repeat: 15, cond: (g) => bgs(g).some((b) => b.stats.food <= 30),
    who: (g) => best(bgs(g), (b) => -b.stats.food).id, run: (g, H, who) => H.spark('famine', who), ins: ['P31', 'P114'],
    text: '{who}で、作物が実らず、食べ物の配給が止まった。' },
  // モチーフ：緑の革命
  { id: 'E123', name: '緑の革命', cat: 'fw', w: 30, coop: true, cond: (g) => g.flags.gmo != null && (g.counters.foodAid || 0) >= 3,
    fx: ['poorBg.food+l', 'world.foodPrice-m', 'world.trust+s'], text: '新しい品種と農業技術が、貧しい国々に広まった。何億人分もの食べ物が、新しく生まれた。' },
  // モチーフ：イラン革命
  { id: 'E124', name: '宗教革命', cat: 'dom', w: 8, cond: (g) => act(g).some((c) => c.stats.ethnic >= 65 && c.stats.stability <= 35),
    who: (g) => act(g).find((c) => c.stats.ethnic >= 65 && c.stats.stability <= 35).id,
    run: (g, H, who) => { H.collapse(who, '宗教革命'); H.rename(who, 'revolution'); }, text: '{who}で、宗教指導者を掲げた革命が起きた。王宮は空になり、国のかたちが変わる。' },
  // モチーフ：マーシャル・プラン
  { id: 'E125', name: '戦後の復興援助', cat: 'dip', w: 30, coop: true, cond: (g) => (g.counters.lowAid || 0) >= 5 && fired(g, 'E12') ,
    fx: ['bgAll.econ+m', 'world.trust+m', 'world.conflicts-m'], text: '戦争の後、勝った国も負けた国も、まとめて立て直す援助が始まった。復讐より復興を選んだわけだ。' },
  { id: 'E126', name: '酸性雨', cat: 'env', w: 8, cond: (g) => avg(g, 'industry') >= 65,
    run: (g, H) => { for (const c of act(g)) if (c.stats.industry >= 70) H.fx(['who.forest-s'], { who: c.id }); }, fx: ['world.forestRes-s', 'world.biodiv-s'], ins: ['P91'],
    text: '工場の煙が雨に溶けて、遠くの国の森を枯らしている。煙を出した国と、森を失う国は違う国だ。' },
  // モチーフ：農薬の公害（『沈黙の春』）
  { id: 'E127', name: '農薬の公害', cat: 'env', w: 6, cond: (g) => act(g).some((c) => c.stats.food >= 120),
    who: (g) => best(act(g), (c) => c.stats.food).id, fx: ['who.stability-s', 'world.biodiv-m'], ins: ['P97'],
    text: '{who}の畑にまかれた農薬で、春になっても鳥が鳴かなくなった。' },
  // モチーフ：ボパール化学工場事故
  { id: 'E128', name: '化学工場の大事故', cat: 'disaster', w: 5, cond: (g) => g.year >= 5,
    who: (g) => pickBg(g, (b) => b.stats.econ >= 20), run: (g, H) => H.deaths(0.02), fx: ['who.stability-m'],
    text: '{who}の化学工場から毒ガスが漏れた。工場の持ち主は外国の会社で、責任の所在がはっきりしない。' },
  // モチーフ：HIV／エイズ
  { id: 'E129', name: '静かな感染症', cat: 'health', w: 6, cond: (g) => g.year >= 4 && bgs(g).some((b) => b.region === 'me' && b.stats.stability <= 40),
    fx: ['poorBg.stability-s'], run: (g, H) => H.deaths(1), ins: ['P110', 'P81'],
    text: 'ゆっくりと、しかし確実に広がる感染症がある。働き盛りの大人が倒れ、子どもだけが残される村が増えている。' },
  // モチーフ：2000年問題
  { id: 'E130', name: 'システムの日付問題', cat: 'tech', w: 6, cond: (g) => g.flags.internet != null,
    run: (g, H) => { for (const c of act(g)) if (!c.flags.cyber) H.fx(['who.gnp-s'], { who: c.id }); }, ins: ['P87'],
    text: '古いコンピュータが、日付の桁を数え間違えるかもしれない。備えた国には何も起きず、備えなかった国では銀行が止まった。' },

  // ───── 未来の問題 ─────
  { id: 'E131', name: '人間を超える人工知能', cat: 'future', w: 15, cond: (g) => g.year >= 20 && act(g).some((c) => c.stats.tech >= 96),
    who: (g) => best(act(g), (c) => c.stats.tech).id, run: (g, H, who) => { for (const c of act(g)) if (c.id !== who) H.addRel(who, c.id, -10); g.flags.automation = g.year; },
    fx: ['who.industry+l', 'who.tech+m', 'world.tension+m'], ins: ['P103', 'P102'], next: ['E132'],
    text: '{who}で、人間より賢い機械が生まれたらしい。その機械が、誰の命令を聞くのかはまだわからない。' },
  { id: 'E132', name: '仕事の自動化と大量失業', cat: 'future', w: 12, cond: (g) => fired(g, 'E77') || g.flags.automation != null,
    run: (g, H) => { g.flags.automation = g.year; for (const c of act(g)) if (c.stats.tech >= 70) H.fx(['who.inequality+m', 'who.stability-s'], { who: c.id }); }, ins: ['P103', 'P10'],
    text: '機械が仕事を覚えるたびに、人間の仕事が一つ消えていく。生産は増えたのに、生活は苦しくなった人が多い。' },
  // モチーフ：成層圏エアロゾル注入
  { id: 'E133', name: '気候工学をめぐる対立', cat: 'future', w: 12, cond: (g) => g.world.co2 >= 62 && avg(g, 'tech') >= 65,
    run: (g) => { g.flags.geoeng = g.year; }, ins: ['P104', 'P91'],
    text: '空に細かい粒をまけば、地球を冷やせる。だが雨の降り方が変わる。冷やしたい国と、雨を失う国が、同じ空の下にいる。さて、どうする？' },
  { id: 'E134', name: '月の資源争奪', cat: 'future', w: 10, cond: (g) => (g.counters.space || 0) >= 2,
    run: (g, H) => { const t = act(g).filter((c) => c.stats.tech >= 80); for (const c of t) H.fx(['who.fiscal-s', 'who.tech+s'], { who: c.id }); }, fx: ['world.tension+s'], ins: ['P90', 'P107'],
    text: '月の土の中に、未来の燃料が眠っているらしい。旗を立てた者のものになるのかね？' },
  { id: 'E135', name: '宇宙軍の創設', cat: 'future', w: 8, cond: (g) => avg(g, 'tech') >= 75 && g.world.tension >= 50,
    fx: ['world.tension+m'], ins: ['P107', 'P102'], text: '陸、海、空に続いて、宇宙にも軍隊ができた。戦場は、また一つ広がった。' },
  { id: 'E136', name: '海底資源の採掘', cat: 'future', w: 10, cond: (g) => avg(g, 'tech') >= 68 && g.world.oilRes <= 62,
    run: (g) => { g.flags.seabed = g.year; }, ins: ['P108', 'P97'], text: '深い海の底から、金属と燃料を掘り出す技術ができた。まだ誰も見たことのない生き物が、そこに棲んでいるのだがね。' },
  { id: 'E137', name: '暗号が破られる日', cat: 'future', w: 10, cond: (g) => act(g).some((c) => c.stats.tech >= 95),
    who: (g) => best(act(g), (c) => c.stats.tech).id, run: (g, H, who) => { for (const c of act(g)) if (c.id !== who && !c.flags.cyber) H.fx(['who.security-m', 'who.capital-s'], { who: c.id }); },
    fx: ['world.tension+m'], ins: ['P87'], text: '{who}の新しい計算機が、世界中の暗号を数秒で解けるらしい。銀行も軍隊も、鍵をかけ直さなければならない。' },
  { id: 'E138', name: '核融合の実用化', cat: 'future', w: 15, cond: (g) => g.year >= 15 && act(g).some((c) => c.stats.tech >= 94),
    who: (g) => best(act(g), (c) => c.stats.tech).id, run: (g, H) => { for (const c of act(g)) if (c.stats.oil >= 60) H.fx(['who.fiscal-m', 'who.gnp-s'], { who: c.id }); },
    fx: ['who.altE+l', 'who.gnp+m', 'world.co2-m'], text: '{who}で、海の水から無限に近いエネルギーを取り出す炉が動き出した。石油の時代が、終わりかけている。' },
  { id: 'E139', name: '遺伝子編集ベビー', cat: 'future', w: 8, cond: (g) => act(g).reduce((s, c) => s + c.stats.patents, 0) >= 100,
    who: (g) => best(act(g), (c) => c.stats.patents).id, fx: ['who.rep-m', 'world.trust-s'], ins: ['P71'],
    text: '{who}の研究所で、遺伝子を書き換えた子どもが生まれた。病気に強い子だという。次は、頭の良い子を注文できるようになるのかね。' },
  { id: 'E140', name: '寿命を延ばす治療', cat: 'future', w: 8, cond: (g) => g.year >= 20 && avg(g, 'tech') >= 75,
    run: (g, H) => { for (const c of act(g)) if (c.stats.tech >= 80) H.fx(['who.inequality+m'], { who: c.id }); }, fx: ['world.trust-s'],
    text: '寿命を二十年延ばす治療ができた。ただし、とても高い。長生きできるかどうかは、財布しだいになった。' },
  { id: 'E141', name: '国土のない国家', cat: 'future', w: 30, coop: true, cond: (g) => Object.values(g.backs).some((b) => b.sunk) && g.world.trust >= 55,
    fx: ['world.trust+m', 'world.refugees-m'], text: '海に沈んだ国が、国民の名簿と文化をネットの上に残し、国土のない国として認められた。国とは何かを、世界が考え直すきっかけになった。' },
  { id: 'E142', name: 'デジタル通貨の覇権争い', cat: 'future', w: 10, cond: (g) => g.flags.internet != null && g.year >= 12,
    run: (g) => { g.flags.digitalCurrency = g.year; }, ins: ['P109', 'P84'], text: '国が発行する電子のお金が、国境を越えて使われ始めた。どの国のお金が世界の標準になるかで、静かな戦争が起きている。' },
  { id: 'E143', name: '消えゆく国', cat: 'future', w: 8, cond: (g) => act(g).some((c) => c.flags.aging && g.year - c.flags.aging >= 10),
    who: (g) => act(g).find((c) => c.flags.aging && g.year - c.flags.aging >= 10).id, fx: ['who.industry-m', 'who.pop-s', 'who.fiscal-s'], ins: ['P42'],
    text: '{who}では、村が一つずつ地図から消えている。このままでは、いつか国そのものがなくなる計算になる。' },
  // モチーフ：疾病X（未知の病原体）
  { id: 'E144', name: '未知の病原体', cat: 'health', w: 4, repeat: 15, cond: (g) => g.year >= 5 && !g.flags.pandemic,
    who: (g) => pickBg(g, (b) => b.stats.stability <= 50) || pickBg(g, () => true), run: (g, H, who) => H.spark('disease', who), ins: ['P110', 'P111'],
    text: '{who}で、原因のわからない肺炎が広がっている。まだ名前もない病気だ。' },
  // モチーフ：キャリントン・イベント
  { id: 'E145', name: '巨大な太陽フレア', cat: 'disaster', w: 3, cond: (g) => g.year >= 10,
    run: (g, H) => { for (const c of act(g)) if (c.stats.tech >= 75 && !c.flags.cyber) H.fx(['who.gnp-m'], { who: c.id }); },
    text: '太陽で巨大な爆発が起き、地球の電力網と衛星が一斉に止まった。電気に頼る国ほど、被害が大きい。' },
  { id: 'E146', name: '小惑星の接近', cat: 'disaster', w: 2, cond: (g) => g.year >= 15,
    who: (g) => pickBg(g, () => true), run: (g, H, who) => H.spark('asteroid', who), ins: ['P105'],
    text: '巨大な小惑星が地球に向かっている。落ちる場所は{who}のあたりらしい。軌道を変えるには、一国の技術では足りない。' },
  { id: 'E147', name: '超巨大火山の噴火', cat: 'disaster', w: 1, cond: (g) => g.year >= 20,
    fx: ['world.foodPrice+l', 'majors.food-m', 'world.co2-m'], run: (g, H) => H.deaths(2), ins: ['P31'],
    text: '大陸の真ん中にある超巨大火山が噴火した。空が灰に覆われ、数年は夏が来ない。' },
  { id: 'E148', name: '一国の銀行破綻', cat: 'eco', w: 4, repeat: 15, cond: (g) => g.year >= 4,
    who: (g) => { const m = act(g).filter((c) => c.stats.debt >= 120 || c.stats.capital <= 30); return m.length ? m[0].id : pickBg(g, (b) => b.stats.econ >= 25 && b.stats.debt >= 60); },
    run: (g, H, who) => H.spark('finance', who), ins: ['P112', 'P113'], text: '{who}の大手銀行が破綻した。世界中の銀行が、その銀行にお金を貸している。' },
  { id: 'E149', name: '内戦の勃発', cat: 'dom', w: 5, repeat: 12, cond: (g) => bgs(g).some((b) => b.stats.stability <= 20),
    who: (g) => best(bgs(g), (b) => -b.stats.stability).id, run: (g, H, who) => H.spark('civilwar', who), ins: ['P116', 'P117'],
    text: '{who}で、政府軍と反政府勢力の内戦が始まった。' },
];
