console.log("🚀 push.js LOADED");

const AegisPush = {

    vapidPublicKey:
        "BNqMF3Z9YHWak_nkv7Bv1ncWuopJvae6ASJEZk1gyaMgK8tONuTFeB4w3VQiflXGLmHyv_YyTWXVWFuq0ccyh5A",

    initialized: false,

    async init() {

        if (this.initialized) {

            console.log(
                "🔔 Push notifications already initialized."
            );

            return;

        }

        console.log(
            "🔔 Initializing Push Notifications..."
        );


        if (!("serviceWorker" in navigator)) {

            console.warn(
                "Push notifications are not supported."
            );

            return;

        }


        if (!("PushManager" in window)) {

            console.warn(
                "Push API is not supported."
            );

            return;

        }


        if (!("Notification" in window)) {

            console.warn(
                "Notifications are not supported."
            );

            return;

        }


        try {

            /*
             * Get the currently authenticated
             * Supabase session directly.
             */

            if (
                typeof supabaseClient === "undefined"
            ) {

                console.error(
                    "Supabase client is not available."
                );

                return;

            }


            const {
                data,
                error
            } =
                await supabaseClient.auth.getSession();


            if (error) {

                console.error(
                    "Failed to get Supabase session:",
                    error
                );

                return;

            }


            const session =
                data?.session;


            if (!session?.user) {

                console.warn(
                    "No authenticated Supabase user."
                );

                return;

            }


            console.log(
                "🔐 Push user:",
                session.user.id
            );


            /*
             * Ask for notification permission.
             */

            const permission =
                await Notification.requestPermission();


            if (permission !== "granted") {

                console.warn(
                    "Notification permission was not granted."
                );

                return;

            }


            console.log(
                "🔔 Notification permission granted."
            );


            /*
             * Wait for the AEGIS service worker.
             */

            const registration =
                await navigator.serviceWorker.ready;


            console.log(
                "⚙️ Service worker ready."
            );


            /*
             * Get an existing subscription,
             * or create a new one.
             */

            let subscription =
                await registration
                    .pushManager
                    .getSubscription();


            if (!subscription) {

                console.log(
                    "Creating new push subscription..."
                );


                subscription =
                    await registration
                        .pushManager
                        .subscribe({

                            userVisibleOnly:
                                true,

                            applicationServerKey:
                                this.urlBase64ToUint8Array(
                                    this.vapidPublicKey
                                )

                        });

            }


            console.log(
                "📱 Push subscription obtained."
            );


            /*
             * Save subscription to Supabase.
             */

            const saved =
                await this.saveSubscription(
                    subscription,
                    session.user.id
                );


            if (!saved) {

                console.error(
                    "Push subscription could not be saved."
                );

                return;

            }


            this.initialized = true;


            console.log(
                "🟢 Push notifications enabled."
            );


        }
        catch (error) {

            console.error(
                "Push notification initialization failed:",
                error
            );

        }

    },


    async saveSubscription(
        subscription,
        userId
    ) {

        if (
            typeof supabaseClient === "undefined"
        ) {

            console.error(
                "Supabase client is not available."
            );

            return false;

        }


        const p256dh =
            this.arrayBufferToBase64(
                subscription.getKey("p256dh")
            );


        const auth =
            this.arrayBufferToBase64(
                subscription.getKey("auth")
            );


        const data = {

            user_id:
                userId,

            endpoint:
                subscription.endpoint,

            p256dh:
                p256dh,

            auth:
                auth,

            updated_at:
                new Date().toISOString()

        };


        console.log(
            "☁️ Saving push subscription..."
        );


        const {
            error
        } =
            await supabaseClient
                .from("push_subscriptions")
                .upsert(

                    data,

                    {
                        onConflict:
                            "user_id,endpoint"
                    }

                );


        if (error) {

            console.error(
                "Failed to save push subscription:",
                error
            );

            return false;

        }


        console.log(
            "☁️ Push subscription synced."
        );


        return true;

    },


    urlBase64ToUint8Array(
        base64String
    ) {

        const padding =
            "=".repeat(
                (
                    4 -
                    base64String.length % 4
                ) % 4
            );


        const base64 =
            (
                base64String +
                padding
            )
            .replace(
                /-/g,
                "+"
            )
            .replace(
                /_/g,
                "/"
            );


        const rawData =
            atob(base64);


        return Uint8Array.from(
            [...rawData].map(
                char =>
                    char.charCodeAt(0)
            )
        );

    },


    arrayBufferToBase64(
        buffer
    ) {

        return btoa(
            String.fromCharCode(
                ...new Uint8Array(buffer)
            )
        );

    }

};


/*
 * Make AegisPush available globally.
 */

window.AegisPush =
    AegisPush;


/*
 * Try push initialization whenever
 * AEGIS authentication occurs.
 */

window.addEventListener(
    "aegis:authenticated",
    () => {

        console.log(
            "🔐 AEGIS authenticated — initializing push..."
        );

        AegisPush.init();

    }
);


/*
 * Also check for an existing session.
 * This handles page loads where the user
 * is already logged in.
 */

setTimeout(
    () => {

        console.log(
            "🔎 Checking existing Supabase session for push..."
        );

        AegisPush.init();

    },
    1500
);