const CACHE_NAME = "aegis-v5";

const BASE =
    self.location.pathname.replace("/service-worker.js", "");

const PRECACHE_FILES = [
    `${BASE}/`,
    `${BASE}/index.html`,
    `${BASE}/style.css`,
    `${BASE}/manifest.json`,
    `${BASE}/JS/core.js`,
    `${BASE}/JS/storage.js`,
    `${BASE}/JS/app.js`
];

// File types that rarely change and are safe to serve
// from cache first (images, fonts, etc).
const CACHE_FIRST_EXTENSIONS =
    /\.(png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf)$/;

self.addEventListener("install", event => {

    event.waitUntil(

        caches.open(CACHE_NAME)
            .then(async cache => {

                for (const file of PRECACHE_FILES) {

                    try {

                        await cache.add(file);

                        console.log(
                            "Precached:",
                            file
                        );

                    } catch (error) {

                        console.warn(
                            "Could not precache:",
                            file,
                            error
                        );

                    }

                }

            })

    );

    self.skipWaiting();

});


self.addEventListener("activate", event => {

    event.waitUntil(

        caches.keys().then(keys => {

            return Promise.all(

                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))

            );

        })

    );

    self.clients.claim();

});


/*
    TRUE PUSH NOTIFICATION
*/

self.addEventListener("push", event => {

    let data = {

        title: "AEGIS",

        message: "You have a new notification.",

        icon: "assets/icon-192.png",

        badge: "assets/icon-192.png",

        notificationId: null

    };


    if(event.data){

        try{

            data = {
                ...data,
                ...event.data.json()
            };

        }catch(error){

            console.error(
                "AEGIS Push JSON error:",
                error
            );

        }

    }


    event.waitUntil(

        self.registration.showNotification(
            data.title,
            {

                body: data.message,

                icon: data.icon,

                badge: data.badge,

                tag:
                    data.notificationId ||
                    "aegis-notification",

                data: {

                    notificationId:
                        data.notificationId

                },

                requireInteraction:
                    data.priority === "high"

            }

        )

    );

});


/*
    WHEN USER TAPS PUSH NOTIFICATION
*/

self.addEventListener(
    "notificationclick",
    event => {

        event.notification.close();


        event.waitUntil(

            clients.matchAll({

                type: "window",

                includeUncontrolled: true

            })

            .then(clientList => {

                for(const client of clientList){

                    if(
                        "focus" in client
                    ){

                        return client.focus();

                    }

                }


                if(
                    clients.openWindow
                ){

                    return clients.openWindow(
                        BASE + "/"
                    );

                }

            })

        );

    }
);


/*
    FETCH STRATEGY

    - Images/fonts: cache-first (rarely change, save bandwidth)
    - Everything else (HTML/JS/CSS): network-first, so a new
      deploy is picked up immediately on next load. Falls back
      to whatever is cached only when the network is unavailable,
      preserving offline support.
*/

self.addEventListener("fetch", event => {

    const request = event.request;
    const url = new URL(request.url);

    // Only handle HTTP/HTTPS requests
    if (
        url.protocol !== "http:" &&
        url.protocol !== "https:"
    ) {
        return;
    }

    // Never cache POST, PUT, PATCH, DELETE, etc.
    if (request.method !== "GET") {
        return;
    }

    // Never cache partial responses
    if (
        request.headers.get("range")
    ) {
        return;
    }

    // Cache-first for images/fonts
    if (CACHE_FIRST_EXTENSIONS.test(url.href)) {

        event.respondWith(

            caches.match(request)
                .then(cached => {

                    if (cached) {
                        return cached;
                    }

                    return fetch(request);

                })

        );

        return;
    }

    // Network-first for normal GET requests
    event.respondWith(

        fetch(request)
            .then(response => {

                // Only cache normal successful responses
                if (
                    response.ok &&
                    response.status === 200
                ) {

                    const copy =
                        response.clone();

                    caches.open(CACHE_NAME)
                        .then(cache => {

                            cache.put(
                                request,
                                copy
                            ).catch(error => {

                                console.warn(
                                    "Cache skipped:",
                                    error
                                );

                            });

                        });

                }

                return response;

            })

            .catch(() => {

                return caches.match(request);

            })

    );

});