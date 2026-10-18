// ダンジョンのデータ検査と探索ルールのテスト
// node idoldungeon/tools/test_dungeon.mjs
import { DUNGEONS } from '../js/data/floors.js';
import { BOSSES } from '../js/data/bosses.js';
import { getFloor, newExplore, act, edgeInfo, useStairs, returnToTown, isSolid, DX, DY, viewCells } from '../js/engine/dungeon.js';
import { newExpedition, move, resolveBattle, enterDungeon, climb, partyView, inn, temple, buy, shopList } from '../js/engine/expedition.js';

let fail = 0, pass = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log('NG:', msg); } };

// ── データ検査 ──
for (const dg of Object.values(DUNGEONS)) {
  const n = dg.floors.length;
  const fls = dg.floors.map((_, i) => getFloor(dg.id, i));
  ok(!isSolid(fls[0].cellAt(dg.start.x, dg.start.y)) && fls[0].cellAt(dg.start.x, dg.start.y) === 'u', `${dg.id}: 入口は1Fの上り階段`);
  fls.forEach((fl, fi) => {
    const tag = `${dg.id} ${fl.id}`;
    for (let y = 0; y < fl.h; y++) for (let x = 0; x < fl.w; x++) {
      const ch = fl.cellAt(x, y);
      ok('. #mudpc'.includes(ch), `${tag} (${x},${y}): 不明なマス "${ch}"`);
      for (let d = 0; d < 4; d++) {
        const e = fl.edgeAt(x, y, d);
        ok(' |-DSLG<>^v'.includes(e), `${tag} (${x},${y}) ${d}: 不明な境目 "${e}"`);
        const nx = x + DX[d], ny = y + DY[d];
        const outside = nx < 0 || ny < 0 || nx >= fl.w || ny >= fl.h;
        if (outside) ok('|-'.includes(e), `${tag} (${x},${y}): 外周に穴`);
        if (e === 'L') ok(fl.edgeSpecial(x, y, d)?.type === 'lock', `${tag} (${x},${y}): 鍵の扉に lock がない`);
        if (e === 'G') {
          const g = fl.edgeSpecial(x, y, d);
          ok(g?.type === 'gate' && fl.specials.some((s) => s.type === 'switch' && s.flag === g.flag), `${tag} (${x},${y}): 仕掛け扉に対応するスイッチがない`);
        }
        if (!isSolid(ch) && e !== '|' && e !== '-' && !outside) ok(!isSolid(fl.cellAt(nx, ny)), `${tag} (${x},${y}) ${d}: 岩盤への通路`);
      }
      if (ch === 'd' || ch === 'c') ok(fi + 1 < n && !isSolid(fls[fi + 1].cellAt(x, y)), `${tag} (${x},${y}): 真下が床でない`);
      if (ch === 'd') ok(fls[fi + 1].cellAt(x, y) === 'u', `${tag} (${x},${y}): 下り階段の真下が上り階段でない`);
      if (ch === 'u' && fi > 0) ok(fls[fi - 1].cellAt(x, y) === 'd', `${tag} (${x},${y}): 上り階段の真上が下り階段でない`);
    }
    for (const s of fl.specials) {
      ok(!isSolid(fl.cellAt(s.x, s.y)), `${tag}: ${s.type} (${s.x},${s.y}) が岩盤の上`);
      if (s.type === 'warp') ok(!isSolid(fls[s.to.floor ?? fi].cellAt(s.to.x, s.to.y)), `${tag}: ワープ先が岩盤`);
      if (s.type === 'boss') ok(BOSSES[s.boss], `${tag}: 未定義のボス ${s.boss}`);
      if (s.type === 'lock') ok(fls.some((f) => f.specials.some((t) => t.give?.key === s.key)), `${tag}: 鍵 ${s.key} がどこにもない`);
    }
  });

  // 到達できるか：鍵・スイッチ・シークレットドアを使えば、入口から全部のマスに行けること
  const st = newExplore(dg.id);
  const all = new Set();
  for (let round = 0; round < 10; round++) {
    const seen = new Set();
    const queue = [[0, dg.start.x, dg.start.y]];
    while (queue.length) {
      const [f, x, y] = queue.shift();
      const k = `${f}:${x},${y}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const fl = fls[f], ch = fl.cellAt(x, y), sp = fl.special(x, y);
      if (sp?.give?.key && !st.keys.includes(sp.give.key)) st.keys.push(sp.give.key);
      if (sp?.type === 'switch') st.flags[sp.flag] = 1;
      if (sp?.type === 'warp') { queue.push([sp.to.floor ?? f, sp.to.x, sp.to.y]); continue; }
      if (ch === 'c') { queue.push([f + 1, x, y]); continue; }
      if (ch === 'd') queue.push([f + 1, x, y]);
      if (ch === 'u' && f > 0) queue.push([f - 1, x, y]);
      for (let d = 0; d < 4; d++) {
        st.floor = f;
        const e = edgeInfo(fl, st, x, y, d);
        if (e.pass || e.hidden) queue.push([f, x + DX[d], y + DY[d]]);
      }
    }
    const before = all.size;
    seen.forEach((k) => all.add(k));
    if (all.size === before) break;
  }
  fls.forEach((fl, fi) => {
    for (let y = 0; y < fl.h; y++) for (let x = 0; x < fl.w; x++) {
      if (!isSolid(fl.cellAt(x, y))) ok(all.has(`${fi}:${x},${y}`), `${dg.id} ${fl.id} (${x},${y}): 入口から行けない`);
    }
  });
}

// ── 探索ルール ──
const rng0 = () => 0.999; // 遭遇しない・調べても運では見つからない
const walk = (st, seq, ctx = { rng: rng0 }) => seq.split(' ').map((a) => act(st, a, ctx));
{
  const st = newExplore('d1');
  ok(st.x === 5 && st.y === 0 && st.dir === 0, 'スタート地点');
  const r = act(st, 'turnL', { rng: rng0 }); act(st, 'forward', { rng: rng0 });
  ok(st.x === 5 && st.y === 0, '壁には進めない');
  act(st, 'turnR', { rng: rng0 });
  walk(st, 'forward forward forward');
  ok(st.y === 3 && st.done.opening, 'イベントは1回だけ記録');
  ok(st.seen[0]['5,3'], 'オートマップに記録');
  // 一方通行：(5,9) から西の暗い部屋へは入れない
  Object.assign(st, { x: 5, y: 9, dir: 3 });
  act(st, 'forward', { rng: rng0 });
  ok(st.x === 5, '一方通行の扉は逆向きに通れない');
  ok(viewCells(st).find((c) => c.d === 0 && c.k === 0).front.kind === 'wall', '一方通行の扉は裏側から壁に見える');
  // ダークゾーンは記録されない。暗い部屋から東へは抜けられる
  Object.assign(st, { x: 1, y: 9, dir: 1 });
  act(st, 'forward', { rng: rng0 });
  ok(st.x === 2 && !st.seen[0]['2,9'], 'ダークゾーンはオートマップに残らない');
  walk(st, 'forward forward forward');
  ok(st.x === 5 && st.y === 9, '一方通行の扉は矢印の向きに通れる');
  // 仕掛け扉：スイッチを引く前は通れない
  Object.assign(st, { x: 10, y: 9, dir: 0 });
  act(st, 'forward', { rng: rng0 });
  ok(st.y === 9, 'スイッチの前は仕掛け扉が開かない');
  Object.assign(st, { x: 8, y: 11, dir: 1 });
  act(st, 'forward', { rng: rng0 });
  ok(st.flags.f1gate, 'スイッチを引いた');
  Object.assign(st, { x: 10, y: 9, dir: 0 });
  act(st, 'forward', { rng: rng0 });
  ok(st.y === 10, 'スイッチの後は仕掛け扉を通れる');
  // シークレットドア：(9,1) の東
  Object.assign(st, { x: 9, y: 1, dir: 1 });
  act(st, 'forward', { rng: rng0 });
  ok(st.x === 9, '見つける前のシークレットドアは通れない');
  act(st, 'search', { rng: rng0 });
  ok(st.x === 9 && !Object.keys(st.found).length, '盗賊なしで運が悪いと見つからない');
  act(st, 'search', { rng: rng0, searcher: true });
  act(st, 'forward', { rng: rng0 });
  ok(st.x === 10, '盗賊がいれば見つけて通れる');
  act(st, 'turnBack', { rng: rng0 });
  ok(viewCells(st).find((c) => c.d === 0 && c.k === 0).front.kind === 'door', '見つけたシークレットドアは反対側からも扉');
  act(st, 'turnBack', { rng: rng0 }); act(st, 'forward', { rng: rng0 });
  ok(st.keys.includes('silverKey'), '銀の鍵を拾った');
}
{
  // 鍵・シュート・ワープ・ピット・ボス再戦
  const st = newExplore('d1');
  Object.assign(st, { floor: 1, x: 10, y: 1, dir: 2 });
  act(st, 'forward', { rng: rng0 });
  ok(st.y === 1, '鍵がないと開かない');
  st.keys.push('silverKey');
  const r = act(st, 'forward', { rng: rng0 });
  ok(st.y === 0 && r.events.some((e) => e.type === 'stairs' && !e.up), '鍵で開けて下り階段へ');
  ok(useStairs(st) === 'moved' && st.floor === 2, '階段で B2F へ');
  Object.assign(st, { floor: 1, x: 1, y: 2, dir: 2 });
  act(st, 'forward', { rng: rng0 });
  ok(st.floor === 2 && st.x === 1 && st.y === 1, 'シュートで真下に落ちる');
  Object.assign(st, { floor: 2, x: 10, y: 6, dir: 3 });
  act(st, 'forward', { rng: rng0 });
  ok(st.x === 0 && st.y === 0, 'はずれのワープ');
  Object.assign(st, { floor: 2, x: 11, y: 8, dir: 0 });
  act(st, 'forward', { rng: rng0 });
  ok(st.x === 6 && st.y === 10, '当たりのワープ');
  act(st, 'turnBack', { rng: rng0 });
  act(st, 'forward', { rng: rng0 });                // 扉を抜けて (6,9)
  const boss = act(st, 'forward', { rng: rng0 });   // (6,8) にボス
  ok(boss.events.some((e) => e.type === 'battle' && e.kind === 'boss'), 'ボス戦');
  st.trip.b1 = 'boss';
  returnToTown(st);
  ok(st.bossClears.b1 === 1 && !st.trip.b1 && st.floor === 0, '街に戻るとボスは強化されて再出現');
  Object.assign(st, { floor: 1, x: 5, y: 4, dir: 1 });
  const pit = act(st, 'forward', { rng: rng0 });
  ok(pit.events.some((e) => e.type === 'pit'), 'ピット');
  ok(act(st, 'forward', { rng: () => 0 }).events.some((e) => e.type === 'battle' && e.kind === 'wander'), '徘徊する敵');
}

// ── 冒険（パーティの HP・街） ──
{
  const ex = newExpedition([{ idol: 'makoto' }, { idol: 'iori' }, { idol: 'ami' }]);
  ok(ex.mode === 'town', '街から始まる');
  enterDungeon(ex);
  Object.assign(ex.ex, { floor: 1, x: 5, y: 4, dir: 1 });
  const hp0 = { ...ex.hp };
  move(ex, 'forward', () => 0.999);
  ok(ex.hp.makoto < hp0.makoto && ex.hp.iori === hp0.iori, 'ピット：ペガサスナイトの伊織は飛んでかわす');
  Object.assign(ex.ex, { floor: 1, x: 11, y: 4, dir: 0 });
  move(ex, 'forward', () => 0.999);
  ok(ex.cond.makoto === 'poison', '濁った泉で毒');
  const h = ex.hp.makoto;
  Object.assign(ex.ex, { floor: 0, x: 5, y: 1, dir: 0 });
  move(ex, 'forward', () => 0.999);
  ok(ex.hp.makoto === h - 1, '毒は歩くたびに減る');
  // ボス
  Object.assign(ex.ex, { floor: 2, x: 6, y: 9, dir: 2 });
  const r = move(ex, 'forward', () => 0.999);
  ok(r.pending?.type === 'battle' && r.pending.kind === 'boss', 'ボス戦の待ち');
  const g0 = ex.gold;
  resolveBattle(ex, r.pending, 'win', () => 0.999);
  ok(ex.gold > g0 && ex.items.length === 1, 'ボスのドロップ');
  ok(shopList(ex).find((i) => i.id === 'masterSeal').stock === 1, 'ボスを倒すとマスタープルフが入荷');
  Object.assign(ex.ex, { floor: 0, x: 5, y: 1, dir: 2 });
  const s = move(ex, 'forward', () => 0.999);
  ok(s.pending?.toTown, '1F の上り階段は街へ');
  climb(ex);
  ok(ex.mode === 'town' && ex.ex.bossClears.b1 === 1, '街に戻った・ボス撃破数');
  inn(ex);
  ok(ex.cond.makoto === 'ok' && ex.hp.makoto === partyView(ex)[0].maxHp, '宿屋で回復');
  ex.cond.ami = 'dead'; ex.gold = 99999;
  temple(ex, 'ami', () => 0);
  ok(ex.cond.ami === 'ok', '寺院で蘇生');
  ex.cond.ami = 'ash';
  temple(ex, 'ami', () => 0.999);
  ok(ex.cond.ami === 'ash', '灰の蘇生に失敗しても灰のまま（ロストなし）');
  buy(ex, 'masterSeal');
  ok(shopList(ex).find((i) => i.id === 'masterSeal').stock === 0, 'マスタープルフの在庫が減る');
}

console.log(`${pass} ok / ${fail} ng`);
process.exit(fail ? 1 : 0);
