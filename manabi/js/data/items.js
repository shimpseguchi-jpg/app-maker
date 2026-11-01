// ステージの アイテム。power は ゾーンの きょうかの のうりょくで 1.0〜1.5（＋パッシブ）
export const ITEMS = {
  dash: { name: 'ダッシュ', icon: '⚡', desc: 'しばらく はやく はしる', dur: (p) => 2 + 1 * (p - 1) * 2 },
  shield: { name: 'シールド', icon: '🛡️', desc: 'しばらく ダメージを ふせぐ', dur: (p) => 5 + 3 * (p - 1) * 2 },
  ball: { name: 'ボール', icon: '⚾', desc: 'まえに なげる。あたった ライバルは HP −1', range: (p) => 6 + 4 * (p - 1) * 2 },
  spring: { name: 'バネ', icon: '🌀', desc: 'おおきく ジャンプ', mul: (p) => 1.5 + 0.3 * (p - 1) * 2 },
  heart: { name: 'ハート', icon: '💖', desc: 'HPが かいふく', amount: (p) => (p >= 1.4 ? 2 : 1) },
};
export const ITEM_IDS = Object.keys(ITEMS);
// ブロックから でる わりあい
export const ITEM_WEIGHTS = [['dash', 4], ['shield', 3], ['ball', 3], ['spring', 2], ['heart', 2]];
