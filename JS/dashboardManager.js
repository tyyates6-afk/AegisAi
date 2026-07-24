const Dashboard = {

    widgets: {},

    listeners: {},

    register(name, widget) {

        this.widgets[name] = {

            name,

            api: widget,

            status: "REGISTERED"

        };

        console.log(`✓ Dashboard Widget: ${name} REGISTERED`);

    },

    listen(eventName, widgetName) {

        if (!this.listeners[eventName]) {

            this.listeners[eventName] = [];

        }

        this.listeners[eventName].push(widgetName);

    },

    broadcast(eventName) {

        if (!this.listeners[eventName]) return;

        this.listeners[eventName].forEach(widgetName => {

            this.refresh(widgetName);

        });

    },

    init() {

        console.log("==========");
        console.log("Initializing DashboardManager...");
        console.log("==========");

        Object.values(this.widgets).forEach(widget => {

            console.log(`Initializing ${widget.name}...`);

            try {

                if (typeof widget.api.init === "function") {

                    widget.api.init();

                }

                widget.status = "ONLINE";

                console.log(`🟢 ${widget.name} ONLINE`);

            } catch (error) {

                widget.status = "ERROR";

                console.error(`🔴 ${widget.name} ERROR`, error);

            }

        });

    },

    refresh(name) {

        const widget = this.widgets[name];

        if (!widget) return;

        if (typeof widget.api.refresh === "function") {

            widget.api.refresh();

        }

    },

    refreshAll() {

        Object.values(this.widgets).forEach(widget => {

            if (typeof widget.api.refresh === "function") {

                widget.api.refresh();

            }

        });

    },

    shutdown() {

        Object.values(this.widgets).forEach(widget => {

            if (typeof widget.api.shutdown === "function") {

                widget.api.shutdown();

            }

        });

    }

};

window.addEventListener(
    "eventsUpdated",
    () => {

        Dashboard.broadcast(
            "eventsUpdated"
        );

    }
);


window.addEventListener(
    "remindersUpdated",
    () => {

        Dashboard.broadcast(
            "remindersUpdated"
        );

    }
);


window.addEventListener(
    "verseUpdated",
    () => {

        Dashboard.broadcast(
            "verseUpdated"
        );

    }
);

window.addEventListener(
    "notificationsUpdated",
    () => {

        Dashboard.broadcast(
            "notificationsUpdated"
        );

    }
);

window.addEventListener(
    "profileUpdated",
    () => {

        Dashboard.broadcast(
            "profileUpdated"
        );

    }
);

