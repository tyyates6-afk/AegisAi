let notifiedEvents =
loadData("notifiedEvents");



function checkEvents(){


const events =
loadData("events");



const now =
new Date();



events.forEach(event => {



if(!event.reminder)
return;



const eventTime =
new Date(
event.date +
"T" +
(event.time || "00:00")
);



const difference =
(eventTime - now) / 60000;



if(
difference <= 30 &&
difference > 0 &&
!notifiedEvents.includes(event.id)
){


showAegisNotification(event);



notifiedEvents.push(
event.id
);



saveData(
"notifiedEvents",
notifiedEvents
);


}


});


}




function showAegisNotification(event){


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

Starts soon.


<br><br>


Category:
${event.category}


`;



document.body.appendChild(
area
);



setTimeout(()=>{


area.remove();


},10000);



}




setInterval(
checkEvents,
60000
);



Aegis.register("notifications", {

    version: "1.1.5",

    init() {

        console.log("Notifications initialized.");

    },

    refresh() {

        checkNotifications();

    },

    shutdown() {},

    status() {

        return {

            online: true,

            version: this.version

        };

    }

});