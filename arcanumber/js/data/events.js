// なぞの できごと
import { QUIZ, quizFor } from './quiz.js';

export const EVENTS = [
  { id: 'altar', art: '🗿', title: 'ルーンの さいだん', async run(c) {
    await c.say('いしの さいだんに もんだいが きざまれて いる。\n「こたえを しめせ。さすれば ルーンに ひかりを あたえん」');
    if (await c.quiz(quizFor(['arith', 'missing'], c.grade, c.rng))) { await c.say('さいだんが ひかった！ ルーンを 1{枚|まい} えらんで「きらめき」に しよう。'); await c.enhanceRune('foil'); }
    else { await c.say('なにも おこらなかった。あしもとに コインが おちていた。'); await c.coins(2); }
  } },
  { id: 'merchant', art: '🧕', title: 'なぞの しょうにん', async run(c) {
    await c.say('「おかいものの けいさんが できたら、おだちんを あげるよ」');
    if (await c.quiz(QUIZ.money(c.grade, c.rng))) { await c.say('「おみごと！」'); await c.coins(6); } else { await c.say('「おしいねえ。また きてね」'); await c.coins(2); }
  } },
  { id: 'clock', art: '🕰️', title: 'とけいじかけの へや', async run(c) {
    await c.say('カチ、コチ… へやじゅうに とけいが ある。おおきな とけいが はなしかけてきた。「わしの じこくを よめるかな？」');
    if (await c.quiz(QUIZ.clock(c.grade, c.rng))) { await c.say('「よく よめた！ これを もっていけ」'); await c.arcana(); }
    else { await c.say('「じかんは まってくれん。これで げんきを だせ」'); await c.scroll('potion'); }
  } },
  { id: 'stairs', art: '🔢', title: 'かずの かいだん', async run(c) {
    await c.say('かいだんに すうじが ならんでいる。ひとつだけ きえている…');
    if (await c.quiz(QUIZ.pattern(c.grade, c.rng))) { await c.say('かいだんが ひかった！「かいだん」の {役|やく}の ほしの しょを みつけた。'); await c.scroll('star', 'stair'); }
    else { await c.say('かいだんを のぼりきった。'); await c.coins(2); }
  } },
  { id: 'cat', art: '🐈', title: 'まいごの こねこ', async run(c) {
    await c.say('「ニャー…」こねこが おうちに かえれない みたい。みちを おしえて あげよう！');
    const q = QUIZ.seq(c.grade, c.rng);
    q.q = q.q.replace('ひよこ', 'こねこ');
    if (await c.quiz(q)) { await c.say('こねこは ぶじに かえれた。おやねこが おれいに なにかを くわえてきた！'); await c.arcana(); }
    else { await c.say('こねこは じぶんで おうちを みつけた。「ニャ！」'); await c.coins(3); }
  } },
  { id: 'fountain', art: '⛲', title: 'つきの いずみ', async run(c) {
    await c.say('つきの ひかりが うつる いずみ。どうする？');
    const i = await c.choose(['みずを のむ（HP かいふく）', 'コインを 4まい なげいれる（カード 2{枚|まい}を きたえる）', 'たちさる']);
    if (i === 0) { await c.heal(Math.round(c.run.maxHp * 0.3)); await c.say('からだに ちからが もどった。'); }
    else if (i === 1) { if (c.run.coins < 4) { await c.say('コインが たりなかった…'); return; } await c.coins(-4); await c.upgradeRandom(2); await c.say('いずみが ひかり、カードが つよく なった！'); }
    else await c.say('いずみを あとに した。');
  } },
  { id: 'library', art: '📚', title: 'きんじられた しょこ', async run(c) {
    await c.say('ふるい まどうしょが ならんでいる。');
    const i = await c.choose(['いらない カードを 1{枚|まい} わすれる', 'カードを 1{枚|まい} きたえる']);
    if (i === 0) await c.removeChoose(); else await c.upgradeChoose();
  } },
  { id: 'forge', art: '⚒️', title: 'ルーンの かじや', async run(c) {
    await c.say('「ルーンの {数|かず}を うちなおして やろう。1 ふやすか、1 へらすか えらびな」\n（ペアや かいだん、じゅうの わを つくる チャンス！）');
    await c.shiftDeckRune();
  } },
  { id: 'witch', art: '🧙‍♀️', title: 'さいころの まじょ', async run(c) {
    const cost = Math.round(c.run.maxHp * 0.12);
    await c.say(`「ヒッヒッヒ… HPを ${cost} くれたら、すごい アルカナを あげよう」`);
    const i = await c.choose([`HPを ${cost} わたす`, 'ことわる']);
    if (i === 0) { await c.damage(cost); await c.arcana('r'); } else await c.say('「ざんねん。また おいで」');
  } },
  { id: 'beasts', art: '🐾', title: 'まものの ずかん', async run(c) {
    await c.say('ひらいた ずかんに もんだいが かいてある。');
    if (await c.quiz(QUIZ.legs(c.grade, c.rng))) { await c.say('ずかんから カードが とびだした！'); await c.cards({ elite: true }); }
    else { await c.say('ずかんは とじて しまった。'); await c.coins(2); }
  } },
  { id: 'shapes', art: '🔷', title: 'かたちの もん', async run(c) {
    await c.say('とびらに かたちの もんだいが ある。');
    if (await c.quiz(QUIZ.shape(c.grade, c.rng))) { await c.say('もんが ひらいた！ にじいろの まきものを みつけた。'); await c.scroll('wild'); }
    else { await c.say('もんは ひらかなかった。'); await c.coins(2); }
  } },
  { id: 'scale', art: '⚖️', title: 'つりあいの てんびん', async run(c) {
    await c.say('てんびんが かたむいている。つりあう {数|かず}は？');
    const q = c.grade === 1 ? QUIZ.tenComp(1, c.rng) : quizFor(['missing', 'tenComp'], c.grade, c.rng);
    if (await c.quiz(q)) { const h = c.grade === 1 ? 'ten' : 'kuku'; await c.say(`ぴったり つりあった！「${h === 'ten' ? 'じゅうの わ' : 'くくの わ'}」の ほしの しょを てに いれた。`); await c.scroll('star', h); }
    else { await c.say('てんびんは かたむいた まま…'); await c.coins(2); }
  } },
];
