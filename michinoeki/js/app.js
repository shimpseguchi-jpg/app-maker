(function () {
  'use strict';

  const PREFS = ['栃木', '千葉', '茨城', '群馬', '埼玉'];
  const COLOR = { todo: '#d64545', plan: '#2f6fd6', done: '#2e9e5b' };
  const BY_ID = Object.fromEntries(STATIONS.map((s) => [s.id, s]));

  // ---- 保存 ----
  // 行った： { id: 'YYYY-MM-DD' }（チェックした日）。v1 からキーは変えていない
  // 行く予定：{ id: 'YYYY-MM-DD' }（予定に入れた日）
  // 道順：  { stops: [id, ...], rest: 分, fromHere: bool }
  // 変えた時刻：{ id: ミリ秒 }（2人で共有するとき、駅ごとに新しいほうを残すために使う）
  // 共有設定：{ url: GAS の /exec, pass: 合言葉クイズで選んだ答え, last: 最後に同期できた時刻 }
  const KEY = {
    visited: 'michinoeki-check-v1', plan: 'michinoeki-plan-v1', route: 'michinoeki-route-v1',
    times: 'michinoeki-times-v1', sync: 'michinoeki-sync-v1',
  };
  function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
  }
  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* 保存できない環境では表示だけ */ }
  }
  let visited = load(KEY.visited, {});
  let plan = load(KEY.plan, {});
  const times = load(KEY.times, {});
  const route = Object.assign({ stops: [], rest: 15, fromHere: false }, load(KEY.route, {}));
  route.stops = route.stops.filter((id) => BY_ID[id]);
  const saveStatus = () => { store(KEY.visited, visited); store(KEY.plan, plan); store(KEY.times, times); };
  const touch = (ids) => { const now = Date.now(); ids.forEach((id) => { times[id] = now; }); };
  const saveRoute = () => store(KEY.route, route);

  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const statusOf = (id) => (visited[id] ? 'done' : plan[id] ? 'plan' : 'todo');

  // ---- 地図 ----
  const map = L.map('map', { zoomControl: true });
  // 地理院の標準地図は z8 以下だと国道が描かれないので、広域では淡色地図に切りかえる
  const GsiRoads = L.TileLayer.extend({
    getTileUrl(c) {
      const kind = c.z <= 8 ? 'pale' : 'std';
      return `https://cyberjapandata.gsi.go.jp/xyz/${kind}/${c.z}/${c.x}/${c.y}.png`;
    },
  });
  const gsi = new GsiRoads('', {
    maxZoom: 18,
    attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">地理院タイル</a>',
  });
  const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
  });
  gsi.addTo(map);
  L.control.layers({ '地理院地図（国道・高速が見やすい）': gsi, 'OpenStreetMap': osm }, null, { collapsed: true }).addTo(map);
  const legend = document.querySelector('.legend');
  map.on('baselayerchange', (e) => legend.classList.toggle('osm', e.layer === osm));

  const markers = {};
  const bounds = [];
  for (const s of STATIONS) {
    const m = L.circleMarker([s.lat, s.lng], { radius: 8, weight: 2, color: '#fff', fillOpacity: 0.95 }).addTo(map);
    m.bindTooltip(s.name, { direction: 'top', offset: [0, -6] });
    m.on('click', () => onMarkerClick(s.id));
    markers[s.id] = m;
    bounds.push([s.lat, s.lng]);
  }
  map.fitBounds(bounds, { padding: [20, 20] });
  if (map.getZoom() < 8) map.setZoom(8);

  // ポップアップは1つだけ使い回す（中身は状態が変わるたびに作り直す）
  const popup = L.popup({ minWidth: 200 });
  let popupId = null;
  map.on('popupclose', () => { popupId = null; });
  function openPopup(id) {
    popupId = id;
    popup.setLatLng(markers[id].getLatLng()).setContent(popupHtml(BY_ID[id])).openOn(map);
  }
  function popupHtml(s) {
    const inRoute = route.stops.includes(s.id);
    return `<div class="popup" data-id="${esc(s.id)}">
      <b>道の駅 ${esc(s.name)}</b>
      <div class="sub">${esc(s.pref)}県${esc(s.city)} ／ ${esc(s.route)}</div>
      <label><input type="checkbox" data-kind="plan" ${plan[s.id] ? 'checked' : ''}> 行く予定！</label>
      <label><input type="checkbox" data-kind="done" ${visited[s.id] ? 'checked' : ''}> 行った！${visited[s.id] ? `（${esc(visited[s.id])}）` : ''}</label>
      <button type="button" data-act="route">${inRoute ? '道順から外す' : '道順に追加'}</button>
    </div>`;
  }
  map.getContainer().addEventListener('change', (e) => {
    const box = e.target.closest('.popup input[data-kind]');
    if (box) setStatus(box.closest('.popup').dataset.id, box.dataset.kind, box.checked);
  });
  map.getContainer().addEventListener('click', (e) => {
    const btn = e.target.closest('.popup button[data-act="route"]');
    if (!btn) return;
    toggleStop(btn.closest('.popup').dataset.id);
    setMode('route');
  });

  function onMarkerClick(id) {
    if (mode === 'route') {
      toggleStop(id);
    } else {
      openPopup(id);
      highlight(id, true);
    }
  }

  // ---- モード切りかえ ----
  let mode = 'check';
  const tabs = document.querySelectorAll('.tabs button');
  function setMode(next) {
    mode = next;
    tabs.forEach((b) => b.setAttribute('aria-selected', String(b.dataset.mode === mode)));
    document.getElementById('check-panel').hidden = mode !== 'check';
    document.getElementById('route-panel').hidden = mode !== 'route';
    document.body.classList.toggle('route-mode', mode === 'route');
    map.closePopup();
    if (mode === 'route') renderRoute();
  }
  tabs.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));

  // ---- 一覧 ----
  const listEl = document.getElementById('list');
  const qEl = document.getElementById('q');
  const filterEl = document.getElementById('filter');
  const openState = Object.fromEntries(PREFS.map((p) => [p, true]));

  function renderList() {
    const q = qEl.value.trim();
    const f = filterEl.value;
    let html = '';
    for (const pref of PREFS) {
      const all = STATIONS.filter((s) => s.pref === pref);
      const done = all.filter((s) => visited[s.id]).length;
      const planned = all.filter((s) => plan[s.id] && !visited[s.id]).length;
      const shown = all.filter((s) => {
        if (f !== 'all' && statusOf(s.id) !== f) return false;
        if (!q) return true;
        return [s.name, s.kana, s.city, s.route].some((v) => v && v.includes(q));
      });
      html += `<details class="pref" data-pref="${pref}" ${openState[pref] ? 'open' : ''}>
        <summary>${pref}県<span class="count">${planned ? `<em>予定 ${planned}</em>` : ''}${done} / ${all.length}</span></summary>
        <div class="bar"><i class="done" style="width:${(done / all.length) * 100}%"></i><i class="plan" style="width:${(planned / all.length) * 100}%"></i></div>
        <ul>${shown.map(itemHtml).join('') || '<li class="empty">該当なし</li>'}</ul>
      </details>`;
    }
    listEl.innerHTML = html;
    renderTotal();
  }

  function itemHtml(s) {
    const st = statusOf(s.id);
    return `<li data-id="${esc(s.id)}" class="st-${st}">
      <div class="info">
        <div class="name">${esc(s.name)}</div>
        <div class="sub">${esc(s.city)} ／ ${esc(s.route)}</div>
        ${visited[s.id] ? `<div class="date">${esc(visited[s.id])} に行った</div>` : ''}
      </div>
      <label class="chk plan"><input type="checkbox" data-kind="plan" ${plan[s.id] ? 'checked' : ''}>予定</label>
      <label class="chk done"><input type="checkbox" data-kind="done" ${visited[s.id] ? 'checked' : ''}>行った</label>
    </li>`;
  }

  function renderTotal() {
    const done = STATIONS.filter((s) => visited[s.id]).length;
    const planned = STATIONS.filter((s) => plan[s.id] && !visited[s.id]).length;
    document.getElementById('total').innerHTML =
      `${planned ? `<span class="tplan">予定 ${planned}</span>` : ''}制覇 <b>${done}</b> / ${STATIONS.length}`;
  }

  listEl.addEventListener('change', (e) => {
    const box = e.target.closest('input[data-kind]');
    if (box) setStatus(box.closest('li').dataset.id, box.dataset.kind, box.checked);
  });
  listEl.addEventListener('click', (e) => {
    const info = e.target.closest('.info');
    if (!info) return;
    const id = info.closest('li').dataset.id;
    map.setView(markers[id].getLatLng(), Math.max(map.getZoom(), 12));
    openPopup(id);
    highlight(id, false);
  });
  listEl.addEventListener('toggle', (e) => {
    const p = e.target.dataset && e.target.dataset.pref;
    if (p) openState[p] = e.target.open;
  }, true);
  qEl.addEventListener('input', renderList);
  filterEl.addEventListener('change', renderList);

  // ---- 状態の変更：地図・ポップアップ・一覧をここでまとめて更新する ----
  // 「行った」と「行く予定」はどちらか一方だけ（行ったら予定は外れる）
  function setStatus(id, kind, on) {
    if (kind === 'done') {
      if (on) { visited[id] = visited[id] || today(); delete plan[id]; } else delete visited[id];
    } else if (on) {
      plan[id] = plan[id] || today(); delete visited[id];
    } else delete plan[id];
    touch([id]);
    saveStatus();
    paintMarker(id);
    if (popupId === id) popup.setContent(popupHtml(BY_ID[id]));
    renderList();
    highlight(id, false);
    if (mode === 'route') renderRoute();
    scheduleSync();
  }

  // 記録がまとめて変わったとき（読み込み・リセット・同期）の画面の作り直し
  function refreshAll() {
    paintAll();
    renderList();
    if (popupId) popup.setContent(popupHtml(BY_ID[popupId]));
    if (mode === 'route') renderRoute();
  }

  function paintMarker(id) {
    const st = statusOf(id);
    markers[id].setStyle({ fillColor: COLOR[st] });
    if (st !== 'todo') markers[id].bringToFront();
  }
  function paintAll() { for (const id in markers) paintMarker(id); }

  function highlight(id, scroll) {
    listEl.querySelectorAll('li.active').forEach((el) => el.classList.remove('active'));
    const li = listEl.querySelector(`li[data-id="${CSS.escape(id)}"]`);
    if (!li) return;
    li.classList.add('active');
    if (scroll) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  // =====================================================================
  // 道順モード：選んだ駅を順にまわったときの所要時間を出す
  // 経路は OSRM（OpenStreetMap の道路データで車の経路を出す無料サーバー）で計算する
  // =====================================================================
  const OSRM = 'https://router.project-osrm.org';
  const routeLayer = L.layerGroup().addTo(map);
  const stopsEl = document.getElementById('stops');
  const resultEl = document.getElementById('route-result');
  const restEl = document.getElementById('rest');
  const fromHereEl = document.getElementById('from-here');
  restEl.value = String(route.rest);
  fromHereEl.checked = route.fromHere;
  let here = null; // 現在地 [lat, lng]
  let calcSeq = 0;
  let calcTimer = null;

  function toggleStop(id) {
    const i = route.stops.indexOf(id);
    if (i >= 0) route.stops.splice(i, 1); else route.stops.push(id);
    routeChanged();
  }
  function routeChanged() {
    saveRoute();
    if (popupId) popup.setContent(popupHtml(BY_ID[popupId]));
    renderRoute();
  }

  function renderRoute() {
    stopsEl.innerHTML = route.stops.length
      ? route.stops.map((id, i) => {
        const s = BY_ID[id];
        return `<li data-id="${esc(id)}" class="st-${statusOf(id)}">
          <span class="num">${i + 1}</span>
          <div class="info"><div class="name">${esc(s.name)}</div><div class="sub">${esc(s.pref)}県${esc(s.city)}</div></div>
          <button type="button" data-act="up" ${i === 0 ? 'disabled' : ''} aria-label="上へ">↑</button>
          <button type="button" data-act="down" ${i === route.stops.length - 1 ? 'disabled' : ''} aria-label="下へ">↓</button>
          <button type="button" data-act="del" aria-label="外す">×</button>
        </li>`;
      }).join('')
      : '<li class="empty">地図の道の駅を押すと、押した順に追加されます。</li>';
    document.getElementById('optimize').disabled = route.stops.length < 3;
    document.getElementById('clear-route').disabled = !route.stops.length;
    drawStopNumbers();
    clearTimeout(calcTimer);
    calcTimer = setTimeout(calcRoute, 250);
  }

  function drawStopNumbers() {
    routeLayer.clearLayers();
    route.stops.forEach((id, i) => {
      L.marker(markers[id].getLatLng(), {
        icon: L.divIcon({ className: 'stop-num', html: String(i + 1), iconSize: [22, 22], iconAnchor: [11, 26] }),
        interactive: false,
      }).addTo(routeLayer);
    });
    if (here && route.fromHere) {
      L.circleMarker(here, { radius: 7, color: '#fff', weight: 3, fillColor: '#1a73e8', fillOpacity: 1, interactive: false }).addTo(routeLayer);
    }
  }

  // 計算に使う地点の並び（現在地から出発するときは先頭に現在地）
  function waypoints() {
    const pts = route.stops.map((id) => ({ name: BY_ID[id].name, lat: BY_ID[id].lat, lng: BY_ID[id].lng }));
    if (route.fromHere && here) pts.unshift({ name: '現在地', lat: here[0], lng: here[1], here: true });
    return pts;
  }

  async function calcRoute() {
    const seq = ++calcSeq;
    const pts = waypoints();
    if (route.fromHere && !here) { resultEl.innerHTML = '<p class="muted">現在地を調べています…</p>'; return; }
    if (pts.length < 2) {
      resultEl.innerHTML = '<p class="muted">道の駅を2つ以上選ぶと、所要時間を計算します。</p>';
      return;
    }
    resultEl.innerHTML = '<p class="muted">計算中…</p>';
    const coords = pts.map((p) => `${p.lng},${p.lat}`).join(';');
    let legs, line, approx = false;
    try {
      const res = await fetch(`${OSRM}/route/v1/driving/${coords}?overview=full&geometries=geojson`);
      const data = await res.json();
      if (data.code !== 'Ok') throw new Error(data.code);
      legs = data.routes[0].legs.map((l) => ({ sec: l.duration, m: l.distance }));
      line = data.routes[0].geometry.coordinates.map(([x, y]) => [y, x]);
    } catch (err) {
      // 経路サーバーにつながらないときは直線距離からの概算（道なり ×1.3、平均 40km/h）
      approx = true;
      legs = pts.slice(1).map((p, i) => {
        const m = distance(pts[i], p) * 1.3;
        return { sec: m / (40000 / 3600), m };
      });
      line = pts.map((p) => [p.lat, p.lng]);
    }
    if (seq !== calcSeq) return; // 計算中に駅が変わった
    showResult(pts, legs, approx);
    L.polyline(line, { color: '#1a73e8', weight: 5, opacity: 0.8, dashArray: approx ? '8 8' : null, interactive: false }).addTo(routeLayer);
  }

  function showResult(pts, legs, approx) {
    const restMin = route.rest;
    const restCount = pts.filter((p, i) => !p.here && i < pts.length - 1).length; // 最後の駅以外で休憩
    const driveSec = legs.reduce((a, l) => a + l.sec, 0);
    const meters = legs.reduce((a, l) => a + l.m, 0);
    const totalSec = driveSec + restCount * restMin * 60;
    const rows = legs.map((l, i) => `<li>
        <span class="leg-name">${esc(pts[i].name)} → ${esc(pts[i + 1].name)}</span>
        <span class="leg-val">${fmtTime(l.sec)}<small>${fmtKm(l.m)}</small></span>
      </li>`).join('');
    resultEl.innerHTML = `
      <div class="summary">
        <div><span class="label">運転時間</span><b>${fmtTime(driveSec)}</b></div>
        <div><span class="label">距離</span><b>${fmtKm(meters)}</b></div>
        <div><span class="label">休憩こみ</span><b>${fmtTime(totalSec)}</b></div>
      </div>
      ${approx ? '<p class="warn">経路サーバーにつながらなかったため、直線距離からの概算です。</p>' : ''}
      <ol class="legs">${rows}</ol>
      <p class="muted small">渋滞なしの目安です（休憩は各駅 ${restMin} 分、最後の駅を除く）。</p>
      <a class="gmap" href="${googleMapsUrl(pts)}" target="_blank" rel="noopener">Googleマップでナビを開く</a>`;
  }

  function googleMapsUrl(pts) {
    const ll = (p) => `${p.lat},${p.lng}`;
    const u = new URL('https://www.google.com/maps/dir/');
    u.searchParams.set('api', '1');
    u.searchParams.set('travelmode', 'driving');
    u.searchParams.set('origin', pts[0].here ? ll(pts[0]) : `道の駅 ${pts[0].name}`);
    const last = pts[pts.length - 1];
    u.searchParams.set('destination', `道の駅 ${last.name}`);
    const mid = pts.slice(1, -1);
    if (mid.length) u.searchParams.set('waypoints', mid.map((p) => `道の駅 ${p.name}`).join('|'));
    return u.toString();
  }

  // 順番の最適化：出発地は固定、残りを回る順番を短くなるよう並べかえる
  document.getElementById('optimize').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const pts = waypoints();
    btn.disabled = true;
    btn.textContent = '計算中…';
    try {
      const coords = pts.map((p) => `${p.lng},${p.lat}`).join(';');
      const res = await fetch(`${OSRM}/trip/v1/driving/${coords}?source=first&roundtrip=false&destination=any&overview=false`);
      const data = await res.json();
      if (data.code !== 'Ok') throw new Error(data.code);
      const offset = pts[0].here ? 1 : 0;
      const order = data.waypoints.map((w, i) => ({ i, k: w.waypoint_index }))
        .sort((a, b) => a.k - b.k).map((w) => w.i - offset).filter((i) => i >= 0);
      route.stops = order.map((i) => route.stops[i]);
      routeChanged();
    } catch (err) {
      alert('経路サーバーにつながらなかったため、順番を最適化できませんでした。');
    } finally {
      btn.textContent = '回る順番を最適化';
      btn.disabled = route.stops.length < 3;
    }
  });

  stopsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    const li = e.target.closest('li[data-id]');
    if (!li) return;
    const i = route.stops.indexOf(li.dataset.id);
    if (!btn) { map.setView(markers[li.dataset.id].getLatLng(), Math.max(map.getZoom(), 11)); return; }
    const act = btn.dataset.act;
    if (act === 'del') route.stops.splice(i, 1);
    else {
      const j = act === 'up' ? i - 1 : i + 1;
      [route.stops[i], route.stops[j]] = [route.stops[j], route.stops[i]];
    }
    routeChanged();
  });
  document.getElementById('add-planned').addEventListener('click', () => {
    STATIONS.forEach((s) => { if (plan[s.id] && !visited[s.id] && !route.stops.includes(s.id)) route.stops.push(s.id); });
    routeChanged();
    fitRoute();
  });
  document.getElementById('clear-route').addEventListener('click', () => {
    route.stops = [];
    routeChanged();
  });
  restEl.addEventListener('change', () => { route.rest = Number(restEl.value); routeChanged(); });
  fromHereEl.addEventListener('change', () => {
    route.fromHere = fromHereEl.checked;
    saveRoute();
    if (route.fromHere && !here) locate(); else renderRoute();
  });
  function locate() {
    if (!navigator.geolocation) { failLocate(); return; }
    renderRoute();
    navigator.geolocation.getCurrentPosition(
      (p) => { here = [p.coords.latitude, p.coords.longitude]; renderRoute(); },
      failLocate,
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
    );
  }
  function failLocate() {
    route.fromHere = false;
    fromHereEl.checked = false;
    saveRoute();
    renderRoute();
    alert('現在地を取得できませんでした。位置情報の利用を許可してください。');
  }
  function fitRoute() {
    if (route.stops.length) map.fitBounds(route.stops.map((id) => markers[id].getLatLng()), { padding: [40, 40], maxZoom: 12 });
  }

  // ---- 書き出し・読み込み・リセット ----
  document.getElementById('export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ app: 'michinoeki-check', visited, plan }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `michinoeki-${today()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  document.getElementById('import').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const pick = (v) => {
        const out = {};
        for (const k in v || {}) if (BY_ID[k] && typeof v[k] === 'string') out[k] = v[k];
        return out;
      };
      const nextVisited = pick(data.visited || data);
      const nextPlan = pick(data.plan);
      const msg = `行った ${Object.keys(nextVisited).length}駅・予定 ${Object.keys(nextPlan).length}駅の記録を読み込みます。今の記録は置きかわります。よろしいですか？`;
      if (!confirm(msg)) return;
      touch(Object.keys({ ...visited, ...plan, ...nextVisited, ...nextPlan }));
      visited = nextVisited;
      plan = nextPlan;
      for (const id in visited) delete plan[id];
      saveStatus(); refreshAll(); scheduleSync();
    } catch (err) {
      alert('読み込めませんでした。書き出したファイルを選んでください。');
    }
  });
  document.getElementById('reset').addEventListener('click', () => {
    const shared = sync.url ? '\n2人で共有中なので、相手の画面からも消えます。' : '';
    if (!confirm(`「行った」と「行く予定」のチェックをすべて外します。よろしいですか？${shared}`)) return;
    touch(Object.keys({ ...visited, ...plan }));
    visited = {};
    plan = {};
    saveStatus(); refreshAll(); scheduleSync();
  });

  // =====================================================================
  // 2人で共有：合言葉クイズの答えをつけて GAS の保存係（gas/Code.gs）と記録をやりとりする
  // 正解はアプリに書かず、保存係の側で判定する
  // 駅ごとに「あとから変えたほう」が残るので、2人が同時に別の駅をチェックしても消えない
  // =====================================================================
  const sync = Object.assign({ url: '', pass: '', last: 0 }, load(KEY.sync, {}));
  const syncDlg = document.getElementById('sync-dialog');
  const syncState = document.getElementById('sync-state');
  const syncMsg = document.getElementById('sync-msg');
  let syncBusy = false;
  let syncAgain = false;
  let syncTimer = null;
  let syncError = '';

  function itemsForSync() {
    const items = {};
    for (const id of new Set([...Object.keys(visited), ...Object.keys(plan), ...Object.keys(times)])) {
      if (!BY_ID[id]) continue;
      const s = visited[id] ? 'done' : plan[id] ? 'plan' : '';
      // 共有を始める前からの記録は時刻がないので 1（いちばん古い扱い）で送る
      items[id] = [s, visited[id] || plan[id] || '', times[id] || 1];
    }
    return items;
  }

  function applyItems(items) {
    let changed = false;
    for (const id in items) {
      const [s, d, t] = items[id];
      if (!BY_ID[id] || t < (times[id] || 0)) continue; // こちらのほうが新しい（送信中に変えた）
      const before = statusOf(id) + (visited[id] || plan[id] || '');
      delete visited[id];
      delete plan[id];
      if (s === 'done') visited[id] = d;
      else if (s === 'plan') plan[id] = d;
      times[id] = t;
      if (before !== statusOf(id) + (visited[id] || plan[id] || '')) changed = true;
    }
    saveStatus();
    if (changed) refreshAll();
  }

  async function syncNow() {
    if (!sync.url || !sync.pass) return false;
    if (syncBusy) { syncAgain = true; return false; }
    syncBusy = true;
    renderSyncState('同期中…');
    let ok = false;
    try {
      // text/plain で送ると GAS でも事前確認（CORS のプリフライト）なしで届く
      const res = await fetch(sync.url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ pass: sync.pass, items: itemsForSync() }),
      });
      const data = await res.json();
      if (!data.ok) {
        if (data.error === 'pass') { sync.pass = ''; store(KEY.sync, sync); throw new Error('合言葉の答えがちがいます'); }
        throw new Error(data.error === 'full' ? '保存できる量をこえました' : data.error);
      }
      applyItems(data.items);
      sync.last = Date.now();
      store(KEY.sync, sync);
      syncError = '';
      ok = true;
    } catch (err) {
      syncError = err && err.message && !/fetch|JSON|Unexpected/i.test(err.message) ? err.message : 'つながりませんでした（URL と電波を確認してください）';
    } finally {
      syncBusy = false;
      renderSyncState();
      if (syncAgain) { syncAgain = false; scheduleSync(); }
    }
    return ok;
  }

  function scheduleSync() {
    if (!sync.url) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncNow, 800);
  }

  function renderSyncState(busyText) {
    const on = !!(sync.url && sync.pass);
    syncState.hidden = !on;
    syncState.hidden = !sync.url;
    syncState.classList.toggle('error', (!!syncError || !sync.pass) && !busyText);
    syncState.textContent = busyText || (!sync.pass ? '合言葉が未回答' : syncError ? '同期できません' : '2人で共有中');
    if (!syncDlg.open) return;
    document.getElementById('sync-off').hidden = !on;
    document.getElementById('share-box').hidden = !on;
    if (on) document.getElementById('share-link').value = shareLink();
    syncMsg.className = syncError && !busyText ? 'sync-msg error' : 'sync-msg';
    syncMsg.textContent = busyText || syncError ||
      (on ? `共有中です。最後に同期：${sync.last ? new Date(sync.last).toLocaleString('ja-JP') : 'まだ'}` : '');
  }

  function shareLink() {
    const q = new URLSearchParams({ u: sync.url });
    return `${location.origin}${location.pathname}#share&${q}`;
  }

  function openSyncDialog() {
    document.getElementById('sync-url').value = sync.url;
    document.querySelectorAll('input[name="sync-pass"]').forEach((r) => { r.checked = r.value === sync.pass; });
    syncDlg.showModal();
    renderSyncState();
  }
  document.getElementById('sync-open').addEventListener('click', openSyncDialog);
  document.getElementById('sync-close').addEventListener('click', () => syncDlg.close());
  document.getElementById('sync-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = document.getElementById('sync-url').value.trim();
    const picked = document.querySelector('input[name="sync-pass"]:checked');
    const pass = picked ? picked.value : '';
    if (!/^https:\/\/script\.google(usercontent)?\.com\/.+/.test(url)) {
      syncError = 'URL は https://script.google.com/… で始まる、デプロイで表示されたものを貼ってください';
      renderSyncState(); return;
    }
    if (!pass) { syncError = '合言葉の答えを選んでください'; renderSyncState(); return; }
    Object.assign(sync, { url, pass, last: 0 });
    store(KEY.sync, sync);
    if (await syncNow()) syncMsg.textContent = `つながりました。共有中の記録：行った ${Object.keys(visited).length}駅・予定 ${Object.keys(plan).length}駅`;
  });
  document.getElementById('sync-off').addEventListener('click', () => {
    if (!confirm('この端末での共有をやめます（記録はこの端末に残ります）。よろしいですか？')) return;
    Object.assign(sync, { url: '', pass: '', last: 0 });
    store(KEY.sync, sync);
    syncError = '';
    document.getElementById('sync-url').value = '';
    document.querySelectorAll('input[name="sync-pass"]').forEach((r) => { r.checked = false; });
    renderSyncState();
  });
  document.getElementById('share-copy').addEventListener('click', async () => {
    const input = document.getElementById('share-link');
    try { await navigator.clipboard.writeText(input.value); syncMsg.textContent = 'リンクをコピーしました。LINE などで相手に送ってください。'; } catch (err) { input.select(); }
  });

  // 相手から送られた共有リンク（#share&u=…）で開いたら、URL を入れた状態で合言葉クイズを出す
  let askQuiz = false;
  if (location.hash.startsWith('#share')) {
    const q = new URLSearchParams(location.hash.slice('#share'.length).replace(/^&/, ''));
    if (q.get('u')) {
      Object.assign(sync, { url: q.get('u'), pass: '', last: 0 });
      store(KEY.sync, sync);
      askQuiz = true;
    }
    history.replaceState(null, '', location.pathname + location.search);
  }

  // 開いたとき・アプリに戻ってきたとき・開いている間は30秒ごとに同期
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow(); });
  setInterval(() => { if (document.visibilityState === 'visible') syncNow(); }, 30000);

  // ---- 小物 ----
  function distance(a, b) {
    const R = 6371000, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function fmtTime(sec) {
    const min = Math.round(sec / 60);
    const h = Math.floor(min / 60);
    return h ? `${h}時間${min % 60 ? `${min % 60}分` : ''}` : `${min}分`;
  }
  function fmtKm(m) { return `${(m / 1000).toFixed(m < 10000 ? 1 : 0)}km`; }
  function esc(v) {
    return String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  paintAll();
  renderList();
  if (route.fromHere) locate();
  renderSyncState();
  if (askQuiz) openSyncDialog(); else syncNow();
})();
