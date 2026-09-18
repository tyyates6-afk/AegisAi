let aegisCalendar;
let currentView = "month";
let currentDate = new Date();

document.addEventListener(
"DOMContentLoaded",
function(){
    const calendarEl =
    document.getElementById(
        "calendar"
    );

    aegisCalendar =
    new FullCalendar.Calendar(
        calendarEl,{
            height:"auto",
            expandRows:true,
            initialView:"dayGridMonth",
            eventDisplay:"block",
            headerToolbar:{
                left:"prev,next today",
                center:"title",
                right:"dayGridMonth,timeGridWeek,timeGridDay,year"
            },
            views:{
                year:{
                    type:"dayGridYear",
                    duration:{ year:1 }
                }
            },
            events:getCalendarEvents,
            dateClick(info){
                setEventDate(
                    info.dateStr
                );
            },
            eventClick(info){
                const props = info.event.extendedProps;
                if(props.isRecurrence && props.occurrenceDate !== props.baseDate){
                    editEvent(props.originalId, props.occurrenceDate);
                } else {
                    editEvent(props.originalId);
                }
            },
            datesSet(info){
                currentDate = info.start;
            }
        }
    );

    aegisCalendar.render();
});

function getCalendarEvents(rangeStart, rangeEnd){
    const sourceEvents =
    loadData("events");

    const start =
    typeof rangeStart === "string"
    ? rangeStart
    : (rangeStart || new Date()).toISOString().split("T")[0];

    const end =
    typeof rangeEnd === "string"
    ? rangeEnd
    : (rangeEnd || (() => {
        const future = new Date();
        future.setFullYear(future.getFullYear() + 1);
        return future;
    })()).toISOString().split("T")[0];

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
        "T"+occurrence.time :
        ""),
        backgroundColor:
        occurrence.color,
        borderColor:
        occurrence.color,
        editable:false,
        description:
        occurrence.notes ||
        (occurrence.location ?
        "📍 " + occurrence.location :
        ""),
        extendedProps:{
            originalId:occurrence.id,
            occurrenceDate:occurrence.occurrenceDate,
            baseDate:occurrence.date,
            isRecurrence:occurrence.recurrence && occurrence.recurrence !== "none"
        }
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
    version: "2.0.0",

    init() {
        console.log("Calendar initialized.");

        Aegis.listen(
            "navigation:planner",
            () => {
                if(aegisCalendar){
                    aegisCalendar.updateSize();
                }
            }
        );

        Aegis.listen(
            "googleCalendarConnected",
            () => {
                console.log(
                    "GCal connected, calendar notified."
                );
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
    },

    switchView(view){
        if(!aegisCalendar) return;
        aegisCalendar.changeView(view);
        currentView = view;
    },

    goToDate(dateStr){
        if(!aegisCalendar) return;
        aegisCalendar.gotoDate(dateStr);
    },

    getCurrentView(){
        return currentView;
    },

    getCurrentDate(){
        return currentDate;
    }
});

window.refreshCalendar =
refreshCalendar;

window.switchCalendarView = function(view){
    if(aegisCalendar){
        aegisCalendar.changeView(view);
    }
};
