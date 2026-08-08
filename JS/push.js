const AegisPush = {

    vapidPublicKey: "BNqMF3Z9YHWak_nkv7Bv1ncWuopJvae6ASJEZk1gyaMgK8tONuTFeB4w3VQiflXGLmHyv_YyTWXVWFuq0ccyh5A",

    async init() {

        console.log("🔔 Initializing Push Notifications...");

        if (!("serviceWorker" in navigator)) {
            console.warn("Push notifications are not supported.");
            return;
        }

        if (!("PushManager" in window)) {
            console.warn("Push API is not supported.");
            return;
        }

        if (!("Notification" in window)) {
            console.warn("Notifications are not supported.");
            return;
        }

        try {

            const permission =
                await Notification.requestPermission();

            if (permission !== "granted") {

                console.warn(
                    "Notification permission was not granted."
                );

                return;
            }

            const registration =
                await navigator.serviceWorker.ready;

            let subscription =
                await registration.pushManager.getSubscription();

            if (!subscription) {

                subscription =
                    await registration.pushManager.subscribe({

                        userVisibleOnly: true,

                        applicationServerKey:
                            this.urlBase64ToUint8Array(
                                this.vapidPublicKey
                            )

                    });

            }

            await this.saveSubscription(
                subscription
            );

            console.log(
                "🟢 Push notifications enabled."
            );

        } catch(error) {

            console.error(
                "Push notification initialization failed:",
                error
            );

        }

    },


    async saveSubscription(subscription) {

        const cloud =
            Aegis
                .getModule("cloud")
                ?.api;

        if (!cloud) {

            console.warn(
                "Cloud module unavailable."
            );

            return;

        }

        const session =
            await cloud.getSession?.();

        if (!session?.user) {

            console.warn(
                "No authenticated user."
            );

            return;

        }

        const keys =
            subscription.getKey
                ? {

                    p256dh:
                        this.arrayBufferToBase64(
                            subscription.getKey("p256dh")
                        ),

                    auth:
                        this.arrayBufferToBase64(
                            subscription.getKey("auth")
                        )

                }
                : null;

        if (!keys) {

            console.warn(
                "Could not read push subscription keys."
            );

            return;

        }

        const data = {

            user_id:
                session.user.id,

            endpoint:
                subscription.endpoint,

            p256dh:
                keys.p256dh,

            auth:
                keys.auth,

            updated_at:
                new Date().toISOString()

        };


        const { error } =
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

            return;

        }

        console.log(
            "☁️ Push subscription synced."
        );

    },


    urlBase64ToUint8Array(base64String) {

        const padding =
            "=".repeat(
                (4 - base64String.length % 4) % 4
            );

        const base64 =
            (
                base64String
                + padding
            )
            .replace(/-/g, "+")
            .replace(/_/g, "/");

        const rawData =
            atob(base64);

        return Uint8Array.from(
            [...rawData].map(
                char => char.charCodeAt(0)
            )
        );

    },


    arrayBufferToBase64(buffer) {

        return btoa(
            String.fromCharCode(
                ...new Uint8Array(buffer)
            )
        );

    }

};