// ステージの がめん：Canvas で えがき、4ボタンで そうさ。エンジンは engine/stage.js
import { el, $, $$ } from '../../../js/util.js';
import { T } from '../../../js/text.js';
import { sfx } from '../../../js/audio.js';
import { TILE, DT, step, allFinished, ranking, progress, useActive } from '../engine/stage.js';
import { ROWS } from '../data/stages.js';
import { SUBJ, heroById, TEACHERS } from '../data/characters.js';
import { ITEMS } from '../data/items.js';
import { CARDS } from '../data/cards.js';

const CW = 1180; let CH = 760; // えがく おおきさ（たかさは がめんに あわせる）
const BOTTOM = 150; // した の ボタンの ぶんは じめんの したに する
const ZONE_SKY = { math: ['#8fd3ff', '#e3f4ff'], ja: ['#ffc9e0', '#fff0f6'], en: ['#b4f0d8', '#e9fff5'] };

// world: createWorld の かえり。player: world.runners の isPlayer。かえり：{ ranking, aborted }
export function runStage(root, world, { autorun = false, onToast } = {}) {
  return new Promise((res) => {
    const player = world.runners.find((r) => r.isPlayer);
    const stageActives = [...player.actives].filter((id) => CARDS[id]?.phase === 'stage' && id !== 'revive' && id !== 'golden');
    const wrap = el(`<div class="stage-wrap">
      <canvas width="${CW}" height="${CH}"></canvas>
      <div class="stage-hud">
        <span class="hearts" data-hearts></span>
        <div class="progress" data-progress><span class="flag">🏁</span>${world.runners.map((r) => `<span class="head ${r.isPlayer ? 'me' : ''}" data-head="${r.id}">${heroById(r.id)?.emoji || '🙂'}</span>`).join('')}</div>
        <span class="item-slot" data-item>🎒 —</span>
        <span class="num" data-time>0.0</span>
        <button class="icon-btn pause-btn" data-pause>⏸</button>
      </div>
      <div class="ctrl left">${autorun ? '' : '<button data-k="left">◀</button><button data-k="right">▶</button>'}</div>
      <div class="ctrl right">${stageActives.map((id) => `<button class="special" data-special="${id}" title="${CARDS[id].name}">${CARDS[id].icon}</button>`).join('')}<button class="item" data-k="item">🎒</button><button class="jump" data-k="jump">⤒</button></div>
      <div class="stage-big" data-big></div>
    </div>`);
    root.appendChild(wrap);
    const cv = wrap.querySelector('canvas'); const ctx = cv.getContext('2d');
    CH = Math.max(560, wrap.clientHeight || 760); cv.height = CH;
    player.autorun = autorun; player.robot = !!window.__robot; window.__world = world; // つうしテスト用
    const inp = player.input;
    // ── そうさ（マルチタッチ）
    const held = new Map();
    const setKey = (k, on) => { if (k === 'item') { if (on) inp.item = true; } else inp[k] = on; const b = $(`[data-k="${k}"]`, wrap); b && b.classList.toggle('down', on); };
    $$('[data-k]', wrap).forEach((b) => {
      const k = b.dataset.k;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); held.set(e.pointerId, k); setKey(k, true); });
      const up = (e) => { if (held.get(e.pointerId) === k) { held.delete(e.pointerId); setKey(k, false); } };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
    });
    $$('[data-special]', wrap).forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); if (useActive(world, player, b.dataset.special)) { sfx('select'); b.disabled = true; toast(`${CARDS[b.dataset.special].icon} ${T(CARDS[b.dataset.special].name)}！`); } }));
    const keymap = { ArrowLeft: 'left', ArrowRight: 'right', a: 'left', d: 'right', ' ': 'jump', ArrowUp: 'jump', w: 'jump', z: 'item', x: 'item', Shift: 'item' };
    const kd = (e) => { const k = keymap[e.key]; if (!k) return; e.preventDefault(); if (k === 'item') { if (!e.repeat) inp.item = true; } else setKey(k, true); };
    const ku = (e) => { const k = keymap[e.key]; if (!k || k === 'item') return; setKey(k, false); };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    // ── じょうたい
    let camX = 0, raf = 0, acc = 0, last = performance.now(), paused = false, over = false, bigT = 0, countdown = 3.5, toastT = 0;
    const toastEl = () => { let t = wrap.querySelector('.stage-toast'); if (!t) { t = el('<div class="stage-toast"></div>'); wrap.appendChild(t); } return t; };
    const toast = (text, ms = 1800) => { const t = toastEl(); t.textContent = text; t.style.display = ''; toastT = ms / 1000; onToast && onToast(text); };
    const big = (text, ms = 1200) => { const b = $('[data-big]', wrap); b.textContent = text; b.style.display = ''; b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; bigT = ms / 1000; };
    const names = Object.fromEntries(world.runners.map((r) => [r.id, heroById(r.id)?.name || r.name]));
    const cleanup = () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
    const finishAll = (aborted) => { if (over) return; over = true; cleanup(); res({ ranking: ranking(world), aborted }); };
    $('[data-pause]', wrap).addEventListener('click', async () => {
      paused = true; sfx('tap');
      const { confirmBox } = await import('./common.js');
      const quit = await confirmBox('ちょっと きゅうけい', 'ステージを やめて タイトルに もどる？（つづきは ステージの さいしょから）', 'やめる', 'つづける');
      if (quit) finishAll(true); else { paused = false; last = performance.now(); }
    });
    // ── できごとの ひょうじ
    function handleEvents() {
      for (const e of world.events) {
        const me = e.id === player.id;
        if (e.t === 'jump' && me) sfx('tap');
        else if (e.t === 'item' && me) { sfx('select'); toast(`${ITEMS[e.item].icon} ${T(ITEMS[e.item].name)} を ゲット！`); }
        else if (e.t === 'empty' && me) { sfx('wrong'); toast('カラン… からっぽ'); }
        else if (e.t === 'hurt' && me) sfx('hit');
        else if (e.t === 'die' && me) { sfx('lose'); big('💫', 900); }
        else if (e.t === 'respawn' && me) toast('チェックポイントから ふっかつ！');
        else if (e.t === 'stomp' && me) sfx('correct');
        else if (e.t === 'check' && me) { sfx('correct'); toast('チェックポイント！'); }
        else if (e.t === 'goal') { if (me) { sfx('win'); big(`🏁 ${e.rank}い！`, 2500); } else toast(`${TEACHERS.math.emoji} ${T(names[e.id])}が ゴール！（${e.rank}い）`); }
        else if (e.t === 'use' && me) sfx('select');
        else if (e.t === 'stompRunner' && me) toast(`${T(names[e.target])}を ふんだ！`);
        else if (e.t === 'stompRunner' && e.target === player.id) { sfx('hit'); toast(`${T(names[e.id])}に ふまれた！`); }
        else if (e.t === 'revive' && me) { sfx('win'); toast('🪶 ふっかつの はね！'); }
      }
    }
    let lastLeader = null;
    function commentary() {
      const rk = ranking(world); const lead = rk[0];
      if (lead.id !== lastLeader && world.time > 3) { lastLeader = lead.id; if (!lead.finish) toast(`${TEACHERS.ja.emoji} ${T(names[lead.id])}が せんとう！`); }
    }
    // ── えがく
    function draw() {
      const zone = world.stage.zones.find((z) => Math.floor(player.x / TILE) < z.x1) || world.stage.zones[world.stage.zones.length - 1];
      const sky = ZONE_SKY[zone?.subj] || ZONE_SKY.math;
      const g = ctx.createLinearGradient(0, 0, 0, CH); g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, CW, CH);
      const targetCam = Math.max(0, Math.min(world.widthPx - CW, player.x - CW * 0.35));
      camX += (targetCam - camX) * 0.18;
      const offY = CH - ROWS * TILE - BOTTOM;
      // はいけいの やま
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      for (let i = -1; i < 8; i++) { const bx = ((i * 420 - camX * 0.3) % (CW + 840) + CW + 840) % (CW + 840) - 420; ctx.beginPath(); ctx.moveTo(bx, offY + ROWS * TILE); ctx.lineTo(bx + 210, offY + ROWS * TILE - 180); ctx.lineTo(bx + 420, offY + ROWS * TILE); ctx.fill(); }
      // くも
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      for (let i = 0; i < 6; i++) { const cx = ((i * 520 + 200 - camX * 0.15) % (CW + 600) + CW + 600) % (CW + 600) - 300; const cy = 60 + (i % 3) * 70; ctx.beginPath(); ctx.arc(cx, cy, 28, 0, 7); ctx.arc(cx + 30, cy - 12, 36, 0, 7); ctx.arc(cx + 70, cy, 28, 0, 7); ctx.fill(); }
      // じめんの した（ボタンの うしろ）。あなの したは あけておく
      ctx.fillStyle = '#6e4a2c';
      { const bx0 = Math.max(0, Math.floor(camX / TILE) - 1), bx1 = Math.min(world.W, Math.ceil((camX + CW) / TILE) + 1); for (let x = bx0; x < bx1; x++) if (world.tiles[ROWS - 1][x] === '#') ctx.fillRect(x * TILE - camX, offY + ROWS * TILE, TILE + 1, BOTTOM + 10); }
      // ゾーンの なまえ
      ctx.save(); ctx.translate(-camX, offY);
      ctx.font = '900 40px "Zen Maru Gothic", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,.18)';
      for (const z of world.stage.zones) ctx.fillText(`${SUBJ[z.subj].icon} ${SUBJ[z.subj].zone}`, ((z.x0 + z.x1) / 2) * TILE, 70);
      // タイル
      const x0 = Math.max(0, Math.floor(camX / TILE) - 1), x1 = Math.min(world.W, Math.ceil((camX + CW) / TILE) + 1);
      for (let y = 0; y < world.H; y++) for (let x = x0; x < x1; x++) {
        const c = world.tiles[y][x]; if (c === '.') continue;
        const px = x * TILE, py = y * TILE;
        if (c === '#') { ctx.fillStyle = '#9b6b43'; ctx.fillRect(px, py, TILE, TILE); if (y === 0 || world.tiles[y - 1][x] !== '#') { ctx.fillStyle = '#5fc45a'; ctx.fillRect(px, py, TILE, 10); } ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(px + 8, py + 18, 10, 8); ctx.fillRect(px + 24, py + 28, 8, 6); }
        else if (c === '=') { ctx.fillStyle = '#d9a35a'; ctx.fillRect(px, py + 6, TILE, TILE - 12); ctx.fillStyle = '#b57f3a'; ctx.fillRect(px, py + 6, TILE, 5); ctx.fillRect(px + 18, py + 11, 3, TILE - 17); }
        else if (c === '^') { ctx.fillStyle = '#c9cdd8'; ctx.beginPath(); ctx.moveTo(px, py + TILE); ctx.lineTo(px + TILE / 4, py + 8); ctx.lineTo(px + TILE / 2, py + TILE); ctx.lineTo(px + TILE * 3 / 4, py + 8); ctx.lineTo(px + TILE, py + TILE); ctx.fill(); }
        else if (c === '?') {
          const b = player.blocks[`${x},${y}`];
          const filled = b && b.filled && !b.used, used = b && b.used;
          ctx.fillStyle = used ? '#9a9a9a' : filled ? '#ffc21a' : '#e6e1d8';
          ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
          if (filled) { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; ctx.strokeRect(px + 5, py + 5, TILE - 10, TILE - 10); }
          ctx.fillStyle = used ? '#666' : filled ? '#7a4a00' : '#b8b1a5'; ctx.font = '900 26px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(used ? '·' : '?', px + TILE / 2, py + TILE - 10);
        }
      }
      // チェックポイント・ゴール（カラー絵文字にも fillStyle の とうめいどが きくので くろに もどす）
      ctx.fillStyle = '#000'; ctx.font = '36px sans-serif'; ctx.textAlign = 'center';
      for (const c of world.checkpoints) ctx.fillText('🚩', c + TILE / 2, (ROWS - 2) * TILE - 4);
      ctx.fillText('🏁', world.goalX + TILE / 2, (ROWS - 2) * TILE - 4);
      // てき
      ctx.fillStyle = '#000'; ctx.font = '30px sans-serif';
      for (const e of world.enemies) if (e.alive && e.x > camX - 60 && e.x < camX + CW + 60) { ctx.save(); ctx.translate(e.x + e.w / 2, e.y + e.h); ctx.scale(e.dir > 0 ? -1 : 1, 1); ctx.fillText('🐢', 0, -2); ctx.restore(); }
      // ボール
      ctx.font = '16px sans-serif'; for (const p of world.projectiles) ctx.fillText('⚾', p.x + 6, p.y + 12);
      // ランナー（じぶんは さいごに）
      const order = [...world.runners].sort((a, b) => (a.isPlayer ? 1 : 0) - (b.isPlayer ? 1 : 0));
      for (const r of order) {
        if (r.deadT > 0 && !r.isPlayer) continue;
        if (r.invT > 0 && Math.floor(world.time * 12) % 2 === 0 && !r.deadT) ctx.globalAlpha = 0.45;
        const h = heroById(r.id);
        if (r.dashT > 0) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(r.x - 10 - i * 12, r.y + 8 + i * 10); ctx.lineTo(r.x - 30 - i * 12, r.y + 8 + i * 10); ctx.stroke(); } }
        if (r.shieldT > 0) { ctx.fillStyle = 'rgba(80,180,255,.35)'; ctx.beginPath(); ctx.arc(r.x + r.w / 2, r.y + r.h / 2, 32, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#5ac8ff'; ctx.lineWidth = 3; ctx.stroke(); }
        ctx.fillStyle = '#000'; ctx.save(); ctx.translate(r.x + r.w / 2, r.y + r.h); if (r.face < 0) ctx.scale(-1, 1);
        ctx.font = `${r.deadT > 0 ? 28 : 38}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText(r.deadT > 0 ? '💫' : h?.emoji || '🙂', 0, -2); ctx.restore();
        if (r.stunT > 0 && r.deadT <= 0) { ctx.fillStyle = '#000'; ctx.font = '18px sans-serif'; ctx.fillText('💫', r.x + r.w / 2, r.y - 8); }
        ctx.globalAlpha = 1;
        // なまえ
        ctx.font = '900 14px "Zen Maru Gothic", sans-serif'; ctx.fillStyle = r.isPlayer ? '#ffc21a' : '#fff'; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 3; ctx.textAlign = 'center';
        const nm = (r.isPlayer ? '▼ ' : '') + (h?.name || r.name); ctx.strokeText(nm, r.x + r.w / 2, r.y - 14); ctx.fillText(nm, r.x + r.w / 2, r.y - 14);
      }
      ctx.restore();
      // HUD
      $('[data-hearts]', wrap).textContent = '❤️'.repeat(Math.max(0, player.hp)) + '🖤'.repeat(Math.max(0, player.maxHp - player.hp));
      $('[data-item]', wrap).textContent = player.items.length ? player.items.map((it) => `${ITEMS[it.id].icon} ${T(ITEMS[it.id].name)}`).join(' ') : '🎒 —';
      $('[data-time]', wrap).textContent = world.time.toFixed(1);
      for (const r of world.runners) { const hd = $(`[data-head="${r.id}"]`, wrap); if (hd) hd.style.left = `${progress(world, r) * 100}%`; }
      const ib = $('[data-k="item"]', wrap); if (ib) ib.disabled = !player.items.length;
    }
    // ── ループ
    function frame(now) {
      if (over) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (toastT > 0) { toastT -= dt; if (toastT <= 0) { const t = wrap.querySelector('.stage-toast'); t && (t.style.display = 'none'); } }
      if (bigT > 0) { bigT -= dt; if (bigT <= 0) $('[data-big]', wrap).style.display = 'none'; }
      if (paused) { draw(); return; }
      if (countdown > 0) {
        const before = Math.ceil(countdown); countdown -= dt; const after = Math.ceil(countdown);
        if (after !== before) { if (after >= 1) { big(String(after), 700); sfx('tap'); } else { big('GO!', 800); sfx('win'); } }
        draw(); return;
      }
      acc += dt;
      let steps = 0;
      while (acc >= DT && steps < 6) { step(world); handleEvents(); acc -= DT; steps++; }
      commentary();
      draw();
      if (player.finish && !over) {
        // じぶんが ゴール：のこりは はやおくりで きめる
        let extra = 0; while (!allFinished(world) && extra < 60) { step(world); extra += DT; }
        over = true; cleanup(); draw();
        setTimeout(() => res({ ranking: ranking(world), aborted: false }), 1800);
      }
    }
    raf = requestAnimationFrame(frame);
  });
}
