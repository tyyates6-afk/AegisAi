Aegis.register("dashboard", {

    version: "1.2.0",

    interval: null,

    init() {

        console.log("Dashboard initialized.");

        updateGreetingWidget();

        this.interval = setInterval(() => {

            updateGreetingWidget();

        }, 1000);

    },

    refresh() {

        updateGreetingWidget();

    },

    shutdown() {

        clearInterval(this.interval);

    },

    status() {

        return {

            online: true,
            version: this.version

        };

    }

});