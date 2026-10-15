(function () {
  'use strict';

  const STORE_KEY = 'michinoeki-check-v1';
  const PREFS = ['栃木', '千葉', '茨城', '群馬'];
  const COLOR = { todo: '#d64545', done: '#2e9e5b' };

  // ---- 保存（{ id: 'YYYY-MM-DD' } の形。チェックした日を覚える） ----
  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(visited)); } catch (e) { /* 保存できない環境では表示だけ */ }
  }
  let visited = load();
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // ---- 地図 ----
  const map = L.map('map', { zoomControl: true, preferCanvas: false });
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
    const m = L.circleMarker([s.lat, s.lng], {
      radius: 8, weight: 2, color: '#fff', fillOpacity: 0.95,
    }).addTo(map);
    m.bindTooltip(s.name, { direction: 'top', offset: [0, -6] });
    m.bindPopup(() => popupHtml(s), { minWidth: 180 });
    markers[s.id] = m;
    bounds.push([s.lat, s.lng]);
  }
  map.fitBounds(bounds, { padding: [20, 20] });
  if (map.getZoom() < 8) map.setZoom(8);

  function popupHtml(s) {
    const checked = !!visited[s.id];
    return `<div class="popup">
      <b>道の駅 ${esc(s.name)}</b>
      <div class="sub">${esc(s.pref)}県${esc(s.city)} ／ ${esc(s.route)}</div>
      <label><input type="checkbox" data-id="${esc(s.id)}" ${checked ? 'checked' : ''}> 行った！${checked ? `（${esc(visited[s.id])}）` : ''}</label>
    </div>`;
  }

  // ポップアップ内のチェックボックス
  map.getContainer().addEventListener('change', (e) => {
    const t = e.target;
    if (t.matches('.popup input[data-id]')) setVisited(t.dataset.id, t.checked);
  });

  // ---- 一覧 ----
  const listEl = document.getElementById('list');
  const qEl = document.getElementById('q');
  const filterEl = document.getElementById('filter');
  const openState = { 栃木: true, 千葉: true, 茨城: true, 群馬: true };

  function renderList() {
    const q = qEl.value.trim();
    const f = filterEl.value;
    let html = '';
    for (const pref of PREFS) {
      const all = STATIONS.filter((s) => s.pref === pref);
      const done = all.filter((s) => visited[s.id]).length;
      const shown = all.filter((s) => {
        if (f === 'todo' && visited[s.id]) return false;
        if (f === 'done' && !visited[s.id]) return false;
        if (!q) return true;
        return [s.name, s.kana, s.city, s.route].some((v) => v && v.includes(q));
      });
      html += `<details class="pref" data-pref="${pref}" ${openState[pref] ? 'open' : ''}>
        <summary>${pref}県<span class="count">${done} / ${all.length}</span></summary>
        <div class="bar"><i style="width:${(done / all.length) * 100}%"></i></div>
        <ul>${shown.map(itemHtml).join('') || '<li class="empty">該当なし</li>'}</ul>
      </details>`;
    }
    listEl.innerHTML = html;
    renderTotal();
  }

  function itemHtml(s) {
    const d = visited[s.id];
    return `<li data-id="${esc(s.id)}" class="${d ? 'checked' : ''}">
      <input type="checkbox" ${d ? 'checked' : ''} aria-label="${esc(s.name)}に行った">
      <div class="info">
        <div class="name">${esc(s.name)}</div>
        <div class="sub">${esc(s.city)} ／ ${esc(s.route)}</div>
      </div>
      ${d ? `<span class="date">${esc(d)}</span>` : ''}
    </li>`;
  }

  function renderTotal() {
    const done = STATIONS.filter((s) => visited[s.id]).length;
    document.getElementById('total').innerHTML = `制覇 <b>${done}</b> / ${STATIONS.length}`;
  }

  listEl.addEventListener('change', (e) => {
    const li = e.target.closest('li[data-id]');
    if (li && e.target.type === 'checkbox') setVisited(li.dataset.id, e.target.checked);
  });
  listEl.addEventListener('click', (e) => {
    const info = e.target.closest('.info');
    if (!info) return;
    const id = info.closest('li').dataset.id;
    const s = STATIONS.find((x) => x.id === id);
    map.setView([s.lat, s.lng], Math.max(map.getZoom(), 12));
    markers[id].openPopup();
    highlight(id, false);
  });
  listEl.addEventListener('toggle', (e) => {
    const p = e.target.dataset && e.target.dataset.pref;
    if (p) openState[p] = e.target.open;
  }, true);
  qEl.addEventListener('input', renderList);
  filterEl.addEventListener('change', renderList);

  // ---- 状態の変更：地図と一覧の両方をここで更新する ----
  function setVisited(id, on) {
    if (on) visited[id] = visited[id] || today();
    else delete visited[id];
    save();
    paintMarker(id);
    const m = markers[id];
    if (m.isPopupOpen()) m.getPopup().update();
    renderList();
    highlight(id, false);
  }

  function paintMarker(id) {
    const on = !!visited[id];
    markers[id].setStyle({ fillColor: on ? COLOR.done : COLOR.todo });
    if (on) markers[id].bringToFront();
  }

  function highlight(id, scroll = true) {
    listEl.querySelectorAll('li.active').forEach((el) => el.classList.remove('active'));
    const li = listEl.querySelector(`li[data-id="${CSS.escape(id)}"]`);
    if (!li) return;
    li.classList.add('active');
    if (scroll !== false) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  // 地図のマーカーを押したら一覧の該当行までスクロール
  for (const id in markers) markers[id].on('click', () => highlight(id, true));

  function paintAll() { for (const id in markers) paintMarker(id); }

  // ---- 書き出し・読み込み・リセット ----
  document.getElementById('export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ app: 'michinoeki-check', visited }, null, 1)], { type: 'application/json' });
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
      const v = data.visited || data;
      const ids = new Set(STATIONS.map((s) => s.id));
      const next = {};
      for (const k in v) if (ids.has(k) && typeof v[k] === 'string') next[k] = v[k];
      if (!confirm(`${Object.keys(next).length}駅の記録を読み込みます。今の記録は置きかわります。よろしいですか？`)) return;
      visited = next;
      save(); paintAll(); renderList();
    } catch (err) {
      alert('読み込めませんでした。書き出したファイルを選んでください。');
    }
  });
  document.getElementById('reset').addEventListener('click', () => {
    if (!confirm('すべてのチェックを外します。よろしいですか？')) return;
    visited = {};
    save(); paintAll(); renderList();
  });

  function esc(v) {
    return String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  paintAll();
  renderList();
})();
