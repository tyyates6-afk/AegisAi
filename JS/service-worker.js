const CACHE_NAME = "aegis-v2";

const FILES = [

"/",

"/index.html",

"/style.css",

"/manifest.json",

"/js/core.js",

"/js/storage.js",

"/js/app.js"

];

self.addEventListener("install", event => {

event.waitUntil(

caches.open(CACHE_NAME)

.then(cache => {

return cache.addAll(FILES);

})

);

});

self.addEventListener("fetch", event => {

event.respondWith(

caches.match(event.request)

.then(response => {

return response || fetch(event.request);

})

);

});