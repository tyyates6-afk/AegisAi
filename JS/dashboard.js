Aegis.register("dashboard", {

    version: "1.2.0",

    init() {

        Dashboard.init();

        Aegis.listen("profileUpdated", () => {

            Dashboard.broadcast("profileUpdated");

        });

        Aegis.listen("eventsUpdated", () => {

            Dashboard.broadcast("eventsUpdated");

        });

        Aegis.listen("remindersUpdated", () => {

            Dashboard.broadcast("remindersUpdated");

        });

    },

    refresh() {

        Dashboard.refreshAll();

    },

    shutdown() {

        Dashboard.shutdown();

    },

    status() {

        return {

            widgets: Object.keys(Dashboard.widgets).length

        };

    }

});
