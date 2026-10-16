/* The Japan edition with no signal (wrongtrain.lol/japan). The page and its files are kept on the
   phone: the page itself is fetched fresh when there is signal (so updates arrive), files and map
   tiles come from the phone first. The trip lives in the app's own storage; the sheet's script
   (script.google.com) is never cached, so sign-in, ticks and notes always go to the sheet. */
const CACHE = 'wt-japan-v1';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', './index.html'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('wt-japan-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || /script\.google(usercontent)?\.com|supabase\.co/.test(url.hostname)) return;
  const keep = res => { if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; };
  if (req.mode === 'navigate') {
    /* the page: fresh when there's signal, the kept copy when there isn't */
    e.respondWith(fetch(req).then(keep).catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }
  /* files (named by their contents, so a kept copy is never stale) and map tiles: the phone first */
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(keep)));
});
