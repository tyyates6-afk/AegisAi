import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

webpush.setVapidDetails(
  "mailto:tyyates@icloud.com",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!
);

Deno.serve(async (req) => {
  try {
    const body = await req.json();

    const userId = body.userId;
    const notification = body.notification;

    if (!userId) {
      return new Response(
        JSON.stringify({
          error: "Missing userId"
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    if (!notification) {
      return new Response(
        JSON.stringify({
          error: "Missing notification"
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    const { data: subscriptions, error } =
      await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", userId);

    if (error) {
      console.error(
        "Failed to load subscriptions:",
        error
      );

      return new Response(
        JSON.stringify({
          error: error.message
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No push subscriptions found."
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    let sent = 0;

    for (const subscription of subscriptions) {

      const pushSubscription = {
        endpoint: subscription.endpoint,

        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth
        }
      };

      try {

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

        sent++;

        console.log(
          "Push sent successfully."
        );

      } catch (pushError) {

        console.error(
          "Push failed:",
          pushError
        );

        const statusCode =
          (pushError as { statusCode?: number })
            .statusCode;

        if (
          statusCode === 404 ||
          statusCode === 410
        ) {

          await supabase
            .from("push_subscriptions")
            .delete()
            .eq(
              "endpoint",
              subscription.endpoint
            );

          console.log(
            "Removed expired push subscription."
          );
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

  } catch (error) {

    console.error(
      "Send push function failed:",
      error
    );

    return new Response(
      JSON.stringify({
        error: String(error)
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
});