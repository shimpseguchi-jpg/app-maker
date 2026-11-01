// スキルカード：アクティブ（もんだい用・ステージ用）と パッシブ
// effect は エンジンが みる かぎ。desc は ひとが よむ せつめい
export const CARDS = {
  // ── アクティブ（もんだい）
  hint: { name: 'ヒント', type: 'active', phase: 'quiz', rarity: 1, icon: '💡', desc: '1もん、ちがう こたえを 1つ けす（キーぱっどの もんだいでは けたの かずが わかる）' },
  retry: { name: 'もういちど', type: 'active', phase: 'quiz', rarity: 1, icon: '🔁', desc: '1もん、まちがえても もういちど こたえられる' },
  swap: { name: 'ひらめき', type: 'active', phase: 'quiz', rarity: 2, icon: '✨', desc: '1もん、おなじ きょうかの べつの もんだいに かえる' },
  perfect: { name: 'まんてん', type: 'active', phase: 'quiz', rarity: 3, icon: '💯', desc: '1もん、まちがえても せいかいに なる' },
  // ── アクティブ（ステージ）
  startdash: { name: 'スタートダッシュ', type: 'active', phase: 'stage', rarity: 1, icon: '🚀', desc: 'つかうと 3びょう ダッシュ' },
  barrier: { name: 'バリア', type: 'active', phase: 'stage', rarity: 2, icon: '🛡️', desc: 'つかうと 10びょう ダメージと じゃまを ふせぐ' },
  warp: { name: 'ワープ', type: 'active', phase: 'stage', rarity: 2, icon: '🌀', desc: 'つぎの チェックポイントまで いっしゅんで すすむ' },
  stopall: { name: 'みんな ストップ', type: 'active', phase: 'stage', rarity: 2, icon: '⏸️', desc: 'ライバル ぜんいんが 2びょう とまる' },
  revive: { name: 'ふっかつの はね', type: 'active', phase: 'stage', rarity: 3, icon: '🪶', desc: 'HPが 0に なっても その ばで すぐ ふっかつ（1かい）' },
  golden: { name: 'ゴールデン ブロック', type: 'active', phase: 'stage', rarity: 3, icon: '🟨', desc: 'からの もんだいブロック 1つに なかみが はいる' },
  // ── パッシブ（しゅじんこう こゆう）
  hero_math: { name: 'さんすう{名人|めいじん}', type: 'passive', rarity: 2, icon: '🔢', fixed: true, effect: { zonePower: { math: 0.3 } }, desc: 'さんすうゾーンの アイテムが つよくなる' },
  hero_ja: { name: 'ことば{名人|めいじん}', type: 'passive', rarity: 2, icon: '📖', fixed: true, effect: { zonePower: { ja: 0.3 } }, desc: 'こくごゾーンの アイテムが つよくなる' },
  hero_en: { name: 'えいご{名人|めいじん}', type: 'passive', rarity: 2, icon: '🔤', fixed: true, effect: { zonePower: { en: 0.3 } }, desc: 'えいごゾーンの アイテムが つよくなる' },
  hero_all: { name: 'オールラウンダー', type: 'passive', rarity: 2, icon: '🌈', fixed: true, effect: { speed: 0.05, hp: 1 }, desc: 'はしる はやさ +5%、HP +1' },
  // ── パッシブ
  fast: { name: 'はやあし', type: 'passive', rarity: 1, icon: '👟', effect: { speed: 0.05 }, desc: 'はしる はやさ +5%' },
  jumper: { name: 'ジャンプ{名人|めいじん}', type: 'passive', rarity: 1, icon: '🦘', effect: { jump: 0.1 }, desc: 'ジャンプりょく +10%' },
  tough: { name: 'タフ', type: 'passive', rarity: 1, icon: '❤️', effect: { hp: 1 }, desc: 'さいだい HP +1' },
  genki: { name: 'げんき', type: 'passive', rarity: 1, icon: '💪', effect: { staminaSave: 5 }, desc: 'レッスンの たいりょくの へりが 5 すくない' },
  ganbari: { name: 'がんばりや', type: 'passive', rarity: 1, icon: '🔥', effect: { moodFloor: 1 }, desc: 'やるきが 😐 より さがらない' },
  review2: { name: 'ふくしゅうの おに', type: 'passive', rarity: 2, icon: '📝', effect: { reviewMul: 2 }, desc: 'ふくしゅうで もらえる りょうが 2ばい' },
  lucky: { name: 'ラッキー', type: 'passive', rarity: 2, icon: '🍀', effect: { cardOffers: 1 }, desc: 'ミニゲームの カードが 3まい→4まいから えらべる' },
  earlybird: { name: 'はやおき', type: 'passive', rarity: 2, icon: '⏰', effect: { respawn: -2 }, desc: 'チェックポイントからの ふっかつが 3びょう→1びょう' },
  pocket: { name: 'アイテム{名人|めいじん}', type: 'passive', rarity: 3, icon: '🎒', effect: { itemSlots: 1 }, desc: 'アイテムを 2つ もてる' },
};
export const CARD_IDS = Object.keys(CARDS);
export const RARITY_STARS = (r) => '★'.repeat(r);
export const DECK_MAX = 5;

// パッシブを まとめる
export function passiveSum(deck) {
  const out = { speed: 0, jump: 0, hp: 0, staminaSave: 0, moodFloor: 0, reviewMul: 1, cardOffers: 0, respawn: 0, itemSlots: 0, zonePower: { math: 0, ja: 0, en: 0 } };
  const seen = new Set();
  for (const id of deck) {
    const c = CARDS[id]; if (!c || c.type !== 'passive' || seen.has(id)) continue; seen.add(id);
    const e = c.effect || {};
    for (const k of Object.keys(e)) {
      if (k === 'zonePower') for (const s of Object.keys(e.zonePower)) out.zonePower[s] += e.zonePower[s];
      else if (k === 'reviewMul') out.reviewMul = Math.max(out.reviewMul, e[k]);
      else if (k === 'moodFloor') out.moodFloor = Math.max(out.moodFloor, e[k]);
      else out[k] += e[k];
    }
  }
  return out;
}

// ミニゲームの せいせきで えらべる カード
export function offerCards(rng, grade, deck, n = 3, pools) {
  const minR = grade === 3 ? 2 : 1, maxR = grade === 1 ? 1 : grade === 2 ? 2 : 3;
  let cands = CARD_IDS.filter((id) => !CARDS[id].fixed && CARDS[id].rarity >= minR && CARDS[id].rarity <= maxR && !(CARDS[id].type === 'passive' && deck.includes(id)));
  if (pools && pools.length) {
    const w = cands.map((id) => [id, pools.includes(id) ? 3 : 1]);
    const out = [];
    while (out.length < n && w.length) { const pick = rng.weighted(w); out.push(pick); w.splice(w.findIndex((x) => x[0] === pick), 1); }
    return out;
  }
  return rng.shuffle(cands).slice(0, n);
}
