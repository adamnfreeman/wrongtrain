/* Keeps the trip page working with no signal.

   The page already saves the trip itself in localStorage after sign-in. This worker keeps
   everything else it needs on the phone: the page, the phrase audio, the map library, the
   fonts, and every map tile that has been looked at.

   - The page: fresh from the network when there is signal (so changes still arrive),
     the saved copy when there is none or the network is too slow.
   - Phrase audio and icon: the saved copy straight away, refreshed in the background.
   - Map library, fonts, map tiles: saved the first time they load, then always from the phone.
   - The Google Sheet link (Apps Script): never touched, so sign-in, ticks and notes
     always go to the real sheet.

   Bump VERSION whenever this file changes, so phones swap in the new copy. */
const VERSION = 'v1';
const SHELL = 'wt-shell-' + VERSION;
const RUNTIME = 'wt-runtime';
const TILES = 'wt-tiles';
const MAX_TILES = 2500;          /* about 50 MB; the oldest go first */
const NAV_TIMEOUT = 4000;        /* ms to wait for the network before showing the saved page */

const LOCAL = ['./', 'index.html', 'phrases-audio.json', 'apple-touch-icon.png'];
const LIBS = [
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    await c.addAll(LOCAL);
    /* best effort: a CDN hiccup should not stop the rest being saved */
    const r = await caches.open(RUNTIME);
    await Promise.all(LIBS.map(u => fetch(u, { mode: 'cors', credentials: 'omit' })
      .then(res => res.ok && r.put(u, res)).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('wt-shell-') && k !== SHELL).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const host = url.hostname;

  if (host === 'script.google.com' || host.endsWith('.googleusercontent.com')) return;

  if (req.mode === 'navigate' && url.origin === location.origin) return e.respondWith(page(e));
  if (url.origin === location.origin) return e.respondWith(fresh(e, SHELL));
  if (host === 'tile.openstreetmap.org') return e.respondWith(tile(req));
  if (host === 'cdnjs.cloudflare.com' || host === 'fonts.googleapis.com' || host === 'fonts.gstatic.com')
    return e.respondWith(kept(req, RUNTIME));
});

/* network first, saved page if offline or slow; a late network answer still updates the copy */
async function page(e) {
  const c = await caches.open(SHELL);
  const key = new URL(e.request.url); key.search = ''; key.hash = '';
  const net = fetch(e.request).then(res => {
    if (res.ok) e.waitUntil(c.put(key.href, res.clone()));
    return res;
  });
  const timer = new Promise(r => setTimeout(r, NAV_TIMEOUT));
  try {
    const res = await Promise.race([net, timer]);
    if (res) return res;
  } catch (err) { /* offline: fall through to the saved copy */ }
  const saved = await c.match(key.href) || await c.match('./') || await c.match('index.html');
  if (saved) { net.catch(() => {}); return saved; }
  return net;   /* nothing saved yet: wait for the network after all */
}

/* saved copy straight away, refreshed in the background */
async function fresh(e, name) {
  const c = await caches.open(name);
  const saved = await c.match(e.request, { ignoreSearch: true });
  const net = fetch(e.request).then(res => {
    if (res.ok) return c.put(e.request, res.clone()).then(() => res);
    return res;
  });
  if (saved) { e.waitUntil(net.catch(() => {})); return saved; }
  return net;
}

/* saved the first time, then always from the phone */
async function kept(req, name) {
  const c = await caches.open(name);
  const saved = await c.match(req);
  if (saved) return saved;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') c.put(req, res.clone()).catch(() => {});
  return res;
}

let tilePuts = 0;
async function tile(req) {
  const c = await caches.open(TILES);
  const saved = await c.match(req.url);
  if (saved) return saved;
  /* ask for a readable (CORS) copy: opaque copies take far more storage on some browsers */
  let res;
  try { res = await fetch(req.url, { mode: 'cors', credentials: 'omit' }); }
  catch (err) { return fetch(req); }
  if (res.ok) {
    await c.put(req.url, res.clone()).catch(() => {});
    if (++tilePuts % 50 === 0) trim(c);
  }
  return res;
}

async function trim(c) {
  const keys = await c.keys();   /* oldest first */
  for (let i = 0; i < keys.length - MAX_TILES; i++) await c.delete(keys[i]);
}
