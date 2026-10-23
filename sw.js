// The Japan edition used to live here, at the site root, and kept itself for offline use with this
// worker. It has moved to /japan/ (with its own worker), and the root is now the website about
// WrongTrain. This replacement clears the old offline copy and steps aside, so phones that had it
// load the website instead of a stale app.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) await caches.delete(k);
  await self.registration.unregister();
  for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate(c.url);
})()));
