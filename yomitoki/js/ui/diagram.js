// 〇の ならびで おはなしを みせる（きょうかしょの ブロック図と おなじ かんがえかた）
// mode：'hint'（ことばだけ。こたえは みせない） / 'explain'（かずと しきと こたえ）

function dotsHtml(list) {
  return `<div class="dots" style="width:${10 * 19 + 9 * 4 + 8 + 12}px">${list.map((c, i) => `<i class="dot ${c}${i % 10 === 5 ? ' gap' : ''}"></i>`).join('')}</div>`;
}

// p：もんだい
export function diagramHtml(p, mode) {
  const d = p.diagram;
  const ex = mode === 'explain';
  const rows = [];
  if (d.type === 'seq') {
    const verbs = p.sentences.filter((s) => s.role === 'event').map((s) => s.verb);
    let alive = d.stages[0].n;
    rows.push({ lab: ex ? `はじめ <span class="n">${alive}</span>` : 'はじめ', dots: Array(alive).fill(''), res: '' });
    let vi = 0;
    d.stages.slice(1).forEach((st) => {
      const foc = ex && st.focus ? ' focus' : '';
      if (st.kind === 'in') {
        const word = st.pair ? 'あわせる' : verbs[vi++] || 'ふえる';
        rows.push({ lab: ex ? `${word}<br><span class="n">＋${st.n}</span>` : word, dots: [...Array(alive).fill(''), ...Array(st.n).fill((st.pair ? 'b' : 'new') + foc)], res: ex && !d.moved ? `→ ${alive + st.n}` : '' });
        alive += st.n;
      } else {
        const word = verbs[vi++] || 'へる';
        const take = Math.min(st.n, alive);
        rows.push({ lab: ex ? `${word}<br><span class="n">−${st.n}</span>` : word, dots: [...Array(alive - take).fill(''), ...Array(take).fill('gone' + foc)], res: ex && !d.moved ? `→ ${alive - take}` : '' });
        alive -= take;
      }
    });
    if (ex && d.moved) rows.push({ lab: '<b>あわせる</b>', dots: Array(p.answer).fill('new focus'), res: `${p.answer}` });
  } else {
    const { a, b } = d;
    if (d.mode === 'sum') {
      rows.push({ lab: ex ? `${d.ea} <span class="n">${a}</span>` : d.ea, dots: Array(a).fill(''), res: '' });
      rows.push({ lab: ex ? `${d.eb} <span class="n">${b}</span>` : d.eb, dots: Array(b).fill('b'), res: '' });
      if (ex) rows.push({ lab: 'あわせて', dots: [...Array(a).fill(''), ...Array(b).fill('b')], res: `${a + b}` });
    } else {
      rows.push({ lab: ex ? `${d.ea} <span class="n">${a}</span>` : d.ea, dots: Array(a).fill('').map((x, i) => (ex && i >= b ? 'extra-diff' : '')), res: ex ? `ちがい ${a - b}` : '' });
      rows.push({ lab: ex ? `${d.eb} <span class="n">${b}</span>` : d.eb, dots: [...Array(b).fill('b'), ...(ex ? Array(a - b).fill('ghost') : [])], res: '' });
    }
  }
  return `<div class="diagram">${rows.map((r) => `<div class="drow"><div class="lab">${r.lab}</div>${dotsHtml(r.dots)}<div class="res">${r.res}</div></div>`).join('')}</div>`;
}
