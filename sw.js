// A2C Music app: works offline once opened. Change VERSION when you upload a new index.html.
const VERSION = 'a2c-v4';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './favicon.png'];
const LIB_HOSTS = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function networkFirst(req){
  const cache = await caches.open(VERSION);
  try{
    const res = await fetch(req);
    if(res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
    return res;
  }catch(e){
    const hit = await cache.match(req, {ignoreSearch: req.mode === 'navigate'});
    if(hit) return hit;
    if(req.mode === 'navigate'){ const shell = await cache.match('./index.html'); if(shell) return shell; }
    throw e;
  }
}
async function cacheFirst(req){
  const cache = await caches.open(VERSION);
  const hit = await cache.match(req);
  if(hit) return hit;
  const res = await fetch(req);
  if(res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  // Libraries and fonts have fixed versions: keep the saved copy
  if(LIB_HOSTS.includes(url.hostname)) return e.respondWith(cacheFirst(req));
  // The app itself, the song list and song files: get the newest, fall back to the saved copy offline
  if(url.origin === location.origin || url.hostname === 'api.github.com' || url.hostname === 'raw.githubusercontent.com') return e.respondWith(networkFirst(req));
});
