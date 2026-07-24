

Dashboard.register("todayEvents", {

    init() {

        this.refresh();

    },

    refresh() {

        const container =
            document.getElementById("todayEvents");

        if (!container) return;


        const eventsModule =
            Aegis.getModule("events");


        if (!eventsModule) {

            container.innerHTML =
                "<p>Events unavailable.</p>";

            return;

        }


        const events =
            eventsModule.api.getTodaysEvents();


        if (events.length === 0) {

            container.innerHTML = `
                <div class="widget-header">
                    <h3>📅 Today's Events</h3>
                </div>
                <p class="empty-state">
                    No events scheduled for today.
                </p>

            `;

            return;

        }


        let html = `
            <div class="widget-header">
                <h3>📅 Today's Events</h3>
            </div>
        `;

        html += events.map(event => `

            <div class="today-event">

                <strong>${event.title}</strong>

                <span>${Format.time(event.time)}</span>

                ${
                    event.location
                    ? `<small>${event.location}</small>`
                    : ""
                }

            </div>

        `).join("");
        
        container.innerHTML = html;

    },

    shutdown() {

        const container =
            document.getElementById("todayEvents");

        if (container) {

            container.innerHTML = "";

        }

    }

});


Dashboard.listen(
    "eventsUpdated",
    "todayEvents"
);