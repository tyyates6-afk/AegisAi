import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

webpush.setVapidDetails(
    "mailto:tyyates@icloud.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);


export async function sendPushToUser(userId, notification) {

    const { data: subscriptions, error } =
        await supabase
            .from("push_subscriptions")
            .select("*")
            .eq("user_id", userId);


    if(error){

        console.error(
            "Failed to load push subscriptions:",
            error
        );

        return false;

    }


    if(!subscriptions || subscriptions.length === 0){

        console.log(
            "No push subscriptions for user:",
            userId
        );

        return false;

    }


    for(const subscription of subscriptions){

        const pushSubscription = {

            endpoint:
                subscription.endpoint,

            keys: {

                p256dh:
                    subscription.p256dh,

                auth:
                    subscription.auth

            }

        };


        try{

            await webpush.sendNotification(

                pushSubscription,

                JSON.stringify({

                    title:
                        notification.title || "AEGIS",

                    message:
                        notification.message ||
                        "You have a new notification.",

                    icon:
                        notification.icon ||
                        "/icon-192.png",

                    badge:
                        notification.badge ||
                        "/icon-192.png",

                    priority:
                        notification.priority ||
                        "normal",

                    notificationId:
                        notification.id || null

                })

            );


            console.log(
                "Push sent:",
                subscription.endpoint
            );


        }
        catch(error){

            console.error(
                "Push failed:",
                error
            );


            /*
             * If the subscription is no longer valid,
             * remove it from Supabase.
             */

            if(
                error.statusCode === 404 ||
                error.statusCode === 410
            ){

                await supabase
                    .from("push_subscriptions")
                    .delete()
                    .eq(
                        "endpoint",
                        subscription.endpoint
                    );

            }

        }

    }


    return true;

}