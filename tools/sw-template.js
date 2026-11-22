// Written by the build (see vite.config.js) from tools/sw-template.js. Do not edit the built copy.
// Keeps a whole copy of the game on the device, so it opens at once and works offline.
// Each version has its own complete set of files; a new version is fetched in the background
// and takes over when it is all there.
const CACHE = '__CACHE__';
const FILES = __FILES__;

self.addEventListener('install', (e) => {
  // "reload" skips the browser's own cache, so a new version never keeps a stale file
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((all) => Promise.all(all.filter((k) => k.startsWith('cosy-cats-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Music is asked for in slices; a browser may refuse a whole file where it asked for a part of one.
async function slice(req, res) {
  const m = /bytes=(\d+)-(\d*)/.exec(req.headers.get('range') || '');
  if (!m) return res;
  const buf = await res.arrayBuffer(), from = +m[1], to = m[2] ? Math.min(+m[2], buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(from, to + 1), { status: 206, statusText: 'Partial Content', headers: {
    'Content-Type': res.headers.get('Content-Type') || 'application/octet-stream', 'Content-Range': 'bytes ' + from + '-' + to + '/' + buf.byteLength, 'Content-Length': String(to - from + 1), 'Accept-Ranges': 'bytes' } });
}
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // one saved copy per file, whatever follows the "?"
  const key = url.origin + url.pathname + (url.pathname.endsWith('/') ? 'index.html' : '');
  e.respondWith(caches.open(CACHE).then((c) => c.match(key)).then((hit) => (hit ? slice(req, hit) : fetch(req))));
});
