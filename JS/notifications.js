let notifiedItems =
loadData("notifiedItems") || [];
let notifications =
loadData("notifications") || [];


function createNotification({

    title,

    message,

    icon = "🔔",

    type = "info",

    priority = "normal",

    source = "system"

}){

    return{

        id: crypto.randomUUID(),

        title,

        message,

        icon,

        type,

        priority,

        source,

        timestamp: Date.now(),

        read: false

    };

}


function checkNotifications(){


    checkEventNotifications();


    checkReminderNotifications();


}



function checkEventNotifications(){


const events =
loadData("events");


const now =
new Date();



events.forEach(event=>{


    if(!event.notifications)
        return;


    const [year, month, day] =
    event.date.split("-").map(Number);

    const [hour, minute] =
    (event.time || "00:00").split(":").map(Number);

    const eventTime = new Date(
        year,
        month - 1,
        day,
        hour,
        minute,
        0
    );



    event.notifications.forEach(minutes=>{


        const difference =
        (eventTime - now) / 60000;
        


        const notificationID =
        event.id +
        "-" +
        minutes;



        if (
        difference <= minutes &&
        difference >= 0 &&
        !notifiedItems.includes(notificationID)
        ){
            showAegisNotification(
                event,
                minutes
            );


            notifiedItems.push(
                notificationID
            );


            saveData(
                "notifiedItems",
                notifiedItems
            );


        }


    });

 
});

}

function checkReminderNotifications(){

    const reminders =
    loadData("reminders") || [];


    const now =
    new Date();



    reminders.forEach(reminder=>{


        const [year, month, day] =
        reminder.date.split("-").map(Number);



        const [hour, minute] =
        (reminder.time || "00:00")
        .split(":")
        .map(Number);



        const reminderTime =
        new Date(
            year,
            month - 1,
            day,
            hour,
            minute,
            0
        );



        const difference =
        (reminderTime - now) / 60000;



        const notificationID =
        "reminder-" +
        reminder.id +
        "-5";



        if(
            difference <= 5 &&
            difference >= 0 &&
            !notifiedItems.includes(notificationID)

        ){

            showReminderNotification(
                reminder,
                5
            );


            notifiedItems.push(
                notificationID
            );


            saveData(
                "notifiedItems",
                notifiedItems
            );

        }


    });


}

function showReminderNotification(
reminder,
minutes
){


Aegis
.getModule("notifications")
.api
.notify({

    title: reminder.task,

    message: `Due in ${minutes} minutes.`,

    icon: "⏰",

    type: "reminder",

    priority: "high",

    source: "reminders"

});



const area =
document.createElement("div");


area.className =
"aegis-alert";


area.innerHTML = `

<h3>
🔔 AEGIS REMINDER
</h3>

<strong>
${reminder.task}
</strong>

<br><br>

Due in ${minutes} minutes.

`;


document.body.appendChild(area);



setTimeout(()=>{

area.remove();

},10000);



Aegis.broadcast(
"notificationsUpdated"
);


}

function cleanupNotifications(){

    const now =
    Date.now();


    notifications =
    notifications.filter(notification=>{


        const age =
        now -
        notification.timestamp;


        // keep notifications for 30 days

        return age <
        1000 *
        60 *
        60 *
        24 *
        30;


    });


    saveNotifications();

}

function showAegisNotification(
event,
minutes
){


Aegis
.getModule("notifications")
.api
.notify({

    title: event.title,

    message: `Starts in ${minutes} minutes.`,

    icon: "📅",

    type: "event",

    priority: "normal",

    source: "events"

});



const area =
document.createElement(
"div"
);


area.className =
"aegis-alert";


area.innerHTML = `

<h3>
🔔 AEGIS ALERT
</h3>


<strong>
${event.title}
</strong>


<br>

Starts in ${minutes} minutes.


<br><br>

Category:
${event.category}

`;



document.body.appendChild(area);



setTimeout(()=>{

    area.classList.add("hide");

    setTimeout(()=>{

        area.remove();

    },400);

},10000);



Aegis.broadcast(
"notificationsUpdated"
);


}

function saveNotifications(){

    saveData(
        "notifications",
        notifications
    );

}


Aegis.register("notifications", {

    version: "1.1.5",

    timer: null,

    init() {

        console.log("Notifications initialized.");
        cleanupNotifications();
        checkNotifications();
        
        this.timer = setInterval(() => {
        checkNotifications();

        }, 1000);

        

    },

    notify(data){

        const notification =
        createNotification(data);

        notifications.unshift(
            notification
        );

        if(notification.speak === true){

            const voice =
            Aegis.getModule("voice");


            if(voice){

                voice.api.speakNotification(
                    notification
                );

            }

        }

        saveData(
            "notifications",
            notifications
        );

        Dashboard.refresh(
            "notifications"
        );
        Aegis
        .getModule("toast")
        .api
        .show(notification);
        
        if(notification.speak !== false){

            Aegis
            .getModule("voice")
            ?.api
            .speakNotification(
                notification
            );

        }
        Aegis.broadcast(
            "notificationsUpdated"
        );

        return notification;

    },

    getNotifications(){

            return notifications;

        },
    markRead(id){

        const n =
        notifications.find(
            n => n.id === id
        );

        if(n){

            n.read = true;

            saveNotifications();

        }

        Aegis.broadcast(
            "notificationsUpdated"
        );

    },

    dismiss(id){

        const n =
        notifications.find(
            n => n.id === id
        );


        if(n){

            n.dismissed = true;

            saveNotifications();

        }


        Dashboard.refresh(
            "notifications"
        );


        Aegis.broadcast(
            "notificationsUpdated"
        );

    },


    clearAll(){

        notifications =
        notifications.map(notification=>{

            notification.dismissed = true;

            return notification;

        });


        saveNotifications();


        Dashboard.refresh(
            "notifications"
        );


        Aegis.broadcast(
            "notificationsUpdated"
        );

    },
    clearRead(){

        notifications =
        notifications.filter(
            n => !n.read
        );

        saveNotifications();

        Aegis.broadcast(
            "notificationsUpdated"
        );

    },

    refresh() {

        checkNotifications();

    },
    shutdown() {

        clearInterval(this.timer);

    },
    status() {

        return {
            online: true,
            version: this.version
        };

    }
});