/* The test copy that lived here has moved to the site root; this worker removes itself. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.registration.unregister()));
