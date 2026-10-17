/* The Japan edition with no signal (wrongtrain.lol). On install it saves the page and its code
   (precache.json, made at build time), so after one visit it opens anywhere. The page itself is
   fetched fresh when there is signal, so updates arrive; code files are named by their contents,
   so a saved copy is never stale; map tiles and font pieces are saved as they're used. The trip
   lives in the app's own storage, and the sheet's script (script.google.com) is never cached, so
   sign-in, ticks and notes always go to the sheet. */
const CACHE = 'wt-japan-v2';
const BASE = ['./', './index.html', './favicon.svg', './apple-touch-icon.png', './phrases/ja.json'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(BASE).catch(() => {});
    const list = await fetch('./precache.json', { cache: 'no-cache' }).then(r => r.json()).catch(() => []);
    await c.addAll(list.map(f => './' + f)).catch(() => {});
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('wt-japan-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || /script\.google(usercontent)?\.com|supabase\.co/.test(url.hostname)) return;
  const keep = res => { if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; };
  if (req.mode === 'navigate') {
    /* the page: fresh when there's signal, the saved copy when there isn't */
    e.respondWith(fetch(req).then(keep).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html'))));
    return;
  }
  /* code, fonts and map tiles: the phone's copy first */
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(keep)));
});
