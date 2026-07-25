const CACHE_NAME = "aegis-v2";

const BASE = self.location.pathname.replace("/service-worker.js", "");

const FILES = [
    `${BASE}/`,
    `${BASE}/index.html`,
    `${BASE}/style.css`,
    `${BASE}/manifest.json`,
    `${BASE}/js/core.js`,
    `${BASE}/js/storage.js`,
    `${BASE}/js/app.js`
];

self.addEventListener("install", event => {

    event.waitUntil(

        caches.open(CACHE_NAME)
        .then(cache => cache.addAll(FILES))

    );

});

self.addEventListener("fetch", event => {

    event.respondWith(

        caches.match(event.request)
        .then(response => response || fetch(event.request))

    );

});