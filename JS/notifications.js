let notifiedItems =
loadData("notifiedItems") || [];
let notifications =
loadData("notifications") || [];


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


const notification = {

id:Date.now(),

type:"reminder",

title:reminder.task,

message:"Reminder coming up.",

created:new Date().toISOString()

};


notifications.push(notification);


saveData(
"notifications",
notifications
);



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

function showAegisNotification(
event,
minutes
){


const notification = {

    id: Date.now(),

    type: "event",

    title: event.title,

    message: "Starts soon.",

    category: event.category,

    created: new Date().toISOString()

};



notifications.push(notification);


saveData(
    "notifications",
    notifications
);



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




Aegis.register("notifications", {

    version: "1.1.5",

    timer: null,

    init() {

        console.log("Notifications initialized.");

        checkNotifications();

        this.timer = setInterval(() => {
        checkNotifications();

        }, 1000);

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