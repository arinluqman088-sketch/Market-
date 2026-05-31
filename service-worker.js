const CACHE_NAME = "market-pos-pro-v1";
const FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./src/app.js",
  "./src/style.css",
  "./assets/icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES)));
});

self.addEventListener("fetch", event => {
  event.respondWith(caches.match(event.request).then(res => res || fetch(event.request)));
});