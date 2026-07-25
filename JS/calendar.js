let aegisCalendar;



document.addEventListener(
"DOMContentLoaded",
function(){


const calendarEl =
document.getElementById(
"calendar"
);



aegisCalendar =
new FullCalendar.Calendar(
calendarEl,
{

height:650,
expandRows:true,

initialView:
"dayGridMonth",

eventDisplay:
"block",


events:
getCalendarEvents(),



dateClick(info){

setEventDate(
info.dateStr
);


}



});


aegisCalendar.render();


});



function getCalendarEvents(){


const events =
loadData("events");



return events.map(event => ({


title:event.title,


start:
event.date +
(event.time ?
"T"+event.time
:
""),


backgroundColor:
event.color,


borderColor:
event.color


}));


}



function refreshCalendar(){

    aegisCalendar.removeAllEvents();

    aegisCalendar.addEventSource(
        getCalendarEvents()
    );

}


Aegis.listen(

    "eventsUpdated",

    function(){

        refreshCalendar();

    }

);

Aegis.register("calendar", {

    version: "1.1.5",

    init() {

        console.log("Calendar initialized.");
        
    },

    refresh() {

        refreshCalendar();

    },

    shutdown() {

        console.log("Calendar shutting down.");

    },

    status() {

        return {
            online: true,
            version: this.version
        };

    }

});