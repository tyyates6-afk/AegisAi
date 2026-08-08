const CACHE_NAME = "aegis-v3";

const BASE =
    self.location.pathname.replace("/service-worker.js", "");

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

        icon: "/icon-192.png",

        badge: "/icon-192.png",

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
    NORMAL OFFLINE CACHE
*/

self.addEventListener("fetch", event => {

    event.respondWith(

        caches.match(event.request)
        .then(response => {

            return response ||
                fetch(event.request);

        })

    );

});