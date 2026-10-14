// GAS 版のセーブ：学校の Google アカウントごとに、先生のスプレッドシートへ一人一つ保存する
// google.script.run があるとき（GAS のウェブアプリとして開いたとき）だけ動く。ふつうのブラウザでは何もしない
const run = () => window.google?.script?.run;
export const onGas = () => !!run();

const call = (fn, ...args) => new Promise((ok, ng) => run().withSuccessHandler(ok).withFailureHandler(ng)[fn](...args));

// state：'local'（GAS ではない）／'ok'（クラウドに保存できている）／'guest'（ログインが分からない：この端末だけ）／'error'（通信できない）
export const cloud = { state: 'local', user: null };

// はじめに一度：{ user, save, settings, updated } を返す（save・settings は JSON 文字列）
export async function cloudLoad() {
  if (!onGas()) return null;
  try {
    const r = await call('wgLoad');
    if (!r || !r.user) { cloud.state = 'guest'; return null; }
    cloud.state = 'ok';
    cloud.user = r.user;
    return r;
  } catch (e) {
    cloud.state = 'error';
    return null;
  }
}

// 保存は少しまとめてから送る（送っている間に来た分は、終わってから最新だけ送る）
let pending = null, timer = 0, busy = false;
export function cloudPush(part) {
  if (!cloud.user) return;
  pending = Object.assign(pending || {}, part);
  if (!timer) timer = setTimeout(flush, 3000); // 続けて保存されても、3秒ごとにはかならず送る
}
export function flush() {
  clearTimeout(timer);
  timer = 0;
  if (busy || !pending || !cloud.user) return;
  const p = pending;
  pending = null;
  busy = true;
  call('wgSave', p)
    .then(() => { cloud.state = 'ok'; })
    .catch(() => { cloud.state = 'error'; pending = Object.assign(p, pending || {}); timer = setTimeout(flush, 5000); })
    .finally(() => { busy = false; if (pending && !timer) timer = setTimeout(flush, 300); });
}
if (onGas()) {
  addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
}
