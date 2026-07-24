Dashboard.register("todayReminders", {

    init() {

        this.refresh();

    },

    refresh() {

        const container =
            document.getElementById("todayReminders");

        if (!container) return;

        const remindersModule =
            Aegis.getModule("reminders");

        if (!remindersModule) {

            container.innerHTML =
                "Reminders module unavailable.";

            return;

        }

        const reminders =
            remindersModule.api.getTodaysReminders();

        if (reminders.length === 0) {

            container.innerHTML = `
                <div class="widget-header">
                    <h3>⏰ Today's Reminders</h3>
                </div>
                <p class="empty-state">
                    No Reminders for today.
                </p>
            `;

            return;

        }

        let html = `
            <div class="widget-header">
                <h3>⏰ Today's Reminders</h3>
            </div>
        `;

        reminders.forEach(reminder => {

            html += `
                <div class="event-item">

                    <strong>${reminder.task}</strong>

                </div>
            `;

        });

        container.innerHTML = html;

    },

    shutdown() {

    }

});

Dashboard.listen(
    "remindersUpdated",
    "todayReminders"
);