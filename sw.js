const CACHE = 'ifiori-simo-shell-v051-photo-calendar';
const PREFIX = 'ifiori-simo-shell-';
const FILES = [
  './', './index.html', './installa.html', './styles.css',
  './catalogo.js', './catalogo-extra.js', './identifica.js',
  './app.js', './calendario-plus.js', './cure.js', './diagnosi-foto.js', './install.js', './manifest.webmanifest',
  './brand.png', './hero-girl.webp',
  './icons/icon-192-v041.png', './icons/icon-512-v041.png', './icons/apple-touch-icon-v041.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        // Other GitHub Pages projects share this origin. Do NOT delete their caches.
        .filter(name => name.startsWith(PREFIX) && name !== CACHE)
        .map(name => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never freeze the HTML or JS in an old offline copy when the user is online.
  const networkFirst = request.mode === 'navigate' ||
    /\.(?:html|js|css|webmanifest)$/i.test(url.pathname);

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (networkFirst) {
      try {
        const response = await fetch(request, { cache: 'no-store' });
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch (error) {
        const offline = await cache.match(request, { ignoreSearch: true });
        if (offline) return offline;
        if (request.mode === 'navigate') {
          const fallback = await cache.match('./index.html');
          if (fallback) return fallback;
        }
        throw error;
      }
    }

    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  })());
});
