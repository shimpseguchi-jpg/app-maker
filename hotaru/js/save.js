// セーブ（ブラウザに ほぞん）。かぎの せっとうじ hotaru.
const K = 'hotaru.';
function read(k, def) { try { const v = localStorage.getItem(K + k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
function write(k, v) { try { if (v == null) localStorage.removeItem(K + k); else localStorage.setItem(K + k, JSON.stringify(v)); } catch (e) { /* ほぞん できなくても あそべる */ } }

export const settings = Object.assign({ text: 'hira', bgm: 0.5, sfx: 0.8, pad: true, speech: true, view: '3d' }, read('settings', {}));
export const saveSettings = () => write('settings', settings);
export const loadProfile = () => read('profile', null);
export const saveProfile = (P) => write('profile', P);
export const loadRun = () => read('run', null);
export const saveRun = (G) => write('run', G);
export function resetAll() { try { Object.keys(localStorage).filter((k) => k.startsWith(K)).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* */ } }
