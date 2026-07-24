Dashboard.register("quickActions", {


    init(){

        this.refresh();

    },


    refresh(){

        const container =
        document.getElementById(
            "quickActions"
        );


        if(!container) return;


        container.innerHTML = `

        <div class="widget-header">

            <h3>
            ⚡ Quick Actions
            </h3>

        </div>


        <div class="quick-actions-container">


        <button class="quick-action" onclick="openEventCreator()">
            📅 Add Event
        </button>


        <button class="quick-action" onclick="openReminderCreator()">
            🔔 Add Reminder
        </button>


        <button class="quick-action" onclick="Dashboard.refreshAll()">
            🔄 Refresh Dashboard
        </button>


        </div>

        `;


    },


    shutdown(){}


});



function openEventCreator(){

    document.getElementById(
        "eventTitle"
    ).focus();

}



function openReminderCreator(){

    document.getElementById(
        "reminderInput"
    ).focus();

}