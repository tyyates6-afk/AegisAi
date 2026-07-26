Dashboard.register("greeting", {
    title: "Greeting",

    size: "hero",

    movable: false,

    removable: false,

    icon: "👋",

    category: "system",

    enabled: true,

    timer: null,

    init() {

        this.refresh();

        this.timer = setInterval(() => {

            this.refresh();

        }, 1000);

    },

    refresh() {

        const now = new Date();

        let greeting = "Good Evening";

        const hour = now.getHours();

        if (hour < 12) {

            greeting = "Good Morning";

        } else if (hour < 18) {

            greeting = "Good Afternoon";

        }

        // Ask the Core for the Profile module
        const profileModule = Aegis.getModule("profile");

        // Read profile data
        const profile =
            Aegis.getModule("profile").api.getProfile();

        const name = profile.name || "there";

        document.getElementById("greeting").textContent =
            `${greeting}, ${name}.`;

        document.getElementById("currentDate").textContent =
            now.toLocaleDateString(undefined, {

                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric"

            });

        document.getElementById("currentTime").textContent =
            now.toLocaleTimeString([], {

                hour: "numeric",
                minute: "2-digit",
                second: "2-digit"

            });

    },

    shutdown() {

        clearInterval(this.timer);

    }

});

Dashboard.listen("profileUpdated", "greeting");

