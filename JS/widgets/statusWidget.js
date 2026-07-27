Dashboard.register("aegisStatus", {
    title:
    "AEGIS Status",

    icon:
    "🟢",

    description:
    "System health and module status",

    category:
    "system",

    size:
    "full-card",

    movable:
    true,

    removable:
    false,

    resizable:
    true,

    init(){

        this.refresh();

    },


    refresh(){


        const container =
        document.getElementById(
            "aegisStatus"
        );


        if(!container) return;



        const moduleCount =
        Object.keys(
            Aegis.modules
        ).length;



        const widgetCount =
        Object.keys(
            Dashboard.widgets
        ).length;



        const events =
        Aegis.getModule("events")
        ?.api
        .getTodaysEvents()
        .length || 0;



        const reminders =
        Aegis.getModule("reminders")
        ?.api
        .getTodaysReminders()
        .length || 0;



        container.innerHTML = `


        <div class="widget-header">

            <h3>
            🟦 AEGIS System Status
            </h3>

        </div>


        <div class="widget-body">


            <div class="widget-item">

                <strong>
                System
                </strong>

                🟢 Online

            </div>


            <div class="widget-item">

                <strong>
                Modules
                </strong>

                ${moduleCount}

            </div>


            <div class="widget-item">

                <strong>
                Widgets
                </strong>

                ${widgetCount}

            </div>


            <div class="widget-item">

                <strong>
                Events Today
                </strong>

                ${events}

            </div>


            <div class="widget-item">

                <strong>
                Reminders Today
                </strong>

                ${reminders}

            </div>


        </div>


        `;


    },


    shutdown(){


    }


});

Dashboard.listen(
    "eventsUpdated",
    "status"
);

Dashboard.listen(
    "remindersUpdated",
    "status"
);

Dashboard.listen(
    "profileUpdated",
    "status"
);