/* The current website is encrypted at rest. No password or decryption key is persisted. */
const ROOT = new URL('./', self.location.href);
const PRIVATE = `${ROOT.pathname}_private/`;
const sessions = new Map();
const pending = new Map();
const revoked = new Set();
const TOKEN = /^[a-f0-9]{48}$/;
const decode = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
let envelopePromise = null;

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

async function envelope() {
  if (!envelopePromise) envelopePromise = (async () => {
    const metaResponse = await fetch(new URL('vault.json', ROOT), {cache: 'no-store'});
    if (!metaResponse.ok) throw Error('unavailable');
    const meta = await metaResponse.json();
    if (meta.version !== 1 || meta.kdf !== 'PBKDF2-SHA256' || meta.iterations !== 600000 || !/^[a-f0-9]{64}$/.test(meta.digest)) throw Error('unavailable');
    const response = await fetch(new URL(`vault.bin?v=${meta.digest}`, ROOT), {cache: 'no-store'});
    if (!response.ok) throw Error('unavailable');
    const cipher = await response.arrayBuffer();
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', cipher)), b => b.toString(16).padStart(2, '0')).join('');
    if (digest !== meta.digest) throw Error('unavailable');
    return {meta, cipher};
  })().catch(error => {envelopePromise = null; throw error;});
  return envelopePromise;
}

async function unlock(event) {
  const {key, token} = event.data;
  const source = event.source;
  if (!TOKEN.test(token) || !source?.id || !source.url?.startsWith(ROOT.href) || source.url.includes(PRIVATE) || !(key instanceof CryptoKey) || key.type !== 'secret' || key.algorithm.name !== 'AES-GCM' || key.algorithm.length !== 256 || key.extractable || !key.usages.includes('decrypt')) return {ok: false};
  if (revoked.has(`${source.id}:${token}`)) return {ok: false};
  try {
    const {meta, cipher} = await envelope();
    let plain;
    try {plain = await crypto.subtle.decrypt({name: 'AES-GCM', iv: decode(meta.iv), additionalData: new TextEncoder().encode('NUMERIA-PRIVATE-V1'), tagLength: 128}, key, cipher);} catch {return {ok: false, error: 'incorrect'};}
    const data = JSON.parse(new TextDecoder().decode(plain));
    new Uint8Array(plain).fill(0);
    if (data.schema !== 1 || !data.files || !Object.hasOwn(data.files, 'index.html') || !Object.hasOwn(data.files, 'ecole.html')) throw Error('unavailable');
    if (revoked.has(`${source.id}:${token}`)) return {ok: false};
    sessions.set(token, {owner: source.id, files: data.files, until: Date.now() + 8 * 60 * 60 * 1000});
    pending.get(token)?.resolve(true); pending.delete(token);
    return {ok: true};
  } catch {return {ok: false, error: 'unavailable'};}
}

self.addEventListener('message', event => {
  if (event.data?.type === 'numeria.unlock') event.waitUntil(unlock(event).then(result => event.ports[0]?.postMessage(result)));
  if (event.data?.type === 'numeria.lock' && TOKEN.test(event.data.token)) {
    const session = sessions.get(event.data.token);
    if (event.source?.id && event.source.url?.startsWith(ROOT.href) && !event.source.url.includes(PRIVATE) && (!session || session.owner === event.source.id)) {
      revoked.add(`${event.source.id}:${event.data.token}`);
      sessions.delete(event.data.token);
      pending.get(event.data.token)?.resolve(false); pending.delete(event.data.token);
    }
  }
});

async function restore(token) {
  if (pending.has(token)) return pending.get(token).promise;
  let resolve;
  const promise = new Promise(done => {resolve = done;});
  pending.set(token, {promise, resolve});
  const timer = setTimeout(() => {pending.get(token)?.resolve(false); pending.delete(token);}, 8000);
  const windows = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
  for (const client of windows) if (client.url.startsWith(ROOT.href) && !client.url.includes(PRIVATE)) client.postMessage({type: 'numeria.need-key', token});
  return promise.finally(() => clearTimeout(timer));
}

function denied() {return new Response('Accès réservé. Ouvrez Numeria avec votre mot de passe.', {status: 403, headers: {'Content-Type': 'text/plain;charset=utf-8', 'Cache-Control': 'no-store'}});}

async function privateFile(event, url) {
  const parts = url.pathname.slice(PRIVATE.length).split('/');
  const token = parts.shift();
  if (!TOKEN.test(token)) return denied();
  let path;
  try {path = decodeURIComponent(parts.join('/'));} catch {return denied();}
  if (!path || path.endsWith('/')) path += 'index.html';
  if (path.split('/').some(part => part === '.' || part === '..') || path.includes('\\') || path.includes('\0')) return denied();
  if (!sessions.has(token)) await restore(token);
  const session = sessions.get(token);
  if (!session || session.until < Date.now() || !await self.clients.get(session.owner)) {sessions.delete(token); return denied();}
  const file = Object.hasOwn(session.files, path) && session.files[path];
  if (!file) return new Response('Page introuvable.', {status: 404, headers: {'Content-Type': 'text/plain;charset=utf-8', 'Cache-Control': 'no-store'}});
  if (!['GET', 'HEAD'].includes(event.request.method)) return new Response('Méthode refusée.', {status: 405});
  return new Response(event.request.method === 'HEAD' ? null : decode(file.data), {headers: {'Content-Type': file.type, 'Cache-Control': 'no-store, max-age=0', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer'}});
}

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== ROOT.origin || !url.pathname.startsWith(ROOT.pathname)) return;
  if (url.pathname.startsWith(PRIVATE)) event.respondWith(privateFile(event, url));
  else event.respondWith(fetch(event.request, {cache: 'no-store'}));
});
