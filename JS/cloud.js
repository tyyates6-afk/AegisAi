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

height:"auto",
expandRows:true,

initialView:
"dayGridMonth",

eventDisplay:
"block",


events(info, successCallback, failureCallback){

    try{

        successCallback(

            getCalendarEvents(
                info.startStr,
                info.endStr
            )

        );

    }
    catch(error){

        failureCallback(error);

    }

},


dateClick(info){

setEventDate(
info.dateStr
);


}



});


aegisCalendar.render();


});



function getCalendarEvents(rangeStart, rangeEnd){


const sourceEvents =
loadData("events");


// FullCalendar always supplies a visible-range
// window when calling this as an event source
// function, but fall back to "today through one
// year out" for any direct/manual call.

const start =
rangeStart ||
new Date().toISOString().split("T")[0];

const end =
rangeEnd ||
(() => {

    const future = new Date();

    future.setFullYear(
        future.getFullYear() + 1
    );

    return future
    .toISOString()
    .split("T")[0];

})();


const occurrences =
expandEventOccurrences(
    sourceEvents,
    start,
    end
);


return occurrences.map(occurrence => ({


title:occurrence.title,


start:
occurrence.occurrenceDate +
(occurrence.time ?
"T"+occurrence.time
:
""),


backgroundColor:
occurrence.color,


borderColor:
occurrence.color


}));


}



function refreshCalendar(){

    if(aegisCalendar){

        aegisCalendar.refetchEvents();

    }

}


Aegis.listen(

    "eventsUpdated",

    function(){

        refreshCalendar();

    }

);

Aegis.register("calendar", {

    version: "1.2.0",

    init() {

        console.log("Calendar initialized.");

        // The Planner page starts hidden (display:none) while
        // Home is the active page, so FullCalendar's initial
        // render measures a zero-width container. Recalculate
        // sizing every time the Planner page actually becomes
        // visible.

        Aegis.listen(
            "navigation:planner",
            () => {

                if(aegisCalendar){

                    aegisCalendar.updateSize();

                }

            }
        );

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