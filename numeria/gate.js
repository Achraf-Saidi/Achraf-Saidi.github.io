const BASE = '/numeria/';
const form = document.getElementById('access-form');
const input = document.getElementById('access-password');
const submit = document.getElementById('access-submit');
const status = document.getElementById('access-message');
const screen = document.getElementById('access-screen');
const session = document.getElementById('protected-session');
const holder = document.getElementById('protected-content');
let key = null, token = '', worker = null, busy = false, frame = null;
const bytes = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));

async function getWorker() {
  if (!isSecureContext || !crypto.subtle || !('serviceWorker' in navigator)) throw Error('unsupported');
  const scriptURL = new URL(`${BASE}secure-worker.js?v=protected-3`, location.href).href;
  const registration = await navigator.serviceWorker.register(scriptURL, {scope: BASE, updateViaCache: 'none'});
  const active = registration.installing || registration.waiting || registration.active;
  if (!active) throw Error('unavailable');
  if (active.state !== 'activated') await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('unavailable')), 20000);
    const changed = () => { if (active.state === 'activated') { clearTimeout(timer); active.removeEventListener('statechange', changed); resolve(); } else if (active.state === 'redundant') {clearTimeout(timer); reject(Error('unavailable'));} };
    active.addEventListener('statechange', changed);
    changed();
  });
  if (navigator.serviceWorker.controller?.scriptURL !== scriptURL) await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {navigator.serviceWorker.removeEventListener('controllerchange', changed); reject(Error('unavailable'));}, 20000);
    const changed = () => {
      if (navigator.serviceWorker.controller?.scriptURL === scriptURL) {clearTimeout(timer); navigator.serviceWorker.removeEventListener('controllerchange', changed); resolve();}
    };
    navigator.serviceWorker.addEventListener('controllerchange', changed);
    changed();
  });
  return registration.active || active;
}

function askWorker(target, message) {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => {channel.port1.close(); reject(Error('unavailable'));}, 25000);
    channel.port1.onmessage = event => {clearTimeout(timer); channel.port1.close(); resolve(event.data);};
    target.postMessage(message, [channel.port2]);
  });
}

function requestedPath() {
  let path = location.pathname.startsWith(BASE) ? location.pathname.slice(BASE.length) : 'index.html';
  if (path.startsWith('_private/')) path = path.split('/').slice(2).join('/');
  if (!path || path.endsWith('/')) path += 'index.html';
  return path;
}

function lock(message = '') {
  const oldToken = token;
  key = null; token = '';
  if (oldToken && worker) worker.postMessage({type: 'numeria.lock', token: oldToken});
  if (frame) {frame.src = 'about:blank'; frame.remove(); frame = null;}
  holder.replaceChildren(); session.hidden = true; screen.hidden = false;
  input.value = ''; input.removeAttribute('aria-invalid'); status.textContent = message;
  document.title = 'NUMERIA · Accès réservé';
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || !input.value) return;
  busy = true; submit.disabled = true; input.disabled = true; input.removeAttribute('aria-invalid');
  status.textContent = 'Ouverture de votre espace…';
  try {
    worker = await getWorker();
    const response = await fetch(`${BASE}vault.json`, {cache: 'no-store', credentials: 'same-origin'});
    if (!response.ok) throw Error('unavailable');
    const vault = await response.json();
    if (vault.version !== 1 || vault.iterations !== 600000 || vault.kdf !== 'PBKDF2-SHA256') throw Error('unavailable');
    const secret = new TextEncoder().encode(input.value);
    input.value = '';
    const material = await crypto.subtle.importKey('raw', secret, 'PBKDF2', false, ['deriveKey']);
    secret.fill(0);
    const candidate = await crypto.subtle.deriveKey({name: 'PBKDF2', salt: bytes(vault.salt), iterations: vault.iterations, hash: 'SHA-256'}, material, {name: 'AES-GCM', length: 256}, false, ['decrypt']);
    const nextToken = Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, '0')).join('');
    const result = await askWorker(worker, {type: 'numeria.unlock', token: nextToken, key: candidate});
    if (!result?.ok) throw Error(result?.error === 'unavailable' ? 'unavailable' : 'incorrect');
    key = candidate; token = nextToken;
    frame = document.createElement('iframe');
    frame.title = 'Numeria · Vitrine et espaces école';
    frame.referrerPolicy = 'no-referrer';
    frame.src = `${BASE}_private/${token}/${requestedPath()}${location.search}${location.hash}`;
    holder.replaceChildren(frame); screen.hidden = true; session.hidden = false; status.textContent = '';
    document.title = 'NUMERIA · Session privée';
  } catch (error) {
    lock(error.message === 'unsupported' ? 'Ouvrez Numeria dans un navigateur récent, en navigation classique, pour accéder à cet espace.' : error.message === 'unavailable' ? 'L’espace ne peut pas s’ouvrir pour le moment. Vérifiez votre connexion et réessayez.' : 'Mot de passe incorrect. Réessayez.');
    input.setAttribute('aria-invalid', 'true');
  } finally {
    busy = false; submit.disabled = false; input.disabled = false;
    if (!key) input.focus();
  }
});

navigator.serviceWorker?.addEventListener('message', async event => {
  if (!key || !token || event.data?.type !== 'numeria.need-key' || event.data.token !== token || !event.source?.scriptURL?.startsWith(`${location.origin}${BASE}secure-worker.js`)) return;
  try {
    const result = await askWorker(event.source, {type: 'numeria.unlock', token, key});
    if (!result?.ok) lock('Votre session est terminée. Entrez de nouveau le mot de passe.');
    else worker = event.source;
  } catch {lock('Votre session est terminée. Entrez de nouveau le mot de passe.');}
});
document.getElementById('access-lock').addEventListener('click', () => {lock(); input.focus();});
window.addEventListener('message', event => {
  if (event.origin === location.origin && event.source === frame?.contentWindow && event.data?.type === 'numeria.lock') {lock(); input.focus();}
});
window.addEventListener('pagehide', () => lock());
window.addEventListener('pageshow', event => {if (event.persisted) lock();});
